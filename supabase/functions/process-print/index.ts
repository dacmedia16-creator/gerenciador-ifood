// Process a print uploaded by the user: download from storage, send to Lovable AI
// (multimodal), AUTO-classify the print and extract the largest set of structured
// fields possible — feeding the diagnosis form automatically.
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

// Schema unificado: a IA preenche apenas o que enxerga. Todos os campos opcionais.
const UNION_PROPS = {
  // Identidade da loja
  store_name: { type: "string", description: "Nome da loja como aparece no app" },
  food_category: {
    type: "string",
    enum: ["Lanches", "Pizzaria", "Açaí", "Brasileira", "Japonesa", "Marmita", "Doces", "Saudável", "Outros"],
    description: "Tipo de comida vendida",
  },
  city: { type: "string" },
  neighborhood: { type: "string" },
  platform: {
    type: "string",
    enum: ["iFood", "Rappi", "WhatsApp", "App próprio", "Outros"],
  },
  opening_hours_text: { type: "string", description: "Horário de funcionamento ex: 'Seg-Dom 18h às 23h'" },

  // Faturamento
  revenue: { type: "number", description: "Faturamento em R$ no período mostrado" },
  orders: { type: "number", description: "Quantidade de pedidos no período" },
  average_ticket: { type: "number", description: "Ticket médio em R$" },
  period: { type: "string", description: "Ex.: '7 dias', 'Mês 10/2025'" },

  // Vitrine / loja
  rating: { type: "number", description: "Nota da loja (0-5)" },
  reviews_count: { type: "number", description: "Quantidade total de avaliações" },
  has_cover: { type: "boolean", description: "Tem foto de capa?" },
  has_logo: { type: "boolean", description: "Tem logo visível?" },
  looks_professional: { type: "string", enum: ["sim", "medio", "nao"] },
  delivery_fee: { type: "number", description: "Taxa de entrega em R$ (0 se 'Grátis')" },
  promised_delivery_time_min: { type: "number", description: "Tempo prometido de entrega em minutos (use o ponto médio se for faixa)" },

  // Operação
  delivery_time_min: { type: "number", description: "Tempo REAL de entrega em minutos" },
  prep_time_min: { type: "number", description: "Tempo de preparo da cozinha em minutos" },
  cancellation_rate: { type: "number", description: "% de cancelamento" },

  // Cardápio
  products_visible: { type: "number", description: "Total de produtos visíveis no cardápio" },
  products_with_photo: { type: "number", description: "Quantos produtos têm foto" },
  products_with_description: { type: "number" },
  has_combos: { type: "boolean" },
  has_addons: { type: "boolean", description: "Permite adicionais (queijo extra, bacon etc.)?" },
  has_drinks: { type: "boolean" },
  has_desserts: { type: "boolean" },
  menu_organized: { type: "string", enum: ["sim", "medio", "nao"], description: "Cardápio organizado em categorias claras?" },

  // Top produtos detectados (até 3)
  top_products: {
    type: "array",
    maxItems: 3,
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { type: "number" },
        has_photo: { type: "boolean" },
        has_description: { type: "boolean" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },

  // Avaliações
  top_complaints: {
    type: "array",
    maxItems: 5,
    items: { type: "string" },
    description: "Principais reclamações em palavras curtas (frio, atraso, errado, embalagem, pequeno...)",
  },
  top_compliments: { type: "array", maxItems: 5, items: { type: "string" } },
  complaint_cold: { type: "boolean", description: "Há reclamação recorrente de comida fria?" },
  complaint_late: { type: "boolean" },
  complaint_wrong: { type: "boolean" },
  complaint_packaging: { type: "boolean" },
  complaint_small: { type: "boolean" },
  sample_negative_reviews: {
    type: "array",
    maxItems: 5,
    items: { type: "string" },
    description: "Texto literal de avaliações negativas vistas no print",
  },

  // Promoções / ads
  has_coupon: { type: "boolean" },
  has_free_delivery: { type: "boolean" },
  discount_percent: { type: "number" },
  uses_ifood_ads: { type: "boolean" },

  // Concorrente (quando o print for de outra loja)
  competitor_name: { type: "string" },
  competitor_price_range: { type: "string", enum: ["$", "$$", "$$$"] },

  // Texto livre para IA capturar valor diferencial visível (slogan, descrição da loja)
  store_unique_value_text: { type: "string", description: "Frase de posicionamento/slogan visível" },
  notes: { type: "string", description: "Observações livres" },
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

    const userCls = upload.classification || "outro";
    const shouldAutoClassify = userCls === "outro";

    const tool = {
      type: "function",
      function: {
        name: "analyze_print",
        description: "Classifica o print de delivery e extrai o máximo de dados visíveis para preencher um formulário.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [...CATEGORIES],
              description:
                "Tipo do print: faturamento, indicadores, avaliacoes, cardapio, produto, promocoes, concorrentes, loja, outro.",
            },
            extracted_text: { type: "string", description: "Todo texto visível no print" },
            structured: {
              type: "object",
              properties: UNION_PROPS,
              additionalProperties: false,
              description:
                "Preencha TODOS os campos visíveis no print. NUNCA invente. Se não enxergar, omita o campo. " +
                "Tempos: converta faixas para o ponto médio (ex.: '30-40 min' = 35). Taxa 'Grátis' = 0.",
            },
            confidence: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["category", "extracted_text", "structured", "confidence"],
          additionalProperties: false,
        },
      },
    };

    const systemMsg = shouldAutoClassify
      ? "Você analisa prints de painéis de delivery (iFood, Rappi, 99Food, WhatsApp, Instagram). Identifique a categoria do print E extraia o MÁXIMO de dados visíveis para preencher um formulário de diagnóstico. Preencha TODOS os campos que enxergar — nome da loja, nota, preços, combos, reclamações, etc. NUNCA invente."
      : `Você analisa prints de painéis de delivery. Categoria: '${userCls}'. Extraia o MÁXIMO de dados visíveis. NUNCA invente.`;

    const userText = "Identifique a categoria e extraia TODOS os dados que conseguir ver: identidade da loja, números, nota, avaliações, produtos, combos, promoções, reclamações. Preencha o máximo de campos.";

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
