-- Migration: Add execution status and progress tracking to lfa_wbs_items
-- Path: supabase/migrations/20260724160000_wbs_task_status_progress.sql
-- Phase: WBS-P1A-1A Task Status & Progress Database Foundation

-- 1. Add nullable / defaulted fields
ALTER TABLE public.lfa_wbs_items
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID;

-- 2. Backfill existing rows with deterministic safe defaults
UPDATE public.lfa_wbs_items
SET status = 'not_started'
WHERE status IS NULL;

UPDATE public.lfa_wbs_items
SET progress_percent = 0
WHERE progress_percent IS NULL;

-- Ensure columns have NOT NULL constraints and defaults set
ALTER TABLE public.lfa_wbs_items
  ALTER COLUMN status SET DEFAULT 'not_started',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN progress_percent SET DEFAULT 0,
  ALTER COLUMN progress_percent SET NOT NULL;

-- 3. Add CHECK constraints after data compliance
ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_status_check;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_status_check
  CHECK (status IN (
    'draft',
    'not_started',
    'ready',
    'in_progress',
    'blocked',
    'in_review',
    'completed',
    'cancelled'
  ));

ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_progress_percent_check;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_progress_percent_check
  CHECK (progress_percent >= 0 AND progress_percent <= 100);

ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_completed_consistency_check;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_completed_consistency_check
  CHECK (status <> 'completed' OR (progress_percent = 100 AND completed_at IS NOT NULL));

-- 4. Server-enforced completion attribution trigger (Rules 3 & 4)
CREATE OR REPLACE FUNCTION public.trg_lfa_wbs_items_completion_attribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Case 1: Transitioning INTO 'completed' from non-completed state
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'completed') THEN
    NEW.completed_at := NOW();
    NEW.completed_by := auth.uid();
    NEW.progress_percent := 100;

  -- Case 2: Remaining in 'completed' state
  ELSIF NEW.status = 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := OLD.completed_at;
    NEW.completed_by := OLD.completed_by;
    NEW.progress_percent := 100;

  -- Case 3: Transitioning AWAY from 'completed' to any other status
  ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    -- Option A (LOCKED DECISION): Preserve completed_at and completed_by as historical fact
    NEW.completed_at := OLD.completed_at;
    NEW.completed_by := OLD.completed_by;

  -- Case 4: Status is not completed and was not completed
  ELSE
    IF TG_OP = 'UPDATE' THEN
      NEW.completed_at := OLD.completed_at;
      NEW.completed_by := OLD.completed_by;
    ELSE
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lfa_wbs_items_completion_attribution ON public.lfa_wbs_items;

CREATE TRIGGER trg_lfa_wbs_items_completion_attribution
  BEFORE INSERT OR UPDATE ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lfa_wbs_items_completion_attribution();

-- Documentation Comments
COMMENT ON COLUMN public.lfa_wbs_items.status IS 'Execution status: draft | not_started | ready | in_progress | blocked | in_review | completed | cancelled';
COMMENT ON COLUMN public.lfa_wbs_items.progress_percent IS 'Direct execution progress percentage for leaf items (0-100)';
COMMENT ON COLUMN public.lfa_wbs_items.blocked_reason IS 'Explanation when item status is blocked';
COMMENT ON COLUMN public.lfa_wbs_items.completed_at IS 'Timestamp when item was first or most recently marked completed (historical fact preserved on status un-complete)';
COMMENT ON COLUMN public.lfa_wbs_items.completed_by IS 'User ID who marked item completed (server-enforced via auth.uid(), preserved on status un-complete)';
