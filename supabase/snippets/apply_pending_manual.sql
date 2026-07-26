-- supabase/snippets/apply_pending_manual.sql
-- =========================================================================
-- SEMUA MIGRASI YANG BELUM DITERAPKAN, DIGABUNG JADI SATU.
--
-- Cara pakai:
--   1. Buka Supabase Dashboard -> SQL Editor -> New query
--   2. Copy SELURUH isi file ini, paste, klik RUN
--   3. Harusnya muncul "Success. No rows returned"
--
-- Aman dijalankan berulang kali (idempoten): semua pakai
-- IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
--
-- Postgres menjalankan skrip multi-statement sebagai satu transaksi, jadi
-- kalau ada satu yang gagal, TIDAK ADA yang tersimpan. Tidak akan setengah jadi.
--
-- Urutan sengaja: keamanan dulu, lalu perbaikan fitur.
-- =========================================================================



-- #########################################################################
-- BAGIAN 1: KEAMANAN - tutup rantai pengambilalihan antar-organisasi
-- sumber: supabase/migrations/20260726020000_fix_rls_cross_tenant_gaps.sql
-- #########################################################################

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


-- #########################################################################
-- BAGIAN 2: KEAMANAN - kunci system_integrations
-- sumber: supabase/migrations/20260726030000_restrict_system_integrations.sql
-- #########################################################################

-- Migration: 20260726030000_restrict_system_integrations.sql
-- Description: Stop system_integrations from being writable by everyone.
--
-- The table was created through the dashboard, not a migration, and carried
-- "system_integrations_all_policy" = ALL USING (true) WITH CHECK (true) —
-- read *and write* for any caller.
--
-- It has no organization_id: it is a single platform-level config row per
-- provider (id, provider, status, account_email, drive_id, metadata,
-- created_at, updated_at). The damage from open writes is that anyone could
-- overwrite drive_id and redirect where NGO evidence documents are uploaded, or
-- flip status and break the integration outright.
--
-- Access paths, both preserved:
--   * Settings.tsx:153 reads it with the user's own client -> needs SELECT.
--     It only reads; there is no write path in the frontend.
--   * onedrive-upload/index.ts:72 reads it via ctx.supabaseAdmin, which uses the
--     service role and bypasses RLS entirely -> unaffected by any policy here.

DROP POLICY IF EXISTS "system_integrations_all_policy"  ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_read_policy" ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_read"        ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_admin_write" ON public.system_integrations;

-- Signed-in users may see integration status; anonymous callers may not.
CREATE POLICY "system_integrations_read" ON public.system_integrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins may change it. The edge function writes as service role and is
-- not subject to this.
CREATE POLICY "system_integrations_admin_write" ON public.system_integrations
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- #########################################################################
-- BAGIAN 3: FITUR - perbaiki E-ROI Carbon Tracker yang error
-- sumber: supabase/migrations/20260725130000_eroi_quantity_and_scope.sql
-- #########################################################################

-- Migration: Add carbon_quantity and carbon_scope columns to lfa_wbs_items
-- Path: supabase/migrations/20260725130000_eroi_quantity_and_scope.sql

ALTER TABLE public.lfa_wbs_items
ADD COLUMN IF NOT EXISTS carbon_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS carbon_scope TEXT CHECK (carbon_scope IS NULL OR carbon_scope IN ('scope_1', 'scope_2', 'scope_3'));

COMMENT ON COLUMN public.lfa_wbs_items.carbon_quantity 
IS 'Actual quantity/volume for carbon impact calculation (e.g., number of trees, km traveled, kWh used)';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_scope 
IS 'GHG Protocol scope classification: scope_1 (direct), scope_2 (purchased energy), scope_3 (value chain)';


-- #########################################################################
-- BAGIAN 4: FITUR - perbaiki simpan stakeholder group di SROI
-- sumber: supabase/migrations/20260725140000_sroi_stakeholder_group.sql
-- #########################################################################

-- Migration: Add stakeholder_group column to lfa_sroi_items
-- Path: supabase/migrations/20260725140000_sroi_stakeholder_group.sql

ALTER TABLE public.lfa_sroi_items
ADD COLUMN IF NOT EXISTS stakeholder_group TEXT;

COMMENT ON COLUMN public.lfa_sroi_items.stakeholder_group 
IS 'SVI Principle 1: Target stakeholder group affected by this outcome (e.g., Penerima Manfaat Langsung, Komunitas Lokal)';


