## Objetivo
Permitir resetar o diagnóstico também a partir das telas do fluxo (`DiagnosisWizard`, `DiagnosisReview`, `DiagnosisResult`), além da listagem `Diagnostics`.

## Implementação

1. **Criar componente reutilizável** `src/components/diagnosis/ResetDiagnosisButton.tsx`:
   - Props: `storeId`, `variant?`, `size?`, `redirectTo?` (default: `/app/dashboard`).
   - Botão com ícone `RotateCcw` + `AlertDialog` de confirmação.
   - Função `handleReset` que:
     - Busca `diagnosis_sessions` por `user_id` + `store_id`.
     - Deleta em cascata: `diagnosis_step_status`, `diagnosis_answers`, `diagnosis_sessions`.
     - Deleta resultados: `action_plans`, `diagnostics`, `reports` por `store_id`.
     - Toast de sucesso + redirect.

2. **Refatorar `src/pages/app/Diagnostics.tsx`**: substituir o botão/dialog atual pelo novo componente.

3. **Adicionar o botão em**:
   - `src/pages/app/diagnosis/DiagnosisWizard.tsx` (header)
   - `src/pages/app/diagnosis/DiagnosisReview.tsx` (header)
   - `src/pages/app/diagnosis/DiagnosisResult.tsx` (header)

   Cada tela passa o `storeId` da sessão atual.

## Resultado
Mesmo botão de reset disponível em todas as telas do diagnóstico, sem duplicação de lógica.