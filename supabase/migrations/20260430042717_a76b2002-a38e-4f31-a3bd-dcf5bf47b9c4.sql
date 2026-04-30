
REVOKE EXECUTE ON FUNCTION public.has_store_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

UPDATE storage.buckets SET public = false WHERE id = 'report-logos';

DROP POLICY IF EXISTS "Public read report-logos" ON storage.objects;
DROP POLICY IF EXISTS "report-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view report-logos" ON storage.objects;
DROP POLICY IF EXISTS "report_logos_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "report_logos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "report_logos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "report_logos_owner_delete" ON storage.objects;

CREATE POLICY "report_logos_owner_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'report-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "report_logos_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "report_logos_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'report-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "report_logos_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'report-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;
