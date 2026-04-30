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

// 5 status do ciclo de aprendizado (alinhados a record-feedback / recommendation_history).
const STATUSES = ["pendente", "em_andamento", "aplicada", "ignorada", "rejeitada"] as const;
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aplicada: "Aplicada",
  ignorada: "Ignorada",
  rejeitada: "Rejeitada",
  // legados das ações criadas antes da unificação
  "em andamento": "Em andamento",
  concluido: "Aplicada",
};
const TERMINAL = new Set(["aplicada", "ignorada", "rejeitada"]);

export default function ActionPlan() {
  const { id } = useParams();
  const { actions, loading, reload } = useStoreData(id);
  const [filter, setFilter] = useState<string>("todos");
  const [outcomeFor, setOutcomeFor] = useState<any>(null);
  const [outcome, setOutcome] = useState<string>("positivo");
  const [comment, setComment] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string>("aplicada");

  const change = async (action: any, status: string) => {
    // Atualiza a UI imediatamente
    const { error } = await supabase.from("action_plans").update({ status }).eq("id", action.id);
    if (error) return toast.error(error.message);

    // Estados terminais → abre dialog para coletar feedback (e dispara record-feedback)
    if (TERMINAL.has(status)) {
      setOutcomeFor(action);
      setPendingStatus(status);
      setOutcome(status === "aplicada" ? "positivo" : status === "rejeitada" ? "negativo" : "inconclusivo");
      setComment("");
    } else {
      // em_andamento / pendente: só sincroniza status no histórico, sem outcome
      const recId = action.recommendation_id ?? null;
      if (recId) {
        await supabase.functions.invoke("record-feedback", {
          body: { recommendation_id: recId, status },
        });
      }
      toast.success("Status atualizado");
    }
    reload();
  };

  const submitOutcome = async () => {
    if (!outcomeFor) return;
    let recommendation_id: string | null = outcomeFor.recommendation_id ?? null;

    // Fallback legado: ações antigas sem FK → busca por título.
    if (!recommendation_id) {
      const { data: rec } = await supabase
        .from("recommendation_history")
        .select("id")
        .eq("store_id", id!)
        .ilike("recommendation", `%${outcomeFor.title.slice(0, 60)}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      recommendation_id = rec?.id ?? null;
    }

    if (recommendation_id) {
      // Mapeia escolha de outcome para o vocabulário do record-feedback.
      const generated_result =
        pendingStatus === "aplicada"
          ? outcome === "positivo" ? "sim" : outcome === "negativo" ? "nao" : "nao_sei"
          : null;
      const rating =
        pendingStatus === "rejeitada" ? "errada"
          : pendingStatus === "ignorada" ? "nao_util"
          : null;

      await supabase.functions.invoke("record-feedback", {
        body: {
          recommendation_id,
          status: pendingStatus,
          applied: pendingStatus === "aplicada" ? true : pendingStatus === "ignorada" ? false : null,
          generated_result,
          rating,
          outcome_explanation: comment || null,
          comment,
        },
      });
      toast.success("Feedback registrado — a IA vai aprender com isso.");
    } else {
      toast.info("Status atualizado (sem recomendação IA vinculada)");
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
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-5 gap-3 text-sm">
        {STATUSES.map((s) => {
          const count = (actions || []).filter((a: any) => a.status === s).length;
          return <Card key={s} className="p-4 shadow-card text-center"><p className="text-2xl font-bold">{count}</p><p className="text-muted-foreground text-xs">{STATUS_LABEL[s]}</p></Card>;
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
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!outcomeFor} onOpenChange={(o) => !o && setOutcomeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStatus === "aplicada" && "Como foi o resultado?"}
              {pendingStatus === "ignorada" && "Por que ignorou?"}
              {pendingStatus === "rejeitada" && "Por que rejeitou?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{outcomeFor?.title}</p>
          {pendingStatus === "aplicada" && (
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
          )}
          <Textarea
            placeholder={
              pendingStatus === "aplicada"
                ? "Explique em poucas palavras o que aconteceu (opcional)"
                : pendingStatus === "rejeitada"
                ? "Por que essa recomendação não faz sentido para a sua loja?"
                : "Por que decidiu não aplicar agora?"
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOutcomeFor(null)}>Pular</Button>
            <Button onClick={submitOutcome}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
