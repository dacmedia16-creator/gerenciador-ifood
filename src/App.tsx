import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import LoadingState from "@/components/LoadingState";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";

// Lazy-loaded routes — reduz bundle inicial
const Contato = lazy(() => import("./pages/Contato"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Stores = lazy(() => import("./pages/app/Stores"));
const NewStore = lazy(() => import("./pages/app/NewStore"));
const StoreOverview = lazy(() => import("./pages/app/StoreOverview"));
const Diagnostics = lazy(() => import("./pages/app/Diagnostics"));
const Score = lazy(() => import("./pages/app/Score"));
const Menu = lazy(() => import("./pages/app/Menu"));
const Products = lazy(() => import("./pages/app/Products"));
const Pricing = lazy(() => import("./pages/app/Pricing"));
const Reviews = lazy(() => import("./pages/app/Reviews"));
const Competitors = lazy(() => import("./pages/app/Competitors"));
const Campaigns = lazy(() => import("./pages/app/Campaigns"));
const Metrics = lazy(() => import("./pages/app/Metrics"));
const Uploads = lazy(() => import("./pages/app/Uploads"));
const ActionPlan = lazy(() => import("./pages/app/ActionPlan"));
const Report = lazy(() => import("./pages/app/Report"));
const ReportTemplate = lazy(() => import("./pages/app/ReportTemplate"));
const ProductNameAnalyzer = lazy(() => import("./pages/app/ProductNameAnalyzer"));
const ExpectationVsDelivery = lazy(() => import("./pages/app/ExpectationVsDelivery"));
const PricingSimulator = lazy(() => import("./pages/app/PricingSimulator"));
const Prospects = lazy(() => import("./pages/app/Prospects"));
const BestHours = lazy(() => import("./pages/app/BestHours"));
const Onboarding = lazy(() => import("./pages/app/Onboarding"));
const NewDiagnosis = lazy(() => import("./pages/app/diagnosis/NewDiagnosis"));
const DiagnosisWizard = lazy(() => import("./pages/app/diagnosis/DiagnosisWizard"));
const DiagnosisReview = lazy(() => import("./pages/app/diagnosis/DiagnosisReview"));
const DiagnosisResult = lazy(() => import("./pages/app/diagnosis/DiagnosisResult"));
const Knowledge = lazy(() => import("./pages/app/Knowledge"));
const StoreEvolution = lazy(() => import("./pages/app/StoreEvolution"));
const Chat = lazy(() => import("./pages/app/Chat"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/contato" element={<Contato />} />
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
                <Route path="stores/:id/evolution" element={<StoreEvolution />} />
                <Route path="prospects" element={<Prospects />} />
                <Route path="knowledge" element={<Knowledge />} />
                <Route path="chat" element={<Chat />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
