// Benchmarks médios por categoria de delivery (estimativas conservadoras de mercado).
// Usado para contextualizar o score do dono ("você está abaixo da média de X").

export interface CategoryBenchmark {
  avgScore: number;
  avgTicket: number;
  avgRating: number;
  avgDeliveryTime: number;
}

const BENCHMARKS: Record<string, CategoryBenchmark> = {
  hamburgueria: { avgScore: 74, avgTicket: 42, avgRating: 4.6, avgDeliveryTime: 38 },
  pizzaria: { avgScore: 72, avgTicket: 55, avgRating: 4.5, avgDeliveryTime: 45 },
  japonesa: { avgScore: 75, avgTicket: 68, avgRating: 4.7, avgDeliveryTime: 50 },
  acai: { avgScore: 76, avgTicket: 28, avgRating: 4.7, avgDeliveryTime: 30 },
  doceria: { avgScore: 73, avgTicket: 32, avgRating: 4.6, avgDeliveryTime: 35 },
  brasileira: { avgScore: 70, avgTicket: 38, avgRating: 4.5, avgDeliveryTime: 42 },
  lanche: { avgScore: 72, avgTicket: 32, avgRating: 4.5, avgDeliveryTime: 38 },
  default: { avgScore: 70, avgTicket: 40, avgRating: 4.5, avgDeliveryTime: 40 },
};

export function getBenchmark(category?: string | null): CategoryBenchmark & { label: string } {
  const key = (category || "").toLowerCase().trim();
  for (const k of Object.keys(BENCHMARKS)) {
    if (k !== "default" && key.includes(k)) {
      return { ...BENCHMARKS[k], label: k };
    }
  }
  return { ...BENCHMARKS.default, label: "delivery" };
}
