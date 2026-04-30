// Registra feedback do usuário sobre uma recomendação e atualiza o histórico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATINGS = new Set(["util","nao_util","errada","falta_contexto","dificil_executar"]);
const RESULTS = new Set(["sim","nao","nao_sei"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const recommendation_id: string | undefined = body?.recommendation_id;
    if (!recommendation_id) {
      return new Response(JSON.stringify({ error: "recommendation_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rating: string | null = body?.rating ?? null;
    const applied: boolean | null = typeof body?.applied === "boolean" ? body.applied : null;
    const generated_result: string | null = body?.generated_result ?? null;
    const comment: string | null = body?.comment ?? null;

    if (rating && !RATINGS.has(rating)) {
      return new Response(JSON.stringify({ error: "rating inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (generated_result && !RESULTS.has(generated_result)) {
      return new Response(JSON.stringify({ error: "generated_result inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insere feedback
    const { error: fbErr } = await supabase.from("recommendation_feedback").insert({
      recommendation_id, user_id: userId, rating, applied, generated_result, comment,
    });
    if (fbErr) throw fbErr;

    // Atualiza status/outcome no histórico
    const update: any = {};
    if (applied === true) { update.status = "aplicada"; update.applied_at = new Date().toISOString(); }
    else if (applied === false && rating === "nao_util") update.status = "ignorada";

    if (generated_result === "sim") update.outcome = "positivo";
    else if (generated_result === "nao") update.outcome = "negativo";
    else if (rating === "errada") update.outcome = "negativo";

    if (Object.keys(update).length > 0) {
      update.outcome_measured_at = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("recommendation_history")
        .update(update)
        .eq("id", recommendation_id);
      if (upErr) console.warn("update rec_history failed", upErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("record-feedback error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
