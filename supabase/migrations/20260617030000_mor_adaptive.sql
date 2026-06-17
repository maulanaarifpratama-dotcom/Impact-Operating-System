-- Migration: MOR Adaptive Management columns
-- Path: supabase/migrations/20260617030000_mor_adaptive.sql

ALTER TABLE public.mor_sessions 
  ADD COLUMN IF NOT EXISTS adaptive_notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_what_worked TEXT,
  ADD COLUMN IF NOT EXISTS learning_what_didnt TEXT,
  ADD COLUMN IF NOT EXISTS learning_recommendations TEXT;
