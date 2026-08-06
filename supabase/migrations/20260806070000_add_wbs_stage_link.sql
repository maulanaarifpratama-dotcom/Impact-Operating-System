-- Migration: 20260806070000_add_wbs_stage_link.sql
-- Description: PM-2 -- nullable lfa_wbs_items.stage_id linking a WBS item to
-- a project_stages row, an assign_wbs_item_to_stage RPC for consistent UX and
-- event emission, and a BEFORE INSERT OR UPDATE integrity trigger that is the
-- actual enforcement boundary.
--
-- lfa_wbs_items keeps its existing, broad direct-write exposure this sprint
-- (per the standing instruction not to change WBS's existing privileges/RLS)
-- -- authenticated can already INSERT/UPDATE/DELETE this table directly, so
-- the RPC below cannot be the integrity boundary the way it is for
-- project_objectives/project_stages, which have no such exposure. The
-- trigger is therefore mandatory, not optional: it fires for every write
-- path (direct client write, this RPC, or any future one) equally, which is
-- exactly why it -- not the RPC -- is what actually closes the bypass.
--
-- The Stage link follows the same new-or-changed-link pattern already used
-- for project_stages.primary_objective_id: existence/project-match/org-match
-- are validated whenever stage_id is non-null, but the archived-parent
-- rejection fires only when the link is being newly set or changed to a
-- different Stage. An existing link survives untouched if that Stage is
-- archived afterward, and a plain metadata update that never touches
-- stage_id doesn't even fire the trigger (BEFORE UPDATE OF stage_id, ...
-- only fires when one of the watched columns is in the UPDATE's target
-- list) -- and even if it did, IS DISTINCT FROM correctly finds no change.

ALTER TABLE public.lfa_wbs_items
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_stage_id
  ON public.lfa_wbs_items(stage_id);

CREATE OR REPLACE FUNCTION public.enforce_wbs_stage_link_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage_project_id UUID;
  v_stage_org_id UUID;
  v_stage_archived_at TIMESTAMPTZ;
  v_is_new_or_changed_link BOOLEAN;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT ps.project_id, ps.org_id, ps.archived_at
      INTO v_stage_project_id, v_stage_org_id, v_stage_archived_at
    FROM public.project_stages ps
    WHERE ps.id = NEW.stage_id;

    IF v_stage_project_id IS NULL THEN
      RAISE EXCEPTION 'WBS_STAGE_NOT_FOUND: stage does not exist';
    END IF;
    IF v_stage_project_id <> NEW.lfa_project_id THEN
      RAISE EXCEPTION 'WBS_STAGE_PROJECT_MISMATCH: stage belongs to a different project';
    END IF;
    IF v_stage_org_id <> NEW.org_id THEN
      RAISE EXCEPTION 'WBS_STAGE_ORG_MISMATCH: stage belongs to a different organization';
    END IF;

    v_is_new_or_changed_link := (TG_OP = 'INSERT') OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id);
    IF v_is_new_or_changed_link AND v_stage_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'WBS_STAGE_ARCHIVED: cannot link to an archived stage';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_wbs_items_stage_link_integrity ON public.lfa_wbs_items;

CREATE TRIGGER trg_lfa_wbs_items_stage_link_integrity
  BEFORE INSERT OR UPDATE OF stage_id, lfa_project_id, org_id ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_wbs_stage_link_integrity();

-- ---------------------------------------------------------------------------
-- assign_wbs_item_to_stage -- UX/event-emission convenience wrapper. Not the
-- integrity boundary (the trigger above is, regardless of write path); this
-- RPC exists so the app has one consistent, event-emitting way to assign,
-- move, or unassign (p_stage_id = NULL) a WBS item's Stage.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_wbs_item_to_stage(
  p_wbs_item_id UUID,
  p_stage_id UUID
)
RETURNS TABLE (
  id UUID,
  stage_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_row public.lfa_wbs_items;
  v_event_type TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'WBS_STAGE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT w.* INTO v_row
  FROM public.lfa_wbs_items w
  WHERE w.id = p_wbs_item_id
    AND public.is_org_member(w.org_id, v_actor)
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'WBS_STAGE_NOT_FOUND: wbs item does not exist or is not accessible';
  END IF;

  UPDATE public.lfa_wbs_items w
  SET stage_id = p_stage_id
  WHERE w.id = p_wbs_item_id
  RETURNING * INTO v_row;

  v_event_type := CASE WHEN p_stage_id IS NULL THEN 'wbs_stage_unassigned' ELSE 'wbs_stage_assigned' END;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor, 'wbs_item', v_row.id, v_event_type,
    jsonb_build_object('wbs_item_id', v_row.id, 'stage_id', p_stage_id)
  );

  RETURN QUERY SELECT v_row.id, v_row.stage_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_wbs_item_to_stage(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_wbs_item_to_stage(UUID, UUID) TO authenticated, service_role;
