
-- Índice único para tornar a inserção idempotente
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_base_title_source_uniq
  ON public.knowledge_base (title, source);

INSERT INTO public.knowledge_base (area, topic, title, content, tags, source) VALUES
('metricas','desempenho','Análise inicial das métricas de vendas da loja',
'Resumo: A primeira análise deve ser feita na aba de desempenho da loja, observando pedidos, faturamento, ticket médio e clientes novos.

Conteúdo: Para ajustar uma loja no iFood, o primeiro passo é acessar a aba de desempenho e analisar as métricas de vendas. Os principais indicadores são quantidade de pedidos, faturamento, ticket médio e número de clientes novos. No exemplo, a loja teve 1.248 pedidos, R$ 49.834 de faturamento, ticket médio de R$ 39,93 e 352 clientes novos no mês. Quedas na aquisição de clientes novos devem gerar uma ação estratégica para recuperar esse volume no próximo ciclo.

Aplicação prática: Comece qualquer diagnóstico pela aba de desempenho — analise volume de pedidos, faturamento, ticket médio e clientes novos antes de sugerir ajustes.',
ARRAY['RAG-001','metricas de vendas','desempenho','faturamento','pedidos','ticket medio','clientes novos','iFood'],
'aula_ifood_v1'),

('horarios','demanda','Identificação de horários de pico e baixa demanda',
'Resumo: Os horários de pico devem ser usados para entender o comportamento da demanda e criar ações promocionais antes ou depois desses períodos.

Conteúdo: A loja analisada funciona das 10h às 15h, com boa demanda entre 10h30 e 12h e pico principal entre 12h e 14h. A recomendação é criar ações promocionais nos horários de menor fluxo — antes do pico (10h às 11h30) e depois do pico (14h às 15h). Essas ações podem incluir prato promocional, promoção relâmpago ou item específico com disponibilidade programada.

Aplicação prática: Recomende promoções programadas em horários de baixa demanda, sem comprometer a operação durante o pico.',
ARRAY['RAG-002','horario de pico','demanda','promocao relampago','almoco','baixa demanda','iFood'],
'aula_ifood_v1'),

('operacao','ranqueamento','Impacto das métricas operacionais no ranqueamento da loja',
'Resumo: A taxa de cancelamento e os chamados em aberto influenciam diretamente o posicionamento e a recomendação da loja no iFood.

Conteúdo: O iFood considera métricas operacionais para decidir se uma loja deve ser recomendada com mais frequência. Lojas com alta taxa de cancelamento podem ser interpretadas como incapazes de suportar alta demanda. No exemplo, uma loja com quase 1.300 pedidos tinha pouco mais de 1% de cancelamento, com objetivo de reduzir esse percentual. Chamados em aberto também devem ser mantidos próximos de zero para não prejudicar a reputação operacional.

Aplicação prática: Alerte sempre que houver cancelamentos altos ou chamados pendentes, pois isso reduz a entrega orgânica da loja.',
ARRAY['RAG-003','taxa de cancelamento','metricas operacionais','ranqueamento','chamados','reputacao'],
'aula_ifood_v1'),

('cancelamentos','contestacao','Contestação de cancelamentos indevidos',
'Resumo: Cancelamentos contestáveis devem ser analisados e contestados para proteger o faturamento e as métricas da loja.

Conteúdo: Quando ocorre um cancelamento, identifique o motivo (ex: "pedido com itens errados"). Verifique com a equipe da loja o que aconteceu. Se o cancelamento for indevido, solicite contestação. Se o botão de contestação não estiver disponível, abra um chamado na aba de chamados e ajuda informando o número do pedido e solicitando a contestação. O objetivo é recuperar o valor e evitar que o cancelamento prejudique as métricas operacionais.

Aplicação prática: Instrua o usuário a analisar o motivo, reunir contexto interno e abrir contestação quando houver indício de erro ou improcedência.',
ARRAY['RAG-004','contestacao','cancelamento indevido','reembolso','chamados','iFood'],
'aula_ifood_v1'),

('reputacao','super_restaurante','Critérios e importância do Super Restaurante',
'Resumo: O Super Restaurante funciona como controle de qualidade da loja e depende de nota, cancelamento e chamados em aberto.

Conteúdo: Critérios principais: nota de avaliação acima de 4.7; taxa de cancelamento abaixo de 0,90% nos últimos 45 dias; chamados em aberto próximos de zero; avaliação considerada dos últimos três meses; revisão de elegibilidade a cada 30 dias.

Aplicação prática: Use esses critérios como referência para diagnosticar se a loja está saudável operacional e reputacionalmente.',
ARRAY['RAG-005','super restaurante','avaliacao','taxa de cancelamento','chamados','elegibilidade','nota 4.7'],
'aula_ifood_v1'),

