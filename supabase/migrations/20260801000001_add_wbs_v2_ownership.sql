-- Migration: 20260801000001_add_wbs_v2_ownership.sql
-- Description: Add owner_id and reviewer_id references to lfa_wbs_items per ADR-0006 for Sprint 2 Ownership & Sign-off Workflow.

-- 1. Add owner_id foreign key (UUID linking to auth.users for task execution owner)
ALTER TABLE public.lfa_wbs_items 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add reviewer_id foreign key (UUID linking to auth.users for task review/approval owner)
ALTER TABLE public.lfa_wbs_items 
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_owner_id ON public.lfa_wbs_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_reviewer_id ON public.lfa_wbs_items(reviewer_id);
