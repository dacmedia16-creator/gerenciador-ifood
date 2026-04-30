import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evidencesFromStoreData, mergeEvidences, type RuleEvidence } from "../_shared/evidences.ts";
import {
  loadStoreMemory,
  loadPastRecommendations,
  buildSearchText,
  findSimilarCases,
  findKnowledgeSnippets,
  buildMetricsSnapshot,
} from "../_shared/memory.ts";
import { applyDiagnosisValidation } from "../_shared/validate-diagnosis.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é um GESTOR DE DELIVERY EXPERIENTE atuando como consultor.

REGRAS INVIOLÁVEIS:
1. Você SÓ pode comentar, priorizar e expandir as evidências fornecidas em RULE_EVIDENCES.
2. PROIBIDO inventar problema que não esteja em RULE_EVIDENCES (cada problema TEM que referenciar um rule_id existente).
3. PROIBIDO inventar números, percentuais ou métricas. Use APENAS valores que aparecem em current_value, reference_value, evidence_data ou STORE_MEMORY.
4. PROIBIDO prometer resultado garantido ("vai aumentar 30%", "garante mais vendas", etc).
5. Em cada texto, marque claramente: [FATO] (vem de evidência/memória), [HIPÓTESE] (interpretação), [RECOMENDAÇÃO] (sugestão).
6. Quando a evidência tiver confidence "baixa" ou missing_data presente, deixa claro: "falta dado: ...".
7. Linguagem SIMPLES para dono de restaurante. Sem jargão.
8. RAW_CONTEXT existe APENAS para você escrever melhor — NÃO gere problema novo a partir dele.

REGRAS DE APRENDIZADO (memória, casos e conhecimento):
9. Toda recomendação em main_problems DEVE declarar source:
   - "evidence" → vem direto de RULE_EVIDENCES (source_ref = rule_id).
   - "store_history" → vem de PAST_RECOMMENDATIONS desta loja (source_ref = recommendation_id).
   - "similar_case" → vem de SIMILAR_CASES (source_ref = case_id).
   - "knowledge_base" → vem de KNOWLEDGE_SNIPPETS (source_ref = kb_id).
10. Quando uma recomendação aparece em PAST_RECOMMENDATIONS com status "ignorada" OU outcome "negativo", NÃO repita — a menos que haja fato novo nas evidências; nesse caso, explique qual é o fato novo.
11. Quando uma recomendação anterior está "aplicada" + outcome "positivo", parabenize e proponha o PRÓXIMO passo, não repita.
12. Use STORE_MEMORY.recurring_problems para diferenciar problema novo de recorrente. Se for recorrente, mencione há quanto tempo persiste.
13. Use STORE_MEMORY.profile.learning para guiar tom:
    - successful_recommendations → reconheça o que funcionou e proponha evolução.
    - failed_recommendations → não repita a mesma abordagem; ofereça caminho diferente.
    - ignored_repeatedly → assuma que não faz sentido para esta loja; só insista se há fato crítico novo.
    - improving_areas → comente o progresso ("nota melhorou nos últimos 7d vs 30d").
    - worsening_areas → trate como prioridade alta no priority_ranking.
14. Quando usar SIMILAR_CASES, cite brevemente o caso ("Loja parecida fez X e teve resultado Y").
15. Quando usar KNOWLEDGE_SNIPPETS, mencione o título do tópico ("Princípio de combos: ...").
16. Se RULE_EVIDENCES vazio, devolva apenas executive_summary curto + missing_data_for_better_diagnosis. Não invente.

