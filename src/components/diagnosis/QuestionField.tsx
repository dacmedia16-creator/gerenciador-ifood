import { Question } from "@/lib/diagnosis/steps";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Plus, Trash2 } from "lucide-react";

interface FieldProps {
  question: Question;
  value: any;
  onChange: (v: any) => void;
}

export function QuestionField({ question, value, onChange }: FieldProps) {
  const q = question;

  if (q.type === "info") return null;

  const labelEl = (
    <div className="flex items-center gap-2 mb-1.5">
      <Label className="text-sm font-medium">
        {q.label}
        {q.required && <span className="text-destructive ml-1">*</span>}
        {q.essential && !q.required && <span className="text-warning text-xs ml-2">(essencial)</span>}
      </Label>
      {q.tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{q.tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  if (q.type === "text") {
    return (
      <div>
        {labelEl}
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />
      </div>
    );
  }

  if (q.type === "textarea") {
    return (
      <div>
        {labelEl}
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} rows={3} />
      </div>
    );
  }

  if (q.type === "number" || q.type === "currency") {
    return (
      <div>
        {labelEl}
        <Input
          type="number"
          step={q.type === "currency" ? "0.01" : "any"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          min={q.min}
          max={q.max}
        />
      </div>
    );
  }

  if (q.type === "select") {
    return (
      <div>
        {labelEl}
        <select
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Selecione…</option>
          {q.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (q.type === "multiselect") {
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
      onChange(next);
    };
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {q.options?.map((o) => {
            const active = selected.includes(o.value);
            return (
              <Button
                key={o.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => toggle(o.value)}
              >
                {o.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === "yesno") {
    return (
      <div>
        {labelEl}
        <div className="flex gap-2">
          {[
            { v: true, l: "Sim" },
            { v: false, l: "Não" },
          ].map((opt) => (
            <Button
              key={String(opt.v)}
              type="button"
              variant={value === opt.v ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(opt.v)}
            >
              {opt.l}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "rating3") {
    return (
      <div>
        {labelEl}
        <div className="flex gap-2">
          {[
            { v: "bom", l: "Bom" },
            { v: "atencao", l: "Atenção" },
            { v: "ruim", l: "Ruim" },
          ].map((opt) => (
            <Button
              key={opt.v}
              type="button"
              variant={value === opt.v ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(opt.v)}
            >
              {opt.l}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "products") {
    const items: any[] = Array.isArray(value) ? value : [];
    const add = () =>
      onChange([
        ...items,
        { name: "", category: "", sale_price: null, food_cost: null, packaging_cost: null, platform_fee_percent: 23, sales_quantity: 0, has_photo: false, has_description: false, has_complaints: false, notes: "" },
      ]);
    const update = (i: number, k: string, v: any) => {
      const next = [...items];
      next[i] = { ...next[i], [k]: v };
      onChange(next);
    };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    return (
      <div className="space-y-3">
        {labelEl}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground border-dashed border rounded-md p-4 text-center">
            Nenhum produto cadastrado. Adicione pelo menos os 5 mais vendidos.
          </p>
        )}
        {items.map((p, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Produto {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Input placeholder="Nome" value={p.name} onChange={(e) => update(i, "name", e.target.value)} />
              <Input placeholder="Categoria" value={p.category} onChange={(e) => update(i, "category", e.target.value)} />
              <Input type="number" placeholder="Preço de venda" value={p.sale_price ?? ""} onChange={(e) => update(i, "sale_price", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Custo do alimento" value={p.food_cost ?? ""} onChange={(e) => update(i, "food_cost", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Custo embalagem" value={p.packaging_cost ?? ""} onChange={(e) => update(i, "packaging_cost", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Taxa plataforma %" value={p.platform_fee_percent ?? ""} onChange={(e) => update(i, "platform_fee_percent", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Qtd vendida" value={p.sales_quantity ?? ""} onChange={(e) => update(i, "sales_quantity", e.target.value ? Number(e.target.value) : 0)} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.has_photo} onChange={(e) => update(i, "has_photo", e.target.checked)} /> Tem foto</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.has_description} onChange={(e) => update(i, "has_description", e.target.checked)} /> Tem descrição</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.has_complaints} onChange={(e) => update(i, "has_complaints", e.target.checked)} /> Recebe reclamações</label>
            </div>
            <Input placeholder="Observações" value={p.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar produto
        </Button>
      </div>
    );
  }

  if (q.type === "competitors") {
    const items: any[] = Array.isArray(value) ? value : [];
    const add = () =>
      onChange([
        ...items,
        { name: "", rating: null, delivery_time: null, delivery_fee: null, price_range: "", photo_quality: "", has_combos: false, has_coupons: false, more_professional: false, notes: "" },
      ]);
    const update = (i: number, k: string, v: any) => {
      const next = [...items];
      next[i] = { ...next[i], [k]: v };
      onChange(next);
    };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    return (
      <div className="space-y-3">
        {labelEl}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground border-dashed border rounded-md p-4 text-center">
            Nenhum concorrente cadastrado.
          </p>
        )}
        {items.map((c, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Concorrente {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Input placeholder="Nome" value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
              <Input type="number" step="0.1" placeholder="Nota (0-5)" value={c.rating ?? ""} onChange={(e) => update(i, "rating", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Prazo entrega (min)" value={c.delivery_time ?? ""} onChange={(e) => update(i, "delivery_time", e.target.value ? Number(e.target.value) : null)} />
              <Input type="number" placeholder="Taxa entrega R$" value={c.delivery_fee ?? ""} onChange={(e) => update(i, "delivery_fee", e.target.value ? Number(e.target.value) : null)} />
              <Input placeholder="Faixa de preço (ex.: $$)" value={c.price_range} onChange={(e) => update(i, "price_range", e.target.value)} />
              <Input placeholder="Qualidade fotos" value={c.photo_quality} onChange={(e) => update(i, "photo_quality", e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!c.has_combos} onChange={(e) => update(i, "has_combos", e.target.checked)} /> Tem combos</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!c.has_coupons} onChange={(e) => update(i, "has_coupons", e.target.checked)} /> Tem cupons</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!c.more_professional} onChange={(e) => update(i, "more_professional", e.target.checked)} /> Parece mais profissional</label>
            </div>
            <Input placeholder="Observações" value={c.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar concorrente
        </Button>
      </div>
    );
  }

  if (q.type === "files") {
    return <FilesField value={value} onChange={onChange} />;
  }

  return null;
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Upload } from "lucide-react";

function FilesField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const { user } = useAuth();
  const params = useParams();
  const [uploading, setUploading] = useState(false);
  const files: any[] = Array.isArray(value) ? value : [];

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${params.sessionId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      onChange([...files, { name: file.name, path, size: file.size, uploaded_at: new Date().toISOString() }]);
      toast.success("Arquivo recebido");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 block">
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{uploading ? "Enviando…" : "Clique ou arraste arquivos"}</p>
        <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, PDF, prints e relatórios</p>
        <input
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex justify-between border rounded-md px-3 py-2 bg-muted/30">
              <span className="truncate">{f.name}</span>
              <span className="text-xs text-success">arquivo recebido</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
