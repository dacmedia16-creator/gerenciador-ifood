// Process a print uploaded by the user: download from storage, send to Lovable AI
// (multimodal), AUTO-classify the print and extract structured data in a single call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CATEGORIES = [
  "faturamento",
  "indicadores",
  "avaliacoes",
  "cardapio",
  "produto",
  "promocoes",
  "concorrentes",
  "loja",
  "outro",
] as const;

// Union schema — todos os campos possíveis de qualquer categoria.
// A IA preenche apenas os que conseguir ver. additionalProperties = false
// para evitar lixo, mas todos os campos são opcionais.
const UNION_PROPS = {
  // faturamento
  revenue: { type: "number", description: "Faturamento total no período (R$)" },
  orders: { type: "number" },
  average_ticket: { type: "number" },
  period: { type: "string" },
  // indicadores / avaliacoes
  rating: { type: "number", description: "Nota da loja (0-5)" },
  reviews_count: { type: "number" },
  cancellation_rate: { type: "number", description: "% de cancelamentos" },
  delivery_time_min: { type: "number" },
  prep_time_min: { type: "number" },
  average_rating: { type: "number" },
  total_reviews: { type: "number" },
  top_complaints: { type: "array", items: { type: "string" } },
  top_compliments: { type: "array", items: { type: "string" } },
  // cardapio / produto
  products_visible: { type: "number" },
  products_with_photo: { type: "number" },
  has_combos: { type: "boolean" },
  name: { type: "string" },
  price: { type: "number" },
  has_photo: { type: "boolean" },
  has_description: { type: "boolean" },
  description_quality: { type: "string", enum: ["boa", "media", "ruim"] },
  // promocoes
  has_coupon: { type: "boolean" },
  has_free_delivery: { type: "boolean" },
  discount_percent: { type: "number" },
  // loja
  has_cover: { type: "boolean" },
  has_logo: { type: "boolean" },
  looks_professional: { type: "string", enum: ["sim", "medio", "nao"] },
  // genérico
  price_range: { type: "string" },
  notes: { type: "string", description: "Observações livres sobre o print" },
};

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: "upload_id obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: upload, error: uErr } = await admin
      .from("diagnosis_uploads")
      .select("*")
      .eq("id", upload_id)
      .single();
    if (uErr || !upload) throw new Error("Upload não encontrado");

    // Download file from storage
    const { data: file, error: dErr } = await admin.storage
      .from("diagnosis-uploads")
      .download(upload.storage_path);
    if (dErr || !file) throw new Error("Falha ao baixar print do storage");

    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK) as unknown as number[]);
    }
    const b64 = btoa(binary);
    const mime = upload.mime_type || "image/png";
    const dataUrl = `data:${mime};base64,${b64}`;

    // Se o usuário escolheu manualmente algo diferente de "outro", respeitamos.
    // Caso contrário (default "outro"), pedimos pra IA classificar.
    const userCls = upload.classification || "outro";
    const shouldAutoClassify = userCls === "outro";

    const tool = {
      type: "function",
      function: {
        name: "analyze_print",
        description: "Classifica o print de delivery e extrai os dados visíveis.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [...CATEGORIES],
              description:
                "Tipo do print: faturamento (relatório de vendas), indicadores (operação: tempo, cancelamento), avaliacoes (lista/nota de avaliações), cardapio (lista de produtos), produto (página de um item), promocoes (cupom/desconto), concorrentes (loja de outro), loja (capa/perfil da própria loja), outro.",
            },
            extracted_text: { type: "string", description: "Todo texto visível no print" },
            structured: {
              type: "object",
              properties: UNION_PROPS,
              additionalProperties: false,
              description: "Preencha APENAS os campos que aparecem no print. Não invente.",
            },
            confidence: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["category", "extracted_text", "structured", "confidence"],
          additionalProperties: false,
        },
      },
    };

    const systemMsg = shouldAutoClassify
      ? "Você analisa prints de painéis de delivery (iFood, Rappi, 99Food, WhatsApp, Instagram). Primeiro IDENTIFIQUE o tipo do print (category), depois EXTRAIA os dados visíveis. NUNCA invente números — se não estiver na imagem, omita o campo."
      : `Você analisa prints de painéis de delivery. O usuário já classificou como '${userCls}'. Use essa categoria e extraia os dados visíveis. NUNCA invente números — se não estiver na imagem, omita o campo.`;

    const userText = shouldAutoClassify
      ? "Identifique a categoria deste print e extraia todos os dados visíveis (números, notas, nomes, preços, flags)."
      : `Categoria já definida: ${userCls}. Extraia todos os dados visíveis.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemMsg },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "analyze_print" } },
      }),
    });

    if (aiResp.status === 429) {
      await admin.from("diagnosis_uploads").update({ status: "failed", error: "Limite de requisições atingido" }).eq("id", upload_id);
      return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em alguns instantes." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      await admin.from("diagnosis_uploads").update({ status: "failed", error: "Créditos esgotados" }).eq("id", upload_id);
      return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Configurações." }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway: ${aiResp.status} ${t.slice(0, 200)}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { category: userCls, extracted_text: "", structured: {}, confidence: "baixa" };

    const finalCategory = shouldAutoClassify
      ? (CATEGORIES as readonly string[]).includes(args.category) ? args.category : "outro"
      : userCls;

    await admin
      .from("diagnosis_uploads")
      .update({
        classification: finalCategory,
        extracted_text: args.extracted_text || null,
        structured_data: { ...args.structured, _confidence: args.confidence, _auto_classified: shouldAutoClassify },
        status: "processed",
        error: null,
      })
      .eq("id", upload_id);

    return new Response(
      JSON.stringify({ ok: true, category: finalCategory, structured: args.structured, confidence: args.confidence }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("process-print error", e);
    try {
      const { upload_id } = await req.clone().json();
      if (upload_id) {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        await admin.from("diagnosis_uploads").update({ status: "failed", error: String(e.message || e) }).eq("id", upload_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: e.message || "Erro inesperado" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
