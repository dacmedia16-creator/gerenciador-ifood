// Cache helpers para respostas de IA.
// Uso restrito ao backend (service_role).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type CacheType = "diagnosis" | "review_analysis" | "suggestion";

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = sortDeep(obj[k]);
      return acc;
    }, {});
  }
  return value;
}

export async function buildCacheKey(inputs: Record<string, unknown>): Promise<string> {
  const normalized = JSON.stringify(sortDeep(inputs));
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getCached(
  admin: SupabaseClient,
  inputHash: string,
): Promise<{ response: unknown; model: string } | null> {
  const { data, error } = await admin
    .from("ai_cache")
    .select("id, response, model, expires_at, hit_count")
    .eq("input_hash", inputHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  // incremento best-effort
  admin
    .from("ai_cache")
    .update({ hit_count: (data.hit_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {});
  return { response: data.response, model: data.model };
}

export async function putCached(
  admin: SupabaseClient,
  params: {
    inputHash: string;
    storeId?: string | null;
    cacheType: CacheType;
    response: unknown;
    model: string;
    tokensUsed?: number | null;
    ttlSeconds: number;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + params.ttlSeconds * 1000).toISOString();
  await admin.from("ai_cache").upsert(
    {
      input_hash: params.inputHash,
      store_id: params.storeId ?? null,
      cache_type: params.cacheType,
      response: params.response as never,
      model: params.model,
      tokens_used: params.tokensUsed ?? null,
      expires_at: expiresAt,
      hit_count: 0,
    },
    { onConflict: "input_hash" },
  );
}

export async function invalidateDiagnosisCache(
  admin: SupabaseClient,
  storeId: string,
): Promise<void> {
  await admin
    .from("ai_cache")
    .delete()
    .eq("store_id", storeId)
    .eq("cache_type", "diagnosis");
}

export const CACHE_TTL = {
  diagnosis: 7 * 24 * 60 * 60,
  review_analysis: 24 * 60 * 60,
  suggestion: 30 * 24 * 60 * 60,
} as const;
