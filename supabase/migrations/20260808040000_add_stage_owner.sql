-- Migration: 20260808040000_add_stage_owner.sql
-- Description: Add stage_owner column to project_stages and update both
--   create/update RPCs to accept and persist the stage owner (org member).
--   No new database roles — stage_owner is a UUID reference to auth.users
--   via the organization_members table.

ALTER TABLE public.project_stages
  ADD COLUMN IF NOT EXISTS stage_owner UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================================================
-- create_project_stage — add p_stage_owner parameter
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.create_project_stage(
  p_project_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_primary_objective_id UUID,
  p_planned_start_date DATE,
  p_planned_end_date DATE,
  p_stage_owner UUID DEFAULT NULL
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

  IF p_stage_owner IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = v_org_id AND user_id = p_stage_owner
    ) THEN
      RAISE EXCEPTION 'STAGE_OWNER_NOT_MEMBER: stage owner must be an active member of this organisation';
    END IF;
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
    sort_order, planned_start_date, planned_end_date, created_by, stage_owner
  ) VALUES (
    v_org_id, p_project_id, p_primary_objective_id, btrim(p_title), p_description, 'not_started',
    v_sort_order, p_planned_start_date, p_planned_end_date, v_actor, p_stage_owner
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

-- ==========================================================================
-- update_project_stage_metadata — add p_stage_owner parameter
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.update_project_stage_metadata(
  p_stage_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_primary_objective_id UUID,
  p_status TEXT,
  p_planned_start_date DATE,
  p_planned_end_date DATE,
  p_actual_start_date DATE,
  p_actual_end_date DATE,
  p_stage_owner UUID DEFAULT NULL
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

  IF p_stage_owner IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = v_before.org_id AND user_id = p_stage_owner
    ) THEN
      RAISE EXCEPTION 'STAGE_OWNER_NOT_MEMBER: stage owner must be an active member of this organisation';
    END IF;
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
      stage_owner = p_stage_owner,
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
