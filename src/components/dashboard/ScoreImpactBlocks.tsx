import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  score: number | null;
  scoreDelta: number | null;
  lastDiagnosisAt: string | null;
  pendingImpactSum: number;
}

export function ScoreImpactBlocks({ score, scoreDelta, lastDiagnosisAt, pendingImpactSum }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-6 shadow-card text-center">
        {score === null ? (
          <>
            <p className="text-5xl font-bold text-muted-foreground mb-3">—</p>
            <Button onClick={() => navigate("/app/diagnosis/welcome")} className="min-h-[48px]">
              Fazer primeiro diagnóstico
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-6xl font-bold">{score}</span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            {scoreDelta !== null && scoreDelta !== 0 && (
              <p
                className={`mt-2 font-medium ${
                  scoreDelta > 0 ? "text-success" : "text-destructive"
                }`}
              >
                {scoreDelta > 0 ? "▲" : "▼"} {scoreDelta > 0 ? "+" : ""}
                {scoreDelta} esta semana
              </p>
            )}
            {lastDiagnosisAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Diagnóstico de{" "}
                {new Date(lastDiagnosisAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        )}
      </Card>

      <Card className="p-6 shadow-card text-center">
        {pendingImpactSum > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-1">Você pode estar perdendo</p>
            <p className="text-4xl sm:text-5xl font-bold text-orange-600">
              ~R$ {pendingImpactSum.toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              por mês em problemas identificados
            </p>
          </>
        ) : (
          <p className="text-base font-medium">
            Nenhum problema crítico identificado ✅
          </p>
        )}
      </Card>
    </div>
  );
}
