-- Migration: 20260806050000_add_project_objectives.sql
-- Description: PM-1B -- project_objectives, its RLS/privilege posture, and its
-- five SECURITY DEFINER RPCs (create/update/reorder/archive/restore). All
-- mutation is RPC-only: INSERT/UPDATE/DELETE are revoked from authenticated
-- and anon at the grant layer, and no policy exists for any write command
-- because there is nothing left for one to gate. org_id/project_id/actor_id
-- are always derived server-side from the target project or the existing
-- objective row -- never a client parameter. Cross-org lookups for
-- update/archive/restore intentionally collapse "wrong id" and "someone
-- else's org" into the same OBJECTIVE_NOT_FOUND, so a caller can never
-- distinguish a bad guess from a real id belonging to another tenant. Role
-- checks (owner/admin for archive/restore) are explicitly NULL-safe --
-- IS NULL OR NOT IN (...) -- rather than the NOT IN (...) alone pattern this
-- codebase's own archive_programme_deliverable relies on, which only stays
-- safe there because RLS hides the row first; project_objectives' mutating
-- RPCs have no such SELECT-policy backstop of their own to lean on.

CREATE TABLE IF NOT EXISTS public.project_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  success_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_objectives_org_id
  ON public.project_objectives(org_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_project_id
  ON public.project_objectives(project_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_project_sort
  ON public.project_objectives(project_id, sort_order);

ALTER TABLE public.project_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_objectives_member_select ON public.project_objectives;
CREATE POLICY project_objectives_member_select ON public.project_objectives
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

GRANT SELECT ON TABLE public.project_objectives TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_objectives FROM authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. create_project_objective
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.create_project_objective(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_objective(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. update_project_objective_metadata
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.update_project_objective_metadata(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_project_objective_metadata(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. reorder_project_objectives
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.reorder_project_objectives(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_project_objectives(UUID, UUID[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. archive_project_objective
-- ---------------------------------------------------------------------------
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
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'OBJECTIVE_ARCHIVE_FORBIDDEN: only an organization owner or admin may archive an objective';
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

REVOKE ALL ON FUNCTION public.archive_project_objective(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_project_objective(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. restore_project_objective
-- ---------------------------------------------------------------------------
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
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'OBJECTIVE_ARCHIVE_FORBIDDEN: only an organization owner or admin may restore an objective';
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

REVOKE ALL ON FUNCTION public.restore_project_objective(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_project_objective(UUID) TO authenticated, service_role;
