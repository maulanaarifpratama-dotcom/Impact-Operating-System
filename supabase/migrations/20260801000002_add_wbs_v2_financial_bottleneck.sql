-- Migration: 20260801000002_add_wbs_v2_financial_bottleneck.sql
-- Description: Add financial_status, blocker_category, and blocker_notes to lfa_wbs_items per ADR-0006 for Sprint 3 Financial Lifecycle & Bottleneck Intelligence.

-- 1. Create enum type for financial lifecycle status if not exists
DO $$ BEGIN
    CREATE TYPE public.wbs_financial_status AS ENUM (
      'draft',
      'committed',
      'disbursement_requested',
      'paid',
      'blocked_by_finance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create enum type for blocker category if not exists
DO $$ BEGIN
    CREATE TYPE public.wbs_blocker_category AS ENUM (
      'donor_disbursement',
      'internal_approval',
      'vendor_delay',
      'field_condition',
      'force_majeure'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add columns to lfa_wbs_items
ALTER TABLE public.lfa_wbs_items 
  ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS blocker_category VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blocker_notes TEXT DEFAULT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_financial_status ON public.lfa_wbs_items(financial_status);
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_blocker_category ON public.lfa_wbs_items(blocker_category);
