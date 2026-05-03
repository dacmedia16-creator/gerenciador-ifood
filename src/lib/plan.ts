// Helper para identificar plano do usuário.
// TODO: integrar com tabela de assinaturas quando existir.
export type UserPlan = "free" | "pro" | "pro_plus";

export function getUserPlan(): UserPlan {
  return "pro";
}
