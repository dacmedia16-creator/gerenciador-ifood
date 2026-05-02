import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getUserStore } from "@/lib/store/userStore";
import { LoadingState } from "@/components/LoadingState";
import { toast } from "sonner";

export default function MyStore() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      try {
        const store = await getUserStore(user.id);
        if (store) {
          navigate(`/app/stores/${store.id}`, { replace: true });
        } else {
          navigate("/app/onboarding", { replace: true });
        }
      } catch (e: any) {
        toast.error(e.message || "Erro ao carregar sua loja");
        navigate("/app/dashboard", { replace: true });
      }
    })();
  }, [user, loading, navigate]);

  return <LoadingState />;
}
