# Plano: Dashboard reorganizado + Plano de Ação reestruturado

## 1. Migration (Supabase)

Adicionar campos opcionais (nullable) sem quebrar dados existentes:

```sql
-- action_plans: novos campos para o plano reestruturado
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS impacto_financeiro numeric,
  ADD COLUMN IF NOT EXISTS dificuldade text,        -- 'facil' | 'medio' | 'dificil'
  ADD COLUMN IF NOT EXISTS tempo_estimado text,     -- ex: '15 min', 'Esta semana'
  ADD COLUMN IF NOT EXISTS categoria text,          -- ex: 'Cardápio'
  ADD COLUMN IF NOT EXISTS feedback_text text,
  ADD COLUMN IF NOT EXISTS has_feedback boolean NOT NULL DEFAULT false;

-- weekly_snapshots: tabela nova para o check-in semanal
CREATE TABLE IF NOT EXISTS public.weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  week_start date NOT NULL,
  rating numeric,
  cancellation_rate numeric,
  weekly_revenue numeric,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start)
);
ALTER TABLE public.weekly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_snapshots_all_own ON public.weekly_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_store_access(store_id))
  WITH CHECK (auth.uid() = user_id AND public.has_store_access(store_id));
```

Não alterar tabelas existentes além das colunas adicionais. Sem mudança em RLS de `action_plans`.

## 2. Dashboard (`src/pages/app/Dashboard.tsx`)

Substituir o conteúdo após o header (loja/seletor) pelos 4 blocos abaixo. **Manter** o header existente (seletor de loja, botão Nova loja, botão Atualizar sistema, botão Analisar minha loja) e o card de "Diagnóstico em andamento" (`draftSession`). **Remover** os blocos `KPI grid antigo`, `DoFirstBlock`, `MoneyLeakBlock`, "Perguntas que este painel responde", `DashboardCharts`, e os 2 cards finais de "alertas críticos" / "ações para crescer".

### Bloco A — `WeeklyCheckinCard` (novo componente)
- Visível só se `new Date().getDay() === 1` (segunda) E não existir `weekly_snapshots` para `week_start = início da semana atual` (segunda).
- Card amber (`bg-amber-50 border-amber-200`), ícone calendário, 3 inputs (`rating`, `cancellation_rate`, `weekly_revenue`).
- Ao salvar: insere `weekly_snapshots` com `score` calculado via `calculateScore`. Compara com snapshot da semana anterior; abre `Dialog` mostrando deltas (score, nota). Botão "Pular por hoje" → `localStorage.setItem('weeklyCheckinSkipped:' + weekStart, '1')`.

### Bloco B — Score + Impacto Financeiro (grid 2 colunas md+, empilhado mobile)
- Card 1: número grande do score atual (`overall`) + variação semanal (diff vs `weekly_snapshots` anterior) com ▲/▼ colorido + data do último diagnóstico (`diagnostics[0].created_at`). Vazio → "—" + botão "Fazer primeiro diagnóstico" → `/app/diagnosis/welcome`.
- Card 2: soma de `impacto_financeiro` das ações pendentes; número grande em `text-orange-600`. Vazio/zero → mensagem positiva.

### Bloco C — `WeekActionsBlock` (novo componente)
- Carrega top 3 ações com `status NOT IN ('aplicada','ignorada','rejeitada','completed')` ordenadas por `impacto_financeiro DESC NULLS LAST`.
- Card por ação com badges: impacto verde, dificuldade (mapa cor), tempo, botão "Marcar como feito" (dispara `CompletionModal` compartilhado com ActionPlan), botão "Ver detalhes" → `/app/stores/:id/action-plan/:actionId`.
- Estados vazios conforme spec.

### Bloco D — `ToolsGrid` (novo componente)
- Lê `useIsAdmin` apenas como fallback; para `plano`, usar profile/feature flag. Como ainda não existe campo `plan`, **assumir `pro` para usuários autenticados** com `TODO`/comentário, e renderizar grid 2 colunas dos 4 atalhos: PricingSimulator, BestHours, Reviews, StoreEvolution. Para `plan === 'free'` renderizar versão com `blur-sm pointer-events-none` + cadeado + texto "Disponível no Pro" → CTA `/app/planos`.
- Como não há campo de plano hoje, **deixar comportamento atual = visível**, com `getUserPlan()` helper isolado em `src/lib/plan.ts` retornando `'pro'`. Quando o campo existir, basta trocar a função.

