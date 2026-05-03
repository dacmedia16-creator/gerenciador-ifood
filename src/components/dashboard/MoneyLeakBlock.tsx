import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  name: string;
  sale_price: number | null;
  food_cost: number | null;
  packaging_cost: number | null;
  platform_fee_percent: number | null;
  coupon_impact: number | null;
  sales_quantity: number | null;
};

function unitProfit(p: Product) {
  const price = Number(p.sale_price || 0);
  const food = Number(p.food_cost || 0);
  const pkg = Number(p.packaging_cost || 0);
  const fee = price * Number(p.platform_fee_percent || 0) / 100;
  const coupon = Number(p.coupon_impact || 0);
  return price - food - pkg - fee - coupon;
}

function quadrant(p: Product, salesMedian: number, profitMedian: number) {
  const sales = Number(p.sales_quantity || 0);
  const profit = unitProfit(p);
  const highSales = sales >= salesMedian;
  const highProfit = profit >= profitMedian;
  if (highSales && !highProfit) return "vende_muito_lucra_pouco";
  if (!highSales && highProfit) return "vende_pouco_lucra_bem";
  if (highSales && highProfit) return "vencedor";
  return "fraco";
}

const QUADRANT_LABEL: Record<string, { label: string; tone: "destructive" | "secondary" | "default" | "outline"; action: string }> = {
  vende_muito_lucra_pouco: { label: "Vende muito, lucra pouco", tone: "destructive", action: "Subir preço ou redesenhar combo" },
  vende_pouco_lucra_bem: { label: "Lucra bem, vende pouco", tone: "secondary", action: "Destacar e promover" },
  vencedor: { label: "Vencedor", tone: "default", action: "Proteger esse item" },
  fraco: { label: "Vende pouco e lucra pouco", tone: "outline", action: "Considerar tirar do cardápio" },
};

export function MoneyLeakBlock({ storeId }: { storeId: string }) {
  const navigate = useNavigate();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["moneyLeakProducts", storeId],
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, sale_price, food_cost, packaging_cost, platform_fee_percent, coupon_impact, sales_quantity")
        .eq("store_id", storeId)
        .eq("is_active", true);
      return (data as Product[]) || [];
    },
  });

  if (isLoading || products.length === 0) return null;

  const withCost = products.filter(p => p.sale_price && (p.food_cost != null));
  if (withCost.length < 2) {
    return (
      <Card className="p-4 sm:p-6 shadow-card border-l-4 border-warning">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-bold text-base sm:text-lg">Onde você está perdendo dinheiro</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre o custo do produto, embalagem e taxa do app nos seus produtos para ver
              quanto cada item realmente lucra.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(`/app/stores/${storeId}/products`)}>
              Cadastrar custos <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const sales = withCost.map(p => Number(p.sales_quantity || 0)).sort((a, b) => a - b);
  const profits = withCost.map(p => unitProfit(p)).sort((a, b) => a - b);
  const salesMedian = sales[Math.floor(sales.length / 2)] || 0;
  const profitMedian = profits[Math.floor(profits.length / 2)] || 0;

  const classified = withCost.map(p => ({
    p,
    profit: unitProfit(p),
    quadrant: quadrant(p, salesMedian, profitMedian),
    monthlyLeak: Math.max(0, (profitMedian - unitProfit(p))) * Number(p.sales_quantity || 0),
  }));

  const critical = classified
    .filter(c => c.quadrant === "vende_muito_lucra_pouco")
    .sort((a, b) => b.monthlyLeak - a.monthlyLeak)
    .slice(0, 3);

  const totalLeak = critical.reduce((s, c) => s + c.monthlyLeak, 0);

  return (
    <Card className="p-4 sm:p-6 shadow-card border-l-4 border-warning">
      <div className="flex items-center gap-2 mb-1">
        <TrendingDown className="h-5 w-5 text-warning" />
        <h2 className="text-lg sm:text-xl font-bold">Onde você está perdendo dinheiro</h2>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Produtos que vendem bem mas têm margem fraca. Ajustar preço ou combo vira lucro direto.
      </p>

      {critical.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Boa! Seus produtos mais vendidos têm margem saudável. Continue de olho nos custos.
        </p>
      ) : (
        <>
          {totalLeak > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground">Estimativa de margem deixada na mesa por mês</p>
              <p className="text-2xl font-bold text-destructive">
                ≈ R$ {Math.round(totalLeak).toLocaleString("pt-BR")}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {critical.map(({ p, profit, quadrant, monthlyLeak }) => {
              const meta = QUADRANT_LABEL[quadrant];
              return (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm">{p.name}</strong>
                      <Badge variant={meta.tone} className="text-[10px]">{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lucro por item: <strong>R$ {profit.toFixed(2)}</strong>
                      {p.sales_quantity ? <> · {p.sales_quantity} vendas</> : null}
                      {monthlyLeak > 0 && <> · perda estimada R$ {Math.round(monthlyLeak).toLocaleString("pt-BR")}/mês</>}
                    </p>
                    <p className="text-xs mt-1">→ {meta.action}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/app/stores/${storeId}/pricing-simulator`)}>
              Simular novo preço
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/app/stores/${storeId}/products`)}>
              Ver todos os produtos
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
