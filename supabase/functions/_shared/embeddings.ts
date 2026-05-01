// ============================================================
// RAG embeddings — semântico (v2) com fallback lexical (v1).
//
// v2 (default): chama Google Generative Language API diretamente
//   (text-embedding-004, 768 dims) usando GEMINI_API_KEY.
//   Casa exatamente com a coluna vector(768) das tabelas.
//   Obs: o Lovable AI Gateway hoje só expõe modelos de chat/imagem,
//   por isso vamos direto na API do Google para embeddings.
//
// v1 (fallback): hashing FNV-1a sobre tokens. NÃO captura semântica,
//   só sobreposição de palavras. Usado quando a API falha
//   (429/5xx/timeout) ou quando RAG_MODE=lexical é forçado.
//
// Convenção de versão: registros embeddados com v2 têm
// embedding_version = 2 nas tabelas; v1 = 1. Consultas só comparam
// vetores de mesma versão de forma confiável — por isso, ao mudar
// de modelo, é preciso reembedar tudo via embed-knowledge.
// ============================================================

export const EMBED_DIMS = 768;
export const EMBED_MODEL_VERSION = 2; // v2 = semântico (text-embedding-004)
export const EMBED_MODEL_NAME = "google/text-embedding-004";

const STOPWORDS = new Set([
  "de","da","do","das","dos","a","o","e","ou","para","com","em","no","na","nos","nas",
  "um","uma","uns","umas","que","se","por","mais","menos","ao","aos","sua","seu","suas","seus",
  "the","a","an","and","or","of","to","for","with","in","on","at","is","are","be","this","that",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function l2Normalize(v: number[]): number[] {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

/** RAG v1 — embedding lexical determinístico (fallback). */
export function embedTextLexical(text: string): number[] | null {
  if (!text?.trim()) return null;
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const vec = new Array<number>(EMBED_DIMS).fill(0);
  for (const tok of tokens) {
    const i1 = hash32(tok) % EMBED_DIMS;
    const i2 = hash32("x" + tok) % EMBED_DIMS;
    vec[i1] += 1;
    vec[i2] += 0.5;
  }
  return l2Normalize(vec);
}

export type RagMode = "full" | "degraded";

export interface EmbedResult {
  vector: number[] | null;
  mode: RagMode;
  reason?: string;
  /** Versão do modelo usado para gerar o vetor (1 = lexical, 2 = semântico). */
  version?: number;
}

// ============================================================
// Cache em memória (LRU simples) por hash do texto.
// Reduz custo quando o mesmo texto é embeddado 2x na mesma invocação.
// ============================================================
const CACHE_MAX = 200;
const cache = new Map<string, EmbedResult>();
function cacheGet(key: string): EmbedResult | undefined {
  const v = cache.get(key);
  if (v) {
    cache.delete(key);
    cache.set(key, v); // move-to-end
  }
  return v;
}
function cacheSet(key: string, val: EmbedResult) {
  cache.set(key, val);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

// ============================================================
// Semântico: Google Generative Language API direta.
// Endpoint: models/text-embedding-004:embedContent
// Auth: ?key=GEMINI_API_KEY (chave do Google AI Studio).
// ============================================================
async function embedTextSemantic(
  text: string,
  apiKey: string,
): Promise<{ vector: number[]; reason: string } | { error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 429) return { error: "rate_limited" };
      if (res.status === 401 || res.status === 403) return { error: "unauthorized" };
      const body = await res.text().catch(() => "");
      console.warn("embeddings api non-ok", res.status, "url=", url.replace(/key=[^&]+/, "key=***"), "body=", body.slice(0, 400));
      return { error: `gateway_${res.status}` };
    }

    const json = await res.json();
    const vec: unknown = json?.embedding?.values;
    if (!Array.isArray(vec)) return { error: "no_embedding_in_response" };
    if (vec.length !== EMBED_DIMS) {
      return { error: `dim_mismatch_${vec.length}` };
    }
    const numeric = (vec as unknown[]).map((x) => Number(x));
    if (numeric.some((x) => !Number.isFinite(x))) return { error: "non_numeric_values" };
    return { vector: numeric, reason: EMBED_MODEL_NAME };
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : "unknown";
    return { error: `fetch_${msg}` };
  }
}

/**
 * Wrapper principal. Tenta semântico; em qualquer falha, cai no lexical
 * e retorna mode="degraded" com a razão para observabilidade.
 */
export async function embedTextWithMeta(text: string): Promise<EmbedResult> {
  if (!text?.trim()) {
    return { vector: null, mode: "degraded", reason: "empty_text" };
  }

  const cacheKey = `v${EMBED_MODEL_VERSION}:${text.slice(0, 200)}|${text.length}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const forceLexical = (Deno.env.get("RAG_MODE") ?? "").toLowerCase() === "lexical";
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!forceLexical && apiKey) {
    const r = await embedTextSemantic(text, apiKey);
    if ("vector" in r) {
      const result: EmbedResult = {
        vector: r.vector,
        mode: "full",
        reason: r.reason,
        version: EMBED_MODEL_VERSION,
      };
      cacheSet(cacheKey, result);
      return result;
    }
    // fallback observável
    console.log(JSON.stringify({
      evt: "embeddings.fallback",
      reason: r.error,
      forced_lexical: false,
    }));
    const lex = embedTextLexical(text);
    const result: EmbedResult = { vector: lex, mode: "degraded", reason: r.error, version: 1 };
    // Não cacheia falhas transitórias (rate_limit/timeout) para permitir retry.
    if (!r.error.startsWith("rate_") && !r.error.startsWith("fetch_")) {
      cacheSet(cacheKey, result);
    }
    return result;
  }

  const lex = embedTextLexical(text);
  const reason = forceLexical ? "forced_lexical" : "missing_api_key";
  const result: EmbedResult = { vector: lex, mode: "degraded", reason, version: 1 };
  cacheSet(cacheKey, result);
  return result;
}

/** Wrapper legado — mantém compatibilidade. */
export async function embedText(text: string): Promise<number[] | null> {
  const r = await embedTextWithMeta(text);
  return r.vector;
}

/** Converte array para o literal pgvector ("[a,b,c]"). */
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
