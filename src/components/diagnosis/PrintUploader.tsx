import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const PRINT_CLASSIFICATIONS = [
  { value: "loja", label: "Loja" },
  { value: "cardapio", label: "Cardápio" },
  { value: "produto", label: "Produto" },
  { value: "avaliacoes", label: "Avaliações" },
  { value: "indicadores", label: "Indicadores" },
  { value: "promocoes", label: "Promoções" },
  { value: "concorrentes", label: "Concorrentes" },
  { value: "faturamento", label: "Faturamento" },
  { value: "outro", label: "Outro" },
] as const;

interface Props {
  sessionId: string;
  storeId?: string | null;
  defaultClassification?: string;
}

export function PrintUploader({ sessionId, storeId, defaultClassification = "outro" }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("diagnosis_uploads")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { load(); }, [sessionId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${user.id}/${storeId || "no-store"}/${sessionId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("diagnosis-uploads").upload(path, file);
        if (upErr) throw upErr;
        const { data: ins, error: insErr } = await supabase
          .from("diagnosis_uploads")
          .insert({
            session_id: sessionId,
            store_id: storeId || null,
            user_id: user.id,
            storage_path: path,
            mime_type: file.type,
            classification: defaultClassification,
            status: "pending",
          })
          .select()
          .single();
        if (insErr) throw insErr;
        setItems((prev) => [ins, ...prev]);
        // dispara processamento em background
        supabase.functions.invoke("process-print", { body: { upload_id: ins.id } })
          .then(({ error }) => {
            if (error) console.warn("process-print", error);
            load();
          });
      }
      toast.success("Print enviado. A IA está analisando…");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const updateClassification = async (id: string, classification: string) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, classification, status: "pending" } : it));
    await supabase.from("diagnosis_uploads").update({ classification, status: "pending" }).eq("id", id);
    supabase.functions.invoke("process-print", { body: { upload_id: id } }).then(() => load());
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("diagnosis-uploads").remove([path]);
    await supabase.from("diagnosis_uploads").delete().eq("id", id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="space-y-3">
      <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 block">
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{uploading ? "Enviando…" : "Clique para enviar prints"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          iFood, 99Food, WhatsApp, Instagram, cardápio, avaliações, indicadores, faturamento…
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {items.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <Card key={it.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{it.storage_path.split("/").pop()}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(it.id, it.storage_path)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <select
                className="w-full border rounded-md px-2 py-1 text-sm bg-background"
                value={it.classification}
                onChange={(e) => updateClassification(it.id, e.target.value)}
              >
                {PRINT_CLASSIFICATIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs">
                {it.status === "processed" && (
                  <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Analisado</Badge>
                )}
                {it.status === "pending" && (
                  <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analisando…</Badge>
                )}
                {it.status === "failed" && (
                  <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Falhou</Badge>
                )}
              </div>
              {it.status === "processed" && it.structured_data && Object.keys(it.structured_data).filter(k => !k.startsWith("_")).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver dados extraídos</summary>
                  <pre className="mt-1 bg-muted/50 p-2 rounded text-[11px] overflow-auto">
                    {JSON.stringify(it.structured_data, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
