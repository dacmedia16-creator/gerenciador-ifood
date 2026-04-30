
-- diagnosis_sessions
CREATE TABLE public.diagnosis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid,
  status text NOT NULL DEFAULT 'draft',
  current_step integer NOT NULL DEFAULT 1,
  completion_percentage integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosis_sessions_all_own"
  ON public.diagnosis_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_diagnosis_sessions_touch
  BEFORE UPDATE ON public.diagnosis_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_diagnosis_sessions_user ON public.diagnosis_sessions(user_id, status);
CREATE INDEX idx_diagnosis_sessions_store ON public.diagnosis_sessions(store_id);

-- diagnosis_answers
CREATE TABLE public.diagnosis_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnosis_sessions(id) ON DELETE CASCADE,
  store_id uuid,
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  question_key text NOT NULL,
  answer_value jsonb,
  answer_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, step_key, question_key)
);

ALTER TABLE public.diagnosis_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosis_answers_all_own"
  ON public.diagnosis_answers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_diagnosis_answers_touch
  BEFORE UPDATE ON public.diagnosis_answers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_diagnosis_answers_session ON public.diagnosis_answers(session_id, step_key);

-- diagnosis_step_status
CREATE TABLE public.diagnosis_step_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnosis_sessions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completion_percentage integer NOT NULL DEFAULT 0,
  missing_required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, step_key)
);

ALTER TABLE public.diagnosis_step_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosis_step_status_all_own"
  ON public.diagnosis_step_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions s
      WHERE s.id = diagnosis_step_status.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions s
      WHERE s.id = diagnosis_step_status.session_id AND s.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_diagnosis_step_status_touch
  BEFORE UPDATE ON public.diagnosis_step_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- uploads bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "uploads_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "uploads_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "uploads_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "uploads_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
