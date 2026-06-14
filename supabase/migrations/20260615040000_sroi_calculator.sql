-- Migration: SROI Calculator schema
-- Path: supabase/migrations/20260615040000_sroi_calculator.sql

CREATE TABLE IF NOT EXISTS lfa_sroi_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_investment_idr NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0.035,
  analysis_period_years INTEGER DEFAULT 1,
  beneficiary_count INTEGER,
  mode TEXT DEFAULT 'simple' CHECK (mode IN ('simple', 'professional')),
  sroi_ratio NUMERIC DEFAULT 0,
  total_gross_value_idr NUMERIC DEFAULT 0,
  total_present_value_idr NUMERIC DEFAULT 0,
  ai_narrative TEXT,
  sensitivity_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lfa_sroi_config_project_unique UNIQUE (lfa_project_id)
);

CREATE TABLE IF NOT EXISTS lfa_sroi_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meal_item_id UUID REFERENCES lfa_meal_items(id) ON DELETE SET NULL,
  outcome_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  proxy_value_idr NUMERIC DEFAULT 0,
  proxy_source TEXT,
  proxy_citation TEXT,
  proxy_category TEXT,
  duration_years INTEGER DEFAULT 1,
  attribution_pct NUMERIC DEFAULT 80,
  deadweight_pct NUMERIC DEFAULT 20,
  displacement_pct NUMERIC DEFAULT 0,
  dropoff_pct_per_year NUMERIC DEFAULT 0,
  gross_value_idr NUMERIC DEFAULT 0,
  present_value_idr NUMERIC DEFAULT 0,
  mode TEXT DEFAULT 'simple' CHECK (mode IN ('simple', 'professional')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent duplicate outcomes for the same meal_item_id per project
CREATE UNIQUE INDEX IF NOT EXISTS lfa_sroi_outcomes_project_meal_unique 
ON lfa_sroi_outcomes(lfa_project_id, meal_item_id) 
WHERE meal_item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE lfa_sroi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE lfa_sroi_outcomes ENABLE ROW LEVEL SECURITY;

-- Org isolation policy for lfa_sroi_config
DROP POLICY IF EXISTS "org_isolation_lfa_sroi_config" ON lfa_sroi_config;
CREATE POLICY "org_isolation_lfa_sroi_config" ON lfa_sroi_config
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

-- Org isolation policy for lfa_sroi_outcomes
DROP POLICY IF EXISTS "org_isolation_lfa_sroi_outcomes" ON lfa_sroi_outcomes;
CREATE POLICY "org_isolation_lfa_sroi_outcomes" ON lfa_sroi_outcomes
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