('atendimento','moderacao','Gestão de avaliações negativas e solicitação de moderação',
'Resumo: Avaliações negativas devem ser analisadas e, quando cabível, enviadas para moderação dentro da plataforma.

Conteúdo: Quando uma avaliação negativa parece injusta, falsa, abusiva ou feita por concorrente ou ex-funcionário, solicite moderação. A resposta pública nem sempre é a melhor ação — em certos casos o correto é abrir solicitação de moderação, selecionar uma política aplicável e justificar com texto de defesa.

Aplicação prática: Avalie o teor da avaliação antes de responder. Se houver violação de política ou suspeita de má-fé, recomende solicitação de moderação.',
ARRAY['RAG-006','avaliacao negativa','moderacao','reputacao','nota','politica iFood'],
'aula_ifood_v1'),

('conversao','funil','Funil de vendas do cardápio no iFood',
'Resumo: O desempenho do cardápio deve ser analisado como um funil — visitas, visualizações de itens, adições à sacola, revisão e pedidos concluídos.

Conteúdo: Referência de funil saudável: 2.000 a 3.000 visitas; ~50% dos visitantes clicando em itens; 20% a 25% adicionando à sacola; 10% a 12% concluindo o pedido. Cada etapa exige análise: Visitas (nome da loja, palavras-chave, categoria, entrega, promoções); Cliques (nome do prato, foto, descrição, oferta); Sacola (adicionais, complementos, clareza); Revisão (pedido mínimo, pagamento, tempo, taxa, cupom); Conclusão (remoção de barreiras).

Aplicação prática: Diagnostique a etapa mais fraca do funil antes de recomendar ações — cada gargalo exige correção diferente.',
ARRAY['RAG-007','funil de vendas','visitas','sacola','conclusao','conversao','cardapio'],
'aula_ifood_v1'),

('visibilidade','seo_loja','Uso de palavras-chave no nome da loja e descrição',
'Resumo: Palavras-chave ajudam a loja a aparecer nas buscas do iFood e aumentar visitas orgânicas.

Conteúdo: Ao pesquisar "marmita", aparecem lojas com a palavra no nome, descrição ou itens. Se não puder mudar o nome por questões de marca, use a descrição (até 2.000 caracteres) para inserir termos do nicho como: marmita, restaurante, refeição, prato executivo, comida brasileira, almoço, entrega grátis, massas, lanches, pastel.

Aplicação prática: Recomende revisão do nome e descrição da loja, inserindo palavras-chave relevantes sem descaracterizar a marca.',
ARRAY['RAG-008','palavras-chave','nome da loja','descricao','busca organica','visibilidade','SEO iFood'],
'aula_ifood_v1'),

('cardapio','seo_item','Palavras-chave no nome e descrição dos itens do cardápio',
'Resumo: Os nomes dos itens devem conter a palavra-chave principal do produto para que o algoritmo consiga exibi-los nas buscas.

Conteúdo: A palavra-chave deve aparecer no início do nome quando possível: Marmita de churrasco, Pizza de calabresa, Pastel de carne, Sushi combinado, Marmitex de frango. O algoritmo mostra itens específicos na aba de itens — se a palavra-chave estiver só na categoria, o item pode não aparecer na busca. A descrição também deve conter palavras do nicho (marmitex, feijoada, carne, frango, churrasco, Coca-Cola, Guaraná, entrega grátis). Duas linhas bem preenchidas já geram resultado.

Aplicação prática: Sugira nomes com estrutura: palavra-chave principal + sabor/proteína/diferencial + tamanho ou benefício.',
ARRAY['RAG-009','nome do item','descricao do prato','algoritmo','busca por item','cardapio','SEO iFood'],
'aula_ifood_v1'),

('conversao','cardapio_direto','Cardápio direto ao ponto para aumentar conversão',
'Resumo: O cardápio deve facilitar a compra e reduzir etapas desnecessárias para levar o cliente rapidamente à sacola e revisão.

Conteúdo: Um cardápio eficiente é direto, claro e simples. Quando o cliente clica no item, deve entender rapidamente o produto, escolher complementos se desejar e adicionar à sacola sem dificuldade. Quanto mais fácil o processo de compra, maior a chance de seguir para revisão e concluir.

Aplicação prática: Revise cardápios buscando excesso de etapas, descrições confusas, escolhas obrigatórias desnecessárias e falta de clareza.',
ARRAY['RAG-010','cardapio direto','conversao','sacola','revisao','facilidade de compra'],
'aula_ifood_v1'),

