# ADR 0016: Integrated Program Lifecycle Architecture Freeze v1.0

## Status

**FROZEN**

## Date

2026-08-10

## Context

ADR 0007–0015 have established a complete governance architecture for the
Integrated Program Lifecycle. Each domain has a canonical contract defining
ownership, lifecycle, lineage, signal flows, and forbidden mutations.

This ADR does NOT introduce new architecture. It consolidates all previous
decisions into a single v1.0 baseline. It becomes the canonical architecture
reference for all future implementation.

---

## 1. Architecture Status

| ADR | Title | Status | Architecture Role |
|-----|-------|--------|-------------------|
| 0007 | Programme Design Canonical Architecture | ACCEPTED | PD ownership, PD ↔ PM boundary, materialization contract, gap analysis |
| 0008 | Programme Design ↔ Finance Canonical Contract | ACCEPTED | Finance ownership matrix, PD Budget vs PM Finance, variance contract, learning contract |
| 0009 | Programme Design ↔ Bottleneck Canonical Contract | ACCEPTED | Bottleneck taxonomy, lifecycle statuses, resolution/verification, derived metrics |
| 0010 | Integrated Program Lifecycle Cross-Module Contract Matrix | ACCEPTED | System-wide blueprint: 17 modules, ownership, lineage, signals, forbidden mutations, readiness |
| 0011 | Evidence Governance Canonical Contract | ACCEPTED | Evidence as first-class domain, lifecycle, verification, quality model, consumption rules |
| 0012 | Evaluation Canonical Contract | ACCEPTED | Evaluation lifecycle, finding/recommendation contract, taxonomy, quality model |
| 0013 | Learning Ledger Canonical Contract | ACCEPTED | Learning lifecycle, insight types, design revision boundary, integration matrix |
| 0014 | SROI Canonical Contract | ACCEPTED | SROI ownership, valuation methodology, evidence dependency, outcome chain |
| 0015 | Impact Reporting Canonical Contract | ACCEPTED | Reporting lifecycle, snapshot governance, KPI registry, narrative contract |

**All 9 ADRs are ACCEPTED.** This ADR freezes the v1.0 baseline.

---

## 2. Canonical System Vision

```
Proposal (GrantWriter)
    │ Purpose: Generate initial programme concept
    │ Owner: PD Designer + Deterministic Engine
    │ Phase: Pre-Design
    ↓
Programme Design (LFA, WBS, Budget, MEAL)
    │ Purpose: Define intervention logic, budget, and measurement framework
    │ Owner: PD Designer
    │ Phase: Design
    ↓
Materialization (PD → PM handoff)
    │ Purpose: Create PM execution structures from PD design
    │ Owner: System (RPCs)
    │ One-way, immutable lineage, project-scoped
    │ Phase: Handoff
    ↓
Project Management (Work Plan, Timeline, Deliverables, Completion Claims)
    │ Purpose: Execute activities, track progress, deliver outputs
    │ Owner: PM Owner
    │ Phase: Execution
    ↓
Evidence (Observations, Attachments, Verification)
    │ Purpose: Prove what happened
    │ Owner: PM Reviewer (uploads); PD MEAL (consumes)
    │ Immutable, attributable, verifiable
    │ Phase: Evidence Collection
    ↓
Evaluation (Systematic Assessment)
    │ Purpose: Assess outcomes, produce findings and recommendations
    │ Owner: PD Evaluator
    │ Evidence-grounded, advisory, never auto-mutates
    │ Phase: Analysis
    ↓
Learning (Pattern Synthesis)
    │ Purpose: Capture cross-project insights for future design
    │ Owner: PD Learning
    │ Typed (good_practice/failure_pattern/mixed), scoped, status-tracked
    │ Phase: Improvement
    ↓
SROI (Social Value Quantification)
    │ Purpose: Monetize outcomes for stakeholder communication
    │ Owner: PD SROI Analyst
    │ Consumes evidence, evaluation, and financial data
    │ Phase: Valuation
    ↓
Reporting (Stakeholder Communication)
    │ Purpose: Synthesize all domains into consumable artifacts
    │ Owner: PD Reporting
    │ Point-in-time snapshots, immutable after publication
    │ Phase: Communication
```

This is the **official Integrated Program Lifecycle v1.0**.

---

## 3. Core Domain Definitions

