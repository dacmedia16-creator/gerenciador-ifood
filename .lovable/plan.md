## Plano de Hardening para Piloto Fechado

Foco exclusivo em observabilidade, documentação técnica e segurança. Nenhuma regra de negócio testada será alterada. `ai-consult` permanece intacto, exceto pela adição de logs estruturados e metadados internos no `enriched`.

---

### 1. RAG observável (degradação silenciosa virou rastreável)

**Arquivo: `supabase/functions/_shared/embeddings.ts`**
- `embedText` passa a retornar `{ vector, mode, reason }` via uma nova função paralela `embedTextWithMeta()`. A função antiga `embedText()` continua existindo (compatibilidade com qualquer chamador), mas internamente passa por `embedTextWithMeta`.
- `mode`: `"full"` (placeholder para v2 quando `EMBED_MODEL` existir) ou `"degraded"` (lexical atual).
- `reason`: `"missing_embed_model"` quando degradado.

**Arquivo: `supabase/functions/_shared/memory.ts`**
- `findSimilarCases` e `findKnowledgeSnippets` retornam o array como hoje, mas anexam `__rag_meta` (no objeto resultado consolidado) via novas variantes `findSimilarCasesMeta` / `findKnowledgeSnippetsMeta` que devolvem `{ items, mode, reason }`.

**Arquivo: `supabase/functions/ai-consult/index.ts`**
- Detecta ausência de `LOVABLE_API_KEY` ANTES de bloquear: só bloqueia a chamada à IA principal (mantém comportamento atual). Para o RAG, registra:
  ```ts
  const ragMeta = {
    rag_mode: "degraded",            // sempre v1 hoje
    degraded_reason: "lexical_v1",
    missing_lovable_api_key: !LOVABLE_API_KEY,
  };
  ```
- Log estruturado:
  ```ts
  console.log(JSON.stringify({ evt: "ai_consult.rag", store_id: storeId, ...ragMeta }));
  ```
- `enriched.rag_meta = ragMeta` (não exposto ao usuário final na UI; fica no `report_data` para auditoria).

---

### 2. case_library — política de retenção segura

**Confirmado pelo schema:** `case_library` NÃO tem `is_active`, `archived_at` nem `usefulness_score`. Apenas `outcome`, `metrics_after`, `created_at`.

**Migração não-destrutiva** (`supabase/migrations/<ts>_case_library_retention.sql`):
```sql
ALTER TABLE public.case_library
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS usefulness_score smallint NULL,
  ADD COLUMN IF NOT EXISTS retention_notes text NULL;

COMMENT ON COLUMN public.case_library.archived_at IS
  'Marca soft-delete. NULL = ativo. Usado por findSimilarCases para filtrar no futuro.';
COMMENT ON COLUMN public.case_library.usefulness_score IS
  'Score 0-100 para ranking de retenção futura. NULL até medirmos.';

CREATE INDEX IF NOT EXISTS idx_case_library_active
  ON public.case_library (created_at DESC)
  WHERE archived_at IS NULL;
```

**Documentação** em `docs/RETENTION_POLICY.md` (novo): política futura (arquivar > 12 meses sem uso, score < 30, etc.) — apenas texto. Nada é apagado agora. `findSimilarCases` ainda NÃO filtra por `archived_at` (compatibilidade).

---

### 3. `diagnostics` legado — documentado, não removido

**Comentários técnicos** em:
- `supabase/functions/generate-report-pdf/index.ts` (linhas 63-64): bloco JSDoc explicando que `diagnostics` é legado e o caminho futuro é `reports.report_data.ai_consult.main_problems`.
- Migração leve (comentário no banco):
  ```sql
  COMMENT ON TABLE public.diagnostics IS
    'LEGADO. Mantido para compatibilidade com generate-report-pdf. Fluxo principal: reports.report_data.ai_consult. Não inserir novos registros — analyze-reviews já não escreve aqui.';
  ```

---

### 4. Baselines duplicados — solução leve

Optar por **opção menos invasiva**: agrupar logicamente por `store_id + rule_id + report_id` (já existe). Adicionar:

