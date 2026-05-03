## Objetivo

Adicionar 3 camadas de eficiência ao backend, sem mudar o comportamento visível do diagnóstico, chat ou plano de ação:

1. **Cache de respostas de IA** (diagnóstico, sugestão de nomes, análise de avaliações).
2. **Fila assíncrona de processamento de prints** (upload → job → polling/realtime).
3. **Rate limiting básico** por usuário/ação/hora, com mensagem amigável.

Tudo em paralelo às tabelas e fluxos existentes — nada é removido.

---

## 1. Migrations (Supabase)

### 1.1 `ai_cache`
```sql
create table public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  input_hash text not null unique,
  store_id uuid references public.stores(id) on delete cascade,
  cache_type text not null,         -- 'diagnosis' | 'review_analysis' | 'suggestion'
  response jsonb not null,
  model text not null,
  tokens_used int,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  hit_count int not null default 0
);
create index ai_cache_hash_idx on public.ai_cache(input_hash);
create index ai_cache_expires_idx on public.ai_cache(expires_at);
alter table public.ai_cache enable row level security;
-- nenhuma policy: somente service_role acessa.
```

### 1.2 `print_jobs`
```sql
create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid not null,
  diagnosis_session_id uuid references public.diagnosis_sessions(id) on delete set null,
  storage_path text not null,
  status text not null default 'pending',  -- pending|processing|done|error
  result jsonb,
  error_message text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.print_jobs enable row level security;
create policy print_jobs_select_own on public.print_jobs for select to authenticated using (user_id = auth.uid());
create policy print_jobs_insert_own on public.print_jobs for insert to authenticated with check (user_id = auth.uid());
create policy print_jobs_update_own on public.print_jobs for update to authenticated using (user_id = auth.uid());
create index print_jobs_status_idx on public.print_jobs(status, created_at);
create index print_jobs_store_idx on public.print_jobs(store_id);
alter publication supabase_realtime add table public.print_jobs;
```

Trigger via `pg_net`/`http` para invocar `process-print-job` no insert (lendo `SUPABASE_URL` + `service_role_key` de `vault`/settings). Se `pg_net` não estiver habilitado no projeto, **fallback**: o frontend dispara `supabase.functions.invoke("process-print-job", { body: { job_id }})` logo após o insert (fire-and-forget) — mantém UX não-bloqueante e evita dependência do Vault.

### 1.3 `rate_limits`
```sql
create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count int not null default 1,
  unique (user_id, action, window_start)
);
alter table public.rate_limits enable row level security;
-- sem policy: só service_role.
create or replace function public.increment_rate_limit(_user uuid, _action text, _window timestamptz)
returns int language sql security definer set search_path=public as $$
  insert into public.rate_limits(user_id, action, window_start, count)
  values (_user, _action, _window, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count;
$$;
```

### 1.4 Storage bucket `prints`
Bucket privado para uploads de prints assíncronos (separado do `diagnosis-uploads` legado, que continua funcionando):
```sql
insert into storage.buckets(id,name,public) values ('prints','prints',false) on conflict do nothing;
-- policies: usuário só pode mexer em arquivos cujo primeiro segmento de path = auth.uid()::text
```

---

## 2. Helpers compartilhados em `supabase/functions/_shared/`

- `cache.ts`: `buildCacheKey(inputs)` (SHA-256 hex via `crypto.subtle`), `getCached(admin, hash)`, `putCached(admin, { hash, store_id, type, response, model, tokens, ttlSeconds })`, `invalidateDiagnosisCache(admin, storeId)`.
- `rate-limit.ts`: `checkRateLimit(admin, userId, action, limitPerHour)` chama RPC `increment_rate_limit` com `window_start = início da hora atual`. Retorna `{ allowed, remaining, retryAfterMinutes }`. Mapa de limites por plano (free/pro/pro_plus) via `getUserPlan` server-side (por enquanto: assume `pro` se autenticado, igual ao client helper).

---

## 3. Edge Functions

### 3.1 Aplicar **cache + rate limit** em:
- `ai-consult` (apenas quando o `mode`/payload representa diagnóstico — manter outros modos sem cache).
  - Hash sobre `{ store_category, revenue_range, current_rating, cancellation_rate, avg_ticket, main_problem, has_print }` derivados do payload de entrada (sem `store_id`/`user_id`).
  - TTL 7 dias. Rate limit `action='diagnosis'`.
- `analyze-reviews`: hash sobre lista de comentários ordenada + topics. TTL 24h. Rate limit `action='diagnosis'` (compartilha balde) — opcional.
- `suggest-product-names`: hash sobre `{products, segment}` ordenados. TTL 30 dias.

### 3.2 Aplicar **somente rate limit** em:
- `chat-gestor` → `action='chat'`.
- `generate-report-pdf` → `action='report'`.
- nova `process-print-job` → `action='print_upload'` (validado no momento do **insert do job**, ver 3.4).

Em caso de bloqueio, retornar HTTP 429:
```json
{ "error": "rate_limit_exceeded", "message": "Aguarde alguns minutos antes de gerar outro diagnóstico.", "retry_after_minutes": N }
```

