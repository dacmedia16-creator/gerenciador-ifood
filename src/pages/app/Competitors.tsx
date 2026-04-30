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
import { LoadingState } from "@/components/LoadingState";

export default function Competitors() {
  const { id } = useParams();
  const { competitors, store, loading, reload } = useStoreData(id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", rating: "", delivery_time: "", delivery_fee: "", price_range: "$$" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("competitors").insert({ ...form, store_id: id });
    if (error) return toast.error(error.message);
    toast.success("Concorrente adicionado");
    setOpen(false); setForm({ name: "", rating: "", delivery_time: "", delivery_fee: "", price_range: "$$" }); reload();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Concorrentes</h1>
        <Button onClick={() => setOpen(!open)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>

      {open && (
        <Card className="p-4 shadow-card">
          <form onSubmit={save} className="grid md:grid-cols-5 gap-3">
            <div><Label>Nome</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Nota</Label><Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div><Label>Tempo (min)</Label><Input type="number" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} /></div>
            <div><Label>Taxa (R$)</Label><Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} /></div>
            <div><Label>Faixa</Label><Input value={form.price_range} onChange={(e) => setForm({ ...form, price_range: e.target.value })} /></div>
            <div className="md:col-span-5 flex justify-end"><Button type="submit">Salvar</Button></div>
          </form>
        </Card>
      )}

      <Card className="shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="p-3 text-left">Loja</th><th>Nota</th><th>Tempo</th><th>Taxa</th><th>Faixa</th><th>Combos</th><th>Cupons</th></tr>
          </thead>
          <tbody>
            <tr className="border-t bg-accent/30 font-medium">
              <td className="p-3">⭐ Sua loja</td>
              <td className="text-center">{store?.rating}</td>
              <td className="text-center">{store?.promised_delivery_time} min</td>
              <td className="text-center">R$ {store?.delivery_fee}</td>
              <td className="text-center">-</td><td className="text-center">-</td><td className="text-center">-</td>
            </tr>
            {competitors?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className={`text-center ${(c.rating || 0) > (store?.rating || 0) ? "text-destructive font-semibold" : ""}`}>{c.rating}</td>
                <td className={`text-center ${c.delivery_time < (store?.promised_delivery_time || 0) ? "text-destructive font-semibold" : ""}`}>{c.delivery_time} min</td>
                <td className="text-center">R$ {c.delivery_fee}</td>
                <td className="text-center">{c.price_range}</td>
                <td className="text-center">{c.has_combos ? "✓" : "-"}</td>
                <td className="text-center">{c.has_coupons ? "✓" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
