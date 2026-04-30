// Recalcula store_memory: perfil, métricas, problemas recorrentes E aprendizados
// (sucessos, falhas, ações ignoradas várias vezes, áreas melhorando/piorando).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

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

// Compara médias 7d vs 30d. Retorna arrays de áreas melhorando / piorando.
function trendByMetric(m7: any, m30: any) {
  const improving: string[] = [];
  const worsening: string[] = [];
  const cmp = (a: number | null, b: number | null, betterUp: boolean, label: string) => {
    if (a == null || b == null || b === 0) return;
    const delta = (a - b) / Math.abs(b);
    if (Math.abs(delta) < 0.05) return;
    const isBetter = betterUp ? delta > 0 : delta < 0;
    (isBetter ? improving : worsening).push(label);
  };
  cmp(m7.avg_rating, m30.avg_rating, true, "rating");
  cmp(m7.avg_ticket, m30.avg_ticket, true, "ticket_medio");
  cmp(m7.avg_cancel, m30.avg_cancel, false, "cancelamento");
  cmp(m7.revenue, m30.revenue, true, "faturamento");
  cmp(m7.orders, m30.orders, true, "pedidos");
  return { improving, worsening };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const storeId: string | undefined = body?.storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Auth: aceita JWT do usuário OU chamada interna (do measure-outcomes).
    const internalCall = req.headers.get("X-Internal-Call") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!internalCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: storeCheck } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
      if (!storeCheck) {
        return new Response(JSON.stringify({ error: "Loja não encontrada ou sem acesso" }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

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
      supabase.from("recommendation_history").select("id, rule_id, created_at, status, outcome")
        .eq("store_id", storeId)
        .gte("created_at", new Date(now - 90 * 86400000).toISOString()),
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

    // Recorrência por rule_id (>=2 ocorrências em 90d)
    const counts: Record<string, { count: number; first: string; last: string; statuses: Set<string>; outcomes: Set<string> }> = {};
    for (const r of recR.data ?? []) {
      if (!r.rule_id) continue;
      const c = counts[r.rule_id] ?? {
        count: 0, first: r.created_at, last: r.created_at,
        statuses: new Set<string>(), outcomes: new Set<string>(),
      };
      c.count++;
      if (r.created_at < c.first) c.first = r.created_at;
      if (r.created_at > c.last) c.last = r.created_at;
      if (r.status) c.statuses.add(r.status);
      if (r.outcome) c.outcomes.add(r.outcome);
      counts[r.rule_id] = c;
    }
    const recurring = Object.entries(counts)
      .filter(([, v]) => v.count >= 2)
      .map(([rule_id, v]) => ({
        rule_id, count: v.count, first_seen: v.first, last_seen: v.last,
        statuses: Array.from(v.statuses), outcomes: Array.from(v.outcomes),
      }));

    // Aprendizados explícitos
    const successful_recommendations = Object.entries(counts)
      .filter(([, v]) => v.outcomes.has("positivo"))
      .map(([rule_id, v]) => ({ rule_id, count: v.count, last_seen: v.last }));

    const failed_recommendations = Object.entries(counts)
      .filter(([, v]) => v.outcomes.has("negativo"))
      .map(([rule_id, v]) => ({ rule_id, count: v.count, last_seen: v.last }));

    const ignored_repeatedly = Object.entries(counts)
      .filter(([, v]) => v.statuses.has("ignorada") && v.count >= 2)
      .map(([rule_id, v]) => ({ rule_id, count: v.count, last_seen: v.last }));

    const m7 = aggregate(m7R.data ?? []);
    const m14 = aggregate(m14R.data ?? []);
    const m30 = aggregate(m30R.data ?? []);
    const trend = trendByMetric(m7, m30);

    const payload = {
      store_id: storeId,
      profile,
      recurring_problems: recurring,
      successful_recommendations,
      failed_recommendations,
      ignored_repeatedly,
      improving_areas: trend.improving,
      worsening_areas: trend.worsening,
      metrics_7d: m7,
      metrics_14d: m14,
      metrics_30d: m30,
      last_diagnosis_at: repR.data?.created_at ?? null,
      updated_at: new Date().toISOString(),
    };

    // store_memory tem profile/recurring_problems/metrics_*. Os campos novos vão
    // dentro de profile.learning para não exigir migration imediata.
    const enrichedProfile = {
      ...profile,
      learning: {
        successful_recommendations,
        failed_recommendations,
        ignored_repeatedly,
        improving_areas: trend.improving,
        worsening_areas: trend.worsening,
      },
    };

    const { error } = await supabase.from("store_memory").upsert({
      store_id: storeId,
      profile: enrichedProfile,
      recurring_problems: recurring,
      metrics_7d: m7,
      metrics_14d: m14,
      metrics_30d: m30,
      last_diagnosis_at: repR.data?.created_at ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "store_id" });
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true,
      recurring_count: recurring.length,
      successful: successful_recommendations.length,
      failed: failed_recommendations.length,
      ignored: ignored_repeatedly.length,
      improving: trend.improving,
      worsening: trend.worsening,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("update-store-memory error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
