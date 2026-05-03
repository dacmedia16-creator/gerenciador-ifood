import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function invokeAI<T = any>(functionName: string, body: Record<string, any>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      const ctx = (error as any).context;
      let parsed: any = null;
      if (ctx?.body) {
        try { parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body; } catch { /* ignore */ }
      }
      const status = ctx?.status ?? 500;
      if (status === 429) toast.error("A IA está sobrecarregada agora. Tente de novo em alguns minutos.");
      else if (status === 402) toast.error("Seus créditos de IA acabaram. Adicione créditos em Configurações.");
      else if (status === 401) toast.error("Sua sessão expirou. Entre novamente para continuar.");
      else if (status === 404) toast.error("Não encontramos os dados desta loja. Atualize a página.");
      else if (status >= 500) toast.error("A consultoria não respondeu. Tente novamente em instantes.");
      else toast.error(parsed?.error ?? error.message ?? "Não conseguimos chamar a IA agora.");
      return null;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return null;
    }
    return data as T;
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (/timeout|timed out|abort/i.test(msg)) {
      toast.error("A consultoria demorou demais para responder. Tente novamente.");
    } else if (/network|failed to fetch/i.test(msg)) {
      toast.error("Sem conexão com o servidor. Verifique sua internet e tente de novo.");
    } else {
      toast.error(msg || "Não conseguimos falar com a IA agora.");
    }
    return null;
  }
}
