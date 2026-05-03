
# Checkup Completo — Diagnóstico Inteligente da Loja

Auditoria somente-leitura. Nada foi alterado. Esta é a **Fase 1 + Fase 2 (relatório)**. Após sua aprovação, executo a Fase 3 corrigindo por prioridade.

---

## 1. Rotas e telas — mapa real

```text
/app/diagnosis/welcome            → DiagnosisWelcome.tsx     (entrada)
/app/diagnosis/new                → NewDiagnosis.tsx         (cria/abre sessão e redireciona)
/app/diagnosis/:sessionId         → DiagnosisWizard.tsx      (funil + uploads embutidos)
/app/diagnosis/:sessionId/review  → DiagnosisReview.tsx      (revisão + dispara IA)
/app/diagnosis/:sessionId/result  → DiagnosisResult.tsx      (score + problemas)
/app/stores/:id/report            → Report.tsx               (relatório completo IA)
/app/stores/:id/action-plan       → ActionPlan.tsx
/app/stores/:id/action-plan/:actionId → ActionDetail.tsx     (marcar feito + reanálise)
/app/stores/:id/goal              → StoreGoal.tsx
/app/stores/:id/evolution         → StoreEvolution.tsx
```

Telas existem para todas as 14 etapas do fluxo desejado. Nenhuma rota quebrada.

**Problemas:**
- **[ALTO] Não há tela de "Escolha entre Prints / Formulário / Ambos".** O Welcome só tem um botão "Começar". O modo é decidido implicitamente via querystring `?mode=prints|form` em `DiagnosisWizard`, mas nenhuma tela oferece essa escolha ao usuário. Requisito explícito do briefing.
- **[MÉDIO] Duplicidade de entradas:** `/app/diagnosis/welcome` (Sidebar) + `/app/diagnosis/new` (Dashboard "Novo diagnóstico") + Dashboard "Continuar" indo direto pro `:sessionId`. Três pontos de entrada com lógicas levemente diferentes. Não é bug, é confusão.
- **[BAIXO] `Report.tsx` linka "Novo Diagnóstico" → `/app/diagnosis/new` sem passar `storeId`. Cria sessão sem loja vinculada se for primeira vez.

---

## 2. Fluxo do usuário

Ordem real hoje:
```text
Welcome → Wizard (com prints opcionais embutidos como step 1) → Review → (gera local + dispara IA) → Result
```

**Problemas:**
- **[ALTO] Falta a tela de escolha de modo** (item acima).
- **[ALTO] Race condition no Review:** `handleGenerate` chama `generateDiagnosis()` (cria store, métricas, action_plans baseados em regras locais) e em paralelo dispara `ai-consult` sem aguardar. Usuário é navegado para `/result` antes da IA terminar. O Result mostra apenas `diagnostics` e `action_plans` da regra local — o resultado da IA (rule_evidences, plan_7/30, do_not_do_now) só aparece em `/stores/:id/report`. **O usuário pode achar que o resultado é só isso e não ver o relatório IA.**
- **[MÉDIO] `DiagnosisResult` não tem botão "Marcar ações como tarefas"** explicitamente — as actions já foram criadas, mas não há link claro para `/stores/:id/action-plan`. Tem só "Ver relatório completo".
- **[MÉDIO] Não há etapa "Tela de carregamento da IA"** entre Review e Result. Toast "Gerando..." aparece mas a navegação é imediata.

---

## 3. Banco de dados

Tabelas existentes e papel:

| Tabela | Papel | OK? |
|---|---|---|
| `stores` | loja do usuário (FK lógica `user_id`) | ok, RLS por `user_id` |
| `diagnosis_sessions` | sessão do funil | ok, RLS por `user_id`. Tem `store_id` opcional |
| `diagnosis_answers` | respostas key/value por step | ok, RLS por `user_id`. **Sem unique constraint em (session_id, step_key, question_key)** apesar do código fazer `upsert onConflict` nesse trio |
| `diagnosis_step_status` | status por etapa | ok. Idem: `upsert onConflict (session_id, step_key)` mas não há índice unique declarado no schema visível |
| `diagnosis_uploads` | prints + structured_data | ok, RLS por `user_id`, bucket `diagnosis-uploads` privado |
| `diagnostics` | problemas gerados pela regra local | ok |
| `action_plans` | tarefas | ok. Liga via `store_id` + `recommendation_id` opcional |
| `action_updates` | "o que mudou" ao marcar feito | ok |
| `recommendation_history` | recomendações da IA persistidas | ok |
| `reports` | relatório consolidado (regra local + `ai_consult` em `report_data`) | ok |
| `store_goals` | meta ativa | ok |
| `evolution_snapshots` | snapshot diário score+kpis | ok |
| `metrics` | métricas históricas | ok |

