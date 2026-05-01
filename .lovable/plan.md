# Adicionar episódio "Fala Parceiro #6 — Promoções e Vendas no iFood" à base RAG

## Objetivo
Incorporar todo o material da transcrição (chunks RAG-001 a RAG-015, FAQs, regras práticas, checklists, diagnósticos, exemplos e glossário) na tabela `knowledge_base`, gerando embeddings semânticos com Gemini para que a IA consultiva (chat-gestor, ai-consult, ai-diagnose) passe a recuperar esse conhecimento em respostas, diagnósticos e recomendações.

## Fonte e versionamento
- `source`: `fala-parceiro-ep06-promocoes-2024`
- `source_version`: 1
- `chunk_version`: 1
- `embedding_version`: 0 na inserção → atualizado para 2 pela função `embed-knowledge`
- `status`: `ativo`
- Prefixo de `chunk_id`: `RAG-FP06-...` (segue o padrão das outras fontes como `RAG-CAJ-...`)

## Mapa de chunks a inserir (≈ 60 registros)

### 1. Conhecimento principal (15 chunks — áreas variadas)
Mapeamento direto dos chunks RAG-001 a RAG-015 da transcrição para `area` existente na base:

| chunk_id | area | título curto |
|---|---|---|
| RAG-FP06-001 | estrategia | iFood cresce junto com o parceiro |
| RAG-FP06-002 | operacao | Constância na plataforma aumenta vendas |
| RAG-FP06-003 | vendas | Campanha inteligente para novos clientes |
| RAG-FP06-004 | vendas | Frete grátis aumenta conversão |
| RAG-FP06-005 | estrategia | Precificação que sustenta promoção |
| RAG-FP06-006 | diagnostico | Nota, cancelamento e tempo afetam ranking |
| RAG-FP06-007 | cardapio | Cardápio atrativo converte visita em pedido |
| RAG-FP06-008 | cardapio | Não alterar best sellers sem necessidade |
| RAG-FP06-009 | marketing | Anúncio dá visibilidade, não garante venda |
| RAG-FP06-010 | estrategia | Datas sazonais geram picos relevantes |
| RAG-FP06-011 | vendas | Pós-feriado é oportunidade de demanda |
| RAG-FP06-012 | operacao | Preparação operacional em datas de pico |
| RAG-FP06-013 | vendas | Cupom para novo cliente reduz barreira |
| RAG-FP06-014 | atendimento | Experiência completa determina recompra |
| RAG-FP06-015 | diagnostico | Métricas do Portal do Parceiro |

### 2. Perguntas e respostas (9 chunks)
- area: `qa` / `faq`
- chunk_ids: `RAG-FP06-QA-001` a `RAG-FP06-QA-009`
- Cobrem: interesse do iFood, campanha inteligente, frete grátis, visita sem pedido, anúncio, indicadores, alterar cardápio, datas sazonais, preparo para pico.

### 3. Regras práticas (6 chunks)
- area: `estrategia` / `checklist`
- chunk_ids: `RAG-FP06-RP-001` a `RAG-FP06-RP-006`
- Cobrem: diagnosticar antes de culpar plataforma, arrumar cardápio antes de anunciar, promoção dentro da precificação, controlar nota/cancelamento antes de buscar demanda, não mexer em best seller, preparar datas sazonais.

### 4. Checklists (5 chunks)
- area: `checklists`
- chunk_ids: `RAG-FP06-CK-001` a `RAG-FP06-CK-005`
- Itens: diagnóstico de loja sem vendas, cardápio atrativo, preparação para data sazonal, anúncios patrocinados, experiência do cliente.

### 5. Diagnósticos guiados (4 chunks)
- area: `diagnostico`
- chunk_ids: `RAG-FP06-DG-001` a `RAG-FP06-DG-004`
- Cobrem: visitas sem conversão, queda de nota, campanhas sem resultado, alta demanda em data sazonal causando atraso.

### 6. Exemplos práticos (5 chunks)
- area: `exemplos`
- chunk_ids: `RAG-FP06-EX-001` a `RAG-FP06-EX-005`
- Cobrem: Recoba na pandemia, frete grátis com preço ajustado, queda de nota por mudança operacional, combo de Dia dos Namorados, Natal/Ano Novo.

### 7. Glossário (10 chunks)
- area: `glossario`
- chunk_ids: `RAG-FP06-GL-001` a `RAG-FP06-GL-010`
- Termos: campanha inteligente, frete grátis, desconto em item, anúncio patrocinado, conversão, taxa de cancelamento, nota da loja, mise en place, best seller, listas promocionais.

## Conteúdo dos chunks
Cada `content` será composto pelo resumo + corpo + aplicação prática + tags (formato similar aos chunks já existentes, p. ex. `RAG-CAJ-*`), preservando palavras-chave em português para reforçar a busca semântica e híbrida.

## Etapas de execução

1. **Migração de dados** (insert tool, sem alterar schema):
   - `INSERT INTO knowledge_base (chunk_id, area, title, content, source, source_version, chunk_version, embedding_version, status, tags, topic)` para os ~60 chunks. `embedding_version = 0` para ficarem na fila do `embed-knowledge`.

2. **Embeddings semânticos**:
   - Invocar a edge function `embed-knowledge` para a fonte `fala-parceiro-ep06-promocoes-2024`. Ela já chama o Gemini (`gemini-embedding-001`, 768d) e marca `embedding_version = 2`.
   - Validar via `match_knowledge` com queries-amostra ("frete grátis vale a pena", "minha loja tem visitas mas não vende", "como preparar para o Dia do Hambúrguer") confirmando que os novos chunks aparecem no top-K.

3. **Verificação**:
   - `SELECT count(*) FROM knowledge_base WHERE source='fala-parceiro-ep06-promocoes-2024' AND embedding_version=2;` deve retornar o total inserido.
   - Conferir que o índice HNSW (`knowledge_base_embedding_hnsw`) está sendo usado nas buscas.

## Detalhes técnicos
- Sem mudança de schema: tabela `knowledge_base` já comporta todos os campos.
- Sem mudança nas edge functions: `embed-knowledge` já lida com fontes novas via filtro por `source`.
- Sem mudança no front-end: o conteúdo passa a ser usado automaticamente por `chat-gestor`, `ai-consult` e `ai-diagnose` via `_shared/memory.ts` (modo semântico v2).
- O conteúdo respeita as áreas existentes (`estrategia`, `operacao`, `vendas`, `cardapio`, `marketing`, `diagnostico`, `atendimento`, `qa`, `checklists`, `exemplos`, `glossario`) — sem criar áreas novas.

## Itens marcados como "a validar" pela transcrição
Os pontos da seção 10 (valores de subsídio, % de pedidos com frete grátis, regras do selo Super, etc.) **não** entrarão como afirmações na base. Serão omitidos para evitar que a IA repita números sem fonte oficial. Caso queira incluí-los como contexto de cautela, posso adicionar 1 chunk em `area: a_validar` listando esses pontos como "informações que dependem de consulta ao Portal do Parceiro".

## Resultado esperado
Após aprovação, a IA passará a:
- Citar boas práticas de promoções, frete grátis, campanha inteligente, cupons e datas sazonais com base em fonte real.
- Diagnosticar lojas com "visitas sem conversão" usando o framework do episódio.
- Sugerir checklist operacional para datas de pico (Dia do Hambúrguer, Dia dos Namorados, Natal).
- Explicar por que não se deve trocar best sellers, e como precificar antes de promover.
