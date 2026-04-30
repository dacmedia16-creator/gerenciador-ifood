import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStoreData(storeId?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    (async () => {
      const [s, m, p, r, c, ca, d, a] = await Promise.all([
        supabase.from("stores").select("*").eq("id", storeId).maybeSingle(),
        supabase.from("metrics").select("*").eq("store_id", storeId).order("period_start"),
        supabase.from("products").select("*").eq("store_id", storeId).order("sales_quantity", { ascending: false }),
        supabase.from("reviews").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
        supabase.from("competitors").select("*").eq("store_id", storeId),
        supabase.from("campaigns").select("*").eq("store_id", storeId),
        supabase.from("diagnostics").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
        supabase.from("action_plans").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
      ]);
      setData({
        store: s.data, metrics: m.data || [], products: p.data || [], reviews: r.data || [],
        competitors: c.data || [], campaigns: ca.data || [], diagnostics: d.data || [], actions: a.data || [],
      });
      setLoading(false);
    })();
  }, [storeId, refresh]);

  return { ...(data || {}), loading, reload: () => setRefresh((x) => x + 1) };
}
