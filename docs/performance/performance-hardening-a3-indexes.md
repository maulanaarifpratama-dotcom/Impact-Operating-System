# Performance Hardening A3 — Database Index Optimization

## Date

2026-08-10

## Summary

Implemented 4 additive composite indexes based on real query patterns identified
in the Performance Audit (2026-08). All indexes are additive (`IF NOT EXISTS`),
have no business logic impact, and can be rolled back with a simple `DROP INDEX`.

---

## Indexes Added

### 1. `idx_wbs_project_status`

| Property | Value |
|----------|-------|
| Table | `lfa_wbs_items` |
| Columns | `(lfa_project_id, status)` |
| Query Patterns Served | Work Plan, WBS Builder, Control Center, executionModel |
| Benefit | **HIGH** — Every PM page filters WBS items by project + execution status. WBS items table is the largest and most-queried table in the system. |

### 2. `idx_commitments_project_item_status`

| Property | Value |
|----------|-------|
| Table | `project_budget_commitments` |
| Columns | `(lfa_project_id, budget_item_id, workflow_status)` |
| Query Patterns Served | Finance panel per-item filtering, `compute_budget_aggregates` RPC |
| Benefit | **HIGH** — Finance panel filters commitments per budget item by status on every render. Without this index, Postgres must scan all commitments for the project. |

### 3. `idx_expenditures_project_item_status`

| Property | Value |
|----------|-------|
| Table | `project_budget_expenditures` |
| Columns | `(lfa_project_id, budget_item_id, workflow_status)` |
| Query Patterns Served | Finance panel per-item filtering, `compute_budget_aggregates` RPC |
| Benefit | **HIGH** — Same pattern as commitments. Per-item expenditure filtering by draft/posted/reversal status. |

### 4. `idx_receipts_project_status`

| Property | Value |
|----------|-------|
| Table | `project_funding_receipts` |
| Columns | `(lfa_project_id, workflow_status)` |
| Query Patterns Served | `compute_project_funding_aggregates` RPC, Funding panel |
| Benefit | **MEDIUM** — Aggregate RPC filters all posted receipts for a project. Receipt table grows with each cash-in entry. |

---

## Migration

**File:** `supabase/migrations/20260812000000_add_performance_indexes.sql`

- All `CREATE INDEX IF NOT EXISTS` — idempotent
- No data mutations
- No schema changes
- No RLS changes
- No auth changes

## Rollback

```sql
DROP INDEX IF EXISTS public.idx_wbs_project_status;
DROP INDEX IF EXISTS public.idx_commitments_project_item_status;
DROP INDEX IF EXISTS public.idx_expenditures_project_item_status;
DROP INDEX IF EXISTS public.idx_receipts_project_status;
```

## Remaining Opportunities (Deferred)

| Table | Columns | Priority | Rationale |
|-------|---------|----------|-----------|
| `lfa_meal_tracking_entries` | `(lfa_project_id, meal_item_id)` | P2 | Dashboard filters by project + indicator |
| `wbs_completion_claims` | `(lfa_project_id, status)` | P2 | Control Center and MEAL page |
| `project_evaluation_findings` | `(lfa_project_id, severity)` | P3 | Low row count; defer until evaluation usage grows |
| `project_funding_installments` | `(funding_source_id, workflow_status)` | P3 | Installment count is typically low per project |

## Validation

- Migration syntax: Validated (additive, idempotent, IF NOT EXISTS)
- App compatibility: No changes needed — indexes are transparent to application
- Contract: No violations — indexes are read-optimization only
- RLS: Unchanged
- Auth: Unchanged
- Rollback: Safe (DROP INDEX)

---

## Production Deployment

Apply via Supabase SQL Editor:
```
supabase/migrations/20260812000000_add_performance_indexes.sql
```

Verify:
```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%wbs%' OR indexname LIKE 'idx_%commitments%' OR indexname LIKE 'idx_%expenditures%' OR indexname LIKE 'idx_%receipts%';
```
