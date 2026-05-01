
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS chunk_id text,
  ADD COLUMN IF NOT EXISTS chunk_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS supersedes uuid REFERENCES public.knowledge_base(id),
  ADD COLUMN IF NOT EXISTS source_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.knowledge_base
  DROP CONSTRAINT IF EXISTS knowledge_base_status_check;
ALTER TABLE public.knowledge_base
  ADD CONSTRAINT knowledge_base_status_check
  CHECK (status IN ('ativo','arquivado','rascunho'));

-- Backfill chunk_id a partir de tags conhecidas
UPDATE public.knowledge_base
SET chunk_id = sub.t
FROM (
  SELECT k.id, t
  FROM public.knowledge_base k,
       LATERAL unnest(k.tags) t
  WHERE t ~ '^(RAG|FAQ|CHK|GLO|VAL)-[0-9]+'
) sub
WHERE knowledge_base.id = sub.id
  AND knowledge_base.chunk_id IS NULL;

-- Restante: gerar a partir de hash do title (estável)
UPDATE public.knowledge_base
SET chunk_id = 'KB-' || substr(md5(title), 1, 8)
WHERE chunk_id IS NULL;

ALTER TABLE public.knowledge_base
  ALTER COLUMN chunk_id SET NOT NULL;

-- Unicidade: 1 registro ativo por (source, chunk_id)
DROP INDEX IF EXISTS public.kb_active_chunk_uniq;
CREATE UNIQUE INDEX kb_active_chunk_uniq
  ON public.knowledge_base (source, chunk_id)
  WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS kb_status_idx ON public.knowledge_base (status);
CREATE INDEX IF NOT EXISTS kb_chunk_id_idx ON public.knowledge_base (chunk_id);

-- Trigger: arquiva automaticamente o registro anterior
CREATE OR REPLACE FUNCTION public.kb_archive_superseded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.supersedes IS NOT NULL THEN
    UPDATE public.knowledge_base
       SET status = 'arquivado',
           archived_at = now(),
           updated_at = now()
     WHERE id = NEW.supersedes
       AND status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kb_archive_superseded_trg ON public.knowledge_base;
CREATE TRIGGER kb_archive_superseded_trg
  BEFORE INSERT ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.kb_archive_superseded();

-- match_knowledge: filtrar apenas ativos + expor versionamento
DROP FUNCTION IF EXISTS public.match_knowledge(vector, integer, text[]);
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector,
  match_count integer DEFAULT 5,
  filter_areas text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  area text,
  title text,
  content text,
  similarity double precision,
  chunk_id text,
  chunk_version smallint,
  source text,
  source_version smallint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT k.id, k.area, k.title, k.content,
         1 - (k.embedding <=> query_embedding) AS similarity,
         k.chunk_id, k.chunk_version, k.source, k.source_version
  FROM public.knowledge_base k
  WHERE k.embedding IS NOT NULL
    AND k.status = 'ativo'
    AND (filter_areas IS NULL OR k.area = ANY(filter_areas))
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
