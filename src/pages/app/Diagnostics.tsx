import { useState } from "react";
import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge, PriorityBadge } from "@/components/StatusBadges";
import { Sparkles } from "lucide-react";
import { invokeAI } from "@/lib/ai/invokeAI";
import { toast } from "sonner";

export default function Diagnostics() {
  const { id } = useParams();
  const { diagnostics, loading, reload } = useStoreData(id);
  const [running, setRunning] = useState(false);

  const runAI = async () => {
    if (!id) return;
    setRunning(true);
    const res = await invokeAI("ai-diagnose", { store_id: id });
    setRunning(false);
    if (res?.success) {
      toast.success(`Diagnóstico IA gerado: ${res.diagnostics_count} problemas, ${res.actions_count} ações.`);
      reload();
    }
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico</h1>
          <p className="text-sm text-muted-foreground">{diagnostics?.length || 0} diagnósticos ativos.</p>
        </div>
        <Button onClick={runAI} disabled={running} className="gradient-primary text-primary-foreground">
          <Sparkles className={`h-4 w-4 mr-1 ${running ? "animate-pulse" : ""}`} />
          {running ? "Analisando com IA…" : "Gerar com IA"}
        </Button>
      </div>

      {(!diagnostics || diagnostics.length === 0) && <Card className="p-6 text-center text-muted-foreground">Nenhum diagnóstico ainda. Use "Gerar com IA" ou volte à visão geral e rode o diagnóstico por regras.</Card>}

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