('cardapio','complementos','Complementos opcionais para aumento de ticket médio',
'Resumo: Complementos como bebidas, sobremesas e itens adicionais devem ser posicionados estrategicamente para aumentar o ticket médio.

Conteúdo: A loja analisada usa Coca-Cola e sobremesa como complementos opcionais. A bebida foi escolhida porque já era uma das mais vendidas — complementos devem ser definidos com base no comportamento real de compra. Exemplos: marmita (refrigerante, sobremesa, talher); pastel (suco, outro pastel, sobremesa); pizza (refri 2L, pizza doce menor, borda recheada). Complementos devem ser opcionais — se obrigatórios, criam barreira e prejudicam a conversão.

Aplicação prática: Sugira complementos baseados nos itens mais vendidos e reforce que sejam opcionais.',
ARRAY['RAG-011','complementos','ticket medio','bebida','sobremesa','venda adicional','upsell'],
'aula_ifood_v1'),

('cardapio','disponibilidade','Programação de disponibilidade de itens por dia e horário',
'Resumo: Itens promocionais podem ser programados para aparecer apenas em dias e horários estratégicos.

Conteúdo: É possível configurar itens como "barato do dia", disponíveis só na sexta-feira em horário programado. Esse recurso serve para criar pratos do dia, promoções relâmpago e ofertas para períodos de baixa demanda. A programação deve respeitar o horário real de funcionamento e a capacidade operacional.

Aplicação prática: Recomende programação de itens para horários de baixa demanda ou dias específicos, evitando sobrecarga em picos.',
ARRAY['RAG-012','disponibilidade','prato do dia','promocao relampago','horario programado','cardapio'],
'aula_ifood_v1'),

('cardapio','organizacao','Itens campeões de venda devem ficar próximos ao topo do cardápio',
'Resumo: Itens com boa performance devem ser posicionados nas primeiras categorias para facilitar a compra.

Conteúdo: A aba de desempenho do cardápio mostra os itens campeões de venda dos últimos 30 dias. Puxe esses itens para o topo ou para categorias estratégicas como: Campeões de venda, Promoção do dia, Bom e barato, Combos, Pratos mais pedidos. No exemplo, a Coca-Cola fica perto dos campeões para incentivar venda casada.

Aplicação prática: Recomende reorganizar o cardápio com base nos dados reais de venda, colocando os melhores itens nas primeiras posições.',
ARRAY['RAG-013','campeoes de venda','topo do cardapio','categorias','venda casada','organizacao'],
'aula_ifood_v1'),

('promocoes','percepcao_valor','Promoções com percepção de desconto aumentam atratividade',
'Resumo: Itens promocionados com diferença clara entre preço original e preço com desconto geram maior percepção de valor.

Conteúdo: Cadastre o item com preço original maior e preço final como promocional. Exemplo: preço original R$ 46,99 e preço com desconto R$ 36,99 — gera percepção de vantagem maior do que descer de R$ 39,99 para R$ 38,00. Itens com desconto relevante podem ser destacados pelo iFood em listas de promoções e no topo do cardápio.

Aplicação prática: Avalie se as promoções têm desconto perceptível e sugira ajustes que façam sentido comercialmente.',
ARRAY['RAG-014','promocao','desconto','percepcao de valor','preco original','preco promocional'],
'aula_ifood_v1'),

('categoria','posicionamento','Categoria correta da loja influencia visibilidade e vendas',
'Resumo: Estar na categoria correta é essencial para aparecer nas listas certas e atrair clientes adequados.

Conteúdo: Uma loja de comida brasileira ou marmita não deve estar em categoria incompatível como comida argentina ou carnes. A categoria correta ajuda a aparecer em listas promocionais, buscas e áreas de destaque da home. Para refeição, as categorias recomendadas são Brasileira e Marmitas. Categoria errada reduz visibilidade e causa baixa demanda mesmo com comida boa.

Aplicação prática: Sempre verifique se a categoria da loja corresponde ao principal produto vendido antes de sugerir outras ações.',
ARRAY['RAG-015','categoria','comida brasileira','marmitas','visibilidade','posicionamento'],
'aula_ifood_v1'),

