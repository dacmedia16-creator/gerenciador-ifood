import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/LoadingState";
import { Target, Calendar, TrendingUp } from "lucide-react";

const GOAL_LABELS: Record<string, string> = {
  vender_mais: "Vender mais pedidos",
  aumentar_lucro: "Aumentar o lucro",
  melhorar_nota: "Melhorar a nota da loja",
  fidelizar: "Fazer o cliente voltar mais",
  organizar_operacao: "Organizar a operação",
};

export default function StoreGoal() {
  const { id } = useParams();
  const [goal, setGoal] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: g }, { data: a }] = await Promise.all([
        supabase.from("store_goals").select("*").eq("store_id", id).eq("status", "ativa").maybeSingle(),
        supabase.from("action_plans").select("*").eq("store_id", id),
      ]);
      setGoal(g);
      setActions(a || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState />;

  if (!goal) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Nenhuma meta ativa. Defina uma na próxima rodada do diagnóstico.
      </Card>
    );
  }

  const current = Number(goal.current_value) || 0;
  const target = Number(goal.target_value) || 0;
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const done = actions.filter((a) => a.status === "feita").length;
  const pending = actions.filter((a) => a.status !== "feita").length;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Sua meta</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seu progresso até onde quer chegar.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{GOAL_LABELS[goal.goal_type] || goal.goal_type}</h2>
            <Badge variant="outline">Prioridade: {goal.priority || "—"}</Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Hoje" value={current} />
          <Stat label="Meta" value={target} />
          <Stat label="Prazo" value={goal.deadline ? new Date(goal.deadline).toLocaleDateString("pt-BR") : "—"} icon={<Calendar className="h-4 w-4" />} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ações concluídas</p>
          <p className="text-3xl font-bold text-success">{done}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ações pendentes</p>
          <p className="text-3xl font-bold text-warning">{pending}</p>
        </Card>
      </div>

      <Card className="p-5 bg-muted/30 border-dashed text-sm text-muted-foreground">
        <div className="flex gap-2 items-start">
          <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div>
            Conclua as ações do seu plano para se aproximar da meta. A IA reanalisa cada ação e mostra o impacto real.
            <br />
            <span className="text-xs">Sem promessa de resultado garantido — depende da execução.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">{icon}{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
