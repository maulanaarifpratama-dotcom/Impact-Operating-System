-- Migration: Budget Builder schema
-- Path: supabase/migrations/20260615010000_budget_builder.sql

CREATE TABLE IF NOT EXISTS lfa_budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wbs_item_id UUID REFERENCES lfa_wbs_items(id) ON DELETE CASCADE,
  activity_name TEXT,
  category TEXT, -- simple mode category (e.g. Honorarium, Transport, etc.)
  cost_category TEXT, -- professional mode category (Personnel, Travel, etc.)
  item_name TEXT NOT NULL,
  volume NUMERIC DEFAULT 1,
  unit TEXT,
  unit_price_idr NUMERIC DEFAULT 0,
  funding_source TEXT DEFAULT 'grant' CHECK (funding_source IN ('grant', 'self', 'partner', 'inkind')),
  justification TEXT,
  needs_donor_approval BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  mode TEXT CHECK (mode IN ('simple', 'professional')) DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lfa_budget_items ENABLE ROW LEVEL SECURITY;

-- Org isolation policy for lfa_budget_items
DROP POLICY IF EXISTS "org_isolation_lfa_budget_items" ON lfa_budget_items;
CREATE POLICY "org_isolation_lfa_budget_items" ON lfa_budget_items
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
