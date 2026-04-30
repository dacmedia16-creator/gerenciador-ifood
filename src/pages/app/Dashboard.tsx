import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
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
  const [stores, setStores] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [draftSession, setDraftSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("diagnosis_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDraftSession(data));
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("*").order("created_at");
      setStores(data || []);
      if (data?.[0]) setSelectedId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const [s, m, p, r, c, ca, d, a] = await Promise.all([
        supabase.from("stores").select("*").eq("id", selectedId).single(),
        supabase.from("metrics").select("*").eq("store_id", selectedId).order("period_start"),
        supabase.from("products").select("*").eq("store_id", selectedId),
        supabase.from("reviews").select("*").eq("store_id", selectedId),
        supabase.from("competitors").select("*").eq("store_id", selectedId),
        supabase.from("campaigns").select("*").eq("store_id", selectedId),
        supabase.from("diagnostics").select("*").eq("store_id", selectedId).order("created_at", { ascending: false }),
        supabase.from("action_plans").select("*").eq("store_id", selectedId).order("created_at", { ascending: false }),
      ]);
      setData({
        store: s.data, metrics: m.data || [], products: p.data || [], reviews: r.data || [],
        competitors: c.data || [], campaigns: ca.data || [], diagnostics: d.data || [], actions: a.data || [],
      });
    })();
  }, [selectedId]);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const store = await seedDemoStore(user.id);
      toast.success("Loja demo criada!");
      const { data } = await supabase.from("stores").select("*").order("created_at");
      setStores(data || []);
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
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">{store.platform} · {store.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/stores/new")}><Plus className="h-4 w-4 mr-1" /> Loja</Button>
          <Button size="sm" onClick={() => navigate("/app/diagnosis/new?new=1")}><Sparkles className="h-4 w-4 mr-1" /> Novo Diagnóstico</Button>
        </div>
      </div>

      {draftSession && (
        <Card className="p-4 shadow-card border-primary/40 bg-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Diagnóstico em andamento</p>
                <p className="text-xs text-muted-foreground">
                  {draftSession.completion_percentage}% concluído · etapa {draftSession.current_step}/16
                </p>
                <Progress value={draftSession.completion_percentage} className="h-1.5 mt-1 w-48" />
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(`/app/diagnosis/${draftSession.id}`)}>
              Continuar diagnóstico
            </Button>
          </div>
        </Card>
      )}

      {/* Score */}
      <Card className="p-6 shadow-card">
        <div className="grid md:grid-cols-4 gap-6 items-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Score geral</p>
            <div className="text-6xl font-bold text-gradient">{overall}</div>
            <ScoreBadge score={overall} />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
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
