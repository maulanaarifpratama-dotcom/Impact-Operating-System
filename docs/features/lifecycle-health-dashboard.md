# Lifecycle Health Dashboard

**Version:** v1.0  
**Architecture:** ADR 0016 Architecture Freeze — derived computations only  
**Files:** `src/lib/lifecycleHealth.ts`, `src/components/dashboard/LifecycleHealthCard.tsx`  
**Integration:** `src/pages/dashboard/DashboardHome.tsx`

---

## Health Formula

The **Lifecycle Health Score** is a weighted average of 6 dimensions, normalized to 0-100:

```
Score = Σ(dimension_score × dimension_weight) / Σ(active_weights) × 100
```

Dimensions with no data (score ≤ 4) are excluded from the weighted average. If all dimensions have no data, the score defaults to 0.

---

## Dimensions

| # | Dimension | Weight | Data Source | Computation |
|---|-----------|--------|-------------|-------------|
| 1 | **Kesehatan Anggaran** | 20% | Budget compliance engine (`lfa_budget_items`) | `complianceScore` if available, else `utilizationPct`. No data → excluded. |
| 2 | **Kesiapan MEAL** | 20% | MEAL readiness engine (`lfa_meal_items`) | `computeMealReadiness().score` — percentage of indicators with all required fields. |
| 3 | **Eksekusi Program** | 25% | WBS activities (`lfa_wbs_items`, level 2) | `(completed / total × 100) - (overdue × 3)`, capped at [0,100]. No activities → excluded. |
| 4 | **Kematangan Bukti** | 15% | Completion claims (`wbs_completion_claims`) | `(verifiedClaims / totalClaims × 100)`. No claims → excluded. |
| 5 | **Cakupan Evaluasi** | 10% | Evaluation findings (`project_evaluation_findings`) | `70 - (criticalRatio × 60)`, capped at [0,100]. More critical findings = lower score. No findings → excluded. |
| 6 | **Kematangan Pembelajaran** | 10% | Learning entries (`org_learning_entries`) | `(publishedEntries / totalEntries × 100)`. No entries → excluded. |

---

## Status Thresholds

| Score Range | Status | Label | CSS Class |
|-------------|--------|-------|-----------|
| 80–100 | `healthy` | **Sehat** | Emerald gradient border |
| 60–79 | `attention` | **Perlu Perhatian** | Amber gradient border |
| 0–59 | `at_risk` | **Berisiko** | Rose gradient border |

---

## Alert Rules

Alerts are derived automatically from the aggregate data. They appear as clickable chips above the dimension bars.

| Alert | Severity | Trigger | Link To |
|-------|----------|---------|---------|
| Indikator tanpa PIC | warning | `meal.missingPic > 0` | `/dashboard/lfa-builder` (MEAL tab) |
| Indikator tanpa MoV | warning | `meal.missingMov > 0` | `/dashboard/lfa-builder` (MEAL tab) |
| Indikator belum lengkap | critical | `meal.incomplete > 0` | `/dashboard/lfa-builder` (MEAL tab) |
| Aktivitas terlambat | critical | `execution.overdueActivities > 0` | `/dashboard/project-management` |
| Klaim menunggu verifikasi | warning | `evidence.pendingClaims > 0` | `/dashboard/project-management` |
| Temuan kritis | critical | `evaluation.criticalFindings > 0` | `/dashboard/project-management` |
| Pembelajaran belum dipublikasi | info | `learning.draftEntries > 0` | `/dashboard/learning` |

Alerts are sorted: critical → warning → info. Maximum 5 displayed (to prevent alert fatigue).

---

## Navigation Model

Each dimension bar is clickable and navigates to its source module:

| Dimension | Target Route |
|-----------|-------------|
| Budget | `/dashboard/lfa-builder` (Budget tab) |
| MEAL | `/dashboard/lfa-builder` (MEAL tab) |
| Execution | `/dashboard/project-management` |
| Evidence | `/dashboard/project-management` (ACR tab) |
| Evaluation | `/dashboard/project-management` (Findings tab) |
| Learning | `/dashboard/learning` |

Alert chips also link to their source module.

---

## Architecture

```
DashboardHome
  └─ LifecycleHealthCard (component)
       ├─ React Query (5 parallel queries)
       │    ├─ organization_members → orgId
       │    ├─ lfa_meal_items → computeMealReadiness()
       │    ├─ lfa_wbs_items → execution stats
       │    ├─ wbs_completion_claims → evidence stats
       │    ├─ project_evaluation_findings → evaluation stats
       │    └─ org_learning_entries → learning stats
       └─ computeLifecycleHealth() (pure engine)
            ├─ 6 dimension scores
            ├─ Weighted aggregate
            ├─ Status (healthy/attention/at_risk)
            └─ Alerts (max 5, sorted by severity)
```

**Key design decisions:**
- **Derived only** — zero persistence, zero mutations, zero new database tables
- **Self-contained** — the card owns its data fetching; DashboardHome only needs to render `<LifecycleHealthCard />`
- **Pure engine** — `computeLifecycleHealth()` takes flat aggregate data, returns scores. Testable independently.
- **Reuses existing engines** — `computeMealReadiness()` from `mealReadiness.ts` is called directly
- **Lazy loaded** — Card appears only when `orgId` is available (after auth check)

---

## Future Expansion

| Priority | Enhancement | Rationale |
|----------|-------------|-----------|
| P1 | Integrate budget compliance via `evaluateBudgetCompliance()` | Currently budget dimension uses null/placeholder — need to fetch budget items and run compliance engine |
| P1 | Add trend arrows (week-over-week delta) | Show whether health is improving or declining |
| P2 | Per-project drill-down | Click a dimension to see breakdown by project |
| P2 | Export to PDF/MOR | Include lifecycle health in monthly operating review |
| P2 | Cache results in `readiness_scores` | Reduce query load for returning visitors |
| P3 | Configurable weights | Allow org admins to adjust dimension importance |
| P3 | Historical snapshots | Track lifecycle health over time for trend analysis |

---

## Validation

```
TypeScript: PASS (4 pre-existing warnings, 0 new)
Vite Build: PASS (8.78s)
Database:   No new tables, no migrations
New files:  3 (engine + component + integration)
Architecture: ADR 0016 compliant — derived computations only
```

---

*Document generated for commit reference. See `docs/testing/executive-lifecycle-smoke-test-2026-08.md` for the UAT that triggered this feature.*