Você responde SEMPRE chamando a função consultive_diagnosis com TODOS os campos preenchidos.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "consultive_diagnosis",
    description: "Diagnóstico consultivo ancorado em evidências, memória, casos e conhecimento",
    parameters: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        overall_score: { type: "number" },
        main_problems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule_id: { type: "string" },
              title: { type: "string" },
              why_it_matters: { type: "string" },
              evidence_cited: { type: "string" },
              confidence: { type: "string", enum: ["alta", "media", "baixa"] },
              source: { type: "string", enum: ["evidence", "store_history", "similar_case", "knowledge_base"] },
              source_ref: { type: "string" },
            },
            required: ["rule_id", "title", "why_it_matters", "evidence_cited", "confidence", "source", "source_ref"],
            additionalProperties: false,
          },
        },
        priority_ranking: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule_id: { type: "string" },
              priority: { type: "string", enum: ["alta", "media", "baixa"] },
              reason: { type: "string" },
            },
            required: ["rule_id", "priority", "reason"],
            additionalProperties: false,
          },
        },
        plan_7_days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              title: { type: "string" },
              action: { type: "string" },
              rule_id: { type: "string" },
            },
            required: ["day", "title", "action", "rule_id"],
            additionalProperties: false,
          },
        },
        plan_30_days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              week: { type: "number" },
              title: { type: "string" },
              action: { type: "string" },
              rule_id: { type: "string" },
            },
            required: ["week", "title", "action", "rule_id"],
            additionalProperties: false,
          },
        },
        do_not_do_now: { type: "array", items: { type: "string" } },
        avoided_repetitions: {
          type: "array",
          description: "Recomendações que NÃO foram repetidas porque já tinham sido ignoradas/falharam",
          items: {
            type: "object",
            properties: {
              recommendation_id: { type: "string" },
              reason: { type: "string" },
            },
            required: ["recommendation_id", "reason"],
            additionalProperties: false,
          },
        },
        missing_data_for_better_diagnosis: { type: "array", items: { type: "string" } },
        disclaimers: { type: "array", items: { type: "string" } },
      },
      required: [
        "executive_summary",
        "overall_score",
        "main_problems",
        "priority_ranking",
        "plan_7_days",
        "plan_30_days",
        "do_not_do_now",
        "avoided_repetitions",
        "missing_data_for_better_diagnosis",
        "disclaimers",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const storeId: string | undefined = body?.storeId;
    const model: string = body?.model ?? "google/gemini-2.5-pro";
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [storeR, productsR, competitorsR, reviewsR, metricsR, reportR] = await Promise.all([
      supabase.from("stores").select("*").eq("id", storeId).single(),
      supabase.from("products").select("*").eq("store_id", storeId).limit(50),
      supabase.from("competitors").select("*").eq("store_id", storeId).limit(20),
      supabase.from("reviews").select("comment, sentiment, rating").eq("store_id", storeId).limit(40),
      supabase.from("metrics").select("*").eq("store_id", storeId).order("period_end", { ascending: false }).limit(3),
      supabase.from("reports").select("id, report_data").eq("store_id", storeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (storeR.error || !storeR.data) {
      return new Response(JSON.stringify({ error: "Loja não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Camada 1: evidências (motor de regras) =====
    const storeEvidences = evidencesFromStoreData({
      store: storeR.data,
      metrics: metricsR.data ?? [],
      products: productsR.data ?? [],
      reviews: reviewsR.data ?? [],
      competitors: competitorsR.data ?? [],
    });
    const funnelEvidences: RuleEvidence[] = (reportR.data?.report_data as any)?.rule_evidences ?? [];
    const ruleEvidences = mergeEvidences(funnelEvidences, storeEvidences);
    const validRuleIds = new Set(ruleEvidences.map((e) => e.rule_id));

    // ===== Camada 2: memória da loja =====
    const storeMemory = await loadStoreMemory(supabase, storeId);
    const pastRecs = await loadPastRecommendations(supabase, storeId, 90);
    const validRecIds = new Set(pastRecs.map((r) => r.id));

    // ===== Camada 3: RAG (casos e conhecimento) =====
    const searchText = buildSearchText(ruleEvidences);
    const areas = Array.from(new Set(ruleEvidences.map((e) => e.area)));
    const [similarCases, kbSnippets] = await Promise.all([
      findSimilarCases(supabase, searchText, 3),
      findKnowledgeSnippets(supabase, searchText, areas.length ? areas : null, 5),
    ]);
    const validCaseIds = new Set(similarCases.map((c: any) => c.id));
    const validKbIds = new Set(kbSnippets.map((k: any) => k.id));

    // ===== Snapshot de métricas para gravar como "antes" =====
    const metricsSnapshot = buildMetricsSnapshot(storeR.data, metricsR.data?.[0]);

    const rawContext = {
      loja: {
        name: storeR.data.name,
        category: storeR.data.category,
        platform: storeR.data.platform,
        city: storeR.data.city,
        rating: storeR.data.rating,
        promised_delivery_time: storeR.data.promised_delivery_time,
        delivery_fee: storeR.data.delivery_fee,
        average_ticket: storeR.data.average_ticket,
        monthly_revenue: storeR.data.monthly_revenue,
        monthly_orders: storeR.data.monthly_orders,
        cancellation_rate: storeR.data.cancellation_rate,
      },
      produtos_amostra: (productsR.data ?? []).slice(0, 10).map((p: any) => ({
        name: p.name, sale_price: p.sale_price, margin: p.estimated_margin,
        sales: p.sales_quantity, has_photo: p.has_photo,
      })),
      avaliacoes_amostra: (reviewsR.data ?? []).slice(0, 10),
      concorrentes: (competitorsR.data ?? []).slice(0, 5),
    };

    const userPrompt = `RULE_EVIDENCES (fonte da verdade objetiva):
${JSON.stringify(ruleEvidences, null, 2)}

STORE_MEMORY (perfil + recorrência + métricas 7/14/30d):
${JSON.stringify(storeMemory ?? { aviso: "memória vazia — primeira análise" }, null, 2)}

PAST_RECOMMENDATIONS (últimos 90 dias com status e outcome):
${JSON.stringify(pastRecs, null, 2)}

SIMILAR_CASES (top ${similarCases.length} de lojas parecidas):
${JSON.stringify(similarCases, null, 2)}

KNOWLEDGE_SNIPPETS (top ${kbSnippets.length} da base de conhecimento):
${JSON.stringify(kbSnippets, null, 2)}

RAW_CONTEXT (apenas para escrever melhor — NÃO gere problema novo daqui):
${JSON.stringify(rawContext, null, 2)}

Devolva o diagnóstico consultivo via tool calling, citando source/source_ref em cada main_problem.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "consultive_diagnosis" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições à IA. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "IA não retornou diagnóstico estruturado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let diagnosis: any;
    try { diagnosis = JSON.parse(toolCall.function.arguments); }
    catch (e) { console.error("parse error", e); return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    // ===== Validação anti-alucinação (lógica pura, testada) =====
    const sets = {
      validRuleIds,
      validRecIds,
      validCaseIds,
      validKbIds,
    };
    const { dropped, hardFailed } = applyDiagnosisValidation(diagnosis, sets);
    if (hardFailed) {
      console.warn("Hard fail: RULE_EVIDENCES vazio mas IA inventou problemas — descartado.");
      diagnosis.executive_summary =
        "Não há evidências suficientes para um diagnóstico confiável. Complete os dados da loja antes da próxima análise.";
      diagnosis.missing_data_for_better_diagnosis = [
        ...(diagnosis.missing_data_for_better_diagnosis ?? []),
        "Nenhuma regra do motor disparou — verifique cadastro de loja, métricas e produtos.",
      ];
    }
    if (Object.values(dropped).some((n) => n > 0)) {
      console.warn("Itens descartados por referência inválida", dropped);
    }

    const enriched = {
      ...diagnosis,
      generated_at: new Date().toISOString(),
      model,
      rule_evidences_used: ruleEvidences,
      similar_cases_used: similarCases,
      knowledge_snippets_used: kbSnippets,
      validation: { dropped },
    };

    // ===== Persistência =====
    const baseData = (reportR.data?.report_data as any) ?? {};
    const merged = { ...baseData, ai_consult: enriched };

    const { data: inserted } = await supabase.from("reports").insert({
      store_id: storeId,
      title: `Diagnóstico IA — ${new Date().toLocaleDateString("pt-BR")}`,
      executive_summary: diagnosis.executive_summary,
      general_score: diagnosis.overall_score,
      report_data: merged,
    }).select("id").single();

    const newReportId = inserted?.id ?? null;

    // Grava cada main_problem em recommendation_history e devolve os IDs
    // para o frontend amarrar feedback a cada recomendação.
    if (diagnosis.main_problems?.length) {
      const rows = diagnosis.main_problems.map((p: any) => ({
        store_id: storeId,
        report_id: newReportId,
        rule_id: p.rule_id,
        recommendation: p.title,
        expected_impact: p.why_it_matters?.slice(0, 500),
        source: p.source,
        source_ref: p.source_ref,
        status: "pendente",
        metrics_before: metricsSnapshot,
      }));
      const { data: insertedRecs, error: rhErr } = await supabase
        .from("recommendation_history")
        .insert(rows)
        .select("id, rule_id");
      if (rhErr) {
        console.warn("rec_history insert failed", rhErr);
      } else if (insertedRecs?.length) {
        diagnosis.main_problems = diagnosis.main_problems.map((p: any, i: number) => ({
          ...p,
          recommendation_id: insertedRecs[i]?.id,
        }));

        // Cria action_plans já amarrados via FK recommendation_id.
        const planRows = diagnosis.main_problems
          .filter((p: any) => p.recommendation_id)
          .map((p: any) => {
            const ev = ruleEvidences.find((e) => e.rule_id === p.rule_id);
            const rank = (diagnosis.priority_ranking ?? []).find((r: any) => r.rule_id === p.rule_id);
            return {
              store_id: storeId,
              recommendation_id: p.recommendation_id,
              title: p.title,
              area: ev?.area ?? null,
              priority: rank?.priority ?? (ev?.severity === "alto" ? "alta" : ev?.severity === "medio" ? "media" : "baixa"),
              impact: ev?.business_impact?.slice(0, 200) ?? null,
              effort: null,
              status: "pendente",
              description: p.why_it_matters?.slice(0, 1000) ?? null,
            };
          });
        if (planRows.length) {
          const { error: apErr } = await supabase.from("action_plans").insert(planRows);
          if (apErr) console.warn("action_plans insert failed", apErr);
        }
      }
    }

    // Re-sincroniza enriched + atualiza report_data com os recommendation_ids gerados
    enriched.main_problems = diagnosis.main_problems;
    if (newReportId) {
      const baseData2 = (reportR.data?.report_data as any) ?? {};
      await supabase.from("reports").update({
        report_data: { ...baseData2, ai_consult: enriched },
      }).eq("id", newReportId);
    }

    // Grava 1 training_example via service role (RLS bloqueia usuário)
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("training_examples").insert({
        store_id: storeId,
        report_id: newReportId,
        input_payload: {
          rule_evidences: ruleEvidences,
          store_memory: storeMemory,
          past_recommendations_count: pastRecs.length,
          similar_cases_count: similarCases.length,
          knowledge_snippets_count: kbSnippets.length,
        },
        ai_response: diagnosis,
      });

      // Dispara update-store-memory em background
      adminClient.functions.invoke("update-store-memory", { body: { storeId } }).catch((e) => {
        console.warn("update-store-memory invoke failed", e);
      });
    } catch (e) {
      console.warn("training_examples / memory update failed", e);
    }

    return new Response(JSON.stringify({ diagnosis: enriched, report_id: newReportId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-consult error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
