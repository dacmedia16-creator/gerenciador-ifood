import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Plus, Sparkles, Target, Trash2, TrendingUp, X } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { scoreProspect, levelLabel, levelColor } from "@/lib/prospects/score";

const STATUS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "reuniao", label: "Em reunião" },
  { value: "fechado", label: "Fechado" },
  { value: "descartado", label: "Descartado" },
];

const emptyForm = {
  name: "", city: "", neighborhood: "", platform: "iFood", category: "",
  rating: "", reviews_count: "", delivery_time: "", delivery_fee: "",
  price_range: "$$", has_photos: true, has_combos: false, has_coupons: false,
  generic_names: false, notes: "",
};

const MAX_IMAGES = 4;
const MAX_IMAGE_MB = 5;
const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-prospect`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function Prospects() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [filter, setFilter] = useState<string>("todos");

  // imagens pendentes (data URLs) que serão enviadas para análise/storage
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("prospects").select("*").order("potential_score", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const num = (v: any) => (v === "" || v == null ? null : Number(v));

  const resetForm = () => {
    setForm(emptyForm);
    setPendingImages([]);
    setAiNote("");
    setTab("ai");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - pendingImages.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${MAX_IMAGES} imagens.`);
      return;
    }
    const accepted: string[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Envie apenas imagens.");
        continue;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.error(`Imagem muito grande (máx ${MAX_IMAGE_MB}MB).`);
        continue;
      }
      try { accepted.push(await fileToDataUrl(file)); }
      catch { toast.error("Erro ao ler imagem."); }
    }
    if (accepted.length) setPendingImages((prev) => [...prev, ...accepted]);
  };

  const analyze = async () => {
    if (pendingImages.length === 0) {
      toast.error("Anexe pelo menos 1 imagem.");
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-prospect", {
        body: { images: pendingImages, note: aiNote },
      });
      if (error) {
        const ctx = (error as any).context;
        let parsed: any = null;
        if (ctx?.body) {
          try { parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body; } catch { /* ignore */ }
        }
        toast.error(parsed?.error ?? error.message ?? "Falha na análise.");
        return;
      }
      const d = (data as any)?.data ?? {};
      // mescla no formulário, convertendo números para string (inputs são strings)
      setForm((prev: any) => ({
        ...prev,
        name: d.name ?? prev.name,
        category: d.category ?? prev.category,
        city: d.city ?? prev.city,
        neighborhood: d.neighborhood ?? prev.neighborhood,
        rating: d.rating != null ? String(d.rating) : prev.rating,
        reviews_count: d.reviews_count != null ? String(d.reviews_count) : prev.reviews_count,
        delivery_time: d.delivery_time != null ? String(d.delivery_time) : prev.delivery_time,
        delivery_fee: d.delivery_fee != null ? String(d.delivery_fee) : prev.delivery_fee,
        price_range: d.price_range ?? prev.price_range,
        has_photos: typeof d.has_photos === "boolean" ? d.has_photos : prev.has_photos,
        has_combos: typeof d.has_combos === "boolean" ? d.has_combos : prev.has_combos,
        has_coupons: typeof d.has_coupons === "boolean" ? d.has_coupons : prev.has_coupons,
        generic_names: typeof d.generic_names === "boolean" ? d.generic_names : prev.generic_names,
        notes: d.notes ?? prev.notes,
      }));
      toast.success("Dados extraídos! Revise e salve.");
      setTab("manual");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao analisar imagens.");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || pendingImages.length === 0) return [];
    const paths: string[] = [];
    for (let i = 0; i < pendingImages.length; i++) {
      const blob = dataUrlToBlob(pendingImages[i]);
      const ext = blob.type.split("/")[1] || "png";
      const path = `${user.id}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from("prospect-images").upload(path, blob, {
        contentType: blob.type, upsert: false,
      });
      if (error) {
        console.error("upload error", error);
        toast.error(`Falha ao subir imagem ${i + 1}.`);
        continue;
      }
      paths.push(path);
    }
    return paths;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const input = {
        rating: num(form.rating), reviews_count: num(form.reviews_count),
        delivery_time: num(form.delivery_time), delivery_fee: num(form.delivery_fee),
        has_photos: form.has_photos, has_combos: form.has_combos,
        has_coupons: form.has_coupons, generic_names: form.generic_names,
      };
      const { score, level, main_gap } = scoreProspect(input);

      const imagePaths = await uploadImages();

      const { error } = await supabase.from("prospects").insert({
        user_id: user.id,
        name: form.name, city: form.city, neighborhood: form.neighborhood,
        platform: form.platform, category: form.category,
        rating: input.rating, reviews_count: input.reviews_count,
        delivery_time: input.delivery_time, delivery_fee: input.delivery_fee,
        price_range: form.price_range, has_photos: form.has_photos,
        has_combos: form.has_combos, has_coupons: form.has_coupons,
        generic_names: form.generic_names, notes: form.notes,
        potential_score: score, potential_level: level, main_gap,
        images: imagePaths,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`Prospect adicionado — score ${score}/100`);
      resetForm();
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "contatado") patch.contacted_at = new Date().toISOString();
    const { error } = await supabase.from("prospects").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este prospect?")) return;
    await supabase.from("prospects").delete().eq("id", id);
    load();
  };

  const filtered = useMemo(() => {
    if (filter === "todos") return items;
    if (filter === "alto_potencial") return items.filter((i) => i.potential_score >= 50);
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const stats = useMemo(() => ({
    total: items.length,
    altos: items.filter((i) => i.potential_score >= 50).length,
    contatados: items.filter((i) => i.status !== "novo" && i.status !== "descartado").length,
    fechados: items.filter((i) => i.status === "fechado").length,
  }), [items]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> Radar de Prospects</h1>
          <p className="text-sm text-muted-foreground">Analise lojas digitando os dados ou enviando prints — a IA extrai pra você.</p>
        </div>
        <Button onClick={() => { setOpen(!open); if (open) resetForm(); }} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> Novo prospect
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Alto potencial</div><div className="text-2xl font-bold text-orange-500">{stats.altos}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Em contato</div><div className="text-2xl font-bold">{stats.contatados}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Fechados</div><div className="text-2xl font-bold text-emerald-600">{stats.fechados}</div></Card>
      </div>

      {open && (
        <Card className="p-5 shadow-card">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "ai" | "manual")}>
            <TabsList className="mb-4">
              <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" /> Por imagens (IA)</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie de 1 a {MAX_IMAGES} prints da loja (capa, cardápio, avaliações). A IA vai ler e preencher o formulário automaticamente.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />

              <div className="flex flex-wrap gap-3">
                {pendingImages.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img src={src} alt={`print ${idx + 1}`} className="h-24 w-24 object-cover rounded-md border border-border" />
                    <button
                      type="button"
                      onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {pendingImages.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 w-24 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Anexar</span>
                  </button>
                )}
              </div>

              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  rows={2}
                  value={aiNote}
                  onChange={(e) => setAiNote(e.target.value)}
                  placeholder="Ex: foco em hambúrguer artesanal no Centro de SP"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                <Button
                  type="button"
                  onClick={analyze}
                  disabled={analyzing || pendingImages.length === 0}
                  className="gradient-primary text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {analyzing ? "Analisando…" : "Analisar com IA"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <form onSubmit={save} className="grid md:grid-cols-4 gap-3">
                <div className="md:col-span-2"><Label>Nome da loja *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
                <div><Label>Plataforma</Label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} /></div>
                <div><Label>Categoria</Label><Input placeholder="Pizzaria, Hambúrguer..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Faixa preço</Label><Input value={form.price_range} onChange={(e) => setForm({ ...form, price_range: e.target.value })} /></div>
                <div><Label>Nota</Label><Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>

                <div><Label>Nº avaliações</Label><Input type="number" value={form.reviews_count} onChange={(e) => setForm({ ...form, reviews_count: e.target.value })} /></div>
                <div><Label>Tempo entrega (min)</Label><Input type="number" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} /></div>
                <div><Label>Taxa (R$)</Label><Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} /></div>
                <div className="flex items-end gap-2"><Switch checked={form.has_photos} onCheckedChange={(v) => setForm({ ...form, has_photos: v })} /><Label className="mb-2">Tem fotos</Label></div>

                <div className="flex items-end gap-2"><Switch checked={form.has_combos} onCheckedChange={(v) => setForm({ ...form, has_combos: v })} /><Label className="mb-2">Tem combos</Label></div>
                <div className="flex items-end gap-2"><Switch checked={form.has_coupons} onCheckedChange={(v) => setForm({ ...form, has_coupons: v })} /><Label className="mb-2">Usa cupons</Label></div>
                <div className="flex items-end gap-2"><Switch checked={form.generic_names} onCheckedChange={(v) => setForm({ ...form, generic_names: v })} /><Label className="mb-2">Nomes genéricos</Label></div>

                <div className="md:col-span-4"><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

                {pendingImages.length > 0 && (
                  <div className="md:col-span-4">
                    <Label className="mb-2 block">Imagens anexadas ({pendingImages.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {pendingImages.map((src, idx) => (
                        <img key={idx} src={src} alt="" className="h-16 w-16 object-cover rounded border border-border" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="md:col-span-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                  <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
                    {saving ? "Salvando…" : "Salvar e calcular score"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { v: "todos", l: "Todos" },
          { v: "alto_potencial", l: "Alto potencial" },
          ...STATUS.map((s) => ({ v: s.value, l: s.label })),
        ].map((f) => (
          <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"} onClick={() => setFilter(f.v)}>{f.l}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum prospect ainda. Adicione lojas que você analisou para descobrir oportunidades.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <ProspectCard key={p.id} p={p} onStatus={updateStatus} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ p, onStatus, onRemove }: { p: any; onStatus: (id: string, s: string) => void; onRemove: (id: string) => void }) {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  useEffect(() => {
    const paths: string[] = Array.isArray(p.images) ? p.images : [];
    if (paths.length === 0) { setSignedUrls([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("prospect-images").createSignedUrls(paths, 3600);
      if (cancelled) return;
      setSignedUrls((data || []).map((d: any) => d.signedUrl).filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [p.images]);

  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{p.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {[p.category, p.neighborhood, p.city].filter(Boolean).join(" • ")}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold leading-none">{p.potential_score ?? 0}</div>
          <div className="text-[10px] text-muted-foreground">score</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Badge className={levelColor(p.potential_level || "baixo")}>Potencial {levelLabel(p.potential_level || "baixo")}</Badge>
        {p.rating != null && <Badge variant="outline">⭐ {p.rating}</Badge>}
        {p.delivery_time != null && <Badge variant="outline">{p.delivery_time}min</Badge>}
        {p.reviews_count != null && <Badge variant="outline">{p.reviews_count} aval.</Badge>}
      </div>

      {signedUrls.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {signedUrls.map((src, idx) => (
            <a key={idx} href={src} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={src} alt={`anexo ${idx + 1}`} className="h-14 w-14 object-cover rounded border border-border hover:opacity-80 transition" />
            </a>
          ))}
        </div>
      )}

      {p.main_gap && (
        <div className="mt-3 text-xs bg-muted/50 rounded p-2">
          <span className="font-medium">Gargalo principal:</span> {p.main_gap}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Select value={p.status} onValueChange={(v) => onStatus(p.id, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="icon" variant="ghost" onClick={() => onRemove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </Card>
  );
}
