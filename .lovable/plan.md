## Objetivo
Restaurar a tela `/app/diagnosis/welcome` como uma **tela de boas-vindas real** (não redirecionar automaticamente). O usuário verá uma apresentação curta e clica em um botão para abrir o wizard de 13 etapas.

## Mudanças

### 1. `src/pages/app/diagnosis/DiagnosisWelcome.tsx` (reescrever)
Remover o `useEffect` que redireciona. Em vez disso, renderizar:

- Título: **"Vamos diagnosticar sua loja"**
- Subtítulo curto explicando: ~13 perguntas, leva 8–10 min, salva automaticamente, pode pausar e voltar
- 3 bullets rápidos do que vamos cobrir (cardápio, preço/lucro, operação, avaliações…)
- Aviso: "Você pode enviar prints da sua loja durante o processo"
- Botão primário **"Começar diagnóstico"** → cria/recupera sessão via `getOrCreateUserSession` e navega para `/app/diagnosis/:id`
- Se já existir rascunho: o botão muda para **"Continuar de onde parou"** + link secundário "Recomeçar do zero" (reseta sessão)
- Loading state enquanto chama `getOrCreateUserSession`

### 2. Sidebar (`src/components/AppSidebar.tsx`)
Sem mudanças — "Meu Diagnóstico" continua apontando para `/app/diagnosis/welcome`.

## Detalhe técnico
- Buscar a sessão existente na montagem (sem criar) para decidir o texto do botão.
- Só criar nova sessão ao clicar.
- Mantém suporte a `?storeId=` na URL.
