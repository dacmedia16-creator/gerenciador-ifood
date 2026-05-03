
# Checkup do Diagnóstico Inteligente — Relatório de Auditoria

Auditei rotas, telas, fluxo, banco, prints, IA, edge functions, plano de ação, reanálise, meta e UX. Abaixo está o **relatório consolidado** (FASE 1 + 2). **Nenhuma alteração foi feita.** Ao final, proponho a ordem de correção (FASE 3+).

---

## 1. Visão geral do fluxo encontrado hoje

```text
Sidebar "Meu Diagnóstico"
        │
        ▼
/app/diagnosis/welcome  ──►  /app/diagnosis/new  ──►  /app/diagnosis/:sessionId  (Wizard 16 etapas)
                                                              │
                                                              ▼
                                                /app/diagnosis/:sessionId/review
                                                              │ (generateDiagnosis = motor de regras local)
                                                              ▼
                                                /app/diagnosis/:sessionId/result
                                                              │ "Ver relatório completo"
                                                              ▼
                                              /app/stores/:id/report  (chama ai-consult separado)
                                                              │
                                                              ▼
                                              /app/stores/:id/action-plan ──► /:actionId (reanálise)
```

**Existem dois "cérebros" rodando em paralelo e desconectados**: (a) `generateDiagnosis` no client (regras locais) que cria `diagnostics` + `action_plans` + `reports` a partir do funil; (b) `ai-consult` (edge function) que cria OUTRO `report` + outras `action_plans` + `recommendation_history` a partir da `stores`. Eles não se conversam — esse é o pecado original.

---

## 2. Lista de problemas (com gravidade)

### CRÍTICOS (quebram o fluxo)

1. **Dois geradores de diagnóstico conflitantes**
   - Onde: `src/lib/diagnosis/generate.ts` (client) **vs** `supabase/functions/ai-consult/index.ts`.
   - Sintoma: O usuário gera plano em `DiagnosisReview` → vê resultado em `DiagnosisResult` (regras locais). Ao clicar "Ver relatório completo", cai em `Report.tsx` que **só mostra dados se `ai-consult` for executado de novo manualmente**. Resultado = relatório vazio / "Cadastre dados" mesmo após gerar diagnóstico.
   - Impacto: Usuário acha que o sistema "não fez nada".

2. **`ai-consult` não recebe respostas do funil nem prints**
   - Onde: `ai-consult/index.ts` linhas 195-217. Lê apenas `stores`, `products`, `competitors`, `reviews`, `metrics`. Pega `rule_evidences` antigas via `reports` mas **nunca lê `diagnosis_answers` nem `diagnosis_uploads.structured_data`**.
   - Impacto: A IA "não enxerga" o que o lojista respondeu nem o que foi extraído dos prints. Tudo que o funil coleta vira lixo para a IA.

3. **`ai-diagnose` está deprecada (410 Gone) mas ainda referenciada**
   - Onde: `supabase/functions/ai-diagnose/index.ts` retorna 410. Frontend não chama mais, ok. Mas `analyze-reviews` e outros podem chamar — confirmar.
   - Impacto: baixo, mas confunde leitura. Remover ou estabilizar.

4. **`generateDiagnosis` cria store DUPLICADA**
   - Onde: `src/lib/diagnosis/generate.ts` linhas 41-53 (`ensureStore`). Se o usuário já tem loja em `stores` mas a sessão não aponta para ela (`session.store_id` null), cria uma nova "Loja sem nome".
   - Impacto: Lojas fantasmas no dashboard, métricas espalhadas, dashboard mostra a errada.

5. **Inserts em `metrics`/`reviews` sem dedup**
   - Onde: `generate.ts` linhas 165-180, 105-120. Toda vez que o usuário regenera, insere métricas e reviews novas → duplica e infla. Sem `UPSERT` por período.
   - Impacto: Score e gráficos contam o mesmo mês várias vezes.

