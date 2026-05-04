
# Loop semanal de retenção

Boa parte da base já existe: `weekly_snapshots`, `WeeklyCheckinCard` (reavaliação rápida) e `Configuracoes`. Vou completar o que falta sem quebrar o existente.

## 1. Banco de dados

**Migration nova** (não toca no que já existe):

- `weekly_snapshots`: adicionar colunas faltantes (`avg_ticket numeric`, `estimated_revenue numeric`, `actions_completed int default 0`, `diagnosis_id uuid references diagnostics(id)`). A coluna `weekly_revenue` já existente continua para compat.
- `notification_preferences` (nova):
  - `id`, `user_id uuid unique` (referencia `auth.users` via uso por `auth.uid()` — não usar FK para `profiles.id`, segue o padrão do projeto), `email_weekly bool default true`, `whatsapp_weekly bool default false`, `whatsapp_number text`, `weekly_day text default 'monday'`, `weekly_time text default '08:00'`, `created_at`, `updated_at`.
  - RLS ativo, política `ALL` `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
  - Trigger `touch_updated_at` para `updated_at`.
- `profiles`: adicionar `plan text default 'free'` (valores `free | pro | pro_plus`) — necessário para gating do envio. Sem isso não há como filtrar planos.
- Habilitar `pg_cron` e `pg_net` (idempotente).

## 2. Edge functions

### `weekly-snapshot` (cron segunda 07h)
- Itera lojas cujo dono tenha `profiles.plan in ('pro','pro_plus')`.
- Para cada loja: agrega métricas atuais (último `metrics`, score do último `diagnostics`/`reports`), insere `weekly_snapshots` com `week_start = date_trunc('week', now())::date` (upsert por `(store_id, week_start)`).
- Busca snapshot da semana anterior, calcula `score_delta`, `rating_delta`, `cancellation_delta`.
- Carrega top 3 `action_plans` `status='pendente'` ordenadas por `impacto_financeiro desc`.
- Lê `notification_preferences` do usuário (default se inexistente). Só dispara se `email_weekly` ou `whatsapp_weekly` ativos.
- Chama `send-weekly-notification` com payload completo via `supabase.functions.invoke` (fire-and-forget, sem bloquear).

Agendamento: SQL `cron.schedule('weekly-snapshot-monday-7', '0 7 * * 1', $$select net.http_post(...weekly-snapshot...)$$)` aplicado via insert SQL (não migration, pois contém URL/key específicos do projeto).

### `send-weekly-notification`
- Body Zod-validated com o schema da spec.
- E-mail via Resend (`RESEND_API_KEY`): assunto e HTML conforme spec, CTA linkando para `https://gestordelivery.app/app/dashboard`. Footer com link para `/app/configuracoes`. Setas verde/vermelho via cor inline.
- WhatsApp opcional: se `WHATSAPP_API_URL` e `WHATSAPP_API_KEY` setados e `whatsapp_weekly=true` e `whatsapp_number` presente, faz `POST` com texto formatado conforme spec. Se vars ausentes, loga e ignora (não falha o e-mail).
- CORS padrão, `verify_jwt = false` (chamada interna por outra function/cron).

Secrets a pedir antes de implementar: `RESEND_API_KEY`, opcionais `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`. (Confirmar com `add_secret`.)

## 3. Frontend

### `StoreEvolutionChart` (novo, em `src/components/dashboard/StoreEvolutionChart.tsx`)
- Card "Evolução da sua loja" / "Últimas 8 semanas".
- Query: últimas 8 linhas de `weekly_snapshots` por `store_id`, ordenadas asc.
- Recharts `LineChart` com 2 eixos Y: `Score` (esq) e `rating` (dir).
- Tabela abaixo: Semana | Score | Nota | Cancelamento | Ações concluídas (usa `actions_completed`).
- Estado vazio se `< 2` snapshots.
- Inserir no `Dashboard.tsx` perto de `WeekActionsBlock`.

### `WeeklyCheckinCard` (existente)
- Já implementa reavaliação rápida segunda-feira, persiste em `weekly_snapshots`, modal de comparação. Nada a fazer além de garantir que continue compatível com novas colunas (sim — todas opcionais).

### Página `/app/configuracoes` — seção Notificações (estender `Configuracoes.tsx`)
- Novo `Card`:
  - Toggle e-mail semanal, toggle WhatsApp, input condicional WhatsApp com máscara `(11) 99999-9999`, select dia (segunda-sexta), select horário (06–10).
  - Botão "Salvar preferências" → `upsert` em `notification_preferences` por `user_id`.
- Carrega preferências no mount; valores default se ausentes.
- Não mexer no resto da página.

## 4. Detalhes técnicos

- Lazy import já está pronto para `Configuracoes`.
- Toda lógica de envio em edge functions (front só salva preferência e dispara reavaliação manual).
- TS estrito; CORS via `_shared/cors.ts` existente.
- Não bloquear envio se WhatsApp falhar.
- `verify_jwt = false` para `weekly-snapshot` e `send-weekly-notification` em `supabase/config.toml` (segurança via service role e secrets).

## Fora de escopo

- Não alterar `WeeklyCheckinCard`, `ReassessDialog`, `DiagnosisExpress`, fluxo de prints, cache de diagnóstico — todos já existem e funcionam.
- Não criar UI para administrar `plan` (pode ser setado manualmente / fica para outro ciclo).

Após aprovação: vou pedir `RESEND_API_KEY` (e opcionalmente `WHATSAPP_API_URL`/`WHATSAPP_API_KEY`) com `add_secret` antes de codificar as edge functions.
