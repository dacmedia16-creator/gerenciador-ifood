// CORS centralizado. Em produção restringimos à origem oficial; permitimos
// previews Lovable e localhost durante desenvolvimento.
const ALLOWED_ORIGINS = [
  "https://gerenciador-ifood.lovable.app",
  "https://id-preview--d02e117f-b437-4313-904c-ca516100cc79.lovable.app",
  "https://gestordelivery.app",
  "https://www.gestordelivery.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || /^https:\/\/.*\.lovable\.app$/.test(origin)
    || /^https:\/\/.*\.lovableproject\.com$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Vary": "Origin",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

// Mantido para compat. com edge functions legadas que importam corsHeaders.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

export function aiErrorResponse(status: number, fallback = "Erro ao chamar IA") {
  if (status === 429) {
    return jsonResponse(
      { error: "Muitas requisições à IA. Tente novamente em alguns minutos." },
      429,
    );
  }
  if (status === 402) {
    return jsonResponse(
      { error: "Créditos de IA esgotados. Adicione créditos à sua workspace Lovable." },
      402,
    );
  }
  return jsonResponse({ error: fallback }, 500);
}
