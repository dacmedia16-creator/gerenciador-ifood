// Calcula score de potencial de consultoria (0-100) e gargalo principal de um prospect
// Quanto MAIOR o score, MAIOR o potencial de melhoria (e oportunidade comercial)

export type ProspectInput = {
  rating?: number | null;
  reviews_count?: number | null;
  delivery_time?: number | null;
  delivery_fee?: number | null;
  has_photos?: boolean | null;
  has_combos?: boolean | null;
  has_coupons?: boolean | null;
  generic_names?: boolean | null;
};

export type ProspectScore = {
  score: number;
  level: "baixo" | "medio" | "alto" | "muito_alto";
  main_gap: string;
  reasons: string[];
};

export function scoreProspect(p: ProspectInput): ProspectScore {
  let score = 0;
  const reasons: string[] = [];
  const gaps: { label: string; weight: number }[] = [];

  // Tempo de entrega alto = oportunidade
  if (p.delivery_time != null) {
    if (p.delivery_time >= 60) { score += 25; gaps.push({ label: "Tempo de entrega muito alto (>60min)", weight: 25 }); reasons.push("Tempo de entrega acima de 60min"); }
    else if (p.delivery_time >= 45) { score += 18; gaps.push({ label: "Tempo de entrega alto (>45min)", weight: 18 }); reasons.push("Tempo de entrega entre 45-60min"); }
    else if (p.delivery_time >= 35) { score += 10; gaps.push({ label: "Tempo de entrega elevado", weight: 10 }); reasons.push("Tempo de entrega acima do ideal (35min)"); }
  }

  // Nota baixa
  if (p.rating != null) {
    if (p.rating < 4.3) { score += 22; gaps.push({ label: "Reputação baixa (<4.3)", weight: 22 }); reasons.push(`Nota ${p.rating} abaixo do recomendado`); }
    else if (p.rating < 4.6) { score += 12; gaps.push({ label: "Reputação mediana (<4.6)", weight: 12 }); reasons.push(`Nota ${p.rating} abaixo da meta de 4.6+`); }
  }

  // Poucas avaliações = baixa visibilidade
  if (p.reviews_count != null) {
    if (p.reviews_count < 50) { score += 15; gaps.push({ label: "Volume muito baixo de avaliações", weight: 15 }); reasons.push("Menos de 50 avaliações"); }
    else if (p.reviews_count < 150) { score += 8; gaps.push({ label: "Poucas avaliações para ganhar relevância", weight: 8 }); reasons.push("Menos de 150 avaliações"); }
  }

  // Sem fotos
  if (p.has_photos === false) { score += 15; gaps.push({ label: "Cardápio sem fotos profissionais", weight: 15 }); reasons.push("Produtos sem fotos"); }
  // Sem combos
  if (p.has_combos === false) { score += 10; gaps.push({ label: "Sem combos / ticket baixo", weight: 10 }); reasons.push("Não trabalha combos"); }
  // Sem cupons
  if (p.has_coupons === false) { score += 6; reasons.push("Não usa cupons de aquisição"); }
  // Nomes genéricos
  if (p.generic_names) { score += 12; gaps.push({ label: "Nomes de produto genéricos (SEO ruim)", weight: 12 }); reasons.push("Nomes de produto sem palavras-chave"); }

  // Taxa muito alta também afasta cliente
  if (p.delivery_fee != null && p.delivery_fee >= 9) { score += 6; reasons.push("Taxa de entrega alta"); }

  if (score > 100) score = 100;
  const level: ProspectScore["level"] =
    score >= 70 ? "muito_alto" : score >= 50 ? "alto" : score >= 30 ? "medio" : "baixo";

  const main_gap = gaps.sort((a, b) => b.weight - a.weight)[0]?.label ?? "Sem gargalos evidentes";

  return { score, level, main_gap, reasons };
}

export function levelLabel(l: ProspectScore["level"]) {
  return { baixo: "Baixo", medio: "Médio", alto: "Alto", muito_alto: "Muito alto" }[l];
}

export function levelColor(l: ProspectScore["level"]) {
  return {
    baixo: "bg-muted text-muted-foreground",
    medio: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    alto: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    muito_alto: "bg-red-500/15 text-red-700 dark:text-red-400",
  }[l];
}
