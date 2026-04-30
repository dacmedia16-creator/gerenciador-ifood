// Extrai casos com outcome definido para a case_library (anonimizado) e gera embedding.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { embedText, toPgVector } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const recommendationId: string | undefined = body?.recommendation_id;
    const limit: number = Math.min(Number(body?.limit ?? 20), 50);

    let query = supabase
      .from("recommendation_history")
      .select("id, store_id, rule_id, recommendation, metrics_before, metrics_after, status, outcome")
      .not("outcome", "is", null);
    if (recommendationId) query = query.eq("id", recommendationId);
    else query = query.limit(limit);

    const { data: recs, error } = await query;
    if (error) throw error;

    let inserted = 0;
    for (const r of recs ?? []) {
      // Busca perfil anonimizado da loja
      const { data: store } = await supabase.from("stores").select("category, platform, city, average_ticket").eq("id", r.store_id).maybeSingle();
      // Busca último feedback para extrair "lição"
      const { data: fb } = await supabase
        .from("recommendation_feedback").select("rating, comment, generated_result")
        .eq("recommendation_id", r.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      const outcomeMap: Record<string, string> = { positivo: "sucesso", negativo: "fracasso", neutro: "neutro", inconclusivo: "neutro" };
      const outcome = outcomeMap[r.outcome] ?? "neutro";

      const text = `${r.rule_id ?? ""}. ${r.recommendation}. resultado: ${outcome}.`;
      const vec = await embedText(text);

      const payload = {
        store_profile: {
          category: store?.category ?? null,
          platform: store?.platform ?? null,
          city_initial: store?.city ? store.city.charAt(0) : null,
          ticket_band: store?.average_ticket
            ? (store.average_ticket < 30 ? "baixo" : store.average_ticket < 60 ? "medio" : "alto")
            : null,
        },
        problem_rule_id: r.rule_id,
        metrics_before: r.metrics_before ?? {},
        diagnosis: r.recommendation, // simplificação v1
        recommendation: r.recommendation,
        user_action: r.status,
        metrics_after: r.metrics_after ?? {},
        outcome,
        user_feedback: fb?.comment ?? null,
        lesson_learned: fb?.comment ?? null,
        embedding: vec ? (toPgVector(vec) as any) : null,
      };

      const { error: insErr } = await supabase.from("case_library").insert(payload);
      if (insErr) { console.warn("insert case failed", insErr); continue; }
      inserted++;
    }

    return new Response(JSON.stringify({ inserted, processed: recs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-case error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
