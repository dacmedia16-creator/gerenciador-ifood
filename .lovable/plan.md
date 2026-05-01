## Objetivo

Alimentar a base de conhecimento (RAG) do Gestor IA com os 20 chunks da aula prática de otimização de loja no iFood, para que o Gestor IA passe a citar essas heurísticas como fonte ao gerar diagnósticos e recomendações.

## Onde os dados serão inseridos

Tabela `knowledge_base` (já usada pela função `match_knowledge` e por `findKnowledgeSnippets` em `ai-consult`). Hoje ela tem 12 entradas seed (1 por área); vamos adicionar 20 novas entradas, mantendo o padrão existente.

Mapeamento de cada chunk para colunas:
- `area` → área canônica em snake_case (ver mapeamento abaixo)
- `topic` → subtema curto
- `title` → título do chunk
- `content` → "Resumo" + "Conteúdo" + "Aplicação prática" concatenados (texto corrido em PT-BR, é o que o RAG vai indexar)
- `tags` → array com palavras-chave + tags do chunk + ID do chunk (ex: `RAG-001`) para rastreio
- `source` → `aula_ifood_v1` (em vez do default `manual`), para conseguirmos filtrar/atualizar no futuro
- `embedding` → preenchido por uma chamada à edge function `embed-knowledge` logo após o insert

Mapeamento area por chunk:

```text
RAG-001 metricas         RAG-011 cardapio
RAG-002 horarios         RAG-012 cardapio
RAG-003 operacao         RAG-013 cardapio
RAG-004 cancelamentos    RAG-014 promocoes
RAG-005 reputacao        RAG-015 categoria
RAG-006 atendimento      RAG-016 conversao
RAG-007 conversao        RAG-017 entrega
RAG-008 visibilidade     RAG-018 entrega
RAG-009 cardapio         RAG-019 promocoes
RAG-010 conversao        RAG-020 promocoes
```

Áreas novas que serão criadas (não existem hoje na tabela): `metricas`, `horarios`, `operacao`, `reputacao`, `visibilidade`, `categoria`, `entrega`, `promocoes`. Isso é seguro: `area` é apenas `text` livre, não enum, e `match_knowledge` aceita filtro opcional por área (NULL = todas), então o RAG continuará funcionando sem mudanças de código.

## Passos

1. Criar uma migração SQL que faz `INSERT INTO public.knowledge_base (area, topic, title, content, tags, source) VALUES (...)` com os 20 registros, usando `source = 'aula_ifood_v1'` e `ON CONFLICT DO NOTHING` numa chave lógica (title + source) para tornar reexecutável.
   - Como não há unique constraint hoje, a migração começa com `CREATE UNIQUE INDEX IF NOT EXISTS knowledge_base_title_source_uniq ON public.knowledge_base (title, source);` para suportar o `ON CONFLICT`.

2. Após a migração, gerar embeddings invocando a edge function existente `embed-knowledge` com `{ "table": "knowledge_base", "limit": 50 }`. Ela já varre linhas com `embedding IS NULL`, calcula o vetor lexical (RAG v1) e atualiza a coluna. Nenhum código novo de função é necessário.

3. Validar com:
   - `SELECT area, COUNT(*) FROM knowledge_base WHERE source='aula_ifood_v1' GROUP BY area;` → confirma 20 inseridos
   - `SELECT COUNT(*) FROM knowledge_base WHERE source='aula_ifood_v1' AND embedding IS NULL;` → deve ser 0
   - Chamar `match_knowledge` com a query "como aumentar ticket médio com complementos" para confirmar que RAG-011 aparece no topo.

## O que NÃO muda

- Nenhuma alteração em `src/integrations/supabase/types.ts`, `client.ts` ou `.env`.
- Nenhuma alteração em `ai-consult` ou em `_shared/memory.ts` — eles já consomem `knowledge_base` automaticamente.
- Nenhum componente de UI muda. A página `src/pages/app/Knowledge.tsx` (Base de conhecimento) já lista tudo da tabela, então os 20 novos itens aparecem automaticamente, agrupados por área, com tags e busca.

## Detalhes técnicos

- O embedding atual é lexical (RAG v1, ver `supabase/functions/_shared/embeddings.ts`). Ele indexa por sobreposição de palavras-chave; por isso o `content` será escrito em PT-BR sem jargão e os `tags` repetirão as palavras-chave principais para reforçar o casamento. Quando migrarmos para embeddings semânticos reais, basta rodar `embed-knowledge` de novo com `embedding_version` incrementado — sem reescrever os chunks.
- O campo `tags` armazenará também o `RAG-XXX` ID para conseguirmos atualizar/remover por chunk via `WHERE 'RAG-007' = ANY(tags)`.
- Tamanho estimado por chunk: ~1.5–2.5 KB de texto em `content`. Total ~40 KB — irrelevante para a tabela.

## Riscos / mitigação

- **Áreas novas**: `Knowledge.tsx` agrupa por `area` dinamicamente; novas áreas só viram novos cabeçalhos. Sem risco.
- **Reexecução da migração**: o índice único `(title, source)` + `ON CONFLICT DO NOTHING` tornam idempotente.
- **embed-knowledge falhar**: a função é tolerante (loga e continua); rodá-la novamente reprocessa os pendentes.

## Entregável final

- 1 migração SQL com índice único + 20 inserts.
- 1 invocação de `embed-knowledge` para popular os vetores.
- Validação por SQL e via UI em `/app/knowledge`.