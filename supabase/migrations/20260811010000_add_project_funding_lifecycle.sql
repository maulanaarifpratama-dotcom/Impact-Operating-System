-- PM-F3A-H1: Project Funding Lifecycle RPCs (Hardened)
--
-- All mutations are SECURITY DEFINER RPCs. Client never sends org_id
-- or actor metadata — those are derived server-side.
-- Lifecycle RPCs are granted to authenticated (owner) AND service_role.
-- Internal helper assert_funding_owner is service_role only.

-- ─── 0. Internal helper (service_role only) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.assert_funding_owner(_org_id UUID, _actor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_org_role(_org_id, _actor_id) <> 'owner' THEN
    RAISE EXCEPTION 'FINANCE_OWNER_REQUIRED: only organization owners can manage funding records'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_funding_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_funding_owner(UUID, UUID) TO service_role;

-- ─── 1. Funding Source RPCs ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_funding_source_draft(
  p_lfa_project_id UUID, p_source_name TEXT, p_funding_type TEXT DEFAULT 'grant',
  p_agreement_amount_idr NUMERIC DEFAULT NULL, p_currency TEXT DEFAULT 'IDR',
  p_agreement_number TEXT DEFAULT NULL, p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL, p_description TEXT DEFAULT NULL, p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_org_id UUID; v_row public.project_funding_sources;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501'; END IF;
  SELECT org_id INTO v_org_id FROM public.lfa_projects WHERE id = p_lfa_project_id AND public.is_org_member(org_id, v_actor);
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = '02000'; END IF;
  PERFORM public.assert_funding_owner(v_org_id, v_actor);
  INSERT INTO public.project_funding_sources (org_id,lfa_project_id,source_name,funding_type,agreement_amount_idr,currency,agreement_number,start_date,end_date,description,evidence_url,created_by)
  VALUES (v_org_id,p_lfa_project_id,p_source_name,p_funding_type,p_agreement_amount_idr,p_currency,p_agreement_number,p_start_date,p_end_date,p_description,p_evidence_url,v_actor)
  RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_org_id,p_lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_created',jsonb_build_object('amount_idr',p_agreement_amount_idr));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.create_funding_source_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_funding_source_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_funding_source_draft(p_funding_source_id UUID, p_patch JSONB)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_sources;
        v_allowed TEXT[] := ARRAY['source_name','funding_type','agreement_amount_idr','currency','agreement_number','start_date','end_date','description','evidence_url'];
        v_key TEXT; v_changed TEXT[] := '{}';
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_key <> ALL(v_allowed) THEN RAISE EXCEPTION 'PATCH_FIELD_NOT_ALLOWED: % is not editable', v_key USING ERRCODE='23000'; END IF;
    v_changed := array_append(v_changed, v_key);
  END LOOP;
  IF array_length(v_changed, 1) IS NULL THEN RETURN v_row; END IF;
  IF p_patch ? 'agreement_amount_idr' AND (p_patch->>'agreement_amount_idr')::numeric <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE='22000'; END IF;
  UPDATE public.project_funding_sources s SET
    source_name=coalesce(p_patch->>'source_name',s.source_name), funding_type=coalesce(p_patch->>'funding_type',s.funding_type),
    agreement_amount_idr=coalesce((p_patch->>'agreement_amount_idr')::numeric,s.agreement_amount_idr), currency=coalesce(p_patch->>'currency',s.currency),
    agreement_number=CASE WHEN p_patch ? 'agreement_number' THEN p_patch->>'agreement_number' ELSE s.agreement_number END,
    start_date=CASE WHEN p_patch ? 'start_date' THEN (p_patch->>'start_date')::date ELSE s.start_date END,
    end_date=CASE WHEN p_patch ? 'end_date' THEN (p_patch->>'end_date')::date ELSE s.end_date END,
    description=CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE s.description END,
    evidence_url=CASE WHEN p_patch ? 'evidence_url' THEN p_patch->>'evidence_url' ELSE s.evidence_url END,
    updated_at=now() WHERE id=p_funding_source_id
  RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_updated',jsonb_build_object('changed_fields',v_changed));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.update_funding_source_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_funding_source_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_funding_source(p_funding_source_id UUID)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_sources;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_sources SET workflow_status='submitted',submitted_by=v_actor,submitted_at=now(),updated_at=now() WHERE id=p_funding_source_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_submitted');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.submit_funding_source FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_funding_source TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_funding_source(p_funding_source_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_sources; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'submitted' THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_SUBMITTED' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_sources SET workflow_status='approved',approved_by=v_actor,approved_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_funding_source_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_approved',jsonb_build_object('amount_idr',v_row.agreement_amount_idr));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.approve_funding_source FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_funding_source TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_funding_source(p_funding_source_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_sources; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'submitted' THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_SUBMITTED' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_sources SET workflow_status='rejected',rejected_by=v_actor,rejected_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_funding_source_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_rejected');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.reject_funding_source FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_funding_source TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_funding_source(p_funding_source_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_sources; v_now TIMESTAMPTZ := now();
        v_net_receipt NUMERIC := 0; v_active_installments INT := 0;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status NOT IN ('draft','submitted','approved') THEN RAISE EXCEPTION 'FUNDING_SOURCE_CANNOT_CANCEL' USING ERRCODE='23000'; END IF;
  SELECT coalesce(sum(CASE WHEN e.reversal_of_id IS NULL THEN e.amount_idr ELSE -e.amount_idr END),0) INTO v_net_receipt
  FROM public.project_funding_receipts e WHERE e.funding_source_id=p_funding_source_id AND e.workflow_status='posted';
  IF v_net_receipt > 0 THEN RAISE EXCEPTION 'FUNDING_SOURCE_HAS_POSTED_RECEIPT' USING ERRCODE='23000'; END IF;
  SELECT count(*) INTO v_active_installments FROM public.project_funding_installments WHERE funding_source_id=p_funding_source_id AND workflow_status='scheduled';
  IF v_active_installments > 0 THEN RAISE EXCEPTION 'FUNDING_SOURCE_HAS_ACTIVE_INSTALLMENTS' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_sources SET workflow_status='cancelled',cancelled_by=v_actor,cancelled_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_funding_source_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_source',v_row.id,'funding_source_cancelled');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_funding_source FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_funding_source TO authenticated, service_role;

-- ─── 2. Installment RPCs ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_funding_installment_draft(
  p_funding_source_id UUID, p_installment_number INTEGER, p_installment_name TEXT DEFAULT NULL,
  p_scheduled_amount_idr NUMERIC DEFAULT NULL, p_due_date DATE DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_funding_installments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_source public.project_funding_sources; v_row public.project_funding_installments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_source FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_source IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  IF v_source.workflow_status <> 'approved' THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_APPROVED' USING ERRCODE='23000'; END IF;
  PERFORM public.assert_funding_owner(v_source.org_id, v_actor);
  INSERT INTO public.project_funding_installments (org_id,lfa_project_id,funding_source_id,installment_number,installment_name,scheduled_amount_idr,due_date,description,evidence_url,created_by)
  VALUES (v_source.org_id,v_source.lfa_project_id,p_funding_source_id,p_installment_number,p_installment_name,p_scheduled_amount_idr,p_due_date,p_description,p_evidence_url,v_actor)
  RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_source.org_id,v_source.lfa_project_id,v_actor,'funding_installment',v_row.id,'funding_installment_created',jsonb_build_object('amount_idr',p_scheduled_amount_idr));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.create_funding_installment_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_funding_installment_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_funding_installment_draft(p_installment_id UUID, p_patch JSONB)
RETURNS public.project_funding_installments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_installments;
        v_allowed TEXT[] := ARRAY['installment_number','installment_name','scheduled_amount_idr','due_date','description','evidence_url'];
        v_key TEXT; v_changed TEXT[] := '{}';
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_installments i WHERE i.id=p_installment_id AND public.is_org_member(i.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_key <> ALL(v_allowed) THEN RAISE EXCEPTION 'PATCH_FIELD_NOT_ALLOWED: % is not editable', v_key USING ERRCODE='23000'; END IF;
    v_changed := array_append(v_changed, v_key);
  END LOOP;
  IF array_length(v_changed, 1) IS NULL THEN RETURN v_row; END IF;
  IF p_patch ? 'scheduled_amount_idr' AND (p_patch->>'scheduled_amount_idr')::numeric <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE='22000'; END IF;
  UPDATE public.project_funding_installments SET
    installment_number=coalesce((p_patch->>'installment_number')::int,installment_number),
    installment_name=CASE WHEN p_patch ? 'installment_name' THEN p_patch->>'installment_name' ELSE installment_name END,
    scheduled_amount_idr=coalesce((p_patch->>'scheduled_amount_idr')::numeric,scheduled_amount_idr),
    due_date=CASE WHEN p_patch ? 'due_date' THEN (p_patch->>'due_date')::date ELSE due_date END,
    description=CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    evidence_url=CASE WHEN p_patch ? 'evidence_url' THEN p_patch->>'evidence_url' ELSE evidence_url END,
    updated_at=now() WHERE id=p_installment_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_installment',v_row.id,'funding_installment_updated',jsonb_build_object('changed_fields',v_changed));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.update_funding_installment_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_funding_installment_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.schedule_funding_installment(p_installment_id UUID)
RETURNS public.project_funding_installments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_installments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_installments i WHERE i.id=p_installment_id AND public.is_org_member(i.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_installments SET workflow_status='scheduled',submitted_by=v_actor,submitted_at=now(),updated_at=now() WHERE id=p_installment_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_installment',v_row.id,'funding_installment_scheduled');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.schedule_funding_installment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_funding_installment TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_funding_installment(p_installment_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_installments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_installments; v_net_receipt NUMERIC := 0; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_installments i WHERE i.id=p_installment_id AND public.is_org_member(i.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'scheduled' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_SCHEDULED' USING ERRCODE='23000'; END IF;
  SELECT coalesce(sum(CASE WHEN e.reversal_of_id IS NULL THEN e.amount_idr ELSE -e.amount_idr END), 0) INTO v_net_receipt
  FROM public.project_funding_receipts e WHERE e.installment_id=p_installment_id AND e.workflow_status='posted';
  IF v_net_receipt > 0 THEN RAISE EXCEPTION 'INSTALLMENT_HAS_POSTED_RECEIPT' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_installments SET workflow_status='cancelled',cancelled_by=v_actor,cancelled_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_installment_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_installment',v_row.id,'funding_installment_cancelled');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_funding_installment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_funding_installment TO authenticated, service_role;

-- ─── 3. Receipt RPCs ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_funding_receipt_draft(
  p_funding_source_id UUID, p_installment_id UUID DEFAULT NULL, p_amount_idr NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'IDR', p_receipt_date DATE DEFAULT NULL, p_reference_number TEXT DEFAULT NULL,
  p_bank_account_label TEXT DEFAULT NULL, p_description TEXT DEFAULT NULL, p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_source public.project_funding_sources; v_row public.project_funding_receipts;
        v_inst_status TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_source FROM public.project_funding_sources s WHERE s.id=p_funding_source_id AND public.is_org_member(s.org_id,v_actor) FOR UPDATE;
  IF v_source IS NULL THEN RAISE EXCEPTION 'FUNDING_SOURCE_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_source.org_id, v_actor);
  IF p_installment_id IS NOT NULL THEN
    SELECT workflow_status INTO v_inst_status FROM public.project_funding_installments i
    WHERE i.id=p_installment_id AND i.funding_source_id=p_funding_source_id AND i.org_id=v_source.org_id FOR UPDATE;
    IF v_inst_status IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_BELONG_TO_SOURCE' USING ERRCODE='02000'; END IF;
    IF v_inst_status <> 'scheduled' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_SCHEDULED' USING ERRCODE='23000'; END IF;
  END IF;
  INSERT INTO public.project_funding_receipts (org_id,lfa_project_id,funding_source_id,installment_id,amount_idr,currency,receipt_date,reference_number,bank_account_label,description,evidence_url,created_by)
  VALUES (v_source.org_id,v_source.lfa_project_id,p_funding_source_id,p_installment_id,p_amount_idr,p_currency,p_receipt_date,p_reference_number,p_bank_account_label,p_description,p_evidence_url,v_actor)
  RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_source.org_id,v_source.lfa_project_id,v_actor,'funding_receipt',v_row.id,'funding_receipt_created',jsonb_build_object('amount_idr',p_amount_idr,'installment_id',p_installment_id));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.create_funding_receipt_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_funding_receipt_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_funding_receipt_draft(p_receipt_id UUID, p_patch JSONB)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_receipts;
        v_allowed TEXT[] := ARRAY['installment_id','amount_idr','currency','receipt_date','reference_number','bank_account_label','description','evidence_url'];
        v_key TEXT; v_changed TEXT[] := '{}'; v_inst_status TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_receipts r WHERE r.id=p_receipt_id AND public.is_org_member(r.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'RECEIPT_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_key <> ALL(v_allowed) THEN RAISE EXCEPTION 'PATCH_FIELD_NOT_ALLOWED: % is not editable', v_key USING ERRCODE='23000'; END IF;
    v_changed := array_append(v_changed, v_key);
  END LOOP;
  IF array_length(v_changed, 1) IS NULL THEN RETURN v_row; END IF;
  IF p_patch ? 'amount_idr' AND (p_patch->>'amount_idr')::numeric <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE='22000'; END IF;
  IF p_patch ? 'installment_id' THEN
    IF p_patch->>'installment_id' IS NOT NULL AND p_patch->>'installment_id' <> '' THEN
      SELECT workflow_status INTO v_inst_status FROM public.project_funding_installments i
      WHERE i.id=(p_patch->>'installment_id')::uuid AND i.funding_source_id=v_row.funding_source_id AND i.org_id=v_row.org_id FOR UPDATE;
      IF v_inst_status IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_BELONG_TO_SOURCE' USING ERRCODE='02000'; END IF;
      IF v_inst_status <> 'scheduled' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_SCHEDULED' USING ERRCODE='23000'; END IF;
    END IF;
  END IF;
  UPDATE public.project_funding_receipts SET
    installment_id=CASE WHEN p_patch ? 'installment_id' THEN (p_patch->>'installment_id')::uuid ELSE installment_id END,
    amount_idr=coalesce((p_patch->>'amount_idr')::numeric,amount_idr),
    currency=coalesce(p_patch->>'currency',currency),
    receipt_date=CASE WHEN p_patch ? 'receipt_date' THEN (p_patch->>'receipt_date')::date ELSE receipt_date END,
    reference_number=CASE WHEN p_patch ? 'reference_number' THEN p_patch->>'reference_number' ELSE reference_number END,
    bank_account_label=CASE WHEN p_patch ? 'bank_account_label' THEN p_patch->>'bank_account_label' ELSE bank_account_label END,
    description=CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    evidence_url=CASE WHEN p_patch ? 'evidence_url' THEN p_patch->>'evidence_url' ELSE evidence_url END,
    updated_at=now() WHERE id=p_receipt_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_receipt',v_row.id,'funding_receipt_updated',jsonb_build_object('changed_fields',v_changed));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.update_funding_receipt_draft FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_funding_receipt_draft TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_funding_receipt(p_receipt_id UUID)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_receipts;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_receipts r WHERE r.id=p_receipt_id AND public.is_org_member(r.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'draft' THEN RAISE EXCEPTION 'RECEIPT_NOT_DRAFT' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_receipts SET workflow_status='submitted',submitted_by=v_actor,submitted_at=now(),updated_at=now() WHERE id=p_receipt_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_receipt',v_row.id,'funding_receipt_submitted');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.submit_funding_receipt FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_funding_receipt TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.post_funding_receipt(p_receipt_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_receipts; v_now TIMESTAMPTZ := now();
        v_inst_status TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_receipts r WHERE r.id=p_receipt_id AND public.is_org_member(r.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'submitted' THEN RAISE EXCEPTION 'RECEIPT_NOT_SUBMITTED' USING ERRCODE='23000'; END IF;
  IF v_row.installment_id IS NOT NULL THEN
    SELECT workflow_status INTO v_inst_status FROM public.project_funding_installments i
    WHERE i.id=v_row.installment_id AND i.funding_source_id=v_row.funding_source_id AND i.org_id=v_row.org_id FOR UPDATE;
    IF v_inst_status IS NULL THEN RAISE EXCEPTION 'INSTALLMENT_NOT_BELONG_TO_SOURCE' USING ERRCODE='02000'; END IF;
    IF v_inst_status <> 'scheduled' THEN RAISE EXCEPTION 'INSTALLMENT_NOT_SCHEDULED' USING ERRCODE='23000'; END IF;
  END IF;
  UPDATE public.project_funding_receipts SET workflow_status='posted',posted_by=v_actor,posted_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_receipt_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_receipt',v_row.id,'funding_receipt_posted',jsonb_build_object('amount_idr',v_row.amount_idr));
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.post_funding_receipt FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_funding_receipt TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_funding_receipt(p_receipt_id UUID, p_decision_note TEXT DEFAULT NULL)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_row public.project_funding_receipts; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.project_funding_receipts r WHERE r.id=p_receipt_id AND public.is_org_member(r.org_id,v_actor) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_row.org_id, v_actor);
  IF v_row.workflow_status <> 'submitted' THEN RAISE EXCEPTION 'RECEIPT_NOT_SUBMITTED' USING ERRCODE='23000'; END IF;
  UPDATE public.project_funding_receipts SET workflow_status='rejected',rejected_by=v_actor,rejected_at=v_now,decision_note=coalesce(p_decision_note,decision_note),updated_at=v_now WHERE id=p_receipt_id RETURNING * INTO v_row;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type) VALUES (v_row.org_id,v_row.lfa_project_id,v_actor,'funding_receipt',v_row.id,'funding_receipt_rejected');
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.reject_funding_receipt FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_funding_receipt TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reverse_funding_receipt(
  p_original_receipt_id UUID, p_reversal_amount_idr NUMERIC,
  p_description TEXT DEFAULT NULL, p_evidence_url TEXT DEFAULT NULL
)
RETURNS public.project_funding_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor UUID := auth.uid(); v_original public.project_funding_receipts;
        v_existing_reversals NUMERIC; v_reversal public.project_funding_receipts; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_original FROM public.project_funding_receipts r WHERE r.id=p_original_receipt_id AND public.is_org_member(r.org_id,v_actor) FOR UPDATE;
  IF v_original IS NULL THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND' USING ERRCODE='02000'; END IF;
  PERFORM public.assert_funding_owner(v_original.org_id, v_actor);
  IF v_original.workflow_status <> 'posted' THEN RAISE EXCEPTION 'RECEIPT_NOT_POSTED' USING ERRCODE='23000'; END IF;
  IF v_original.reversal_of_id IS NOT NULL THEN RAISE EXCEPTION 'REVERSAL_CANNOT_REVERSE_REVERSAL' USING ERRCODE='23000'; END IF;
  IF p_reversal_amount_idr <= 0 THEN RAISE EXCEPTION 'INVALID_REVERSAL_AMOUNT' USING ERRCODE='22000'; END IF;
  SELECT coalesce(sum(rv.amount_idr),0) INTO v_existing_reversals FROM public.project_funding_receipts rv
  WHERE rv.reversal_of_id=p_original_receipt_id AND rv.workflow_status='posted';
  IF v_existing_reversals + p_reversal_amount_idr > v_original.amount_idr THEN
    RAISE EXCEPTION 'REVERSAL_EXCEEDS_ORIGINAL' USING ERRCODE='23000';
  END IF;
  INSERT INTO public.project_funding_receipts (org_id,lfa_project_id,funding_source_id,installment_id,amount_idr,currency,receipt_date,description,evidence_url,workflow_status,reversal_of_id,posted_by,posted_at,created_by,updated_at)
  VALUES (v_original.org_id,v_original.lfa_project_id,v_original.funding_source_id,v_original.installment_id,p_reversal_amount_idr,v_original.currency,v_original.receipt_date,p_description,p_evidence_url,'posted',p_original_receipt_id,v_actor,v_now,v_actor,v_now)
  RETURNING * INTO v_reversal;
  INSERT INTO public.project_funding_events (org_id,lfa_project_id,actor_id,entity_type,entity_id,event_type,safe_metadata)
  VALUES (v_original.org_id,v_original.lfa_project_id,v_actor,'funding_receipt',v_reversal.id,'funding_receipt_reversed',
    jsonb_build_object('amount_idr',p_reversal_amount_idr,'original_receipt_id',p_original_receipt_id));
  RETURN v_reversal;
END; $$;
REVOKE ALL ON FUNCTION public.reverse_funding_receipt FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_funding_receipt TO authenticated, service_role;

-- ─── 4. Aggregate Helper ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_project_funding_aggregates(_lfa_project_id UUID)
RETURNS TABLE(
  total_funding_agreement NUMERIC, total_scheduled NUMERIC,
  total_received_gross NUMERIC, total_receipt_reversals NUMERIC, net_received_cash NUMERIC,
  allocated_received NUMERIC, unallocated_received NUMERIC,
  total_outstanding_receivable NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH originals AS (
    SELECT id, amount_idr, funding_source_id, installment_id
    FROM public.project_funding_receipts
    WHERE lfa_project_id=_lfa_project_id AND workflow_status='posted' AND reversal_of_id IS NULL
      AND public.is_org_member(org_id, auth.uid())
  ),
  reversals AS (
    SELECT rv.reversal_of_id AS original_id, rv.amount_idr
    FROM public.project_funding_receipts rv
    WHERE rv.lfa_project_id=_lfa_project_id AND rv.workflow_status='posted' AND rv.reversal_of_id IS NOT NULL
      AND public.is_org_member(rv.org_id, auth.uid())
  ),
  net_by_original AS (
    SELECT o.id, o.funding_source_id, o.installment_id,
           o.amount_idr - coalesce((SELECT sum(r.amount_idr) FROM reversals r WHERE r.original_id=o.id),0) AS net
    FROM originals o
  ),
  scheduled_installments AS (
    SELECT id, scheduled_amount_idr, funding_source_id
    FROM public.project_funding_installments
    WHERE lfa_project_id=_lfa_project_id AND workflow_status='scheduled'
      AND public.is_org_member(org_id, auth.uid())
  )
  SELECT
    coalesce((SELECT sum(agreement_amount_idr) FROM public.project_funding_sources WHERE lfa_project_id=_lfa_project_id AND workflow_status='approved' AND public.is_org_member(org_id,auth.uid())),0),
    coalesce((SELECT sum(scheduled_amount_idr) FROM scheduled_installments),0),
    coalesce((SELECT sum(amount_idr) FROM originals),0),
    coalesce((SELECT sum(amount_idr) FROM reversals),0),
    coalesce((SELECT sum(net) FROM net_by_original),0),
    coalesce((SELECT sum(net) FROM net_by_original WHERE installment_id IS NOT NULL),0),
    coalesce((SELECT sum(net) FROM net_by_original WHERE installment_id IS NULL),0),
    coalesce((SELECT sum(GREATEST(si.scheduled_amount_idr -
      coalesce((SELECT sum(n.net) FROM net_by_original n WHERE n.installment_id=si.id),0),0))
      FROM scheduled_installments si),0);
$$;

REVOKE ALL ON FUNCTION public.compute_project_funding_aggregates(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_project_funding_aggregates(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.compute_project_funding_aggregates(UUID) IS
  'PM-F3 read-only funding aggregate. Returns total agreement, scheduled, net received (allocated/unallocated), and outstanding receivable. Tenant-scoped via is_org_member. No FOR UPDATE — read-only helper.';
