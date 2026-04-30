// Mede objetivamente o resultado de recomendações aplicadas:
// compara metrics_before com metrics agregadas após applied_at e
// preenche metrics_after + outcome em recommendation_history.
//
// Acionada manualmente por loja. v1 sem cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapeamento rule_id -> métrica-alvo + direção desejada (up/down)
const TARGETS: Record<string, { key: string; better: "up" | "down" }> = {
  rating_baixo: { key: "rating", better: "up" },
  tempo_entrega_alto: { key: "promised_delivery_time", better: "down" },
  cancelamento_alto: { key: "cancellation_rate", better: "down" },
  ticket_baixo: { key: "average_ticket", better: "up" },
  conversao_baixa: { key: "orders", better: "up" },
  margem_baixa: { key: "estimated_profit", better: "up" },
  recompra_baixa: { key: "orders", better: "up" },
  campanha_corroe_margem: { key: "estimated_profit", better: "up" },
  faturamento_sobe_lucro_cai: { key: "estimated_profit", better: "up" },
  tendencia_faturamento_7_30d: { key: "revenue", better: "up" },
};

const THRESHOLD_PCT = 5; // > 5% melhora => positivo; < -5% => negativo

function avg(arr: any[], k: string): number | null {
  const vs = arr.map((x) => Number(x?.[k])).filter((n) => !isNaN(n));
  if (!vs.length) return null;
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}
function sum(arr: any[], k: string): number {
  return arr.reduce((a, x) => a + (Number(x?.[k]) || 0), 0);
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
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const body = await req.json().catch(() => ({}));
    const storeId: string | undefined = body?.storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Valida acesso via RLS antes de escalar para service role.
    const { data: storeOk } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
    if (!storeOk) {
      return new Response(JSON.stringify({ error: "Loja não encontrada ou sem acesso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pega recomendações aplicadas há >= 7 dias e ainda sem outcome objetivo
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
      // Janela: do applied_at até hoje (até 30d max)
      const until = new Date(Math.min(Date.now(), new Date(appliedAt).getTime() + 30 * 86400000)).toISOString().slice(0, 10);
      const from = appliedAt.slice(0, 10);

      const { data: mAfter } = await admin
        .from("metrics").select("*")
        .eq("store_id", storeId)
        .gte("period_end", from)
        .lte("period_end", until);

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

      let outcome: string | null = null;
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
        } else {
          outcome = "inconclusivo";
        }
      } else {
        outcome = "inconclusivo";
      }

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

      // Casos positivos viram exemplo na biblioteca
      if (outcome === "positivo") {
        admin.functions.invoke("extract-case", { body: { recommendation_id: r.id } }).catch((e) =>
          console.warn("extract-case invoke failed", e),
        );
      }
    }

    // Atualiza store_memory com novo resumo
    admin.functions.invoke("update-store-memory", { body: { storeId } }).catch(() => {});

    return new Response(JSON.stringify({ measured, candidates: recs?.length ?? 0, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("measure-outcomes error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
