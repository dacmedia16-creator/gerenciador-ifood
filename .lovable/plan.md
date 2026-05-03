## Reordenar etapas no modo Prints

No fluxo `?mode=prints`, hoje a ordem é: `basic → prints → goal`. O usuário quer enviar os prints primeiro.

### Mudança

**Arquivo:** `src/pages/app/diagnosis/DiagnosisWizard.tsx`

Substituir a função `filterStepsByMode` para preservar a ordem desejada (em vez de seguir a ordem natural de `STEPS`):

```ts
function filterStepsByMode(mode: string | null) {
  if (mode === "prints") {
    const order = ["prints", "basic", "goal"];
    return order
      .map((k) => STEPS.find((s) => s.key === k))
      .filter(Boolean) as typeof STEPS;
  }
  if (mode === "form") return STEPS.filter((s) => s.key !== "prints");
  return STEPS;
}
```

### Considerações

- O mapeamento `current_step` salvo (índice global) → posição em `activeSteps` já usa `findIndex` por `key`, então continua funcionando após a inversão.
- A IA de `process-print` que pré-preenche campos do `basic` continua útil: ao chegar na etapa "Sobre a sua loja" os campos já vêm preenchidos pelos prints enviados na etapa anterior.
- Nenhuma mudança em `steps.ts`, `WizardShell` ou edge functions é necessária.
