-- Migration: 20260806090000_add_org_member_job_title.sql
-- Description: Add functional role (job_title) to organization_members and
-- organization_invitations. job_title is descriptive only — it must NOT
-- authorise any operation. Authorization remains based on org_role enum.

-- 1. organization_members.job_title
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
      AND column_name = 'job_title'
  ) THEN
    ALTER TABLE public.organization_members
      ADD COLUMN job_title TEXT NULL;
  END IF;
END $$;

-- 2. organization_invitations.job_title
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_invitations'
      AND column_name = 'job_title'
  ) THEN
    ALTER TABLE public.organization_invitations
      ADD COLUMN job_title TEXT NULL;
  END IF;
END $$;

-- 3. Replace accept_organization_invite to carry job_title through accept.
--    Preserves all existing security checks, exception messages, and
--    parameters byte-for-byte. The only additions are job_title support.
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

  -- 4. Add user to organization_members including job_title
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by, job_title)
  VALUES (_inv.organization_id, _user_id, _inv.role, _inv.invited_by, _inv.job_title)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, job_title = EXCLUDED.job_title;

  -- 5. Mark invitation as accepted
  UPDATE public.organization_invitations
  SET status = 'accepted'
  WHERE id = _inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _inv.organization_id,
    'role', _inv.role,
    'job_title', _inv.job_title
  );
END;
$$;
