// Gera/atualiza embeddings para knowledge_base ou case_library.
// Suporta:
//  - { table, limit }                → embeda apenas registros sem embedding
//  - { table, limit, force: true }   → reembeda registros com embedding_version < EMBED_MODEL_VERSION
//  - { table, ids: [...] }           → embeda os IDs informados (independente de versão)
//
// Sempre grava embedding_version com a versão usada (1 = lexical, 2 = semântico).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  embedTextWithMeta,
  toPgVector,
  EMBED_MODEL_VERSION,
} from "../_shared/embeddings.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const table: string = body?.table ?? "knowledge_base";
    const limit: number = Math.min(Number(body?.limit ?? 50), 100);
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    const force: boolean = body?.force === true;

    if (!["knowledge_base", "case_library"].includes(table)) {
      return new Response(JSON.stringify({ error: "tabela inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seleção de registros
    let rows: any[] = [];
    if (ids?.length) {
      const { data, error } = await supabase.from(table).select("*").in("id", ids);
      if (error) throw error;
      rows = data ?? [];
    } else if (force) {
      // Reembeda registros com versão < atual
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .lt("embedding_version", EMBED_MODEL_VERSION)
        .limit(limit);
      if (error) throw error;
      rows = data ?? [];
    } else {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .is("embedding", null)
        .limit(limit);
      if (error) throw error;
      rows = data ?? [];
    }

    let updated = 0;
    let skipped = 0;
    let modeFull = 0;
    let modeDegraded = 0;

    // Processa sequencialmente para evitar 429 no gateway. Cada chamada
    // já tem timeout de 8s; lote de 50 termina em ~1-2 min com folga.
    for (const row of rows) {
      const text = table === "knowledge_base"
        ? `${row.area ?? ""}. ${row.title ?? ""}. ${row.content ?? ""}`
        : `${row.problem_rule_id ?? ""}. ${row.diagnosis ?? ""}. ${row.recommendation ?? ""}. ${row.lesson_learned ?? ""}`;

      const meta = await embedTextWithMeta(text);
      if (!meta.vector) { skipped++; continue; }
      if (meta.mode === "full") modeFull++; else modeDegraded++;

      const { error: upErr } = await supabase
        .from(table)
        .update({
          embedding: toPgVector(meta.vector) as any,
          embedding_version: meta.version ?? (meta.mode === "full" ? EMBED_MODEL_VERSION : 1),
        })
        .eq("id", row.id);
      if (upErr) {
        console.warn("update embedding failed", upErr);
        skipped++;
        continue;
      }
      updated++;
    }

    return new Response(JSON.stringify({
      updated,
      skipped,
      processed: rows.length,
      mode_full: modeFull,
      mode_degraded: modeDegraded,
      target_version: EMBED_MODEL_VERSION,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-knowledge error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
