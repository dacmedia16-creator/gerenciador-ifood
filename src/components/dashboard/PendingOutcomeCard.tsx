import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowUp, ArrowRight, ArrowDown, BarChart3 } from "lucide-react";

type Trend = "up" | "same" | "down";

interface Outcome {
  id: string;
  action_id: string;
  store_id: string;
  action_title?: string | null;
}

export function PendingOutcomeCard() {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rating, setRating] = useState<Trend | null>(null);
  const [orders, setOrders] = useState<Trend | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("action_outcomes")
        .select("id, action_id, store_id, action_plans(title)")
        .eq("user_id", user.id)
        .is("responded_at", null)
        .lte("followup_at", new Date().toISOString())
        .order("followup_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        setOutcome({
          id: data.id,
          action_id: data.action_id,
          store_id: data.store_id,
          action_title: (data as any).action_plans?.title ?? null,
        });
      }
    })();
  }, [user]);

  if (!outcome) return null;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("action_outcomes")
        .update({
          rating_changed: rating,
          orders_changed: orders,
          notes: notes || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", outcome.id);
      if (error) throw error;
      // Manda também para record-feedback (best-effort)
      supabase.functions
        .invoke("record-feedback", {
          body: {
            outcome_id: outcome.id,
            action_id: outcome.action_id,
            store_id: outcome.store_id,
            rating_changed: rating,
            orders_changed: orders,
            comment: notes || null,
            outcome_explanation: notes || null,
          },
        })
        .catch(() => void 0);
      toast.success("Obrigado! Isso ajuda a melhorar as próximas recomendações para sua loja. 🙏");
      setOutcome(null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar resposta");
    } finally {
      setSaving(false);
    }
  };

  const TrendBtn = ({
    value,
    selected,
    onClick,
    label,
    icon,
  }: {
    value: Trend;
    selected: Trend | null;
    onClick: (v: Trend) => void;
    label: string;
    icon: React.ReactNode;
  }) => (
    <Button
      type="button"
      variant={selected === value ? "default" : "outline"}
      size="sm"
      className="flex-1"
      onClick={() => onClick(value)}
    >
      {icon} <span className="ml-1">{label}</span>
    </Button>
  );

  return (
    <Card className="p-5 border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3 mb-3">
        <BarChart3 className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-900">
            Como foi a ação que você fez há 7 dias?
          </h3>
          {outcome.action_title && (
            <p className="text-sm text-amber-900/80 mt-0.5">"{outcome.action_title}"</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-amber-900 mb-1.5">Sua nota mudou desde então?</p>
          <div className="flex gap-2">
            <TrendBtn value="up" selected={rating} onClick={setRating} label="Subiu" icon={<ArrowUp className="h-4 w-4" />} />
            <TrendBtn value="same" selected={rating} onClick={setRating} label="Igual" icon={<ArrowRight className="h-4 w-4" />} />
            <TrendBtn value="down" selected={rating} onClick={setRating} label="Caiu" icon={<ArrowDown className="h-4 w-4" />} />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-amber-900 mb-1.5">Seus pedidos mudaram?</p>
          <div className="flex gap-2">
            <TrendBtn value="up" selected={orders} onClick={setOrders} label="Aumentaram" icon={<ArrowUp className="h-4 w-4" />} />
            <TrendBtn value="same" selected={orders} onClick={setOrders} label="Igual" icon={<ArrowRight className="h-4 w-4" />} />
            <TrendBtn value="down" selected={orders} onClick={setOrders} label="Caíram" icon={<ArrowDown className="h-4 w-4" />} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-amber-900 mb-1 block">
            Quer contar o que aconteceu? (opcional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Conte o que mudou ou o que ainda travou…"
            className="bg-white"
          />
        </div>

        <Button
          onClick={save}
          disabled={saving || (!rating && !orders && !notes.trim())}
          className="w-full sm:w-auto"
        >
          Salvar resposta
        </Button>
      </div>
    </Card>
  );
}
