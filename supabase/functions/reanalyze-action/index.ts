// Re-analyze a single action after the user marked it done / sent an update.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "reanalyze",
    description: "Avalia o que mudou após a aplicação de uma melhoria.",
    parameters: {
      type: "object",
      properties: {
        o_que_mudou: { type: "string" },
        houve_melhora: { type: "string", enum: ["sim", "nao", "inconclusivo"] },
        ainda_precisa_ajustar: { type: "string" },
        proxima_recomendacao: { type: "string" },
        impacto_na_meta: { type: "string" },
      },
      required: ["o_que_mudou", "houve_melhora", "ainda_precisa_ajustar", "proxima_recomendacao", "impacto_na_meta"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { action_id } = await req.json();
    if (!action_id) {
      return new Response(JSON.stringify({ error: "action_id obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: action } = await admin.from("action_plans").select("*").eq("id", action_id).single();
    if (!action) throw new Error("Ação não encontrada");

    const [{ data: updates }, { data: memory }, { data: goal }, { data: lastMetric }] = await Promise.all([
      admin.from("action_updates").select("*").eq("action_id", action_id).order("created_at", { ascending: false }).limit(5),
      admin.from("store_memory").select("*").eq("store_id", action.store_id).maybeSingle(),
      admin.from("store_goals").select("*").eq("store_id", action.store_id).eq("status", "ativa").maybeSingle(),
      admin.from("metrics").select("*").eq("store_id", action.store_id).order("period_end", { ascending: false }).limit(2),
    ]);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um consultor de delivery. Avalia objetivamente se uma ação aplicada gerou melhora, com base em updates do lojista, métricas antes/depois e meta atual. NUNCA prometa resultado garantido. Se não houver dado suficiente, diga 'inconclusivo'.",
          },
          {
            role: "user",
            content: JSON.stringify({
              action: { title: action.title, description: action.description, area: action.area, why_it_matters: action.why_it_matters, how_to_measure: action.how_to_measure },
              updates: updates || [],
              metrics_recent: lastMetric || [],
              store_memory: memory || null,
              user_goal: goal || null,
            }),
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "reanalyze" } },
      }),
    });

    if (aiResp.status === 429 || aiResp.status === 402) {
      const msg = aiResp.status === 429 ? "Limite de requisições atingido. Tente novamente em alguns instantes." : "Créditos da IA esgotados.";
      return new Response(JSON.stringify({ error: msg }), { status: aiResp.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) throw new Error(`AI gateway: ${aiResp.status}`);

    const aiJson = await aiResp.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const result = tc ? JSON.parse(tc.function.arguments) : null;
    if (!result) throw new Error("IA não retornou análise");

    const lastUpdate = updates?.[0];

    // Tenta amarrar ao mesmo diagnosis_cycle da recomendação original (se houver)
    let cycleId: string | null = null;
    if (action.recommendation_id) {
      const { data: origRec } = await admin
        .from("recommendation_history")
        .select("diagnosis_cycle_id")
        .eq("id", action.recommendation_id)
        .maybeSingle();
      cycleId = origRec?.diagnosis_cycle_id ?? null;
    }

    await admin.from("recommendation_history").insert({
      store_id: action.store_id,
      diagnosis_cycle_id: cycleId,
      recommendation: action.title,
      source: "reanalyze-action",
      source_ref: action_id,
      status: action.status === "feita" ? "aplicada" : "pendente",
      applied_at: action.completed_at,
      outcome: result.houve_melhora === "sim" ? "positivo" : result.houve_melhora === "nao" ? "negativo" : "inconclusivo",
      outcome_measured_at: new Date().toISOString(),
      metrics_before: lastMetric?.[1] ?? {},
      metrics_after: { ...(lastMetric?.[0] ?? {}), update_delta: lastUpdate?.metrics_delta ?? null },
      expected_impact: result.proxima_recomendacao,
    });

    // Se a IA propôs próxima recomendação, cria automaticamente um próximo action_plan
    // para fechar o ciclo diagnóstico → execução → reavaliação → próximo passo.
    let nextActionId: string | null = null;
    const next = (result.proxima_recomendacao || "").trim();
    if (next && next.toLowerCase() !== "nenhuma" && next.length > 8) {
      const { data: nextRec } = await admin
        .from("recommendation_history")
        .insert({
          store_id: action.store_id,
          diagnosis_cycle_id: cycleId,
          recommendation: next,
          source: "reanalyze-action",
          source_ref: action_id,
          status: "pendente",
          expected_impact: result.impacto_na_meta ?? null,
        })
        .select("id")
        .single();

      const { data: newAction } = await admin
        .from("action_plans")
        .insert({
          store_id: action.store_id,
          recommendation_id: nextRec?.id ?? null,
          title: next.slice(0, 200),
          area: action.area,
          priority: action.priority ?? "media",
          status: "pendente",
          description: result.ainda_precisa_ajustar ?? null,
          why_it_matters: result.impacto_na_meta ?? null,
          how_to_apply: next,
          source: "reanalyze-action",
          source_ref: action_id,
        })
        .select("id")
        .single();
      nextActionId = newAction?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: true, next_action_id: nextActionId, ...result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("reanalyze-action error", e);
    return new Response(JSON.stringify({ error: e.message || "Erro inesperado" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
