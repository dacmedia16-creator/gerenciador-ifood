import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Stores from "./pages/app/Stores";
import NewStore from "./pages/app/NewStore";
import StoreOverview from "./pages/app/StoreOverview";
import Diagnostics from "./pages/app/Diagnostics";
import Score from "./pages/app/Score";
import Menu from "./pages/app/Menu";
import Products from "./pages/app/Products";
import Pricing from "./pages/app/Pricing";
import Reviews from "./pages/app/Reviews";
import Competitors from "./pages/app/Competitors";
import Campaigns from "./pages/app/Campaigns";
import Metrics from "./pages/app/Metrics";
import Uploads from "./pages/app/Uploads";
import ActionPlan from "./pages/app/ActionPlan";
import Report from "./pages/app/Report";
import ReportTemplate from "./pages/app/ReportTemplate";
import Onboarding from "./pages/app/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="stores" element={<Stores />} />
              <Route path="stores/new" element={<NewStore />} />
              <Route path="stores/:id" element={<StoreOverview />} />
              <Route path="stores/:id/diagnostics" element={<Diagnostics />} />
              <Route path="stores/:id/score" element={<Score />} />
              <Route path="stores/:id/menu" element={<Menu />} />
              <Route path="stores/:id/products" element={<Products />} />
              <Route path="stores/:id/pricing" element={<Pricing />} />
              <Route path="stores/:id/reviews" element={<Reviews />} />
              <Route path="stores/:id/competitors" element={<Competitors />} />
              <Route path="stores/:id/campaigns" element={<Campaigns />} />
              <Route path="stores/:id/metrics" element={<Metrics />} />
              <Route path="stores/:id/uploads" element={<Uploads />} />
              <Route path="stores/:id/action-plan" element={<ActionPlan />} />
              <Route path="stores/:id/report" element={<Report />} />
              <Route path="stores/:id/report/template" element={<ReportTemplate />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
