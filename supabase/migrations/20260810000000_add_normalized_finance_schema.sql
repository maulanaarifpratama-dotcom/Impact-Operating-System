-- PM-F2B1: Normalized Finance Database Foundation — Schema and RLS
--
-- Adds commitment and expenditure child tables for Project Management Finance,
-- fixes the DEFAULT 0 bug on legacy actual_amount_idr, and enforces
-- project-scoped composite foreign keys, tenant isolation, and owner-only RLS.
--
-- Programme Design Budget (lfa_budget_items) is NOT modified beyond the
-- default fix. No existing rows are mutated. No scalar committed is added to
-- lfa_budget_items. No stored budget-item lifecycle status is added.

-- ─── 1. Fix DEFAULT 0 on actual_amount_idr (legacy compatibility) ──────────

-- New rows must not silently assume actual = 0. This is a legacy scalar;
-- normalized expenditures (project_budget_expenditures) are the new source
-- of truth for actual financial data. Once PM-F2B2 establishes read precedence,
-- this column may be deprecated entirely.
ALTER TABLE public.lfa_budget_items
  ALTER COLUMN actual_amount_idr DROP DEFAULT;

COMMENT ON COLUMN public.lfa_budget_items.actual_amount_idr IS
  'Legacy scalar actual (deprecated). PM-F2 normalized actual lives in project_budget_expenditures. Default removed — new rows get NULL, not 0. Do NOT mutate existing zero values without provenance.';

-- ─── 2. Prepare composite FK targets ──────────────────────────────────────

-- lfa_budget_items needs a composite unique so child tables can reference
-- (budget_item_id, lfa_project_id) — same pattern as PD-M2's
-- lfa_wbs_items(id, lfa_project_id) composite UNIQUE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lfa_budget_items_id_lfa_project_id_key'
      AND conrelid = 'public.lfa_budget_items'::regclass
  ) THEN
    ALTER TABLE public.lfa_budget_items
      ADD CONSTRAINT lfa_budget_items_id_lfa_project_id_key
      UNIQUE (id, lfa_project_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lfa_budget_items_id_project_org_key'
      AND conrelid = 'public.lfa_budget_items'::regclass
  ) THEN
    ALTER TABLE public.lfa_budget_items
      ADD CONSTRAINT lfa_budget_items_id_project_org_key
      UNIQUE (id, lfa_project_id, org_id);
  END IF;
END;
$$;

-- ─── 3. Create project_budget_commitments ─────────────────────────────────

