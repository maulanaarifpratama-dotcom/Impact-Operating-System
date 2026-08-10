# ADR 0007: Programme Design Canonical Architecture

## Status

Accepted

## Date

2026-08-10

## Context

PM canonical foundation is complete and locked (Work Plan, Timeline, Deliverables,
Completion Claim, Finance, Bottleneck, Control Center). Programme Design is the
upstream domain that designs impact, measures impact, learns from impact,
evaluates impact, and reports impact. It must remain an independent domain that
does not depend on PM structure.

Programme Design (PD) and Project Management (PM) share the same underlying
database tables (`lfa_projects`, `lfa_wbs_items`, `lfa_budget_items`,
`lfa_meal_items`) but they are DISTINCT domains with different purposes,
lifecycles, and boundaries.

---

## 1. PD Ownership Matrix

| Entity | Canonical Source | Owner | Readers |
|--------|-----------------|-------|---------|
| Goal / Impact | `lfa_entries` (level='goal') | PD Designer | PM (read-only) |
| Purpose / Outcome | `lfa_entries` (level='purpose') | PD Designer | PM (read-only) |
| Outcome | `lfa_entries` (level='outcome') — Expanded Mode | PD Designer | PM (read-only) |
| Output | `lfa_entries` (level='output') | PD Designer | PM (read-only) |
| PD Activity | `lfa_entries` (level='activity') | PD Designer | PM (read-only) |
| Indicator | `lfa_entries.indicator` (string) → target: structured child | PD Designer / MEAL | PM (read-only) |
| Means of Verification | `lfa_entries.means_of_verification` (string) → target: structured child | PD MEAL | PM (read-only) |
| Assumption | `lfa_entries.assumption` (string) → target: structured child | PD Designer | PM (read-only) |
| PD Budget Item | `lfa_budget_items` (used in programme_design context) | PD Designer | PM (read planned) |
| MEAL Indicator | `lfa_meal_items` | PD MEAL | PM (read-only) |
| SROI Outcome | `sroi_outcomes` | PD SROI | PM (read-only) |
| Commitment | `project_budget_commitments` | PM Finance | PD (read-only) |
| Expenditure | `project_budget_expenditures` | PM Finance | PD (read-only) |
| Funding Source | `project_funding_sources` | PM Finance | PD (read-only) |

### Canonical Source Files

| Domain | Canonical File |
|--------|---------------|
| LFA Hierarchy | `src/lib/lfa/readAdapter.ts`, `src/lib/lfa/editorCanonicalBridge.ts` |
| LFA Types | `src/lib/lfa/types.ts` |
| GrantWriter Output | `src/lib/grant-writer/deterministic/types.ts` |
| PD Budget | `src/lib/budget/budgetModel.ts`, `src/lib/budget/mirrorBudgetModel.ts` |
| PD MEAL | `src/pages/dashboard/lfa-builder/MEALPlanner.tsx`, `src/lib/lfa/qualityEngine.ts` |
| PD SROI | `src/pages/dashboard/lfa-builder/SROICalculator.tsx` |
| Materialization | `supabase/migrations/20260728200000_map_generated_budget_unit_price.sql` (RPC) |
| ADR: LFA Hierarchy | `docs/architecture/decisions/0006-canonical-lfa-hierarchy.md` |

---

## 2. PD Lifecycle

```
Design (LFA Matrix)
    ↓
Budget Planning (PD Budget)
    ↓
MEAL Framework (Indicators, MoV, Sources)
    ↓
Materialization (PD → PM handoff)
    ↓
Monitoring (via PM execution signals feeding back to PD MEAL)
    ↓
Learning (evaluation findings, org learning)
    ↓
SROI (outcome valuation)
    ↓
Reporting (impact reports, sustainability reports)
```

### Design Phase

- Goal, Purpose, Outcome, Output, Activity defined via LFA Builder
- GrantWriter generates canonical proposal (deterministic, not AI for prices)
- Budget allocation planned per Activity/WBS
- MEAL framework established (indicators, methods, sources, frequency)

