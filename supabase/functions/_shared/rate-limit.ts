// Rate limiting por usuário/ação/hora. Uso restrito ao backend.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type RateAction = "diagnosis" | "chat" | "print_upload" | "report";
export type Plan = "free" | "pro" | "pro_plus";

const LIMITS: Record<RateAction, Record<Plan, number>> = {
  diagnosis: { free: 2, pro: 10, pro_plus: 20 },
  chat: { free: 5, pro: 30, pro_plus: 60 },
  print_upload: { free: 3, pro: 15, pro_plus: 30 },
  report: { free: 1, pro: 5, pro_plus: 10 },
};

const FRIENDLY: Record<RateAction, string> = {
  diagnosis: "Aguarde alguns minutos antes de gerar outro diagnóstico.",
  chat: "Você enviou muitas mensagens. Aguarde alguns minutos para continuar a conversa.",
  print_upload: "Você enviou muitos prints em pouco tempo. Aguarde alguns minutos.",
  report: "Você gerou muitos relatórios. Aguarde alguns minutos antes de gerar outro.",
};

export function getServerPlan(_userId: string): Plan {
  // TODO: integrar com tabela de assinaturas. Por ora trata todos como 'pro'.
  return "pro";
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterMinutes: number;
  message: string;
  limit: number;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  action: RateAction,
  plan: Plan = getServerPlan(userId),
): Promise<RateResult> {
  const limit = LIMITS[action][plan];
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  const isoWindow = windowStart.toISOString();

  const { data, error } = await admin.rpc("increment_rate_limit", {
    _user: userId,
    _action: action,
    _window: isoWindow,
  });

  if (error) {
    console.warn("rate-limit rpc error", error);
    return { allowed: true, remaining: limit, retryAfterMinutes: 0, message: "", limit };
  }

  const count = typeof data === "number" ? data : Number(data ?? 1);
  const allowed = count <= limit;
  const nextHour = new Date(windowStart.getTime() + 60 * 60 * 1000);
  const retryAfterMinutes = Math.max(1, Math.ceil((nextHour.getTime() - Date.now()) / 60000));

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMinutes,
    message: FRIENDLY[action],
    limit,
  };
}

export function rateLimitResponse(result: RateResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message: result.message,
      retry_after_minutes: result.retryAfterMinutes,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
