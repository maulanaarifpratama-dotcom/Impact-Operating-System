# ADR 0010: Integrated Program Lifecycle Cross-Module Contract Matrix

## Status

Accepted

## Date

2026-08-10

## Context

Individual domain contracts are now established:
- ADR 0006 — Canonical LFA Hierarchy
- ADR 0007 — Programme Design Canonical Architecture (PD ↔ PM boundary)
- ADR 0008 — Programme Design ↔ Finance Canonical Contract
- ADR 0009 — Programme Design ↔ Bottleneck Canonical Contract (accepted)

The remaining gap is a system-wide contract matrix that describes ownership,
authority, lineage, allowed flows, and forbidden mutations across ALL lifecycle
modules. This ADR is the architectural blueprint for the Integrated Program
Lifecycle System.

---

## 1. Canonical Lifecycle

```
Proposal (GrantWriter)
    │ Purpose: Generate initial program concept, sector alignment, SDG mapping
    │ Owner: PD Designer + GrantWriter Engine
    │ Outputs: CanonicalProposalPayloadV2, LFA Matrix draft
    │ Consumers: Programme Design
    ↓
Programme Design (LFA Builder)
    │ Purpose: Define intervention logic: Goal → Outcome → Output → Activity
    │ Owner: PD Designer
    │ Outputs: LFA Matrix, Theory of Change narrative
    │ Consumers: WBS Design, Budget Design, MEAL Design
    ↓
LFA / Theory of Change
    │ Purpose: Explicit causal chain with assumptions and indicators
    │ Owner: PD Designer
    │ Outputs: lfa_entries (goal, purpose, outcome, output, activity)
    │ Consumers: GrantWriter validation, Materialization
    ↓
Work Breakdown Structure Design
    │ Purpose: Decompose Activities into executable tasks
    │ Owner: PD Designer
    │ Outputs: lfa_wbs_items (level 1-4 hierarchy)
    │ Consumers: Materialization, Budget Design
    ↓
Budget Design
    │ Purpose: Allocate planned cost per Activity/WBS
    │ Owner: PD Designer
    │ Outputs: lfa_budget_items (planned = volume × unit_price_idr)
    │ Consumers: PM Finance baseline, Funding planning
    ↓
MEAL Design
    │ Purpose: Define indicators, methods, sources, frequency for each LFA level
    │ Owner: PD MEAL Designer
    │ Outputs: lfa_meal_items (output-level indicators)
    │ Consumers: PM MEAL tracking, Monitoring, Evaluation
    ↓
Materialization (PD → PM handoff)
    │ Purpose: One-way creation of PM execution structures from PD design
    │ Owner: System (materialization RPCs)
    │ Outputs: PM WBS, PM Budget baseline, PM MEAL links, Stage assignments
    │ Consumers: All PM modules
    ↓
Project Management Execution
    │ Purpose: Execute activities, manage timeline, deliver outputs
    │ Owner: PM Owner
    │ Outputs: Work Plan progress, Stage status, Timeline actuals
    │ Consumers: Monitoring, Evaluation
    ↓
    ├── Finance Execution (PM-F2, PM-F3)
    │   Purpose: Track spending, commitments, and funding receipts
    │   Owner: PM Finance Owner
    │   Outputs: Commitments, Expenditures, Reversals, Funding Receipts
    │   Consumers: Monitoring, Variance Analysis
    │
    ├── Work Plan (PM Execution Core)
    │   Purpose: Track activity status, progress %, PIC assignments
    │   Owner: PM Owner
    │   Outputs: Execution status (not_started/in_progress/completed),
    │            Overdue signals, Completion Claims
    │   Consumers: Monitoring, Control Center, Reporting
    │
    ├── Timeline (PM Stages)
    │   Purpose: Manage planned vs actual dates per Stage
    │   Owner: PM Owner
    │   Outputs: Stage status, schedule variance
    │   Consumers: Control Center, Reporting
    │
    ├── Deliverables
    │   Purpose: Track tangible outputs with lifecycle (submitted→accepted)
    │   Owner: PM Owner
    │   Outputs: Deliverable status, acceptance evidence
    │   Consumers: Monitoring, Completion Claims
    │
    ├── Completion Claims (ACR)
    │   Purpose: Evidence-verified completion of WBS items
    │   Owner: PM Owner / Reviewer
    │   Outputs: Closure status (open/documented/closed),
    │            Evidence attachments, Verification notes
    │   Consumers: Monitoring, Evaluation, Reporting
    │
    └── Bottlenecks (PM Constraint)
        Purpose: Track execution obstructions
        Owner: PM Owner
        Outputs: Blocker category, Status (open→verified→closed),
                 Resolution notes, Verification notes
        Consumers: Control Center, Monitoring
    ↓
Monitoring
    │ Purpose: Compare planned vs actual across all dimensions
    │ Owner: PD MEAL (reads PM execution signals)
    │ Outputs: Indicator tracking entries, Progress dashboards,
    │          Variance reports, Control Center snapshots
    │ Consumers: Evaluation, Learning, Reporting
    ↓
Evaluation
    │ Purpose: Assess outcome achievement, evidence quality, causal validity
    │ Owner: PD Evaluator
    │ Outputs: Evaluation findings, Evidence review, Recommendation items
    │ Consumers: Learning, SROI, Reporting
    ↓
Learning
    │ Purpose: Capture lessons, improve future design
    │ Owner: PD Learning
    │ Outputs: Learning notes, Assumption validations, Cost benchmarks
    │ Consumers: Programme Design (future cycles), Reporting
    ↓
SROI
    │ Purpose: Quantify social value created per outcome
    │ Owner: PD SROI Analyst
    │ Outputs: SROI ratio, Outcome valuations, Stakeholder change maps
    │ Consumers: Reporting, Donor communication
    ↓
Impact Reporting
    │ Purpose: Synthesize all evidence into donor/stakeholder reports
    │ Owner: PD Reporting
    │ Outputs: Impact reports, Sustainability reports, Monthly reviews
    │ Consumers: Donors, Stakeholders, Organization leadership
```