### Programme Design (PD)
- **Core**: LFA hierarchy (Goal→Purpose→Outcome→Output→Activity), Theory of Change
- **Role**: **Design Truth Owner** — defines what to achieve and how
- **Canonical Files**: `editorCanonicalBridge.ts`, `readAdapter.ts`, `budgetModel.ts`, ADR 0006, 0007
- **Readiness**: HIGH

### Project Management (PM)
- **Core**: Work Plan, Timeline, Deliverables, Completion Claims, Finance Execution, Funding
- **Role**: **Execution Truth Owner** — records what actually happened
- **Canonical Files**: `executionModel.ts`, `workPlan.ts`, `financeModel.ts`, `bottleneckModel.ts`, ADR 0009
- **Readiness**: HIGH

### Evidence
- **Core**: Verified Evidence Records, Evidence Attachments, Verification Status
- **Role**: **Evidence Truth Owner** — proves what happened
- **Canonical Files**: `wbs_completion_evidence`, ADR 0011
- **Readiness**: MEDIUM

### Evaluation
- **Core**: Evaluation Findings, Recommendations
- **Role**: **Interpretation Layer** — assesses what results mean
- **Canonical Files**: `project_evaluation_findings`, ADR 0012
- **Readiness**: LOW

### Learning
- **Core**: Learning Insights (typed, scoped, status-tracked)
- **Role**: **Improvement Layer** — informs future design
- **Canonical Files**: `orgLearningModel.ts`, `learningModel.ts`, ADR 0013
- **Readiness**: MEDIUM

### SROI
- **Core**: Outcome Valuation, SROI Ratio
- **Role**: **Value Analysis Layer** — monetizes outcomes
- **Canonical Files**: `SROICalculator.tsx`, ADR 0014
- **Readiness**: COMPLETE (functional) / LOW (governance)

### Finance
- **Core**: Budget Baseline, Commitments, Expenditures, Funding Receipts, Cash Position
- **Role**: **Financial Truth Owner** — tracks spending and funding
- **Canonical Files**: `financeModel.ts`, `financeCommitments.ts`, `financeExpenditures.ts`, `projectFunding.ts`, ADR 0008
- **Readiness**: HIGH

### Reporting
- **Core**: Report Snapshots, KPIs, Narratives
- **Role**: **Communication Layer** — presents results to stakeholders
- **Canonical Files**: `MonthlyImpactReport.tsx`, `SustainabilityReports.tsx`, ADR 0015
- **Readiness**: LOW

---

## 4. Authority Hierarchy

```
Level 1 — Programme Strategy
    Authority: Defines what to achieve and why
    Mutability: Revised via strategic review
    Modules: Proposal, GrantWriter
    ↓ authority flows down
Level 2 — Programme Design
    Authority: Defines intervention logic, budget, and measurement
    Mutability: Revised by PD Designer; NOT by PM
    Modules: LFA, Theory of Change, WBS Design, Budget Design, MEAL Design
    ↓ materialization (one-way)
Level 3 — Materialized Execution Structures
    Authority: Execution blueprint derived from design
    Mutability: PM manages execution structure; PD design immutable
    Modules: Materialization RPCs
    ↓ execution creates records
Level 4 — Execution Records
    Authority: What actually happened
    Mutability: Immutable after posting/approval
    Modules: Work Plan, Timeline, Deliverables, Completion Claims,
             Commitments, Expenditures, Funding Receipts, Bottlenecks
    ↓ records become evidence
Level 5 — Evidence
    Authority: Proves what happened
    Mutability: Immutable after verification
    Modules: Evidence records, Attachments, Verification status
    ↓ evidence fed upward (read-only)
Level 6 — Interpretation Layers
    Authority: What it means
    Mutability: Findings and insights may be revised
    Modules: Evaluation, Learning, SROI
    ↓ interpretations synthesized
Level 7 — Reporting
    Authority: Communication to stakeholders
    Mutability: Reports are point-in-time snapshots; new editions created
    Modules: Impact Reports, Sustainability Reports, Executive Summaries
```

**Authority flows DOWNWARD** (strategy → design → execution → evidence).
**Feedback flows UPWARD** (evidence → evaluation → learning → future design).

---

## 5. Final Materialization Contract

