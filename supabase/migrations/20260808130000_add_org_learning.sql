-- Migration: 20260808130000_add_org_learning.sql
-- Description: MEAL Learning V1 (Sprint 1). Organization-level knowledge
-- asset, synthesized from multiple ACRs and/or Evaluation Findings. Not
-- project-scoped — org_id only, no project_id column. Related Projects are
-- never stored: they are derived at query time from the Evidence Base's
-- underlying ACR/Finding records, so they can never drift out of sync.
--
-- Visibility is enforced in RLS, not just in the UI: a Draft is visible
-- only to its own author; a Published entry is visible to any org member.
-- This matches the locked spec's "enforced server-side independently of
-- the UI" requirement.

-- ============================================================================
-- org_learning_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_learning_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 200),
  insight TEXT NOT NULL CHECK (btrim(insight) <> ''),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('good_practice', 'failure_pattern', 'mixed')),
  recommendation TEXT NOT NULL CHECK (btrim(recommendation) <> ''),
  scope TEXT NOT NULL CHECK (scope IN ('project_specific', 'programme_wide', 'organization_wide')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  authored_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_learning_entries_org_status
  ON public.org_learning_entries(org_id, status);
CREATE INDEX IF NOT EXISTS idx_org_learning_entries_authored_by
  ON public.org_learning_entries(authored_by);

-- ============================================================================
-- org_learning_evidence — polymorphic reference to an ACR (wbs_completion_claims)
-- or a Finding (project_evaluation_findings). No FK on source_id (it points
-- to one of two different tables); validity is enforced by the integrity
-- trigger below instead.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_learning_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_id UUID NOT NULL REFERENCES public.org_learning_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('acr', 'finding')),
  source_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learning_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_org_learning_evidence_learning_id
  ON public.org_learning_evidence(learning_id);

-- ============================================================================
-- Integrity trigger: an evidence row's source_id must resolve to a real
-- record the org is allowed to cite — an ACR must currently be Verified, a
-- Finding just needs to exist (Findings have no draft/published state of
-- their own). Also enforces the cited source belongs to the same org as the
-- Learning entry.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_org_learning_evidence_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_learning_org UUID;
  v_source_org UUID;
BEGIN
  SELECT org_id INTO v_learning_org FROM public.org_learning_entries WHERE id = NEW.learning_id;
  IF v_learning_org IS NULL THEN
    RAISE EXCEPTION 'INVALID_LEARNING_EVIDENCE_ENTRY';
  END IF;

  IF NEW.source_type = 'acr' THEN
    SELECT org_id INTO v_source_org
    FROM public.wbs_completion_claims
    WHERE id = NEW.source_id AND status = 'verified';
    IF v_source_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_LEARNING_EVIDENCE_ACR_NOT_VERIFIED';
    END IF;
  ELSIF NEW.source_type = 'finding' THEN
    SELECT org_id INTO v_source_org
    FROM public.project_evaluation_findings
    WHERE id = NEW.source_id;
    IF v_source_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_LEARNING_EVIDENCE_FINDING_NOT_FOUND';
    END IF;
  END IF;

  IF v_source_org <> v_learning_org THEN
    RAISE EXCEPTION 'CROSS_ORG_LEARNING_EVIDENCE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_learning_evidence_integrity ON public.org_learning_evidence;
CREATE TRIGGER trg_org_learning_evidence_integrity
  BEFORE INSERT ON public.org_learning_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_org_learning_evidence_integrity();

CREATE OR REPLACE FUNCTION public.trg_org_learning_entries_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_learning_entries_touch ON public.org_learning_entries;
CREATE TRIGGER trg_org_learning_entries_touch
  BEFORE UPDATE ON public.org_learning_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_org_learning_entries_touch();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.org_learning_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_learning_evidence ENABLE ROW LEVEL SECURITY;

-- Published is visible to any org member; a Draft is visible only to its
-- own author — enforced here, not only in the UI.
DROP POLICY IF EXISTS org_learning_entries_select ON public.org_learning_entries;
CREATE POLICY org_learning_entries_select ON public.org_learning_entries
  FOR SELECT
  USING (
    public.is_org_member(org_id, auth.uid())
    AND (status = 'published' OR authored_by = auth.uid())
  );

DROP POLICY IF EXISTS org_learning_entries_admin_insert ON public.org_learning_entries;
CREATE POLICY org_learning_entries_admin_insert ON public.org_learning_entries
  FOR INSERT
  WITH CHECK (
    public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin')
    AND authored_by = auth.uid()
    AND status = 'draft'
  );

-- A single UPDATE policy covers both editing (content changes, status stays
-- draft) and publishing (status flips to published) — only the author can
-- update, and only while the row is currently draft. Once published, no
-- further UPDATE can target the row at all.
DROP POLICY IF EXISTS org_learning_entries_author_update ON public.org_learning_entries;
CREATE POLICY org_learning_entries_author_update ON public.org_learning_entries
  FOR UPDATE
  USING (authored_by = auth.uid() AND status = 'draft')
  WITH CHECK (
    authored_by = auth.uid()
    AND (
      status = 'draft'
      OR (status = 'published' AND published_by = auth.uid() AND published_at IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS org_learning_entries_author_delete ON public.org_learning_entries;
CREATE POLICY org_learning_entries_author_delete ON public.org_learning_entries
  FOR DELETE
  USING (authored_by = auth.uid() AND status = 'draft');

-- Evidence rows inherit visibility/mutation rights from their parent entry.
DROP POLICY IF EXISTS org_learning_evidence_select ON public.org_learning_evidence;
CREATE POLICY org_learning_evidence_select ON public.org_learning_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_learning_entries e
      WHERE e.id = learning_id
        AND public.is_org_member(e.org_id, auth.uid())
        AND (e.status = 'published' OR e.authored_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS org_learning_evidence_author_insert ON public.org_learning_evidence;
CREATE POLICY org_learning_evidence_author_insert ON public.org_learning_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_learning_entries e
      WHERE e.id = learning_id AND e.authored_by = auth.uid() AND e.status = 'draft'
    )
  );

DROP POLICY IF EXISTS org_learning_evidence_author_delete ON public.org_learning_evidence;
CREATE POLICY org_learning_evidence_author_delete ON public.org_learning_evidence
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_learning_entries e
      WHERE e.id = learning_id AND e.authored_by = auth.uid() AND e.status = 'draft'
    )
  );

-- ============================================================================
-- Privilege grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_learning_entries TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.org_learning_evidence TO authenticated, service_role;
