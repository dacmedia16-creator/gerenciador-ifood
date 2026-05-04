import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const CATEGORY_EMOJI: Record<string, string> = {
  hamburgueria: "🍔",
  pizzaria: "🍕",
  açaí: "🍧",
  acai: "🍧",
  japonesa: "🍣",
  doceria: "🍰",
  saudável: "🥗",
  saudavel: "🥗",
  bebidas: "🥤",
  brasileira: "🍛",
  lanches: "🥪",
};

function emojiFor(category: string): string {
  const c = (category || "").toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_EMOJI)) if (c.includes(k)) return v;
  return "🍽️";
}

interface Testimonial {
  id: string;
  category: string;
  city: string;
  metric_before: string;
  metric_after: string;
  timeframe: string;
  problem_type: string;
}

interface Props {
  problemType: "cancelamento" | "entrega" | "avaliacao" | "cardapio" | null;
}

export function SocialProofRow({ problemType }: Props) {
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    if (!problemType) return;
    (async () => {
      const { data } = await supabase
        .from("case_testimonials")
        .select("id, category, city, metric_before, metric_after, timeframe, problem_type")
        .eq("active", true)
        .eq("problem_type", problemType)
        .limit(3);
      setItems((data as Testimonial[]) || []);
    })();
  }, [problemType]);

  if (!problemType || items.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">Lojas que seguiram um plano parecido:</h3>
      <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1">
        {items.map((t) => (
          <Card
            key={t.id}
            className="min-w-[220px] max-w-[260px] p-3 snap-start shrink-0 bg-background border"
          >
            <div className="text-2xl mb-1">{emojiFor(t.category)}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {t.category} em {t.city}
            </p>
            <p className="text-sm font-bold text-success leading-tight">
              {t.metric_before} → {t.metric_after}
            </p>
            <p className="text-xs text-muted-foreground mt-1">em {t.timeframe}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
