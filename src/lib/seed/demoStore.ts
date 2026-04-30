import { supabase } from "@/integrations/supabase/client";
import { runDiagnostics } from "@/lib/diagnostics/engine";

export async function seedDemoStore(userId: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .insert({
      user_id: userId,
      name: "Burger House (Demo)",
      category: "Hamburgueria",
      platform: "iFood",
      city: "São Paulo",
      neighborhood: "Vila Madalena",
      rating: 4.2,
      promised_delivery_time: 52,
      delivery_fee: 8.9,
      monthly_revenue: 48000,
      monthly_orders: 1200,
      average_ticket: 38.5,
      cancellation_rate: 6.8,
      opening_hours: "18h–23h, todos os dias",
      notes: "Loja gerada automaticamente para demonstração.",
    })
    .select()
    .single();
  if (error || !store) throw error;

  const products = [
    { name: "Burger Clássico", category: "Burgers", sale_price: 28, food_cost: 9, packaging_cost: 1.5, platform_fee_percent: 23, sales_quantity: 320, has_photo: true, estimated_margin: 28, complaints_count: 4 },
    { name: "Burger Bacon", category: "Burgers", sale_price: 34, food_cost: 12, packaging_cost: 1.5, platform_fee_percent: 23, sales_quantity: 280, has_photo: true, estimated_margin: 26, complaints_count: 2 },
    { name: "Burger Vegano", category: "Burgers", sale_price: 36, food_cost: 16, packaging_cost: 1.5, platform_fee_percent: 23, sales_quantity: 60, has_photo: false, estimated_margin: 18, complaints_count: 1 },
    { name: "Combo Duplo", category: "Combos", sale_price: 56, food_cost: 22, packaging_cost: 2, platform_fee_percent: 23, sales_quantity: 90, has_photo: true, estimated_margin: 22, complaints_count: 0 },
    { name: "Batata Rústica", category: "Acompanhamentos", sale_price: 18, food_cost: 4, packaging_cost: 1, platform_fee_percent: 23, sales_quantity: 410, has_photo: true, estimated_margin: 38, complaints_count: 6 },
    { name: "Onion Rings", category: "Acompanhamentos", sale_price: 20, food_cost: 5, packaging_cost: 1, platform_fee_percent: 23, sales_quantity: 70, has_photo: false, estimated_margin: 35, complaints_count: 1 },
    { name: "Refrigerante Lata", category: "Bebidas", sale_price: 7, food_cost: 3, packaging_cost: 0.2, platform_fee_percent: 23, sales_quantity: 600, has_photo: true, estimated_margin: 32, complaints_count: 0 },
    { name: "Suco Natural", category: "Bebidas", sale_price: 12, food_cost: 4, packaging_cost: 0.5, platform_fee_percent: 23, sales_quantity: 80, has_photo: false, estimated_margin: 30, complaints_count: 0 },
    { name: "Milk Shake", category: "Sobremesas", sale_price: 18, food_cost: 6, packaging_cost: 1, platform_fee_percent: 23, sales_quantity: 120, has_photo: true, estimated_margin: 28, complaints_count: 2 },
    { name: "Brownie", category: "Sobremesas", sale_price: 14, food_cost: 4, packaging_cost: 0.5, platform_fee_percent: 23, sales_quantity: 90, has_photo: false, estimated_margin: 36, complaints_count: 0 },
    { name: "Burger Premium", category: "Burgers", sale_price: 42, food_cost: 18, packaging_cost: 1.5, platform_fee_percent: 23, sales_quantity: 50, has_photo: false, estimated_margin: 20, complaints_count: 3 },
    { name: "Salada Caesar", category: "Saladas", sale_price: 26, food_cost: 11, packaging_cost: 1.5, platform_fee_percent: 23, sales_quantity: 30, has_photo: false, estimated_margin: 22, complaints_count: 1 },
  ].map((p) => ({ ...p, store_id: store.id, is_active: true }));

  await supabase.from("products").insert(products);

  const reviews = [
    { rating: 5, comment: "Hambúrguer maravilhoso, chegou rápido!", sentiment: "positivo" },
    { rating: 5, comment: "Melhor burger da região", sentiment: "positivo" },
    { rating: 4, comment: "Comida boa mas atrasou um pouco", sentiment: "neutro", detected_topics: ["atraso"] },
    { rating: 2, comment: "Pedido errado, faltou a batata", sentiment: "negativo", detected_topics: ["pedido errado"] },
    { rating: 1, comment: "Comida chegou fria e demorou demais", sentiment: "negativo", detected_topics: ["frio", "atraso"] },
    { rating: 3, comment: "Embalagem ruim, vazou", sentiment: "negativo", detected_topics: ["embalagem"] },
    { rating: 5, comment: "Tudo perfeito, voltarei", sentiment: "positivo" },
    { rating: 2, comment: "Demorou 1 hora pra chegar", sentiment: "negativo", detected_topics: ["atraso"] },
    { rating: 4, comment: "Sabor ótimo", sentiment: "positivo" },
    { rating: 1, comment: "Pedido errado de novo", sentiment: "negativo", detected_topics: ["pedido errado"] },
    { rating: 5, comment: "Atendimento excelente", sentiment: "positivo" },
    { rating: 3, comment: "Porção pequena pelo preço", sentiment: "negativo", detected_topics: ["porção"] },
    { rating: 4, comment: "Boa qualidade", sentiment: "positivo" },
    { rating: 2, comment: "Veio frio", sentiment: "negativo", detected_topics: ["frio"] },
    { rating: 5, comment: "Adorei o combo!", sentiment: "positivo" },
  ].map((r) => ({ ...r, store_id: store.id, order_date: new Date().toISOString().slice(0, 10) }));

  await supabase.from("reviews").insert(reviews);

  const competitors = [
    { name: "Burger King Vila", rating: 4.6, delivery_time: 35, delivery_fee: 6.9, price_range: "$$", photo_quality: "alta", has_combos: true, has_coupons: true, positioning_notes: "Marca forte e cupons agressivos" },
    { name: "Madero Express", rating: 4.7, delivery_time: 40, delivery_fee: 9.9, price_range: "$$$", photo_quality: "alta", has_combos: true, has_coupons: false, positioning_notes: "Premium, foco em qualidade" },
    { name: "Smash Lab", rating: 4.5, delivery_time: 38, delivery_fee: 7.5, price_range: "$$", photo_quality: "media", has_combos: true, has_coupons: true, positioning_notes: "Smash burger artesanal" },
    { name: "Burguer da Esquina", rating: 4.3, delivery_time: 45, delivery_fee: 5.9, price_range: "$", photo_quality: "baixa", has_combos: false, has_coupons: true, positioning_notes: "Preço baixo, sem diferencial" },
  ].map((c) => ({ ...c, store_id: store.id }));
  await supabase.from("competitors").insert(competitors);

  const campaigns = [
    { name: "Cupom 20% OFF", campaign_type: "cupom", cost: 1800, revenue_generated: 4500, new_customers: 60, estimated_roi: 2.5, margin_impact: -8 },
    { name: "Anúncio Topo iFood", campaign_type: "ads", cost: 2200, revenue_generated: 1800, new_customers: 25, estimated_roi: 0.82, margin_impact: -3 },
    { name: "Frete grátis fim de semana", campaign_type: "frete", cost: 1200, revenue_generated: 3800, new_customers: 40, estimated_roi: 3.16, margin_impact: -5 },
  ].map((c) => ({ ...c, store_id: store.id, period_start: "2026-04-01", period_end: "2026-04-30" }));
  await supabase.from("campaigns").insert(campaigns);

  // 6 meses de métricas
  const now = new Date();
  const metrics = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const base = 42000 + Math.round(Math.random() * 8000);
    return {
      store_id: store.id,
      period_start: d.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      revenue: base,
      orders: Math.round(base / 38),
      average_ticket: 38 + Math.random() * 4,
      average_delivery_time: 48 + Math.round(Math.random() * 8),
      cancellation_rate: 5 + Math.random() * 3,
      rating: 4.1 + Math.random() * 0.3,
      coupon_cost: 1500 + Math.round(Math.random() * 800),
      ads_cost: 2000 + Math.round(Math.random() * 600),
      estimated_profit: base * 0.18,
    };
  });
  await supabase.from("metrics").insert(metrics);

  // gerar diagnósticos
  const diags = runDiagnostics({ store, metrics, products, reviews, competitors, campaigns });
  if (diags.length) {
    const { data: insertedDiags } = await supabase
      .from("diagnostics")
      .insert(diags.map((d) => ({ ...d, store_id: store.id })))
      .select();

    if (insertedDiags) {
      const actions = insertedDiags.map((d: any) => ({
        store_id: store.id,
        diagnostic_id: d.id,
        title: d.practical_action,
        area: d.area,
        priority: d.priority,
        impact: d.severity === "critico" ? "alto" : "medio",
        effort: "medio",
        status: "pendente",
        description: d.recommended_solution,
      }));
      await supabase.from("action_plans").insert(actions);
    }
  }

  return store;
}
