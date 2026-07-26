import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { hasAdminPower } from '@/lib/roles';

/**
 * The signed-in user's role in their organisation, and whether it carries
 * delete rights.
 *
 * Settings resolved this inline and nothing else could reach it, so the
 * delete controls in the Grant Writer and LFA Studio were shown to everyone —
 * including the staff and expert roles that src/lib/roles.ts says cannot
 * delete. RLS is the actual boundary (see
 * 20260727010000_restrict_deletes_to_admins.sql); this only stops the UI from
 * offering an action the database will refuse.
 */
export function useOrgRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['org-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const role = (data as { role?: string } | null)?.role ?? null;

  return {
    role,
    organizationId: (data as { organization_id?: string } | null)?.organization_id ?? null,
    /** owner or admin — the only roles permitted to delete programme data. */
    canDelete: hasAdminPower(role),
    isLoading,
  };
}
