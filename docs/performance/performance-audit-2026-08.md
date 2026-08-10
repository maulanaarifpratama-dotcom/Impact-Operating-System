# Impactory Performance Audit — August 2026

## Summary

| Domain | Score | Status |
|--------|-------|--------|
| React Query Health | 3/5 | Used but inconsistent: staleTime only in some hooks, queryKey patterns vary |
| CRUD Query Health | 3/5 | Explicit field selection is standard; 30 legacy `select('*')` sites remain |
| N+1 Query Health | 4/5 | No classic loop-fetch patterns found; Promise.all used for parallel queries |
| Index Health | 3/5 | Composite FKs present but some common filter columns lack dedicated indexes |
| Cache Health | 3/5 | useMemo and useCallback used; React Query cache not systematically tuned |
| Reporting/Analytics Health | 2/5 | Real-time aggregations in dashboard; no materialized views or precomputed snapshots |
| **Overall** | **3.0/5** | **Functional — significant optimization opportunities exist** |

---

## 1. React Query Audit

### Current State

- **20 files** use React Query (`useQuery`, `useMutation`)
- **24 lines** reference `staleTime`, `queryKey`, or `invalidateQueries`
- Query pattern is inconsistent: some hooks set `staleTime: 5 * 60_000` (5 min), most use defaults

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Inconsistent staleTime | MEDIUM | `useOrgRole` sets 5-min staleTime. Most other queries use default (0). Results in unnecessary refetches on every mount. |
| No gcTime tuning | LOW | Default gcTime (5 min) keeps inactive query data in memory. Acceptable for current scale. |
| No query invalidation strategy | MEDIUM | After Finance lifecycle mutations, pages call `loadAll()` (manual refetch) instead of `queryClient.invalidateQueries()`. This works but duplicates fetch logic. |
| Duplicate query keys | LOW | `ProgramHealthSummary` uses `['program_health_wbs', orgId, projectId]` pattern — clean. No duplicate key violations found. |
| Missing query error boundaries | LOW | Some queries silently catch errors without user feedback. |

### Recommendations

1. **Standardize staleTime** across all queries — 30s for real-time data (Finance), 5min for reference data (WBS structure).
2. **Add queryClient.invalidateQueries()** after Finance lifecycle mutations instead of manual `loadAll()` calls.
3. **Add error boundaries** for queries that are critical to UX (P2).

---

## 2. CRUD Query Audit

### Current State

- **30 files** use `select('*')` — many are dashboard components (ImpactDashboard, EROIStandalone, DonorCRM) or legacy code
- PM Finance pages generally use explicit field selection (best practice)
- `ProjectBudgetPage.tsx` uses 4 parallel `Promise.all` queries with explicit fields

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Legacy `select('*')` in dashboards | MEDIUM | `ImpactDashboard.tsx`, `EROIStandalone.tsx`, `DonorCRM.tsx`, `DashboardHome.tsx` fetch all columns. These pages pull large result sets that include unused columns (e.g., carbon_description, ai_suggestion on WBS items). |
| `select('*')` in repeated queries | LOW | `ProgramHealthSummary` fetches full WBS + budget + MEAL rows for dashboard display. Only 5-6 fields per row are actually used. |
| PM pages use explicit fields | GOOD | `ProjectBudgetPage`, `FinanceCommitmentPanel` select only needed columns. |
| Parallel queries used correctly | GOOD | `Promise.all` pattern in `loadAll()` avoids waterfall. |

### Recommendations

1. Replace `select('*')` with explicit field lists in dashboard components (P2).
2. For `ProgramHealthSummary`, select only `level`, `status`, `progress_percent`, `end_date` from WBS items instead of all columns (P2).
3. Audit `ImpactDashboard` and `DonorCRM` for unused column fetches (P3).

---

## 3. N+1 Query Audit

### Current State

