# Plano — 7 melhorias de conversão e retenção

## Migrações (executar primeiro via migration tool)

### M1 — `action_outcomes`
```sql
create table public.action_outcomes (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null,            -- referencia action_plans.id (ação concluída)
  store_id uuid not null,
  user_id uuid not null,
  completed_at timestamptz not null,
  followup_at timestamptz not null,   -- completed_at + 7 dias
  rating_changed text check (rating_changed in ('up','same','down')),
  orders_changed text check (orders_changed in ('up','same','down')),
  notes text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.action_outcomes enable row level security;
create policy "outcomes_all_own" on public.action_outcomes
  for all to authenticated
  using (user_id = auth.uid() and has_store_access(store_id))
  with check (user_id = auth.uid() and has_store_access(store_id));
create index on public.action_outcomes(user_id, responded_at, followup_at);
```
Nota: `action_id` referencia `action_plans` (não `action_updates`, que registra updates) — alinhado ao padrão atual onde `action_plans` é a tabela de ações.

### M2 — `case_testimonials`
```sql
create table public.case_testimonials (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  city text not null,
  metric_before text not null,
  metric_after text not null,
  timeframe text not null,
  problem_type text not null check (problem_type in ('cancelamento','entrega','avaliacao','cardapio')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.case_testimonials enable row level security;
create policy "testimonials_read_all" on public.case_testimonials
  for select to anon, authenticated using (active = true);
create policy "testimonials_admin_write" on public.case_testimonials
  for all to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));
```

## Frontend

### Melhoria 1 — Banner impacto financeiro (topo de DiagnosisResult)
- Card `bg-red-50 border-red-200 text-red-900` ANTES de tudo (acima do score).
- VALOR = soma de `aiConsult.money_leaks[].monthly_estimate_brl` (campo já existente). Fallback: somar `diagnostics[].business_impact` parseado quando não houver aiConsult.
- N = `diagnostics.filter(d => d.severity === 'critico').length`.
- Não renderizar se VALOR ≤ 0.
- Remove a linha âmbar duplicada que existe hoje no card de score (mantém só o banner novo no topo).

### Melhoria 2 — Conta transparente
- Adicionar dentro de `ProblemDetailSheet.tsx` (já é onde se abre o detalhe), bloco `<details>` "Ver a conta ▾".
- Detector por área: `entrega` → fórmula tempo; `cancelamentos` → fórmula cancel; `avaliações` → fórmula nota.
- Helper `lib/diagnostics/leak-math.ts` com 3 funções puras que recebem `{store, metrics}` e retornam `{lines: string[], total_brl: number}`.
- Cálculos:
  - **Tempo:** `desistentes_por_100 = clamp(round((delivery_time-35)/2),0,40)`; impacto usa `monthly_orders × ticket × (desistentes/100)`.
  - **Cancelamento:** `cancelados = orders × cancellation_rate/100`; impacto = `cancelados × ticket`.
  - **Avaliação:** se rating < 4.5, `pedidos_perdidos_pct = (4.5 - rating) × 0.15`; impacto = `orders × ticket × pct`.

### Melhoria 3 — Card "FAÇA AGORA"
- Em DiagnosisResult, antes do `<ol>` do plano de 7 dias.
- Pega `plan_7_days.find(p => p.day === 1)` (ou primeiro item).
- Card `bg-green-50 border-green-300` maior (p-5, shadow), badge ⚡ "FAÇA AGORA — 10 minutos", título grande, lista numerada de `steps`, badge ⏱, expected_impact em verde itálico.
- Os demais dias do plano renderizam menores como hoje.

### Melhoria 4 — Card de chat
- Após bloco "do_not_do_now" e antes do rodapé.
- Card com gradient `from-blue-50 to-indigo-50 border-blue-200`.
- 3 chips clicáveis (`Button variant="outline" size="sm"`) — ao clicar, navega para `/app/chat?q=<encoded>&diagnosis=<sessionId>`.
- Botão primário "Conversar com o consultor →" → `/app/chat?diagnosis=<sessionId>`.
- Em `Chat.tsx`: ler `useSearchParams()` para `q` (pré-preencher input) e `diagnosis` (anexar contexto na primeira mensagem ou só logar). Mínimo: pré-preencher input quando `q` existir.

### Melhoria 5 — Follow-up outcomes

