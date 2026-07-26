-- Migration: 20260726020000_fix_rls_cross_tenant_gaps.sql
-- Description: Close two live cross-tenant gaps found by auditing the actual
-- production policy set (supabase/snippets/audit_rls_state.sql).
--
-- Unlike the earlier blind hardening attempt (removed), this migration was
-- written against the real policy list. Production RLS is otherwise sound: every
-- public table has RLS on with at least one policy, and the org-scoped tables
-- correctly route through is_org_member()/get_org_role(). Only the three items
-- below are wrong, and this file touches nothing else.
--
-- Postgres OR-combines permissive policies, so adding a broad policy next to a
-- narrow one *widens* access. Every fix here therefore REPLACES a named policy
-- rather than adding one.

-- ---------------------------------------------------------------------------
-- 1. organization_invitations was world-readable
--
-- "invitations_read_by_token" is SELECT USING (true) — no role restriction, so
-- any caller holding the public anon key can read every pending invitation:
-- email, token, and organization_id.
--
-- Combined with fix 2 below this was a full tenant takeover: read an
-- organization_id here, insert yourself into organization_members, and every
-- is_org_member() policy in the database then answers true for you.
--
-- Migration 20260725150000 already dropped this policy but was evidently never
-- applied to production. Repeating it here, idempotently.
--
-- Safe to drop: AcceptInvite.tsx reads invitations only through the SECURITY
-- DEFINER RPCs get_organization_invite_by_token() and
-- accept_organization_invite(), which bypass RLS by design.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "invitations_read_by_token" ON public.organization_invitations;

-- ---------------------------------------------------------------------------
-- 2. Anyone could join any organization
--
-- "members_self_insert" was INSERT WITH CHECK (auth.uid() = user_id): it
-- verified *who* you are but never that you were invited. Given any
-- organization_id, an authenticated user could insert themselves as a member.
--
-- Self-insert still has to work for onboarding, where a brand-new user creates
-- an organization and then adds their own membership row (Onboarding.tsx,
-- orgHelper.ts). That case is authorised by organizations.created_by instead.
--
-- The other two paths are unaffected:
--   * invited users join via accept_organization_invite() (SECURITY DEFINER)
--   * owners/admins add members under the existing "members_owner_manage"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_creator(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND created_by = _user_id
  );
$$;

DROP POLICY IF EXISTS "members_self_insert" ON public.organization_members;
CREATE POLICY "members_self_insert" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_org_creator(organization_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Two WBS tables were readable and writable by every logged-in user
--
-- Both policies ended in "OR (auth.role() = 'authenticated')", which every
-- signed-in caller satisfies, making the org_id check ahead of it dead code.
-- They are FOR ALL, so this was cross-tenant write access, not just read.
--
-- Introduced in 20260724180000_wbs_completion_claims_evidence.sql:138,146.
-- That migration's test covered the anonymous case (auth.uid() IS NULL) but not
-- the authenticated one, which is why it went unnoticed.
--
-- FOR ALL with no WITH CHECK falls back to USING for writes; both are stated
-- explicitly here so the write path is not left implicit.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_isolation_wbs_completion_claims" ON public.wbs_completion_claims;
CREATE POLICY "org_isolation_wbs_completion_claims" ON public.wbs_completion_claims
  FOR ALL
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_isolation_wbs_completion_evidence" ON public.wbs_completion_evidence;
CREATE POLICY "org_isolation_wbs_completion_evidence" ON public.wbs_completion_evidence
  FOR ALL
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
