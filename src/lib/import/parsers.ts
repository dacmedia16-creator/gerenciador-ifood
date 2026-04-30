import { z } from "zod";

export type ParseResult<T> = {
  rows: T[];
  errors: { row: number; message: string }[];
  total: number;
};

// Parser CSV simples (sem dependência externa) — suporta vírgulas em campos com aspas
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        out.push(cur); cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  });
}

const numericish = (v: any) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const boolish = (v: any) => {
  const s = String(v ?? "").toLowerCase().trim();
  if (["true", "sim", "yes", "1", "x"].includes(s)) return true;
  if (["false", "nao", "não", "no", "0", ""].includes(s)) return false;
  return undefined;
};

const metricSchema = z.object({
  period_start: z.string().min(8),
  period_end: z.string().min(8),
  revenue: z.number().nonnegative().optional(),
  orders: z.number().int().nonnegative().optional(),
  average_ticket: z.number().nonnegative().optional(),
  average_delivery_time: z.number().int().nonnegative().optional(),
  cancellation_rate: z.number().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  coupon_cost: z.number().nonnegative().optional(),
  ads_cost: z.number().nonnegative().optional(),
  estimated_profit: z.number().optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  sale_price: z.number().nonnegative().optional(),
  food_cost: z.number().nonnegative().optional(),
  packaging_cost: z.number().nonnegative().optional(),
  platform_fee_percent: z.number().min(0).max(100).optional(),
  sales_quantity: z.number().int().nonnegative().optional(),
  has_photo: z.boolean().optional(),
  estimated_margin: z.number().optional(),
});

const reviewSchema = z.object({
  order_date: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  comment: z.string().min(1),
});

function parseWith<T>(text: string, schema: z.ZodType<T>, transform: (row: Record<string, string>) => any): ParseResult<T> {
  const rows = parseCSV(text);
  if (rows.length === 0) return { rows: [], errors: [{ row: 0, message: "Arquivo vazio" }], total: 0 };
  const headers = rows[0].map((h) => h.toLowerCase());
  const dataRows = rows.slice(1);
  const ok: T[] = [];
  const errors: { row: number; message: string }[] = [];

  dataRows.forEach((cols, idx) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    const transformed = transform(obj);
    const parsed = schema.safeParse(transformed);
    if (parsed.success) ok.push(parsed.data);
    else errors.push({ row: idx + 2, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  });

  return { rows: ok, errors, total: dataRows.length };
}

export function parseMetricsCSV(text: string) {
  return parseWith(text, metricSchema, (r) => ({
    period_start: r.period_start,
    period_end: r.period_end,
    revenue: numericish(r.revenue),
    orders: numericish(r.orders),
    average_ticket: numericish(r.average_ticket),
    average_delivery_time: numericish(r.average_delivery_time),
    cancellation_rate: numericish(r.cancellation_rate),
    rating: numericish(r.rating),
    coupon_cost: numericish(r.coupon_cost),
    ads_cost: numericish(r.ads_cost),
    estimated_profit: numericish(r.estimated_profit),
  }));
}

export function parseProductsCSV(text: string) {
  return parseWith(text, productSchema, (r) => ({
    name: r.name,
    category: r.category || undefined,
    sale_price: numericish(r.sale_price),
    food_cost: numericish(r.food_cost),
    packaging_cost: numericish(r.packaging_cost),
    platform_fee_percent: numericish(r.platform_fee_percent),
    sales_quantity: numericish(r.sales_quantity),
    has_photo: boolish(r.has_photo),
    estimated_margin: numericish(r.estimated_margin),
  }));
}

export function parseReviewsCSV(text: string) {
  return parseWith(text, reviewSchema, (r) => ({
    order_date: r.order_date || undefined,
    rating: numericish(r.rating),
    comment: r.comment,
  }));
}
