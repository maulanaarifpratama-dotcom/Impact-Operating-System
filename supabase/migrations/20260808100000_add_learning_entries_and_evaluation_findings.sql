-- Migration: 20260808100000_add_learning_entries_and_evaluation_findings.sql
-- Description: MEAL-P1 Learning & Evaluation MVP. Builds on top of the ACR
-- foundation (Evidence/Facts/Notes/Verification) rather than a second
-- execution workflow: Learning Entries and Evaluation Findings are both
-- lightweight CRUD tables (not a lifecycle engine), the same shape as
-- project_deliverables/project_milestones. RLS gates writes at the DB level:
-- Learning is open to any org member (frequent, operational); Evaluation
-- Findings are gated to owner/admin (formal, periodic).

-- ============================================================================
-- project_learning_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_learning_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  learning_note TEXT NOT NULL CHECK (btrim(learning_note) <> ''),
  wbs_item_id UUID REFERENCES public.lfa_wbs_items(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_learning_entries_org_project
  ON public.project_learning_entries(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_learning_entries_project_created
  ON public.project_learning_entries(project_id, created_at DESC);

-- ============================================================================
-- project_evaluation_findings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_evaluation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  finding TEXT NOT NULL CHECK (btrim(finding) <> ''),
  severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('informational', 'minor', 'major', 'critical')),
  recommendation TEXT,
  wbs_item_id UUID REFERENCES public.lfa_wbs_items(id) ON DELETE SET NULL,
  deliverable_id UUID REFERENCES public.project_deliverables(id) ON DELETE SET NULL,
  evidence_id UUID REFERENCES public.wbs_completion_evidence(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_evaluation_findings_org_project
  ON public.project_evaluation_findings(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_evaluation_findings_project_created
  ON public.project_evaluation_findings(project_id, created_at DESC);

-- ============================================================================
-- Integrity triggers: org_id must match the project's org_id, and any
-- optional reference (Activity/Stage/Deliverable/Evidence) must belong to
-- the same project/org. Mirrors trg_project_deliverables_integrity.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_project_learning_entries_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_org UUID;
  v_wbs_project UUID;
  v_stage_project UUID;
BEGIN
  SELECT p.org_id INTO v_project_org FROM public.lfa_projects p WHERE p.id = NEW.project_id;
  IF v_project_org IS NULL THEN
    RAISE EXCEPTION 'INVALID_LEARNING_ENTRY_PROJECT';
  END IF;
  IF NEW.org_id <> v_project_org THEN
    RAISE EXCEPTION 'INVALID_LEARNING_ENTRY_PROJECT';
  END IF;

  IF NEW.wbs_item_id IS NOT NULL THEN
    SELECT w.lfa_project_id INTO v_wbs_project FROM public.lfa_wbs_items w WHERE w.id = NEW.wbs_item_id;
    IF v_wbs_project IS NULL OR v_wbs_project <> NEW.project_id THEN
      RAISE EXCEPTION 'INVALID_LEARNING_ENTRY_ACTIVITY';
    END IF;
  END IF;

  IF NEW.stage_id IS NOT NULL THEN
    SELECT s.project_id INTO v_stage_project FROM public.project_stages s WHERE s.id = NEW.stage_id;
    IF v_stage_project IS NULL OR v_stage_project <> NEW.project_id THEN
      RAISE EXCEPTION 'INVALID_LEARNING_ENTRY_STAGE';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_learning_entries_integrity ON public.project_learning_entries;
CREATE TRIGGER trg_project_learning_entries_integrity
  BEFORE INSERT OR UPDATE
  ON public.project_learning_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_learning_entries_integrity();

CREATE OR REPLACE FUNCTION public.trg_project_evaluation_findings_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_org UUID;
  v_wbs_project UUID;
  v_deliverable_project UUID;
  v_evidence_claim UUID;
  v_evidence_project UUID;
BEGIN
  SELECT p.org_id INTO v_project_org FROM public.lfa_projects p WHERE p.id = NEW.project_id;
  IF v_project_org IS NULL THEN
    RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_PROJECT';
  END IF;
  IF NEW.org_id <> v_project_org THEN
    RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_PROJECT';
  END IF;

  IF NEW.wbs_item_id IS NOT NULL THEN
    SELECT w.lfa_project_id INTO v_wbs_project FROM public.lfa_wbs_items w WHERE w.id = NEW.wbs_item_id;
    IF v_wbs_project IS NULL OR v_wbs_project <> NEW.project_id THEN
      RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_ACTIVITY';
    END IF;
  END IF;

  IF NEW.deliverable_id IS NOT NULL THEN
    SELECT d.project_id INTO v_deliverable_project FROM public.project_deliverables d WHERE d.id = NEW.deliverable_id;
    IF v_deliverable_project IS NULL OR v_deliverable_project <> NEW.project_id THEN
      RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_DELIVERABLE';
    END IF;
  END IF;

  IF NEW.evidence_id IS NOT NULL THEN
    SELECT e.claim_id INTO v_evidence_claim FROM public.wbs_completion_evidence e WHERE e.id = NEW.evidence_id;
    IF v_evidence_claim IS NULL THEN
      RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_EVIDENCE';
    END IF;
    SELECT c.lfa_project_id INTO v_evidence_project FROM public.wbs_completion_claims c WHERE c.id = v_evidence_claim;
    IF v_evidence_project IS NULL OR v_evidence_project <> NEW.project_id THEN
      RAISE EXCEPTION 'INVALID_EVALUATION_FINDING_EVIDENCE';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_evaluation_findings_integrity ON public.project_evaluation_findings;
CREATE TRIGGER trg_project_evaluation_findings_integrity
  BEFORE INSERT OR UPDATE
  ON public.project_evaluation_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_evaluation_findings_integrity();

-- ============================================================================
-- RLS
-- project_learning_entries: any org member may read/write (lightweight,
-- frequent, operational — matches the MEAL-P1 contract).
-- project_evaluation_findings: any org member may read (transparency); only
-- owner/admin may write (formal, periodic — matches get_org_role usage in
-- 20260727010000_restrict_deletes_to_admins.sql).
-- ============================================================================
ALTER TABLE public.project_learning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_evaluation_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_learning_entries_member_select ON public.project_learning_entries;
CREATE POLICY project_learning_entries_member_select ON public.project_learning_entries
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS project_learning_entries_member_insert ON public.project_learning_entries;
CREATE POLICY project_learning_entries_member_insert ON public.project_learning_entries
  FOR INSERT WITH CHECK (public.is_org_member(org_id, auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS project_learning_entries_creator_update ON public.project_learning_entries;
CREATE POLICY project_learning_entries_creator_update ON public.project_learning_entries
  FOR UPDATE
  USING (created_by = auth.uid() OR public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS project_learning_entries_creator_delete ON public.project_learning_entries;
CREATE POLICY project_learning_entries_creator_delete ON public.project_learning_entries
  FOR DELETE
  USING (created_by = auth.uid() OR public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS project_evaluation_findings_member_select ON public.project_evaluation_findings;
CREATE POLICY project_evaluation_findings_member_select ON public.project_evaluation_findings
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS project_evaluation_findings_admin_insert ON public.project_evaluation_findings;
CREATE POLICY project_evaluation_findings_admin_insert ON public.project_evaluation_findings
  FOR INSERT
  WITH CHECK (public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS project_evaluation_findings_admin_update ON public.project_evaluation_findings;
CREATE POLICY project_evaluation_findings_admin_update ON public.project_evaluation_findings
  FOR UPDATE
  USING (public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS project_evaluation_findings_admin_delete ON public.project_evaluation_findings;
CREATE POLICY project_evaluation_findings_admin_delete ON public.project_evaluation_findings
  FOR DELETE
  USING (public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

-- ============================================================================
-- Privilege grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_learning_entries TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_evaluation_findings TO authenticated, service_role;
