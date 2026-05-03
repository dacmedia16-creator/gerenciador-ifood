import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { answersAsMap, computeStepCompletion, loadSession } from "@/lib/diagnosis/session";
import { STEPS, stepByIndex, shouldShowQuestion } from "@/lib/diagnosis/steps";
import { useAutosave } from "@/lib/diagnosis/autosave";
import { WizardShell } from "@/components/diagnosis/WizardShell";
import { QuestionField } from "@/components/diagnosis/QuestionField";
import { PrintProposalsCard } from "@/components/diagnosis/PrintProposalsCard";
import { buildProposalsFromUploads, filterEmpty, type ProposedAnswer } from "@/lib/diagnosis/printMapper";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { ResetDiagnosisButton } from "@/components/diagnosis/ResetDiagnosisButton";
import { syncDiagnosisProductsToStore } from "@/lib/diagnosis/syncProducts";
import { syncStoreFromDiagnosis, syncMetricsSnapshot, syncStoreGoal } from "@/lib/diagnosis/syncToStore";
import { findNextIncompleteStepIndex } from "@/lib/diagnosis/journey";


function filterStepsByMode(mode: string | null) {
  if (mode === "prints") {
    const order = ["prints", "basic", "goal"];
    return order
      .map((k) => STEPS.find((s) => s.key === k))
      .filter(Boolean) as typeof STEPS;
  }
  if (mode === "form") return STEPS.filter((s) => s.key !== "prints");
  return STEPS;
}

