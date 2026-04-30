// Espelho Deno do motor de evidências — roda sobre dados crus do banco.
// Camada 1: regras objetivas sobre estado atual.
// Camada 2: cruzamentos, tendências e sinais positivos (gestor humano).
//
// CADA regra emite um RuleEvidence com rule_id estável. O ai-consult
// usa esses rule_ids como única fonte de verdade — qualquer recomendação
// da IA SEM rule_id válido aqui é descartada.

export type Severity = "critico" | "atencao" | "ok";
export type Confidence = "alta" | "media" | "baixa";

export interface RuleEvidence {
  rule_id: string;
  area: string;
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

const NEG_KEYWORDS = ["frio", "atrasou", "atras", "errado", "embalagem", "demorou", "péssimo", "pessimo"];
const FALTA_PRODUTO_KEYWORDS = ["sem estoque", "faltou", "acabou", "indisponivel", "indisponível"];

// Conjunto canônico de rule_ids — usado nos testes para garantir paridade.
export const KNOWN_RULE_IDS = [
  // camada 1
  "reputacao_nota_baixa",
  "reputacao_sem_dado",
  "tempo_entrega_alto",
  "cancelamento_alto",
  "ticket_baixo",
  "vendas_sem_dado",
  "cardapio_nao_cadastrado",
  "cardapio_sem_fotos",
  "margem_media_baixa",
  "produtos_sem_custos",
  "produtos_baixo_desempenho",
  "concorrencia_sem_dado",
  "concorrencia_melhor",
  "sem_reviews_coletadas",
  "reclamacoes_operacao",
  // camada 2
  "tendencia_faturamento_7_30d",
  "faturamento_sobe_lucro_cai",
  "top_produto_margem_baixa",
  "top_produto_reclamacoes",
  "campanha_corroe_margem",
  "cancelamento_falta_produto",
  "cardapio_inchado",
  "nao_mexer_no_que_funciona",
  "dado_critico_faltando",
] as const;

export function evidencesFromStoreData(input: {
  store: any;
  metrics: any[];
  products: any[];
  reviews: any[];
  competitors: any[];
  campaigns?: any[];
}): RuleEvidence[] {
  const { store, products, reviews, competitors, metrics, campaigns = [] } = input;
  const out: RuleEvidence[] = [];
  const lastMetric = metrics?.[0];

  // ============================================================
  // CAMADA 1 — sinais objetivos sobre o estado atual
  // ============================================================

  // Reputação
  const rating = num(store?.rating);
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
      business_impact: "Reputação é o principal fator de ranking",
      probable_cause: "Cadastro incompleto",
      recommended_action: "Informar nota atual da loja",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["nota_loja"],
    });
  }

  // Tempo de entrega
  const promised = num(store?.promised_delivery_time);
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
      recommended_action: "Reduzir raio e otimizar produção em pico",
      confidence: "alta",
      evidence_data: { promised_minutes: promised },
    });
  }

  // Cancelamento
  const cancel = num(store?.cancellation_rate) ?? num(lastMetric?.cancellation_rate);
  if (cancel != null && cancel > 5) {
    out.push({
      rule_id: "cancelamento_alto",
      area: "cancelamentos",
      metric: "cancellation_rate_pct",
      current_value: cancel,
      reference_value: 5,
      severity: "critico",
      business_impact: "Perda direta de receita e queda na reputação",
      probable_cause: "Falta de produtos, erros de pedido ou atraso",
      recommended_action: "Checklist de fechamento e disponibilidade em tempo real",
      confidence: "alta",
      evidence_data: { cancellation_rate_pct: cancel },
    });
  }

  // Ticket médio
  const ticket = num(store?.average_ticket) ?? num(lastMetric?.average_ticket);
  if (ticket != null && ticket < 35) {
    out.push({
      rule_id: "ticket_baixo",
      area: "ticket_medio",
      metric: "average_ticket",
      current_value: ticket,
      reference_value: 35,
      severity: "atencao",
      business_impact: "Perde receita por pedido",
      probable_cause: "Cardápio sem combos atrativos",
      recommended_action: "Criar 3 combos e destacar no topo",
      confidence: "alta",
      evidence_data: { ticket_medio: ticket },
    });
  }

  // Vendas
  const revenue = num(store?.monthly_revenue) ?? num(lastMetric?.revenue);
  const orders = num(store?.monthly_orders) ?? num(lastMetric?.orders);
  if (revenue == null && orders == null) {
    out.push({
      rule_id: "vendas_sem_dado",
      area: "vendas",
      metric: "monthly_revenue",
      current_value: null,
      reference_value: null,
      severity: "atencao",
      business_impact: "Sem volume não dá para dimensionar oportunidade",
      probable_cause: "Cadastro básico incompleto",
      recommended_action: "Informar faturamento e pedidos do último mês",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["faturamento_mes", "pedidos_mes"],
    });
  }

  // Cardápio
  if (!products || products.length === 0) {
    out.push({
      rule_id: "cardapio_nao_cadastrado",
      area: "cardapio",
      metric: "products_total",
      current_value: 0,
      reference_value: null,
      severity: "atencao",
      business_impact: "Sem cardápio é impossível analisar margem, fotos, nomes e combos",
      probable_cause: "Cadastro inicial incompleto",
      recommended_action: "Cadastrar pelo menos 5 produtos com preço, custo e foto",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["produtos"],
    });
  } else {
    const noPhoto = products.filter((p) => !p.has_photo).length;
    const ratio = noPhoto / products.length;
    if (ratio > 0.3) {
      out.push({
        rule_id: "cardapio_sem_fotos",
        area: "cardapio",
        metric: "products_without_photo_ratio",
        current_value: Math.round(ratio * 100),
        reference_value: 0,
        severity: ratio > 0.7 ? "critico" : "atencao",
        business_impact: "Reduz conversão em até 30% — cliente não compra o que não vê",
        probable_cause: "Cardápio incompleto",
        recommended_action: "Fotografar todos os produtos com fundo neutro",
        confidence: "alta",
        evidence_data: { sem_foto: noPhoto, total: products.length },
      });
    }

    const margins = products
      .map((p) => num(p.estimated_margin))
      .filter((m): m is number => m != null);
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
        probable_cause: "Custos altos ou preços inadequados",
        recommended_action: "Reprecificar top vendidos",
        confidence: "alta",
        evidence_data: { avg_margin_pct: Number(avgMargin.toFixed(1)), produtos_analisados: margins.length },
      });
    } else if (margins.length === 0) {
      out.push({
        rule_id: "produtos_sem_custos",
        area: "produtos",
        metric: "products_with_costs",
        current_value: 0,
        reference_value: products.length,
        severity: "atencao",
        business_impact: "Sem custo, não dá para detectar produto deficitário",
        probable_cause: "Cadastro de produto incompleto",
        recommended_action: "Preencher custo de insumo, embalagem e taxa",
        confidence: "baixa",
        evidence_data: { total_produtos: products.length },
        missing_data: ["custos_produtos"],
      });
    }

    // Produtos baixo desempenho
    if (products.length >= 5) {
      const sales = products.map((p) => num(p.sales_quantity) ?? 0);
      const total = sales.reduce((a, b) => a + b, 0);
      if (total > 0) {
        const avg = total / products.length;
        const baixo = products.filter((p) => (num(p.sales_quantity) ?? 0) < avg * 0.2);
        if (baixo.length >= 3) {
          out.push({
            rule_id: "produtos_baixo_desempenho",
            area: "produtos",
            metric: "low_performance_products",
            current_value: baixo.length,
            reference_value: 0,
            severity: "atencao",
            business_impact: "Itens parados diluem foco do cliente",
            probable_cause: "Nome, foto, preço ou posicionamento ruim",
            recommended_action: "Repensar ou pausar itens parados",
            confidence: "media",
            evidence_data: { produtos: baixo.slice(0, 5).map((p) => p.name) },
          });
        }
      }
    }
  }

  // Concorrência
  if (!competitors || competitors.length === 0) {
    out.push({
      rule_id: "concorrencia_sem_dado",
      area: "concorrencia",
      metric: "competitors_count",
      current_value: 0,
      reference_value: 3,
      severity: "atencao",
      business_impact: "Sem benchmark, não dá para avaliar tempo, taxa e posicionamento relativos",
      probable_cause: "Etapa de competidores não preenchida",
      recommended_action: "Cadastrar 3 concorrentes diretos",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["concorrentes"],
    });
  } else {
    const myFee = num(store?.delivery_fee);
    const myTime = num(store?.promised_delivery_time);
    const faster = competitors.filter((c) => num(c.delivery_time) != null && myTime != null && Number(c.delivery_time) < myTime).length;
    const cheaper = competitors.filter((c) => num(c.delivery_fee) != null && myFee != null && Number(c.delivery_fee) < myFee).length;
    if (faster >= 2 || cheaper >= 2) {
      out.push({
        rule_id: "concorrencia_melhor",
        area: "concorrencia",
        metric: "competitors_better_count",
        current_value: `${faster} mais rápidos / ${cheaper} mais baratos`,
        reference_value: "<2",
        severity: "atencao",
        business_impact: "Cliente escolhe quem entrega mais rápido e barato",
        probable_cause: "Operação ou política de taxa menos competitiva",
        recommended_action: "Reduzir promessa de tempo e ajustar taxa em pico",
        confidence: "alta",
        evidence_data: { mais_rapidos: faster, mais_baratos: cheaper, total: competitors.length },
      });
    }
  }

  // Reviews — operação
  let faltaProdutoCount = 0;
  if (!reviews || reviews.length === 0) {
    out.push({
      rule_id: "sem_reviews_coletadas",
      area: "avaliacoes",
      metric: "reviews_collected",
      current_value: 0,
      reference_value: 10,
      severity: "atencao",
      business_impact: "Sem voz do cliente, diagnóstico de operação fica cego",
      probable_cause: "Avaliações não coletadas",
      recommended_action: "Colar 10 avaliações recentes na etapa de avaliações",
      confidence: "baixa",
      evidence_data: {},
      missing_data: ["avaliacoes_clientes"],
    });
  } else {
    const negHits: Record<string, number> = {};
    reviews.forEach((r) => {
      const c = (r.comment || "").toLowerCase();
      NEG_KEYWORDS.forEach((k) => {
        if (c.includes(k)) negHits[k] = (negHits[k] || 0) + 1;
      });
      FALTA_PRODUTO_KEYWORDS.forEach((k) => {
        if (c.includes(k)) faltaProdutoCount++;
      });
    });
    const top = Object.entries(negHits).filter(([, n]) => n >= 2);
    if (top.length) {
      out.push({
        rule_id: "reclamacoes_operacao",
        area: "operacao",
        metric: "operational_complaints",
        current_value: top.map(([k, n]) => `${k} (${n}x)`).join(", "),
        reference_value: "nenhuma",
        severity: "critico",
        business_impact: "Perda de recompra e queda de nota",
        probable_cause: "Falha operacional sistemática",
        recommended_action: "Atacar causa raiz com checklist operacional",
        confidence: "media",
        evidence_data: { padroes: Object.fromEntries(top) },
      });
    }
  }

  // ============================================================
  // CAMADA 2 — cruzamentos, tendências e sinais positivos
  // ============================================================

  // Tendência 7/14/30d (precisa de >=2 snapshots de períodos diferentes)
  if (metrics && metrics.length >= 2) {
    const recent = metrics.slice(0, Math.min(2, metrics.length));
    const older = metrics.slice(2, Math.min(6, metrics.length));
    const sumRev = (arr: any[]) =>
      arr.reduce((a, m) => a + (num(m?.revenue) ?? 0), 0);
    const recentRev = sumRev(recent) / Math.max(recent.length, 1);
    const olderRev = older.length ? sumRev(older) / older.length : null;
    if (olderRev != null && olderRev > 0) {
      const delta = (recentRev - olderRev) / olderRev;
      if (delta < -0.15) {
        out.push({
          rule_id: "tendencia_faturamento_7_30d",
          area: "vendas",
          metric: "revenue_trend_pct",
          current_value: Number((delta * 100).toFixed(1)),
          reference_value: 0,
          severity: delta < -0.3 ? "critico" : "atencao",
          business_impact: "Receita média recente caiu vs janelas anteriores",
          probable_cause: "Sazonalidade, perda de cliente recorrente ou queda de exposição na plataforma",
          recommended_action: "Investigar funil (visitas, conversão, ticket) e ações dos concorrentes nas últimas semanas",
          confidence: "media",
          evidence_data: { recente_avg: Number(recentRev.toFixed(2)), anterior_avg: Number(olderRev.toFixed(2)) },
        });
      }
    }

    // Faturamento sobe, lucro cai
    const sumProfit = (arr: any[]) =>
      arr.reduce((a, m) => a + (num(m?.estimated_profit) ?? 0), 0);
    const recentProfit = sumProfit(recent);
    const olderProfit = sumProfit(older);
    const recentRevTotal = sumRev(recent);
    const olderRevTotal = sumRev(older);
    if (
      olderRevTotal > 0 &&
      olderProfit > 0 &&
      recentRevTotal > olderRevTotal * 1.05 &&
      recentProfit < olderProfit * 0.95
    ) {
      out.push({
        rule_id: "faturamento_sobe_lucro_cai",
        area: "lucro",
        metric: "revenue_up_profit_down",
        current_value: `receita +${(((recentRevTotal - olderRevTotal) / olderRevTotal) * 100).toFixed(1)}% / lucro ${(((recentProfit - olderProfit) / olderProfit) * 100).toFixed(1)}%`,
        reference_value: "lucro acompanhar receita",
        severity: "critico",
        business_impact: "Crescer vendendo mais e lucrando menos é armadilha de volume",
        probable_cause: "Cupons agressivos, mix mudou para itens de baixa margem, ou aumento de custo não repassado",
        recommended_action: "Revisar cupons ativos, mix de produtos vendidos e custos dos top 5",
        confidence: "media",
        evidence_data: {
          revenue_recent: Number(recentRevTotal.toFixed(2)),
          revenue_older: Number(olderRevTotal.toFixed(2)),
          profit_recent: Number(recentProfit.toFixed(2)),
          profit_older: Number(olderProfit.toFixed(2)),
        },
      });
    }
  }

  // Top produto com margem baixa (cruzamento sales x margin)
  if (products && products.length >= 3) {
    const sorted = [...products]
      .filter((p) => (num(p.sales_quantity) ?? 0) > 0)
      .sort((a, b) => (num(b.sales_quantity) ?? 0) - (num(a.sales_quantity) ?? 0));
    const top3 = sorted.slice(0, 3);
    const lowMarginTop = top3.filter((p) => {
      const m = num(p.estimated_margin);
      return m != null && m < 20;
    });
    if (lowMarginTop.length > 0) {
      out.push({
        rule_id: "top_produto_margem_baixa",
        area: "lucro",
        metric: "top_seller_low_margin_count",
        current_value: lowMarginTop.length,
        reference_value: 0,
        severity: "critico",
        business_impact: "Produto que mais vende é também o que menos lucra — quanto mais vende, pior fica",
        probable_cause: "Precificação não acompanhou custos ou taxa da plataforma",
        recommended_action: "Reprecificar os top vendidos com margem <20% ou trocá-los por combos mais rentáveis",
        confidence: "alta",
        evidence_data: {
          produtos: lowMarginTop.map((p) => ({ nome: p.name, margem_pct: num(p.estimated_margin) })),
        },
      });
    }

    // Top produto com reclamações recorrentes
    const topComplaint = top3.filter((p) => (num(p.complaints_count) ?? 0) >= 3);
    if (topComplaint.length > 0) {
      out.push({
        rule_id: "top_produto_reclamacoes",
        area: "produtos",
        metric: "top_seller_complaints",
        current_value: topComplaint.length,
        reference_value: 0,
        severity: "critico",
        business_impact: "Carro-chefe gerando reclamação contamina nota geral e recompra",
        probable_cause: "Receita inconsistente, porção menor que a foto, ou ingrediente em queda de qualidade",
        recommended_action: "Padronizar receita do top vendido e revisar embalagem antes de qualquer outra ação",
        confidence: "alta",
        evidence_data: {
          produtos: topComplaint.map((p) => ({ nome: p.name, reclamacoes: num(p.complaints_count) })),
        },
      });
    }

    // Sinal POSITIVO: top produto com margem alta + sem reclamações = NÃO MEXER
    const stars = top3.filter((p) => {
      const m = num(p.estimated_margin);
      const c = num(p.complaints_count) ?? 0;
      return m != null && m >= 30 && c <= 1;
    });
    if (stars.length > 0) {
      out.push({
        rule_id: "nao_mexer_no_que_funciona",
        area: "produtos",
        metric: "stable_top_sellers",
        current_value: stars.length,
        reference_value: ">=1",
        severity: "ok",
        business_impact: "Produtos que vendem muito, margem boa e poucas reclamações sustentam a operação",
        probable_cause: "Combinação de preço, percepção e operação funcionando",
        recommended_action: "Manter receita, foto e preço destes itens. Não testar nada disruptivo neles este ciclo",
        confidence: "alta",
        evidence_data: {
          produtos: stars.map((p) => ({ nome: p.name, margem_pct: num(p.estimated_margin) })),
        },
      });
    }

    // Cardápio inchado
    const totalP = products.length;
    if (totalP > 40) {
      const allSales = products.map((p) => num(p.sales_quantity) ?? 0);
      const avgS = allSales.reduce((a, b) => a + b, 0) / totalP;
      if (avgS > 0) {
        const parados = products.filter((p) => (num(p.sales_quantity) ?? 0) < avgS * 0.2).length;
        if (parados / totalP > 0.3) {
          out.push({
            rule_id: "cardapio_inchado",
            area: "cardapio",
            metric: "menu_bloat_ratio",
            current_value: Math.round((parados / totalP) * 100),
            reference_value: 30,
            severity: "atencao",
            business_impact: "Cardápio gigante com muito item parado dilui atenção e dificulta a escolha",
            probable_cause: "Acúmulo histórico de produtos sem revisão",
            recommended_action: "Pausar itens com vendas < 20% da média e focar em 12–18 produtos vencedores",
            confidence: "media",
            evidence_data: { total: totalP, parados },
          });
        }
      }
    }
  }

  // Campanha que corrói margem
  if (campaigns && campaigns.length > 0) {
    const ruim = campaigns.filter((c) => {
      const cost = num(c.cost) ?? 0;
      const rev = num(c.revenue_generated) ?? 0;
      const marg = num(c.margin_impact) ?? 0;
      return cost > 0 && rev / cost < 1.5 && marg > 0;
    });
    if (ruim.length > 0) {
      out.push({
        rule_id: "campanha_corroe_margem",
        area: "anuncios",
        metric: "low_roi_campaigns",
        current_value: ruim.length,
        reference_value: 0,
        severity: "critico",
        business_impact: "Campanha vende mas reduz lucro — está pagando para entregar",
        probable_cause: "Cupom muito agressivo ou produto âncora com margem baixa",
        recommended_action: "Pausar essas campanhas e refazer com produto âncora de margem ≥30%",
        confidence: "alta",
        evidence_data: { campanhas: ruim.map((c) => ({ nome: c.name, roi_estimado: c.estimated_roi })) },
      });
    }
  }

  // Cancelamento por falta de produto
  if (faltaProdutoCount >= 2) {
    out.push({
      rule_id: "cancelamento_falta_produto",
      area: "cancelamentos",
      metric: "stockout_complaints",
      current_value: faltaProdutoCount,
      reference_value: 0,
      severity: "critico",
      business_impact: "Cliente cancela e raramente volta após 'sem estoque'",
      probable_cause: "Cardápio não atualizado em tempo real — itens fora do estoque continuam ativos",
      recommended_action: "Pausar produtos sem estoque imediatamente e definir checklist de fechamento por turno",
      confidence: "media",
      evidence_data: { mencoes_falta: faltaProdutoCount },
    });
  }

  // Meta-regra: dado crítico faltando
  const missingCritical: string[] = [];
  if (rating == null) missingCritical.push("nota_loja");
  if (revenue == null && orders == null) missingCritical.push("faturamento_e_pedidos");
  if (!products || products.length === 0) missingCritical.push("cardapio");
  if (missingCritical.length >= 2) {
    out.push({
      rule_id: "dado_critico_faltando",
      area: "meta",
      metric: "missing_critical_inputs",
      current_value: missingCritical.length,
      reference_value: 0,
      severity: "atencao",
      business_impact: "Sem esses dados o diagnóstico é parcial e a IA não pode ser confiável",
      probable_cause: "Cadastro inicial incompleto",
      recommended_action: "Completar os cadastros faltantes antes da próxima análise consultiva",
      confidence: "alta",
      evidence_data: { faltando: missingCritical },
      missing_data: missingCritical,
    });
  }

  return out;
}

export function mergeEvidences(funnel: RuleEvidence[], store: RuleEvidence[]): RuleEvidence[] {
  const seen = new Map<string, RuleEvidence>();
  // Funnel evidences (mais ricas) prevalecem
  for (const e of funnel || []) seen.set(e.rule_id, e);
  for (const e of store || []) if (!seen.has(e.rule_id)) seen.set(e.rule_id, e);
  return Array.from(seen.values());
}
