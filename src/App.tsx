import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ScrollToTop } from '@/components/ScrollToTop';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AuthCallback from './pages/auth/Callback';
import AboutPage from './pages/landing/AboutPage';
import ContactPage from './pages/landing/ContactPage';
import PricingPage from './pages/landing/PricingPage';
import PrivacyPolicyPage from './pages/landing/PrivacyPolicyPage';
import TermsPage from './pages/landing/TermsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ReadinessScorecard from './pages/dashboard/ReadinessScorecard';
import MonthlyImpactReport from './pages/dashboard/MonthlyImpactReport';
import ResourceAccessTracker from './pages/dashboard/ResourceAccessTracker';
import DonorCRM from './pages/dashboard/DonorCRM';
import ImpactDashboard from './pages/dashboard/ImpactDashboard';
import GrantWriterIndex from './pages/dashboard/grant-writer/GrantWriterIndex';
import GrantWriterWizard from './pages/dashboard/grant-writer/GrantWriterWizard';
import GrantWriterProposal from './pages/dashboard/grant-writer/GrantWriterProposal';
import GrantWriterQuickWizard from './pages/dashboard/grant-writer/GrantWriterQuickWizard';
import ImpactoryLibrary from './pages/dashboard/products/ImpactoryLibrary';
import Grantfinder from './pages/dashboard/products/Grantfinder';
import ImpactoryAds from './pages/dashboard/products/ImpactoryAds';
import Onboarding from './pages/auth/Onboarding';
import Settings from './pages/dashboard/Settings';
import MonthlyOperatingReview from './pages/dashboard/MonthlyOperatingReview';
import LFABuilderIndex from './pages/dashboard/lfa-builder/LFABuilderIndex';
import LFABuilderEditor from './pages/dashboard/lfa-builder/LFABuilderEditor';
import SROIStandalone from './pages/dashboard/SROIStandalone';
import EROIStandalone from './pages/dashboard/EROIStandalone';
import BeneficiaryRegistry from './pages/dashboard/BeneficiaryRegistry';




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
  <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
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
              <Route path="/dashboard/grant-writer/:projectId" element={<GrantWriterWizard />} />
              <Route path="/dashboard/grant-writer/quick/:projectId" element={<GrantWriterQuickWizard />} />
              <Route path="/dashboard/grant-writer/:projectId/proposal" element={<GrantWriterProposal />} />
              <Route path="/dashboard/impactory-library" element={<ImpactoryLibrary />} />
              <Route path="/dashboard/impact-library" element={<Navigate to="/dashboard/impactory-library" replace />} />
              <Route path="/dashboard/grantfinder" element={<Grantfinder />} />
              <Route path="/dashboard/grant-pipeline" element={<Navigate to="/dashboard/grantfinder" replace />} />
              <Route path="/dashboard/impactory-ads" element={<ImpactoryAds />} />
              <Route path="/dashboard/campaign-builder" element={<Navigate to="/dashboard/impactory-ads" replace />} />
              
              {/* LFA Builder Routes */}
              <Route path="/dashboard/lfa-builder" element={<LFABuilderIndex />} />
              <Route path="/dashboard/lfa-builder/:projectId" element={<LFABuilderEditor />} />
              <Route path="/dashboard/sroi" element={<SROIStandalone />} />
              <Route path="/dashboard/eroi" element={<EROIStandalone />} />
              <Route path="/dashboard/beneficiary" element={<BeneficiaryRegistry />} />


              {/* Settings Route */}
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/settings/profile" element={<Settings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
