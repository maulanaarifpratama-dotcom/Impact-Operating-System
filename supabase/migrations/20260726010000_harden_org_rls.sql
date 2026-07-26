-- Migration: 20260726010000_harden_org_rls.sql
-- Description: Replace unconditional "USING (true)" row-level security on the
-- organization-scoped tables with real multi-tenant isolation.
--
-- ============================================================================
-- VERIFY BEFORE APPLYING TO PRODUCTION
-- ----------------------------------------------------------------------------
-- The migration that creates these tables (20260600000000_organizations.sql) is
-- gitignored as a local bootstrap, so this repo cannot show what RLS is actually
-- live. Run supabase/snippets/audit_rls_state.sql against the target database
-- first, then apply this on a Supabase branch or staging copy and exercise
-- signup -> onboarding -> invite a teammate before promoting to production.
--
-- This file replaces policies *by name*. Policies it does not name are left
-- untouched, so a database that is already correctly locked down is unaffected
-- except for the helper functions being hardened.
-- ============================================================================
--
-- Design notes:
--   * Every membership test goes through a SECURITY DEFINER helper. A policy on
--     organization_members that queried organization_members directly would
--     recurse into that table's own RLS; a SECURITY DEFINER function runs as the
--     owner and short-circuits it.
--   * Bootstrap: a brand-new user has no membership row when they create their
--     first organization, so the first INSERT into organization_members is
--     authorised via organizations.created_by rather than via membership.
--   * Every helper pins search_path to defeat search_path injection against a
--     SECURITY DEFINER function.

-- ---------------------------------------------------------------------------
-- 0. Schema prerequisites
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_by UUID;

-- ---------------------------------------------------------------------------
-- 1. Membership helpers
-- ---------------------------------------------------------------------------

-- Replaces the "SELECT true" stub, which silently made every policy calling it
-- a no-op.
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_org_id UUID, _user_id UUID)
RETURNS public.org_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _user_id
  LIMIT 1;
$$;

-- Used only to authorise the very first membership row of a new organization.
CREATE OR REPLACE FUNCTION public.is_org_creator(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND created_by = _user_id
  );
$$;

-- Two users are visible to each other when they share at least one organization.
CREATE OR REPLACE FUNCTION public.shares_org_with(_other_user_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members a
    JOIN public.organization_members b ON b.organization_id = a.organization_id
    WHERE a.user_id = _user_id AND b.user_id = _other_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users on organizations"  ON public.organizations;
DROP POLICY IF EXISTS "Enable write for authenticated users on organizations" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;

-- The creator must stay visible even before their membership row exists,
-- otherwise onboarding cannot read back the org it just created.
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.is_org_member(id, auth.uid())
  );

CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE
  USING (public.get_org_role(id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_org_role(id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE USING (public.get_org_role(id, auth.uid()) = 'owner');

-- ---------------------------------------------------------------------------
-- 3. organization_members
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users on organization_members"  ON public.organization_members;
DROP POLICY IF EXISTS "Enable write for authenticated users on organization_members" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;

CREATE POLICY "org_members_select" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_member(organization_id, auth.uid())
  );

-- Either you are claiming an organization you just created, or an owner/admin is
-- adding you. Self-insert into an arbitrary organization is what this closes.
CREATE POLICY "org_members_insert" ON public.organization_members
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND public.is_org_creator(organization_id, auth.uid()))
    OR public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "org_members_update" ON public.organization_members
  FOR UPDATE
  USING (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

-- A member may remove themselves; owners and admins may remove anyone.
CREATE POLICY "org_members_delete" ON public.organization_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Teammates need each other's names in the members list, but nobody else does.
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.shares_org_with(id, auth.uid())
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Grant-writer tables (both carry organization_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.gw_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for gw_projects" ON public.gw_projects;
DROP POLICY IF EXISTS "gw_projects_org_isolation" ON public.gw_projects;

CREATE POLICY "gw_projects_org_isolation" ON public.gw_projects
  FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

ALTER TABLE public.gw_lfa_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for gw_lfa_documents" ON public.gw_lfa_documents;
DROP POLICY IF EXISTS "gw_lfa_documents_org_isolation" ON public.gw_lfa_documents;

CREATE POLICY "gw_lfa_documents_org_isolation" ON public.gw_lfa_documents
  FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Library and MOR tables
--
-- These are absent from src/integrations/supabase/database.types.ts, so their
-- production shape is unconfirmed. Each block is a no-op where the table or
-- column does not exist, rather than failing the whole migration.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.library_documents') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'library_documents'
         AND column_name = 'organization_id'
     )
  THEN
    EXECUTE 'ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Enable all for library_documents" ON public.library_documents';
    EXECUTE 'DROP POLICY IF EXISTS "library_documents_org_isolation" ON public.library_documents';
    EXECUTE $p$
      CREATE POLICY "library_documents_org_isolation" ON public.library_documents
        FOR ALL
        USING (public.is_org_member(organization_id, auth.uid()))
        WITH CHECK (public.is_org_member(organization_id, auth.uid()))
    $p$;
  END IF;
END $$;

-- library_chunks inherits its tenancy from its parent document.
DO $$
BEGIN
  IF to_regclass('public.library_chunks') IS NOT NULL
     AND to_regclass('public.library_documents') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'library_chunks'
         AND column_name = 'document_id'
     )
  THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.can_access_library_document(
        _document_id UUID, _user_id UUID
      )
      RETURNS BOOLEAN
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.library_documents d
          JOIN public.organization_members m
            ON m.organization_id = d.organization_id
          WHERE d.id = _document_id AND m.user_id = _user_id
        );
      $body$;
    $f$;

    EXECUTE 'ALTER TABLE public.library_chunks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Enable all for library_chunks" ON public.library_chunks';
    EXECUTE 'DROP POLICY IF EXISTS "library_chunks_org_isolation" ON public.library_chunks';
    EXECUTE $p$
      CREATE POLICY "library_chunks_org_isolation" ON public.library_chunks
        FOR ALL
        USING (public.can_access_library_document(document_id, auth.uid()))
        WITH CHECK (public.can_access_library_document(document_id, auth.uid()))
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.mor_sessions') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'mor_sessions'
         AND column_name = 'org_id'
     )
  THEN
    EXECUTE 'ALTER TABLE public.mor_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Enable all for mor_sessions" ON public.mor_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "mor_sessions_org_isolation" ON public.mor_sessions';
    EXECUTE $p$
      CREATE POLICY "mor_sessions_org_isolation" ON public.mor_sessions
        FOR ALL
        USING (public.is_org_member(org_id, auth.uid()))
        WITH CHECK (public.is_org_member(org_id, auth.uid()))
    $p$;
  END IF;
END $$;
