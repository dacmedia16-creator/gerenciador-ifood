import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Star } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "react-router-dom";
import { invokeAI } from "@/lib/ai/invokeAI";
import { toast } from "sonner";
import { SentimentBadge } from "@/components/reviews/SentimentBadge";

export default function Reviews() {
  const { id } = useParams();
  const { reviews, loading, reload } = useStoreData(id);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const list = reviews || [];
  const pending = list.filter((r: any) => !r.sentiment).length;

  const counts = useMemo(() => {
    const c = { positivo: 0, neutro: 0, negativo: 0 };
    list.forEach((r: any) => { if (r.sentiment) (c as any)[r.sentiment] = ((c as any)[r.sentiment] || 0) + 1; });
    return c;
  }, [list]);

  const topicCounts = useMemo(() => {
    const c: Record<string, number> = {};
    list.forEach((r: any) => (r.detected_topics || []).forEach((t: string) => { c[t] = (c[t] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [list]);

  const filtered = list.filter((r: any) => {
    if (filter && r.sentiment !== filter) return false;
    if (topicFilter && !(r.detected_topics || []).includes(topicFilter)) return false;
    return true;
  });

  const analyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    const res = await invokeAI("analyze-reviews", { store_id: id });
    setAnalyzing(false);
    if (res?.success) {
      toast.success(`${res.processed} avaliações analisadas`);
      reload();
    }
  };

  if (loading) return <LoadingState />;
  if (!loading && list.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Sem avaliações cadastradas"
        description="Importe um CSV de avaliações ou aguarde a primeira avaliação aparecer aqui."
        action={<Button asChild variant="outline"><Link to={`/app/stores/${id}/uploads`}>Importar CSV</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <Button onClick={analyze} disabled={analyzing || pending === 0} className="gradient-primary text-primary-foreground">
          <Sparkles className={`h-4 w-4 mr-1 ${analyzing ? "animate-pulse" : ""}`} />
          {analyzing ? "Analisando…" : `Analisar ${pending} com IA`}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card onClick={() => setFilter(filter === "positivo" ? null : "positivo")} className={`p-4 shadow-card text-center cursor-pointer transition ${filter === "positivo" ? "ring-2 ring-success" : ""}`}>
          <p className="text-3xl font-bold text-success">{counts.positivo}</p><p className="text-sm text-muted-foreground">Positivas</p>
        </Card>
        <Card onClick={() => setFilter(filter === "neutro" ? null : "neutro")} className={`p-4 shadow-card text-center cursor-pointer transition ${filter === "neutro" ? "ring-2 ring-warning" : ""}`}>
          <p className="text-3xl font-bold text-warning">{counts.neutro}</p><p className="text-sm text-muted-foreground">Neutras</p>
        </Card>
        <Card onClick={() => setFilter(filter === "negativo" ? null : "negativo")} className={`p-4 shadow-card text-center cursor-pointer transition ${filter === "negativo" ? "ring-2 ring-destructive" : ""}`}>
          <p className="text-3xl font-bold text-destructive">{counts.negativo}</p><p className="text-sm text-muted-foreground">Negativas</p>
        </Card>
      </div>

      {topicCounts.length > 0 && (
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-2">Tópicos detectados</h3>
          <div className="flex flex-wrap gap-2">
            {topicCounts.map(([t, n]) => (
              <button key={t} onClick={() => setTopicFilter(topicFilter === t ? null : t)}>
                <Badge variant={topicFilter === t ? "default" : "outline"} className="cursor-pointer">{t} · {n}</Badge>
              </button>
            ))}
            {(filter || topicFilter) && <Button size="sm" variant="ghost" onClick={() => { setFilter(null); setTopicFilter(null); }}>Limpar filtros</Button>}
          </div>
        </Card>
      )}

      <Card className="shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="p-3 text-left">Comentário</th><th>Nota</th><th>Sentimento</th><th>Tópicos</th></tr></thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.comment}</td>
                <td className="text-center">{r.rating} ⭐</td>
                <td className="text-center"><SentimentBadge sentiment={r.sentiment} /></td>
                <td className="text-center text-xs">{(r.detected_topics || []).join(", ") || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma avaliação corresponde aos filtros.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
