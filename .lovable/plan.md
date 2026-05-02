## Por que ainda aparece "Minhas lojas"

A página/menu "Minhas lojas" continua existindo porque ainda não a removemos — só ajustamos o diagnóstico. Como o dono é dono de **uma única loja**, faz sentido aplicar a mesma lógica de "singleton" que aplicamos ao diagnóstico: o usuário tem **uma loja só**, que ele atualiza, sem listagem nem botão de "Nova loja" / "Criar demo".

## Plano

### 1. Sidebar (`src/components/AppSidebar.tsx`)
- Remover o item **"Minhas lojas"** do grupo Geral para usuários comuns.
- Adicionar **"Minha loja"** apontando direto para `/app/stores/:id` (resolvido em runtime buscando a única loja do usuário).
- Para admin, manter um acesso a "Todas as lojas" (visão administrativa) somente no grupo Super Admin.

### 2. Resolver loja única
- Criar helper `getOrCreateUserStore(userId)` em `src/lib/store/userStore.ts`:
  - Busca a loja mais recente do usuário em `stores`.
  - Se não existir, redireciona para o onboarding (`/app/onboarding`) para criação inicial.
- Criar página de "atalho" `src/pages/app/MyStore.tsx` na rota `/app/store` (singular), que chama o helper e faz `navigate(/app/stores/{id})`.

### 3. Remover fluxo de múltiplas lojas
- `src/pages/app/Stores.tsx`: deixar de ser usado pelo dono. Manter o componente, mas usá-lo só em rota admin (`/app/admin/stores`) com `<AdminRoute>`.
- `src/pages/app/NewStore.tsx`: proteger com `<AdminRoute>` (admin pode criar lojas em nome de clientes); o dono comum não vê mais.
- Botões "Criar demo" e "Nova loja" só aparecem na visão admin.

### 4. Onboarding
- Após o onboarding criar a loja, redirecionar para `/app/store` (que resolve para `/app/stores/{id}`) em vez de `/app/stores`.

### 5. Auth/Redirect
- No `Auth.tsx` e em `redirectByRole`, dono comum vai para `/app/dashboard` (já está). Sem mudança aqui.
- No Dashboard e demais links internos, trocar referências `/app/stores` (lista) por `/app/store` (atalho singular).

### Arquivos afetados
- `src/components/AppSidebar.tsx` (editar)
- `src/lib/store/userStore.ts` (novo)
- `src/pages/app/MyStore.tsx` (novo)
- `src/App.tsx` (nova rota `/app/store`; proteger `stores` e `stores/new` com AdminRoute)
- `src/pages/app/Onboarding.tsx` ou `OnboardingWizard` (ajustar redirect final)
- Buscar e atualizar links internos para `/app/stores` (lista) onde aplicável

### Resultado
- Dono comum: vê só **"Minha loja"** no menu, sempre cai na sua loja única, atualiza dados em vez de criar novas.
- Admin: continua com "Todas as lojas" e capacidade de criar/excluir, no grupo Super Admin.