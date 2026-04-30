import type { Diagnostic } from "@/lib/diagnostics/engine";

type AnswersByStep = Record<string, Record<string, any>>;

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const yes = (v: any) => v === true || v === "sim" || v === "yes";

export function rulesFromAnswers(answers: AnswersByStep): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const basic = answers.basic || {};
  const front = answers.storefront || {};
  const menu = answers.menu || {};
  const products: any[] = answers.products?.items || [];
  const pricing = answers.pricing || {};
  const combos = answers.combos || {};
  const reviews = answers.reviews || {};
  const delivery = answers.delivery || {};
  const competitors: any[] = answers.competitors?.items || [];
  const loyalty = answers.loyalty || {};
  const ads = answers.ads || {};

  const rating = num(front.rating) ?? num(reviews.avg_rating);
  if (rating != null && rating < 4.5) {
    diags.push({
      area: "Avaliações e reputação",
      problem: `Nota média ${rating} abaixo do recomendado (4.5)`,
      evidence: `Nota informada: ${rating} estrelas`,
      probable_cause: "Problemas recorrentes em qualidade, atendimento ou entrega",
      business_impact: "Reduz visibilidade no app, conversão e ticket médio",
      recommended_solution: "Auditar últimas 50 avaliações negativas e atacar os 3 motivos mais citados",
      priority: rating < 4 ? "alta" : "media",
      practical_action: "Responder negativas e ajustar os 3 maiores gargalos",
      suggested_deadline: "30 dias",
      severity: rating < 4 ? "critico" : "atencao",
    });
  }

  const promised = num(front.promised_delivery_time) ?? num(delivery.promised_time);
  if (promised != null && promised > 45) {
    diags.push({
      area: "Tempo de entrega",
      problem: `Tempo prometido alto: ${promised} min`,
      evidence: `Promessa de ${promised}min vs. ideal <40min`,
      probable_cause: "Operação interna lenta ou raio muito grande",
      business_impact: "Cliente desiste no checkout em favor de concorrente mais rápido",
      recommended_solution: "Reduzir raio, otimizar produção e separar pedidos por horário de pico",
      priority: "alta",
      practical_action: "Mapear gargalos da cozinha e renegociar com entregadores",
      suggested_deadline: "21 dias",
      severity: "critico",
    });
  }

  const cancelRate = num(delivery.cancellation_rate);
  if (cancelRate != null && cancelRate > 5) {
    diags.push({
      area: "Cancelamentos e erros",
      problem: `Taxa de cancelamento alta: ${cancelRate}%`,
      evidence: "Acima do limite saudável de 5%",
      probable_cause: "Falta de produtos, erros de pedido ou atraso excessivo",
      business_impact: "Perda direta de receita e queda na reputação da plataforma",
      recommended_solution: "Implementar checklist de fechamento e atualizar disponibilidade em tempo real",
      priority: "alta",
      practical_action: "Pausar produtos sem estoque e revisar fluxo de aceite",
      suggested_deadline: "14 dias",
      severity: "critico",
    });
  }

  // Margem dos produtos cadastrados
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
    diags.push({
      area: "Preço e margem",
      problem: `Margem média baixa: ${avgMargin.toFixed(1)}%`,
      evidence: `Média dos ${products.length} produtos cadastrados`,
      probable_cause: "Custos altos, preços inadequados ou cupons agressivos",
      business_impact: "Loja vende mas lucra pouco — risco financeiro",
      recommended_solution: "Reprecificar top vendidos e revisar cupons em itens de baixa margem",
      priority: "alta",
      practical_action: "Reprecificar 5 produtos campeões com base em custo + taxa",
      suggested_deadline: "10 dias",
      severity: "critico",
    });
  }

  // Fotos
  const noPhotoMenu = num(menu.without_photo);
  const totalMenu = num(menu.products_total) ?? products.length;
  const noPhotoProd = products.filter((p) => p.has_photo === false || p.has_photo === "nao").length;
  const noPhoto = (noPhotoMenu ?? 0) + noPhotoProd;
  if (totalMenu && noPhoto / totalMenu > 0.4) {
    diags.push({
      area: "Cardápio / Fotos",
      problem: `${noPhoto} produtos sem foto (${Math.round((noPhoto / totalMenu) * 100)}%)`,
      evidence: `Mais de 40% do cardápio sem imagem`,
      probable_cause: "Cardápio incompleto ou desatualizado",
      business_impact: "Reduz conversão em até 30% — cliente não compra o que não vê",
      recommended_solution: "Fotografar todos os produtos com fundo neutro e boa iluminação",
      priority: "alta",
      practical_action: "Sessão de fotos em lote dos 10 mais vendidos",
      suggested_deadline: "15 dias",
      severity: "atencao",
    });
  }

  // Ticket médio sem combos
  const ticket = num(basic.average_ticket);
  if (ticket != null && ticket < 35 && !yes(menu.has_combos) && !yes(combos.combo_drink)) {
    diags.push({
      area: "Combos e ticket médio",
      problem: `Ticket médio baixo: R$ ${ticket} sem combos cadastrados`,
      evidence: `Ticket informado abaixo de R$ 35 e sem combos`,
      probable_cause: "Cardápio sem agrupamentos atrativos",
      business_impact: "Perde receita por pedido — opera mais para mesma receita",
      recommended_solution: "Criar 3 combos com bebida + acompanhamento e destacar no topo",
      priority: "media",
      practical_action: "Lançar combo principal com 15% de desconto vs. avulsos",
      suggested_deadline: "20 dias",
      severity: "atencao",
    });
  }

  // Recompra
  const noRebuy = !yes(loyalty.rebuy_strategy) && !yes(loyalty.next_purchase_coupon) && !yes(loyalty.loyalty_card);
  if (noRebuy) {
    diags.push({
      area: "Recompra e fidelização",
      problem: "Sem estratégia clara de recompra",
      evidence: "Sem cupom de retorno, sem fidelidade, sem ação para cliente antigo",
      probable_cause: "Foco apenas em aquisição — cliente novo é caro",
      business_impact: "CAC alto e LTV baixo — cresce mas não escala",
      recommended_solution: "Implementar cupom de retorno automático no pedido",
      priority: "media",
      practical_action: "Criar cupom de 15% válido por 14 dias após o pedido",
      suggested_deadline: "21 dias",
      severity: "atencao",
    });
  }

  // ROI campanhas
  const roi = num(ads.ad_roi);
  if (yes(ads.advertises) && roi != null && roi < 1) {
    diags.push({
      area: "Anúncios e campanhas",
      problem: `Anúncios com ROI negativo (${roi}x)`,
      evidence: "Investimento maior que retorno declarado",
      probable_cause: "Segmentação ruim ou cupom muito agressivo",
      business_impact: "Queima margem sem trazer cliente novo",
      recommended_solution: "Pausar campanha atual e refazer mira",
      priority: "media",
      practical_action: "Encerrar e testar nova com público específico",
      suggested_deadline: "7 dias",
      severity: "atencao",
    });
  }

  // Concorrência
  const myFee = num(front.delivery_fee);
  const myTime = num(front.promised_delivery_time);
  const fasterCount = competitors.filter((c) => num(c.delivery_time) != null && myTime != null && Number(c.delivery_time) < myTime).length;
  const cheaperCount = competitors.filter((c) => num(c.delivery_fee) != null && myFee != null && Number(c.delivery_fee) < myFee).length;
  if (fasterCount >= 2 || cheaperCount >= 2) {
    diags.push({
      area: "Concorrência",
      problem: `Concorrentes com melhor entrega (${fasterCount} mais rápidos, ${cheaperCount} mais baratos)`,
      evidence: `${competitors.length} concorrentes cadastrados`,
      probable_cause: "Operação ou política de taxa menos competitiva",
      business_impact: "Cliente escolhe quem entrega mais rápido e barato",
      recommended_solution: "Reduzir promessa de tempo e ajustar taxa em horários de pico",
      priority: "media",
      practical_action: "Comparar cardápios e tempos com top 3 concorrentes",
      suggested_deadline: "30 dias",
      severity: "atencao",
    });
  }

  // Reviews — keywords
  const reviewText = (reviews.real_reviews || "") + " " + (reviews.main_complaints || "");
  const lower = reviewText.toLowerCase();
  const hits: string[] = [];
  if (yes(reviews.complaint_late) || lower.includes("atras")) hits.push("atraso");
  if (yes(reviews.complaint_cold) || lower.includes("frio")) hits.push("comida fria");
  if (yes(reviews.complaint_packaging) || lower.includes("embalagem")) hits.push("embalagem");
  if (yes(reviews.complaint_wrong) || lower.includes("errado")) hits.push("pedido errado");
  if (hits.length) {
    diags.push({
      area: "Experiência do cliente",
      problem: `Reclamações recorrentes: ${hits.join(", ")}`,
      evidence: `Padrões detectados nas avaliações informadas`,
      probable_cause: "Falha operacional sistemática",
      business_impact: "Perda de recompra e queda de nota",
      recommended_solution: "Atacar a causa raiz com checklist operacional",
      priority: "alta",
      practical_action: "Reunião semanal revisando cada padrão",
      suggested_deadline: "30 dias",
      severity: "critico",
    });
  }

  // Top vendas com baixa margem
  const lowMarginTop = products.filter((p) => num(p.sales_quantity) != null && Number(p.sales_quantity) > 0).slice().sort((a, b) => Number(b.sales_quantity) - Number(a.sales_quantity)).slice(0, 3);
  const lowMarginAlert = lowMarginTop.some((p, i) => {
    const sale = num(p.sale_price);
    const cost = (num(p.food_cost) ?? 0) + (num(p.packaging_cost) ?? 0) + (sale ? (sale * (num(p.platform_fee_percent) ?? 0)) / 100 : 0);
    return sale && (sale - cost) / sale < 0.2;
  });
  if (lowMarginAlert) {
    diags.push({
      area: "Lucro vs. volume",
      problem: "Produtos campeões de venda têm margem abaixo de 20%",
      evidence: "Top 3 mais vendidos analisados",
      probable_cause: "Precificação não acompanhou custos ou taxa da plataforma",
      business_impact: "Quanto mais vende, menos lucra — armadilha de volume",
      recommended_solution: "Reprecificar top vendidos ou trocar por combos com maior margem",
      priority: "alta",
      practical_action: "Subir preço do top 1 em 8% e medir impacto na demanda",
      suggested_deadline: "14 dias",
      severity: "critico",
    });
  }

  return diags;
}
