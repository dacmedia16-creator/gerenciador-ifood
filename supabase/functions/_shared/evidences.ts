// Camada de evidências estruturadas — fonte da verdade objetiva.
// Cada regra retorna uma RuleEvidence rica usada pela IA consultiva.

export type Severity = "critico" | "atencao" | "ok";
export type Confidence = "alta" | "media" | "baixa";

export type EvidenceArea =
  | "vendas"
  | "conversao"
  | "ticket_medio"
  | "cancelamentos"
  | "avaliacoes"
  | "tempo_preparo"
  | "tempo_entrega"
  | "produtos"
  | "campanhas"
  | "concorrencia"
  | "cardapio"
  | "operacao"
  | "recompra"
  | "cadastro";

export interface RuleEvidence {
  rule_id: string;
  area: EvidenceArea;
  metric: string;
  current_value: number | string | null;
  reference_value: number | string | null;
  severity: Severity;
  business_impact: string;
  probable_cause: string;
  recommended_action: string;
  confidence: Confidence;
  evidence_data: Record<string, any>;
  missing_data?: string[];
}

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
const yes = (v: any) => v === true || v === "sim" || v === "yes";
const wordsCount = (s?: string) => (s || "").trim().split(/\s+/).filter(Boolean).length;

type AnswersByStep = Record<string, Record<string, any>>;

