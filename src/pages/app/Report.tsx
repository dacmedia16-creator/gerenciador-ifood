import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateScore, scoreLabel } from "@/lib/diagnostics/engine";
import { SeverityBadge, PriorityBadge, ScoreBadge } from "@/components/StatusBadges";
import { Printer, Download, Sparkles, FileText } from "lucide-react";
import { invokeAI } from "@/lib/ai/invokeAI";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

export default function Report() {
  const { id } = useParams();
  const data = useStoreData(id);
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await invokeAI<{ url: string }>("generate-report-pdf", { store_id: id });
      if (res?.url) window.open(res.url, "_blank");
      else {
        toast.error("Não foi possível gerar o PDF. Use 'Imprimir' como alternativa.");
      }
    } catch {
      toast.error("Erro ao gerar PDF. Use 'Imprimir' como alternativa.");
    } finally {
      setDownloading(false);
    }
  };

  if (data.loading || !data.store) return <LoadingState />;

  const { store, diagnostics, actions, products, reviews } = data;
  const { areas, overall, notes } = calculateScore(data);

  const hasMinimum = products.length > 0 || reviews.length > 0;
  if (!hasMinimum) {
    return (
      <EmptyState
        icon={FileText}
        title="Cadastre dados para gerar o relatório"
        description="Adicione produtos, avaliações ou métricas — ou carregue uma loja demo — para gerar um relatório consultivo."
        action={
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to={`/app/stores/${id}/uploads`}>Importar dados</Link>
          </Button>
        }
      />
    );
  }

  const critical = diagnostics.filter((d: any) => d.severity === "critico");
  const warn = diagnostics.filter((d: any) => d.severity === "atencao");

  // Top oportunidades = ações de alta prioridade ou impacto alto/médio
  const opportunities = [...actions]
    .sort((a: any, b: any) => {
      const order: any = { alta: 0, media: 1, baixa: 2 };
      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    })
    .slice(0, 5);

  // Áreas mais fracas → recomendações estratégicas
  const weakestAreas = Object.entries(areas)
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .slice(0, 3);

  const answer = (q: string, txt: string) => (
    <div className="border-l-4 border-primary pl-4 my-3">
      <p className="font-semibold">{q}</p>
      <p className="text-sm text-muted-foreground">{txt}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Relatório consultivo</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          <Button onClick={downloadPdf} disabled={downloading} className="gradient-primary text-primary-foreground">
            {downloading ? <><Sparkles className="h-4 w-4 mr-1 animate-pulse" />Gerando…</> : <><Download className="h-4 w-4 mr-1" />Baixar PDF</>}
          </Button>
        </div>
      </div>

      <Card className="p-8 shadow-elegant">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <p className="text-muted-foreground">{store.platform} · {store.city} · {store.neighborhood}</p>
          <p className="text-xs text-muted-foreground mt-1">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </header>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-2">Resumo executivo</h2>
          <p className="text-sm">
            A loja apresenta um score geral de <strong>{overall}/100 ({scoreLabel(overall)})</strong>.
            Foram identificados <strong>{critical.length} problemas críticos</strong> e <strong>{warn.length} pontos de atenção</strong> distribuídos
            entre {Object.keys(areas).length} áreas analisadas. {actions.length} ações foram priorizadas no plano,
            das quais destacamos as <strong>5 principais oportunidades</strong> abaixo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Score geral</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl font-bold text-gradient">{overall}</div>
            <ScoreBadge score={overall} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(areas).map(([a, s]) => (
              <div key={a} className="flex justify-between border-b py-1">
                <span>{a}</span><span className="font-semibold">{s}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Principais gargalos</h2>
          {critical.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum gargalo crítico.</p> :
            <ul className="space-y-3">
              {critical.map((d: any) => (
                <li key={d.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={d.severity} /><strong>{d.area}</strong></div>
                  <p>{d.problem} — {d.recommended_solution}</p>
                </li>
              ))}
            </ul>}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Principais oportunidades</h2>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem oportunidades pendentes — execute ou rode novo diagnóstico.</p>
          ) : (
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {opportunities.map((a: any) => (
                <li key={a.id}>
                  <strong>{a.title}</strong> <PriorityBadge priority={a.priority} />{" "}
                  <span className="text-muted-foreground">— {a.area}</span>
                  {a.description && <p className="ml-5 text-xs text-muted-foreground">{a.description}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Recomendações estratégicas</h2>
          <ul className="space-y-2 text-sm">
            {weakestAreas.map(([area, score]) => (
              <li key={area} className="border-l-2 border-warning pl-3">
                <p><strong>{area}</strong> — score atual {String(score)}.</p>
                <p className="text-muted-foreground text-xs">{notes?.[area] ?? "Atue nesta área no próximo ciclo."}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Plano de ação priorizado</h2>
          <ol className="space-y-2 text-sm list-decimal list-inside">
            {actions.slice(0, 10).map((a: any) => (
              <li key={a.id}><strong>{a.title}</strong> <PriorityBadge priority={a.priority} /> <span className="text-muted-foreground">— {a.area}</span></li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Próximos passos (30 / 60 / 90 dias)</h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <Card className="p-3">
              <p className="font-semibold mb-2">30 dias — quick wins</p>
              <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                {actions.filter((a: any) => a.priority === "alta").slice(0, 3).map((a: any) => <li key={a.id}>{a.title}</li>)}
                {actions.filter((a: any) => a.priority === "alta").length === 0 && <li>Sem ações de alta prioridade.</li>}
              </ul>
            </Card>
            <Card className="p-3">
              <p className="font-semibold mb-2">60 dias — operação</p>
              <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                {actions.filter((a: any) => a.priority === "media").slice(0, 3).map((a: any) => <li key={a.id}>{a.title}</li>)}
                {actions.filter((a: any) => a.priority === "media").length === 0 && <li>Sem ações de média prioridade.</li>}
              </ul>
            </Card>
            <Card className="p-3">
              <p className="font-semibold mb-2">90 dias — crescimento</p>
              <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                <li>Revisar score por área e medir evolução.</li>
                <li>Lançar 1 nova campanha estruturada.</li>
                <li>Expandir cardápio com base nos top vendidos.</li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Perguntas-chave do negócio</h2>
          {answer("Por que as pessoas não entram na loja?",
            store.rating < 4.5 ? `Nota baixa (${store.rating}) reduz visibilidade no app e diminui o clique.` : "A loja tem boa reputação. Otimize fotos e vitrine para aumentar conversão visual.")}
          {answer("Por que entram e não compram?",
            products.filter((p: any) => !p.has_photo).length > products.length * 0.3 ? "Muitos produtos sem foto reduzem a conversão drasticamente." : "Conversão visual razoável. Avalie ordem dos produtos e combos no topo.")}
          {answer("Por que compram pouco?",
            store.average_ticket < 35 ? `Ticket médio baixo (R$ ${store.average_ticket}) sugere falta de combos e cross-sell.` : "Ticket médio saudável. Foque em fidelização para aumentar frequência.")}
          {answer("Por que não voltam?",
            reviews.filter((r: any) => r.sentiment === "negativo").length > 5 ? "Reclamações recorrentes destroem a recompra." : "Recompra está OK. Considere programa de fidelidade.")}
          {answer("Por que vende, mas não lucra?",
            "Custos altos, taxa de plataforma e cupons agressivos espremem a margem. Reprecifique top produtos.")}
        </section>
      </Card>
    </div>
  );
}
