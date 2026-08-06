-- Migration: 20260807020000_align_wbs_roles_with_owner_member.sql
-- Description: Correct WBS assignment migration (20260807000000, already in
--   Production) to use owner-only organization management authority instead
--   of owner/admin. The canonical Impactory access model has exactly two
--   organization roles: owner and member. The 'admin' org_role is a legacy
--   enum value that must not grant assignment or execution authority in WBS.
--
-- This replaces the assign_wbs_item_people RPC and the assignment guard
-- trigger with owner-only checks. The 5-arg RPC signature, event emission,
-- safe search_path, and grants are preserved exactly.
--
-- Also aligns the execution guard trigger, execution status RPC, and delete
-- guard trigger (from 20260807010000, not yet in Production) with owner-only
-- checks.

-- ==========================================================================
-- 1. Replace assign_wbs_item_people — owner-only
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

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'WBS_ASSIGN_FORBIDDEN: only organisation owner may assign PIC or reviewer';
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

-- Preserve existing grants (identical to previous migration)
REVOKE ALL ON FUNCTION public.assign_wbs_item_people(UUID, UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_wbs_item_people(UUID, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- ==========================================================================
-- 2. Replace assignment guard trigger — owner-only
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

  IF v_role <> 'owner' THEN
    RAISE EXCEPTION 'WBS_ASSIGN_FORBIDDEN: only organisation owner may change PIC or reviewer';
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

-- ==========================================================================
-- 3. Replace execution guard trigger — owner-only
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

  SELECT lp.project_mode INTO v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = NEW.lfa_project_id;

  IF v_project_mode IS NULL OR v_project_mode <> 'project_management' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_org_role(NEW.org_id, v_actor);

  IF v_role = 'owner' THEN
    RETURN NEW;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'WBS_EXEC_MEMBERSHIP_REQUIRED: caller is not a member of this organisation';
  END IF;

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

  IF v_is_protected_change THEN
    RAISE EXCEPTION 'WBS_EXEC_FORBIDDEN: Member may not change title, schedule, method, stage, or budget fields';
  END IF;

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

-- ==========================================================================
-- 4. Replace execution status RPC — owner-only
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

  IF v_role = 'owner' THEN
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
-- 5. Replace delete guard trigger — owner-only
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

  IF v_role = 'owner' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'WBS_DELETE_FORBIDDEN: only organisation owner may delete WBS items';
END;
$$;
