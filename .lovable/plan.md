## Problema

Após cadastrar a loja, o usuário está sendo levado direto para o wizard de diagnóstico (`/app/diagnosis/new` → cria sessão → abre wizard). A tela esperada é a **Welcome do Diagnóstico** (`/app/diagnosis/welcome`), com o card "Vamos diagnosticar sua loja" e a escolha entre **Só prints / Só formulário / Prints + formulário**.

## Causa

- `src/pages/app/NewStore.tsx` (linha 35) redireciona para `/app/diagnosis/new?storeId=...`
- `src/components/onboarding/OnboardingWizard.tsx` (passo final) navega para `/app/stores/:id`

Nenhum desses fluxos passa pela tela `DiagnosisWelcome`, que é o ponto de entrada certo para escolher o modo do diagnóstico.

## Mudanças

1. **`src/pages/app/NewStore.tsx`**
   - Trocar `navigate(\`/app/diagnosis/new?storeId=${data.id}\`)` por `navigate(\`/app/diagnosis/welcome?storeId=${data.id}\`)`.
   - Ajustar o toast: "Loja cadastrada! Escolha como começar seu diagnóstico."

2. **`src/components/onboarding/OnboardingWizard.tsx`**
   - No passo final (`step === 3`), trocar o botão "Ver minha loja" por "Começar diagnóstico" que navega para `/app/diagnosis/welcome?storeId={createdStoreId}`.
   - Manter um link secundário "Ir para o painel" para quem preferir pular.

3. **Verificar `DiagnosisWelcome`**
   - Já aceita `?storeId=` via `useSearchParams` e usa em `createSession`. Sem mudanças necessárias.

## Resultado

Depois de cadastrar a loja (em qualquer um dos dois fluxos), o usuário cai direto na tela "Vamos diagnosticar sua loja" com a escolha de modo, exatamente como na imagem enviada.