// Mapeia dados estruturados extraídos dos prints (diagnosis_uploads.structured_data)
// para respostas do funil de diagnóstico (step_key + question_key).
// Suporta: number→bucket, string→select/text, boolean→yesno, array→multiselect/lista.
import { STEPS } from "./steps";

export interface ProposedAnswer {
  stepKey: string;
  questionKey: string;
  label: string;
  value: any;
  displayValue: string;
  source: string;
}

function findQuestion(stepKey: string, questionKey: string) {
  const step = STEPS.find((s) => s.key === stepKey);
  if (!step) return null;
  const q = step.questions.find((q) => q.key === questionKey);
  return q ? { step, question: q } : null;
}

function nearestBucketValue(stepKey: string, questionKey: string, n: number) {
  const found = findQuestion(stepKey, questionKey);
  if (!found || !found.question.options) return null;
  const numeric = found.question.options
    .map((o) => ({ ...o, num: parseFloat(o.value) }))
    .filter((o) => !isNaN(o.num) && o.value !== "");
  if (!numeric.length) return null;
  let best = numeric[0];
  let bestDiff = Math.abs(numeric[0].num - n);
  for (const o of numeric.slice(1)) {
    const d = Math.abs(o.num - n);
    if (d < bestDiff) { best = o; bestDiff = d; }
  }
  return { value: best.value, label: best.label };
}

function bucketProposal(stepKey: string, questionKey: string, n: number, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  const bucket = nearestBucketValue(stepKey, questionKey, n);
  if (!found || !bucket) return null;
  return { stepKey, questionKey, label: found.question.label, value: bucket.value, displayValue: `${bucket.label} (detectado: ${n})`, source };
}

function yesnoProposal(stepKey: string, questionKey: string, v: boolean, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  if (!found) return null;
  return { stepKey, questionKey, label: found.question.label, value: v, displayValue: v ? "Sim" : "Não", source };
}

function selectProposal(stepKey: string, questionKey: string, value: string, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  if (!found || !found.question.options) return null;
  const opt = found.question.options.find((o) => o.value === value);
  if (!opt) return null;
  return { stepKey, questionKey, label: found.question.label, value: opt.value, displayValue: opt.label, source };
}

function textProposal(stepKey: string, questionKey: string, text: string, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  if (!found || !text || !text.trim()) return null;
  return { stepKey, questionKey, label: found.question.label, value: text.trim(), displayValue: text.trim().slice(0, 80), source };
}

function multiSelectProposal(stepKey: string, questionKey: string, values: string[], source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  if (!found || !found.question.options) return null;
  const valid = values.filter((v) => found.question.options!.some((o) => o.value === v));
  if (!valid.length) return null;
  const labels = valid.map((v) => found.question.options!.find((o) => o.value === v)!.label).join(", ");
  return { stepKey, questionKey, label: found.question.label, value: valid, displayValue: labels, source };
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function str(v: any): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

// Mapeia palavras de reclamações livres para os values fixos do multiselect/yesno
function classifyComplaint(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bfri[ao]\b|gelad/.test(t)) return "frio";
  if (/atras|tempo|demor|tarde/.test(t)) return "atraso";
  if (/errad|trocad|faltou item|pedido errado/.test(t)) return "errado";
  if (/pequen|porção pequena|pouc[ao]/.test(t)) return "pequeno";
  if (/embalag|vazou|vazand|derram/.test(t)) return "embalagem";
  if (/atend|grosso|mal educad|rude/.test(t)) return "atendimento";
  return null;
}

function classifyCompliment(text: string): string | null {
  const t = text.toLowerCase();
  if (/sabor|gostos|delic|saborosa/.test(t)) return "sabor";
  if (/grand|porç[aã]o|fart/.test(t)) return "porcao";
  if (/rápid|agil|chegou cedo|chegou rápido|entrega rápida/.test(t)) return "agilidade";
  if (/embalag/.test(t)) return "embalagem";
  if (/atend|atencios|simpát/.test(t)) return "atendimento";
  return null;
}

