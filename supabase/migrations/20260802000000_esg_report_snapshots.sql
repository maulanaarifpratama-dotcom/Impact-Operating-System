-- DDL Migration: esg_report_snapshots table for storing immutable report snapshots
-- ADR-0002 & ADR-0003 Compliant

CREATE TABLE IF NOT EXISTS public.esg_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('GRI', 'SEOJK', 'SDG', 'EXECUTIVE')),
  report_period TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  pdf_storage_url TEXT,
  docx_storage_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.esg_report_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT (Read-only for Organization Members)
CREATE POLICY "Users can view org report snapshots"
ON public.esg_report_snapshots FOR SELECT
USING (
  org_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: INSERT (Immutable Storage - Admins / Owners)
CREATE POLICY "Admins can create report snapshots"
ON public.esg_report_snapshots FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- NOTE: NO UPDATE POLICY TO GUARANTEE REPORT IMMUTABILITY!
