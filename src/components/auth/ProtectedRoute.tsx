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

  console.log('ProtectedRoute debug:', {
    userId: user?.id,
    session: !!session,
    memberships,
    orgLoading,
    isLoading
  });

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

  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const hasOrg = memberships && memberships.length > 0;

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