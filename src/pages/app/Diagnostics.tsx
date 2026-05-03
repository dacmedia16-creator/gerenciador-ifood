import { useParams, Link, useNavigate } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge, PriorityBadge } from "@/components/StatusBadges";
import { Sparkles, FileText, RotateCcw } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Diagnostics() {
  const { id } = useParams();
  const { diagnostics, loading } = useStoreData(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!id || !user) return;
    setResetting(true);
    try {
      const { data: sessions } = await supabase
        .from("diagnosis_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", id);
      const sessionIds = (sessions || []).map((s) => s.id);

      if (sessionIds.length) {
        await supabase.from("diagnosis_step_status").delete().in("session_id", sessionIds);
        await supabase.from("diagnosis_answers").delete().in("session_id", sessionIds);
        await supabase.from("diagnosis_sessions").delete().in("id", sessionIds);
      }

      await supabase.from("action_plans").delete().eq("store_id", id);
      await supabase.from("diagnostics").delete().eq("store_id", id);
      await supabase.from("reports").delete().eq("store_id", id);

      toast.success("Diagnóstico resetado. Você pode começar do zero.");
      navigate(`/app/stores/${id}/dashboard`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao resetar diagnóstico");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico</h1>
          <p className="text-sm text-muted-foreground">
            {diagnostics?.length || 0} diagnósticos do motor de regras.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={resetting}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Resetar diagnóstico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar diagnóstico desta loja?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso apaga as respostas do funil, diagnósticos gerados, planos de ação
                  e relatórios desta loja. Os dados da loja, produtos, métricas e
                  avaliações continuam intactos. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} disabled={resetting}>
                  {resetting ? "Resetando…" : "Sim, resetar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to={`/app/stores/${id}/report`}>
              <Sparkles className="h-4 w-4 mr-1" />
              Consultar Gestor IA
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-muted/30 border-dashed text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Os diagnósticos abaixo vêm do <strong>motor de regras objetivo</strong>. Para
            uma análise completa (com memória da loja, casos similares e priorização), use
            o <strong>Gestor IA</strong> na tela de Relatório.
          </div>
        </div>
      </Card>

      {(!diagnostics || diagnostics.length === 0) && (
        <Card className="p-6 text-center text-muted-foreground">
          Nenhum diagnóstico ainda. Rode um diagnóstico no funil ou consulte o Gestor IA pelo Relatório.
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {diagnostics?.map((d: any) => (
          <Card key={d.id} className="p-5 shadow-card">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{d.area}</p>
                <h3 className="font-semibold">{d.problem}</h3>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <SeverityBadge severity={d.severity} />
                <PriorityBadge priority={d.priority} />
              </div>
            </div>
            <dl className="text-sm space-y-2 mt-3">
              {d.evidence && <div><dt className="text-xs text-muted-foreground">Evidência</dt><dd>{d.evidence}</dd></div>}
              {d.probable_cause && <div><dt className="text-xs text-muted-foreground">Causa provável</dt><dd>{d.probable_cause}</dd></div>}
              {d.business_impact && <div><dt className="text-xs text-muted-foreground">Impacto no negócio</dt><dd>{d.business_impact}</dd></div>}
              <div><dt className="text-xs text-muted-foreground">Solução recomendada</dt><dd>{d.recommended_solution}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Ação prática</dt><dd className="font-medium">{d.practical_action}</dd></div>
              {d.suggested_deadline && <div className="text-xs text-muted-foreground">Prazo: {d.suggested_deadline}</div>}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
