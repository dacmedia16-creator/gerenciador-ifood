import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Menu() {
  const { id } = useParams();
  const { products, loading } = useStoreData(id);
  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  const sorted = [...(products || [])];
  const topSellers = [...sorted].sort((a, b) => (b.sales_quantity || 0) - (a.sales_quantity || 0)).slice(0, 5);
  const mostProfit = [...sorted].sort((a, b) => (b.estimated_margin || 0) - (a.estimated_margin || 0)).slice(0, 5);
  const lowMargin = sorted.filter((p) => (p.estimated_margin || 0) < 25);
  const lowSales = [...sorted].sort((a, b) => (a.sales_quantity || 0) - (b.sales_quantity || 0)).slice(0, 5);
  const complaints = sorted.filter((p) => (p.complaints_count || 0) > 2);

  const Block = ({ title, items, accent = "primary" }: any) => (
    <Card className="p-4 shadow-card">
      <h3 className={`font-semibold mb-3 text-${accent}`}>{title}</h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto.</p> :
        <ul className="space-y-2">
          {items.map((p: any) => (
            <li key={p.id} className="flex justify-between text-sm border-b last:border-0 pb-1">
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.sales_quantity || 0} vendas · {p.estimated_margin || 0}% margem</span>
            </li>
          ))}
        </ul>}
    </Card>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Análise de cardápio</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Block title="🔥 Mais vendidos" items={topSellers} accent="success" />
        <Block title="💰 Mais lucrativos" items={mostProfit} accent="primary" />
        <Block title="⚠️ Baixa margem" items={lowMargin} accent="warning" />
        <Block title="📉 Baixa saída" items={lowSales} accent="muted-foreground" />
        <Block title="😡 Com reclamações" items={complaints} accent="destructive" />
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3">Sugestões</h3>
          <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
            <li>Crie combos com {topSellers[0]?.name || "seus mais vendidos"} + bebida</li>
            <li>Destaque {mostProfit[0]?.name || "produtos lucrativos"} no topo</li>
            <li>Reprecifique ou remova produtos de baixa margem e baixa saída</li>
            <li>Adicione fotos profissionais nos produtos sem imagem</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
