## Adicionar 20 chunks de conhecimento "Just Burger / Maikon Rangel"

### Conclusão da análise

Comparei os 20 chunks com os 67 já existentes na `knowledge_base`. Tudo é **relevante e novo** — a base atual é tática (iFood, cardápio, métricas) e o material novo é estratégico (marca, embalagem, pessoas, cultura). **Não há duplicação** de conteúdo. Recomendo importar os 20.

### Conflito a resolver: colisão de IDs

Os IDs propostos (`RAG-001`…`RAG-020`) **já existem** na base com conteúdo completamente diferente (ex.: o `RAG-007` atual é "Funil de vendas do cardápio", não "Teste de produto em delivery"). Sobrescrever quebraria referências históricas em `recommendation_history.source_ref` e nos diagnósticos já gerados.

**Solução**: usar um prefixo de fonte. Os novos chunks entram como `JB-001`…`JB-020` (JB = Just Burger). Mantém rastreabilidade da origem e evita colisão.

### Mapeamento de área (alinhado com áreas já usadas na base)

| ID novo | Título resumido | Área |
|---|---|---|
| JB-001 | Embalagem como diferencial | embalagem |
| JB-002 | Recorrência | recompra |
| JB-003 | Dono na frente do conteúdo | marketing |
| JB-004 | iFood como acelerador | estrategia |
| JB-005 | Nome de marca | branding |
| JB-006 | Detalhismo na experiência | experiencia |
| JB-007 | Testar produto em delivery real | produto |
| JB-008 | Benchmarking local | concorrencia |
| JB-009 | Cultura operacional | pessoas |
| JB-010 | Padrão sem o dono | operacao |
| JB-011 | Foco em solução | gestao |
| JB-012 | Onboarding | pessoas |
| JB-013 | Treinadores fixos | pessoas |
| JB-014 | Treino antes de expandir | expansao |
| JB-015 | Promoção interna | pessoas |
| JB-016 | Remuneração justa | pessoas |
| JB-017 | Transparência em crise | lideranca |
| JB-018 | Ambiente saudável | pessoas |
| JB-019 | Marca vs brand | branding |
| JB-020 | Limpeza e organização | operacao |

### Como vou inserir

1. **Insert SQL único** em `knowledge_base` com os 20 registros:
   - `chunk_id` = `JB-001`..`JB-020`
   - `chunk_version = 1`, `source_version = 1`, `embedding_version = 1`
   - `source = 'maikon_rangel_just_burger'`
   - `status = 'ativo'`
   - `tags` = tags do material + `#just-burger`
   - `content` = título + resumo + conteúdo + aplicação prática + perguntas que responde (formato amigável para retrieval lexical, que é o RAG v1 atual)
   - `embedding = NULL` (a função `match_knowledge` filtra por `embedding IS NOT NULL`, então **eles não vão para o RAG por similaridade ainda** — só ficam visíveis na página de Base de Conhecimento até serem embeddados).

2. **Disparar embedding**: chamar a edge function `embed-knowledge` (já existe no projeto) para gerar embeddings dos 20 novos. Sem isso, eles não entram nas recomendações da IA.

3. **Listar na UI**: a página `Knowledge.tsx` já lê de `knowledge_base` ordenada por `chunk_id` — vão aparecer automaticamente.

### Bug paralelo (corrigir junto, em silêncio)

Há erro runtime "Cannot read properties of null (reading 'rating')" — provavelmente em `useStoreData` quando uma loja sem dados completos é selecionada. Verifico e corrijo no Dashboard/StoreOverview enquanto faço a importação.

### Risco

Zero para dados existentes (não toca nos 67 chunks atuais nem nos `RAG-*`). O único efeito visível imediato é 20 novos itens em "Base de conhecimento". Eles começam a influenciar diagnósticos depois que o `embed-knowledge` rodar.

Posso executar?