# Plano — Ativar RAG semântico real

Hoje `embedTextWithMeta` sempre devolve `mode: "degraded"` com vetores lexicais (FNV hash de palavras). Os 502 chunks da `knowledge_base` estão vetorizados, mas com o **mesmo esquema lexical** — então mesmo "ligando" o gateway, é preciso **reembedar tudo** para que query e índice falem a mesma língua.

A coluna `embedding` é `vector(768)` em `knowledge_base` e `case_library` — combina exatamente com `google/text-embedding-004` do Lovable AI Gateway (768 dims). Sem migration de schema.

---

## Mudanças

### 1. `supabase/functions/_shared/embeddings.ts`
Implementar embedding real via Lovable AI Gateway, com fallback automático para o lexical atual.

- Nova função `embedTextSemantic(text)`: chama `https://ai.gateway.lovable.dev/v1/embeddings` com modelo `google/text-embedding-004` usando `LOVABLE_API_KEY`.
- `embedTextWithMeta` passa a:
  - Tentar semântico primeiro (se `LOVABLE_API_KEY` presente e `RAG_MODE !== "lexical"`).
  - Em sucesso → `{ vector, mode: "full", reason: "text-embedding-004" }`.
  - Em erro (429/402/timeout/dim mismatch) → cai no `embedTextLexical` com `mode: "degraded"` e `reason` explicando ("rate_limited" | "credits_exhausted" | "gateway_error" | "lexical_fallback").
- Cache em memória (Map LRU pequeno, ~200 entradas) por hash do texto, para não pagar embedding 2x na mesma invocação.
- Constante `EMBED_MODEL_VERSION = 2` exportada para gravar em `embedding_version`.

### 2. `supabase/functions/embed-knowledge/index.ts`
Adaptar para reembedar em massa com o novo modelo.

- Aceitar `body.force = true` para reembedar mesmo registros que já têm embedding (filtro por `embedding_version < 2` ao invés de `embedding IS NULL`).
- Após gerar o vetor, gravar `embedding` + `embedding_version = 2`.
- Processar em lotes pequenos (10 por chamada do gateway) com `Promise.all` controlado para evitar 429.
- Retornar contadores: `updated`, `skipped`, `mode_full`, `mode_degraded` para conferir se tudo virou semântico.

### 3. `supabase/functions/_shared/memory.ts`
Pequenos ajustes para tirar proveito do RAG semântico:

- Subir `match_count` padrão de KB para 6 (era 5) já que a precisão melhora.
- Manter os filtros de similaridade (`> 0.5` casos, `> 0.4` knowledge) — com embeddings reais vão filtrar de verdade, não pseudo-ruído.
- Sem mudança de assinatura — `findKnowledgeSnippetsMeta` / `findSimilarCasesMeta` continuam iguais para `ai-consult/index.ts`.

### 4. Migration SQL
Backfill de versão e índice HNSW para acelerar busca:

```sql
-- Marca os 502 chunks atuais como v1 (lexical) para o reembed pegar todos
UPDATE public.knowledge_base SET embedding_version = 1
 WHERE embedding_version IS NULL OR embedding_version = 1;

-- Índice HNSW cosine para busca rápida quando a base crescer
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_hnsw
  ON public.knowledge_base USING hnsw (embedding vector_cosine_ops)
  WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS case_library_embedding_hnsw
  ON public.case_library USING hnsw (embedding vector_cosine_ops)
  WHERE archived_at IS NULL;
```

(`match_knowledge` e `match_cases` já usam `<=>` cosine — nada a alterar nas RPCs.)

### 5. Reembedar os 502 chunks (ação única, pós-deploy)
Após deploy das funções, invocar `embed-knowledge` em loop com `{ table: "knowledge_base", force: true, limit: 50 }` até cobrir todos. Validar com:
```sql
SELECT count(*) FILTER (WHERE embedding_version = 2) AS semantic,
       count(*) FILTER (WHERE embedding_version = 1) AS lexical
  FROM public.knowledge_base WHERE status = 'ativo';
```
Esperado: `semantic = 502, lexical = 0`.

### 6. Observabilidade
- Log `ai_consult.rag` já existe e expõe `rag_mode` — passará a registrar `"full"` quando o gateway responder. Sem mudança no `ai-consult/index.ts`.
- Adicionar log `embeddings.fallback` quando o semântico falhar e cair no lexical, para detectar problema de gateway rapidamente.

---

## Detalhes técnicos

**Endpoint do gateway** (igual ao já usado em `ai-consult` para chat):
```
POST https://ai.gateway.lovable.dev/v1/embeddings
Authorization: Bearer ${LOVABLE_API_KEY}
{ "model": "google/text-embedding-004", "input": "<texto>" }
```
Resposta padrão OpenAI-compatible: `data[0].embedding` = `number[768]`.

**Validação de dimensão**: se `vector.length !== 768`, descarta e cai no fallback (proteção contra trocar de modelo sem reembedar).

**Custo**: 502 chunks × ~300 tokens médios ≈ 150k tokens — embedding é barato, roda em poucos minutos divididos em lotes de 50.

**Rollback**: setar env `RAG_MODE=lexical` força o caminho antigo sem redeploy. Os vetores v1 e v2 não são compatíveis entre si — se precisar voltar, é só rodar `embed-knowledge` apontando para o lexical (a função detecta pelo `mode`).

**Sem mudança em**: `ai-consult/index.ts`, `chat-gestor`, `extract-case` (continuam usando `embedText` que agora é semântico transparente), tipos do Supabase, frontend.

---

## Critério de sucesso

1. `SELECT count(*) FROM knowledge_base WHERE embedding_version = 2 AND status='ativo'` = 502.
2. Próximo `ai-consult` loga `rag_mode: "full"` em vez de `"degraded"`.
3. Busca por "demora na entrega" retorna chunks sobre "tempo de preparo", "atraso", "promessa de entrega" — sinônimos que hoje não casam.
