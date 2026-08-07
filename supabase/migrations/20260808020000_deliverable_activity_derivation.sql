-- Migration: 20260808020000_deliverable_activity_derivation.sql
-- Description: D3/D4 — Automatic deliverable status derivation from linked
--   Activity completion. Implements the canonical hybrid deliverable model:
--     not_started → in_progress (auto: ≥1 linked Activity active)
--     in_progress → submitted    (auto: ALL linked Activities completed)
--     submitted → approved       (manual: Owner only — enforced in D5)
--
-- Two triggers:
--   1. On project_deliverable_activities INSERT — activates deliverable
--      when a new active Activity is linked.
--   2. On lfa_wbs_items UPDATE of status/progress_percent — activates or
--      submits deliverable when linked Activities change state.

-- ==========================================================================
-- 1. Core derivation function
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.derive_deliverable_status_from_activities(
  p_deliverable_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deliverable public.project_deliverables;
  v_active_count INTEGER;
  v_completed_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT * INTO v_deliverable
  FROM public.project_deliverables
  WHERE id = p_deliverable_id
  FOR UPDATE;

  IF v_deliverable.id IS NULL THEN
    RETURN;
  END IF;

  IF v_deliverable.archived_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_deliverable.status = 'approved' THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE wi.status <> 'not_started' OR wi.progress_percent > 0),
    COUNT(*) FILTER (WHERE wi.status = 'completed' OR wi.progress_percent = 100),
    COUNT(*)
  INTO v_active_count, v_completed_count, v_total_count
  FROM public.project_deliverable_activities da
  JOIN public.lfa_wbs_items wi ON wi.id = da.wbs_item_id
  WHERE da.deliverable_id = p_deliverable_id
    AND wi.status <> 'cancelled';

  IF v_total_count = 0 THEN
    RETURN;
  END IF;

  IF v_deliverable.status = 'not_started' AND v_active_count > 0 THEN
    UPDATE public.project_deliverables
    SET status = 'in_progress', updated_at = now()
    WHERE id = p_deliverable_id;
  ELSIF v_deliverable.status = 'in_progress' AND v_completed_count = v_total_count AND v_total_count > 0 THEN
    UPDATE public.project_deliverables
    SET status = 'submitted', updated_at = now()
    WHERE id = p_deliverable_id;
  END IF;
END;
$$;

-- ==========================================================================
-- 2. Trigger on project_deliverable_activities INSERT
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.trg_deliverable_activity_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.derive_deliverable_status_from_activities(NEW.deliverable_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deliverable_activity_link ON public.project_deliverable_activities;

CREATE TRIGGER trg_deliverable_activity_link
  AFTER INSERT ON public.project_deliverable_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_deliverable_activity_link();

-- ==========================================================================
-- 3. Trigger on lfa_wbs_items UPDATE of status/progress_percent
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.trg_wbs_activity_deliverable_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deliverable_ids UUID[];
  v_did UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.progress_percent IS NOT DISTINCT FROM NEW.progress_percent THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(da.deliverable_id) INTO v_deliverable_ids
  FROM public.project_deliverable_activities da
  WHERE da.wbs_item_id = NEW.id;

  IF v_deliverable_ids IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_did IN ARRAY v_deliverable_ids LOOP
    PERFORM public.derive_deliverable_status_from_activities(v_did);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wbs_activity_deliverable_sync ON public.lfa_wbs_items;

CREATE TRIGGER trg_wbs_activity_deliverable_sync
  AFTER UPDATE OF status, progress_percent ON public.lfa_wbs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_wbs_activity_deliverable_sync();
