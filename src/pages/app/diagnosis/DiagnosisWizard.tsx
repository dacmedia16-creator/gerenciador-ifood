import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { answersAsMap, computeStepCompletion, loadSession } from "@/lib/diagnosis/session";
import { STEPS, stepByIndex } from "@/lib/diagnosis/steps";
import { useAutosave } from "@/lib/diagnosis/autosave";
import { WizardShell } from "@/components/diagnosis/WizardShell";
import { QuestionField } from "@/components/diagnosis/QuestionField";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function DiagnosisWizard() {
  const { sessionId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, any>>>({});
  const [currentIndex, setCurrentIndex] = useState(1);

  const step = stepByIndex(currentIndex)!;
  const values = allAnswers[step.key] || {};

  const setValue = (key: string, v: any) => {
    setAllAnswers((prev) => ({ ...prev, [step.key]: { ...(prev[step.key] || {}), [key]: v } }));
  };

  useEffect(() => {
    if (!sessionId || !user) return;
    (async () => {
      try {
        const { session, answers, statuses } = await loadSession(sessionId);
        setSession(session);
        setStatuses(statuses);
        setAllAnswers(answersAsMap(answers));
        setCurrentIndex(session.current_step || 1);
      } catch (e: any) {
        toast.error("Sessão não encontrada");
        navigate("/app/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, user, navigate]);

  const { status: saveStatus } = useAutosave({
    sessionId,
    userId: user?.id || "",
    storeId: session?.store_id,
    stepKey: step.key,
    values,
    onSaved: (info) => {
      // atualiza status localmente, sem refetch (evita re-render que tira foco)
      setStatuses((prev) => {
        const others = prev.filter((s) => s.step_key !== step.key);
        return [...others, { step_key: step.key, ...info }];
      });
    },
  });

  const goTo = async (idx: number) => {
    const target = Math.max(1, Math.min(STEPS.length, idx));
    setCurrentIndex(target);
    await supabase.from("diagnosis_sessions").update({ current_step: target }).eq("id", sessionId);
  };

  const onNext = async () => {
    if (currentIndex >= STEPS.length) {
      navigate(`/app/diagnosis/${sessionId}/review`);
      return;
    }
    await goTo(currentIndex + 1);
  };

  const saveLabel = useMemo(() => {
    if (saveStatus === "saving") return "Salvando…";
    if (saveStatus === "saved") return "Salvo automaticamente";
    if (saveStatus === "error") return "Erro ao salvar";
    return "";
  }, [saveStatus]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <WizardShell
      sessionId={sessionId}
      currentStepIndex={currentIndex}
      statuses={statuses}
      saveLabel={saveLabel}
      onPrev={() => goTo(currentIndex - 1)}
      onNext={onNext}
      onJump={(i) => goTo(i)}
    >
      <Card className="p-6 shadow-card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {step.index === 1 && <Sparkles className="h-6 w-6 text-primary" />}
            {step.title}
          </h1>
          {step.subtitle && <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>}
          {step.description && <p className="text-sm text-muted-foreground mt-2">{step.description}</p>}
        </div>

        {step.intro && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 text-sm">
            {step.intro}
            <p className="text-xs text-muted-foreground mt-2">Tempo estimado: ~15 minutos. Você pode salvar e voltar quando quiser.</p>
          </div>
        )}

        <div className="space-y-5">
          {step.questions.map((q) => (
            <QuestionField key={q.key} question={q} value={values[q.key]} onChange={(v) => setValue(q.key, v)} />
          ))}
        </div>
      </Card>
    </WizardShell>
  );
}
