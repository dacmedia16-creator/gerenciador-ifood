## Redirecionamento por papel após login

Hoje, após o login (e ao abrir `/auth` já logado), o usuário sempre vai para `/app/dashboard`. Vamos detectar se ele é admin e mandar direto para `/app/admin`.

### Mudança em `src/pages/Auth.tsx`

Adicionar uma função `redirectByRole(userId)` que consulta `user_roles` e redireciona:
- `admin` → `/app/admin`
- caso contrário → `/app/dashboard`

Aplicar nos três pontos:
1. `useEffect` que detecta usuário já logado.
2. Após `signInWithPassword` bem-sucedido (usar `data.user.id` retornado).
3. Após `signUp` bem-sucedido (novo usuário nunca é admin → `/app/dashboard`, mas usar o mesmo helper para consistência).

```ts
const redirectByRole = async (userId: string) => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  navigate(data ? "/app/admin" : "/app/dashboard");
};
```

### O que NÃO muda

- Sidebar, RLS, edge functions, página `/app/admin` permanecem iguais.
- `AdminRoute` continua protegendo as rotas admin.
- Donos comuns que tentem abrir `/app/admin` direto continuam sendo redirecionados para o dashboard.