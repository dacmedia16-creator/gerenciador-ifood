import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseMetricsCSV, parseProductsCSV, parseReviewsCSV, type ParseResult } from "@/lib/import/parsers";
import { downloadTemplate } from "@/lib/import/templates";

type Kind = "metrics" | "products" | "reviews";

const TITLES: Record<Kind, string> = {
  metrics: "Métricas mensais",
  products: "Produtos do cardápio",
  reviews: "Avaliações de clientes",
};

const PARSERS: Record<Kind, (text: string) => ParseResult<any>> = {
  metrics: parseMetricsCSV,
  products: parseProductsCSV,
  reviews: parseReviewsCSV,
};

const TABLES: Record<Kind, string> = {
  metrics: "metrics",
  products: "products",
  reviews: "reviews",
};

function ImporterCard({ kind, storeId, onDone }: { kind: Kind; storeId: string; onDone: () => void }) {
  const [preview, setPreview] = useState<ParseResult<any> | null>(null);
  const [importing, setImporting] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const res = PARSERS[kind](text);
    setPreview(res);
  };

  const confirm = async () => {
    if (!preview || preview.rows.length === 0) return;
    setImporting(true);
    const payload = preview.rows.map((r) => ({ ...r, store_id: storeId }));
    const { error } = await supabase.from(TABLES[kind] as any).insert(payload);
    setImporting(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${preview.rows.length} registros importados`);
      setPreview(null); onDone();
    }
  };

  return (
    <Card className="p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{TITLES[kind]}</h3>
        <Button variant="ghost" size="sm" onClick={() => downloadTemplate(kind)}>
          <Download className="h-3 w-3 mr-1" /> Template
        </Button>
      </div>
      <input id={`f-${kind}`} type="file" className="hidden" accept=".csv" onChange={onFile} />
      <Button variant="outline" className="w-full" onClick={() => document.getElementById(`f-${kind}`)?.click()}>
        <Upload className="h-4 w-4 mr-1" /> Selecionar CSV
      </Button>

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />{preview.rows.length} válidos</Badge>
            {preview.errors.length > 0 && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{preview.errors.length} erros</Badge>}
            <span className="text-muted-foreground text-xs">de {preview.total} linhas</span>
          </div>
          {preview.errors.length > 0 && (
            <div className="max-h-32 overflow-auto text-xs bg-destructive/10 p-2 rounded">
              {preview.errors.slice(0, 5).map((e, i) => (
                <div key={i}>Linha {e.row}: {e.message}</div>
              ))}
              {preview.errors.length > 5 && <div className="text-muted-foreground">+ {preview.errors.length - 5} outros…</div>}
            </div>
          )}
          {preview.rows.length > 0 && (
            <div className="max-h-40 overflow-auto text-xs border rounded">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>{Object.keys(preview.rows[0]).map((k) => <th key={k} className="p-1 text-left">{k}</th>)}</tr></thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">{Object.values(r).map((v: any, j) => <td key={j} className="p-1">{String(v ?? "")}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button onClick={confirm} disabled={importing || preview.rows.length === 0} className="w-full gradient-primary text-primary-foreground">
            {importing ? "Importando…" : `Importar ${preview.rows.length} registros`}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Uploads() {
  const { id } = useParams();
  const [files, setFiles] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  const loadFiles = async () => {
    if (!id) return;
    const { data } = await supabase.storage.from("reports").list(id);
    setFiles(data || []);
  };
  useEffect(() => { loadFiles(); }, [id, version]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar dados</h1>
        <p className="text-sm text-muted-foreground">
          Importe planilhas <strong>CSV</strong> exportadas do iFood, Rappi ou outras plataformas. Baixe um template para ver o formato esperado.
        </p>
      </div>

      <Card className="p-4 border-dashed bg-muted/30 shadow-none">
        <p className="text-sm">
          <strong>Em breve:</strong> importação direta de <code>.xlsx</code> e leitura de <code>.pdf</code> exportados das plataformas.
          Por enquanto, exporte como CSV ou use o <button onClick={() => document.getElementById("f-metrics")?.click()} className="text-primary underline">template oficial</button>.
        </p>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <ImporterCard kind="metrics" storeId={id} onDone={() => setVersion((v) => v + 1)} />
        <ImporterCard kind="products" storeId={id} onDone={() => setVersion((v) => v + 1)} />
        <ImporterCard kind="reviews" storeId={id} onDone={() => setVersion((v) => v + 1)} />
      </div>

      {files.length > 0 && (
        <Card className="p-4 shadow-card">
          <h3 className="font-semibold mb-2">Relatórios PDF gerados</h3>
          <ul className="text-sm space-y-1">{files.map((f) => <li key={f.name} className="text-muted-foreground">{f.name}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
