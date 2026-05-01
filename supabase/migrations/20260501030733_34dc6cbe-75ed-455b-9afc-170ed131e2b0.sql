-- Adiciona coluna images em prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

-- Bucket privado para imagens de prospects
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-images', 'prospect-images', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas: cada usuário só acessa a própria pasta {auth.uid()}/...
CREATE POLICY "prospect_images_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'prospect-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "prospect_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'prospect-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "prospect_images_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'prospect-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "prospect_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'prospect-images' AND auth.uid()::text = (storage.foldername(name))[1]);