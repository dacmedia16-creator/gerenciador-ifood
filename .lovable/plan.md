
# Auditoria — Gestor IA de Delivery (estado atual)

## O que já está pronto e correto

| Área | Estado |
|------|--------|
| Fluxo principal IA | `ai-consult` com evidências + memória + RAG + validação anti-alucinação (hard fail se sem rule_id) |
| Motor de evidências | `_shared/evidences.ts` com 24 regras (camada 1 + camada 2 com cruzamentos, tendências e sinal positivo "não mexer") |
| Histórico | `recommendation_history` salva `metrics_before`, `source`, `source_ref`, FK em `action_plans` |
| Feedback | Componente `RecommendationFeedback` + função `record-feedback` (apliquei/ignorei/funcionou/comentário) |
| Medição objetiva | `measure-outcomes` compara `metrics_before` × atual após 7d, define outcome e dispara `extract-case` se positivo |
| Memória da loja | `update-store-memory` agrega métricas 7/14/30d + `recurring_problems` |
| Segurança parcial | `update-store-memory` e `measure-outcomes` validam acesso à loja antes de usar service role; RLS por loja em todas as tabelas sensíveis |
| Anti-alucinação | `validate-diagnosis.ts` testado, descarta refs inválidas e força hard-fail |

## Problemas CRÍTICOS encontrados

1. **`StoreOverview.tsx` ainda chama `ai-diagnose`** (rota `src/pages/app/StoreOverview.tsx:45`). `ai-diagnose` está marcada como deprecated mas continua **APAGANDO `diagnostics` e `action_plans` da loja a cada chamada** — isso destrói o ciclo de aprendizado (perde FKs `recommendation_id`). Precisa migrar para `ai-consult`.
2. **`measure-outcomes` é manual**. Sem cron, recomendações aplicadas nunca recebem `metrics_after` automaticamente — o ciclo só fecha se o usuário lembrar de clicar.
3. **CORS aberto (`*`) em produção**. Funções IA aceitam requisições de qualquer origem.

## Problemas IMPORTANTES

4. **`store_memory` não tem campos de aprendizado explícito**. Tem `recurring_problems` mas não tem `successful_recommendations`, `failed_recommendations`, `ignored_repeatedly`, `improving_areas`, `worsening_areas`. A IA já consulta `PAST_RECOMMENDATIONS` direto, mas o resumo persistido fica fraco.
4b. **Prompt da IA não diferencia "ações ignoradas várias vezes"** — só usa o último status.
5. **`extract-case` não tem auth** (só service role). Deveria aceitar invocação interna apenas (já é o caso na prática, mas vale documentar/proteger).
6. **`embedding_version` foi adicionado nas tabelas mas não há trilha para reembedar** quando upgradeamos de v1 lexical para v2 semântico.
7. **Sem testes de segurança** garantindo que usuário A não vê loja B via essas funções.

## Melhorias OPCIONAIS

- Rate-limit em `ai-consult` (já apontado anteriormente, ainda não feito).
- UI mostrando explicitamente "esta recomendação já foi tentada antes — outcome: X" no relatório.
- `ai-diagnose` poderia ser deletada da pasta (mantém só o stub depreciado).

---

# Plano de implementação (mínimo viável para fechar o ciclo)

## Etapa 1 — Migrar `StoreOverview` para `ai-consult` (CRÍTICO)
- `src/pages/app/StoreOverview.tsx`: trocar `invokeAI("ai-diagnose", { store_id })` por `invokeAI("ai-consult", { storeId })`.
- Após resposta, redirecionar para `/app/stores/:id/report` (onde `ai-consult` já gravou `report_id`).
- Garante que **toda** geração de diagnóstico passa pelo fluxo com memória/FK/validação.

## Etapa 2 — Automatizar medição de outcome
- Criar migration que habilita `pg_cron` + `pg_net` e agenda `measure-outcomes` **diariamente às 03:00 UTC**, varrendo todas as lojas com recomendações `aplicada` há ≥7 dias e `metrics_after IS NULL`.
- Ajustar `measure-outcomes` para aceitar `{ allStores: true }` e iterar sobre lojas pendentes (apenas via service role / cron, não exposto a usuário).

## Etapa 3 — Enriquecer `store_memory` com aprendizados
Em `update-store-memory/index.ts`, adicionar ao payload:
- `successful_recommendations`: rule_ids com outcome=positivo nos últimos 90d
- `failed_recommendations`: rule_ids com outcome=negativo
- `ignored_repeatedly`: rule_ids com status=ignorada >=2x
- `improving_areas` / `worsening_areas`: comparando `metrics_7d` vs `metrics_30d` por métrica-chave (rating, cancel, ticket, revenue)
- `learnings`: array de `{ rule_id, lesson }` extraído de feedbacks com comentário e outcome

