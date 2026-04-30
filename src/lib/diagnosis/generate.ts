import { supabase } from "@/integrations/supabase/client";
import { answersAsMap, loadSession } from "./session";
import { rulesFromAnswers, buildSevenDayPlan } from "./rules";
import { evidencesFromAnswers } from "./evidences";
import { buildJourney } from "./journey";
import { classifyConversion, computeConversion, conversionLabel } from "./conversion";

const yes = (v: any) => v === true || v === "sim" || v === "yes";
const num = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

async function ensureStore(userId: string, sessionId: string, basic: any, front: any, delivery: any) {
  // se a session já tem store_id, atualiza; caso contrário, cria
  const { data: session } = await supabase
    .from("diagnosis_sessions")
    .select("store_id")
    .eq("id", sessionId)
    .single();

  const storePayload: any = {
    user_id: userId,
    name: basic.name || "Loja sem nome",
    category: basic.category,
    platform: basic.platform,
    city: basic.city,
    neighborhood: basic.neighborhood,
    opening_hours: basic.opening_hours,
    monthly_revenue: num(basic.monthly_revenue),
    monthly_orders: num(basic.monthly_orders),
    average_ticket: num(basic.average_ticket),
    notes: basic.notes,
    rating: num(front.rating),
    delivery_fee: num(front.delivery_fee),
    promised_delivery_time: num(front.promised_delivery_time),
    cancellation_rate: num(delivery?.cancellation_rate),
  };

  let storeId = session?.store_id as string | null;
  if (storeId) {
    await supabase.from("stores").update(storePayload).eq("id", storeId);
  } else {
    const { data, error } = await supabase
      .from("stores")
      .insert(storePayload)
      .select("id")
      .single();
    if (error) throw error;
    storeId = data.id;
    await supabase.from("diagnosis_sessions").update({ store_id: storeId }).eq("id", sessionId);
  }
  return storeId!;
}

async function syncProducts(storeId: string, items: any[]) {
  if (!items?.length) return;
  // limpa produtos previamente cadastrados via funil para esta sessão (escopo simples: substitui se nome igual)
  for (const p of items) {
    if (!p.name) continue;
    const sale = num(p.sale_price);
    const cost = (num(p.food_cost) ?? 0) + (num(p.packaging_cost) ?? 0);
    const fee = num(p.platform_fee_percent) ?? 0;
    const margin = sale ? ((sale - cost - (sale * fee) / 100) / sale) * 100 : null;
    await supabase.from("products").upsert(
      {
        store_id: storeId,
        name: p.name,
        category: p.category,
        sale_price: sale,
        food_cost: num(p.food_cost),
        packaging_cost: num(p.packaging_cost),
        platform_fee_percent: fee,
        sales_quantity: num(p.sales_quantity) ?? 0,
        has_photo: yes(p.has_photo),
        complaints_count: yes(p.has_complaints) ? 1 : 0,
        estimated_margin: margin,
        description: p.notes,
      } as any,
      { onConflict: "id" } as any
    );
  }
}

async function syncCompetitors(storeId: string, items: any[]) {
  if (!items?.length) return;
  for (const c of items) {
    if (!c.name) continue;
    await supabase.from("competitors").insert({
      store_id: storeId,
      name: c.name,
      rating: num(c.rating),
      delivery_time: num(c.delivery_time),
      delivery_fee: num(c.delivery_fee),
      price_range: c.price_range,
      photo_quality: c.photo_quality,
      has_combos: yes(c.has_combos),
      has_coupons: yes(c.has_coupons),
      positioning_notes: c.notes,
    });
  }
}

async function syncReviews(storeId: string, reviewsText: string | undefined, mainComplaints: string | undefined) {
  if (!reviewsText) return;
  const lines = reviewsText.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 30);
  if (!lines.length) return;
  const rows = lines.map((comment) => {
    const lower = comment.toLowerCase();
    const negative = /atras|frio|errado|ruim|péssim|pessim|demor|pequena/.test(lower);
    const positive = /ótim|otim|excel|delicios|recomend|amei|maravilh/.test(lower);
    return {
      store_id: storeId,
      comment,
      sentiment: negative ? "negativo" : positive ? "positivo" : "neutro",
    };
  });
  await supabase.from("reviews").insert(rows);
}