---

## 2. Module Ownership Matrix

| # | Module | Domain Owner | Readers | Upstream Inputs | Downstream Outputs | Canonical Truth Source |
|---|--------|-------------|---------|-----------------|-------------------|----------------------|
| 1 | Proposal | PD Designer + GrantWriter | PM (read design) | User input, Ontology registry | LFA draft, Sector/SDG mapping | `src/lib/grant-writer/deterministic/` |
| 2 | LFA / Theory of Change | PD Designer | PM (read-only) | Proposal | Goal→Outcome→Output→Activity hierarchy | ADR 0006, `readAdapter.ts`, `editorCanonicalBridge.ts` |
| 3 | WBS Design | PD Designer | PM (read-only) | LFA Activities | WBS items (level 1-4) | `src/pages/dashboard/lfa-builder/WBSBuilder.tsx` |
| 4 | Budget Design | PD Designer | PM (read planned) | WBS Activities | Budget lines (planned allocation) | `budgetModel.ts`, `mirrorBudgetModel.ts` |
| 5 | MEAL Design | PD MEAL Designer | PM (read-only) | LFA indicators | MEAL indicators, methods, sources | `MEALPlanner.tsx`, `lfa_meal_items` |
| 6 | Materialization | System (RPC) | PM (consume output) | All PD modules | PM WBS, PM Budget baseline | Materialization RPCs |
| 7 | Finance Execution | PM Finance Owner | PD (read signals) | Budget design, Funding plan | Commitments, Expenditures, Receipts | `financeModel.ts`, `financeCommitments.ts`, `financeExpenditures.ts`, `projectFunding.ts` |
| 8 | Work Plan | PM Owner | PD (read signals) | WBS from materialization | Execution status, Progress, Overdue | `workPlan.ts`, `executionModel.ts` |
| 9 | Timeline | PM Owner | PD (read signals) | Stages from materialization | Planned vs actual dates | `project_stages` |
| 10 | Deliverables | PM Owner | PD (read signals) | Output targets | Deliverable status, evidence | `project_objectives`, `programme_deliverables` |
| 11 | Completion Claims | PM Owner / Reviewer | PD (read signals) | WBS items to verify | ACR closure status, evidence | `executionModel.ts` (ClosureStatus) |
| 12 | Bottlenecks | PM Owner | PD (read signals) | Blocked WBS items | Blocker category, status, resolution | `bottleneckModel.ts` |
| 13 | Monitoring | PD MEAL | PM (provide data) | MEAL design, PM signals | Tracking entries, dashboards | `ControlCenterProjectSnapshot` |
| 14 | Evaluation | PD Evaluator | PM (read findings) | Monitoring data, Evidence | Findings, Recommendations | `evaluation_findings`, `orgLearningModel.ts` |
| 15 | Learning | PD Learning | All domains | Evaluation, Execution data | Learning notes, Assumption validations | `orgLearningModel.ts` |
| 16 | SROI | PD SROI Analyst | PM (read valuation) | Outcomes, Costs, Stakeholder data | SROI ratio, Outcome values | `SROICalculator.tsx` |
| 17 | Reporting | PD Reporting | All stakeholders | All modules | Impact reports, Sustainability | Generated reports |

