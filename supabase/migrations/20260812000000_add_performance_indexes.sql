-- PERF-A1: Database Index Optimization Sprint
--
-- Additive indexes only. No schema changes. No data mutations.
-- Backed by real query patterns identified in the Performance Audit (2026-08).
-- All indexes use IF NOT EXISTS — idempotent, safe for Production.
--
-- Rollback: DROP INDEX for each index below. No data loss.

-- ─── 1. lfa_wbs_items: filtered by project AND status (every PM/PD page) ──
--
-- Query patterns:
--   SELECT ... FROM lfa_wbs_items WHERE lfa_project_id = $1 AND status = $2
--   Used by: Work Plan, WBS Builder, Control Center, executionModel
--
-- Benefit: HIGH — replaces sequential scan on WBS items when filtering by
--   project-scoped execution status. WBS items table grows with every project
--   activity; this index is essential for PM page load performance.
CREATE INDEX IF NOT EXISTS idx_wbs_project_status
  ON public.lfa_wbs_items(lfa_project_id, status);

-- ─── 2. project_budget_commitments: per-budget-item status filtering ──────
--
-- Query patterns:
--   Finance panel: WHERE lfa_project_id = $1 AND budget_item_id = $2 ORDER BY created_at
--   aggregate RPC: WHERE budget_item_id = $1 AND workflow_status = 'approved'
--
-- Benefit: HIGH — Finance panel must filter commitments by budget-item and
--   status on every render. Without this index, Postgres scans all commitments
--   for the project and filters in memory.
CREATE INDEX IF NOT EXISTS idx_commitments_project_item_status
  ON public.project_budget_commitments(lfa_project_id, budget_item_id, workflow_status);

-- ─── 3. project_budget_expenditures: per-budget-item status filtering ─────
--
-- Query patterns:
--   Finance panel: WHERE lfa_project_id = $1 AND budget_item_id = $2 ORDER BY created_at
--   aggregate RPC: WHERE budget_item_id = $1 AND workflow_status = 'posted'
--                 AND reversal_of_id IS NULL
--
-- Benefit: HIGH — Same pattern as commitments. Per-item expenditure query
--   must filter by status (draft vs posted vs reversal).
CREATE INDEX IF NOT EXISTS idx_expenditures_project_item_status
  ON public.project_budget_expenditures(lfa_project_id, budget_item_id, workflow_status);

-- ─── 4. project_funding_receipts: aggregate RPC project + status filter ───
--
-- Query patterns:
--   compute_project_funding_aggregates: WHERE lfa_project_id = $1 AND workflow_status = 'posted'
--   Funding panel: WHERE lfa_project_id = $1 ORDER BY created_at
--
-- Benefit: MEDIUM — compute_project_funding_aggregates RPC filters all posted
--   receipts for a project. Receipt table grows with every cash-in entry.
CREATE INDEX IF NOT EXISTS idx_receipts_project_status
  ON public.project_funding_receipts(lfa_project_id, workflow_status);

COMMENT ON INDEX public.idx_wbs_project_status IS
  'PERF-A1: Composite index for project-scoped WBS status filtering. Supports Work Plan, WBS Builder, Control Center.';
COMMENT ON INDEX public.idx_commitments_project_item_status IS
  'PERF-A1: Composite index for per-budget-item commitment status filtering. Supports Finance panel and aggregate RPC.';
COMMENT ON INDEX public.idx_expenditures_project_item_status IS
  'PERF-A1: Composite index for per-budget-item expenditure status filtering. Supports Finance panel and aggregate RPC.';
COMMENT ON INDEX public.idx_receipts_project_status IS
  'PERF-A1: Composite index for project-scoped receipt status filtering. Supports funding aggregate RPC.';
