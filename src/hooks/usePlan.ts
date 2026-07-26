import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgRole } from '@/hooks/useOrgRole';

/**
 * The organisation's subscription plan, and whether it unlocks the paid
 * modules.
 *
 * RLS is the boundary — see 20260727020000_plan_entitlements.sql, which gates
 * creation on gw_projects, lfa_projects, library_documents, beneficiaries and
 * grantfinder_searches. This hook exists so the interface can say "paket
 * Berdaya" instead of letting the user press a button that returns a Postgres
 * permission error.
 */
export function usePlan() {
  const { organizationId, isLoading: roleLoading } = useOrgRole();

  const { data, isLoading } = useQuery({
    queryKey: ['org-plan', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });

  const row = data as { plan?: string; status?: string } | null;
  const plan = row?.plan ?? null;
  const status = row?.status ?? null;

  return {
    plan,
    status,
    /**
     * Deliberately optimistic while loading: a brief enabled button that the
     * database refuses beats a disabled one that never re-enables if the query
     * fails. It also keeps the paid case — the common one — from flickering.
     */
    isPaid: isLoading || roleLoading
      ? true
      : plan !== null && plan !== 'free' && (status === 'active' || status === 'trialing'),
    isLoading: isLoading || roleLoading,
  };
}
