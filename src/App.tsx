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
import ProductNameAnalyzer from "./pages/app/ProductNameAnalyzer";
import ExpectationVsDelivery from "./pages/app/ExpectationVsDelivery";
import PricingSimulator from "./pages/app/PricingSimulator";
import Prospects from "./pages/app/Prospects";
import BestHours from "./pages/app/BestHours";
import Onboarding from "./pages/app/Onboarding";
import NewDiagnosis from "./pages/app/diagnosis/NewDiagnosis";
import DiagnosisWizard from "./pages/app/diagnosis/DiagnosisWizard";
import DiagnosisReview from "./pages/app/diagnosis/DiagnosisReview";
import DiagnosisResult from "./pages/app/diagnosis/DiagnosisResult";

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
            {/* Diagnosis funnel — fora do AppLayout para tela cheia */}
            <Route path="/app/diagnosis/new" element={<NewDiagnosis />} />
            <Route path="/app/diagnosis/:sessionId" element={<DiagnosisWizard />} />
            <Route path="/app/diagnosis/:sessionId/review" element={<DiagnosisReview />} />
            <Route path="/app/diagnosis/:sessionId/result" element={<DiagnosisResult />} />
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
              <Route path="stores/:id/product-names" element={<ProductNameAnalyzer />} />
              <Route path="stores/:id/expectation" element={<ExpectationVsDelivery />} />
              <Route path="stores/:id/pricing-simulator" element={<PricingSimulator />} />
              <Route path="stores/:id/best-hours" element={<BestHours />} />
              <Route path="prospects" element={<Prospects />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
