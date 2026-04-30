import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";

export default function Campaigns() {
  const { id } = useParams();
  const { campaigns, loading, reload } = useStoreData(id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", campaign_type: "cupom", cost: "", revenue_generated: "", new_customers: 0 });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(form.cost) || 0;
    const rev = Number(form.revenue_generated) || 0;
    const roi = cost > 0 ? rev / cost : 0;
    const { error } = await supabase.from("campaigns").insert({ ...form, store_id: id, estimated_roi: roi });
    if (error) return toast.error(error.message);
    toast.success("Campanha registrada"); setOpen(false); reload();
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campanhas e promoções</h1>
        <Button onClick={() => setOpen(!open)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>

      {open && (
        <Card className="p-4 shadow-card">
          <form onSubmit={save} className="grid md:grid-cols-5 gap-3">
            <div><Label>Nome</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <select className="w-full border rounded-md px-3 py-2 bg-background" value={form.campaign_type} onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}>
                <option value="cupom">Cupom</option><option value="ads">Anúncio</option><option value="frete">Frete grátis</option>
              </select>
            </div>
            <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div><Label>Receita gerada (R$)</Label><Input type="number" step="0.01" value={form.revenue_generated} onChange={(e) => setForm({ ...form, revenue_generated: e.target.value })} /></div>
            <div><Label>Clientes novos</Label><Input type="number" value={form.new_customers} onChange={(e) => setForm({ ...form, new_customers: e.target.value })} /></div>
            <div className="md:col-span-5 flex justify-end"><Button type="submit">Salvar</Button></div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns?.map((c: any) => {
          const negative = Number(c.estimated_roi) < 1;
          return (
            <Card key={c.id} className={`p-4 shadow-card ${negative ? "border-destructive/50" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{c.name}</h3>
                {negative && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
              <p className="text-xs text-muted-foreground mb-2 capitalize">{c.campaign_type}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Custo</span><span>R$ {Number(c.cost).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receita</span><span>R$ {Number(c.revenue_generated).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ROI</span><span className={`font-bold ${negative ? "text-destructive" : "text-success"}`}>{Number(c.estimated_roi).toFixed(2)}x</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Clientes novos</span><span>{c.new_customers}</span></div>
              </div>
              {negative && <p className="text-xs text-destructive mt-2">⚠️ Esta campanha está queimando margem</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
