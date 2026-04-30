import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Check, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  recommendationId?: string; // se ausente, feedback fica desabilitado (relatórios antigos)
}

export function RecommendationFeedback({ recommendationId }: Props) {
  const [sent, setSent] = useState<string | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (payload: Record<string, any>, label: string) => {
    if (!recommendationId) {
      toast.info("Feedback disponível apenas em novas análises da IA.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke("record-feedback", {
      body: { recommendation_id: recommendationId, ...payload },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível registrar feedback");
      return;
    }
    setSent(label);
    toast.success("Feedback registrado — a IA vai aprender com isso.");
  };

  if (sent && !showComment) {
    return <p className="text-xs text-muted-foreground mt-2">Feedback enviado: {sent}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 items-center">
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ rating: "util" }, "Útil")}>
        <ThumbsUp className="h-3 w-3 mr-1" /> Útil
      </Button>
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ rating: "nao_util" }, "Não útil")}>
        <ThumbsDown className="h-3 w-3 mr-1" /> Não útil
      </Button>
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ applied: true }, "Apliquei")}>
        <Check className="h-3 w-3 mr-1" /> Apliquei
      </Button>
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ applied: false, rating: "nao_util" }, "Ignorei")}>
        <X className="h-3 w-3 mr-1" /> Ignorei
      </Button>
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ generated_result: "sim" }, "Funcionou")}>
        Funcionou
      </Button>
      <Button size="sm" variant="outline" disabled={loading || !recommendationId}
        onClick={() => send({ generated_result: "nao" }, "Não funcionou")}>
        Não funcionou
      </Button>
      <Button size="sm" variant="ghost" disabled={loading || !recommendationId}
        onClick={() => setShowComment((v) => !v)}>
        <AlertCircle className="h-3 w-3 mr-1" /> Comentar
      </Button>
      {showComment && (
        <div className="w-full mt-2 flex gap-2">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Faltou contexto? Era difícil de executar? Estava errada?" className="text-xs" rows={2} />
          <Button size="sm" disabled={loading || !comment.trim()}
            onClick={() => send({ comment, rating: "falta_contexto" }, "Comentário")}>
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}
