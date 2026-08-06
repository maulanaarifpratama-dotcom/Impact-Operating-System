-- Migration: 20260806080000_add_meal_context_and_deliverable_stage.sql
-- Description: PM-3 -- optional Objective/Stage/Deliverable context on
-- lfa_meal_items, an assign_meal_item_context RPC, an integrity trigger
-- (Layer 3, since lfa_meal_items keeps its existing broad direct-write
-- exposure unchanged this sprint, exactly like lfa_wbs_items in PM-2); and
-- an optional Stage link on programme_deliverables, extending
-- create_programme_deliverable/update_programme_deliverable_metadata to
-- validate and persist it. Deliverables keep their existing RPC-only,
-- zero-direct-write posture (Layer 1+2 already close that bypass), so the
-- Stage/WBS consistency and archived-parent rules are enforced inside the
-- RPCs, not by a new trigger -- matching the Objectives/Stages precedent's
-- own "trigger optional, not added" decision, not the WBS/MEAL one.
--
-- Also extends transition_programme_deliverable and
-- archive_programme_deliverable to write into project_activity_events
-- (in addition to their existing programme_deliverable_events insert),
-- but ONLY when the deliverable's parent project has
-- project_mode = 'project_management' -- Programme Design deliverables have
-- no Activity Log concept and must not be double-logged into one.

-- ---------------------------------------------------------------------------
-- A. lfa_meal_items optional context
-- ---------------------------------------------------------------------------
ALTER TABLE public.lfa_meal_items
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.project_objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES public.programme_deliverables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_objective_id ON public.lfa_meal_items(objective_id);
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_stage_id ON public.lfa_meal_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_deliverable_id ON public.lfa_meal_items(deliverable_id);

-- ---------------------------------------------------------------------------
-- B. MEAL context integrity trigger -- the actual enforcement boundary,
-- regardless of write path, per the header comment above.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_meal_context_link_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_project_id UUID;
  v_parent_org_id UUID;
  v_parent_archived_at TIMESTAMPTZ;
  v_is_new_or_changed BOOLEAN;
BEGIN
  IF NEW.objective_id IS NOT NULL THEN
    SELECT po.project_id, po.org_id, po.archived_at
      INTO v_parent_project_id, v_parent_org_id, v_parent_archived_at
    FROM public.project_objectives po WHERE po.id = NEW.objective_id;

    IF v_parent_project_id IS NULL THEN
      RAISE EXCEPTION 'MEAL_OBJECTIVE_NOT_FOUND: objective does not exist';
    END IF;
    IF v_parent_project_id <> NEW.lfa_project_id THEN
      RAISE EXCEPTION 'MEAL_OBJECTIVE_PROJECT_MISMATCH: objective belongs to a different project';
    END IF;
    IF v_parent_org_id <> NEW.org_id THEN
      RAISE EXCEPTION 'MEAL_OBJECTIVE_ORG_MISMATCH: objective belongs to a different organization';
    END IF;

    v_is_new_or_changed := (TG_OP = 'INSERT') OR (OLD.objective_id IS DISTINCT FROM NEW.objective_id);
    IF v_is_new_or_changed AND v_parent_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'MEAL_OBJECTIVE_ARCHIVED: cannot link to an archived objective';
    END IF;
  END IF;

  IF NEW.stage_id IS NOT NULL THEN
    SELECT ps.project_id, ps.org_id, ps.archived_at
      INTO v_parent_project_id, v_parent_org_id, v_parent_archived_at
    FROM public.project_stages ps WHERE ps.id = NEW.stage_id;

    IF v_parent_project_id IS NULL THEN
      RAISE EXCEPTION 'MEAL_STAGE_NOT_FOUND: stage does not exist';
    END IF;
    IF v_parent_project_id <> NEW.lfa_project_id THEN
      RAISE EXCEPTION 'MEAL_STAGE_PROJECT_MISMATCH: stage belongs to a different project';
    END IF;
    IF v_parent_org_id <> NEW.org_id THEN
      RAISE EXCEPTION 'MEAL_STAGE_ORG_MISMATCH: stage belongs to a different organization';
    END IF;

    v_is_new_or_changed := (TG_OP = 'INSERT') OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id);
    IF v_is_new_or_changed AND v_parent_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'MEAL_STAGE_ARCHIVED: cannot link to an archived stage';
    END IF;
  END IF;

  IF NEW.deliverable_id IS NOT NULL THEN
    SELECT pd.lfa_project_id, pd.org_id, pd.archived_at
      INTO v_parent_project_id, v_parent_org_id, v_parent_archived_at
    FROM public.programme_deliverables pd WHERE pd.id = NEW.deliverable_id;

    IF v_parent_project_id IS NULL THEN
      RAISE EXCEPTION 'MEAL_DELIVERABLE_NOT_FOUND: deliverable does not exist';
    END IF;
    IF v_parent_project_id <> NEW.lfa_project_id THEN
      RAISE EXCEPTION 'MEAL_DELIVERABLE_PROJECT_MISMATCH: deliverable belongs to a different project';
    END IF;
    IF v_parent_org_id <> NEW.org_id THEN
      RAISE EXCEPTION 'MEAL_DELIVERABLE_ORG_MISMATCH: deliverable belongs to a different organization';
    END IF;

    v_is_new_or_changed := (TG_OP = 'INSERT') OR (OLD.deliverable_id IS DISTINCT FROM NEW.deliverable_id);
    IF v_is_new_or_changed AND v_parent_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'MEAL_DELIVERABLE_ARCHIVED: cannot link to an archived deliverable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_meal_items_context_link_integrity ON public.lfa_meal_items;

