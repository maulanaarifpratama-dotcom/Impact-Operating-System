-- Migration: 20260807030000_secure_claim_review_ownership.sql
-- Description: Hardened completion-claim review — Owner-only review with
--   canonical RPC, audit trigger update, and event emission.
--
-- Problem: handle_wbs_completion_claim_audit enforces Separation of Duties
--   (submitter cannot review own claim) but has no org_role check. Any
--   org member who is not the submitter can verify, reject, or request
--   revision. The frontend review buttons in the Rincian popover show for
--   all non-submitter members.
--
-- Solution:
--   1. review_wbs_completion_claim SECURITY DEFINER RPC — canonical
--      Owner-only review path with event emission.
--   2. Updated handle_wbs_completion_claim_audit — adds Owner-only check
--      for reviewed status transitions (verified/rejected/needs_revision).

-- ==========================================================================
-- 1. review_wbs_completion_claim RPC
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.review_wbs_completion_claim(
  p_claim_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_claim public.wbs_completion_claims;
  v_wbs public.lfa_wbs_items;
  v_role public.org_role;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_AUTH_REQUIRED: authentication is required';
  END IF;

  IF p_decision NOT IN ('verified', 'rejected', 'needs_revision') THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_INVALID_DECISION: decision must be verified, rejected, or needs_revision';
  END IF;

  SELECT c.* INTO v_claim
  FROM public.wbs_completion_claims c
  WHERE c.id = p_claim_id
  FOR UPDATE;

  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_NOT_FOUND: claim does not exist';
  END IF;

  IF v_claim.status <> 'submitted' THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_NOT_SUBMITTED: only submitted claims can be reviewed';
  END IF;

  SELECT w.* INTO v_wbs
  FROM public.lfa_wbs_items w
  WHERE w.id = v_claim.wbs_item_id;

  IF v_wbs.id IS NULL THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_WBS_NOT_FOUND: associated WBS item does not exist';
  END IF;

  v_role := public.get_org_role(v_claim.org_id, v_actor);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

  IF v_role <> 'owner' THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_FORBIDDEN: only organisation owner may review completion claims';
  END IF;

  IF v_claim.claimed_by = v_actor THEN
    RAISE EXCEPTION 'CLAIM_REVIEW_SELF_DENIED: claim submitter cannot review their own claim';
  END IF;

  UPDATE public.wbs_completion_claims c
  SET
    status = p_decision,
    review_note = p_review_note,
    reviewed_by = v_actor,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE c.id = p_claim_id
  RETURNING * INTO v_claim;

  RETURN QUERY
  SELECT v_claim.id, v_claim.status, v_claim.reviewed_by,
         v_claim.reviewed_at, v_claim.review_note;
END;
$$;

REVOKE ALL ON FUNCTION public.review_wbs_completion_claim(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_wbs_completion_claim(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ==========================================================================
-- 2. Harden audit trigger — Owner-only review
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_wbs_completion_claim_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  v_role public.org_role;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'wbs_completion_claims requires an authenticated user context (auth.uid() is null)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.claimed_by := current_user_id;
    IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at := NOW();
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();

    IF NEW.status IN ('verified', 'rejected', 'needs_revision') THEN
      -- Separation of Duties: submitter cannot review own claim
      IF current_user_id = OLD.claimed_by THEN
        RAISE EXCEPTION 'Separation of Duties violation: A claim submitter cannot verify or review their own claim (claimed_by: %)', OLD.claimed_by;
      END IF;

      IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = OLD.claimed_by THEN
        RAISE EXCEPTION 'Separation of Duties violation: Reviewer cannot be the same as the claim submitter (claimed_by: %)', OLD.claimed_by;
      END IF;

      -- Owner-only review: only organisation owner may review
      v_role := public.get_org_role(NEW.org_id, current_user_id);

      IF v_role IS NULL THEN
        RAISE EXCEPTION 'CLAIM_REVIEW_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
      END IF;

      IF v_role <> 'owner' THEN
        RAISE EXCEPTION 'CLAIM_REVIEW_FORBIDDEN: only organisation owner may review completion claims';
      END IF;

      NEW.reviewed_by := current_user_id;
      NEW.reviewed_at := NOW();
    END IF;

    IF NEW.status = 'submitted' AND OLD.status = 'needs_revision' THEN
      NEW.submitted_at := NOW();
      NEW.reviewed_at := NULL;
      NEW.reviewed_by := NULL;
      NEW.review_note := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
