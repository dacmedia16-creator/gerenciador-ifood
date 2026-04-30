Vou corrigir o bug de digitação que está fazendo os inputs aceitarem só 1 letra e perderem o foco.

Plano

1. Corrigir a causa raiz na tela de cadastro de loja
- Remover o componente de campo definido dentro de `src/pages/app/NewStore.tsx` (`const F = ...`).
- Substituir por JSX direto ou por um componente extraído fora do `NewStore`.
- Isso evita que o React recrie o tipo do componente a cada tecla e remonte o input, que é o comportamento clássico que derruba o foco.

2. Auditar outras telas com o mesmo padrão de remount acidental
- Revisar páginas com componentes definidos dentro do render e que possam envolver inputs.
- Prioridade de checagem: `src/pages/app/NewStore.tsx`, `src/components/onboarding/OnboardingWizard.tsx`, `src/pages/app/diagnosis/DiagnosisWizard.tsx` e componentes de formulário relacionados.
- Se houver outros casos parecidos, aplicar o mesmo ajuste para evitar que o problema apareça em mais de uma tela.

3. Validar os pontos mais sensíveis do produto
- Confirmar que dá para digitar normalmente em:
  - cadastro de loja
  - campos do funil de diagnóstico
  - formulários de produtos, concorrentes e campanhas
- Verificar especialmente campos lado a lado, como no print (`Bairro`, `Tempo prometido`, `Nota atual`), porque são os mais fáceis de perceber quando o input remonta.

Detalhes técnicos
- O problema mais provável está em `NewStore.tsx`:
```text
export default function NewStore() {
  ...
  const F = (...) => <Input ... />
}
```
- Em React, definir componentes dentro de outro componente faz esse “subcomponente” ganhar uma nova identidade a cada render.
- Quando o estado do formulário muda ao digitar, o React pode desmontar e montar novamente o campo, fazendo o cursor sair e parecendo que só a primeira letra foi aceita.
- Isso bate exatamente com o sintoma e com a recomendação oficial do React: não aninhar definições de componentes quando você quer preservar estado/foco.

Resultado esperado após a correção
- Os inputs voltam a aceitar texto contínuo normalmente.
- O cursor permanece no campo durante a digitação.
- O comportamento fica estável tanto no cadastro de loja quanto nos formulários relacionados.

Se você aprovar, eu aplico essa correção agora.