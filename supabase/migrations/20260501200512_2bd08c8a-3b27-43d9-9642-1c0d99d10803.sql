-- Marca chunks atuais como v1 (lexical) para que embed-knowledge force=true os pegue
UPDATE public.knowledge_base
   SET embedding_version = 1
 WHERE embedding IS NOT NULL
   AND (embedding_version IS NULL OR embedding_version <= 1);

UPDATE public.case_library
   SET embedding_version = 1
 WHERE embedding IS NOT NULL
   AND (embedding_version IS NULL OR embedding_version <= 1);

-- Índices HNSW (cosine) para busca vetorial rápida quando a base crescer.
-- match_knowledge / match_cases já usam o operador <=> (cosine_distance).
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_hnsw
  ON public.knowledge_base USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS case_library_embedding_hnsw
  ON public.case_library USING hnsw (embedding vector_cosine_ops);