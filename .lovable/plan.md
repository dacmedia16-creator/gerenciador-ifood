## Goal
Add a new knowledge source `analise-loja-ifood-visao-cliente-2024` to the `public.knowledge_base` table, covering store analysis from the customer's perspective (capa, logo, nome, fotos, descrições, embalagens, nomes de produtos, ingredientes de rejeição).

## Scope
Insert ~52 new chunks across the standard categories used in prior sources, then generate embeddings and verify.

### Chunks breakdown
- **Knowledge chunks (RAG-ALC-001..017)** — 17 chunks from section 3 (capa, branding, nome, fotos, embalagens, IA, nomes de produtos, ingredientes de rejeição, visão do cliente).
- **Q&A (RAG-ALC-QA-001..012)** — 12 chunks from section 4.
- **Practical Rules (RAG-ALC-RG-001..008)** — 8 chunks from section 5.
- **Checklists (RAG-ALC-CK-001..004)** — 4 checklists (análise da loja, fotos, nomes, descrições).
- **Diagnostics (RAG-ALC-DG-001..004)** — 4 diagnostics (baixa conversão, cliente não entende, muitos cliques poucas vendas, perda de confiança).
- **Examples (RAG-ALC-EX-001..008)** — 8 practical examples.
- **Glossary (RAG-ALC-GL-001..010)** — 10 glossary terms.
- **Validation note (RAG-ALC-NOTE-001)** — 1 chunk instructing the AI to treat citations (iFood Decola course, sustainable packaging survey, color psychology) as references rather than verified facts.

Total: ~64 chunks.

## Steps

1. **Create migration** with idempotent `INSERT ... ON CONFLICT (chunk_id) DO NOTHING` for all chunks into `public.knowledge_base`.
   - `source = 'analise-loja-ifood-visao-cliente-2024'`
   - `area` mapped per category (marketing, branding, cardapio, fotos, embalagem, copywriting, diagnostico, glossario, etc.)
   - `tags` populated from each chunk's tags
   - `status = 'ativo'`, `source_version = 1`, `chunk_version = 1`
2. **Trigger embedding generation** by calling the existing edge function `POST /functions/v1/embed-knowledge` to vectorize the new rows.
3. **Verify** with `supabase--read_query`:
   - Count of inserted chunks for the new source
   - All new chunks have non-null `embedding`
   - New global active total

## Out of scope
- No UI changes
- No schema changes
- No edits to existing chunks from other sources
