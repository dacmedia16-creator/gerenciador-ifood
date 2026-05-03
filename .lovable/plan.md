
# Plano — Gestor IA: de diagnóstico para acompanhamento contínuo

## Diagnóstico do estado atual
- **`ai-diagnose` não existe mais no código** (só é citado no `README.md`). Todas as chamadas (`StoreOverview`, `Report`, `DiagnosisReview`) já usam `ai-consult` com `{ storeId, sessionId }`. Vou só limpar o README e reforçar tratamento de erro.
- `reports.report_data.ai_consult` já é gravado e lido em `Report.tsx` via `AIConsultReport`. Falta usar esses campos no Dashboard e simplificar a tela.
- Tabela `action_updates` já existe (com RLS por store + `metrics_delta` que dispara trigger em `store_goals`). Só falta UI para alimentá-la.
- `action_plans` já tem `priority/impact/effort/why_it_matters/how_to_apply/how_to_measure/due_date` — temos tudo para o card "Faça isso primeiro" sem migration.
- Onboarding hoje vai para `OnboardingWizard` que cria loja e roda regras — falta um "próximo passo" claro (prints → perguntas → objetivo → diagnóstico).

## Entregas

### 1. Limpeza de IA (Prioridade 1)
- Atualizar `README.md` removendo referência a `ai-diagnose`.
- Reforçar `src/lib/ai/invokeAI.ts`: já trata 429/402; adicionar fallback amigável para timeout/network ("A consultoria demorou demais — tente em alguns minutos") e log silencioso.
- Padronizar payload em **todos** os pontos: `{ storeId, sessionId?, mode?: "full" | "quick", model?: string }`. Hoje só passamos `storeId/sessionId`. Adicionar `mode: "full"` por padrão e permitir `quick` no botão do dashboard.

### 2. Bloco "Faça isso primeiro" no Dashboard
Novo componente `src/components/dashboard/DoFirstBlock.tsx` exibido logo após o card de score, antes dos atalhos.

- Query: `action_plans` da loja onde `status in ('pendente','em_andamento')`.
- Ordenação: `priority='alta'` desc → `impact='alto'` → `effort='baixo'`.
- Mostrar **top 3** em cards verticais com:
  - título, badge de área, badge de prioridade
  - **Por que importa** (`why_it_matters`)
  - **Como aplicar** (`how_to_apply`, truncado em 2 linhas + "ver detalhes")
  - **Como medir** (`how_to_measure`)
  - **Prazo** (`due_date`)
  - Botão **"Começar"** → marca `status='em_andamento'` + `started_at=now()` e abre `ActionDetail`.
  - Botão **"Marcar como aplicada"** → abre o mesmo modal de outcome do `ActionPlan.tsx`, mas estendido para perguntar dados de reavaliação (ver item 4).
- Empty state: "Você não tem ações pendentes — rode um novo diagnóstico para descobrir o próximo passo."

### 3. Reorganizar tela de Diagnóstico/Relatório
Refatorar `Report.tsx` para usar `reports.report_data.ai_consult` como **fonte primária** (cair no engine local só se IA não rodou ainda).

Nova estrutura sequencial (substitui o bloco de seções avulsas):
1. **Resumo executivo** — `ai_consult.executive_summary`
2. **Problemas principais** — `ai_consult.main_problems[]` (já existe no AIConsultReport)
3. **Evidências** — para cada problema, listar `evidence_refs` / dados do funil que sustentam
4. **Ações recomendadas** — `ai_consult.recommendations[]` priorizadas
5. **Plano de 7 dias** — `report_data.seven_day_plan` (já temos)
6. **Plano de 30 dias** — gerar a partir de `ai_consult.recommendations` agrupadas em semanas (campo novo opcional na função `ai-consult`; se não vier, montar no client agrupando recomendações por prioridade em 4 semanas)
7. **Dados que faltam** — `ai_consult.missing_data[]` (campo novo: lista o que o dono precisa enviar para IA melhorar — ex: "envie print de Promoções", "informe ticket dos últimos 7 dias")

Atualizar `supabase/functions/ai-consult/index.ts` para gerar `thirty_day_plan` e `missing_data` no schema do tool-call, mantendo compatibilidade com payload antigo.

