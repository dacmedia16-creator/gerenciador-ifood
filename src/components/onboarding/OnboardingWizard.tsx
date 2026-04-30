import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Store, BarChart3, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seedDemoStore } from "@/lib/seed/demoStore";
import { runDiagnostics } from "@/lib/diagnostics/engine";
import { toast } from "sonner";

const STEPS = ["Bem-vindo", "Loja", "Métricas", "Pronto"];

export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "", platform: "iFood", category: "", city: "",
  });
  const [metricsForm, setMetricsForm] = useState({
    monthly_revenue: "", monthly_orders: "", average_ticket: "",
    cancellation_rate: "", promised_delivery_time: "", rating: "",
  });
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);

  const handleDemo = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const store = await seedDemoStore(user.id);
      toast.success("Loja demo criada com diagnóstico!");
      navigate(`/app/stores/${store.id}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const saveStore = async () => {
    if (!user || !storeForm.name) { toast.error("Informe o nome da loja"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("stores").insert({
        user_id: user.id,
        name: storeForm.name, platform: storeForm.platform,
        category: storeForm.category || null, city: storeForm.city || null,
      }).select().single();
      if (error) throw error;
      setCreatedStoreId(data.id);
      setStep(2);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const finalize = async () => {
    if (!createdStoreId) return;
    setLoading(true);
    try {
      const numeric = (v: string) => v ? Number(v.replace(",", ".")) : null;
      const updates: any = {
        monthly_revenue: numeric(metricsForm.monthly_revenue),
        monthly_orders: numeric(metricsForm.monthly_orders),
        average_ticket: numeric(metricsForm.average_ticket),
        cancellation_rate: numeric(metricsForm.cancellation_rate),
        promised_delivery_time: numeric(metricsForm.promised_delivery_time),
        rating: numeric(metricsForm.rating),
      };
      await supabase.from("stores").update(updates).eq("id", createdStoreId);

      // métrica do mês atual
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      await supabase.from("metrics").insert({
        store_id: createdStoreId, period_start: start, period_end: end,
        revenue: updates.monthly_revenue, orders: updates.monthly_orders,
        average_ticket: updates.average_ticket, cancellation_rate: updates.cancellation_rate,
        average_delivery_time: updates.promised_delivery_time, rating: updates.rating,
      });

      // diagnósticos rápidos
      const { data: store } = await supabase.from("stores").select("*").eq("id", createdStoreId).single();
      const diags = runDiagnostics({ store, metrics: [], products: [], reviews: [], competitors: [], campaigns: [] });
      if (diags.length) {
        const { data: ins } = await supabase.from("diagnostics").insert(diags.map((d) => ({ ...d, store_id: createdStoreId }))).select();
        if (ins) {
          await supabase.from("action_plans").insert(ins.map((d: any) => ({
            store_id: createdStoreId, diagnostic_id: d.id, title: d.practical_action,
            area: d.area, priority: d.priority, impact: d.severity === "critico" ? "alto" : "medio",
            effort: "medio", status: "pendente", description: d.recommended_solution,
          })));
        }
      }
      setStep(3);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const goToStore = () => createdStoreId && navigate(`/app/stores/${createdStoreId}`);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Passo {step + 1} de {STEPS.length}</span>
          <button onClick={() => navigate("/app")} className="hover:text-foreground">Pular</button>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <Card className="p-8 shadow-elegant">
        {step === 0 && (
          <div className="space-y-6 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo ao Gestor IA de Delivery</h2>
              <p className="text-muted-foreground mt-2">Vamos configurar sua primeira loja em menos de 2 minutos.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-left">
              <button onClick={handleDemo} disabled={loading} className="border rounded-lg p-4 hover:border-primary transition text-left disabled:opacity-50">
                <Sparkles className="h-5 w-5 text-primary mb-2" />
                <p className="font-semibold">Usar loja demo</p>
                <p className="text-xs text-muted-foreground">Burger House com dados realistas, ideal para explorar.</p>
              </button>
              <button onClick={() => setStep(1)} className="border rounded-lg p-4 hover:border-primary transition text-left">
                <Store className="h-5 w-5 text-primary mb-2" />
                <p className="font-semibold">Cadastrar minha loja</p>
                <p className="text-xs text-muted-foreground">Você informa os dados básicos e métricas atuais.</p>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Store className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Dados da loja</h2>
            </div>
            <div className="space-y-3">
              <div><Label>Nome da loja *</Label><Input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} placeholder="Burger House" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Plataforma</Label><Input value={storeForm.platform} onChange={(e) => setStoreForm({ ...storeForm, platform: e.target.value })} /></div>
                <div><Label>Categoria</Label><Input value={storeForm.category} onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })} placeholder="Hamburgueria" /></div>
              </div>
              <div><Label>Cidade</Label><Input value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })} placeholder="São Paulo" /></div>
            </div>
            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={saveStore} disabled={loading} className="gradient-primary text-primary-foreground">Continuar<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Métricas do último mês</h2>
            </div>
            <p className="text-sm text-muted-foreground">Preencha o que souber. Você pode editar depois.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Faturamento (R$)</Label><Input type="number" value={metricsForm.monthly_revenue} onChange={(e) => setMetricsForm({ ...metricsForm, monthly_revenue: e.target.value })} placeholder="48000" /></div>
              <div><Label>Pedidos</Label><Input type="number" value={metricsForm.monthly_orders} onChange={(e) => setMetricsForm({ ...metricsForm, monthly_orders: e.target.value })} placeholder="1200" /></div>
              <div><Label>Ticket médio (R$)</Label><Input type="number" step="0.01" value={metricsForm.average_ticket} onChange={(e) => setMetricsForm({ ...metricsForm, average_ticket: e.target.value })} placeholder="38.50" /></div>
              <div><Label>Cancelamento (%)</Label><Input type="number" step="0.1" value={metricsForm.cancellation_rate} onChange={(e) => setMetricsForm({ ...metricsForm, cancellation_rate: e.target.value })} placeholder="6.8" /></div>
              <div><Label>Tempo prometido (min)</Label><Input type="number" value={metricsForm.promised_delivery_time} onChange={(e) => setMetricsForm({ ...metricsForm, promised_delivery_time: e.target.value })} placeholder="45" /></div>
              <div><Label>Nota (0-5)</Label><Input type="number" step="0.1" value={metricsForm.rating} onChange={(e) => setMetricsForm({ ...metricsForm, rating: e.target.value })} placeholder="4.2" /></div>
            </div>
            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={finalize} disabled={loading} className="gradient-primary text-primary-foreground">{loading ? "Analisando…" : "Gerar diagnóstico"}<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h2 className="text-2xl font-bold">Sua loja está pronta!</h2>
            <p className="text-muted-foreground">Geramos seu primeiro diagnóstico baseado nos dados informados. Você pode adicionar produtos, concorrentes e avaliações para análises mais ricas.</p>
            <Button onClick={goToStore} className="gradient-primary text-primary-foreground">Ver minha loja<ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        )}
      </Card>
    </div>
  );
}
