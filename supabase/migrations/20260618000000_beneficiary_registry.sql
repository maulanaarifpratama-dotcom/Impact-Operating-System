-- Migration: Beneficiary Registry table
-- Path: supabase/migrations/20260618000000_beneficiary_registry.sql

CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lfa_project_id UUID REFERENCES public.lfa_projects(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'other')),
  age INTEGER,
  village TEXT,
  city TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'alumni', 'inactive')),
  nik TEXT,
  vulnerable_categories TEXT[] DEFAULT '{}',
  start_date DATE,
  contact TEXT,
  photo_url TEXT,
  pdp_consent BOOLEAN DEFAULT false,
  notes TEXT,
  mode TEXT DEFAULT 'simple',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_beneficiaries_updated_at ON public.beneficiaries;
CREATE TRIGGER trg_beneficiaries_updated_at BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_beneficiaries_org ON public.beneficiaries(org_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_project ON public.beneficiaries(lfa_project_id);

-- RLS Policies
DROP POLICY IF EXISTS "beneficiaries_select" ON public.beneficiaries;
CREATE POLICY "beneficiaries_select" ON public.beneficiaries FOR SELECT
  USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "beneficiaries_all" ON public.beneficiaries;
CREATE POLICY "beneficiaries_all" ON public.beneficiaries FOR ALL
  USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ))
  WITH CHECK (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
