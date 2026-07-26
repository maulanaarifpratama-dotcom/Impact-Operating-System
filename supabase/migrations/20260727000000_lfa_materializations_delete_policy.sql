-- Migration: 20260727000000_lfa_materializations_delete_policy.sql
-- Description: Let organisation members delete their own materialisation
-- records, so a proposal that has been materialised can actually be removed.
--
-- lfa_materializations had policies for INSERT and SELECT only. A DELETE was
-- therefore not rejected — RLS simply filtered every row out of range, and
-- PostgREST answered 200 with an empty array. GrantWriterIndex's bulk delete
-- does exactly that as its cleanup step, sees no error, and moves on to delete
-- the gw_projects row, which then fails:
--
--   409 23503 — update or delete on table "gw_projects" violates foreign key
--   constraint "lfa_materializations_source_project_fk"
--
-- So every proposal that had been pushed into the LFA Studio became
-- undeletable, and the failure pointed at the wrong table. A silent zero-row
-- delete is worse than a refusal here: the caller cannot tell the difference
-- between "cleaned up" and "not allowed".
--
-- Scoped to membership, matching the table's existing read and insert policies.

DROP POLICY IF EXISTS "lfa_materializations_member_delete" ON public.lfa_materializations;

CREATE POLICY "lfa_materializations_member_delete" ON public.lfa_materializations
  FOR DELETE
  USING (public.is_org_member(organization_id, auth.uid()));
