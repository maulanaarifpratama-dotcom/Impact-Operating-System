-- Migration: 20260725000000_organization_invitations.sql
-- Description: Create organization_invitations table, RLS policies, and RPC for token validation and acceptance.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

-- Helper function guard for local migrations
CREATE OR REPLACE FUNCTION public.get_org_role(_org_id UUID, _user_id UUID)
RETURNS public.org_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _user_id
  LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "invitations_owner_admin_manage" ON public.organization_invitations;
CREATE POLICY "invitations_owner_admin_manage" ON public.organization_invitations
  FOR ALL
  USING (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "invitations_read_by_token" ON public.organization_invitations;
CREATE POLICY "invitations_read_by_token" ON public.organization_invitations
  FOR SELECT
  USING (true);

-- Security Definer Function: Get Invitation Details by Token
CREATE OR REPLACE FUNCTION public.get_organization_invite_by_token(_token UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  email TEXT,
  role public.org_role,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.organization_id,
    o.name AS organization_name,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    i.created_at,
    (i.expires_at <= now()) AS is_expired
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _token;
END;
$$;

-- Security Definer Function: Accept Organization Invitation
CREATE OR REPLACE FUNCTION public.accept_organization_invite(_token UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_email TEXT;
BEGIN
  -- 1. Fetch invitation
  SELECT * INTO _inv
  FROM public.organization_invitations
  WHERE token = _token;

  IF _inv.id IS NULL THEN
    RAISE EXCEPTION 'Undangan tidak ditemukan.';
  END IF;

  IF _inv.status = 'accepted' THEN
    RAISE EXCEPTION 'Undangan ini sudah pernah digunakan.';
  END IF;

  IF _inv.status = 'revoked' THEN
    RAISE EXCEPTION 'Undangan ini telah dibatalkan oleh pengelola.';
  END IF;

  -- 2. Strict backend expiration check
  IF _inv.expires_at <= now() THEN
    UPDATE public.organization_invitations
    SET status = 'expired'
    WHERE id = _inv.id;
    
    RAISE EXCEPTION 'Undangan telah kedaluwarsa (lebih dari 7 hari).';
  END IF;

  IF _inv.status != 'pending' THEN
    RAISE EXCEPTION 'Status undangan tidak valid: %', _inv.status;
  END IF;

  -- 3. Optionally verify user email matches (case insensitive check)
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  IF LOWER(_user_email) != LOWER(_inv.email) THEN
    RAISE EXCEPTION 'Email akun Anda (%) tidak cocok dengan email undangan (%)', _user_email, _inv.email;
  END IF;

  -- 4. Add user to organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (_inv.organization_id, _user_id, _inv.role, _inv.invited_by)
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role;

  -- 5. Mark invitation as accepted
  UPDATE public.organization_invitations
  SET status = 'accepted'
  WHERE id = _inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _inv.organization_id,
    'role', _inv.role
  );
END;
$$;
