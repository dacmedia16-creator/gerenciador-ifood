import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { ProposedAnswer } from "@/lib/diagnosis/printMapper";
import { computeStepCompletion } from "@/lib/diagnosis/session";

interface Props {
  sessionId: string;
  userId: string;
  storeId?: string | null;
  proposals: ProposedAnswer[];
  allAnswers: Record<string, Record<string, any>>;
  onApplied: (applied: ProposedAnswer[]) => void;
  onIgnore: () => void;
}

export function PrintProposalsCard({
  sessionId,
  userId,
  storeId,
  proposals,
  allAnswers,
  onApplied,
  onIgnore,
}: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(proposals.map((p) => [`${p.stepKey}.${p.questionKey}`, true])),
  );
  const [saving, setSaving] = useState(false);

  const count = proposals.length;
  if (count === 0) return null;

  const apply = async (toApply: ProposedAnswer[]) => {
    if (!toApply.length) return;
    setSaving(true);
    try {
      const rows = toApply.map((p) => ({
        session_id: sessionId,
        user_id: userId,
        store_id: storeId ?? null,
        step_key: p.stepKey,
        question_key: p.questionKey,
        answer_value: p.value as any,
        answer_type: typeof p.value,
      }));
      const { error } = await supabase
        .from("diagnosis_answers")
        .upsert(rows, { onConflict: "session_id,step_key,question_key" });
      if (error) throw error;

      // Recalcula step_status para etapas afetadas
      const stepsTouched = Array.from(new Set(toApply.map((p) => p.stepKey)));
      const merged: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(allAnswers));
      for (const p of toApply) {
        merged[p.stepKey] = { ...(merged[p.stepKey] || {}), [p.questionKey]: p.value };
      }
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
      }

      toast.success(`${toApply.length} ${toApply.length === 1 ? "campo preenchido" : "campos preenchidos"} a partir dos prints. Confira antes de avançar.`);
      onApplied(toApply);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao aplicar dados");
    } finally {
      setSaving(false);
    }
  };

  const applyAll = () => apply(proposals);
  const applySelected = () => apply(proposals.filter((p) => selected[`${p.stepKey}.${p.questionKey}`]));

  const grouped = useMemo(() => {
    const m: Record<string, ProposedAnswer[]> = {};
    for (const p of proposals) {
      if (!m[p.stepKey]) m[p.stepKey] = [];
      m[p.stepKey].push(p);
    }
    return m;
  }, [proposals]);

  const stepLabels: Record<string, string> = {
    basic: "Sobre a loja",
    storefront: "Vitrine",
    menu: "Cardápio",
    delivery: "Entrega",
  };

  return (
    <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">Encontramos dados nos seus prints</h3>
              <p className="text-sm text-muted-foreground">
                Detectamos {count} {count === 1 ? "campo" : "campos"} que podem ser preenchidos automaticamente. Deseja aplicar no diagnóstico?
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onIgnore} aria-label="Ignorar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!reviewing && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={applyAll} disabled={saving}>
                Aplicar tudo ({count})
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReviewing(true)} disabled={saving}>
                Revisar antes
              </Button>
              <Button size="sm" variant="ghost" onClick={onIgnore} disabled={saving}>
                Ignorar
              </Button>
            </div>
          )}

          {reviewing && (
            <div className="mt-3 space-y-3">
              {Object.entries(grouped).map(([sk, items]) => (
                <div key={sk}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {stepLabels[sk] || sk}
                  </div>
                  <div className="space-y-1">
                    {items.map((p) => {
                      const k = `${p.stepKey}.${p.questionKey}`;
                      return (
                        <label key={k} className="flex items-start gap-2 p-2 rounded hover:bg-background/60 cursor-pointer">
                          <Checkbox
                            checked={!!selected[k]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [k]: !!v }))}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{p.label}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>→ {p.displayValue}</span>
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{p.source}</Badge>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Button size="sm" onClick={applySelected} disabled={saving}>
                  Aplicar selecionados
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReviewing(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
