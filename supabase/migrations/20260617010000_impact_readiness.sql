-- Migration: Impact Readiness Assessments table
-- Path: supabase/migrations/20260617010000_impact_readiness.sql

CREATE TABLE IF NOT EXISTS public.impact_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lfa_project_id UUID REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  score_q1 INTEGER NOT NULL CHECK (score_q1 BETWEEN 1 AND 5),
  score_q2 INTEGER NOT NULL CHECK (score_q2 BETWEEN 1 AND 5),
  score_q3 INTEGER NOT NULL CHECK (score_q3 BETWEEN 1 AND 5),
  score_q4 INTEGER NOT NULL CHECK (score_q4 BETWEEN 1 AND 5),
  score_q5 INTEGER NOT NULL CHECK (score_q5 BETWEEN 1 AND 5),
  total_score INTEGER GENERATED ALWAYS AS (score_q1 + score_q2 + score_q3 + score_q4 + score_q5) STORED,
  level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN (score_q1 + score_q2 + score_q3 + score_q4 + score_q5) BETWEEN 5 AND 10 THEN 'activity'
      WHEN (score_q1 + score_q2 + score_q3 + score_q4 + score_q5) BETWEEN 11 AND 18 THEN 'output'
      ELSE 'impact'
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_project UNIQUE (org_id, lfa_project_id)
);

-- Ensure only one organizational-level (lfa_project_id IS NULL) assessment per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_impact_readiness_org_null_project 
  ON public.impact_readiness_assessments (org_id) 
  WHERE lfa_project_id IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.impact_readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Helper function / trigger for updated_at if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for impact_readiness_assessments
DROP TRIGGER IF EXISTS trg_impact_readiness_assessments_updated_at ON public.impact_readiness_assessments;
CREATE TRIGGER trg_impact_readiness_assessments_updated_at BEFORE UPDATE ON public.impact_readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for querying quickly
CREATE INDEX IF NOT EXISTS idx_impact_readiness_assessments_org ON public.impact_readiness_assessments(org_id);

-- RLS Policies
DROP POLICY IF EXISTS "impact_readiness_assessments_read_own_org" ON public.impact_readiness_assessments;
CREATE POLICY "impact_readiness_assessments_read_own_org" ON public.impact_readiness_assessments FOR SELECT
  USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "impact_readiness_assessments_write_own_org" ON public.impact_readiness_assessments;
CREATE POLICY "impact_readiness_assessments_write_own_org" ON public.impact_readiness_assessments FOR ALL
  USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ))
  WITH CHECK (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
