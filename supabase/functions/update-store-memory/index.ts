// Recalcula store_memory: perfil, problemas recorrentes e snapshots de métricas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function aggregate(metrics: any[]) {
  if (!metrics.length) return {};
  const sum = (k: string) => metrics.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  const avg = (k: string) => {
    const vals = metrics.map((m) => Number(m[k])).filter((n) => !isNaN(n));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    revenue: sum("revenue"),
    orders: sum("orders"),
    avg_ticket: avg("average_ticket"),
    avg_rating: avg("rating"),
    avg_cancel: avg("cancellation_rate"),
    samples: metrics.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com JWT do usuário só para validar acesso à loja (RLS aplica).
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json().catch(() => ({}));
    const storeId: string | undefined = body?.storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida que o usuário tem acesso à loja (RLS faz isso retornando vazio).
    const { data: storeCheck } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
    if (!storeCheck) {
      return new Response(JSON.stringify({ error: "Loja não encontrada ou sem acesso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A partir daqui, service role para escrever em store_memory (bypassa RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();
    const since = (d: number) => new Date(now - d * 86400000).toISOString().slice(0, 10);

    const [storeR, m7R, m14R, m30R, recR, repR] = await Promise.all([
      supabase.from("stores").select("*").eq("id", storeId).single(),
      supabase.from("metrics").select("*").eq("store_id", storeId).gte("period_end", since(7)),
      supabase.from("metrics").select("*").eq("store_id", storeId).gte("period_end", since(14)),
      supabase.from("metrics").select("*").eq("store_id", storeId).gte("period_end", since(30)),
      supabase.from("recommendation_history").select("rule_id, created_at, status, outcome")
        .eq("store_id", storeId)
        .gte("created_at", new Date(now - 30 * 86400000).toISOString()),
      supabase.from("reports").select("created_at")
        .eq("store_id", storeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const store = storeR.data ?? {};
    const profile = {
      name: store.name,
      category: store.category,
      platform: store.platform,
      city: store.city,
      ticket_band: store.average_ticket
        ? (store.average_ticket < 30 ? "baixo" : store.average_ticket < 60 ? "medio" : "alto")
        : null,
    };

    // Recorrência: rule_id que apareceu 2+ vezes nos últimos 30 dias
    const counts: Record<string, { count: number; first: string; last: string; statuses: Set<string> }> = {};
    for (const r of recR.data ?? []) {
      if (!r.rule_id) continue;
      const c = counts[r.rule_id] ?? { count: 0, first: r.created_at, last: r.created_at, statuses: new Set() };
      c.count++;
      if (r.created_at < c.first) c.first = r.created_at;
      if (r.created_at > c.last) c.last = r.created_at;
      if (r.status) c.statuses.add(r.status);
      counts[r.rule_id] = c;
    }
    const recurring = Object.entries(counts)
      .filter(([, v]) => v.count >= 2)
      .map(([rule_id, v]) => ({
        rule_id, count: v.count, first_seen: v.first, last_seen: v.last,
        statuses: Array.from(v.statuses),
      }));

    const payload = {
      store_id: storeId,
      profile,
      recurring_problems: recurring,
      metrics_7d: aggregate(m7R.data ?? []),
      metrics_14d: aggregate(m14R.data ?? []),
      metrics_30d: aggregate(m30R.data ?? []),
      last_diagnosis_at: repR.data?.created_at ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("store_memory").upsert(payload, { onConflict: "store_id" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, recurring_count: recurring.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-store-memory error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
