import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createSession, getDraftSession, type SessionRow } from "@/lib/diagnosis/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { invokeAI } from "@/lib/ai/invokeAI";
import { Loader2, Sparkles, ArrowRight, ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadPrintJob } from "@/lib/prints/uploadPrintJob";
import { PrintJobStatus } from "@/components/prints/PrintJobStatus";

const TOTAL_STEPS = 5;

const REVENUE_OPTIONS = [
  { value: "ate_5k", label: "Até R$ 5.000" },
  { value: "5k_15k", label: "R$ 5.000 a R$ 15.000" },
  { value: "15k_30k", label: "R$ 15.000 a R$ 30.000" },
  { value: "acima_30k", label: "Acima de R$ 30.000" },
] as const;

const PROBLEM_OPTIONS = [
  { value: "cancelamentos", icon: "🚫", label: "Cancelamentos altos" },
  { value: "nota_baixa", icon: "⭐", label: "Nota baixa" },
  { value: "pouco_movimento", icon: "📉", label: "Pouco movimento / poucos pedidos" },
  { value: "margem", icon: "💸", label: "Margem apertada / lucro baixo" },
  { value: "concorrencia", icon: "🏪", label: "Concorrência forte" },
  { value: "nao_sei", icon: "🤷", label: "Não sei por onde começar" },
] as const;

interface FormState {
  revenue_range: string;
  current_rating: string;
  cancellation_rate: string;
  avg_ticket: string;
  main_problem: string;
}

