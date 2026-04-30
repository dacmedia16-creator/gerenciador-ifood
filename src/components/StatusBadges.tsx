import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critico: "bg-destructive/10 text-destructive border-destructive/30",
    atencao: "bg-warning/10 text-warning-foreground border-warning/30",
    ok: "bg-success/10 text-success border-success/30",
  };
  const label: Record<string, string> = { critico: "Crítico", atencao: "Atenção", ok: "OK" };
  return <Badge variant="outline" className={cn("border", map[severity] || "")}>{label[severity] || severity}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    alta: "bg-destructive/10 text-destructive border-destructive/30",
    media: "bg-warning/10 text-warning-foreground border-warning/30",
    baixa: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={cn("border capitalize", map[priority] || "")}>{priority}</Badge>;
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-success text-success-foreground" : score >= 60 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <span className={cn("inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold", color)}>{score}</span>;
}
