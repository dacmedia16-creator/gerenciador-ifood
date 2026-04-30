// Definição declarativa das etapas do Funil de Diagnóstico.
// Cada etapa contém perguntas com chave única, tipo de campo e marcação opcional/obrigatória.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "select"
  | "yesno"
  | "rating3" // bom / atenção / ruim
  | "products" // tabela repetidora
  | "competitors" // tabela repetidora
  | "files"
  | "info"; // bloco informativo, sem coleta

export interface Question {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  tooltip?: string;
  required?: boolean; // obrigatório para conclusão da etapa (não bloqueia avançar)
  essential?: boolean; // essencial para qualidade do diagnóstico (gera alerta na revisão)
  min?: number;
  max?: number;
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

export const STEPS: StepDef[] = [
  {
    key: "welcome",
    index: 1,
    title: "Boas-vindas",
    subtitle: "Vamos começar seu diagnóstico",
    intro:
      "Vamos te fazer perguntas sobre sua loja em ~15 minutos. Quanto mais dados, mais preciso o diagnóstico. Você pode salvar e continuar depois a qualquer momento.",
    questions: [
      {
        key: "ack",
        label: "Tudo entendido — pronto para começar",
        type: "info",
      },
    ],
  },
  {
    key: "basic",
    index: 2,
    title: "Dados básicos da loja",
    subtitle: "Identifique sua operação",
    questions: [
      { key: "name", label: "Nome da loja", type: "text", required: true, essential: true },
      {
        key: "category",
        label: "Categoria",
        type: "select",
        required: true,
        essential: true,
        options: [
          "Lanches", "Pizzaria", "Açaí", "Brasileira", "Japonesa", "Marmita", "Doces", "Saudável", "Outros",
        ].map((c) => ({ value: c, label: c })),
      },
      {
        key: "platform",
        label: "Plataforma principal",
        type: "select",
        required: true,
        options: ["iFood", "Rappi", "WhatsApp", "App próprio", "Outros"].map((c) => ({ value: c, label: c })),
      },
      { key: "city", label: "Cidade", type: "text", required: true },
      { key: "neighborhood", label: "Bairro", type: "text" },
      {
        key: "operation_type",
        label: "Tipo de operação",
        type: "select",
        options: ["Delivery only", "Loja física + delivery", "Dark kitchen", "Marca virtual"].map((c) => ({
          value: c,
          label: c,
        })),
      },
      { key: "opening_hours", label: "Horários de funcionamento", type: "text", placeholder: "Ex.: Ter-Dom 18h-23h" },
      { key: "monthly_revenue", label: "Faturamento médio mensal (R$)", type: "currency", essential: true },
      { key: "monthly_orders", label: "Quantidade média de pedidos/mês", type: "number", essential: true },
      { key: "average_ticket", label: "Ticket médio (R$)", type: "currency", essential: true },
      { key: "notes", label: "Observações gerais", type: "textarea" },
    ],
  },
  {
    key: "conversion",
    index: 3,
    title: "Conversão da loja",
    subtitle: "Visitas, cliques e pedidos",
    description:
      "Esses dados aparecem no painel do iFood (Gestor de Pedidos → Desempenho). Servem para classificar a saúde da sua conversão (ideal ≥ 12%).",
    questions: [
      { key: "visits", label: "Visitas da loja (últimos 30 dias)", type: "number", essential: true, tooltip: "Quantas pessoas viram sua loja na busca/feed." },
      { key: "clicks", label: "Cliques em produtos (últimos 30 dias)", type: "number", tooltip: "Quantas vezes alguém abriu a tela de algum produto seu." },
      { key: "orders", label: "Pedidos concluídos (últimos 30 dias)", type: "number", essential: true },
      { key: "conversion_rate", label: "Taxa de conversão (%) — opcional, se já souber", type: "number", min: 0, max: 100, tooltip: "Se deixar em branco, calculamos pedidos ÷ visitas × 100." },
      { key: "conversion_notes", label: "Observações sobre conversão", type: "textarea" },
    ],
  },
  {
    key: "storefront",
    index: 4,
    title: "Vitrine da loja",
    subtitle: "Como sua loja aparece para o cliente",
    questions: [
      { key: "rating", label: "Nota atual da loja (0–5)", type: "number", min: 0, max: 5, essential: true },
      { key: "reviews_count", label: "Quantidade de avaliações", type: "number" },
      { key: "has_cover", label: "Tem foto de capa?", type: "yesno" },
      { key: "has_logo", label: "Tem logo?", type: "yesno" },
      { key: "clear_description", label: "Descrição da loja é clara?", type: "yesno" },
      { key: "category_correct", label: "A categoria está correta?", type: "yesno" },
      { key: "promised_delivery_time", label: "Prazo de entrega prometido (min)", type: "number", essential: true },
      { key: "delivery_fee", label: "Taxa de entrega (R$)", type: "currency", essential: true },
      { key: "looks_professional", label: "A loja parece profissional?", type: "rating3" },
      { key: "storefront_notes", label: "Observações sobre a vitrine", type: "textarea" },
    ],
  },
  {
    key: "menu",
    index: 4,
    title: "Cardápio",
    subtitle: "Estrutura e variedade",
    questions: [
      { key: "products_total", label: "Quantidade de produtos no cardápio", type: "number" },
      { key: "categories_list", label: "Categorias existentes", type: "text", placeholder: "Ex.: Lanches, Bebidas, Sobremesas" },
      { key: "menu_organization", label: "Organização do cardápio", type: "rating3" },
      { key: "main_products", label: "Produtos principais", type: "textarea" },
      { key: "best_sellers", label: "Mais vendidos", type: "textarea" },
      { key: "low_sellers", label: "Baixa saída", type: "textarea" },
      { key: "with_description", label: "Quantos produtos têm descrição?", type: "number" },
      { key: "without_description", label: "Quantos produtos NÃO têm descrição?", type: "number" },
      { key: "with_photo", label: "Quantos produtos têm foto?", type: "number" },
      { key: "without_photo", label: "Quantos produtos NÃO têm foto?", type: "number" },
      { key: "has_addons", label: "Existem adicionais?", type: "yesno" },
      { key: "has_combos", label: "Existem combos?", type: "yesno" },
      { key: "has_desserts", label: "Existem sobremesas?", type: "yesno" },
      { key: "has_drinks", label: "Existem bebidas?", type: "yesno" },
    ],
  },
  {
    key: "photos",
    index: 5,
    title: "Fotos dos produtos",
    subtitle: "Qualidade visual do cardápio",
    questions: [
      { key: "main_with_photo", label: "Os principais produtos têm foto?", type: "yesno" },
      { key: "appetizing", label: "As fotos dão fome?", type: "rating3" },
      { key: "lighting", label: "A iluminação é boa?", type: "rating3" },
      { key: "visual_pattern", label: "Existe padrão visual?", type: "yesno" },
      { key: "looks_fresh", label: "A comida parece fresca?", type: "rating3" },
      { key: "shows_size", label: "A foto mostra bem o tamanho real?", type: "yesno" },
      { key: "visual_difference", label: "Existe diferença visual entre produtos?", type: "yesno" },
      { key: "photos_notes", label: "Observações sobre as fotos", type: "textarea" },
    ],
  },
  {
    key: "products",
    index: 6,
    title: "Produtos e vendas",
    subtitle: "Cadastre seus produtos principais",
    description: "Adicione pelo menos os 5 mais vendidos para um diagnóstico mais preciso.",
    questions: [
      { key: "items", label: "Produtos", type: "products", essential: true },
    ],
  },
  {
    key: "pricing",
    index: 7,
    title: "Preço e margem",
    subtitle: "Como você gerencia lucro",
    questions: [
      { key: "knows_food_cost", label: "Sabe o custo real dos pratos?", type: "yesno" },
      { key: "uses_coupons", label: "Usa cupons?", type: "yesno" },
      { key: "knows_platform_fee", label: "Sabe quanto paga de taxa para a plataforma?", type: "yesno" },
      { key: "knows_packaging_cost", label: "Sabe custo médio de embalagem?", type: "yesno" },
      { key: "knows_margin", label: "Sabe margem por produto?", type: "yesno" },
      { key: "compared_competitors", label: "Já comparou preço com concorrentes?", type: "yesno" },
      { key: "low_margin_top_sellers", label: "Tem produtos que vendem muito mas dão pouco lucro?", type: "yesno" },
      { key: "high_margin_low_sellers", label: "Tem produtos lucrativos que vendem pouco?", type: "yesno" },
      { key: "pricing_notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "combos",
    index: 8,
    title: "Combos e ticket médio",
    subtitle: "Estratégias para vender mais por pedido",
    questions: [
      { key: "combo_drink", label: "Existem combos com bebida?", type: "yesno" },
      { key: "combo_couple", label: "Existem combos para casal?", type: "yesno" },
      { key: "combo_family", label: "Existem combos família?", type: "yesno" },
      { key: "addons", label: "Existem adicionais?", type: "yesno" },
      { key: "desserts_offered", label: "Existem sobremesas?", type: "yesno" },
      { key: "extra_sauces", label: "Existem molhos extras?", type: "yesno" },
      { key: "upsell_strategy", label: "Existem estratégias de upsell?", type: "yesno" },
      { key: "ticket_satisfaction", label: "O ticket médio está satisfatório?", type: "rating3" },
      { key: "common_combo", label: "O que o cliente costuma comprar junto?", type: "textarea" },
    ],
  },
  {
    key: "promotions",
    index: 9,
    title: "Promoções e cupons",
    subtitle: "Estratégia promocional",
    questions: [
      { key: "uses_promotions", label: "A loja usa promoções?", type: "yesno" },
      { key: "platform_coupon", label: "Usa cupom da plataforma?", type: "yesno" },
      { key: "free_delivery", label: "Usa entrega grátis?", type: "yesno" },
      { key: "product_discount", label: "Usa desconto em produto?", type: "yesno" },
      { key: "new_customer_campaign", label: "Usa campanha para cliente novo?", type: "yesno" },
      { key: "rebuy_campaign", label: "Usa campanha para recompra?", type: "yesno" },
      { key: "promo_spend", label: "Quanto gasta com promoções/mês (R$)?", type: "currency" },
      { key: "promo_profitable", label: "Sabe se a promoção dá lucro?", type: "yesno" },
      { key: "promo_hours", label: "Promoções rodam em quais horários?", type: "text" },
      { key: "promo_days", label: "Promoções rodam em quais dias?", type: "text" },
    ],
  },
  {
    key: "reviews",
    index: 10,
    title: "Avaliações e reputação",
    subtitle: "O que os clientes dizem",
    questions: [
      { key: "avg_rating", label: "Nota média", type: "number", min: 0, max: 5 },
      { key: "main_compliments", label: "Principais elogios", type: "textarea" },
      { key: "main_complaints", label: "Principais reclamações", type: "textarea" },
      { key: "complaint_cold", label: "Reclamações sobre comida fria?", type: "yesno" },
      { key: "complaint_late", label: "Reclamações sobre atraso?", type: "yesno" },
      { key: "complaint_wrong", label: "Reclamações sobre pedido errado?", type: "yesno" },
      { key: "complaint_small", label: "Reclamações sobre porção pequena?", type: "yesno" },
      { key: "complaint_packaging", label: "Reclamações sobre embalagem?", type: "yesno" },
      { key: "complaint_service", label: "Reclamações sobre atendimento?", type: "yesno" },
      { key: "real_reviews", label: "Cole avaliações reais (uma por linha)", type: "textarea" },
    ],
  },
  {
    key: "delivery",
    index: 11,
    title: "Entrega e operação",
    subtitle: "Logística e cumprimento",
    questions: [
      { key: "promised_time", label: "Tempo médio prometido (min)", type: "number" },
      { key: "real_time", label: "Tempo médio real (min)", type: "number" },
      { key: "prep_time", label: "Tempo médio de preparo (min)", type: "number" },
      { key: "frequent_delays", label: "Atrasos frequentes?", type: "yesno" },
      { key: "courier_issues", label: "Problemas com entregador?", type: "yesno" },
      { key: "orders_waiting", label: "Pedido fica esperando?", type: "yesno" },
      { key: "food_arrives_hot", label: "Comida chega quente?", type: "yesno" },
      { key: "packaging_preserves", label: "Embalagem preserva bem o produto?", type: "yesno" },
      { key: "cancellation_rate", label: "Taxa de cancelamento (%)", type: "number" },
      { key: "cancel_reasons", label: "Principais motivos de cancelamento", type: "textarea" },
    ],
  },
  {
    key: "competitors",
    index: 12,
    title: "Concorrência",
    subtitle: "Cadastre seus principais concorrentes",
    questions: [
      { key: "items", label: "Concorrentes", type: "competitors" },
    ],
  },
  {
    key: "demand",
    index: 13,
    title: "Horários e demanda",
    subtitle: "Quando vende e quando perde",
    questions: [
      { key: "best_days", label: "Dias de maior venda", type: "text" },
      { key: "weak_days", label: "Dias mais fracos", type: "text" },
      { key: "peak_hours", label: "Horários de pico", type: "text" },
      { key: "low_hours", label: "Horários com baixa demanda", type: "text" },
      { key: "loss_hours", label: "Horários com prejuízo", type: "text" },
      { key: "opportunity_hours", label: "Horários com oportunidade", type: "text" },
      { key: "missed_hours", label: "A loja fecha em algum horário que poderia vender bem?", type: "yesno" },
    ],
  },
  {
    key: "loyalty",
    index: 14,
    title: "Recompra e fidelização",
    subtitle: "Como você traz o cliente de volta",
    questions: [
      { key: "next_purchase_coupon", label: "Existe cupom para próxima compra?", type: "yesno" },
      { key: "loyalty_card", label: "Existe cartão fidelidade?", type: "yesno" },
      { key: "packaging_message", label: "Existe mensagem na embalagem?", type: "yesno" },
      { key: "old_customer_action", label: "Existe ação para cliente antigo?", type: "yesno" },
      { key: "weekly_combo", label: "Existe combo semanal?", type: "yesno" },
      { key: "rebuy_strategy", label: "Existe estratégia para o cliente voltar?", type: "yesno" },
      { key: "knows_rebuy_rate", label: "Sabe quantos clientes recompram?", type: "yesno" },
    ],
  },
  {
    key: "ads",
    index: 15,
    title: "Anúncios e campanhas",
    subtitle: "Investimento em mídia",
    questions: [
      { key: "advertises", label: "A loja anuncia?", type: "yesno" },
      { key: "ad_channels", label: "Onde anuncia?", type: "text" },
      { key: "ad_spend", label: "Quanto gasta/mês (R$)?", type: "currency" },
      { key: "ad_product", label: "Qual produto anuncia?", type: "text" },
      { key: "ad_roi", label: "Qual ROI estimado? (ex.: 2.5x)", type: "number" },
      { key: "ad_attracts_new", label: "Atrai cliente novo?", type: "yesno" },
      { key: "ad_right_time", label: "Roda no horário certo?", type: "yesno" },
      { key: "ops_supports_growth", label: "A operação aguenta aumento de pedidos?", type: "yesno" },
      { key: "ad_profitable", label: "Campanha gera lucro ou só volume?", type: "rating3" },
    ],
  },
  {
    key: "uploads",
    index: 16,
    title: "Uploads opcionais",
    subtitle: "Envie planilhas, PDFs ou prints",
    description: "Os arquivos serão armazenados com segurança. O processamento automático estará disponível em breve.",
    questions: [{ key: "files", label: "Arquivos", type: "files" }],
  },
];

export const TOTAL_STEPS = STEPS.length;

export const findStep = (key: string) => STEPS.find((s) => s.key === key);
export const stepByIndex = (index: number) => STEPS.find((s) => s.index === index);
