import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Check, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LastFeedback {
  rating?: string | null;
  applied?: boolean | null;
  comment?: string | null;
  created_at?: string;
}

interface Props {
  diagnosticId: string;
  initialFeedback?: LastFeedback | null;
}

const REASONS: { key: string; label: string }[] = [
  { key: "errada", label: "Estava errada" },
  { key: "falta_contexto", label: "Faltou contexto" },
  { key: "dificil_executar", label: "Difícil de executar" },
];

export function ProblemFeedback({ diagnosticId, initialFeedback }: Props) {
  const [last, setLast] = useState<LastFeedback | null>(initialFeedback ?? null);
  const [loading, setLoading] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const send = async (payload: Record<string, any>) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("rate-diagnostic", {
      body: { diagnosticId, ...payload },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível registrar feedback");
      return;
    }
    setLast(data?.last_feedback ?? { ...payload, created_at: new Date().toISOString() });
    toast.success("Feedback registrado — a IA vai aprender com isso.");
    setShowReasons(false);
    if (payload.comment) {
      setComment("");
      setShowComment(false);
    }
  };

  const summary = (() => {
    if (!last) return null;
    const parts: string[] = [];
    if (last.rating === "util") parts.push("Útil");
    else if (last.rating === "nao_util") parts.push("Não útil");
    else if (last.rating === "errada") parts.push("Estava errada");
    else if (last.rating === "falta_contexto") parts.push("Faltou contexto");
    else if (last.rating === "dificil_executar") parts.push("Difícil de executar");
    if (last.applied === true) parts.push("Apliquei");
    else if (last.applied === false) parts.push("Ignorei");
    return parts.join(" · ") || "Comentário enviado";
  })();

  return (
    <div className="border-t pt-4 mt-2 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Esta solução foi útil?</p>
        {summary && (
          <span className="text-xs text-muted-foreground">Seu feedback: {summary}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={last?.rating === "util" ? "default" : "outline"}
          disabled={loading} onClick={() => send({ rating: "util" })}>
          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Útil
        </Button>
        <Button size="sm" variant={last?.rating === "nao_util" ? "default" : "outline"}
          disabled={loading}
          onClick={() => { setShowReasons((v) => !v); send({ rating: "nao_util" }); }}>
          <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Não útil
        </Button>
        <Button size="sm" variant={last?.applied === true ? "default" : "outline"}
          disabled={loading} onClick={() => send({ applied: true })}>
          <Check className="h-3.5 w-3.5 mr-1" /> Apliquei
        </Button>
        <Button size="sm" variant={last?.applied === false ? "default" : "outline"}
          disabled={loading} onClick={() => send({ applied: false })}>
          <X className="h-3.5 w-3.5 mr-1" /> Ignorei
        </Button>
        <Button size="sm" variant="ghost" disabled={loading}
          onClick={() => setShowComment((v) => !v)}>
          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Comentar
        </Button>
      </div>

      {showReasons && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Motivo:</span>
          {REASONS.map((r) => (
            <Button key={r.key} size="sm" variant="outline" disabled={loading}
              onClick={() => send({ rating: r.key })}>
              {r.label}
            </Button>
          ))}
        </div>
      )}

      {showComment && (
        <div className="flex gap-2 items-end">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="O que faltou? O que aconteceu quando você tentou aplicar?"
            className="text-sm" rows={2} />
          <Button size="sm" disabled={loading || !comment.trim()}
            onClick={() => send({ comment })}>
            Enviar
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Seu feedback é anonimizado e ajuda a IA a melhorar para todas as lojas.
      </p>
    </div>
  );
}
