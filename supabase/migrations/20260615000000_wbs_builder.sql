-- Migration: WBS Builder schema
-- Path: supabase/migrations/20260615000000_wbs_builder.sql

CREATE TABLE IF NOT EXISTS lfa_wbs_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3, 4)),
  parent_id UUID REFERENCES lfa_wbs_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_month INTEGER DEFAULT 1 CHECK (start_month >= 1),
  duration_weeks INTEGER DEFAULT 4 CHECK (duration_weeks >= 1),
  pic TEXT,
  method TEXT CHECK (method IN ('Workshop', 'FGD', 'Survey', 'Pelatihan', 'Pendampingan', 'Rapat', 'Lainnya')),
  indicator TEXT,
  notes TEXT,
  dependencies TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  mode TEXT CHECK (mode IN ('simple', 'professional')) DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lfa_wbs_items ENABLE ROW LEVEL SECURITY;

-- Org isolation policy for lfa_wbs_items
DROP POLICY IF EXISTS "org_isolation_lfa_wbs_items" ON lfa_wbs_items;
CREATE POLICY "org_isolation_lfa_wbs_items" ON lfa_wbs_items
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