---

## 3. Cross-Module Data Lineage Matrix

### Primary Lineage Chains

```
Proposal → LFA Goal → Purpose → Outcome → Output → PD Activity
                                                      ↓
                                              WBS Design (level 1-4)
                                                      ↓
                                              Materialization
                                                      ↓
                                              PM Activity (Work Plan)
                                                      ↓
                                              Completion Claim (ACR)
                                                      ↓
                                              Evidence (deliverable/stage)
                                                      ↓
                                              Monitoring Record
                                                      ↓
                                              Evaluation Finding
                                                      ↓
                                              Learning Event
                                                      ↓
                                              Future Design Revision

Budget Design → Planned Budget
                      ↓
              Materialization
                      ↓
              PM Financial Baseline
                      ↓
              PM Commitment
                      ↓
              PM Expenditure (actual)
                      ↓
              Financial Variance

MEAL Design → Indicator → Tracking Structure
                              ↓
                      Monitoring Entry (recorded_value)
                              ↓
                      Outcome Progress Calculation
                              ↓
                      SROI Valuation

Bottleneck → Resolution → Verification → Closed
                              ↓
                      Control Center Constraint Health
```

### Lineage Rules

1. **Every PM artifact must trace back to a PD design artifact.** Lineage is immutable after materialization.
2. **Lineage owner is the creating domain.** PD owns design lineage; PM owns execution lineage.
3. **Lineage breaks are invalid.** Orphan PM records without PD source are data integrity violations.
4. **Cross-domain joins use composite FKs** to enforce project-scoped identity (PD-M2 pattern).

---

## 4. Materialization Architecture

### Approved Materialization Operations

| # | Source | Target | Direction | Reversible | Post-Creation Owner |
|---|--------|--------|-----------|------------|---------------------|
| 1 | PD Activity (lfa_entries) | PM WBS Item (lfa_wbs_items) | PD → PM | No | PM (execution) |
| 2 | PD Budget Line (lfa_budget_items) | PM Financial Baseline | PD → PM | No | PM (execution tracking) |
| 3 | PD Indicator (lfa_entries.indicator) | PM MEAL Tracking Structure | PD → PM | No | PM (tracking entries) |
| 4 | PD Output (lfa_entries) | PM Stage grouping | PD → PM | No | PM (stage management) |
| 5 | PD WBS Structure | PM Work Plan hierarchy | PD → PM | No | PM (execution) |
| 6 | GrantWriter Proposal | LFA Matrix | GrantWriter → PD | No | PD (design) |

