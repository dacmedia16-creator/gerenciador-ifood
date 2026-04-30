import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Metrics() {
  const { id } = useParams();
  const { metrics, loading, reload } = useStoreData(id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ period_start: "", period_end: "", revenue: "", orders: "", average_ticket: "", average_delivery_time: "", cancellation_rate: "", rating: "" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("metrics").insert({ ...form, store_id: id });
    if (error) return toast.error(error.message);
    toast.success("Métricas registradas"); setOpen(false); reload();
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Métricas mensais</h1>
        <Button onClick={() => setOpen(!open)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Adicionar período</Button>
      </div>

      {open && (
        <Card className="p-4 shadow-card">
          <form onSubmit={save} className="grid md:grid-cols-4 gap-3">
            <div><Label>Início</Label><Input type="date" required value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="date" required value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
            <div><Label>Receita</Label><Input type="number" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
            <div><Label>Pedidos</Label><Input type="number" value={form.orders} onChange={(e) => setForm({ ...form, orders: e.target.value })} /></div>
            <div><Label>Ticket médio</Label><Input type="number" step="0.01" value={form.average_ticket} onChange={(e) => setForm({ ...form, average_ticket: e.target.value })} /></div>
            <div><Label>Tempo entrega</Label><Input type="number" value={form.average_delivery_time} onChange={(e) => setForm({ ...form, average_delivery_time: e.target.value })} /></div>
            <div><Label>Cancelamento %</Label><Input type="number" step="0.1" value={form.cancellation_rate} onChange={(e) => setForm({ ...form, cancellation_rate: e.target.value })} /></div>
            <div><Label>Nota</Label><Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div className="md:col-span-4 flex justify-end"><Button type="submit">Salvar</Button></div>
          </form>
        </Card>
      )}

      <Card className="shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="p-3 text-left">Período</th><th>Receita</th><th>Pedidos</th><th>Ticket</th><th>Entrega</th><th>Cancel.</th><th>Nota</th></tr>
          </thead>
          <tbody>
            {metrics?.map((m: any) => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-medium">{m.period_start} → {m.period_end}</td>
                <td className="text-center">R$ {Number(m.revenue).toLocaleString("pt-BR")}</td>
                <td className="text-center">{m.orders}</td>
                <td className="text-center">R$ {Number(m.average_ticket).toFixed(2)}</td>
                <td className="text-center">{m.average_delivery_time} min</td>
                <td className="text-center">{Number(m.cancellation_rate).toFixed(1)}%</td>
                <td className="text-center">{Number(m.rating).toFixed(1)} ⭐</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
