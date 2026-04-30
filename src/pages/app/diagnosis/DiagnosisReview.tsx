import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { loadSession } from "@/lib/diagnosis/session";
import { STEPS } from "@/lib/diagnosis/steps";
import { generateDiagnosis } from "@/lib/diagnosis/generate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Circle, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosisReview() {
  const { sessionId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { statuses } = await loadSession(sessionId);
        setStatuses(statuses);
      } catch {
        toast.error("Sessão não encontrada");
        navigate("/app/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const result = await generateDiagnosis(sessionId, user.id);
      toast.success(`Diagnóstico gerado: ${result.diagnosticsCount} problemas identificados`);
      navigate(`/app/diagnosis/${sessionId}/result`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar diagnóstico");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const missing = statuses.flatMap((s) => (Array.isArray(s.missing_required_fields) ? s.missing_required_fields : []));
  const incomplete = STEPS.filter((s) => {
    const st = statuses.find((x) => x.step_key === s.key);
    return !st?.is_completed;
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisar antes de gerar</h1>
          <p className="text-sm text-muted-foreground">Confira o que está completo e o que pode ser melhorado</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to={`/app/diagnosis/${sessionId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao funil
          </Link>
        </Button>
      </div>

      {missing.length > 0 && (
        <Card className="p-4 border-warning/50 bg-warning/5">
          <p className="text-sm font-medium text-warning-foreground">
            ⚠ Seu diagnóstico pode ficar menos preciso porque algumas informações essenciais não foram preenchidas:
          </p>
          <ul className="mt-2 text-sm list-disc pl-6">
            {missing.slice(0, 6).map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Status das etapas</h2>
        <div className="space-y-2">
          {STEPS.map((s) => {
            const st = statuses.find((x) => x.step_key === s.key);
            const Icon = st?.is_completed ? CheckCircle2 : (st?.completion_percentage ?? 0) > 0 ? AlertCircle : Circle;
            const color = st?.is_completed ? "text-success" : (st?.completion_percentage ?? 0) > 0 ? "text-warning" : "text-muted-foreground";
            return (
              <div key={s.key} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm">{s.index}. {s.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{st?.completion_percentage ?? 0}%</span>
                  <Badge variant={st?.is_completed ? "default" : "outline"}>
                    {st?.is_completed ? "Completa" : "Pendente"}
                  </Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/app/diagnosis/${sessionId}?step=${s.index}`} onClick={(e) => {
                      // nav básica — wizard lê current_step da session; aqui só voltamos
                    }}>Editar</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 bg-primary/5 border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">Pronto para gerar seu diagnóstico</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vamos calcular score, identificar problemas, montar plano de ação priorizado e gerar relatório completo.
              {incomplete.length > 0 && ` ${incomplete.length} etapa(s) ainda incompleta(s) — você pode gerar mesmo assim.`}
            </p>
            <Button className="mt-4" size="lg" onClick={handleGenerate} disabled={generating}>
              {generating ? "Gerando…" : "Gerar diagnóstico da loja"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