export function evidencesFromAnswers(answers: AnswersByStep): RuleEvidence[] {
  const out: RuleEvidence[] = [];
  const basic = answers.basic || {};
  const front = answers.storefront || {};
  const menu = answers.menu || {};
  const products: any[] = answers.products?.items || [];
  const combos = answers.combos || {};
  const reviews = answers.reviews || {};
  const delivery = answers.delivery || {};
  const loyalty = answers.loyalty || {};
  const ads = answers.ads || {};
  const pricing = answers.pricing || {};
  const operations = answers.operations || {};

  // === Reputação ===
  const rating = num(front.rating) ?? num(reviews.avg_rating);
  if (rating != null && rating < 4.5) {
    out.push({
      rule_id: "reputacao_nota_baixa",
      area: "avaliacoes",
      metric: "rating",
      current_value: rating,
      reference_value: 4.5,
      severity: rating < 4 ? "critico" : "atencao",
      business_impact: "Reduz visibilidade no app, conversão e ticket médio",
      probable_cause: "Problemas recorrentes em qualidade, atendimento ou entrega",
      recommended_action: "Auditar últimas 50 avaliações negativas e atacar os 3 motivos mais citados",
      confidence: "alta",
      evidence_data: { rating },
    });
  } else if (rating == null) {
    out.push({
      rule_id: "reputacao_sem_dado",
      area: "avaliacoes",
      metric: "rating",
      current_value: null,
      reference_value: 4.5,
      severity: "atencao",
      business_impact: "Reputação é o principal fator de ranking — não medir é não melhorar",
      probable_cause: "Cadastro do storefront incompleto",
      recommended_action: "Informar nota atual e quantidade de avaliações",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["nota_loja", "quantidade_avaliacoes"],
    });
  }

  const reviewsCount = num(front.reviews_count);
  if (reviewsCount != null && reviewsCount < 150) {
    out.push({
      rule_id: "reputacao_volume_baixo",
      area: "avaliacoes",
      metric: "reviews_count",
      current_value: reviewsCount,
      reference_value: 150,
      severity: "atencao",
      business_impact: "Cliente novo desconfia e algoritmo não impulsiona",
      probable_cause: "Falta de pedido ativo de avaliação após entrega",
      recommended_action: "Inserir mensagem na embalagem pedindo avaliação + cupom de retorno",
      confidence: "alta",
      evidence_data: { reviews_count: reviewsCount },
    });
  }

  // === Tempo de entrega prometido ===
  const promised = num(front.promised_delivery_time) ?? num(delivery.promised_time);
  if (promised != null && promised > 35) {
    out.push({
      rule_id: "tempo_entrega_alto",
      area: "tempo_entrega",
      metric: "promised_delivery_time_min",
      current_value: promised,
      reference_value: 35,
      severity: "critico",
      business_impact: "Cliente desiste no checkout em favor de concorrente mais rápido",
      probable_cause: "Operação interna lenta ou raio muito grande",
      recommended_action: "Reduzir raio, otimizar produção e separar pedidos por horário de pico",
      confidence: "alta",
      evidence_data: { promised_minutes: promised },
    });
  }

  // === Tempo de preparo (cozinha) ===
  const prep = num(delivery.preparation_time) ?? num(delivery.prep_time);
  if (prep != null && prep > 20) {
    out.push({
      rule_id: "tempo_preparo_alto",
      area: "tempo_preparo",
      metric: "preparation_time_min",
      current_value: prep,
      reference_value: 20,
      severity: prep > 30 ? "critico" : "atencao",
      business_impact: "Pedido sai frio e o tempo total ultrapassa o prometido",
      probable_cause: "Mise en place fraca, equipe insuficiente em pico ou cardápio complexo",
      recommended_action: "Pré-preparar itens campeões e reorganizar fluxo da cozinha em horário de pico",
      confidence: "alta",
      evidence_data: { preparation_minutes: prep },
    });
  }

  // === Cancelamentos ===
  const cancelRate = num(delivery.cancellation_rate);
  if (cancelRate != null && cancelRate > 5) {
    out.push({
      rule_id: "cancelamento_alto",
      area: "cancelamentos",
      metric: "cancellation_rate_pct",
      current_value: cancelRate,
      reference_value: 5,
      severity: "critico",
      business_impact: "Perda direta de receita e queda na reputação da plataforma",
      probable_cause: "Falta de produtos, erros de pedido ou atraso excessivo",
      recommended_action: "Implementar checklist de fechamento e atualizar disponibilidade em tempo real",
      confidence: "alta",
      evidence_data: { cancellation_rate_pct: cancelRate },
    });
  }

  // === Promessa de tempo vs tempo real ===
  const realTime = num(delivery.real_time);
  const promisedT = num(front.promised_delivery_time);
  if (realTime != null && promisedT != null && realTime > promisedT + 10) {
    out.push({
      rule_id: "promessa_nao_cumprida",
      area: "tempo_entrega",
      metric: "real_vs_promised_min",
      current_value: realTime,
      reference_value: promisedT,
      severity: "critico",
      business_impact: "Entrega chega depois do prometido — gera nota baixa e cancelamento",
      probable_cause: "Promessa otimista demais ou operação atrasando",
      recommended_action: "Ajustar tempo prometido ou acelerar cozinha/entregador",
      confidence: "alta",
      evidence_data: { real: realTime, prometido: promisedT },
    });
  }

  // === Vendas (revenue/orders mês) ===
  const monthlyRevenue = num(basic.monthly_revenue);
  const monthlyOrders = num(basic.monthly_orders);
  if (monthlyRevenue == null && monthlyOrders == null) {
    out.push({
      rule_id: "vendas_sem_dado",
      area: "vendas",
      metric: "monthly_revenue",
      current_value: null,
      reference_value: null,
      severity: "atencao",
      business_impact: "Sem volume de vendas não dá para dimensionar oportunidade",
      probable_cause: "Cadastro básico incompleto",
      recommended_action: "Informar faturamento e número de pedidos do último mês",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["faturamento_mes", "pedidos_mes"],
    });
  }

  // === Cardápio - sem fotos ===
  const noPhotoMenu = num(menu.without_photo) ?? 0;
  const totalMenu = num(menu.products_total) ?? products.length;
  const noPhotoProd = products.filter((p) => p.has_photo === false || p.has_photo === "nao").length;
  const noPhoto = noPhotoMenu + noPhotoProd;
  if (totalMenu && noPhoto / totalMenu > 0.3) {
    const ratio = noPhoto / totalMenu;
    out.push({
      rule_id: "cardapio_sem_fotos",
      area: "cardapio",
      metric: "products_without_photo_ratio",
      current_value: Number((ratio * 100).toFixed(0)),
      reference_value: 0,
      severity: ratio > 0.7 ? "critico" : "atencao",
      business_impact: "Reduz conversão em até 30% — cliente não compra o que não vê",
      probable_cause: "Cardápio incompleto ou desatualizado",
      recommended_action: "Fotografar todos os produtos com fundo neutro e boa iluminação",
      confidence: "alta",
      evidence_data: { sem_foto: noPhoto, total: totalMenu },
    });
  }

  // === Cardápio não cadastrado ===
  if (products.length === 0 && num(menu.products_total) == null) {
    out.push({
      rule_id: "cardapio_nao_cadastrado",
      area: "cardapio",
      metric: "products_total",
      current_value: 0,
      reference_value: null,
      severity: "atencao",
      business_impact: "Sem cardápio é impossível analisar margem, fotos, nomes e combos",
      probable_cause: "Cadastro inicial incompleto",
      recommended_action: "Cadastrar pelo menos os 5 produtos mais vendidos com preço, custo e foto",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["produtos"],
    });
  }

  // === Margem média ===
  const margins = products
    .map((p) => {
      const sale = num(p.sale_price);
      const food = num(p.food_cost) ?? 0;
      const pkg = num(p.packaging_cost) ?? 0;
      const fee = num(p.platform_fee_percent) ?? 0;
      if (!sale) return null;
      const cost = food + pkg + (sale * fee) / 100;
      return ((sale - cost) / sale) * 100;
    })
    .filter((m): m is number => m !== null);
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
  if (avgMargin != null && avgMargin < 20) {
    out.push({
      rule_id: "margem_media_baixa",
      area: "produtos",
      metric: "avg_margin_pct",
      current_value: Number(avgMargin.toFixed(1)),
      reference_value: 20,
      severity: "critico",
      business_impact: "Loja vende mas lucra pouco — risco financeiro",
      probable_cause: "Custos altos, preços inadequados ou cupons agressivos",
      recommended_action: "Reprecificar top vendidos e revisar cupons em itens de baixa margem",
      confidence: "alta",
      evidence_data: { avg_margin_pct: Number(avgMargin.toFixed(1)), produtos_analisados: margins.length },
    });
  } else if (products.length > 0 && margins.length === 0) {
    out.push({
      rule_id: "produtos_sem_custos",
      area: "produtos",
      metric: "products_with_costs",
      current_value: 0,
      reference_value: products.length,
      severity: "atencao",
      business_impact: "Sem custo, não dá para detectar produto campeão deficitário",
      probable_cause: "Cadastro de produto incompleto",
      recommended_action: "Preencher food_cost, packaging_cost e taxa da plataforma",
      confidence: "baixa",
      evidence_data: { total_produtos: products.length },
      missing_data: ["custos_produtos"],
    });
  }

  // === Top vendas com baixa margem ===
  const topSold = [...products]
    .filter((p) => num(p.sales_quantity) != null && Number(p.sales_quantity) > 0)
    .sort((a, b) => Number(b.sales_quantity) - Number(a.sales_quantity))
    .slice(0, 3);
  const lowMarginTop = topSold.filter((p) => {
    const sale = num(p.sale_price);
    if (!sale) return false;
    const cost = (num(p.food_cost) ?? 0) + (num(p.packaging_cost) ?? 0) + (sale * (num(p.platform_fee_percent) ?? 0)) / 100;
    return (sale - cost) / sale < 0.2;
  });
  if (lowMarginTop.length) {
    out.push({
      rule_id: "top_produto_margem_baixa",
      area: "produtos",
      metric: "top_low_margin_count",
      current_value: lowMarginTop.length,
      reference_value: 0,
      severity: "critico",
      business_impact: "Quanto mais vende, menos lucra — armadilha de volume",
      probable_cause: "Precificação não acompanhou custos ou taxa da plataforma",
      recommended_action: "Reprecificar top vendidos ou trocar por combos com maior margem",
      confidence: "alta",
      evidence_data: { produtos: lowMarginTop.map((p) => p.name) },
    });
  }

  // === Produtos com baixo desempenho ===
  if (products.length >= 5) {
    const sales = products.map((p) => num(p.sales_quantity) ?? 0);
    const total = sales.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const avg = total / products.length;
      const baixo = products.filter((p) => {
        const q = num(p.sales_quantity) ?? 0;
        return q < avg * 0.2;
      });
      if (baixo.length >= 3) {
        out.push({
          rule_id: "produtos_baixo_desempenho",
          area: "produtos",
          metric: "low_performance_products",
          current_value: baixo.length,
          reference_value: 0,
          severity: "atencao",
          business_impact: "Itens parados ocupam espaço no cardápio e diluem o foco do cliente",
          probable_cause: "Nome, foto, preço ou posicionamento ruim",
          recommended_action: "Repensar foto/descrição, reposicionar ou pausar itens parados",
          confidence: "media",
          evidence_data: { produtos: baixo.slice(0, 5).map((p) => p.name), media_vendas: Number(avg.toFixed(1)) },
        });
      }
    }
  }

  // === Nomes genéricos ===
  const generic = products.filter((p) => p.name && wordsCount(p.name) < 3);
  if (generic.length) {
    out.push({
      rule_id: "nomes_genericos",
      area: "cardapio",
      metric: "generic_name_count",
      current_value: generic.length,
      reference_value: 0,
      severity: "atencao",
      business_impact: "Pior posicionamento na busca interna e menor clique",
      probable_cause: "Nome curto não comunica ingrediente nem diferencial",
      recommended_action: "Reescrever no formato: Categoria + Ingrediente + Diferencial",
      confidence: "alta",
      evidence_data: { exemplos: generic.slice(0, 3).map((p) => p.name) },
    });
  }

  // === Ticket médio ===
  const ticket = num(basic.average_ticket);
  if (ticket != null && ticket < 35 && !yes(menu.has_combos) && !yes(combos.combo_drink)) {
    out.push({
      rule_id: "ticket_baixo_sem_combo",
      area: "ticket_medio",
      metric: "average_ticket",
      current_value: ticket,
      reference_value: 35,
      severity: "atencao",
      business_impact: "Perde receita por pedido — opera mais para mesma receita",
      probable_cause: "Cardápio sem combos atrativos",
      recommended_action: "Criar 3 combos com bebida + acompanhamento e destacar no topo",
      confidence: "alta",
      evidence_data: { ticket_medio: ticket, tem_combos: false },
    });
  }

  // === Recompra ===
  const noRebuy = !yes(loyalty.rebuy_strategy) && !yes(loyalty.next_purchase_coupon) && !yes(loyalty.loyalty_card);
  if (noRebuy) {
    out.push({
      rule_id: "sem_recompra",
      area: "recompra",
      metric: "rebuy_strategy",
      current_value: "ausente",
      reference_value: "ativo",
      severity: "atencao",
      business_impact: "CAC alto e LTV baixo — cresce mas não escala",
      probable_cause: "Foco apenas em aquisição",
      recommended_action: "Implementar cupom de retorno automático no pedido",
      confidence: "alta",
      evidence_data: {},
    });
  }

  // === Campanhas ===
  const roi = num(ads.ad_roi);
  if (yes(ads.advertises) && roi != null && roi < 1) {
    out.push({
      rule_id: "campanha_roi_negativo",
      area: "campanhas",
      metric: "ad_roi",
      current_value: roi,
      reference_value: 1,
      severity: "critico",
      business_impact: "Queima margem sem trazer cliente novo",
      probable_cause: "Segmentação ruim, cupom muito agressivo ou produto sem margem",
      recommended_action: "Pausar campanha atual e refazer com produto âncora rentável",
      confidence: "alta",
      evidence_data: { roi },
    });
  }

  // === Posicionamento de preço (substitui antigo bloco de concorrência) ===
  if (pricing.compared_competitors === "caro") {
    out.push({
      rule_id: "preco_acima_concorrencia",
      area: "concorrencia",
      metric: "price_position",
      current_value: "mais caro que concorrentes",
      reference_value: "parecido ou mais barato",
      severity: "atencao",
      business_impact: "Cliente compara e escolhe quem oferece mais por menos",
      probable_cause: "Custos altos repassados ou ausência de combos competitivos",
      recommended_action: "Criar combos com percepção de valor maior ou revisar custos para reduzir preço dos top vendidos",
      confidence: "media",
      evidence_data: { posicionamento: "caro" },
    });
  }

  // === Reviews — operação ===
  const reviewText = ((reviews.real_reviews || "") + " " + (reviews.main_complaints || "")).toLowerCase();
  if (yes(reviews.complaint_cold) || reviewText.includes("frio")) {
    out.push({
      rule_id: "reclamacao_comida_fria",
      area: "operacao",
      metric: "complaint_cold",
      current_value: "presente",
      reference_value: "ausente",
      severity: "critico",
      business_impact: "Cliente não recompra e baixa a nota da loja",
      probable_cause: "Embalagem inadequada, espera do entregador ou raio grande",
      recommended_action: "Trocar por embalagem térmica + revisar tempo + reduzir raio nos picos",
      confidence: "alta",
      evidence_data: {},
    });
  }
  const opHits: string[] = [];
  if (yes(reviews.complaint_late) || reviewText.includes("atras")) opHits.push("atraso");
  if (yes(reviews.complaint_wrong) || reviewText.includes("errado")) opHits.push("pedido errado");
  if (yes(reviews.complaint_packaging) || reviewText.includes("embalagem")) opHits.push("embalagem");
  if (opHits.length) {
    out.push({
      rule_id: "reclamacoes_operacao",
      area: "operacao",
      metric: "operational_complaints",
      current_value: opHits.join(", "),
      reference_value: "nenhuma",
      severity: "critico",
      business_impact: "Perda de recompra e queda de nota",
      probable_cause: "Falha operacional sistemática",
      recommended_action: "Atacar a causa raiz com checklist operacional",
      confidence: "media",
      evidence_data: { padroes: opHits },
    });
  }

  // === Tendência de vendas ===
  if (front.sales_trend === "caindo") {
    out.push({
      rule_id: "vendas_em_queda",
      area: "vendas",
      metric: "sales_trend",
      current_value: "caindo",
      reference_value: "estavel ou subindo",
      severity: "critico",
      business_impact: "Receita perdendo tração nos últimos 60 dias",
      probable_cause: "Concorrência, perda de relevância no app ou mudança no mix",
      recommended_action: "Rodar diagnóstico de visitas vs conversão e revisar fotos/preços dos top vendidos",
      confidence: "media",
      evidence_data: { tendencia: "caindo" },
    });
  }

  // === Visitas altas com baixa conversão ===
  const views = num(front.monthly_views);
  if (views != null && views >= 5000 && front.conversion_feeling === "ruim") {
    out.push({
      rule_id: "conversao_baixa_com_visitas",
      area: "conversao",
      metric: "views_vs_orders",
      current_value: `${views} visitas/mês com conversão percebida ruim`,
      reference_value: "≥5% de conversão",
      severity: "critico",
      business_impact: "Tráfego sendo desperdiçado — cliente entra e não pede",
      probable_cause: "Fotos fracas, preço fora da curva ou nota baixa",
      recommended_action: "Auditar fotos do topo do cardápio, preços percebidos e nota da loja",
      confidence: "media",
      evidence_data: { visitas: views },
    });
  }

  // === Operação: estoque ===
  if (operations.stockout_frequency === "muito" || operations.stockout_frequency === "as_vezes") {
    out.push({
      rule_id: "estoque_recorrente",
      area: "operacao",
      metric: "stockout_frequency",
      current_value: operations.stockout_frequency,
      reference_value: "raro",
      severity: operations.stockout_frequency === "muito" ? "critico" : "atencao",
      business_impact: "Cliente cancela ou desconfia quando item some do cardápio",
      probable_cause: "Falta de controle de estoque ou previsão de pico",
      recommended_action: "Checklist diário de disponibilidade + estoque mínimo dos top vendidos",
      confidence: "alta",
      evidence_data: {},
    });
  }

  // === Operação: pico não dá conta ===
  if (operations.peak_capacity_ok === "ruim") {
    out.push({
      rule_id: "pico_sem_capacidade",
      area: "operacao",
      metric: "peak_capacity",
      current_value: "não dá conta",
      reference_value: "atende sem atrasar",
      severity: "atencao",
      business_impact: "Atrasos em horário de pico = nota baixa e cliente perdido",
      probable_cause: "Equipe insuficiente, mise en place fraco ou cardápio complexo",
      recommended_action: "Pré-preparo + reforço de equipe nos picos identificados",
      confidence: "media",
      evidence_data: {},
    });
  }

  // === Marketing: sem diferencial claro ===
  if (!ads.unique_value || wordsCount(ads.unique_value) < 4) {
    out.push({
      rule_id: "sem_diferencial_claro",
      area: "concorrencia",
      metric: "unique_value",
      current_value: "ausente ou vago",
      reference_value: "definido",
      severity: "atencao",
      business_impact: "Sem diferencial, cliente decide só por preço",
      probable_cause: "Posicionamento não articulado",
      recommended_action: "Definir frase única de venda e usá-la em capa, descrição e Instagram",
      confidence: "media",
      evidence_data: {},
    });
  }

  // === Marketing: concorrente na frente em algo central ===
  const compAdv: string[] = Array.isArray(ads.competitor_advantage) ? ads.competitor_advantage : [];
  const heavy = compAdv.filter((c) => ["preco", "fotos", "nota", "entrega"].includes(c));
  if (heavy.length) {
    out.push({
      rule_id: "concorrente_na_frente",
      area: "concorrencia",
      metric: "competitor_advantage",
      current_value: heavy.join(", "),
      reference_value: "paridade ou liderança",
      severity: "atencao",
      business_impact: "Cliente pode migrar quando o concorrente é melhor em fatores decisivos",
      probable_cause: "Gap em pelo menos um pilar (preço, foto, nota, entrega)",
      recommended_action: "Atacar o item mais citado primeiro — começar por foto/preço se possível",
      confidence: "media",
      evidence_data: { areas: heavy },
    });
  }

  return out;
}

