// Mapeia dados estruturados extraídos dos prints (diagnosis_uploads.structured_data)
// para respostas do funil de diagnóstico (step_key + question_key).
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
    if (d < bestDiff) {
      best = o;
      bestDiff = d;
    }
  }
  return { value: best.value, label: best.label };
}

function bucketProposal(stepKey: string, questionKey: string, n: number, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  const bucket = nearestBucketValue(stepKey, questionKey, n);
  if (!found || !bucket) return null;
  return {
    stepKey,
    questionKey,
    label: found.question.label,
    value: bucket.value,
    displayValue: `${bucket.label} (detectado: ${n})`,
    source,
  };
}

function yesnoProposal(stepKey: string, questionKey: string, v: boolean, source: string): ProposedAnswer | null {
  const found = findQuestion(stepKey, questionKey);
  if (!found) return null;
  return {
    stepKey,
    questionKey,
    label: found.question.label,
    value: v,
    displayValue: v ? "Sim" : "Não",
    source,
  };
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

export function buildProposalsFromUploads(uploads: any[]): ProposedAnswer[] {
  const out: ProposedAnswer[] = [];
  for (const up of uploads) {
    if (up.status !== "processed" || !up.structured_data) continue;
    const sd = up.structured_data || {};
    const cls = up.classification || "outro";

    // Fallback: independente da classificação, se houver campos conhecidos
    // no structured_data, tenta mapear. Isso ajuda quando a IA classifica
    // como "outro" mas mesmo assim devolve campos úteis.
    const srcGeneric = `Print (${cls})`;
    const tryMap = (stepKey: string, qKey: string, raw: any) => {
      const n = num(raw);
      if (n === null) return;
      const p = bucketProposal(stepKey, qKey, n, srcGeneric);
      if (p) out.push(p);
    };
    const tryYesNo = (stepKey: string, qKey: string, raw: any) => {
      if (typeof raw !== "boolean") return;
      const p = yesnoProposal(stepKey, qKey, raw, srcGeneric);
      if (p) out.push(p);
    };
    tryMap("basic", "monthly_revenue", sd.revenue);
    tryMap("basic", "monthly_orders", sd.orders);
    tryMap("basic", "average_ticket", sd.average_ticket);
    tryMap("storefront", "rating", sd.rating ?? sd.average_rating);
    tryMap("storefront", "reviews_count", sd.reviews_count ?? sd.total_reviews);
    tryMap("delivery", "prep_time", sd.prep_time_min);
    tryMap("delivery", "real_time", sd.delivery_time_min);
    tryMap("menu", "products_total", sd.products_visible);
    tryYesNo("menu", "has_combos", sd.has_combos);
    tryYesNo("storefront", "has_cover", sd.has_cover);
    tryYesNo("storefront", "has_logo", sd.has_logo);
    if (num(sd.products_visible) !== null && num(sd.products_with_photo) !== null) {
      const without = Math.max(0, (num(sd.products_visible) as number) - (num(sd.products_with_photo) as number));
      tryMap("menu", "without_photo", without);
    }

    if (cls === "faturamento") {
      const src = "Print de faturamento";
      const rev = num(sd.revenue);
      if (rev !== null) { const p = bucketProposal("basic", "monthly_revenue", rev, src); if (p) out.push(p); }
      const ord = num(sd.orders);
      if (ord !== null) { const p = bucketProposal("basic", "monthly_orders", ord, src); if (p) out.push(p); }
      const tk = num(sd.average_ticket);
      if (tk !== null) { const p = bucketProposal("basic", "average_ticket", tk, src); if (p) out.push(p); }
    }

    if (cls === "indicadores" || cls === "avaliacoes") {
      const src = cls === "indicadores" ? "Print de indicadores" : "Print de avaliações";
      const r = num(sd.rating ?? sd.average_rating);
      if (r !== null) { const p = bucketProposal("storefront", "rating", r, src); if (p) out.push(p); }
      const rc = num(sd.reviews_count ?? sd.total_reviews);
      if (rc !== null) { const p = bucketProposal("storefront", "reviews_count", rc, src); if (p) out.push(p); }
      const prep = num(sd.prep_time_min);
      if (prep !== null) { const p = bucketProposal("delivery", "prep_time", prep, src); if (p) out.push(p); }
      const dt = num(sd.delivery_time_min);
      if (dt !== null) { const p = bucketProposal("delivery", "real_time", dt, src); if (p) out.push(p); }
    }

    if (cls === "cardapio") {
      const src = "Print do cardápio";
      const total = num(sd.products_visible);
      if (total !== null) { const p = bucketProposal("menu", "products_total", total, src); if (p) out.push(p); }
      const withPhoto = num(sd.products_with_photo);
      if (total !== null && withPhoto !== null) {
        const without = Math.max(0, total - withPhoto);
        const p = bucketProposal("menu", "without_photo", without, src);
        if (p) out.push(p);
      }
      if (typeof sd.has_combos === "boolean") {
        const p = yesnoProposal("menu", "has_combos", sd.has_combos, src);
        if (p) out.push(p);
      }
    }

    if (cls === "loja") {
      const src = "Print da loja";
      if (typeof sd.has_cover === "boolean") { const p = yesnoProposal("storefront", "has_cover", sd.has_cover, src); if (p) out.push(p); }
      if (typeof sd.has_logo === "boolean") { const p = yesnoProposal("storefront", "has_logo", sd.has_logo, src); if (p) out.push(p); }
      const r = num(sd.rating);
      if (r !== null) { const p = bucketProposal("storefront", "rating", r, src); if (p) out.push(p); }
    }
  }

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
