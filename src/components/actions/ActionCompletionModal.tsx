import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompletionAction {
  id: string;
  title: string;
  impacto_financeiro?: number | null;
  recommendation_id?: string | null;
}

interface Props {
  action: CompletionAction | null;
  onClose: () => void;
  onDone?: () => void;
}

export function ActionCompletionModal({ action, onClose, onDone }: Props) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!action) return;
    setSaving(true);
    try {
      if (feedback.trim()) {
        await supabase
          .from("action_plans")
          .update({ feedback_text: feedback, has_feedback: true })
          .eq("id", action.id);
      }
      if (action.recommendation_id) {
        await supabase.functions.invoke("record-feedback", {
          body: {
            recommendation_id: action.recommendation_id,
            status: "aplicada",
            applied: true,
            generated_result: "sim",
            outcome_explanation: feedback || null,
            comment: feedback || null,
          },
        });
      }
      toast.success("Feedback salvo!");
      onDone?.();
      onClose();
      setFeedback("");
    } catch (e) {
      toast.error("Erro ao salvar feedback");
    } finally {
      setSaving(false);
    }
  };

  const impacto = action?.impacto_financeiro
    ? `R$ ${Number(action.impacto_financeiro).toLocaleString("pt-BR")}`
    : null;

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ação concluída! 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {impacto
            ? `Você pode ter recuperado até ${impacto} fazendo isso. Vamos verificar o impacto em 7 dias.`
            : "Vamos verificar o impacto em 7 dias."}
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            O que você notou de diferença? (opcional)
          </label>
          <Textarea
            placeholder="Ex: A nota subiu, tivemos menos cancelamentos..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="min-h-[48px]">
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-h-[48px]">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
