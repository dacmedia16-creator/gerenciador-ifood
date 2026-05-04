import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDraftSession, type SessionRow } from "@/lib/diagnosis/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Clock, Save, ArrowRight } from "lucide-react";

export default function DiagnosisWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SessionRow | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: generated } = await supabase
          .from("diagnosis_sessions")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["generated", "completed"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (generated?.id) {
          navigate(`/app/diagnosis/${generated.id}/result`, { replace: true });
          return;
        }
        const d = await getDraftSession(user.id);
        setDraft(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);


  const goExpress = () => {
    const qs = params.get("storeId") ? `?storeId=${params.get("storeId")}` : "";
    navigate(`/app/diagnosis/express${qs}`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 md:py-10">
      <Card className="p-6 md:p-10 space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mx-auto">
          <Sparkles className="h-3.5 w-3.5" /> Diagnóstico em 5 minutos
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Vamos entender sua loja</h1>
        <p className="text-muted-foreground">
          5 perguntas rápidas. No fim, você recebe um diagnóstico personalizado e um plano de ação.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm pt-2">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-medium">5 minutos</div>
              <div className="text-muted-foreground text-xs">Apenas 5 perguntas essenciais</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Save className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Salva sozinho</div>
              <div className="text-muted-foreground text-xs">Pause e volte quando quiser</div>
            </div>
          </div>
        </div>

        {draft && draft.current_step > 5 && (
          <div className="rounded-md bg-muted/50 border border-border p-3 text-sm text-left">
            Você tem um diagnóstico aprofundado em andamento ({draft.completion_percentage}%).{" "}
            <button className="underline text-primary" onClick={() => navigate(`/app/diagnosis/${draft.id}`)}>
              Continuar de onde parou
            </button>
          </div>
        )}

        <Button size="lg" onClick={goExpress} className="min-h-12 text-base px-8">
          Começar agora <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Card>
    </div>
  );
}
