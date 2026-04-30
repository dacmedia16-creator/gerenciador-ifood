# Botão "Atualizar sistema" no Dashboard

## O que faz

Adicionar um botão **"Atualizar sistema"** na barra superior do Dashboard. Ao clicar:

1. Limpa caches do navegador (Cache Storage API + `localStorage`/`sessionStorage` exceto a sessão de auth do Supabase).
2. Desregistra Service Workers, se houver.
3. Recarrega a página com bypass de cache (`location.reload()` + querystring `?v=timestamp` para invalidar HTML cacheado).
4. Mostra toast "Sistema atualizado" antes do reload.

Assim, depois de você publicar uma nova versão no Lovable, basta clicar nesse botão para forçar todos os clientes a baixarem a versão mais nova sem precisar pedir Ctrl+Shift+R aos usuários.

## Implementação

**Arquivos:**

1. **Criar** `src/lib/system/refresh.ts` — função `refreshSystem()` reutilizável:
   - `caches.keys()` → `caches.delete()` para todos.
   - Limpa `localStorage`/`sessionStorage` preservando chaves que começam com `sb-` (sessão Supabase) para não deslogar.
   - `navigator.serviceWorker.getRegistrations()` → `unregister()`.
   - Redireciona para `window.location.pathname + "?v=" + Date.now()`.

2. **Editar** `src/pages/app/Dashboard.tsx`:
   - Importar ícone `RefreshCw` do `lucide-react` e `refreshSystem`.
   - Adicionar `<Button variant="outline" size="sm">` ao lado de "Loja" / "Novo Diagnóstico" com handler que chama `refreshSystem()`.

## Fora do escopo

- Não muda lógica de auth, Supabase ou edge functions.
- Não adiciona Service Worker novo (apenas remove se existir).
- Não exibe modal de confirmação (uso é frequente após publicar — toast já basta).
