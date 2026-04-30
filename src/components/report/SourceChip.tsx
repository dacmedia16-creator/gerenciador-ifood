import { Badge } from "@/components/ui/badge";
import { Database, History, BookOpen, Lightbulb } from "lucide-react";

const SOURCE_META: Record<string, { label: string; icon: any; variant: any }> = {
  evidence: { label: "Evidência atual", icon: Database, variant: "default" },
  store_history: { label: "Histórico desta loja", icon: History, variant: "secondary" },
  similar_case: { label: "Caso parecido", icon: Lightbulb, variant: "outline" },
  knowledge_base: { label: "Base de conhecimento", icon: BookOpen, variant: "outline" },
};

export function SourceChip({ source, sourceRef }: { source?: string; sourceRef?: string }) {
  if (!source) return null;
  const meta = SOURCE_META[source];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="text-[10px] gap-1" title={sourceRef ? `ref: ${sourceRef}` : undefined}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
