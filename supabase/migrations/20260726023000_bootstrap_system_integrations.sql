-- Migration: 20260726023000_bootstrap_system_integrations.sql
-- Description: R2 — bootstrap public.system_integrations so a fresh replay
-- can reach 20260726030000_restrict_system_integrations.sql, which references
-- this table but was created through the dashboard, not a migration, and
-- exists in no committed migration history.
--
-- Canonical shape source: db/update_library_and_integrations.sql (the actual
-- script that created this table in production), cross-confirmed by
-- src/integrations/supabase/database.generated.ts and a prior read-only
-- production catalog inventory. This is a platform-wide provider registry
-- (id, provider, status, account_email, drive_id, metadata, created_at,
-- updated_at) with no organization_id -- confirmed by all three sources and
-- by 20260726030000's own comment ("a single platform-level config row per
-- provider").
--
-- 20260726030000 assumes RLS is already enabled and supplies its own two
-- policies (system_integrations_read, system_integrations_admin_write). This
-- migration therefore creates zero policies -- doing otherwise would either
-- duplicate what that file creates or leave a stale intermediate policy for
-- it to drop. Its one RLS responsibility is enabling row-level security
-- itself, which no committed migration otherwise ever does for this table.
--
-- metadata is schemaless JSONB. Known current usage (Settings.tsx) reads a
-- `tenant` field from it -- a Microsoft 365 tenant domain, not a secret. The
-- real OAuth client secret and access tokens live in edge-function
-- environment variables (MICROSOFT_CLIENT_SECRET, etc.) and are never
-- persisted to this table anywhere in the codebase. No token, API key,
-- refresh token, client secret, or connection string may be stored in
-- system_integrations.metadata; nothing in this migration or its tests
-- assumes otherwise.

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_col RECORD;
  v_pk_conname TEXT;
  v_pk_conkey SMALLINT[];
  v_id_attnum SMALLINT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'system_integrations' AND c.relkind = 'r'
  ) INTO v_table_exists;

  ----------------------------------------------------------------------------
  -- TABLE_ABSENT
  ----------------------------------------------------------------------------
  IF NOT v_table_exists THEN
    CREATE TABLE public.system_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT,
      status TEXT,
      account_email TEXT,
      drive_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    RETURN;
  END IF;

  ----------------------------------------------------------------------------
  -- Table already exists: validate before deciding CANONICAL / PARTIAL_SAFE /
  -- INCOMPATIBLE. Never rebuild or rewrite a populated table.
  ----------------------------------------------------------------------------

  -- Reject an unexpected tenancy model outright, before checking anything else.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_integrations' AND column_name = 'organization_id'
  ) THEN
    RAISE EXCEPTION 'SYSTEM_INTEGRATIONS_TENANCY_INCOMPATIBLE: existing public.system_integrations has an organization_id column, which conflicts with its verified platform-wide (non-tenant-scoped) shape';
  END IF;

  -- id: must be UUID, NOT NULL, and the sole primary key column.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_integrations' AND column_name = 'id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'SYSTEM_INTEGRATIONS_ID_INCOMPATIBLE: existing public.system_integrations.id is not a NOT NULL uuid column';
  END IF;

  SELECT c.conname, c.conkey INTO v_pk_conname, v_pk_conkey
  FROM pg_constraint c
  WHERE c.conrelid = 'public.system_integrations'::regclass AND c.contype = 'p';

  IF v_pk_conname IS NULL THEN
    RAISE EXCEPTION 'SYSTEM_INTEGRATIONS_ID_INCOMPATIBLE: existing public.system_integrations has no primary key';
  END IF;

  SELECT attnum INTO v_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.system_integrations'::regclass AND attname = 'id';

  IF array_length(v_pk_conkey, 1) <> 1 OR v_pk_conkey[1] <> v_id_attnum THEN
    RAISE EXCEPTION 'SYSTEM_INTEGRATIONS_ID_INCOMPATIBLE: existing public.system_integrations primary key % is not exactly (id)', v_pk_conname;
  END IF;

  -- Every other canonical column: if present, its type must match; if
  -- absent, it is safe to add only because every one is nullable with a
  -- fully-proven default (or no default), never requiring a guessed backfill.
  FOR v_col IN
    SELECT * FROM (VALUES
      ('provider', 'text', NULL::text),
      ('status', 'text', NULL::text),
      ('account_email', 'text', NULL::text),
      ('drive_id', 'text', NULL::text),
      ('metadata', 'jsonb', $defval$'{}'::jsonb$defval$),
      ('created_at', 'timestamptz', 'now()'),
      ('updated_at', 'timestamptz', 'now()')
    ) AS expected(col_name, expected_udt, add_default)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'system_integrations' AND column_name = v_col.col_name
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'system_integrations'
          AND column_name = v_col.col_name AND udt_name = v_col.expected_udt
      ) THEN
        RAISE EXCEPTION 'SYSTEM_INTEGRATIONS_SCHEMA_INCOMPATIBLE: existing public.system_integrations.% is not % (TABLE_PRESENT_INCOMPATIBLE)', v_col.col_name, v_col.expected_udt;
      END IF;
    ELSE
      -- TABLE_PRESENT_PARTIAL_SAFE: add the missing column. Every column here
      -- is nullable, so adding it to a populated table never requires a
      -- backfill value.
      IF v_col.add_default IS NULL THEN
        EXECUTE format('ALTER TABLE public.system_integrations ADD COLUMN %I %s', v_col.col_name, v_col.expected_udt);
      ELSE
        EXECUTE format('ALTER TABLE public.system_integrations ADD COLUMN %I %s DEFAULT %s', v_col.col_name, v_col.expected_udt, v_col.add_default);
      END IF;
    END IF;
  END LOOP;

  -- TABLE_PRESENT_CANONICAL (or now-reconciled PARTIAL_SAFE): fall through to
  -- RLS/privilege reconciliation below. No row is rewritten by anything above.
END $$;

----------------------------------------------------------------------------
-- RLS: the one prerequisite 20260726030000 itself never establishes.
-- Zero policies are created here -- 20260726030000 supplies both
-- (system_integrations_read, system_integrations_admin_write) moments later
-- in the same replay, and its own DROP POLICY IF EXISTS calls are safe
-- no-ops against a table that has none yet.
----------------------------------------------------------------------------
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;

----------------------------------------------------------------------------
-- Privileges: base table privilege is a prerequisite for the row-level
-- policies to ever be reached at all, and no committed migration or manual
-- script sets it explicitly for this table. Granted here rather than
-- assumed. Authenticated write privilege does not itself authorize a write --
-- system_integrations_admin_write (created next) still gates it through
-- is_admin(auth.uid()).
----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.system_integrations TO authenticated;
GRANT ALL ON TABLE public.system_integrations TO service_role;
REVOKE ALL ON TABLE public.system_integrations FROM anon;
