import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateScore, scoreLabel } from "@/lib/diagnostics/engine";
import { SeverityBadge, PriorityBadge, ScoreBadge } from "@/components/StatusBadges";
import { Printer, Download, Sparkles, FileText, AlertTriangle, CheckCircle2, ArrowRight, History, Eye } from "lucide-react";
import { invokeAI } from "@/lib/ai/invokeAI";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AIConsultReport } from "@/components/report/AIConsultReport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Report() {
  const { id } = useParams();
  const data = useStoreData(id);
  const [downloading, setDownloading] = useState(false);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConsult, setAiConsult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [openHistoryItem, setOpenHistoryItem] = useState<any>(null);

  const loadReports = async () => {
    if (!id) return;
    const { data: rows } = await supabase
      .from("reports")
      .select("*")
      .eq("store_id", id)
      .order("created_at", { ascending: false });
    if (rows && rows.length > 0) {
      setLatestReport(rows[0]);
      setHistory(rows);
      const ai = (rows[0] as any).report_data?.ai_consult;
      if (ai) setAiConsult(ai);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAIConsult = async () => {
    if (!id) return;
    setAiLoading(true);
    // Busca a última sessão de diagnóstico desta loja para enriquecer a IA
    // com as respostas do funil + dados extraídos dos prints.
    const { data: sess } = await supabase
      .from("diagnosis_sessions")
      .select("id")
      .eq("store_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const res = await invokeAI<{ diagnosis: any }>("ai-consult", {
      storeId: id,
      sessionId: sess?.id ?? undefined,
    });
    if (res?.diagnosis) {
      setAiConsult(res.diagnosis);
      toast.success("Relatório gerado!");
      await loadReports();
    }
    setAiLoading(false);
  };

  const downloadPdf = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await invokeAI<{ url: string }>("generate-report-pdf", { store_id: id });
      if (res?.url) window.open(res.url, "_blank");
      else toast.error("Não foi possível gerar o PDF. Use 'Imprimir' como alternativa.");
    } catch {
      toast.error("Erro ao gerar PDF. Use 'Imprimir' como alternativa.");
    } finally {
      setDownloading(false);
    }
  };

  if (data.loading || !data.store) return <LoadingState />;

  const { store, diagnostics, actions, products, reviews } = data;
  const { areas, overall, notes } = calculateScore(data);

  const hasMinimum = products.length > 0 || reviews.length > 0 || diagnostics.length > 0;
  if (!hasMinimum) {
    return (
      <EmptyState
        icon={FileText}
        title="Cadastre dados para gerar o relatório"
        description="Rode um diagnóstico no funil ou adicione produtos/avaliações para gerar o relatório da loja."
        action={
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to={`/app/diagnosis/new`}>Novo Diagnóstico</Link>
          </Button>
        }
      />
    );
  }

  const reportData: any = latestReport?.report_data ?? {};
  const journey: any[] = reportData?.journey ?? [];
  const conversion = reportData?.conversion;
  const sevenDay: any[] = reportData?.seven_day_plan ?? [];
  const nextBest = reportData?.next_best_action;
  const sixQ = reportData?.six_questions ?? {};
  const mainBottleneck = reportData?.main_bottleneck;

  const critical = diagnostics.filter((d: any) => d.severity === "critico");
  const warn = diagnostics.filter((d: any) => d.severity === "atencao");

  // Score de oportunidade comercial: maior quanto mais críticos houver
  const opportunityScore = Math.min(
    100,
    Math.round(critical.length * 15 + warn.length * 7 + (conversion?.level === "critico" ? 25 : conversion?.level === "atencao" ? 12 : 0))
  );

  const productsToFix = products.filter((p: any) => !p.has_photo || (p.estimated_margin != null && Number(p.estimated_margin) < 20));

  const stageColor = (s: string) =>
    s === "critico" ? "border-destructive bg-destructive/5" : s === "atencao" ? "border-warning bg-warning/5" : "border-success bg-success/5";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Relatório da minha loja</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runAIConsult} disabled={aiLoading} variant="default" className="gradient-primary text-primary-foreground">
            {aiLoading ? <><Sparkles className="h-4 w-4 mr-1 animate-pulse" />Analisando…</> : <><Sparkles className="h-4 w-4 mr-1" />{aiConsult ? "Atualizar consultoria IA" : "Consultar Gestor IA"}</>}
          </Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          <Button variant="outline" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <><Sparkles className="h-4 w-4 mr-1 animate-pulse" />Gerando…</> : <><Download className="h-4 w-4 mr-1" />Baixar PDF</>}
          </Button>
        </div>
      </div>

      {aiConsult && (
        <Card className="p-6 shadow-elegant border-primary/30">
          <AIConsultReport data={aiConsult} storeId={id} />
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-6 no-print">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Histórico de relatórios</h2>
            <Badge variant="outline" className="ml-auto">{history.length}</Badge>
          </div>
          <div className="space-y-2">
            {history.map((r) => {
              const ai = r.report_data?.ai_consult;
              const date = new Date(r.created_at);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm truncate">{r.title || "Diagnóstico"}</strong>
                      {r.general_score != null && <ScoreBadge score={r.general_score} />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {ai ? " · análise IA" : " · sem IA"}
                    </p>
                  </div>
                  {ai ? (
                    <Button size="sm" variant="outline" onClick={() => setOpenHistoryItem(r)}>
                      <Eye className="h-4 w-4 mr-1" /> Abrir
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">sem IA</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={!!openHistoryItem} onOpenChange={(o) => !o && setOpenHistoryItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openHistoryItem?.title} — {openHistoryItem ? new Date(openHistoryItem.created_at).toLocaleString("pt-BR") : ""}
            </DialogTitle>
          </DialogHeader>
          {openHistoryItem?.report_data?.ai_consult && (
            <AIConsultReport data={openHistoryItem.report_data.ai_consult} storeId={id} />
          )}
        </DialogContent>
      </Dialog>


      <Card className="p-8 shadow-elegant">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <p className="text-muted-foreground">{store.platform} · {store.city} · {store.neighborhood}</p>
          <p className="text-xs text-muted-foreground mt-1">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </header>

        {/* Resumo executivo */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-2">Resumo executivo</h2>
          <p className="text-sm leading-relaxed">
            {latestReport?.executive_summary ||
              `A loja apresenta um score geral de ${overall}/100 (${scoreLabel(overall)}). Foram identificados ${critical.length} problemas críticos e ${warn.length} pontos de atenção. ${actions.length} ações foram priorizadas no plano.`}
          </p>
        </section>

        {/* Scores */}
        <section className="mb-8 grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Score de performance</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-4xl font-bold text-gradient">{overall}</div>
              <ScoreBadge score={overall} />
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Score de oportunidade comercial</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-4xl font-bold text-warning">{opportunityScore}</div>
              <span className="text-xs text-muted-foreground">{opportunityScore > 60 ? "Muitas alavancas a destravar" : opportunityScore > 30 ? "Oportunidades médias" : "Loja madura"}</span>
            </div>
          </Card>
        </section>

        {/* Gargalo principal */}
        {mainBottleneck && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Gargalo principal</h2>
            <Card className={`p-4 border-l-4 ${stageColor(mainBottleneck.status)}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <strong>{mainBottleneck.title}</strong>
              </div>
              <p className="text-sm">{mainBottleneck.bottleneck}</p>
            </Card>
          </section>
        )}

        {/* Conversão */}
        {conversion?.rate != null && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Conversão da loja</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-4xl font-bold">{conversion.rate}%</div>
              <Badge variant={conversion.level === "critico" ? "destructive" : conversion.level === "atencao" ? "secondary" : "default"}>
                {conversion.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {conversion.visits ?? "?"} visitas · {conversion.orders ?? "?"} pedidos
              </span>
            </div>
          </section>
        )}

        {/* Jornada do cliente */}
        {journey.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Diagnóstico por jornada do cliente</h2>
            <div className="space-y-2">
              {journey.map((j: any) => (
                <Card key={j.stage} className={`p-3 border-l-4 ${stageColor(j.status)}`}>
                  <div className="flex items-center justify-between">
                    <strong className="text-sm">{j.title}</strong>
                    <Badge variant={j.status === "critico" ? "destructive" : j.status === "atencao" ? "secondary" : "default"}>
                      {j.status}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">{j.bottleneck}</p>
                  <p className="text-xs text-muted-foreground mt-1">→ {j.solution}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Problemas críticos */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Problemas críticos</h2>
          {critical.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum gargalo crítico identificado.</p> :
            <ul className="space-y-3">
              {critical.map((d: any) => (
                <li key={d.id} className="text-sm border-l-4 border-destructive pl-3">
                  <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={d.severity} /><strong>{d.area}</strong></div>
                  <p>{d.problem}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.recommended_solution}</p>
                </li>
              ))}
            </ul>}
        </section>

        {/* Produtos que precisam de ajuste */}
        {productsToFix.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Produtos que precisam de ajuste</h2>
            <ul className="text-sm space-y-1">
              {productsToFix.slice(0, 8).map((p: any) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">{!p.has_photo ? "sem foto" : `margem ${Number(p.estimated_margin).toFixed(0)}%`}</Badge>
                  <span>{p.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Riscos de margem */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Riscos de margem</h2>
          <p className="text-sm text-muted-foreground">
            {diagnostics.filter((d: any) => d.area?.toLowerCase().includes("margem") || d.area?.toLowerCase().includes("lucro")).length > 0
              ? "Foram detectados riscos de margem. Use o Simulador de Precificação para reprecificar."
              : "Sem riscos críticos de margem detectados."}
          </p>
        </section>

        {/* Plano 7 dias */}
        {sevenDay.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Plano de ação de 7 dias</h2>
            <ol className="space-y-2 text-sm">
              {sevenDay.map((d: any) => (
                <li key={d.day} className="flex gap-3 border-l-2 border-primary pl-3">
                  <Badge variant="outline" className="shrink-0">Dia {d.day}</Badge>
                  <div>
                    <strong>{d.title}</strong>
                    <p className="text-xs text-muted-foreground">{d.action} — {d.area}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Próxima melhor ação */}
        {nextBest && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Próxima melhor ação</h2>
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="h-5 w-5 text-primary" />
                <strong>{nextBest.title}</strong>
              </div>
              <p className="text-sm">{nextBest.action}</p>
              <p className="text-xs text-muted-foreground mt-1">Área: {nextBest.area}</p>
            </Card>
          </section>
        )}

        {/* 6 perguntas */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Diagnóstico final em 6 perguntas</h2>
          {[
            ["Por que as pessoas não entram na loja?", sixQ.por_que_nao_entram],
            ["Por que entram e não clicam nos produtos?", sixQ.por_que_nao_clicam],
            ["Por que clicam e não compram?", sixQ.por_que_nao_compram],
            ["Por que compram pouco?", sixQ.por_que_compram_pouco],
            ["Por que não voltam?", sixQ.por_que_nao_voltam],
            ["Por que vende, mas não lucra?", sixQ.por_que_nao_lucram],
          ].map(([q, a]) =>
            a ? (
              <div key={q as string} className="border-l-4 border-primary pl-4 my-3">
                <p className="font-semibold text-sm">{q}</p>
                <p className="text-sm text-muted-foreground">{a as string}</p>
              </div>
            ) : null
          )}
        </section>

        {/* Score por área (mantém) */}
        <section className="mb-2">
          <h2 className="text-xl font-bold mb-3">Score por área</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(areas).map(([a, s]) => (
              <div key={a} className="flex justify-between border-b py-1">
                <span>{a}</span><span className="font-semibold">{s as number}</span>
              </div>
            ))}
          </div>
        </section>
      </Card>
    </div>
  );
}
