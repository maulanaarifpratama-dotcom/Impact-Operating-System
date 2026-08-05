-- Migration: 20260727015000_reconcile_billing_gated_table_authorization.sql
-- Description: R3 — reconcile the one shared authorization boundary left
-- open across the five tables 20260727020000_plan_entitlements.sql gates:
-- gw_projects, lfa_projects, library_documents, grantfinder_searches, and
-- beneficiaries.
--
-- gw_projects and library_documents were each created by
-- 20260600000000_organizations.sql with a permissive
-- "Enable all for <table>" FOR ALL USING (true) policy that no committed
-- migration ever drops. Production dropped both manually at some point
-- (neither exists in a live production catalog inventory, R3 Final Gate,
-- 2026-08-05) but that drop was never captured in migration history, so a
-- fresh replay still carries the bypass. Production's own replacement
-- policies (gw_projects_member_read/update, lib_docs_member_read/update/
-- owner_delete) are likewise absent from every committed migration --
-- reproduced verbatim below from that same catalog inventory. Dropping the
-- legacy policy and creating its replacements happen together in this one
-- file: dropping alone (with the replacements still missing) would leave
-- SELECT/UPDATE (and, for library_documents, DELETE) denied to everyone,
-- since RLS enabled + zero matching policies is deny-all for that command.
--
-- lfa_projects and beneficiaries need no policy work here -- both were
-- either fully superseded (20260727010000 split lfa_projects' original
-- catch-all into scoped select/insert/update/admin-delete policies before
-- this migration ever runs) or never had a catch-all to begin with
-- (beneficiaries), confirmed via exhaustive migration-history grep.
--
-- Table privilege in production is a uniform schema-level default (anon +
-- authenticated + service_role all hold full CRUD on every public table,
-- confirmed live for all five gated tables) applied once by Supabase's own
-- project bootstrap, not by any committed migration -- RLS is production's
-- only real gate. A disposable local replay never receives that bootstrap,
-- which is why a genuine SET LOCAL ROLE authenticated write fails today
-- with "permission denied" before RLS is ever evaluated. Rather than copy
-- production's ambient GRANT ALL verbatim, this migration grants exactly
-- what each table's own canonical policy set requires -- RLS remains the
-- real gate either way, and this keeps a fresh replay's privilege surface
-- no wider than the policies it is meant to test.

-- ---------------------------------------------------------------------------
-- 1. gw_projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for gw_projects" ON public.gw_projects;

DROP POLICY IF EXISTS "gw_projects_member_read" ON public.gw_projects;
CREATE POLICY "gw_projects_member_read" ON public.gw_projects
  FOR SELECT
  USING (
    public.is_org_member(organization_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "gw_projects_member_update" ON public.gw_projects;
CREATE POLICY "gw_projects_member_update" ON public.gw_projects
  FOR UPDATE
  USING (public.is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

-- gw_projects_member_insert (20260727020000) and gw_projects_owner_admin_delete
-- (20260727010000) are untouched -- both already exist and already match
-- production exactly.

-- ---------------------------------------------------------------------------
-- 2. library_documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for library_documents" ON public.library_documents;

DROP POLICY IF EXISTS "lib_docs_member_read" ON public.library_documents;
CREATE POLICY "lib_docs_member_read" ON public.library_documents
  FOR SELECT
  USING (
    public.is_org_member(organization_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "lib_docs_member_update" ON public.library_documents;
CREATE POLICY "lib_docs_member_update" ON public.library_documents
  FOR UPDATE
  USING (public.is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS "lib_docs_owner_delete" ON public.library_documents;
CREATE POLICY "lib_docs_owner_delete" ON public.library_documents
  FOR DELETE
  USING (
    public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin')
    OR auth.uid() = uploaded_by
  );

-- lib_docs_member_insert belongs to 20260727020000 -- not created here.

-- ---------------------------------------------------------------------------
-- 3. Privileges -- least privilege matching each table's own canonical
-- policy-controlled command set. anon gets nothing on any of the five;
-- service_role keeps full maintenance access on all five.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.gw_projects FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gw_projects TO authenticated;
GRANT ALL ON TABLE public.gw_projects TO service_role;

REVOKE ALL ON TABLE public.library_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.library_documents TO authenticated;
GRANT ALL ON TABLE public.library_documents TO service_role;

-- grantfinder_searches has no UPDATE or DELETE policy at all, so
-- authenticated gets only what gf_searches_owner_read/gf_searches_owner_insert
-- can ever authorize.
REVOKE ALL ON TABLE public.grantfinder_searches FROM anon;
GRANT SELECT, INSERT ON TABLE public.grantfinder_searches TO authenticated;
GRANT ALL ON TABLE public.grantfinder_searches TO service_role;

REVOKE ALL ON TABLE public.lfa_projects FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lfa_projects TO authenticated;
GRANT ALL ON TABLE public.lfa_projects TO service_role;

REVOKE ALL ON TABLE public.beneficiaries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.beneficiaries TO authenticated;
GRANT ALL ON TABLE public.beneficiaries TO service_role;
