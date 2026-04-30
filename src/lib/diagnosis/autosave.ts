import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeStepCompletion } from "./session";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOpts {
  sessionId: string;
  userId: string;
  storeId?: string | null;
  stepKey: string;
  values: Record<string, any>;
  delay?: number;
  onSaved?: () => void;
}

export function useAutosave({
  sessionId,
  userId,
  storeId,
  stepKey,
  values,
  delay = 800,
  onSaved,
}: UseAutosaveOpts) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<number | null>(null);
  const lastSerialized = useRef<string>("");

  const flush = useCallback(async () => {
    const serialized = JSON.stringify(values);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    setStatus("saving");
    try {
      const rows = Object.entries(values)
        .filter(([, v]) => v !== undefined)
        .map(([question_key, answer_value]) => ({
          session_id: sessionId,
          user_id: userId,
          store_id: storeId ?? null,
          step_key: stepKey,
          question_key,
          answer_value: answer_value as any,
          answer_type: typeof answer_value,
        }));

      if (rows.length) {
        const { error } = await supabase
          .from("diagnosis_answers")
          .upsert(rows, { onConflict: "session_id,step_key,question_key" });
        if (error) throw error;
      }

      const { completion_percentage, missing_required_fields, is_completed } =
        computeStepCompletion(stepKey, values);
      await supabase.from("diagnosis_step_status").upsert(
        {
          session_id: sessionId,
          step_key: stepKey,
          completion_percentage,
          missing_required_fields,
          is_completed,
        },
        { onConflict: "session_id,step_key" }
      );

      setStatus("saved");
      onSaved?.();
    } catch (e) {
      console.error("autosave error", e);
      setStatus("error");
    }
  }, [sessionId, userId, storeId, stepKey, values, onSaved]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [flush, delay]);

  return { status, flushNow: flush };
}
