import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Upload, Loader2, Save, Image as ImageIcon } from "lucide-react";

const KPI_LABELS: Record<string, string> = {
  revenue: "Faturamento",
  orders: "Pedidos/mês",
  ticket: "Ticket médio",
  rating: "Nota",
  cancellation: "Cancelamentos",
  delivery_time: "Tempo de entrega",
};

const SECTION_LABELS: Record<string, string> = {
  cover: "Capa",
  summary: "Resumo executivo",
  score: "Score geral e por área",
  problems: "Problemas identificados",
  actions: "Plano de ação",
  questions: "Perguntas-chave do negócio",
  reviews: "Resumo de avaliações",
};

type Section = { key: string; enabled: boolean };

type Template = {
  id?: string;
  store_id: string;
  logo_url: string | null;
  primary_color: string;
  display_name: string | null;
  tagline: string | null;
  footer_text: string | null;
  summary_tone: string;
  kpi_order: string[];
  sections: Section[];
};

const DEFAULT: Omit<Template, "store_id"> = {
  logo_url: null,
  primary_color: "#ED5712",
  display_name: null,
  tagline: null,
  footer_text: null,
  summary_tone: "consultivo",
  kpi_order: ["revenue", "orders", "ticket", "rating"],
  sections: [
    { key: "cover", enabled: true },
    { key: "summary", enabled: true },
    { key: "score", enabled: true },
    { key: "problems", enabled: true },
    { key: "actions", enabled: true },
    { key: "questions", enabled: true },
    { key: "reviews", enabled: false },
  ],
};

export default function ReportTemplate() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tpl, setTpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("report_templates").select("*").eq("store_id", id).maybeSingle();
      if (data) {
        setTpl({
          ...DEFAULT,
          ...data,
          kpi_order: (data.kpi_order as string[]) ?? DEFAULT.kpi_order,
          sections: (data.sections as Section[]) ?? DEFAULT.sections,
        });
      } else {
        setTpl({ ...DEFAULT, store_id: id });
      }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!tpl || !id) return;
    setSaving(true);
    const payload = { ...tpl, store_id: id };
    const { error } = await supabase.from("report_templates").upsert(payload, { onConflict: "store_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Template salvo");
  };

  const uploadLogo = async (file: File) => {
    if (!user || !id) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("report-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("report-logos").getPublicUrl(path);
    setTpl((p) => p && { ...p, logo_url: data.publicUrl });
    setUploading(false);
    toast.success("Logo enviado");
  };

  const moveKpi = (i: number, dir: -1 | 1) => {
    if (!tpl) return;
    const arr = [...tpl.kpi_order];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setTpl({ ...tpl, kpi_order: arr });
  };

  const toggleKpi = (key: string) => {
    if (!tpl) return;
    const has = tpl.kpi_order.includes(key);
    setTpl({ ...tpl, kpi_order: has ? tpl.kpi_order.filter((k) => k !== key) : [...tpl.kpi_order, key] });
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    if (!tpl) return;
    const arr = [...tpl.sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setTpl({ ...tpl, sections: arr });
  };

  const toggleSection = (key: string) => {
    if (!tpl) return;
    setTpl({
      ...tpl,
      sections: tpl.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  if (loading || !tpl) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Template do relatório</h1>
          <p className="text-sm text-muted-foreground">Personalize o PDF gerado para esta loja.</p>
        </div>
        <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar template
        </Button>
      </div>

      {/* Branding */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-lg">Identidade visual</h2>

        <div className="flex items-start gap-6 flex-wrap">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {tpl.logo_url ? (
                <img src={tpl.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <label className="inline-flex">
              <Button asChild variant="outline" size="sm" disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                  Enviar logo
                </span>
              </Button>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </label>
          </div>

          <div className="flex-1 min-w-[260px] space-y-3">
            <div>
              <Label>Cor primária</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={tpl.primary_color}
                  onChange={(e) => setTpl({ ...tpl, primary_color: e.target.value })}
                  className="h-10 w-16 p-1"
                />
                <Input
                  value={tpl.primary_color}
                  onChange={(e) => setTpl({ ...tpl, primary_color: e.target.value })}
                  placeholder="#ED5712"
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label>Nome de exibição</Label>
              <Input
                value={tpl.display_name ?? ""}
                onChange={(e) => setTpl({ ...tpl, display_name: e.target.value })}
                placeholder="Ex.: Pizzaria Bella Napoli"
              />
            </div>
            <div>
              <Label>Slogan / subtítulo</Label>
              <Input
                value={tpl.tagline ?? ""}
                onChange={(e) => setTpl({ ...tpl, tagline: e.target.value })}
                placeholder="Ex.: Relatório mensal da minha loja"
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Rodapé do relatório</Label>
          <Textarea
            value={tpl.footer_text ?? ""}
            onChange={(e) => setTpl({ ...tpl, footer_text: e.target.value })}
            placeholder="Texto que aparece no rodapé de cada página"
            rows={2}
          />
        </div>

        <div>
          <Label>Tom do resumo executivo</Label>
          <Select value={tpl.summary_tone} onValueChange={(v) => setTpl({ ...tpl, summary_tone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="consultivo">Consultivo (padrão)</SelectItem>
              <SelectItem value="objetivo">Objetivo e direto</SelectItem>
              <SelectItem value="executivo">Executivo (board)</SelectItem>
              <SelectItem value="acolhedor">Acolhedor / motivacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* KPIs */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-lg">KPIs em destaque</h2>
          <p className="text-sm text-muted-foreground">Defina quais KPIs aparecem na capa e em que ordem.</p>
        </div>

        <div className="space-y-2">
          {tpl.kpi_order.map((key, i) => (
            <div key={key} className="flex items-center justify-between border rounded-md p-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="font-medium text-sm">{KPI_LABELS[key] ?? key}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => moveKpi(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveKpi(i, 1)} disabled={i === tpl.kpi_order.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleKpi(key)}>Remover</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Adicionar KPI</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {Object.keys(KPI_LABELS)
              .filter((k) => !tpl.kpi_order.includes(k))
              .map((k) => (
                <Button key={k} size="sm" variant="outline" onClick={() => toggleKpi(k)}>
                  + {KPI_LABELS[k]}
                </Button>
              ))}
            {Object.keys(KPI_LABELS).every((k) => tpl.kpi_order.includes(k)) && (
              <span className="text-xs text-muted-foreground">Todos os KPIs já adicionados.</span>
            )}
          </div>
        </div>
      </Card>

      {/* Seções */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-lg">Seções e ordem</h2>
          <p className="text-sm text-muted-foreground">Ative/desative seções e arraste para reordenar.</p>
        </div>

        <div className="space-y-2">
          {tpl.sections.map((s, i) => (
            <div key={s.key} className="flex items-center justify-between border rounded-md p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Switch checked={s.enabled} onCheckedChange={() => toggleSection(s.key)} />
                <span className={`font-medium text-sm ${!s.enabled ? "text-muted-foreground line-through" : ""}`}>
                  {SECTION_LABELS[s.key] ?? s.key}
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => moveSection(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveSection(i, 1)} disabled={i === tpl.sections.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
