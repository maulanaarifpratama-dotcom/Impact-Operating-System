import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AuthCallback from './pages/auth/Callback';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import GrantWriterIndex from './pages/dashboard/grant-writer/GrantWriterIndex';
import GrantWriterWizard from './pages/dashboard/grant-writer/GrantWriterWizard';
import GrantWriterProposal from './pages/dashboard/grant-writer/GrantWriterProposal';
import GrantWriterQuickWizard from './pages/dashboard/grant-writer/GrantWriterQuickWizard';
import ImpactoryLibrary from './pages/dashboard/products/ImpactoryLibrary';
import Grantfinder from './pages/dashboard/products/Grantfinder';
import ImpactoryAds from './pages/dashboard/products/ImpactoryAds';

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
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/grant-writer" element={<GrantWriterIndex />} />
              <Route path="/dashboard/grant-writer/:projectId" element={<GrantWriterWizard />} />
              <Route path="/dashboard/grant-writer/quick/:projectId" element={<GrantWriterQuickWizard />} />
              <Route path="/dashboard/grant-writer/:projectId/proposal" element={<GrantWriterProposal />} />
              <Route path="/dashboard/impactory-library" element={<ImpactoryLibrary />} />
              <Route path="/dashboard/grantfinder" element={<Grantfinder />} />
              <Route path="/dashboard/impactory-ads" element={<ImpactoryAds />} />
              {/* /settings/* + other product routes land in Chunk 3-4 */}
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