- **No classic N+1 loop-fetch patterns found.** All data loading in PM pages uses `Promise.all` for parallel queries.
- Materialization RPCs use single-pass SQL with CTEs — no cursor-based loops.

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| No loop-fetch N+1 | GOOD | No `for (item of items) { await supabase.from(...) }` patterns found |
| `Promise.all` used correctly | GOOD | `ProjectBudgetPage.loadAll()` does 4 parallel fetches |
| `compute_budget_aggregates` RPC | GOOD | Single SQL query with CTEs; no per-item roundtrips |
| Per-item ledger check uses single query | GOOD | PM-F2B2C uses single `select('budget_item_id')` query per table, not per-budget-item |

### Recommendations

- None urgent. Current architecture avoids N+1 patterns.

---

## 4. Database Access Audit

### Current State

- Composite FKs exist on all Finance tables (commitment, expenditure, funding) — project-scoped lookups are indexed
- `is_org_member()` RLS helper is SECURITY DEFINER with `STABLE` — cached within transaction
- `compute_budget_aggregates` and `compute_project_funding_aggregates` are single SQL CTE queries

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Repeated org_id + project_id filter in RLS | LOW | Every query runs `is_org_member(org_id, auth.uid())` — acceptable; Postgres optimizes via index |
| No query batching for dashboards | MEDIUM | `ProgramHealthSummary` runs 4 independent queries; could be merged into single RPC |
| `select('*')` on WBS items in dashboard | LOW | WBS items have 20+ columns including carbon fields; dashboard only needs 5 |
| Finance aggregate RPCs use CTEs | GOOD | Single roundtrip for per-item aggregation |

### Recommendations

1. Consider a single `compute_project_health_snapshot` RPC for dashboard that returns WBS + budget + MEAL aggregates in one call (P2).
2. Add `select()` field restriction to dashboard data fetches (P2).

---

## 5. Index Opportunity Audit

### Current State

- Composite unique constraints exist for all composite FK targets
- Standard indexes on `org_id`, `lfa_project_id`, and `budget_item_id` on Finance tables
- No explicit indexes on frequently queried status columns

### Index Opportunities

| Table | Column(s) | Value | Rationale |
|-------|-----------|-------|-----------|
| `lfa_wbs_items` | `(lfa_project_id, status)` | HIGH | Filtered by project AND status in every PM page |
| `lfa_budget_items` | `(lfa_project_id, wbs_item_id)` | MEDIUM | Already covered by composite FK index in PD-M2 |
| `project_budget_commitments` | `(lfa_project_id, budget_item_id, workflow_status)` | HIGH | Filtered per-budget-item by status in Finance panel |
| `project_budget_expenditures` | `(lfa_project_id, budget_item_id, workflow_status)` | HIGH | Same pattern as commitments |
| `project_funding_receipts` | `(lfa_project_id, workflow_status)` | MEDIUM | Aggregate RPC filters by project + posted |
| `lfa_meal_tracking_entries` | `(lfa_project_id, meal_item_id)` | MEDIUM | Dashboard filters by project + indicator |
| `wbs_completion_claims` | `(lfa_project_id, status)` | MEDIUM | Control Center and MEAL page filter by project + status |
| `project_evaluation_findings` | `(lfa_project_id, severity)` | LOW | Currently low row count; index if evaluation usage grows |

### Recommendations

1. Add composite index `(lfa_project_id, status)` on `lfa_wbs_items` (P1 — affects all PM/PD pages).
2. Add composite index `(lfa_project_id, budget_item_id, workflow_status)` on commitments and expenditures (P1 — affects Finance panel).
3. Add composite index `(lfa_project_id, workflow_status)` on funding receipts (P2).
4. Verify existing PD-M2 composite FK indexes cover budget-to-WBS joins (P2).

---

## 6. Cache Strategy Audit

### Current State

- React Query provides client-side cache out of the box
- `useMemo` used extensively for derived computations (budget snapshots, stage grouping, activity rows)
- `useCallback` used for event handlers and data loading
- No SWR, no localStorage cache, no service worker cache

