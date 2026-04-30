import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, aiErrorResponse } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOPICS = ["atraso", "comida fria", "embalagem", "pedido errado", "atendimento", "porcao pequena", "qualidade", "preco"];

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
    const { data: store } = await admin.from("stores").select("id").eq("id", store_id).eq("user_id", userData.user.id).maybeSingle();
    if (!store) return jsonResponse({ error: "Loja não encontrada" }, 404);

    const { data: reviews } = await admin.from("reviews")
      .select("id, comment, rating")
      .eq("store_id", store_id)
      .is("sentiment", null)
      .not("comment", "is", null)
      .limit(50);

    if (!reviews || reviews.length === 0) {
      return jsonResponse({ success: true, processed: 0, message: "Nenhuma avaliação pendente." });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `Classifique avaliações de delivery em pt-BR. Tópicos válidos: ${TOPICS.join(", ")}. Retorne sentimento e tópicos detectados em cada review.` },
          { role: "user", content: JSON.stringify(reviews.map((r) => ({ id: r.id, comment: r.comment, rating: r.rating }))) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_reviews",
            description: "Classifica sentimento e extrai tópicos de cada avaliação",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
                      topics: { type: "array", items: { type: "string", enum: TOPICS } },
                    },
                    required: ["id", "sentiment", "topics"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_reviews" } },
      }),
    });

    if (!aiResp.ok) {
      console.error("AI error", aiResp.status);
      return aiErrorResponse(aiResp.status, "Falha ao analisar avaliações");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResponse({ error: "Sem resposta estruturada da IA" }, 500);
    const { results } = JSON.parse(toolCall.function.arguments);

    let processed = 0;
    for (const r of results) {
      const { error } = await admin.from("reviews").update({
        sentiment: r.sentiment,
        detected_topics: r.topics,
      }).eq("id", r.id).eq("store_id", store_id);
      if (!error) processed++;
    }

    // Detecta tópicos críticos recorrentes (>30% das negativas)
    const { data: allNeg } = await admin.from("reviews").select("detected_topics").eq("store_id", store_id).eq("sentiment", "negativo");
    const topicCounts: Record<string, number> = {};
    (allNeg ?? []).forEach((r: any) => (r.detected_topics ?? []).forEach((t: string) => { topicCounts[t] = (topicCounts[t] ?? 0) + 1; }));
    const total = allNeg?.length ?? 0;
    const criticalTopics = total > 0 ? Object.entries(topicCounts).filter(([, c]) => c / total > 0.3) : [];

    // Em vez de inserir um diagnóstico paralelo (que ficaria órfão do ciclo de
    // aprendizado da ai-consult), anexamos os tópicos críticos no último report.
    // O ai-consult lê reports.report_data e o motor de regras pode usar isso
    // como evidência. Mantém um único fluxo de diagnóstico.
    if (criticalTopics.length > 0) {
      const { data: lastReport } = await admin
        .from("reports").select("id, report_data")
        .eq("store_id", store_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const payload = {
        detected_at: new Date().toISOString(),
        total_negative_reviews: total,
        topics: criticalTopics.map(([t, c]) => ({ topic: t, count: c, share: Number((c / total).toFixed(2)) })),
      };
      if (lastReport?.id) {
        const merged = { ...(lastReport.report_data ?? {}), review_topics: payload };
        await admin.from("reports").update({ report_data: merged }).eq("id", lastReport.id);
      }
    }

    return jsonResponse({ success: true, processed, critical_topics: criticalTopics.map(([t]) => t) });
  } catch (e) {
    console.error("analyze-reviews error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
