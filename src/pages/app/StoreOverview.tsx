import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { runDiagnostics } from "@/lib/diagnostics/engine";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function StoreOverview() {
  const { id } = useParams();
  const { store, metrics, products, reviews, competitors, campaigns, loading, reload } = useStoreData(id);
  const [running, setRunning] = useState(false);

  const rerun = async () => {
    if (!id || !store) return;
    setRunning(true);
    try {
      await supabase.from("diagnostics").delete().eq("store_id", id);
      await supabase.from("action_plans").delete().eq("store_id", id);
      const diags = runDiagnostics({ store, metrics, products, reviews, competitors, campaigns });
      if (diags.length) {
        const { data: ins } = await supabase.from("diagnostics").insert(diags.map((d) => ({ ...d, store_id: id }))).select();
        if (ins) {
          await supabase.from("action_plans").insert(ins.map((d: any) => ({
            store_id: id, diagnostic_id: d.id, title: d.practical_action, area: d.area,
            priority: d.priority, impact: d.severity === "critico" ? "alto" : "medio",
            effort: "medio", status: "pendente", description: d.recommended_solution,
          })));
        }
      }
      toast.success(`${diags.length} diagnósticos gerados`);
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setRunning(false); }
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;
  if (!store) return <div>Loja não encontrada</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">{store.platform} · {store.city} · {store.neighborhood}</p>
        </div>
        <Button onClick={rerun} disabled={running} className="gradient-primary text-primary-foreground">
          <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} /> {running ? "Analisando…" : "Rodar diagnóstico"}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          ["Faturamento mensal", `R$ ${(store.monthly_revenue || 0).toLocaleString("pt-BR")}`],
          ["Pedidos/mês", store.monthly_orders],
          ["Ticket médio", `R$ ${store.average_ticket}`],
          ["Nota", `${store.rating} ⭐`],
          ["Tempo prometido", `${store.promised_delivery_time} min`],
          ["Cancelamento", `${store.cancellation_rate}%`],
          ["Categoria", store.category],
          ["Taxa de entrega", `R$ ${store.delivery_fee}`],
          ["Horários", store.opening_hours],
        ].map(([k, v]) => (
          <Card key={k} className="p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-semibold">{v || "-"}</p>
          </Card>
        ))}
      </div>

      {store.notes && <Card className="p-4 shadow-card"><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-sm">{store.notes}</p></Card>}

      <div className="grid md:grid-cols-4 gap-4 text-center">
        {[
          ["Produtos", products.length],
          ["Avaliações", reviews.length],
          ["Concorrentes", competitors.length],
          ["Campanhas", campaigns.length],
        ].map(([k, v]) => (
          <Card key={k} className="p-4 shadow-card"><p className="text-2xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{k}</p></Card>
        ))}
      </div>
    </div>
  );
}
