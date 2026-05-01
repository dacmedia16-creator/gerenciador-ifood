## Objetivo

Permitir rastrear mudanças no conteúdo da base RAG por **aula** (ex: `aula_ifood_v1` → `v2`) e por **chunk** individual (ex: RAG-007 v1 → v2), garantindo que recomendações antigas/superadas não sejam mais usadas pelo Gestor IA, mas continuem auditáveis.

## Modelo de versionamento

Dois níveis, complementares:

1. **Aula (source)**: `source` já existe (`aula_ifood_v1`). Continua sendo o "lote/edição" da aula. Quando rodarmos uma nova versão consolidada da mesma aula, criamos `aula_ifood_v2` (novo `source`).
2. **Chunk**: cada linha ganha `chunk_id` estável (ex: `RAG-007`, `FAQ-003`) + `chunk_version` (smallint, começa em 1) + `status` (`ativo` | `arquivado` | `rascunho`). Edições incrementam `chunk_version` e arquivam a versão anterior em vez de sobrescrever.

Resultado: o histórico fica na tabela (auditável em `/app/knowledge`), mas o RAG só enxerga `status='ativo'`.

## Mudanças no schema (1 migração)

```sql
ALTER TABLE public.knowledge_base
  ADD COLUMN chunk_id text,
  ADD COLUMN chunk_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN supersedes uuid REFERENCES public.knowledge_base(id),
  ADD COLUMN source_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN published_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN archived_at timestamptz;

-- backfill: extrair chunk_id de tags existentes (RAG-001..RAG-020 já estão lá)
UPDATE public.knowledge_base
SET chunk_id = (
  SELECT t FROM unnest(tags) t
  WHERE t ~ '^(RAG|FAQ|CHK|GLO|VAL)-\d+'
  LIMIT 1
)
WHERE chunk_id IS NULL;

-- chunk_id por linha que sobrou (sem prefixo conhecido) = slug do title
UPDATE public.knowledge_base
SET chunk_id = 'KB-' || substr(md5(title), 1, 8)
WHERE chunk_id IS NULL;

-- regra de unicidade: um único registro ativo por (source, chunk_id)
CREATE UNIQUE INDEX kb_active_chunk_uniq
  ON public.knowledge_base (source, chunk_id)
  WHERE status = 'ativo';

CREATE INDEX kb_status_idx ON public.knowledge_base (status);

-- trigger: ao inserir um chunk com supersedes preenchido, marca o anterior como arquivado
CREATE OR REPLACE FUNCTION public.kb_archive_superseded()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.supersedes IS NOT NULL THEN
    UPDATE public.knowledge_base
       SET status = 'arquivado', archived_at = now(), updated_at = now()
     WHERE id = NEW.supersedes AND status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER kb_archive_superseded_trg
  BEFORE INSERT ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.kb_archive_superseded();
```

E atualizar `match_knowledge` para filtrar somente ativos:

```sql
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector, match_count int DEFAULT 5, filter_areas text[] DEFAULT NULL
) RETURNS TABLE(id uuid, area text, title text, content text, similarity double precision, chunk_id text, chunk_version smallint, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT k.id, k.area, k.title, k.content,
         1 - (k.embedding <=> query_embedding) AS similarity,
         k.chunk_id, k.chunk_version, k.source
  FROM public.knowledge_base k
  WHERE k.embedding IS NOT NULL
    AND k.status = 'ativo'
    AND (filter_areas IS NULL OR k.area = ANY(filter_areas))
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Fluxo de atualização de um chunk

Quando reformularmos, por exemplo, RAG-007:

1. `INSERT` nova linha com mesmo `chunk_id='RAG-007'`, `chunk_version = anterior + 1`, `supersedes = id_da_versão_atual`, `source = 'aula_ifood_v1'` (ou `v2`).
2. O trigger arquiva automaticamente a versão antiga (`status='arquivado'`, `archived_at=now()`).
3. Rodar `embed-knowledge` para gerar embedding da nova linha.
4. RAG passa a usar só a nova; a antiga continua na tabela para auditoria.

Para promover uma aula inteira a `v2`: inserir todos os chunks novos com `source='aula_ifood_v2'`, `source_version=2`, e arquivar os de `v1` em lote (`UPDATE ... SET status='arquivado' WHERE source='aula_ifood_v1'`).

## Mudanças de código

- **`supabase/functions/_shared/memory.ts`** — `findKnowledgeSnippets` e `findKnowledgeSnippetsMeta`: passar a expor `chunk_id` e `chunk_version` no retorno (já vêm do RPC) para que `ai-consult` use `chunk_id@vN` como `source_ref` em vez do UUID.
- **`supabase/functions/ai-consult/index.ts`** — usar `chunk_id` como `source_ref` (legível) ao montar `KNOWLEDGE_SNIPPETS`. Mantém compatibilidade aceitando UUID também.
- **`supabase/functions/_shared/validate-diagnosis.ts`** — `validKbIds` passa a ser o conjunto de `chunk_id`s ativos retornados (continua descartando refs inexistentes).
- **`src/pages/app/Knowledge.tsx`** — por padrão lista só `status='ativo'`; adicionar:
  - Toggle "Mostrar versões arquivadas".
  - Badge com `chunk_id` e `vN` ao lado do título.
  - Agrupamento secundário por `source` (ex: "Aula iFood v1") dentro de cada área.

## Validação

```sql
-- todos têm chunk_id após migração
SELECT COUNT(*) FROM knowledge_base WHERE chunk_id IS NULL; -- 0
-- nenhum (source, chunk_id) ativo duplicado
SELECT source, chunk_id, COUNT(*) FROM knowledge_base
 WHERE status='ativo' GROUP BY 1,2 HAVING COUNT(*)>1; -- vazio
-- RAG só vê ativos
SELECT * FROM match_knowledge('{...}'::vector, 5, NULL); -- só status=ativo
```

Teste manual: inserir RAG-007 v2 com `supersedes` da v1 → confirmar que v1 fica `arquivado` e que `/app/knowledge` mostra só a v2 por padrão.

## O que NÃO muda

- `src/integrations/supabase/types.ts`, `client.ts`, `.env` (regenerados automaticamente).
- Conteúdo dos 67 chunks já existentes — só ganham `chunk_id`, `chunk_version=1`, `status='ativo'`, `source_version=1`.
- Embeddings existentes — continuam válidos.
