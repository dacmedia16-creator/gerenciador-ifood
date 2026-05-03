## Objetivo
Quando o usuário cadastrar produtos na etapa **"Seus produtos mais vendidos"** do diagnóstico, eles aparecerão automaticamente na página **Produtos da Loja** (`/app/stores/:id/products`).

## Como vai funcionar
- Ao avançar/salvar a etapa `products` do wizard, sincronizamos cada item para a tabela `products` (vinculada à loja via `store_id`).
- Match por `(store_id, name)` — sem nome, ignora.
- Se já existir produto com o mesmo nome na loja: atualiza. Se não existir: insere.
- Não apaga produtos cadastrados manualmente.

## Mudanças

### 1. Novo: `src/lib/diagnosis/syncProducts.ts`
Função `syncDiagnosisProductsToStore(storeId, items)` que:
- Filtra itens com nome preenchido.
- Busca produtos existentes da loja para match por nome (case-insensitive).
- Faz `upsert` manual (UPDATE se existe, INSERT se não).
- Mapeia campos: `name`, `category`, `sale_price`, `food_cost`, `packaging_cost`, `platform_fee_percent`, `sales_quantity`, `has_photo`, `description` (vinda de `notes`), `complaints_count` (1 se `has_complaints`), `is_active=true`.

### 2. `src/pages/app/diagnosis/DiagnosisWizard.tsx`
- Importar `syncDiagnosisProductsToStore`.
- Em `onNext`, antes de avançar: se a etapa atual for `products` e houver `session.store_id`, chamar a sync com `values.items`.
- Falhas são silenciadas com `console.error` (não bloqueiam o fluxo).

### 3. Sem mudança de schema
A tabela `products` já tem todas as colunas necessárias e RLS via `has_store_access(store_id)`.

## Resultado
Após preencher o Top 3 produtos no diagnóstico e clicar em "Próximo", a página **Produtos** da loja já mostra os produtos com preço, custo, foto etc. — pronto para uso no Simulador de preço, Margem & Preço, etc.
