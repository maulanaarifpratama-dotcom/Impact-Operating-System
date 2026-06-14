-- Migration: Add onboarding fields to profiles table
-- Path: supabase/migrations/20260615030000_onboarding_flow.sql

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_sector TEXT,
ADD COLUMN IF NOT EXISTS onboarding_phase TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
