// Processa um print de forma assíncrona via fila print_jobs.
// Chamada por fire-and-forget pelo frontend logo após inserir o job.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROMPT = `Analise este print do painel iFood Parceiros (ou similar de delivery).
Extraia APENAS os dados que conseguir ler com certeza.
Para dados que não conseguir ler, use null.
Retorne SOMENTE JSON válido, sem texto adicional.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "extract_print_data",
    description: "Extrai dados de print de delivery",
    parameters: {
      type: "object",
      properties: {
        rating: { type: ["number", "null"] },
        cancellation_rate: { type: ["number", "null"] },
        total_orders_period: { type: ["number", "null"] },
        avg_ticket: { type: ["number", "null"] },
        revenue_period: { type: ["number", "null"] },
        period_description: { type: ["string", "null"] },
        top_complaints: { type: ["array", "null"], items: { type: "string" } },
        data_confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["data_confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let jobId: string | null = null;

  try {
    const body = await req.json();
    jobId = body.job_id;
    if (!jobId) throw new Error("job_id obrigatório");

    const { data: job, error: jErr } = await admin
      .from("print_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jErr || !job) throw new Error("Job não encontrado");
    if (job.status === "done") {
      return new Response(JSON.stringify({ ok: true, already_done: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("print_jobs")
      .update({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
      .eq("id", jobId);

    const { data: file, error: dErr } = await admin.storage
      .from("prints")
      .download(job.storage_path);
    if (dErr || !file) throw new Error("Falha ao baixar print do storage");

    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(
        null,
        buf.subarray(i, i + CHUNK) as unknown as number[],
      );
    }
    const b64 = btoa(binary);
    const mime = (file as Blob).type || "image/png";
    const dataUrl = `data:${mime};base64,${b64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você extrai dados de prints de delivery em JSON estruturado. NUNCA invente." },
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_print_data" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${txt.slice(0, 200)}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { data_confidence: "low" };

    await admin
      .from("print_jobs")
      .update({
        status: "done",
        result,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-print-job error", msg);
    if (jobId) {
      await admin
        .from("print_jobs")
        .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
        .eq("id", jobId);
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
