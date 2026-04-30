import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const KEYWORDS = ["frio", "atras", "errado", "porção", "embalagem", "atendimento"];
const LABELS: Record<string, string> = { frio: "Comida fria", atras: "Atraso", errado: "Pedido errado", porção: "Porção pequena", embalagem: "Embalagem ruim", atendimento: "Atendimento ruim" };

export default function Reviews() {
  const { id } = useParams();
  const { reviews, loading } = useStoreData(id);
  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  const list = reviews || [];
  const counts = { positivo: 0, neutro: 0, negativo: 0 };
  list.forEach((r: any) => { counts[r.sentiment as keyof typeof counts] = (counts[r.sentiment as keyof typeof counts] || 0) + 1; });

  const issueCounts: Record<string, number> = {};
  list.forEach((r: any) => {
    const c = (r.comment || "").toLowerCase();
    KEYWORDS.forEach((k) => { if (c.includes(k)) issueCounts[k] = (issueCounts[k] || 0) + 1; });
  });
  const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);

  const compliments = list.filter((r: any) => r.sentiment === "positivo").slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Avaliações</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4 shadow-card text-center"><p className="text-3xl font-bold text-success">{counts.positivo}</p><p className="text-sm text-muted-foreground">Positivas</p></Card>
        <Card className="p-4 shadow-card text-center"><p className="text-3xl font-bold text-warning">{counts.neutro}</p><p className="text-sm text-muted-foreground">Neutras</p></Card>
        <Card className="p-4 shadow-card text-center"><p className="text-3xl font-bold text-destructive">{counts.negativo}</p><p className="text-sm text-muted-foreground">Negativas</p></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3">⚠️ Principais reclamações</h3>
          {topIssues.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum padrão recorrente.</p> :
            <ul className="space-y-2 text-sm">{topIssues.map(([k, n]) => <li key={k} className="flex justify-between"><span>{LABELS[k] || k}</span><Badge variant="destructive">{n}</Badge></li>)}</ul>}
        </Card>
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3">⭐ Principais elogios</h3>
          {compliments.length === 0 ? <p className="text-sm text-muted-foreground">Sem elogios registrados.</p> :
            <ul className="space-y-2 text-sm">{compliments.map((r: any) => <li key={r.id} className="border-l-2 border-success pl-2">{r.comment}</li>)}</ul>}
        </Card>
      </div>

      <Card className="shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="p-3 text-left">Comentário</th><th>Nota</th><th>Sentimento</th></tr></thead>
          <tbody>
            {list.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.comment}</td>
                <td className="text-center">{r.rating} ⭐</td>
                <td className="text-center"><Badge variant={r.sentiment === "positivo" ? "default" : r.sentiment === "negativo" ? "destructive" : "secondary"}>{r.sentiment}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
