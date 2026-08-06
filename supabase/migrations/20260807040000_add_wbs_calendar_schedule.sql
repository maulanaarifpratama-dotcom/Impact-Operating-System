-- Migration: 20260807040000_add_wbs_calendar_schedule.sql
-- Description: Add calendar date fields to lfa_wbs_items for Project
--   Management Activity/Task/Subtask scheduling. Stage no longer anchors WBS
--   dates; each work item owns its own planned/actual dates.
--   Programme Design retains start_month/duration_weeks unchanged.

-- ==========================================================================
-- 1. Add calendar date columns
-- ==========================================================================
ALTER TABLE public.lfa_wbs_items
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- ==========================================================================
-- 2. CHECK constraints — end must not be before start
-- ==========================================================================
ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_planned_date_order;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_planned_date_order
  CHECK (
    planned_start_date IS NULL
    OR planned_end_date IS NULL
    OR planned_end_date >= planned_start_date
  );

ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_actual_date_order;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_actual_date_order
  CHECK (
    actual_start_date IS NULL
    OR actual_end_date IS NULL
    OR actual_end_date >= actual_start_date
  );

-- ==========================================================================
-- 3. Indexes
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_planned_start_date
  ON public.lfa_wbs_items(planned_start_date);

CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_planned_end_date
  ON public.lfa_wbs_items(planned_end_date);

-- ==========================================================================
-- 4. Backfill PM items only with factual data
--    Formula: Stage.planned_start_date + (start_month - 1) months
--             = planned_start_date
--             planned_start_date + duration_weeks * 7 days
--             = planned_end_date
-- ==========================================================================
UPDATE public.lfa_wbs_items w
SET
  planned_start_date = (
    SELECT (ps.planned_start_date::date
      + ((w.start_month - 1) * INTERVAL '1 month'))
    FROM public.project_stages ps
    WHERE ps.id = w.stage_id
  ),
  planned_end_date = (
    SELECT (ps.planned_start_date::date
      + ((w.start_month - 1) * INTERVAL '1 month')
      + (w.duration_weeks * INTERVAL '7 days'))
    FROM public.project_stages ps
    WHERE ps.id = w.stage_id
  )
FROM public.lfa_projects lp
WHERE w.lfa_project_id = lp.id
  AND lp.project_mode = 'project_management'
  AND w.level >= 2
  AND w.stage_id IS NOT NULL
  AND w.start_month IS NOT NULL
  AND w.start_month > 0
  AND w.duration_weeks IS NOT NULL
  AND w.duration_weeks > 0
  AND EXISTS (
    SELECT 1 FROM public.project_stages ps
    WHERE ps.id = w.stage_id AND ps.planned_start_date IS NOT NULL
  );

-- ==========================================================================
-- 5. Update execution guard trigger to protect new date fields
--    (replaces enforce_wbs_execution_guard with date-field protection)
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
    OR OLD.financial_status IS DISTINCT FROM NEW.financial_status
    OR OLD.planned_start_date IS DISTINCT FROM NEW.planned_start_date
    OR OLD.planned_end_date IS DISTINCT FROM NEW.planned_end_date
    OR OLD.actual_start_date IS DISTINCT FROM NEW.actual_start_date
    OR OLD.actual_end_date IS DISTINCT FROM NEW.actual_end_date;

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
