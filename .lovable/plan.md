## Objetivo
Colocar **"Envie prints da sua loja"** como **primeira etapa** do wizard. Assim a IA processa os prints enquanto o usuário responde, e os dados extraídos pré-preenchem o formulário automaticamente (via `PrintProposalsCard`, que já existe).

## Como funciona hoje
- A etapa de prints está na posição **12 de 13**.
- O `DiagnosisWizard` já roda um polling a cada 5s nos uploads, gera "propostas" via `buildProposalsFromUploads` e mostra um cartão **"Aplicar respostas dos prints"** no topo de qualquer etapa quando há sugestões.
- Faltava só ordem: prints depois do formulário inteiro = sem benefício de pré-preenchimento.

## Mudanças

### 1. `src/lib/diagnosis/steps.ts`
- Mover o bloco `key: "prints"` para o **topo** do array `STEPS`, antes de `basic`.
- Renumerar `index` sequencialmente de 1 a 13:
  - 1. prints
  - 2. basic
  - 3. storefront
  - 4. menu
  - 5. products
  - 6. pricing
  - 7. combos
  - 8. delivery
  - 9. operations
  - 10. reviews
  - 11. ads
  - 12. retention
  - 13. goal
- Ajustar o `intro` da etapa prints para deixar claro que é opcional **e** que se enviar agora, o resto do formulário virá pré-preenchido:
  > "Envie prints do iFood, WhatsApp, cardápio, avaliações, faturamento — o que tiver. A IA lê tudo e **já preenche as próximas etapas pra você**. Pode pular se preferir responder do zero."

### 2. Sem outras alterações de código
- `DiagnosisWizard`, `WizardShell`, `DiagnosisReview` usam `step.index` dinamicamente — funcionam após a renumeração.
- `PrintProposalsCard` já trata aplicação das respostas extraídas.
- Sessões em andamento com `current_step` antigo (ex: 5) continuam abrindo a etapa correspondente pela nova ordem; pode haver pequeno deslocamento em rascunhos antigos, mas nada quebra (o `stepByIndex` retorna a etapa daquele número e o usuário pode navegar).
