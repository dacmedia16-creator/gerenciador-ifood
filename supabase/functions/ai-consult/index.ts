import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evidencesFromStoreData, mergeEvidences, type RuleEvidence } from "../_shared/evidences.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um GESTOR DE DELIVERY EXPERIENTE atuando como consultor.

REGRAS INVIOLÁVEIS:
1. Você SÓ pode comentar, priorizar e expandir as evidências fornecidas em RULE_EVIDENCES.
2. PROIBIDO inventar problema que não esteja em RULE_EVIDENCES (cada problema TEM que referenciar um rule_id existente).
3. PROIBIDO inventar números, percentuais ou métricas. Use APENAS valores que aparecem em current_value, reference_value ou evidence_data das evidências.
4. PROIBIDO prometer resultado garantido ("vai aumentar 30%", "garante mais vendas", etc).
5. Em cada texto, marque claramente:
   - [FATO] quando a afirmação vem direto de uma evidência
   - [HIPÓTESE] quando você está interpretando ou inferindo
   - [RECOMENDAÇÃO] quando está sugerindo ação
6. Quando a evidência tiver confidence = "baixa" ou missing_data presente, deixe claro: "falta dado: ...".
7. Linguagem SIMPLES para dono de restaurante. Sem jargão de marketing.
8. RAW_CONTEXT existe APENAS para você escrever melhor — não gere problema novo a partir dele.
9. Se RULE_EVIDENCES estiver vazio, devolva apenas executive_summary curto explicando que faltam dados, e popule missing_data_for_better_diagnosis. Não invente problemas.

Você responde SEMPRE chamando a função consultive_diagnosis com TODOS os campos preenchidos.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "consultive_diagnosis",
    description: "Diagnóstico consultivo ancorado em evidências do motor de regras",
    parameters: {
      type: "object",
      properties: {
        executive_summary: { type: "string", description: "Resumo executivo em 3-5 linhas, em linguagem simples" },
        main_problems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule_id: { type: "string", description: "OBRIGATÓRIO: deve existir em RULE_EVIDENCES" },
              title: { type: "string" },
              why_it_matters: { type: "string", description: "Explicar com [FATO]/[HIPÓTESE]/[RECOMENDAÇÃO]" },
              evidence_cited: { type: "string", description: "Citação curta do dado real (ex: 'Nota 4.2 vs 4.5 ideal')" },
              confidence: { type: "string", enum: ["alta", "media", "baixa"] },
            },
            required: ["rule_id", "title", "why_it_matters", "evidence_cited", "confidence"],
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
        do_not_do_now: {
          type: "array",
          items: { type: "string" },
          description: "Lista do que NÃO fazer agora e por quê",
        },
        missing_data_for_better_diagnosis: { type: "array", items: { type: "string" } },
        disclaimers: { type: "array", items: { type: "string" } },
        overall_score: { type: "number", description: "Score 0-100 baseado nas evidências" },
      },
      required: [
        "executive_summary",
        "main_problems",
        "priority_ranking",
        "plan_7_days",
        "plan_30_days",
        "do_not_do_now",
        "missing_data_for_better_diagnosis",
        "disclaimers",
        "overall_score",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const storeId: string | undefined = body?.storeId;
    const model: string = body?.model ?? "google/gemini-2.5-pro";
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Evidências calculadas a partir do banco
    const storeEvidences = evidencesFromStoreData({
      store: storeR.data,
      metrics: metricsR.data ?? [],
      products: productsR.data ?? [],
      reviews: reviewsR.data ?? [],
      competitors: competitorsR.data ?? [],
    });

    // 2) Evidências do funil (relatório mais recente)
    const funnelEvidences: RuleEvidence[] = (reportR.data?.report_data as any)?.rule_evidences ?? [];

    // 3) Merge — funil tem prioridade
    const ruleEvidences = mergeEvidences(funnelEvidences, storeEvidences);
    const validRuleIds = new Set(ruleEvidences.map((e) => e.rule_id));

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
        name: p.name,
        sale_price: p.sale_price,
        margin: p.estimated_margin,
        sales: p.sales_quantity,
        has_photo: p.has_photo,
      })),
      avaliacoes_amostra: (reviewsR.data ?? []).slice(0, 10),
      concorrentes: (competitorsR.data ?? []).slice(0, 5),
    };

    const userPrompt = `RULE_EVIDENCES (fonte da verdade — só comente o que estiver aqui):
${JSON.stringify(ruleEvidences, null, 2)}

RAW_CONTEXT (apenas para escrever melhor — NÃO gere problema novo a partir daqui):
${JSON.stringify(rawContext, null, 2)}

Devolva o diagnóstico consultivo via tool calling.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições à IA. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "IA não retornou diagnóstico estruturado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let diagnosis: any;
    try {
      diagnosis = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("parse error", e);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Validação anti-alucinação =====
    const before = {
      problems: diagnosis.main_problems?.length ?? 0,
      ranking: diagnosis.priority_ranking?.length ?? 0,
      plan7: diagnosis.plan_7_days?.length ?? 0,
      plan30: diagnosis.plan_30_days?.length ?? 0,
    };
    diagnosis.main_problems = (diagnosis.main_problems ?? []).filter((p: any) => validRuleIds.has(p.rule_id));
    diagnosis.priority_ranking = (diagnosis.priority_ranking ?? []).filter((p: any) => validRuleIds.has(p.rule_id));
    diagnosis.plan_7_days = (diagnosis.plan_7_days ?? []).filter((p: any) => validRuleIds.has(p.rule_id));
    diagnosis.plan_30_days = (diagnosis.plan_30_days ?? []).filter((p: any) => validRuleIds.has(p.rule_id));

    const dropped = {
      problems: before.problems - diagnosis.main_problems.length,
      ranking: before.ranking - diagnosis.priority_ranking.length,
      plan7: before.plan7 - diagnosis.plan_7_days.length,
      plan30: before.plan30 - diagnosis.plan_30_days.length,
    };
    if (dropped.problems || dropped.ranking || dropped.plan7 || dropped.plan30) {
      console.warn("Itens descartados por rule_id inválido", dropped);
    }

    const enriched = {
      ...diagnosis,
      generated_at: new Date().toISOString(),
      model,
      rule_evidences_used: ruleEvidences,
      validation: { dropped },
    };

    const baseData = (reportR.data?.report_data as any) ?? {};
    const merged = { ...baseData, ai_consult: enriched };

    const { data: inserted } = await supabase.from("reports").insert({
      store_id: storeId,
      title: `Diagnóstico IA — ${new Date().toLocaleDateString("pt-BR")}`,
      executive_summary: diagnosis.executive_summary,
      general_score: diagnosis.overall_score,
      report_data: merged,
    }).select("id").single();

    return new Response(JSON.stringify({ diagnosis: enriched, report_id: inserted?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-consult error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
