import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { SeverityBadge, PriorityBadge } from "@/components/StatusBadges";

export default function Diagnostics() {
  const { id } = useParams();
  const { diagnostics, loading } = useStoreData(id);
  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Diagnóstico automático</h1>
      <p className="text-sm text-muted-foreground">{diagnostics?.length || 0} diagnósticos gerados pelas regras do sistema.</p>
      {(!diagnostics || diagnostics.length === 0) && <Card className="p-6 text-center text-muted-foreground">Nenhum diagnóstico ainda. Volte à visão geral e clique em "Rodar diagnóstico".</Card>}
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
              <div><dt className="text-xs text-muted-foreground">Evidência</dt><dd>{d.evidence}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Causa provável</dt><dd>{d.probable_cause}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Impacto no negócio</dt><dd>{d.business_impact}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Solução recomendada</dt><dd>{d.recommended_solution}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Ação prática</dt><dd className="font-medium">{d.practical_action}</dd></div>
              <div className="text-xs text-muted-foreground">Prazo: {d.suggested_deadline}</div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
