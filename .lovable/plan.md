## Objetivo

Substituir a estrutura atual de **18 etapas / ~120 perguntas técnicas** por **9 etapas / ~55 perguntas em linguagem do dono da loja**, com faixas, "Não sei", condicionais e tooltips de "onde encontro no iFood".

## Princípio de compatibilidade

`src/lib/diagnosis/rules.ts`, `evidences.ts` e `journey.ts` leem respostas por `answers.<step_key>.<question_key>` (ex.: `answers.basic.average_ticket`, `answers.delivery.cancellation_rate`). Para **não quebrar o motor de diagnóstico**:

- Mantemos as **mesmas chaves internas** (`step_key` + `question_key`) sempre que possível.
- Mudamos apenas: **labels, tipos de campo, tooltips, agrupamento visual e perguntas removidas**.
- Quando uma pergunta vira "faixa" (select), as regras que esperam número ganham um helper `rangeToNumber()` para converter (ex.: "30–49" → 40).

Diagnósticos antigos continuam funcionando porque o JSON de respostas mantém as chaves.

## Nova estrutura (9 etapas)

```text
1. Sobre a loja            (basic)        — nome, categoria, plataforma, cidade, ticket/pedidos em FAIXAS
2. Horários e capacidade   (operations)   — horário, fecha em pico, pedidos/h, quem entrega
3. Vendas e reputação      (performance)  — nota, pausas, ruptura de estoque (faixas)
4. Cardápio e fotos        (menu)         — fotos top 5, organização, adicionais (funde menu+photos)
5. Preço e margem          (pricing)      — top 3 simplificado (3 linhas), preço vs concorrente
6. Combos e ticket         (combos)       — combos prontos, sugestões, tamanhos
7. Entrega e qualidade     (delivery)     — tempo prometido, atraso, embalagem térmica, motivos cancel
8. Avaliações e problemas  (reviews)      — reclamações por checkbox, item problemático
9. Promoções, ads e fidelização (growth)  — promoções, ads (objetivo), recompra (funde promotions+ads+loyalty)
```

Cortes: **welcome, conversion, products (tabela), competitors (tabela), demand, final_questions, uploads** — viram seções condicionais ou somem.

## Mudanças de UX

- **Faixas em vez de números exatos** para ticket, pedidos/mês, nota, tempo.
- **Sempre opção "Não sei"** em selects.
- **Condicionais**: pergunta de motivo de atraso só aparece se respondeu que atrasa; custo só se "sei o custo"; ROI/objetivo só se "anuncia".
- **Tooltips** com "Onde achar no iFood" (Portal Parceiro > Desempenho / Avaliações / Cardápio / Minha Loja).
- **Top 3 produtos** em mini-tabela (3 linhas: nome, preço, custo opcional) em vez da tabela completa de 9 colunas.
- **Sem tabela de concorrentes** — vira pergunta única "seu preço vs concorrentes" (mais barato/igual/mais caro/não sei).
- Microcopy no welcome: "Leva ~10 minutos. Pode pular o que não souber. Salvamos automaticamente."

## Arquivos

- **Reescrever:** `src/lib/diagnosis/steps.ts` — nova lista `STEPS` com 9 etapas, novos labels/tipos/tooltips, mantendo chaves internas.
- **Editar:** `src/lib/diagnosis/rules.ts` — adicionar `rangeToNumber()` e aplicar onde regras esperam número exato (ticket, nota, pedidos, tempo, cancelamento).
- **Editar:** `src/lib/diagnosis/evidences.ts` e `journey.ts` — mesmo helper de faixa para campos numéricos.
- **Editar:** `src/components/diagnosis/QuestionField.tsx` — adicionar suporte a novo tipo `range` (select de faixas) + checkbox múltipla (`multiselect`).
- **Editar:** `src/lib/diagnosis/steps.ts` (tipos) — adicionar `multiselect` e `range` em `FieldType`, e flag `condition?: { key: string; equals?: any; in?: any[] }` para perguntas condicionais.
- **Editar:** `src/pages/app/diagnosis/DiagnosisWizard.tsx` — filtrar perguntas pela `condition` antes de renderizar.
- **Editar:** `src/pages/app/diagnosis/DiagnosisReview.tsx` e `WizardShell.tsx` — nada a fazer (já leem `STEPS` dinamicamente).

## Migração de dados

Diagnósticos em andamento mantêm as respostas (chaves preservadas). Se um usuário já completou etapas removidas (ex.: `competitors` tabela), o dado fica salvo em `diagnosis_answers` mas não é mais editável — o motor ainda usa via `evidences.ts`. Sem migração SQL necessária.

## Resultado esperado

- Tempo de preenchimento: **15 min → 8 min**.
- Abandono esperado: queda significativa (faixas + condicionais + sem tabelas).
- Diagnóstico: igual ou melhor (perguntas novas de capacidade/ruptura/embalagem cobrem causas raiz que faltavam).
