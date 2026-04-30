# Baselines de Recomendação

## Comportamento atual (piloto)

Cada chamada a `ai-consult` gera um novo `report` e insere uma linha em
`recommendation_history` por problema, com `metrics_before = snapshot da
loja no momento da consulta`.

**Consequência intencional:** duas consultas no mesmo dia para a mesma
`rule_id` produzem **dois baselines independentes**. Isso é correto —
cada consulta é um momento diferente da loja.

## Agrupamento por ciclo

Para facilitar análises agregadas sem deduplicar histórico, foi adicionada
a coluna:

```
recommendation_history.diagnosis_cycle_id uuid NULL
```

Por padrão, `diagnosis_cycle_id = report_id` (o report criado pela própria
consulta). Isso permite:

- Listar todas as recomendações de um mesmo ciclo: filtrar por `diagnosis_cycle_id`.
- Comparar evolução entre ciclos: agrupar por `(store_id, rule_id)` e ordenar
  por `created_at` dos `diagnosis_cycle_id` distintos.

## O que NÃO mudou

- Histórico antigo continua com `diagnosis_cycle_id = NULL` (compatível).
- `measure-outcomes` continua olhando cada `recommendation_history.id`
  individualmente — ele não deduplica por `rule_id`.
- A IA continua recebendo `PAST_RECOMMENDATIONS` agregadas como antes.

## Decisão pós-piloto

Se virmos confusão real (ex.: dono confuso porque viu duas recomendações
quase iguais com baselines diferentes), decidir entre:

1. **Deduplicar na UI** por `(rule_id, diagnosis_cycle_id)` mais recente.
2. **Bloquear nova consulta** se já houver uma do mesmo dia (UX-only).
3. **Mesclar baselines** retroativamente (não recomendado — perde sinal).
