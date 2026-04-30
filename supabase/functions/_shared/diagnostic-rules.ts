// Versão Deno do motor de regras (espelho de src/lib/diagnostics/engine.ts)
export type Severity = "critico" | "atencao" | "ok";
export type Priority = "alta" | "media" | "baixa";

export interface Diagnostic {
  area: string;
  problem: string;
  evidence: string;
  probable_cause: string;
  business_impact: string;
  recommended_solution: string;
  priority: Priority;
  practical_action: string;
  suggested_deadline: string;
  severity: Severity;
}

const NEG_KEYWORDS = ["frio", "atrasou", "atras", "errado", "pequena", "embalagem", "ruim", "demorou", "péssimo", "pessimo"];

export function runDiagnostics(input: {
  store: any;
  metrics: any[];
  products: any[];
  reviews: any[];
  competitors: any[];
  campaigns: any[];
}): Diagnostic[] {
  const { store, products, reviews, competitors, campaigns } = input;
  const diags: Diagnostic[] = [];

  if (store.rating != null && store.rating < 4.5) {
    diags.push({
      area: "Avaliações e reputação",
      problem: `Nota média da loja é ${store.rating}, abaixo do recomendado (4.5)`,
      evidence: `Nota atual: ${store.rating} estrelas`,
      probable_cause: "Problemas recorrentes de qualidade, atendimento ou entrega",
      business_impact: "Reduz visibilidade no app, conversão e ticket médio",
      recommended_solution: "Auditar últimas 50 avaliações negativas e atacar os 3 motivos mais citados",
      priority: store.rating < 4.0 ? "alta" : "media",
      practical_action: "Responder todas avaliações negativas e ajustar processos críticos",
      suggested_deadline: "30 dias",
      severity: store.rating < 4.0 ? "critico" : "atencao",
    });
  }

  if (store.promised_delivery_time && store.promised_delivery_time > 45) {
    diags.push({
      area: "Tempo de entrega",
      problem: `Tempo prometido alto: ${store.promised_delivery_time} min`,
      evidence: `Promessa de ${store.promised_delivery_time} min vs. ideal <40 min`,
      probable_cause: "Operação interna lenta ou raio de entrega muito grande",
      business_impact: "Cliente desiste no checkout e prefere concorrente mais rápido",
      recommended_solution: "Reduzir raio, otimizar produção e separar pedidos por horário de pico",
      priority: "alta",
      practical_action: "Mapear gargalos da cozinha e renegociar com entregadores",
      suggested_deadline: "21 dias",
      severity: "critico",
    });
  }

  if (store.cancellation_rate != null && store.cancellation_rate > 5) {
    diags.push({
      area: "Cancelamentos e erros",
      problem: `Taxa de cancelamento alta: ${store.cancellation_rate}%`,
      evidence: `Acima do limite saudável de 5%`,
      probable_cause: "Falta de produtos, erros de pedido ou atraso excessivo",
      business_impact: "Perda direta de receita e impacto na reputação na plataforma",
      recommended_solution: "Implementar checklist de fechamento e atualizar disponibilidade em tempo real",
      priority: "alta",
      practical_action: "Pausar produtos sem estoque e revisar fluxo de aceite",
      suggested_deadline: "14 dias",
      severity: "critico",
    });
  }

  const totalMargin = products.length
    ? products.reduce((s, p) => s + (Number(p.estimated_margin) || 0), 0) / products.length
    : null;
  if (totalMargin != null && totalMargin < 20) {
    diags.push({
      area: "Preço e margem",
      problem: `Margem média baixa: ${totalMargin.toFixed(1)}%`,
      evidence: `Média dos produtos abaixo de 20%`,
      probable_cause: "Custos altos, preço de venda inadequado ou cupons agressivos",
      business_impact: "Loja vende muito mas lucra pouco — risco financeiro",
      recommended_solution: "Ajustar preços dos top produtos e reduzir cupons em itens de baixa margem",
      priority: "alta",
      practical_action: "Reprecificar 5 produtos mais vendidos com base no custo + taxa",
      suggested_deadline: "10 dias",
      severity: "critico",
    });
  }

  const noPhoto = products.filter((p) => !p.has_photo).length;
  if (products.length > 0 && noPhoto / products.length > 0.3) {
    diags.push({
      area: "Cardápio / Fotos",
      problem: `${noPhoto} produtos sem foto (${Math.round((noPhoto / products.length) * 100)}%)`,
      evidence: `Mais de 30% do cardápio sem imagem`,
      probable_cause: "Cardápio incompleto ou desatualizado",
      business_impact: "Reduz conversão em até 30%",
      recommended_solution: "Fotografar todos os produtos com fundo neutro e boa iluminação",
      priority: "alta",
      practical_action: "Sessão de fotos em lote dos 10 produtos mais vendidos",
      suggested_deadline: "15 dias",
      severity: "atencao",
    });
  }

  if (store.average_ticket && store.average_ticket < 35) {
    diags.push({
      area: "Combos e ticket médio",
      problem: `Ticket médio baixo: R$ ${store.average_ticket}`,
      evidence: `Sem combos ou cross-sell evidente`,
      probable_cause: "Cardápio sem agrupamentos atrativos",
      business_impact: "Perde receita por pedido",
      recommended_solution: "Criar 3 combos com bebida + acompanhamento e destacar no topo",
      priority: "media",
      practical_action: "Lançar combo principal com 15% de desconto vs. itens avulsos",
      suggested_deadline: "20 dias",
      severity: "atencao",
    });
  }

  campaigns.forEach((c) => {
    if (c.estimated_roi != null && Number(c.estimated_roi) < 1) {
      diags.push({
        area: "Anúncios e campanhas",
        problem: `Campanha "${c.name}" com ROI negativo (${c.estimated_roi}x)`,
        evidence: `Custo R$ ${c.cost} vs. receita R$ ${c.revenue_generated}`,
        probable_cause: "Segmentação ruim ou cupom muito agressivo",
        business_impact: "Queima margem sem trazer cliente novo",
        recommended_solution: "Pausar campanha e refazer mira em horário de menor demanda",
        priority: "media",
        practical_action: "Encerrar campanha e testar nova com público específico",
        suggested_deadline: "7 dias",
        severity: "atencao",
      });
    }
  });

  const fasterCompetitors = competitors.filter(
    (c) => c.delivery_time && store.promised_delivery_time && c.delivery_time < store.promised_delivery_time,
  );
  if (fasterCompetitors.length >= 2) {
    diags.push({
      area: "Concorrência",
      problem: `${fasterCompetitors.length} concorrentes entregam mais rápido`,
      evidence: fasterCompetitors.map((c) => `${c.name}: ${c.delivery_time}min`).join(", "),
      probable_cause: "Operação ou raio menos eficiente",
      business_impact: "Cliente escolhe quem entrega mais rápido",
      recommended_solution: "Reduzir promessa de tempo e cumprir",
      priority: "media",
      practical_action: "Comparar cardápios e tempos com top 3 concorrentes",
      suggested_deadline: "30 dias",
      severity: "atencao",
    });
  }

  const negativeHits: Record<string, number> = {};
  reviews.forEach((r) => {
    const c = (r.comment || "").toLowerCase();
    NEG_KEYWORDS.forEach((k) => {
      if (c.includes(k)) negativeHits[k] = (negativeHits[k] || 0) + 1;
    });
  });
  const topIssues = Object.entries(negativeHits).filter(([, n]) => n >= 2);
  if (topIssues.length) {
    diags.push({
      area: "Experiência do cliente",
      problem: `Reclamações recorrentes: ${topIssues.map(([k, n]) => `${k} (${n}x)`).join(", ")}`,
      evidence: `Padrões detectados em ${reviews.length} avaliações`,
      probable_cause: "Falha operacional sistemática",
      business_impact: "Perda de recompra e queda de nota",
      recommended_solution: "Atacar a causa raiz de cada padrão com checklist operacional",
      priority: "alta",
      practical_action: "Reunião semanal com equipe revisando cada padrão",
      suggested_deadline: "30 dias",
      severity: "critico",
    });
  }

  return diags;
}
