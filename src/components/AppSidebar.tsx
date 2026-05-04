import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Search, CheckCircle2, UtensilsCrossed, Star, Gem, Settings, LogOut, Shield, Store, Target, BookOpen, FileSliders, MessageCircle } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import logoGD from "@/assets/logo-gestor-delivery.png";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [primaryStoreId, setPrimaryStoreId] = useState<string | null>(null);

  // Detecta storeId da rota; se não houver, busca a primeira loja do usuário
  const match = pathname.match(/\/app\/stores\/([0-9a-f-]{36})/);
  const routeStoreId = match?.[1] || (params.id as string | undefined) || null;

  useEffect(() => {
    if (routeStoreId || !user) return;
    supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPrimaryStoreId(data?.id ?? null));
  }, [user, routeStoreId]);

  const storeId = routeStoreId || primaryStoreId;
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const main = [
    { title: "Início", url: "/app/dashboard", icon: Home },
    { title: "Diagnóstico", url: "/app/diagnosis/welcome", icon: Search },
    {
      title: "Plano de Ação",
      url: storeId ? `/app/stores/${storeId}/action-plan` : "/app/diagnosis/welcome",
      icon: CheckCircle2,
    },
    {
      title: "Cardápio & Margem",
      url: storeId ? `/app/stores/${storeId}/menu` : "/app/diagnosis/welcome",
      icon: UtensilsCrossed,
    },
    {
      title: "Avaliações",
      url: storeId ? `/app/stores/${storeId}/reviews` : "/app/diagnosis/welcome",
      icon: Star,
    },
    { title: "Chat com IA", url: "/app/chat", icon: MessageCircle },
  ];

  const secondary = [
    { title: "Planos", url: "/app/planos", icon: Gem },
    { title: "Configurações", url: "/app/configuracoes", icon: Settings },
  ];

  const adminItems = [
    { title: "Painel Super Admin", url: "/app/admin", icon: Shield },
    { title: "Todas as lojas", url: "/app/stores", icon: Store },
    { title: "Radar de Prospects", url: "/app/prospects", icon: Target },
    { title: "Base de conhecimento", url: "/app/knowledge", icon: BookOpen },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <NavLink to="/app/dashboard" onClick={closeOnMobile} className="flex items-center gap-2">
          {collapsed ? (
            <img src="/favicon.png" alt="Gestor de Delivery" className="h-8 w-8 shrink-0" />
          ) : (
            <img src={logoGD} alt="Gestor de Delivery" className="h-8 w-auto" />
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="min-h-11">
                    <NavLink to={item.url} onClick={closeOnMobile}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="min-h-11">
                    <NavLink to={item.url} onClick={closeOnMobile}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} onClick={closeOnMobile}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {storeId && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive(`/app/stores/${storeId}/report/template`)}>
                        <NavLink to={`/app/stores/${storeId}/report/template`} onClick={closeOnMobile}>
                          <FileSliders className="h-4 w-4" />
                          {!collapsed && <span>Template de relatório</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        {!collapsed && user && (
          <div className="px-2 py-1 text-xs text-muted-foreground truncate">{user.email}</div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { closeOnMobile(); await signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4" />{!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
