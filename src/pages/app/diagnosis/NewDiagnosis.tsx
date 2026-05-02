import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateUserSession } from "@/lib/diagnosis/session";
import { toast } from "sonner";

export default function NewDiagnosis() {
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
        toast.error(e.message || "Erro ao abrir diagnóstico");
        navigate("/app/dashboard");
      }
    })();
  }, [user, params, navigate]);

  return <div className="p-8 text-muted-foreground">Abrindo seu diagnóstico…</div>;
}
