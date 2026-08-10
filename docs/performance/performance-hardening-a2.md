# Performance Hardening A2 — React Query & CRUD Standardization

## Date

2026-08-10

## Summary

Implemented low-risk performance improvements based on the Performance Audit
(2026-08). No business logic was changed. No architecture was modified.
All changes are query-level optimizations.

---

## Changes Made

### 1. select("*") → Explicit Fields in ProgramHealthSummary

**File:** `src/components/dashboard/ProgramHealthSummary.tsx`

Replaced 4 `select('*')` calls with explicit field lists, reducing payload size
by ~60% for this frequently-loaded dashboard component.

| Query | Old | New | Fields Saved |
|-------|-----|-----|-------------|
| WBS Items | `select('*')` — 20+ columns including carbon fields | `select('id,level,status,progress_percent,end_date,parent_id,stage_id,org_id,lfa_project_id')` | ~12 columns removed |
| Budget Items | `select('*')` — 18+ columns | `select('id,volume,unit_price_idr,actual_amount_idr,org_id,lfa_project_id')` | ~13 columns removed |
| MEAL Items | `select('*')` | `select('id,target_value,target_unit,baseline,lfa_level,indicator_text,org_id,lfa_project_id')` | ~10 columns removed |
| Tracking Entries | `select('*')` | `select('id,meal_item_id,recorded_value,recorded_date,created_at,org_id,lfa_project_id')` | ~10 columns removed |

### 2. staleTime Standardization in ProgramHealthSummary

Added `staleTime: 30_000` (30 seconds) to all 4 dashboard queries.
Previously, all 4 queries used the default `staleTime: 0`, causing refetches
on every component mount and focus event.

---

## Canonical Query Key Strategy

Documented standard for query key naming across the application:

### Convention

```
["resource_type", scopeId, ...optional_filters]
```

### Examples

| Query Key | Domain | staleTime |
|-----------|--------|-----------|
| `['org-role', userId]` | Auth | 5 min |
| `['program_health_wbs', orgId, projectId]` | Dashboard | 30 sec |
| `['program_health_budget', orgId, projectId]` | Dashboard | 30 sec |
| `['program_health_meal', orgId, projectId]` | Dashboard | 30 sec |
| `['program_health_meal_entries', orgId, projectId]` | Dashboard | 30 sec |

### staleTime Classification

| Category | staleTime | Example Queries |
|----------|-----------|----------------|
| Static Reference Data | 5–30 minutes | SBM, INKINDO, lookup tables, org role |
| Project Structural Data | 60–120 seconds | WBS structure, stages, objectives |
| Project Execution Data | 30–60 seconds | Completion claims, evidence, activity progress |
| Finance Data | 15–30 seconds | Budget, commitments, expenditures, funding |
| Dashboard Aggregation | 30 seconds | Program health rollup |

---

## Invalidation Strategy

Current approach: PM Finance pages use manual `loadAll()` + `onMutated()` callbacks
after lifecycle mutations. This is functionally correct — all data is refetched
after every mutation. No invalidation gaps were found.

**Future improvement (P2):** Replace manual `loadAll()` with `queryClient.invalidateQueries()`
to leverage React Query's built-in deduplication and stale-while-revalidate.

---

## select("*") Inventory Status

| File | Status | Priority |
|------|--------|----------|
| ProgramHealthSummary.tsx | **FIXED** — 4 queries converted | P1 |
| ImpactDashboard.tsx | Deferred — complex component; safe to defer | P2 |
| EROIStandalone.tsx | Deferred — standalone calculator | P2 |
| DonorCRM.tsx | Deferred — CRM component | P3 |
| DashboardHome.tsx | Deferred — landing page; low frequency | P3 |
| Other 25 files | Deferred — low-impact or infrequently loaded | P3 |

---

## Validation

- Typecheck: PASS (4 pre-existing errors unchanged)
- Build: PASS
- No business logic changes
- No UX changes
- No architecture changes

## Risks

| Risk | Mitigation |
|------|-----------|
| Explicit field lists may miss fields needed by future code | Dashboard metrics are stable; only used fields are selected |
| staleTime may cause stale data display | 30 seconds is reasonable for dashboard; Finance pages use manual refetch after mutations |

---

## Next Steps (P2)

1. Standardize staleTime in remaining React Query hooks.
2. Add `queryClient.invalidateQueries()` after Finance mutations.
3. Convert remaining high-priority `select('*')` calls (ImpactDashboard, EROIStandalone).
4. Add focused performance regression tests.
