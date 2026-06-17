-- Migration: Budget Realisasi columns
-- Path: supabase/migrations/20260617020000_budget_realisasi.sql

ALTER TABLE public.lfa_budget_items 
  ADD COLUMN IF NOT EXISTS actual_amount_idr NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS realisasi_date DATE,
  ADD COLUMN IF NOT EXISTS realisasi_notes TEXT,
  ADD COLUMN IF NOT EXISTS realisasi_evidence_url TEXT;
