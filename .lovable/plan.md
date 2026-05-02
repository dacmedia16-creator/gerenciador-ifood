## Objetivo

O usuário (Dono) terá **apenas um diagnóstico** que ele atualiza ao longo do tempo, em vez de criar novos a cada vez. Toda vez que clicar em "Novo Diagnóstico", abrirá a sessão existente para edição/atualização.

## Mudanças

### 1. `src/lib/diagnosis/session.ts`
- Adicionar função `getOrCreateUserSession(userId)` que:
  - Busca **qualquer** sessão do usuário (não apenas `status='draft'`), ordenada pela mais recente.
  - Se existir, retorna ela (mesmo se já estiver `completed`, reabre setando `status='draft'` e atualizando `updated_at`).
  - Se não existir, cria uma nova.

### 2. `src/pages/app/diagnosis/NewDiagnosis.tsx`
- Remover lógica de `?new=1` (forçar nova sessão).
- Sempre chamar `getOrCreateUserSession(user.id)` e redirecionar para `/app/diagnosis/{id}`.
- Resultado: o item "Novo Diagnóstico" do menu sempre abre a mesma sessão do usuário para continuar/atualizar.

### 3. Renomear rótulo no `AppSidebar.tsx` (Donos)
- Trocar "Novo Diagnóstico" por **"Meu Diagnóstico"** para refletir que é único e atualizável.
- Super Admin continua com acesso normal a tudo.

### 4. `src/pages/app/diagnosis/DiagnosisReview.tsx` (revisão/geração)
- Após gerar o relatório, **não** marcar a sessão como travada — manter editável para que o dono volte e atualize respostas e regere quando quiser.
- Garantir que o botão final no fluxo seja "Atualizar diagnóstico" quando já houver `generated_at`.

### 5. Banco de dados
- Nenhuma migração necessária. A tabela `diagnosis_sessions` já suporta reabertura (campos `status`, `current_step`, `completion_percentage`, `generated_at`).
- Opcional: adicionar índice único parcial para reforçar 1 sessão ativa por usuário — **não** será aplicado agora para evitar quebrar dados existentes; a regra é garantida no código.

## Comportamento final

- Dono clica "Meu Diagnóstico" → abre sempre a mesma sessão, com respostas anteriores já preenchidas.
- Pode editar qualquer etapa, salvar (autosave já existe) e regenerar o relatório.
- Histórico de relatórios gerados continua salvo em `reports` (cada geração cria um novo registro de relatório, mas a sessão de perguntas é única).
