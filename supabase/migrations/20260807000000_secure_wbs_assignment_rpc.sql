-- Migration: 20260807000000_secure_wbs_assignment_rpc.sql
-- Description: Hardened WBS assignment RPC + trigger. Closes
--   NEEDS_WBS_ASSIGNMENT_AUTHORIZATION_HARDENING.
--
-- Problem: lfa_wbs_items has broad same-org UPDATE access — any authenticated
--   org member can write owner_id/reviewer_id directly. Frontend isOwnerOrAdmin
--   gating is UI hiding, not security.
--
-- Solution:
--   1. assign_wbs_item_people RPC — canonical mutation path with organisation
--      ownership resolution, cross-org target validation, and event emission.
--   2. trg_lfa_wbs_items_assignment_guard trigger — BEFORE UPDATE OF owner_id,
--      reviewer_id that rejects changes unless the caller holds owner/admin
--      in the WBS item's organisation. This is the actual enforcement boundary
--      (matching the stage_link pattern: trigger always fires regardless of
--       write path).
--
-- Ordinary UPDATEs that never touch owner_id/reviewer_id continue unchanged
-- (the trigger fires only on UPDATE OF owner_id, reviewer_id).
--
-- Programme Design autosave (triggerAutosave) already omits owner_id/reviewer_id
-- from its payload, so this trigger has zero impact on PD editing.

-- ==========================================================================
-- 1. assign_wbs_item_people RPC
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.assign_wbs_item_people(
  p_wbs_item_id UUID,
  p_owner_id UUID DEFAULT NULL,
  p_reviewer_id UUID DEFAULT NULL,
  p_clear_owner BOOLEAN DEFAULT FALSE,
  p_clear_reviewer BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  reviewer_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_before public.lfa_wbs_items;
  v_row public.lfa_wbs_items;
  v_project_id UUID;
  v_org_id UUID;
  v_target_org_id UUID;
  v_target_exists BOOLEAN;
  v_event_metadata JSONB;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'WBS_ASSIGN_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT w.* INTO v_before
  FROM public.lfa_wbs_items w
  WHERE w.id = p_wbs_item_id
  FOR UPDATE;

  IF v_before.id IS NULL THEN
    RAISE EXCEPTION 'WBS_ASSIGN_NOT_FOUND: wbs item does not exist';
  END IF;

  v_org_id := v_before.org_id;
  v_project_id := v_before.lfa_project_id;

  IF NOT public.is_org_member(v_org_id, v_actor) THEN
    RAISE EXCEPTION 'WBS_ASSIGN_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'WBS_ASSIGN_FORBIDDEN: only organisation owner or admin may assign PIC or reviewer';
  END IF;

  IF p_owner_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_org_id AND om.user_id = p_owner_id
    ) INTO v_target_exists;

    IF NOT v_target_exists THEN
      RAISE EXCEPTION 'WBS_ASSIGN_OWNER_NOT_MEMBER: the assigned user is not an active member of this organisation';
    END IF;
  END IF;

  IF p_reviewer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_org_id AND om.user_id = p_reviewer_id
    ) INTO v_target_exists;

    IF NOT v_target_exists THEN
      RAISE EXCEPTION 'WBS_ASSIGN_REVIEWER_NOT_MEMBER: the assigned reviewer is not an active member of this organisation';
    END IF;
  END IF;

  UPDATE public.lfa_wbs_items w
  SET
    owner_id = CASE
      WHEN p_clear_owner THEN NULL
      WHEN p_owner_id IS NOT NULL THEN p_owner_id
      ELSE w.owner_id
    END,
    reviewer_id = CASE
      WHEN p_clear_reviewer THEN NULL
      WHEN p_reviewer_id IS NOT NULL THEN p_reviewer_id
      ELSE w.reviewer_id
    END
  WHERE w.id = p_wbs_item_id
  RETURNING * INTO v_row;

  v_event_metadata := jsonb_build_object(
    'wbs_item_id', v_row.id,
    'previous_owner_id', v_before.owner_id,
    'new_owner_id', v_row.owner_id,
    'previous_reviewer_id', v_before.reviewer_id,
    'new_reviewer_id', v_row.reviewer_id
  );

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor,
    'wbs_item', v_row.id, 'wbs_people_changed',
    v_event_metadata
  );

  RETURN QUERY SELECT v_row.id, v_row.owner_id, v_row.reviewer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_wbs_item_people(UUID, UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_wbs_item_people(UUID, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- ==========================================================================
-- 2. Assignment guard trigger — the enforcement boundary
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.enforce_wbs_assignment_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
BEGIN
  IF OLD.owner_id IS NOT DISTINCT FROM NEW.owner_id
     AND OLD.reviewer_id IS NOT DISTINCT FROM NEW.reviewer_id THEN
    RETURN NEW;
  END IF;

  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'WBS_ASSIGN_AUTH_REQUIRED: authentication is required';
  END IF;

  v_role := public.get_org_role(NEW.org_id, v_actor);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'WBS_ASSIGN_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'WBS_ASSIGN_FORBIDDEN: only organisation owner or admin may change PIC or reviewer';
  END IF;

  IF NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.org_id AND om.user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'WBS_ASSIGN_OWNER_CROSS_ORG: the assigned user is not an active member of this organisation';
    END IF;
  END IF;

  IF NEW.reviewer_id IS NOT NULL AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.org_id AND om.user_id = NEW.reviewer_id
    ) THEN
      RAISE EXCEPTION 'WBS_ASSIGN_REVIEWER_CROSS_ORG: the assigned reviewer is not an active member of this organisation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_wbs_items_assignment_guard ON public.lfa_wbs_items;

CREATE TRIGGER trg_lfa_wbs_items_assignment_guard
  BEFORE UPDATE OF owner_id, reviewer_id ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_wbs_assignment_guard();

-- ==========================================================================
-- 3. Expand project_activity_events.event_type vocabulary
-- ==========================================================================
ALTER TABLE public.project_activity_events
  DROP CONSTRAINT IF EXISTS project_activity_events_event_type_check;

ALTER TABLE public.project_activity_events
  ADD CONSTRAINT project_activity_events_event_type_check
  CHECK (event_type IN (
    'project_created',
    'objective_created',
    'objective_updated',
    'objective_reordered',
    'objective_archived',
    'objective_restored',
    'stage_created',
    'stage_updated',
    'stage_reordered',
    'stage_status_changed',
    'stage_archived',
    'stage_restored',
    'wbs_stage_assigned',
    'wbs_stage_unassigned',
    'wbs_people_changed',
    'meal_context_changed',
    'deliverable_created',
    'deliverable_status_changed',
    'deliverable_archived',
    'deliverable_stage_assigned',
    'deliverable_stage_unassigned'
  ));
