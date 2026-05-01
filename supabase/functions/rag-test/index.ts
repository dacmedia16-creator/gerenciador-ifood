// Função temporária de QA: dada uma query, retorna top-K do match_knowledge
// com title, source, area, similarity. Uso interno para validar a base RAG.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { embedTextWithMeta, toPgVector } from "../_shared/embeddings.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query: string = body?.query ?? "";
    const k: number = Math.min(Number(body?.k ?? 5), 10);
    if (!query) {
      return new Response(JSON.stringify({ error: "query obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const t0 = Date.now();
    const meta = await embedTextWithMeta(query);
    const tEmb = Date.now() - t0;
    if (!meta.vector) {
      return new Response(JSON.stringify({ error: "falha ao embedar", mode: meta.mode }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const t1 = Date.now();
    const { data, error } = await supabase.rpc("match_knowledge", {
      query_embedding: toPgVector(meta.vector) as any,
      match_count: k,
      filter_areas: null,
    });
    const tMatch = Date.now() - t1;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = (data ?? []).map((r: any) => ({
      similarity: Number(r.similarity?.toFixed(4)),
      source: r.source,
      area: r.area,
      title: r.title,
      chunk_id: r.chunk_id,
      preview: (r.content || "").slice(0, 160),
    }));

    return new Response(JSON.stringify({
      query,
      embed_mode: meta.mode,
      embed_ms: tEmb,
      match_ms: tMatch,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
