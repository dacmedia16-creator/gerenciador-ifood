export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
