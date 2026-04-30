import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStoreData(storeId?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

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

      // RLS-aware redirect: store inexistente ou sem acesso
      if (!s.data) {
        toast.error("Loja não encontrada ou sem acesso.");
        navigate("/app/stores", { replace: true });
        return;
      }

      setData({
        store: s.data, metrics: m.data || [], products: p.data || [], reviews: r.data || [],
        competitors: c.data || [], campaigns: ca.data || [], diagnostics: d.data || [], actions: a.data || [],
      });
      setLoading(false);
    })();
  }, [storeId, refresh, navigate]);

  return { ...(data || {}), loading, reload: () => setRefresh((x) => x + 1) };
}