### Monitoring Phase

- PM executes Work Plan Activities
- PM records completion claims and evidence
- PD MEAL reads execution signals (not PM state directly)
- PD MEAL tracking entries record actual indicator values

### Learning Phase

- Evaluation findings captured from observed evidence
- Org learning notes document lessons
- Learning feeds back into future programme design

### SROI Phase

- Outcome valuation based on PD indicators and PM evidence
- Stakeholder change quantification
- Impact value calculation

### Reporting Phase

- Impact reports aggregate PD + PM data
- Sustainability reports (ESG, carbon)
- Monthly operating review

---

## 3. PD ↔ PM Boundary Matrix

### Allowed: PD → PM

| Flow | Mechanism |
|------|-----------|
| PD Activity → PM Work Plan (materialization) | `materialize_grantwriter_document` RPC |
| PD Budget → PM Finance planned baseline | Same `lfa_budget_items` table read |
| PD WBS structure → PM Work Plan structure | Materialization RPC creates WBS from LFA |
| PD MEAL indicators → PM execution targets | Pulled by PM MEAL for tracking |
| PD LFA → PM Stage grouping | WBS items use `stage_id` from PD Stage grouping |

### Allowed: PM → PD (Execution Signals Only)

| Flow | Mechanism |
|------|-----------|
| PM completion claims → PD MEAL tracking | `wbs_completion_claims` → PD reads evidence |
| PM actual expenditure → PD budget tracking | `actual_amount_idr` (legacy) / `project_budget_expenditures` (normalized) |
| PM execution progress → PD monitoring | `progress_percent` on WBS items |
| PM evaluation findings → PD learning | `evaluation_findings` → org learning |

### Forbidden

| Violation | Reason |
|-----------|--------|
| PM modifies Goal / Purpose / Outcome / Output | PD owns design; PM only executes |
| PM modifies PD Budget structure | PD plans; PM only tracks actuals |
| PM creates LFA entries | PM works on WBS; LFA is PD domain |
| PM modifies MEAL indicators | PD designs measurement framework |
| PM modifies SROI outcomes | SROI evaluates PD outcomes, not PM tasks |
| PD reads PM commitment lifecycle | PD reads planned; commitment is PM execution |
| PD creates expenditure records | Expenditure is PM Finance domain |
| PD reads PM bottleneck status directly | Bottleneck is PM constraint domain; PD reads derived signals |

---

## 4. Materialization Contract

### Current State: PARTIAL

Materialization exists as:
- `materialize_grantwriter_document` RPC (creates WBS + budget from GrantWriter output)
- Budget auto-populate via `wbs_budget_auto_populate` RPC
- LFA matrix materialization via `materialize_lfa_matrix_transactional` RPC

### Canonical Flow

```
GrantWriter Proposal (CanonicalProposalPayloadV2)
    ↓ materializeCanonicalProposalToLfaView()
LFA View (CanonicalLfaView)
    ↓ materialize_grantwriter_document RPC
PM Structure:
    - WBS Items (from PD Activities + Outputs)
    - Budget Items (from cost drivers)
    - MEAL Items (from indicators)
    - SROI Outcomes (from outcomes)
```

### PD Activity → PM Work Plan Mapping

```
1 PD Activity (Intervention Unit)
    ↓
N PM Activities (Execution Units)

Example:
  PD: Pelatihan UMKM
    → PM: Persiapan Batch 1
    → PM: Workshop Batch 1
    → PM: Workshop Batch 2
    → PM: Evaluasi Kegiatan
```

### Materialization Boundary

- Materialization is a ONE-WAY operation (PD → PM)
- After materialization, PD and PM evolve independently
- PD can be re-materialized (creates new PM structure; does not overwrite)
- PM execution data feeds back as READ-ONLY signals to PD
- Materialization respects existing data (preservation mode for WBS, budget)

---

## 5. Gap Analysis

### COMPLETE

