import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock, Target, Wrench, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReassessDialog } from "./ReassessDialog";

type Action = {
  id: string;
  title: string;
  area: string | null;
  priority: string | null;
  impact: string | null;
  effort: string | null;
  status: string;
  why_it_matters: string | null;
  how_to_apply: string | null;
  how_to_measure: string | null;
  due_date: string | null;
  description: string | null;
  recommendation_id: string | null;
};

const priorityWeight = (p: string | null) => (p === "alta" ? 0 : p === "media" ? 1 : 2);
const impactWeight = (i: string | null) => (i === "alto" ? 0 : i === "medio" ? 1 : 2);
const effortWeight = (e: string | null) => (e === "baixo" ? 0 : e === "medio" ? 1 : 2);

export function DoFirstBlock({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reassessFor, setReassessFor] = useState<Action | null>(null);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["doFirstActions", storeId],
    enabled: !!storeId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("action_plans")
        .select("id, title, area, priority, impact, effort, status, why_it_matters, how_to_apply, how_to_measure, due_date, description, recommendation_id")
        .eq("store_id", storeId)
        .in("status", ["pendente", "em_andamento"]);
      const list = (data as Action[]) || [];
      return list
        .sort((a, b) => {
          const p = priorityWeight(a.priority) - priorityWeight(b.priority);
          if (p !== 0) return p;
          const i = impactWeight(a.impact) - impactWeight(b.impact);
          if (i !== 0) return i;
          return effortWeight(a.effort) - effortWeight(b.effort);
        })
        .slice(0, 3);
    },
  });

  const start = async (a: Action) => {
    if (a.status !== "em_andamento") {
      const { error } = await supabase
        .from("action_plans")
        .update({ status: "em_andamento", started_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["doFirstActions", storeId] });
    }
    navigate(`/app/stores/${storeId}/action-plan/${a.id}`);
  };

  if (isLoading) return null;

  return (
    <Card className="p-4 sm:p-6 shadow-card border-l-4 border-primary">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="h-5 w-5 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold">Faça isso primeiro</h2>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        As 3 ações que mais mexem o ponteiro da sua loja agora.
      </p>

      {actions.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Nenhuma ação pendente. Rode um novo diagnóstico para descobrir o próximo passo.
          <div className="mt-3">
            <Button size="sm" onClick={() => navigate("/app/diagnosis/new?new=1")}>
              Analisar minha loja
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {actions.map((a, idx) => (
            <Card key={a.id} className="p-4 flex flex-col gap-3 bg-background">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-[10px]">#{idx + 1}</Badge>
                {a.priority && (
                  <Badge variant={a.priority === "alta" ? "destructive" : "secondary"} className="text-[10px]">
                    Prioridade {a.priority}
                  </Badge>
                )}
                {a.area && <span className="text-[10px] text-muted-foreground uppercase">{a.area}</span>}
              </div>

              <h3 className="font-semibold text-sm leading-snug">{a.title}</h3>

              {a.why_it_matters && (
                <div className="text-xs">
                  <p className="text-muted-foreground font-medium flex items-center gap-1">
                    <Target className="h-3 w-3" /> Por que importa
                  </p>
                  <p className="line-clamp-3">{a.why_it_matters}</p>
                </div>
              )}

              {(a.how_to_apply || a.description) && (
                <div className="text-xs">
                  <p className="text-muted-foreground font-medium flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Como aplicar
                  </p>
                  <p className="line-clamp-2">{a.how_to_apply || a.description}</p>
                </div>
              )}

              {a.how_to_measure && (
                <div className="text-xs">
                  <p className="text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Como medir
                  </p>
                  <p className="line-clamp-2">{a.how_to_measure}</p>
                </div>
              )}

              {a.due_date && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Prazo: {new Date(a.due_date).toLocaleDateString("pt-BR")}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Button size="sm" onClick={() => start(a)} className="w-full">
                  {a.status === "em_andamento" ? "Continuar" : "Começar"}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReassessFor(a)}
                  className="w-full"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Marcar como aplicada
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReassessDialog
        action={reassessFor}
        storeId={storeId}
        onClose={() => {
          setReassessFor(null);
          qc.invalidateQueries({ queryKey: ["doFirstActions", storeId] });
          qc.invalidateQueries({ queryKey: ["dashboardData", storeId] });
        }}
      />
    </Card>
  );
}
