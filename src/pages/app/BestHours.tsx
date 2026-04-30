import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";

type Slot = { day: string; hour: string; orders: number; revenue: number };

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOUR_BLOCKS = [
  { label: "Almoço", range: [11, 14] },
  { label: "Tarde", range: [14, 18] },
  { label: "Jantar", range: [18, 22] },
  { label: "Madrugada", range: [22, 24] },
] as const;

// Estimativa: distribui pedidos mensais em padrão típico de delivery brasileiro
function estimateHeatmap(monthlyOrders: number): Slot[] {
  // pesos por dia (Dom..Sáb) — sex/sáb mais fortes
  const dayWeights = [0.13, 0.10, 0.10, 0.11, 0.13, 0.20, 0.23];
  // pesos por hora (0-23)
  const hourWeights = Array(24).fill(0).map((_, h) => {
    if (h >= 11 && h <= 13) return 0.10;
    if (h >= 18 && h <= 21) return 0.18;
    if (h === 22) return 0.07;
    if (h >= 14 && h <= 17) return 0.04;
    return 0.01;
  });
  const sumH = hourWeights.reduce((a, b) => a + b, 0);
  const norm = hourWeights.map((w) => w / sumH);

  const slots: Slot[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const orders = Math.round((monthlyOrders * dayWeights[d] * norm[h]) / 4); // por semana
      slots.push({ day: DAYS[d], hour: String(h).padStart(2, "0") + "h", orders, revenue: 0 });
    }
  }
  return slots;
}

export default function BestHours() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: store } = await supabase.from("stores").select("monthly_orders, average_ticket").eq("id", id!).single();
      setMonthlyOrders(store?.monthly_orders || 0);
      setAverageTicket(Number(store?.average_ticket) || 0);
      setLoading(false);
    })();
  }, [id]);

  const slots = useMemo(() => estimateHeatmap(monthlyOrders || 600), [monthlyOrders]);

  // Top 5 horários
  const top = useMemo(
    () => [...slots].sort((a, b) => b.orders - a.orders).slice(0, 5),
    [slots]
  );

  // Matriz visual: dias x faixas
  const matrix = useMemo(() => {
    return DAYS.map((d) =>
      HOUR_BLOCKS.map((b) => {
        const sum = slots
          .filter((s) => s.day === d && Number(s.hour.replace("h", "")) >= b.range[0] && Number(s.hour.replace("h", "")) < b.range[1])
          .reduce((acc, s) => acc + s.orders, 0);
        return sum;
      })
    );
  }, [slots]);

  const maxCell = Math.max(1, ...matrix.flat());

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-primary" /> Melhor Horário</h1>
        <p className="text-sm text-muted-foreground">
          {monthlyOrders > 0
            ? `Estimativa baseada nos ${monthlyOrders} pedidos/mês cadastrados.`
            : "Cadastre o volume mensal de pedidos da loja para uma estimativa real."}
        </p>
      </div>

      <Card className="p-5 shadow-card">
        <div className="text-sm font-medium mb-3">Mapa de calor — pedidos por dia × faixa</div>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr><th className="p-2"></th>{HOUR_BLOCKS.map((b) => <th key={b.label} className="p-2 font-medium">{b.label}<br/><span className="text-muted-foreground font-normal">{b.range[0]}-{b.range[1]}h</span></th>)}</tr>
            </thead>
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d}>
                  <td className="p-2 font-medium">{d}</td>
                  {matrix[i].map((v, j) => {
                    const intensity = v / maxCell;
                    return (
                      <td key={j} className="p-1">
                        <div
                          className="rounded text-center py-3 px-4 min-w-[80px] font-semibold"
                          style={{ background: `hsl(var(--primary) / ${0.08 + intensity * 0.55})`, color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}
                        >
                          {v}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 shadow-card">
          <div className="text-sm font-medium mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Top 5 horários</div>
          <div className="space-y-2">
            {top.map((s, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{i + 1}º</Badge>
                  <span className="font-medium">{s.day} • {s.hour}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{s.orders} pedidos/sem</div>
                  {averageTicket > 0 && <div className="text-xs text-muted-foreground">≈ R$ {(s.orders * averageTicket).toFixed(0)}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="text-sm font-medium mb-3">Recomendações</div>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-primary">▸</span> Concentre <b>cupons e impulsionamentos</b> nas faixas Top 5 para maximizar ROI.</li>
            <li className="flex gap-2"><span className="text-primary">▸</span> Sex/Sáb 19h-21h é o pico — garanta <b>estoque, embalagem e entregadores</b> reservados.</li>
            <li className="flex gap-2"><span className="text-primary">▸</span> Se o tempo de entrega sobe nesses horários, sua nota cai. Acompanhe o tempo real nestes blocos.</li>
            <li className="flex gap-2"><span className="text-primary">▸</span> Faixas frias (tarde/madrugada) são ideais para <b>combos exclusivos</b> ou cupons agressivos para aquecer demanda.</li>
            <li className="flex gap-2"><span className="text-primary">▸</span> Não anuncie em horários de pouco fluxo — desperdiça verba sem ganhar volume.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
