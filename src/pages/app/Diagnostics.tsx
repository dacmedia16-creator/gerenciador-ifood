import { useParams, Link } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge, PriorityBadge } from "@/components/StatusBadges";
import { Sparkles, FileText } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { ResetDiagnosisButton } from "@/components/diagnosis/ResetDiagnosisButton";

export default function Diagnostics() {
  const { id } = useParams();
  const { diagnostics, loading } = useStoreData(id);

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
          <ResetDiagnosisButton storeId={id} />
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
