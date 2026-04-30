# Funil de Diagnóstico Guiado

Nova jornada principal para criar diagnósticos: um wizard consultivo de múltiplas etapas, com salvamento automático, retomada, revisão final e geração consolidada de score, plano de ação e relatório. As páginas atuais continuam existindo para consulta/edição dos dados depois.

## 1. Banco de Dados (migration)

Criar 3 novas tabelas com RLS via `has_store_access(store_id)`:

- **diagnosis_sessions** — `id, user_id, store_id, status (draft|completed|generated), current_step (int), completion_percentage (int), started_at, completed_at, generated_at, created_at, updated_at`
- **diagnosis_answers** — `id, session_id, store_id, user_id, step_key, question_key, answer_value (jsonb), answer_type (text), created_at, updated_at` + índice `(session_id, step_key, question_key)` único
- **diagnosis_step_status** — `id, session_id, step_key, is_completed, completion_percentage, missing_required_fields (jsonb), updated_at` + único `(session_id, step_key)`

Triggers `touch_updated_at` nas três. Sem alterar tabelas existentes (stores, products, reviews, competitors, campaigns, diagnostics, action_plans, reports, metrics).

## 2. Estrutura do Funil (frontend)

Nova rota principal:
- `/app/diagnosis/new` → cria sessão draft e redireciona
- `/app/diagnosis/:sessionId` → wizard
- `/app/diagnosis/:sessionId/review` → tela de revisão
- `/app/diagnosis/:sessionId/result` → resultado pós-geração

Card no Dashboard: "Diagnóstico em andamento" com botão "Continuar diagnóstico" (lê última sessão draft do usuário).

### Arquivos novos
```text
src/lib/diagnosis/
  steps.ts              -- definição declarativa das 16 etapas (key, title, perguntas, validação)
  schema.ts             -- tipos TS + zod schemas por etapa
  autosave.ts           -- hook useAutosave (debounce 800ms → upsert em diagnosis_answers + step_status)
  session.ts            -- helpers: createSession, loadSession, computeCompletion
  generate.ts           -- consolidar respostas → criar registros em diagnostics, action_plans, report
  rules.ts              -- regras de diagnóstico (item 26 do brief)

src/components/diagnosis/
  WizardShell.tsx       -- layout: header com progresso, sidebar checklist, footer botões
  StepProgress.tsx
  StepSidebar.tsx
  QuestionCard.tsx      -- card padronizado com tooltip
  fields/
    YesNo.tsx
    GoodAttentionBad.tsx
    NumberField.tsx
    TextArea.tsx
    ProductsTable.tsx   -- repetidor para etapa 6
    CompetitorsTable.tsx-- repetidor para etapa 12
    FileUpload.tsx      -- etapa 16, salva em bucket "uploads" (criar se não existir)
  steps/
    Step01Welcome.tsx
    Step02BasicInfo.tsx
    Step03Storefront.tsx
    Step04Menu.tsx
    Step05Photos.tsx
    Step06Products.tsx
    Step07PriceMargin.tsx
    Step08Combos.tsx
    Step09Promotions.tsx
    Step10Reviews.tsx
    Step11Delivery.tsx
    Step12Competitors.tsx
    Step13Demand.tsx
    Step14Loyalty.tsx
    Step15Ads.tsx
    Step16Uploads.tsx

src/pages/app/diagnosis/
  NewDiagnosis.tsx      -- cria sessão e redireciona
  DiagnosisWizard.tsx   -- carrega sessão, monta WizardShell + step atual
  DiagnosisReview.tsx   -- revisão final com alertas de campos faltantes
  DiagnosisResult.tsx   -- score + diagnósticos + plano + link relatório
```

## 3. Comportamento do Wizard

- **Salvamento automático**: cada mudança de campo dispara debounce → `upsert diagnosis_answers` + recomputa `step_status`.
- **Validação**: zod por etapa; campos obrigatórios marcados; usuário NÃO é bloqueado por opcionais; campos essenciais (item 24) geram alerta visual mas permitem avançar.
- **Navegação**: Voltar / Salvar e continuar / Continuar depois (sair). Sidebar permite pular para etapas já visitadas.
- **Sincronização com tabelas existentes**: ao final de etapas-chave, espelhar dados em tabelas reais:
  - Etapa 2 → upsert em `stores` (cria se ainda não existir; FK `store_id` da sessão)
  - Etapa 6 → upsert em `products`
  - Etapa 10 → insert em `reviews` (quando o usuário cola/cadastra)
  - Etapa 12 → upsert em `competitors`
  - Etapa 11/13 → atualiza campos de `stores` e cria linha em `metrics`
  - Etapa 9/15 → upsert em `campaigns`
