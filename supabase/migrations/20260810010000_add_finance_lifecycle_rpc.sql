-- PM-F2B1: Finance Lifecycle RPCs, Audit Events, and Grants
--
-- Transactional SECURITY DEFINER RPCs for commitment and expenditure
-- lifecycle operations. All actor/timestamp metadata is server-controlled.
-- Direct UPDATE on posted/approved/rejected/cancelled records is prevented
-- by RPC-mediated transitions. Audit events are written to the dedicated immutable
-- project_budget_finance_events table.

-- ─── 1. Finance audit uses project_budget_finance_events ────────────────

-- ─── 2. Helper: assert owner for a given org_id ───────────────────────────

CREATE OR REPLACE FUNCTION public.assert_finance_owner(_org_id UUID, _actor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_org_role(_org_id, _actor_id) <> 'owner' THEN
    RAISE EXCEPTION 'FINANCE_OWNER_REQUIRED: only organization owners can manage finance records'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_finance_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_finance_owner(UUID, UUID) TO service_role;

-- ─── 3. Commitment RPCs ───────────────────────────────────────────────────

-- 3a. Create draft commitment
CREATE OR REPLACE FUNCTION public.create_commitment_draft(
  p_lfa_project_id UUID,
  p_budget_item_id UUID,
  p_amount_idr NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_counterparty_name TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_expected_realization_date DATE DEFAULT NULL,
  p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_org_id UUID;
  v_row public.project_budget_commitments;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT bi.org_id INTO v_org_id
  FROM public.lfa_budget_items bi
  WHERE bi.id = p_budget_item_id
    AND bi.lfa_project_id = p_lfa_project_id
  FOR UPDATE;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'BUDGET_ITEM_NOT_FOUND_OR_WRONG_PROJECT' USING ERRCODE = '02000';
  END IF;
  PERFORM public.assert_finance_owner(v_org_id, v_actor);

  INSERT INTO public.project_budget_commitments (
    org_id, lfa_project_id, budget_item_id, amount_idr,
    workflow_status, description, counterparty_name, reference_number,
    expected_realization_date, evidence_url, created_by
  ) VALUES (
    v_org_id, p_lfa_project_id, p_budget_item_id, p_amount_idr,
    'draft', p_description, p_counterparty_name, p_reference_number,
    p_expected_realization_date, p_evidence_url, v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_org_id, p_lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_created',
    jsonb_build_object('amount_idr', p_amount_idr)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_commitment_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_commitment_draft TO authenticated, service_role;

-- 3b. Update draft commitment
CREATE OR REPLACE FUNCTION public.update_commitment_draft(
  p_commitment_id UUID,
  p_patch JSONB
)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_commitments;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_PATCH' USING ERRCODE = '22023';
  END IF;
  IF p_patch - ARRAY['amount_idr','description','counterparty_name','reference_number','expected_realization_date','evidence_url'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'PATCH_FIELD_NOT_ALLOWED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_commitments c
  WHERE c.id = p_commitment_id
    AND public.is_org_member(c.org_id, v_actor)
  FOR UPDATE;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_DRAFT' USING ERRCODE = '23000';
  END IF;
  IF p_patch ? 'amount_idr' AND (p_patch->>'amount_idr')::numeric <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '22000';
  END IF;

  UPDATE public.project_budget_commitments
  SET amount_idr = CASE WHEN p_patch ? 'amount_idr' THEN (p_patch->>'amount_idr')::numeric ELSE amount_idr END,
      description = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
      counterparty_name = CASE WHEN p_patch ? 'counterparty_name' THEN p_patch->>'counterparty_name' ELSE counterparty_name END,
      reference_number = CASE WHEN p_patch ? 'reference_number' THEN p_patch->>'reference_number' ELSE reference_number END,
      expected_realization_date = CASE WHEN p_patch ? 'expected_realization_date' THEN (p_patch->>'expected_realization_date')::date ELSE expected_realization_date END,
      evidence_url = CASE WHEN p_patch ? 'evidence_url' THEN p_patch->>'evidence_url' ELSE evidence_url END,
      updated_at = now()
  WHERE id = p_commitment_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_updated', jsonb_build_object('changed_fields', to_jsonb(ARRAY(SELECT jsonb_object_keys(p_patch))))
  );
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.update_commitment_draft(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_commitment_draft(UUID, JSONB) TO authenticated, service_role;

-- 3c. Submit commitment
CREATE OR REPLACE FUNCTION public.submit_commitment(p_commitment_id UUID)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_commitments;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_commitments c
  WHERE c.id = p_commitment_id
    AND public.is_org_member(c.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'draft' THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_DRAFT: only draft commitments can be submitted'
      USING ERRCODE = '23000';
  END IF;

  UPDATE public.project_budget_commitments
  SET workflow_status = 'submitted',
      submitted_by = v_actor,
      submitted_at = now(),
      updated_at = now()
  WHERE id = p_commitment_id;

  v_row.workflow_status := 'submitted';
  v_row.submitted_by := v_actor;
  v_row.submitted_at := now();
  v_row.updated_at := now();

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_submitted',
    '{}'::jsonb
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_commitment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_commitment TO authenticated, service_role;

-- 3d. Approve commitment
CREATE OR REPLACE FUNCTION public.approve_commitment(
  p_commitment_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_commitments;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_commitments c
  WHERE c.id = p_commitment_id
    AND public.is_org_member(c.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_SUBMITTED: only submitted commitments can be approved'
      USING ERRCODE = '23000';
  END IF;

  UPDATE public.project_budget_commitments
  SET workflow_status = 'approved',
      approved_by = v_actor,
      approved_at = v_now,
      decision_note = coalesce(p_decision_note, decision_note),
      updated_at = v_now
  WHERE id = p_commitment_id;

  v_row.workflow_status := 'approved';
  v_row.approved_by := v_actor;
  v_row.approved_at := v_now;
  v_row.updated_at := v_now;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_approved',
    jsonb_build_object('amount_idr', v_row.amount_idr)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_commitment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_commitment TO authenticated, service_role;

-- 3e. Reject commitment
CREATE OR REPLACE FUNCTION public.reject_commitment(
  p_commitment_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_commitments;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_commitments c
  WHERE c.id = p_commitment_id
    AND public.is_org_member(c.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_SUBMITTED: only submitted commitments can be rejected'
      USING ERRCODE = '23000';
  END IF;

  UPDATE public.project_budget_commitments
  SET workflow_status = 'rejected',
      rejected_by = v_actor,
      rejected_at = v_now,
      decision_note = coalesce(p_decision_note, decision_note),
      updated_at = v_now
  WHERE id = p_commitment_id;

  v_row.workflow_status := 'rejected';
  v_row.rejected_by := v_actor;
  v_row.rejected_at := v_now;
  v_row.updated_at := v_now;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_rejected',
    '{}'::jsonb
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_commitment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_commitment TO authenticated, service_role;

-- 3f. Cancel commitment
CREATE OR REPLACE FUNCTION public.cancel_commitment(
  p_commitment_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS public.project_budget_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_commitments;
  v_now TIMESTAMPTZ := now();
  v_net_posted NUMERIC := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_commitments c
  WHERE c.id = p_commitment_id
    AND public.is_org_member(c.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status NOT IN ('draft', 'submitted', 'approved') THEN
    RAISE EXCEPTION 'COMMITMENT_CANNOT_CANCEL: only draft, submitted, or approved commitments can be cancelled'
      USING ERRCODE = '23000';
  END IF;

  IF v_row.workflow_status = 'approved' THEN
    SELECT coalesce(sum(CASE WHEN e.reversal_of_id IS NULL THEN e.amount_idr ELSE -e.amount_idr END), 0)
      INTO v_net_posted
    FROM public.project_budget_expenditures e
    WHERE e.commitment_id = v_row.id
      AND e.workflow_status = 'posted';
    IF v_net_posted > 0 THEN
      RAISE EXCEPTION 'COMMITMENT_HAS_POSTED_ACTUAL: approved commitment with net posted actual cannot be cancelled'
        USING ERRCODE = '23000';
    END IF;
  END IF;

  UPDATE public.project_budget_commitments
  SET workflow_status = 'cancelled',
      cancelled_by = v_actor,
      cancelled_at = v_now,
      decision_note = coalesce(p_decision_note, decision_note),
      updated_at = v_now
  WHERE id = p_commitment_id;

  v_row.workflow_status := 'cancelled';
  v_row.cancelled_by := v_actor;
  v_row.cancelled_at := v_now;
  v_row.updated_at := v_now;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_commitment', v_row.id,
    'budget_commitment_cancelled',
    '{}'::jsonb
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_commitment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_commitment TO authenticated, service_role;

-- ─── 4. Expenditure RPCs ──────────────────────────────────────────────────

-- 4a. Create draft expenditure
CREATE OR REPLACE FUNCTION public.create_expenditure_draft(
  p_lfa_project_id UUID,
  p_budget_item_id UUID,
  p_amount_idr NUMERIC,
  p_commitment_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_org_id UUID;
  v_row public.project_budget_expenditures;
  v_commitment_status TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT bi.org_id INTO v_org_id
  FROM public.lfa_budget_items bi
  WHERE bi.id = p_budget_item_id
    AND bi.lfa_project_id = p_lfa_project_id
  FOR UPDATE;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'BUDGET_ITEM_NOT_FOUND_OR_WRONG_PROJECT' USING ERRCODE = '02000';
  END IF;
  PERFORM public.assert_finance_owner(v_org_id, v_actor);

  IF p_commitment_id IS NOT NULL THEN
    SELECT workflow_status INTO v_commitment_status
    FROM public.project_budget_commitments
    WHERE id = p_commitment_id AND lfa_project_id = p_lfa_project_id AND org_id = v_org_id AND budget_item_id = p_budget_item_id
    FOR UPDATE;

    IF v_commitment_status IS NULL THEN
      RAISE EXCEPTION 'COMMITMENT_NOT_FOUND_OR_WRONG_PROJECT'
        USING ERRCODE = '02000';
    END IF;

    IF v_commitment_status <> 'approved' THEN
      RAISE EXCEPTION 'EXPENDITURE_COMMITMENT_NOT_APPROVED: expenditure can only be linked to an approved commitment'
        USING ERRCODE = '23000';
    END IF;
  END IF;

  INSERT INTO public.project_budget_expenditures (
    org_id, lfa_project_id, budget_item_id, commitment_id, amount_idr,
    workflow_status, description, transaction_date, reference_number,
    evidence_url, created_by
  ) VALUES (
    v_org_id, p_lfa_project_id, p_budget_item_id, p_commitment_id, p_amount_idr,
    'draft', p_description, p_transaction_date, p_reference_number,
    p_evidence_url, v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_org_id, p_lfa_project_id, v_actor, 'budget_expenditure', v_row.id,
    'budget_expenditure_created',
    jsonb_build_object('amount_idr', p_amount_idr, 'commitment_id', p_commitment_id)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_expenditure_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_expenditure_draft TO authenticated, service_role;

-- 4b. Update draft expenditure
CREATE OR REPLACE FUNCTION public.update_expenditure_draft(
  p_expenditure_id UUID,
  p_patch JSONB
)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_expenditures;
  v_commitment public.project_budget_commitments;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_PATCH' USING ERRCODE = '22023';
  END IF;
  IF p_patch - ARRAY['amount_idr','commitment_id','description','transaction_date','reference_number','evidence_url'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'PATCH_FIELD_NOT_ALLOWED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_expenditures e
  WHERE e.id = p_expenditure_id
    AND public.is_org_member(e.org_id, v_actor)
  FOR UPDATE;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_DRAFT' USING ERRCODE = '23000';
  END IF;
  IF p_patch ? 'amount_idr' AND (p_patch->>'amount_idr')::numeric <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '22000';
  END IF;

  IF p_patch ? 'commitment_id' AND p_patch->>'commitment_id' IS NOT NULL THEN
    SELECT * INTO v_commitment
    FROM public.project_budget_commitments c
    WHERE c.id = (p_patch->>'commitment_id')::uuid
      AND c.lfa_project_id = v_row.lfa_project_id
      AND c.org_id = v_row.org_id
      AND c.budget_item_id = v_row.budget_item_id
    FOR UPDATE;
    IF v_commitment IS NULL THEN
      RAISE EXCEPTION 'COMMITMENT_NOT_FOUND_OR_WRONG_SCOPE' USING ERRCODE = 'P0002';
    END IF;
    IF v_commitment.workflow_status <> 'approved' THEN
      RAISE EXCEPTION 'EXPENDITURE_COMMITMENT_NOT_APPROVED' USING ERRCODE = '23000';
    END IF;
  END IF;

  UPDATE public.project_budget_expenditures
  SET amount_idr = CASE WHEN p_patch ? 'amount_idr' THEN (p_patch->>'amount_idr')::numeric ELSE amount_idr END,
      commitment_id = CASE WHEN p_patch ? 'commitment_id' THEN nullif(p_patch->>'commitment_id','')::uuid ELSE commitment_id END,
      description = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
      transaction_date = CASE WHEN p_patch ? 'transaction_date' THEN nullif(p_patch->>'transaction_date','')::date ELSE transaction_date END,
      reference_number = CASE WHEN p_patch ? 'reference_number' THEN p_patch->>'reference_number' ELSE reference_number END,
      evidence_url = CASE WHEN p_patch ? 'evidence_url' THEN p_patch->>'evidence_url' ELSE evidence_url END,
      updated_at = now()
  WHERE id = p_expenditure_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_expenditure', v_row.id,
    'budget_expenditure_updated', jsonb_build_object('changed_fields', to_jsonb(ARRAY(SELECT jsonb_object_keys(p_patch))))
  );
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.update_expenditure_draft(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_expenditure_draft(UUID, JSONB) TO authenticated, service_role;

-- 4c. Submit expenditure
CREATE OR REPLACE FUNCTION public.submit_expenditure(p_expenditure_id UUID)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_expenditures;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_expenditures e
  WHERE e.id = p_expenditure_id
    AND public.is_org_member(e.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'draft' THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_DRAFT: only draft expenditures can be submitted'
      USING ERRCODE = '23000';
  END IF;

  UPDATE public.project_budget_expenditures
  SET workflow_status = 'submitted',
      submitted_by = v_actor,
      submitted_at = now(),
      updated_at = now()
  WHERE id = p_expenditure_id;

  v_row.workflow_status := 'submitted';
  v_row.submitted_by := v_actor;
  v_row.submitted_at := now();
  v_row.updated_at := now();

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_expenditure', v_row.id,
    'budget_expenditure_submitted',
    '{}'::jsonb
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_expenditure FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_expenditure TO authenticated, service_role;

-- 4d. Post expenditure (with commitment realization enforcement)
CREATE OR REPLACE FUNCTION public.post_expenditure(
  p_expenditure_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_expenditures;
  v_now TIMESTAMPTZ := now();
  v_commitment_amount NUMERIC;
  v_already_posted NUMERIC;
  v_already_reversed NUMERIC;
  v_net_existing NUMERIC;
  v_total_after NUMERIC;
  v_commitment public.project_budget_commitments;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_expenditures e
  WHERE e.id = p_expenditure_id
    AND public.is_org_member(e.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_SUBMITTED: only submitted expenditures can be posted'
      USING ERRCODE = '23000';
  END IF;

  -- If linked to a commitment, enforce realization contract
  IF v_row.commitment_id IS NOT NULL THEN
    SELECT * INTO v_commitment
    FROM public.project_budget_commitments
    WHERE id = v_row.commitment_id
      AND lfa_project_id = v_row.lfa_project_id
    FOR UPDATE;

    IF v_commitment IS NULL THEN
      RAISE EXCEPTION 'COMMITMENT_NOT_FOUND' USING ERRCODE = '02000';
    END IF;

    IF v_commitment.workflow_status <> 'approved' THEN
      RAISE EXCEPTION 'COMMITMENT_NOT_APPROVED: cannot post against an unapproved commitment'
        USING ERRCODE = '23000';
    END IF;

    -- Sum already-posted expenditures linked to this commitment (exclude draft, submitted, rejected)
    SELECT coalesce(sum(e.amount_idr), 0) INTO v_already_posted
    FROM public.project_budget_expenditures e
    WHERE e.commitment_id = v_commitment.id
      AND e.lfa_project_id = v_row.lfa_project_id
      AND e.workflow_status = 'posted'
      AND e.reversal_of_id IS NULL
      AND e.id <> p_expenditure_id;

    -- Sum valid reversals linked to posted expenditures under this commitment
    SELECT coalesce(sum(r.amount_idr), 0) INTO v_already_reversed
    FROM public.project_budget_expenditures e
    JOIN public.project_budget_expenditures r ON r.reversal_of_id = e.id
    WHERE e.commitment_id = v_commitment.id
      AND e.lfa_project_id = v_row.lfa_project_id
      AND e.workflow_status = 'posted'
      AND r.workflow_status = 'posted'
      AND e.id <> p_expenditure_id;

    v_net_existing := v_already_posted - v_already_reversed;
    v_total_after := v_net_existing + v_row.amount_idr;

    IF v_total_after > v_commitment.amount_idr THEN
      RAISE EXCEPTION 'COMMITMENT_OVER_REALIZATION: total posted (%) + this expenditure (%) exceeds commitment amount (%)',
        v_net_existing, v_row.amount_idr, v_commitment.amount_idr
        USING ERRCODE = '23000';
    END IF;
  END IF;

  UPDATE public.project_budget_expenditures
  SET workflow_status = 'posted',
      posted_by = v_actor,
      posted_at = v_now,
      decision_note = coalesce(p_decision_note, decision_note),
      updated_at = v_now
  WHERE id = p_expenditure_id;

  v_row.workflow_status := 'posted';
  v_row.posted_by := v_actor;
  v_row.posted_at := v_now;
  v_row.updated_at := v_now;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_expenditure', v_row.id,
    'budget_expenditure_posted',
    jsonb_build_object('amount_idr', v_row.amount_idr, 'commitment_id', v_row.commitment_id)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.post_expenditure FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_expenditure TO authenticated, service_role;

-- 4e. Reject expenditure
CREATE OR REPLACE FUNCTION public.reject_expenditure(
  p_expenditure_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.project_budget_expenditures;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.project_budget_expenditures e
  WHERE e.id = p_expenditure_id
    AND public.is_org_member(e.org_id, v_actor)
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_row.org_id, v_actor);

  IF v_row.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_SUBMITTED: only submitted expenditures can be rejected'
      USING ERRCODE = '23000';
  END IF;

  UPDATE public.project_budget_expenditures
  SET workflow_status = 'rejected',
      rejected_by = v_actor,
      rejected_at = v_now,
      decision_note = coalesce(p_decision_note, decision_note),
      updated_at = v_now
  WHERE id = p_expenditure_id;

  v_row.workflow_status := 'rejected';
  v_row.rejected_by := v_actor;
  v_row.rejected_at := v_now;
  v_row.updated_at := v_now;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'budget_expenditure', v_row.id,
    'budget_expenditure_rejected',
    '{}'::jsonb
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_expenditure FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_expenditure TO authenticated, service_role;

-- 4f. Reverse posted expenditure
CREATE OR REPLACE FUNCTION public.reverse_expenditure(
  p_original_expenditure_id UUID,
  p_reversal_amount_idr NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_budget_expenditures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_original public.project_budget_expenditures;
  v_existing_reversals NUMERIC;
  v_total_after NUMERIC;
  v_reversal public.project_budget_expenditures;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_original
  FROM public.project_budget_expenditures e
  WHERE e.id = p_original_expenditure_id
    AND public.is_org_member(e.org_id, v_actor)
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  PERFORM public.assert_finance_owner(v_original.org_id, v_actor);

  IF v_original.workflow_status <> 'posted' THEN
    RAISE EXCEPTION 'EXPENDITURE_NOT_POSTED: only posted expenditures can be reversed'
      USING ERRCODE = '23000';
  END IF;

  IF v_original.reversal_of_id IS NOT NULL THEN
    RAISE EXCEPTION 'REVERSAL_CANNOT_REVERSE_REVERSAL: a reversal record cannot itself be reversed'
      USING ERRCODE = '23000';
  END IF;

  IF p_reversal_amount_idr <= 0 THEN
    RAISE EXCEPTION 'INVALID_REVERSAL_AMOUNT: reversal amount must be positive'
      USING ERRCODE = '22000';
  END IF;

  -- Sum existing reversals against this original
  SELECT coalesce(sum(r.amount_idr), 0) INTO v_existing_reversals
  FROM public.project_budget_expenditures r
  WHERE r.reversal_of_id = p_original_expenditure_id
    AND r.workflow_status = 'posted';

  v_total_after := v_existing_reversals + p_reversal_amount_idr;

  IF v_total_after > v_original.amount_idr THEN
    RAISE EXCEPTION 'REVERSAL_EXCEEDS_ORIGINAL: total reversals (%) + this reversal (%) exceeds original amount (%)',
      v_existing_reversals, p_reversal_amount_idr, v_original.amount_idr
      USING ERRCODE = '23000';
  END IF;

  -- Create the reversal as a new expenditure record
  INSERT INTO public.project_budget_expenditures (
    org_id, lfa_project_id, budget_item_id, commitment_id, amount_idr,
    workflow_status, description, transaction_date, reference_number,
    evidence_url, reversal_of_id, posted_by, posted_at, created_by, updated_at
  ) VALUES (
    v_original.org_id, v_original.lfa_project_id, v_original.budget_item_id,
    v_original.commitment_id, p_reversal_amount_idr,
    'posted', coalesce(p_description, 'Reversal of ' || v_original.id),
    current_date, null, p_evidence_url,
    p_original_expenditure_id, v_actor, v_now, v_actor, v_now
  )
  RETURNING * INTO v_reversal;

  INSERT INTO public.project_budget_finance_events (
    org_id, lfa_project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_original.org_id, v_original.lfa_project_id, v_actor, 'budget_expenditure',
    v_reversal.id, 'budget_expenditure_reversed',
    jsonb_build_object(
      'amount_idr', p_reversal_amount_idr,
      'original_expenditure_id', p_original_expenditure_id,
      'original_amount_idr', v_original.amount_idr
    )
  );

  RETURN v_reversal;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_expenditure FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_expenditure TO authenticated, service_role;

-- ─── 5. Read-only aggregate helper (optional, aids PM-F2B2) ───────────────

CREATE OR REPLACE FUNCTION public.compute_budget_aggregates(_lfa_project_id UUID)
RETURNS TABLE(
  budget_item_id UUID,
  planned NUMERIC,
  posted_actual_gross NUMERIC,
  posted_reversals NUMERIC,
  net_actual NUMERIC,
  approved_commitment NUMERIC,
  committed_outstanding NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    bi.id AS budget_item_id,
    coalesce(bi.volume, 0) * coalesce(bi.unit_price_idr, 0) AS planned,
    coalesce((
      SELECT sum(e.amount_idr)
      FROM public.project_budget_expenditures e
      WHERE e.budget_item_id = bi.id
        AND e.lfa_project_id = bi.lfa_project_id
        AND e.workflow_status = 'posted'
        AND e.reversal_of_id IS NULL
    ), 0) AS posted_actual_gross,
    coalesce((
      SELECT sum(r.amount_idr)
      FROM public.project_budget_expenditures e
      JOIN public.project_budget_expenditures r ON r.reversal_of_id = e.id AND r.workflow_status = 'posted'
      WHERE e.budget_item_id = bi.id
        AND e.lfa_project_id = bi.lfa_project_id
        AND e.workflow_status = 'posted'
        AND e.reversal_of_id IS NULL
    ), 0) AS posted_reversals,
    coalesce((
      SELECT sum(e.amount_idr)
      FROM public.project_budget_expenditures e
      WHERE e.budget_item_id = bi.id
        AND e.lfa_project_id = bi.lfa_project_id
        AND e.workflow_status = 'posted'
        AND e.reversal_of_id IS NULL
    ), 0) -
    coalesce((
      SELECT sum(r.amount_idr)
      FROM public.project_budget_expenditures e
      JOIN public.project_budget_expenditures r ON r.reversal_of_id = e.id AND r.workflow_status = 'posted'
      WHERE e.budget_item_id = bi.id
        AND e.lfa_project_id = bi.lfa_project_id
        AND e.workflow_status = 'posted'
        AND e.reversal_of_id IS NULL
    ), 0) AS net_actual,
    coalesce((
      SELECT sum(c.amount_idr)
      FROM public.project_budget_commitments c
      WHERE c.budget_item_id = bi.id
        AND c.lfa_project_id = bi.lfa_project_id
        AND c.workflow_status = 'approved'
    ), 0) AS approved_commitment,
    greatest(
      coalesce((
        SELECT sum(c.amount_idr)
        FROM public.project_budget_commitments c
        WHERE c.budget_item_id = bi.id
          AND c.lfa_project_id = bi.lfa_project_id
          AND c.workflow_status = 'approved'
      ), 0) -
      coalesce((
        SELECT sum(e.amount_idr)
        FROM public.project_budget_expenditures e
        WHERE e.budget_item_id = bi.id
          AND e.lfa_project_id = bi.lfa_project_id
          AND e.workflow_status = 'posted'
          AND e.reversal_of_id IS NULL
          AND e.commitment_id IS NOT NULL
      ), 0) +
      coalesce((
        SELECT sum(r.amount_idr)
        FROM public.project_budget_expenditures e
        JOIN public.project_budget_expenditures r ON r.reversal_of_id = e.id AND r.workflow_status = 'posted'
        WHERE e.budget_item_id = bi.id
          AND e.lfa_project_id = bi.lfa_project_id
          AND e.workflow_status = 'posted'
          AND e.reversal_of_id IS NULL
          AND e.commitment_id IS NOT NULL
      ), 0),
    0) AS committed_outstanding
  FROM public.lfa_budget_items bi
  WHERE bi.lfa_project_id = _lfa_project_id
    AND public.is_org_member(bi.org_id, auth.uid());
$$;

REVOKE ALL ON FUNCTION public.compute_budget_aggregates(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_budget_aggregates(UUID) TO authenticated;

COMMENT ON FUNCTION public.compute_budget_aggregates(UUID) IS
  'PM-F2 read-only aggregate helper. Returns per-budget-item planned, net actual, approved commitment, and committed outstanding for a given project. Tenant-scoped via is_org_member.';


-- Defense in depth: clients read normalized ledgers directly but mutate only via RPC.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.project_budget_commitments FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.project_budget_expenditures FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.project_budget_finance_events FROM PUBLIC, anon, authenticated;
