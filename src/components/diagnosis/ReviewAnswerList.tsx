import type { Question, StepDef } from "@/lib/diagnosis/steps";

function formatValue(q: Question, v: any): React.ReactNode {
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
    return <span className="text-muted-foreground italic">— não informado</span>;
  }
  if (q.type === "yesno") return v === true || v === "sim" || v === "yes" ? "Sim" : "Não";
  if (q.type === "select" && q.options) {
    const opt = q.options.find((o) => String(o.value) === String(v));
    return opt?.label ?? String(v);
  }
  if (q.type === "multiselect" && q.options) {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => q.options!.find((o) => String(o.value) === String(x))?.label ?? String(x)).join(", ");
  }
  if (q.type === "rating3") {
    const map: Record<string, string> = { ruim: "Ruim", medio: "Médio", bom: "Bom" };
    return map[String(v)] ?? String(v);
  }
  if (q.type === "currency") return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (q.type === "products" || q.type === "competitors") {
    const items = (v as any)?.items ?? (Array.isArray(v) ? v : []);
    if (!Array.isArray(items) || items.length === 0) return <span className="text-muted-foreground italic">— sem itens</span>;
    return (
      <ul className="list-disc pl-4 space-y-0.5">
        {items.slice(0, 5).map((it: any, i: number) => (
          <li key={i} className="text-sm">
            {it.name || it.title || `Item ${i + 1}`}
            {it.sale_price ? ` · R$ ${it.sale_price}` : ""}
            {it.sales_quantity ? ` · ${it.sales_quantity} vendas` : ""}
          </li>
        ))}
      </ul>
    );
  }
  if (q.type === "files") {
    const arr = Array.isArray(v) ? v : [];
    return arr.length ? `${arr.length} arquivo(s)` : <span className="text-muted-foreground italic">—</span>;
  }
  if (typeof v === "object") return <code className="text-xs">{JSON.stringify(v)}</code>;
  return String(v);
}

function shouldShow(q: Question, values: Record<string, any>) {
  if (!q.condition) return true;
  const v = values[q.condition.key];
  if (q.condition.equals !== undefined) return v === q.condition.equals;
  if (q.condition.in) return q.condition.in.includes(v);
  if (q.condition.truthy) return !!v;
  return true;
}

export function ReviewAnswerList({ step, values }: { step: StepDef; values: Record<string, any> }) {
  const visible = step.questions.filter((q) => q.type !== "info" && shouldShow(q, values));
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma pergunta nesta etapa.</p>;
  }
  return (
    <dl className="space-y-3">
      {visible.map((q) => (
        <div key={q.key} className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4 border-b border-border/50 pb-2 last:border-0">
          <dt className="text-sm text-muted-foreground md:col-span-1">{q.label}</dt>
          <dd className="text-sm md:col-span-2">{formatValue(q, values[q.key])}</dd>
        </div>
      ))}
    </dl>
  );
}
