import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PricingSimulator() {
  const [salePrice, setSalePrice] = useState<number>(35);
  const [foodCost, setFoodCost] = useState<number>(8);
  const [packaging, setPackaging] = useState<number>(1.5);
  const [feePct, setFeePct] = useState<number>(23);
  const [delivery, setDelivery] = useState<number>(0);
  const [coupon, setCoupon] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  const fee = (salePrice * feePct) / 100;
  const totalCost = foodCost + packaging + fee + delivery + coupon;
  const profit = salePrice - totalCost;
  const margin = salePrice ? (profit / salePrice) * 100 : 0;

  // Preço mínimo recomendado para atingir target margin
  // sale * (1 - fee%) - food - pkg - delivery - coupon = sale * targetMargin/100
  // sale (1 - fee/100 - target/100) = food + pkg + delivery + coupon
  const denom = 1 - feePct / 100 - targetMargin / 100;
  const minPrice = denom > 0 ? (foodCost + packaging + delivery + coupon) / denom : null;

  const status: "ok" | "atencao" | "ruim" =
    margin >= 30 ? "ok" : margin >= 15 ? "atencao" : "ruim";

  const num = (n: number) => `R$ ${n.toFixed(2)}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Precificação</h1>
        <p className="text-sm text-muted-foreground">Calcule lucro, margem e preço mínimo recomendado por produto.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card space-y-4">
          <h2 className="font-semibold">Insira os dados</h2>
          {[
            { l: "Preço de venda (R$)", v: salePrice, set: setSalePrice },
            { l: "Custo do alimento (R$)", v: foodCost, set: setFoodCost },
            { l: "Embalagem (R$)", v: packaging, set: setPackaging },
            { l: "Taxa da plataforma (%)", v: feePct, set: setFeePct },
            { l: "Custo de entrega/motoboy (R$)", v: delivery, set: setDelivery },
            { l: "Cupom/desconto (R$)", v: coupon, set: setCoupon },
            { l: "Margem alvo (%)", v: targetMargin, set: setTargetMargin },
          ].map((f) => (
            <div key={f.l}>
              <Label className="text-sm">{f.l}</Label>
              <Input
                type="number"
                step="0.01"
                value={f.v}
                onChange={(e) => f.set(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
          ))}
        </Card>

        <Card className="p-5 shadow-card space-y-4">
          <h2 className="font-semibold">Resultado</h2>
          <div className="space-y-2 text-sm">
            <Row label="Taxa da plataforma" value={num(fee)} />
            <Row label="Custo total" value={num(totalCost)} />
            <Row label="Lucro líquido por pedido" value={num(profit)} bold />
            <Row label="Margem percentual" value={`${margin.toFixed(1)}%`} bold />
            <div className="border-t pt-3 mt-3">
              <Row label="Preço mínimo recomendado" value={minPrice && minPrice > 0 ? num(minPrice) : "—"} bold />
              <p className="text-xs text-muted-foreground mt-1">Para atingir margem alvo de {targetMargin}%.</p>
            </div>
          </div>

          <div className="pt-2">
            {status === "ok" && (
              <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1 inline" /> Margem saudável</Badge>
            )}
            {status === "atencao" && (
              <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1 inline" /> Margem apertada — revisar custos</Badge>
            )}
            {status === "ruim" && (
              <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1 inline" /> Vende, mas não lucra</Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b py-2 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
