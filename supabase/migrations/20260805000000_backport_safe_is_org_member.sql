-- Migration: 20260805000000_backport_safe_is_org_member.sql
-- Description: Source-of-truth backport only.
--
-- The historical definition of public.is_org_member(), introduced in
-- 20260600000000_organizations.sql, is an unconditional:
--
--   SELECT true;
--
-- No committed migration since then has ever replaced that body. Production
-- was verified on 2026-08-05 to already run a safe, scoped membership check —
-- this migration exists only so that migration history stops disagreeing
-- with what is actually deployed. If a database is ever rebuilt from this
-- history from scratch (fresh preview/local/staging environment), it must
-- land on the safe definition below, not the historical stub.
--
-- This migration changes nothing else: no table, no policy, no grant, and no
-- other function. CREATE OR REPLACE FUNCTION preserves the function's
-- existing ACL entries (grants), so the 65 production policies that already
-- call is_org_member(uuid, uuid) keep calling the same name with the same
-- signature and the same privileges — only the body changes, from an
-- unconditional true to a real membership check.
--
-- 20260600000000_organizations.sql is intentionally left untouched: editing
-- a historical migration would rewrite what already ran in every existing
-- environment. This file is purely additive.

CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = _org_id
      AND om.user_id = _user_id
  );
$function$;
