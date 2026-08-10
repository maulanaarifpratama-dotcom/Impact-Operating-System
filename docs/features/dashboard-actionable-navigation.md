# Dashboard Actionable Navigation & Deep Linking

**Version:** v1.0  
**Architecture:** ADR 0016 — URL params only, no persistence

---

## Supported Deep Links

### MEAL Design (LFA Builder)

| Alert Trigger | Deep Link | Target State |
|---------------|-----------|-------------|
| Indikator tanpa PIC | `/dashboard/lfa-builder?tab=meal&filter=missing_pic` | MEAL tab, health filter: missing_pic |
| Indikator tanpa MoV | `/dashboard/lfa-builder?tab=meal&filter=missing_mov` | MEAL tab, health filter: missing_mov |
| Indikator tanpa target | `/dashboard/lfa-builder?tab=meal&filter=missing_target` | MEAL tab, health filter: missing_target |
| Indikator tanpa metode | `/dashboard/lfa-builder?tab=meal&filter=missing_method` | MEAL tab, health filter: missing_method |
| Indikator tanpa frekuensi | `/dashboard/lfa-builder?tab=meal&filter=missing_frequency` | MEAL tab, health filter: missing_frequency |
| Indikator belum lengkap | `/dashboard/lfa-builder?tab=meal&filter=incomplete` | MEAL tab, health filter: incomplete |
| Budget health (dimension) | `/dashboard/lfa-builder?tab=budget` | Budget tab |

### Project Management (Claims & Findings)

| Alert Trigger | Deep Link | Target State |
|---------------|-----------|-------------|
| Klaim menunggu verifikasi | `/dashboard/project-management` | Project list (choose project → ACR tab) |
| Temuan kritis | `/dashboard/project-management` | Project list |
| Execution health (dimension) | `/dashboard/project-management` | Project list |

**Sub-params for ProjectMEALPage** (for future per-project deep links):

| Param | Values | Effect |
|-------|--------|--------|
| `?tab=acr` | acr/control-center/deliverables/learning | Opens ACR tab |
| `?view=findings` | findings/claims | Toggles findings sub-view (default: claims) |
| `?claimFilter=submitted` | submitted/verified/needs_revision/all | Filters claims list |

### Learning Library

| Alert Trigger | Deep Link | Target State |
|---------------|-----------|-------------|
| Pembelajaran belum dipublikasi | `/dashboard/learning?status=my_drafts` | Learning library, my_drafts filter |
| Learning health (dimension) | `/dashboard/learning?status=published` | Learning library, published filter |

**Additional supported params (bidirectional):**

| Param | Values |
|-------|--------|
| `?status=` | all, my_drafts, published |
| `?insight_type=` | good_practice, failure_pattern, mixed_insight |
| `?scope=` | program, organization, sector |
| `?project=` | projectId UUID |

---

## Filter Mapping

### MEAL Health → Filter States

| Health State | MEALPlanner `healthFilter` | Effect |
|-------------|---------------------------|--------|
| `ready` | Siap | Show only fully complete indicators |
| `missing_pic` | PIC | Show only indicators without PIC |
| `missing_mov` | MoV | Show only indicators without secondary source |
| `missing_target` | Target | Show only indicators without target value |
| `missing_method` | Metode | Show only indicators without collection method |
| `missing_frequency` | Frekuensi | Show only indicators without frequency |
| `incomplete` | Belum Lengkap | Show only indicators without text |
| `all` | Semua | Clear health filter (also clears PIC filter) |

---

## Navigation Model

```
LifecycleHealthCard
  │
  ├─ Alert chip click → navigate(linkWithParams)
  │
  ├─ MEAL alerts → /dashboard/lfa-builder?tab=meal&filter=missing_pic
  │    └─ LFABuilderEditor reads ?tab=meal → activates MEAL tab
  │         └─ MEALPlanner reads ?filter=missing_pic → sets healthFilter
  │              └─ Table rows filtered to matching health status
  │
  ├─ Learning alerts → /dashboard/learning?status=my_drafts
  │    └─ LearningLibraryPage already reads ?status= → activates filter
  │         └─ Filtered list renders immediately
  │
  └─ Project alerts → /dashboard/project-management
       └─ Project list (user chooses project)
```

---

## URL ↔ State Sync

### MEALPlanner

| Direction | Mechanism |
|-----------|-----------|
| URL → State (read) | `useState` initializer reads `searchParams.get('filter')` |
| State → URL (write) | `useEffect` syncs `healthFilter` to `?filter=` param via `setSearchParams` |
| Clear filter | Removes `?filter=` from URL when `healthFilter === 'all'` |

### LearningLibraryPage

| Direction | Mechanism |
|-----------|-----------|
| URL → State | `const statusFilter = searchParams.get('status') \|\| 'published'` |
| State → URL | `setFilter()` helper sets/removes params, calls `setSearchParams` |

### ProjectMEALPage (AcrTab)

| Direction | Mechanism |
|-----------|-----------|
| URL → State | `useState` initializer reads `searchParams.get('view')` and `searchParams.get('claimFilter')` |
| Tab sync | `setTab()` calls `setSearchParams({ tab })` |

---

## Architecture

```
LifecycleHealthCard.tsx          lifecycleHealth.ts
  DIMENSION_LINKS          →      generateAlerts()
  (param-enriched URLs)           (param-enriched linkTo)

                    ↓
         react-router navigate(linkTo)
                    ↓
        ┌───────────┼───────────────┐
        │           │               │
   MEALPlanner   ProjectMEAL    LearningLibrary
   ?filter=      ?view=          ?status=
   ?tab=          ?claimFilter=   ?insight_type=
   (new)          (enhanced)      (existing)
```

---

## Future Expansion

| Priority | Enhancement |
|----------|-------------|
| P1 | Per-project deep links: fetch projectId context and link to `/dashboard/project-management/:projectId/meal?tab=acr&view=findings` |
| P1 | Budget Calculator: add `?compliance=warning\|violation` support with compliance badge highlighting |
| P2 | Evidence tab deep link: `/dashboard/project-management/:projectId/meal?tab=acr&claimFilter=submitted` |
| P2 | Bidirectional URL sync in MEALPlanner (update URL when user clicks filter chips) — already done for healthFilter |
| P3 | Store last-viewed projectId in localStorage for smarter deep linking from Dashboard |

---

## Validation

```
TypeScript: PASS (4 pre-existing warnings, 0 new)
Vite Build: PASS (9.56s)
Database:   No new tables, no migrations
URL params: 7 alert types wired to filtered views
```

---

*Document generated for commit reference. See `docs/features/lifecycle-health-dashboard.md` for the parent feature.*
