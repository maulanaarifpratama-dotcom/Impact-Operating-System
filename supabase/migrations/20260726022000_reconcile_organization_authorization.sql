-- Migration: 20260726022000_reconcile_organization_authorization.sql
-- Description: R1 Migration D — replace the historical USING (true)
-- organizations/organization_members policies from
-- 20260600000000_organizations.sql with tenant- and role-scoped policies,
-- now that org_role (Migration A), created_by (Migration B), and is_admin()
-- (Migration C) all exist earlier in a fresh replay.
--
-- is_org_member() itself is still the historical unconditional `SELECT true;`
-- stub from 20260600000000_organizations.sql at this point in a fresh
-- replay -- its safe, scoped redefinition does not land until
-- 20260805000000_backport_safe_is_org_member.sql, which never runs before
-- this migration and, per the confirmed R1 boundary, is never reached at all
-- (replay stops at 20260726030000_restrict_system_integrations.sql on a
-- missing table). orgs_members_read below calls is_org_member() by name, so
-- installing the safe definition here -- before that policy is created --
-- is required for the R1 boundary itself to never carry an unconditional
-- cross-tenant read. This is additive and idempotent: it does not touch or
-- remove the later backport, which simply re-applies the same definition
-- (CREATE OR REPLACE, same signature) once that file's own turn comes.

CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = _org_id
      AND om.user_id = _user_id
  );
$function$;

REVOKE ALL ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(UUID, UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID)
TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read for authenticated users on organizations" ON public.organizations;
DROP POLICY IF EXISTS "Enable write for authenticated users on organizations" ON public.organizations;

DROP POLICY IF EXISTS "orgs_create" ON public.organizations;
CREATE POLICY "orgs_create" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "orgs_creator_read" ON public.organizations;
CREATE POLICY "orgs_creator_read" ON public.organizations
  FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "orgs_members_read" ON public.organizations;
CREATE POLICY "orgs_members_read" ON public.organizations
  FOR SELECT
  USING (
    public.is_org_member(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "orgs_owner_update" ON public.organizations;
CREATE POLICY "orgs_owner_update" ON public.organizations
  FOR UPDATE
  USING (public.get_org_role(id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_org_role(id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "orgs_owner_delete" ON public.organizations;
CREATE POLICY "orgs_owner_delete" ON public.organizations
  FOR DELETE
  USING (public.get_org_role(id, auth.uid()) = 'owner');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read for authenticated users on organization_members" ON public.organization_members;
DROP POLICY IF EXISTS "Enable write for authenticated users on organization_members" ON public.organization_members;

DROP POLICY IF EXISTS "members_owner_manage" ON public.organization_members;
CREATE POLICY "members_owner_manage" ON public.organization_members
  FOR ALL
  USING (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "members_read_own_org" ON public.organization_members;
CREATE POLICY "members_read_own_org" ON public.organization_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- members_self_insert already carries this exact definition, added by
-- 20260726020000_fix_rls_cross_tenant_gaps.sql. Recreated idempotently here
-- so this migration is a complete, self-contained statement of the final
-- policy set rather than relying on ordering against an earlier file.
DROP POLICY IF EXISTS "members_self_insert" ON public.organization_members;
CREATE POLICY "members_self_insert" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_org_creator(organization_id, auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO authenticated;
GRANT ALL ON TABLE public.organization_members TO service_role;

-- ---------------------------------------------------------------------------
-- Helper hardening (search_path pin only -- semantics unchanged)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_org_role(_org_id UUID, _user_id UUID)
RETURNS public.org_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _user_id
  LIMIT 1;
$$;