('conversao','pedido_minimo','Pedido mínimo deve reduzir barreiras de compra',
'Resumo: O valor de pedido mínimo deve ser coerente com o preço dos principais produtos para não impedir compras simples.

Conteúdo: O pedido mínimo não deve ser maior que o valor dos principais produtos individuais. Exemplo: marmita custa R$ 29,99, então pedido mínimo deve ser R$ 29,00 ou menor. Se for R$ 31,00, o cliente não consegue comprar uma marmita sozinha e se sente obrigado a adicionar item — barreira que prejudica especialmente novos clientes.

Aplicação prática: Compare o pedido mínimo com o preço dos produtos mais vendidos e sugira redução quando houver bloqueio de compra individual.',
ARRAY['RAG-016','pedido minimo','barreira de compra','conversao','novo cliente','ticket'],
'aula_ifood_v1'),

('entrega','entrega_gratis','Entrega grátis como estratégia de visibilidade',
'Resumo: Entrega grátis pode colocar a loja em listas promocionais e aumentar visibilidade, especialmente nos primeiros quilômetros.

Conteúdo: Para lojas com entrega própria, ofereça entrega grátis pelo menos até o terceiro quilômetro quando possível. Essa configuração ajuda a aparecer em listas relevantes (lojas com entrega grátis, lojas que entregam rapidamente). Analise financeiramente considerando margem, distância e ticket médio.

Aplicação prática: Sugira entrega grátis estratégica em raios próximos, sem comprometer a rentabilidade.',
ARRAY['RAG-017','entrega gratis','area de entrega','visibilidade','taxa de entrega','listas promocionais'],
'aula_ifood_v1'),

('entrega','tempo_entrega','Tempo de entrega abaixo de 30 minutos aumenta exposição',
'Resumo: Lojas com tempo de entrega competitivo podem aparecer em listas de entrega rápida.

Conteúdo: Existe lista de restaurantes que entregam em até 30 minutos. Na entrega própria, o primeiro número cadastrado pode aparecer com variação adicional do iFood (cadastrar 20 min pode aparecer como 20 a 30 min). Seja responsável: não configure tempo muito baixo se a loja não consegue cumprir — prometer 10 a 20 min e entregar em 40 a 50 prejudica a reputação. Sugestão: até 1 km e 2 km = 20 min; até 3 km = 20 ou 25 min; do 4º ou 5º km em diante, aumentar gradualmente.

Aplicação prática: Recomende tempos competitivos mas realistas, sempre considerando a capacidade operacional.',
ARRAY['RAG-018','tempo de entrega','entrega rapida','30 minutos','logistica propria','reputacao'],
'aula_ifood_v1'),

('promocoes','taxa_flexivel','Taxa flexível e entrega com desconto para logística iFood',
'Resumo: Lojas com logística iFood podem usar promoções de entrega com desconto para todos, novos clientes ou clientes inativos.

Conteúdo: Com logística iFood não há autonomia total para editar tempo e taxa. A estratégia passa por "minhas promoções" (taxa flexível e entrega com desconto). É possível configurar: entrega grátis ou desconto para todos os clientes; entrega grátis só para novos clientes; entrega com desconto para recuperar clientes que não compram há pelo menos 30 dias. O cupom pode ter valor máximo (ex: até R$ 9,99 ou R$ 10,99), mas o uso real depende da distância.

Aplicação prática: Sugira campanhas segmentadas de entrega com desconto conforme o objetivo: aquisição, recorrência ou recuperação.',
ARRAY['RAG-019','taxa flexivel','logistica iFood','entrega com desconto','novos clientes','clientes inativos'],
'aula_ifood_v1'),

('promocoes','campanha_inteligente','Campanha inteligente do iFood',
'Resumo: A campanha inteligente permite que o iFood distribua promoções automaticamente para diferentes públicos.

Conteúdo: É uma promoção em que o próprio iFood entrega a loja para públicos com base em comportamento de consumo e semelhança com clientes da região. Públicos: novo seguidor, novo comprador, cliente recorrente, cliente que não compra há algum tempo. Funciona de forma automática.

Aplicação prática: Recomende campanha inteligente quando o lojista busca automação promocional e segmentação sem configurar manualmente cada público.',
ARRAY['RAG-020','campanha inteligente','promocao automatica','novo comprador','recorrencia','clientes'],
'aula_ifood_v1')

ON CONFLICT (title, source) DO NOTHING;
