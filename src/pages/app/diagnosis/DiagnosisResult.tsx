import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateScore } from "@/lib/diagnostics/engine";
import { ScoreBadge, SeverityBadge } from "@/components/StatusBadges";
import { ArrowRight, Sparkles, ChevronRight, Info, ListTodo, MapPin } from "lucide-react";
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
  const urgent = areaEntries.filter((e) => e.score < 50).sort((a, b) => b.leak - a.leak || a.score - b.score);
  const improving = areaEntries.filter((e) => e.score >= 50 && e.score < 75).sort((a, b) => a.score - b.score);
  const ok = areaEntries.filter((e) => e.score >= 75).sort((a, b) => b.score - a.score);

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

      {/* SCORE GERAL */}
      <Card className="p-6 shadow-elegant">
        <div className="text-center space-y-3">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-7xl sm:text-8xl font-bold text-gradient leading-none">{overall}</span>
          </div>
          <p className="text-sm text-muted-foreground">de 100 pontos possíveis</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <ScoreBadge score={overall} />
            {delta !== null && delta !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                  delta > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {delta > 0 ? "▲" : "▼"} {delta > 0 ? "+" : ""}{delta} esta semana
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {benchDelta < -5 ? "Abaixo" : benchDelta > 5 ? "Acima" : "Próximo"} da média de{" "}
            <span className="font-medium">{benchmark.label}s</span> ({benchmark.avgScore} pts)
          </p>
        </div>
        {totalLeak > 0 && (
          <div className="mt-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-center text-sm">
            💸 Você pode estar perdendo <span className="font-bold">~{fmtBRL(totalLeak)}/mês</span>
          </div>
        )}
      </Card>


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

      {/* MELHORE A PRECISÃO DO DIAGNÓSTICO */}
      {missingData.length > 0 && (
        <Card className="p-5 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-blue-900">Melhore a precisão do diagnóstico</h3>
              <p className="text-sm text-blue-900/80 mb-3">
                Adicionando mais dados, a IA consegue calcular seu lucro real e dar recomendações mais específicas.
              </p>
              <ul className="list-disc list-inside text-sm text-blue-900/80 mb-3 space-y-0.5">
                {missingData.slice(0, 5).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <Button size="sm" asChild>
                <Link to={`/app/diagnosis/${sessionId}`}>
                  Adicionar dados <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ANÁLISE INTELIGENTE */}
      {aiConsult ? (
        <Card className="p-6 border-primary/30 bg-primary/5 space-y-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Análise do consultor</h2>
              {aiConsult.executive_summary && (
                <p className="text-base mt-2 whitespace-pre-wrap leading-relaxed">
                  {aiConsult.executive_summary}
                </p>
              )}
            </div>
          </div>

          {Array.isArray(aiConsult.plan_7_days) && aiConsult.plan_7_days.length > 0 && (
            <div>
              <p className="font-bold text-base mb-3">O que fazer agora — em ordem de prioridade:</p>
              <ol className="space-y-3">
                {aiConsult.plan_7_days.map((p: any, i: number) => {
                  const steps: string[] = Array.isArray(p.steps) ? p.steps : [];
                  const where = p.where_to_do || p.onde_fazer;
                  return (
                    <li key={i} className="text-sm border rounded-md p-3 bg-background">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">Dia {p.day}</Badge>
                        <span className="font-bold text-base">{p.title}</span>
                        {p.time_minutes ? (
                          <Badge variant="secondary" className="text-[10px]">⏱ {p.time_minutes} min</Badge>
                        ) : null}
                      </div>
                      {where && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <MapPin className="h-3 w-3" /> {where}
                        </p>
                      )}
                      {steps.length > 0 ? (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-primary font-medium select-none list-none">
                            Ver passo a passo <span className="group-open:hidden">▾</span><span className="hidden group-open:inline">▴</span>
                          </summary>
                          <ol className="mt-2 space-y-1 text-sm list-decimal list-inside text-muted-foreground">
                            {steps.map((s, j) => <li key={j}>{s}</li>)}
                          </ol>
                        </details>
                      ) : (
                        <p className="text-xs text-muted-foreground">{p.action}</p>
                      )}
                      {p.expected_impact && (
                        <p className="text-success italic text-sm mt-2">
                          Resultado esperado: {p.expected_impact}
                        </p>
                      )}
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

      {/* RODAPÉ DE NAVEGAÇÃO */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-[280px] h-14 text-base gradient-primary text-primary-foreground shadow-elegant">
          <Link to={`/app/stores/${data.store_id}/action-plan`}>
            <ListTodo className="h-5 w-5 mr-2" /> Ir para o Plano de Ação <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 text-sm flex-wrap justify-center">
          <Link to={`/app/stores/${data.store_id}/report`} className="text-muted-foreground hover:text-foreground">
            Relatório completo
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to={`/app/stores/${data.store_id}/evolution`} className="text-muted-foreground hover:text-foreground">
            Evolução da loja
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/app/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </div>

      <ProblemDetailSheet diagnostic={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
