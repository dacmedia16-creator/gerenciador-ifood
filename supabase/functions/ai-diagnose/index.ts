// ============================================================
// DEPRECATED — substituída por `ai-consult`.
// Stub que retorna 410 Gone para qualquer chamada residual.
// Não toca em diagnostics/action_plans (a versão antiga apagava
// dados, o que destruía o ciclo de aprendizado via FK).
// ============================================================
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve((req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  return new Response(
    JSON.stringify({
      error: "ai-diagnose foi substituída por ai-consult. Atualize o callsite.",
      use_instead: "ai-consult",
    }),
    { status: 410, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
