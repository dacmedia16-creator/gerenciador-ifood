## Habilitar botão "Voltar" na primeira etapa

O botão "Voltar" existe no rodapé do wizard (`WizardShell.tsx`, linha 111), mas fica **desabilitado** na primeira etapa, então parece sumido.

### Mudança

**Arquivo:** `src/components/diagnosis/WizardShell.tsx` (linhas 110-113)

Quando estiver na primeira etapa (`currentStepIndex <= 1`), em vez de desabilitar, o botão vira um link para a tela de boas-vindas (`/app/diagnosis/welcome`), permitindo trocar de modo (prints/form/full).

```tsx
{currentStepIndex <= 1 ? (
  <Button variant="outline" asChild>
    <Link to="/app/diagnosis/welcome">
      <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
    </Link>
  </Button>
) : (
  <Button variant="outline" onClick={onPrev}>
    <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
  </Button>
)}
```

### Observações

- Nas demais etapas, o comportamento atual é mantido (vai para a etapa anterior).
- Continua existindo o link "← Sair (rascunho salvo)" no topo da tela, que leva ao dashboard.
