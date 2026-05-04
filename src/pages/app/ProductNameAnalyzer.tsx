import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/LoadingState";
import { invokeAI } from "@/lib/ai/invokeAI";
import { Sparkles, ArrowRight, Package } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  original: string;
  suggested: string;
  reason: string;
  score: number;
}

const wordsCount = (s?: string) => (s || "").trim().split(/\s+/).filter(Boolean).length;

export default function ProductNameAnalyzer() {
  const { id } = useParams();
  const { products, store, loading } = useStoreData(id);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [manualNames, setManualNames] = useState("");

  if (loading) return <LoadingState />;

  const hasProducts = !!products?.length;
  const generic = (products || []).filter((p: any) => p.name && wordsCount(p.name) < 3);

  const analyze = async (source: "db" | "manual") => {
    setBusy(true);
    try {
      let payload: Array<{ name: string; category?: string; ingredients?: string }> = [];
      if (source === "db") {
        payload = products.slice(0, 20).map((p: any) => ({
          name: p.name,
          category: p.category,
          ingredients: p.description,
        }));
      } else {
        payload = manualNames
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 20)
          .map((name) => ({ name, category: store?.category }));
        if (payload.length === 0) {
          toast.error("Digite ao menos um nome de produto");
          setBusy(false);
          return;
        }
      }
      const res = await invokeAI<{ suggestions: Suggestion[] }>("suggest-product-names", {
        products: payload,
        segment: store?.category,
      });
      setSuggestions(res.suggestions || []);
      toast.success(`${res.suggestions?.length || 0} sugestões geradas`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar sugestões");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Analisador de Nome de Produto</h1>
        <p className="text-sm text-muted-foreground">SEO interno do cardápio: nomes claros, atrativos e com palavras-chave.</p>
      </div>

      {hasProducts ? (
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm">
                <strong>{generic.length}</strong> produto(s) com nome genérico (menos de 3 palavras) detectados.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Regra: nome ideal tem categoria + ingrediente + diferencial.</p>
            </div>
            <Button onClick={() => analyze("db")} disabled={busy} className="gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4 mr-1" /> {busy ? "Gerando…" : "Sugerir nomes com IA"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 shadow-card border-dashed">
          <div className="flex items-start gap-3 mb-3">
            <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Você ainda não tem produtos cadastrados.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Digite abaixo os nomes que quer otimizar (um por linha) ou{" "}
                <Link to={`/app/stores/${id}/products`} className="underline text-primary">
                  cadastre seus produtos
                </Link>{" "}
                para análise completa.
              </p>
            </div>
          </div>
          <Textarea
            value={manualNames}
            onChange={(e) => setManualNames(e.target.value)}
            placeholder={"Ex.:\nX-Burger\nBatata frita\nRefrigerante 350ml"}
            rows={6}
            className="mb-3"
          />
          <Button onClick={() => analyze("manual")} disabled={busy} className="gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4 mr-1" /> {busy ? "Gerando…" : "Otimizar com IA"}
          </Button>
        </Card>
      )}

      {hasProducts && generic.length > 0 && (
        <Card className="p-4 shadow-card">
          <h2 className="font-semibold mb-3">Detectados como genéricos</h2>
          <ul className="space-y-1 text-sm">
            {generic.map((p: any) => (
              <li key={p.id} className="flex items-center gap-2">
                <Badge variant="destructive">{wordsCount(p.name)} palavra(s)</Badge>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card className="p-4 shadow-card">
          <h2 className="font-semibold mb-4">Sugestões da IA</h2>
          <div className="space-y-4">
            {suggestions.map((s, i) => (
              <div key={i} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="line-through text-muted-foreground">{s.original}</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <strong className="text-primary">{s.suggested}</strong>
                  <Badge variant={s.score < 50 ? "destructive" : s.score < 75 ? "secondary" : "default"}>
                    Score atual: {s.score}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{s.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
