# Política de Retenção — case_library

**Status:** documentação para o piloto. Nenhum dado é apagado nesta fase.

## Contexto

`case_library` armazena casos de sucesso/falha extraídos por `extract-case`
quando uma recomendação termina com `outcome = positivo` (e, no futuro,
também os negativos para servir como contraexemplo). É consumida por
`findSimilarCases` em `ai-consult` para enriquecer o RAG.

Sem política de retenção, a tabela cresce indefinidamente, degradando a
qualidade dos top-K (casos antigos/ruins competem com casos recentes).

## Campos preparados (migração já aplicada)

- `archived_at timestamptz NULL` — soft-delete; `NULL` = ativo.
- `usefulness_score smallint NULL` — score 0-100 atribuído por revisão
  manual ou medição automática futura.
- `retention_notes text NULL` — justificativa livre.
- Índice parcial `idx_case_library_active` em `(created_at DESC) WHERE archived_at IS NULL`.

## Política proposta (pós-piloto)

Aplicar via job semanal:

1. **Arquivar** (`archived_at = now()`) casos que atendam a TODOS:
   - `created_at` mais antigo que **12 meses**;
   - `usefulness_score < 30` OU nunca apareceu como top-K nos últimos 90 dias;
   - `outcome` NÃO é `positivo` com métricas robustas (`metrics_after.samples >= 3`).
2. **Promover** (manter ativo + score alto) casos que atendam a UM:
   - `outcome = positivo` E `metrics_after._delta_pct >= 10`;
   - feedback humano `usefulness_score >= 70`.
3. **Hard-delete** apenas após 24 meses arquivado E sem queries no período.

## O que NÃO fazer agora

- Não filtrar por `archived_at` em `findSimilarCases` (compatibilidade).
- Não rodar limpeza automática.
- Não preencher `usefulness_score` retroativamente sem critério medido.

## Sinais para iniciar a política

- `case_library` ultrapassar **5.000 linhas**, OU
- p95 de `match_cases` ultrapassar **300ms**, OU
- Taxa de `similar_case` em `main_problems` cair abaixo de **5%** das
  recomendações totais (sinal de top-K ruim).
