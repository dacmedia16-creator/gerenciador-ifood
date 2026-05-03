// Process a print uploaded by the user: download from storage, send to Lovable AI
// (multimodal), extract text + structured data based on classification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SCHEMA_BY_CLASSIFICATION: Record<string, any> = {
  faturamento: {
    revenue: { type: "number", description: "Faturamento total no período" },
    orders: { type: "number" },
    average_ticket: { type: "number" },
    period: { type: "string", description: "Ex: '7 dias', 'Mês 10/2025'" },
  },
  indicadores: {
    rating: { type: "number" },
    reviews_count: { type: "number" },
    cancellation_rate: { type: "number", description: "Em %" },
    delivery_time_min: { type: "number" },
    prep_time_min: { type: "number" },
  },
  avaliacoes: {
    average_rating: { type: "number" },
    total_reviews: { type: "number" },
    top_complaints: { type: "array", items: { type: "string" } },
    top_compliments: { type: "array", items: { type: "string" } },
  },
  cardapio: {
    products_visible: { type: "number" },
    products_with_photo: { type: "number" },
    has_combos: { type: "boolean" },
    notes: { type: "string" },
  },
  produto: {
    name: { type: "string" },
    price: { type: "number" },
    has_photo: { type: "boolean" },
    has_description: { type: "boolean" },
    description_quality: { type: "string", enum: ["boa", "media", "ruim"] },
  },
  promocoes: {
    has_coupon: { type: "boolean" },
    has_free_delivery: { type: "boolean" },
    discount_percent: { type: "number" },
    notes: { type: "string" },
  },
  concorrentes: {
    name: { type: "string" },
    rating: { type: "number" },
    delivery_time_min: { type: "number" },
    price_range: { type: "string" },
    notes: { type: "string" },
  },
  loja: {
    has_cover: { type: "boolean" },
    has_logo: { type: "boolean" },
    looks_professional: { type: "string", enum: ["sim", "medio", "nao"] },
    rating: { type: "number" },
    notes: { type: "string" },
  },
  outro: {
    notes: { type: "string" },
  },
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
    const b64 = btoa(String.fromCharCode(...buf));
    const mime = upload.mime_type || "image/png";
    const dataUrl = `data:${mime};base64,${b64}`;

    const cls = upload.classification || "outro";
    const schemaProps = SCHEMA_BY_CLASSIFICATION[cls] || SCHEMA_BY_CLASSIFICATION.outro;

    const tool = {
      type: "function",
      function: {
        name: "extract_print_data",
        description: `Extrair dados de um print de ${cls} de delivery (iFood, Rappi, 99Food, WhatsApp, Instagram).`,
        parameters: {
          type: "object",
          properties: {
            extracted_text: { type: "string", description: "Todo texto visível no print" },
            structured: {
              type: "object",
              properties: schemaProps,
              additionalProperties: false,
            },
            confidence: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["extracted_text", "structured", "confidence"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você analisa prints de painéis de delivery e extrai dados objetivos. NÃO invente números — se não estiver visível, omita o campo.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Classificação informada: ${cls}. Extraia o que estiver visível.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_print_data" } },
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
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { extracted_text: "", structured: {}, confidence: "baixa" };

    await admin
      .from("diagnosis_uploads")
      .update({
        extracted_text: args.extracted_text || null,
        structured_data: { ...args.structured, _confidence: args.confidence },
        status: "processed",
        error: null,
      })
      .eq("id", upload_id);

    return new Response(JSON.stringify({ ok: true, structured: args.structured, confidence: args.confidence }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
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