### 3.3 Invalidação de cache de diagnóstico
- Chamar `invalidateDiagnosisCache(admin, storeId)` dentro de:
  - `ai-consult` ao final de uma geração nova (já implícito porque novo hash = nova chave; só limpa entradas antigas da loja para evitar acúmulo).
  - Edge function/handler que recebe a reavaliação semanal — **não há edge function dedicada hoje**; o `WeeklyCheckinCard` insere direto na tabela. Para invalidar do client, criar pequena edge function `invalidate-diagnosis-cache` (autenticada, valida `has_store_access` via RLS-like check) e chamá-la ao salvar o snapshot e ao salvar dados do "aprofundamento".

### 3.4 Nova edge function `process-print-job`
- Input: `{ job_id }`. Sem `verify_jwt` (será chamada por trigger ou client fire-and-forget); valida que o job existe e marca `processing`.
- Reaproveita 100% da lógica atual de `process-print` (download do storage, chamada multimodal, parse) **mas lendo do bucket `prints`** e gravando o resultado em `print_jobs.result` no formato pedido pela spec:
  ```json
  { "rating", "cancellation_rate", "total_orders_period", "avg_ticket",
    "revenue_period", "period_description", "top_complaints", "data_confidence" }
  ```
- Atualiza `status='done'|'error'`, `processed_at`, `error_message`, `attempts++`. Sem retry automático.
- A função `process-print` legada continua existente para o `PrintUploader` atual (não quebrar).

---

## 4. Frontend

### 4.1 Helper `src/lib/prints/uploadPrintJob.ts`
- Faz upload no bucket `prints` (`{user.id}/{store_id||'no-store'}/{uuid}-{filename}`).
- Insere `print_jobs` (`status='pending'`, `diagnosis_session_id` opcional).
- Dispara `supabase.functions.invoke("process-print-job", { body: { job_id }})` sem `await` (fallback se trigger não estiver ativa).
- Retorna `{ jobId }`.

### 4.2 Componente `src/components/prints/PrintJobStatus.tsx`
- Props: `{ jobId, onDone?(result), onError?() }`.
- Usa **Supabase Realtime** (`postgres_changes` filtrando `id=eq.{jobId}`) com fallback de polling 4s caso o canal não conecte em 6s.
- Estados: pending/processing → spinner + "Analisando print…"; done → check verde + lista dos campos não-null do `result`; error → ícone erro + botão "Tentar novamente" (chama `process-print-job` de novo).
- Timeout 60s: troca a mensagem para "A análise está demorando…" e mantém o canal aberto.

### 4.3 Integração no fluxo de diagnóstico (`DiagnosisExpress.tsx`)
- Na etapa opcional de "Print Upload" (já existente entre as 5 etapas), substituir o uso síncrono atual de `PrintUploader` pelo novo `uploadPrintJob` + `PrintJobStatus`.
- O `PrintUploader` legado (rota `/app/stores/:id/uploads`) **permanece intacto** — apenas a etapa do funnel rápido passa a usar a fila.
- Quando `onDone`, mesclar `result` no payload do diagnóstico (preencher `current_rating`, `cancellation_rate`, `avg_ticket`, `main_problem`/complaints quando vazios).

### 4.4 Tratamento de 429
- Em `src/lib/ai/invokeAI.ts` o branch `status === 429` já existe; trocar a mensagem para a versão amigável por ação (ler `parsed?.error === 'rate_limit_exceeded'` e usar `parsed.message`).
- No `WeeklyCheckinCard` e em `DiagnosisExpress` (após salvar snapshot/aprofundamento), invocar `invalidate-diagnosis-cache`.

---

## 5. Variáveis de ambiente

Adicionar nota em `README.md` (não há `.env.example` no projeto). Nada novo em runtime — `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já estão configurados.

---

## 6. Arquivos

**Migrations**: 1 nova SQL com `ai_cache`, `print_jobs` (+ realtime), `rate_limits` (+ RPC), bucket `prints` + policies.

**Novas edge functions**:
- `supabase/functions/process-print-job/index.ts`
- `supabase/functions/invalidate-diagnosis-cache/index.ts`
- `supabase/functions/_shared/cache.ts`
- `supabase/functions/_shared/rate-limit.ts`

**Editadas**:
- `supabase/functions/ai-consult/index.ts` (cache + rate limit no início; invalidação após sucesso).
- `supabase/functions/analyze-reviews/index.ts` (cache).
- `supabase/functions/suggest-product-names/index.ts` (cache).
- `supabase/functions/chat-gestor/index.ts` (rate limit).
- `supabase/functions/generate-report-pdf/index.ts` (rate limit).

**Frontend novos**:
- `src/lib/prints/uploadPrintJob.ts`
- `src/components/prints/PrintJobStatus.tsx`

**Frontend editados**:
- `src/pages/app/diagnosis/DiagnosisExpress.tsx` (etapa de print usa nova fila).
- `src/components/dashboard/WeeklyCheckinCard.tsx` (invalida cache após salvar).
- `src/lib/ai/invokeAI.ts` (mensagem 429 amigável).

---

## 7. Não fazer

- Não tocar em `src/integrations/supabase/{client,types}.ts`.
- Não remover `process-print` ou `PrintUploader` legados.
- Sem cache em `chat-gestor`, `process-print*`, `reanalyze-action`.
- Sem retry automático no job de print.
