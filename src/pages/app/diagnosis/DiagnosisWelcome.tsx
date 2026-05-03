import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { createSession, getDraftSession, type SessionRow } from "@/lib/diagnosis/session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Clock, Save, Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosisWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState<SessionRow | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const d = await getDraftSession(user.id);
        setDraft(d);
      } catch (e) {
        // silencioso
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleStart = async (mode: "prints" | "form" | "both" = "both") => {
    if (!user) return;
    setStarting(true);
    try {
      const session = draft ?? (await createSession(user.id, params.get("storeId")));
      try { sessionStorage.setItem(`diagnosis:${session.id}:mode`, mode); } catch {}
      navigate(`/app/diagnosis/${session.id}?mode=${mode}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar diagnóstico");
      setStarting(false);
    }
  };

  const handleRestart = async () => {
    if (!user || !draft) return;
    if (!confirm("Recomeçar do zero? Suas respostas atuais serão descartadas.")) return;
    setStarting(true);
    try {
      await supabase.from("diagnosis_sessions").delete().eq("id", draft.id);
      const session = await createSession(user.id, params.get("storeId"));
      navigate(`/app/diagnosis/${session.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao recomeçar");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const topics = [
    "Cardápio, fotos e produtos mais vendidos",
    "Preço, lucro e valor por pedido",
    "Operação, entrega e equipe",
    "Avaliações, anúncios e fidelização",
  ];

  return (
    <div className="container max-w-3xl py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Diagnóstico inteligente
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Vamos diagnosticar sua loja</h1>
        <p className="text-muted-foreground text-lg">
          Algumas perguntas simples para entender sua operação e gerar recomendações personalizadas.
        </p>
      </div>

      <Card className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-medium">8–10 minutos</div>
              <div className="text-muted-foreground text-xs">13 etapas curtas</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Save className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Salva sozinho</div>
              <div className="text-muted-foreground text-xs">Pause e volte quando quiser</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Camera className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Envie prints</div>
              <div className="text-muted-foreground text-xs">A IA extrai os dados pra você</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-medium mb-3">O que vamos cobrir:</p>
          <ul className="space-y-2">
            {topics.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {draft && (
          <div className="rounded-md bg-muted/50 border border-border p-4 text-sm">
            <p className="font-medium mb-1">Você tem um diagnóstico em andamento</p>
            <p className="text-muted-foreground text-xs">
              Progresso atual: {draft.completion_percentage}% — etapa {draft.current_step} de 13.
            </p>
          </div>
        )}

        {draft ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => handleStart("both")} disabled={starting} size="lg" className="flex-1">
              {starting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abrindo…</>
              ) : (
                "Continuar de onde parei"
              )}
            </Button>
            <Button variant="outline" onClick={handleRestart} disabled={starting} size="lg">
              Recomeçar do zero
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Como você prefere começar?</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" size="lg" disabled={starting} onClick={() => handleStart("prints")} className="h-auto py-4 flex-col items-start gap-1 text-left">
                <span className="font-semibold">📸 Só prints</span>
                <span className="text-xs text-muted-foreground font-normal">A IA extrai os dados das suas telas</span>
              </Button>
              <Button variant="outline" size="lg" disabled={starting} onClick={() => handleStart("form")} className="h-auto py-4 flex-col items-start gap-1 text-left">
                <span className="font-semibold">📝 Só formulário</span>
                <span className="text-xs text-muted-foreground font-normal">Responda perguntas guiadas</span>
              </Button>
              <Button size="lg" disabled={starting} onClick={() => handleStart("both")} className="h-auto py-4 flex-col items-start gap-1 text-left">
                <span className="font-semibold">⚡ Prints + formulário</span>
                <span className="text-xs opacity-90 font-normal">Diagnóstico mais preciso (recomendado)</span>
              </Button>
            </div>
            {starting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Abrindo diagnóstico…
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
