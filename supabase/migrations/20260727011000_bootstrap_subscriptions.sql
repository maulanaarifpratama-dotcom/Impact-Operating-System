-- Migration: 20260727011000_bootstrap_subscriptions.sql
-- Description: R3 — bootstrap public.subscriptions (plus public.plan_tier,
-- public.subscription_status, and public.set_updated_at()) so a fresh replay
-- can reach 20260727020000_plan_entitlements.sql, which references
-- public.subscriptions in a trigger function and a backfill INSERT but never
-- creates it.
--
-- Canonical shape source: db/chunk1_foundation.sql (the actual original
-- bootstrap script), cross-confirmed column-by-column by
-- src/integrations/supabase/database.generated.ts, and directly re-confirmed
-- against a live production catalog inventory (R3 Final Gate,
-- 2026-08-05) -- every column, constraint, index, RLS state, policy, and
-- trigger below matches production exactly, with zero drift found.
--
-- 20260727020000_plan_entitlements.sql itself already creates
-- has_paid_plan(), create_default_subscription(), its trigger, and all
-- eight product-gating policies -- confirmed live in production, byte-for
-- -byte matching that committed file. This migration therefore creates none
-- of those; it supplies only the subscriptions prerequisite plus the
-- subscriptions-owning RLS policies (subs_members_read, subs_admin_write),
-- which belong to this table and are never created by any other committed
-- migration.
--
-- The migration named "plan_entitlements" does not create or use a table
-- named plan_entitlements -- no such table exists in production, in any
-- migration, or in any application code path. That name is a filename
-- artifact; the real, active entitlement source is this table.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_labels TEXT[];
  v_expected TEXT[] := ARRAY['free', 'starter', 'premium', 'enterprise'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.plan_tier AS ENUM ('free', 'starter', 'premium', 'enterprise');
  ELSE
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder) INTO v_labels
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'plan_tier' AND t.typnamespace = 'public'::regnamespace;

    IF v_labels IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'PLAN_TIER_ENUM_INCOMPATIBLE: existing public.plan_tier has labels % in this order (expected % in exactly this order)', v_labels, v_expected;
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  v_labels TEXT[];
  v_expected TEXT[] := ARRAY['trialing', 'active', 'past_due', 'canceled', 'incomplete'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
  ELSE
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder) INTO v_labels
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_status' AND t.typnamespace = 'public'::regnamespace;

    IF v_labels IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'SUBSCRIPTION_STATUS_ENUM_INCOMPATIBLE: existing public.subscription_status has labels % in this order (expected % in exactly this order)', v_labels, v_expected;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. set_updated_at() -- shared trigger function, not yet in migration
