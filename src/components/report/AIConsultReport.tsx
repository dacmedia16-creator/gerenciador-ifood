import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, AlertTriangle, Sparkles, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STAGE_LABEL: Record<string, string> = {
  busca: "Busca",
  entrada: "Entrada na loja",
  clique: "Clique no produto",
  compra: "Compra",
  entrega: "Entrega",
  recompra: "Recompra",
};

const AREA_LABEL: Record<string, string> = {
  visibilidade: "Visibilidade",
  cardapio: "Cardápio",
  preco_margem: "Preço & Margem",
  operacao: "Operação",
  reputacao: "Reputação",
  marketing: "Marketing",
  recompra: "Recompra",
};

const statusColor = (s: string) =>
  s === "critico" ? "border-destructive bg-destructive/5" :
  s === "atencao" ? "border-warning bg-warning/5" :
  "border-success bg-success/5";

const priorityVariant = (p: string): any =>
  p === "alta" ? "destructive" : p === "media" ? "secondary" : "outline";

const confidenceVariant = (c: string): any =>
  c === "alta" ? "default" : c === "media" ? "secondary" : "outline";

const confidenceLabel = (c: string) =>
  c === "alta" ? "Confiança alta" : c === "media" ? "Confiança média" : "Confiança baixa";

// Render texto com tags [FATO]/[HIPÓTESE]/[RECOMENDAÇÃO] coloridas
function TaggedText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\[FATO\]|\[HIPÓTESE\]|\[HIPOTESE\]|\[RECOMENDAÇÃO\]|\[RECOMENDACAO\])/);
  return (
    <p className="text-sm leading-relaxed">
      {parts.map((p, i) => {
        if (p === "[FATO]") return <Badge key={i} variant="default" className="mx-1 text-[10px]">FATO</Badge>;
        if (p === "[HIPÓTESE]" || p === "[HIPOTESE]") return <Badge key={i} variant="secondary" className="mx-1 text-[10px]">HIPÓTESE</Badge>;
        if (p === "[RECOMENDAÇÃO]" || p === "[RECOMENDACAO]") return <Badge key={i} variant="outline" className="mx-1 text-[10px] border-primary text-primary">RECOMENDAÇÃO</Badge>;
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

export function AIConsultReport({ data }: { data: any }) {
  if (!data) return null;

  // Detecta novo formato (main_problems) vs antigo (problems)
  const isNewFormat = Array.isArray(data.main_problems);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Gestor IA — Análise consultiva</h2>
        {data.generated_at && (
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(data.generated_at).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {/* Resumo executivo */}
      <Card className="p-5">
        <h3 className="font-semibold mb-2">Resumo executivo</h3>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.executive_summary || ""}</ReactMarkdown>
        </div>
      </Card>

      {/* Score */}
      {data.overall_score != null && (
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase">Score geral</p>
          <div className="text-5xl font-bold text-gradient mt-1">{data.overall_score}</div>
          <Progress value={Number(data.overall_score)} className="h-2 mt-3" />
        </Card>
      )}

      {/* === NOVO FORMATO === */}
      {isNewFormat && (
        <>
          {data.main_problems?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Principais problemas</h3>
              <div className="space-y-4">
                {data.main_problems.map((p: any, i: number) => (
                  <div key={i} className="border-l-4 border-primary/40 pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <strong className="text-sm">{p.title}</strong>
                      <Badge variant={confidenceVariant(p.confidence)} className="text-[10px]">
                        {confidenceLabel(p.confidence)}
                      </Badge>
                      <code className="text-[10px] text-muted-foreground">{p.rule_id}</code>
                    </div>
                    {p.evidence_cited && (
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Evidência:</strong> {p.evidence_cited}
                      </p>
                    )}
                    <TaggedText text={p.why_it_matters} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.priority_ranking?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Ordem de prioridade</h3>
              <ol className="space-y-2">
                {data.priority_ranking.map((p: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant={priorityVariant(p.priority)} className="shrink-0 mt-0.5">{i + 1}</Badge>
                    <div>
                      <code className="text-xs text-muted-foreground">{p.rule_id}</code>
                      <p>{p.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {data.plan_7_days?.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Plano de 7 dias</h3>
                <ol className="space-y-2 text-sm">
                  {data.plan_7_days.map((d: any, i: number) => (
                    <li key={i} className="flex gap-3 border-l-2 border-primary pl-3">
                      <Badge variant="outline" className="shrink-0">Dia {d.day}</Badge>
                      <div>
                        <strong className="text-sm">{d.title}</strong>
                        <p className="text-xs text-muted-foreground">{d.action}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {data.plan_30_days?.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Plano de 30 dias</h3>
                <ol className="space-y-2 text-sm">
                  {data.plan_30_days.map((d: any, i: number) => (
                    <li key={i} className="flex gap-3 border-l-2 border-secondary pl-3">
                      <Badge variant="outline" className="shrink-0">Sem {d.week}</Badge>
                      <div>
                        <strong className="text-sm">{d.title}</strong>
                        <p className="text-xs text-muted-foreground">{d.action}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          {data.do_not_do_now?.length > 0 && (
            <Card className="p-5 border-l-4 border-warning bg-warning/5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-warning" />
                <h3 className="font-semibold">O que NÃO fazer agora</h3>
              </div>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {data.do_not_do_now.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
          )}

          {data.missing_data_for_better_diagnosis?.length > 0 && (
            <Card className="p-5 border-l-4 border-muted-foreground/40 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4" />
                <h3 className="font-semibold">Dados que faltam para diagnóstico melhor</h3>
              </div>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {data.missing_data_for_better_diagnosis.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
          )}

          {data.disclaimers?.length > 0 && (
            <Card className="p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <strong className="text-xs uppercase text-muted-foreground">Avisos</strong>
              </div>
              <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
                {data.disclaimers.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
          )}

          {data.rule_evidences_used?.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Ver evidências usadas ({data.rule_evidences_used.length})
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded overflow-auto max-h-96">
                {JSON.stringify(data.rule_evidences_used, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}

      {/* === FORMATO ANTIGO (retrocompatível) === */}
      {!isNewFormat && (
        <>
          {data.area_scores && (
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase mb-3">Score por área</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.area_scores ?? {}).map(([area, score]: any) => (
                  <div key={area}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{AREA_LABEL[area] ?? area}</span>
                      <span className="font-semibold">{score}</span>
                    </div>
                    <Progress value={Number(score)} className="h-1.5" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.main_bottleneck && (
            <Card className="p-5 border-l-4 border-destructive bg-destructive/5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <strong>Gargalo principal</strong>
              </div>
              <p className="text-sm">{data.main_bottleneck}</p>
            </Card>
          )}

          {data.journey?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Jornada do cliente</h3>
              <div className="space-y-2">
                {data.journey.map((j: any, i: number) => (
                  <div key={i} className={`p-3 border-l-4 rounded ${statusColor(j.status)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-sm">{STAGE_LABEL[j.stage] ?? j.stage}</strong>
                      <Badge variant={j.status === "critico" ? "destructive" : j.status === "atencao" ? "secondary" : "default"}>{j.status}</Badge>
                    </div>
                    <p className="text-sm">{j.finding}</p>
                    <p className="text-xs text-muted-foreground mt-1">→ {j.recommendation}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.problems?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Problemas encontrados</h3>
              <div className="space-y-3">
                {data.problems.map((p: any, i: number) => (
                  <div key={i} className="border-l-4 border-primary/40 pl-3 text-sm">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <strong>{p.problem}</strong>
                      <Badge variant={priorityVariant(p.priority)}>{p.priority}</Badge>
                      <Badge variant="outline">{p.suggested_deadline}</Badge>
                    </div>
                    <p><span className="text-muted-foreground">Evidência:</span> {p.evidence}</p>
                    <p><span className="text-muted-foreground">Causa:</span> {p.probable_cause}</p>
                    <p><span className="text-muted-foreground">Impacto:</span> {p.business_impact}</p>
                    <p className="mt-1"><span className="text-muted-foreground">Solução:</span> <strong>{p.recommended_solution}</strong></p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.next_best_action && (
            <Card className="p-5 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="h-5 w-5 text-primary" />
                <strong>Próxima melhor ação</strong>
              </div>
              <p className="text-sm">{data.next_best_action}</p>
            </Card>
          )}

          {data.seven_day_plan?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Plano de ação de 7 dias</h3>
              <ol className="space-y-2 text-sm">
                {data.seven_day_plan.map((d: any, i: number) => (
                  <li key={i} className="flex gap-3 border-l-2 border-primary pl-3">
                    <Badge variant="outline" className="shrink-0">Dia {d.day}</Badge>
                    <div>
                      <strong>{d.title}</strong>
                      <p className="text-xs text-muted-foreground">{d.action}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
