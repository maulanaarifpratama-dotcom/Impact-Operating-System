import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ScrollToTop } from '@/components/ScrollToTop';

// Public marketing routes stay eager. These are the pre-rendered entry points
// (see scripts/prerender.js), so splitting them would trade static HTML for a
// spinner on exactly the pages most visitors land on first.
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import AboutPage from './pages/landing/AboutPage';
import ContactPage from './pages/landing/ContactPage';
import PricingPage from './pages/landing/PricingPage';
import PrivacyPolicyPage from './pages/landing/PrivacyPolicyPage';
import TermsPage from './pages/landing/TermsPage';
import Berdaya from './pages/Berdaya';

// Everything behind auth is code-split. The dashboard modules (WBS, Budget,
// MEAL, SROI, PDF export, charts) are the bulk of the bundle and no anonymous
// visitor needs a byte of them.
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const AuthCallback = lazy(() => import('./pages/auth/Callback'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const AcceptInvite = lazy(() => import('./pages/auth/AcceptInvite'));

const DashboardLayout = lazy(() =>
  import('@/components/dashboard/DashboardLayout').then((m) => ({
    default: m.DashboardLayout,
  })),
);

const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const ReadinessScorecard = lazy(() => import('./pages/dashboard/ReadinessScorecard'));
const MonthlyImpactReport = lazy(() => import('./pages/dashboard/MonthlyImpactReport'));
const ResourceAccessTracker = lazy(() => import('./pages/dashboard/ResourceAccessTracker'));
const DonorCRM = lazy(() => import('./pages/dashboard/DonorCRM'));
const ImpactDashboard = lazy(() => import('./pages/dashboard/ImpactDashboard'));
const MonthlyOperatingReview = lazy(() => import('./pages/dashboard/MonthlyOperatingReview'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const SROIStandalone = lazy(() => import('./pages/dashboard/SROIStandalone'));
const EROIStandalone = lazy(() => import('./pages/dashboard/EROIStandalone'));
const ESGDashboard = lazy(() => import('./pages/dashboard/ESGDashboard'));
const SustainabilityReports = lazy(() => import('./pages/dashboard/SustainabilityReports'));
const BeneficiaryRegistry = lazy(() => import('./pages/dashboard/BeneficiaryRegistry'));

const GrantWriterIndex = lazy(() => import('./pages/dashboard/grant-writer/GrantWriterIndex'));
const GrantWriterProposal = lazy(() => import('./pages/dashboard/grant-writer/GrantWriterProposal'));
const GrantWriterRouteGuard = lazy(() => import('./pages/dashboard/grant-writer/GrantWriterRouteGuard'));

const ImpactoryLibrary = lazy(() => import('./pages/dashboard/products/ImpactoryLibrary'));
const Grantfinder = lazy(() => import('./pages/dashboard/products/Grantfinder'));
const ImpactoryAds = lazy(() => import('./pages/dashboard/products/ImpactoryAds'));

const LFABuilderIndex = lazy(() => import('./pages/dashboard/lfa-builder/LFABuilderIndex'));
const LFABuilderEditor = lazy(() => import('./pages/dashboard/lfa-builder/LFABuilderEditor'));

const ProjectManagementIndex = lazy(
  () => import('./pages/dashboard/project-management/ProjectManagementIndex'),
);
const ProjectObjectivesPage = lazy(
  () => import('./pages/dashboard/project-management/objectives/ProjectObjectivesPage'),
);
const ProjectStagesPage = lazy(
  () => import('./pages/dashboard/project-management/stages/ProjectStagesPage'),
);

function RouteFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Memuat…</span>
      </div>
    </div>
  );
}


class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; lang: 'id' | 'en' }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, lang: 'id' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Impactory] Dashboard error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      const t = this.state.lang === 'id' ? {
        title: 'Terjadi kesalahan pada halaman ini.',
        unknown: 'Kesalahan tidak diketahui',
        reload: 'Muat Ulang Halaman',
        back: 'Kembali ke Dashboard',
        toggle: 'English',
      } : {
        title: 'Something went wrong on this page.',
        unknown: 'Unknown error',
        reload: 'Reload Page',
        back: 'Back to Dashboard',
        toggle: 'Bahasa Indonesia',
      };

      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-gray-50 dark:bg-gray-950">
          <div className="text-5xl" aria-hidden="true">⚠️</div>
          <button
            onClick={() => this.setState((s) => ({ ...s, lang: s.lang === 'id' ? 'en' : 'id' }))}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline self-end"
          >
            {t.toggle}
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            {this.state.error?.message ?? t.unknown}
          </p>
          <button
            onClick={() => {
              this.setState({hasError:false,error:null,lang: this.state.lang})
              window.location.reload()
            }}
            className="px-6 py-2.5 bg-brand-green text-white rounded-lg border-none cursor-pointer text-sm font-medium hover:bg-[#0d5d48]"
          >
            {t.reload}
          </button>
          <a href="/dashboard" className="text-sm text-brand-green underline hover:text-[#0d5d48]">
            {t.back}
          </a>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/berdaya" element={<Berdaya />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/invite/accept" element={<AcceptInvite />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireOrg={false}>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Top-level aliases for product pages (redirect to /dashboard/*) */}
            <Route path="/grant-writer" element={<Navigate to="/dashboard/grant-writer" replace />} />
            <Route path="/grantfinder" element={<Navigate to="/dashboard/grantfinder" replace />} />
            <Route path="/library" element={<Navigate to="/dashboard/impactory-library" replace />} />
            <Route path="/ads" element={<Navigate to="/dashboard/impactory-ads" replace />} />

            {/* Protected (all dashboard modules & settings require auth + organization) */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardErrorBoundary>
                    <DashboardLayout />
                  </DashboardErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/readiness" element={<ReadinessScorecard />} />
               <Route path="/dashboard/monthly-report" element={<MonthlyImpactReport />} />
              <Route path="/dashboard/operating-review" element={<MonthlyOperatingReview />} />
              <Route path="/dashboard/resource-access" element={<ResourceAccessTracker />} />
              <Route path="/dashboard/donor-crm" element={<DonorCRM />} />
              <Route path="/dashboard/impact" element={<ImpactDashboard />} />
              
              {/* Product Modules under ProtectedRoute */}
              <Route path="/dashboard/grant-writer" element={<GrantWriterIndex />} />
               <Route path="/dashboard/grant-writer/:projectId" element={<GrantWriterRouteGuard />} />
               <Route path="/dashboard/grant-writer/quick/:projectId" element={<GrantWriterRouteGuard />} />
              <Route path="/dashboard/grant-writer/:projectId/proposal" element={<GrantWriterProposal />} />
              <Route path="/dashboard/grant-writer/proposal/:projectId" element={<GrantWriterProposal />} />
              <Route path="/dashboard/impactory-library" element={<ImpactoryLibrary />} />
              <Route path="/dashboard/impact-library" element={<Navigate to="/dashboard/impactory-library" replace />} />
              <Route path="/dashboard/grantfinder" element={<Grantfinder />} />
              <Route path="/dashboard/grant-pipeline" element={<Navigate to="/dashboard/grantfinder" replace />} />
              <Route path="/dashboard/impactory-ads" element={<ImpactoryAds />} />
              <Route path="/dashboard/campaign-builder" element={<Navigate to="/dashboard/impactory-ads" replace />} />
              
              {/* LFA Builder Routes */}
              <Route path="/dashboard/lfa-builder" element={<LFABuilderIndex />} />
              <Route path="/dashboard/lfa-builder/:projectId" element={<LFABuilderEditor />} />

              {/* Project Management Routes */}
              <Route path="/dashboard/project-management" element={<ProjectManagementIndex />} />
              <Route
                path="/dashboard/project-management/:projectId/objectives"
                element={<ProjectObjectivesPage />}
              />
              <Route
                path="/dashboard/project-management/:projectId/stages"
                element={<ProjectStagesPage />}
              />
              <Route path="/dashboard/sroi" element={<SROIStandalone />} />
              <Route path="/dashboard/eroi" element={<EROIStandalone />} />
              <Route path="/dashboard/esg" element={<ESGDashboard />} />
              <Route path="/dashboard/sustainability-reports" element={<SustainabilityReports />} />
              <Route path="/dashboard/beneficiary" element={<BeneficiaryRegistry />} />


              {/* Settings Route */}
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/settings/profile" element={<Settings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
 </HelmetProvider>
);

export default App;
