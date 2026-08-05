-- Migration: 20260726010000_bootstrap_organizations_created_by.sql
-- Description: R1 Migration B — bootstrap public.organizations.created_by so
-- is_org_creator() (20260726020000_fix_rls_cross_tenant_gaps.sql) and the
-- onboarding self-insert policy it backs have a column to read from on a
-- fresh replay. Production already carries this column; no committed
-- migration ever adds it.
--
-- This migration never guesses a creator identity. Any state that would
-- require guessing (existing rows with no creator to attribute) aborts
-- instead of backfilling a fabricated value.

DO $$
DECLARE
  v_col_exists BOOLEAN;
  v_udt_name TEXT;
  v_is_nullable TEXT;
  v_row_count BIGINT;
  v_null_count BIGINT;
  v_conname TEXT;
  v_confrelid regclass;
  v_confdeltype CHAR;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_by'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    SELECT count(*) INTO v_row_count FROM public.organizations;

    IF v_row_count > 0 THEN
      RAISE EXCEPTION 'CREATED_BY_BACKFILL_BLOCKED: organizations has % existing row(s) and no created_by column to backfill from', v_row_count;
    END IF;

    ALTER TABLE public.organizations
      ADD COLUMN created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT;

    RETURN;
  END IF;

  -- Column exists: validate its shape before deciding whether it is already canonical.
  SELECT udt_name, is_nullable INTO v_udt_name, v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_by';

  IF v_udt_name <> 'uuid' THEN
    RAISE EXCEPTION 'UNEXPECTED_CREATED_BY_TYPE: organizations.created_by has udt_name % (expected uuid)', v_udt_name;
  END IF;

  SELECT c.conname, c.confrelid, c.confdeltype
  INTO v_conname, v_confrelid, v_confdeltype
  FROM pg_constraint c
  WHERE c.conrelid = 'public.organizations'::regclass
    AND c.contype = 'f'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organizations'::regclass AND attname = 'created_by')];

  IF v_conname IS NOT NULL AND (v_confrelid <> 'auth.users'::regclass OR v_confdeltype <> 'r') THEN
    RAISE EXCEPTION 'UNEXPECTED_CREATED_BY_FK: existing constraint % on organizations.created_by targets % with delete action % (expected auth.users(id) ON DELETE RESTRICT)', v_conname, v_confrelid, v_confdeltype;
  END IF;

  IF v_is_nullable = 'NO' THEN
    -- Present, canonical NOT NULL uuid. Only add the FK if one is entirely
    -- absent -- an existing, differently-shaped FK was already rejected above.
    IF v_conname IS NULL THEN
      ALTER TABLE public.organizations
        ADD CONSTRAINT organizations_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
    END IF;
    RETURN;
  END IF;

  -- Nullable: only safe to tighten if no existing row would violate NOT NULL.
  SELECT count(*) INTO v_null_count FROM public.organizations WHERE created_by IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'CREATED_BY_BACKFILL_BLOCKED: organizations has % row(s) with a NULL created_by and cannot be backfilled automatically', v_null_count;
  END IF;

  IF v_conname IS NULL THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  ALTER TABLE public.organizations ALTER COLUMN created_by SET NOT NULL;
END $$;
