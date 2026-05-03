## Plano: Integrar Aula 4 (Montagem de Cardápio, Concorrência e Alavancagem) ao RAG

Mesmo padrão das Aulas 1, 2 e 3 já integradas. Vou adicionar os chunks da nova aula ao `knowledge_base`, gerar embeddings e validar.

### Conteúdo a ingerir
- **Source:** `aula-ifood-cardapio-concorrencia` (nova)
- **Total estimado:** ~75 entradas
  - 35 chunks RAG (vindos diretos da transcrição: RAG-001 a RAG-035)
  - ~15 FAQ (perguntas explícitas dos chunks → respostas curtas)
  - ~8 regras práticas (categoria de tração com 4–6 produtos, combo precisa de ficha técnica, etc.)
  - ~5 checklists (análise de concorrente, montagem de cardápio para hamburgueria, complementos, lançamento de loja nova, revisão de descrição)
  - ~5 diagnósticos (poucas opções para casal, descrição longa/IA crua, combo somando preços, ticket caindo na escala, ausência de produto isca)
  - ~5 exemplos práticos (estimativa de pedidos por avaliações, estrutura de hamburgueria, "Leve mais e pague menos", combo família com escolha obrigatória, funil 3000 visitas)
  - ~7 termos de glossário (categoria volante, dose dupla, super combo, produto isca, CAC, tração, complemento obrigatório)

### Pontos críticos novos que a IA passará a recomendar
- **Análise de concorrência obrigatória antes de mexer no cardápio** (3–5 concorrentes, simular pedidos em endereços diferentes)
- **Estimativa de volume do concorrente** via avaliações (÷3 = média mensal; representa 10–20% dos pedidos)
- **Primeira e segunda categorias** = área de maior impacto → produtos isca + ofertas + opções para 3 perfis
- **3 perfis de cliente:** solteiro / casal / família — cardápio precisa cobrir os três
- **Categoria de tração com 4–6 produtos** (preferir pares por UX mobile)
- **Categoria volante** reutilizável para datas comemorativas (preserva histórico/algoritmo)
- **Título de produto:** benefício + tipo + sabor + desconto (não só sabor)
- **Descrição curta** + bloco de tags sem hashtag no final (algoritmo não lê símbolos)
- **Combos exigem ficha técnica própria** — nunca somar preços avulsos
- **Bebidas dentro de complemento** em hamburgueria evita pedido só de bebida com taxa grátis
- **Fase nova ≠ lucro máximo:** investir em CAC; depois reduzir benefícios gradualmente
- **Funil de referência:** 3.000 visitas × 10% conversão × R$30 ticket = R$9.000
- **Queda de ticket médio na escala** pode ser saudável (mais clientes novos comprando barato primeiro)

### Pontos marcados como "validar" (não afirmar como verdade absoluta)
- Faixa "10–20% dos clientes avaliam" e "avaliações dos últimos ~90 dias" → marcar como **estimativa do instrutor, varia por loja/categoria**
- Estrutura específica de hamburgueria (oferta da semana → artesanal → trio → super combo → bebida → volante) → marcar como **modelo inicial, adaptar ao nicho**
- Recomendação de bebida só no complemento → marcar como **testar conforme público**

### Passos técnicos
1. Gerar SQL `INSERT` em lote em `public.knowledge_base` (source=`aula-ifood-cardapio-concorrencia`, chunk_id único, area + tags corretas, status=`ativo`)
2. Executar via migration
3. Disparar Edge Function `embed-knowledge` em lotes até 100% com embedding
4. Validar:
   - Total passa de 831 → ~906
   - Todos os novos com `embedding IS NOT NULL` e `embedding_version = 2`
   - Busca semântica retorna chunks novos para queries como:
     - "como montar cardápio de hamburgueria"
     - "estimar vendas do concorrente pelas avaliações"
     - "combo família com complemento obrigatório"
     - "categoria volante datas comemorativas"

Aprovando, executo a ingestão + embeddings e te confirmo o total final.
