# Fechar pendências de cache/fila de prints

A spec já foi 95% implementada nos turnos anteriores. Restam dois itens explícitos:

## 1. Trigger no banco para invocar `process-print-job`

Hoje a invocação acontece fire-and-forget pelo frontend dentro de `uploadPrintJob`. A spec pede também um trigger no Postgres para garantir o disparo mesmo se o frontend falhar entre o INSERT e a chamada da function.

Migration:
- Habilitar extensões `pg_net` e `pg_cron` (idempotente).
- Criar função `public.trigger_process_print()` `SECURITY DEFINER` que faz `net.http_post` para a edge function `process-print-job` com `{ job_id: NEW.id }`.
- URL e service role lidos via `current_setting('app.edge_function_url', true)` e `current_setting('app.service_role_key', true)`.
- Criar trigger `on_print_job_created AFTER INSERT ON public.print_jobs FOR EACH ROW WHEN (NEW.status = 'pending') EXECUTE FUNCTION trigger_process_print()`.
- Guard: se os settings estiverem vazios, a função retorna `NEW` sem erro (não quebra inserts).

Como o `current_setting` precisa ser populado por ambiente (não fica em migration genérica de remix), a configuração efetiva (`ALTER DATABASE … SET app.edge_function_url = …`) será aplicada via tool de insert/SQL admin separadamente, usando a URL `https://kaquxveoyogtjoxgistv.supabase.co/functions/v1` e a `SUPABASE_SERVICE_ROLE_KEY` deste projeto.

Resultado: continua funcionando mesmo se o invoke do frontend falhar; sem invocações duplicadas problemáticas porque `process-print-job` já checa `status = 'pending'` antes de processar.

## 2. `.env.example`

Criar arquivo `.env.example` na raiz documentando as variáveis usadas pelo trigger e pelo backend (apenas referência — o `.env` real é gerenciado pelo Lovable Cloud):

```
# Configurado automaticamente pelo Lovable Cloud
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

# Usado pelo trigger on_print_job_created (configurar via:
# ALTER DATABASE postgres SET app.edge_function_url = '...';
# ALTER DATABASE postgres SET app.service_role_key  = '...';)
SUPABASE_EDGE_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1
```

## Fora de escopo

- Não recriar tabelas/funções já existentes.
- Não tocar no fluxo de diagnóstico, check-in semanal nem ProblemDetailSheet (já invalidando cache).
- Não adicionar pg_cron de limpeza do `ai_cache` — a spec aceita "deletar expirados na própria query de busca", que já é o comportamento do helper `_shared/cache.ts`.
