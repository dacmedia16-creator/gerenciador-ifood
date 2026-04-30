import { useEffect, useRef, useState } from "react";
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
  onSaved?: (info: { completion_percentage: number; is_completed: boolean; missing_required_fields: string[] }) => void;
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
  const valuesRef = useRef(values);
  const onSavedRef = useRef(onSaved);
  const lastSerialized = useRef<string>(JSON.stringify(values));
  const initialMount = useRef(true);

  // Mantém refs atualizadas sem disparar effect
  valuesRef.current = values;
  onSavedRef.current = onSaved;

  useEffect(() => {
    // Não salva no primeiro mount (dados acabaram de carregar)
    if (initialMount.current) {
      initialMount.current = false;
      lastSerialized.current = JSON.stringify(values);
      return;
    }

    const serialized = JSON.stringify(values);
    if (serialized === lastSerialized.current) return;

    const timer = window.setTimeout(async () => {
      const v = valuesRef.current;
      const currentSerialized = JSON.stringify(v);
      lastSerialized.current = currentSerialized;
      setStatus("saving");
      try {
        const rows = Object.entries(v)
          .filter(([, val]) => val !== undefined)
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

        const info = computeStepCompletion(stepKey, v);
        await supabase.from("diagnosis_step_status").upsert(
          {
            session_id: sessionId,
            step_key: stepKey,
            completion_percentage: info.completion_percentage,
            missing_required_fields: info.missing_required_fields,
            is_completed: info.is_completed,
          },
          { onConflict: "session_id,step_key" }
        );

        setStatus("saved");
        onSavedRef.current?.(info);
      } catch (e) {
        console.error("autosave error", e);
        setStatus("error");
      }
    }, delay);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), sessionId, userId, storeId, stepKey, delay]);

  return { status };
}
