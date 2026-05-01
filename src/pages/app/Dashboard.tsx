import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreBadge } from "@/components/StatusBadges";
import { calculateScore } from "@/lib/diagnostics/engine";
import { seedDemoStore } from "@/lib/seed/demoStore";
import { Plus, Sparkles, Store, BarChart3, Star, Clock, AlertTriangle, DollarSign, Users, RefreshCw } from "lucide-react";
import { refreshSystem } from "@/lib/system/refresh";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string>("");
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const { data: draftSession } = useQuery({
    queryKey: ["draftSession", user?.id],
    enabled: !!user,
    staleTime: 30_000,
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

  const { data: stores = [], isLoading: loading, refetch: refetchStores } = useQuery({
    queryKey: ["dashboardStores"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").order("created_at");
      return data || [];
    },
  });

  useEffect(() => {
    if (!selectedId && stores.length) setSelectedId(stores[0].id);
  }, [stores, selectedId]);

  const { data } = useQuery({
    queryKey: ["dashboardData", selectedId],
    enabled: !!selectedId,
    staleTime: 60_000,
    queryFn: async () => {
      const [s, m, p, r, c, ca, d, a] = await Promise.all([
        supabase.from("stores").select("*").eq("id", selectedId).single(),
        supabase.from("metrics")
          .select("id, period_start, period_end, revenue, orders, average_ticket, cancellation_rate")
          .eq("store_id", selectedId).order("period_start"),
        supabase.from("products").select("*").eq("store_id", selectedId).limit(500),
        supabase.from("reviews")
          .select("id, sentiment, rating")
          .eq("store_id", selectedId).limit(500),
        supabase.from("competitors").select("id, name, rating").eq("store_id", selectedId),
        supabase.from("campaigns").select("id, name, status").eq("store_id", selectedId),
        supabase.from("diagnostics")
          .select("id, area, problem, severity")
          .eq("store_id", selectedId).order("created_at", { ascending: false }).limit(50),
        supabase.from("action_plans")
          .select("id, title, area, priority, status")
          .eq("store_id", selectedId).order("created_at", { ascending: false }).limit(50),
      ]);
      return {
        store: s.data, metrics: m.data || [], products: p.data || [], reviews: r.data || [],
        competitors: c.data || [], campaigns: ca.data || [], diagnostics: d.data || [], actions: a.data || [],
      };
    },
  });

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const store = await seedDemoStore(user.id);
      toast.success("Loja demo criada!");
      const res = await refetchStores();
      setSelectedId(store.id);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar loja demo");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  if (!stores.length) {
    return <Navigate to="/app/onboarding" replace />;
  }

  if (!data) return <div className="text-muted-foreground">Carregando dados…</div>;

  const { store, metrics, products, reviews, competitors, campaigns, diagnostics, actions } = data;
  const { overall } = calculateScore({ store, metrics, products, reviews, competitors, campaigns });
  const criticalAlerts = diagnostics.filter((d: any) => d.severity === "critico");
  const sentimentData = [
    { name: "Positivo", value: reviews.filter((r: any) => r.sentiment === "positivo").length, color: "hsl(var(--success))" },
    { name: "Neutro", value: reviews.filter((r: any) => r.sentiment === "neutro").length, color: "hsl(var(--warning))" },
    { name: "Negativo", value: reviews.filter((r: any) => r.sentiment === "negativo").length, color: "hsl(var(--destructive))" },
  ];

  const KPI = ({ icon: Icon, label, value, color = "text-primary" }: any) => (
    <Card className="p-3 sm:p-4 shadow-card">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-base sm:text-lg font-bold truncate">{value}</p>
        </div>
      </div>
    </Card>
  );

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
            title="Limpa caches e recarrega para aplicar atualizações"
          >
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Atualizar sistema</span>
          </Button>
          <Button size="sm" onClick={() => navigate("/app/diagnosis/new?new=1")} className="flex-1 sm:flex-none">
            <Sparkles className="h-4 w-4 mr-1" /> Novo Diagnóstico
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
                  {draftSession.completion_percentage}% concluído · etapa {draftSession.current_step}/16
                </p>
                <Progress value={draftSession.completion_percentage} className="h-1.5 mt-1 w-full sm:w-48" />
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(`/app/diagnosis/${draftSession.id}`)} className="w-full sm:w-auto">
              Continuar diagnóstico
            </Button>
          </div>
        </Card>
      )}

      {/* Score */}
      <Card className="p-4 sm:p-6 shadow-card">
        <div className="grid md:grid-cols-4 gap-4 sm:gap-6 items-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Score geral</p>
            <div className="text-5xl sm:text-6xl font-bold text-gradient">{overall}</div>
            <ScoreBadge score={overall} />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KPI icon={DollarSign} label="Faturamento/mês" value={`R$ ${(store.monthly_revenue || 0).toLocaleString("pt-BR")}`} />
            <KPI icon={BarChart3} label="Pedidos/mês" value={store.monthly_orders || 0} />
            <KPI icon={DollarSign} label="Ticket médio" value={`R$ ${store.average_ticket || 0}`} />
            <KPI icon={Star} label="Nota" value={store.rating || "-"} color="text-warning" />
            <KPI icon={Clock} label="Entrega" value={`${store.promised_delivery_time || 0} min`} />
            <KPI icon={AlertTriangle} label="Cancelamento" value={`${store.cancellation_rate || 0}%`} color="text-destructive" />
            <KPI icon={Users} label="Concorrentes" value={competitors.length} />
            <KPI icon={Store} label="Produtos" value={products.length} />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 shadow-card lg:col-span-2">
          <h3 className="font-semibold mb-3">Faturamento mensal</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={[...metrics].reverse().map((m: any) => ({ mes: m.period_start?.slice(0, 7), receita: Number(m.revenue) }))}>
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3">Sentimento das avaliações</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {sentimentData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-xs">
            {sentimentData.map((d) => <div key={d.name} className="text-center"><div className="h-2 w-2 rounded-full inline-block mr-1" style={{ background: d.color }} />{d.name} ({d.value})</div>)}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Alertas críticos</h3>
          {criticalAlerts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum alerta crítico.</p> : (
            <ul className="space-y-2">
              {criticalAlerts.slice(0, 5).map((d: any) => (
                <li key={d.id} className="text-sm border-l-2 border-destructive pl-3 py-1">
                  <p className="font-medium">{d.problem}</p>
                  <p className="text-xs text-muted-foreground">{d.area}</p>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" size="sm" asChild className="px-0"><Link to={`/app/stores/${store.id}/diagnostics`}>Ver todos →</Link></Button>
        </Card>
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-3">Plano de ação recomendado</h3>
          {actions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ação pendente.</p> : (
            <ul className="space-y-2">
              {actions.slice(0, 5).map((a: any) => (
                <li key={a.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.area} · prioridade {a.priority}</p>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" size="sm" asChild className="px-0"><Link to={`/app/stores/${store.id}/action-plan`}>Ver plano completo →</Link></Button>
        </Card>
      </div>
    </div>
  );
}
