import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateScore } from "@/lib/diagnostics/engine";
import { Plus, Sparkles, RefreshCw } from "lucide-react";
import { refreshSystem } from "@/lib/system/refresh";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { WeeklyCheckinCard } from "@/components/dashboard/WeeklyCheckinCard";
import { ScoreImpactBlocks } from "@/components/dashboard/ScoreImpactBlocks";
import { WeekActionsBlock } from "@/components/dashboard/WeekActionsBlock";
import { ToolsGrid } from "@/components/dashboard/ToolsGrid";

const TERMINAL = ["aplicada", "ignorada", "rejeitada", "completed"];

async function fetchDashboardData(storeId: string) {
  const [s, m, r, d, a, w] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).single(),
    supabase.from("metrics")
      .select("id, period_start, revenue")
      .eq("store_id", storeId)
      .order("period_start", { ascending: false })
      .limit(12),
    supabase.from("reviews").select("id, sentiment").eq("store_id", storeId).limit(500),
    supabase.from("diagnostics")
      .select("id, area, problem, severity, created_at")
      .eq("store_id", storeId).order("created_at", { ascending: false }).limit(10),
    supabase.from("action_plans")
      .select("id, status, impacto_financeiro")
      .eq("store_id", storeId),
    supabase.from("weekly_snapshots")
      .select("week_start, score")
      .eq("store_id", storeId)
      .order("week_start", { ascending: false })
      .limit(2),
  ]);
  return {
    store: s.data,
    metrics: (m.data || []).slice().reverse(),
    reviews: r.data || [],
    diagnostics: d.data || [],
    actions: a.data || [],
    weekly: w.data || [],
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const navigate = useNavigate();

  const { data: draftSession } = useQuery({
    queryKey: ["draftSession", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("diagnosis_sessions")
        .select("id, completion_percentage, current_step, updated_at")
        .eq("user_id", user!.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: stores = [], isLoading: loadingStores, isFetched: storesFetched } = useQuery({
    queryKey: ["dashboardStores"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, platform, city")
        .order("created_at");
      const list = data || [];
      if (list[0]) {
        queryClient.prefetchQuery({
          queryKey: ["dashboardData", list[0].id],
          queryFn: () => fetchDashboardData(list[0].id),
          staleTime: 5 * 60_000,
        });
      }
      return list;
    },
  });

  useEffect(() => {
    if (!selectedId && stores.length) setSelectedId(stores[0].id);
  }, [stores, selectedId]);

  const { data } = useQuery({
    queryKey: ["dashboardData", selectedId],
    enabled: !!selectedId,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    queryFn: () => fetchDashboardData(selectedId),
  });

  const score = useMemo(() => {
    if (!data?.store) return null;
    return calculateScore({
      store: data.store,
      metrics: data.metrics,
      products: [],
      reviews: data.reviews,
      competitors: [],
      campaigns: [],
    });
  }, [data]);

  if (loadingStores || !storesFetched) return <DashboardSkeleton />;
  if (!stores.length) return <Navigate to="/app/onboarding" replace />;
  if (!data || !data.store || !score) return <DashboardSkeleton />;

  const { store, diagnostics, actions, weekly } = data;
  const { overall } = score;

  const lastDiagnosisAt = diagnostics[0]?.created_at || null;
  const hasDiagnostic = diagnostics.length > 0;

  const pendingImpactSum = (actions as any[])
    .filter((a) => !TERMINAL.includes(a.status))
    .reduce((sum, a) => sum + Number(a.impacto_financeiro || 0), 0);

  const scoreDelta =
    weekly.length >= 2 && weekly[1].score != null
      ? overall - Number(weekly[1].score)
      : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{store.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{store.platform} · {store.city}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background flex-1 sm:flex-none min-w-0 max-w-full"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/stores/new")} title="Nova loja">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Loja</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshSystem()}
            title="Limpa caches e recarrega"
          >
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" onClick={() => navigate("/app/diagnosis/welcome")}>
            <Sparkles className="h-4 w-4 mr-1" /> Novo diagnóstico
          </Button>
        </div>
      </div>

      {draftSession && (
        <Card className="p-4 shadow-card border-primary/40 bg-primary/5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Diagnóstico em andamento</p>
                <p className="text-xs text-muted-foreground">
                  {draftSession.completion_percentage}% concluído
                </p>
                <Progress value={draftSession.completion_percentage} className="h-1.5 mt-1 w-full sm:w-48" />
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(`/app/diagnosis/${draftSession.id}`)} className="w-full sm:w-auto">
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Bloco A — Reavaliação semanal */}
      <WeeklyCheckinCard storeId={store.id} currentScore={overall} />

      {/* Bloco B — Score + Impacto */}
      <ScoreImpactBlocks
        score={hasDiagnostic ? overall : null}
        scoreDelta={scoreDelta}
        lastDiagnosisAt={lastDiagnosisAt}
        pendingImpactSum={pendingImpactSum}
      />

      {/* Bloco C — Faça isso esta semana */}
      <WeekActionsBlock storeId={store.id} hasDiagnostic={hasDiagnostic} />

      {/* Bloco D — Ferramentas */}
      <ToolsGrid storeId={store.id} />
    </div>
  );
}
