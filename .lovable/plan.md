## Plano: Adicionar conteúdo "Cozinha de Delivery — Ana Flávia" na Base de Conhecimento RAG

### Resumo
Inserir **~70 chunks** novos em `public.knowledge_base` cobrindo todo o material enviado da entrevista com Ana Flávia (arquiteta de cozinhas para delivery): chunks principais + Q&A + regras práticas + checklists + diagnósticos + exemplos + glossário. Depois gerar embeddings lexicais v1 chamando a edge function `embed-knowledge`. Resultado final: **~247 chunks ativos** na base.

### O que será feito

**1. INSERT idempotente em `public.knowledge_base`** (via tool de inserts de dados)

Metadados comuns a todos os registros:
- `source`: `cozinha-delivery-ana-flavia-2024`
- `source_version`: 1, `chunk_version`: 1, `embedding_version`: 1, `status`: `ativo`
- `tags` base: `{cozinha-delivery, projeto-cozinha, ana-flavia}` + tags específicas
- Idempotência via `WHERE NOT EXISTS` por `chunk_id`
- `content`: consolida resumo + corpo + perguntas que responde + aplicação prática em texto único (otimizado para RAG lexical)

**Distribuição (~70 chunks):**

| Bloco | Prefixo `chunk_id` | Qtd | `area` |
|---|---|---|---|
| Chunks principais (seção 3) | `RAG-COZ-001` … `RAG-COZ-027` | 27 | estrategia, processo, operacao, diagnostico, produto, atendimento, regras, exemplos, cultura, marca, risco, investimento, resultado, erros-comuns |
| Q&A (seção 4) | `RAG-COZ-QA-001` … `RAG-COZ-QA-013` | 13 | `faq` |
| Regras práticas (seção 5) | `RAG-COZ-REG-001` … `RAG-COZ-REG-009` | 9 | `regras` |
| Checklists (seção 6) | `RAG-COZ-CHK-001` … `RAG-COZ-CHK-005` | 5 | `checklists` |
| Diagnósticos (seção 7) | `RAG-COZ-DIA-001` … `RAG-COZ-DIA-005` | 5 | `diagnostico` |
| Exemplos práticos (seção 8) | `RAG-COZ-EX-001` … `RAG-COZ-EX-006` | 6 | `exemplos` |
| Glossário (seção 9) | `RAG-COZ-GLO-001` … `RAG-COZ-GLO-011` | 11 | `glossario` |

Os pontos da seção 10 ("precisam de validação") entram como **ressalvas dentro dos chunks correspondentes** (ex.: o chunk de 35m² recebe nota de que depende de cardápio/equipe/volume), não como chunks independentes — para a IA não tratar como verdade universal.

**2. Geração de embeddings**
- `POST /functions/v1/embed-knowledge` com `{"table": "knowledge_base", "limit": 100}` para popular `embedding` v1 dos novos registros.

**3. Verificação final**
- `SELECT count(*), area` filtrando por `source = 'cozinha-delivery-ana-flavia-2024'`
- Confirmar 100% com `embedding IS NOT NULL` e `status = 'ativo'`
- Reportar a contagem total da base após o insert

### Arquivos afetados
- 1 operação de inserts em `public.knowledge_base` (sem alterar schema)
- 1 chamada one-shot à edge function `embed-knowledge` (sem alterar código)

### Fora do escopo
- Não altero a UI da página **Base de conhecimento** (chunks aparecem automaticamente agrupados por `area`).
- Não troco o RAG lexical v1 por embeddings semânticos.
- Não toco nos 177 chunks já existentes das outras 5 fontes.
