-- Migration: 20260808110000_drop_blocked_reason.sql
-- Description: PM + MEAL V1 debt closure. Canonical rule: Blocked = an
-- active Bottleneck exists (blocker_category is set), never a status value
-- with a free-text reason (see src/lib/project-management/executionModel.ts,
-- isBlocked()). The manual "blocked" status + blocked_reason free-text field
-- predates that model and has had zero write path in any UI since the
-- Canonical Execution Status Model phase — WBSBuilder.tsx never sets it.
--
-- No other object depends on this column: the completion-attribution trigger
-- (trg_lfa_wbs_items_completion_attribution, added in the same original
-- migration) only touches completed_at/completed_by/progress_percent.

ALTER TABLE public.lfa_wbs_items
  DROP COLUMN IF EXISTS blocked_reason;
