## Plano: Expandir base RAG com conteúdo complementar do EP10 — Alô Frango

### Resumo
A base já tem 16 chunks `RAG-ALO-001..016` (resumos do episódio). Este plano adiciona **35 novos chunks** com o material estruturado que você acabou de mandar — **Q&A, regras práticas, checklists, diagnósticos, exemplos, glossário** — sob a mesma fonte `alo-frango-ep10-2024`, com prefixos próprios para não colidir com os IDs existentes.

Resultado esperado: base passa de **269 → 304 chunks ativos**, sendo **51 do Alô Frango** no total.

### O que será inserido (35 chunks)

Todos com `source = alo-frango-ep10-2024`, `status = ativo`, tags base `{alo-frango, ep10}` + tags específicas, e `content` consolidando o item completo (texto otimizado para busca lexical do RAG v1).

**Perguntas e respostas (10 chunks)** — `area = exemplos`
| chunk_id | Pergunta |
|---|---|
| RAG-ALO-QA-001 | Principal mudança operacional do Alô Frango |
| RAG-ALO-QA-002 | Por que vender melhor é melhor que vender mais |
| RAG-ALO-QA-003 | O que prejudicava a entrega antes da mudança |
| RAG-ALO-QA-004 | Por que fotos do cardápio são importantes |
| RAG-ALO-QA-005 | Como o Alô Frango aumentou ticket médio |
| RAG-ALO-QA-006 | Erro do João ao tentar diversificar |
| RAG-ALO-QA-007 | O dono deve sair da operação? |
| RAG-ALO-QA-008 | O que fez o Alô Frango crescer após mentorias |
| RAG-ALO-QA-009 | Diferencial do produto |
| RAG-ALO-QA-010 | Planos futuros (expansão / multiculinária) |

**Regras práticas (7 chunks)** — `area = estrategia` / `operacao` / `marketing` / `vendas` / `gestao` / `expansao`
- `RAG-ALO-RG-001` Limite de entregas por motoboy
- `RAG-ALO-RG-002` Cardápio precisa vender visualmente
- `RAG-ALO-RG-003` Ticket médio como prioridade estratégica
- `RAG-ALO-RG-004` Produtos lucrativos precisam de destaque ativo
- `RAG-ALO-RG-005` Não diversificar antes de consolidar
- `RAG-ALO-RG-006` Conhecimento precisa virar ação operacional
- `RAG-ALO-RG-007` Expansão deve replicar cultura e processo

**Checklists (5 chunks)** — `area = checklists`
- `RAG-ALO-CK-001` Revisão de delivery
- `RAG-ALO-CK-002` Cardápio vendedor
- `RAG-ALO-CK-003` Aumento de ticket médio
- `RAG-ALO-CK-004` Antes de abrir outra unidade
- `RAG-ALO-CK-005` Gestão do dono

**Diagnósticos (5 chunks)** — `area = diagnostico`
- `RAG-ALO-DG-001` Muitas reclamações de entrega
- `RAG-ALO-DG-002` Produto bom, vendas abaixo do potencial
- `RAG-ALO-DG-003` Faturamento alto, negócio estagnado
- `RAG-ALO-DG-004` Operação sobrecarregada por excesso de volume
- `RAG-ALO-DG-005` Expansão com risco de perda de padrão

**Exemplos práticos (6 chunks)** — `area = exemplos`
- `RAG-ALO-EX-001` Motoboys com 4–5 entregas
- `RAG-ALO-EX-002` Cardápio profissional sem desejo
- `RAG-ALO-EX-003` Combo frango + 2 linguiças (R$40)
- `RAG-ALO-EX-004` João tirou foco do Alô Frango
- `RAG-ALO-EX-005` Influenciador acelerou demanda
- `RAG-ALO-EX-006` Unidade Maraponga premium e padronizada

**Glossário (8 chunks)** — `area = glossario`
- `RAG-ALO-GL-001` Frango atropelado
- `RAG-ALO-GL-002` Ticket médio
- `RAG-ALO-GL-003` Produto de combate
- `RAG-ALO-GL-004` Roteirização
- `RAG-ALO-GL-005` Valor percebido
- `RAG-ALO-GL-006` Fachada do delivery
- `RAG-ALO-GL-007` Ficha técnica
- `RAG-ALO-GL-008` Multiculinária

### Detalhes técnicos

1. **INSERT idempotente** em `public.knowledge_base` (35 linhas) via `WHERE NOT EXISTS` por `chunk_id`. Sem migração de schema — só dados.
2. **Tags**: cada chunk recebe `{alo-frango, ep10}` + as tags específicas do material (ex.: `#delivery #logistica #operacao`, `#combo #ticketmedio #vendas`, etc.).
3. **Embeddings**: chamar `POST /functions/v1/embed-knowledge` com `{"table":"knowledge_base","limit":100}` para popular o vetor dos 35 novos.
4. **Pontos a validar** (seção 10 do material): NÃO viram chunks isolados (não são heurísticas). Ficam como uma nota num único chunk `RAG-ALO-NOTE-001` (`area = notas`) flagando o que precisa de validação numérica, para a IA evitar afirmar como fato.
   - Total real então: **36 chunks** novos.
5. **Verificação final**: `SELECT count(*) WHERE source = 'alo-frango-ep10-2024'` → esperado **52** (16 + 36); todos `status = 'ativo'` e `embedding IS NOT NULL`.

### Fora do escopo
- Não mexer nos 269 chunks atuais.
- Não alterar UI da página **Base de conhecimento** (vai aparecer agrupado por `area` automaticamente — surgirão novas seções `checklists`, `diagnostico`, `glossario`, `notas`).
- Não trocar o RAG lexical v1 por embeddings semânticos.

### Confirma?
Posso prosseguir com a inserção dos 36 chunks (Q&A + regras + checklists + diagnósticos + exemplos + glossário + nota de validação)?
