import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionCompletionModal, CompletionAction } from "@/components/actions/ActionCompletionModal";
import { toast } from "sonner";

interface Props {
  storeId: string;
  hasDiagnostic: boolean;
}

const TERMINAL = ["aplicada", "ignorada", "rejeitada", "completed"];

const DIFICULDADE_COLOR: Record<string, string> = {
  facil: "bg-green-100 text-green-800 border-green-200",
  medio: "bg-yellow-100 text-yellow-800 border-yellow-200",
  dificil: "bg-red-100 text-red-800 border-red-200",
};
const DIFICULDADE_LABEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

function truncate(s: string, words = 8) {
  const arr = s.split(/\s+/);
  return arr.length <= words ? s : arr.slice(0, words).join(" ") + "…";
}

export function WeekActionsBlock({ storeId, hasDiagnostic }: Props) {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState<CompletionAction | null>(null);

  const { data: actions = [], refetch } = useQuery({
    queryKey: ["weekTopActions", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("action_plans")
        .select("*")
        .eq("store_id", storeId)
        .not("status", "in", `(${TERMINAL.join(",")})`)
        .order("impacto_financeiro", { ascending: false, nullsFirst: false })
        .limit(3);
      return data || [];
    },
  });

  const markDone = async (a: any) => {
    const { error } = await supabase
      .from("action_plans")
      .update({ status: "aplicada", completed_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    setCompleting({
      id: a.id,
      title: a.title,
      impacto_financeiro: a.impacto_financeiro,
      recommendation_id: a.recommendation_id,
    });
    refetch();
  };

  return (
    <section>
      <h2 className="text-xl font-bold">Faça isso esta semana</h2>
      <p className="text-sm text-muted-foreground mb-3">
        As 3 ações de maior impacto para sua loja agora.
      </p>

      {!hasDiagnostic ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm">Faça seu primeiro diagnóstico para receber seu plano.</p>
          <Button
            onClick={() => navigate("/app/diagnosis/welcome")}
            className="min-h-[48px]"
          >
            Começar diagnóstico gratuito
          </Button>
        </Card>
      ) : actions.length === 0 ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm">🎉 Todas as ações desta semana foram concluídas!</p>
          <Button
            variant="outline"
            onClick={() => navigate("/app/diagnosis/welcome")}
            className="min-h-[48px]"
          >
            Fazer novo diagnóstico
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {actions.map((a: any) => {
            const dif = (a.dificuldade || "").toLowerCase();
            return (
              <Card key={a.id} className="p-4 shadow-card">
                <h3 className="font-semibold mb-2">{truncate(a.title, 8)}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {a.impacto_financeiro != null && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      ~R$ {Number(a.impacto_financeiro).toLocaleString("pt-BR")}/mês
                    </Badge>
                  )}
                  {dif && (
                    <Badge className={DIFICULDADE_COLOR[dif] || ""} variant="outline">
                      {DIFICULDADE_LABEL[dif] || dif}
                    </Badge>
                  )}
                  {a.tempo_estimado && (
                    <Badge variant="outline">{a.tempo_estimado}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => markDone(a)}
                    className="min-h-[48px]"
                  >
                    Marcar como feito
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/app/stores/${storeId}/action-plan/${a.id}`)
                    }
                    className="min-h-[48px]"
                  >
                    Ver detalhes
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ActionCompletionModal
        action={completing}
        onClose={() => setCompleting(null)}
        onDone={() => refetch()}
      />
    </section>
  );
}
