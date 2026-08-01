-- Migration: 20260801000004_add_sroi_v2_audit_rationale.sql
-- Description: Add audit rationale fields and evidence linkage columns to lfa_sroi_outcomes for SROI V2 Sprint 2.

-- 1. Add rationale fields to lfa_sroi_outcomes
ALTER TABLE public.lfa_sroi_outcomes
  ADD COLUMN IF NOT EXISTS attribution_rationale TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deadweight_rationale TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS displacement_rationale TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dropoff_rationale TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wbs_evidence_id UUID REFERENCES public.wbs_completion_evidence(id) ON DELETE SET NULL;

-- 2. Create performance index for wbs_evidence_id on lfa_sroi_outcomes
CREATE INDEX IF NOT EXISTS idx_lfa_sroi_outcomes_wbs_evidence_id ON public.lfa_sroi_outcomes(wbs_evidence_id);
