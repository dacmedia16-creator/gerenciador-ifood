-- 1) case_library: campos para política futura de retenção (não-destrutivo)
ALTER TABLE public.case_library
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS usefulness_score smallint NULL,
  ADD COLUMN IF NOT EXISTS retention_notes text NULL;

COMMENT ON COLUMN public.case_library.archived_at IS
  'Soft-delete marker. NULL = ativo. findSimilarCases poderá filtrar por isso no futuro.';
COMMENT ON COLUMN public.case_library.usefulness_score IS
  'Score 0-100 para ranking de retenção futura. NULL até medirmos.';
COMMENT ON COLUMN public.case_library.retention_notes IS
  'Notas livres sobre por que o caso foi arquivado / mantido.';

CREATE INDEX IF NOT EXISTS idx_case_library_active
  ON public.case_library (created_at DESC)
  WHERE archived_at IS NULL;

-- 2) diagnostics: documentar como legado
COMMENT ON TABLE public.diagnostics IS
  'LEGADO. Mantido para compatibilidade com generate-report-pdf. Fluxo principal: reports.report_data.ai_consult.main_problems. Não inserir novos registros.';

-- 3) recommendation_history: diagnosis_cycle_id (= report_id por padrão)
ALTER TABLE public.recommendation_history
  ADD COLUMN IF NOT EXISTS diagnosis_cycle_id uuid NULL;

COMMENT ON COLUMN public.recommendation_history.diagnosis_cycle_id IS
  'Agrupa recomendações geradas no mesmo ciclo de diagnóstico. Por padrão = report_id. Nullable para compatibilidade com histórico anterior.';

CREATE INDEX IF NOT EXISTS idx_rec_hist_cycle
  ON public.recommendation_history (store_id, rule_id, diagnosis_cycle_id);