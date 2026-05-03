## Aplicar dados extraídos dos prints no funil de diagnóstico

Conectar `diagnosis_uploads.structured_data` (já populado pela edge `process-print`) às respostas do diagnóstico, com confirmação do usuário e prioridade para respostas manuais.

### 1. Mapeamento print → resposta

Criar `src/lib/diagnosis/printMapper.ts` com:

- **`buildProposalsFromUploads(uploads)`** — itera uploads `processed` e gera propostas `{ stepKey, questionKey, label, value, displayValue, source }`.
- Mapas por classificação:
  - `faturamento`: `revenue → basic.monthly_revenue`, `orders → basic.monthly_orders`, `average_ticket → basic.average_ticket`
  - `indicadores` / `avaliacoes`: `rating → storefront.rating`, `reviews_count → storefront.reviews_count`, `prep_time_min → delivery.prep_time`, `delivery_time_min → delivery.real_time`
  - `cardapio`: `products_visible → menu.products_total`, `products_visible − products_with_photo → menu.without_photo`, `has_combos → menu.has_combos`
  - `loja`: `has_cover → storefront.has_cover`, `has_logo → storefront.has_logo`, `rating → storefront.rating`
- Como os campos do funil são `select` com faixas (ex.: "R$ 30 a R$ 49" com `value="40"`), uso a função `nearestBucketValue()` para escolher a opção cujo `value` numérico fica mais próximo do valor extraído.
- **`filterEmpty(proposals, allAnswers)`** — descarta propostas cujo campo já tem resposta manual (preserva o que o usuário digitou).

### 2. Componente de revisão `PrintProposalsCard.tsx`

Card exibido no topo do `DiagnosisWizard` quando há propostas pendentes:

> "Encontramos dados nos seus prints. Deseja aplicar no diagnóstico?"

Botões:
- **Aplicar tudo** — faz upsert de todas as propostas em `diagnosis_answers` e atualiza o estado local.
- **Revisar antes** — expande lista com checkbox por proposta (`Etapa › Pergunta` + valor proposto + origem) e botão "Aplicar selecionados".
- **Ignorar** — esconde o card nesta sessão (flag em `localStorage` por `sessionId`).

### 3. Integração no `DiagnosisWizard.tsx`

- Buscar uploads `processed` da sessão (já carrega via realtime opcional ou fetch único).
- Calcular propostas via `buildProposalsFromUploads` + `filterEmpty(allAnswers)`.
- Renderizar `PrintProposalsCard` acima do `Card` da etapa atual.
- Ao aplicar:
  - Upsert em `diagnosis_answers` (mesma chave `session_id,step_key,question_key`).
  - Atualizar `allAnswers` no estado local para que a UI da etapa ativa reflita imediatamente.
  - Recalcular `step_status` afetado (chama mesma lógica do autosave).
  - Toast: "X campos preenchidos a partir dos prints. Confira antes de avançar."

### 4. Considerações

- Sem mudanças em banco — usa tabelas existentes (`diagnosis_uploads`, `diagnosis_answers`, `diagnosis_step_status`).
- Sem mudanças na edge `process-print` (schema atual já cobre tudo).
- Resposta manual sempre vence: o filtro roda toda vez que `allAnswers` muda, então campos preenchidos saem da lista de propostas automaticamente.

### Arquivos
- **criar** `src/lib/diagnosis/printMapper.ts`
- **criar** `src/components/diagnosis/PrintProposalsCard.tsx`
- **editar** `src/pages/app/diagnosis/DiagnosisWizard.tsx`
