-- Migration: 20260727014000_bootstrap_grantfinder_searches.sql
-- Description: R3 — bootstrap public.grantfinder_searches so a fresh replay
-- can reach 20260727020000_plan_entitlements.sql, whose
-- gf_searches_owner_insert policy targets this table but no committed
-- migration ever creates it.
--
-- Canonical shape source: db/chunk4_ai_extras.sql, cross-confirmed
-- column-by-column by src/integrations/supabase/database.generated.ts, and
-- directly re-confirmed against a live production catalog inventory (R3
-- Final Gate, 2026-08-05) -- exact 7-column match, both FKs, the index,
-- RLS state, and its lone policy all matching production exactly.
--
-- 20260727020000_plan_entitlements.sql itself already creates
-- gf_searches_owner_insert -- confirmed live in production, byte-for-byte
-- matching that committed file. This migration therefore creates only the
-- table prerequisite plus gf_searches_owner_read, which is never created by
-- any other committed migration and would otherwise leave the table with no
-- SELECT policy at all once 20260727020000 runs. Production's read policy
-- uses the is_org_member-based predicate from db/fix_security_gap.sql (a
-- later manual tightening of the original db/chunk4_ai_extras.sql text),
-- confirmed live and reproduced verbatim below. No UPDATE or DELETE policy
-- exists for this table in production, so none is created here. Privileges
-- for this table are set centrally in 20260727015000, alongside the other
-- four gated tables, not here.

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_id_attnum SMALLINT;
  v_org_attnum SMALLINT;
  v_user_attnum SMALLINT;
  v_pk_conkey SMALLINT[];
  v_row_count BIGINT;
  v_col RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'grantfinder_searches' AND c.relkind = 'r'
  ) INTO v_table_exists;

  ----------------------------------------------------------------------------
  -- TABLE_ABSENT
  ----------------------------------------------------------------------------
  IF NOT v_table_exists THEN
    CREATE TABLE public.grantfinder_searches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      filters JSONB NOT NULL DEFAULT '{}'::jsonb,
      result_grant_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_gf_searches_org ON public.grantfinder_searches (organization_id, created_at DESC);

    ALTER TABLE public.grantfinder_searches ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "gf_searches_owner_read" ON public.grantfinder_searches
      FOR SELECT TO authenticated
      USING (
        public.is_org_member(organization_id, auth.uid())
        OR public.is_admin(auth.uid())
      );

    RETURN;
  END IF;

  ----------------------------------------------------------------------------
  -- Table already exists: validate before deciding CANONICAL / SAFE_PARTIAL /
  -- INCOMPATIBLE. Never coerce values, guess ownership, or drop columns.
  ----------------------------------------------------------------------------

  -- id: must be UUID, NOT NULL, and the sole primary key column.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = 'id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_ID_INCOMPATIBLE: existing public.grantfinder_searches.id is not a NOT NULL uuid column';
  END IF;

  SELECT conkey INTO v_pk_conkey FROM pg_constraint
  WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'p';

  IF v_pk_conkey IS NULL THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_ID_INCOMPATIBLE: existing public.grantfinder_searches has no primary key';
  END IF;

  SELECT attnum INTO v_id_attnum FROM pg_attribute
  WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'id';

  IF array_length(v_pk_conkey, 1) <> 1 OR v_pk_conkey[1] <> v_id_attnum THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_ID_INCOMPATIBLE: existing public.grantfinder_searches primary key is not exactly (id)';
  END IF;

  -- organization_id: NOT NULL uuid, FK'd to organizations(id) ON DELETE CASCADE.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = 'organization_id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_TENANCY_INCOMPATIBLE: existing public.grantfinder_searches.organization_id is not a NOT NULL uuid column';
  END IF;

  SELECT attnum INTO v_org_attnum FROM pg_attribute
  WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'organization_id';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'f'
      AND confrelid = 'public.organizations'::regclass AND confdeltype = 'c'
      AND conkey = ARRAY[v_org_attnum]
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_TENANCY_INCOMPATIBLE: existing public.grantfinder_searches.organization_id is missing its organizations(id) ON DELETE CASCADE foreign key';
  END IF;

  -- user_id: NOT NULL uuid, FK'd to auth.users(id) ON DELETE CASCADE.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = 'user_id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_OWNER_INCOMPATIBLE: existing public.grantfinder_searches.user_id is not a NOT NULL uuid column';
  END IF;

  SELECT attnum INTO v_user_attnum FROM pg_attribute
  WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'user_id';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'f'
      AND confrelid = 'auth.users'::regclass AND confdeltype = 'c'
      AND conkey = ARRAY[v_user_attnum]
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_OWNER_INCOMPATIBLE: existing public.grantfinder_searches.user_id is missing its auth.users(id) ON DELETE CASCADE foreign key';
  END IF;

  -- query: NOT NULL text with no safe uniform default -- absent + nonempty
  -- table cannot be reconciled without guessing per-row search text.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = 'query'
  ) THEN
    SELECT count(*) INTO v_row_count FROM public.grantfinder_searches;
    IF v_row_count > 0 THEN
      RAISE EXCEPTION 'GRANTFINDER_SEARCHES_QUERY_BACKFILL_BLOCKED: grantfinder_searches has % existing row(s) and no query column to backfill from', v_row_count;
    END IF;
    ALTER TABLE public.grantfinder_searches ADD COLUMN query TEXT NOT NULL;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = 'query'
      AND udt_name = 'text' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'GRANTFINDER_SEARCHES_SCHEMA_INCOMPATIBLE: existing public.grantfinder_searches.query does not match expected text (nullable=NO)';
  END IF;

  -- Remaining columns all carry a safe uniform default, matching the same
  -- convention used for subscriptions in 20260727011000.
  FOR v_col IN
    SELECT * FROM (VALUES
      ('filters', 'jsonb', 'NO', $defval$'{}'::jsonb$defval$),
      ('result_grant_ids', '_uuid', 'NO', $defval$'{}'::uuid[]$defval$),
      ('created_at', 'timestamptz', 'NO', 'now()')
    ) AS expected(col_name, expected_udt, expected_nullable, add_default)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grantfinder_searches' AND column_name = v_col.col_name
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'grantfinder_searches'
          AND column_name = v_col.col_name AND udt_name = v_col.expected_udt AND is_nullable = v_col.expected_nullable
      ) THEN
        RAISE EXCEPTION 'GRANTFINDER_SEARCHES_SCHEMA_INCOMPATIBLE: existing public.grantfinder_searches.% does not match expected % (nullable=%)', v_col.col_name, v_col.expected_udt, v_col.expected_nullable;
      END IF;
    ELSE
      EXECUTE format('ALTER TABLE public.grantfinder_searches ADD COLUMN %I %s NOT NULL DEFAULT %s', v_col.col_name, v_col.expected_udt, v_col.add_default);
    END IF;
  END LOOP;

  -- Index: safe to add if missing, never dropped or replaced if present.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'grantfinder_searches' AND indexname = 'idx_gf_searches_org'
  ) THEN
    CREATE INDEX idx_gf_searches_org ON public.grantfinder_searches (organization_id, created_at DESC);
  END IF;

  -- RLS + policy: idempotent reconciliation, same as TABLE_ABSENT.
  ALTER TABLE public.grantfinder_searches ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "gf_searches_owner_read" ON public.grantfinder_searches;
  CREATE POLICY "gf_searches_owner_read" ON public.grantfinder_searches
    FOR SELECT TO authenticated
    USING (
      public.is_org_member(organization_id, auth.uid())
      OR public.is_admin(auth.uid())
    );
END $$;
