-- =====================================================================
-- Impactory.id — Fix RLS Security Gap in grantfinder_searches
-- Replaces weak user_id policy with strict is_org_member validation.
-- =====================================================================

-- 1. Drop the weak select policy
drop policy if exists "gf_searches_owner_read" on public.grantfinder_searches;

-- 2. Create the secure select policy verifying organization membership
create policy "gf_searches_owner_read" on public.grantfinder_searches
  for select
  to authenticated
  using (
    public.is_org_member(organization_id, auth.uid())
    or public.is_admin(auth.uid())
  );
