// Helpers de memória, RAG e histórico para o Gestor IA.
//
// IMPORTANTE — RAG v1: a função embedText() deste módulo usa um embedding
// LEXICAL determinístico (ver _shared/embeddings.ts). Isso significa que
// findSimilarCases / findKnowledgeSnippets fazem busca por sobreposição de
// palavras-chave, NÃO por significado. Sinônimos não casam. Quando trocarmos
// para embeddings reais, a interface destas funções não muda.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { embedText, embedTextWithMeta, toPgVector, type RagMode } from "./embeddings.ts";
import type { RuleEvidence } from "./evidences.ts";

export interface RagSearchResult<T> {
  items: T[];
  mode: RagMode;
  reason?: string;
}

export async function loadStoreMemory(supabase: SupabaseClient, storeId: string) {
  const { data } = await supabase.from("store_memory").select("*").eq("store_id", storeId).maybeSingle();
  return data;
}

export async function loadPastRecommendations(supabase: SupabaseClient, storeId: string, days = 90) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("recommendation_history")
    .select("id, rule_id, recommendation, status, outcome, source, applied_at, metrics_before, metrics_after, created_at")
    .eq("store_id", storeId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  return data ?? [];
}

export function buildSearchText(evidences: RuleEvidence[]): string {
  const top = evidences
    .filter((e) => e.severity !== "ok")
    .slice(0, 8)
    .map((e) => `${e.area} ${e.metric} ${e.recommended_action}`)
    .join(". ");
  return top || "delivery diagnostico geral";
}

export async function findSimilarCases(supabase: SupabaseClient, queryText: string, limit = 3) {
  const vec = await embedText(queryText);
  if (!vec) return [];
  const { data, error } = await supabase.rpc("match_cases", {
    query_embedding: toPgVector(vec) as any,
    match_count: limit,
    filter_rule_id: null,
  });
  if (error) {
    console.warn("match_cases error", error);
    return [];
  }
  return (data ?? []).filter((c: any) => c.similarity > 0.5);
}

export async function findKnowledgeSnippets(
  supabase: SupabaseClient,
  queryText: string,
  areas: string[] | null = null,
  limit = 5
) {
  const vec = await embedText(queryText);
  if (!vec) return [];
  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: toPgVector(vec) as any,
    match_count: limit,
    filter_areas: areas,
  });
  if (error) {
    console.warn("match_knowledge error", error);
    return [];
  }
  return (data ?? []).filter((k: any) => k.similarity > 0.4);
}

export function buildMetricsSnapshot(store: any, lastMetric: any) {
  return {
    rating: store?.rating,
    promised_delivery_time: store?.promised_delivery_time,
    delivery_fee: store?.delivery_fee,
    average_ticket: store?.average_ticket ?? lastMetric?.average_ticket,
    monthly_revenue: store?.monthly_revenue ?? lastMetric?.revenue,
    monthly_orders: store?.monthly_orders ?? lastMetric?.orders,
    cancellation_rate: store?.cancellation_rate ?? lastMetric?.cancellation_rate,
    captured_at: new Date().toISOString(),
  };
}
