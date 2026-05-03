import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createSession, getDraftSession, type SessionRow } from "@/lib/diagnosis/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PrintUploader } from "@/components/diagnosis/PrintUploader";
import { invokeAI } from "@/lib/ai/invokeAI";
import { Loader2, Sparkles, Target, Camera, ListChecks, Wand2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Objective =
  | "vender_mais"
  | "lucrar_mais"
  | "melhorar_nota"
  | "reduzir_cancelamento"
  | "aumentar_recompra";

const OBJECTIVES: { key: Objective; title: string; desc: string }[] = [
  { key: "vender_mais", title: "Vender mais", desc: "Aumentar pedidos e visibilidade" },
  { key: "lucrar_mais", title: "Lucrar mais", desc: "Melhorar margem e ticket" },
  { key: "melhorar_nota", title: "Melhorar nota", desc: "Subir avaliação dos clientes" },
  { key: "reduzir_cancelamento", title: "Reduzir cancelamento", desc: "Menos pedidos cancelados" },
  { key: "aumentar_recompra", title: "Aumentar recompra", desc: "Cliente voltar mais vezes" },
];

export default function DiagnosisExpress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storeId = params.get("storeId");
  const [step, setStep] = useState(1);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [metrics, setMetrics] = useState({
    monthly_revenue: "",
    monthly_orders: "",
    average_ticket: "",
    rating: "",
    cancellation_rate: "",
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const draft = await getDraftSession(user.id);
      const s = draft ?? (await createSession(user.id, storeId));
      setSession(s);
      // pré-carrega métricas existentes da loja
      if (storeId) {
        const { data } = await supabase.from("stores").select("monthly_revenue, monthly_orders, average_ticket, rating, cancellation_rate").eq("id", storeId).maybeSingle();
        if (data) setMetrics({
          monthly_revenue: data.monthly_revenue?.toString() ?? "",
          monthly_orders: data.monthly_orders?.toString() ?? "",
          average_ticket: data.average_ticket?.toString() ?? "",
          rating: data.rating?.toString() ?? "",
          cancellation_rate: data.cancellation_rate?.toString() ?? "",
        });
      }
    })();
  }, [user, storeId]);

  const progress = useMemo(() => Math.round((step / 4) * 100), [step]);

  const saveMetrics = async () => {
    if (!storeId) return;
    setLoading(true);
    const payload: any = {};
    Object.entries(metrics).forEach(([k, v]) => { if (v !== "") payload[k] = Number(String(v).replace(",", ".")); });
    if (Object.keys(payload).length) {
      await supabase.from("stores").update(payload).eq("id", storeId);
    }
    // grava objetivo como meta ativa
    if (objective && user) {
      await supabase.from("store_goals").insert({
        store_id: storeId,
        user_id: user.id,
        goal_type: objective,
        priority: "alta",
        status: "ativa",
        notes: "Definido no diagnóstico expresso",
      });
    }
    setLoading(false);
    setStep(4);
  };

  const generate = async () => {
    if (!storeId || !session) return;
    setGenerating(true);
    try {
      const res = await invokeAI<{ diagnosis: any }>("ai-consult", {
        storeId,
        sessionId: session.id,
        mode: "both",
        objective,
      });
      if (res?.diagnosis) {
        toast.success("Análise pronta!");
        navigate(`/app/stores/${storeId}/report`);
      } else {
        toast.error("Não conseguimos gerar agora. Tente novamente.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar análise");
    } finally {
      setGenerating(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparando…
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 md:py-10 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Sparkles className="h-3.5 w-3.5" /> Diagnóstico expresso · 5 minutos
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Em poucos passos, sua loja analisada</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Vamos descobrir onde você está perdendo dinheiro e o que fazer primeiro.
        </p>
        <div className="mt-4 max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">Passo {step} de 4</p>
        </div>
      </div>

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">1. Qual seu objetivo principal agora?</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {OBJECTIVES.map((o) => (
              <Button
                key={o.key}
                variant={objective === o.key ? "default" : "outline"}
                onClick={() => setObjective(o.key)}
                className="h-auto py-3 flex-col items-start gap-0.5 text-left whitespace-normal"
              >
                <span className="font-semibold text-sm">{o.title}</span>
                <span className="text-xs opacity-80 font-normal">{o.desc}</span>
              </Button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} disabled={!objective}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">2. Envie prints da sua loja</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cardápio, página da loja no app e tela de avaliações. A IA extrai os dados pra você.
            Pode pular se não tiver agora.
          </p>
          <PrintUploader sessionId={session.id} storeId={storeId} defaultClassification="loja" />
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">3. 5 perguntas rápidas</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Responda só o que souber. Pode aproximar.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Faturamento mensal (R$)</Label>
              <Input type="number" inputMode="decimal" value={metrics.monthly_revenue}
                onChange={(e) => setMetrics({ ...metrics, monthly_revenue: e.target.value })} />
            </div>
            <div>
              <Label>Pedidos por mês</Label>
              <Input type="number" inputMode="numeric" value={metrics.monthly_orders}
                onChange={(e) => setMetrics({ ...metrics, monthly_orders: e.target.value })} />
            </div>
            <div>
              <Label>Ticket médio (R$)</Label>
              <Input type="number" inputMode="decimal" value={metrics.average_ticket}
                onChange={(e) => setMetrics({ ...metrics, average_ticket: e.target.value })} />
            </div>
            <div>
              <Label>Nota da loja (0–5)</Label>
              <Input type="number" inputMode="decimal" step="0.1" value={metrics.rating}
                onChange={(e) => setMetrics({ ...metrics, rating: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Cancelamento (%)</Label>
              <Input type="number" inputMode="decimal" step="0.1" value={metrics.cancellation_rate}
                onChange={(e) => setMetrics({ ...metrics, cancellation_rate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={saveMetrics} disabled={loading}>
              {loading ? "Salvando…" : "Próximo"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 space-y-4 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold text-lg">Pronto pra gerar sua análise</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A IA vai cruzar seus prints, suas respostas e seu objetivo para mostrar onde você
            está perdendo dinheiro e as 3 ações para fazer primeiro.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep(3)} disabled={generating}>Voltar</Button>
            <Button onClick={generate} disabled={generating} className="gradient-primary text-primary-foreground">
              {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analisando…</> : <><Sparkles className="h-4 w-4 mr-1" /> Gerar análise</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Quer um diagnóstico ainda mais completo depois?{" "}
            <button className="underline" onClick={() => navigate(`/app/diagnosis/${session.id}`)}>
              Fazer diagnóstico completo
            </button>
          </p>
        </Card>
      )}
    </div>
  );
}
