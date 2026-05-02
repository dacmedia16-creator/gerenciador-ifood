// Records store-owner feedback on a single diagnostic problem.
// - Persists feedback inline in diagnostics.detailed_solution (history + last)
// - When signal is clearly positive/negative, inserts an anonymized row in
//   case_library so the global model learns from it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const RATINGS = new Set(["util", "nao_util", "errada", "falta_contexto", "dificil_executar"]);

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const diagnosticId: string | undefined = body?.diagnosticId;
    const rating: string | undefined = body?.rating;
    const applied: boolean | undefined = body?.applied;
    const comment: string | undefined = body?.comment;

    if (!diagnosticId) {
      return new Response(JSON.stringify({ error: "diagnosticId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (rating && !RATINGS.has(rating)) {
      return new Response(JSON.stringify({ error: "rating inválido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!rating && typeof applied !== "boolean" && !comment) {
      return new Response(JSON.stringify({ error: "feedback vazio" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Ownership check via RLS
    const { data: diag, error: diagErr } = await userClient
      .from("diagnostics")
      .select("id, store_id, area, problem, recommended_solution, detailed_solution, stores!inner(category, platform)")
      .eq("id", diagnosticId)
      .maybeSingle();
    if (diagErr || !diag) {
      return new Response(JSON.stringify({ error: "diagnostic not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const newFeedback = {
      user_id: userId,
      rating: rating ?? null,
      applied: typeof applied === "boolean" ? applied : null,
      comment: comment ?? null,
      created_at: new Date().toISOString(),
    };

    const detailed: any = (diag as any).detailed_solution || {};
    const history: any[] = Array.isArray(detailed._feedback) ? detailed._feedback : [];
    history.push(newFeedback);
    const updatedDetailed = { ...detailed, _feedback: history, _last_feedback: newFeedback };

    const { error: upErr } = await admin
      .from("diagnostics")
      .update({ detailed_solution: updatedDetailed })
      .eq("id", diagnosticId);
    if (upErr) throw upErr;

    // Anonymized signal to case_library — global learning layer
    const outcome = rating === "util" || applied === true
      ? "positivo"
      : rating === "nao_util" || rating === "errada" || applied === false
        ? "negativo"
        : null;

    if (outcome) {
      const store = (diag as any).stores;
      const profile = {
        category: store?.category ?? null,
        platform: store?.platform ?? null,
        _source: "diagnostic_feedback",
      };
      const { error: caseErr } = await admin.from("case_library").insert({
        store_profile: profile,
        problem_rule_id: diag.area,
        diagnosis: diag.problem,
        recommendation: detailed?.detailed_solution || diag.recommended_solution || diag.problem,
        outcome,
        user_feedback: rating ?? (applied ? "applied" : "ignored"),
        lesson_learned: comment ?? null,
      });
      if (caseErr) console.warn("case_library insert failed (non-blocking)", caseErr.message);
    }

    return new Response(JSON.stringify({ ok: true, outcome, last_feedback: newFeedback }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rate-diagnostic error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
