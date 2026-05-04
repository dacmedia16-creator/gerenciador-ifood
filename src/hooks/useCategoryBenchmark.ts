import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryBenchmark {
  // média de score por área (chave da área em minúsculas, sem acento? mantemos como vem)
  scoresByArea: Record<string, number>;
  sampleSize: number;
  hasEnoughData: boolean; // >= 3 lojas
}

const EMPTY: CategoryBenchmark = { scoresByArea: {}, sampleSize: 0, hasEnoughData: false };

export function useCategoryBenchmark(category?: string | null) {
  const [data, setData] = useState<CategoryBenchmark>(EMPTY);

  useEffect(() => {
    if (!category) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;
    (async () => {
      // Buscar snapshots dos últimos 90 dias de lojas na mesma categoria
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("category", category);
      const storeIds = (stores || []).map((s: any) => s.id);
      if (storeIds.length === 0) {
        if (!cancelled) setData(EMPTY);
        return;
      }
      const { data: snaps } = await supabase
        .from("evolution_snapshots")
        .select("store_id, scores_by_area")
        .in("store_id", storeIds)
        .gte("created_at", ninetyDaysAgo);

      // Pegar 1 snapshot mais recente por loja (aqui simplificamos pegando todos, média ainda válida)
      const sums: Record<string, { sum: number; n: number }> = {};
      const uniqueStores = new Set<string>();
      for (const s of snaps || []) {
        uniqueStores.add(s.store_id);
        const sba = (s.scores_by_area as Record<string, any>) || {};
        for (const [area, val] of Object.entries(sba)) {
          const v = Number(val);
          if (!Number.isFinite(v)) continue;
          if (!sums[area]) sums[area] = { sum: 0, n: 0 };
          sums[area].sum += v;
          sums[area].n += 1;
        }
      }
      const scoresByArea: Record<string, number> = {};
      for (const [area, { sum, n }] of Object.entries(sums)) {
        if (n > 0) scoresByArea[area] = Math.round(sum / n);
      }
      if (!cancelled) {
        setData({
          scoresByArea,
          sampleSize: uniqueStores.size,
          hasEnoughData: uniqueStores.size >= 3,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  return data;
}
