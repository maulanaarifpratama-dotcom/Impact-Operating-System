-- Migration: 20260806040000_guard_project_management_direct_insert.sql
-- Description: lfa_projects_member_insert authorizes any paid org member to
-- INSERT a row, and the immutability trigger only watches UPDATE OF
-- project_mode -- neither stops a direct client insert that starts a row in
-- project_mode='project_management' from the beginning, silently bypassing
-- create_project_management_project() and its project_created event
-- guarantee.
--
-- An earlier version of this migration closed the gap with a BEFORE INSERT
-- trigger that compared current_user against the owner of
-- create_project_management_project(). That mechanism is too broad: any
-- other SECURITY DEFINER function owned by the same role would also satisfy
-- it, so the guard was authenticating "this role" rather than "this specific
-- approved creation path". This version replaces it with a narrower,
-- RLS-based restriction that does not depend on current_user, function-owner
-- identity, pg_proc introspection, or any session-local flag: direct
-- authenticated INSERT into lfa_projects is now restricted to
-- project_mode = 'programme_design' by the same canonical INSERT policy that
-- already governs membership and paid-plan eligibility. project_management
-- rows can then only originate from create_project_management_project(),
-- which is SECURITY DEFINER and therefore not subject to this policy at all
-- -- its own authorization (auth.uid(), membership, paid-plan) is performed
-- independently inside the function body, before it ever inserts.

-- Idempotent cleanup of the superseded owner-identity guard, safe whether or
-- not it was ever applied to this database.
DROP TRIGGER IF EXISTS trg_lfa_projects_pm_creation_guard ON public.lfa_projects;
DROP FUNCTION IF EXISTS public.enforce_project_management_creation_via_rpc();

-- Reconcile the canonical INSERT policy: same membership and paid-plan
-- conditions as before, now also restricted to programme_design so a direct
-- client insert can never produce a project_management row.
DROP POLICY IF EXISTS "lfa_projects_member_insert" ON public.lfa_projects;
CREATE POLICY "lfa_projects_member_insert" ON public.lfa_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND public.has_paid_plan(org_id)
    AND project_mode = 'programme_design'
  );