- **Tooltips**: cada pergunta com `<Tooltip>` shadcn explicativo.

## 4. Revisão (`/review`)

Lista as 16 etapas com: status (completa/incompleta/parcial), % preenchimento, campos essenciais faltantes, link "Editar etapa". Banner se faltarem essenciais: "Seu diagnóstico pode ficar menos preciso porque algumas informações não foram preenchidas." Botão **Gerar diagnóstico da loja**.

## 5. Geração do Diagnóstico

Função `generateDiagnosis(sessionId)` em `src/lib/diagnosis/generate.ts`:
1. Carrega todas as respostas + dados espelhados.
2. Aplica `rules.ts` (regras do item 26) → produz lista de problemas no formato do item 20: `{problema, evidencia, causa_provavel, impacto, solucao, prioridade, acao_pratica, prazo_sugerido, area, severity}`.
3. Insert em `diagnostics` (uma linha por problema).
4. Calcula score geral e por área (reusa `src/lib/diagnostics/engine.ts` existente, estendendo entradas).
5. Gera `action_plans` priorizados por impacto × urgência × esforço.
6. Cria registro em `reports` com `executive_summary`, `key_problems`, `opportunities`, `recommendations` e `report_data` contendo respostas das 5 perguntas finais do item 21.
7. Atualiza `diagnosis_sessions.status='generated'` e `generated_at=now()`.
8. Redireciona para `/app/diagnosis/:sessionId/result`.

## 6. Resultado (`/result`)

Mostra: score geral + situação (bom ≥80 / atenção 60-79 / crítico <60), top 5 problemas, top oportunidades, scores por área (radial), plano de ação priorizado, botões "Ver relatório completo" (`/app/stores/:id/report`) e "Exportar PDF" (reusa edge function `generate-report-pdf` existente).

## 7. Storage para Uploads (Etapa 16)

Criar bucket privado `uploads` com RLS:
- SELECT/INSERT/DELETE: `auth.uid()::text = (storage.foldername(name))[1]`

Estrutura: `uploads/<user_id>/<session_id>/<filename>`. Por enquanto apenas armazena e mostra "arquivo recebido" — parsing real fica como TODO (já existe `src/lib/import/parsers.ts` para futuro).

## 8. Integração com UI existente

- **AppSidebar**: adicionar item destacado "Novo Diagnóstico" no topo do grupo *Análise*, apontando para `/app/diagnosis/new`.
- **Dashboard**: card "Diagnóstico em andamento" se houver sessão draft; card "Iniciar novo diagnóstico" caso contrário.
- **StoreOverview**: botão secundário "Refazer via funil" → cria nova sessão vinculada à loja.
- Páginas existentes (Diagnostics, Score, Products, etc.) **permanecem intactas** — passam a ser usadas para consulta e ajustes pontuais.

## 9. Regras de diagnóstico (rules.ts — item 26)

Implementar como funções puras `(answers, derivedMetrics) => DiagnosticProblem[]`:
- nota < 4.5 → reputação
- tempo entrega > 45min → entrega
- cancelamento > 5% → cancelamentos
- margem estimada < 20% → financeiro
- >40% produtos sem foto → cardápio
- ticket médio baixo + sem combos → ticket médio
- sem estratégia recompra → fidelização
- ROI campanha negativo → anúncios
- concorrente com prazo/taxa menor → competitividade
- reviews com keywords (atraso, frio, embalagem, errado) → experiência
- top vendas com margem baixa → alerta lucro
- alta margem + baixa venda → sugestão destaque

Reutiliza e estende `supabase/functions/_shared/diagnostic-rules.ts`.

## 10. Critério de aceite

Login → "Novo Diagnóstico" → 16 etapas com autosave → Revisão → "Gerar" → Result com score, problemas, plano, relatório. Sair no meio e voltar pelo card do Dashboard mantém o progresso.

---

## Detalhes técnicos

- **Stack**: React + TS, react-router, react-hook-form + zod, TanStack Query, shadcn/ui, sonner.
- **Autosave**: hook customizado com debounce, otimista; fila simples para evitar race condition.
- **Performance**: cada step é code-split (`React.lazy`) dentro do `DiagnosisWizard`.
- **Migration única**: cria as 3 tabelas + RLS + bucket `uploads` + policies de storage.
- **Sem alterar** `src/integrations/supabase/{client,types}.ts` — types regeneram após migration.
- **Sem remover** rotas/páginas atuais.

Estimativa: 1 migration, ~25 arquivos novos, edits em `App.tsx`, `AppSidebar.tsx`, `Dashboard.tsx`.