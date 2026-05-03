## Causa raiz

- As páginas do funil de diagnóstico (`DiagnosisWelcome`, `NewDiagnosis`, `DiagnosisWizard`, `DiagnosisReview`, **`DiagnosisResult`**) estão registradas **fora do `AppLayout`**, então não têm guarda de autenticação. Você consegue ver o resultado mesmo deslogado.
- O `DiagnosisResult` busca `diagnosis_sessions`, `stores`, etc. via Supabase. Se a sessão de auth expirou, as queries voltam vazias por RLS, mas a tela ainda renderiza o que tem em cache.
- Quando você clica em **"Ver relatório completo"** (`/app/stores/:id/report`), você entra no `AppLayout`, o `useAuth` confirma `!user`, e te redireciona pro `/auth` — sem mensagem nenhuma. Daí a sensação de "não abre".

## O que vou mudar

### 1. Proteger o funil de diagnóstico com auth (sem perder a tela cheia)
- Criar um wrapper leve `RequireAuth` (sem sidebar), que faz a mesma checagem do `AppLayout`: se `loading`, mostra spinner; se `!user`, redireciona pra `/auth?redirect=<rota_atual>`.
- Envolver as 5 rotas de `/app/diagnosis/*` com esse `RequireAuth` em `src/App.tsx`.
- Resultado: se a sessão caiu, o usuário é mandado pra login **antes** de ver o resultado, não depois de clicar num botão.

### 2. Preservar o destino original no login
- Em `src/pages/Auth.tsx`, depois de logar com sucesso, ler `?redirect=` da URL e voltar pra rota original (fallback `/app/dashboard`).
- Assim, depois de logar de novo, ele vai direto pro relatório, não perde o contexto.

### 3. Feedback claro no `Report.tsx`
- Antes de redirecionar, se o `useStoreData` retornar `store == null` por falta de sessão, mostrar um aviso curto ("Sua sessão expirou, faça login pra ver o relatório") em vez de só carregar pra sempre.
- Também adicionar um `toast.error` no caminho de erro de auth pra usuário não ficar perdido.

### 4. Reforçar o link no `DiagnosisResult`
- Garantir que o botão "Ver relatório completo" só aparece se houver `store_id` válido (já tem) e fica desabilitado enquanto `data` ainda carrega — pra evitar clique fantasma.

## Arquivos afetados
- `src/App.tsx` — envolver rotas do funil com `RequireAuth`.
- `src/components/RequireAuth.tsx` (novo) — guard sem layout.
- `src/pages/Auth.tsx` — respeitar `?redirect=`.
- `src/pages/app/Report.tsx` — fallback explícito quando sem sessão/sem loja.
- `src/pages/app/diagnosis/DiagnosisResult.tsx` — pequeno ajuste no botão.

## Fora do escopo agora
- Não vou mexer no conteúdo do relatório nem em prints/extração (separado).
- Não vou alterar o layout do `/auth`.

Posso seguir?
