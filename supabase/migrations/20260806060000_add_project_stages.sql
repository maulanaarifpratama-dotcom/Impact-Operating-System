-- Migration: 20260806060000_add_project_stages.sql
-- Description: PM-1C -- project_stages, its RLS/privilege posture, and its
-- five SECURITY DEFINER RPCs (create/update/reorder/archive/restore).
-- Mutation is RPC-only, exactly like project_objectives (PM-1B): INSERT/
-- UPDATE/DELETE are revoked from authenticated and anon, org_id/project_id/
-- actor_id are always server-derived, and cross-org lookups for update/
-- archive/restore collapse "wrong id" and "someone else's org" into the same
-- STAGE_NOT_FOUND.
--
-- The Stage-to-Objective link (primary_objective_id) follows the
-- new-or-changed-link pattern: existence, project-match, and org-match are
-- validated whenever the link is non-null, regardless of whether it just
-- changed; the archived-parent check applies ONLY when the link is being
-- newly set or changed to a different Objective -- an existing link survives
-- unaffected if that Objective is archived afterward. This is enforced
-- inside the RPCs (Layer 2), not by a table trigger, matching the
-- project_mode-independent posture already used for project_objectives:
-- Stages have zero direct-write exposure, so Layer 1+2 alone already close
-- the bypass a trigger would otherwise exist to guard against.
--
-- Every SELECT/UPDATE below is explicitly aliased, even where it might look
-- unnecessary, to avoid the exact "column reference is ambiguous" class of
-- bug PM-1B's RPCs hit: RETURNS TABLE output-column names become PL/pgSQL
-- variables visible for the whole function body, and a bare reference to a
-- same-named table column is ambiguous against them.

CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  primary_objective_id UUID REFERENCES public.project_objectives(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_stages_org_id
  ON public.project_stages(org_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id
  ON public.project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_project_sort
  ON public.project_stages(project_id, sort_order);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_stages_member_select ON public.project_stages;
CREATE POLICY project_stages_member_select ON public.project_stages
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

GRANT SELECT ON TABLE public.project_stages TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_stages FROM authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. create_project_stage
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.create_project_stage(UUID, TEXT, TEXT, UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_stage(UUID, TEXT, TEXT, UUID, DATE, DATE) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. update_project_stage_metadata
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.update_project_stage_metadata(UUID, TEXT, TEXT, UUID, TEXT, DATE, DATE, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_project_stage_metadata(UUID, TEXT, TEXT, UUID, TEXT, DATE, DATE, DATE, DATE) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. reorder_project_stages
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.reorder_project_stages(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_project_stages(UUID, UUID[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. archive_project_stage
-- ---------------------------------------------------------------------------
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
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'STAGE_ARCHIVE_FORBIDDEN: only an organization owner or admin may archive a stage';
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

REVOKE ALL ON FUNCTION public.archive_project_stage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_project_stage(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. restore_project_stage
-- ---------------------------------------------------------------------------
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
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'STAGE_ARCHIVE_FORBIDDEN: only an organization owner or admin may restore a stage';
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

REVOKE ALL ON FUNCTION public.restore_project_stage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_project_stage(UUID) TO authenticated, service_role;
