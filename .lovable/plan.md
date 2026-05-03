## Plano: Integrar Aula 3 (Listas, Cupons e Promoções iFood) ao RAG

Mesmo padrão das Aulas 1 e 2 já integradas. Vou adicionar ~70 chunks da nova aula ao `knowledge_base`, gerar embeddings e validar.

### Conteúdo a ingerir
Fonte: `aula-ifood-listas-cupons` (nova `source`)
Total estimado: **~70 entradas** distribuídas em:

| Categoria | Qtd | Áreas principais |
|---|---|---|
| RAG geral (chunks 1–21) | 21 | promocoes, campanhas, cupons |
| FAQ (15 perguntas) | 15 | faq |
| Regras práticas (9) | 9 | regras |
| Checklists (5) | 5 | checklists |
| Diagnósticos (5) | 5 | diagnosticos |
| Exemplos práticos (5) | 5 | exemplos |
| Glossário (13 termos) | 13 | glossario |

### Áreas/tags-chave novas ou reforçadas
- `promocoes`, `cupons`, `campanha-inteligente`, `campanha-subsidiada`, `campanha-automatizada`, `entrega-gratis`, `cac`, `precificacao`, `pedido-minimo`, `super-restaurante`

### Pontos críticos que a IA deve passar a recomendar
- Sempre checar **investimento da loja vs subsídio iFood** antes de ativar lista
- Tratar **cupom de primeiro cliente como CAC** (não embutir no preço)
- Alertar para **pedido mínimo zerado** em campanha subsidiada
- Recomendar **revisão semanal** de produtos nas listas (trocar baixo ticket por alto)
- Avaliar **plano completo vs básico** da campanha inteligente
- Fórmula do cupom fixo: `valor cupom ÷ média de itens = acréscimo por item`
- Segmentação de entrega grátis (novos / inativos / todos)

### Passos técnicos
1. Gerar script SQL com `INSERT` em lote em `public.knowledge_base` (source=`aula-ifood-listas-cupons`, chunk_id único por entrada, tags + area corretas)
2. Executar via migration
3. Disparar Edge Function `embed-knowledge` em lotes para gerar embeddings vetoriais
4. Validar:
   - Total de linhas passa de 758 → ~828
   - Todas com `embedding IS NOT NULL`
   - Amostra de busca semântica retorna chunks novos para queries como "campanha subsidiada zera pedido mínimo" e "cupom de primeiro cliente CAC"

### Pontos marcados como "validar" (não vou afirmar como verdade absoluta)
Conforme item 10 da fonte: valores de cupons, limite R$500/dia, regras de selo Super Restaurante e disponibilidade de campanhas vão como **"pode variar por loja/período — confirmar no portal"** dentro do conteúdo dos chunks.

Aprovando, executo a ingestão + embeddings e te confirmo o total final.