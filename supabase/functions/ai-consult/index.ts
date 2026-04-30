import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um gestor especialista em iFood e delivery. Analise a loja como uma máquina de vendas.

Seu objetivo é descobrir onde a loja está perdendo:
- entrada na loja
- cliques em produtos
- pedidos
- ticket médio
- margem
- reputação
- recompra

Use estas referências:
- Conversão abaixo de 7% é crítica
- Conversão entre 7% e 11,9% exige atenção
- Conversão entre 12% e 14,9% é aceitável
- Conversão acima de 15% é boa
- Menos de 150 avaliações indica possível baixo volume
- Tempo acima de 35 minutos em raio próximo é problema crítico
- Produto sem foto reduz desejo e cliques
- Nome genérico reduz clareza e ranqueamento
- Produto campeão com margem baixa pode destruir lucro
- Promoção boa aumenta vendas sem destruir margem
- Foto precisa ser realista, não criar expectativa falsa

Use linguagem consultiva, direta e prática. Não seja genérico. Sempre conecte evidência com causa e solução.
Responda SEMPRE chamando a função consultive_diagnosis com TODOS os campos preenchidos.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "consultive_diagnosis",
    description: "Diagnóstico consultivo completo da loja de delivery",
    parameters: {
      type: "object",
      properties: {
        executive_summary: { type: "string", description: "Resumo executivo em 3-5 linhas" },
        overall_score: { type: "number", description: "Score geral 0-100" },
        area_scores: {
          type: "object",
          properties: {
            visibilidade: { type: "number" },
            cardapio: { type: "number" },
            preco_margem: { type: "number" },
            operacao: { type: "number" },
            reputacao: { type: "number" },
            marketing: { type: "number" },
            recompra: { type: "number" },
          },
          required: ["visibilidade", "cardapio", "preco_margem", "operacao", "reputacao", "marketing", "recompra"],
          additionalProperties: false,
        },
        main_bottleneck: { type: "string" },
        journey: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["busca", "entrada", "clique", "compra", "entrega", "recompra"] },
              status: { type: "string", enum: ["bom", "atencao", "critico"] },
              finding: { type: "string" },
              recommendation: { type: "string" },
            },
            required: ["stage", "status", "finding", "recommendation"],
            additionalProperties: false,
          },
        },
        problems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problem: { type: "string" },
              evidence: { type: "string" },
              probable_cause: { type: "string" },
              business_impact: { type: "string" },
              recommended_solution: { type: "string" },
              priority: { type: "string", enum: ["alta", "media", "baixa"] },
              suggested_deadline: { type: "string" },
            },
            required: ["problem", "evidence", "probable_cause", "business_impact", "recommended_solution", "priority", "suggested_deadline"],
            additionalProperties: false,
          },
        },
        products_to_fix: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              issue: { type: "string" },
              action: { type: "string" },
            },
            required: ["name", "issue", "action"],
            additionalProperties: false,
          },
        },
        ticket_opportunities: { type: "array", items: { type: "string" } },
        margin_risks: { type: "array", items: { type: "string" } },
        next_best_action: { type: "string" },
        seven_day_plan: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              title: { type: "string" },
              action: { type: "string" },
            },
            required: ["day", "title", "action"],
            additionalProperties: false,
          },
        },
        final_questions: {
          type: "object",
          properties: {
            por_que_nao_entram: { type: "string" },
            por_que_nao_clicam: { type: "string" },
            por_que_nao_compram: { type: "string" },
            por_que_compram_pouco: { type: "string" },
            por_que_nao_voltam: { type: "string" },
            por_que_vende_mas_nao_lucra: { type: "string" },
          },
          required: ["por_que_nao_entram", "por_que_nao_clicam", "por_que_nao_compram", "por_que_compram_pouco", "por_que_nao_voltam", "por_que_vende_mas_nao_lucra"],
          additionalProperties: false,
        },
      },
      required: ["executive_summary", "overall_score", "area_scores", "main_bottleneck", "journey", "problems", "products_to_fix", "ticket_opportunities", "margin_risks", "next_best_action", "seven_day_plan", "final_questions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const storeId: string | undefined = body?.storeId;
    const model: string = body?.model ?? "google/gemini-2.5-pro";
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [storeR, productsR, competitorsR, reviewsR, metricsR, diagnosticsR, reportR] = await Promise.all([
      supabase.from("stores").select("*").eq("id", storeId).single(),
      supabase.from("products").select("*").eq("store_id", storeId).limit(50),
      supabase.from("competitors").select("*").eq("store_id", storeId).limit(20),
      supabase.from("reviews").select("comment, sentiment, rating").eq("store_id", storeId).limit(40),
      supabase.from("metrics").select("*").eq("store_id", storeId).order("period_end", { ascending: false }).limit(3),
      supabase.from("diagnostics").select("area, problem, severity").eq("store_id", storeId).limit(30),
      supabase.from("reports").select("id, report_data").eq("store_id", storeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (storeR.error || !storeR.data) {
      return new Response(JSON.stringify({ error: "Loja não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      loja: storeR.data,
      produtos: productsR.data ?? [],
      concorrentes: competitorsR.data ?? [],
      avaliacoes: reviewsR.data ?? [],
      metricas: metricsR.data ?? [],
      diagnosticos_existentes: diagnosticsR.data ?? [],
      contexto_funil: reportR.data?.report_data ?? null,
    };

    const userPrompt = `Analise os dados abaixo desta loja de delivery e devolva um diagnóstico consultivo completo via tool calling.\n\nDADOS:\n${JSON.stringify(payload, null, 2)}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        return new Response(JSON.stringify({ error: "Muitas requisições à IA. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
    try {
      diagnosis = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("parse error", e);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const enriched = { ...diagnosis, generated_at: new Date().toISOString(), model };

    if (reportR.data?.id) {
      const merged = { ...(reportR.data.report_data ?? {}), ai_consult: enriched };
      await supabase.from("reports").update({ report_data: merged }).eq("id", reportR.data.id);
    } else {
      await supabase.from("reports").insert({
        store_id: storeId,
        title: `Diagnóstico IA — ${storeR.data.name}`,
        executive_summary: diagnosis.executive_summary,
        general_score: diagnosis.overall_score,
        report_data: { ai_consult: enriched },
      });
    }

    return new Response(JSON.stringify({ diagnosis: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-consult error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
