import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const KEYWORDS = [
  { key: "foto enganosa", label: "Foto enganosa" },
  { key: "não parece", label: "Não parece com a foto" },
  { key: "nao parece", label: "Não parece com a foto" },
  { key: "veio diferente", label: "Veio diferente" },
  { key: "comida fria", label: "Comida fria" },
  { key: "frio", label: "Frio" },
  { key: "porção pequena", label: "Porção pequena" },
  { key: "porcao pequena", label: "Porção pequena" },
  { key: "pequena", label: "Tamanho menor que esperado" },
];

export default function ExpectationVsDelivery() {
  const { id } = useParams();
  const { reviews, products, loading } = useStoreData(id);
  if (loading) return <LoadingState />;

  const all = (reviews || []).map((r: any) => ({ ...r, lower: (r.comment || "").toLowerCase() }));
  const matches: Record<string, any[]> = {};
  for (const k of KEYWORDS) {
    matches[k.label] = matches[k.label] || [];
    for (const r of all) {
      if (r.lower.includes(k.key)) matches[k.label].push(r);
    }
  }
  const hits = Object.entries(matches).filter(([_, arr]) => arr.length > 0);
  const totalHits = hits.reduce((sum, [_, arr]) => sum + arr.length, 0);
  const risk: "alto" | "medio" | "baixo" = totalHits >= 5 ? "alto" : totalHits >= 2 ? "medio" : "baixo";

  // Cruza com produtos: produtos com fotos podem estar gerando ruído
  const productsWithPhoto = (products || []).filter((p: any) => p.has_photo).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Expectativa vs. Entrega</h1>
        <p className="text-sm text-muted-foreground">Detecta quando suas fotos prometem mais do que a entrega cumpre — risco direto de baixa recompra.</p>
      </div>

      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-3 flex-wrap">
          {risk === "alto" ? (
            <Badge variant="destructive" className="text-sm"><AlertTriangle className="h-4 w-4 mr-1 inline" /> Risco alto</Badge>
          ) : risk === "medio" ? (
            <Badge variant="secondary" className="text-sm">Risco médio</Badge>
          ) : (
            <Badge className="text-sm bg-success text-success-foreground"><CheckCircle2 className="h-4 w-4 mr-1 inline" /> Risco baixo</Badge>
          )}
          <p className="text-sm">{totalHits} menção(ões) cruzando expectativa × entrega em {all.length} avaliações.</p>
        </div>
      </Card>

      {hits.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm shadow-card">
          Nenhum padrão de expectativa quebrada detectado. Continue monitorando após cada novo lote de avaliações.
        </Card>
      ) : (
        <div className="space-y-4">
          {hits.map(([label, arr]) => (
            <Card key={label} className="p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{label}</h3>
                <Badge variant="destructive">{arr.length} menções</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {arr.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="border-l-2 border-destructive pl-2 text-muted-foreground italic">"{r.comment}"</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 shadow-card bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-2">O que fazer agora</h3>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>Revisar fotos dos top 5 produtos esta semana ({productsWithPhoto} com foto cadastrada).</li>
          <li>Adicionar peso/quantidade na descrição (ex.: "300g, serve 2").</li>
          <li>Trocar embalagem por térmica para reduzir "comida fria".</li>
          <li>Refotografar com a porção REAL — não a porção promocional.</li>
        </ul>
      </Card>
    </div>
  );
}
