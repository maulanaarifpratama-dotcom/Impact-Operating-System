-- PM-F3A: Project Funding and Receipt Foundation — Schema and RLS
--
-- Adds funding sources, installments, and receipts for project income
-- tracking. All direct client writes are denied; mutations go through
-- SECURITY DEFINER RPCs that derive organization identity from the funding
-- source's parent budget item or project.
--
-- Existing commitment/expenditure tables are NOT modified.
-- Programme Design is NOT modified.

-- ─── 1. Prepare composite FK targets ──────────────────────────────────────

-- lfa_budget_items composite identity is needed for budget-scoped aggregates
DO $$
BEGIN
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

-- ─── 2. Create project_funding_sources ────────────────────────────────────

CREATE TABLE public.project_funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  source_name TEXT NOT NULL,
  funding_type TEXT NOT NULL DEFAULT 'grant'
    CHECK (funding_type IN ('grant', 'donation', 'government', 'corporate', 'internal', 'loan', 'other')),
  agreement_amount_idr NUMERIC NOT NULL CHECK (agreement_amount_idr > 0),
  currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency <> ''),
  agreement_number TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  evidence_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
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

  CONSTRAINT funding_source_approved_requires_actor
    CHECK (workflow_status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT funding_source_rejected_requires_actor
    CHECK (workflow_status <> 'rejected' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL)),
  CONSTRAINT funding_source_cancelled_requires_actor
    CHECK (workflow_status <> 'cancelled' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)),
  CONSTRAINT funding_source_submitted_requires_actor
    CHECK (workflow_status <> 'submitted' OR (submitted_by IS NOT NULL AND submitted_at IS NOT NULL)),
  CONSTRAINT funding_source_draft_no_conflict_metadata
    CHECK (workflow_status <> 'draft' OR (
      approved_by IS NULL AND approved_at IS NULL
      AND rejected_by IS NULL AND rejected_at IS NULL
      AND cancelled_by IS NULL AND cancelled_at IS NULL
    )),

  CONSTRAINT funding_source_id_project_org_key UNIQUE (id, lfa_project_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_funding_sources_org ON public.project_funding_sources(org_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_project ON public.project_funding_sources(lfa_project_id);

COMMENT ON TABLE public.project_funding_sources IS
  'PM-F3 normalized funding source ledger. One project can have many funding sources. Persisted statuses: draft, submitted, approved, rejected, cancelled.';

-- ─── 3. Create project_funding_installments ──────────────────────────────

CREATE TABLE public.project_funding_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  funding_source_id UUID NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  installment_name TEXT,
  scheduled_amount_idr NUMERIC NOT NULL CHECK (scheduled_amount_idr > 0),
  due_date DATE NOT NULL,
  description TEXT,
  evidence_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'scheduled', 'cancelled')),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  decision_note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT installment_cancelled_requires_actor
    CHECK (workflow_status <> 'cancelled' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)),

  -- Unique installment number per funding source
  CONSTRAINT installment_source_number_unique UNIQUE (funding_source_id, installment_number),

  -- Project-scoped composite FK
  CONSTRAINT installment_id_project_org_key UNIQUE (id, lfa_project_id, org_id),
  CONSTRAINT fk_installment_funding_source_project_org
    FOREIGN KEY (funding_source_id, lfa_project_id, org_id)
    REFERENCES public.project_funding_sources(id, lfa_project_id, org_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_installments_funding_source ON public.project_funding_installments(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_installments_org ON public.project_funding_installments(org_id);

COMMENT ON TABLE public.project_funding_installments IS
  'PM-F3 installment schedule per funding source. Derived states (partially_received, fully_received, overdue) are computed from receipt records — never stored.';

-- ─── 4. Create project_funding_receipts ──────────────────────────────────

CREATE TABLE public.project_funding_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  funding_source_id UUID NOT NULL,
  installment_id UUID,
  amount_idr NUMERIC NOT NULL CHECK (amount_idr > 0),
  currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency <> ''),
  receipt_date DATE NOT NULL,
  reference_number TEXT,
  bank_account_label TEXT,
  description TEXT,
  evidence_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'submitted', 'posted', 'rejected')),
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

  CONSTRAINT receipt_posted_requires_actor
    CHECK (workflow_status <> 'posted' OR (posted_by IS NOT NULL AND posted_at IS NOT NULL)),
  CONSTRAINT receipt_rejected_requires_actor
    CHECK (workflow_status <> 'rejected' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL)),
  CONSTRAINT receipt_submitted_requires_actor
    CHECK (workflow_status <> 'submitted' OR (submitted_by IS NOT NULL AND submitted_at IS NOT NULL)),
  CONSTRAINT receipt_draft_no_conflict_metadata
    CHECK (workflow_status <> 'draft' OR (posted_by IS NULL AND posted_at IS NULL AND rejected_by IS NULL AND rejected_at IS NULL)),
  CONSTRAINT receipt_reversal_not_self
    CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),

  -- Project-scoped composite FKs
  CONSTRAINT receipt_id_project_org_key UNIQUE (id, lfa_project_id, org_id),
  CONSTRAINT fk_receipt_funding_source_project_org
    FOREIGN KEY (funding_source_id, lfa_project_id, org_id)
    REFERENCES public.project_funding_sources(id, lfa_project_id, org_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_receipt_installment_identity
    FOREIGN KEY (installment_id, lfa_project_id, org_id)
    REFERENCES public.project_funding_installments(id, lfa_project_id, org_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_receipt_reversal_identity
    FOREIGN KEY (reversal_of_id, lfa_project_id, org_id)
    REFERENCES public.project_funding_receipts(id, lfa_project_id, org_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_receipts_funding_source ON public.project_funding_receipts(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_receipts_installment ON public.project_funding_receipts(installment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_org ON public.project_funding_receipts(org_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.project_funding_receipts(workflow_status);

COMMENT ON TABLE public.project_funding_receipts IS
  'PM-F3 receipt (cash-in) ledger. Receipts may optionally link to an installment. Reversal is a new record with reversal_of_id — original is never edited or deleted. Net received = SUM(posted original) − SUM(posted reversal).';

-- ─── 5. Dedicated Funding Events Table ────────────────────────────────────

CREATE TABLE public.project_funding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'funding_source', 'funding_installment', 'funding_receipt'
  )),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'funding_source_created', 'funding_source_updated',
    'funding_source_submitted', 'funding_source_approved',
    'funding_source_rejected', 'funding_source_cancelled',
    'funding_installment_created', 'funding_installment_updated',
    'funding_installment_scheduled', 'funding_installment_cancelled',
    'funding_receipt_created', 'funding_receipt_updated',
    'funding_receipt_submitted', 'funding_receipt_posted',
    'funding_receipt_rejected', 'funding_receipt_reversed'
  )),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funding_events_scope
  ON public.project_funding_events(org_id, lfa_project_id, created_at DESC);

ALTER TABLE public.project_funding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funding_events_select" ON public.project_funding_events
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

REVOKE ALL ON TABLE public.project_funding_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_funding_events TO authenticated, service_role;
GRANT ALL ON TABLE public.project_funding_events TO service_role;

-- ─── 6. RLS and Table Privileges ─────────────────────────────────────────

ALTER TABLE public.project_funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_funding_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_funding_receipts ENABLE ROW LEVEL SECURITY;

-- Sources: org members can read
CREATE POLICY "funding_sources_select" ON public.project_funding_sources
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

-- Installments: org members can read
CREATE POLICY "funding_installments_select" ON public.project_funding_installments
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

-- Receipts: org members can read
CREATE POLICY "funding_receipts_select" ON public.project_funding_receipts
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

-- Direct client writes are disabled — all mutations via SECURITY DEFINER RPCs
REVOKE ALL ON TABLE public.project_funding_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.project_funding_installments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.project_funding_receipts FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.project_funding_sources TO authenticated, service_role;
GRANT SELECT ON TABLE public.project_funding_installments TO authenticated, service_role;
GRANT SELECT ON TABLE public.project_funding_receipts TO authenticated, service_role;

GRANT ALL ON TABLE public.project_funding_sources TO service_role;
GRANT ALL ON TABLE public.project_funding_installments TO service_role;
GRANT ALL ON TABLE public.project_funding_receipts TO service_role;