| Rule | Specification |
|------|--------------|
| Direction | PD → PM only. One-way. Never reverse. |
| Trigger | Manual user action (GrantWriter materialization, Activity Autoload acceptance) |
| Lineage | Every PM artifact carries source PD identity (composite FK) |
| Immutability | Materialized lineage is permanent; PM cannot change source attribution |
| Re-materialization | Creates new PM rows; preserves existing execution data |
| Reverse overwrite | Forbidden. PM execution data never modifies PD design parameters |
| Project scope | All materialized records share `lfa_project_id` with source |
| Owner transfer | Post-materialization: PD owns design; PM owns execution records |
| No auto-materialization | Materialization requires explicit user action; never automatic |

---

## 6. Final Signal Contract

All PM → PD feedback signals are **read-only**. They inform PD monitoring
but never automatically mutate PD design artifacts.

| Signal | PM Source | PD Consumer | Read-Only |
|--------|-----------|-------------|-----------|
| Activity Progress % | `executionModel` | Monitoring, Control Center | Yes |
| Completion Status | `executionModel` | Control Center | Yes |
| Overdue Indicator | `executionModel.isOverdue()` | Control Center | Yes |
| Closure Status (ACR) | `executionModel.getClosureStatus()` | MEAL tracking | Yes |
| Net Actual Expenditure | `financeModel` | Budget variance | Yes |
| Finance Health | `financeModel.classifyFinanceHealth()` | Control Center | Yes |
| Committed Outstanding | `financeModel` | Funding coverage | Yes |
| Cash Received | `financeModel §3` | Funding dashboard | Yes |
| Bottleneck Status | `bottleneckModel` | Control Center | Yes |
| Bottleneck Counts | `bottleneckModel.computeBottleneckCounts()` | Control Center | Yes |
| Evaluation Finding | `project_evaluation_findings` | Learning | Yes |
| Learning Insight | `org_learning_notes` | Design review | Yes |
| Evidence Verification Rate | Aggregated from claims | Evidence health | Yes |

**Signal Rule**: Signals inform; they do not mutate. PD may use signals for
monitoring and learning. PD must explicitly act to revise design.

---

## 7. Final Mutation Rules — Unified Matrix

| Action | Who Cannot Do It | Reason |
|--------|-----------------|--------|
| Modify PD design (Goal, Outcome, Output, Activity, Indicator, Assumption, Budget) | PM | PD owns design truth |
| Modify PM execution records (Work Plan, Timeline, Deliverables, Completion Claims) | PD | PM owns execution truth |
| Modify verified evidence | Anyone | Immutable after verification (ADR 0011) |
| Modify posted expenditure | Anyone | Immutable; reversal via new record (ADR 0008) |
| Modify approved commitment amount | Anyone | Immutable after approval (ADR 0008) |
| Modify posted funding receipt | Anyone | Immutable; reversal via new record (ADR 0008) |
| Modify evaluation finding after approval | Anyone | Findings are immutable (ADR 0012) |
| Modify published learning insight | Anyone | Published learning is organizational knowledge (ADR 0013) |
| Modify published report snapshot | Anyone | Reports are point-in-time artifacts (ADR 0015) |
| Delete any posted/verified/approved/published record | Anyone | Audit trail preservation |
| Evaluate modifies evidence | Evaluator | Evaluation reads evidence; never changes it |
| Learning automatically revises design | System | Requires explicit PD Designer action |
| SROI modifies evidence values | SROI Analyst | SROI uses evidence as-is |
| Reporting fabricates KPI values | Report generator | All KPIs must be source-attributable |
| Reporting edits published snapshot | Anyone | Published snapshots immutable |
| Automatic materialization | System | Requires explicit user trigger |

---

## 8. Module Readiness Dashboard

| Module | Readiness | Rationale |
|--------|-----------|-----------|
| Programme Design | HIGH | Full LFA/WBS/Budget/MEAL design; canonical models documented |
| Project Management | HIGH | Full execution lifecycle; canonical models for all subdomains |
| Finance | HIGH | Normalized ledgers (commitment, expenditure, funding, receipt); typed RPCs |
| Bottleneck | HIGH | Canonical lifecycle, resolution/verification contract, derived metrics |
| Evidence | MEDIUM | Functional for completion claims; lacks unified registry, quality scoring |
| Learning | MEDIUM | Functional for insight capture; lacks automated cross-domain pipelines |
| Control Center | MEDIUM | Read-model defined; snapshot builder ready; dashboard adoption partial |
| SROI | LOW | Calculator functional; governance contract defined but not structurally enforced |
| Evaluation | LOW | Basic finding storage; lacks lifecycle, taxonomy, approval workflow |
| Reporting | LOW | Functional reports exist; lacks snapshot persistence, KPI registry, source lineage |

