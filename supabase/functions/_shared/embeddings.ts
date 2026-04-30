// ============================================================
// RAG v1 — busca lexical determinística (NÃO é semântica real).
//
// Como funciona: tokeniza o texto, remove stopwords e mapeia cada token
// para 2 buckets de um vetor 768d via hashing FNV-1a. Isso faz a busca
// por similaridade vetorial (pgvector cosine) se comportar como uma
// busca por sobreposição de palavras-chave — estável e barata, mas SEM
// generalização semântica (sinônimos não casam).
//
// Quando trocarmos para embeddings reais (v2), basta:
//   - definir Deno.env EMBED_MODEL com um modelo de embedding suportado
//     pelo Lovable AI Gateway
//   - reembedar knowledge_base e case_library (incrementar embedding_version)
//
// Enquanto EMBED_MODEL não estiver setada, embedText() cai no lexical.
// ============================================================

export const EMBED_DIMS = 768;

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

// Hash 32-bit estável (FNV-1a)
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

/**
 * RAG v1 — embedding lexical determinístico.
 * NÃO captura semântica, apenas sobreposição de palavras-chave.
 */
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
}

/**
 * Wrapper com metadata. Permite ao chamador saber se o RAG está degradado.
 * Hoje sempre retorna mode="degraded" porque ainda usamos lexical (RAG v1).
 * Quando EMBED_MODEL estiver setada e funcionar, retornará mode="full".
 */
export async function embedTextWithMeta(text: string): Promise<EmbedResult> {
  // TODO v2: quando o gateway expor um modelo de embedding, ativar aqui.
  // const model = Deno.env.get("EMBED_MODEL");
  // if (model) { ...fetch para o gateway... return { vector, mode: "full" }; }
  return {
    vector: embedTextLexical(text),
    mode: "degraded",
    reason: "lexical_v1",
  };
}

/**
 * Wrapper público legado. Mantido para compatibilidade com chamadores
 * que não precisam saber do modo. Use embedTextWithMeta() para observabilidade.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const r = await embedTextWithMeta(text);
  return r.vector;
}

// Converte array para o literal do pgvector (string "[a,b,c]")
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