Esses campos são lidos automaticamente pelo `loadStoreMemory()` e aparecem no prompt da `ai-consult`. Atualizar SYSTEM_PROMPT para orientar o uso ("se rule_id está em failed_recommendations, não repita sem fato novo").

## Etapa 4 — Segurança
- Restringir CORS de `ai-consult`, `record-feedback`, `update-store-memory`, `measure-outcomes`, `extract-case` à origem de produção (`https://gerenciador-ifood.lovable.app`) + preview Lovable.
- `extract-case`: adicionar guarda que rejeita requisições sem header interno (so chamável via `supabase.functions.invoke` server-side).

## Etapa 5 — Testes (Deno)
Criar `supabase/functions/ai-consult/security_test.ts` e `learning_test.ts` cobrindo (com mocks):
- IA não usa `rule_id` que não existe no set válido → descartado
- IA não repete recomendação com outcome=negativo sem fato novo (assertion sobre prompt rendering)
- recomendação aplicada gera linha em `recommendation_history` com `metrics_before` preenchido (já existe lógica, validar shape)
- `applyDiagnosisValidation` derruba `recommendation_id` que não pertence ao set

(testes A→B de loja são mais E2E; documentamos como manuais nesta etapa)

## Etapa 6 — Limpeza leve do legado
- Manter `ai-diagnose` apenas como stub que **retorna 410 Gone** com mensagem "Use ai-consult". Remove o risco de alguém invocar e destruir dados.
- Atualizar `supabase/config.toml` se necessário para refletir.

---

# Arquivos que serão alterados/criados

**Editados**
- `src/pages/app/StoreOverview.tsx` — troca callsite e redirect
- `supabase/functions/measure-outcomes/index.ts` — modo cron `allStores`
- `supabase/functions/update-store-memory/index.ts` — novos campos de aprendizado
- `supabase/functions/ai-consult/index.ts` — CORS restrito + prompt usa novos campos
- `supabase/functions/record-feedback/index.ts` — CORS restrito
- `supabase/functions/extract-case/index.ts` — CORS restrito + guarda interna
- `supabase/functions/ai-diagnose/index.ts` — vira stub 410

**Criados**
- `supabase/functions/_shared/cors.ts` (ou ajuste no existente) — helper `allowedOrigins`
- `supabase/migrations/<ts>_cron_measure_outcomes.sql` — agenda diária (via insert tool, não migration, pois usa anon key específica)
- `supabase/functions/ai-consult/security_test.ts`
- `supabase/functions/ai-consult/learning_test.ts`

**Não alterados** (preservados como estão)
- Schema do banco — já tem todas as colunas necessárias
- `src/lib/diagnosis/rules.ts` — frontend funnel está OK
- `_shared/evidences.ts` — 24 regras já cobrem os cenários pedidos
- `RecommendationFeedback.tsx` e `ActionPlan.tsx` — fluxo de feedback já correto

---

# Resultado esperado após implementação

```text
[Cadastro/Métricas]
        │
        ▼
[Funil de Diagnóstico] ──► rule_evidences (camada 1+2)
        │
        ▼
[ai-consult] (único caminho)
   ├─ valida store via JWT
   ├─ carrega STORE_MEMORY enriquecida (sucessos/fracassos/ignorados)
   ├─ RAG: casos + KB
   ├─ valida output contra rule_ids/refs
   ├─ insere recommendation_history (metrics_before)
   └─ insere action_plans com FK
        │
        ▼
[Usuário marca "apliquei" / feedback] ──► record-feedback
        │
        ▼
[CRON diário 03h UTC] ──► measure-outcomes
   ├─ calcula metrics_after (7-30d)
   ├─ define outcome (positivo/negativo/neutro/inconclusivo)
   ├─ se positivo → extract-case (alimenta case_library)
   └─ chama update-store-memory
        │
        ▼
[store_memory atualizada]
   ├─ successful_recommendations / failed_recommendations
   ├─ ignored_repeatedly / improving_areas / worsening_areas
   └─ recurring_problems
        │
        ▼
Próxima chamada de ai-consult já usa esses aprendizados.
```

A IA passa a:
- Não repetir o que falhou ou foi ignorado.
- Reconhecer áreas melhorando/piorando.
- Sugerir próximo passo após sucesso.
- Bloquear diagnóstico quando faltam evidências.
- Operar via fluxo único, sem perda de FKs.
