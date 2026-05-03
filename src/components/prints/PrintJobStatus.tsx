import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface PrintJobResult {
  rating?: number | null;
  cancellation_rate?: number | null;
  total_orders_period?: number | null;
  avg_ticket?: number | null;
  revenue_period?: number | null;
  period_description?: string | null;
  top_complaints?: string[] | null;
  data_confidence?: "high" | "medium" | "low";
}

interface Props {
  jobId: string;
  onDone?: (result: PrintJobResult) => void;
  onError?: (msg: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  rating: "Nota",
  cancellation_rate: "Cancelamento",
  total_orders_period: "Pedidos",
  avg_ticket: "Ticket médio",
  revenue_period: "Faturamento",
  period_description: "Período",
  top_complaints: "Reclamações",
};

export function PrintJobStatus({ jobId, onDone, onError }: Props) {
  const [status, setStatus] = useState<"pending" | "processing" | "done" | "error">("pending");
  const [result, setResult] = useState<PrintJobResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const finishedRef = useRef(false);

  const handleRow = (row: any) => {
    if (finishedRef.current) return;
    setStatus(row.status);
    if (row.status === "done") {
      finishedRef.current = true;
      setResult(row.result ?? {});
      onDone?.(row.result ?? {});
    } else if (row.status === "error") {
      finishedRef.current = true;
      setErrorMsg(row.error_message ?? "Erro ao analisar print");
      onError?.(row.error_message ?? "Erro ao analisar print");
    }
  };

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      const { data } = await supabase.from("print_jobs").select("*").eq("id", jobId).maybeSingle();
      if (!cancelled && data) handleRow(data);
    };

    fetchOnce();

    const channel = supabase
      .channel(`print-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "print_jobs", filter: `id=eq.${jobId}` },
        (payload) => handleRow(payload.new),
      )
      .subscribe();

    pollTimer = setInterval(fetchOnce, 4000);
    const slowTimer = setTimeout(() => setSlow(true), 60_000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(slowTimer);
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const retry = async () => {
    setStatus("pending");
    setErrorMsg(null);
    finishedRef.current = false;
    await supabase.from("print_jobs").update({ status: "pending", error_message: null }).eq("id", jobId);
    supabase.functions.invoke("process-print-job", { body: { job_id: jobId } }).catch(() => {});
  };

  if (status === "done" && result) {
    const entries = Object.entries(result).filter(
      ([k, v]) => k !== "data_confidence" && v !== null && v !== undefined && (Array.isArray(v) ? v.length : true),
    );
    return (
      <Card className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
          <CheckCircle2 className="h-5 w-5" /> Print analisado
        </div>
        {entries.length > 0 && (
          <ul className="text-sm space-y-1">
            {entries.map(([k, v]) => (
              <li key={k}>
                <span className="text-muted-foreground">{FIELD_LABELS[k] ?? k}:</span>{" "}
                <span className="font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive font-medium mb-2">
          <AlertCircle className="h-5 w-5" /> Não conseguimos ler o print
        </div>
        <p className="text-sm text-muted-foreground mb-3">{errorMsg}</p>
        <Button size="sm" variant="outline" onClick={retry} className="min-h-[40px]">
          <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium">{slow ? "A análise está demorando…" : "Analisando print…"}</p>
          <p className="text-xs text-muted-foreground">
            {slow
              ? "Continuamos em segundo plano. Você pode seguir adiante."
              : "Isso leva alguns instantes."}
          </p>
        </div>
      </div>
    </Card>
  );
}
