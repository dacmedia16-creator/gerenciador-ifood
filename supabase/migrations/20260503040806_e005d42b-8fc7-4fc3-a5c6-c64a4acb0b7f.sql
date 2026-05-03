-- P2: Garantir unique constraints exigidas pelos upserts do funil de diagnóstico.
-- Sem isso, ON CONFLICT em diagnosis_answers e diagnosis_step_status falha silenciosamente.

-- diagnosis_answers: upsert por (session_id, step_key, question_key)
CREATE UNIQUE INDEX IF NOT EXISTS diagnosis_answers_session_step_question_uniq
  ON public.diagnosis_answers (session_id, step_key, question_key);

-- diagnosis_step_status: upsert por (session_id, step_key)
CREATE UNIQUE INDEX IF NOT EXISTS diagnosis_step_status_session_step_uniq
  ON public.diagnosis_step_status (session_id, step_key);

-- Índices auxiliares de leitura usados no fluxo
CREATE INDEX IF NOT EXISTS diagnosis_answers_session_idx
  ON public.diagnosis_answers (session_id);

CREATE INDEX IF NOT EXISTS diagnosis_uploads_session_idx
  ON public.diagnosis_uploads (session_id);

CREATE INDEX IF NOT EXISTS recommendation_history_store_created_idx
  ON public.recommendation_history (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_store_created_idx
  ON public.reports (store_id, created_at DESC);
