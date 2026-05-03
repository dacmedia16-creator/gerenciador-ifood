import { supabase } from "@/integrations/supabase/client";

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const pickFilled = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out;
};

/** Atualiza a tabela `stores` com os campos preenchidos no diagnóstico (merge). */
export async function syncStoreFromDiagnosis(
  storeId: string,
  allAnswers: Record<string, Record<string, any>>,
): Promise<void> {
  if (!storeId) return;
  const basic = allAnswers.basic || {};
  const front = allAnswers.storefront || {};
  const delivery = allAnswers.delivery || {};

  const update = pickFilled({
    name: str(basic.name),
    category: str(basic.category),
    platform: str(basic.platform),
    city: str(basic.city),
    neighborhood: str(basic.neighborhood),
    opening_hours: str(basic.opening_hours),
    monthly_orders: num(basic.monthly_orders),
    monthly_revenue: num(basic.monthly_revenue),
    average_ticket: num(basic.average_ticket),
    rating: num(front.rating),
    promised_delivery_time: num(front.promised_delivery_time),
    delivery_fee: num(front.delivery_fee),
    cancellation_rate: num(delivery.cancellation_rate),
  });

  if (Object.keys(update).length === 0) return;
  await supabase.from("stores").update(update).eq("id", storeId);
}

/** Cria/atualiza snapshot de métricas do mês corrente. */
export async function syncMetricsSnapshot(
  storeId: string,
  allAnswers: Record<string, Record<string, any>>,
): Promise<void> {
  if (!storeId) return;
  const basic = allAnswers.basic || {};
  const front = allAnswers.storefront || {};
  const delivery = allAnswers.delivery || {};

  const fields = pickFilled({
    rating: num(front.rating),
    revenue: num(basic.monthly_revenue),
    orders: num(basic.monthly_orders),
    average_ticket: num(basic.average_ticket),
    cancellation_rate: num(delivery.cancellation_rate),
    average_delivery_time: num(delivery.real_time),
  });
  if (Object.keys(fields).length === 0) return;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("metrics")
    .select("id")
    .eq("store_id", storeId)
    .eq("period_start", start)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("metrics").update(fields).eq("id", existing.id);
  } else {
    await supabase
      .from("metrics")
      .insert({ store_id: storeId, period_start: start, period_end: end, ...fields });
  }
}

/** Cria/atualiza meta ativa da loja a partir da etapa "goal". */
export async function syncStoreGoal(
  storeId: string,
  userId: string,
  goalValues: Record<string, any>,
): Promise<void> {
  if (!storeId || !userId) return;
  const goal_type = str(goalValues.goal_type);
  if (!goal_type) return;

  const current_value = num(goalValues.current_value);
  const target_value = num(goalValues.target_value);
  const days = num(goalValues.deadline);
  let deadline: string | null = null;
  if (days) {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(days));
    deadline = d.toISOString().slice(0, 10);
  }

  const { data: existing } = await supabase
    .from("store_goals")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "ativa")
    .maybeSingle();

  const payload = pickFilled({
    goal_type,
    current_value,
    target_value,
    deadline,
    status: "ativa",
  });

  if (existing?.id) {
    await supabase.from("store_goals").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("store_goals").insert({
      store_id: storeId,
      user_id: userId,
      goal_type,
      current_value: current_value ?? undefined,
      target_value: target_value ?? undefined,
      deadline: deadline ?? undefined,
      status: "ativa",
    } as any);
  }
}
