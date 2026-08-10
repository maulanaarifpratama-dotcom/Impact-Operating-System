# ADR 0015: Impact Reporting Canonical Contract

## Status

Accepted

## Date

2026-08-10

## Context

ADR 0007–0014 established the full Integrated Program Lifecycle:
Programme Design → Execution → Evidence → Evaluation → Learning → SROI.

The terminal consumer layer is **Reporting** — the synthesis and communication
of programme results to stakeholders.

Existing reporting components:
- `MonthlyImpactReport.tsx` — monthly operational + impact report
- `SustainabilityReports.tsx` — sustainability and ESG reporting
- `pmPdfExport.ts` — PM PDF export (Work Plan + Budget summary)
- `ESGDashboard.tsx` — ESG data visualization

Reporting currently embeds both PD and PM data without clean separation. This ADR
establishes Reporting as a first-class consumer domain that presents authoritative
data without becoming a source of truth.

---

## 1. Reporting Domain Definition

### What Reporting IS

Reporting is **information presentation for stakeholder communication** —
synthesizing authoritative domain data into consumable artifacts.

| Characteristic | Definition |
|---------------|------------|
| Presentational | Formats, visualizes, and narrates existing data |
| Stakeholder-aware | Tailored to audience (donors, board, public, team) |
| Evidence-backed | All claims traceable to evidence records |
| Time-bound | Reports cover specific periods; snapshots are immutable |
| Attributable | Every report carries generator identity and timestamp |

### What Reporting is NOT

| Non-Reporting | Why Not |
|--------------|---------|
| Evidence Source | Reporting cites evidence; never creates it |
| Execution Source | Reporting reads PM data; never modifies it |
| Evaluation Source | Reporting summarizes evaluation; never creates findings |
| Learning Source | Reporting references learning; never authors insights |
| Programme Design Source | Reporting describes design; never revises it |
| Operational Dashboard | Dashboards are live; reports are point-in-time snapshots |

### Reporting vs. Dashboards

```
Live Dashboard (Control Center)
    │ Real-time read-model aggregation
    │ Consumes canonical domain signals
    │ Not persisted as artifact
    ↓ snapshot taken at period end
Report (Impact Report, Sustainability Report)
    │ Point-in-time artifact
    │ Immutable after publication
    │ Persisted as report snapshot
```

---

## 2. Reporting Ownership Matrix

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Report | PD Reporting | Stakeholders, Donors | Generated report artifact |
| Report Template | PD Reporting | Report generators | Not yet implemented |
| Report Snapshot (generated) | PD Reporting | Stakeholders | Generated PDF/page |
| Reporting Period | PD Reporting | All consumers | Period definition (monthly, quarterly, annually) |
| Reporting Dataset (aggregated) | System (from domain sources) | Report generator | Derived from canonical models |
| Report Section (component) | PD Reporting | Readers | Report template / composition |
| Executive Summary | PD Reporting | All stakeholders | Narrative section |
| KPI Summary | PD Reporting | All stakeholders | Aggregated from domain data |
| Impact Narrative | PD Reporting | Donors, Public | Contextual story based on evidence |
| Financial Summary | PM Finance (source) → PD Reporting (presenter) | Donors, Board | `financeModel.ts` aggregates |
| Evaluation Summary | PD Evaluator (source) → PD Reporting (presenter) | Donors, Board | Evaluation findings |
| Learning Summary | PD Learning (source) → PD Reporting (presenter) | Internal team | Learning notes |
| SROI Summary | PD SROI (source) → PD Reporting (presenter) | Donors, Board | SROI calculator output |
| Evidence Appendix | PD Reporting | Auditors | Evidence references |
| Report Archive | System | Internal team, Auditors | Historical reports |

---

## 3. Reporting Lifecycle

