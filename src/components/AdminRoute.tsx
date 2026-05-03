import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingState } from "@/components/LoadingState";
import { toast } from "sonner";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();
  useEffect(() => {
    if (!loading && !isAdmin) toast.error("Acesso restrito.");
  }, [loading, isAdmin]);
  if (loading) return <LoadingState />;
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}