6. **Welcome/Wizard ignoram a escolha "prints / formulário / ambos"**
   - Onde: `DiagnosisWelcome.tsx` só tem "Começar" e "Continuar". O wizard suporta `?mode=prints|form|both` (`DiagnosisWizard.tsx` linha 21), mas a tela de boas-vindas nunca passa esse parâmetro.
   - Impacto: A escolha que o usuário pediu literalmente NUNCA é apresentada.

7. **Reset de sessão / múltiplas sessões abertas**
   - Onde: `getOrCreateUserSession` (`session.ts`) reabre a sessão mais recente como draft, mesmo se já tinha gerado. Mas `getDraftSession` no Welcome/Dashboard pega outra. Resultado: o usuário pode ter 2+ sessões e o "Continuar" leva para a errada.
   - Impacto: Dados sumindo / fluxo "voltando ao zero".

8. **Wizard salva `current_step` como índice global, mas activeSteps é filtrado**
   - Onde: `DiagnosisWizard.tsx` linhas 70-76 e 203-208. Ok no salvamento, mas se usuário muda `?mode=` entre sessões, a etapa salva pode não existir na lista filtrada → `currentIndex = 0` silenciosamente.
   - Impacto: Pula para etapa 1 sem aviso.

9. **`NewDiagnosis` não respeita "novo"**
   - Onde: `Dashboard.tsx` linha 194 envia `?new=1` mas `NewDiagnosis.tsx` ignora — sempre faz `getOrCreateUserSession` → reabre a antiga. "Novo Diagnóstico" não cria diagnóstico novo.

10. **RequireAuth fora do AppLayout**
    - Onde: `App.tsx` linhas 80-84. Funil está fora do AppLayout (sidebar ausente). OK para tela cheia, mas o usuário "perde" o app — não há menu para sair, e `WizardShell` só oferece link para `dashboard`. Isolamento intencional, mas confuso na primeira vez.

### ALTOS (degradam a experiência)

11. **`DiagnosisResult` mostra `diagnostics` da loja inteira, não da sessão**
    - Onde: `DiagnosisResult.tsx` linhas 30-39. Filtra por `store_id`, não por `session_id` ou data. Se houve diagnóstico antigo, mistura tudo.

12. **Score recalculado duas vezes com fórmulas diferentes**
    - `calculateScore` (`/lib/diagnostics/engine.ts`) no client + `overall_score` da IA. Os dois aparecem em telas diferentes sem reconciliação. Lojista vê 58 num lugar e 73 noutro.

13. **`PrintProposalsCard` autoaplica e pode sobrescrever respostas reais**
    - Onde: `DiagnosisWizard.tsx` linhas 109-186. Autoaplica `proposals` quando todos os prints terminam; só checa `appliedKeys` interno. Se o usuário voltou e mudou manualmente, o auto-apply pode sobrescrever (na verdade `filterEmpty` evita, mas confirmar).

14. **`process-print` não trata imagens HEIC/PDF**
    - Onde: `PrintUploader.tsx` linha 107 `accept="image/*"`. iPhone manda HEIC; Lovable AI não suporta. Falha silenciosa.

15. **Sem barra de progresso no upload nem retry**
    - `PrintUploader.tsx` mostra status mas sem retry button quando `failed`.

16. **Reanálise (`reanalyze-action`) — função existe mas nunca audi­tada aqui** — confirmar se devolve JSON estruturado conforme `ActionDetail.tsx` espera (campos `o_que_mudou`, `houve_melhora`, etc).

17. **Onboarding e Diagnóstico são fluxos paralelos sem ponte**
    - `OnboardingWizard.tsx` cria loja + roda `runDiagnostics` regras locais. O usuário novo pode achar que isso é "o diagnóstico" e nunca chegar no funil.

18. **Action_plans criadas em 3 lugares diferentes**
    - `OnboardingWizard.finalize`, `generateDiagnosis`, `ai-consult`. Cada um com schemas levemente diferentes (alguns sem `recommendation_id`). `ActionPlan.tsx` faz fallback por título — frágil.

