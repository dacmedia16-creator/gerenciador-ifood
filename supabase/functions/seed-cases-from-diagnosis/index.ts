// Camada 1 do aprendizado contínuo:
// Ao finalizar um diagnóstico, grava cada problema identificado como um
// "caso semente" anônimo na case_library, com perfil agregado da loja.
// Isso amplia o repertório que match_cases() devolve para próximos
// diagnósticos de qualquer usuário (a IA passa a ter exemplos reais).
//
// - Anonimização: NÃO armazena store_id, nome, endereço completo nem user_id.
//   store_profile contém apenas: category, platform, ticket_band, city_initial, size_band.
// - Outcome inicial: "neutro" (sem feedback ainda). A camada 2
//   (measure-outcomes + extract-case) atualiza/cria casos com outcome real.
// - Idempotência: usa um chunk_id estável por (storeId, area, problem_hash)
//   guardado em store_profile._seed_key para evitar duplicatas em re-runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { embedText, toPgVector } from "../_shared/embeddings.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

function ticketBand(t: number | null | undefined): string | null {
  if (t == null) return null;
  if (t < 30) return "baixo";
  if (t < 60) return "medio";
  return "alto";
}

function sizeBand(orders: number | null | undefined): string | null {
  if (orders == null) return null;
  if (orders < 300) return "pequena";
  if (orders < 1500) return "media";
  return "grande";
}

async function hashKey(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    const internal = req.headers.get("X-Internal-Call") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader?.startsWith("Bearer ") && !internal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.sessionId;
    const storeIdParam: string | undefined = body?.storeId;
    if (!sessionId && !storeIdParam) {
      return new Response(JSON.stringify({ error: "sessionId ou storeId obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve storeId
    let storeId = storeIdParam ?? null;
    if (!storeId && sessionId) {
      const { data: sess } = await admin
        .from("diagnosis_sessions").select("store_id, user_id").eq("id", sessionId).maybeSingle();
      if (!sess?.store_id) {
        return new Response(JSON.stringify({ inserted: 0, skipped: "no_store" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      storeId = sess.store_id;
    }

    // Se chamada com JWT (não interna), valida que o usuário é dono da loja
    if (!internal && authHeader && storeId) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: ok } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
      if (!ok) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // Perfil agregado anonimizado
    const { data: store } = await admin
      .from("stores")
      .select("category, platform, city, average_ticket, monthly_orders")
      .eq("id", storeId!).maybeSingle();

    const storeProfileBase = {
      category: store?.category ?? null,
      platform: store?.platform ?? null,
      city_initial: store?.city ? String(store.city).charAt(0).toUpperCase() : null,
      ticket_band: ticketBand(store?.average_ticket as any),
      size_band: sizeBand(store?.monthly_orders as any),
    };

    // Diagnósticos da loja — pega os mais recentes (até 20).
    // Critério: a tabela diagnostics não guarda session_id; se vier sessionId,
    // filtramos pelos últimos 30 minutos (heurística da rodada atual).
    let dq = admin.from("diagnostics")
      .select("id, area, problem, recommended_solution, priority, severity, business_impact, evidence, created_at")
      .eq("store_id", storeId!)
      .order("created_at", { ascending: false })
      .limit(20);
    if (sessionId) {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      dq = dq.gte("created_at", since);
    }
    const { data: diagnostics, error: dErr } = await dq;
    if (dErr) throw dErr;

    let inserted = 0;
    let skipped = 0;

    for (const d of diagnostics ?? []) {
      // Filtra ruído: precisa ter recomendação minimamente útil
      if (!d.recommended_solution || (d.recommended_solution as string).length < 20) {
        skipped++; continue;
      }
      const problemHash = await hashKey(`${d.area}|${(d.problem ?? "").slice(0, 80)}`);
      const seedKey = `seed:${storeId}:${problemHash}`;

      // Idempotência: se já existe um caso seed com essa key, pula.
      const { data: existing } = await admin
        .from("case_library")
        .select("id")
        .contains("store_profile", { _seed_key: seedKey })
        .limit(1)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const text = [
        `area: ${d.area ?? ""}`,
        `problema: ${d.problem ?? ""}`,
        `recomendacao: ${d.recommended_solution ?? ""}`,
        `severidade: ${d.severity ?? d.priority ?? ""}`,
      ].join(". ");
      const vec = await embedText(text).catch(() => null);

      const payload: any = {
        store_profile: { ...storeProfileBase, _seed_key: seedKey, _source: "seed_from_diagnosis" },
        problem_rule_id: d.area ?? null,
        metrics_before: {},
        diagnosis: d.problem ?? d.area ?? null,
        recommendation: d.recommended_solution,
        user_action: "pendente",
        metrics_after: {},
        outcome: "neutro",
        usefulness_score: null,
        embedding: vec ? (toPgVector(vec) as any) : null,
      };
      const { error: insErr } = await admin.from("case_library").insert(payload);
      if (insErr) { console.warn("insert seed case failed", insErr); skipped++; continue; }
      inserted++;
    }

    return new Response(JSON.stringify({
      inserted, skipped, considered: diagnostics?.length ?? 0,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("seed-cases-from-diagnosis error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
