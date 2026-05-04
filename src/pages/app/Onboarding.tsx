import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getUserStore } from "@/lib/store/userStore";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LoadingState } from "@/components/LoadingState";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasStore, setHasStore] = useState(false);

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
          setHasStore(true);
          navigate(`/app/stores/${store.id}`, { replace: true });
          return;
        }
      } catch {
        // se falhar, mostramos o wizard mesmo assim
      }
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  if (loading || checking || hasStore) return <LoadingState />;
  return <OnboardingWizard />;
}
