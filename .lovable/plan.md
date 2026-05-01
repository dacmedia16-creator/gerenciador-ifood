## Objetivo

Validar a qualidade da base RAG completa (**614 chunks ativos, 12 fontes, embeddings Gemini v2**) executando uma bateria de perguntas que exercite cada fonte e as principais áreas de conhecimento.

## Cobertura atual da base

| Fonte | Chunks |
|---|---|
| entrevista_camila_blanco_pastelia | 80 |
| cozinha-delivery-ana-flavia-2024 | 76 |
| conta-ai-joao-3lojas-2024 | 71 |
| analise-loja-ifood-visao-cliente-2024 | 64 |
| alo-frango-ep10-2024 | 58 |
| fala-parceiro-ep05-precificacao-2024 | 58 |
| embalagens-delivery-2024 | 56 |
| aula_ifood_v1 | 55 |
| fala-parceiro-ep06-promocoes-2024 | 54 |
| maikon_rangel_just_burger | 20 |
| manual | 12 |
| ifood-cancelamentos-2024 | 10 |

## Plano de execução

### 1. Teste de recuperação semântica direta (SQL)
Para cada uma das 12 fontes, executar 1 pergunta-âncora via `match_knowledge` (RPC vetorial) e verificar se o top-1 vem da fonte esperada. Mede precisão de recall por fonte.

### 2. Teste end-to-end via `chat-gestor`
Disparar 12 perguntas reais, uma por área-tema, simulando o usuário no app:

| # | Pergunta | Fonte esperada |
|---|---|---|
| 1 | Qual CMV ideal para delivery? | ep05-precificacao |
| 2 | Como criar combos que vendem mais? | ep06-promocoes |
| 3 | Como reduzir cancelamentos no iFood? | ifood-cancelamentos |
| 4 | Que embalagem usar para hambúrguer delivery? | embalagens-delivery |
| 5 | Como a Camila escalou a Pastelia? | camila_blanco_pastelia |
| 6 | Como organizar cozinha de dark kitchen? | cozinha-delivery-ana-flavia |
| 7 | Como gerenciar 3 lojas no iFood? | conta-ai-joao-3lojas |
| 8 | O que avaliar na visão do cliente no app? | analise-loja-ifood |
| 9 | Estratégias do Aló Frango para crescer? | alo-frango-ep10 |
| 10 | Como o Maikon estruturou o Just Burger? | maikon_rangel_just_burger |
| 11 | Boas práticas básicas de iFood? | aula_ifood_v1 |
| 12 | Como precificar produto isca? | manual / ep05 |

### 3. Teste de áreas críticas
3 perguntas cruzando áreas (precificacao + promocoes + cancelamentos) para validar que o retrieval combina chunks de fontes diferentes quando a dúvida é multi-tópico.

### 4. Métricas coletadas
- **has_context**: se o RAG trouxe chunks (log `chat_gestor.rag`)
- **elapsed_ms** do retrieval
- **fonte do top-1** vs fonte esperada
- **qualidade da resposta**: a IA cita a fonte corretamente e responde em PT-BR direto

### 5. Relatório final
Tabela consolidada com:
- ✅/⚠️/❌ por pergunta
- Latência média de RAG
- Fontes sub-utilizadas (que nunca apareceram no top-3)
- Recomendações (se houver chunks "órfãos" sem recall)

## Detalhes técnicos

- Usar `supabase--curl_edge_functions` em `/chat-gestor` com sessão autenticada
- Usar `supabase--read_query` com `SELECT ... FROM knowledge_base ORDER BY embedding <=> query_embedding` para teste de recall puro (gerando embedding da query via função `embed-knowledge` ou aproximação por título)
- Inspecionar `supabase--edge_function_logs` (`chat-gestor`) para capturar `evt: chat_gestor.rag`
- Nenhuma alteração de schema ou código — somente leitura e invocações

## Entregável

Resposta no chat com a tabela de resultados das 15 perguntas (12 por fonte + 3 cruzadas), latências e diagnóstico final da saúde da base RAG.
