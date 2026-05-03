## Unificar em um único fluxo de diagnóstico

Hoje existem **3 caminhos sobrepostos** que confundem o usuário:

1. Sidebar > **"Meu Diagnóstico"** → tela Welcome com 3 modos (Prints / Fazer os dois / Formulário)
2. Sidebar (loja) > **"Diagnóstico"** → página antiga `/app/stores/:id/diagnostics`
3. Sidebar (loja) > **"Importar dados"** → página `/app/stores/:id/uploads` (prints, mas separado do wizard)

Vou consolidar em **um único fluxo**: o wizard completo (`mode=full`), que já inclui upload de prints + formulário + meta na mesma jornada.

### Mudanças

**1. Pular a tela Welcome (escolha de modo)**
- `src/pages/app/diagnosis/DiagnosisWelcome.tsx`: ao montar, cria/recupera a sessão e redireciona automaticamente para `/app/diagnosis/:sessionId?mode=full`. Sem cards de escolha.
- Mantenho a rota para não quebrar links antigos, mas vira só um "loader → redirect".

**2. Wizard sem `mode` = full**
- `DiagnosisWizard.tsx` (`filterStepsByMode`): default já é `STEPS` completos. O parâmetro `?mode=full` continua funcionando, mas como agora ele é o único caminho, fica redundante (ok manter).

**3. Sidebar limpa**
- Remover **"Diagnóstico"** (`/app/stores/:id/diagnostics`) do grupo "Análise da minha loja" — fica redundante com "Meu Diagnóstico".
- Remover o grupo **"Dados" / "Importar dados"** (`/app/stores/:id/uploads`) — upload de prints agora vive dentro do wizard.
- Mantido: "Meu Diagnóstico" (geral), "Score", "Plano de melhoria", "Meta", "Evolução", "Relatório".

**4. Rotas antigas**
- `/app/stores/:id/diagnostics` e `/app/stores/:id/uploads` continuam acessíveis por URL direta (sem quebrar links antigos), só somem do menu.

### Arquivos
- editar `src/pages/app/diagnosis/DiagnosisWelcome.tsx` (auto-redirect)
- editar `src/components/AppSidebar.tsx` (remover 2 itens)

### Resultado
Sidebar mostra apenas **"Meu Diagnóstico"** → abre direto no wizard de 13 etapas, com card de upload de prints embutido. Um único caminho, sem duplicação.
