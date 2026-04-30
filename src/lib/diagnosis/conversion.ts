// Classificação da taxa de conversão (visitas → pedidos) no iFood/Rappi.
// Referências usadas pelo motor de diagnóstico.

export type ConversionLevel = "critico" | "atencao" | "aceitavel" | "bom";

export function classifyConversion(rate: number | null | undefined): ConversionLevel | null {
  if (rate === null || rate === undefined || isNaN(Number(rate))) return null;
  const r = Number(rate);
  if (r < 7) return "critico";
  if (r < 12) return "atencao";
  if (r < 15) return "aceitavel";
  return "bom";
}

export function conversionLabel(level: ConversionLevel): string {
  switch (level) {
    case "critico": return "Crítico (<7%)";
    case "atencao": return "Atenção (7–11,9%)";
    case "aceitavel": return "Aceitável (12–14,9%)";
    case "bom": return "Bom (≥15%)";
  }
}

export function computeConversion(visits?: number | null, orders?: number | null): number | null {
  const v = Number(visits);
  const o = Number(orders);
  if (!v || isNaN(v) || v <= 0 || isNaN(o)) return null;
  return Number(((o / v) * 100).toFixed(2));
}

export function computeClickRate(visits?: number | null, clicks?: number | null): number | null {
  const v = Number(visits);
  const c = Number(clicks);
  if (!v || isNaN(v) || v <= 0 || isNaN(c)) return null;
  return Number(((c / v) * 100).toFixed(2));
}
