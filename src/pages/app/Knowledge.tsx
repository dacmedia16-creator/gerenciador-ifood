import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/LoadingState";
import { BookOpen, Archive } from "lucide-react";

export default function Knowledge() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("area")
        .order("source")
        .order("title");
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  const activeCount = items.filter((k: any) => k.status === "ativo" || !k.status).length;
  const archivedCount = items.filter((k: any) => k.status === "arquivado").length;

  const filtered = items.filter((k: any) => {
    const status = k.status ?? "ativo";
    if (!showArchived && status !== "ativo") return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      k.title?.toLowerCase().includes(needle) ||
      k.content?.toLowerCase().includes(needle) ||
      k.area?.toLowerCase().includes(needle) ||
      k.chunk_id?.toLowerCase().includes(needle)
    );
  });

  const byArea = filtered.reduce((acc: Record<string, any[]>, k) => {
    (acc[k.area] = acc[k.area] || []).push(k);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Base de conhecimento</h1>
        <Badge variant="outline" className="ml-2">{activeCount} ativos</Badge>
        {archivedCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Archive className="h-3 w-3" /> {archivedCount} arquivados
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived" className="text-sm cursor-pointer">
            Mostrar arquivados
          </Label>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Princípios e heurísticas que o Gestor IA usa. Versões arquivadas ficam aqui só para auditoria — o RAG usa apenas os ativos.
      </p>

      <Input
        placeholder="Buscar por título, área, chunk_id ou conteúdo…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {Object.entries(byArea).map(([area, list]) => (
        <div key={area} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">{area}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {(list as any[]).map((k) => {
              const isArchived = k.status === "arquivado";
              return (
                <Card key={k.id} className={`p-4 shadow-card ${isArchived ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <strong className="text-sm">{k.title}</strong>
                    {k.topic && (
                      <Badge variant="secondary" className="text-[10px]">{k.topic}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {k.chunk_id && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {k.chunk_id} v{k.chunk_version ?? 1}
                      </Badge>
                    )}
                    {k.source && k.source !== "manual" && (
                      <Badge variant="outline" className="text-[10px]">
                        {k.source}
                        {k.source_version && k.source_version > 1 ? ` v${k.source_version}` : ""}
                      </Badge>
                    )}
                    {isArchived && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Archive className="h-3 w-3" /> arquivado
                      </Badge>
                    )}
                    {k.status === "rascunho" && (
                      <Badge variant="secondary" className="text-[10px]">rascunho</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{k.content}</p>
                  {k.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {k.tags.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">Nenhum resultado.</Card>
      )}
    </div>
  );
}
