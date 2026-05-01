## Diagnóstico da lentidão

Olhando o código, **três pontos** explicam a sensação de lentidão (e o session replay confirma — múltiplos estados "Carregando…" / "Carregando dados…" em sequência ao trocar de página):

### 1. Dashboard faz 8 queries em paralelo, sem cache, a cada troca de loja
Em `src/pages/app/Dashboard.tsx` (linhas 48–66) e em `src/hooks/useStoreData.ts`, cada navegação ou troca de loja dispara:
- `stores`, `metrics`, `products`, `reviews`, `competitors`, `campaigns`, `diagnostics`, `action_plans` — todas com `select("*")` sem `limit`.
- Sem React Query (mesmo com `QueryClientProvider` configurado em `App.tsx`), então não há cache: voltar para a tela refaz tudo.
- `reviews`/`products` podem ter centenas de linhas cada, e o dashboard só usa contagem/sentimento.

Resultado: cada visita ao Dashboard = 8 round-trips + payloads grandes + re-render dos charts.

### 2. Bundle inicial pesado (sem code-splitting)
`src/App.tsx` importa **todas** as 30+ páginas no topo (Dashboard, Diagnóstico, Wizard, Pricing, Reviews, Chat, Knowledge, Recharts, ReactMarkdown…). Tudo entra no bundle inicial, mesmo quando o usuário só abre o Dashboard. Isso piora muito o "tempo até interativo" da primeira visita e de qualquer hard refresh.

### 3. Edge function `chat-gestor` faz RAG síncrono antes de começar a streamar
Em `supabase/functions/chat-gestor/index.ts`, antes do primeiro token aparecer, ela:
- Cria o client Supabase
- Roda `findKnowledgeSnippets` (RPC `match_knowledge` + filtro)
- Só então chama o gateway Lovable AI

São facilmente 1–3s de latência "fantasma" antes do streaming aparecer, dando sensação de travado.

---

## Plano de correção

### A. Cache + queries enxutas no Dashboard (maior ganho percebido)
- Migrar `Dashboard.tsx` e `useStoreData.ts` para **React Query** (`useQuery`) com `staleTime: 60_000`. Trocar de loja e voltar passa a ser instantâneo.
- Substituir `select("*")` por colunas usadas:
  - `reviews`: só `sentiment` (e `id` para count)
  - `products`: só `id, name, sale_price, has_photo, sales_quantity`
  - `metrics`: só `period_start, revenue`
  - `diagnostics`: `id, problem, area, severity` com `limit(20)`
  - `action_plans`: `id, title, area, priority` com `limit(20)`
- Adicionar `limit(500)` defensivo em `reviews`/`products` para não trazer milhares de linhas.

### B. Code-splitting das rotas
Em `src/App.tsx`, converter os imports de páginas para `React.lazy(() => import(...))` e envolver `<Routes>` em `<Suspense fallback={<LoadingState/>}>`. Manter `Index`, `Auth` e `AppLayout` como import direto. Isso reduz o JS baixado na primeira tela tipicamente em 60–80%.

### C. Acelerar primeira resposta do Chat
- Em `chat-gestor`, fazer o RAG e a chamada ao gateway **em paralelo** quando possível, ou começar a chamada do gateway com um prompt provisório enquanto o RAG roda — ou simplesmente reduzir `match_count` de 5 para 3 e cortar `s.content` em ~600 chars por trecho (o prompt está enviando textos enormes).
- Adicionar `console.log` com timestamps para medir quanto tempo o RAG está custando (visível em edge logs).

### D. Verificações rápidas adicionais
- Conferir se há queries N+1 escondidas em outras páginas frequentes (`StoreOverview`, `Reviews`, `Products`).
- Validar se a instância do Lovable Cloud não está saturada — se mesmo após A/B/C continuar lento em produção, considerar **upgrade da instância** em Backend → Advanced settings.

---

## Ordem de execução

1. Code-splitting em `App.tsx` (rápido, ganho global imediato).
2. Refatorar `Dashboard.tsx` + `useStoreData.ts` com React Query e selects enxutos.
3. Otimizar `chat-gestor` (RAG menor + log de tempo).
4. Medir e, se necessário, sugerir upgrade da instância de Cloud.

Posso aplicar tudo de uma vez ou ir em etapas — me diga se quer começar só pelo Dashboard ou já fazer o pacote completo.