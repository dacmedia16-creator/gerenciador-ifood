
-- 1) diagnosis_uploads
CREATE TABLE public.diagnosis_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  store_id uuid,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  classification text NOT NULL DEFAULT 'outro',
  extracted_text text,
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diag_uploads_session ON public.diagnosis_uploads(session_id);
CREATE INDEX idx_diag_uploads_store ON public.diagnosis_uploads(store_id);
CREATE INDEX idx_diag_uploads_user ON public.diagnosis_uploads(user_id);

ALTER TABLE public.diagnosis_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY diag_uploads_all_own ON public.diagnosis_uploads
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER diag_uploads_touch BEFORE UPDATE ON public.diagnosis_uploads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) store_goals (uma meta ativa por loja)
CREATE TABLE public.store_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  goal_type text NOT NULL,
  metric_key text,
  current_value numeric,
  target_value numeric,
  deadline date,
  priority text,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_store_goal_active
ON public.store_goals(store_id) WHERE status = 'ativa';

CREATE INDEX idx_store_goals_store ON public.store_goals(store_id);

ALTER TABLE public.store_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_goals_all_own ON public.store_goals
FOR ALL TO authenticated
USING (public.has_store_access(store_id))
WITH CHECK (public.has_store_access(store_id));

CREATE TRIGGER store_goals_touch BEFORE UPDATE ON public.store_goals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) action_updates
CREATE TABLE public.action_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL,
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  what_changed text,
  has_new_data boolean NOT NULL DEFAULT false,
  has_new_print boolean NOT NULL DEFAULT false,
  metrics_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_updates_action ON public.action_updates(action_id);
CREATE INDEX idx_action_updates_store ON public.action_updates(store_id);

ALTER TABLE public.action_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_updates_all_own ON public.action_updates
FOR ALL TO authenticated
USING (auth.uid() = user_id AND public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id AND public.has_store_access(store_id));

-- 4) evolution_snapshots
CREATE TABLE public.evolution_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  score integer,
  scores_by_area jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  goal_progress numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_store_date ON public.evolution_snapshots(store_id, snapshot_date DESC);

ALTER TABLE public.evolution_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY evolution_snapshots_all_own ON public.evolution_snapshots
FOR ALL TO authenticated
USING (public.has_store_access(store_id))
WITH CHECK (public.has_store_access(store_id));

-- 5) action_plans: novas colunas opcionais (sem quebrar antigos)
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS why_it_matters text,
  ADD COLUMN IF NOT EXISTS how_to_apply text,
  ADD COLUMN IF NOT EXISTS example text,
  ADD COLUMN IF NOT EXISTS how_to_measure text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_ref text;

-- 6) Bucket de prints (privado) + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnosis-uploads', 'diagnosis-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "diag uploads select own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'diagnosis-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "diag uploads insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'diagnosis-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "diag uploads update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'diagnosis-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "diag uploads delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'diagnosis-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
