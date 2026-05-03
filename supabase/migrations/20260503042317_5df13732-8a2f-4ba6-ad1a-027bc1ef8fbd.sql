
CREATE OR REPLACE FUNCTION public.apply_action_update_to_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  v numeric;
BEGIN
  IF NEW.metrics_delta IS NULL OR jsonb_typeof(NEW.metrics_delta) <> 'object' THEN
    RETURN NEW;
  END IF;

  FOR k, v IN
    SELECT key, NULLIF(value, 'null')::text::numeric
    FROM jsonb_each_text(NEW.metrics_delta)
    WHERE value ~ '^-?[0-9]+(\.[0-9]+)?$'
  LOOP
    UPDATE public.store_goals g
       SET current_value = v,
           updated_at = now(),
           status = CASE
             WHEN g.target_value IS NOT NULL
              AND ((g.metric_key IN ('cancellation_rate','prep_time') AND v <= g.target_value)
                OR (g.metric_key NOT IN ('cancellation_rate','prep_time') AND v >= g.target_value))
             THEN 'concluida'
             ELSE g.status
           END
     WHERE g.store_id = NEW.store_id
       AND g.metric_key = k
       AND g.status = 'ativa';
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_updates_to_goals ON public.action_updates;
CREATE TRIGGER trg_action_updates_to_goals
AFTER INSERT ON public.action_updates
FOR EACH ROW
EXECUTE FUNCTION public.apply_action_update_to_goals();
