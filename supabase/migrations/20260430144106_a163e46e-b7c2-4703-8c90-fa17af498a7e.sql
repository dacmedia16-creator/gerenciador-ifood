
-- ============= EXTENSION =============
CREATE EXTENSION IF NOT EXISTS vector;

-- ============= store_memory =============
CREATE TABLE public.store_memory (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_goal text,
  recurring_problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics_7d jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics_14d jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics_30d jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_diagnosis_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_memory_all_own ON public.store_memory
  FOR ALL USING (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));

-- ============= recommendation_history =============
CREATE TABLE public.recommendation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  rule_id text,
  recommendation text NOT NULL,
  expected_impact text,
  source text NOT NULL DEFAULT 'ai-consult',
  source_ref text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aplicada','ignorada','em_andamento')),
  applied_at timestamptz,
  metrics_before jsonb DEFAULT '{}'::jsonb,
  metrics_after jsonb,
  outcome text CHECK (outcome IS NULL OR outcome IN ('positivo','neutro','negativo','inconclusivo')),
  outcome_measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_hist_store ON public.recommendation_history(store_id, created_at DESC);
CREATE INDEX idx_rec_hist_rule ON public.recommendation_history(store_id, rule_id);
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY rec_hist_all_own ON public.recommendation_history
  FOR ALL USING (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));
CREATE TRIGGER rec_hist_touch BEFORE UPDATE ON public.recommendation_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= recommendation_feedback =============
CREATE TABLE public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.recommendation_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating text CHECK (rating IS NULL OR rating IN ('util','nao_util','errada','falta_contexto','dificil_executar')),
  applied boolean,
  generated_result text CHECK (generated_result IS NULL OR generated_result IN ('sim','nao','nao_sei')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_fb_rec ON public.recommendation_feedback(recommendation_id);
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY rec_fb_all_own ON public.recommendation_feedback
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============= knowledge_base =============
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  topic text,
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual',
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kb_area ON public.knowledge_base(area);
CREATE INDEX idx_kb_embedding ON public.knowledge_base USING hnsw (embedding vector_cosine_ops);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY kb_read_authenticated ON public.knowledge_base
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER kb_touch BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= case_library =============
CREATE TABLE public.case_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  problem_rule_id text,
  metrics_before jsonb DEFAULT '{}'::jsonb,
  diagnosis text,
  recommendation text NOT NULL,
  user_action text,
  metrics_after jsonb DEFAULT '{}'::jsonb,
  outcome text CHECK (outcome IS NULL OR outcome IN ('sucesso','fracasso','neutro')),
  user_feedback text,
  lesson_learned text,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_problem ON public.case_library(problem_rule_id);
CREATE INDEX idx_case_embedding ON public.case_library USING hnsw (embedding vector_cosine_ops);
ALTER TABLE public.case_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_read_authenticated ON public.case_library
  FOR SELECT TO authenticated USING (true);

-- ============= training_examples =============
CREATE TABLE public.training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  input_payload jsonb NOT NULL,
  ai_response jsonb NOT NULL,
  ideal_response jsonb,
  human_feedback jsonb,
  outcome jsonb,
  quality_score int CHECK (quality_score IS NULL OR quality_score BETWEEN 1 AND 5),
  exported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_examples ENABLE ROW LEVEL SECURITY;
-- Sem policies = só service role consegue acessar.

-- ============= RPC para busca semântica =============
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_areas text[] DEFAULT NULL
)
RETURNS TABLE (id uuid, area text, title text, content text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, k.area, k.title, k.content,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base k
  WHERE k.embedding IS NOT NULL
    AND (filter_areas IS NULL OR k.area = ANY(filter_areas))
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_cases(
  query_embedding vector(768),
  match_count int DEFAULT 3,
  filter_rule_id text DEFAULT NULL
)
RETURNS TABLE (id uuid, problem_rule_id text, diagnosis text, recommendation text,
               outcome text, lesson_learned text, store_profile jsonb, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.problem_rule_id, c.diagnosis, c.recommendation,
         c.outcome, c.lesson_learned, c.store_profile,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.case_library c
  WHERE c.embedding IS NOT NULL
    AND (filter_rule_id IS NULL OR c.problem_rule_id = filter_rule_id)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