CREATE TRIGGER trg_lfa_meal_items_context_link_integrity
  BEFORE INSERT OR UPDATE OF objective_id, stage_id, deliverable_id, lfa_project_id, org_id ON public.lfa_meal_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_meal_context_link_integrity();

-- ---------------------------------------------------------------------------
-- assign_meal_item_context -- UX/event-emission convenience wrapper, not the
-- integrity boundary (the trigger above is). Sets all three context fields
-- in one call; any of them may be NULL to unlink.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_meal_item_context(
  p_meal_item_id UUID,
  p_objective_id UUID,
  p_stage_id UUID,
  p_deliverable_id UUID
)
RETURNS TABLE (
  id UUID,
  objective_id UUID,
  stage_id UUID,
  deliverable_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_row public.lfa_meal_items;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'MEAL_CONTEXT_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT m.* INTO v_row
  FROM public.lfa_meal_items m
  WHERE m.id = p_meal_item_id
    AND public.is_org_member(m.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'MEAL_CONTEXT_NOT_FOUND: meal item does not exist or is not accessible';
  END IF;

  UPDATE public.lfa_meal_items m
  SET objective_id = p_objective_id, stage_id = p_stage_id, deliverable_id = p_deliverable_id
  WHERE m.id = p_meal_item_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'meal_item', v_row.id, 'meal_context_changed',
    jsonb_build_object('objective_id', p_objective_id, 'stage_id', p_stage_id, 'deliverable_id', p_deliverable_id)
  );

  RETURN QUERY SELECT v_row.id, v_row.objective_id, v_row.stage_id, v_row.deliverable_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_meal_item_context(UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_meal_item_context(UUID, UUID, UUID, UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- C. programme_deliverables optional Stage link
-- ---------------------------------------------------------------------------
ALTER TABLE public.programme_deliverables
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_stage_id ON public.programme_deliverables(stage_id);

-- create_programme_deliverable: the argument list changes (a new trailing
-- parameter), so this is a genuinely new overload as far as Postgres is
-- concerned -- DROP the old-signature function first so exactly one
-- create_programme_deliverable exists, and every existing positional call
-- (which always supplies all 11 original arguments) keeps resolving
-- correctly, with the 12th argument defaulting to NULL when omitted.
DROP FUNCTION IF EXISTS public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE);

CREATE FUNCTION public.create_programme_deliverable(
  p_lfa_project_id UUID,
  p_wbs_item_id UUID DEFAULT NULL,
  p_deliverable_type TEXT DEFAULT 'OTHER',
  p_title TEXT DEFAULT '',
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_external_owner_text TEXT DEFAULT NULL,
  p_reviewer_id UUID DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_target_date_is_estimated BOOLEAN DEFAULT false,
  p_forecast_date DATE DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_org_id UUID;
  v_project_mode VARCHAR(20);
  v_wbs_org UUID;
  v_wbs_project UUID;
  v_wbs_stage_id UUID;
  v_stage_org UUID;
  v_stage_project UUID;
  v_stage_archived_at TIMESTAMPTZ;
  v_row public.programme_deliverables;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT p.org_id, p.project_mode INTO v_org_id, v_project_mode
  FROM public.lfa_projects p
  WHERE p.id = p_lfa_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_owner_id IS NOT NULL AND p_external_owner_text IS NOT NULL AND nullif(btrim(p_external_owner_text), '') IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF p_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF p_reviewer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = p_reviewer_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_REVIEWER';
  END IF;

  IF p_wbs_item_id IS NOT NULL THEN
    SELECT w.org_id, w.lfa_project_id, w.stage_id
      INTO v_wbs_org, v_wbs_project, v_wbs_stage_id
    FROM public.lfa_wbs_items w
    WHERE w.id = p_wbs_item_id;

    IF v_wbs_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_WBS_REFERENCE';
    END IF;

    IF v_wbs_org <> v_org_id THEN
      RAISE EXCEPTION 'CROSS_ORG_DELIVERABLE_WBS';
    END IF;

    IF v_wbs_project <> p_lfa_project_id THEN
      RAISE EXCEPTION 'CROSS_PROJECT_DELIVERABLE_WBS';
    END IF;
  END IF;

  IF p_stage_id IS NOT NULL THEN
    SELECT ps.org_id, ps.project_id, ps.archived_at
      INTO v_stage_org, v_stage_project, v_stage_archived_at
    FROM public.project_stages ps
    WHERE ps.id = p_stage_id;

    IF v_stage_org IS NULL THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_NOT_FOUND';
    END IF;
    IF v_stage_org <> v_org_id THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_ORG_MISMATCH';
    END IF;
    IF v_stage_project <> p_lfa_project_id THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_PROJECT_MISMATCH';
    END IF;
    -- Every link at creation time is, by definition, new.
    IF v_stage_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_ARCHIVED';
    END IF;
  END IF;

  IF p_wbs_item_id IS NOT NULL AND v_wbs_stage_id IS NOT NULL
     AND p_stage_id IS NOT NULL AND v_wbs_stage_id <> p_stage_id THEN
    RAISE EXCEPTION 'DELIVERABLE_STAGE_WBS_MISMATCH';
  END IF;

  IF p_target_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  INSERT INTO public.programme_deliverables (
    org_id,
    lfa_project_id,
    wbs_item_id,
    stage_id,
    deliverable_type,
    title,
    description,
    lifecycle_status,
    owner_id,
    external_owner_text,
    reviewer_id,
    target_date,
    target_date_is_estimated,
    forecast_date,
    created_by
  )
  VALUES (
    v_org_id,
    p_lfa_project_id,
    p_wbs_item_id,
    p_stage_id,
    p_deliverable_type,
    p_title,
    p_description,
    'DRAFT',
    p_owner_id,
    p_external_owner_text,
    p_reviewer_id,
    p_target_date,
    coalesce(p_target_date_is_estimated, false),
    p_forecast_date,
    v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  )
  VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'CREATED',
    NULL,
    'DRAFT',
    v_actor,
    NULL
  );

  IF v_project_mode = 'project_management' THEN
    INSERT INTO public.project_activity_events (
      org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
    ) VALUES (
      v_row.org_id, v_row.lfa_project_id, v_actor, 'deliverable', v_row.id, 'deliverable_created',
      jsonb_build_object('title', v_row.title)
    );
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE, UUID) TO authenticated, service_role;

-- update_programme_deliverable_metadata: same reasoning -- DROP the
-- old-signature function, CREATE the extended one. Every existing
-- positional call in this repo supplies all 17 original arguments, so the
-- two new trailing parameters default (p_stage_id NULL, p_update_stage_id
-- false) and existing behavior is unchanged for any caller that doesn't
-- pass them.
DROP FUNCTION IF EXISTS public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN);

