import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateScore } from "@/lib/diagnostics/engine";
import { ScoreBadge } from "@/components/StatusBadges";
import { ArrowRight, FileText, Target, AlertTriangle, ListTodo, Info } from "lucide-react";

export default function DiagnosisResult() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.from("diagnosis_sessions").select("*").eq("id", sessionId).single();
      if (!session?.store_id) {
        navigate("/app/dashboard");
        return;
      }
      const [s, m, p, r, c, ca, d, a] = await Promise.all([
        supabase.from("stores").select("*").eq("id", session.store_id).single(),
        supabase.from("metrics").select("*").eq("store_id", session.store_id),
        supabase.from("products").select("*").eq("store_id", session.store_id),
        supabase.from("reviews").select("*").eq("store_id", session.store_id),
        supabase.from("competitors").select("*").eq("store_id", session.store_id),
        supabase.from("campaigns").select("*").eq("store_id", session.store_id),
        supabase.from("diagnostics").select("*").eq("store_id", session.store_id).order("created_at", { ascending: false }),
        supabase.from("action_plans").select("*").eq("store_id", session.store_id).order("created_at", { ascending: false }),
      ]);
      setData({
        store: s.data,
        store_id: session.store_id,
        metrics: m.data || [],
        products: p.data || [],
        reviews: r.data || [],
        competitors: c.data || [],
        campaigns: ca.data || [],
        diagnostics: d.data || [],
        actions: a.data || [],
      });
    })();
  }, [sessionId, navigate]);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando resultado…</div>;

  const { store, products, reviews, competitors, campaigns, metrics, diagnostics, actions } = data;
  const { overall, areas } = calculateScore({ store, metrics, products, reviews, competitors, campaigns });
  const critical = diagnostics.filter((d: any) => d.severity === "critico");
  const attention = diagnostics.filter((d: any) => d.severity === "atencao");
  const visibleProblems = critical.length > 0 ? critical : attention;
  const lowDataMode = critical.length === 0 && actions.every((a: any) => a.area === "Cadastro geral" || /sem |não cadastrad|incompleto/i.test(a.title || ""));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Diagnóstico gerado!</h1>
        <p className="text-sm text-muted-foreground">{store.name} · {store.platform} · {store.city}</p>
      </div>

      <Card className="p-6 shadow-card">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Score geral</p>
            <div className="text-7xl font-bold text-gradient">{overall}</div>
            <ScoreBadge score={overall} />
          </div>
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-3">Score por área</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(areas).slice(0, 8).map(([area, score]) => (
                <div key={area} className="flex justify-between border-l-2 pl-2"
                  style={{ borderColor: (score as number) >= 80 ? "hsl(var(--success))" : (score as number) >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                  <span className="text-muted-foreground truncate">{area}</span>
                  <span className="font-semibold">{score as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {lowDataMode && (
        <Card className="p-5 border-l-4 border-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Diagnóstico limitado por falta de dados</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para um diagnóstico aprofundado, complete o cadastro abaixo. Cada item destrava novas análises.
              </p>
              <div className="flex flex-wrap gap-2">
                {products.length === 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/stores/${data.store_id}/products`}>Cadastrar produtos</Link>
                  </Button>
                )}
                {competitors.length === 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/stores/${data.store_id}/competitors`}>Cadastrar concorrentes</Link>
                  </Button>
                )}
                {metrics.length === 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/stores/${data.store_id}/metrics`}>Informar métricas</Link>
                  </Button>
                )}
                {reviews.length === 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/stores/${data.store_id}/reviews`}>Cadastrar avaliações</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${critical.length > 0 ? "text-destructive" : "text-warning"}`} />
            {critical.length > 0
              ? `Principais problemas (${critical.length})`
              : `Pontos de atenção (${attention.length})`}
          </h3>
          {visibleProblems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum problema identificado.</p>
          ) : (
            <ul className="space-y-2">
              {visibleProblems.slice(0, 5).map((d: any) => (
                <li key={d.id} className={`text-sm border-l-2 pl-3 ${critical.length > 0 ? "border-destructive" : "border-warning"}`}>
                  <p className="font-medium">{d.problem}</p>
                  <p className="text-xs text-muted-foreground">{d.area}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-success" />
            Principais oportunidades
          </h3>
          <ul className="space-y-2 text-sm">
            {Object.entries(areas)
              .filter(([, s]) => (s as number) < 70)
              .slice(0, 5)
              .map(([area, s]) => (
                <li key={area} className="border-l-2 border-warning pl-3">
                  <p className="font-medium">{area}</p>
                  <p className="text-xs text-muted-foreground">Score atual: {s as number}/100</p>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" /> Plano de ação priorizado
        </h3>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem ações sugeridas.</p>
        ) : (
          <ul className="space-y-2">
            {actions.slice(0, 6).map((a: any) => (
              <li key={a.id} className="border rounded-md p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                  </div>
                  <Badge variant={a.priority === "alta" ? "destructive" : a.priority === "media" ? "default" : "secondary"}>
                    {a.priority}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to={`/app/stores/${data.store_id}/report`}>
            <FileText className="h-4 w-4 mr-1" /> Ver relatório completo
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/stores/${data.store_id}`}>
            Ir para a loja <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/app/dashboard">Voltar ao dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