### Materialization Rules

1. **One-way only.** Materialization creates PM structure from PD design. Never the reverse.
2. **Immutable lineage.** Once materialized, the source relationship is permanent.
3. **No reverse overwrite.** PM execution data never modifies PD design parameters.
4. **Re-materialization supported.** Creates new PM rows; preserves existing execution data.
5. **Project-scoped identity.** All materialized records share `lfa_project_id` with source.
6. **Source identity preserved.** `source_task_id`, `mode`, and `funding_source` carry provenance.

---

## 5. Signal Architecture (PM → PD Feedback)

### Approved Execution Signals

| Signal | PM Source | PD Consumer | Updates PD? |
|--------|-----------|-------------|-------------|
| Activity Progress % | `lfa_wbs_items.progress_percent` | Monitoring dashboard | No — read-only display |
| Completion Status | `executionModel.getExecutionBucket()` | Control Center | No |
| Overdue Indicator | `executionModel.isOverdue()` | Control Center | No |
| Closure Status (ACR) | `executionModel.getClosureStatus()` | MEAL tracking | No |
| Actual Expenditure | `project_budget_expenditures` (net) | Budget variance analysis | No |
| Committed Outstanding | `financeModel` aggregate | Funding coverage view | No |
| Finance Health | `financeModel.classifyFinanceHealth()` | Control Center | No |
| Cash Received | `project_funding_receipts` (net) | Funding dashboard | No |
| Blocker Category | `lfa_wbs_items.blocker_category` | Control Center | No |
| Bottleneck Status | `bottleneckModel` lifecycle | Constraint health | No |
| Bottleneck Counts | `bottleneckModel.computeBottleneckCounts()` | Control Center | No |
| Evaluation Finding | `evaluation_findings` | Learning notes | No |
| Tracking Entry | `lfa_meal_tracking_entries.recorded_value` | MEAL indicator progress | No |

### Signal Rules

1. **Signals inform PD.** They do not automatically mutate PD design artifacts.
2. **Signals are read-only to PD.** PD consumes signals for monitoring, not for modification.
3. **Signals use canonical sources.** Every signal has a single canonical computation path.
4. **Control Center aggregates signals.** The read-model layer (`controlCenterModel.ts`) is the canonical aggregation point.

---

## 6. Forbidden Mutation Matrix

| Action | Forbidden For | Reason |
|--------|--------------|--------|
| Edit Goal / Purpose / Outcome / Output description | PM | PD owns intervention logic design |
| Edit Indicator text or target | PM | PD owns measurement framework |
| Edit Assumption | PM | PD owns design assumptions |
| Edit Theory of Change narrative | PM | PD owns causal logic |
| Edit Budget Line quantity, unit, or unit price | PM | PD owns planned allocation |
| Edit Budget Framework (categories, structure) | PM | PD owns cost structure |
| Edit MEAL Design (indicators, methods, sources) | PM | PD owns monitoring design |
| Overwrite PD design with PM execution data | PM | Design and execution are separate truths |
| Edit posted expenditure | PM (direct) | Immutable; reversal via new record |
| Edit approved commitment amount | PM (direct) | Immutable after approval |
| Edit posted funding receipt | PM (direct) | Immutable; reversal via new record |
| Delete posted financial record | Any | Audit history preservation |
| Edit verified bottleneck status to 'open' | PM | Verification is final |
| Edit historical completion claim evidence | PM | Evidence is immutable |
| Rewrite historical execution facts | Reporting | Reports reflect execution truth |
| Automatic PD design revision from PM data | System | Requires explicit PD Designer action |

---

## 7. Authority Hierarchy