CREATE FUNCTION public.update_programme_deliverable_metadata(
  p_deliverable_id UUID,
  p_wbs_item_id UUID,
  p_update_wbs_item_id BOOLEAN DEFAULT false,
  p_deliverable_type TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_update_description BOOLEAN DEFAULT false,
  p_owner_id UUID DEFAULT NULL,
  p_update_owner_id BOOLEAN DEFAULT false,
  p_external_owner_text TEXT DEFAULT NULL,
  p_update_external_owner_text BOOLEAN DEFAULT false,
  p_reviewer_id UUID DEFAULT NULL,
  p_update_reviewer_id BOOLEAN DEFAULT false,
  p_target_date DATE DEFAULT NULL,
  p_target_date_is_estimated BOOLEAN DEFAULT false,
  p_forecast_date DATE DEFAULT NULL,
  p_update_forecast_date BOOLEAN DEFAULT false,
  p_stage_id UUID DEFAULT NULL,
  p_update_stage_id BOOLEAN DEFAULT false
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_project_mode VARCHAR(20);
  v_row public.programme_deliverables;
  v_current public.programme_deliverables;
  v_wbs_org UUID;
  v_wbs_project UUID;
  v_wbs_stage_id UUID;
  v_stage_org UUID;
  v_stage_project UUID;
  v_stage_archived_at TIMESTAMPTZ;
  v_next_wbs_item_id UUID;
  v_next_description TEXT;
  v_next_owner_id UUID;
  v_next_external_owner_text TEXT;
  v_next_reviewer_id UUID;
  v_next_forecast_date DATE;
  v_next_stage_id UUID;
  v_external_owner_clean TEXT;
  v_changed BOOLEAN := false;
  v_stage_link_changed BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_DELIVERABLE';
  END IF;

  v_current := v_row;
  v_next_wbs_item_id := v_row.wbs_item_id;
  v_next_description := v_row.description;
  v_next_owner_id := v_row.owner_id;
  v_next_external_owner_text := v_row.external_owner_text;
  v_next_reviewer_id := v_row.reviewer_id;
  v_next_forecast_date := v_row.forecast_date;
  v_next_stage_id := v_row.stage_id;
  v_external_owner_clean := nullif(btrim(coalesce(p_external_owner_text, '')), '');

  IF coalesce(p_update_wbs_item_id, false) THEN
    v_next_wbs_item_id := p_wbs_item_id;
  END IF;

  IF coalesce(p_update_description, false) THEN
    v_next_description := nullif(btrim(coalesce(p_description, '')), '');
  END IF;

  IF coalesce(p_update_owner_id, false) AND coalesce(p_update_external_owner_text, false) THEN
    IF p_owner_id IS NOT NULL AND v_external_owner_clean IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_OWNER_PATCH';
    ELSIF p_owner_id IS NOT NULL THEN
      v_next_owner_id := p_owner_id;
      v_next_external_owner_text := NULL;
    ELSIF v_external_owner_clean IS NOT NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := v_external_owner_clean;
    ELSE
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    END IF;
  ELSIF coalesce(p_update_owner_id, false) THEN
    IF p_owner_id IS NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    ELSE
      v_next_owner_id := p_owner_id;
      v_next_external_owner_text := NULL;
    END IF;
  ELSIF coalesce(p_update_external_owner_text, false) THEN
    IF v_external_owner_clean IS NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    ELSE
      v_next_owner_id := NULL;
      v_next_external_owner_text := v_external_owner_clean;
    END IF;
  END IF;

  IF coalesce(p_update_reviewer_id, false) THEN
    IF p_reviewer_id IS NULL
       AND v_row.lifecycle_status IN ('READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUBMITTED', 'ACCEPTED') THEN
      RAISE EXCEPTION 'REVIEWER_REQUIRED';
    END IF;
    v_next_reviewer_id := p_reviewer_id;
  END IF;

  IF coalesce(p_update_forecast_date, false) THEN
    v_next_forecast_date := p_forecast_date;
  END IF;

  IF coalesce(p_update_stage_id, false) THEN
    v_next_stage_id := p_stage_id;
  END IF;

  IF v_next_owner_id IS NOT NULL AND v_next_external_owner_text IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_OWNER_PATCH';
  END IF;

  IF v_next_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_next_owner_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF v_next_reviewer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_next_reviewer_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_REVIEWER';
  END IF;

  IF v_next_wbs_item_id IS NOT NULL THEN
    SELECT w.org_id, w.lfa_project_id, w.stage_id
      INTO v_wbs_org, v_wbs_project, v_wbs_stage_id
    FROM public.lfa_wbs_items w
    WHERE w.id = v_next_wbs_item_id;

    IF v_wbs_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_WBS_REFERENCE';
    END IF;

    IF v_wbs_org <> v_row.org_id THEN
      RAISE EXCEPTION 'CROSS_ORG_DELIVERABLE_WBS';
    END IF;

    IF v_wbs_project <> v_row.lfa_project_id THEN
      RAISE EXCEPTION 'CROSS_PROJECT_DELIVERABLE_WBS';
    END IF;
  END IF;

  v_stage_link_changed := v_current.stage_id IS DISTINCT FROM v_next_stage_id;

  IF v_next_stage_id IS NOT NULL THEN
    SELECT ps.org_id, ps.project_id, ps.archived_at
      INTO v_stage_org, v_stage_project, v_stage_archived_at
    FROM public.project_stages ps
    WHERE ps.id = v_next_stage_id;

    IF v_stage_org IS NULL THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_NOT_FOUND';
    END IF;
    IF v_stage_org <> v_row.org_id THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_ORG_MISMATCH';
    END IF;
    IF v_stage_project <> v_row.lfa_project_id THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_PROJECT_MISMATCH';
    END IF;
    IF v_stage_link_changed AND v_stage_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'DELIVERABLE_STAGE_ARCHIVED';
    END IF;
  END IF;

  IF v_next_wbs_item_id IS NOT NULL AND v_wbs_stage_id IS NOT NULL
     AND v_next_stage_id IS NOT NULL AND v_wbs_stage_id <> v_next_stage_id THEN
    RAISE EXCEPTION 'DELIVERABLE_STAGE_WBS_MISMATCH';
  END IF;

  v_changed :=
    v_next_wbs_item_id IS DISTINCT FROM v_current.wbs_item_id
    OR p_deliverable_type IS DISTINCT FROM v_current.deliverable_type
    OR p_title IS DISTINCT FROM v_current.title
    OR v_next_description IS DISTINCT FROM v_current.description
    OR v_next_owner_id IS DISTINCT FROM v_current.owner_id
    OR v_next_external_owner_text IS DISTINCT FROM v_current.external_owner_text
    OR v_next_reviewer_id IS DISTINCT FROM v_current.reviewer_id
    OR p_target_date IS DISTINCT FROM v_current.target_date
    OR coalesce(p_target_date_is_estimated, false) IS DISTINCT FROM v_current.target_date_is_estimated
    OR v_next_forecast_date IS DISTINCT FROM v_current.forecast_date
    OR v_stage_link_changed;

  IF NOT v_changed THEN
    RETURN v_current;
  END IF;

  UPDATE public.programme_deliverables d
     SET wbs_item_id = v_next_wbs_item_id,
         deliverable_type = p_deliverable_type,
         title = p_title,
         description = v_next_description,
         owner_id = v_next_owner_id,
         external_owner_text = v_next_external_owner_text,
         reviewer_id = v_next_reviewer_id,
         target_date = p_target_date,
         target_date_is_estimated = coalesce(p_target_date_is_estimated, false),
         forecast_date = v_next_forecast_date,
         stage_id = v_next_stage_id,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  )
  VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'METADATA_UPDATED',
    v_row.lifecycle_status,
    v_row.lifecycle_status,
    v_actor,
    NULL
  );

  IF v_stage_link_changed THEN
    SELECT project_mode INTO v_project_mode FROM public.lfa_projects WHERE id = v_row.lfa_project_id;
    IF v_project_mode = 'project_management' THEN
      INSERT INTO public.project_activity_events (
        org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
      ) VALUES (
        v_row.org_id, v_row.lfa_project_id, v_actor, 'deliverable', v_row.id,
        CASE WHEN v_next_stage_id IS NULL THEN 'deliverable_stage_unassigned' ELSE 'deliverable_stage_assigned' END,
        jsonb_build_object('deliverable_id', v_row.id, 'stage_id', v_next_stage_id)
      );
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN, UUID, BOOLEAN) TO authenticated, service_role;

