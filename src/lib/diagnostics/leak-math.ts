// Cálculos transparentes de "quanto isso custa por mês"
// Recebem dados da loja + métricas e retornam linhas formatadas + total estimado.

export interface LeakInput {
  delivery_time?: number | null;
  cancellation_rate?: number | null;
  rating?: number | null;
  monthly_orders?: number | null;
  average_ticket?: number | null;
}

export interface LeakResult {
  lines: string[];
  total_brl: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const num = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function leakForDelivery(input: LeakInput): LeakResult | null {
  const time = num(input.delivery_time);
  const orders = num(input.monthly_orders);
  const ticket = num(input.average_ticket);
  if (!time || time <= 40) return null;
  const dropPer100 = clamp(Math.round((time - 35) / 2), 0, 40);
  const total = Math.round(orders * ticket * (dropPer100 / 100));
  return {
    lines: [
      `Seu tempo: ${time} min`,
      `Referência competitiva: 35-40 min`,
      `A cada 100 clientes que veem sua loja, estimamos que ~${dropPer100} desistem pelo tempo.`,
      `Custo estimado: ${fmtBRL(total)}/mês`,
    ],
    total_brl: total,
  };
}

export function leakForCancellation(input: LeakInput): LeakResult | null {
  const rate = num(input.cancellation_rate);
  const orders = num(input.monthly_orders);
  const ticket = num(input.average_ticket);
  if (!rate || rate <= 2 || !orders) return null;
  const cancelados = Math.round(orders * (rate / 100));
  const total = Math.round(cancelados * ticket);
  return {
    lines: [
      `Taxa atual: ${rate}%`,
      `Meta aceitável: até 2%`,
      `Em ${orders} pedidos, são ${cancelados} pedidos perdidos por mês.`,
      `No seu ticket de ${fmtBRL(ticket)}, isso equivale a ${fmtBRL(total)}/mês direto no bolso.`,
    ],
    total_brl: total,
  };
}

export function leakForRating(input: LeakInput): LeakResult | null {
  const rating = num(input.rating);
  const orders = num(input.monthly_orders);
  const ticket = num(input.average_ticket);
  if (!rating || rating >= 4.5) return null;
  const lostPct = clamp((4.5 - rating) * 0.15, 0, 0.5);
  const total = Math.round(orders * ticket * lostPct);
  return {
    lines: [
      `Nota atual: ${rating.toFixed(1)}`,
      `Nota mínima para boa visibilidade: 4.5`,
      `Lojas abaixo de 4.5 aparecem menos nos resultados do iFood — estimativa de impacto: ${fmtBRL(total)}/mês em pedidos não recebidos.`,
    ],
    total_brl: total,
  };
}

export function leakForArea(area: string, input: LeakInput): LeakResult | null {
  const a = (area || "").toLowerCase();
  if (a.includes("entrega") || a.includes("tempo")) return leakForDelivery(input);
  if (a.includes("cancel")) return leakForCancellation(input);
  if (a.includes("avalia") || a.includes("nota") || a.includes("review")) return leakForRating(input);
  return null;
}
