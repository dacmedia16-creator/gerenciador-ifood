import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/StatusBadges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { LoadingState } from "@/components/LoadingState";

const STATUSES = ["pendente", "em andamento", "concluido"];

export default function ActionPlan() {
  const { id } = useParams();
  const { actions, loading, reload } = useStoreData(id);
  const [filter, setFilter] = useState<string>("todos");

  const change = async (actionId: string, status: string) => {
    const { error } = await supabase.from("action_plans").update({ status }).eq("id", actionId);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado"); reload();
  };

  if (loading) return <LoadingState />;

  const list = (actions || []).filter((a: any) => filter === "todos" || a.status === filter);
  const sorted = [...list].sort((a: any, b: any) => {
    const order = { alta: 0, media: 1, baixa: 2 } as any;
    return (order[a.priority] || 3) - (order[b.priority] || 3);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plano de ação</h1>
        <select className="border rounded-md px-3 py-2 bg-background text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="todos">Todos</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-3 text-sm">
        {STATUSES.map((s) => {
          const count = (actions || []).filter((a: any) => a.status === s).length;
          return <Card key={s} className="p-4 shadow-card text-center"><p className="text-2xl font-bold">{count}</p><p className="text-muted-foreground capitalize">{s}</p></Card>;
        })}
      </div>

      {sorted.length === 0 && <Card className="p-6 text-center text-muted-foreground">Nenhuma ação no filtro.</Card>}

      <div className="space-y-3">
        {sorted.map((a: any) => (
          <Card key={a.id} className="p-4 shadow-card">
            <div className="flex flex-wrap justify-between gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={a.priority} />
                  <span className="text-xs text-muted-foreground">{a.area}</span>
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                <div className="text-xs text-muted-foreground mt-2 flex gap-3">
                  <span>Impacto: {a.impact}</span><span>Esforço: {a.effort}</span>
                  {a.due_date && <span>Prazo: {a.due_date}</span>}
                </div>
              </div>
              <select className="border rounded-md px-2 py-1 text-xs bg-background" value={a.status} onChange={(e) => change(a.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
