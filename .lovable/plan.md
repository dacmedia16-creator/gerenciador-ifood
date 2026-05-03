## Foco: prints preenchem TUDO que dá pra preencher

Hoje a IA até lê os prints, mas só mapeio ~10 campos numéricos (rating, faturamento, ticket, tempo de entrega…). O formulário tem ~80 perguntas — texto, sim/não, multiselect, listas — e quase nenhuma é alimentada pelos prints.

Vou alargar a ponte inteira: **schema da IA → extração → mapeamento → preenchimento automático**.

## O que vai mudar

### 1. `process-print` (edge function): extrair muito mais

Adiciono ao schema da IA todos os campos que conseguem ser inferidos visualmente de prints de iFood/Rappi/WhatsApp/Instagram:

- **Identidade**: nome da loja, categoria de comida, cidade, bairro, horário de funcionamento, plataforma.
- **Vitrine**: nota, qtd avaliações, tem capa, tem logo, taxa de entrega, tempo prometido, parece profissional.
- **Cardápio**: total de produtos, sem foto, sem descrição, tem combos, tem adicionais, tem bebidas, tem sobremesa, organização em categorias.
- **Top 3 produtos**: nome, preço, tem foto, tem descrição (lista de até 3).
- **Operação/entrega**: tempo real de entrega, tempo de preparo, taxa de cancelamento (%), comida quente, atrasos frequentes.
- **Avaliações**: top 3 reclamações + top 3 elogios (já vem do print "avaliacoes"), com flags booleanas para `complaint_cold/late/wrong/packaging/small`.
- **Faturamento**: receita, pedidos, ticket médio, período.
- **Promoções/ads**: tem cupom, frete grátis, anuncia, % desconto.

Tudo continua opcional — a IA preenche só o que vê. Mantenho a auto-classificação que acabamos de criar.

### 2. `printMapper.ts`: mapear pra TODOS os tipos de campo

Hoje só cobre `number → bucket`. Vou adicionar:

- **String → bucket de select** (ex.: `"Lanches"` da loja → `category` no formulário).
- **Booleano → yesno** (já tem, expandir uso).
- **Texto → preenche textarea** (ex.: `unique_value`, `notes`, `biggest_problem` quando IA inferir do contexto).
- **Multiselect → array** (ex.: top reclamações detectadas → `main_complaints` + flags `complaint_*`).
- **Lista → top 3 produtos** (alimenta a etapa `products.items` automaticamente quando o print é cardápio/loja com itens em destaque).
- **Mapeamento por horário/dias da semana** quando o print mostra horário de funcionamento.
- **Conversão automática**: tempo "30-40 min" → 35; rating "4.9" → bucket `4.85`; taxa "Grátis" → 0.

### 3. Auto-aplicar mais agressivo no `DiagnosisWizard`

Já temos auto-aplicar + auto-navegar. Vou:

- Mostrar contador melhor: *"IA preencheu 23 campos a partir de 5 prints"*.
- Garantir que mesmo quando o usuário troca a `classification` manualmente no card, o re-processamento dispara novo auto-apply.
- Após auto-aplicar, se TUDO ficou completo, ir direto pra `/review` em vez de só pular um step.

### 4. Card de feedback no PrintUploader

Logo abaixo dos prints, mostrar lista enxuta: *"Detectei: nota 4.9, 334 avaliações, taxa grátis, combos sim, top reclamação: comida fria…"*. Dá confiança ao usuário e deixa ele revisar rapidinho.

## Arquivos afetados

- `supabase/functions/process-print/index.ts` — schema gigante + prompt mais explícito
- `src/lib/diagnosis/printMapper.ts` — handlers de string/array/texto/lista
- `src/pages/app/diagnosis/DiagnosisWizard.tsx` — auto-apply mais robusto + feedback
- `src/components/diagnosis/PrintUploader.tsx` — resumo do que foi detectado

Sem mudanças no banco. Só código.

## O que NÃO vou fazer agora

- Mexer no visual geral (você marcou "feio", mas no foco imediato escolheu prints).
- Mexer em Dashboard/Minha Loja (vai ser o próximo passo natural — quanto mais dado vier dos prints, mais preenchidas essas telas ficam, então isso já melhora indiretamente).
- Adicionar etapas novas — só preencher melhor as existentes.

Posso seguir?
