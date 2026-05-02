import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingState } from "@/components/LoadingState";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <LoadingState />;
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}
