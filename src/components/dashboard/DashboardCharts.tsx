import { Card } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

interface Props {
  revenueData: { mes: string; receita: number }[];
  sentimentData: { name: string; value: number; color: string }[];
}

export default function DashboardCharts({ revenueData, sentimentData }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-4 shadow-card lg:col-span-2">
        <h3 className="font-semibold mb-3">Faturamento mensal</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={revenueData}>
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 shadow-card">
        <h3 className="font-semibold mb-3">Sentimento das avaliações</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {sentimentData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-around text-xs">
          {sentimentData.map((d) => (
            <div key={d.name} className="text-center">
              <div className="h-2 w-2 rounded-full inline-block mr-1" style={{ background: d.color }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