### Remover do Dashboard
Conforme spec: nenhum atalho de admin/configuração/lista de lojas para gestão além do que já está no header (seletor + nova loja, que é necessário para multi-loja).

## 3. Plano de Ação (`src/pages/app/ActionPlan.tsx`)

Reescrever a estrutura visual mantendo a lógica de `change`/`submitOutcome` e o `Dialog` de outcome (renomeado para "Ação concluída").

### Header
- Título "Seu Plano de Ação".
- Subtítulo: `${pendentes} ações pendentes · Impacto total estimado: ~R$ ${soma}/mês` (soma `impacto_financeiro` das pendentes).
- Filtros (chips): Todas / Fácil / Médio / Difícil / Concluídas. Estado local `filter`.

### Card de ação
- Layout em 3 linhas conforme spec, com `Checkbox` grande (h-6 w-6, área de toque ≥ 48px via padding).
- Linha 2: badges de dificuldade (cor por valor), tempo (`tempo_estimado`), categoria.
- Linha 3 (collapsible via `useState` por card, ou `<details>`): descrição completa, causa (`why_it_matters`), passo a passo (`how_to_apply`), botão `Abrir [ferramenta]` se `toolForAction` retornar.
- Concluídas: `opacity-60`, checkbox marcado, data de conclusão (`completed_at`), badge "✓ Você reportou melhora" se `has_feedback`.

### Fluxo de conclusão
Quando checkbox/Marcar como feito é acionado:
1. `update action_plans set status='aplicada', completed_at=now() where id=`.
2. Abrir modal de celebração com texto fixo "Ação concluída! 🎉" + valor de impacto.
3. Textarea opcional. Botão Salvar:
   - Se houver texto: `update action_plans set feedback_text=, has_feedback=true`.
   - Chamar `supabase.functions.invoke('record-feedback', { body: { recommendation_id, status:'aplicada', applied:true, generated_result:'sim', outcome_explanation: feedback, comment: feedback } })` (reutiliza fluxo já existente).
4. Fechar modal e `reload()`.

### Estado vazio
Card centralizado + botão "Fazer diagnóstico agora" → `/app/diagnosis/welcome`.

### Botão flutuante
`fixed bottom-6 right-6 z-40` com `Plus` + "Novo diagnóstico". Renderizado dentro da página.

## 4. Componentes novos

- `src/components/dashboard/WeeklyCheckinCard.tsx`
- `src/components/dashboard/ScoreImpactBlocks.tsx`
- `src/components/dashboard/WeekActionsBlock.tsx`
- `src/components/dashboard/ToolsGrid.tsx`
- `src/components/actions/ActionCompletionModal.tsx` (reuso entre Dashboard e ActionPlan)
- `src/lib/plan.ts` — `getUserPlan()` retornando `'pro'` por enquanto.

## 5. Regras técnicas

- TypeScript estrito; sem `any` desnecessário (apenas onde já existia).
- Mobile-first: botões `min-h-[48px]`, cards toque-amigáveis.
- Componentes shadcn existentes (`Card`, `Button`, `Badge`, `Dialog`, `Textarea`, `Checkbox`, `Input`).
- Sem alterar `src/integrations/supabase/{client,types}.ts`.
- Não remover rotas, não tocar em `useStoreData` (ele já traz `actions`).
- Manter `DoFirstBlock` e `MoneyLeakBlock` no codebase (apenas removidos do Dashboard) caso sejam reusados.

## Arquivos afetados

- **Migration:** novos campos em `action_plans`, nova tabela `weekly_snapshots` + RLS.
- **Editados:** `src/pages/app/Dashboard.tsx`, `src/pages/app/ActionPlan.tsx`.
- **Criados:** 5 componentes + `src/lib/plan.ts` listados acima.