| Area | Status | Evidence |
|------|--------|----------|
| LFA Hierarchy (Goal→Purpose→Output→Activity) | COMPLETE | `editorCanonicalBridge.ts`, ADR 0006 |
| LFA Editor (manual entry) | COMPLETE | `LFABuilderEditor.tsx` |
| GrantWriter generation (deterministic) | COMPLETE | `src/lib/grant-writer/deterministic/` |
| Materialization RPC | COMPLETE | Multiple migration RPCs |
| PD Budget (simple/professional) | COMPLETE | `budgetModel.ts`, `BudgetCalculator.tsx` |
| PD MEAL Framework | COMPLETE | `MEALPlanner.tsx` |
| Budget provenance (unverified labels) | COMPLETE | `budget-provenance.ts` (GW-B1) |
| SROI Calculator | COMPLETE | `SROICalculator.tsx` |

### PARTIAL

| Area | Status | Gap |
|------|--------|-----|
| Indicator as structured child | PARTIAL | Currently embedded string in `lfa_entries.indicator`; ADR 0006 targets structured child record |
| MoV as structured child | PARTIAL | Currently embedded string; MEAL items partially cover this |
| Outcome level (Expanded Mode) | PARTIAL | Exists in type system but not in every runtime path |
| Materialization outcome support | PARTIAL | RPC creates WBS; Outcome-level materialization not fully implemented |
| PD ↔ PM evidence linkage | PARTIAL | MEAL tracking linked to WBS but not fully bi-directional |
| Learning feedback loop | PARTIAL | `orgLearningModel.ts` exists; automated PD learning pipeline not complete |

### MISSING

| Area | Status | Gap |
|------|--------|-----|
| Native Outcome database level | MISSING | Uses `purpose` rows; migration not approved |
| PD Reporting (standalone) | MISSING | Reports currently embed both PD and PM data without clean separation |
| PD read-model (equivalent to Control Center for PM) | MISSING | `ProgramHealthSummary.tsx` is cross-domain; PD lacks dedicated health/summary model |
| PD Assumption validation workflow | MISSING | Assumptions are stored as text; no structured validation lifecycle |
| PD → PM artifact versioning | MISSING | No version linkage between PD design and PM execution snapshots |

---

## Decision

Programme Design is the canonical UPSTREAM domain. Project Management is the
canonical DOWNSTREAM domain.

All current PD code at:
- `src/lib/lfa/` (LFA types, adapters, editor bridge, quality engine)
- `src/pages/dashboard/lfa-builder/` (LFA Builder, Budget Calculator, MEAL Planner, SROI)
- `src/lib/grant-writer/deterministic/` (proposal generation, output expansion, fixtures)
- `src/lib/budget/` (PD Budget model, mirror budget, target budget)

constitutes the Programme Design source of truth.

PM contacts (`src/lib/project-management/`, `src/pages/dashboard/project-management/`)
are the downstream execution domain.

The PD ↔ PM boundary follows one unidirectional rule:
- **PD may materialize into PM.**
- **PM may feed execution signals back to PD.**
- **PM must never modify PD design artifacts.**

## Consequences

### Positive
- Clear domain ownership prevents accidental PM modification of PD design
- Materialization contract is explicit and one-way
- PD can evolve independently of PM execution
- PM can add execution-level detail without affecting PD design
- Gap analysis identifies concrete areas for future PD hardening

### Negative
- Some PD and PM share database tables (must rely on application-level boundaries)
- Materialization is currently one-directional (re-materialization not fully idempotent)
- No PD-specific read-model exists (PD uses cross-domain components)
- Legacy string-based Indicator/MoV/Assumption limits structured analysis

## Related Files

- `docs/architecture/decisions/0006-canonical-lfa-hierarchy.md`
- `src/lib/lfa/readAdapter.ts`
- `src/lib/lfa/editorCanonicalBridge.ts`
- `src/lib/lfa/types.ts`
- `src/lib/budget/budgetModel.ts`
- `src/lib/project-management/executionModel.ts`
- `src/lib/project-management/financeModel.ts`
- `src/lib/project-management/controlCenterModel.ts`