-- transition_programme_deliverable: same signature, body extended only to
-- add the project_activity_events dual-write. CREATE OR REPLACE correctly
-- replaces the existing function in place since the argument list is
-- unchanged; its existing grants remain valid untouched.
CREATE OR REPLACE FUNCTION public.transition_programme_deliverable(
  p_deliverable_id UUID,
  p_to_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_submitted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_project_mode VARCHAR(20);
  v_row public.programme_deliverables;
  v_from_status TEXT;
  v_actor_role public.org_role;
  v_allowed BOOLEAN := false;
  v_reason TEXT := nullif(btrim(coalesce(p_reason, '')), '');
  v_new_approved_at TIMESTAMPTZ;
  v_new_submitted_at TIMESTAMPTZ;
  v_new_accepted_at TIMESTAMPTZ;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_DELIVERABLE';
  END IF;

  v_from_status := v_row.lifecycle_status;

  IF v_from_status IN ('ACCEPTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF v_from_status = 'DRAFT' AND p_to_status = 'PLANNED' THEN v_allowed := true; END IF;
  IF v_from_status = 'PLANNED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'IN_PROGRESS' AND p_to_status = 'READY_FOR_REVIEW' THEN v_allowed := true; END IF;
  IF v_from_status = 'READY_FOR_REVIEW' AND p_to_status = 'CHANGES_REQUESTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'CHANGES_REQUESTED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'READY_FOR_REVIEW' AND p_to_status = 'APPROVED' THEN v_allowed := true; END IF;
  IF v_from_status = 'APPROVED' AND p_to_status = 'SUBMITTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'SUBMITTED' AND p_to_status = 'ACCEPTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'APPROVED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'SUBMITTED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;

  IF v_from_status IN ('DRAFT','PLANNED','IN_PROGRESS','READY_FOR_REVIEW','CHANGES_REQUESTED','APPROVED','SUBMITTED')
     AND p_to_status = 'CANCELLED' THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_members m
  WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  LIMIT 1;

  IF p_to_status = 'READY_FOR_REVIEW' AND v_row.reviewer_id IS NULL THEN
    RAISE EXCEPTION 'REVIEWER_REQUIRED';
  END IF;

  IF p_to_status IN ('CHANGES_REQUESTED', 'APPROVED', 'ACCEPTED') THEN
    IF v_row.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'REVIEWER_REQUIRED';
    END IF;
    IF v_actor <> v_row.reviewer_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED_REVIEWER';
    END IF;
    IF v_actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'UNAUTHORIZED_REVIEWER';
    END IF;
    IF v_row.owner_id IS NOT NULL AND v_actor = v_row.owner_id THEN
      RAISE EXCEPTION 'SELF_REVIEW_DENIED';
    END IF;
  END IF;

  IF p_to_status IN ('IN_PROGRESS', 'CANCELLED')
     AND v_from_status IN ('APPROVED', 'SUBMITTED')
     AND v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF p_to_status = 'CANCELLED' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF p_to_status = 'CANCELLED' AND v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_new_approved_at := v_row.approved_at;
  v_new_submitted_at := v_row.submitted_at;
  v_new_accepted_at := v_row.accepted_at;

  IF p_to_status = 'APPROVED' THEN
    v_new_approved_at := now();
  ELSIF p_to_status = 'SUBMITTED' THEN
    v_new_submitted_at := coalesce(p_submitted_at, now());
  ELSIF p_to_status = 'ACCEPTED' THEN
    v_new_accepted_at := now();
  ELSIF p_to_status = 'IN_PROGRESS' AND v_from_status = 'APPROVED' THEN
    v_new_approved_at := NULL;
    v_new_submitted_at := NULL;
    v_new_accepted_at := NULL;
  ELSIF p_to_status = 'IN_PROGRESS' AND v_from_status = 'SUBMITTED' THEN
    v_new_approved_at := NULL;
    v_new_submitted_at := NULL;
    v_new_accepted_at := NULL;
  END IF;

  UPDATE public.programme_deliverables d
     SET lifecycle_status = p_to_status,
         exception_reason = v_reason,
         approved_at = v_new_approved_at,
         submitted_at = v_new_submitted_at,
         accepted_at = v_new_accepted_at,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  ) VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'LIFECYCLE_CHANGED',
    v_from_status,
    p_to_status,
    v_actor,
    v_reason
  );

  SELECT project_mode INTO v_project_mode FROM public.lfa_projects WHERE id = v_row.lfa_project_id;
  IF v_project_mode = 'project_management' THEN
    INSERT INTO public.project_activity_events (
      org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
    ) VALUES (
      v_row.org_id, v_row.lfa_project_id, v_actor, 'deliverable', v_row.id, 'deliverable_status_changed',
      jsonb_build_object('from_status', v_from_status, 'to_status', p_to_status)
    );
  END IF;

  RETURN v_row;
