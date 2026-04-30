// Mede objetivamente o resultado de recomendações aplicadas:
// compara metrics_before com metrics agregadas após applied_at e
// preenche metrics_after + outcome em recommendation_history.
//
// Dois modos:
//  - { storeId }              → user-facing, valida acesso via JWT
//  - { allStores: true } + header X-Internal-Cron → cron diário
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const TARGETS: Record<string, { key: string; better: "up" | "down" }> = {
  rating_baixo: { key: "rating", better: "up" },
  reputacao_nota_baixa: { key: "rating", better: "up" },
  tempo_entrega_alto: { key: "promised_delivery_time", better: "down" },
  cancelamento_alto: { key: "cancellation_rate", better: "down" },
  cancelamento_falta_produto: { key: "cancellation_rate", better: "down" },
  ticket_baixo: { key: "average_ticket", better: "up" },
  conversao_baixa: { key: "orders", better: "up" },
  margem_baixa: { key: "estimated_profit", better: "up" },
  margem_media_baixa: { key: "estimated_profit", better: "up" },
  recompra_baixa: { key: "orders", better: "up" },
  campanha_corroe_margem: { key: "estimated_profit", better: "up" },
  faturamento_sobe_lucro_cai: { key: "estimated_profit", better: "up" },
  tendencia_faturamento_7_30d: { key: "revenue", better: "up" },
  top_produto_margem_baixa: { key: "estimated_profit", better: "up" },
};

const THRESHOLD_PCT = 5;

function avg(arr: any[], k: string): number | null {
  const vs = arr.map((x) => Number(x?.[k])).filter((n) => !isNaN(n));
  if (!vs.length) return null;
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}
function sum(arr: any[], k: string): number {
  return arr.reduce((a, x) => a + (Number(x?.[k]) || 0), 0);
}

async function measureForStore(admin: any, storeId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recs, error: recsErr } = await admin
    .from("recommendation_history")
    .select("id, rule_id, applied_at, metrics_before, outcome, metrics_after")
    .eq("store_id", storeId)
    .eq("status", "aplicada")
    .not("applied_at", "is", null)
    .lte("applied_at", sevenDaysAgo)
    .is("metrics_after", null);
  if (recsErr) throw recsErr;

  let measured = 0;
  const results: any[] = [];

  for (const r of recs ?? []) {
    const target = TARGETS[r.rule_id ?? ""];
    const appliedAt = r.applied_at as string;
    const until = new Date(Math.min(Date.now(), new Date(appliedAt).getTime() + 30 * 86400000)).toISOString().slice(0, 10);
    const from = appliedAt.slice(0, 10);

    const { data: mAfter } = await admin
      .from("metrics").select("*")
      .eq("store_id", storeId)
      .gte("period_end", from).lte("period_end", until);

    const { data: storeNow } = await admin
      .from("stores").select("rating, promised_delivery_time, cancellation_rate, average_ticket, monthly_revenue")
      .eq("id", storeId).maybeSingle();

    const metricsAfter: any = {
      captured_at: new Date().toISOString(),
      rating: avg(mAfter ?? [], "rating") ?? storeNow?.rating ?? null,
      revenue: sum(mAfter ?? [], "revenue"),
      orders: sum(mAfter ?? [], "orders"),
      average_ticket: avg(mAfter ?? [], "average_ticket") ?? storeNow?.average_ticket ?? null,
      cancellation_rate: avg(mAfter ?? [], "cancellation_rate") ?? storeNow?.cancellation_rate ?? null,
      estimated_profit: sum(mAfter ?? [], "estimated_profit"),
      promised_delivery_time: storeNow?.promised_delivery_time ?? null,
      samples: mAfter?.length ?? 0,
    };

    let outcome: string = "inconclusivo";
    let outcome_explanation: string | null = null;
    if (target) {
      const before = Number((r.metrics_before as any)?.[target.key]);
      const after = Number(metricsAfter[target.key]);
      if (!isNaN(before) && !isNaN(after) && before !== 0) {
        const pct = ((after - before) / Math.abs(before)) * 100;
        const improvement = target.better === "up" ? pct : -pct;
        if (improvement > THRESHOLD_PCT) outcome = "positivo";
        else if (improvement < -THRESHOLD_PCT) outcome = "negativo";
        else outcome = "neutro";
        metricsAfter._delta_pct = Number(pct.toFixed(2));
        metricsAfter._target_metric = target.key;

        const labelMap: Record<string, string> = {
          rating: "sua nota",
          promised_delivery_time: "o tempo de entrega prometido",
          cancellation_rate: "a taxa de cancelamento",
          average_ticket: "o ticket médio",
          orders: "o número de pedidos",
          estimated_profit: "o lucro estimado",
          revenue: "o faturamento",
        };
        const label = labelMap[target.key] ?? target.key;
        const fmt = (v: number) => target.key === "rating" ? v.toFixed(2) : Math.round(v).toString();
        const sentido = improvement > THRESHOLD_PCT
          ? "melhorou"
          : improvement < -THRESHOLD_PCT
            ? "piorou"
            : "ficou estável";
        outcome_explanation = `Após você aplicar a ação, ${label} ${sentido}: passou de ${fmt(before)} para ${fmt(after)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%).`;
      } else {
        outcome_explanation = "Ainda não há dados suficientes para medir o impacto desta ação.";
      }
    } else {
      outcome_explanation = "Esta recomendação não tem métrica objetiva associada — peça feedback ao dono.";
    }
    metricsAfter._explanation = outcome_explanation;

    const { error: upErr } = await admin
      .from("recommendation_history")
      .update({
        metrics_after: metricsAfter,
        outcome,
        outcome_measured_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (upErr) { console.warn("update failed", upErr); continue; }

    measured++;
    results.push({ id: r.id, rule_id: r.rule_id, outcome, delta_pct: metricsAfter._delta_pct ?? null });

    if (outcome === "positivo") {
      admin.functions.invoke("extract-case", {
        body: { recommendation_id: r.id },
        headers: { "X-Internal-Call": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! },
      }).catch((e: any) => console.warn("extract-case invoke failed", e));
    }
  }

  // Atualiza memória após medir
  admin.functions.invoke("update-store-memory", {
    body: { storeId, _internal: true },
    headers: { "X-Internal-Call": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! },
  }).catch(() => {});

  return { measured, candidates: recs?.length ?? 0, results };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Modo cron: chamado com header interno (anon key não basta — exige service role como segredo).
    const internalCall = req.headers.get("X-Internal-Call") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (body?.allStores && internalCall) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: storesPending } = await admin
        .from("recommendation_history")
        .select("store_id")
        .eq("status", "aplicada")
        .not("applied_at", "is", null)
        .lte("applied_at", sevenDaysAgo)
        .is("metrics_after", null);
      const uniqueStores = Array.from(new Set((storesPending ?? []).map((s: any) => s.store_id)));
      let totalMeasured = 0;
      for (const sid of uniqueStores) {
        try {
          const r = await measureForStore(admin, sid);
          totalMeasured += r.measured;
        } catch (e) { console.warn("store measure failed", sid, e); }
      }
      return new Response(JSON.stringify({ stores: uniqueStores.length, totalMeasured }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Modo user-facing: valida JWT e acesso à loja
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const storeId: string | undefined = body?.storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data: storeOk } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
    if (!storeOk) {
      return new Response(JSON.stringify({ error: "Loja não encontrada ou sem acesso" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const result = await measureForStore(admin, storeId);
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("measure-outcomes error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
