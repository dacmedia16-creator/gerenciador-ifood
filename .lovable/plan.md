## Tela de Revisão Pré-Geração — Enriquecimento

A rota `/app/diagnosis/:sessionId/review` já existe, mas hoje só mostra o status percentual de cada etapa. Vamos transformá-la em uma revisão completa: respostas dadas, evidências calculadas e pontos críticos detectados — tudo antes de o dono da loja confirmar a geração do plano.

### O que será exibido

1. **Cabeçalho de prontidão**
   - Score de completude geral (% das 10 etapas)
   - Contagem: respostas preenchidas / pontos críticos / atenções / dados faltantes
   - Botão "Voltar ao funil" e "Gerar plano de ação"

2. **Pontos críticos detectados** (topo, destaque vermelho)
   - Lista das evidências com `severity = "critico"` calculadas em tempo real por `evidencesFromAnswers()`
   - Cada card: área, métrica atual vs. referência, impacto no negócio, ação recomendada
   - Ex.: "Tempo de entrega 45 min (ref ≤35) — cliente desiste no checkout"

3. **Pontos de atenção** (amarelo, recolhível)
   - Mesmo formato, severity = "atencao"

4. **Dados faltantes que reduzem precisão** (cinza)
   - Agregado de `missing_data` das evidências + `missing_required_fields` dos status
   - Cada item com link "Preencher agora" → volta para a etapa correspondente

5. **Suas respostas, etapa por etapa** (accordion, uma seção por step)
   - Para cada etapa: ícone de status, % completo, lista "Pergunta → Resposta"
   - Respostas formatadas: ranges legíveis ("R$ 30–49"), arrays virando vírgula, tabelas (produtos, concorrentes) renderizadas como mini-tabela
   - Botão "Editar etapa" em cada bloco

6. **CTA final**
   - Card "Pronto para gerar" com resumo (X críticos, Y atenções, Z etapas pendentes)
   - Aviso quando há etapa essencial vazia: "Você pode gerar mesmo assim, mas o plano será mais genérico"

### Mudanças técnicas

- **`src/pages/app/diagnosis/DiagnosisReview.tsx`** (rewrite)
  - Carregar `session + answers + statuses` via `loadSession()`
  - Construir `answersByStep` com `answersAsMap()`
  - Rodar `evidencesFromAnswers(answersByStep)` localmente para gerar críticos/atenções/dados faltantes (sem precisar chamar a IA)
  - Renderizar 5 blocos descritos acima usando `Card`, `Badge`, `Accordion` (shadcn) e `Separator`
  - Link "Editar etapa" usa `?step=N` que o wizard já lê

- **`src/components/diagnosis/ReviewAnswerList.tsx`** (novo, ~80 linhas)
  - Helper de apresentação que recebe `step` (de `STEPS`) + `values` e formata cada `Question`:
    - `range/select`: mostra o `label` da opção (não o value bruto)
    - `multiselect`: junta labels com vírgula
    - `boolean/radio`: "Sim/Não"
    - `table`: mini-`<table>` com colunas das `Question.columns`
    - vazio: cinza "—"

- **`src/components/diagnosis/EvidenceCard.tsx`** (novo, ~40 linhas)
  - Recebe uma `RuleEvidence` e renderiza card compacto com cores por severidade

### Sem mudanças necessárias

- `evidences.ts`, `rules.ts`, `session.ts`, `steps.ts`: já fornecem tudo
- Roteamento: rota já existe em `App.tsx` e `DiagnosisWizard` já redireciona pra ela ao terminar
- Backend: revisão é 100% client-side; a geração só acontece quando o usuário clica no CTA (fluxo atual mantido)

### Resultado

O dono da loja chega na revisão e vê, antes de gerar o relatório:
- Tudo que já respondeu (em linguagem dele)
- O que o sistema já consegue afirmar como problema crítico
- O que falta preencher para o diagnóstico ficar mais preciso
- E só então confirma a geração do plano de ação.