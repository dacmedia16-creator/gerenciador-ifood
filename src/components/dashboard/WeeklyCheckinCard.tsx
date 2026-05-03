import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

function getMondayISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // dias desde segunda
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

interface Props {
  storeId: string;
  currentScore: number | null;
}

export function WeeklyCheckinCard({ storeId, currentScore }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const weekStart = getMondayISO();
  const today = new Date();
  const isMonday = today.getDay() === 1;
  const skipKey = `weeklyCheckinSkipped:${storeId}:${weekStart}`;
  const [skipped, setSkipped] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(skipKey) === "1"
  );

  const [rating, setRating] = useState("");
  const [cancellation, setCancellation] = useState("");
  const [revenue, setRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [delta, setDelta] = useState<{ score: number; rating: number | null } | null>(null);

  const { data: snapshots } = useQuery({
    queryKey: ["weeklySnapshots", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_snapshots")
        .select("*")
        .eq("store_id", storeId)
        .order("week_start", { ascending: false })
        .limit(2);
      return data || [];
    },
  });

  const currentSnapshot = snapshots?.find((s) => s.week_start === weekStart);
  const previousSnapshot = snapshots?.find((s) => s.week_start !== weekStart);

  if (!isMonday || skipped || currentSnapshot) return null;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const ratingNum = rating ? Number(rating) : null;
      const cancNum = cancellation ? Number(cancellation) : null;
      const revNum = revenue ? Number(revenue) : null;

      const { error } = await supabase.from("weekly_snapshots").insert({
        user_id: user.id,
        store_id: storeId,
        week_start: weekStart,
        rating: ratingNum,
        cancellation_rate: cancNum,
        weekly_revenue: revNum,
        score: currentScore,
      });
      if (error) throw error;

      const scoreDelta = (currentScore ?? 0) - (previousSnapshot?.score ?? currentScore ?? 0);
      const ratingDelta =
        ratingNum !== null && previousSnapshot?.rating != null
          ? ratingNum - Number(previousSnapshot.rating)
          : null;
      setDelta({ score: scoreDelta, rating: ratingDelta });
      qc.invalidateQueries({ queryKey: ["weeklySnapshots", storeId] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(skipKey, "1");
    setSkipped(true);
  };

  return (
    <>
      <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-amber-700" />
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Atualização semanal — 60 segundos
          </h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground">Nota atual</label>
            <Input
              type="number"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="min-h-[48px]"
              placeholder="4.5"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cancelamento %</label>
            <Input
              type="number"
              step="0.1"
              value={cancellation}
              onChange={(e) => setCancellation(e.target.value)}
              className="min-h-[48px]"
              placeholder="3.2"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Faturamento esta semana R$</label>
            <Input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="min-h-[48px]"
              placeholder="12000"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="min-h-[48px]">
            Salvar e ver variação
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:underline"
          >
            Pular por hoje
          </button>
        </div>
      </Card>

      <Dialog open={!!delta} onOpenChange={(o) => !o && setDelta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparativo da semana</DialogTitle>
          </DialogHeader>
          {delta && (
            <div className="space-y-2 text-sm">
              <p>
                Score: {delta.score >= 0 ? "▲" : "▼"} {Math.abs(delta.score)} pontos
                {delta.score > 0 ? " 🎉" : ""}
              </p>
              {delta.rating !== null && (
                <p>
                  Nota: {delta.rating >= 0 ? "▲" : "▼"} {Math.abs(delta.rating).toFixed(1)}
                </p>
              )}
              {!previousSnapshot && (
                <p className="text-muted-foreground">
                  Primeira semana registrada — vamos comparar a partir da próxima!
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDelta(null)} className="min-h-[48px]">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
