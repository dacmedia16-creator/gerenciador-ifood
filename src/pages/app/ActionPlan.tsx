import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/StatusBadges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUSES = ["pendente", "em andamento", "concluido"];

export default function ActionPlan() {
  const { id } = useParams();
  const { actions, loading, reload } = useStoreData(id);
  const [filter, setFilter] = useState<string>("todos");
  const [outcomeFor, setOutcomeFor] = useState<any>(null);
  const [outcome, setOutcome] = useState<string>("positivo");
  const [comment, setComment] = useState("");

  const change = async (action: any, status: string) => {
    const { error } = await supabase.from("action_plans").update({ status }).eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    if (status === "concluido") {
      setOutcomeFor(action);
      setOutcome("positivo");
      setComment("");
    }
    reload();
  };

  const submitOutcome = async () => {
    if (!outcomeFor) return;
    // Tenta achar a recommendation_history correspondente por título nesta loja
    const { data: rec } = await supabase
      .from("recommendation_history")
      .select("id")
      .eq("store_id", id!)
      .ilike("recommendation", `%${outcomeFor.title.slice(0, 60)}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rec?.id) {
      await supabase.functions.invoke("record-feedback", {
        body: {
          recommendation_id: rec.id,
          applied: true,
          generated_result: outcome === "positivo" ? "sim" : outcome === "negativo" ? "nao" : "nao_sei",
          comment,
        },
      });
      toast.success("Resultado registrado — a IA vai aprender com isso.");
    } else {
      toast.info("Concluído (sem recomendação IA vinculada)");
    }
    setOutcomeFor(null);
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
              <select className="border rounded-md px-2 py-1 text-xs bg-background" value={a.status} onChange={(e) => change(a, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!outcomeFor} onOpenChange={(o) => !o && setOutcomeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como foi o resultado?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{outcomeFor?.title}</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "positivo", l: "Funcionou bem" },
              { v: "neutro", l: "Sem mudança clara" },
              { v: "negativo", l: "Não funcionou" },
              { v: "inconclusivo", l: "Ainda cedo" },
            ].map((o) => (
              <Button key={o.v} size="sm" variant={outcome === o.v ? "default" : "outline"} onClick={() => setOutcome(o.v)}>
                {o.l}
              </Button>
            ))}
          </div>
          <Textarea placeholder="O que aconteceu? (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOutcomeFor(null)}>Pular</Button>
            <Button onClick={submitOutcome}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
