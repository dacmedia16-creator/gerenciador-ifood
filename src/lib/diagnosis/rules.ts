import type { Diagnostic } from "@/lib/diagnostics/engine";
import { classifyConversion, computeConversion } from "./conversion";

type AnswersByStep = Record<string, Record<string, any>>;

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
const yes = (v: any) => v === true || v === "sim" || v === "yes";
const wordsCount = (s?: string) => (s || "").trim().split(/\s+/).filter(Boolean).length;

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
  const conversion = answers.conversion || {};

  // === Reputação ===
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

  const reviewsCount = num(front.reviews_count);
  if (reviewsCount != null && reviewsCount < 150) {
    diags.push({
      area: "Reputação / Volume social",
      problem: `Apenas ${reviewsCount} avaliações — baixo volume aparente`,
      evidence: `<150 avaliações reduz prova social e ranking`,
      probable_cause: "Falta de pedido ativo de avaliação após entrega",
      business_impact: "Cliente novo desconfia e algoritmo não impulsiona",
      recommended_solution: "Inserir mensagem na embalagem pedindo avaliação + cupom de retorno",
      priority: "media",
      practical_action: "Adicionar adesivo/card 'Avalie a gente no iFood'",
      suggested_deadline: "15 dias",
      severity: "atencao",
    });
  }

  // === Tempo de entrega ===
  const promised = num(front.promised_delivery_time) ?? num(delivery.promised_time);
  if (promised != null && promised > 35) {
    diags.push({
      area: "Tempo de entrega",
      problem: `Tempo prometido alto: ${promised} min`,
      evidence: `Promessa de ${promised}min vs. ideal ≤35min em raio próximo`,
      probable_cause: "Operação interna lenta ou raio muito grande",
      business_impact: "Cliente desiste no checkout em favor de concorrente mais rápido",
      recommended_solution: "Reduzir raio, otimizar produção e separar pedidos por horário de pico",
      priority: "alta",
      practical_action: "Mapear gargalos da cozinha e renegociar com entregadores",
      suggested_deadline: "21 dias",
      severity: "critico",
    });
  }

  // === Cancelamentos ===
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

  // === Conversão ===
  const visits = num(conversion.visits);
  const orders = num(conversion.orders);
  const convRate = num(conversion.conversion_rate) ?? computeConversion(visits, orders);
  const convLevel = classifyConversion(convRate);
  if (convLevel === "critico") {
    diags.push({
      area: "Conversão",
      problem: `Conversão crítica: ${convRate}% (<7%)`,
      evidence: `${visits ?? "?"} visitas → ${orders ?? "?"} pedidos`,
      probable_cause: "Vitrine, fotos, preço ou taxa de entrega afastando o cliente",
      business_impact: "Loja recebe tráfego, mas perde quase todos antes do pedido",
      recommended_solution: "Revisar capa, top fotos, combo no topo, cupom de 1ª compra e taxa de entrega",
      priority: "alta",
      practical_action: "Testar combo principal no topo + cupom 1ª compra por 14 dias",
      suggested_deadline: "14 dias",
      severity: "critico",
    });
  } else if (convLevel === "atencao") {
    diags.push({
      area: "Conversão",
      problem: `Conversão abaixo do ideal: ${convRate}% (7–11,9%)`,
      evidence: `${visits ?? "?"} visitas → ${orders ?? "?"} pedidos`,
      probable_cause: "Cardápio sem combos atrativos ou nomes/descrições fracas",
      business_impact: "Margem de melhoria grande — pequenos ajustes geram +30% pedidos",
      recommended_solution: "Reescrever nomes dos top 5 e criar 2 combos com cross-sell",
      priority: "media",
      practical_action: "Ajustar nomes + descrições + 2 combos novos",
      suggested_deadline: "21 dias",
      severity: "atencao",
    });
  }

  // === Produtos sem foto (>30%) ===
  const noPhotoMenu = num(menu.without_photo);
  const totalMenu = num(menu.products_total) ?? products.length;
  const noPhotoProd = products.filter((p) => p.has_photo === false || p.has_photo === "nao").length;
  const noPhoto = (noPhotoMenu ?? 0) + noPhotoProd;
  if (totalMenu && noPhoto / totalMenu > 0.3) {
    diags.push({
      area: "Cardápio / Fotos",
      problem: `${noPhoto} produtos sem foto (${Math.round((noPhoto / totalMenu) * 100)}%)`,
      evidence: `Mais de 30% do cardápio sem imagem`,
      probable_cause: "Cardápio incompleto ou desatualizado",
      business_impact: "Reduz conversão em até 30% — cliente não compra o que não vê",
      recommended_solution: "Fotografar todos os produtos com fundo neutro e boa iluminação",
      priority: "alta",
      practical_action: "Sessão de fotos em lote dos 10 mais vendidos",
      suggested_deadline: "15 dias",
      severity: "atencao",
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

  // === Top vendas com baixa margem (<20%) ===
  const topSold = [...products]
    .filter((p) => num(p.sales_quantity) != null && Number(p.sales_quantity) > 0)
    .sort((a, b) => Number(b.sales_quantity) - Number(a.sales_quantity))
    .slice(0, 3);
  const lowMarginAlert = topSold.some((p) => {
    const sale = num(p.sale_price);
    if (!sale) return false;
    const cost = (num(p.food_cost) ?? 0) + (num(p.packaging_cost) ?? 0) + (sale * (num(p.platform_fee_percent) ?? 0)) / 100;
    return (sale - cost) / sale < 0.2;
  });
  if (lowMarginAlert) {
    diags.push({
      area: "Lucro vs. volume",
      problem: "Produto campeão de venda com margem abaixo de 20%",
      evidence: `Top ${topSold.length} mais vendidos analisados`,
      probable_cause: "Precificação não acompanhou custos ou taxa da plataforma",
      business_impact: "Quanto mais vende, menos lucra — armadilha de volume",
      recommended_solution: "Reprecificar top vendidos ou trocar por combos com maior margem",
      priority: "alta",
      practical_action: "Subir preço do top 1 em 8% e medir impacto na demanda",
      suggested_deadline: "14 dias",
      severity: "critico",
    });
  }

  // === Nome de produto genérico (<3 palavras) ===
  const genericNames = products.filter((p) => p.name && wordsCount(p.name) < 3);
  if (genericNames.length) {
    diags.push({
      area: "SEO interno do cardápio",
      problem: `${genericNames.length} produto(s) com nome genérico (<3 palavras)`,
      evidence: genericNames.slice(0, 3).map((p) => `"${p.name}"`).join(", "),
      probable_cause: "Nome curto não comunica ingrediente, diferencial nem palavra-chave",
      business_impact: "Pior posicionamento na busca interna e menor clique",
      recommended_solution: "Reescrever no formato: Categoria + Ingrediente principal + Diferencial",
      priority: "media",
      practical_action: "Use o Analisador de Nome de Produto para gerar sugestões com IA",
      suggested_deadline: "10 dias",
      severity: "atencao",
    });
  }

  // === Descrição fraca (<80 chars) ===
  const weakDesc = products.filter((p) => p.notes && String(p.notes).length > 0 && String(p.notes).length < 80);
  if (weakDesc.length) {
    diags.push({
      area: "Descrição de produtos",
      problem: `${weakDesc.length} produto(s) com descrição fraca (<80 caracteres)`,
      evidence: "Descrições curtas reduzem conversão na tela do produto",
      probable_cause: "Falta de detalhe sobre ingredientes, porção e diferencial",
      business_impact: "Cliente abre, lê, fecha — sem adicionar ao carrinho",
      recommended_solution: "Reescrever descrições com 80–200 caracteres incluindo ingrediente, porção e por que vale a pena",
      priority: "media",
      practical_action: "Reescrever os top 5 produtos primeiro",
      suggested_deadline: "14 dias",
      severity: "atencao",
    });
  }

  // === Ticket médio sem combos ===
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

  // === Recompra ===
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

  // === Campanha com ROI negativo ===
  const roi = num(ads.ad_roi);
  if (yes(ads.advertises) && roi != null && roi < 1) {
    diags.push({
      area: "Anúncios e campanhas",
      problem: `Campanha com ROI negativo (${roi}x) — promoção queima dinheiro`,
      evidence: "Investimento maior que retorno declarado",
      probable_cause: "Segmentação ruim, cupom muito agressivo ou margem do produto baixa",
      business_impact: "Queima margem sem trazer cliente novo",
      recommended_solution: "Pausar campanha atual, refazer mira e usar produto com margem ≥30%",
      priority: "alta",
      practical_action: "Encerrar campanha e testar nova com público novo + produto âncora rentável",
      suggested_deadline: "7 dias",
      severity: "critico",
    });
  }

  // === Concorrência ===
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

  // === Reviews — comida fria, foto enganosa ===
  const reviewText = ((reviews.real_reviews || "") + " " + (reviews.main_complaints || "")).toLowerCase();
  if (yes(reviews.complaint_cold) || reviewText.includes("frio") || reviewText.includes("comida fria")) {
    diags.push({
      area: "Embalagem e logística",
      problem: "Reclamações de comida fria",
      evidence: "Padrão detectado nas avaliações ou marcação direta",
      probable_cause: "Embalagem inadequada, tempo de espera do entregador ou raio grande",
      business_impact: "Cliente não recompra e ainda baixa a nota da loja",
      recommended_solution: "Trocar embalagem por térmica + revisar tempo de preparo + reduzir raio nos picos",
      priority: "alta",
      practical_action: "Testar saco térmico e medir reclamações por 14 dias",
      suggested_deadline: "21 dias",
      severity: "critico",
    });
  }
  if (reviewText.includes("foto enganosa") || reviewText.includes("não parece") || reviewText.includes("nao parece") || reviewText.includes("veio diferente") || reviewText.includes("porção pequena") || reviewText.includes("porcao pequena")) {
    diags.push({
      area: "Expectativa vs entrega",
      problem: "Risco alto de baixa recompra: foto promete mais do que entrega",
      evidence: "Reviews mencionam 'foto enganosa', 'veio diferente' ou 'porção pequena'",
      probable_cause: "Fotos antigas, embalagem que deforma ou porção menor que o ilustrado",
      business_impact: "Recompra próxima de zero + reclamações públicas",
      recommended_solution: "Refotografar com a porção real e adicionar peso/quantidade na descrição",
      priority: "alta",
      practical_action: "Revisar top 5 fotos esta semana e atualizar descrições",
      suggested_deadline: "10 dias",
      severity: "critico",
    });
  }
  const hits: string[] = [];
  if (yes(reviews.complaint_late) || reviewText.includes("atras")) hits.push("atraso");
  if (yes(reviews.complaint_wrong) || reviewText.includes("errado")) hits.push("pedido errado");
  if (yes(reviews.complaint_packaging) || reviewText.includes("embalagem")) hits.push("embalagem");
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

  // ============================================================
  // === REGRAS DE FALLBACK — quando faltam dados específicos ===
  // ============================================================

  // Cardápio não cadastrado
  if (products.length === 0 && num(menu.products_total) == null) {
    diags.push({
      area: "Cardápio",
      problem: "Cardápio não cadastrado no diagnóstico",
      evidence: "Nenhum produto informado no funil",
      probable_cause: "Cadastro inicial incompleto",
      business_impact: "Sem cardápio é impossível analisar margem, fotos, nomes e combos",
      recommended_solution: "Cadastrar pelo menos os 5 produtos mais vendidos com preço, custo e foto",
      priority: "alta",
      practical_action: "Acessar Produtos > Adicionar e cadastrar top 5 vendidos",
      suggested_deadline: "7 dias",
      severity: "atencao",
    });
  }

  // Custos não informados — impede análise de margem
  if (products.length > 0) {
    const withCosts = products.filter((p) => num(p.food_cost) != null || num(p.packaging_cost) != null);
    if (withCosts.length === 0) {
      diags.push({
        area: "Preço e margem",
        problem: "Custos dos produtos não informados",
        evidence: `${products.length} produto(s) cadastrados sem custo de insumo ou embalagem`,
        probable_cause: "Cadastro de produto incompleto",
        business_impact: "Sem custo, não é possível calcular margem real nem detectar produtos campeões deficitários",
        recommended_solution: "Preencher food_cost, packaging_cost e taxa da plataforma para cada produto",
        priority: "alta",
        practical_action: "Editar cada produto e informar custo de insumo + embalagem",
        suggested_deadline: "7 dias",
        severity: "atencao",
      });
    }
  }

  // Sem informação de reputação
  if (rating == null) {
    diags.push({
      area: "Avaliações e reputação",
      problem: "Sem informação de nota / avaliações",
      evidence: "Nenhuma nota informada no funil ou no cadastro da loja",
      probable_cause: "Cadastro do storefront incompleto",
      business_impact: "Reputação é o principal fator de ranking — não medir é não melhorar",
      recommended_solution: "Informar nota atual e quantidade de avaliações da loja na plataforma",
      priority: "media",
      practical_action: "Editar a loja e preencher nota + nº de avaliações",
      suggested_deadline: "3 dias",
      severity: "atencao",
    });
  }

  // Sem dados de funil de conversão
  if (visits == null && orders == null && num(conversion.conversion_rate) == null) {
    diags.push({
      area: "Conversão",
      problem: "Sem dados de funil de visitas → pedidos",
      evidence: "Nenhuma informação de visitas, cliques ou pedidos do período",
      probable_cause: "Métricas do iFood / plataforma não informadas",
      business_impact: "Sem funil é impossível identificar onde a loja perde cliente",
      recommended_solution: "Informar visitas e pedidos do último mês para calcular conversão",
      priority: "alta",
      practical_action: "Pegar print do iFood Gestor de Vendas e cadastrar em Métricas",
      suggested_deadline: "5 dias",
      severity: "atencao",
    });
  }

  // Sem mapeamento de concorrência
  if (competitors.length === 0) {
    diags.push({
      area: "Concorrência",
      problem: "Sem mapeamento de concorrentes",
      evidence: "Nenhum concorrente cadastrado",
      probable_cause: "Etapa de competidores não preenchida",
      business_impact: "Sem benchmark, não é possível avaliar tempo, taxa e posicionamento relativos",
      recommended_solution: "Cadastrar 3 concorrentes diretos com nota, tempo, taxa e diferenciais",
      priority: "media",
      practical_action: "Buscar 3 concorrentes no iFood e preencher Concorrentes",
      suggested_deadline: "10 dias",
      severity: "atencao",
    });
  }

  // Sem avaliações reais coletadas
  if (!reviews.real_reviews && !reviews.main_complaints && !yes(reviews.complaint_cold) && !yes(reviews.complaint_late) && !yes(reviews.complaint_wrong) && !yes(reviews.complaint_packaging)) {
    diags.push({
      area: "Voz do cliente",
      problem: "Sem coleta de avaliações reais",
      evidence: "Nenhum comentário ou reclamação informada no funil",
      probable_cause: "Etapa de avaliações não preenchida",
      business_impact: "Sem voz do cliente, diagnóstico de operação fica cego",
      recommended_solution: "Colar 10 avaliações recentes (boas e ruins) na etapa de avaliações",
      priority: "media",
      practical_action: "Copiar 10 reviews da plataforma e colar no funil",
      suggested_deadline: "5 dias",
      severity: "atencao",
    });
  }

  return diags;
}

// Constrói o plano de 7 dias a partir dos diagnósticos priorizando críticos.
export function buildSevenDayPlan(diagnostics: Diagnostic[]): { day: number; title: string; action: string; area: string }[] {
  const sorted = [...diagnostics].sort((a, b) => {
    const sev = (s: string) => (s === "critico" ? 0 : s === "atencao" ? 1 : 2);
    return sev(a.severity) - sev(b.severity);
  });
  const top = sorted.slice(0, 7);
  return top.map((d, i) => ({
    day: i + 1,
    title: d.recommended_solution.slice(0, 80),
    action: d.practical_action,
    area: d.area,
  }));
}
