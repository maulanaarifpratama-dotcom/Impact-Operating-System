import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
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
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Impactory] Dashboard error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',
          minHeight:'100vh',gap:'16px',padding:'32px',
          backgroundColor:'#f9fafb'
        }}>
          <div style={{fontSize:'48px'}}>⚠️</div>
          <h2 style={{fontSize:'18px',fontWeight:600,
            color:'#111827'}}>
            Terjadi kesalahan pada halaman ini.
          </h2>
          <p style={{fontSize:'14px',color:'#6b7280',
            textAlign:'center',maxWidth:'400px'}}>
            {this.state.error?.message ?? 
             'Kesalahan tidak diketahui'}
          </p>
          <button
            onClick={() => {
              this.setState({hasError:false,error:null})
              window.location.reload()
            }}
            style={{
              padding:'10px 24px',
              backgroundColor:'#0f6e56',
              color:'white',borderRadius:'8px',
              border:'none',cursor:'pointer',
              fontSize:'14px',fontWeight:500
            }}
          >
            Muat Ulang Halaman
          </button>
          <a href="/dashboard" style={{
            fontSize:'14px',color:'#0f6e56',
            textDecoration:'underline'
          }}>
            Kembali ke Dashboard
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
            <Sonner />
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
