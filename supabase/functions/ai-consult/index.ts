import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evidencesFromStoreData, mergeEvidences, type RuleEvidence } from "../_shared/evidences.ts";
import { evidencesFromSession } from "../_shared/funnel-evidences.ts";
import {
  loadStoreMemory,
  loadPastRecommendations,
  buildSearchText,
  findSimilarCasesMeta,
  findKnowledgeSnippetsMeta,
  buildMetricsSnapshot,
} from "../_shared/memory.ts";
import { applyDiagnosisValidation } from "../_shared/validate-diagnosis.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { buildCacheKey, getCached, putCached, invalidateDiagnosisCache, CACHE_TTL } from "../_shared/cache.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

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
   - "knowledge_base" → vem de KNOWLEDGE_SNIPPETS (source_ref = chunk_id, ex: "RAG-007"; pode usar "RAG-007@v2" para indicar versão).
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
              how_to_apply: { type: "string", description: "Passo a passo prático (3-6 passos curtos), na linguagem do dono da loja." },
              example: { type: "string", description: "Exemplo concreto aplicado a esta loja (use nome de produto, bairro, ticket etc. quando disponível)." },
              how_to_measure: { type: "string", description: "Como o lojista vai saber se funcionou (qual KPI olhar, em quanto tempo)." },
              effort: { type: "string", enum: ["baixo", "medio", "alto"] },
              suggested_deadline: { type: "string", description: "Prazo sugerido em linguagem natural, ex: '7 dias', '2 semanas'." },
            },
            required: ["rule_id", "title", "why_it_matters", "evidence_cited", "confidence", "source", "source_ref", "how_to_apply", "example", "how_to_measure", "effort", "suggested_deadline"],
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
        money_leaks: {
          type: "array",
          description: "Onde a loja está perdendo dinheiro agora, em linguagem de dono. Cada item: where (o que/onde), monthly_estimate_brl (estimativa em R$ por mês, 0 se não der pra estimar), why (por que perde), fix (o que fazer).",
          items: {
            type: "object",
            properties: {
              where: { type: "string" },
              monthly_estimate_brl: { type: "number" },
              why: { type: "string" },
              fix: { type: "string" },
            },
            required: ["where", "monthly_estimate_brl", "why", "fix"],
            additionalProperties: false,
          },
        },
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
        "money_leaks",
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
  const t0 = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Client 1: somente para validar o JWT (sem header global, para não interferir com queries).
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client 2: queries com RLS do usuário autenticado.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const body = await req.json();
    const storeId: string | undefined = body?.storeId;
    const sessionId: string | undefined = body?.sessionId;
    const objective: string | undefined = body?.objective;
    const rawMode = String(body?.mode ?? "both").toLowerCase();
    const mode: "prints" | "form" | "both" =
      rawMode === "prints" ? "prints" : rawMode === "form" ? "form" : "both";
    const model: string = body?.model ?? "google/gemini-3-flash-preview";
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit por usuário/hora
    const adminForLimits = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const rl = await checkRateLimit(adminForLimits, userData.user.id, "diagnosis");
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const [storeR, productsR, competitorsR, reviewsR, metricsR, reportR, goalsR, recentUpdatesR] = await Promise.all([
      supabase.from("stores").select("*").eq("id", storeId).single(),
      supabase.from("products").select("*").eq("store_id", storeId).limit(50),
      supabase.from("competitors").select("*").eq("store_id", storeId).limit(20),
      supabase.from("reviews").select("comment, sentiment, rating").eq("store_id", storeId).limit(40),
      supabase.from("metrics").select("*").eq("store_id", storeId).order("period_end", { ascending: false }).limit(3),
      supabase.from("reports").select("id, report_data").eq("store_id", storeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("store_goals").select("goal_type, metric_key, target_value, current_value, deadline, priority, notes").eq("store_id", storeId).eq("status", "ativa").order("priority", { ascending: false }).limit(5),
      supabase.from("action_updates").select("action_id, what_changed, metrics_delta, has_new_data, created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (storeR.error || !storeR.data) {
      return new Response(JSON.stringify({ error: "Loja não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Camada 0: dados da sessão do funil (respostas + prints) =====
    let sessionEvidences: RuleEvidence[] = [];
    let sessionDebug: Record<string, any> = {};
    let printSnippets: Array<{ classification: string; text: string }> = [];
    if (sessionId) {
      const useAnswers = mode !== "prints";
      const useUploads = mode !== "form";
      const [answersR, uploadsR] = await Promise.all([
        useAnswers
          ? supabase.from("diagnosis_answers")
              .select("step_key, question_key, answer_value")
              .eq("session_id", sessionId)
          : Promise.resolve({ data: [] as any[] }),
        useUploads
          ? supabase.from("diagnosis_uploads")
              .select("status, classification, structured_data, extracted_text")
              .eq("session_id", sessionId)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const { evidences } = evidencesFromSession(
        (answersR.data ?? []) as any,
        (uploadsR.data ?? []) as any,
      );
      sessionEvidences = evidences;
      printSnippets = (uploadsR.data ?? [])
        .filter((u: any) => (u.status === "processed" || u.status === "done") && u.extracted_text)
        .slice(0, 6)
        .map((u: any) => ({
          classification: u.classification ?? "outro",
          text: String(u.extracted_text).slice(0, 800),
        }));
      sessionDebug = {
        mode,
        used_answers: useAnswers,
        used_uploads: useUploads,
        answers_count: answersR.data?.length ?? 0,
        uploads_count: uploadsR.data?.length ?? 0,
        session_evidences: evidences.length,
        print_snippets: printSnippets.length,
      };
      console.log(JSON.stringify({ evt: "ai_consult.session", session_id: sessionId, ...sessionDebug }));
    }

    // ===== Camada 1: evidências (motor de regras sobre dados da loja) =====
    const storeEvidences = evidencesFromStoreData({
      store: storeR.data,
      metrics: metricsR.data ?? [],
      products: productsR.data ?? [],
      reviews: reviewsR.data ?? [],
      competitors: competitorsR.data ?? [],
    });
    const reportEvidences: RuleEvidence[] = (reportR.data?.report_data as any)?.rule_evidences ?? [];
    const ruleEvidences = mergeEvidences(
      mergeEvidences(sessionEvidences, reportEvidences),
      storeEvidences,
    );
    const validRuleIds = new Set(ruleEvidences.map((e) => e.rule_id));

    // ===== Camada 2: memória da loja =====
    const storeMemory = await loadStoreMemory(supabase, storeId);
    const pastRecs = await loadPastRecommendations(supabase, storeId, 90);
    const validRecIds = new Set(pastRecs.map((r) => r.id));

    // ===== Camada 3: RAG (casos e conhecimento) =====
    const searchText = buildSearchText(ruleEvidences);
    const areas = Array.from(new Set(ruleEvidences.map((e) => e.area)));
    const [similarCasesRes, kbSnippetsRes] = await Promise.all([
      findSimilarCasesMeta(supabase, searchText, 3),
      findKnowledgeSnippetsMeta(supabase, searchText, areas.length ? areas : null, 5),
    ]);
    const similarCases = similarCasesRes.items;
    const kbSnippets = kbSnippetsRes.items;
    const validCaseIds = new Set(similarCases.map((c: any) => c.id));
    // Aceita UUID, chunk_id ("RAG-007") ou chunk_id@vN como source_ref válido
    const validKbIds = new Set<string>();
    for (const k of kbSnippets as any[]) {
      if (k.id) validKbIds.add(k.id);
      if (k.chunk_id) {
        validKbIds.add(k.chunk_id);
        if (k.chunk_version != null) validKbIds.add(`${k.chunk_id}@v${k.chunk_version}`);
      }
    }

    // RAG observabilidade — logs estruturados sem expor segredos
    const LOVABLE_API_KEY_PRESENT = !!Deno.env.get("LOVABLE_API_KEY");
    const ragMeta = {
      rag_mode: similarCasesRes.mode, // hoje sempre "degraded" (lexical v1)
      degraded_reason: similarCasesRes.mode === "degraded" ? (similarCasesRes.reason ?? "lexical_v1") : undefined,
      missing_lovable_api_key: !LOVABLE_API_KEY_PRESENT,
      similar_cases_count: similarCases.length,
      kb_snippets_count: kbSnippets.length,
    };
    console.log(JSON.stringify({ evt: "ai_consult.rag", store_id: storeId, ...ragMeta }));

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
      print_snippets: printSnippets,
    };

    const storeGoals = (goalsR?.data ?? []).map((g: any) => ({
      goal_type: g.goal_type,
      metric_key: g.metric_key,
      target_value: g.target_value,
      current_value: g.current_value,
      deadline: g.deadline,
      priority: g.priority,
      notes: g.notes,
    }));

    const modeNote =
      mode === "prints"
        ? "MODO DE COLETA: APENAS PRINTS. O usuário NÃO respondeu ao formulário. Use só RULE_EVIDENCES + print_snippets. Quando faltar dado típico do formulário, registre em missing_data_for_better_diagnosis."
        : mode === "form"
          ? "MODO DE COLETA: APENAS FORMULÁRIO. O usuário NÃO enviou prints. Ignore qualquer suposição baseada em OCR — não há print_snippets."
          : "MODO DE COLETA: PRINTS + FORMULÁRIO. Ambas as fontes estão disponíveis.";

    const SEGMENT_PLAYBOOKS: Record<string, string[]> = {
      hamburgueria: [
        "Combo lanche+batata+bebida com desconto sutil para subir ticket",
        "Foto profissional do hambúrguer carro-chefe (corte ao meio mostrando recheio)",
        "Versão 'duplo' do mais vendido para opção de maior valor",
        "Embalagem que mantém o pão crocante (papel + caixa ventilada)",
      ],
      pizzaria: [
        "Kit família: pizza grande + refri 2L + borda recheada",
        "Promoção dia da semana mais fraco (ex: terça da pizza)",
        "Meia/meia bem destacado no topo do cardápio",
        "Borda recheada como upsell de 1 clique",
      ],
      marmitaria: [
        "Plano semanal/mensal com desconto progressivo (fideliza recorrência)",
        "Cardápio fixo da semana publicado domingo à noite",
        "Combo executivo: marmita + suco + sobremesa",
        "Cupom de retorno automático no segundo pedido",
      ],
      acaiteria: ["Programa de pontos (10 pedidos = 1 grátis)", "Combo família (1L + 4 acompanhamentos)", "Topping premium como upsell", "Açaí da casa fotografado com todos os toppings visíveis"],
      doceria: ["Caixa de presente com card personalizado", "Mini-versão de doces para experimentar", "Combo data especial (dia das mães etc.)", "Foto macro mostrando textura"],
      japones: ["Combo individual + combo família lado a lado", "Rodízio delivery por preço fechado", "Foto de combinado em bandeja preta para realçar cor", "Hot roll com molho destacado"],
      tradicional: ["PF executivo no almoço com tempo de entrega curto", "Marmita feijoada na quarta/sábado", "Combo casal aos finais de semana", "Sobremesa caseira como upsell barato"],
    };
    function detectSegment(category?: string | null): string | null {
      if (!category) return null;
      const c = category.toLowerCase();
      if (c.includes("hamb") || c.includes("burger")) return "hamburgueria";
      if (c.includes("pizz")) return "pizzaria";
      if (c.includes("marmit")) return "marmitaria";
      if (c.includes("açaí") || c.includes("acai")) return "acaiteria";
      if (c.includes("doce") || c.includes("confeit") || c.includes("bolo")) return "doceria";
      if (c.includes("japon") || c.includes("sushi") || c.includes("temaki")) return "japones";
      if (c.includes("brasil") || c.includes("caseir") || c.includes("tradic") || c.includes("pf") || c.includes("executiv")) return "tradicional";
      return null;
    }
    const segment = detectSegment(storeR.data.category);
    const segmentPlaybook = segment ? SEGMENT_PLAYBOOKS[segment] : null;

    const OBJECTIVE_HINT: Record<string, string> = {
      vender_mais: "Foque em visibilidade, conversão e ticket. Priorize ações de cardápio, fotos, combos e promoções.",
      lucrar_mais: "Foque em margem: precificação, custos, taxa do app, desconto/cupom, mix de produtos. Mostre money_leaks com valor em R$.",
      melhorar_nota: "Foque em qualidade percebida, expectativa vs entrega, atendimento, embalagem e resposta a avaliações.",
      reduzir_cancelamento: "Foque em tempo de entrega, disponibilidade, comunicação proativa e qualidade do produto na entrega.",
      aumentar_recompra: "Foque em pós-venda, cupom de retorno, programa de pontos, frequência e relacionamento.",
    };
    const objectiveNote = objective && OBJECTIVE_HINT[objective]
      ? `OBJETIVO PRINCIPAL DO DONO: ${objective}. ${OBJECTIVE_HINT[objective]} As 3 primeiras ações DEVEM endereçar esse objetivo.`
      : "Sem objetivo declarado — ataque o gargalo de maior impacto financeiro.";

    const segmentNote = segmentPlaybook
      ? `SEGMENTO DA LOJA: ${segment}. Use o playbook abaixo como referência (não copie literalmente; adapte aos dados reais da loja):
${segmentPlaybook.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "Segmento não identificado — use recomendações genéricas apenas se necessário.";

    const userPrompt = `${modeNote}

${objectiveNote}

${segmentNote}

RULE_EVIDENCES (fonte da verdade objetiva):
${JSON.stringify(ruleEvidences, null, 2)}

STORE_GOALS (metas ativas declaradas pelo dono — priorize ações que aproximam dessas metas):
${JSON.stringify(storeGoals.length ? storeGoals : { aviso: "nenhuma meta ativa cadastrada" }, null, 2)}

STORE_MEMORY (perfil + recorrência + métricas 7/14/30d):
${JSON.stringify(storeMemory ?? { aviso: "memória vazia — primeira análise" }, null, 2)}

PAST_RECOMMENDATIONS (últimos 90 dias com status e outcome):
${JSON.stringify(pastRecs, null, 2)}

RECENT_ACTION_UPDATES (o que o lojista executou e relatou nas últimas ações — use para julgar evolução, não para inventar problema novo):
${JSON.stringify(recentUpdatesR.data ?? [], null, 2)}

SIMILAR_CASES (top ${similarCases.length} de lojas parecidas):
${JSON.stringify(similarCases, null, 2)}

KNOWLEDGE_SNIPPETS (top ${kbSnippets.length} da base de conhecimento):
${JSON.stringify(kbSnippets, null, 2)}

RAW_CONTEXT (apenas para escrever melhor — NÃO gere problema novo daqui; print_snippets contém OCR bruto dos prints enviados):
${JSON.stringify(rawContext, null, 2)}

Devolva o diagnóstico consultivo via tool calling, citando source/source_ref em cada main_problem. Preencha money_leaks com 2-5 itens concretos sempre que houver dados de produto/preço/custo/cancelamento/cupom — em linguagem de dono ("você está perdendo X reais por mês porque...").`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.log(JSON.stringify({ evt: "ai_consult.missing_api_key", store_id: storeId }));
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
    // Observabilidade: descarte alto (>20% dos problemas) sinaliza prompt drift / IA inventando.
    const beforeProblems = (dropped.problems ?? 0) + (diagnosis.main_problems?.length ?? 0);
    if (beforeProblems > 0 && (dropped.problems / beforeProblems) > 0.2) {
      console.log(JSON.stringify({
        evt: "ai_consult.validation_drop_high",
        store_id: storeId,
        dropped_problems: dropped.problems,
        total_before: beforeProblems,
        drop_ratio: Number((dropped.problems / beforeProblems).toFixed(2)),
      }));
    }

    const enriched = {
      ...diagnosis,
      generated_at: new Date().toISOString(),
      model,
      rule_evidences_used: ruleEvidences,
      similar_cases_used: similarCases,
      knowledge_snippets_used: kbSnippets,
      validation: { dropped },
      rag_meta: ragMeta,
      session_id: sessionId ?? null,
      mode,
      session_debug: sessionDebug,
    };

    // ===== Persistência =====
    const baseData = (reportR.data?.report_data as any) ?? {};
    const merged = { ...baseData, ai_consult: enriched };

    const { data: inserted, error: reportErr } = await supabase.from("reports").insert({
      store_id: storeId,
      title: `Diagnóstico IA — ${new Date().toLocaleDateString("pt-BR")}`,
      executive_summary: diagnosis.executive_summary,
      general_score: diagnosis.overall_score,
      report_data: merged,
    }).select("id").single();

    if (reportErr || !inserted?.id) {
      console.error(JSON.stringify({
        evt: "ai_consult.persist_failed",
        table: "reports",
        store_id: storeId,
        code: reportErr?.code,
        message: reportErr?.message,
      }));
      return new Response(JSON.stringify({
        error: "Não foi possível salvar o diagnóstico. Tente novamente em instantes.",
        details: reportErr?.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newReportId = inserted.id;

    // Grava cada main_problem em recommendation_history e devolve os IDs
    // para o frontend amarrar feedback a cada recomendação.
    if (diagnosis.main_problems?.length) {
      const rows = diagnosis.main_problems.map((p: any) => ({
        store_id: storeId,
        report_id: newReportId,
        diagnosis_cycle_id: newReportId, // agrupa todas as recs deste ciclo
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
        console.error(JSON.stringify({ evt: "ai_consult.persist_failed", table: "recommendation_history", store_id: storeId, code: rhErr.code, message: rhErr.message }));
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
              effort: p.effort ?? null,
              status: "pendente",
              description: p.why_it_matters?.slice(0, 1000) ?? null,
              why_it_matters: p.why_it_matters ?? null,
              how_to_apply: p.how_to_apply ?? null,
              example: p.example ?? null,
              how_to_measure: p.how_to_measure ?? null,
              source: "ai-consult",
              source_ref: p.recommendation_id,
            };
          });
        if (planRows.length) {
          const { error: apErr } = await supabase.from("action_plans").insert(planRows);
          if (apErr) console.error(JSON.stringify({ evt: "ai_consult.persist_failed", table: "action_plans", store_id: storeId, code: apErr.code, message: apErr.message }));
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

    const elapsed = Date.now() - t0;
    if (elapsed > 10_000) {
      console.log(JSON.stringify({
        evt: "ai_consult.slow",
        store_id: storeId,
        elapsed_ms: elapsed,
        model,
      }));
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
