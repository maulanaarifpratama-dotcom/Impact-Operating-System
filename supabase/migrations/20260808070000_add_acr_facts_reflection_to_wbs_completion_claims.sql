-- Migration: PM ACR v1 Phase 1 — Facts & Reflection on wbs_completion_claims
-- Path: supabase/migrations/20260808070000_add_acr_facts_reflection_to_wbs_completion_claims.sql
--
-- The existing Completion Claim (wbs_completion_claims) + Evidence
-- (wbs_completion_evidence) pair becomes the Activity Completion Record (ACR)
-- MVP per PRD_PM_ACR_v1: Evidence is reused as-is, Facts and Reflection are
-- new structured/narrative fields captured on the same claim record so no
-- new top-level entity is introduced for Phase 1.

ALTER TABLE public.wbs_completion_claims
  ADD COLUMN IF NOT EXISTS facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT;

COMMENT ON COLUMN public.wbs_completion_claims.facts IS
  'ACR Facts: array of {label, value} rows (default counters + custom). Activity-level notes only — no Beneficiary Registry / ESG / Reporting integration in Phase 1.';
COMMENT ON COLUMN public.wbs_completion_claims.lessons_learned IS 'ACR Reflection: lessons learned narrative.';
COMMENT ON COLUMN public.wbs_completion_claims.observations IS 'ACR Reflection: observations narrative.';
COMMENT ON COLUMN public.wbs_completion_claims.recommendations IS 'ACR Reflection: recommendations narrative.';
COMMENT ON COLUMN public.wbs_completion_claims.next_action IS 'ACR Reflection: optional one-line next-action pointer (not a tracked task).';
