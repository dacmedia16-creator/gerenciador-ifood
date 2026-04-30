# Checklist Manual — Piloto Fechado

Use este documento como roteiro de validação antes e durante o piloto.
Cada item assume um usuário de teste real (não service role).

---

## 1. Onboarding de loja zero

- [ ] Criar conta nova → confirmar criação de `profiles`.
- [ ] Cadastrar loja com dados mínimos (nome, categoria, plataforma).
- [ ] Adicionar pelo menos 5 produtos e 5 reviews.
- [ ] Disparar primeira `ai-consult`.
- [ ] **Confirmar** em `reports.report_data.ai_consult`:
  - `rule_evidences_used` não vazio;
  - `main_problems` com `source` e `source_ref` válidos;
  - `rag_meta.rag_mode` presente (esperado hoje: `"degraded"`).
- [ ] Conferir que `recommendation_history` recebeu N linhas com `diagnosis_cycle_id = report_id`.

## 2. Aplicar recomendação e medir

- [ ] No `ActionPlan`, marcar uma recomendação como `aplicada`.
- [ ] Conferir que `recommendation_history.applied_at` foi setado.
- [ ] Aguardar 7 dias (ou simular invocando `measure-outcomes` direto).
- [ ] Validar `recommendation_history.metrics_after`:
  - `_explanation` em pt-BR (`"Após você aplicar a ação, sua nota melhorou..."`);
  - `outcome` ∈ `{positivo, negativo, neutro, inconclusivo}`;
  - `_delta_pct` numérico quando aplicável.

## 3. Rejeitar recomendação

- [ ] Marcar uma recomendação como `rejeitada`.
- [ ] Conferir `outcome = negativo` em `recommendation_history`.
- [ ] Disparar nova `ai-consult`.
- [ ] Confirmar que a recomendação rejeitada **NÃO** reaparece em `main_problems`,
  ou aparece em `avoided_repetitions` com `reason` explicando.

## 4. Caso de sucesso → próximo passo

- [ ] Recomendação `aplicada` + `outcome = positivo`.
- [ ] Disparar nova `ai-consult`.
- [ ] Confirmar que a IA **propõe próximo passo** (parabeniza + evolui),
  não repete a mesma ação.

## 5. Cron `measure-outcomes-daily`

- [ ] Acessar **Lovable Cloud → Functions → measure-outcomes → Logs**.
- [ ] Confirmar execução diária (1x/dia).
- [ ] Buscar eventos `measure_outcomes.inconclusive` — se >50% das medidas,
  investigar dados de `metrics` faltando.

## 6. Latência

- [ ] Logs de `ai-consult` filtrados por `evt: "ai_consult.slow"`.
- [ ] Esperado: p95 < 10s; eventos `slow` devem ser raros (<5%).
- [ ] Se frequentes: investigar tamanho de `RAW_CONTEXT` ou modelo escolhido.

## 7. Segurança cross-tenant

- [ ] Logado como usuário A, copiar um `recommendation_id` da loja A.
- [ ] Sair, logar como usuário B.
- [ ] Chamar `record-feedback` com aquele `recommendation_id`.
- [ ] Esperado: HTTP 404 + log estruturado `evt: "record_feedback.not_found"`.

## 8. RAG observável

- [ ] Filtrar logs `evt: "ai_consult.rag"`.
- [ ] Confirmar `rag_mode: "degraded"` (esperado hoje — RAG v1 lexical).
- [ ] `missing_lovable_api_key` deve ser `false` em produção.
- [ ] Se aparecer `true` repetidamente: secret não está propagada — investigar.

## 9. Validação anti-alucinação

- [ ] Filtrar `evt: "ai_consult.validation_drop_high"`.
- [ ] Esperado: raro. Se frequente em uma loja específica, pode indicar
  prompt drift do modelo ou evidências ambíguas.

## 10. Pós-piloto (não bloqueante)

- [ ] Avaliar tamanho de `case_library` → ver `docs/RETENTION_POLICY.md`.
- [ ] Avaliar migração de `generate-report-pdf` para `reports.report_data.ai_consult`
  e deprecação da tabela `diagnostics` (hoje legado, comentada no banco).

---

## Riscos conhecidos para o piloto

| Risco | Mitigação atual |
|-------|-----------------|
| RAG lexical não capta sinônimos | Documentado; v2 trocará para embeddings reais |
| `case_library` cresce sem limite | Campos preparados; política só após piloto |
| Tabela `diagnostics` ainda viva | Comentada como legado; só PDF lê dela |
| Dois baselines no mesmo dia | `diagnosis_cycle_id` agrupa; documentado |
| `inconclusivo` se métricas faltam | Logado para monitoramento |