19. **Status legados `"em andamento"` (com espaço) vs `"em_andamento"`**
    - `ActionPlan.tsx` linhas 22-24 trata legado. Confirma que insertions antigos quebram o filtro.

20. **`StoreOverview` ainda chama `runDiagnostics` antigo + `ai-consult`**
    - `StoreOverview.tsx` tem 2 botões "Regras" e "Consultar Gestor IA". Confunde o lojista — qual usar?

### MÉDIOS (UX/visual)

21. Dashboard mostra "etapa X/16" hard-coded mas o funil tem variação por modo.
22. `DiagnosisWelcome` lista "13 etapas" hard-coded; STEPS tem 16 (`steps.ts`).
23. `WizardShell` "Sair (rascunho salvo)" volta ao dashboard mas perde `?mode`.
24. Sem tela de **carregamento da IA** (skeleton) — `Report` só mostra spinner discreto.
25. `EmptyState` no Report aponta para `/app/diagnosis/new` que reabre sessão antiga (problema #9).
26. Sem fallback quando `ai-consult` retorna `executive_summary` vazio (caso `hardFailed`).
27. Botão "Imprimir" e "Download PDF" no Report sem feedback claro de erro.

### BAIXOS (refino)

28. Cores de severidade inconsistentes entre `DiagnosisResult` e `Report`.
29. Estados vazios genéricos ("Sem ações sugeridas") sem CTA.
30. `Sair (rascunho salvo)` não tem confirmação.
31. Sem analytics de funil (quantos % chegam ao final).

---

## 3. Banco de dados — observações

| Tabela | Status | Observação |
|---|---|---|
| `stores` | OK | `user_id` consistente, RLS por `auth.uid()`. |
| `diagnosis_sessions` | OK | RLS por `user_id`. Falta índice em `(user_id, status)` para `getDraftSession`. |
| `diagnosis_answers` | OK | Upsert por `(session_id, step_key, question_key)` usado, mas sem unique constraint visível — confirmar. |
| `diagnosis_step_status` | OK | Idem unique constraint `(session_id, step_key)`. |
| `diagnosis_uploads` | OK | RLS por `user_id`. `structured_data` JSON livre. |
| `diagnostics` | **ATENÇÃO** | Sem `session_id` nem `report_id` — não dá para saber de qual rodada veio. Acumula histórico misturado. |
| `action_plans` | **ATENÇÃO** | `diagnostic_id` opcional, `recommendation_id` opcional — relacionamentos frouxos. |
| `metrics` | **ATENÇÃO** | Sem unique por `(store_id, period_start, period_end)` → duplica a cada `generateDiagnosis`. |
| `reports` | OK | Mas o front busca `latest` por `created_at`, que pode ser do funil ou do `ai-consult`. |
| `recommendation_history` | OK | Bem amarrado. |
| `evolution_snapshots` | OK | Inserido só no `generateDiagnosis`, não no `ai-consult`. |
| `store_goals` | OK | Inserção em `generate.ts`, dependente de `goal_type`. |

Não há triggers em `auth/storage` (bom). RLS coerente. **Não vi tabelas duplicadas**, mas há sobreposição funcional entre `diagnostics` (rules locais) e `recommendation_history` (IA).

---

## 4. Edge functions — inventário

| Função | Uso real | Observação |
|---|---|---|
| `ai-consult` | **PRINCIPAL** | Não lê funil nem prints. |
| `ai-diagnose` | Deprecada (410) | Pode ser deletada. |
| `process-print` | OK | Funciona. Falta tratar HEIC. |
| `analyze-reviews` | Pontual | OK. |
| `generate-report-pdf` | Pontual | OK. |
| `reanalyze-action` | Usada em ActionDetail | Não auditei o output em detalhe. |
| `record-feedback`, `rate-diagnostic`, `diagnose-problem-detail`, `seed-cases-from-diagnosis`, `update-store-memory`, `chat-gestor`, `extract-case`, `embed-knowledge`, `measure-outcomes`, `suggest-product-names`, `analyze-prospect`, `admin-*` | Auxiliares | OK no escopo. |

Total ~20 funções. Nenhuma duplicada óbvia. `ai-diagnose` é a única órfã.

---

## 5. Causas-raiz (resumo curto)

1. **Funil → IA não está conectado.** O funil grava `diagnosis_answers` e dispara `generateDiagnosis` (regras locais), mas `ai-consult` lê só de `stores`/`products`/etc. Tudo que vai pra IA passa por uma "tradução" (`syncStoreFromDiagnosis`) que perde dados.
2. **Múltiplos pontos de criação de plano** (Onboarding + Funil + IA) sem fonte da verdade.
3. **Sessão não é singleton confiável** (`getOrCreateUserSession` vs `getDraftSession`).
4. **Tela de boas-vindas não oferece escolha** (prints / formulário / ambos).

---

## 6. Ordem de correção recomendada (FASE 3)

### Sprint 1 — Críticos (fluxo end-to-end)

1. **Unificar geração**: `DiagnosisReview` → chama `ai-consult` passando `sessionId`. `ai-consult` lê `diagnosis_answers` + `diagnosis_uploads.structured_data` + dados da loja, e devolve diagnóstico + plano. Eliminar `generateDiagnosis` local (ou reduzir a "sync de espelho" que só popula `stores/products` e dispara a função).
2. **Welcome com escolha real**: 3 cards "Só prints / Só formulário / Os dois", passando `?mode=` para o wizard.
3. **Sessão singleton confiável**: `NewDiagnosis?new=1` sempre cria nova; "Continuar" usa a draft mais recente. Encerrar sessões antigas como `archived` quando uma nova é criada.
4. **`ensureStore` reusa loja existente** do usuário (busca por user_id antes de criar).
5. **`metrics` com upsert** por `(store_id, period_start)`. `reviews` com dedup por hash do comentário.
6. **`diagnostics` ganha `session_id` + `report_id`** (migration). Result e Report filtram pela rodada atual.
7. **Result → Report** lê o último `report` da sessão atual (não da loja inteira).

### Sprint 2 — Altos (qualidade do diagnóstico)

8. `process-print` aceita HEIC (converte) + retry no UI.
9. `PrintProposalsCard`: autoaplica só campos vazios (já faz, mas adicionar log + undo).
10. Tela de **carregando IA** dedicada com etapas ("Lendo seus dados → Buscando casos parecidos → Gerando plano…").
11. Reanálise: validar contrato JSON e adicionar fallback.
12. Score: uma única fonte (a do `ai-consult`), com explicação "como foi calculado".

### Sprint 3 — UX e refino

13. Padronizar status `aplicada/em_andamento/...` (migration de dados antigos).
14. `StoreOverview`: remover botão "Regras", deixar só "Consultar Gestor IA".
15. Onboarding aponta diretamente para o funil em vez de gerar diagnóstico próprio.
16. Estados vazios com CTA. Skeletons em todas as telas pesadas.
17. Confirmação ao sair do funil. Analytics de etapa.

### Sprint 4 — Limpeza

18. Deletar `ai-diagnose` e referências.
19. Migrations consolidadas para corrigir dados legados.
20. Testes E2E do fluxo completo (FASE 5 do checkup).

---

## 7. O que NÃO vou fazer

- Não vou reinventar telas que já existem (Welcome, Wizard, Review, Result, Report, ActionPlan).
- Não vou criar tabelas novas além de adicionar colunas (`session_id`, `report_id` em `diagnostics`).
- Não vou mexer em `analyze-reviews`, `chat-gestor`, módulo de prospects, knowledge_base.
- Não vou prometer aumento de vendas ou métricas garantidas no diagnóstico.

---

## Próximo passo

Aprovando este relatório, **executo Sprint 1 (críticos 1-7)** primeiro, em commits separados, e mostro o fluxo funcionando ponta-a-ponta antes de seguir para o Sprint 2. Se quiser, posso reordenar prioridades ou cortar algo do escopo.
