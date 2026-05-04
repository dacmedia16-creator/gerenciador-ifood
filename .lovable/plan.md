## Problema

A rota `/app/onboarding` (`src/pages/app/Onboarding.tsx`) renderiza o `OnboardingWizard` sem checar se o usuário já tem loja cadastrada. Como o sidebar não tem link para essa rota, o usuário só chega lá via:

1. Redirect do `Dashboard.tsx` linha 119: `if (!stores.length) return <Navigate to="/app/onboarding" />` — disparado quando a query de stores devolve lista vazia (pode acontecer em race condition de cache, sessão expirada momentaneamente, ou RLS retornando vazio antes do `useAuth` resolver).
2. Refresh manual da URL.

Resultado: mesmo quem já tem loja + diagnóstico vê o wizard "Bem-vindo ao Gestor IA de Delivery".

## Correção

Tornar `/app/onboarding` idempotente: se o usuário já tem loja, redirecionar direto para a loja dele; só renderiza o wizard quando realmente não houver loja.

### Mudança em `src/pages/app/Onboarding.tsx`

Reaproveitar a lógica que já existe em `src/pages/app/MyStore.tsx`:

- Usar `useAuth` + `getUserStore(user.id)`.
- Enquanto carrega: `<LoadingState />`.
- Se houver loja: `navigate(`/app/stores/${store.id}`, { replace: true })`.
- Se não houver: renderizar `<OnboardingWizard />`.

### Endurecer o redirect do Dashboard

Em `src/pages/app/Dashboard.tsx` linha 119, só redirecionar para `/app/onboarding` depois de garantir que a query de stores foi executada com sucesso (usar `isFetched` da query além de `loadingStores`) — isso evita falso positivo quando o cache vem vazio temporariamente.

## Arquivos afetados

- `src/pages/app/Onboarding.tsx` — adicionar guarda de loja existente.
- `src/pages/app/Dashboard.tsx` — usar `isFetched` antes de assumir "sem lojas".

Sem mudanças de banco, sem novas dependências.
