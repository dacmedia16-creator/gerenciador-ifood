import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateUserSession } from "@/lib/diagnosis/session";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosisWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const session = await getOrCreateUserSession(user.id, params.get("storeId"));
        navigate(`/app/diagnosis/${session.id}`, { replace: true });
      } catch (e: any) {
        toast.error(e.message || "Erro ao iniciar diagnóstico");
        navigate("/app/dashboard", { replace: true });
      }
    })();
  }, [user, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Abrindo seu diagnóstico…
    </div>
  );
}
