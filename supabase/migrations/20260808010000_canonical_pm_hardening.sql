-- Migration: 20260808010000_canonical_pm_hardening.sql
-- Description: Canonical PM hardening — Owner-only Project Structure Authority.
--   1. Stage RPCs: owner-only for create/update/reorder/archive/restore.
--   2. Objective RPCs: owner-only for create/update/reorder/archive/restore.
--   3. Budget RLS: split SELECT (any member) from INSERT/UPDATE/DELETE (owner only).
--   4. Status/progress guardrails: draft/ready/not_started → progress_percent = 0.

-- ==========================================================================
-- 1. Stage RPC hardening — owner-only for all mutation
-- ==========================================================================

-- 1a. create_project_stage — add owner role check
CREATE OR REPLACE FUNCTION public.create_project_stage(
  p_project_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_primary_objective_id UUID,
  p_planned_start_date DATE,
  p_planned_end_date DATE
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  org_id UUID,
  primary_objective_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  sort_order INTEGER,
  planned_start_date DATE,
  planned_end_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_project_mode VARCHAR(20);
  v_obj_project_id UUID;
  v_obj_org_id UUID;
  v_obj_archived_at TIMESTAMPTZ;
  v_sort_order INTEGER;
  v_row public.project_stages;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT lp.org_id, lp.project_mode INTO v_org_id, v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = p_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'STAGE_PROJECT_NOT_FOUND: project does not exist';
  END IF;

  IF NOT public.is_org_member(v_org_id, v_actor) THEN
    RAISE EXCEPTION 'STAGE_MEMBERSHIP_REQUIRED: caller is not a member of this project''s organization';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'STAGE_CREATE_FORBIDDEN: only organisation owner may create stages';
  END IF;

  IF v_project_mode <> 'project_management' THEN
    RAISE EXCEPTION 'STAGE_PROJECT_MODE_INVALID: stages require a project_management project';
  END IF;

  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'STAGE_TITLE_REQUIRED: title cannot be blank';
  END IF;

  IF p_primary_objective_id IS NOT NULL THEN
    SELECT po.project_id, po.org_id, po.archived_at
      INTO v_obj_project_id, v_obj_org_id, v_obj_archived_at
    FROM public.project_objectives po
    WHERE po.id = p_primary_objective_id;

    IF v_obj_project_id IS NULL THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_NOT_FOUND: primary objective does not exist';
    END IF;
    IF v_obj_project_id <> p_project_id THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_PROJECT_MISMATCH: primary objective belongs to a different project';
    END IF;
    IF v_obj_org_id <> v_org_id THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_ORG_MISMATCH: primary objective belongs to a different organization';
    END IF;
    IF v_obj_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_ARCHIVED: cannot link a new stage to an archived objective';
    END IF;
  END IF;

  SELECT coalesce(MAX(ps.sort_order) + 1, 0) INTO v_sort_order
  FROM public.project_stages ps
  WHERE ps.project_id = p_project_id AND ps.archived_at IS NULL;

  INSERT INTO public.project_stages (
    org_id, project_id, primary_objective_id, title, description, status,
    sort_order, planned_start_date, planned_end_date, created_by
  ) VALUES (
    v_org_id, p_project_id, p_primary_objective_id, btrim(p_title), p_description, 'not_started',
    v_sort_order, p_planned_start_date, p_planned_end_date, v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'stage', v_row.id, 'stage_created',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY
  SELECT v_row.id, v_row.project_id, v_row.org_id, v_row.primary_objective_id, v_row.title,
         v_row.description, v_row.status, v_row.sort_order, v_row.planned_start_date,
         v_row.planned_end_date, v_row.created_at;
END;
$$;

-- 1b. update_project_stage_metadata — add owner role check
CREATE OR REPLACE FUNCTION public.update_project_stage_metadata(
  p_stage_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_primary_objective_id UUID,
  p_status TEXT,
  p_planned_start_date DATE,
  p_planned_end_date DATE,
  p_actual_start_date DATE,
  p_actual_end_date DATE
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  org_id UUID,
  primary_objective_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  sort_order INTEGER,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_before public.project_stages;
  v_row public.project_stages;
  v_obj_project_id UUID;
  v_obj_org_id UUID;
  v_obj_archived_at TIMESTAMPTZ;
  v_is_new_or_changed_link BOOLEAN;
  v_event_type TEXT;
  v_metadata JSONB;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT ps.* INTO v_before
  FROM public.project_stages ps
  WHERE ps.id = p_stage_id
    AND public.is_org_member(ps.org_id, v_actor)
  FOR UPDATE;

  IF v_before.id IS NULL THEN
    RAISE EXCEPTION 'STAGE_NOT_FOUND: stage does not exist or is not accessible';
  END IF;

  IF public.get_org_role(v_before.org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'STAGE_UPDATE_FORBIDDEN: only organisation owner may edit stages';
  END IF;

  IF v_before.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE_ARCHIVED: an archived stage cannot be edited; restore it first';
  END IF;

  IF p_status IS NOT NULL AND p_status = 'archived' THEN
    RAISE EXCEPTION 'STAGE_STATUS_INVALID: use archive_project_stage to archive';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'STAGE_STATUS_INVALID: status must be not_started, in_progress, or completed';
  END IF;

  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'STAGE_TITLE_REQUIRED: title cannot be blank';
  END IF;

  v_is_new_or_changed_link := v_before.primary_objective_id IS DISTINCT FROM p_primary_objective_id;

  IF p_primary_objective_id IS NOT NULL THEN
    SELECT po.project_id, po.org_id, po.archived_at
      INTO v_obj_project_id, v_obj_org_id, v_obj_archived_at
    FROM public.project_objectives po
    WHERE po.id = p_primary_objective_id;

    IF v_obj_project_id IS NULL THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_NOT_FOUND: primary objective does not exist';
    END IF;
    IF v_obj_project_id <> v_before.project_id THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_PROJECT_MISMATCH: primary objective belongs to a different project';
    END IF;
    IF v_obj_org_id <> v_before.org_id THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_ORG_MISMATCH: primary objective belongs to a different organization';
    END IF;
    IF v_is_new_or_changed_link AND v_obj_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'STAGE_OBJECTIVE_ARCHIVED: cannot link to an archived objective';
    END IF;
  END IF;

  UPDATE public.project_stages ps
  SET title = btrim(p_title),
      description = p_description,
      primary_objective_id = p_primary_objective_id,
      status = coalesce(p_status, ps.status),
      planned_start_date = p_planned_start_date,
      planned_end_date = p_planned_end_date,
      actual_start_date = p_actual_start_date,
      actual_end_date = p_actual_end_date,
      updated_at = now()
  WHERE ps.id = p_stage_id
  RETURNING * INTO v_row;

  IF v_before.status IS DISTINCT FROM v_row.status
     AND v_before.title = v_row.title
     AND v_before.description IS NOT DISTINCT FROM v_row.description
     AND v_before.primary_objective_id IS NOT DISTINCT FROM v_row.primary_objective_id
     AND v_before.planned_start_date IS NOT DISTINCT FROM v_row.planned_start_date
     AND v_before.planned_end_date IS NOT DISTINCT FROM v_row.planned_end_date
     AND v_before.actual_start_date IS NOT DISTINCT FROM v_row.actual_start_date
     AND v_before.actual_end_date IS NOT DISTINCT FROM v_row.actual_end_date
  THEN
    v_event_type := 'stage_status_changed';
    v_metadata := jsonb_build_object('from_status', v_before.status, 'to_status', v_row.status);
  ELSE
    v_event_type := 'stage_updated';
    v_metadata := '{}'::jsonb;
  END IF;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'stage', v_row.id, v_event_type, v_metadata
  );

  RETURN QUERY
  SELECT v_row.id, v_row.project_id, v_row.org_id, v_row.primary_objective_id, v_row.title,
         v_row.description, v_row.status, v_row.sort_order, v_row.planned_start_date,
         v_row.planned_end_date, v_row.actual_start_date, v_row.actual_end_date, v_row.updated_at;
END;
$$;

-- 1c. reorder_project_stages — add owner role check
CREATE OR REPLACE FUNCTION public.reorder_project_stages(
  p_project_id UUID,
  p_ordered_ids UUID[]
)
RETURNS TABLE (
  item_count INTEGER,
  reordered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_current_ids UUID[];
  v_current_count INTEGER;
  v_input_count INTEGER;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT org_id INTO v_org_id FROM public.lfa_projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'STAGE_PROJECT_NOT_FOUND: project does not exist';
  END IF;

  IF NOT public.is_org_member(v_org_id, v_actor) THEN
    RAISE EXCEPTION 'STAGE_MEMBERSHIP_REQUIRED: caller is not a member of this project''s organization';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'STAGE_REORDER_FORBIDDEN: only organisation owner may reorder stages';
  END IF;

  PERFORM 1 FROM public.project_stages
  WHERE project_id = p_project_id AND archived_at IS NULL
  FOR UPDATE;

  SELECT array_agg(id ORDER BY sort_order, id) INTO v_current_ids
  FROM public.project_stages
  WHERE project_id = p_project_id AND archived_at IS NULL;

  v_current_count := coalesce(array_length(v_current_ids, 1), 0);
  v_input_count := coalesce(array_length(p_ordered_ids, 1), 0);

  IF v_current_count <> v_input_count
     OR EXISTS (
       SELECT 1 FROM unnest(v_current_ids) x
       WHERE x NOT IN (SELECT unnest(p_ordered_ids))
     )
  THEN
    RAISE EXCEPTION 'STAGE_REORDER_SET_MISMATCH: ordered list must contain exactly the project''s current stages';
  END IF;

  IF v_current_ids = p_ordered_ids THEN
    RETURN QUERY SELECT v_current_count, false;
    RETURN;
  END IF;

  UPDATE public.project_stages ps
  SET sort_order = t.idx - 1, updated_at = now()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS t(id, idx)
  WHERE ps.id = t.id;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_org_id, p_project_id, v_actor, 'stage', p_project_id, 'stage_reordered',
    jsonb_build_object('item_count', v_input_count)
  );

  RETURN QUERY SELECT v_input_count, true;
END;
$$;

-- 1d. archive_project_stage — tighten from owner/admin to owner only
CREATE OR REPLACE FUNCTION public.archive_project_stage(
  p_stage_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  archived_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
  v_row public.project_stages;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT ps.* INTO v_row
  FROM public.project_stages ps
  WHERE ps.id = p_stage_id
    AND public.is_org_member(ps.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'STAGE_NOT_FOUND: stage does not exist or is not accessible';
  END IF;

  v_role := public.get_org_role(v_row.org_id, v_actor);
  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'STAGE_ARCHIVE_FORBIDDEN: only organisation owner may archive a stage';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE_ALREADY_ARCHIVED: stage is already archived';
  END IF;

  UPDATE public.project_stages ps
  SET status = 'archived', archived_at = now(), archived_by = v_actor, updated_at = now()
  WHERE ps.id = p_stage_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'stage', v_row.id, 'stage_archived',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY SELECT v_row.id, v_row.status, v_row.archived_at;
END;
$$;

-- 1e. restore_project_stage — tighten from owner/admin to owner only
CREATE OR REPLACE FUNCTION public.restore_project_stage(
  p_stage_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
  v_row public.project_stages;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT ps.* INTO v_row
  FROM public.project_stages ps
  WHERE ps.id = p_stage_id
    AND public.is_org_member(ps.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'STAGE_NOT_FOUND: stage does not exist or is not accessible';
  END IF;

  v_role := public.get_org_role(v_row.org_id, v_actor);
  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'STAGE_ARCHIVE_FORBIDDEN: only organisation owner may restore a stage';
  END IF;

  IF v_row.archived_at IS NULL THEN
    RAISE EXCEPTION 'STAGE_NOT_ARCHIVED: stage is not archived';
  END IF;

  UPDATE public.project_stages ps
  SET status = 'not_started', archived_at = NULL, archived_by = NULL, updated_at = now()
  WHERE ps.id = p_stage_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'stage', v_row.id, 'stage_restored',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY SELECT v_row.id, v_row.status;
END;
$$;

-- ==========================================================================
-- 2. Objective RPC hardening — owner-only for all mutation
-- ==========================================================================

-- 2a. create_project_objective — add owner role check
CREATE OR REPLACE FUNCTION public.create_project_objective(
  p_project_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_success_criteria TEXT
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  org_id UUID,
  title TEXT,
  description TEXT,
  success_criteria TEXT,
  status TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_project_mode VARCHAR(20);
  v_sort_order INTEGER;
  v_row public.project_objectives;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT lp.org_id, lp.project_mode INTO v_org_id, v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = p_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_PROJECT_NOT_FOUND: project does not exist';
  END IF;

  IF NOT public.is_org_member(v_org_id, v_actor) THEN
    RAISE EXCEPTION 'OBJECTIVE_MEMBERSHIP_REQUIRED: caller is not a member of this project''s organization';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'OBJECTIVE_CREATE_FORBIDDEN: only organisation owner may create objectives';
  END IF;

  IF v_project_mode <> 'project_management' THEN
    RAISE EXCEPTION 'OBJECTIVE_PROJECT_MODE_INVALID: objectives require a project_management project';
  END IF;

  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'OBJECTIVE_TITLE_REQUIRED: title cannot be blank';
  END IF;

  SELECT coalesce(MAX(po.sort_order) + 1, 0) INTO v_sort_order
  FROM public.project_objectives po
  WHERE po.project_id = p_project_id AND po.archived_at IS NULL;

  INSERT INTO public.project_objectives (
    org_id, project_id, title, description, success_criteria, status, sort_order, created_by
  ) VALUES (
    v_org_id, p_project_id, btrim(p_title), p_description, p_success_criteria, 'draft', v_sort_order, v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'objective', v_row.id, 'objective_created',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY
  SELECT v_row.id, v_row.project_id, v_row.org_id, v_row.title, v_row.description,
         v_row.success_criteria, v_row.status, v_row.sort_order, v_row.created_at;
END;
$$;

-- 2b. update_project_objective_metadata — add owner role check
CREATE OR REPLACE FUNCTION public.update_project_objective_metadata(
  p_objective_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_success_criteria TEXT,
  p_status TEXT
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  org_id UUID,
  title TEXT,
  description TEXT,
  success_criteria TEXT,
  status TEXT,
  sort_order INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_row public.project_objectives;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT o.* INTO v_row
  FROM public.project_objectives o
  WHERE o.id = p_objective_id
    AND public.is_org_member(o.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_NOT_FOUND: objective does not exist or is not accessible';
  END IF;

  IF public.get_org_role(v_row.org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'OBJECTIVE_UPDATE_FORBIDDEN: only organisation owner may edit objectives';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_ARCHIVED: an archived objective cannot be edited; restore it first';
  END IF;

  IF p_status IS NOT NULL AND p_status = 'archived' THEN
    RAISE EXCEPTION 'OBJECTIVE_STATUS_INVALID: use archive_project_objective to archive';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('draft', 'active', 'completed') THEN
    RAISE EXCEPTION 'OBJECTIVE_STATUS_INVALID: status must be draft, active, or completed';
  END IF;

  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'OBJECTIVE_TITLE_REQUIRED: title cannot be blank';
  END IF;

  UPDATE public.project_objectives po
  SET title = btrim(p_title),
      description = p_description,
      success_criteria = p_success_criteria,
      status = coalesce(p_status, po.status),
      updated_at = now()
  WHERE po.id = p_objective_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'objective', v_row.id, 'objective_updated', '{}'::jsonb
  );

  RETURN QUERY
  SELECT v_row.id, v_row.project_id, v_row.org_id, v_row.title, v_row.description,
         v_row.success_criteria, v_row.status, v_row.sort_order, v_row.updated_at;
END;
$$;

-- 2c. reorder_project_objectives — add owner role check
CREATE OR REPLACE FUNCTION public.reorder_project_objectives(
  p_project_id UUID,
  p_ordered_ids UUID[]
)
RETURNS TABLE (
  item_count INTEGER,
  reordered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_current_ids UUID[];
  v_current_count INTEGER;
  v_input_count INTEGER;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT org_id INTO v_org_id FROM public.lfa_projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_PROJECT_NOT_FOUND: project does not exist';
  END IF;

  IF NOT public.is_org_member(v_org_id, v_actor) THEN
    RAISE EXCEPTION 'OBJECTIVE_MEMBERSHIP_REQUIRED: caller is not a member of this project''s organization';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'OBJECTIVE_REORDER_FORBIDDEN: only organisation owner may reorder objectives';
  END IF;

  PERFORM 1 FROM public.project_objectives
  WHERE project_id = p_project_id AND archived_at IS NULL
  FOR UPDATE;

  SELECT array_agg(id ORDER BY sort_order, id) INTO v_current_ids
  FROM public.project_objectives
  WHERE project_id = p_project_id AND archived_at IS NULL;

  v_current_count := coalesce(array_length(v_current_ids, 1), 0);
  v_input_count := coalesce(array_length(p_ordered_ids, 1), 0);

  IF v_current_count <> v_input_count
     OR EXISTS (
       SELECT 1 FROM unnest(v_current_ids) x
       WHERE x NOT IN (SELECT unnest(p_ordered_ids))
     )
  THEN
    RAISE EXCEPTION 'OBJECTIVE_REORDER_SET_MISMATCH: ordered list must contain exactly the project''s current objectives';
  END IF;

  IF v_current_ids = p_ordered_ids THEN
    RETURN QUERY SELECT v_current_count, false;
    RETURN;
  END IF;

  UPDATE public.project_objectives po
  SET sort_order = t.idx - 1, updated_at = now()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS t(id, idx)
  WHERE po.id = t.id;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_org_id, p_project_id, v_actor, 'objective', p_project_id, 'objective_reordered',
    jsonb_build_object('item_count', v_input_count)
  );

  RETURN QUERY SELECT v_input_count, true;
END;
$$;

-- 2d. archive_project_objective — tighten from owner/admin to owner only
CREATE OR REPLACE FUNCTION public.archive_project_objective(
  p_objective_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  archived_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
  v_row public.project_objectives;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT o.* INTO v_row
  FROM public.project_objectives o
  WHERE o.id = p_objective_id
    AND public.is_org_member(o.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_NOT_FOUND: objective does not exist or is not accessible';
  END IF;

  v_role := public.get_org_role(v_row.org_id, v_actor);
  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'OBJECTIVE_ARCHIVE_FORBIDDEN: only organisation owner may archive an objective';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_ALREADY_ARCHIVED: objective is already archived';
  END IF;

  UPDATE public.project_objectives po
  SET status = 'archived', archived_at = now(), archived_by = v_actor, updated_at = now()
  WHERE po.id = p_objective_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'objective', v_row.id, 'objective_archived',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY SELECT v_row.id, v_row.status, v_row.archived_at;
END;
$$;

-- 2e. restore_project_objective — tighten from owner/admin to owner only
CREATE OR REPLACE FUNCTION public.restore_project_objective(
  p_objective_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
  v_row public.project_objectives;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT o.* INTO v_row
  FROM public.project_objectives o
  WHERE o.id = p_objective_id
    AND public.is_org_member(o.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_NOT_FOUND: objective does not exist or is not accessible';
  END IF;

  v_role := public.get_org_role(v_row.org_id, v_actor);
  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'OBJECTIVE_ARCHIVE_FORBIDDEN: only organisation owner may restore an objective';
  END IF;

  IF v_row.archived_at IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_NOT_ARCHIVED: objective is not archived';
  END IF;

  UPDATE public.project_objectives po
  SET status = 'draft', archived_at = NULL, archived_by = NULL, updated_at = now()
  WHERE po.id = p_objective_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.project_id, v_actor, 'objective', v_row.id, 'objective_restored',
    jsonb_build_object('title', v_row.title)
  );

  RETURN QUERY SELECT v_row.id, v_row.status;
END;
$$;

-- ==========================================================================
-- 3. Budget RLS hardening — owner-only INSERT/UPDATE/DELETE
-- ==========================================================================

DROP POLICY IF EXISTS "org_isolation_lfa_budget_items" ON public.lfa_budget_items;

CREATE POLICY "lfa_budget_items_select" ON public.lfa_budget_items
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "lfa_budget_items_insert" ON public.lfa_budget_items
  FOR INSERT
  WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND public.get_org_role(org_id, auth.uid()) = 'owner'
  );

CREATE POLICY "lfa_budget_items_update" ON public.lfa_budget_items
  FOR UPDATE
  USING (
    public.is_org_member(org_id, auth.uid())
    AND public.get_org_role(org_id, auth.uid()) = 'owner'
  );

CREATE POLICY "lfa_budget_items_delete" ON public.lfa_budget_items
  FOR DELETE
  USING (
    public.is_org_member(org_id, auth.uid())
    AND public.get_org_role(org_id, auth.uid()) = 'owner'
  );

-- ==========================================================================
-- 4. Status / progress guardrails
-- ==========================================================================

UPDATE public.lfa_wbs_items
SET progress_percent = 0
WHERE status IN ('draft', 'not_started', 'ready')
  AND progress_percent != 0;

ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_prestart_progress;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_prestart_progress
  CHECK (status NOT IN ('draft', 'not_started', 'ready') OR progress_percent = 0);
