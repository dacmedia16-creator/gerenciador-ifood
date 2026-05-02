import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a loja única do usuário (a mais recente).
 * Retorna null se ele ainda não tiver nenhuma loja cadastrada.
 */
export async function getUserStore(userId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