export function buildProposalsFromUploads(uploads: any[]): ProposedAnswer[] {
  const out: ProposedAnswer[] = [];

  // Acumuladores cross-uploads (top produtos, reclamações)
  const accProducts: any[] = [];
  const accComplaintTags = new Set<string>();
  const accComplimentTags = new Set<string>();
  const accNegativeReviews: string[] = [];

  for (const up of uploads) {
    if (up.status !== "processed" || !up.structured_data) continue;
    const sd = up.structured_data || {};
    const cls = up.classification || "outro";
    const src = `Print (${cls})`;

    const push = (p: ProposedAnswer | null) => { if (p) out.push(p); };

    // ===== Identidade =====
    if (str(sd.store_name)) push(textProposal("basic", "name", str(sd.store_name)!, src));
    if (str(sd.food_category)) push(selectProposal("basic", "category", str(sd.food_category)!, src));
    if (str(sd.platform)) push(selectProposal("basic", "platform", str(sd.platform)!, src));
    if (str(sd.city)) push(textProposal("basic", "city", str(sd.city)!, src));
    if (str(sd.neighborhood)) push(textProposal("basic", "neighborhood", str(sd.neighborhood)!, src));
    if (str(sd.opening_hours_text)) push(textProposal("basic", "opening_hours", str(sd.opening_hours_text)!, src));

    // ===== Faturamento =====
    if (num(sd.revenue) !== null) push(bucketProposal("basic", "monthly_revenue", num(sd.revenue)!, src));
    if (num(sd.orders) !== null) push(bucketProposal("basic", "monthly_orders", num(sd.orders)!, src));
    if (num(sd.average_ticket) !== null) push(bucketProposal("basic", "average_ticket", num(sd.average_ticket)!, src));

    // ===== Vitrine =====
    const rating = num(sd.rating);
    if (rating !== null) push(bucketProposal("storefront", "rating", rating, src));
    const rc = num(sd.reviews_count);
    if (rc !== null) push(bucketProposal("storefront", "reviews_count", rc, src));
    if (typeof sd.has_cover === "boolean") push(yesnoProposal("storefront", "has_cover", sd.has_cover, src));
    if (typeof sd.has_logo === "boolean") push(yesnoProposal("storefront", "has_logo", sd.has_logo, src));
    if (str(sd.looks_professional)) push(selectProposal("storefront", "looks_professional", str(sd.looks_professional)!, src));
    if (num(sd.delivery_fee) !== null) push(bucketProposal("storefront", "delivery_fee", num(sd.delivery_fee)!, src));
    if (num(sd.promised_delivery_time_min) !== null)
      push(bucketProposal("storefront", "promised_delivery_time", num(sd.promised_delivery_time_min)!, src));

    // ===== Operação / entrega =====
    if (num(sd.delivery_time_min) !== null) push(bucketProposal("delivery", "real_time", num(sd.delivery_time_min)!, src));
    if (num(sd.prep_time_min) !== null) push(bucketProposal("delivery", "prep_time", num(sd.prep_time_min)!, src));
    if (num(sd.cancellation_rate) !== null) push(bucketProposal("delivery", "cancellation_rate", num(sd.cancellation_rate)!, src));

    // ===== Cardápio =====
    if (num(sd.products_visible) !== null) push(bucketProposal("menu", "products_total", num(sd.products_visible)!, src));
    if (num(sd.products_visible) !== null && num(sd.products_with_photo) !== null) {
      const without = Math.max(0, num(sd.products_visible)! - num(sd.products_with_photo)!);
      push(bucketProposal("menu", "without_photo", without, src));
    }
    if (num(sd.products_visible) !== null && num(sd.products_with_description) !== null) {
      const wo = Math.max(0, num(sd.products_visible)! - num(sd.products_with_description)!);
      push(bucketProposal("menu", "without_description", wo, src));
    }
    if (typeof sd.has_combos === "boolean") push(yesnoProposal("menu", "has_combos", sd.has_combos, src));
    if (typeof sd.has_addons === "boolean") push(yesnoProposal("menu", "has_addons", sd.has_addons, src));
    if (typeof sd.has_drinks === "boolean") push(yesnoProposal("menu", "has_drinks", sd.has_drinks, src));
    if (typeof sd.has_desserts === "boolean") push(yesnoProposal("menu", "has_desserts", sd.has_desserts, src));
    if (str(sd.menu_organized)) push(selectProposal("menu", "menu_organization", str(sd.menu_organized)!, src));

    // ===== Top produtos (acumular cross-uploads) =====
    if (Array.isArray(sd.top_products)) {
      for (const p of sd.top_products) {
        if (str(p?.name) && accProducts.length < 3 && !accProducts.some((x) => x.name === p.name)) {
          accProducts.push({
            name: p.name,
            sale_price: num(p.price) ?? undefined,
            has_photo: typeof p.has_photo === "boolean" ? p.has_photo : undefined,
            has_description: typeof p.has_description === "boolean" ? p.has_description : undefined,
          });
        }
      }
    }

    // ===== Avaliações: reclamações / elogios =====
    if (Array.isArray(sd.top_complaints)) {
      for (const t of sd.top_complaints) {
        const tag = classifyComplaint(String(t || ""));
        if (tag) accComplaintTags.add(tag);
      }
    }
    if (Array.isArray(sd.top_compliments)) {
      for (const t of sd.top_compliments) {
        const tag = classifyCompliment(String(t || ""));
        if (tag) accComplimentTags.add(tag);
      }
    }
    if (sd.complaint_cold === true) accComplaintTags.add("frio");
    if (sd.complaint_late === true) accComplaintTags.add("atraso");
    if (sd.complaint_wrong === true) accComplaintTags.add("errado");
    if (sd.complaint_packaging === true) accComplaintTags.add("embalagem");
    if (sd.complaint_small === true) accComplaintTags.add("pequeno");

    if (typeof sd.complaint_cold === "boolean") push(yesnoProposal("reviews", "complaint_cold", sd.complaint_cold, src));
    if (typeof sd.complaint_late === "boolean") push(yesnoProposal("reviews", "complaint_late", sd.complaint_late, src));
    if (typeof sd.complaint_wrong === "boolean") push(yesnoProposal("reviews", "complaint_wrong", sd.complaint_wrong, src));
    if (typeof sd.complaint_packaging === "boolean") push(yesnoProposal("reviews", "complaint_packaging", sd.complaint_packaging, src));
    if (typeof sd.complaint_small === "boolean") push(yesnoProposal("reviews", "complaint_small", sd.complaint_small, src));

    if (Array.isArray(sd.sample_negative_reviews)) {
      for (const r of sd.sample_negative_reviews) {
        const t = str(r);
        if (t && accNegativeReviews.length < 5) accNegativeReviews.push(t);
      }
    }

    // ===== Promoções =====
    if (typeof sd.has_coupon === "boolean") {
      push(yesnoProposal("ads", "uses_promotions", sd.has_coupon, src));
      push(yesnoProposal("ads", "platform_coupon", sd.has_coupon, src));
    }
    if (typeof sd.has_free_delivery === "boolean") push(yesnoProposal("ads", "free_delivery", sd.has_free_delivery, src));
    if (typeof sd.uses_ifood_ads === "boolean") {
      push(yesnoProposal("ads", "advertises", sd.uses_ifood_ads, src));
    }

    // ===== Posicionamento =====
    if (str(sd.store_unique_value_text)) {
      push(textProposal("ads", "unique_value", str(sd.store_unique_value_text)!, src));
    }
  }

  // Top produtos: emite uma única proposta agregada
  if (accProducts.length > 0) {
    const found = findQuestion("products", "items");
    if (found) {
      out.push({
        stepKey: "products",
        questionKey: "items",
        label: found.question.label,
        value: accProducts,
        displayValue: accProducts.map((p) => p.name).join(", "),
        source: "Prints do cardápio",
      });
    }
  }

  // Reclamações agregadas
  if (accComplaintTags.size > 0) {
    const p = multiSelectProposal("reviews", "main_complaints", Array.from(accComplaintTags), "Prints de avaliações");
    if (p) out.push(p);
  }
  if (accComplimentTags.size > 0) {
    const p = multiSelectProposal("reviews", "main_compliments", Array.from(accComplimentTags), "Prints de avaliações");
    if (p) out.push(p);
  }
  if (accNegativeReviews.length > 0) {
    const found = findQuestion("reviews", "real_reviews");
    if (found) {
      const text = accNegativeReviews.join("\n");
      out.push({
        stepKey: "reviews",
        questionKey: "real_reviews",
        label: found.question.label,
        value: text,
        displayValue: `${accNegativeReviews.length} avaliação(ões) capturada(s)`,
        source: "Prints de avaliações",
      });
    }
  }

  // Dedupe por (stepKey.questionKey) — primeiro vence
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.stepKey}.${p.questionKey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function filterEmpty(
  proposals: ProposedAnswer[],
  allAnswers: Record<string, Record<string, any>>,
): ProposedAnswer[] {
  return proposals.filter((p) => {
    const v = allAnswers[p.stepKey]?.[p.questionKey];
    if (v === undefined || v === null || v === "") return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
}
