import { supabase } from "@/integrations/supabase/client";
import { STEPS, TOTAL_STEPS } from "./steps";

export interface SessionRow {
  id: string;
  user_id: string;
  store_id: string | null;
  status: string;
  current_step: number;
  completion_percentage: number;
  started_at: string;
  completed_at: string | null;
  generated_at: string | null;
}

export async function createSession(userId: string, storeId?: string | null): Promise<SessionRow> {
  const { data, error } = await supabase
    .from("diagnosis_sessions")
    .insert({ user_id: userId, store_id: storeId ?? null, status: "draft", current_step: 1 })
    .select()
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export async function getDraftSession(userId: string): Promise<SessionRow | null> {
  const { data } = await supabase
    .from("diagnosis_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SessionRow) || null;
}

export async function loadSession(sessionId: string) {
  const [s, a, st] = await Promise.all([
    supabase.from("diagnosis_sessions").select("*").eq("id", sessionId).single(),
    supabase.from("diagnosis_answers").select("*").eq("session_id", sessionId),
    supabase.from("diagnosis_step_status").select("*").eq("session_id", sessionId),
  ]);
  if (s.error) throw s.error;
  return {
    session: s.data as SessionRow,
    answers: a.data || [],
    statuses: st.data || [],
  };
}

export function answersAsMap(answers: any[]): Record<string, Record<string, any>> {
  const map: Record<string, Record<string, any>> = {};
  for (const a of answers) {
    if (!map[a.step_key]) map[a.step_key] = {};
    map[a.step_key][a.question_key] = a.answer_value;
  }
  return map;
}

export async function updateSessionProgress(sessionId: string, statuses: any[]) {
  const completed = statuses.filter((s) => s.is_completed).length;
  const pct = Math.round((completed / TOTAL_STEPS) * 100);
  await supabase
    .from("diagnosis_sessions")
    .update({ completion_percentage: pct })
    .eq("id", sessionId);
  return pct;
}

export function computeStepCompletion(stepKey: string, values: Record<string, any>) {
  const step = STEPS.find((s) => s.key === stepKey);
  if (!step) return { completion_percentage: 0, missing_required_fields: [], is_completed: false };
  const answerable = step.questions.filter((q) => q.type !== "info");
  const filled = answerable.filter((q) => {
    const v = values[q.key];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  });
  const required = answerable.filter((q) => q.required);
  const missing = required
    .filter((q) => {
      const v = values[q.key];
      if (Array.isArray(v)) return v.length === 0;
      return v === undefined || v === null || v === "";
    })
    .map((q) => q.label);
  const pct = answerable.length ? Math.round((filled.length / answerable.length) * 100) : 100;
  // Step "welcome" e steps sem perguntas obrigatórias completam ao serem visitadas
  const completed =
    answerable.length === 0 || (required.length === 0 ? pct >= 50 : missing.length === 0 && pct >= 60);
  return { completion_percentage: pct, missing_required_fields: missing, is_completed: completed };
}
