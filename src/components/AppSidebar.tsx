import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, Store, BarChart3, Package, Star, Users, Megaphone,
  Upload, Stethoscope, Gauge, UtensilsCrossed, DollarSign, ListTodo, FileText, LogOut, Home, Palette, Sparkles, Type, Eye, Calculator, Target, Clock,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const general = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Novo Diagnóstico", url: "/app/diagnosis/new", icon: Sparkles },
  { title: "Lojas", url: "/app/stores", icon: Store },
  { title: "Radar de Prospects", url: "/app/prospects", icon: Target },
];

const storeAnalysis = (id: string) => [
  { title: "Visão geral", url: `/app/stores/${id}`, icon: Home },
  { title: "Diagnóstico", url: `/app/stores/${id}/diagnostics`, icon: Stethoscope },
  { title: "Score", url: `/app/stores/${id}/score`, icon: Gauge },
  { title: "Plano de ação", url: `/app/stores/${id}/action-plan`, icon: ListTodo },
  { title: "Relatório", url: `/app/stores/${id}/report`, icon: FileText },
];

const storeOperations = (id: string) => [
  { title: "Cardápio", url: `/app/stores/${id}/menu`, icon: UtensilsCrossed },
  { title: "Produtos", url: `/app/stores/${id}/products`, icon: Package },
  { title: "Nomes (SEO)", url: `/app/stores/${id}/product-names`, icon: Type },
  { title: "Margem & Preço", url: `/app/stores/${id}/pricing`, icon: DollarSign },
  { title: "Simulador de preço", url: `/app/stores/${id}/pricing-simulator`, icon: Calculator },
  { title: "Avaliações", url: `/app/stores/${id}/reviews`, icon: Star },
  { title: "Expectativa × Entrega", url: `/app/stores/${id}/expectation`, icon: Eye },
  { title: "Concorrentes", url: `/app/stores/${id}/competitors`, icon: Users },
  { title: "Campanhas", url: `/app/stores/${id}/campaigns`, icon: Megaphone },
  { title: "Melhor horário", url: `/app/stores/${id}/best-hours`, icon: Clock },
  { title: "Métricas", url: `/app/stores/${id}/metrics`, icon: BarChart3 },
];

const storeData = (id: string) => [
  { title: "Importar dados", url: `/app/stores/${id}/uploads`, icon: Upload },
  { title: "Template do PDF", url: `/app/stores/${id}/report/template`, icon: Palette },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // detect storeId from URL
  const match = pathname.match(/\/app\/stores\/([0-9a-f-]{36})/);
  const storeId = match?.[1] || params.id;

  const isActive = (url: string) => pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <NavLink to="/app/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">G</div>
          {!collapsed && <span className="font-semibold leading-tight text-sm">Gestor IA<br/><span className="text-xs text-muted-foreground font-normal">de Delivery</span></span>}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {general.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {storeId && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Análise</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {storeAnalysis(storeId).map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operação</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {storeOperations(storeId).map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Dados & Saída</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {storeData(storeId).map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4" />{!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
