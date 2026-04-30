-- FK opcional ligando ações ao histórico de recomendações da IA
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES public.recommendation_history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_plans_rec_id ON public.action_plans(recommendation_id);

-- Versão do embedding usado, para permitir reembedar quando trocarmos de modelo
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS embedding_version smallint NOT NULL DEFAULT 1;

ALTER TABLE public.case_library
  ADD COLUMN IF NOT EXISTS embedding_version smallint NOT NULL DEFAULT 1;