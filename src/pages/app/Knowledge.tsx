import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/LoadingState";
import { BookOpen } from "lucide-react";

export default function Knowledge() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("area")
        .order("title");
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  const filtered = items.filter(
    (k) =>
      !q ||
      k.title?.toLowerCase().includes(q.toLowerCase()) ||
      k.content?.toLowerCase().includes(q.toLowerCase()) ||
      k.area?.toLowerCase().includes(q.toLowerCase())
  );

  const byArea = filtered.reduce((acc: Record<string, any[]>, k) => {
    (acc[k.area] = acc[k.area] || []).push(k);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Base de conhecimento</h1>
        <Badge variant="outline" className="ml-auto">{items.length} entradas</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Princípios e heurísticas que o Gestor IA usa para fundamentar recomendações.
      </p>

      <Input placeholder="Buscar por título, área ou conteúdo…" value={q} onChange={(e) => setQ(e.target.value)} />

      {Object.entries(byArea).map(([area, list]) => (
        <div key={area} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">{area}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {(list as any[]).map((k) => (
              <Card key={k.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <strong className="text-sm">{k.title}</strong>
                  {k.topic && <Badge variant="secondary" className="text-[10px]">{k.topic}</Badge>}
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
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">Nenhum resultado.</Card>
      )}
    </div>
  );
}
