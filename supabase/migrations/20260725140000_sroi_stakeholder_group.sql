-- Migration: Add stakeholder_group column to lfa_sroi_outcomes
-- Path: supabase/migrations/20260725140000_sroi_stakeholder_group.sql
--
-- Corrected 2026-07-26: this originally targeted public.lfa_sroi_items, a table
-- that exists in no migration and not in production. It failed with 42P01 every
-- time it ran, which is why it was never applied.
--
-- The real table is lfa_sroi_outcomes, created in 20260615040000_sroi_calculator,
-- and it is the one the UI uses: SROICalculator.tsx persists rows through
-- debounceSaveOutcome() against lfa_sroi_outcomes and sends stakeholder_group
-- with each one.

ALTER TABLE public.lfa_sroi_outcomes
ADD COLUMN IF NOT EXISTS stakeholder_group TEXT;

COMMENT ON COLUMN public.lfa_sroi_outcomes.stakeholder_group
IS 'SVI Principle 1: Target stakeholder group affected by this outcome (e.g., Penerima Manfaat Langsung, Komunitas Lokal)';