// Espelha evidência → Diagnostic (formato antigo) para retrocompatibilidade.
export function evidenceToDiagnostic(e: RuleEvidence) {
  return {
    area: e.area,
    problem: `${e.metric}: ${e.current_value ?? "sem dado"}${e.reference_value != null ? ` (ref: ${e.reference_value})` : ""}`,
    evidence: JSON.stringify(e.evidence_data),
    probable_cause: e.probable_cause,
    business_impact: e.business_impact,
    recommended_solution: e.recommended_action,
    priority: (e.severity === "critico" ? "alta" : e.severity === "atencao" ? "media" : "baixa") as "alta" | "media" | "baixa",
    practical_action: e.recommended_action,
    suggested_deadline: e.severity === "critico" ? "14 dias" : "30 dias",
    severity: e.severity,
  };
}

// Mescla listas de evidências por rule_id, mantendo a maior severidade
// e unindo evidence_data e missing_data. A ordem prioriza `b` sobre `a`
// quando há campos preenchidos no mais recente.
export function mergeEvidences(a: RuleEvidence[], b: RuleEvidence[]): RuleEvidence[] {
  const sevRank: Record<Severity, number> = { critico: 3, atencao: 2, ok: 1 };
  const map = new Map<string, RuleEvidence>();
  for (const ev of [...(a || []), ...(b || [])]) {
    if (!ev?.rule_id) continue;
    const cur = map.get(ev.rule_id);
    if (!cur) {
      map.set(ev.rule_id, { ...ev, evidence_data: { ...(ev.evidence_data || {}) } });
      continue;
    }
    const keepNew = sevRank[ev.severity] >= sevRank[cur.severity];
    const base = keepNew ? ev : cur;
    const other = keepNew ? cur : ev;
    map.set(ev.rule_id, {
      ...base,
      evidence_data: { ...(other.evidence_data || {}), ...(base.evidence_data || {}) },
      missing_data: Array.from(new Set([...(other.missing_data || []), ...(base.missing_data || [])])),
    });
  }
  return Array.from(map.values());
}

