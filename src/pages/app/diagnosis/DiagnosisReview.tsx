import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { answersAsMap, loadSession } from "@/lib/diagnosis/session";
import { STEPS } from "@/lib/diagnosis/steps";
import { generateDiagnosis } from "@/lib/diagnosis/generate";
import { evidencesFromAnswers, type RuleEvidence } from "@/lib/diagnosis/evidences";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  Circle,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { EvidenceCard } from "@/components/diagnosis/EvidenceCard";
import { ReviewAnswerList } from "@/components/diagnosis/ReviewAnswerList";

export default function DiagnosisReview() {
  const { sessionId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<{ answers: any[]; statuses: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { answers, statuses } = await loadSession(sessionId);
        setData({ answers, statuses });
      } catch {
        toast.error("Sessão não encontrada");
        navigate("/app/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  const answersByStep = useMemo(() => (data ? answersAsMap(data.answers) : {}), [data]);

  const evidences: RuleEvidence[] = useMemo(
    () => (data ? evidencesFromAnswers(answersByStep) : []),
    [data, answersByStep],
  );

  const criticos = evidences.filter((e) => e.severity === "critico");
  const atencoes = evidences.filter((e) => e.severity === "atencao");
  const missingFromEvidences = Array.from(
    new Set(evidences.flatMap((e) => e.missing_data || [])),
  );

  const statuses = data?.statuses ?? [];
  const completedSteps = statuses.filter((s) => s.is_completed).length;
  const overallPct = Math.round((completedSteps / STEPS.length) * 100);
  const incompleteSteps = STEPS.filter((s) => {
    const st = statuses.find((x) => x.step_key === s.key);
    return !st?.is_completed;
  });
  const missingRequired: string[] = Array.from(
    new Set(
      statuses.flatMap((s) =>
        Array.isArray(s.missing_required_fields) ? s.missing_required_fields : [],
      ),
    ),
  );

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Revisão antes de gerar o plano</h1>
          <p className="text-sm text-muted-foreground">
            Confira suas respostas, os problemas já detectados e o que ainda pode melhorar a precisão do seu diagnóstico.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link to={`/app/diagnosis/${sessionId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao funil
          </Link>
        </Button>
      </div>

      {/* Resumo de prontidão */}
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Etapas completas" value={`${completedSteps}/${STEPS.length}`} sub={`${overallPct}%`} />
          <Stat label="Pontos críticos" value={String(criticos.length)} tone={criticos.length ? "danger" : "ok"} />
          <Stat label="Pontos de atenção" value={String(atencoes.length)} tone={atencoes.length ? "warn" : "ok"} />
          <Stat label="Dados faltantes" value={String(missingRequired.length + missingFromEvidences.length)} tone="muted" />
        </div>
      </Card>

      {/* Pontos críticos */}
      {criticos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Pontos críticos detectados</h2>
            <Badge variant="destructive">{criticos.length}</Badge>
          </div>
          <div className="grid gap-3">
            {criticos.map((ev) => <EvidenceCard key={ev.rule_id} ev={ev} />)}
          </div>
        </section>
      )}

      {/* Atenções */}
      {atencoes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">Pontos de atenção</h2>
            <Badge variant="outline">{atencoes.length}</Badge>
          </div>
          <Accordion type="single" collapsible defaultValue="atencao">
            <AccordionItem value="atencao" className="border-0">
              <AccordionTrigger className="text-sm py-2">Ver {atencoes.length} pontos de atenção</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pt-2">
                  {atencoes.map((ev) => <EvidenceCard key={ev.rule_id} ev={ev} />)}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      )}

      {/* Dados faltantes */}
      {(missingRequired.length > 0 || missingFromEvidences.length > 0) && (
        <Card className="p-5 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 mt-0.5 text-warning shrink-0" />
            <div className="flex-1 space-y-2">
              <h2 className="font-semibold">Dados faltantes que reduzem a precisão</h2>
              <p className="text-sm text-muted-foreground">
                Você pode gerar o plano mesmo assim, mas preencher esses pontos torna o diagnóstico bem mais certeiro.
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {missingRequired.slice(0, 8).map((m, i) => <li key={`r-${i}`}>{m}</li>)}
                {missingFromEvidences.slice(0, 6).map((m, i) => (
                  <li key={`e-${i}`} className="text-muted-foreground">{m.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Suas respostas */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suas respostas, etapa por etapa</h2>
        <Card className="p-2">
          <Accordion type="multiple" className="w-full">
            {STEPS.map((s) => {
              const st = statuses.find((x) => x.step_key === s.key);
              const completed = !!st?.is_completed;
              const pct = st?.completion_percentage ?? 0;
              const Icon = completed ? CheckCircle2 : pct > 0 ? AlertCircle : Circle;
              const color = completed ? "text-success" : pct > 0 ? "text-warning" : "text-muted-foreground";
              const stepValues = answersByStep[s.key] ?? {};
              return (
                <AccordionItem key={s.key} value={s.key} className="px-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                      <span className="text-sm font-medium">{s.index}. {s.title}</span>
                      <Badge variant={completed ? "default" : "outline"} className="ml-auto mr-2">
                        {completed ? "Completa" : `${pct}%`}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/app/diagnosis/${sessionId}?step=${s.index}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar etapa
                          </Link>
                        </Button>
                      </div>
                      <Separator />
                      <ReviewAnswerList step={s} values={stepValues} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Card>
      </section>

      {/* CTA final */}
      <Card className="p-6 bg-primary/5 border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">Pronto para gerar seu plano de ação</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vamos calcular o score, priorizar os {criticos.length} ponto(s) crítico(s) e {atencoes.length} de atenção, e montar um plano com prazos.
              {incompleteSteps.length > 0 && ` Você tem ${incompleteSteps.length} etapa(s) incompleta(s) — pode gerar mesmo assim.`}
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button size="lg" onClick={handleGenerate} disabled={generating}>
                {generating ? "Gerando…" : "Gerar plano de ação"}
              </Button>
              {incompleteSteps.length > 0 && (
                <Button variant="outline" size="lg" asChild>
                  <Link to={`/app/diagnosis/${sessionId}?step=${incompleteSteps[0].index}`}>
                    Continuar preenchendo
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "warn" | "ok" | "muted";
}) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    danger: "text-destructive",
    warn: "text-warning",
    ok: "text-success",
    muted: "text-muted-foreground",
  };
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
