# Executive Portfolio Dashboard

**Version:** v1.0  
**Route:** `/dashboard/portfolio`  
**Files:** `src/lib/portfolioHealth.ts`, `src/pages/dashboard/ExecutivePortfolioDashboard.tsx`

---

## Overview

The Executive Portfolio Dashboard aggregates organization-wide project data into a single command center. It reuses the existing lifecycle health infrastructure (`mealReadiness.ts`, `lifecycleHealth.ts`, Supabase tables) without duplicating logic.

---

## Metrics

### Portfolio Health Score
Aggregated lifecycle health score across all projects. Weighted average of per-project scores computed from:
- MEAL readiness (25%)
- Execution completion (25%)
- Evidence verification (20%)
- Evaluation health (10%)
- Learning maturity (10%)
- Budget compliance (5%)
- SROI coverage (5%)

### Metric Grid (8 cards)
| Metric | Data Source |
|--------|-------------|
| Portfolio Health | `computePortfolioSummary()` → avgLifecycleScore |
| Proyek Aktif | `lfa_projects` count + status filter |
| Proyek Berisiko | Projects with score < 60 |
| Tanpa SROI | Projects without `lfa_sroi_config` entry |
| Temuan Kritis | `project_evaluation_findings` severity=critical |
| Evidence Tertunda | Projects where verified < total claims |
| MEAL Readiness | Average `computeMealReadiness().score` |
| Draft Pembelajaran | `org_learning_entries.status=draft` count |

### Project Ranking
All projects sorted by lifecycle health score. Top 3 get rank badges (1st/2nd/3rd). Each row shows:
- Project name + status badge
- Alert pills (missing PIC, missing MoV, overdue, etc.)
- Score percentage + risk level
- Click navigates to `/dashboard/lfa-builder/:projectId`

### At-Risk Panel
Priority alert band shown when `atRiskProjects > 0`. Contains clickable badges for:
- At-risk project count → scrolls to intervention section
- Projects without SROI → navigates to SROI workspace
- Projects with critical findings → navigates to project management

### Intervention Section (conditional)
Listed only when projects have `at_risk` status. Shows:
- Project name
- All alert badges
- Score in rose color
- Click navigates to project

### Quick Navigation Grid
4 shortcut cards: LFA Builder, Project Mgmt, SROI Workspace, Learning Library.

---

## Architecture

```
ExecutivePortfolioDashboard
  │
  ├─ 9 React Query fetches (parallel)
  │   ├─ organization_members → orgId
  │   ├─ lfa_projects (all org projects)
  │   ├─ lfa_meal_items (by projectIds)
  │   ├─ lfa_wbs_items (by projectIds, level=2)
  │   ├─ wbs_completion_claims (by projectIds)
  │   ├─ project_evaluation_findings (by projectIds)
  │   ├─ org_learning_entries (by orgId)
  │   ├─ lfa_sroi_config (by projectIds)
  │   └─ lfa_budget_items (by projectIds)
  │
  ├─ portfolioHealth.ts (pure engine)
  │   ├─ computeProjectScore() — per-project lifecycle score
  │   ├─ computePortfolioSummary() — aggregated stats
  │   ├─ rankProjects() — sorted by health score
  │   ├─ computeRiskMetrics() — 8 metric cards
  │   └─ projectAlerts() — derived alert strings
  │
  └─ Reuses: computeMealReadiness() from mealReadiness.ts
```

---

## Data Sources & Reuse

| Engine | File | Reused By |
|--------|------|-----------|
| MEAL Readiness | `src/lib/lfa/mealReadiness.ts` | `computeMealReadiness()` called per project |
| WBS execution | `src/lib/project-management/executionModel.ts` | Status classification patterns |
| Evidence | `wbs_completion_claims` table | Claim verification counts |
| Evaluation | `project_evaluation_findings` table | Severity classification |
| Learning | `org_learning_entries` table | Status counts |
| SROI | `lfa_sroi_config` table | Coverage detection |
| Budget | `lfa_budget_items` table | Reference data |

**No new tables. No new RPCs. Derived and aggregated only.**

---

## Future Expansion

| Priority | Enhancement |
|----------|-------------|
| P1 | Add trend data (compare vs previous period) |
| P1 | Budget compliance score integration (currently null) |
| P1 | Per-project learning entry linking (currently 0) |
| P2 | Export portfolio PDF |
| P2 | Date range filter (last 30/90/365 days) |
| P3 | Team member workload distribution |
| P3 | Donor-facing portfolio view |

---

## Validation

```
TypeScript: PASS (4 pre-existing warnings, 0 new)
Vite Build: PASS (7.84s)
Database:   No new tables, no migrations
Routes:     /dashboard/portfolio (new)
Sidebar:    "Portfolio" link added
```
