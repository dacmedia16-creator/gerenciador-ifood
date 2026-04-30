// Gera/atualiza embeddings para knowledge_base ou case_library.
// Usado por: seed inicial, novas inserções e job extract-case.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { embedText, toPgVector } from "../_shared/embeddings.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const table: string = body?.table ?? "knowledge_base";
    const limit: number = Math.min(Number(body?.limit ?? 50), 100);
    const ids: string[] | undefined = body?.ids;

    if (!["knowledge_base", "case_library"].includes(table)) {
      return new Response(JSON.stringify({ error: "tabela inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase.from(table).select("*").is("embedding", null).limit(limit);
    if (ids?.length) query = supabase.from(table).select("*").in("id", ids);

    const { data: rows, error } = await query;
    if (error) throw error;

    let updated = 0;
    let skipped = 0;
    for (const row of rows ?? []) {
      const text = table === "knowledge_base"
        ? `${row.area}. ${row.title}. ${row.content}`
        : `${row.problem_rule_id ?? ""}. ${row.diagnosis ?? ""}. ${row.recommendation ?? ""}. ${row.lesson_learned ?? ""}`;
      const vec = await embedText(text);
      if (!vec) { skipped++; continue; }
      const { error: upErr } = await supabase
        .from(table)
        .update({ embedding: toPgVector(vec) as any })
        .eq("id", row.id);
      if (upErr) { console.warn("update embedding failed", upErr); skipped++; continue; }
      updated++;
    }

    return new Response(JSON.stringify({ updated, skipped, processed: rows?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-knowledge error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