```
Draft
    │ Owner: PD Reporting
    │ Purpose: Initial report composition with latest domain data
    │ Action: Generator pulls data from canonical sources; composes report
    │ State: Editable; not yet reviewed
    ↓
Generated (auto or manual)
    │ Owner: Report generator (system or human)
    │ Purpose: Populated report with data, charts, narratives
    │ Action: Run report generation; snapshot current data state
    │ State: Ready for review
    ↓
Reviewed
    │ Owner: PD Reporting reviewer (lead, M&E officer)
    │ Purpose: Validate accuracy, completeness, consistency
    │ Action: Check data against source domains; verify narratives
    │ State: Under review
    ↓
Approved
    │ Owner: Programme Lead / authorized approver
    │ Purpose: Sign-off on report content
    │ Action: Approve for publication
    │ State: Approved; immutable snapshot
    ↓
Published
    │ Owner: System; accessible to authorized readers
    │ Purpose: Distribute to stakeholders
    │ Action: Publish via platform, email, or download
    │ State: Published; immutable
    │ Rule: Published reports are point-in-time artifacts; never edited
    ↓
Archived
    │ Owner: System
    │ Purpose: Retain for historical reference and audit
    │ State: Retained per retention policy
```

---

## 4. Source Consumption Contract

### Reporting May Consume

| Source Domain | Data Consumed | Reporting Use |
|--------------|---------------|---------------|
| Programme Design | LFA hierarchy (Goal→Outcome→Output→Activity) | Design summary section |
| Programme Design | Budget framework, planned allocation | Financial summary (planned side) |
| PM Execution | Work Plan progress, completion % | Execution KPI section |
| PM Execution | Overdue items, timeline variance | Risk/issue section |
| PM Finance | Net actual, committed outstanding, exposure | Financial summary (actual side) |
| PM Finance | Cash received, cash available, funding coverage | Funding summary |
| PM Finance | Finance health classification | Financial health indicator |
| Evidence | Completion claim evidence counts | Evidence quality summary |
| Evaluation | Evaluation findings (severity, type) | Evaluation summary |
| Evaluation | Recommendations | Learning/recommendation section |
| Learning | Published learning insights | Lessons learned section |
| SROI | SROI ratio, outcome valuations | Impact value summary |
| Bottlenecks | Active bottleneck counts, verification gap | Constraint summary |
| Monitoring | MEAL indicator tracking entries | Outcome progress section |

### Reporting May NOT

| Action | Reason |
|--------|--------|
| Modify any source domain data | Reporting is read-only consumer |
| Create evidence records | Evidence is domain source (ADR 0011) |
| Create evaluation findings | Evaluation is domain source (ADR 0012) |
| Create learning notes | Learning is domain source (ADR 0013) |
| Modify SROI calculations | SROI is domain source |
| Rewrite historical execution facts | Report reflects execution truth |
| Fabricate data for reports | All data must be source-attributable |
| Change KPI definitions between reports | KPIs must be consistent for comparability |

---

## 5. Snapshot Contract

### Report Snapshot

A Report Snapshot is an **immutable, timestamped, traceable, and reproducible**
point-in-time representation of programme data.

| Property | Rule |
|----------|------|
| Immutable | Snapshots never change after publication |
| Timestamped | Generation timestamp is part of snapshot identity |
| Traceable | Every data point in the snapshot can be traced to its canonical source |
| Reproducible | Given the same source data state, the same report should be reproducible |
| Versioned | Each publication is a new snapshot; previous snapshots preserved |
| Comparable | Same-period snapshots across projects use consistent KPI definitions |

### Lineage Requirements

Every numeric value in a report must have documented provenance:
- **Source domain** (e.g., `financeModel.ts §2`)
- **Source entity** (e.g., `project_budget_expenditures`)
- **Computation path** (e.g., `aggregateProjectFinance → totalActual`)
- **Snapshot timestamp** (when the value was captured)
- **Generation method** (which report generator produced this snapshot)

---

## 6. Narrative Contract

### Narrative Layer

Reports include narratives that **summarize, explain, and contextualize** data.

| Narrative May | Narrative May NOT |
|--------------|-------------------|
| Summarize findings in plain language | Alter evidence to support narrative |
| Explain methodology | Modify source calculations |
| Contextualize with programme background | Create new facts not present in sources |
| Highlight patterns across data points | Fabricate data for storytelling |
| Provide qualitative interpretation | Replace quantitative data with opinion |
| Recommend future actions | Mutate design or execution records |

### Narrative ↔ Source Separation

