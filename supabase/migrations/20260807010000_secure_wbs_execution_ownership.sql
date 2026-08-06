-- Migration: 20260807010000_secure_wbs_execution_ownership.sql
-- Description: PM execution authorization — harden status/title/delete/
--   schedule mutations so ordinary Members can only mutate their own
--   assigned items, and only execution-status fields (not title, schedule,
--   progress, budget, or assignment). Programme Design writes are preserved
--   unchanged.
--
-- Problem: RLS on lfa_wbs_items is FOR ALL with only org-membership check.
--   Any org member can UPDATE any column on any WBS row including title,
--   status, schedule, progress_percent, blocked_reason, delete, etc.
--   Migration 20260807000000 only guards owner_id/reviewer_id.
--
-- Solution:
--   1. BEFORE UPDATE trigger guards execution fields in PM mode
--      - Owner/Admin: full same-org editing preserved
--      - Assigned Member: may change only status and blocked_reason
--      - Member: denied for title, schedule, progress, delete, budget
--   2. update_assigned_wbs_execution_status RPC — canonical mutation path
--      for Member execution status changes with event emission
--   3. Narrow DELETE restriction — Members cannot delete any WBS item
--
-- Programme Design is completely unaffected: the trigger checks
--   lfa_projects.project_mode and only enforces rules when mode is
--   'project_management'.

-- ==========================================================================
-- 1. Execution guard trigger — PM only
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.enforce_wbs_execution_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_mode VARCHAR(20);
  v_role public.org_role;
  v_actor UUID;
  v_is_protected_change BOOLEAN;
  v_is_status_only BOOLEAN;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only enforce for PM projects; Programme Design writes pass through
  SELECT lp.project_mode INTO v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = NEW.lfa_project_id;

  IF v_project_mode IS NULL OR v_project_mode <> 'project_management' THEN
    RETURN NEW;
  END IF;

  -- Owner/Admin may do anything
  v_role := public.get_org_role(NEW.org_id, v_actor);

  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

  -- Determine which protected fields changed
  v_is_protected_change :=
    OLD.name IS DISTINCT FROM NEW.name
    OR OLD.start_month IS DISTINCT FROM NEW.start_month
    OR OLD.duration_weeks IS DISTINCT FROM NEW.duration_weeks
    OR OLD.pic IS DISTINCT FROM NEW.pic
    OR OLD.method IS DISTINCT FROM NEW.method
    OR OLD.indicator IS DISTINCT FROM NEW.indicator
    OR OLD.dependencies IS DISTINCT FROM NEW.dependencies
    OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
    OR OLD.stage_id IS DISTINCT FROM NEW.stage_id
    OR OLD.blocker_category IS DISTINCT FROM NEW.blocker_category
    OR OLD.blocker_notes IS DISTINCT FROM NEW.blocker_notes
    OR OLD.financial_status IS DISTINCT FROM NEW.financial_status;

  v_is_status_only :=
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.blocked_reason IS DISTINCT FROM NEW.blocked_reason;

  -- Block protected changes by Member
  IF v_is_protected_change THEN
    RAISE EXCEPTION 'WBS_EXEC_FORBIDDEN: Member may not change title, schedule, method, stage, or budget fields';
  END IF;

  -- Allow status-only changes only on Member's own assigned items
  IF v_is_status_only THEN
    IF NEW.owner_id IS NULL THEN
      RAISE EXCEPTION 'WBS_EXEC_UNASSIGNED: Member may not change status of unassigned item';
    END IF;

    IF NEW.owner_id <> v_actor THEN
      RAISE EXCEPTION 'WBS_EXEC_NOT_OWNER: Member may only change status of own assigned item';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_wbs_items_execution_guard ON public.lfa_wbs_items;

CREATE TRIGGER trg_lfa_wbs_items_execution_guard
  BEFORE UPDATE ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_wbs_execution_guard();

-- ==========================================================================
-- 2. update_assigned_wbs_execution_status RPC
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.update_assigned_wbs_execution_status(
  p_wbs_item_id UUID,
  p_status TEXT,
  p_blocked_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  blocked_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_before public.lfa_wbs_items;
  v_row public.lfa_wbs_items;
  v_role public.org_role;
  v_project_mode VARCHAR(20);
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_AUTH_REQUIRED: authentication is required';
  END IF;

  IF p_status NOT IN (
    'not_started','in_progress','blocked','in_review','completed','cancelled','ready','draft'
  ) THEN
    RAISE EXCEPTION 'WBS_EXEC_INVALID_STATUS: invalid execution status';
  END IF;

  SELECT w.* INTO v_before
  FROM public.lfa_wbs_items w
  WHERE w.id = p_wbs_item_id
  FOR UPDATE;

  IF v_before.id IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_NOT_FOUND: wbs item does not exist';
  END IF;

  SELECT lp.project_mode INTO v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = v_before.lfa_project_id;

  IF v_project_mode IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_PROJECT_NOT_FOUND';
  END IF;

  IF v_project_mode <> 'project_management' THEN
    RAISE EXCEPTION 'WBS_EXEC_PM_ONLY: this RPC is for project management items only';
  END IF;

  v_role := public.get_org_role(v_before.org_id, v_actor);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

  IF v_role IN ('owner', 'admin') THEN
    -- Owner/Admin: full authority
    NULL;
  ELSIF v_before.owner_id IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_UNASSIGNED: Member may not change status of unassigned item';
  ELSIF v_before.owner_id <> v_actor THEN
    RAISE EXCEPTION 'WBS_EXEC_NOT_OWNER: Member may only change status of own assigned item';
  END IF;

  UPDATE public.lfa_wbs_items w
  SET
    status = p_status,
    blocked_reason = CASE
      WHEN p_status = 'blocked' THEN COALESCE(p_blocked_reason, w.blocked_reason)
      ELSE NULL
    END,
    progress_percent = CASE
      WHEN p_status = 'completed' THEN 100
      ELSE w.progress_percent
    END
  WHERE w.id = p_wbs_item_id
  RETURNING * INTO v_row;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_row.org_id, v_row.lfa_project_id, v_actor,
    'wbs_item', v_row.id, 'wbs_status_changed',
    jsonb_build_object(
      'previous_status', v_before.status,
      'new_status', v_row.status,
      'blocked_reason', v_row.blocked_reason
    )
  );

  RETURN QUERY SELECT v_row.id, v_row.status, v_row.blocked_reason;
END;
$$;

REVOKE ALL ON FUNCTION public.update_assigned_wbs_execution_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_assigned_wbs_execution_status(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ==========================================================================
-- 3. Narrow DELETE — Members cannot delete any WBS item
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.enforce_wbs_delete_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_role public.org_role;
  v_project_mode VARCHAR(20);
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT lp.project_mode INTO v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = OLD.lfa_project_id;

  IF v_project_mode IS NULL OR v_project_mode <> 'project_management' THEN
    RETURN OLD;
  END IF;

  v_role := public.get_org_role(OLD.org_id, v_actor);

  IF v_role IN ('owner', 'admin') THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'WBS_DELETE_FORBIDDEN: only organisation owner or admin may delete WBS items';
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_wbs_items_delete_guard ON public.lfa_wbs_items;

CREATE TRIGGER trg_lfa_wbs_items_delete_guard
  BEFORE DELETE ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_wbs_delete_guard();

-- ==========================================================================
-- 4. Expand event_type vocabulary for wbs_status_changed
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
    'wbs_status_changed',
    'meal_context_changed',
    'deliverable_created',
    'deliverable_status_changed',
    'deliverable_archived',
    'deliverable_stage_assigned',
    'deliverable_stage_unassigned'
  ));