-- #########################################################################
-- BAGIAN 5: FITUR - fungsi auto-populate budget dari WBS
-- sumber: supabase/migrations/20260725020000_wbs_budget_auto_populate.sql
-- #########################################################################

-- Migration: 20260725020000_wbs_budget_auto_populate.sql
-- Description: Ensures default empty budget line items are auto-populated for any Level 2 WBS items that do not yet have budget items.

-- 1. Function to auto-populate default budget rows for level 2 WBS items lacking budget items
CREATE OR REPLACE FUNCTION public.auto_populate_wbs_default_budget_items(
  p_lfa_project_id UUID,
  p_org_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  INSERT INTO public.lfa_budget_items (
    lfa_project_id,
    org_id,
    wbs_item_id,
    activity_name,
    category,
    cost_category,
    item_name,
    volume,
    unit,
    unit_price_idr,
    justification,
    needs_donor_approval,
    sort_order,
    mode
  )
  SELECT
    p_lfa_project_id,
    p_org_id,
    wi.id,
    COALESCE(wi.name, 'Aktivitas WBS'),
    'Operasional',
    'Direct Operational Costs',
    'Rincian anggaran belum diisi',
    0,
    'Paket',
    0,
    'Belum diisi',
    FALSE,
    0,
    'simple'
  FROM public.lfa_wbs_items wi
  WHERE wi.lfa_project_id = p_lfa_project_id
    AND wi.level = 2
    AND NOT EXISTS (
      SELECT 1 FROM public.lfa_budget_items bi WHERE bi.wbs_item_id = wi.id
    );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;


-- #########################################################################
-- BAGIAN 6: RATE LIMIT - batasi pemakaian AI per user
-- sumber: supabase/migrations/20260726000000_ai_rate_limits.sql
-- #########################################################################

-- Migration: 20260726000000_ai_rate_limits.sql
-- Description: Per-user rate limiting for the Azure Foundry-backed edge functions.
--
-- Edge functions run across many short-lived isolates that share no memory, so an
-- in-process counter cannot bound spend. The counters therefore live in Postgres
-- and are incremented atomically through consume_ai_rate_limit().

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

-- Only the service role (which bypasses RLS) and the SECURITY DEFINER RPC below
-- touch this table. Enabling RLS with no policies denies every anon/authenticated
-- client by default, so a user cannot read or reset their own counter.
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically record one request against (_user_id, _bucket) and report whether it
-- is within budget. The window is a simple fixed window: once it expires, the
-- counter resets to 1 on the next call.
CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  _user_id UUID,
  _bucket TEXT,
  _limit INT,
  _window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _win_start TIMESTAMPTZ;
  _count INT;
BEGIN
  INSERT INTO public.ai_rate_limits AS rl (user_id, bucket, window_start, request_count)
  VALUES (_user_id, _bucket, _now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE
  SET
    -- In a DO UPDATE, the table alias refers to the pre-existing row, so both
    -- expressions below test the same (old) window_start.
    window_start = CASE
      WHEN rl.window_start < _now - make_interval(secs => _window_seconds)
      THEN _now
      ELSE rl.window_start
    END,
    request_count = CASE
      WHEN rl.window_start < _now - make_interval(secs => _window_seconds)
      THEN 1
      ELSE rl.request_count + 1
    END
  RETURNING rl.window_start, rl.request_count INTO _win_start, _count;

  RETURN jsonb_build_object(
    'allowed', _count <= _limit,
    'count', _count,
    'limit', _limit,
    'retry_after_seconds',
      GREATEST(0, _window_seconds - EXTRACT(EPOCH FROM (_now - _win_start))::INT)
  );
END;
$$;

-- The RPC is invoked with the service-role key from edge functions only.
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) TO service_role;


-- #########################################################################
-- BAGIAN 7: CATAT KE LEDGER MIGRASI
--
-- Supabase hanya mencatat migrasi yang dijalankan lewat CLI. Karena ini
-- dijalankan manual, versinya dicatat di sini supaya tabel schema_migrations
-- tetap jujur -- itu yang dipakai untuk mendeteksi migrasi tertinggal.
-- #########################################################################

INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260725020000'),
  ('20260725130000'),
  ('20260725140000'),
  ('20260725150000'),  -- sudah tercakup di BAGIAN 1
  ('20260726000000'),
  ('20260726020000'),
  ('20260726030000')
ON CONFLICT (version) DO NOTHING;