**Problemas:**
- **[CRÍTICO] Falta unique index em `diagnosis_answers(session_id, step_key, question_key)`** — `DiagnosisWizard` faz `upsert({ onConflict: "session_id,step_key,question_key" })`. Sem o unique, o Postgres rejeita o upsert silenciosamente em algum caminho. Idem em `diagnosis_step_status(session_id, step_key)`.
- **[ALTO] Duplicidade de "fonte da verdade":** `generateDiagnosis()` (client) cria um `report` próprio + `diagnostics` + `action_plans` por regra local. Logo depois, `ai-consult` insere **outro** `report` + outras `action_plans` + `recommendation_history`. Resultado: 2 relatórios e 2 conjuntos de ações por ciclo. `ActionPlan.tsx` mostra os dois misturados, sem distinção clara.
- **[MÉDIO] `action_plans` não tem FK declarada para `recommendation_history.id`** (só campo solto `recommendation_id`). Ok funcionalmente, mas frágil.
- **[MÉDIO] `diagnosis_answers.store_id` é nullable** — respostas iniciais ficam sem `store_id` até a etapa que cria a loja. Não é bug, mas dificulta queries por loja.
- **[BAIXO] RLS de `case_library` e `knowledge_base`:** SELECT liberado para qualquer authenticated. Aceitável se for base global, mas confirme intenção.

---

## 4. Upload de prints

- Múltiplos uploads ✅
- Storage `diagnosis-uploads` privado ✅
- Metadados em `diagnosis_uploads` ✅
- 9 categorias presentes (loja, cardápio, produto, avaliações, indicadores, promoções, concorrentes, faturamento, outro) ✅
- Vinculação a `session_id` ✅, a `store_id` só após `generateDiagnosis()` (linhas 159-162 de `generate.ts`)
- IA recebe os prints? **Não diretamente** — recebe `structured_data` extraído pelo `process-print`. O `extracted_text` bruto não é enviado pra `ai-consult`.
- Tratamento de erro no upload: toast existe ✅, mas se `process-print` falhar fica `pending` para sempre (Wizard aguarda em loop até `processed`).

**Problemas:**
- **[ALTO] Auto-classificação x classificação manual:** `process-print` auto-classifica e o usuário também pode alterar via dropdown, disparando reprocessamento. Se a IA reclassificar para diferente do que o user escolheu, sobrescreve. Race fácil.
- **[MÉDIO] Sem timeout/retry para uploads `pending`** — fica girando indefinidamente no Wizard.
- **[BAIXO] `extracted_text` nunca é enviado para `ai-consult`**, só `structured_data`. Perde-se contexto bruto que a IA poderia usar.

---

## 5. Formulário guiado

Etapas presentes em `steps.ts` (13 steps):
1. prints, 2. basic, 3. storefront, 4. menu, 5. products, 6. pricing, 7. combos, 8. delivery, 9. reviews, 10. competitors, 11. conversion, 12. loyalty, 13. final_questions, + goal

- Barra de progresso ✅ (`WizardShell`)
- Salvamento parcial ✅ (`useAutosave`)
- Continuar depois ✅ (`getDraftSession`)
- "Não sei" disponível em quase todas as selects ✅
- Opção "Enviar print" como step 1 ✅

**Problemas:**
- **[MÉDIO] Etapas esperadas no briefing vs. existentes:** o briefing pede "Meta desejada" como etapa 3, mas `goal` está depois. Pequeno ajuste de ordem.
- **[BAIXO] Step `goal` filtrado fora quando `mode=prints`** (`filterStepsByMode` lista apenas prints, basic, goal — ok), mas em `mode=form` o `goal` aparece corretamente. Ok.

---

## 6. Leitura da IA (`ai-consult`)

`ai-consult` recebe `{ storeId, sessionId? }`, e:
1. Carrega store + metrics + products + reviews + competitors + último report
2. Se `sessionId`: carrega `diagnosis_answers` + `diagnosis_uploads.structured_data`, gera evidências via `_shared/funnel-evidences.ts`
3. Mescla evidências (sessão + report anterior + regras de loja)
4. Carrega `store_memory`, `recommendation_history` (90d), busca casos similares + KB (RAG lexical degraded)
5. Chama Lovable AI Gateway com tool calling estrito (`consultive_diagnosis`)
6. Valida anti-alucinação (rule_id deve existir, source_ref válido)
7. Persiste `reports`, `recommendation_history`, `action_plans`
8. Dispara background: `update-store-memory`, `seed-cases-from-diagnosis`

Saída: **JSON estruturado** via tool call ✅ — não há risco de "texto solto".

