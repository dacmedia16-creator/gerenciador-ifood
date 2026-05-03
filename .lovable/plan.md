## Ingestão da Aula 6 — Alavancagem de Loja no iFood

Adicionar nova fonte `aula-ifood-alavancagem-metodo` à `knowledge_base` com o conteúdo da transcrição (algoritmo, configuração, funil, concorrência, operação, recorrência, precificação).

### O que será ingerido

**30 chunks RAG** (RAG-001 a RAG-030) já estruturados na transcrição, mais entradas derivadas para reforçar busca semântica:

| Tipo (`area`) | Qtd estimada | Origem |
|---|---|---|
| `estrategia` | 6 | RAG-001, 003, 009, 018, 021 + síntese pirâmide |
| `algoritmo` | 4 | RAG-002, 005, 011, 025 |
| `configuracao` | 4 | RAG-006, 008, 010 + SEO (RAG-007) |
| `diagnosticos` | 6 | RAG-005, 012, 013, 014, 015, 016 |
| `operacao` | 4 | RAG-011, 022, 023, 024 |
| `concorrencia` | 3 | RAG-018, 019, 020 |
| `precificacao` | 4 | RAG-026, 027, 028, 029 |
| `produto` | 1 | RAG-030 |
| `recorrencia` | 1 | RAG-025 |
| `marketing` | 1 | RAG-007 (SEO) |
| `processo` | 1 | RAG-017 |
| `faq` | ~15 | perguntas-chave de cada chunk |
| `regras` | ~8 | princípios duros (não mexer no cardápio sem diagnóstico, abrir no horário, controlar CMV individual etc.) |
| `checklists` | ~5 | diagnóstico inicial, configuração, funil, concorrência, operação |
| `glossario` | ~10 | limbo de relevância, funil, SEO de loja, CMV individual, taxa grátis, campanha inteligente, pedido mínimo, recorrência, produto isca, ticket médio |
| `exemplos` | ~5 | hamburgueria/categoria lanches, funil 100/50/25/24/12, estimativa por avaliações (600/3meses), equipamentos hamburgueria, margem 10–20% |

**Total esperado: ~78 chunks**, todos com `source = 'aula-ifood-alavancagem-metodo'`, `topic` específico, `tags` com hashtags da transcrição e `chunk_id` único.

### Implementação técnica

1. Script Python em `/tmp/aula6.py` gera o batch SQL com `INSERT INTO knowledge_base (chunk_id, title, area, topic, content, tags, source, status)` para todos os chunks.
2. Executar via `supabase--insert`.
3. Disparar a edge function `embed-knowledge` para gerar embeddings dos novos chunks (modelo Gemini v2, 768 dims — mesmo padrão da KB).
4. Validar: `SELECT COUNT(*) FROM knowledge_base WHERE source = 'aula-ifood-alavancagem-metodo'` + cobertura de embeddings = 100%.

### Padrões mantidos

- Áreas no plural (já normalizadas): `regras`, `diagnosticos`, `exemplos`, `checklists`, `glossario`.
- Sem duplicar conteúdo já presente em `aula-ifood-cardapio-concorrencia` e `aula-ifood-funil` — quando houver sobreposição, o novo chunk traz o ângulo de "alavancagem/algoritmo".
- Tags em snake-case sem acentos para consistência com o restante da KB.

### Resultado esperado pós-ingestão

- KB total: ~1.015 → ~1.093 chunks ativos.
- Nova fonte cobre o "porquê estratégico" (algoritmo, mentalidade, pirâmide de prioridades) que faltava entre as aulas operacionais.
