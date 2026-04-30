import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function invokeAI<T = any>(functionName: string, body: Record<string, any>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      // supabase wraps non-2xx; try to read message
      const ctx = (error as any).context;
      let parsed: any = null;
      if (ctx?.body) {
        try { parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body; } catch { /* ignore */ }
      }
      const status = ctx?.status ?? 500;
      if (status === 429) toast.error("Muitas requisições à IA. Tente novamente em alguns minutos.");
      else if (status === 402) toast.error("Créditos de IA esgotados. Adicione créditos em Configurações.");
      else toast.error(parsed?.error ?? error.message ?? "Erro ao chamar IA");
      return null;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return null;
    }
    return data as T;
  } catch (e: any) {
    toast.error(e?.message ?? "Erro ao chamar IA");
    return null;
  }
}
