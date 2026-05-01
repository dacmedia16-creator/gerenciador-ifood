-- Bucket privado para imagens geradas pelo Chat Gestor
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

-- Usuários podem ver apenas as imagens dentro da própria pasta {user_id}/
CREATE POLICY "chat_images_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- INSERT/UPDATE/DELETE: apenas service role (edge function) escreve;
-- usuários comuns não fazem upload direto neste bucket.
CREATE POLICY "chat_images_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "chat_images_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);