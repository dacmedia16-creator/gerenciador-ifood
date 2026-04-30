
## Auditoria final — diagnóstico

### O que está sólido (não mexer)

- **Fluxo único de diagnóstico**: `analyze-reviews` agora só faz `update` em `reports.report_data.review_topics`; nenhum insert em `diagnostics` em runtime (só `generate-report-pdf` lê para histórico). `ai-consult` é o único produtor de diagnóstico, recomendações e plano.
- **`ai-consult`**: SYSTEM_PROMPT cobre todas as regras pedidas (status, outcome, sucessos, falhas, ignored_repeatedly, improving/worsening, similar_cases, knowledge_base). Validação `applyDiagnosisValidation` derruba qualquer rule_id/source_ref inventado e tem hard-fail quando não há evidência. `recommendation_history` recebe `metrics_before` no momento do diagnóstico → base para `measure-outcomes`.
- **5 status do feedback**: validados em `record-feedback` (`STATUSES`) e usados pelo `ActionPlan.tsx`. `applied_at` só é setado em `aplicada`. `rejeitada` força `outcome=negativo`.
- **`measure-outcomes`**: compara `metrics_before` com `metrics_after`, classifica em positivo/negativo/neutro/inconclusivo (limiar 5%), gera `_explanation` em pt-BR claro, dispara `extract-case` e `update-store-memory` por trás (com `X-Internal-Call`). Modo cron exige header interno + `allStores`.
- **`store_memory`**: `update-store-memory` popula `profile.learning.successful_recommendations / failed_recommendations / ignored_repeatedly / improving_areas / worsening_areas` exatamente como o prompt do `ai-consult` espera.
- **CORS**: `ai-consult`, `ai-diagnose` (stub 410), `embed-knowledge`, `extract-case`, `measure-outcomes`, `record-feedback`, `update-store-memory` usam `buildCorsHeaders` (origem restrita).
- **Tests**: 7 casos em `record-feedback/status_test.ts` + `ai-consult/validation_test.ts` + `ai-consult/learning_test.ts`.

### Problemas identificados

**Crítico (1)**

- **`record-feedback` não verifica explicitamente que `recommendation_id` pertence ao usuário.** Hoje a proteção depende inteiramente do RLS `has_store_access` em `recommendation_history`. Funciona, mas:
  - O `insert` em `recommendation_feedback` só checa `auth.uid() = user_id` — qualquer usuário pode inserir feedback apontando para uma `recommendation_id` de outra loja (a linha vai existir, embora não afete `recommendation_history`).
  - O `update` em `recommendation_history` falha em silêncio (0 linhas) quando o RLS bloqueia, mas devolvemos `ok: true` — comportamento confuso e potencialmente explorável para enumeração.

**Importante (2)**

- **`suggest-product-names` ainda tem `Access-Control-Allow-Origin: "*"`** definido inline (não usa `buildCorsHeaders`). Função autenticada e não-sensível, mas inconsistente com o restante.
- **`analyze-reviews` ainda importa `corsHeaders` (wildcard `*`) do `_shared/cors.ts`.** A constante `corsHeaders` exportada continua sendo `*` — ela existe só por compat, mas como `analyze-reviews` é chamada do front com JWT, deveria usar `buildCorsHeaders(req)` igual às outras.

**Melhorias opcionais (3)**

- **Remover/depreciar a constante `corsHeaders` "*"** do `_shared/cors.ts` (ou marcar com comentário ainda mais explícito de "uso interno apenas") — hoje convida a regressão.
- **`generate-report-pdf` ainda lê `diagnostics`** (legado, não escreve). Não quebra nada, mas a tabela `diagnostics` virou cemitério — vale documentar ou planejar deprecação futura.
- **Testes pendentes**: faltam casos cobrindo (a) status inválido devolvendo 400, (b) bloqueio cross-tenant em `record-feedback`, (c) `measure-outcomes._explanation` para os 4 outcomes, (d) `metrics_after._explanation` não polui agregadores.

## Plano de implementação (mínimo necessário)

### 1. Fix crítico em `record-feedback` (segurança)

Antes de inserir feedback ou atualizar histórico, validar que `recommendation_id` pertence a uma loja do usuário:

