## Separar menu do Dono e do Super Admin

Hoje o menu lateral mostra praticamente tudo para qualquer usuário logado, e só "Radar de Prospects" e "Base de conhecimento" estão restritos ao admin. Vamos reorganizar para que o dono comum veja só o essencial e o super admin veja tudo.

### Menu do Dono comum (não-admin)

Bloco **Geral** (apenas 4 itens):
- Painel do Dono (`/app/dashboard`)
- Novo Diagnóstico (`/app/diagnosis/new`)
- Minhas lojas (`/app/stores`)
- Gestor IA (Chat) (`/app/chat`)

Quando ele abrir uma loja dele, continua vendo os blocos **Análise da minha loja**, **Operação** e **Dados** normalmente (mantém submenus completos da loja, conforme confirmado).

Não vê: Painel Super Admin, Radar de Prospects, Base de conhecimento, Configurações do relatório.

### Menu do Super Admin

Vê **tudo** que o dono vê + um bloco extra **Super Admin** com:
- Painel Super Admin (`/app/admin`)
- Radar de Prospects (`/app/prospects`)
- Base de conhecimento (`/app/knowledge`)
- Configurações do relatório (quando estiver dentro de uma loja)

### Mudanças técnicas

**`src/components/AppSidebar.tsx`**
- Manter array `general` como está (já tem os 4 itens corretos).
- Manter blocos de loja (`storeAnalysis`, `storeOperations`, `storeData`) renderizando para qualquer usuário quando há `storeId` (sem mudança).
- O bloco "Super Admin" já está condicionado a `isAdmin` — manter. Só garantir que não há mais nenhum item admin vazando para usuário comum.

**Proteção de rotas (defesa em profundidade)** em `src/App.tsx`:
- Envolver as rotas `/app/admin`, `/app/prospects`, `/app/knowledge` e `/app/stores/:id/report/template` num pequeno componente `<AdminRoute>` que usa `useIsAdmin()` e redireciona para `/app/dashboard` se não for admin. Isso evita que um dono comum acesse essas páginas digitando a URL direto.
- Criar `src/components/AdminRoute.tsx` simples (loading state + Navigate).

### O que NÃO muda

- RLS, edge functions admin, tabela `user_roles`, página `/app/admin` continuam como estão.
- Submenus da loja continuam completos para o dono.
- Gestor IA continua acessível a todos.