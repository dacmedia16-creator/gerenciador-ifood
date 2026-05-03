import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/LoadingState";
import { ArrowLeft, Play, CheckCircle2, HelpCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export default function ActionDetail() {
  const { id, actionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [reanalysis, setReanalysis] = useState<any>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  // update form
  const [whatChanged, setWhatChanged] = useState("");
  const [hasNewData, setHasNewData] = useState(false);
  const [delta, setDelta] = useState<Record<string, string>>({});

  const load = async () => {
    if (!actionId) return;
    const { data } = await supabase.from("action_plans").select("*").eq("id", actionId).maybeSingle();
    setAction(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [actionId]);

  const setStatus = async (status: string, extra: any = {}) => {
    if (!actionId) return;
    await supabase.from("action_plans").update({ status, ...extra }).eq("id", actionId);
    toast.success("Status atualizado");
    load();
  };

  const submitUpdate = async () => {
    if (!user || !actionId || !action) return;
    const metricsDelta: any = {};
    for (const [k, v] of Object.entries(delta)) {
      if (v) metricsDelta[k] = Number(v);
    }
    await supabase.from("action_updates").insert({
      action_id: actionId,
      store_id: action.store_id,
      user_id: user.id,
      what_changed: whatChanged,
      has_new_data: hasNewData,
      metrics_delta: metricsDelta,
    });
    await setStatus("feita", { completed_at: new Date().toISOString() });
    setUpdateOpen(false);
    setWhatChanged(""); setHasNewData(false); setDelta({});
  };

  const reanalyze = async () => {
    setReanalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("reanalyze-action", { body: { action_id: actionId } });
      if (error) throw error;
      setReanalysis(data);
      toast.success("Reanálise concluída");
    } catch (e: any) {
      toast.error(e.message || "Erro na reanálise");
    } finally {
      setReanalyzing(false);
    }
  };

  const askForHelp = () => {
    navigate(`/app/chat?context=action:${actionId}`);
  };

  if (loading) return <LoadingState />;
  if (!action) return <div className="p-8 text-muted-foreground">Ação não encontrada.</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/app/stores/${id}/action-plan`}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao plano</Link>
      </Button>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground uppercase">{action.area}</p>
            <h1 className="text-2xl font-bold">{action.title}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Prioridade: {action.priority || "—"}</Badge>
            <Badge variant="outline">Impacto: {action.impact || "—"}</Badge>
            <Badge variant="outline">Status: {action.status}</Badge>
          </div>
        </div>

        {action.why_it_matters && (
          <Section title="Por que isso importa">{action.why_it_matters}</Section>
        )}
        {(action.how_to_apply || action.description) && (
          <Section title="O que fazer na prática">{action.how_to_apply || action.description}</Section>
        )}
        {action.example && <Section title="Exemplo">{action.example}</Section>}
        {action.how_to_measure && <Section title="Como medir se funcionou">{action.how_to_measure}</Section>}
        {action.suggested_deadline && (
          <p className="text-sm text-muted-foreground">Prazo sugerido: <strong>{action.suggested_deadline}</strong></p>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setStatus("em_andamento", { started_at: new Date().toISOString() })}>
            <Play className="h-4 w-4 mr-1" /> Marcar como iniciado
          </Button>
          <Button onClick={() => setUpdateOpen(true)} className="gradient-primary text-primary-foreground">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como feito
          </Button>
          <Button variant="outline" onClick={askForHelp}>
            <HelpCircle className="h-4 w-4 mr-1" /> Preciso de ajuda
          </Button>
          <Button variant="outline" onClick={reanalyze} disabled={reanalyzing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${reanalyzing ? "animate-spin" : ""}`} />
            Reanalisar com IA
          </Button>
        </div>
      </Card>

      {reanalysis && (
        <Card className="p-5 space-y-3 border-l-4 border-primary">
          <h3 className="font-semibold">Reanálise da IA</h3>
          <Section title="O que mudou">{reanalysis.o_que_mudou}</Section>
          <Section title="Houve melhora?">{reanalysis.houve_melhora}</Section>
          <Section title="Ainda precisa ajustar">{reanalysis.ainda_precisa_ajustar}</Section>
          <Section title="Próxima recomendação">{reanalysis.proxima_recomendacao}</Section>
          <Section title="Impacto na meta">{reanalysis.impacto_na_meta}</Section>
        </Card>
      )}

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conta o que mudou</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>O que você mudou?</Label>
              <Textarea value={whatChanged} onChange={(e) => setWhatChanged(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <input type="checkbox" checked={hasNewData} onChange={(e) => setHasNewData(e.target.checked)} />
                Tenho novos dados (pedidos, faturamento, nota, etc.)
              </Label>
            </div>
            {hasNewData && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["orders", "Pedidos/mês"],
                  ["revenue", "Faturamento R$"],
                  ["average_ticket", "Ticket médio R$"],
                  ["rating", "Nota"],
                  ["cancellation_rate", "Cancelamento %"],
                  ["prep_time", "Preparo (min)"],
                ].map(([k, l]) => (
                  <div key={k}>
                    <Label className="text-xs">{l}</Label>
                    <Input
                      type="number"
                      value={delta[k] || ""}
                      onChange={(e) => setDelta((p) => ({ ...p, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancelar</Button>
            <Button onClick={submitUpdate} className="gradient-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}