- Coluna opcional `diagnosis_cycle_id uuid NULL` em `recommendation_history` (= `report_id` por padrão, mas explícito):
  ```sql
  ALTER TABLE public.recommendation_history
    ADD COLUMN IF NOT EXISTS diagnosis_cycle_id uuid NULL;
  COMMENT ON COLUMN public.recommendation_history.diagnosis_cycle_id IS
    'Agrupa recomendações geradas no mesmo ciclo de diagnóstico. Por padrão = report_id.';
  CREATE INDEX IF NOT EXISTS idx_rec_hist_cycle
    ON public.recommendation_history (store_id, rule_id, diagnosis_cycle_id);
  ```
- Em `ai-consult/index.ts`, ao inserir `rows`, setar `diagnosis_cycle_id: newReportId`.
- **Não altera histórico existente** (coluna nullable, sem backfill obrigatório).
- Documentado em `docs/BASELINES.md`: "cada consulta gera um baseline próprio; agrupamento por `diagnosis_cycle_id` permite análise futura sem deduplicar dados históricos."

---

### 5. Observabilidade — logs estruturados

Padrão único: `console.log(JSON.stringify({ evt, ...payload }))`. Filtráveis no painel de logs Lovable Cloud.

| Onde | Evento | Trigger |
|------|--------|---------|
| `_shared/validate-diagnosis.ts` (chamador `ai-consult`) | `ai_consult.validation_drop_high` | `(dropped.problems / before.problems) > 0.20` |
| `ai-consult/index.ts` | `ai_consult.slow` | `Date.now() - t0 > 10000` (envolver em `t0 = Date.now()` no início do handler) |
| `ai-consult/index.ts` | `ai_consult.rag` | sempre, com `rag_meta` |
| `measure-outcomes/index.ts` | `measure_outcomes.inconclusive` | a cada `outcome === "inconclusivo"` |
| `record-feedback/index.ts` | `record_feedback.not_found` | no return 404 (cross-tenant ou id inexistente) |

Cada log inclui `store_id` quando disponível. Nenhum segredo é logado.

---

### 6. Checklist manual do piloto

Novo arquivo `docs/PILOT_CHECKLIST.md`:

- **Onboarding**: criar loja zero → preencher dados mínimos → primeira `ai-consult` → confirmar `report_data.ai_consult` populado e `rule_evidences_used` não vazio.
- **Aplicar recomendação**: marcar `aplicada` → aguardar 7 dias → invocar `measure-outcomes` → conferir `metrics_after._explanation` em pt-BR e `outcome` ∈ {positivo, negativo, neutro, inconclusivo}.
- **Rejeitar recomendação**: `record-feedback` com `status: "rejeitada"` → próxima `ai-consult` deve listar em `avoided_repetitions` (ou ausência total da recomendação).
- **Caso de sucesso**: recomendação `aplicada` + `outcome positivo` → próxima consulta deve propor próximo passo, não repetir.
- **Cron**: validar logs `measure-outcomes-daily` (ver no painel Lovable Cloud → Functions → Logs).
- **Latência**: confirmar p95 de `ai-consult` < 10s; eventos `ai_consult.slow` indicam degradação.
- **Cross-tenant**: chamar `record-feedback` com `recommendation_id` de outra loja → 404 esperado.

---

### Detalhes técnicos resumidos

- **Migrações**: 1 arquivo com 3 blocos (case_library, diagnostics comment, recommendation_history.diagnosis_cycle_id).
- **Edge functions tocadas**: `ai-consult` (logs + `rag_meta` + `diagnosis_cycle_id`), `measure-outcomes` (log inconclusive), `record-feedback` (log 404), `_shared/embeddings.ts` + `_shared/memory.ts` (helpers de meta).
- **Documentação criada**: `docs/RETENTION_POLICY.md`, `docs/BASELINES.md`, `docs/PILOT_CHECKLIST.md`.
- **Não alterado**: `validate-diagnosis.ts` (lógica pura), `analyze-reviews`, `extract-case`, `update-store-memory`, prompt do `ai-consult`, schema do `tool_call`, RLS, regras de negócio.
- **Testes**: nenhum teste existente quebra (mudanças são aditivas — novos campos opcionais, novos logs). Não criaremos novos testes nesta fase para manter o escopo pequeno.

---

### Fora de escopo (intencionalmente)

- Reescrita de `ai-consult`.
- Remoção de `diagnostics`.
- Limpeza/arquivamento real de `case_library`.
- Migração de `generate-report-pdf` para `reports.report_data` (apenas documentado como dívida).
- Embeddings reais (RAG v2).
