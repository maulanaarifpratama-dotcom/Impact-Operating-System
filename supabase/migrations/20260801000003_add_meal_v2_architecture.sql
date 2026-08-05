-- Migration: 20260801000003_add_meal_v2_architecture.sql
-- Description: Add indicator_type, aggregation_method, verification_state, and Evidence Bridge linkage to lfa_meal_items and lfa_meal_tracking_entries per ADR-0006 for Sprint 4 MEAL V2.

-- 1. Add MEAL V2 columns to lfa_meal_items
ALTER TABLE public.lfa_meal_items 
  ADD COLUMN IF NOT EXISTS indicator_type VARCHAR(50) DEFAULT 'cumulative_number',
  ADD COLUMN IF NOT EXISTS aggregation_method VARCHAR(50) DEFAULT 'sum',
  ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_state VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS assigned_user UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add Evidence Bridge and Verification columns to lfa_meal_tracking_entries
ALTER TABLE public.lfa_meal_tracking_entries
  ADD COLUMN IF NOT EXISTS wbs_evidence_id UUID REFERENCES public.wbs_completion_evidence(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_state VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT NULL;

-- 3. Create performance indexes for joins and filtering
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_indicator_type ON public.lfa_meal_items(indicator_type);
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_aggregation_method ON public.lfa_meal_items(aggregation_method);
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_verification_state ON public.lfa_meal_items(verification_state);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_entries_wbs_evidence_id ON public.lfa_meal_tracking_entries(wbs_evidence_id);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_entries_verification_state ON public.lfa_meal_tracking_entries(verification_state);
