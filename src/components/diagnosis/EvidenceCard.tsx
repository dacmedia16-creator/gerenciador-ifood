import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { RuleEvidence } from "@/lib/diagnosis/evidences";

const cfg = {
  critico: {
    Icon: AlertTriangle,
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    iconColor: "text-destructive",
    label: "Crítico",
    badge: "destructive" as const,
  },
  atencao: {
    Icon: AlertCircle,
    border: "border-warning/40",
    bg: "bg-warning/5",
    iconColor: "text-warning",
    label: "Atenção",
    badge: "outline" as const,
  },
  ok: {
    Icon: Info,
    border: "border-muted",
    bg: "bg-muted/30",
    iconColor: "text-muted-foreground",
    label: "OK",
    badge: "secondary" as const,
  },
};

export function EvidenceCard({ ev }: { ev: RuleEvidence }) {
  const c = cfg[ev.severity] || cfg.atencao;
  const { Icon } = c;
  const cur = ev.current_value;
  const ref = ev.reference_value;
  return (
    <Card className={`p-4 ${c.border} ${c.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${c.iconColor}`} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={c.badge} className="capitalize">{c.label}</Badge>
            <span className="text-xs text-muted-foreground capitalize">{ev.area.replace(/_/g, " ")}</span>
          </div>
          <p className="text-sm font-medium">
            {ev.metric.replace(/_/g, " ")}
            {cur !== null && cur !== undefined && (
              <span className="text-muted-foreground font-normal"> — atual: <span className="font-semibold text-foreground">{String(cur)}</span></span>
            )}
            {ref !== null && ref !== undefined && (
              <span className="text-muted-foreground font-normal"> · referência: {String(ref)}</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Impacto: </span>{ev.business_impact}</p>
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Ação sugerida: </span>{ev.recommended_action}</p>
        </div>
      </div>
    </Card>
  );
}
