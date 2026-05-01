## Plano: Adicionar conteúdo "EP 10 — Alô Frango (João Neto e Mirna)" na Base de Conhecimento RAG

### Resumo
Inserir os **16 chunks** (`RAG-001` a `RAG-016`) do episódio sobre o Alô Frango em `public.knowledge_base`, sob nova fonte `alo-frango-ep10-2024`, e gerar embeddings para que a IA passe a usar esse conteúdo nas consultas. Resultado esperado: base sobe de **253 para 269 chunks ativos**.

Como os IDs `RAG-001`..`RAG-016` já existem na base (de outras fontes — cancelamentos iFood etc.), os novos chunks serão inseridos com **prefixo próprio** para evitar colisão: `RAG-ALO-001` a `RAG-ALO-016`.

### O que será feito

**1. INSERT idempotente em `public.knowledge_base`** (16 registros)

Metadados comuns:
- `source`: `alo-frango-ep10-2024`
- `source_version`: 1, `chunk_version`: 1, `embedding_version`: 1, `status`: `ativo`
- `tags` base: `{alo-frango, ep10, frango-assado, casal-empreendedor}` + tags específicas de cada chunk
- `content`: consolida resumo + corpo + perguntas que responde + aplicação prática num único texto otimizado para RAG lexical
- Idempotência via `WHERE NOT EXISTS` por `chunk_id`

Distribuição (mantendo a categorização original do material):

| `chunk_id` | Título | `area` |
|---|---|---|
| RAG-ALO-001 | Vender melhor é mais importante do que vender mais | estrategia |
| RAG-ALO-002 | Limitar entregas por motoboy melhora qualidade | operacao |
| RAG-ALO-003 | Reclamações de entrega afetam saúde emocional da equipe | atendimento |
| RAG-ALO-004 | Cardápio no delivery funciona como fachada da loja | marketing |
| RAG-ALO-005 | Produto, embalagem e entrega trabalham juntos | produto |
| RAG-ALO-006 | Adicionais e combos aumentam ticket médio e margem | vendas |
| RAG-ALO-007 | Produtos de combate devem ser destacados | vendas |
| RAG-ALO-008 | Dono presente na operação em fases críticas | gestao |
| RAG-ALO-009 | Diversificar cedo demais prejudica negócio principal | estrategia |
| RAG-ALO-010 | Conhecimento só gera resultado quando aplicado | execucao |
| RAG-ALO-011 | Origem do Alô Frango: oportunidade local | exemplos |
| RAG-ALO-012 | Receita, preparo e marinada como diferenciais | produto |
| RAG-ALO-013 | Influenciadores e clientes locais aceleram a marca | marketing |
| RAG-ALO-014 | Crescimento sem qualidade de entrega gera perda de clientes | delivery |
| RAG-ALO-015 | Empreender em casal exige alinhamento e propósito | cultura |
| RAG-ALO-016 | Expansão deve preservar cultura, produto e método | expansao |

**2. Gerar embeddings (RAG v1 lexical)**
- `POST /functions/v1/embed-knowledge` com `{"table":"knowledge_base","limit":100}` para popular o vetor `embedding` dos 16 novos registros.

**3. Verificação final**
- `SELECT count(*)` filtrando por `source = 'alo-frango-ep10-2024'` para confirmar 16 registros, todos com `status='ativo'` e `embedding IS NOT NULL`.
- Reportar contagem total final da base.

### Fora do escopo
- Não alterar UI da página **Base de conhecimento** (chunks aparecem automaticamente agrupados por `area`).
- Não tocar nos 253 chunks existentes.
- Não trocar o RAG lexical v1 por embeddings semânticos.

### Confirma?
Posso prosseguir com a inserção dos 16 chunks do Alô Frango?
