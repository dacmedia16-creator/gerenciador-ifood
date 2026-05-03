import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { invokeAI } from "@/lib/ai/invokeAI";
import { toast } from "sonner";

const METRIC_OPTIONS: { key: string; label: string; suffix: string }[] = [
  { key: "monthly_revenue", label: "Faturamento (R$/mês)", suffix: "R$" },
  { key: "monthly_orders", label: "Pedidos (no mês)", suffix: "pedidos" },
  { key: "average_ticket", label: "Ticket médio (R$)", suffix: "R$" },
  { key: "rating", label: "Nota da loja", suffix: "estrelas" },
  { key: "cancellation_rate", label: "Cancelamento (%)", suffix: "%" },
  { key: "prep_time", label: "Tempo de preparo (min)", suffix: "min" },
];

export function ReassessDialog({
  action,
  storeId,
  onClose,
}: {
  action: any | null;
  storeId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "done">("form");
  const [whatChanged, setWhatChanged] = useState("");
  const [doneAt, setDoneAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState<"positivo" | "neutro" | "negativo">("positivo");
  const [metricKey, setMetricKey] = useState<string>("");
  const [metricValue, setMetricValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [reassessing, setReassessing] = useState(false);

  useEffect(() => {
    if (action) {
      setStep("form");
      setWhatChanged("");
      setDoneAt(new Date().toISOString().slice(0, 10));
      setOutcome("positivo");
      setMetricKey("");
      setMetricValue("");
    }
  }, [action]);

  const submit = async () => {
    if (!action || !user) return;
    setSaving(true);
    try {
      const metrics_delta: Record<string, number> = {};
      if (metricKey && metricValue) {
        const num = Number(String(metricValue).replace(",", "."));
        if (!Number.isNaN(num)) metrics_delta[metricKey] = num;
      }

      // 1) marca a ação como aplicada
      await supabase
        .from("action_plans")
        .update({ status: "aplicada", completed_at: new Date().toISOString() })
        .eq("id", action.id);

      // 2) registra atualização (alimenta store_goals via trigger)
      await supabase.from("action_updates").insert({
        action_id: action.id,
        store_id: storeId,
        user_id: user.id,
        what_changed: whatChanged || null,
        metrics_delta,
        has_new_data: Object.keys(metrics_delta).length > 0,
        has_new_print: false,
        created_at: new Date(doneAt).toISOString(),
      });

      // 3) fecha o ciclo no histórico de recomendações para a IA aprender
      if (action.recommendation_id) {
        await supabase.functions.invoke("record-feedback", {
          body: {
            recommendation_id: action.recommendation_id,
            status: "aplicada",
            applied: true,
            generated_result: outcome === "positivo" ? "sim" : outcome === "negativo" ? "nao" : "nao_sei",
            outcome_explanation: whatChanged || null,
            comment: whatChanged || null,
          },
        });
      }

      toast.success("Aplicação registrada. A IA vai considerar isso na próxima análise.");
      setStep("done");
    } catch (e: any) {
      toast.error(e?.message ?? "Não conseguimos salvar agora.");
    } finally {
      setSaving(false);
    }
  };

  const reassess = async () => {
    setReassessing(true);
    const { data: sess } = await supabase
      .from("diagnosis_sessions")
      .select("id")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const res = await invokeAI<{ diagnosis: any }>("ai-consult", {
      storeId,
      sessionId: sess?.id ?? undefined,
      mode: "both",
    });
    setReassessing(false);
    if (res?.diagnosis) {
      toast.success("Reavaliação pronta!");
      onClose();
      navigate(`/app/stores/${storeId}/report`);
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Como foi essa ação?" : "Pronto! Quer reavaliar agora?"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && action && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{action.title}</p>

            <div>
              <Label className="text-xs">O que você fez exatamente?</Label>
              <Textarea
                rows={3}
                placeholder="Ex: troquei a foto dos 3 lanches mais vendidos e refiz a descrição"
                value={whatChanged}
                onChange={(e) => setWhatChanged(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quando foi feito?</Label>
                <Input type="date" value={doneAt} onChange={(e) => setDoneAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Percebeu melhora?</Label>
                <div className="flex gap-1 mt-1">
                  {(["positivo", "neutro", "negativo"] as const).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={outcome === v ? "default" : "outline"}
                      onClick={() => setOutcome(v)}
                      className="flex-1 text-xs"
                    >
                      {v === "positivo" ? "Sim" : v === "neutro" ? "Mais ou menos" : "Não"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Alguma métrica mudou? (opcional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <select
                  className="border rounded-md px-2 py-2 text-sm bg-background"
                  value={metricKey}
                  onChange={(e) => setMetricKey(e.target.value)}
                >
                  <option value="">Escolha a métrica</option>
                  {METRIC_OPTIONS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor novo"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  disabled={!metricKey}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Salvando…" : "Registrar aplicação"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3 text-sm">
            <p>
              Boa! Salvamos o que você fez. Quer pedir uma nova análise da IA agora,
              considerando essa mudança?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Agora não</Button>
              <Button onClick={reassess} disabled={reassessing} className="gradient-primary text-primary-foreground">
                <Sparkles className={`h-4 w-4 mr-1 ${reassessing ? "animate-pulse" : ""}`} />
                {reassessing ? "Reavaliando…" : "Reavaliar minha loja"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