**Problemas:**
- **[ALTO] `ai-consult` usa `google/gemini-2.5-pro` por padrão** — modelo caro/lento. Em `Report.tsx` e `StoreOverview.tsx` o usuário pode disparar muitas vezes. Considerar `gemini-2.5-flash` como default e `pro` opcional.
- **[ALTO] Falha silenciosa no Review:** `invokeAI("ai-consult").catch(() => {})` engole erros. Usuário não fica sabendo se a IA falhou.
- **[MÉDIO] `extracted_text` dos prints não é enviado** (item 4).
- **[MÉDIO] `goal` da sessão não chega à IA:** `evidencesFromSession` lê apenas `basic/storefront/menu/delivery/reviews/competitors`. A meta selecionada (`goal_type`, `target_value`) **não vira evidência nem entra no prompt**. A IA não sabe qual meta o lojista escolheu.
- **[BAIXO] `LOVABLE_API_KEY` ausente: erro 500.** Mensagem ok, mas frontend mostra toast genérico via `.catch(() => {})`.

---

## 7. Edge Functions

Existentes:
```
ai-consult, process-print, reanalyze-action, diagnose-problem-detail,
analyze-prospect, analyze-reviews, chat-gestor, embed-knowledge,
extract-case, generate-report-pdf, measure-outcomes, rate-diagnostic,
record-feedback, seed-cases-from-diagnosis, suggest-product-names,
update-store-memory, admin-create-user, admin-delete-user, admin-set-role
```

`ai-diagnose` foi removida (já saneado em sprint anterior).

**Problemas:**
- **[MÉDIO] `reanalyze-action` existe** mas precisa confirmar se `ActionDetail` está chamando corretamente e se a UI mostra resultado.
- **[BAIXO] Sem testes Deno automatizados** para `ai-consult` apesar da complexidade.

---

## 8. Tela de resultado (`DiagnosisResult`)

- Score geral ✅, scores por área ✅
- Lista de problemas (de `diagnostics`, regra local) ✅
- Aba "Visão geral" com oportunidades + ações ✅
- `lowDataMode` quando faltam dados ✅
- Detalhamento individual via `ProblemDetailSheet` ✅

**Problemas:**
- **[CRÍTICO] Não mostra a saída da `ai-consult`** (executive_summary, plan_7_days, plan_30_days, do_not_do_now, missing_data). Tudo isso fica isolado em `/stores/:id/report`. O usuário sai do funil sem ver o melhor da IA.
- **[ALTO] Score é recalculado client-side via `calculateScore`**, ignorando o `overall_score` que a IA retorna. Inconsistência possível.
- **[MÉDIO] Botão "Ver relatório completo"** funciona, mas sem indicação clara que o relatório IA está lá.
- **[BAIXO] Não mostra "riscos financeiros"** explicitamente como pede o briefing.

---

## 9. Ações recomendadas

`action_plans.status` — valores em uso: `pendente`, `em_andamento`, `feita`, `ignorada`. Falta `precisa_reavaliar`.

- ActionDetail tem botões para iniciar/concluir ✅
- Ao marcar como feito, abre Dialog com "o que mudou", `metrics_delta`, opcional novo upload ✅
- Atualizações vão pra `action_updates` ✅
- FK com `recommendation_history` ok via `recommendation_id`

**Problemas:**
- **[MÉDIO] Status `precisa_reavaliar` não existe** na UI.
- **[MÉDIO] Duplicação de tarefas** (vide §3): cada ciclo cria duas levas de actions (regra local + IA). Lista fica inflada e confusa.
- **[BAIXO] "Enviar print atualizado" no Dialog não está integrado a `diagnosis_uploads`** (verificar — pode estar só em campo solto).

---

## 10. Reanálise da IA

`reanalyze-action` existe + `ActionDetail` tem botão. Precisa verificar payload retornado e se "histórico de evolução" aparece em `StoreEvolution`.

**Problemas:**
- **[MÉDIO] `StoreEvolution` mostra `evolution_snapshots`** (score histórico) ✅, mas não mostra histórico de **decisões da IA** (recommendation_history.outcome).

---

## 11. Meta e evolução

- `store_goals` com 1 ativa por loja ✅
- `evolution_snapshots` diário ✅
- `StoreEvolution.tsx` mostra evolução ✅
- `StoreGoal.tsx` mostra progresso ✅

**Problemas:**
- **[ALTO] A meta escolhida não chega na IA** (vide §6). Sem isso, o "impacto na meta" prometido na reanálise é inviável.
- **[MÉDIO] Estimativa "caminho até a meta sem promessa garantida":** o prompt já proíbe promessas, ok, mas não há cálculo dedicado de progresso projetado.

---

## 12. Design e UX

- Welcome bonito ✅
- Wizard com progresso ✅
- Cards e badges consistentes ✅
- Dark theme + tokens semânticos (uso parcial — alguns componentes têm cores hard-coded `text-warning`/`text-success` ok, mas verificar)

