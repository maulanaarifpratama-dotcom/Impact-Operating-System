# DevOps Agent Log — Tier 3 Operation

## PM-F2B1: Normalized Finance Database Foundation

| Field | Value |
|-------|-------|
| **Date** | 2026-08-10 |
| **Agent** | AI coding agent (open-code session) |
| **Tier** | 3 (COMPLEX — new tables, RLS, RPC, Production schema change) |
| **Commit** | `d74a2e7` — `feat(finance): add normalized commitment and expenditure ledger (PM-F2B1)` |
| **Migrations** | `20260810000000_add_normalized_finance_schema.sql` (schema, RLS, default fix) |
|              | `20260810010000_add_finance_lifecycle_rpc.sql` (lifecycle RPCs, audit events, grants) |
| **Predecessor** | `588b31d` — PM-F1 canonical finance model |
| **Decision** | `ADD_NORMALIZED_COMMITMENT_AND_EXPENDITURE_ENTITIES` (per PM-F2A audit) |

## Changes Summary

### Schema
- `ALTER TABLE lfa_budget_items ALTER COLUMN actual_amount_idr DROP DEFAULT` — fixes DEFAULT 0 bug
- Added `lfa_budget_items_id_lfa_project_id_key` UNIQUE(id, lfa_project_id) for composite FK targets
- Created `project_budget_commitments` — normalized commitment ledger (13 FK columns, 5 CHECK constraints)
- Created `project_budget_expenditures` — normalized expenditure ledger (12 FK columns, 4 CHECK constraints)

### RLS
- 4 policies for `project_budget_commitments`: SELECT (member), INSERT/UPDATE/DELETE (owner)
- 4 policies for `project_budget_expenditures`: SELECT (member), INSERT/UPDATE/DELETE (owner)
- All cross-org checks via `is_org_member()` and role via `get_org_role()`

### Composite FKs
- `(budget_item_id, lfa_project_id)` → `lfa_budget_items(id, lfa_project_id)` for both tables
- `(commitment_id, lfa_project_id)` → `project_budget_commitments(id, lfa_project_id)` (expenditure, nullable)

### RPCs (12 SECURITY DEFINER functions)
- Commitment: create_draft, update_draft, submit, approve, reject, cancel
- Expenditure: create_draft, update_draft, submit, post (with commitment realization enforcement), reject, reverse (immutable)
- Helper: `assert_finance_owner`, `compute_budget_aggregates`

### Audit Events
- Extended `project_activity_events` entity_type: +`budget_commitment`, +`budget_expenditure`
- Extended `project_activity_events` event_type: +12 new event types
- All lifecycle actions produce audit events with server-controlled actor

### Programme Design
- No changes beyond `DROP DEFAULT` on `actual_amount_idr`
- No scalar `committed`, no stored budget-item lifecycle status

## Test Results
- Static contract tests: 80 PASS
- Postgres integration: 12 skipped (local Docker unavailable)
- Existing PM tests: 95 PASS (no regressions)
- Typecheck: PAS (pre-existing errors only)
- Build: PASS

## Production Preflight
- Skipped — Docker unavailable, DB password not available in session
- Migration list confirms `20260810000000` and `20260810010000` are pending (local-only)

## Deployment Status
- **Migrations committed and pushed**: YES (`d74a2e7`, main)
- **Migrations applied to Production**: PENDING — Manual SQL Editor deployment required
- **Deployment instructions**: See below

## Manual Deployment Steps
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/uncsvkvkaijzydndyutp/sql
2. Copy contents of `supabase/migrations/20260810000000_add_normalized_finance_schema.sql` → Execute
3. Copy contents of `supabase/migrations/20260810010000_add_finance_lifecycle_rpc.sql` → Execute
4. Verify: `SELECT relname FROM pg_class WHERE relname LIKE 'project_budget_%' AND relnamespace = 'public'::regnamespace;`
5. Verify: `SELECT actual_amount_idr, column_default FROM information_schema.columns WHERE table_name = 'lfa_budget_items' AND column_name = 'actual_amount_idr';`

## Rollback Path
```sql
DROP FUNCTION IF EXISTS compute_budget_aggregates CASCADE;
DROP FUNCTION IF EXISTS reverse_expenditure CASCADE;
DROP FUNCTION IF EXISTS reject_expenditure CASCADE;
DROP FUNCTION IF EXISTS post_expenditure CASCADE;
DROP FUNCTION IF EXISTS submit_expenditure CASCADE;
DROP FUNCTION IF EXISTS update_expenditure_draft CASCADE;
DROP FUNCTION IF EXISTS create_expenditure_draft CASCADE;
DROP FUNCTION IF EXISTS cancel_commitment CASCADE;
DROP FUNCTION IF EXISTS reject_commitment CASCADE;
DROP FUNCTION IF EXISTS approve_commitment CASCADE;
DROP FUNCTION IF EXISTS submit_commitment CASCADE;
DROP FUNCTION IF EXISTS update_commitment_draft CASCADE;
DROP FUNCTION IF EXISTS create_commitment_draft CASCADE;
DROP FUNCTION IF EXISTS assert_finance_owner CASCADE;
DROP TABLE IF EXISTS project_budget_expenditures CASCADE;
DROP TABLE IF EXISTS project_budget_commitments CASCADE;
ALTER TABLE lfa_budget_items DROP CONSTRAINT IF EXISTS lfa_budget_items_id_lfa_project_id_key;
-- Restore DEFAULT 0 only if necessary:
-- ALTER TABLE lfa_budget_items ALTER COLUMN actual_amount_idr SET DEFAULT 0;
```
DO NOT rollback if tables contain Production data without export+review.
