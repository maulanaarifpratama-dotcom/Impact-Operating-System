-- Migration: WBS Completion Claims & Evidence Foundation (WBS-P1A-3A)
-- Path: supabase/migrations/20260724180000_wbs_completion_claims_evidence.sql

-- 1. Table: wbs_completion_claims
CREATE TABLE IF NOT EXISTS public.wbs_completion_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  wbs_item_id UUID NOT NULL REFERENCES public.lfa_wbs_items(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claim_note TEXT,
  claimed_progress INTEGER CHECK (claimed_progress >= 0 AND claimed_progress <= 100),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft', 'submitted', 'verified', 'rejected', 'needs_revision', 'cancelled')
  ),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: wbs_completion_evidence
CREATE TABLE IF NOT EXISTS public.wbs_completion_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.wbs_completion_claims(id) ON DELETE CASCADE,
  evidence_type TEXT CHECK (evidence_type IN ('file', 'link', 'note', 'manual_url', 'onedrive', 'other')),
  storage_reference TEXT,
  title TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_wbs_completion_claims_wbs_item ON public.wbs_completion_claims(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_completion_claims_project ON public.wbs_completion_claims(lfa_project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_completion_claims_status ON public.wbs_completion_claims(status);
CREATE INDEX IF NOT EXISTS idx_wbs_completion_evidence_claim ON public.wbs_completion_evidence(claim_id);

-- 3. Trigger Function: Strict server enforcement of claimed_by, reviewed_by, and Separation of Duties
CREATE OR REPLACE FUNCTION public.handle_wbs_completion_claim_audit()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- FAIL CLOSED: auth.uid() must be present. Unauthenticated context is explicitly rejected.
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'wbs_completion_claims requires an authenticated user context (auth.uid() is null)';
  END IF;

  -- A. Insert Handling: Force claimed_by to auth.uid()
  IF TG_OP = 'INSERT' THEN
    NEW.claimed_by := current_user_id;

    IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at := NOW();
    END IF;
  END IF;

  -- B. Update / Review Handling & Separation of Duties Enforcement
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();

    -- Transitioning into a reviewed state (verified, rejected, needs_revision)
    IF NEW.status IN ('verified', 'rejected', 'needs_revision') THEN
      -- SEPARATION OF DUTIES CHECK: Submitter cannot verify/review their own claim
      IF current_user_id = OLD.claimed_by THEN
        RAISE EXCEPTION 'Separation of Duties violation: A claim submitter cannot verify or review their own claim (claimed_by: %)', OLD.claimed_by;
      END IF;

      IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = OLD.claimed_by THEN
        RAISE EXCEPTION 'Separation of Duties violation: Reviewer cannot be the same as the claim submitter (claimed_by: %)', OLD.claimed_by;
      END IF;

      -- Set server-controlled reviewer and timestamp
      NEW.reviewed_by := current_user_id;
      NEW.reviewed_at := NOW();
    END IF;

    -- Transitioning back to submitted (e.g., after needs_revision)
    IF NEW.status = 'submitted' AND OLD.status = 'needs_revision' THEN
      NEW.submitted_at := NOW();
      NEW.reviewed_at := NULL;
      NEW.reviewed_by := NULL;
      NEW.review_note := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wbs_completion_claim_audit ON public.wbs_completion_claims;
CREATE TRIGGER trg_wbs_completion_claim_audit
  BEFORE INSERT OR UPDATE ON public.wbs_completion_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_wbs_completion_claim_audit();

-- 4. Trigger Function: Strict server enforcement for evidence uploaded_by
CREATE OR REPLACE FUNCTION public.handle_wbs_completion_evidence_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- FAIL CLOSED: auth.uid() must be present. Unauthenticated context is explicitly rejected.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'wbs_completion_evidence requires an authenticated user context (auth.uid() is null)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.uploaded_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wbs_completion_evidence_audit ON public.wbs_completion_evidence;
CREATE TRIGGER trg_wbs_completion_evidence_audit
  BEFORE INSERT ON public.wbs_completion_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_wbs_completion_evidence_audit();

-- 5. Enable RLS
ALTER TABLE public.wbs_completion_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbs_completion_evidence ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "org_isolation_wbs_completion_claims" ON public.wbs_completion_claims;
CREATE POLICY "org_isolation_wbs_completion_claims" ON public.wbs_completion_claims
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ) OR (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "org_isolation_wbs_completion_evidence" ON public.wbs_completion_evidence;
CREATE POLICY "org_isolation_wbs_completion_evidence" ON public.wbs_completion_evidence
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ) OR (auth.role() = 'authenticated')
  );
