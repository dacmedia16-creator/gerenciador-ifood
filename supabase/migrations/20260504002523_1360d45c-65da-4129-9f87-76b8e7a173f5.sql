
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- weekly_snapshots: novas colunas
ALTER TABLE public.weekly_snapshots
  ADD COLUMN IF NOT EXISTS avg_ticket numeric,
  ADD COLUMN IF NOT EXISTS estimated_revenue numeric,
  ADD COLUMN IF NOT EXISTS actions_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diagnosis_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL;

-- profiles.plan
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_weekly boolean NOT NULL DEFAULT true,
  whatsapp_weekly boolean NOT NULL DEFAULT false,
  whatsapp_number text,
  weekly_day text NOT NULL DEFAULT 'monday',
  weekly_time text NOT NULL DEFAULT '08:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_all_own ON public.notification_preferences;
CREATE POLICY notification_preferences_all_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS touch_notification_preferences ON public.notification_preferences;
CREATE TRIGGER touch_notification_preferences
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
