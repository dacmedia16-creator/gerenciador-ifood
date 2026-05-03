import { ReactNode } from "react";
import { STEPS, type StepDef } from "@/lib/diagnosis/steps";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface Props {
  sessionId: string;
  currentStepIndex: number;
  statuses: Array<{ step_key: string; is_completed: boolean; completion_percentage: number }>;
  saveLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onJump?: (index: number) => void;
  headerActions?: ReactNode;
  children: ReactNode;
  steps?: StepDef[];
  totalSteps?: number;
}

export function WizardShell({
  sessionId,
  currentStepIndex,
  statuses,
  saveLabel,
  onPrev,
  onNext,
  onJump,
  headerActions,
  children,
  steps,
  totalSteps,
}: Props) {
  const stepList = steps ?? STEPS;
  const total = totalSteps ?? stepList.length;
  const completedInScope = statuses.filter((s) => s.is_completed && stepList.some((st) => st.key === s.step_key)).length;
  const overallPct = Math.round((completedInScope / Math.max(total, 1)) * 100);
  const current = stepList[currentStepIndex - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Sair (rascunho salvo)
          </Link>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                Etapa {currentStepIndex} de {STEPS.length} · {current?.title}
              </span>
              <span className="text-xs text-muted-foreground">{saveLabel}</span>
            </div>
            <Progress value={overallPct} className="h-1.5" />
          </div>
          {headerActions}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar checklist */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            {STEPS.map((s) => {
              const st = statuses.find((x) => x.step_key === s.key);
              const active = s.index === currentStepIndex;
              const Icon = st?.is_completed ? CheckCircle2 : (st?.completion_percentage ?? 0) > 0 ? AlertCircle : Circle;
              return (
                <button
                  key={s.key}
                  onClick={() => onJump?.(s.index)}
                  className={cn(
                    "w-full text-left flex items-start gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      st?.is_completed ? "text-success" : (st?.completion_percentage ?? 0) > 0 ? "text-warning" : "text-muted-foreground"
                    )}
                  />
                  <span>
                    <span className="block leading-tight">{s.index}. {s.title}</span>
                    {st && st.completion_percentage > 0 && !st.is_completed && (
                      <span className="text-xs text-muted-foreground">{st.completion_percentage}%</span>
                    )}
                  </span>
                </button>
              );
            })}
            <Link
              to={`/app/diagnosis/${sessionId}/review`}
              className="block mt-3 text-center text-xs px-3 py-2 border rounded-md hover:bg-muted"
            >
              Ir para revisão →
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-6">
          {children}

          <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onPrev} disabled={currentStepIndex <= 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link to="/app/dashboard">
                  <Save className="h-4 w-4 mr-1" /> Continuar depois
                </Link>
              </Button>
              <Button onClick={onNext}>
                {currentStepIndex >= STEPS.length ? "Ir para revisão" : "Salvar e continuar"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
