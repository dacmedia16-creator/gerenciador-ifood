import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewStore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>({
    name: "", category: "", platform: "iFood", city: "", neighborhood: "",
    rating: "", promised_delivery_time: "", delivery_fee: "",
    monthly_revenue: "", monthly_orders: "", average_ticket: "",
    cancellation_rate: "", opening_hours: "", notes: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const payload: any = { user_id: user.id };
    Object.entries(form).forEach(([k, v]) => { if (v !== "") payload[k] = v; });
    const { data, error } = await supabase.from("stores").insert(payload).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Loja cadastrada! Vamos analisar em 5 minutos.");
    navigate(`/app/diagnosis/express?storeId=${data.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cadastrar loja</h1>
      <Card className="p-6 shadow-card">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <div><Label>Nome da loja *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
          <div><Label>Plataforma principal</Label>
            <select className="w-full border rounded-md px-3 py-2 bg-background" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              <option>iFood</option><option>Rappi</option><option>99Food</option><option>Próprio</option><option>Outro</option>
            </select>
          </div>
          <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></div>
          <div><Label>Nota atual</Label><Input type="number" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} /></div>
          <div><Label>Tempo prometido (min)</Label><Input type="number" value={form.promised_delivery_time} onChange={(e) => set("promised_delivery_time", e.target.value)} /></div>
          <div><Label>Taxa de entrega (R$)</Label><Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} /></div>
          <div><Label>Faturamento mensal (R$)</Label><Input type="number" step="0.01" value={form.monthly_revenue} onChange={(e) => set("monthly_revenue", e.target.value)} /></div>
          <div><Label>Pedidos por mês</Label><Input type="number" value={form.monthly_orders} onChange={(e) => set("monthly_orders", e.target.value)} /></div>
          <div><Label>Ticket médio (R$)</Label><Input type="number" step="0.01" value={form.average_ticket} onChange={(e) => set("average_ticket", e.target.value)} /></div>
          <div><Label>Taxa de cancelamento (%)</Label><Input type="number" step="0.1" value={form.cancellation_rate} onChange={(e) => set("cancellation_rate", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Horários de funcionamento</Label><Input value={form.opening_hours} onChange={(e) => set("opening_hours", e.target.value)} placeholder="Ex: 18h–23h, todos os dias" /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          <div className="md:col-span-2 flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">{loading ? "Salvando…" : "Cadastrar"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