export default function DiagnosisExpress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryStoreId = params.get("storeId");
  const [storeId, setStoreId] = useState<string | null>(queryStoreId);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [step, setStep] = useState(1);
  const [showPrintScreen, setShowPrintScreen] = useState(false);
  const [printFile, setPrintFile] = useState<File | null>(null);
  const [printPreview, setPrintPreview] = useState<string | null>(null);
  const [printJobId, setPrintJobId] = useState<string | null>(null);
  const [uploadingPrint, setUploadingPrint] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<FormState>({
    revenue_range: "",
    current_rating: "",
    cancellation_rate: "",
    avg_ticket: "",
    main_problem: "",
  });

  // Inicializa sessão + store
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Garante uma store
      let sid = queryStoreId;
      if (!sid) {
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existing?.id) sid = existing.id;
        else {
          const { data: created, error } = await supabase
            .from("stores")
            .insert({ user_id: user.id, name: "Minha Loja", platform: "ifood" })
            .select("id")
            .single();
          if (error) {
            toast.error("Não conseguimos preparar sua loja. Tente novamente.");
            return;
          }
          sid = created.id;
        }
      }
      setStoreId(sid);

      // Sessão
      const draft = await getDraftSession(user.id);
      const s = draft ?? (await createSession(user.id, sid));
      setSession(s);
      if (draft && draft.current_step >= 1 && draft.current_step <= TOTAL_STEPS) {
        setStep(draft.current_step);
      }

      // Carrega respostas existentes
      const { data: answers } = await supabase
        .from("diagnosis_answers")
        .select("question_key, answer_value")
        .eq("session_id", s.id)
        .eq("step_key", "express");
      if (answers) {
        const next = { ...form };
        for (const a of answers) {
          const key = a.question_key as keyof FormState;
          if (key in next) next[key] = String((a.answer_value as any) ?? "");
        }
        setForm(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryStoreId]);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  const saveAnswer = async (questionKey: keyof FormState, value: string | number) => {
    if (!session || !user) return;
    await supabase
      .from("diagnosis_answers")
      .upsert(
        {
          session_id: session.id,
          user_id: user.id,
          store_id: storeId,
          step_key: "express",
          question_key: questionKey,
          answer_value: value as any,
          answer_type: typeof value,
        },
        { onConflict: "session_id,step_key,question_key" }
      );
  };

  const advance = async (next: number) => {
    if (!session) return;
    await supabase
      .from("diagnosis_sessions")
      .update({ current_step: next, completion_percentage: Math.round(((next - 1) / TOTAL_STEPS) * 100) })
      .eq("id", session.id);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = async () => {
    // Valida etapa atual e salva
    switch (step) {
      case 1:
        if (!form.revenue_range) return toast.error("Selecione uma faixa.");
        await saveAnswer("revenue_range", form.revenue_range);
        break;
      case 2: {
        const v = Number(form.current_rating.replace(",", "."));
        if (!form.current_rating || Number.isNaN(v) || v < 0 || v > 5)
          return toast.error("Informe uma nota entre 0 e 5.");
        await saveAnswer("current_rating", v);
        break;
      }
      case 3: {
        const v = Number(form.cancellation_rate.replace(",", "."));
        if (form.cancellation_rate === "" || Number.isNaN(v) || v < 0 || v > 100)
          return toast.error("Informe um percentual entre 0 e 100.");
        await saveAnswer("cancellation_rate", v);
        break;
      }
      case 4: {
        const v = Number(form.avg_ticket.replace(",", "."));
        if (!form.avg_ticket || Number.isNaN(v) || v < 0)
          return toast.error("Informe o ticket médio.");
        await saveAnswer("avg_ticket", v);
        break;
      }
      case 5:
        if (!form.main_problem) return toast.error("Escolha o maior problema.");
        await saveAnswer("main_problem", form.main_problem);
        break;
    }

    if (step < TOTAL_STEPS) {
      await advance(step + 1);
    } else {
      // Todas as 5 etapas concluídas → tela de print
      await syncStoreFromAnswers();
      setShowPrintScreen(true);
    }
  };

  const handleBack = () => {
    if (step > 1) advance(step - 1);
  };

  // Atualiza a store com os dados coletados (para a IA usar)
  const syncStoreFromAnswers = async () => {
    if (!storeId) return;
    const update: Partial<{ rating: number; cancellation_rate: number; average_ticket: number; monthly_revenue: number }> = {};
    const rating = Number(form.current_rating.replace(",", "."));
    const cancel = Number(form.cancellation_rate.replace(",", "."));
    const ticket = Number(form.avg_ticket.replace(",", "."));
    if (!Number.isNaN(rating)) update.rating = rating;
    if (!Number.isNaN(cancel)) update.cancellation_rate = cancel;
    if (!Number.isNaN(ticket)) update.average_ticket = ticket;
    // Faixa de faturamento → mid point
    const midpoint: Record<string, number> = {
      ate_5k: 3000,
      "5k_15k": 10000,
      "15k_30k": 22500,
      acima_30k: 45000,
    };
    if (midpoint[form.revenue_range]) update.monthly_revenue = midpoint[form.revenue_range];
    if (Object.keys(update).length) {
      await supabase.from("stores").update(update).eq("id", storeId);
    }
  };

  const handlePrintSelect = async (file: File | null) => {
    setPrintFile(file);
    setPrintJobId(null);
    if (printPreview) URL.revokeObjectURL(printPreview);
    setPrintPreview(file ? URL.createObjectURL(file) : null);
    if (file && user) {
      setUploadingPrint(true);
      try {
        const { jobId } = await uploadPrintJob({
          file,
          userId: user.id,
          storeId,
          diagnosisSessionId: session?.id ?? null,
        });
        setPrintJobId(jobId);
      } catch (e: any) {
        toast.error(e?.message ?? "Falha no upload do print");
        setPrintFile(null);
        if (printPreview) URL.revokeObjectURL(printPreview);
        setPrintPreview(null);
      } finally {
        setUploadingPrint(false);
      }
    }
  };

  const generate = async (_withPrint: boolean) => {
    if (!storeId || !session) return;
    setGenerating(true);
    try {
      if (withPrint && printFile) {
        await uploadPrintIfAny();
      }
      const res = await invokeAI<{ diagnosis: any }>("ai-consult", {
        storeId,
        sessionId: session.id,
        mode: "both",
        objective: form.main_problem,
      });
      if (res?.diagnosis) {
        await supabase
          .from("diagnosis_sessions")
          .update({ status: "generated", generated_at: new Date().toISOString(), completion_percentage: 100 })
          .eq("id", session.id);
        toast.success("Diagnóstico pronto!");
        navigate(`/app/stores/${storeId}/report`);
      } else {
        toast.error("Não conseguimos gerar agora. Tente novamente.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar diagnóstico");
    } finally {
      setGenerating(false);
    }
  };

  if (!session || !storeId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparando…
      </div>
    );
  }

  // === Tela intermediária: print ===
  if (showPrintScreen) {
    return (
      <div className="container max-w-2xl py-6 md:py-10">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Última etapa (opcional)
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Quer um diagnóstico ainda mais preciso?</h1>
            <p className="text-muted-foreground">
              Envie um print do seu painel iFood. Opcional — leva 10 segundos.
            </p>
          </div>

          {!printPreview ? (
            <label className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 block transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 10 MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePrintSelect(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={printPreview} alt="Pré-visualização do print" className="w-full max-h-80 object-contain bg-muted" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handlePrintSelect(null)}
              >
                <X className="h-4 w-4 mr-1" /> Trocar
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => generate(true)}
              disabled={generating || !printFile}
              className="w-full min-h-12 text-base"
              size="lg"
            >
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando…</> : "Gerar diagnóstico com print"}
            </Button>
            <button
              type="button"
              onClick={() => generate(false)}
              disabled={generating}
              className="w-full text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50"
            >
              Pular e gerar diagnóstico agora
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // === Etapas do funil ===
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container max-w-2xl py-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Etapa {step} de {TOTAL_STEPS}</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="container max-w-2xl py-6 md:py-10">
        <Card className="p-6 md:p-8 space-y-6">
          {step === 1 && (
            <Step
              title="Quanto sua loja fatura por mês?"
              subtitle="Estimativa aproximada está ótimo."
            >
              <div className="grid gap-3">
                {REVENUE_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    variant={form.revenue_range === o.value ? "default" : "outline"}
                    onClick={() => setForm({ ...form, revenue_range: o.value })}
                    className="min-h-12 text-base justify-start"
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step
              title="Qual é a sua nota atual no iFood?"
              subtitle="Você encontra essa nota no painel do iFood Parceiros."
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={5}
                placeholder="Ex: 4.3"
                value={form.current_rating}
                onChange={(e) => setForm({ ...form, current_rating: e.target.value })}
                className="min-h-12 text-base"
                autoFocus
              />
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Qual é o seu percentual de cancelamento?"
              subtitle="Encontre isso em Relatórios > Pedidos no painel do iFood."
            >
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="Ex: 6.5"
                  value={form.cancellation_rate}
                  onChange={(e) => setForm({ ...form, cancellation_rate: e.target.value })}
                  className="min-h-12 text-base pr-10"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Não sabe? Digite 0 por agora. Você pode atualizar depois.
              </p>
            </Step>
          )}

          {step === 4 && (
            <Step
              title="Qual é o seu ticket médio por pedido?"
              subtitle="Valor médio que cada cliente gasta por pedido."
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="Ex: 42"
                  value={form.avg_ticket}
                  onChange={(e) => setForm({ ...form, avg_ticket: e.target.value })}
                  className="min-h-12 text-base pl-10"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Não sabe? Calcule: faturamento do mês ÷ número de pedidos.
              </p>
            </Step>
          )}

          {step === 5 && (
            <Step
              title="Qual é o maior problema da sua loja hoje?"
              subtitle="Escolha o que mais te preocupa agora."
            >
              <div className="grid gap-2.5">
                {PROBLEM_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    variant={form.main_problem === o.value ? "default" : "outline"}
                    onClick={() => setForm({ ...form, main_problem: o.value })}
                    className="min-h-12 text-base justify-start gap-3"
                  >
                    <span className="text-xl">{o.icon}</span>
                    <span>{o.label}</span>
                  </Button>
                ))}
              </div>
            </Step>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button variant="ghost" onClick={handleBack} className="min-h-12">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={handleNext} className="min-h-12 text-base px-6" size="lg">
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