**Problemas:**
- **[MÉDIO] Falta tela de loading dedicada** quando IA está processando.
- **[MÉDIO] Falta tela de escolha de modo** (vide §1).
- **[BAIXO] DiagnosisResult não diz "isso é parcial — veja o relatório completo da IA".**

---

# Tabela consolidada de problemas (por gravidade)

| # | Gravidade | Problema | Local | Causa | Correção |
|---|---|---|---|---|---|
| P1 | CRÍTICO | Resultado da IA invisível na tela de Result | `DiagnosisResult.tsx` + `Report.tsx` | Result lê só regra local | Buscar último `report.report_data.ai_consult` e exibir summary, plan_7/30, do_not_do_now |
| P2 | CRÍTICO | Falta unique index em `diagnosis_answers(session_id,step_key,question_key)` e `diagnosis_step_status(session_id,step_key)` | DB | Schema não declara | Migration: `CREATE UNIQUE INDEX` |
| P3 | ALTO | Duplicidade de relatórios e action_plans por ciclo | `generate.ts` + `ai-consult/index.ts` | Dois pipelines paralelos | Decidir: (a) regra local salva apenas evidências/diagnostics e IA salva report + actions; ou (b) marcar `source` claramente e filtrar na UI |
| P4 | ALTO | Não há tela de escolha "Prints / Formulário / Ambos" | `DiagnosisWelcome.tsx` | Não implementada | Adicionar 3 cards na Welcome → set `?mode=` |
| P5 | ALTO | Race no Review: navega antes da IA terminar | `DiagnosisReview.tsx` linhas 93-111 | `.catch(()=>{})` + navigate imediato | Aguardar IA com loading dedicado, ou tela intermediária `/loading` |
| P6 | ALTO | Falha silenciosa da IA | `DiagnosisReview.tsx` | `invokeAI(...).catch(()=>{})` | Tratar erro, mostrar toast e estado |
| P7 | ALTO | Meta (`goal`) não vira evidência | `_shared/funnel-evidences.ts` | Mapping incompleto | Adicionar `setIfEmpty(map,"goal",...)` e injetar `STORE_GOAL` no prompt do `ai-consult` |
| P8 | ALTO | `extracted_text` dos prints não é enviado à IA | `ai-consult/index.ts` | Só lê `structured_data` | Carregar `extracted_text` resumido (≤2000 chars/print) e injetar em RAW_CONTEXT |
| P9 | ALTO | Modelo IA caro como default | `ai-consult/index.ts` | `gemini-2.5-pro` | Trocar default para `gemini-2.5-flash` |
| P10 | MÉDIO | Sem tela de loading da IA | fluxo Review→Result | UX | Adicionar tela `/diagnosis/:id/processing` |
| P11 | MÉDIO | Auto-classificação sobrescreve escolha do user | `process-print` + `PrintUploader` | Não respeita `user_classified=true` | Marcar flag e impedir reprocesso |
| P12 | MÉDIO | Uploads `pending` ficam para sempre se falhar | `DiagnosisWizard` polling | Sem timeout | Marcar `failed` após N tentativas + permitir retry manual |
| P13 | MÉDIO | Status `precisa_reavaliar` ausente | `ActionDetail.tsx` | UI incompleta | Adicionar opção |
| P14 | MÉDIO | Score do Result ignora `ai_consult.overall_score` | `DiagnosisResult.tsx` | Recalcula local | Preferir score IA quando disponível |
| P15 | BAIXO | RLS de `knowledge_base`/`case_library` aberta a authenticated | DB | Intencional? | Confirmar |
| P16 | BAIXO | `Report.tsx` "Novo Diagnóstico" sem `storeId` | `Report.tsx` | Querystring faltando | Passar `?storeId=` |
| P17 | BAIXO | DiagnosisResult sem "riscos financeiros" e CTA p/ ações | `DiagnosisResult.tsx` | Faltam seções | Adicionar |

---

# Ordem ideal de correção (Fase 3 — sprints)

**Sprint Crítico (1 mensagem):** P2 (migration) → P1 + P3 (unificar pipeline e exibir IA no Result) → P5 + P6 + P10 (loading + erro IA).

**Sprint Alto (1 mensagem):** P4 (tela escolha modo) → P7 (meta na IA) → P8 (extracted_text) → P9 (trocar default model).

**Sprint Médio (1 mensagem):** P11, P12, P13, P14.

**Sprint Baixo:** P15 (revisar com você), P16, P17.

---

# Próximo passo

Quer que eu **execute a Fase 3 começando pelo Sprint Crítico** (P2 + P1 + P3 + P5 + P6 + P10)?  
Ou prefere começar por outra ordem (ex.: P4 primeiro, já que é o que você mencionou ser "requisito de fluxo")?

Aprove o plano e me diga qual sprint inicio. Não vou mexer em nada antes.
