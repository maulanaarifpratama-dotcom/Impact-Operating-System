-- Migration: 20260726021000_bootstrap_admin_authorization.sql
-- Description: R1 Migration C — bootstrap public.admin_role, public.admin_users
-- and public.is_admin(), matching production's verified shape (R1 Final Admin
-- Gate production inventory, 2026-08-05), so that
-- 20260726030000_restrict_system_integrations.sql and any org-authorization
-- policy referencing is_admin() have a real function and table to call on a
-- fresh replay.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin', 'support');
  END IF;
END $$;

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_col TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'admin_users' AND c.relkind = 'r'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    CREATE TABLE public.admin_users (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.admin_role NOT NULL DEFAULT 'support'::public.admin_role,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RETURN;
  END IF;

  -- Table already exists (re-run, or an environment where production's shape
  -- was applied ahead of time). Validate it matches the canonical shape
  -- exactly rather than silently trusting a partial schema.
  FOR v_col IN SELECT unnest(ARRAY['user_id', 'role', 'created_at']) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = v_col
    ) THEN
      RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: existing public.admin_users is missing expected column %', v_col;
    END IF;
  END LOOP;

  IF (SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'user_id') <> 'uuid' THEN
    RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: admin_users.user_id is not uuid';
  END IF;

  IF (SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'role') <> 'admin_role' THEN
    RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: admin_users.role is not public.admin_role';
  END IF;

  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'role') <> 'NO' THEN
    RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: admin_users.role must be NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.admin_users'::regclass AND contype = 'p'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admin_users'::regclass AND attname = 'user_id')]
  ) THEN
    RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: admin_users.user_id is not the primary key';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.admin_users'::regclass AND contype = 'f'
      AND confrelid = 'auth.users'::regclass AND confdeltype = 'c'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admin_users'::regclass AND attname = 'user_id')]
  ) THEN
    RAISE EXCEPTION 'ADMIN_USERS_SCHEMA_INCOMPATIBLE: admin_users.user_id is missing its auth.users(id) ON DELETE CASCADE foreign key';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    WHERE au.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_admin_read" ON public.admin_users;
CREATE POLICY "admins_admin_read" ON public.admin_users
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Base table privileges are not assumed (see 20260806000000's precedent for
-- this repository's default ACL on new relations in the public schema).
GRANT SELECT ON TABLE public.admin_users TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_users FROM authenticated, anon;