END;
$$;

-- archive_programme_deliverable: same signature, body extended only to add
-- the project_activity_events dual-write.
CREATE OR REPLACE FUNCTION public.archive_programme_deliverable(
  p_deliverable_id UUID,
  p_archive_reason TEXT
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_project_mode VARCHAR(20);
  v_actor_role public.org_role;
  v_reason TEXT := nullif(btrim(coalesce(p_archive_reason, '')), '');
  v_row public.programme_deliverables;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_ARCHIVED';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_members m
  WHERE m.organization_id = v_row.org_id
    AND m.user_id = v_actor
  LIMIT 1;

  IF v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.programme_deliverables d
     SET archived_at = now(),
         archived_by = v_actor,
         archive_reason = v_reason,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  ) VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'ARCHIVED',
    v_row.lifecycle_status,
    v_row.lifecycle_status,
    v_actor,
    v_reason
  );

  SELECT project_mode INTO v_project_mode FROM public.lfa_projects WHERE id = v_row.lfa_project_id;
  IF v_project_mode = 'project_management' THEN
    INSERT INTO public.project_activity_events (
      org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
    ) VALUES (
      v_row.org_id, v_row.lfa_project_id, v_actor, 'deliverable', v_row.id, 'deliverable_archived',
      jsonb_build_object('title', v_row.title)
    );
  END IF;

  RETURN v_row;
END;
$$;
