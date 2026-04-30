import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { createSession, getDraftSession } from "@/lib/diagnosis/session";
import { toast } from "sonner";

export default function NewDiagnosis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    const force = params.get("new") === "1";
    (async () => {
      try {
        let session = force ? null : await getDraftSession(user.id);
        if (!session) session = await createSession(user.id, params.get("storeId"));
        navigate(`/app/diagnosis/${session.id}`, { replace: true });
      } catch (e: any) {
        toast.error(e.message || "Erro ao iniciar diagnóstico");
        navigate("/app/dashboard");
      }
    })();
  }, [user, params, navigate]);

  return <div className="p-8 text-muted-foreground">Iniciando diagnóstico…</div>;
}
