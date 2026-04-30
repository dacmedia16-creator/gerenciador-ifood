import { Badge } from "@/components/ui/badge";

export function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment) return <Badge variant="outline">não analisado</Badge>;
  if (sentiment === "positivo") return <Badge className="bg-success text-success-foreground hover:bg-success/90">positivo</Badge>;
  if (sentiment === "negativo") return <Badge variant="destructive">negativo</Badge>;
  return <Badge variant="secondary">neutro</Badge>;
}
