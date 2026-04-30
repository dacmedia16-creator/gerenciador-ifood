import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";

export default function Pricing() {
  const { id } = useParams();
  const { products, loading } = useStoreData(id);
  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  const rows = (products || []).map((p: any) => {
    const sale = Number(p.sale_price) || 0;
    const food = Number(p.food_cost) || 0;
    const pkg = Number(p.packaging_cost) || 0;
    const fee = sale * (Number(p.platform_fee_percent) || 0) / 100;
    const coupon = Number(p.coupon_impact) || 0;
    const profit = sale - food - pkg - fee - coupon;
    const margin = sale ? (profit / sale) * 100 : 0;
    return { ...p, fee, profit, margin };
  });

  const burningMargin = rows.filter((p: any) => p.sales_quantity > 100 && p.margin < 20);
  const undervalued = rows.filter((p: any) => p.margin > 35 && p.sales_quantity < 100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Margem & precificação</h1>

      <Card className="shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="p-3 text-left">Produto</th><th>Preço</th><th>Custo</th><th>Embalagem</th><th>Taxa plat.</th><th>Lucro/pedido</th><th>Margem</th></tr>
          </thead>
          <tbody>
            {rows.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="text-center">R$ {p.sale_price}</td>
                <td className="text-center">R$ {p.food_cost}</td>
                <td className="text-center">R$ {p.packaging_cost}</td>
                <td className="text-center">R$ {p.fee.toFixed(2)}</td>
                <td className="text-center font-semibold">R$ {p.profit.toFixed(2)}</td>
                <td className={`text-center font-bold ${p.margin < 20 ? "text-destructive" : p.margin < 30 ? "text-warning" : "text-success"}`}>{p.margin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold text-destructive mb-3">🔥 Vende muito mas dá pouco lucro</h3>
          {burningMargin.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto nessa situação.</p> :
            <ul className="space-y-1 text-sm">{burningMargin.map((p: any) => <li key={p.id}>{p.name} — {p.sales_quantity} vendas, margem {p.margin.toFixed(1)}%</li>)}</ul>}
        </Card>
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold text-success mb-3">💎 Lucrativos sem destaque</h3>
          {undervalued.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto subexplorado.</p> :
            <ul className="space-y-1 text-sm">{undervalued.map((p: any) => <li key={p.id}>{p.name} — margem {p.margin.toFixed(1)}%, só {p.sales_quantity} vendas</li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}
