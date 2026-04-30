
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#ED5712',
  display_name TEXT,
  tagline TEXT,
  footer_text TEXT,
  summary_tone TEXT NOT NULL DEFAULT 'consultivo',
  kpi_order JSONB NOT NULL DEFAULT '["revenue","orders","ticket","rating"]'::jsonb,
  sections JSONB NOT NULL DEFAULT '[
    {"key":"cover","enabled":true},
    {"key":"summary","enabled":true},
    {"key":"score","enabled":true},
    {"key":"problems","enabled":true},
    {"key":"actions","enabled":true},
    {"key":"questions","enabled":true},
    {"key":"reviews","enabled":false}
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_templates_all_own"
ON public.report_templates
FOR ALL
USING (public.has_store_access(store_id))
WITH CHECK (public.has_store_access(store_id));

CREATE TRIGGER report_templates_touch
BEFORE UPDATE ON public.report_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-logos', 'report-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "report_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-logos');

CREATE POLICY "report_logos_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'report-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "report_logos_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'report-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "report_logos_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'report-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
