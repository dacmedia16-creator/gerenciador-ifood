## Painel de Super Admin

Criar uma área `/app/admin` exclusiva para super administradores, com gestão de usuários e atalhos centralizados para Radar de Prospects, Gestor IA (Chat) e Base de conhecimento.

### 1. Sistema de roles (segurança)

Criar a infraestrutura padrão de roles via migration:

- Enum `app_role` com valores `admin` e `user`.
- Tabela `user_roles (id, user_id, role, created_at)` com RLS.
- Função `has_role(_user_id uuid, _role app_role)` (SECURITY DEFINER) para evitar recursão em policies.
- Policies: usuário lê seus próprios roles; apenas admin pode inserir/atualizar/deletar roles.
- Seed: inserir role `admin` para o user_id de `dacmedia16@gmail.com` (48e83670-62ff-402e-b92b-f57657785d7d).

### 2. Restrição de acesso no menu lateral

Em `src/components/AppSidebar.tsx`:

- Adicionar hook `useIsAdmin()` que consulta `user_roles` via Supabase (com cache via React Query).
- Mover **Radar de Prospects** e **Base de conhecimento** do bloco "Admin" atual para o novo bloco **Super Admin**, visível só para admin.
- Manter Gestor IA (Chat) acessível para todos (continua em "Geral").
- Adicionar item **Painel Admin** (`/app/admin`) visível só para admins.

### 3. Página `/app/admin` — Painel de Super Admin

Nova página `src/pages/app/Admin.tsx` com:

- Cards de KPIs: total de usuários, lojas, diagnósticos, prospects.
- Atalhos rápidos para: Criar usuário, Radar de Prospects, Gestor IA (Chat), Base de conhecimento.
- Tabela de usuários (lista de `profiles` + role) com:
  - Coluna: nome, email, role, data de criação, nº de lojas.
  - Ações por linha: promover/remover admin, excluir usuário.
- Botão "Criar usuário" abre dialog com email + senha temporária + nome.
- Guard: redireciona para `/app/dashboard` se o usuário logado não for admin.

### 4. Edge Functions admin (para operações privilegiadas)

Criar três edge functions que validam JWT + role admin antes de executar:

- `admin-create-user`: usa Service Role Key para chamar `auth.admin.createUser({ email, password, email_confirm: true })` + insere profile + role default `user`.
- `admin-set-role`: promove/remove role admin de um user_id.
- `admin-delete-user`: remove o usuário via `auth.admin.deleteUser`.

Todas verificam `has_role(auth.uid(), 'admin')` antes de qualquer ação.

### 5. Roteamento

Em `src/App.tsx` adicionar rota lazy `admin` dentro de `/app`:
```
<Route path="admin" element={<Admin />} />
```

### O que NÃO muda

- Fluxo de IA, diagnóstico, regras e edge functions existentes ficam intactos.
- Donos comuns continuam vendo lojas, diagnósticos, plano, chat IA etc. normalmente.
- Apenas Radar de Prospects e Base de conhecimento ficam restritos a admin.

### Resultado

Você (admin) terá um painel central em `/app/admin` para criar usuários com senha temporária, gerenciar roles, e acessar rapidamente Prospects, Chat IA e Base de conhecimento. Donos comuns não verão nada disso.
