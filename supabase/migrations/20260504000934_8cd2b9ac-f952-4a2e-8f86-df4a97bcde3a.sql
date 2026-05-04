-- Habilita extensões necessárias para HTTP em triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função que dispara a edge function process-print-job ao criar um print_job
CREATE OR REPLACE FUNCTION public.trigger_process_print()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text := current_setting('app.edge_function_url', true);
  service_key text := current_setting('app.service_role_key', true);
BEGIN
  -- Se a configuração ainda não foi populada neste banco, não falha o INSERT.
  -- O frontend também dispara a function via supabase.functions.invoke como fallback.
  IF fn_url IS NULL OR fn_url = '' OR service_key IS NULL OR service_key = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url || '/process-print-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebrar o INSERT por causa de falha de invocação
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_print_job_created ON public.print_jobs;
CREATE TRIGGER on_print_job_created
  AFTER INSERT ON public.print_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.trigger_process_print();