// Helper para gerar embeddings.
//
// O Lovable AI Gateway atualmente não expõe modelos de embedding dedicados.
// Como fallback robusto, usamos um embedding lexical determinístico baseado em
// hashing de tokens (768 dims). Não é semântico verdadeiro, mas dá ranking
// estável por sobreposição de palavras-chave — suficiente para a v1 do RAG.
// Quando um modelo de embedding ficar disponível, basta reativar o caminho HTTP.

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

export async function embedText(text: string): Promise<number[] | null> {
  if (!text?.trim()) return null;
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const vec = new Array<number>(EMBED_DIMS).fill(0);
  for (const tok of tokens) {
    // Distribui o token em 2 buckets para reduzir colisões
    const i1 = hash32(tok) % EMBED_DIMS;
    const i2 = hash32("x" + tok) % EMBED_DIMS;
    vec[i1] += 1;
    vec[i2] += 0.5;
  }
  return l2Normalize(vec);
}

// Converte array para o literal do pgvector (string "[a,b,c]")
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
