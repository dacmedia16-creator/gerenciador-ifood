import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { calculateScore } from "@/lib/diagnostics/engine";
import { ScoreBadge, SeverityBadge } from "@/components/StatusBadges";
import { ArrowRight, FileText, Sparkles, ChevronRight, Info, Target, ListTodo } from "lucide-react";
import { ProblemDetailSheet } from "@/components/diagnosis/ProblemDetailSheet";
import { ResetDiagnosisButton } from "@/components/diagnosis/ResetDiagnosisButton";

const severityRank = (s: string) => (s === "critico" ? 0 : s === "atencao" ? 1 : 2);

export default function DiagnosisResult() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.from("diagnosis_sessions").select("*").eq("id", sessionId).single();
      if (!session?.store_id) {
        navigate("/app/dashboard");
        return;
      }
      const [s, m, p, r, c, ca, d, a, lastReport] = await Promise.all([
        supabase.from("stores").select("*").eq("id", session.store_id).single(),
        supabase.from("metrics").select("*").eq("store_id", session.store_id),
        supabase.from("products").select("*").eq("store_id", session.store_id),
        supabase.from("reviews").select("*").eq("store_id", session.store_id),
        supabase.from("competitors").select("*").eq("store_id", session.store_id),
        supabase.from("campaigns").select("*").eq("store_id", session.store_id),
        supabase.from("diagnostics").select("*").eq("store_id", session.store_id).order("created_at", { ascending: false }),
        supabase.from("action_plans").select("*").eq("store_id", session.store_id).order("created_at", { ascending: false }),
        supabase.from("reports")
          .select("id, report_data, general_score, executive_summary, created_at")
          .eq("store_id", session.store_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const aiConsult = (lastReport.data?.report_data as any)?.ai_consult ?? null;
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
        aiConsult,
        lastReport: lastReport.data,
      });
    })();
  }, [sessionId, navigate]);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando resultado…</div>;

  const { store, products, reviews, competitors, campaigns, metrics, diagnostics, actions, aiConsult } = data;
  const localScore = calculateScore({ store, metrics, products, reviews, competitors, campaigns });
  // P14: prefere score da IA quando disponível
  const overall = typeof aiConsult?.overall_score === "number" ? aiConsult.overall_score : localScore.overall;
  const areas = localScore.areas;

  const sortedProblems = [...diagnostics].sort(
    (a: any, b: any) => severityRank(a.severity) - severityRank(b.severity),
  );

  const lowDataMode = sortedProblems.length === 0 || (sortedProblems.length === 1 && sortedProblems[0].area === "Cadastro geral");

  const openProblem = (d: any) => {
    setSelected(d);
    setOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico gerado!</h1>
          <p className="text-sm text-muted-foreground">{store.name} · {store.platform} · {store.city}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link to={`/app/diagnosis/${sessionId}`}>
              <Info className="h-4 w-4 mr-1" /> Adicionar mais detalhes
            </Link>
          </Button>
          <ResetDiagnosisButton storeId={data.store_id} />
        </div>
      </div>

      <Card className="p-6 shadow-card">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Score geral{aiConsult ? " (IA)" : ""}</p>
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

      {/* P1: Diagnóstico da IA (executive summary, plano 7d/30d, do not do, missing data) */}
      {aiConsult && (
        <Card className="p-6 border-primary/30 bg-primary/5 space-y-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Análise inteligente</h2>
              {aiConsult.executive_summary && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {aiConsult.executive_summary}
                </p>
              )}
            </div>
          </div>

          {Array.isArray(aiConsult.plan_7_days) && aiConsult.plan_7_days.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Plano para os próximos 7 dias</h3>
              <ol className="space-y-2">
                {aiConsult.plan_7_days.map((p: any, i: number) => (
                  <li key={i} className="text-sm border rounded-md p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">Dia {p.day}</Badge>
                      <span className="font-medium">{p.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.action}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {Array.isArray(aiConsult.plan_30_days) && aiConsult.plan_30_days.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Plano para 30 dias</h3>
              <ol className="space-y-2">
                {aiConsult.plan_30_days.map((p: any, i: number) => (
                  <li key={i} className="text-sm border rounded-md p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">Semana {p.week}</Badge>
                      <span className="font-medium">{p.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.action}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {Array.isArray(aiConsult.do_not_do_now) && aiConsult.do_not_do_now.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">O que NÃO fazer agora</h3>
              <ul className="space-y-1 text-sm">
                {aiConsult.do_not_do_now.map((it: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-destructive">✕</span>
                    <span className="text-muted-foreground">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(aiConsult.missing_data_for_better_diagnosis) && aiConsult.missing_data_for_better_diagnosis.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <span className="font-medium">Dados que melhorariam o diagnóstico: </span>
              {aiConsult.missing_data_for_better_diagnosis.join(" · ")}
            </div>
          )}
        </Card>
      )}

      {!aiConsult && (
        <Card className="p-4 border-dashed text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          A análise inteligente não está disponível neste ciclo. Você pode rodá-la novamente no relatório completo.
        </Card>
      )}

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
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="problems">
        <TabsList>
          <TabsTrigger value="problems">Problemas ({sortedProblems.length})</TabsTrigger>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
        </TabsList>

        <TabsContent value="problems" className="mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Lista de problemas identificados
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em um problema para ver a análise aprofundada e a solução individual gerada pela IA.
                </p>
              </div>
            </div>

            {sortedProblems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum problema identificado.</p>
            ) : (
              <ol className="space-y-2">
                {sortedProblems.map((d: any, i: number) => (
                  <li key={d.id}>
                    <button
                      onClick={() => openProblem(d)}
                      className="w-full text-left border rounded-md p-3 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-3 group"
                    >
                      <div className="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">{d.area}</span>
                          <SeverityBadge severity={d.severity} />
                          {d.detailed_solution && (
                            <Badge variant="secondary" className="text-[10px]">IA pronta</Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">{d.problem}</p>
                        {d.business_impact && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.business_impact}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-success" /> Principais oportunidades
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
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to={`/app/stores/${data.store_id}/action-plan`}>
            <ListTodo className="h-4 w-4 mr-1" /> Ver plano de ação
          </Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link to={`/app/stores/${data.store_id}/report`}>
            <FileText className="h-4 w-4 mr-1" /> Relatório completo
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/stores/${data.store_id}/goal`}>
            <Target className="h-4 w-4 mr-1" /> Ver minha meta
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/stores/${data.store_id}/evolution`}>
            Evolução da loja
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

      <ProblemDetailSheet diagnostic={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
