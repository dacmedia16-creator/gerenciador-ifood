## Reformular tela de Resultado do Diagnóstico

Vou refatorar `src/pages/app/diagnosis/DiagnosisResult.tsx` (e ajustar o prompt do `ai-consult`) para resolver os 7 problemas apontados. A arquitetura geral (score → análise → plano 7d → plano 30d → não fazer → problemas) é mantida; o que muda é a forma de apresentação e a profundidade dos textos gerados pela IA.

### 1. Score com contexto (Problema 1)

Substituir o bloco "Score geral 62" por um card com 3 elementos:
- Score grande + "/100" + delta vs. último diagnóstico (`reports` ordenados por data → diferença de `general_score`).
- Linha de benchmark: "Abaixo da média de [categoria] (74 pontos)" — usar média fixa por categoria como baseline inicial (tabela simples em `src/lib/benchmarks.ts`, com fallback "média geral 70").
- Tradução em dinheiro: somar `money_leaks[].monthly_estimate_brl` do `aiConsult` → "Você está deixando ~R$ X/mês na mesa".

### 2. Score por área agrupado por impacto (Problema 2)

Substituir a grade de 8 áreas por 3 grupos visuais (vermelho/amarelo/verde), ordenados por impacto financeiro quando disponível:
- 🔴 RESOLVER AGORA: áreas com score < 50 OU presentes em `money_leaks` com estimativa > 0. Mostrar "custa ~R$ X/mês" ao lado.
- 🟡 MELHORAR EM BREVE: score 50–69.
- 🟢 ESTÁ BEM — MANTER: score ≥ 70.

Mapear nome da área → entrada de `money_leaks` por keyword matching (entrega→"Entrega/tempo", cardápio→"Cardápio", etc.).

### 3. Card de melhoria de diagnóstico no topo (Problema 7)

Mover `missing_data_for_better_diagnosis` do rodapé para um card destacado logo abaixo do score, com CTA "Adicionar mais dados →" linkando para `/app/diagnosis/${sessionId}` (review). Só aparece se houver itens faltantes.

### 4. Análise inteligente em tom de consultor (Problema 3)

Atualizar o prompt de `supabase/functions/ai-consult/index.ts` para que `executive_summary`:
- Comece com o número de prejuízo estimado na primeira linha.
- Explique a conta (pedidos × ticket × % perda).
- Aponte a causa-raiz única.
- Termine com uma frase imperativa ("Resolva isso primeiro. O resto vem depois.").
- Linguagem de WhatsApp, frases curtas, sem jargão corporativo. Máximo ~6 linhas.

Renderizar com `whitespace-pre-wrap` (já está) e fonte um pouco maior.

### 5. Plano 7 dias com passo-a-passo (Problema 4)

Estender o schema da tool `consultive_diagnosis` em `plan_7_days[]`:
- `steps: string[]` (3 passos numerados, cada um começa com verbo no imperativo e cita onde clicar — ex: "iFood Parceiros → Relatórios → Pedidos Cancelados").
- `time_minutes: number`
- `expected_impact: string` (1 frase com R$ ou %).

Atualizar o prompt para exigir esse nível de detalhe (referenciar painel iFood/Rappi conforme `store.platform`). Renderizar como lista numerada + linhas "Tempo: X min" / "Impacto esperado: …".

### 6. Plano 30 dias enxuto e ordenado (Problema 5)

No prompt:
- Semana 1 sempre = continuação/conclusão do plano de 7 dias (não introduz tema novo).
- Semanas 2 e 3 = 1 objetivo + no máximo 2 ações cada.
- Semana 4 = sempre "medir resultado" (comparar KPI da semana 1 com KPI atual).

Adicionar campos `objective: string` e `actions: string[]` (max 2). Renderizar com objetivo em destaque e bullets curtos.

### 7. Rodapé com 1 CTA primário (Problema 6)

Substituir os 6 botões por:
- 1 botão grande primário: "Ir para o Plano de Ação" → `/app/stores/${id}/action-plan`.
- 2 links secundários discretos abaixo: "Ver relatório completo" e "Voltar ao dashboard".

Os outros 3 destinos (meta, evolução, ir para a loja) continuam acessíveis via sidebar/StoreOverview, então podem sair desta tela.

### Arquivos afetados

- `src/pages/app/diagnosis/DiagnosisResult.tsx` — refatoração principal.
- `src/lib/benchmarks.ts` — novo, mapa categoria → score médio + ticket médio (valores iniciais conservadores).
- `supabase/functions/ai-consult/index.ts` — atualizar `SYSTEM_PROMPT`, schema (`plan_7_days.steps/time_minutes/expected_impact`, `plan_30_days.objective/actions`).
- Possível ajuste em `src/components/report/AIConsultReport.tsx` para refletir os novos campos no relatório completo (mantendo backwards compat: campos antigos continuam sendo lidos como fallback).

### Compatibilidade

Diagnósticos antigos sem os novos campos continuam exibindo o formato anterior (fallback por `?.` e checagem de array). Nenhuma migração de dados é necessária.
