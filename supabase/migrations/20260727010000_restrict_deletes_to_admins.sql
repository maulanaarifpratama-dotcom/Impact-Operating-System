-- Migration: 20260727010000_restrict_deletes_to_admins.sql
-- Description: Make deletion of programme data an owner/admin action, matching
-- the role model the codebase already documents in src/lib/roles.ts:
--
--   owner | admin      full write, delete, invite, manage
--   member | operator  write, edit, generate AI — cannot delete
--   viewer             read-only
--
-- Three things were out of step with that.
--
-- 1. lfa_materializations. Yesterday's migration granted DELETE to any member,
--    which fixed the broken bulk delete but handed a destructive action to
--    staff. Narrowed to owner/admin.
--
-- 2. lfa_projects. "org_isolation_lfa_projects" is FOR ALL, so it covers DELETE
--    as well, and any member could remove an entire logframe. Permissive
--    policies are OR-ed, so simply adding a stricter DELETE policy alongside it
--    would change nothing — the FOR ALL would still allow it. The policy is
--    therefore split into SELECT/INSERT/UPDATE for members, with DELETE
--    reserved for owner and admin.
--
-- 3. gw_projects. "gw_projects_owner_admin_delete" reads
--    role IN (owner, admin) OR auth.uid() = created_by — so despite the name,
--    any member could delete a proposal they created. Left as-is, a staff
--    creator could delete the gw_projects row but not its materialisation
--    record, and the foreign key would refuse the delete with a message naming
--    the wrong table. Now genuinely owner/admin, as the name always claimed.

-- ---------------------------------------------------------------------------
-- 1. lfa_materializations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lfa_materializations_member_delete" ON public.lfa_materializations;
DROP POLICY IF EXISTS "lfa_materializations_admin_delete"  ON public.lfa_materializations;

CREATE POLICY "lfa_materializations_admin_delete" ON public.lfa_materializations
  FOR DELETE
  USING (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- 2. lfa_projects — split the catch-all so DELETE can be held back
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_isolation_lfa_projects" ON public.lfa_projects;
DROP POLICY IF EXISTS "lfa_projects_member_select" ON public.lfa_projects;
DROP POLICY IF EXISTS "lfa_projects_member_insert" ON public.lfa_projects;
DROP POLICY IF EXISTS "lfa_projects_member_update" ON public.lfa_projects;
DROP POLICY IF EXISTS "lfa_projects_admin_delete"  ON public.lfa_projects;

CREATE POLICY "lfa_projects_member_select" ON public.lfa_projects
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "lfa_projects_member_insert" ON public.lfa_projects
  FOR INSERT WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "lfa_projects_member_update" ON public.lfa_projects
  FOR UPDATE
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "lfa_projects_admin_delete" ON public.lfa_projects
  FOR DELETE
  USING (public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- 3. gw_projects — make the rule match its own name
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "gw_projects_owner_admin_delete" ON public.gw_projects;

CREATE POLICY "gw_projects_owner_admin_delete" ON public.gw_projects
  FOR DELETE
  USING (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));
