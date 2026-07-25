-- Migration: Add stakeholder_group column to lfa_sroi_items
-- Path: supabase/migrations/20260725140000_sroi_stakeholder_group.sql

ALTER TABLE public.lfa_sroi_items
ADD COLUMN IF NOT EXISTS stakeholder_group TEXT;

COMMENT ON COLUMN public.lfa_sroi_items.stakeholder_group 
IS 'SVI Principle 1: Target stakeholder group affected by this outcome (e.g., Penerima Manfaat Langsung, Komunitas Lokal)';
