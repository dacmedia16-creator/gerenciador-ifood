import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateScore } from "@/lib/diagnostics/engine";
import { ScoreBadge, SeverityBadge } from "@/components/StatusBadges";
import { ArrowRight, FileText, Sparkles, ChevronRight, Info, ListTodo, AlertTriangle, Lightbulb, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { ProblemDetailSheet } from "@/components/diagnosis/ProblemDetailSheet";
import { ResetDiagnosisButton } from "@/components/diagnosis/ResetDiagnosisButton";
import { getBenchmark } from "@/lib/benchmarks";

const severityRank = (s: string) => (s === "critico" ? 0 : s === "atencao" ? 1 : 2);

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Tenta achar um money_leak relacionado a uma área pelo nome
function findLeakForArea(area: string, leaks: any[]): number {
  if (!Array.isArray(leaks)) return 0;
  const norm = area.toLowerCase();
  const matchers: Record<string, string[]> = {
    entrega: ["entrega", "delivery", "tempo"],
    cancelamentos: ["cancel"],
    "preço e margem": ["margem", "preço", "preco", "lucro"],
    cardápio: ["cardápio", "cardapio", "menu", "combo"],
    fotos: ["foto", "imagem"],
    promoções: ["promo", "cupom", "desconto"],
    avaliações: ["avaliação", "avaliacao", "nota", "review"],
    anúncios: ["anúncio", "anuncio", "ads", "campanha"],
    concorrência: ["concorr"],
    vitrine: ["vitrine", "capa", "banner"],
    recompra: ["recompra", "fideliz"],
  };
  const keys = matchers[norm] || [norm];
  return leaks
    .filter((l) =>
      keys.some((k) => (l.where || "").toLowerCase().includes(k) || (l.why || "").toLowerCase().includes(k)),
    )
    .reduce((s, l) => s + (Number(l.monthly_estimate_brl) || 0), 0);
}

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
      const [s, m, p, r, c, ca, d, a, lastReports] = await Promise.all([
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
          .limit(2),
      ]);
      const reports = lastReports.data || [];
      const aiConsult = (reports[0]?.report_data as any)?.ai_consult ?? null;
      const previousScore = reports[1]?.general_score ?? null;
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
        lastReport: reports[0],
        previousScore,
      });
    })();
  }, [sessionId, navigate]);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando resultado…</div>;

  const { store, products, reviews, competitors, campaigns, metrics, diagnostics, aiConsult, previousScore } = data;
  const localScore = calculateScore({ store, metrics, products, reviews, competitors, campaigns });
  const overall = typeof aiConsult?.overall_score === "number" ? aiConsult.overall_score : localScore.overall;
  const areas = localScore.areas;
  const delta = previousScore != null ? overall - previousScore : null;

  const benchmark = getBenchmark(store?.category);
  const benchDelta = overall - benchmark.avgScore;

  const moneyLeaks: any[] = Array.isArray(aiConsult?.money_leaks) ? aiConsult.money_leaks : [];
  const totalLeak = moneyLeaks.reduce((s, l) => s + (Number(l.monthly_estimate_brl) || 0), 0);

  // Agrupar áreas por urgência
  const areaEntries = Object.entries(areas).map(([area, score]) => ({
    area,
    score: score as number,
    leak: findLeakForArea(area, moneyLeaks),
  }));
  const urgent = areaEntries.filter((e) => e.score < 50 || e.leak > 0).sort((a, b) => b.leak - a.leak || a.score - b.score);
  const improving = areaEntries.filter((e) => !urgent.includes(e) && e.score < 70).sort((a, b) => a.score - b.score);
  const ok = areaEntries.filter((e) => !urgent.includes(e) && !improving.includes(e)).sort((a, b) => b.score - a.score);

  const sortedProblems = [...diagnostics].sort(
    (a: any, b: any) => severityRank(a.severity) - severityRank(b.severity),
  );

  const missingData: string[] = Array.isArray(aiConsult?.missing_data_for_better_diagnosis)
    ? aiConsult.missing_data_for_better_diagnosis
    : [];

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
        <ResetDiagnosisButton storeId={data.store_id} />
      </div>

      {/* SCORE COM CONTEXTO */}
      <Card className="p-6 shadow-elegant">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-1">Score da sua loja</p>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <span className="text-7xl font-bold text-gradient leading-none">{overall}</span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <div className="mt-2 flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <ScoreBadge score={overall} />
              {delta !== null && delta !== 0 && (
                <span className={`text-sm font-medium flex items-center gap-1 ${delta > 0 ? "text-success" : "text-destructive"}`}>
                  {delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {delta > 0 ? "+" : ""}{delta} vs último diagnóstico
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className={`flex items-start gap-2 p-3 rounded-md border ${benchDelta < -5 ? "border-destructive/40 bg-destructive/5" : benchDelta > 5 ? "border-success/40 bg-success/5" : "border-muted bg-muted/30"}`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${benchDelta < -5 ? "text-destructive" : "text-muted-foreground"}`} />
              <p className="text-sm">
                {benchDelta < -5 ? "Abaixo" : benchDelta > 5 ? "Acima" : "Próximo"} da média de{" "}
                <span className="font-semibold">{benchmark.label}s</span> ({benchmark.avgScore} pontos)
              </p>
            </div>
            {totalLeak > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-orange-500/40 bg-orange-500/5">
                <span className="text-orange-600 text-lg leading-none">💸</span>
                <p className="text-sm">
                  Você está deixando <span className="font-bold text-orange-700">~{fmtBRL(totalLeak)}/mês</span> na mesa.
                  <span className="text-muted-foreground"> Veja o que resolver primeiro abaixo.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* CARD MELHORAR DIAGNÓSTICO (topo) */}
      {missingData.length > 0 && (
        <Card className="p-5 border-primary/40 bg-primary/5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Melhore a precisão do diagnóstico</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Adicionando {missingData.slice(0, 3).join(", ")}
                {missingData.length > 3 ? ` e mais ${missingData.length - 3}` : ""}, a IA consegue
                calcular seu lucro real e dar recomendações mais específicas.
              </p>
              <Button size="sm" asChild>
                <Link to={`/app/diagnosis/${sessionId}`}>
                  Adicionar mais dados <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* SCORE POR ÁREA — agrupado por impacto */}
      <Card className="p-5 shadow-card">
        <h2 className="font-semibold mb-4">Onde focar primeiro</h2>
        <div className="space-y-5">
          {urgent.length > 0 && (
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wide mb-2">🔴 Resolver agora</p>
              <ul className="space-y-1.5">
                {urgent.map((e) => (
                  <li key={e.area} className="flex items-center justify-between gap-2 p-2 rounded border border-destructive/30 bg-destructive/5">
                    <span className="text-sm font-medium">{e.area}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-destructive">{e.score}</span>
                      {e.leak > 0 && (
                        <span className="text-xs text-orange-700 font-medium">custa ~{fmtBRL(e.leak)}/mês</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {improving.length > 0 && (
            <div>
              <p className="text-xs font-bold text-warning uppercase tracking-wide mb-2">🟡 Melhorar em breve</p>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {improving.map((e) => (
                  <li key={e.area} className="flex items-center justify-between gap-2 p-2 rounded border bg-warning/5">
                    <span className="text-sm">{e.area}</span>
                    <span className="font-semibold text-warning">{e.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ok.length > 0 && (
            <div>
              <p className="text-xs font-bold text-success uppercase tracking-wide mb-2">🟢 Está bem — manter</p>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {ok.map((e) => (
                  <li key={e.area} className="flex items-center justify-between gap-2 p-2 rounded border bg-success/5">
                    <span className="text-sm text-muted-foreground">{e.area}</span>
                    <span className="font-semibold text-success">{e.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* ANÁLISE INTELIGENTE */}
      {aiConsult ? (
        <Card className="p-6 border-primary/30 bg-primary/5 space-y-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Análise do consultor</h2>
              {aiConsult.executive_summary && (
                <p className="text-[15px] mt-2 whitespace-pre-wrap leading-relaxed">
                  {aiConsult.executive_summary}
                </p>
              )}
            </div>
          </div>

          {Array.isArray(aiConsult.plan_7_days) && aiConsult.plan_7_days.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Plano para os próximos 7 dias</h3>
              <ol className="space-y-3">
                {aiConsult.plan_7_days.map((p: any, i: number) => {
                  const steps: string[] = Array.isArray(p.steps) ? p.steps : [];
                  return (
                    <li key={i} className="text-sm border rounded-md p-3 bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">Dia {p.day}</Badge>
                        <span className="font-medium">{p.title}</span>
                      </div>
                      {steps.length > 0 ? (
                        <ol className="space-y-1 text-sm list-decimal list-inside text-muted-foreground">
                          {steps.map((s, j) => <li key={j}>{s}</li>)}
                        </ol>
                      ) : (
                        <p className="text-xs text-muted-foreground">{p.action}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground border-t pt-2">
                        {p.time_minutes ? (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.time_minutes} min</span>
                        ) : null}
                        {p.expected_impact && (
                          <span className="text-success font-medium">Impacto: {p.expected_impact}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {Array.isArray(aiConsult.plan_30_days) && aiConsult.plan_30_days.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Plano para 30 dias</h3>
              <ol className="space-y-2">
                {aiConsult.plan_30_days.map((p: any, i: number) => {
                  const actions: string[] = Array.isArray(p.actions) ? p.actions : [];
                  return (
                    <li key={i} className="text-sm border rounded-md p-3 bg-background">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">Semana {p.week}</Badge>
                        <span className="font-medium">{p.objective || p.title}</span>
                      </div>
                      {actions.length > 0 ? (
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-1">
                          {actions.slice(0, 2).map((a, j) => <li key={j}>{a}</li>)}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">{p.action}</p>
                      )}
                    </li>
                  );
                })}
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
        </Card>
      ) : (
        <Card className="p-4 border-dashed text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          A análise inteligente não está disponível neste ciclo. Você pode rodá-la novamente no relatório completo.
        </Card>
      )}

      {/* LISTA DE PROBLEMAS */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Problemas identificados ({sortedProblems.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Clique para ver a análise aprofundada e a solução individual.
          </p>
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

      {/* CTA — 1 botão primário */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-[280px] h-14 text-base gradient-primary text-primary-foreground shadow-elegant">
          <Link to={`/app/stores/${data.store_id}/action-plan`}>
            <ListTodo className="h-5 w-5 mr-2" /> Ir para o Plano de Ação
          </Link>
        </Button>
        <div className="flex items-center gap-4 text-sm">
          <Link to={`/app/stores/${data.store_id}/report`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <FileText className="h-4 w-4" /> Ver relatório completo
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/app/dashboard" className="text-muted-foreground hover:text-foreground">
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      <ProblemDetailSheet diagnostic={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
