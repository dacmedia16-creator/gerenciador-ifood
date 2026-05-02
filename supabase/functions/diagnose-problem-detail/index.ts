import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { embedTextWithMeta, toPgVector } from "../_shared/embeddings.ts";

const SYSTEM_PROMPT = `Você é um GESTOR DE DELIVERY EXPERIENTE atuando como consultor.
Vou te dar UM problema específico de uma loja, com dados da loja, casos similares e conhecimento de mercado.
Devolva uma análise APROFUNDADA APENAS deste problema, em JSON.

Regras:
- Linguagem simples, direta, para dono de restaurante.
- Nunca invente números — só use os que vierem nos dados.
- Marque [FATO], [HIPÓTESE], [RECOMENDAÇÃO] quando ajudar.
- Quando citar caso similar, mencione brevemente.
- Sempre devolva o JSON pedido, sem texto fora dele.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    executive_summary: { type: "string", description: "1-2 frases explicando o problema na prática" },
    why_it_matters: { type: "string", description: "Por que isso afeta o resultado da loja, com impacto estimado quando possível" },
    root_causes: { type: "array", items: { type: "string" } },
    detailed_solution: { type: "string", description: "Solução detalhada em 3-6 frases, prática e específica" },
    step_by_step: { type: "array", items: { type: "string" }, description: "5-8 passos práticos em ordem" },
    expected_metric: { type: "string", description: "O que melhorar e como medir (ex: conversão, ticket, nota)" },
    risks: { type: "array", items: { type: "string" } },
    similar_cases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          summary: { type: "string" },
          outcome: { type: "string" },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
    deadline_suggestion: { type: "string" },
  },
  required: ["executive_summary", "why_it_matters", "detailed_solution", "step_by_step", "expected_metric"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { diagnosticId, force } = await req.json();
    if (!diagnosticId) {
      return new Response(JSON.stringify({ error: "diagnosticId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Auth + ownership via RLS
    const { data: diag, error: diagErr } = await userClient
      .from("diagnostics")
      .select("*, stores!inner(id, user_id, name, category, platform, city, neighborhood, average_ticket, monthly_orders, monthly_revenue, rating, promised_delivery_time, cancellation_rate)")
      .eq("id", diagnosticId)
      .single();

    if (diagErr || !diag) {
      return new Response(JSON.stringify({ error: "diagnostic not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Cache hit
    if (!force && diag.detailed_solution) {
      return new Response(JSON.stringify({ cached: true, detailed: diag.detailed_solution }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const store = (diag as any).stores;

    // RAG: similar cases + knowledge
    const queryText = `${diag.area} | ${diag.problem} | ${diag.evidence ?? ""}`;
    const embed = await embedTextWithMeta(queryText);
    let similarCases: any[] = [];
    let knowledge: any[] = [];
    if (embed.vector) {
      const vec = toPgVector(embed.vector);
      const [c, k] = await Promise.all([
        admin.rpc("match_cases", { query_embedding: vec as any, match_count: 3 }),
        admin.rpc("match_knowledge", { query_embedding: vec as any, match_count: 3, filter_areas: [diag.area] }),
      ]);
      similarCases = (c.data as any[]) || [];
      knowledge = (k.data as any[]) || [];
    }

    const userPayload = {
      problem: {
        area: diag.area,
        title: diag.problem,
        evidence: diag.evidence,
        probable_cause: diag.probable_cause,
        business_impact: diag.business_impact,
        current_recommendation: diag.recommended_solution,
        practical_action: diag.practical_action,
        suggested_deadline: diag.suggested_deadline,
        severity: diag.severity,
        priority: diag.priority,
      },
      store: {
        category: store.category,
        platform: store.platform,
        city: store.city,
        average_ticket: store.average_ticket,
        monthly_orders: store.monthly_orders,
        rating: store.rating,
        promised_delivery_time: store.promised_delivery_time,
        cancellation_rate: store.cancellation_rate,
      },
      similar_cases: similarCases.map((c) => ({
        diagnosis: c.diagnosis,
        recommendation: c.recommendation,
        outcome: c.outcome,
        lesson: c.lesson_learned,
      })),
      knowledge_snippets: knowledge.map((k) => ({ title: k.title, content: k.content?.slice(0, 600) })),
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "problem_detail",
            description: "Análise aprofundada de um problema",
            parameters: RESPONSE_SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "problem_detail" } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "ai_failed" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const detailed = toolCall?.function?.arguments
      ? (typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments)
      : null;

    if (!detailed) {
      return new Response(JSON.stringify({ error: "empty_ai_response" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Save cache (service role bypasses RLS)
    await admin.from("diagnostics").update({ detailed_solution: detailed }).eq("id", diagnosticId);

    return new Response(JSON.stringify({ cached: false, detailed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnose-problem-detail error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
