// Espelho Deno do motor de evidências — roda sobre dados crus do banco.
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

export function evidencesFromStoreData(input: {
  store: any;
  metrics: any[];
  products: any[];
  reviews: any[];
  competitors: any[];
}): RuleEvidence[] {
  const { store, products, reviews, competitors, metrics } = input;
  const out: RuleEvidence[] = [];
  const lastMetric = metrics?.[0];

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

  // Reviews
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

  return out;
}

export function mergeEvidences(funnel: RuleEvidence[], store: RuleEvidence[]): RuleEvidence[] {
  const seen = new Map<string, RuleEvidence>();
  // Funnel evidences (mais ricas) prevalecem
  for (const e of funnel || []) seen.set(e.rule_id, e);
  for (const e of store || []) if (!seen.has(e.rule_id)) seen.set(e.rule_id, e);
  return Array.from(seen.values());
}
