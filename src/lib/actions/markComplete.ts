import { supabase } from "@/integrations/supabase/client";

/**
 * Marca uma ação como concluída e cria o registro de follow-up de outcome
 * para 7 dias depois. Idempotente: se já existe outcome para esta ação,
 * não cria outro (UNIQUE constraint em action_id).
 */
export async function markActionComplete(params: {
  action_id: string;
  store_id: string;
  user_id: string;
  status?: string; // default 'aplicada'
  extra?: Record<string, any>;
}) {
  const completed_at = new Date().toISOString();
  const status = params.status ?? "aplicada";

  const { error: updErr } = await supabase
    .from("action_plans")
    .update({ status, completed_at, ...(params.extra || {}) })
    .eq("id", params.action_id);
  if (updErr) throw updErr;

  const followup_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // Upsert por action_id (UNIQUE) — evita duplicar caso a ação seja reaberta/concluída de novo.
  await supabase
    .from("action_outcomes")
    .upsert(
      {
        action_id: params.action_id,
        store_id: params.store_id,
        user_id: params.user_id,
        completed_at,
        followup_at,
      },
      { onConflict: "action_id", ignoreDuplicates: true },
    );

  return { completed_at, followup_at };
}