CREATE TABLE public.project_budget_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  budget_item_id UUID NOT NULL,
  amount_idr NUMERIC NOT NULL CHECK (amount_idr > 0),
  workflow_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  description TEXT,
  counterparty_name TEXT,
  reference_number TEXT,
  expected_realization_date DATE,
  evidence_url TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  decision_note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Workflow-state × actor/timestamp consistency (single-row checks only)
  CONSTRAINT commitment_approved_requires_actor
    CHECK (workflow_status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT commitment_rejected_requires_actor
    CHECK (workflow_status <> 'rejected' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL)),
  CONSTRAINT commitment_cancelled_requires_actor
    CHECK (workflow_status <> 'cancelled' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)),
  CONSTRAINT commitment_submitted_requires_actor
    CHECK (workflow_status <> 'submitted' OR (submitted_by IS NOT NULL AND submitted_at IS NOT NULL)),
  CONSTRAINT commitment_draft_no_conflict_metadata
    CHECK (workflow_status <> 'draft' OR (
      approved_by IS NULL AND approved_at IS NULL
      AND rejected_by IS NULL AND rejected_at IS NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL
    )),

  -- Project-scoped composite FK: commitment → budget_item in the same project
  CONSTRAINT project_budget_commitments_id_project_key
    UNIQUE (id, lfa_project_id),
  CONSTRAINT project_budget_commitments_identity_key
    UNIQUE (id, lfa_project_id, org_id, budget_item_id),
  CONSTRAINT fk_commitment_budget_item_project_org
    FOREIGN KEY (budget_item_id, lfa_project_id, org_id)
    REFERENCES public.lfa_budget_items(id, lfa_project_id, org_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_commitments_org_id ON public.project_budget_commitments(org_id);
CREATE INDEX IF NOT EXISTS idx_commitments_project_id ON public.project_budget_commitments(lfa_project_id);
CREATE INDEX IF NOT EXISTS idx_commitments_budget_item_id ON public.project_budget_commitments(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON public.project_budget_commitments(workflow_status);

COMMENT ON TABLE public.project_budget_commitments IS
  'PM-F2 normalized commitment ledger. One budget item can have many commitments. Persisted statuses: draft, submitted, approved, rejected, cancelled. Derived statuses (active, partially_realized, realized) are computed from linked posted expenditures — never stored.';

-- ─── 4. Create project_budget_expenditures ────────────────────────────────

CREATE TABLE public.project_budget_expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  budget_item_id UUID NOT NULL,
  commitment_id UUID,
  amount_idr NUMERIC NOT NULL CHECK (amount_idr > 0),
  workflow_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'submitted', 'posted', 'rejected')),
  description TEXT,
  transaction_date DATE,
  reference_number TEXT,
  evidence_url TEXT,
  reversal_of_id UUID,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  decision_note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Workflow-state × actor/timestamp consistency
  CONSTRAINT expenditure_posted_requires_actor
    CHECK (workflow_status <> 'posted' OR (posted_by IS NOT NULL AND posted_at IS NOT NULL)),
  CONSTRAINT expenditure_rejected_requires_actor
    CHECK (workflow_status <> 'rejected' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL)),
  CONSTRAINT expenditure_submitted_requires_actor
    CHECK (workflow_status <> 'submitted' OR (submitted_by IS NOT NULL AND submitted_at IS NOT NULL)),
  CONSTRAINT expenditure_draft_no_conflict_metadata
    CHECK (workflow_status <> 'draft' OR (
      posted_by IS NULL AND posted_at IS NULL
      AND rejected_by IS NULL AND rejected_at IS NULL
    )),

  -- Reversal self-integrity
  CONSTRAINT expenditure_reversal_not_self
    CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),

  -- Project-scoped composite FK: expenditure → budget_item in same project
  CONSTRAINT project_budget_expenditures_id_identity_key
    UNIQUE (id, lfa_project_id, org_id, budget_item_id),
  CONSTRAINT fk_expenditure_budget_item_project_org
    FOREIGN KEY (budget_item_id, lfa_project_id, org_id)
    REFERENCES public.lfa_budget_items(id, lfa_project_id, org_id)
    ON DELETE RESTRICT,

  -- Project-scoped composite FK: expenditure → commitment in same project
  CONSTRAINT fk_expenditure_commitment_identity
    FOREIGN KEY (commitment_id, lfa_project_id, org_id, budget_item_id)
    REFERENCES public.project_budget_commitments(id, lfa_project_id, org_id, budget_item_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_expenditure_reversal_identity
    FOREIGN KEY (reversal_of_id, lfa_project_id, org_id, budget_item_id)
    REFERENCES public.project_budget_expenditures(id, lfa_project_id, org_id, budget_item_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_expenditures_org_id ON public.project_budget_expenditures(org_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_project_id ON public.project_budget_expenditures(lfa_project_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_budget_item_id ON public.project_budget_expenditures(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_commitment_id ON public.project_budget_expenditures(commitment_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_status ON public.project_budget_expenditures(workflow_status);
CREATE INDEX IF NOT EXISTS idx_expenditures_reversal_of ON public.project_budget_expenditures(reversal_of_id) WHERE reversal_of_id IS NOT NULL;

COMMENT ON TABLE public.project_budget_expenditures IS
  'PM-F2 normalized expenditure ledger. Each row is a posted, submitted, draft, or rejected expenditure. Reversal is a new row with reversal_of_id pointing to the original posted expenditure — the original is never edited or deleted. Net actual = SUM(posted amount) − SUM(valid posted reversals).';

-- ─── 5. RLS — Enable and create policies ──────────────────────────────────

ALTER TABLE public.project_budget_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_expenditures ENABLE ROW LEVEL SECURITY;

-- Commitment SELECT: any org member can read
CREATE POLICY "commitments_select" ON public.project_budget_commitments
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

-- Direct client writes are intentionally unavailable. All lifecycle changes use
-- SECURITY DEFINER RPCs that derive organization identity from the budget item.
REVOKE ALL ON TABLE public.project_budget_commitments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.project_budget_expenditures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_budget_commitments TO authenticated, service_role;
GRANT SELECT ON TABLE public.project_budget_expenditures TO authenticated, service_role;
GRANT ALL ON TABLE public.project_budget_commitments TO service_role;
GRANT ALL ON TABLE public.project_budget_expenditures TO service_role;

-- Dedicated immutable audit ledger. This avoids replacing the evolving CHECK
-- allowlists on project_activity_events during a Production migration.
CREATE TABLE public.project_budget_finance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('budget_commitment', 'budget_expenditure')),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'budget_commitment_created', 'budget_commitment_updated',
    'budget_commitment_submitted', 'budget_commitment_approved',
    'budget_commitment_rejected', 'budget_commitment_cancelled',
    'budget_expenditure_created', 'budget_expenditure_updated',
    'budget_expenditure_submitted', 'budget_expenditure_posted',
    'budget_expenditure_rejected', 'budget_expenditure_reversed'
  )),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_finance_events_scope
  ON public.project_budget_finance_events(org_id, lfa_project_id, created_at DESC);
ALTER TABLE public.project_budget_finance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_finance_events_select" ON public.project_budget_finance_events
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));
REVOKE ALL ON TABLE public.project_budget_finance_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_budget_finance_events TO authenticated, service_role;
GRANT ALL ON TABLE public.project_budget_finance_events TO service_role;
