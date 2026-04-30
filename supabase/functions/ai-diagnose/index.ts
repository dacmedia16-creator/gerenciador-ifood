// ============================================================
// DEPRECATED — usar `ai-consult` como único fluxo de diagnóstico IA.
//
// Esta função sobreviveu ao redesenho do Gestor IA. Ela:
//  - NÃO usa rule_evidences ancoradas (permite IA inventar problema sem rule_id)
//  - NÃO consulta STORE_MEMORY, PAST_RECOMMENDATIONS, casos ou base de conhecimento
//  - APAGA diagnostics e action_plans da loja a cada chamada (destrutivo)
//
// Mantida apenas por compatibilidade. Não há callsite ativo no frontend.
// Pode ser removida em uma versão futura.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, aiErrorResponse } from "../_shared/cors.ts";
import { runDiagnostics } from "../_shared/diagnostic-rules.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { store_id } = await req.json();
    if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: store } = await admin.from("stores").select("*").eq("id", store_id).eq("user_id", userData.user.id).maybeSingle();
    if (!store) return jsonResponse({ error: "Loja não encontrada" }, 404);

    const [{ data: metrics }, { data: products }, { data: reviews }, { data: competitors }, { data: campaigns }] = await Promise.all([
      admin.from("metrics").select("*").eq("store_id", store_id).order("period_start", { ascending: false }).limit(6),
      admin.from("products").select("*").eq("store_id", store_id),
      admin.from("reviews").select("*").eq("store_id", store_id).limit(100),
      admin.from("competitors").select("*").eq("store_id", store_id),
      admin.from("campaigns").select("*").eq("store_id", store_id),
    ]);

    const ruleDiags = runDiagnostics({
      store,
      metrics: metrics ?? [],
      products: products ?? [],
      reviews: reviews ?? [],
      competitors: competitors ?? [],
      campaigns: campaigns ?? [],
    });

    // Chama Lovable AI com tool calling
    const systemPrompt = `Você é um consultor especialista em delivery (iFood, Rappi, Uber Eats) que ajuda donos de restaurante a vender mais e lucrar melhor. Analise os dados e os sinais detectados pelo motor de regras. Gere um diagnóstico consultivo, prático e direto, em português do Brasil. Use linguagem simples (o leitor é dono de restaurante, não analista). Foque em ações que geram resultado em 30 dias.`;

    const userMsg = JSON.stringify({
      store: {
        nome: store.name, plataforma: store.platform, categoria: store.category,
        cidade: store.city, bairro: store.neighborhood, nota: store.rating,
        tempo_prometido_min: store.promised_delivery_time, taxa_entrega: store.delivery_fee,
        faturamento_mensal: store.monthly_revenue, pedidos_mes: store.monthly_orders,
        ticket_medio: store.average_ticket, cancelamento_pct: store.cancellation_rate,
      },
      metricas_recentes: metrics?.slice(0, 3),
      total_produtos: products?.length, produtos_sem_foto: products?.filter((p: any) => !p.has_photo).length,
      total_reviews: reviews?.length,
      reviews_negativas: reviews?.filter((r: any) => r.sentiment === "negativo").slice(0, 10).map((r: any) => r.comment),
      concorrentes: competitors?.map((c: any) => ({ nome: c.name, nota: c.rating, tempo: c.delivery_time })),
      sinais_detectados: ruleDiags.map((d) => ({ area: d.area, problema: d.problem, severidade: d.severity })),
    });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_diagnosis",
            description: "Persistir diagnóstico consultivo estruturado",
            parameters: {
              type: "object",
              properties: {
                executive_summary: { type: "string", description: "Resumo executivo (4-6 linhas) descrevendo o estado da loja" },
                general_score: { type: "integer", minimum: 0, maximum: 100 },
                key_problems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      area: { type: "string" },
                      problem: { type: "string" },
                      evidence: { type: "string" },
                      probable_cause: { type: "string" },
                      business_impact: { type: "string" },
                      recommended_solution: { type: "string" },
                      practical_action: { type: "string" },
                      suggested_deadline: { type: "string" },
                      severity: { type: "string", enum: ["critico", "atencao", "ok"] },
                      priority: { type: "string", enum: ["alta", "media", "baixa"] },
                    },
                    required: ["area", "problem", "recommended_solution", "practical_action", "severity", "priority"],
                    additionalProperties: false,
                  },
                },
                opportunities: { type: "array", items: { type: "string" } },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      area: { type: "string" },
                      priority: { type: "string", enum: ["alta", "media", "baixa"] },
                      impact: { type: "string", enum: ["alto", "medio", "baixo"] },
                      effort: { type: "string", enum: ["alto", "medio", "baixo"] },
                      description: { type: "string" },
                    },
                    required: ["title", "area", "priority", "impact", "effort"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["executive_summary", "general_score", "key_problems", "opportunities", "recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_diagnosis" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      return aiErrorResponse(aiResp.status, "Falha ao gerar diagnóstico com IA");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResponse({ error: "IA não retornou diagnóstico estruturado" }, 500);
    const result = JSON.parse(toolCall.function.arguments);

    // Limpa anteriores e insere novos
    await admin.from("diagnostics").delete().eq("store_id", store_id);
    await admin.from("action_plans").delete().eq("store_id", store_id);

    const diagsToInsert = (result.key_problems ?? []).map((p: any) => ({
      store_id, area: p.area, problem: p.problem,
      evidence: p.evidence ?? null, probable_cause: p.probable_cause ?? null,
      business_impact: p.business_impact ?? null, recommended_solution: p.recommended_solution,
      practical_action: p.practical_action, suggested_deadline: p.suggested_deadline ?? "30 dias",
      severity: p.severity, priority: p.priority,
    }));
    if (diagsToInsert.length) await admin.from("diagnostics").insert(diagsToInsert);

    const actionsToInsert = (result.recommendations ?? []).map((r: any) => ({
      store_id, title: r.title, area: r.area, priority: r.priority,
      impact: r.impact, effort: r.effort, description: r.description ?? null, status: "pendente",
    }));
    if (actionsToInsert.length) await admin.from("action_plans").insert(actionsToInsert);

    const { data: report } = await admin.from("reports").insert({
      store_id,
      title: `Relatório consultivo IA — ${new Date().toLocaleDateString("pt-BR")}`,
      executive_summary: result.executive_summary,
      general_score: result.general_score,
      key_problems: result.key_problems,
      opportunities: result.opportunities,
      recommendations: result.recommendations,
      report_data: result,
    }).select().single();

    return jsonResponse({ success: true, report_id: report?.id, summary: result.executive_summary, score: result.general_score, diagnostics_count: diagsToInsert.length, actions_count: actionsToInsert.length });
  } catch (e) {
    console.error("ai-diagnose error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
