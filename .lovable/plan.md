## Objetivo

Quando o usuário enviar prints na etapa "prints" do diagnóstico, o sistema deve:
1. Ler e analisar as imagens com IA (já funciona via `process-print`).
2. **Preencher automaticamente** os campos detectados (sem precisar clicar em "Aplicar tudo").
3. **Pular o usuário direto para a próxima etapa que ainda tem campos obrigatórios vazios**, em ordem.

Hoje a IA já extrai os dados e o card `PrintProposalsCard` mostra os campos detectados, mas exige clique manual e não navega para os faltantes.

## Mudanças

### 1. Auto-aplicar proposals quando prints terminam (`DiagnosisWizard.tsx`)

- Adicionar um `useEffect` que observa `proposals` e `uploads`.
- Quando todos os uploads tiverem `status === "processed"` (nenhum `pending`) e existirem proposals novas ainda não aplicadas, chamar a mesma lógica de `apply()` do `PrintProposalsCard` automaticamente.
- Mostrar um toast: *"IA preencheu N campos a partir dos seus prints"*.
- Marcar as proposals já aplicadas em um `Set` no estado (`appliedKeys`) para não reaplicar em loop.
- Manter o card visual apenas como confirmação (ou esconder após auto-aplicar).

### 2. Pular para a primeira etapa incompleta (`DiagnosisWizard.tsx`)

- Após auto-aplicar, calcular via `computeStepCompletion` qual é o **primeiro `activeSteps`** (depois do step "prints") que ainda tem `missing_required_fields.length > 0`.
- Chamar `goTo(thatIndex)` para já levar o usuário até lá.
- Se todas as etapas estiverem completas, ir direto para `/review`.

### 3. Helper de navegação (`src/lib/diagnosis/journey.ts` — já existe)

- Adicionar (ou reusar) `findNextIncompleteStepIndex(activeSteps, allAnswers, fromIndex)` que percorre as etapas em ordem e devolve o índice da primeira com campos obrigatórios vazios.

### 4. Refator leve do `PrintProposalsCard`

- Aceitar prop opcional `autoApplied?: boolean`. Quando `true`, mostrar um badge "Preenchido automaticamente" em vez dos botões "Aplicar tudo / Revisar".
- O botão de "Revisar/Editar" continua disponível para o usuário corrigir manualmente o que a IA inferiu.

## Fluxo final do usuário

```text
1. Usuário envia 3 prints na etapa "Prints"
2. process-print analisa cada um (badge "Analisando…" → "Analisado")
3. Wizard detecta proposals → auto-aplica → toast "IA preencheu 7 campos"
4. Wizard pula automaticamente para a próxima etapa com campos vazios
   (ex: "Sobre a loja" se rating já veio dos prints mas falta horário)
5. Usuário só preenche o que faltou; ao avançar, mesmo loop continua
```

## Arquivos afetados

- `src/pages/app/diagnosis/DiagnosisWizard.tsx` — auto-apply + auto-navegar
- `src/components/diagnosis/PrintProposalsCard.tsx` — modo "autoApplied"
- `src/lib/diagnosis/journey.ts` — helper `findNextIncompleteStepIndex`

Sem mudanças no banco, no edge function `process-print` nem no mapper (`printMapper.ts` já cobre os campos suportados).