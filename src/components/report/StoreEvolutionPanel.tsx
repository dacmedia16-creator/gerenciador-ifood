import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export function StoreEvolutionPanel({ storeId }: { storeId: string }) {
  const [memory, setMemory] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from("store_memory").select("*").eq("store_id", storeId).maybeSingle(),
        supabase.from("recommendation_history")
          .select("id, recommendation, status, outcome, created_at, rule_id")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setMemory(m);
      setRecent(r ?? []);
    })();
  }, [storeId]);

  if (!memory && recent.length === 0) return null;

  const recurring = (memory?.recurring_problems as any[]) ?? [];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Evolução desta loja</h3>
      </div>

      {recurring.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase mb-2">Problemas recorrentes</p>
          <div className="flex flex-wrap gap-2">
            {recurring.slice(0, 6).map((rp: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {rp.rule_id} · {rp.count}x
              </Badge>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-2">Últimas recomendações</p>
          <ul className="space-y-2 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-start gap-2 border-l-2 border-muted pl-2">
                <Badge
                  variant={r.outcome === "positivo" ? "default" : r.status === "ignorada" ? "destructive" : "outline"}
                  className="text-[10px] shrink-0"
                >
                  {r.outcome ?? r.status}
                </Badge>
                <span className="line-clamp-2">{r.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
