import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Uploads() {
  const { id } = useParams();
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user || !id) return;
    const { data } = await supabase.storage.from("reports").list(`${user.id}/${id}`);
    setFiles(data || []);
  };
  useEffect(() => { load(); }, [user, id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user || !id) return;
    setUploading(true);
    const path = `${user.id}/${id}/${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("reports").upload(path, f);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Arquivo enviado");
    load();
  };

  const remove = async (name: string) => {
    if (!user || !id) return;
    await supabase.storage.from("reports").remove([`${user.id}/${id}/${name}`]);
    toast.success("Removido"); load();
  };

  const simulate = (name: string) => {
    toast.success(`Simulação: ${name} processado e métricas geradas (mock)`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Upload de relatórios</h1>
      <Card className="p-8 text-center shadow-card border-dashed">
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">Envie planilhas ou relatórios da plataforma (CSV, XLSX, PDF)</p>
        <input type="file" id="file" className="hidden" accept=".csv,.xlsx,.pdf" onChange={onFile} />
        <Button onClick={() => document.getElementById("file")?.click()} disabled={uploading} className="gradient-primary text-primary-foreground">
          {uploading ? "Enviando…" : "Selecionar arquivo"}
        </Button>
      </Card>

      <Card className="shadow-card">
        <div className="p-4 border-b font-semibold">Arquivos enviados</div>
        {files.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p> :
          <ul>
            {files.map((f) => (
              <li key={f.name} className="p-3 border-b last:border-0 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> {f.name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => simulate(f.name)}><Sparkles className="h-3 w-3 mr-1" /> Processar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.name)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </li>
            ))}
          </ul>}
      </Card>

      <p className="text-xs text-muted-foreground">⚙️ MVP: a leitura automática dos arquivos será implementada em breve. Por enquanto os arquivos são armazenados com segurança no seu espaço privado.</p>
    </div>
  );
}
