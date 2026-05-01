// Analisa imagens de uma loja (prints do iFood/Rappi/etc.) e extrai dados
// estruturados para preencher o formulário do Radar de Prospects.
import { buildCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é um analista de operações de delivery. Vou te enviar prints da página de uma loja em apps de delivery (iFood, Rappi, Uber Eats) — capa, cardápio, avaliações, etc.

Sua tarefa: extrair os dados visíveis nas imagens em formato JSON. NUNCA invente. Se não conseguir ver algo, deixe null (ou false para campos booleanos quando claramente não houver indício).

Devolva APENAS um objeto JSON puro, sem markdown, sem explicação, com este formato exato:
{
  "name": string|null,                // nome da loja
  "category": string|null,            // ex: "Hambúrguer", "Pizzaria", "Açaí"
  "city": string|null,
  "neighborhood": string|null,
  "rating": number|null,              // 0-5
  "reviews_count": number|null,       // número de avaliações
  "delivery_time": number|null,       // tempo médio em MINUTOS (use o ponto médio se for faixa "30-40min" -> 35)
  "delivery_fee": number|null,        // taxa de entrega em REAIS (use 0 se "Grátis")
  "price_range": string|null,         // "$", "$$", "$$$" — estime se houver preços visíveis
  "has_photos": boolean,              // tem fotos profissionais nos itens?
  "has_combos": boolean,              // oferece combos / kits?
  "has_coupons": boolean,             // mostra cupons / promoções ativas?
  "generic_names": boolean,           // nomes de itens são genéricos ("X-Burger", "Pizza Calabresa") sem storytelling?
  "notes": string|null                // 1-2 frases curtas com observações úteis (ex: "Cardápio enxuto, sem combos, fotos amadoras")
}`;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const images: string[] = Array.isArray(body?.images) ? body.images : [];
    const note: string = typeof body?.note === "string" ? body.note : "";

    if (images.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma imagem." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (images.length > 4) {
      return new Response(JSON.stringify({ error: "Máximo 4 imagens." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userParts: any[] = [
      {
        type: "text",
        text: note
          ? `Observação do usuário: ${note}\n\nExtraia os dados das imagens.`
          : "Extraia os dados das imagens.",
      },
      ...images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("ai gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    // Tenta parsear JSON, lidando com markdown fences caso o modelo escape
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    let extracted: any;
    try {
      extracted = JSON.parse(cleaned);
    } catch (err) {
      console.error("parse error", err, raw);
      return new Response(JSON.stringify({ error: "A IA não devolveu JSON válido. Tente prints mais nítidos." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-prospect error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