export default function DiagnosisWizard() {
  const { sessionId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode");

  const activeSteps = useMemo(() => filterStepsByMode(mode), [mode]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, any>>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploads, setUploads] = useState<any[]>([]);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());
  const [autoApplying, setAutoApplying] = useState(false);
  const ignoreKey = `diagnosis:proposals-ignored:${sessionId}`;
  const [ignored, setIgnored] = useState<boolean>(() => {
    try { return localStorage.getItem(ignoreKey) === "1"; } catch { return false; }
  });

  const step = activeSteps[currentIndex];
  const values = step ? allAnswers[step.key] || {} : {};

  const setValue = (key: string, v: any) => {
    if (!step) return;
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
        // Mapeia current_step (índice global de STEPS) para o índice no activeSteps filtrado.
        const savedStepIndex = session.current_step || 1;
        const savedStep = stepByIndex(savedStepIndex);
        const idxInActive = savedStep
          ? Math.max(0, activeSteps.findIndex((s) => s.key === savedStep.key))
          : 0;
        setCurrentIndex(idxInActive);
      } catch (e: any) {
        toast.error("Sessão não encontrada");
        navigate("/app/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, user, navigate, activeSteps]);

  // Carrega uploads processados e atualiza a cada 5s enquanto houver pendentes
  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    const fetchUploads = async () => {
      const { data } = await supabase
        .from("diagnosis_uploads")
        .select("*")
        .eq("session_id", sessionId);
      if (!stop) setUploads(data || []);
    };
    fetchUploads();
    const t = window.setInterval(fetchUploads, 5000);
    return () => { stop = true; window.clearInterval(t); };
  }, [sessionId]);

  const proposals = useMemo<ProposedAnswer[]>(() => {
    if (ignored) return [];
    return filterEmpty(buildProposalsFromUploads(uploads), allAnswers);
  }, [uploads, allAnswers, ignored]);

  // Auto-aplica os dados extraídos pela IA assim que todos os prints terminarem
  // de processar, e em seguida pula para a primeira etapa com campos pendentes.
  useEffect(() => {
    if (!user || !sessionId) return;
    if (step?.key !== "prints") return;
    if (autoApplying) return;
    if (uploads.length === 0) return;
    const stillProcessing = uploads.some((u) => u.status === "pending");
    if (stillProcessing) return;
    const fresh = proposals.filter((p) => !appliedKeys.has(`${p.stepKey}.${p.questionKey}`));
    if (fresh.length === 0) return;

    (async () => {
      setAutoApplying(true);
      try {
        const rows = fresh.map((p) => ({
          session_id: sessionId,
          user_id: user.id,
          store_id: session?.store_id ?? null,
          step_key: p.stepKey,
          question_key: p.questionKey,
          answer_value: p.value as any,
          answer_type: typeof p.value,
        }));
        const { error } = await supabase
          .from("diagnosis_answers")
          .upsert(rows, { onConflict: "session_id,step_key,question_key" });
        if (error) throw error;

        const merged: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(allAnswers));
        for (const p of fresh) {
          merged[p.stepKey] = { ...(merged[p.stepKey] || {}), [p.questionKey]: p.value };
        }
        const stepsTouched = Array.from(new Set(fresh.map((p) => p.stepKey)));
        for (const sk of stepsTouched) {
          const info = computeStepCompletion(sk, merged[sk] || {});
          await supabase.from("diagnosis_step_status").upsert(
            {
              session_id: sessionId,
              step_key: sk,
              completion_percentage: info.completion_percentage,
              missing_required_fields: info.missing_required_fields,
              is_completed: info.is_completed,
            },
            { onConflict: "session_id,step_key" },
          );
          setStatuses((prev) => {
            const others = prev.filter((s) => s.step_key !== sk);
            return [...others, { step_key: sk, ...info }];
          });
        }

        setAllAnswers(merged);
        setAppliedKeys((prev) => {
          const n = new Set(prev);
          fresh.forEach((p) => n.add(`${p.stepKey}.${p.questionKey}`));
          return n;
        });
        toast.success(`IA preencheu ${fresh.length} ${fresh.length === 1 ? "campo" : "campos"} a partir dos prints.`);

        // Pula direto para a primeira etapa com campos obrigatórios faltando
        const nextIdx = findNextIncompleteStepIndex(activeSteps, merged, currentIndex + 1);
        if (nextIdx === -1) {
          navigate(`/app/diagnosis/${sessionId}/review`);
        } else {
          await goTo(nextIdx);
        }
      } catch (e: any) {
        console.error("auto-apply error", e);
        toast.error(e.message || "Erro ao aplicar dados dos prints");
      } finally {
        setAutoApplying(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads, proposals, step?.key]);

  const { status: saveStatus } = useAutosave({
    sessionId,
    userId: user?.id || "",
    storeId: session?.store_id,
    stepKey: step?.key || "",
    values,
    onSaved: (info) => {
      if (!step) return;
      setStatuses((prev) => {
        const others = prev.filter((s) => s.step_key !== step.key);
        return [...others, { step_key: step.key, ...info }];
      });
    },
  });

  const goTo = async (idx: number) => {
    const target = Math.max(0, Math.min(activeSteps.length - 1, idx));
    setCurrentIndex(target);
    const globalIndex = activeSteps[target]?.index ?? 1;
    await supabase.from("diagnosis_sessions").update({ current_step: globalIndex }).eq("id", sessionId);
  };

  const onNext = async () => {
    const storeId = session?.store_id;
    try {
      if (step?.key === "products" && storeId && Array.isArray(values.items)) {
        await syncDiagnosisProductsToStore(storeId, values.items);
      }
      if (storeId && (step?.key === "basic" || step?.key === "storefront" || step?.key === "delivery")) {
        const merged = { ...allAnswers, [step.key]: values };
        await syncStoreFromDiagnosis(storeId, merged);
        await syncMetricsSnapshot(storeId, merged);
      }
      if (step?.key === "goal" && storeId && user?.id) {
        await syncStoreGoal(storeId, user.id, values);
      }
    } catch (e) {
      console.error("diagnosis sync error", e);
    }
    if (currentIndex >= activeSteps.length - 1) {
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

  if (loading || !step) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <WizardShell
      sessionId={sessionId}
      currentStepIndex={currentIndex + 1}
      totalSteps={activeSteps.length}
      steps={activeSteps}
      statuses={statuses}
      saveLabel={saveLabel}
      onPrev={() => goTo(currentIndex - 1)}
      onNext={onNext}
      onJump={(i) => goTo(i - 1)}
      headerActions={<ResetDiagnosisButton storeId={session?.store_id} size="sm" />}
    >
      {proposals.length > 0 && user && (
        <PrintProposalsCard
          sessionId={sessionId}
          userId={user.id}
          storeId={session?.store_id}
          proposals={proposals}
          allAnswers={allAnswers}
          onApplied={(applied) => {
            setAllAnswers((prev) => {
              const next = { ...prev };
              for (const p of applied) {
                next[p.stepKey] = { ...(next[p.stepKey] || {}), [p.questionKey]: p.value };
              }
              return next;
            });
          }}
          onIgnore={() => {
            try { localStorage.setItem(ignoreKey, "1"); } catch {}
            setIgnored(true);
          }}
        />
      )}
      <Card className="p-6 shadow-card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {currentIndex === 0 && <Sparkles className="h-6 w-6 text-primary" />}
            {step.title}
          </h1>
          {step.subtitle && <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>}
          {step.description && <p className="text-sm text-muted-foreground mt-2">{step.description}</p>}
        </div>

        {step.intro && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 text-sm">
            {step.intro}
            <p className="text-xs text-muted-foreground mt-2">Você pode salvar e voltar quando quiser.</p>
          </div>
        )}

        <div className="space-y-5">
          {step.questions.filter((q) => shouldShowQuestion(q, values)).map((q) => (
            <QuestionField key={q.key} question={q} value={values[q.key]} onChange={(v) => setValue(q.key, v)} />
          ))}
        </div>
      </Card>
    </WizardShell>
  );
}
