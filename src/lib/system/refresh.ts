import { toast } from "sonner";

/**
 * Limpa caches do navegador e recarrega a app forçando nova versão.
 * Preserva a sessão de autenticação Supabase (chaves "sb-...").
 */
export async function refreshSystem(): Promise<void> {
  try {
    // 1) Cache Storage API (assets cacheados pelo navegador / SW)
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2) Service Workers (se existirem)
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    // 3) localStorage / sessionStorage — preserva sessão Supabase (sb-*)
    const purge = (storage: Storage) => {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && !key.startsWith("sb-")) toRemove.push(key);
      }
      toRemove.forEach((k) => storage.removeItem(k));
    };
    purge(window.localStorage);
    purge(window.sessionStorage);

    toast.success("Sistema atualizado. Recarregando…");

    // 4) Recarrega com cache-buster para invalidar HTML cacheado
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("v", String(Date.now()));
      window.location.replace(url.toString());
    }, 400);
  } catch (e: any) {
    toast.error(e?.message ?? "Falha ao atualizar o sistema");
    // fallback: reload simples
    setTimeout(() => window.location.reload(), 400);
  }
}
