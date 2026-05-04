import { Link, useNavigate, useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import {
  ActionCompletionModal,
  CompletionAction,
} from "@/components/actions/ActionCompletionModal";
import { markActionComplete } from "@/lib/actions/markComplete";
import { useAuth } from "@/hooks/useAuth";

const TERMINAL = new Set(["aplicada", "ignorada", "rejeitada", "completed"]);

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

type Filter = "todas" | "facil" | "medio" | "dificil" | "concluidas";

function toolForAction(a: any, storeId: string): { label: string; url: string } | null {
  const text = `${a.area || ""} ${a.title || ""} ${a.description || ""}`.toLowerCase();
  if (/(pre[çc]o|margem|lucro|simulador)/.test(text))
    return { label: "Simulador de preço", url: `/app/stores/${storeId}/pricing-simulator` };
  if (/(nome|seo|t[íi]tulo|cardap|menu)/.test(text))
    return { label: "Otimizador de nomes", url: `/app/stores/${storeId}/product-names` };
  if (/(hor[áa]rio|abertura|funcionamento)/.test(text))
    return { label: "Melhor horário", url: `/app/stores/${storeId}/best-hours` };
  if (/(foto|expectativa|imagem|descri[çc][ãa]o)/.test(text))
    return { label: "Expectativa × Entrega", url: `/app/stores/${storeId}/expectation` };
  return null;
}

function truncate(s: string, words = 8) {
  const arr = (s || "").split(/\s+/);
  return arr.length <= words ? s : arr.slice(0, words).join(" ") + "…";
}

export default function ActionPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { actions, loading, reload } = useStoreData(id);
  const [filter, setFilter] = useState<Filter>("todas");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<CompletionAction | null>(null);

  if (loading) return <LoadingState />;

  const list = (actions || []) as any[];
  const pending = list.filter((a) => !TERMINAL.has(a.status));
  const totalImpact = pending.reduce(
    (sum, a) => sum + Number(a.impacto_financeiro || 0),
    0
  );

  const filtered = list.filter((a) => {
    const isDone = TERMINAL.has(a.status);
    if (filter === "concluidas") return isDone;
    if (isDone) return false;
    if (filter === "todas") return true;
    return (a.dificuldade || "").toLowerCase() === filter;
  });

  const handleComplete = async (a: any) => {
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
    reload();
  };

  const renderCard = (a: any) => {
    const isDone = TERMINAL.has(a.status);
    const dif = (a.dificuldade || "").toLowerCase();
    const tool = id ? toolForAction(a, id) : null;
    const open = !!expanded[a.id];

    return (
      <Card
        key={a.id}
        className={`p-4 shadow-card ${isDone ? "opacity-60" : ""}`}
      >
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <Checkbox
              checked={isDone}
              disabled={isDone}
              onCheckedChange={() => !isDone && handleComplete(a)}
              className="h-6 w-6"
              aria-label="Marcar como feito"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold">{truncate(a.title, 8)}</h3>
              {a.impacto_financeiro != null && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  ~R$ {Number(a.impacto_financeiro).toLocaleString("pt-BR")}/mês
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {dif && (
                <Badge variant="outline" className={DIFICULDADE_COLOR[dif] || ""}>
                  {DIFICULDADE_LABEL[dif] || dif}
                </Badge>
              )}
              {a.tempo_estimado && (
                <Badge variant="outline">{a.tempo_estimado}</Badge>
              )}
              {a.categoria && <Badge variant="secondary">{a.categoria}</Badge>}
            </div>

            {isDone && (
              <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                {a.completed_at && (
                  <span>
                    Concluída em{" "}
                    {new Date(a.completed_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {a.has_feedback && <span>✓ Você reportou melhora</span>}
              </div>
            )}

            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [a.id]: !open }))}
              className="mt-3 text-xs text-primary inline-flex items-center gap-1 hover:underline min-h-[40px]"
            >
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {open ? "Ocultar detalhes" : "Ver detalhes"}
            </button>

            {open && (
              <div className="mt-3 space-y-2 text-sm border-t pt-3">
                {a.description && (
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground">
                      Problema
                    </p>
                    <p>{a.description}</p>
                  </div>
                )}
                {a.why_it_matters && (
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground">
                      Causa identificada
                    </p>
                    <p>{a.why_it_matters}</p>
                  </div>
                )}
                {a.how_to_apply && (
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground">
                      Passo a passo
                    </p>
                    <p className="whitespace-pre-line">{a.how_to_apply}</p>
                  </div>
                )}
                {tool && (
                  <Button asChild size="sm" variant="secondary" className="min-h-[48px]">
                    <Link to={tool.url}>Abrir {tool.label}</Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="min-h-[48px]"
                >
                  <Link to={`/app/stores/${id}/action-plan/${a.id}`}>
                    Página completa →
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "facil", label: "Fácil" },
    { key: "medio", label: "Médio" },
    { key: "dificil", label: "Difícil" },
    { key: "concluidas", label: "Concluídas" },
  ];

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Seu Plano de Ação</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} ações pendentes
          {totalImpact > 0 &&
            ` · Impacto total estimado: ~R$ ${totalImpact.toLocaleString("pt-BR")}/mês`}
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-full text-sm border min-h-[40px] ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Seu plano de ação aparece aqui após o diagnóstico.
          </p>
          <Button
            onClick={() => navigate("/app/diagnosis/welcome")}
            className="min-h-[48px]"
          >
            Fazer diagnóstico agora
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma ação neste filtro.
        </Card>
      ) : (
        <div className="space-y-3">{filtered.map(renderCard)}</div>
      )}

      <button
        type="button"
        onClick={() => navigate("/app/diagnosis/welcome")}
        className="fixed bottom-6 right-6 z-40 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3 flex items-center gap-2 min-h-[48px] hover:opacity-90"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium">Novo diagnóstico</span>
      </button>

      <ActionCompletionModal
        action={completing}
        onClose={() => setCompleting(null)}
        onDone={() => reload()}
      />
    </div>
  );
}
