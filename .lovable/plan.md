## Problema

No mobile, ao clicar em qualquer item do menu lateral (Dashboard, Gestor IA, Lojas, etc.), a sidebar fica aberta cobrindo o conteúdo. O usuário precisa fechar manualmente clicando no overlay ou no botão de menu.

Isso acontece porque os `NavLink` apenas navegam — não chamam `setOpenMobile(false)` do hook `useSidebar`.

## Solução

Em `src/components/AppSidebar.tsx`:

1. Importar `isMobile` e `setOpenMobile` do hook `useSidebar()`.
2. Criar um helper `closeOnMobile = () => { if (isMobile) setOpenMobile(false); }`.
3. Adicionar `onClick={closeOnMobile}` em todos os `<NavLink>` dos 4 grupos (Geral, Análise, Operação, Dados & Saída) e também no logo do `SidebarHeader`.
4. Chamar `setOpenMobile(false)` também no botão "Sair" antes do `signOut`.

A navegação por rota continua a mesma; apenas no mobile o sheet fecha automaticamente após o clique. No desktop nada muda.

## Arquivo modificado

- `src/components/AppSidebar.tsx` — apenas mudanças no hook e nos `onClick` dos links.