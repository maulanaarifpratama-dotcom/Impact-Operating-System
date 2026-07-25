import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import AboutPage from './pages/landing/AboutPage';
import ContactPage from './pages/landing/ContactPage';
import PricingPage from './pages/landing/PricingPage';
import PrivacyPolicyPage from './pages/landing/PrivacyPolicyPage';
import TermsPage from './pages/landing/TermsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false },
  },
});

export function render(url: string, helmetContext: any = {}) {
  const html = ReactDOMServer.renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={url}>
          <TooltipProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TooltipProvider>
        </StaticRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );

  return { html, helmet: helmetContext.helmet };
}
