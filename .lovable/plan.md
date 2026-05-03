## Plano: Integrar Aula 5 (Cupons, CAC, Taxa Grátis, Produto Isca e Alavancagem) ao RAG

Mesmo padrão das Aulas 1–4. Vou adicionar os chunks desta aula ao `knowledge_base`, gerar embeddings e validar.

### Observação importante sobre sobreposição

O source existente `aula-ifood-listas-cupons` (73 chunks) já cobre parte deste conteúdo (campanha inteligente, subsidiada, cupom de primeiro cliente, CAC básico, plano completo vs básico, entrega grátis segmentada). Esta nova aula traz:

- **Conteúdo já coberto** (vou ingerir mesmo assim como reforço/perspectiva diferente, em source separado, para o RAG ter mais "ângulos" de recuperação): tipos de cupons, campanha inteligente, cupom recorrente, primeiro cliente, Clube iFood, CAC 5%, plano básico vs completo.
- **Conteúdo novo / mais detalhado** (principal valor agregado):
  - **Fórmula de taxa grátis:** custo médio de entrega ÷ média de itens por venda
  - **Cálculo de média de itens por venda** (excluindo bebidas)
  - **Produto isca precificado para suportar campanhas** (cachorro-quente CMV R$3,80 cadastrado a R$22,90)
  - **Caso hamburgueria:** ticket R$53 → R$28 → R$32 com faturamento subindo
  - **Cupons do Clube iFood (25% off até R$10 / R$20)** como alavanca de recorrência
  - **Taxa de entrega flexível** como ferramenta de CAC (raio ampliado só para novos clientes)
  - **Fidelização dentro das regras:** bilhete, mimo, overdelivery, agradecimento via chat, **não pedir telefone, não tirar cliente da plataforma**
  - **Anúncios iFood:** bons para branding, fracos para conversão direta vs cupom de CAC
  - **R$308 bruto → R$107 líquido** como exemplo de alerta (>50% de desconto líquido)
  - **Não copiar preço de concorrente sem números** (concorrente pode estar errado)

### Conteúdo a ingerir
- **Source:** `aula-ifood-cupons-cac-alavancagem` (nova)
- **Total estimado:** ~85 entradas
  - 30 chunks RAG (RAG-001 a RAG-030 da transcrição)
  - 15 FAQ
  - 8 regras práticas
  - 5 checklists (cupons, campanha inteligente, taxa grátis, produto isca, fidelização)
  - 5 diagnósticos (líquido baixo, ticket alto sem volume, campanha inteligente ruim, novos não voltam, guerra de preço)
  - 5 exemplos (hamburgueria, cachorro-quente, R$308→R$107, fórmula taxa grátis, bilhete+mimo)
  - 13 termos de glossário (CAC, cupom recorrente, primeiro cliente, Clube iFood, campanha inteligente, subsidiada, taxa grátis, taxa flexível, produto isca, CMV, ticket médio, média de itens por venda, overdelivery)
  - ~4 chunks de "validação" (cupons R$15/R$30, limite R$2.500, disponibilidade Clube iFood, anúncios variam)

### Marcações de cautela (não afirmar como verdade absoluta)
- Cupons de R$15 e R$30 de primeiro cliente → **possivelmente descontinuados, validar no painel**
- Limite R$2.500 da campanha inteligente → **varia por loja, conferir no painel**
- 5% de faturamento para CAC → **diretriz inicial, ajustar à realidade**
- Disponibilidade Clube iFood → **varia por loja/região/categoria**
- Performance de anúncios → **caso a caso**

### Passos técnicos
1. Gerar SQL `INSERT` em lote em `public.knowledge_base` (source=`aula-ifood-cupons-cac-alavancagem`, chunk_id único, area + tags coerentes com convenção existente, status=`ativo`).
2. Executar via tool de insert.
3. Disparar Edge Function `embed-knowledge` em lotes até 100% com embedding (versão 2, gemini-embedding-001).
4. Validar:
   - Total passa de 930 → ~1015
   - Todos os novos com `embedding IS NOT NULL` e `embedding_version = 2`
   - Busca semântica retorna chunks novos para queries como:
     - "como calcular taxa grátis no iFood"
     - "média de itens por venda fórmula"
     - "produto isca precificação cachorro-quente"
     - "quanto investir em CAC"
     - "ticket médio alto faturamento baixo hamburgueria"
     - "como fidelizar cliente sem pedir telefone"
     - "anúncio iFood vale a pena"

Aprovando, executo a ingestão + embeddings e te confirmo o total final.
