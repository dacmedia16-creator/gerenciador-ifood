export const CSV_TEMPLATES = {
  metrics: `period_start,period_end,revenue,orders,average_ticket,average_delivery_time,cancellation_rate,rating,coupon_cost,ads_cost,estimated_profit
2026-04-01,2026-04-30,48000,1200,38.5,52,6.8,4.2,1800,2200,8640
2026-03-01,2026-03-31,45000,1180,38.1,50,5.9,4.3,1500,2000,8100`,

  products: `name,category,sale_price,food_cost,packaging_cost,platform_fee_percent,sales_quantity,has_photo,estimated_margin
Burger Clássico,Burgers,28,9,1.5,23,320,true,28
Batata Rústica,Acompanhamentos,18,4,1,23,410,true,38`,

  reviews: `order_date,rating,comment
2026-04-15,5,Hambúrguer maravilhoso chegou rápido
2026-04-14,2,Comida fria e demorou demais
2026-04-13,4,Sabor ótimo embalagem ok`,
};

export function downloadTemplate(kind: keyof typeof CSV_TEMPLATES) {
  const blob = new Blob([CSV_TEMPLATES[kind]], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `template-${kind}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
