import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Target, TrendingUp } from "lucide-react";
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

export default function Prospects() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [filter, setFilter] = useState<string>("todos");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("prospects").select("*").order("potential_score", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const num = (v: any) => (v === "" || v == null ? null : Number(v));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const input = {
      rating: num(form.rating), reviews_count: num(form.reviews_count),
      delivery_time: num(form.delivery_time), delivery_fee: num(form.delivery_fee),
      has_photos: form.has_photos, has_combos: form.has_combos,
      has_coupons: form.has_coupons, generic_names: form.generic_names,
    };
    const { score, level, main_gap } = scoreProspect(input);

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
    });
    if (error) return toast.error(error.message);
    toast.success(`Prospect adicionado — score ${score}/100`);
    setForm(emptyForm); setOpen(false); load();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> Radar de Prospects</h1>
          <p className="text-sm text-muted-foreground">Lojas analisadas manualmente — quanto maior o score, maior a oportunidade de consultoria.</p>
        </div>
        <Button onClick={() => setOpen(!open)} className="gradient-primary text-primary-foreground">
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
            <div className="md:col-span-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Salvar e calcular score</Button>
            </div>
          </form>
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
            <Card key={p.id} className="p-4 shadow-card">
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

              {p.main_gap && (
                <div className="mt-3 text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">Gargalo principal:</span> {p.main_gap}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
