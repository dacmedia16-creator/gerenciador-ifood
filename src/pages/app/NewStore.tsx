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

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const payload: any = { user_id: user.id };
    Object.entries(form).forEach(([k, v]) => { if (v !== "") payload[k] = v; });
    const { data, error } = await supabase.from("stores").insert(payload).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Loja cadastrada!");
    navigate(`/app/stores/${data.id}`);
  };

  const F = ({ k, label, type = "text", step }: any) => (
    <div><Label>{label}</Label><Input type={type} step={step} value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cadastrar loja</h1>
      <Card className="p-6 shadow-card">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <F k="name" label="Nome da loja *" />
          <F k="category" label="Categoria" />
          <div><Label>Plataforma principal</Label>
            <select className="w-full border rounded-md px-3 py-2 bg-background" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              <option>iFood</option><option>Rappi</option><option>99Food</option><option>Próprio</option><option>Outro</option>
            </select>
          </div>
          <F k="city" label="Cidade" />
          <F k="neighborhood" label="Bairro" />
          <F k="rating" label="Nota atual" type="number" step="0.1" />
          <F k="promised_delivery_time" label="Tempo prometido (min)" type="number" />
          <F k="delivery_fee" label="Taxa de entrega (R$)" type="number" step="0.01" />
          <F k="monthly_revenue" label="Faturamento mensal (R$)" type="number" step="0.01" />
          <F k="monthly_orders" label="Pedidos por mês" type="number" />
          <F k="average_ticket" label="Ticket médio (R$)" type="number" step="0.01" />
          <F k="cancellation_rate" label="Taxa de cancelamento (%)" type="number" step="0.1" />
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