-- history at this point. Production's version is plain LANGUAGE plpgsql,
-- not SECURITY DEFINER, matching the guard and body below exactly.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
  v_rettype TEXT;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF v_count = 1 THEN
    SELECT pg_get_function_result(p.oid) INTO v_rettype
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
      AND pg_get_function_identity_arguments(p.oid) = '';

    IF v_rettype IS NULL THEN
      RAISE EXCEPTION 'SET_UPDATED_AT_FUNCTION_INCOMPATIBLE: existing public.set_updated_at has a different argument signature (expected zero arguments)';
    END IF;

    IF v_rettype <> 'trigger' THEN
      RAISE EXCEPTION 'SET_UPDATED_AT_FUNCTION_INCOMPATIBLE: existing public.set_updated_at() returns % (expected trigger)', v_rettype;
    END IF;
  ELSIF v_count > 1 THEN
    RAISE EXCEPTION 'SET_UPDATED_AT_FUNCTION_INCOMPATIBLE: % overloads of public.set_updated_at exist (expected at most one, zero-argument)', v_count;
  END IF;
  -- v_count = 0: nothing to validate; CREATE OR REPLACE below creates it fresh.
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. subscriptions table
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_id_attnum SMALLINT;
  v_org_attnum SMALLINT;
  v_pk_conkey SMALLINT[];
  v_col RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'subscriptions' AND c.relkind = 'r'
  ) INTO v_table_exists;

  ----------------------------------------------------------------------------
  -- TABLE_ABSENT
  ----------------------------------------------------------------------------
  IF NOT v_table_exists THEN
    CREATE TABLE public.subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
      plan public.plan_tier NOT NULL DEFAULT 'free'::public.plan_tier,
      status public.subscription_status NOT NULL DEFAULT 'active'::public.subscription_status,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      provider TEXT,
      provider_subscription_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_ID_INCOMPATIBLE: existing public.subscriptions.id is not a NOT NULL uuid column';
  END IF;

  SELECT conkey INTO v_pk_conkey FROM pg_constraint
  WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'p';

  IF v_pk_conkey IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_ID_INCOMPATIBLE: existing public.subscriptions has no primary key';
  END IF;

  SELECT attnum INTO v_id_attnum FROM pg_attribute
  WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'id';

  IF array_length(v_pk_conkey, 1) <> 1 OR v_pk_conkey[1] <> v_id_attnum THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_ID_INCOMPATIBLE: existing public.subscriptions primary key is not exactly (id)';
  END IF;

  -- Tenancy: organization_id must be NOT NULL uuid, UNIQUE, and FK'd to
  -- organizations(id) ON DELETE CASCADE. This table's tenant scoping is
  -- load-bearing, unlike system_integrations' platform-wide shape.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'organization_id'
      AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_TENANCY_INCOMPATIBLE: existing public.subscriptions.organization_id is not a NOT NULL uuid column';
  END IF;

  SELECT attnum INTO v_org_attnum FROM pg_attribute
  WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'organization_id';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'u'
      AND conkey = ARRAY[v_org_attnum]
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_TENANCY_INCOMPATIBLE: existing public.subscriptions is missing UNIQUE(organization_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'f'
      AND confrelid = 'public.organizations'::regclass AND confdeltype = 'c'
      AND conkey = ARRAY[v_org_attnum]
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTIONS_TENANCY_INCOMPATIBLE: existing public.subscriptions.organization_id is missing its organizations(id) ON DELETE CASCADE foreign key';
  END IF;

  -- Every other canonical column: if present, its type must match; if
  -- absent, it is safe to add only because every default here (including
  -- the NOT NULL ones) is the exact same uniform value
  -- create_default_subscription() itself assigns to every row -- not a
  -- guessed per-row backfill, the same class of safe default Migration A
  -- (R1) used for organization_members.role.
  FOR v_col IN
    SELECT * FROM (VALUES
      ('plan', 'plan_tier', 'NO', $defval$'free'::public.plan_tier$defval$),
      ('status', 'subscription_status', 'NO', $defval$'active'::public.subscription_status$defval$),
      ('current_period_start', 'timestamptz', 'YES', NULL::text),
      ('current_period_end', 'timestamptz', 'YES', NULL::text),
      ('cancel_at_period_end', 'bool', 'NO', 'false'),
      ('provider', 'text', 'YES', NULL::text),
      ('provider_subscription_id', 'text', 'YES', NULL::text),
      ('created_at', 'timestamptz', 'NO', 'now()'),
      ('updated_at', 'timestamptz', 'NO', 'now()')
    ) AS expected(col_name, expected_udt, expected_nullable, add_default)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = v_col.col_name
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
          AND column_name = v_col.col_name AND udt_name = v_col.expected_udt AND is_nullable = v_col.expected_nullable
      ) THEN
        RAISE EXCEPTION 'SUBSCRIPTIONS_SCHEMA_INCOMPATIBLE: existing public.subscriptions.% does not match expected % (nullable=%)', v_col.col_name, v_col.expected_udt, v_col.expected_nullable;
      END IF;
    ELSE
      -- TABLE_PRESENT_SAFE_PARTIAL: add the missing column with its
      -- canonical type/nullability/default. Never invent per-row data.
      IF v_col.add_default IS NULL THEN
        EXECUTE format('ALTER TABLE public.subscriptions ADD COLUMN %I %s', v_col.col_name, v_col.expected_udt);
      ELSE
        EXECUTE format('ALTER TABLE public.subscriptions ADD COLUMN %I %s NOT NULL DEFAULT %s', v_col.col_name, v_col.expected_udt, v_col.add_default);
      END IF;
    END IF;
  END LOOP;

  -- TABLE_PRESENT_CANONICAL (or now-reconciled SAFE_PARTIAL): fall through to
  -- trigger/RLS/privilege reconciliation below. No row is rewritten above.
END $$;

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_subs_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS
--
-- trg_org_default_subscription, has_paid_plan(), and create_default_subscription()
-- are NOT created here -- they belong to 20260727020000_plan_entitlements.sql,
-- confirmed live in production and left entirely unchanged.
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_members_read" ON public.subscriptions;
CREATE POLICY "subs_members_read" ON public.subscriptions
  FOR SELECT
  USING (
    public.is_org_member(organization_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "subs_admin_write" ON public.subscriptions;
CREATE POLICY "subs_admin_write" ON public.subscriptions
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Privileges
--
-- authenticated needs table-level write privilege for the global-admin RLS
-- policy to ever authorize an actual write; RLS still denies every ordinary
-- member, owner, and org-admin attempt.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.subscriptions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;
