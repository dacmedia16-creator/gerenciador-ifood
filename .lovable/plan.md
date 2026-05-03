## Objetivo
Tudo que o usuário responde no formulário do diagnóstico passa a popular automaticamente as páginas da seção **Operação** e **Análise da minha loja** (Minha loja, Métricas, Meta da loja, Produtos, etc.).

## Como vai funcionar
A cada vez que o usuário avança uma etapa do wizard, sincronizamos as respostas daquela etapa para as tabelas operacionais corretas — fazendo merge (UPDATE quando já existe, INSERT quando novo). Nada é apagado.

## Mapeamento etapa → tabela

### Etapa **basic** (Sobre a loja) → `stores`
- `name` → `stores.name`
- `category` → `stores.category`
- `platform` → `stores.platform`
- `city`, `neighborhood`, `opening_hours` → mesmas colunas
- `monthly_orders` → `stores.monthly_orders`
- `monthly_revenue` → `stores.monthly_revenue`
- `average_ticket` → `stores.average_ticket`

### Etapa **storefront** (Como o cliente vê) → `stores` + `metrics`
- `rating` → `stores.rating`
- `promised_delivery_time` → `stores.promised_delivery_time`
- `delivery_fee` → `stores.delivery_fee`
- Cria/atualiza linha em `metrics` do mês corrente com `rating`, `revenue` (se houver), `orders`, `average_ticket`.

### Etapa **delivery** (Entrega) → `stores` + `metrics`
- `cancellation_rate` → `stores.cancellation_rate` e `metrics.cancellation_rate`
- `real_time` → `metrics.average_delivery_time`

### Etapa **products** (Top 3) → `products` ✅ (já feito)

### Etapa **goal** (Meta principal) → `store_goals`
- Cria/atualiza meta ativa: `goal_type`, `current_value`, `target_value`, `deadline` (em dias → soma a hoje).

### Etapas sem destino direto (continuam só no diagnóstico)
- `menu`, `pricing`, `combos`, `operations`, `reviews`, `ads`, `loyalty`, `prints` — são respostas usadas pela IA para gerar o relatório/recomendações, não têm tabela de "estado da loja" equivalente.
- **Concorrentes**: o diagnóstico só pergunta em texto livre (`top_competitors`), por isso não dá para criar linhas estruturadas em `competitors` automaticamente. A página continua aceitando cadastro manual.

## Implementação técnica

### 1. Novo arquivo: `src/lib/diagnosis/syncToStore.ts`
Funções:
- `syncStoreBasics(storeId, basicValues, storefrontValues, deliveryValues)` — UPDATE em `stores` com merge dos campos preenchidos (ignora vazio/`""`).
- `syncMetricsSnapshot(storeId, values)` — INSERT em `metrics` para o mês atual (período = mês corrente) se houver dados novos; senão UPDATE da linha do mês.
- `syncStoreGoal(storeId, userId, goalValues)` — UPSERT em `store_goals` (uma meta ativa por loja: encerra antiga, cria nova).

Helpers: `numOrNull(v)`, `pickFilled(obj, keys)`.

### 2. `src/pages/app/diagnosis/DiagnosisWizard.tsx`
Estender o `onNext` (já fizemos isso para products). Quando avançar:
- `basic` → `syncStoreBasics(storeId, values, …)` (lê apenas o que tem)
- `storefront` → atualiza `stores` + chama `syncMetricsSnapshot`
- `delivery` → atualiza `stores` + `syncMetricsSnapshot`
- `goal` → `syncStoreGoal`

Tudo dentro de `try/catch` com `console.error`, sem bloquear navegação.

### 3. Sem mudança de schema
Todas as tabelas (`stores`, `metrics`, `store_goals`, `products`) já existem com RLS apropriada.

## Resultado
Depois de preencher o diagnóstico, ao abrir **Minha loja**, **Métricas**, **Meta da loja** e **Produtos**, o usuário já encontra os dados preenchidos automaticamente — sem precisar repetir nada.
