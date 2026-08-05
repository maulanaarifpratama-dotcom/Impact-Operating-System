-- Migration: 20260724190000_bootstrap_org_role_membership.sql
-- Description: R1 Migration A — bootstrap public.org_role and reconcile
-- public.organization_members.role/user_id so a fresh migration replay can
-- reach 20260725000000_organization_invitations.sql's get_org_role(), which
-- declares RETURNS public.org_role, without a return-type mismatch.
--
-- organization_members shipped in 20260600000000_organizations.sql as
-- role TEXT DEFAULT 'member', with no foreign key or uniqueness constraint
-- on user_id. accept_organization_invite() (20260725000000) already relies
-- on ON CONFLICT (organization_id, user_id), which requires a matching
-- unique constraint that does not exist on a fresh replay.
--
-- This migration only touches organization_members. It does not edit any
-- historical migration file, and it aborts rather than guesses whenever the
-- existing data or shape is not provably safe to convert.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. organization_members.role: TEXT -> public.org_role
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_udt_name TEXT;
  v_invalid_value TEXT;
  v_null_count BIGINT;
BEGIN
  SELECT udt_name INTO v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'role';

  IF v_udt_name = 'org_role' THEN
    -- Already converted (re-run of this migration, or an environment where
    -- production's shape was replicated ahead of time). No-op.
    NULL;
  ELSIF v_udt_name = 'text' THEN
    SELECT count(*) INTO v_null_count
    FROM public.organization_members WHERE role IS NULL;

    IF v_null_count > 0 THEN
      RAISE EXCEPTION 'ORG_ROLE_NULL_VALUE: % existing organization_members row(s) have a NULL role and cannot be converted to public.org_role automatically', v_null_count;
    END IF;

    SELECT role INTO v_invalid_value
    FROM public.organization_members
    WHERE role NOT IN ('owner', 'admin', 'member')
    LIMIT 1;

    IF v_invalid_value IS NOT NULL THEN
      RAISE EXCEPTION 'UNEXPECTED_ORG_ROLE_VALUE: existing organization_members.role value % is not one of owner/admin/member', v_invalid_value;
    END IF;

    ALTER TABLE public.organization_members ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.organization_members ALTER COLUMN role TYPE public.org_role USING role::public.org_role;
  ELSE
    RAISE EXCEPTION 'UNEXPECTED_ORG_ROLE_TYPE: organization_members.role has udt_name % (expected text or org_role)', v_udt_name;
  END IF;

  ALTER TABLE public.organization_members ALTER COLUMN role SET DEFAULT 'member'::public.org_role;
END $$;

-- ---------------------------------------------------------------------------
-- 2. organization_members.user_id -> auth.users(id) ON DELETE CASCADE
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_conname TEXT;
  v_confrelid regclass;
  v_confdeltype CHAR;
BEGIN
  SELECT c.conname, c.confrelid, c.confdeltype
  INTO v_conname, v_confrelid, v_confdeltype
  FROM pg_constraint c
  WHERE c.conrelid = 'public.organization_members'::regclass
    AND c.contype = 'f'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organization_members'::regclass AND attname = 'user_id')];

  IF v_conname IS NOT NULL THEN
    IF v_confrelid <> 'auth.users'::regclass OR v_confdeltype <> 'c' THEN
      RAISE EXCEPTION 'UNEXPECTED_MEMBER_USER_ID_FK: existing constraint % on organization_members.user_id targets % with delete action % (expected auth.users(id) ON DELETE CASCADE)', v_conname, v_confrelid, v_confdeltype;
    END IF;
    -- Already canonical. No-op.
  ELSE
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. UNIQUE(organization_id, user_id)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_conname TEXT;
  v_dupe_count BIGINT;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public.organization_members'::regclass
    AND c.contype IN ('u', 'p')
    AND (SELECT array_agg(k ORDER BY k) FROM unnest(c.conkey) AS k)
      = (
        SELECT array_agg(attnum ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = 'public.organization_members'::regclass
          AND attname IN ('organization_id', 'user_id')
      );

  IF v_conname IS NOT NULL THEN
    NULL; -- Already canonical. No-op.
  ELSE
    SELECT count(*) INTO v_dupe_count
    FROM (
      SELECT organization_id, user_id
      FROM public.organization_members
      GROUP BY organization_id, user_id
      HAVING count(*) > 1
    ) dupes;

    IF v_dupe_count > 0 THEN
      RAISE EXCEPTION 'MEMBER_ORG_USER_DUPLICATE_BLOCKS_UNIQUE_CONSTRAINT: % duplicate (organization_id, user_id) pair(s) exist and must be resolved before a UNIQUE constraint can be added', v_dupe_count;
    END IF;

    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id);
  END IF;
END $$;
