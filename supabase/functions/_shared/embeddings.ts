// Helper para gerar embeddings via Lovable AI Gateway.
// Modelo: google/text-embedding-004 (768 dims). Fallback: vetor zero.

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/text-embedding-004";
export const EMBED_DIMS = 768;

export async function embedText(text: string): Promise<number[] | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !text?.trim()) return null;

  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) {
      console.warn("embed-text failed", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const vec = json?.data?.[0]?.embedding;
    if (Array.isArray(vec) && vec.length > 0) return vec;
    return null;
  } catch (e) {
    console.warn("embed-text error", e);
    return null;
  }
}

// Converte array para o literal do pgvector (string "[a,b,c]")
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
