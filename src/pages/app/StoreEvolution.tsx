import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/LoadingState";
import { TrendingUp, History as HistoryIcon } from "lucide-react";
import { SourceChip } from "@/components/report/SourceChip";

const STATUS_VARIANT: Record<string, any> = {
  pendente: "outline",
  aplicada: "default",
  ignorada: "destructive",
  em_andamento: "secondary",
};

const OUTCOME_VARIANT: Record<string, any> = {
  positivo: "default",
  negativo: "destructive",
  neutro: "secondary",
  inconclusivo: "outline",
};

export default function StoreEvolution() {
  const { id } = useParams();
  const [memory, setMemory] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: m }, { data: h }] = await Promise.all([
        supabase.from("store_memory").select("*").eq("store_id", id).maybeSingle(),
        supabase
          .from("recommendation_history")
          .select("*")
          .eq("store_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setMemory(m);
      setHistory(h ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState />;

  const recurring = (memory?.recurring_problems as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Evolução da loja</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Histórico de tudo o que o Gestor IA recomendou, o que foi aplicado e qual foi o resultado.
      </p>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Recomendações totais</p>
          <p className="text-2xl font-bold">{history.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Aplicadas</p>
          <p className="text-2xl font-bold">{history.filter((h) => h.status === "aplicada").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Resultados positivos</p>
          <p className="text-2xl font-bold">{history.filter((h) => h.outcome === "positivo").length}</p>
        </Card>
      </div>

      {recurring.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Problemas recorrentes</h2>
          <div className="flex flex-wrap gap-2">
            {recurring.map((rp: any, i: number) => (
              <Badge key={i} variant="secondary">
                {rp.rule_id} · {rp.count}x
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <HistoryIcon className="h-4 w-4" />
          <h2 className="font-semibold">Linha do tempo</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma recomendação ainda. Rode "Consultar Gestor IA" no relatório.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-l-2 border-primary/40 pl-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant={STATUS_VARIANT[h.status] ?? "outline"} className="text-[10px]">{h.status}</Badge>
                  {h.outcome && <Badge variant={OUTCOME_VARIANT[h.outcome]} className="text-[10px]">{h.outcome}</Badge>}
                  <SourceChip source={h.source} sourceRef={h.source_ref} />
                  <code className="text-[10px] text-muted-foreground">{h.rule_id}</code>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(h.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm">{h.recommendation}</p>
                {h.expected_impact && <p className="text-xs text-muted-foreground mt-1">{h.expected_impact}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
