import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { calculateScore, scoreColor, scoreLabel } from "@/lib/diagnostics/engine";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/LoadingState";

export default function Score() {
  const { id } = useParams();
  const data = useStoreData(id);
  if (data.loading || !data.store) return <LoadingState />;

  const { areas, overall, notes } = calculateScore(data);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Score detalhado</h1>
        <p className="text-sm text-muted-foreground">Análise consultiva por área operacional.</p>
      </div>

      <Card className="p-8 text-center shadow-elegant">
        <p className="text-sm text-muted-foreground mb-2">Score geral</p>
        <div className="text-7xl font-bold text-gradient">{overall}</div>
        <p className={`mt-2 text-${scoreColor(overall)}`}>{scoreLabel(overall)}</p>
        <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
          {overall >= 80
            ? "Sua loja está em ótima condição. Foque em otimizações finas e crescimento."
            : overall >= 60
            ? "Sua loja tem bom potencial mas há áreas críticas para atacar."
            : "Atenção! Sua loja tem várias áreas críticas que precisam de ação imediata."}
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(areas).map(([area, score]) => {
          const c = scoreColor(score);
          return (
            <Card key={area} className="p-4 shadow-card">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{area}</span>
                <span className={`text-lg font-bold text-${c}`}>{score}</span>
              </div>
              <Progress value={score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{notes?.[area] ?? scoreLabel(score)}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
