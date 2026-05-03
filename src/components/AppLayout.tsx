import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">Carregando…</span>
      </div>
    </div>
  );
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  const isChatPage = location.pathname.startsWith("/app/chat");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4 gap-3 no-print">
            <SidebarTrigger />
            <h1 className="text-sm font-medium">Painel do Dono — Gestor de Delivery</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>

          {!isChatPage && (
            <Button
              onClick={() => navigate("/app/chat")}
              size="icon"
              className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg z-40 no-print"
              aria-label="Abrir chat com o Gestor IA"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
