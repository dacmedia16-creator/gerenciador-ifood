import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
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

export function AIConsultReport({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Análise IA do Especialista</h2>
        {data.generated_at && (
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(data.generated_at).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Resumo executivo</h3>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.executive_summary || ""}</ReactMarkdown>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase">Score geral IA</p>
          <div className="text-5xl font-bold text-gradient mt-1">{data.overall_score}</div>
        </Card>
        <Card className="p-5 md:col-span-2">
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
      </div>

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

      {data.products_to_fix?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Produtos que precisam de ajuste</h3>
          <ul className="space-y-2 text-sm">
            {data.products_to_fix.map((p: any, i: number) => (
              <li key={i} className="border-b last:border-0 pb-2">
                <strong>{p.name}</strong>
                <p className="text-xs text-muted-foreground">{p.issue}</p>
                <p className="text-xs">→ {p.action}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {data.ticket_opportunities?.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Oportunidades de ticket médio</h3>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {data.ticket_opportunities.map((t: string, i: number) => <li key={i}>{t}</li>)}
            </ul>
          </Card>
        )}
        {data.margin_risks?.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Riscos de margem</h3>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {data.margin_risks.map((t: string, i: number) => <li key={i}>{t}</li>)}
            </ul>
          </Card>
        )}
      </div>

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

      {data.final_questions && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Diagnóstico final em 6 perguntas</h3>
          {[
            ["Por que as pessoas não entram na loja?", data.final_questions.por_que_nao_entram],
            ["Por que entram e não clicam nos produtos?", data.final_questions.por_que_nao_clicam],
            ["Por que clicam e não compram?", data.final_questions.por_que_nao_compram],
            ["Por que compram pouco?", data.final_questions.por_que_compram_pouco],
            ["Por que não voltam?", data.final_questions.por_que_nao_voltam],
            ["Por que vende, mas não lucra?", data.final_questions.por_que_vende_mas_nao_lucra],
          ].map(([q, a]: any) => a && (
            <div key={q} className="border-l-4 border-primary pl-4 my-3">
              <p className="font-semibold text-sm">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
