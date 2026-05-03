ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS impacto_financeiro numeric,
  ADD COLUMN IF NOT EXISTS dificuldade text,
  ADD COLUMN IF NOT EXISTS tempo_estimado text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS feedback_text text,
  ADD COLUMN IF NOT EXISTS has_feedback boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  week_start date NOT NULL,
  rating numeric,
  cancellation_rate numeric,
  weekly_revenue numeric,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start)
);

ALTER TABLE public.weekly_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_snapshots_all_own ON public.weekly_snapshots;
CREATE POLICY weekly_snapshots_all_own ON public.weekly_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_store_access(store_id))
  WITH CHECK (auth.uid() = user_id AND public.has_store_access(store_id));