### 4. Fluxo de reavaliação
Estender o modal existente em `ActionPlan.tsx` (e reaproveitar no Dashboard) quando `status='aplicada'`:

Perguntas:
- **O que foi feito?** (textarea — `what_changed`)
- **Quando foi feito?** (date — derivar `created_at`)
- **Percebeu melhora?** (positivo/neutro/negativo — `outcome`)
- **Qual métrica mudou?** (select: receita, pedidos, ticket, nota, tempo, cancelamento) + **valor novo** (number) → grava em `action_updates.metrics_delta` como `{ [metric_key]: value }`. Trigger `apply_action_update_to_goals` já propaga para `store_goals` automaticamente.
- Checkbox "Vou enviar print novo" → `has_new_print=true` (e abre uploader).

Após salvar:
- Chama `record-feedback` (já existe) para fechar ciclo de aprendizado.
- Mostra CTA **"Reavaliar minha loja"** que chama `ai-consult` com `{ storeId, mode: "full" }` e leva para `/app/stores/:id/report`.

### 5. Linguagem de dono
Sweep de strings substituindo jargões. Tabela:

| Antes | Depois |
|---|---|
| "Score geral" | "Sua nota geral" |
| "Diagnóstico" (botão) | "Analisar minha loja" |
| "Plano de melhoria" | "O que fazer para crescer" |
| "Score de oportunidade comercial" | "Quanto dinheiro tem na mesa" |
| "KPIs" | "Números da loja" |
| "Conversão" | "De cada 100 que entram, quantos compram" |

Aplicar em `Dashboard.tsx`, `Report.tsx`, `ActionPlan.tsx`, `Diagnostics.tsx`, `AIConsultReport.tsx`.

Regra: toda recomendação deve terminar com impacto estimado em **R$/pedido/nota/min/%margem** — adicionar campo `expected_impact_label` no schema do `ai-consult` e exibir como badge.

### 6. Primeira experiência
Modificar `OnboardingWizard.tsx` para, após criar a loja, **não cair no Dashboard vazio**. Em vez disso navegar direto para uma nova rota `/app/stores/:id/start` (componente `FirstRunFlow.tsx`) com 4 passos lineares:

1. **Envie prints** — uploader do `PrintUploader` existente.
2. **Responda 4 perguntas rápidas** — categoria, ticket atual, principal queixa, faturamento alvo (cria sessão em `diagnosis_sessions`).
3. **Escolha seu objetivo** — opções: "Vender mais", "Aumentar margem", "Melhorar nota", "Reduzir cancelamento" → grava em `store_goals` (já existe tabela).
4. **Gerar diagnóstico** — chama `ai-consult` e leva para `/app/stores/:id/report`.

Cada passo tem skip "Fazer depois" para não travar.

## Arquivos afetados

- `README.md` — remover menção a `ai-diagnose`.
- `src/lib/ai/invokeAI.ts` — tratamento de timeout.
- `src/components/dashboard/DoFirstBlock.tsx` (novo).
- `src/pages/app/Dashboard.tsx` — encaixar bloco + linguagem.
- `src/pages/app/Report.tsx` — nova ordem de seções, usar `ai_consult` como fonte.
- `src/components/report/AIConsultReport.tsx` — render `missing_data` e `thirty_day_plan`.
- `src/pages/app/ActionPlan.tsx` — modal estendido com perguntas de reavaliação + `action_updates`.
- `src/components/dashboard/ReassessButton.tsx` (novo) — chama `ai-consult` e navega.
- `src/components/onboarding/FirstRunFlow.tsx` (novo) + rota em `App.tsx`.
- `src/components/onboarding/OnboardingWizard.tsx` — redirecionar para FirstRun em vez de Dashboard.
- `supabase/functions/ai-consult/index.ts` — adicionar `thirty_day_plan`, `missing_data`, `expected_impact_label` no schema (campos opcionais, retrocompatível).

## Fora do escopo (pode virar fase 2)
- Notificações automáticas quando métrica não melhora em N dias.
- Comparativo "antes vs depois" automático no relatório.
- Onboarding mobile específico.

## Riscos
- Mudar schema do `ai-consult` quebra relatórios antigos no histórico → mantemos campos opcionais e fallback no render.
- `metrics_delta` precisa estar com chave igual a `store_goals.metric_key` para o trigger funcionar — vou validar a lista de chaves no client.