**System Average: MEDIUM** (4 HIGH, 3 MEDIUM, 3 LOW)

---

## 9. Remaining Architecture Gaps

### Architecture Gaps (require design decisions before implementation)

| Gap | Priority | Affected Domain |
|-----|----------|----------------|
| Evaluation approval workflow | P0 | Evaluation |
| Report snapshot persistence | P0 | Reporting |
| Evidence unified registry | P1 | Evidence |
| KPI registry with source attribution | P1 | Reporting |
| Cross-project learning pipeline | P1 | Learning |
| Design change proposal entity | P2 | Learning → Design |
| Evidence quality scoring | P2 | Evidence |
| Multi-cycle evaluation tracking | P2 | Evaluation |
| Stakeholder-specific report views | P3 | Reporting |

### Implementation Gaps (design decided; implementation pending)

| Gap | Priority | Affected Domain |
|-----|----------|----------------|
| PD-dedicated read-model (equivalent to Control Center) | P1 | Programme Design |
| Evidence health metric in Control Center | P1 | Evidence, Control Center |
| Automated evaluation → learning pipeline | P2 | Evaluation, Learning |
| Bottleneck → learning pattern detection | P2 | Bottleneck, Learning |
| Cross-project portfolio analytics | P3 | Reporting, Learning |
| Report approval workflow | P3 | Reporting |

---

## 10. Implementation Priority Roadmap

### P0 — Critical (User-Visible Value Blocked)
1. Evaluation lifecycle UI (draft → approved → recommendation)
2. Report snapshot generation and storage
3. Evidence quality metric in Control Center

### P1 — Important (Significant User Value)
1. PD read-model (Programme Design equivalent of Control Center)
2. Unified evidence registry
3. KPI registry with canonical source attribution
4. Cross-project learning pipeline automation

### P2 — Valuable (Enhanced Capabilities)
1. Design change proposal workflow (learning → design)
2. Multi-cycle evaluation comparison
3. Bottleneck → learning pattern detection
4. Evidence quality scoring implementation

### P3 — Nice to Have (Polish)
1. Stakeholder-specific report views
2. Cross-project portfolio analytics
3. Report approval workflow automation
4. Learning audit ledger

---

## 11. Acceptance Decision

**Architecture Status: FROZEN**

### Rationale

The v1.0 architecture baseline is **complete and consistent**:

- **9 ADRs accepted** covering all lifecycle domains from Proposal to Reporting
- **Domain ownership explicit** — every entity has a canonical owner and source file
- **Materialization contract locked** — one-way PD → PM, immutable lineage, no reverse overwrite
- **Signal contract locked** — PM → PD signals are read-only; never auto-mutate
- **Mutation rules comprehensive** — 16 forbidden mutations across all domains
- **Authority hierarchy defined** — 7 levels from Strategy to Reporting
- **Readiness assessed** — 10 modules ranked HIGH/MEDIUM/LOW with rationale
- **Gaps identified** — 9 architecture gaps and 6 implementation gaps
- **Priorities ranked** — P0 through P3 based on user value and readiness

**No new architecture decisions are needed before implementation can proceed.**
The existing canonical models (`executionModel.ts`, `financeModel.ts`,
`bottleneckModel.ts`, `controlCenterModel.ts`) already provide compile-time
enforcement of domain boundaries.

Future ADRs may extend this baseline for specific features (evaluation UI,
reporting pipeline, cross-project analytics) but must not contradict the
boundaries and rules established in ADR 0007–0016.

## Related ADRs

| ADR | Title |
|-----|-------|
| 0007 | Programme Design Canonical Architecture |
| 0008 | Programme Design ↔ Finance Canonical Contract |
| 0009 | Programme Design ↔ Bottleneck Canonical Contract |
| 0010 | Integrated Program Lifecycle Cross-Module Contract Matrix |
| 0011 | Evidence Governance Canonical Contract |
| 0012 | Evaluation Canonical Contract |
| 0013 | Learning Ledger Canonical Contract |
| 0014 | SROI Canonical Contract |
| 0015 | Impact Reporting Canonical Contract |
| **0016** | **Integrated Program Lifecycle Architecture Freeze v1.0** |