```
Level 1 — Programme Strategy
    │ Source: Organization mission, Donor requirements, Sector analysis
    │ Authority: Defines what to achieve and why
    │ Mutability: Revised via strategic review
    │ Modules: Proposal, GrantWriter
    ↓
Level 2 — Programme Design
    │ Source: Strategic goals, LFA framework, Budget framework
    │ Authority: Defines how to achieve it (intervention logic)
    │ Mutability: Revised by PD Designer; not by PM
    │ Modules: LFA, Theory of Change, WBS Design, Budget Design, MEAL Design
    ↓
Level 3 — Materialized Execution Structures
    │ Source: PD design via materialization
    │ Authority: Defines execution units (Work Plan, Stages, Budget baseline)
    │ Mutability: PM manages execution structure; PD design remains source
    │ Modules: Materialization RPCs
    ↓
Level 4 — Execution Records
    │ Source: PM execution activities
    │ Authority: Records what actually happened
    │ Mutability: Immutable after posting/approval
    │ Modules: Work Plan progress, Commitments, Expenditures, Funding Receipts,
    │          Completion Claims, Bottlenecks
    ↓
Level 5 — Evidence
    │ Source: PM execution artifacts
    │ Authority: Proves what happened
    │ Mutability: Immutable
    │ Modules: Completion Claim evidence, Expenditure evidence,
    │          Deliverable acceptance, Stage completion
    ↓
Level 6 — Learning
    │ Source: Evaluation of evidence against design
    │ Authority: Informs future design
    │ Mutability: Learning evolves; evidence does not
    │ Modules: Evaluation findings, Org learning notes
    ↓
Level 7 — Reporting
    │ Source: All levels synthesized
    │ Authority: Communicates to stakeholders
    │ Mutability: Reports are point-in-time snapshots; regenerate, don't edit
    │ Modules: Impact reports, Sustainability reports, MOR
```

**Authority flows DOWNWARD** (strategy → design → execution → evidence).
**Feedback flows UPWARD** (evidence → learning → reporting → strategy revision).

---

## 8. System Health Model

| Health Dimension | Source Modules | Owner | Consumers | Status |
|-----------------|---------------|-------|-----------|--------|
| Design Health | LFA completeness, Budget coverage, MEAL framework | PD Designer | Programme review | PARTIAL — no automated design health metric |
| Execution Health | Work Plan progress, Overdue items, Completion Claims | PM Owner | Control Center, Monitoring | COMPLETE — `executionModel.ts`, `controlCenterModel.ts` |
| Delivery Health | Stage timeline, Deliverable completion | PM Owner | Control Center | PARTIAL — structure in `controlCenterModel.ts`; data pipe TBD |
| Constraint Health | Bottleneck active count, verification gap | PM Owner | Control Center | COMPLETE — `bottleneckModel.ts`, `controlCenterModel.ts` |
| Financial Health | Budget utilization, Cash position, Funding coverage | PM Finance | Control Center, Reporting | COMPLETE — `financeModel.ts §2, §3` |
| Evidence Health | Completion claims verified vs pending, Evidence completeness | PM Reviewer | Evaluation | MISSING — no automated evidence health metric |
| Outcome Health | MEAL indicator achievement vs target | PD MEAL | Evaluation, SROI | PARTIAL — data exists; no canonical aggregation |
| Learning Health | Evaluation findings count, Learning note adoption | PD Learning | Programme strategy | MISSING |

---

## 9. Architecture Readiness Assessment

