-- ai_cache
CREATE TABLE public.ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash text NOT NULL UNIQUE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  cache_type text NOT NULL,
  response jsonb NOT NULL,
  model text NOT NULL,
  tokens_used int,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count int NOT NULL DEFAULT 0
);
CREATE INDEX ai_cache_hash_idx ON public.ai_cache(input_hash);
CREATE INDEX ai_cache_expires_idx ON public.ai_cache(expires_at);
CREATE INDEX ai_cache_store_type_idx ON public.ai_cache(store_id, cache_type);
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
-- sem policies: somente service_role acessa

-- print_jobs
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  diagnosis_session_id uuid REFERENCES public.diagnosis_sessions(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY print_jobs_select_own ON public.print_jobs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY print_jobs_insert_own ON public.print_jobs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY print_jobs_update_own ON public.print_jobs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE INDEX print_jobs_status_idx ON public.print_jobs(status, created_at);
CREATE INDEX print_jobs_store_idx ON public.print_jobs(store_id);
CREATE INDEX print_jobs_user_idx ON public.print_jobs(user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;

CREATE TRIGGER print_jobs_touch
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- rate_limits
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  UNIQUE (user_id, action, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- sem policies: somente service_role

CREATE OR REPLACE FUNCTION public.increment_rate_limit(_user uuid, _action text, _window timestamptz)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.rate_limits(user_id, action, window_start, count)
  VALUES (_user, _action, _window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count;
$$;

-- bucket prints
INSERT INTO storage.buckets(id, name, public)
VALUES ('prints', 'prints', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "prints_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'prints' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "prints_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prints' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "prints_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'prints' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "prints_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'prints' AND auth.uid()::text = (storage.foldername(name))[1]);