```
Source Data (immutable, domain-owned)
    │ "95% of activities completed on time"
    │ Source: executionModel.computeItemProgress()
    │ Captured at: 2026-08-10 14:00 UTC
    ↓ read by
Narrative (authored, attributed)
    │ "The project maintained strong execution momentum throughout Q3,
    │  significantly exceeding the 80% industry benchmark for on-time
    │  activity completion."
    │ Author: PD Reporting, 2026-08-11
```

The narrative is an authored interpretation. The source data remains the
uninterpreted truth. Both are preserved in the report.

---

## 7. KPI Governance

| KPI | Source Domain | Owner | Reporting Frequency | Status |
|-----|-------------|-------|-------------------|--------|
| Activity Completion % | PM Work Plan (`executionModel`) | PM Owner | Monthly | COMPLETE |
| Overdue Activity Count | PM Work Plan (`executionModel.isOverdue()`) | PM Owner | Monthly | COMPLETE |
| Deliverable Completion Rate | PM Deliverables | PM Owner | Monthly | PARTIAL |
| Budget Utilization % | PM Finance (`financeModel.classifyFinanceHealth()`) | PM Finance | Monthly | COMPLETE |
| Committed Outstanding | PM Finance (`project_budget_commitments`) | PM Finance | Monthly | COMPLETE |
| Cash Received | PM Finance (`project_funding_receipts`) | PM Finance | Monthly | COMPLETE |
| Funding Coverage % | PM Finance (`financeModel §3`) | PM Finance | Monthly | COMPLETE |
| Indicator Achievement % | PD MEAL (`lfa_meal_tracking_entries`) | PD MEAL | Quarterly | PARTIAL |
| Evidence Verification Rate | Evidence (`wbs_completion_claims.verification_state`) | PM Reviewer | Quarterly | MISSING |
| Bottleneck Resolution Rate | PM Bottleneck (`bottleneckModel`) | PM Owner | Monthly | PARTIAL |
| Evaluation Finding Count | PD Evaluation (`project_evaluation_findings`) | PD Evaluator | Quarterly | PARTIAL |
| Learning Insight Count | PD Learning (`org_learning_notes`) | PD Learning | Quarterly | PARTIAL |
| SROI Ratio | PD SROI (`SROICalculator`) | PD SROI | Annually | COMPLETE |
| ESG Carbon Footprint | Carbon Engine (`calculators.ts`) | PD Sustainability | Annually | PARTIAL |

---

## 8. Reporting Quality Model

| Dimension | Definition | Scoring |
|-----------|-----------|---------|
| Accuracy | Do numbers match their canonical sources? | Automated comparison with source queries |
| Traceability | Can every data point be traced to a source? | Source attribution present / absent |
| Completeness | Are all required KPIs covered? | KPIs covered / total required KPIs |
| Transparency | Is methodology clearly documented? | Method section present / absent |
| Consistency | Are KPI definitions stable across periods? | Definition change count between snapshots |
| Timeliness | Was the report delivered on schedule? | On-time / Late / Missing |

Quality scoring is conceptual. Implementation deferred.

---

## 9. Forbidden Mutations

| Action | Forbidden For | Reason |
|--------|--------------|--------|
| Reporting modifies PD design records | Report generator | PD owns design truth |
| Reporting modifies PM execution records | Report generator | PM owns execution truth |
| Reporting modifies evidence records | Report generator | Evidence is immutable (ADR 0011) |
| Reporting modifies evaluation findings | Report generator | Evaluation is evaluator domain (ADR 0012) |
| Reporting modifies learning insights | Report generator | Learning is author domain (ADR 0013) |
| Reporting modifies SROI calculations | Report generator | SROI is analyst domain |
| Reporting fabricates KPI values | Report generator | All KPIs must be source-attributable |
| Reporting edits published snapshot | Anyone | Published snapshots are immutable |
| Reporting changes KPI definitions retroactively | Report generator | KPIs must be consistent for comparability |
| Reporting deletes historical reports | Anyone | Reports are archival artifacts |

---

## 10. Integration Matrix

