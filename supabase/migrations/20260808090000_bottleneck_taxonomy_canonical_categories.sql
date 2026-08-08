-- Migration: PM-P4D Bottleneck Taxonomy Implementation V1
-- Path: supabase/migrations/20260808090000_bottleneck_taxonomy_canonical_categories.sql
--
-- Per the PM-P4 Bottleneck contract design (approved) and PM-P5A Finance
-- implementation (complete): Finance = resource-flow domain, Bottleneck =
-- risk domain. The legacy blocker_category set predates that split and no
-- longer matches it — in particular 'donor_disbursement' was really a
-- financial-flow obstruction wearing a Bottleneck label, and 'vendor_delay'
-- was an unnecessarily narrow slice of a broader 'vendor' category.
--
-- Note: lfa_wbs_items.blocker_category was added as a plain VARCHAR(50) in
-- 20260801000002_add_wbs_v2_financial_bottleneck.sql — the wbs_blocker_category
-- Postgres ENUM created in that same migration was never actually applied to
-- the column, so no ALTER TYPE / column-type change is needed here, same as
-- the financial_status column handled in PM-P5A. This migration only remaps
-- data and adds a CHECK constraint the column never had.
--
-- blocker_notes is untouched by this migration (no data loss). No automatic
-- status changes are made anywhere else as a side effect of this remap.

-- 1. Remap legacy category values to their canonical equivalents.
UPDATE public.lfa_wbs_items
SET blocker_category = 'financial'
WHERE blocker_category = 'donor_disbursement';

UPDATE public.lfa_wbs_items
SET blocker_category = 'vendor'
WHERE blocker_category = 'vendor_delay';

-- 2. Enforce the canonical 11-value taxonomy at the DB level going forward.
ALTER TABLE public.lfa_wbs_items
  DROP CONSTRAINT IF EXISTS chk_lfa_wbs_items_blocker_category;

ALTER TABLE public.lfa_wbs_items
  ADD CONSTRAINT chk_lfa_wbs_items_blocker_category
  CHECK (
    blocker_category IS NULL
    OR blocker_category IN (
      'field_condition', 'financial', 'procurement', 'vendor',
      'human_resources', 'stakeholder', 'internal_approval',
      'regulatory', 'security', 'force_majeure', 'other'
    )
  );

COMMENT ON COLUMN public.lfa_wbs_items.blocker_category IS
  'PM Bottleneck risk-domain category (PM-P4D canonical): field_condition, financial, procurement, vendor, human_resources, stakeholder, internal_approval, regulatory, security, force_majeure, other. A financial obstruction is category = financial here, never a FinancialStatus value (see financeModel.ts).';