### Findings

| Finding | Severity | Detail |
|---------|--------|--------|
| useMemo effective for derived data | GOOD | `computeBudgetSnapshot`, `computeStageBudgets` are memoized correctly |
| No redundant computations | GOOD | `ledgerItems`, `ledgerSummary`, `financeHealth` all use useMemo with correct deps |
| React Query cache not systematically tuned | MEDIUM | Most queries use default cache settings; staleTime inconsistent |
| No optimistic updates | LOW | Finance mutations wait for RPC response before updating UI — correct for financial data |
| No prefetching | LOW | Next-page navigation doesn't prefetch data; acceptable for current UX |
| Derived state recomputed on unrelated changes | LOW | `activitiesByStage` in ProjectBudgetPage iterates all items on any rawWbsItems change |

### Recommendations

1. Set consistent staleTime: 30s for Finance data, 5min for structural data (P2).
2. Consider `keepPreviousData` for paginated lists (P3).
3. Extract `activitiesByStage` to a separate useMemo with narrower dependencies (P3).

---

## 7. Reporting / Analytics Audit

### Current State

- `ProgramHealthSummary` computes 3-lens rollup (physical, financial, results) in real-time per query
- `ControlCenterModel.buildControlCenterSnapshot()` recomputes all metrics from raw inputs
- `MonthlyImpactReport`, `SustainabilityReports` compute aggregations client-side
- No materialized views or precomputed aggregates in database

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Real-time dashboard aggregation | MEDIUM | `ProgramHealthSummary` recomputes all metrics on every mount/data change |
| `buildControlCenterSnapshot` full recompute | MEDIUM | Every call walks all WBS items, budget items, bottleneck items, and MEAL entries |
| No report snapshot cache | LOW | Reports re-aggregate on every generation; acceptable for current report frequency |
| `compute_project_funding_aggregates` RPC | GOOD | Single SQL query with CTEs; server-side computation |
| `compute_budget_aggregates` RPC | GOOD | Single SQL query; per-item output |

### Recommendations

1. Cache `ControlCenterProjectSnapshot` at React Query level with 60s staleTime (P2).
2. Consider database-level materialized view for project health rollup if dashboard becomes slow at scale (P3).
3. Pre-compute report snapshots on generation; don't recompute on every view (P3).

---

## 8. Remediation Roadmap

### P0 — Immediate (< 1 day)

| Task | Impact | Effort |
|------|--------|--------|
| None — system is functional at current scale | — | — |

### P1 — Short-term (< 1 week)

| Task | Impact | Effort |
|------|--------|--------|
| Add composite index `(lfa_project_id, status)` on `lfa_wbs_items` | HIGH — every PM/PD page | 1 migration |
| Add composite index on commitments and expenditures for per-item status filtering | HIGH — Finance panel load time | 1 migration |
| Standardize staleTime across React Query hooks (30s finance, 5min reference) | MEDIUM — reduces unnecessary refetches | Code change only |
| Replace `select('*')` in dashboard components with explicit field lists | MEDIUM — reduces payload size | Code change only |

### P2 — Medium-term (< 1 month)

| Task | Impact | Effort |
|------|--------|--------|
| Add `queryClient.invalidateQueries()` after Finance lifecycle mutations | MEDIUM — cleaner cache invalidation | Code change only |
| Cache `ControlCenterProjectSnapshot` at React Query level | MEDIUM — faster dashboard render | Code change only |
| Add composite index on funding receipts | LOW — aggregate RPC performance | 1 migration |
| Consider single RPC for dashboard health snapshot | LOW — reduces roundtrips | New RPC + migration |

### P3 — Long-term

| Task | Impact | Effort |
|------|--------|--------|
| Materialized view for project health rollup | LOW — only needed at scale | Migration |
| Report snapshot precomputation | LOW — current report frequency is low | Code change |
| React Router v7 migration (resolves 2 MODERATE vulns) | LOW | Breaking change |