export async function generateDiagnosis(sessionId: string, userId: string) {
  const { answers } = await loadSession(sessionId);
  const map = answersAsMap(answers);

  const basic = map.basic || {};
  const front = map.storefront || {};
  const delivery = map.delivery || {};

  const storeId = await ensureStore(userId, sessionId, basic, front, delivery);

  // Espelhar dados nas tabelas reais
  await syncProducts(storeId, map.products?.items || []);
  await syncCompetitors(storeId, map.competitors?.items || []);
  await syncReviews(storeId, map.reviews?.real_reviews, map.reviews?.main_complaints);

  // Métricas
  if (basic.monthly_revenue || basic.monthly_orders) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    await supabase.from("metrics").insert({
      store_id: storeId,
      period_start: start,
      period_end: end,
      revenue: num(basic.monthly_revenue),
      orders: num(basic.monthly_orders),
      average_ticket: num(basic.average_ticket),
      rating: num(front.rating),
      cancellation_rate: num(delivery.cancellation_rate),
      average_delivery_time: num(delivery.real_time) ?? num(front.promised_delivery_time),
    });
  }

  // Evidências estruturadas (fonte da verdade objetiva, consumidas pela IA)
  const ruleEvidences = evidencesFromAnswers(map);

  // Diagnósticos
  let diagnostics = rulesFromAnswers(map);

  // Garantia mínima — nunca devolver 0 itens
  if (diagnostics.length === 0) {
    diagnostics = [
      {
        area: "Cadastro geral",
        problem: "Cadastro insuficiente para diagnóstico aprofundado",
        evidence: "Dados do funil consultivo estão muito incompletos",
        probable_cause: "Onboarding inicial não preenchido",
        business_impact: "Sem dados, não é possível identificar gargalos reais da loja",
        recommended_solution: "Completar cadastro: produtos, concorrentes, funil de conversão e avaliações",
        priority: "alta",
        practical_action: "Voltar ao funil e preencher as etapas restantes",
        suggested_deadline: "7 dias",
        severity: "atencao",
      },
    ];
  }

  if (diagnostics.length) {
    await supabase.from("diagnostics").insert(
      diagnostics.map((d) => ({
        store_id: storeId,
        area: d.area,
        problem: d.problem,
        evidence: d.evidence,
        probable_cause: d.probable_cause,
        business_impact: d.business_impact,
        recommended_solution: d.recommended_solution,
        priority: d.priority,
        practical_action: d.practical_action,
        suggested_deadline: d.suggested_deadline,
        severity: d.severity,
      }))
    );
  }

  // Plano de ação (a partir dos diagnósticos)
  if (diagnostics.length) {
    await supabase.from("action_plans").insert(
      diagnostics.map((d) => ({
        store_id: storeId,
        title: d.recommended_solution.slice(0, 120),
        description: d.practical_action,
        area: d.area,
        priority: d.priority,
        impact: d.severity === "critico" ? "alto" : "medio",
        effort: "medio",
        status: "pendente",
      }))
    );
  }

  // Relatório consolidado
  const reviews = map.reviews || {};
  const loyalty = map.loyalty || {};
  const conversionAns = map.conversion || {};
  const finalQ = map.final_questions || {};
  const journey = buildJourney(map);
  const sevenDay = buildSevenDayPlan(diagnostics);
  const convRate = num(conversionAns.conversion_rate) ?? computeConversion(num(conversionAns.visits), num(conversionAns.orders));
  const convLevel = classifyConversion(convRate);

  // Gargalo principal = jornada com pior status (crítico) mais cedo no funil
  const stageOrder = ["ve_loja","entra_loja","clica_produto","adiciona_carrinho","compra","recebe","recompra"];
  const main = [...journey].sort((a, b) => {
    const sev = (s: string) => (s === "critico" ? 0 : s === "atencao" ? 1 : 2);
    return sev(a.status) - sev(b.status) || stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
  })[0];

  const reportData = {
    conversion: {
      visits: num(conversionAns.visits),
      clicks: num(conversionAns.clicks),
      orders: num(conversionAns.orders),
      rate: convRate,
      level: convLevel,
      label: convLevel ? conversionLabel(convLevel) : null,
    },
    journey,
    main_bottleneck: main ? { stage: main.stage, title: main.title, status: main.status, bottleneck: main.bottleneck } : null,
    seven_day_plan: sevenDay,
    next_best_action: sevenDay[0] ?? null,
    six_questions: {
      por_que_nao_entram: finalQ.q_nao_entram ||
        (front.has_cover === false || front.has_logo === false
          ? "Vitrine pouco atrativa: faltam capa/logo profissionais que chamem o clique."
          : "Vitrine ok — investigar nota, tempo prometido e categoria."),
      por_que_nao_clicam: finalQ.q_nao_clicam ||
        ((map.menu?.without_photo || 0) > 0
          ? "Produtos sem foto reduzem o clique drasticamente."
          : "Cardápio com fotos — investigar ordem dos produtos e combos no topo."),
      por_que_nao_compram: finalQ.q_nao_compram ||
        (convLevel === "critico" || convLevel === "atencao"
          ? `Conversão ${convRate}% indica preço/taxa/falta de combo no checkout.`
          : "Conversão saudável — manter padrão e ampliar combos."),
      por_que_compram_pouco: finalQ.q_compram_pouco ||
        (!yes(map.menu?.has_combos)
          ? "Falta de combos e cross-sell mantém o ticket baixo."
          : "Há combos — destacar mais e melhorar upsell."),
      por_que_nao_voltam: finalQ.q_nao_voltam ||
        (!yes(loyalty.rebuy_strategy)
          ? "Sem estratégia de recompra: cliente novo é caro e não volta sozinho."
          : "Estratégia existe — medir taxa de recompra real."),
      por_que_nao_lucram: finalQ.q_nao_lucram ||
        "Margem média apertada e/ou campanhas com ROI baixo. Reprecificar top vendidos.",
    },
    answers_summary: map,
  };

  const { data: report } = await supabase
    .from("reports")
    .insert({
      store_id: storeId,
      title: `Diagnóstico — ${basic.name || "Loja"}`,
      executive_summary: `Diagnóstico gerado a partir do funil consultivo com ${diagnostics.length} problemas identificados.`,
      key_problems: diagnostics.slice(0, 5).map((d) => ({ area: d.area, problem: d.problem, severity: d.severity })) as any,
      recommendations: diagnostics.slice(0, 5).map((d) => d.recommended_solution) as any,
      report_data: reportData as any,
    } as any)
    .select("id")
    .single();

  await supabase
    .from("diagnosis_sessions")
    .update({ status: "generated", generated_at: new Date().toISOString(), completed_at: new Date().toISOString(), store_id: storeId })
    .eq("id", sessionId);

  return { storeId, reportId: report?.id, diagnosticsCount: diagnostics.length };
}
