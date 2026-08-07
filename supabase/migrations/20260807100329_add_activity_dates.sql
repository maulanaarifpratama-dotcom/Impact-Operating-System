-- Migration: 20260807100329_add_activity_dates.sql
-- Description: Add start_date and end_date to lfa_wbs_items for Activity-level scheduling.
-- Backward compatible: NULL = fallback to duration_weeks behavior.

ALTER TABLE public.lfa_wbs_items
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS lfa_wbs_items_activity_date_order;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT lfa_wbs_items_activity_date_order
  CHECK (
    start_date IS NULL
    OR end_date IS NULL
    OR end_date >= start_date
  );

CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_start_date
  ON public.lfa_wbs_items(start_date);
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_end_date
  ON public.lfa_wbs_items(end_date);