| Module | Status | Notes |
|--------|--------|-------|
| Proposal | COMPLETE | GrantWriter engine, deterministic pipeline, ontology registry |
| LFA / Theory of Change | COMPLETE | `editorCanonicalBridge.ts`, ADR 0006 hierarchy |
| WBS Design | COMPLETE | WBSBuilder, 4-level hierarchy with stage grouping |
| Budget Design | COMPLETE | `budgetModel.ts`, `BudgetCalculator.tsx`, Activity Autoload |
| MEAL Design | COMPLETE | `MEALPlanner.tsx`, indicator framework |
| Materialization | COMPLETE | Multiple RPCs, GrantWriter → LFA → PM pipeline |
| Finance Execution | COMPLETE | Normalized ledgers, Commitment/Expenditure/Receipt lifecycle |
| Work Plan | COMPLETE | `workPlan.ts`, `executionModel.ts`, Stage grouping |
| Timeline | COMPLETE | `project_stages`, planned vs actual dates |
| Deliverables | COMPLETE | `programme_deliverables`, lifecycle with acceptance |
| Completion Claims | COMPLETE | ACR with evidence verification, ClosureStatus |
| Bottlenecks | COMPLETE | `bottleneckModel.ts`, lifecycle with verification |
| Monitoring | PARTIAL | `ProgramHealthSummary.tsx` cross-domain; lacks PD-dedicated model |
| Evaluation | PARTIAL | `evaluation_findings` exist; automated pipeline incomplete |
| Learning | PARTIAL | `orgLearningModel.ts` exists; PD feedback loop not automated |
| SROI | COMPLETE | `SROICalculator.tsx`, outcome valuation |
| Reporting | PARTIAL | Reports exist but embed both PD and PM without clean separation |

**Overall:** 11 COMPLETE, 5 PARTIAL, 1 MISSING (Evidence Health).

---

## 10. Future ADR Roadmap

| Priority | ADR | Title | Rationale |
|----------|-----|-------|-----------|
| P0 | ADR 0011 | Evaluation Canonical Contract | Evaluation findings currently lack canonical lifecycle and ownership |
| P0 | ADR 0012 | Evidence Governance Contract | Evidence health is MISSING; evidence lifecycle needs definition |
| P1 | ADR 0013 | SROI Canonical Contract | SROI calculator works but lacks formal PD contract documentation |
| P1 | ADR 0014 | Learning Ledger Contract | Learning loop exists but automated PD feedback is PARTIAL |
| P2 | ADR 0015 | Impact Reporting Contract | Reports exist but PD/PM separation in reporting needs definition |
| P2 | ADR 0016 | Programme Design Read-Model | PD lacks a dedicated read-model equivalent to `controlCenterModel.ts` |
| P3 | ADR 0017 | Cross-Project Portfolio Analytics | Portfolio-level aggregation across projects |
| P3 | ADR 0018 | Evidence Health Automation | Automated evidence completeness scoring |

---

## Decision

The Integrated Program Lifecycle System follows a strict hierarchy:

```
Programme Strategy
    ↓ (authority)
Programme Design (PD)
    ↓ (materialization, one-way)
Project Management Execution (PM)
    ↓ (records)
Evidence
    ↓ (feedback, upward only)
Learning
    ↓ (synthesis)
Reporting
```

Programme Design owns design truth. Project Management owns execution truth.
Materialization is one-way (PD → PM). Execution signals feed back upward as
read-only data. The Control Center (`controlCenterModel.ts`) is the canonical
aggregation point for all PM execution signals consumed by PD monitoring.

All future implementation must respect:
1. Module ownership defined in this matrix
2. Lineage rules (every PM artifact traces to PD source)
3. Forbidden mutations (PM never mutates PD design)
4. Signal rules (PM→PD is read-only, never automatic)
5. Authority hierarchy (strategy → design → execution → evidence)

## Related ADRs and Files

- `docs/architecture/decisions/0006-canonical-lfa-hierarchy.md`
- `docs/architecture/decisions/0007-programme-design-canonical-architecture.md`
- `docs/architecture/decisions/0008-programme-design-finance-canonical-contract.md`
- `src/lib/project-management/executionModel.ts`
- `src/lib/project-management/financeModel.ts`
- `src/lib/project-management/bottleneckModel.ts`
- `src/lib/project-management/controlCenterModel.ts`
- `src/lib/lfa/readAdapter.ts`
- `src/lib/budget/budgetModel.ts`
