## Problema

O Dashboard demora a aparecer porque tem 3 etapas de carregamento em série, cada uma mostrando "Carregando…" em texto puro:

1. `useAuth` resolve a sessão (bloqueia o `AppLayout` inteiro)
2. Query `dashboardStores` busca a lista de lojas
3. Só depois dispara `dashboardData` com **8 queries** ao Supabase em paralelo, várias trazendo até 500 linhas (`products`, `reviews`) que o Dashboard nem usa em detalhe — só conta/agrega.

Resultado: tela em branco/“Carregando…” por vários segundos mesmo em loja pequena, e muito mais em loja com histórico.

## Plano de otimização

### 1. Reduzir payload das queries do Dashboard
No `queryFn` de `dashboardData`, trazer só o necessário para os KPIs e gráficos:
- `products`: apenas `id` (só usamos `.length`) — remover o `select *` e o limit 500
- `reviews`: já está enxuto, manter
- `metrics`: limitar aos últimos 12 períodos com `.order("period_start", { ascending: false }).limit(12)` e reverter no client
- `diagnostics` e `action_plans`: limitar a 10 (mostramos só 5)
- `competitors`: trocar `select id, name, rating` por `select id` (só `.length`)
- `campaigns`: idem, só `id`

Isso corta drasticamente bytes transferidos e tempo de RLS.

### 2. Unir as duas queries em uma só cadeia eficiente
Hoje há `dashboardStores` → seleciona `selectedId` → `dashboardData`. Vamos:
- Manter `dashboardStores` mas com `select id, name, platform, city` (não precisamos de `*`)
- Pré-selecionar a primeira loja sincronamente (sem `useEffect` extra)
- Habilitar `dashboardData` assim que tiver `selectedId`

### 3. Skeleton em vez de “Carregando…”
Trocar os textos `"Carregando…"` e `"Carregando dados…"` por um `DashboardSkeleton` (cards/gráficos cinzas com `animate-pulse`) usando o componente `Skeleton` que já existe. Percepção de velocidade muito maior.

### 4. Cache mais agressivo + placeholderData
No `QueryClient` já temos `staleTime: 60s`. Adicionar nas 3 queries do Dashboard:
- `placeholderData: (prev) => prev` para manter dados antigos ao trocar de loja
- `staleTime: 5 * 60_000` (5 min) — dashboard não precisa estar “fresco ao segundo”

### 5. Pré-buscar `dashboardData` da loja padrão
No mesmo momento em que `dashboardStores` resolve, fazer `queryClient.prefetchQuery` para `dashboardData` da primeira loja, dentro da própria queryFn — assim quando o componente renderiza já tem dados.

### 6. Lazy do Recharts
`recharts` é pesado (~150KB). Envolver `LineChart` e `PieChart` em `React.lazy` + `Suspense` com skeleton, para o resto do dashboard (KPIs, alertas) aparecer antes dos gráficos.

### 7. Memoizar cálculos
`calculateScore` e `sentimentData` são recalculados a cada render. Envolver em `useMemo` dependendo de `data`.

## Detalhes técnicos

Arquivos a modificar:
- `src/pages/app/Dashboard.tsx` — queries enxutas, skeleton, lazy charts, memoização
- novo `src/components/DashboardSkeleton.tsx` — placeholder visual
- `src/components/AppLayout.tsx` — trocar texto “Carregando…” por skeleton de layout

Não mudaremos schema do banco nem RLS.

## Resultado esperado

- Primeira pintura útil (KPIs + score) em < 500ms após auth resolver
- Gráficos aparecem logo em seguida sem bloquear o resto
- Trocar de loja não “pisca” a tela em branco