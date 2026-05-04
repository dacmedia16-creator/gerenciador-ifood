import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge, PriorityBadge } from "@/components/StatusBadges";
import { Sparkles, RotateCw, AlertTriangle, Lightbulb, Target, ListChecks, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ProblemFeedback } from "./ProblemFeedback";

interface DetailedSolution {
  executive_summary: string;
  why_it_matters: string;
  root_causes?: string[];
  detailed_solution: string;
  step_by_step: string[];
  expected_metric: string;
  risks?: string[];
  similar_cases?: { summary: string; outcome?: string }[];
  deadline_suggestion?: string;
}

interface Props {
  diagnostic: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeContext?: {
    delivery_time?: number | null;
    cancellation_rate?: number | null;
    rating?: number | null;
    monthly_orders?: number | null;
    average_ticket?: number | null;
  };
}

export function ProblemDetailSheet({ diagnostic, open, onOpenChange, storeContext }: Props) {
  const [loading, setLoading] = useState(false);
  const [detailed, setDetailed] = useState<DetailedSolution | null>(null);

  useEffect(() => {
    if (!open || !diagnostic) return;
    setDetailed(diagnostic.detailed_solution || null);
    if (!diagnostic.detailed_solution) {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, diagnostic?.id]);

  const load = async (force: boolean) => {
    if (!diagnostic) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-problem-detail", {
        body: { diagnosticId: diagnostic.id, force },
      });
      if (error) throw error;
      if (data?.detailed) {
        setDetailed(data.detailed);
        if (force && diagnostic.store_id) {
          supabase.functions
            .invoke("invalidate-diagnosis-cache", { body: { store_id: diagnostic.store_id } })
            .catch((e) => console.warn("invalidate-diagnosis-cache", e));
        }
      } else toast.error("Não foi possível gerar a solução agora");
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar a IA");
    } finally {
      setLoading(false);
    }
  };

  if (!diagnostic) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{diagnostic.area}</span>
            <SeverityBadge severity={diagnostic.severity} />
            {diagnostic.priority && <PriorityBadge priority={diagnostic.priority} />}
          </div>
          <SheetTitle className="text-xl">{diagnostic.problem}</SheetTitle>
          {diagnostic.evidence && (
            <SheetDescription className="text-sm">
              <strong className="text-foreground">Evidência:</strong> {diagnostic.evidence}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {diagnostic.business_impact && (
            <Section icon={<AlertTriangle className="h-4 w-4 text-destructive" />} title="Impacto no negócio">
              <p className="text-sm">{diagnostic.business_impact}</p>
            </Section>
          )}

          {loading && !detailed && (
            <div className="space-y-3 border rounded-md p-4 bg-primary/5">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Gestor IA analisando este problema…
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          )}

          {detailed && (
            <>
              <Section icon={<Lightbulb className="h-4 w-4 text-primary" />} title="Resumo da IA">
                <p className="text-sm">{detailed.executive_summary}</p>
                <p className="text-sm text-muted-foreground mt-2">{detailed.why_it_matters}</p>
              </Section>

              {detailed.root_causes && detailed.root_causes.length > 0 && (
                <Section icon={<AlertTriangle className="h-4 w-4 text-warning" />} title="Causas prováveis">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {detailed.root_causes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </Section>
              )}

              <Section icon={<Target className="h-4 w-4 text-success" />} title="Solução recomendada">
                <p className="text-sm whitespace-pre-line">{detailed.detailed_solution}</p>
              </Section>

              {detailed.step_by_step && detailed.step_by_step.length > 0 && (
                <Section icon={<ListChecks className="h-4 w-4 text-primary" />} title="Passo a passo">
                  <ol className="list-decimal pl-5 text-sm space-y-1.5">
                    {detailed.step_by_step.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </Section>
              )}

              {detailed.expected_metric && (
                <Section icon={<Target className="h-4 w-4 text-success" />} title="O que medir">
                  <p className="text-sm">{detailed.expected_metric}</p>
                  {detailed.deadline_suggestion && (
                    <p className="text-xs text-muted-foreground mt-1">Prazo sugerido: {detailed.deadline_suggestion}</p>
                  )}
                </Section>
              )}

              {detailed.risks && detailed.risks.length > 0 && (
                <Section icon={<AlertTriangle className="h-4 w-4 text-warning" />} title="Riscos / atenção">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {detailed.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </Section>
              )}

              {detailed.similar_cases && detailed.similar_cases.length > 0 && (
                <Section icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} title="Casos similares">
                  <ul className="space-y-2 text-sm">
                    {detailed.similar_cases.map((c, i) => (
                      <li key={i} className="border-l-2 border-muted pl-3">
                        <p>{c.summary}</p>
                        {c.outcome && <p className="text-xs text-muted-foreground mt-0.5">Resultado: {c.outcome}</p>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={loading}>
                  <RotateCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Regerar análise
                </Button>
              </div>

              {diagnostic.id && (
                <ProblemFeedback
                  diagnosticId={diagnostic.id}
                  initialFeedback={(detailed as any)?._last_feedback ?? null}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm">
        {icon} {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
