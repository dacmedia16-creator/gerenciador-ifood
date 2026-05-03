import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { buildCacheKey, getCached, putCached, CACHE_TTL } from "../_shared/cache.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ProductInput {
  name: string;
  category?: string;
  ingredients?: string;
  differentiator?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const products: ProductInput[] = body.products ?? [];
    const segment: string = body.segment ?? "delivery";
    if (!products.length) return new Response(JSON.stringify({ error: "products required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Cache (TTL 30 dias)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const cacheKey = await buildCacheKey({ segment, products });
    const cached = await getCached(admin, cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached.response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const systemPrompt = `Você é um especialista em SEO de cardápio para iFood/Rappi. Reescreva nomes de produtos no formato:
Categoria + Ingrediente principal + Diferencial + palavra-chave do segmento (${segment}).
Exemplo: "X-Burger" -> "X-Burger Artesanal com Queijo Derretido e Molho Especial".
Mantenha entre 5 e 9 palavras. Português do Brasil. Apetitoso, claro, vendedor.`;

    const userMsg = JSON.stringify({ produtos: products });


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
            name: "save_suggestions",
            description: "Retorne sugestões de nomes melhorados",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      original: { type: "string" },
                      suggested: { type: "string" },
                      reason: { type: "string", description: "Por que o novo nome converte mais (1 frase)" },
                      score: { type: "integer", minimum: 0, maximum: 100, description: "Score do nome ATUAL (quanto menor, mais genérico)" },
                    },
                    required: ["original", "suggested", "reason", "score"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_suggestions" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido. Tente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Configurações > Workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return new Response(JSON.stringify({ error: "Sem retorno estruturado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const result = JSON.parse(toolCall.function.arguments);

    putCached(admin, {
      inputHash: cacheKey,
      cacheType: "suggestion",
      response: result,
      model: "google/gemini-3-flash-preview",
      ttlSeconds: CACHE_TTL.suggestion,
    }).catch((e) => console.warn("cache put failed", e));

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" } });
  } catch (e) {
    console.error("suggest-product-names error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
