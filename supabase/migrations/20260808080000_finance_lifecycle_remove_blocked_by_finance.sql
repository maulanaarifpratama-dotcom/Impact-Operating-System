-- Migration: PM-P5A Finance Domain Contract v1.0
-- Path: supabase/migrations/20260808080000_finance_lifecycle_remove_blocked_by_finance.sql
--
-- Per the PM-P5 Finance audit: a financial obstruction is a Bottleneck
-- (category = financial), never a FinancialStatus value — 'blocked_by_finance'
-- conflated "where is this in the resource-flow pipeline" with "is something
-- wrong", the same category error already corrected for execution status.
--
-- Note: lfa_wbs_items.financial_status was added as a plain VARCHAR(50) in
-- 20260801000002_add_wbs_v2_financial_bottleneck.sql — the wbs_financial_status
-- Postgres ENUM created in that same migration was never actually applied to
-- the column, so no ALTER TYPE / column-type change is needed here. This
-- migration only cleans up data and adds a CHECK constraint the column never
-- had.
--
-- No automated Bottleneck record is created for rows migrated off
-- 'blocked_by_finance' — per the canonical decision, Finance must never
-- auto-create Bottleneck data. Any Activity previously flagged
-- blocked_by_finance will need to be manually re-flagged as a Bottleneck
-- (category = financial, once that category exists) by its owner.

-- 1. Move any existing 'blocked_by_finance' rows to a valid mid-lifecycle
--    value. 'committed' is the safest fallback: it only asserts "budgeted",
--    which was already implied by having reached blocked_by_finance.
UPDATE public.lfa_wbs_items
SET financial_status = 'committed'
WHERE financial_status = 'blocked_by_finance';

-- 2. Enforce the canonical 5-value lifecycle at the DB level going forward.
ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS chk_lfa_wbs_items_financial_status;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT chk_lfa_wbs_items_financial_status
  CHECK (
    financial_status IS NULL
    OR financial_status IN ('draft', 'committed', 'disbursement_requested', 'paid', 'closed')
  );

COMMENT ON COLUMN public.lfa_wbs_items.financial_status IS
  'PM Finance resource-flow lifecycle (PM-P5 canonical): draft (Not Budgeted) -> committed (Planned) -> disbursement_requested (Requested) -> paid (Active) -> closed (Reconciled). Financial obstructions are represented as a Bottleneck (category = financial), never as a status value here.';