| Integration | Status | Notes |
|-------------|--------|-------|
| Reporting ↔ Programme Design | PARTIAL | Reports describe design; no structural read-only pipeline |
| Reporting ↔ PM (Work Plan, Timeline) | COMPLETE | `pmPdfExport.ts` exports PM data; execution KPIs available |
| Reporting ↔ PM Finance | PARTIAL | Finance summary exists; not structurally separated from PD budget |
| Reporting ↔ Evidence | PARTIAL | Evidence counts available; no evidence quality KPI |
| Reporting ↔ Evaluation | PARTIAL | Findings manually referenced; no automated KPI |
| Reporting ↔ Learning | PARTIAL | Learning insights manually included; no automated pipeline |
| Reporting ↔ SROI | PARTIAL | SROI ratio computed; not auto-included in reports |
| Reporting ↔ Bottlenecks | MISSING | No bottleneck KPI in any report |
| Reporting ↔ MEAL Tracking | PARTIAL | Indicator data exists; not structurally included in reports |

---

## 11. Gap Analysis

| Area | Status | Gap |
|------|--------|-----|
| Report Template system | MISSING | No structured template; reports are hardcoded components |
| Report Snapshot (immutable) | MISSING | Reports are live-generated; no snapshot persistence |
| Reporting Dataset (aggregated) | PARTIAL | Data is queried per report; no centralized reporting dataset |
| KPI governance framework | PARTIAL | KPIs are defined implicitly in components; no explicit KPI registry |
| Narrative governance | MISSING | No separation between narrative and source data in reports |
| Source lineage in reports | MISSING | Reports don't carry source attribution per data point |
| Report approval workflow | MISSING | No approval lifecycle for reports |
| Report archive | MISSING | No historical report storage |
| Cross-period comparison | MISSING | No structural support for comparing reports across periods |
| Stakeholder-specific views | MISSING | Same report for all audiences; no role-based views |
| ESG / Sustainability reporting | PARTIAL | `ESGDashboard.tsx`, `SustainabilityReports.tsx` exist; not integrated with core reporting |

---

## 12. Readiness Assessment

**Architecture Readiness: LOW**

### Rationale

Reporting exists as functional components (`MonthlyImpactReport.tsx`,
`SustainabilityReports.tsx`, `pmPdfExport.ts`) that can generate reports from
live domain data. However:

- No snapshot persistence — reports are live-generated, not archived as immutable artifacts
- No narrative governance — narratives and source data are not structurally separated
- No KPI registry — KPIs are defined implicitly in component code
- No source lineage — reports don't carry per-data-point provenance
- No approval workflow — reports go directly from generation to viewing
- No cross-period comparison — each report is standalone

Reporting is functionally adequate for basic stakeholder communication but lacks
the governance infrastructure required for auditable, comparable, and
source-attributable impact reporting.

### Path to MEDIUM Readiness

1. Implement report snapshot persistence (immutable artifact with generation timestamp).
2. Define explicit KPI registry with source attribution.
3. Separate narrative sections from source data sections in report structure.
4. Implement source lineage tagging per data point.

### Path to HIGH Readiness

1. Implement report approval workflow (draft → reviewed → approved → published).
2. Build report archive with cross-period comparison.
3. Implement stakeholder-specific report views.
4. Automate KPI computation from canonical domain models.
5. Integrate evidence quality and bottleneck KPIs into reports.

---

## Decision

Reporting is the terminal consumer layer of the Integrated Program Lifecycle.
It synthesizes authoritative domain data into stakeholder communication artifacts
without becoming a source of truth.

- Reports are **point-in-time snapshots** of programme data.
- Reports are **immutable after publication** — they are historical artifacts, not live dashboards.
- All report data must be **source-attributable** to canonical domain models.
- Narratives **interpret** data but never **alter** it.
- Reporting is a **read-only consumer** — it presents data but never modifies any source domain.
- Reporting readiness is **LOW** — functional for basic reports but lacks snapshot governance, KPI registry, source lineage, and approval workflow.

## Related ADRs and Files

- `docs/architecture/decisions/0010-integrated-program-lifecycle-cross-module-contract-matrix.md` (§17)
- `docs/architecture/decisions/0011-evidence-governance-canonical-contract.md`
- `docs/architecture/decisions/0012-evaluation-canonical-contract.md`
- `docs/architecture/decisions/0013-learning-ledger-canonical-contract.md`
- `src/pages/dashboard/MonthlyImpactReport.tsx`
- `src/pages/dashboard/SustainabilityReports.tsx`
- `src/lib/project-management/pmPdfExport.ts`
- `src/lib/project-management/controlCenterModel.ts`
