// Helpers para a `ai-consult` consumir dados do funil (diagnosis_answers)
// e dos prints (diagnosis_uploads.structured_data) e gerar evidências.
//
// Estratégia: converter tudo num único `answers map`
// (Record<step_key, Record<question_key, value>>) e delegar para
// `evidencesFromAnswers` (mesma fonte da verdade do client).

import { evidencesFromAnswers, type RuleEvidence } from "./evidences.ts";

export type AnswersMap = Record<string, Record<string, any>>;

export interface DiagnosisAnswerRow {
  step_key: string;
  question_key: string;
  answer_value: any;
}

export interface DiagnosisUploadRow {
  status: string;
  classification?: string | null;
  structured_data: any;
}

export function answersRowsToMap(rows: DiagnosisAnswerRow[]): AnswersMap {
  const map: AnswersMap = {};
  for (const a of rows) {
    if (!a.step_key || !a.question_key) continue;
    if (!map[a.step_key]) map[a.step_key] = {};
    map[a.step_key][a.question_key] = a.answer_value;
  }
  return map;
}

const setIfEmpty = (map: AnswersMap, step: string, key: string, value: any) => {
  if (value === undefined || value === null || value === "") return;
  if (!map[step]) map[step] = {};
  const cur = map[step][key];
  if (cur === undefined || cur === null || cur === "") {
    map[step][key] = value;
  }
};

/** Mescla dados extraídos dos prints (structured_data) no answers map, sem
 *  sobrescrever respostas explícitas do usuário. */
export function mergeUploadsIntoAnswers(
  base: AnswersMap,
  uploads: DiagnosisUploadRow[],
): AnswersMap {
  const map: AnswersMap = JSON.parse(JSON.stringify(base ?? {}));

  const accProducts: any[] = [];
  const accComplaintTags = new Set<string>();
  const accNegativeReviews: string[] = [];

  for (const up of uploads ?? []) {
    if (up.status !== "processed" && up.status !== "done") continue;
    const sd = up.structured_data || {};

    // Identidade
    setIfEmpty(map, "basic", "name", sd.store_name);
    setIfEmpty(map, "basic", "category", sd.food_category);
    setIfEmpty(map, "basic", "platform", sd.platform);
    setIfEmpty(map, "basic", "city", sd.city);
    setIfEmpty(map, "basic", "neighborhood", sd.neighborhood);

    // Faturamento
    setIfEmpty(map, "basic", "monthly_revenue", sd.revenue);
    setIfEmpty(map, "basic", "monthly_orders", sd.orders);
    setIfEmpty(map, "basic", "average_ticket", sd.average_ticket);

    // Vitrine
    setIfEmpty(map, "storefront", "rating", sd.rating);
    setIfEmpty(map, "storefront", "reviews_count", sd.reviews_count);
    setIfEmpty(map, "storefront", "has_cover", sd.has_cover);
    setIfEmpty(map, "storefront", "has_logo", sd.has_logo);
    setIfEmpty(map, "storefront", "delivery_fee", sd.delivery_fee);
    setIfEmpty(map, "storefront", "promised_delivery_time", sd.promised_delivery_time_min);

    // Operação
    setIfEmpty(map, "delivery", "real_time", sd.delivery_time_min);
    setIfEmpty(map, "delivery", "prep_time", sd.prep_time_min);
    setIfEmpty(map, "delivery", "cancellation_rate", sd.cancellation_rate);

    // Cardápio
    setIfEmpty(map, "menu", "products_total", sd.products_visible);
    if (sd.products_visible != null && sd.products_with_photo != null) {
      setIfEmpty(map, "menu", "without_photo", Math.max(0, Number(sd.products_visible) - Number(sd.products_with_photo)));
    }
    setIfEmpty(map, "menu", "has_combos", sd.has_combos);
    setIfEmpty(map, "menu", "has_addons", sd.has_addons);

    // Top produtos (acumulado)
    if (Array.isArray(sd.top_products)) {
      for (const p of sd.top_products) {
        if (p?.name && accProducts.length < 5 && !accProducts.some((x) => x.name === p.name)) {
          accProducts.push({
            name: p.name,
            sale_price: p.price,
            has_photo: typeof p.has_photo === "boolean" ? p.has_photo : undefined,
            sales_quantity: p.sales_quantity,
          });
        }
      }
    }

    // Reclamações
    if (sd.complaint_cold === true) accComplaintTags.add("frio");
    if (sd.complaint_late === true) accComplaintTags.add("atraso");
    if (sd.complaint_wrong === true) accComplaintTags.add("errado");
    if (sd.complaint_packaging === true) accComplaintTags.add("embalagem");
    if (sd.complaint_small === true) accComplaintTags.add("pequeno");

    setIfEmpty(map, "reviews", "complaint_cold", sd.complaint_cold);
    setIfEmpty(map, "reviews", "complaint_late", sd.complaint_late);
    setIfEmpty(map, "reviews", "complaint_wrong", sd.complaint_wrong);
    setIfEmpty(map, "reviews", "complaint_packaging", sd.complaint_packaging);

    if (Array.isArray(sd.sample_negative_reviews)) {
      for (const r of sd.sample_negative_reviews) {
        if (typeof r === "string" && r.trim() && accNegativeReviews.length < 10) {
          accNegativeReviews.push(r.trim());
        }
      }
    }
  }

  if (accProducts.length && !(map.products?.items?.length)) {
    if (!map.products) map.products = {};
    map.products.items = accProducts;
  }
  if (accComplaintTags.size && !(map.reviews?.main_complaints?.length)) {
    if (!map.reviews) map.reviews = {};
    map.reviews.main_complaints = Array.from(accComplaintTags);
  }
  if (accNegativeReviews.length && !map.reviews?.real_reviews) {
    if (!map.reviews) map.reviews = {};
    map.reviews.real_reviews = accNegativeReviews.join("\n");
  }

  return map;
}

export function evidencesFromSession(
  answers: DiagnosisAnswerRow[],
  uploads: DiagnosisUploadRow[],
): { evidences: RuleEvidence[]; mergedAnswers: AnswersMap } {
  const base = answersRowsToMap(answers ?? []);
  const merged = mergeUploadsIntoAnswers(base, uploads ?? []);
  const evidences = evidencesFromAnswers(merged);
  return { evidences, mergedAnswers: merged };
}
