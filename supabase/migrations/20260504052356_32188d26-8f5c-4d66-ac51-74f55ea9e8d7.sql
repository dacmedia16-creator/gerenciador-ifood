-- M1: action_outcomes
CREATE TABLE public.action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL UNIQUE,
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL,
  followup_at timestamptz NOT NULL,
  rating_changed text CHECK (rating_changed IN ('up','same','down')),
  orders_changed text CHECK (orders_changed IN ('up','same','down')),
  notes text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.action_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_outcomes_all_own"
  ON public.action_outcomes
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND has_store_access(store_id))
  WITH CHECK (user_id = auth.uid() AND has_store_access(store_id));

CREATE INDEX idx_action_outcomes_pending
  ON public.action_outcomes (user_id, responded_at, followup_at);

-- M2: case_testimonials
CREATE TABLE public.case_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  city text NOT NULL,
  metric_before text NOT NULL,
  metric_after text NOT NULL,
  timeframe text NOT NULL,
  problem_type text NOT NULL CHECK (problem_type IN ('cancelamento','entrega','avaliacao','cardapio')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_testimonials_read_active"
  ON public.case_testimonials
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "case_testimonials_admin_write"
  ON public.case_testimonials
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_case_testimonials_lookup
  ON public.case_testimonials (problem_type, active);
