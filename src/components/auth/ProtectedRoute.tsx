import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrg?: boolean;
}

export function ProtectedRoute({ children, requireOrg = true }: ProtectedRouteProps) {
  const { session, loading: authLoading, user } = useAuth();
  const location = useLocation();

  // Query organization memberships for the current user
  const { data: memberships, isLoading: orgLoading, isError } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
      if (fetchError) {
        console.error('[ProtectedRoute] failed to fetch memberships:', fetchError);
        throw fetchError;
      }
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Safe robust loading check:
  // We are loading if auth state is initializing, OR
  // if a session exists but we haven't resolved the user yet, OR
  // if the memberships query is active or has not returned any data yet.
  const isLoading = authLoading || (!!session && (!user || orgLoading || (memberships === undefined && !isError)));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs text-muted-foreground animate-pulse">Memuat profil organisasi…</p>
        </div>
      </div>
    );
  }

  // Handle Query Errors gracefully instead of redirecting to onboarding
  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-elegant">
          <h2 className="text-sm font-bold text-destructive">Koneksi Gagal</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Gagal memuat profil organisasi Anda. Silakan periksa koneksi internet Anda atau muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground transition-transform duration-200 active:scale-[0.98] hover:bg-destructive/90"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Safe multi-format check: handles both array of memberships and single objects
  const hasOrg = useMemo(() => {
    if (!memberships) return false;
    if (Array.isArray(memberships)) {
      return memberships.length > 0;
    }
    return !!(memberships as any)?.organization_id;
  }, [memberships]);

  if (requireOrg && !hasOrg) {
    // If we require an organization and user doesn't have one, redirect to onboarding
    return <Navigate to="/onboarding" replace />;
  }

  if (!requireOrg && hasOrg) {
    // If we do NOT require an organization (e.g. on /onboarding page) but user already has one,
    // redirect them to the main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