**Trigger de criação:** quando ação muda para concluída em ActionPlan/ActionDetail (atualmente seta `action_plans.status = 'concluida'` + `completed_at`), inserir em paralelo `action_outcomes` com `followup_at = completed_at + 7 days`. Centralizar num helper `lib/actions/markComplete.ts` se houver múltiplos call sites.

**Card no Dashboard:**
- Componente `<PendingOutcomeCard />` montado no topo de Dashboard.
- Query: `select id, action_id, action_plans(title) from action_outcomes where user_id = auth.uid() and responded_at is null and followup_at <= now() order by followup_at asc limit 1`.
- Card âmbar com 2 grupos de 3 botões (subiu/igual/caiu) usando `<ToggleGroup>`, textarea opcional, botão "Salvar resposta".
- Salvar: `update action_outcomes set rating_changed, orders_changed, notes, responded_at = now()`. Em seguida, invocar edge function `record-feedback` (já existe) com payload `{outcome_id, rating_changed, orders_changed, notes, store_id}`. Toast de sucesso e remoção do card via `queryClient.invalidateQueries`.

### Melhoria 6 — Prova social
- Em DiagnosisResult, dentro do bloco da "Análise inteligente", antes do plano de 7 dias.
- Inferir `problem_type` a partir do problema #1 (severidade crítica / topo da lista): mapear área para enum (`entrega → entrega`, `cancelamentos → cancelamento`, `avaliações → avaliacao`, `cardápio/preço → cardapio`).
- Query: `select * from case_testimonials where active and problem_type = X limit 3`.
- Render: `flex overflow-x-auto snap-x` no mobile; cards 220px com emoji de categoria, "{Categoria} em {Cidade}", `metric_before → metric_after`, `timeframe`.
- Sem dados → não renderizar nada (sem empty state).

### Melhoria 7 — Benchmark por área no Score por Área
- Hook `useCategoryBenchmark(storeCategory)` que faz uma query agregada UMA vez:
  - `select area, avg((... )) ...` — como `diagnostics` não tem score por área persistido, calcular via Edge Function `category-benchmark` ou via materialização: usar `evolution_snapshots.scores_by_area` (jsonb) já agregando.
  - SQL via RPC ou inline: `select scores_by_area from evolution_snapshots e join stores s on s.id = e.store_id where s.category = $1 and e.created_at > now() - interval '90 days'`. Calcular médias por chave em JS.
- Mostrar abaixo do score de cada área: linha pequena `Meta: 70+ • Sua categoria: 65`. Se < 3 lojas: mostrar só "Meta: 70+".

## Arquivos novos
- `src/lib/diagnostics/leak-math.ts` — fórmulas
- `src/components/dashboard/PendingOutcomeCard.tsx`
- `src/components/diagnosis/QuickActionCard.tsx`
- `src/components/diagnosis/ChatCTACard.tsx`
- `src/components/diagnosis/SocialProofRow.tsx`
- `src/hooks/useCategoryBenchmark.ts`
- `src/lib/actions/markComplete.ts` (helper centralizado)
- 2 migrations SQL

## Arquivos editados
- `src/pages/app/diagnosis/DiagnosisResult.tsx` — banner topo, FAÇA AGORA, prova social, chat CTA, benchmark por área
- `src/components/diagnosis/ProblemDetailSheet.tsx` — bloco "Ver a conta"
- `src/pages/app/Dashboard.tsx` — montar `<PendingOutcomeCard />` no topo
- `src/pages/app/Chat.tsx` — ler `?q=` e `?diagnosis=` da URL
- `src/pages/app/ActionDetail.tsx` e/ou `ActionPlan.tsx` — usar helper `markComplete` que cria `action_outcomes`

## Riscos & mitigações
- **R1**: Trigger duplicado de outcome — usar `unique(action_id)` (ou check + upsert) para evitar 2 follow-ups por ação se concluída → reaberta → concluída.
- **R2**: Banner R$ duplicado com bloco existente — remover o duplicado no card de score.
- **R3**: Benchmark sem `evolution_snapshots` populados retorna vazio — fallback graceful (esconde linha "Sua categoria").
- **R4**: Edge function `record-feedback` pode não aceitar payload novo — passar dados em `comment` JSON serializado caso o schema seja rígido (verificar antes de chamar).

Sem features fora do escopo. TypeScript estrito, mobile-first, design tokens existentes (vou usar `bg-red-50` etc. — são classes Tailwind nativas, não tokens semânticos do projeto, mas o briefing exige essas cores específicas).