```ts
const { data: rec, error: recErr } = await supabase
  .from("recommendation_history")
  .select("id, store_id")
  .eq("id", recommendation_id)
  .maybeSingle();
if (recErr || !rec) {
  return new Response(JSON.stringify({ error: "Recomendação não encontrada ou sem acesso" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

(Como o cliente usa o JWT do usuário, o `select` já é filtrado por RLS — `null` significa "não é seu".) Mantém o resto do fluxo inalterado.

### 2. Padronizar CORS

- `analyze-reviews/index.ts`: trocar `import { corsHeaders, ... }` por `buildCorsHeaders(req)` no handler (manter `jsonResponse`/`aiErrorResponse` mas passando o cors dinâmico).
- `suggest-product-names/index.ts`: substituir o `corsHeaders` inline por `buildCorsHeaders(req)`.
- `_shared/cors.ts`: ajustar `jsonResponse`/`aiErrorResponse` para aceitar `req` opcional e construir cors dinamicamente, mantendo backward compat.

### 3. Cobertura de testes adicional

Criar/estender testes (Deno, sem rede):

- `supabase/functions/record-feedback/status_test.ts` — adicionar:
  - status inválido (`"foo"`) → rejeitado pela validação `STATUSES`.
  - troca pendente → em_andamento → aplicada (sem perder `applied_at`).
  - cross-tenant: simular `select` retornando `null` → resposta 404.
- `supabase/functions/measure-outcomes/explanation_test.ts` (novo) — testar a função pura `buildExplanation` (extrair de dentro do handler para ficar testável) cobrindo positivo/negativo/neutro/sem-target/sem-dados.

### 4. Checklist final de produção (entregue ao usuário)

Apresentado no fim com 4 seções: pronto / requer teste manual / monitorar / riscos.

## Detalhes técnicos

**Arquivos editados**

- `supabase/functions/record-feedback/index.ts` (+15 linhas: ownership check)
- `supabase/functions/analyze-reviews/index.ts` (~6 linhas: usar `buildCorsHeaders`)
- `supabase/functions/suggest-product-names/index.ts` (~5 linhas: usar `buildCorsHeaders`)
- `supabase/functions/_shared/cors.ts` (jsonResponse aceitando cors dinâmico opcional)
- `supabase/functions/measure-outcomes/index.ts` (extrair `buildExplanation` puro — sem mudança de comportamento)

**Arquivos novos**

- `supabase/functions/measure-outcomes/explanation_test.ts`

**Arquivos editados (testes)**

- `supabase/functions/record-feedback/status_test.ts` (+3 casos)

**O que NÃO vamos tocar**

- `ai-consult/index.ts`, `update-store-memory/index.ts`, `ActionPlan.tsx`, `ai-diagnose/index.ts`, `extract-case/index.ts`, schema do banco, RLS, cron job.

**Validação após implementação**

- Rodar `supabase--test_edge_functions` em `record-feedback`, `ai-consult`, `measure-outcomes`.
- `curl_edge_functions` em `record-feedback` com `recommendation_id` inválido (espera 404) e válido (espera 200).
- Verificar `supabase--linter` para garantir que nada novo apareceu.

## Checklist de produção (entregue após implementação)

**Pronto para produção**
- Diagnóstico unificado (`ai-consult` única fonte)
- Validação anti-alucinação com hard-fail
- 5 status com `applied_at` consistente
- Medição automática diária (cron) com explicação pt-BR
- `store_memory.profile.learning` alimentando o prompt
- CORS restrito a domínios oficiais

**Requer teste manual antes de abrir para clientes**
- Aplicar uma recomendação real, esperar 7 dias, conferir `metrics_after._explanation`
- Rejeitar uma recomendação e rodar nova consulta — IA deve listar em `avoided_repetitions`
- Aplicar com sucesso → próxima consulta deve usar como "próximo passo" (não repetir)
- Onboarding completo de uma loja nova até primeiro diagnóstico

**Monitorar nos primeiros clientes**
- Logs de `applyDiagnosisValidation` (ratio de itens descartados — se >20% recorrente, ajustar prompt)
- Edge logs do cron `measure-outcomes-daily` às 03:00 UTC
- Taxa de `outcome="inconclusivo"` (sinal de que falta dado de métricas)
- Tempo de resposta de `ai-consult` (vetorial + IA pode passar de 10s)

**Riscos remanescentes**
- Embeddings RAG ainda dependem de `LOVABLE_API_KEY` — sem ele, `findSimilarCases`/`findKnowledgeSnippets` retornam vazio (não quebra, mas degrada qualidade)
- `case_library` cresce sem limite — sem rotina de poda hoje
- Tabela `diagnostics` é cemitério (lida só pelo PDF) — risco baixo, mas vale alinhar deprecação
- `metrics_before` é capturado no momento do diagnóstico; se a IA é executada várias vezes no mesmo dia, o "antes" da última sobrescreve a referência das anteriores via memória (não via FK) — checar se isso polui medição
