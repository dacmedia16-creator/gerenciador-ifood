import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStoreData(storeId?: string) {
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["storeData", storeId],
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async () => {
      const [s, m, p, r, c, ca, d, a] = await Promise.all([
        supabase.from("stores").select("*").eq("id", storeId!).maybeSingle(),
        supabase.from("metrics")
          .select("id, period_start, period_end, revenue, orders, average_ticket, cancellation_rate")
          .eq("store_id", storeId!)
          .order("period_start"),
        supabase.from("products")
          .select("*")
          .eq("store_id", storeId!)
          .order("sales_quantity", { ascending: false })
          .limit(500),
        supabase.from("reviews")
          .select("*")
          .eq("store_id", storeId!)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("competitors").select("*").eq("store_id", storeId!),
        supabase.from("campaigns").select("*").eq("store_id", storeId!),
        supabase.from("diagnostics")
          .select("id, area, problem, severity, recommended_solution, business_impact, created_at")
          .eq("store_id", storeId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("action_plans")
          .select("id, title, area, priority, status, impact, effort, description, created_at, completed_at, impacto_financeiro, dificuldade, tempo_estimado, categoria, feedback_text, has_feedback, why_it_matters, how_to_apply, recommendation_id")
          .eq("store_id", storeId!)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      return {
        store: s.data,
        metrics: m.data || [],
        products: p.data || [],
        reviews: r.data || [],
        competitors: c.data || [],
        campaigns: ca.data || [],
        diagnostics: d.data || [],
        actions: a.data || [],
      };
    },
  });

  useEffect(() => {
    if (query.data && !query.data.store) {
      toast.error("Loja não encontrada ou sem acesso.");
      navigate("/app/store", { replace: true });
    }
  }, [query.data, navigate]);

  const data = query.data;
  return {
    store: data?.store,
    metrics: data?.metrics ?? [],
    products: data?.products ?? [],
    reviews: data?.reviews ?? [],
    competitors: data?.competitors ?? [],
    campaigns: data?.campaigns ?? [],
    diagnostics: data?.diagnostics ?? [],
    actions: data?.actions ?? [],
    loading: query.isLoading,
    reload: () => query.refetch(),
  };
}
