// Definição declarativa das etapas do Funil de Diagnóstico.
// Reescrito para o DONO DA LOJA leigo: linguagem simples, faixas em vez de números exatos,
// "Não sei" sempre disponível, perguntas condicionais e tooltips com "onde achar no iFood".
//
// IMPORTANTE: as chaves internas (step.key + question.key) são preservadas porque o motor de
// regras (rules.ts, evidences.ts, journey.ts) lê respostas por elas. Faixas usam value numérico
// (ponto médio) para que num()/Number() continuem funcionando sem alteração nas regras.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "select"
  | "multiselect"
  | "yesno"
  | "rating3"
  | "products"
  | "competitors"
  | "files"
  | "info";

export interface Question {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  tooltip?: string;
  required?: boolean;
  essential?: boolean;
  min?: number;
  max?: number;
  /** Mostra a pergunta apenas se a condição for satisfeita (mesma etapa). */
  condition?: { key: string; equals?: any; in?: any[]; truthy?: boolean };
}

export interface StepDef {
  key: string;
  index: number;
  title: string;
  subtitle?: string;
  description?: string;
  intro?: string;
  questions: Question[];
}

const TOOLTIP_PORTAL = "Você encontra essa informação no Portal do Parceiro iFood.";

export const STEPS: StepDef[] = [
  // ============================================================
  // 1) SOBRE A LOJA
  // ============================================================
  {
    key: "basic",
    index: 1,
    title: "Sobre a sua loja",
    subtitle: "Vamos começar com o básico",
    intro:
      "Vou te fazer algumas perguntas simples sobre a sua loja. Leva uns 8 minutos. Pode pular o que não souber — salvamos tudo automaticamente e você pode continuar depois.",
    questions: [
      { key: "name", label: "Qual é o nome da sua loja no app?", type: "text", required: true, essential: true },
      {
        key: "category",
        label: "Que tipo de comida você vende?",
        type: "select",
        required: true,
        essential: true,
        options: ["Lanches", "Pizzaria", "Açaí", "Brasileira", "Japonesa", "Marmita", "Doces", "Saudável", "Outros"].map(
          (c) => ({ value: c, label: c }),
        ),
      },
      {
        key: "platform",
        label: "Em qual app você mais vende hoje?",
        type: "select",
        required: true,
        options: ["iFood", "Rappi", "WhatsApp", "App próprio", "Outros"].map((c) => ({ value: c, label: c })),
      },
      { key: "city", label: "Em qual cidade você atende?", type: "text", required: true },
      { key: "neighborhood", label: "E em qual bairro?", type: "text" },
      {
        key: "opening_hours",
        label: "Em quais dias e horários você abre?",
        type: "text",
        placeholder: "Ex.: Ter-Dom, das 18h às 23h",
        tooltip: "Portal do Parceiro > Minha Loja > Horários.",
      },
      {
        key: "monthly_orders",
        label: "Quantos pedidos você faz por mês, em média?",
        type: "select",
        essential: true,
        tooltip: `${TOOLTIP_PORTAL} Em Desempenho > Vendas você vê o total de pedidos.`,
        options: [
          { value: "50", label: "Até 100 pedidos" },
          { value: "200", label: "101 a 300" },
          { value: "450", label: "301 a 600" },
          { value: "800", label: "601 a 1.000" },
          { value: "1500", label: "Mais de 1.000" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "average_ticket",
        label: "Qual é o valor médio de um pedido seu?",
        type: "select",
        essential: true,
        tooltip: `${TOOLTIP_PORTAL} Em Desempenho > Vendas aparece como "Ticket médio".`,
        options: [
          { value: "20", label: "Até R$ 29" },
          { value: "40", label: "R$ 30 a R$ 49" },
          { value: "60", label: "R$ 50 a R$ 69" },
          { value: "85", label: "R$ 70 a R$ 99" },
          { value: "120", label: "R$ 100 ou mais" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "monthly_revenue",
        label: "Quanto a loja fatura por mês, mais ou menos?",
        type: "select",
        options: [
          { value: "1500", label: "Até R$ 3.000" },
          { value: "5500", label: "R$ 3.000 a R$ 8.000" },
          { value: "11500", label: "R$ 8.000 a R$ 15.000" },
          { value: "22500", label: "R$ 15.000 a R$ 30.000" },
          { value: "45000", label: "R$ 30.000 a R$ 60.000" },
          { value: "80000", label: "Mais de R$ 60.000" },
          { value: "", label: "Não sei" },
        ],
      },
      { key: "notes", label: "Algo importante sobre sua loja que devemos saber?", type: "textarea", placeholder: "Opcional" },
    ],
  },

  // ============================================================
  // 2) VITRINE: COMO O CLIENTE TE VÊ
  // ============================================================
  {
    key: "storefront",
    index: 2,
    title: "Como o cliente vê sua loja",
    subtitle: "A primeira impressão no app",
    questions: [
      {
        key: "rating",
        label: "Qual é a sua nota geral hoje?",
        type: "select",
        essential: true,
        tooltip: `${TOOLTIP_PORTAL} Aparece em Avaliações.`,
        options: [
          { value: "3.5", label: "Abaixo de 4.0" },
          { value: "4.1", label: "4.0 a 4.29" },
          { value: "4.4", label: "4.3 a 4.59" },
          { value: "4.7", label: "4.6 a 4.79" },
          { value: "4.85", label: "4.8 ou mais" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "reviews_count",
        label: "Quantas avaliações sua loja tem?",
        type: "select",
        options: [
          { value: "30", label: "Menos de 50" },
          { value: "100", label: "50 a 150" },
          { value: "300", label: "151 a 500" },
          { value: "800", label: "501 a 1.500" },
          { value: "2500", label: "Mais de 1.500" },
          { value: "", label: "Não sei" },
        ],
      },
      { key: "has_cover", label: "Sua página tem foto de capa atualizada?", type: "yesno" },
      { key: "has_logo", label: "Tem uma logo bem visível?", type: "yesno" },
      {
        key: "promised_delivery_time",
        label: "Quanto tempo você promete pra entregar (em minutos)?",
        type: "select",
        essential: true,
        tooltip: `${TOOLTIP_PORTAL} Em Minha Loja > Tempo de preparo/entrega.`,
        options: [
          { value: "25", label: "Até 30 min" },
          { value: "38", label: "31 a 45 min" },
          { value: "52", label: "46 a 60 min" },
          { value: "75", label: "Mais de 60 min" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "delivery_fee",
        label: "Quanto custa, em média, a entrega para o cliente?",
        type: "select",
        essential: true,
        options: [
          { value: "0", label: "Grátis" },
          { value: "3", label: "Até R$ 5" },
          { value: "7", label: "R$ 5 a R$ 9" },
          { value: "11", label: "R$ 10 a R$ 14" },
          { value: "16", label: "R$ 15 ou mais" },
          { value: "", label: "Não sei / Varia muito" },
        ],
      },
      {
        key: "looks_professional",
        label: "Olhando de fora, sua loja transmite confiança?",
        type: "rating3",
      },
    ],
  },

  // ============================================================
  // 3) CARDÁPIO E FOTOS
  // ============================================================
  {
    key: "menu",
    index: 3,
    title: "Cardápio e fotos",
    subtitle: "Como seus produtos aparecem",
    questions: [
      {
        key: "products_total",
        label: "Quantos produtos você tem cadastrados?",
        type: "select",
        options: [
          { value: "10", label: "Até 15" },
          { value: "22", label: "16 a 30" },
          { value: "45", label: "31 a 60" },
          { value: "80", label: "61 a 100" },
          { value: "150", label: "Mais de 100" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "menu_organization",
        label: "Seu cardápio está organizado em categorias claras (Combos, Bebidas, Sobremesas)?",
        type: "rating3",
      },
      {
        key: "without_photo",
        label: "Quantos produtos estão SEM foto hoje?",
        type: "select",
        essential: true,
        options: [
          { value: "0", label: "Nenhum, todos têm foto" },
          { value: "3", label: "Poucos (1 a 5)" },
          { value: "10", label: "Vários (6 a 15)" },
          { value: "25", label: "Muitos (mais de 15)" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "without_description",
        label: "Quantos produtos estão SEM descrição?",
        type: "select",
        options: [
          { value: "0", label: "Nenhum" },
          { value: "5", label: "Poucos" },
          { value: "15", label: "Vários" },
          { value: "30", label: "A maioria" },
          { value: "", label: "Não sei" },
        ],
      },
      { key: "has_combos", label: "Você tem combos prontos no cardápio?", type: "yesno" },
      { key: "has_addons", label: "Os clientes podem escolher adicionais (queijo extra, bacon, molho)?", type: "yesno" },
      { key: "has_drinks", label: "Vende bebidas?", type: "yesno" },
      { key: "has_desserts", label: "Vende sobremesa?", type: "yesno" },
    ],
  },

  // ============================================================
  // 4) TOP 3 PRODUTOS (mini-tabela)
  // ============================================================
  {
    key: "products",
    index: 4,
    title: "Seus produtos mais vendidos",
    subtitle: "Cadastre só os 3 principais",
    description:
      "Não precisa cadastrar tudo. Com os 3 mais vendidos, conseguimos analisar margem, foto, nome e descrição. Custo é opcional — preencha se souber.",
    questions: [
      { key: "items", label: "Top 3 produtos", type: "products", essential: true },
    ],
  },

  // ============================================================
  // 5) PREÇO E MARGEM
  // ============================================================
  {
    key: "pricing",
    index: 5,
    title: "Preço e lucro",
    subtitle: "Você está ganhando dinheiro de verdade?",
    questions: [
      { key: "knows_food_cost", label: "Você sabe quanto custa o ingrediente dos seus pratos mais vendidos?", type: "yesno" },
      { key: "knows_platform_fee", label: "Sabe quanto o iFood (ou outro app) cobra de taxa por pedido?", type: "yesno" },
      { key: "knows_packaging_cost", label: "Sabe quanto gasta com embalagem por pedido?", type: "yesno" },
      {
        key: "compared_competitors",
        label: "Comparando com seus concorrentes, seu preço está…",
        type: "select",
        options: [
          { value: "barato", label: "Mais barato que eles" },
          { value: "parecido", label: "Parecido" },
          { value: "caro", label: "Mais caro que eles" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "low_margin_top_sellers",
        label: "Tem produto que vende muito mas você sente que sobra pouco?",
        type: "yesno",
      },
      { key: "pricing_notes", label: "Algo sobre preço que te incomoda?", type: "textarea", placeholder: "Opcional" },
    ],
  },

  // ============================================================
  // 6) COMBOS E TICKET MÉDIO
  // ============================================================
  {
    key: "combos",
    index: 6,
    title: "Combos e valor por pedido",
    subtitle: "Como fazer o cliente gastar um pouco mais",
    questions: [
      { key: "combo_drink", label: "Você tem combo com bebida?", type: "yesno" },
      { key: "combo_couple", label: "Tem combo para casal (2 pessoas)?", type: "yesno" },
      { key: "combo_family", label: "Tem combo família (3 pessoas ou mais)?", type: "yesno" },
      { key: "addons", label: "Quando o cliente escolhe um prato, ele vê opções de extras?", type: "yesno" },
      {
        key: "upsell_strategy",
        label: "Você costuma sugerir bebida, sobremesa ou adicional dentro do app?",
        type: "select",
        options: [
          { value: "sempre", label: "Sempre, em quase todos os produtos" },
          { value: "as_vezes", label: "Em alguns" },
          { value: "nunca", label: "Quase nunca" },
        ],
      },
      {
        key: "ticket_satisfaction",
        label: "O valor médio do pedido te agrada?",
        type: "rating3",
      },
    ],
  },

  // ============================================================
  // 7) ENTREGA E QUALIDADE
  // ============================================================
  {
    key: "delivery",
    index: 7,
    title: "Entrega e qualidade",
    subtitle: "O pedido chega bem?",
    questions: [
      {
        key: "real_time",
        label: "Na prática, em quanto tempo o pedido chega na casa do cliente?",
        type: "select",
        options: [
          { value: "25", label: "Até 30 min" },
          { value: "38", label: "31 a 45 min" },
          { value: "52", label: "46 a 60 min" },
          { value: "75", label: "Mais de 60 min" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "prep_time",
        label: "Quanto tempo a cozinha leva para preparar um pedido comum?",
        type: "select",
        options: [
          { value: "8", label: "Até 10 min" },
          { value: "15", label: "11 a 20 min" },
          { value: "25", label: "21 a 30 min" },
          { value: "40", label: "Mais de 30 min" },
          { value: "", label: "Não sei" },
        ],
      },
      { key: "frequent_delays", label: "Vocês atrasam com frequência?", type: "yesno" },
      {
        key: "food_arrives_hot",
        label: "A comida chega quente e bem embalada?",
        type: "select",
        options: [
          { value: "true", label: "Quase sempre" },
          { value: "as_vezes", label: "Às vezes a gente recebe reclamação" },
          { value: "false", label: "Já tivemos vários relatos de comida fria/derramada" },
        ],
      },
      { key: "packaging_preserves", label: "Você usa seladora ou lacre na embalagem?", type: "yesno" },
      {
        key: "cancellation_rate",
        label: "Quantos pedidos vocês cancelam, mais ou menos?",
        type: "select",
        options: [
          { value: "1", label: "Quase nenhum (até 2%)" },
          { value: "4", label: "Alguns por semana (2 a 5%)" },
          { value: "8", label: "Vários (5 a 10%)" },
          { value: "15", label: "Muitos (mais de 10%)" },
          { value: "", label: "Não sei" },
        ],
      },
      {
        key: "cancel_reasons",
        label: "Quando cancela, costuma ser por quê?",
        type: "multiselect",
        condition: { key: "cancellation_rate", in: ["4", "8", "15"] },
        options: [
          { value: "falta_item", label: "Faltou item / acabou no estoque" },
          { value: "atraso", label: "Atraso na cozinha" },
          { value: "sem_entregador", label: "Sem entregador disponível" },
          { value: "cliente_desistiu", label: "Cliente desistiu" },
          { value: "endereco", label: "Endereço fora do raio / errado" },
        ],
      },
    ],
  },

  // ============================================================
  // 8) AVALIAÇÕES E PROBLEMAS
  // ============================================================
  {
    key: "reviews",
    index: 8,
    title: "Avaliações e reclamações",
    subtitle: "O que os clientes mais falam",
    questions: [
      {
        key: "main_compliments",
        label: "O que os clientes mais elogiam?",
        type: "multiselect",
        options: [
          { value: "sabor", label: "Sabor da comida" },
          { value: "porcao", label: "Tamanho da porção" },
          { value: "agilidade", label: "Rapidez na entrega" },
          { value: "embalagem", label: "Embalagem" },
          { value: "atendimento", label: "Atendimento" },
        ],
      },
      {
        key: "main_complaints",
        label: "E o que mais aparece como reclamação?",
        type: "multiselect",
        options: [
          { value: "frio", label: "Comida chegou fria" },
          { value: "atraso", label: "Atraso" },
          { value: "errado", label: "Pedido veio errado" },
          { value: "pequeno", label: "Porção pequena demais" },
          { value: "embalagem", label: "Embalagem ruim / vazou" },
          { value: "atendimento", label: "Atendimento" },
          { value: "nenhuma", label: "Quase não temos reclamação" },
        ],
      },
      // Espelhos booleanos (preservam regras complaint_*)
      { key: "complaint_cold", label: "Tem reclamação recorrente de comida fria?", type: "yesno" },
      { key: "complaint_late", label: "Tem reclamação recorrente de atraso?", type: "yesno" },
      { key: "complaint_wrong", label: "Tem reclamação recorrente de pedido errado?", type: "yesno" },
      { key: "complaint_packaging", label: "Tem reclamação recorrente de embalagem?", type: "yesno" },
      { key: "complaint_small", label: "Tem reclamação recorrente de porção pequena?", type: "yesno" },
      {
        key: "real_reviews",
        label: "Cole 2 ou 3 avaliações negativas reais (uma por linha) — a IA usa para identificar padrões",
        type: "textarea",
        placeholder: "Opcional, mas ajuda muito",
      },
    ],
  },

  // ============================================================
  // 9) ANÚNCIOS E PROMOÇÕES
  // ============================================================
  {
    key: "ads",
    index: 9,
    title: "Anúncios e promoções",
    subtitle: "Como você atrai cliente novo",
    questions: [
      { key: "advertises", label: "Você anuncia sua loja em algum lugar (iFood Ads, Instagram, etc)?", type: "yesno" },
      {
        key: "ad_channels",
        label: "Onde você anuncia?",
        type: "multiselect",
        condition: { key: "advertises", equals: true },
        options: [
          { value: "ifood_ads", label: "iFood Ads" },
          { value: "meta", label: "Instagram / Facebook" },
          { value: "google", label: "Google" },
          { value: "influencers", label: "Influenciadores" },
        ],
      },
      {
        key: "ad_spend",
        label: "Quanto investe em anúncio por mês?",
        type: "select",
        condition: { key: "advertises", equals: true },
        options: [
          { value: "100", label: "Até R$ 200" },
          { value: "350", label: "R$ 200 a R$ 500" },
          { value: "750", label: "R$ 500 a R$ 1.000" },
          { value: "1500", label: "Mais de R$ 1.000" },
          { value: "", label: "Não sei direito" },
        ],
      },
      {
        key: "ad_roi",
        label: "Você sente que o anúncio dá lucro?",
        type: "select",
        condition: { key: "advertises", equals: true },
        options: [
          { value: "2", label: "Sim, dá retorno claro" },
          { value: "1", label: "Empata mais ou menos" },
          { value: "0.5", label: "Acho que estou perdendo dinheiro" },
          { value: "", label: "Não sei medir" },
        ],
      },
      // Promoções (também salvas em step ads para não criar etapa nova)
      {
        key: "uses_promotions",
        label: "Você costuma rodar promoções no app (cupom, desconto, frete grátis)?",
        type: "yesno",
      },
      { key: "platform_coupon", label: "Usa cupom da plataforma?", type: "yesno", condition: { key: "uses_promotions", equals: true } },
      { key: "free_delivery", label: "Já testou frete grátis?", type: "yesno", condition: { key: "uses_promotions", equals: true } },
      { key: "promo_profitable", label: "Você sente que essas promoções dão lucro?", type: "yesno", condition: { key: "uses_promotions", equals: true } },
    ],
  },

  // ============================================================
  // 10) FIDELIZAÇÃO
  // ============================================================
  {
    key: "loyalty",
    index: 10,
    title: "Fazer o cliente voltar",
    subtitle: "Recompra é mais barato que cliente novo",
    questions: [
      { key: "next_purchase_coupon", label: "Você dá cupom de desconto para o cliente voltar?", type: "yesno" },
      { key: "loyalty_card", label: "Tem algum tipo de cartão fidelidade ou programa de pontos?", type: "yesno" },
      { key: "packaging_message", label: "Coloca alguma mensagem ou cartão dentro da embalagem?", type: "yesno" },
      { key: "rebuy_strategy", label: "Tem alguma ação pensada pro cliente antigo voltar?", type: "yesno" },
      {
        key: "knows_rebuy_rate",
        label: "Você sabe quantos clientes voltam a comprar no mês?",
        type: "select",
        options: [
          { value: "10", label: "Menos de 15%" },
          { value: "22", label: "Entre 15% e 30%" },
          { value: "40", label: "Entre 30% e 50%" },
          { value: "60", label: "Mais de 50%" },
          { value: "", label: "Não sei" },
        ],
      },
    ],
  },
];

export const TOTAL_STEPS = STEPS.length;

export const findStep = (key: string) => STEPS.find((s) => s.key === key);
export const stepByIndex = (index: number) => STEPS.find((s) => s.index === index);

/** Avalia se uma pergunta condicional deve aparecer dado o estado atual da etapa. */
export function shouldShowQuestion(q: Question, values: Record<string, any>): boolean {
  if (!q.condition) return true;
  const v = values[q.condition.key];
  if (q.condition.equals !== undefined) return v === q.condition.equals;
  if (q.condition.in) return q.condition.in.includes(v);
  if (q.condition.truthy) return !!v;
  return true;
}