// Gera evidências a partir dos dados estruturados já persistidos da loja.
// Mantemos um conjunto enxuto de regras objetivas (sem invenção). Caso
// algum dado esteja ausente, registramos em `missing_data` em vez de
// emitir evidência de severidade alta.
export function evidencesFromStoreData(input: {
  store: any;
  metrics: any[];
  products: any[];
  reviews: any[];
  competitors: any[];
}): RuleEvidence[] {
  const out: RuleEvidence[] = [];
  const { store, metrics = [], products = [], reviews = [], competitors = [] } = input || ({} as any);

  // Última métrica conhecida (assume ordenação por data desc se vier do caller; fazemos fallback).
  const latest = [...metrics].sort((a, b) => {
    const da = new Date(a.period_end || a.created_at || 0).getTime();
    const db = new Date(b.period_end || b.created_at || 0).getTime();
    return db - da;
  })[0];

  // Cancelamento alto
  const cancel = num(latest?.cancellation_rate);
  if (cancel != null && cancel >= 5) {
    out.push({
      rule_id: "store_cancellation_high",
      area: "cancelamentos",
      metric: "cancellation_rate",
      current_value: cancel,
      reference_value: 2,
      severity: cancel >= 8 ? "critico" : "atencao",
      business_impact: "Cancelamentos altos reduzem visibilidade na vitrine e queimam ticket.",
      probable_cause: "Falta de produto, demora no aceite ou erro operacional.",
      recommended_action: "Auditar últimos cancelamentos e aplicar checklist de aceite/preparo.",
      confidence: "alta",
      evidence_data: { source: "store_metrics", value: cancel },
    });
  }

  // Tempo de preparo alto
  const prep = num(latest?.prep_time);
  if (prep != null && prep >= 35) {
    out.push({
      rule_id: "store_prep_time_high",
      area: "tempo_preparo",
      metric: "prep_time",
      current_value: prep,
      reference_value: 25,
      severity: prep >= 45 ? "critico" : "atencao",
      business_impact: "Tempo alto reduz conversão e aumenta cancelamentos.",
      probable_cause: "Fluxo de cozinha, mise en place ou aceite tardio.",
      recommended_action: "Cronometrar etapas e ajustar tempo no app conforme realidade.",
      confidence: "media",
      evidence_data: { source: "store_metrics", value: prep },
    });
  }

  // Avaliação média baixa
  if (Array.isArray(reviews) && reviews.length >= 5) {
    const avg = reviews.reduce((s, r) => s + (num(r.rating) ?? 0), 0) / reviews.length;
    if (avg && avg < 4.4) {
      out.push({
        rule_id: "store_rating_low",
        area: "avaliacoes",
        metric: "avg_rating",
        current_value: Number(avg.toFixed(2)),
        reference_value: 4.6,
        severity: avg < 4.0 ? "critico" : "atencao",
        business_impact: "Nota baixa reduz cliques e conversão na vitrine.",
        probable_cause: "Problemas recorrentes em qualidade, embalagem ou tempo.",
        recommended_action: "Classificar últimas 30 avaliações por motivo e atacar top 2.",
        confidence: "alta",
        evidence_data: { source: "reviews", count: reviews.length, avg },
      });
    }
  }

  // Sem concorrentes mapeados
  if (!competitors || competitors.length === 0) {
    out.push({
      rule_id: "store_no_competitors_mapped",
      area: "concorrencia",
      metric: "competitors_count",
      current_value: 0,
      reference_value: 3,
      severity: "atencao",
      business_impact: "Sem benchmark de preço/promoção é difícil posicionar a loja.",
      probable_cause: "Concorrência ainda não foi cadastrada no sistema.",
      recommended_action: "Mapear ao menos 3 concorrentes diretos da mesma categoria.",
      confidence: "alta",
      evidence_data: { source: "competitors" },
      missing_data: ["competitors"],
    });
  }

  // Cardápio muito curto
  if (Array.isArray(products) && products.length > 0 && products.length < 8) {
    out.push({
      rule_id: "store_menu_too_short",
      area: "cardapio",
      metric: "products_count",
      current_value: products.length,
      reference_value: 12,
      severity: "atencao",
      business_impact: "Cardápio curto limita ticket médio e recompra.",
      probable_cause: "Catálogo ainda incompleto ou itens desativados.",
      recommended_action: "Revisar mix e ativar combos/adicionais relevantes.",
      confidence: "media",
      evidence_data: { source: "products", count: products.length },
    });
  }

  // Loja sem dados básicos
  if (!store || (!store.name && !store.category)) {
    out.push({
      rule_id: "store_missing_basics",
      area: "cadastro",
      metric: "store_basics",
      current_value: null,
      reference_value: null,
      severity: "atencao",
      business_impact: "Sem cadastro básico a análise perde precisão.",
      probable_cause: "Onboarding incompleto.",
      recommended_action: "Completar nome, categoria e cidade da loja.",
      confidence: "alta",
      evidence_data: {},
      missing_data: ["store.name", "store.category"],
    });
  }

  return out;
}
