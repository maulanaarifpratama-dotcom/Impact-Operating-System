-- Migration: 20260727012000_bootstrap_gw_projects_created_by.sql
-- Description: R3 — bootstrap public.gw_projects.created_by so a fresh
-- replay can reach 20260727020000_plan_entitlements.sql, whose
-- gw_projects_member_insert policy references this column in its
-- WITH CHECK clause but no committed migration ever adds it.
--
-- gw_projects is created by 20260600000000_organizations.sql with only
-- (id, organization_id, title, created_at). Production's real table has 16
-- columns -- confirmed via a read-only production catalog inventory
-- (R3 Blocker Gate, 2026-08-05) -- but created_by is the only one any
-- committed migration or RLS policy ever references. The other 15 are a
-- separate schema-drift finding, explicitly out of scope here.
--
-- Canonical shape, confirmed live in production: UUID NOT NULL, no default,
-- FOREIGN KEY -> auth.users(id) ON DELETE RESTRICT (matching
-- organizations.created_by's own delete behavior -- a user who still owns a
-- gw_projects row cannot be deleted). No trigger populates it anywhere;
-- production's own gw_projects_member_insert policy is what enforces
-- auth.uid() = created_by, so this migration adds no default and creates no
-- policy of its own -- 20260727020000 remains solely responsible for
-- gw_projects_member_insert, unchanged.

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
    WHERE table_schema = 'public' AND table_name = 'gw_projects' AND column_name = 'created_by'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    SELECT count(*) INTO v_row_count FROM public.gw_projects;

    IF v_row_count > 0 THEN
      RAISE EXCEPTION 'GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED: gw_projects has % existing row(s) and no created_by column to backfill from', v_row_count;
    END IF;

    ALTER TABLE public.gw_projects
      ADD COLUMN created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT;

    RETURN;
  END IF;

  -- Column exists: validate its shape before deciding whether it is already canonical.
  SELECT udt_name, is_nullable INTO v_udt_name, v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'gw_projects' AND column_name = 'created_by';

  IF v_udt_name <> 'uuid' THEN
    RAISE EXCEPTION 'UNEXPECTED_GW_PROJECT_CREATED_BY_TYPE: gw_projects.created_by has udt_name % (expected uuid)', v_udt_name;
  END IF;

  SELECT c.conname, c.confrelid, c.confdeltype
  INTO v_conname, v_confrelid, v_confdeltype
  FROM pg_constraint c
  WHERE c.conrelid = 'public.gw_projects'::regclass
    AND c.contype = 'f'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.gw_projects'::regclass AND attname = 'created_by')];

  IF v_conname IS NOT NULL AND (v_confrelid <> 'auth.users'::regclass OR v_confdeltype <> 'r') THEN
    RAISE EXCEPTION 'UNEXPECTED_GW_PROJECT_CREATED_BY_FK: existing constraint % on gw_projects.created_by targets % with delete action % (expected auth.users(id) ON DELETE RESTRICT)', v_conname, v_confrelid, v_confdeltype;
  END IF;

  IF v_is_nullable = 'NO' THEN
    -- Present, canonical NOT NULL uuid. Only add the FK if one is entirely
    -- absent -- an existing, differently-shaped FK was already rejected above.
    IF v_conname IS NULL THEN
      ALTER TABLE public.gw_projects
        ADD CONSTRAINT gw_projects_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
    END IF;
    RETURN;
  END IF;

  -- Nullable: only safe to tighten if no existing row would violate NOT NULL.
  -- Never infer ownership from organization creator, latest editor, owner
  -- role, project title, or any other table -- abort instead of guessing.
  SELECT count(*) INTO v_null_count FROM public.gw_projects WHERE created_by IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED: gw_projects has % row(s) with a NULL created_by and cannot be backfilled automatically', v_null_count;
  END IF;

  IF v_conname IS NULL THEN
    ALTER TABLE public.gw_projects
      ADD CONSTRAINT gw_projects_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  ALTER TABLE public.gw_projects ALTER COLUMN created_by SET NOT NULL;
END $$;
