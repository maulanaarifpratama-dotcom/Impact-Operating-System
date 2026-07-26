-- supabase/snippets/apply_multiorg_fix_manual.sql
-- =========================================================================
-- PERBAIKAN BUG MULTI-ORGANISASI (pola "LIMIT 1")
--
-- Cara pakai:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Copy SELURUH isi file ini, paste, klik RUN
--   3. Target: "Success. No rows returned"
--
-- Aman: perubahan ini MEMPERLUAS akses dari "organisasi pertama saja" menjadi
-- "semua organisasi tempat Anda menjadi anggota". Tidak ada satu pun user yang
-- kehilangan akses ke data yang hari ini bisa mereka buka -- himpunan barunya
-- adalah superset dari yang lama.
--
-- Gagal satu = batal semua (Postgres menjalankan skrip ini sebagai satu
-- transaksi). Aman diulang.
-- =========================================================================

-- Migration: 20260726040000_fix_multi_org_limit1_policies.sql
-- Description: Replace the "first organization only" RLS pattern with a real
-- membership test, so users who belong to more than one organization can reach
-- all of their data instead of an arbitrary one.
--
-- Sixteen policies across fourteen tables scoped rows like this:
--
--   org_id = (SELECT organization_id FROM organization_members
--             WHERE user_id = auth.uid() LIMIT 1)
--
-- LIMIT 1 with no ORDER BY returns whichever membership row Postgres happens to
-- reach first. For a user in a single organization that is harmless. For a user
-- in two — which the invitation feature makes routine — every row belonging to
-- the other organization silently disappears: lists render empty, saves fail the
-- WITH CHECK, and nothing reports an error. Which organization "wins" is not
-- stable either; it can change as rows move on disk.
--
-- This is a correctness and availability bug, not a leak: the comparison is
-- still membership-scoped, just too narrow. Widening it to is_org_member() is a
-- strict superset of what each policy already allowed, so no user loses access
-- to anything they can reach today.
--
-- is_org_member() is SECURITY DEFINER and already backs the newer policies on
-- gw_projects, library_documents, donors and mor_sessions, so this also makes
-- the whole policy set consistent.
--
-- The FOR ALL policies below mostly had USING and no WITH CHECK, which makes
-- Postgres reuse USING for writes. Both are now stated explicitly so the write
-- path is not left implicit.

-- ---------------------------------------------------------------------------
-- 1. The twelve uniform policies: org_isolation_<table>, keyed on org_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  targets TEXT[] := ARRAY[
    'budget_items',
    'lfa_budget_items',
    'lfa_entries',
    'lfa_meal_accountability',
    'lfa_meal_items',
    'lfa_meal_learning_questions',
    'lfa_meal_tracking_entries',
    'lfa_projects',
    'lfa_sroi_config',
    'lfa_sroi_outcomes',
    'lfa_wbs_items',
    'wbs_tasks'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'lewati %: tabel tidak ada', t;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'org_isolation_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL '
      'USING (public.is_org_member(org_id, auth.uid())) '
      'WITH CHECK (public.is_org_member(org_id, auth.uid()))',
      'org_isolation_' || t, t
    );

    RAISE NOTICE 'diperbarui: %', t;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. beneficiaries
--
-- Carries both a FOR ALL and a FOR SELECT policy. The FOR ALL already covers
-- reads, so the SELECT one is redundant — but permissive policies are OR-ed, so
-- leaving a stale narrow copy in place would be harmless yet confusing. Both are
-- rewritten to the same test rather than restructured, to keep this migration a
-- pure bug fix.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "beneficiaries_all"    ON public.beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_select" ON public.beneficiaries;

CREATE POLICY "beneficiaries_all" ON public.beneficiaries
  FOR ALL
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "beneficiaries_select" ON public.beneficiaries
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. impact_readiness_assessments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "impact_readiness_assessments_read_own_org"  ON public.impact_readiness_assessments;
DROP POLICY IF EXISTS "impact_readiness_assessments_write_own_org" ON public.impact_readiness_assessments;

CREATE POLICY "impact_readiness_assessments_read_own_org" ON public.impact_readiness_assessments
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "impact_readiness_assessments_write_own_org" ON public.impact_readiness_assessments
  FOR ALL
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Catat ke ledger migrasi
-- ---------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260726040000')
ON CONFLICT (version) DO NOTHING;
