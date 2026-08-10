# ADR 0008: Programme Design ↔ Finance Canonical Contract

## Status

Accepted

## Date

2026-08-10

## Context

ADR 0007 established Programme Design as the upstream domain and Project Management
as the downstream domain. However, Finance spans both domains: PD designs the budget
and funding plan, while PM executes and tracks spending.

Two canonical Finance models exist:
- `src/lib/budget/budgetModel.ts` — Programme Design Budget (planning artifact)
- `src/lib/project-management/financeModel.ts` — Project Management Finance (execution signals)

Both share the same underlying table (`lfa_budget_items`) but serve different purposes.
PM Finance additionally uses normalized ledgers (`project_budget_commitments`,
`project_budget_expenditures`, `project_funding_sources`, etc.) that PD does not touch.

This ADR locks the ownership, lifecycle, and boundary between PD Budget Design
and PM Financial Execution.

---

## 1. Finance Ownership Matrix

### PD Owned (Design Phase)

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Budget Framework (categories, structure) | PD Designer | PM (read-only) | `budgetModel.ts` |
| Cost Structure (direct, indirect, overhead) | PD Designer | PM (read-only) | `budgetModel.ts` |
| Budget Line Design (item name, category, unit) | PD Designer | PM (read-only) | `lfa_budget_items` row |
| Funding Source Plan (grant, self, partner, inkind) | PD Designer | PM (read-only) | `lfa_budget_items.funding_source` |
| Budget Assumptions (justification, donor requirements) | PD Designer | PM (read-only) | `lfa_budget_items.justification` |
| Planned Budget (volume × unit_price_idr) | PD Designer | PM (read-only) | `financeModel.ts §2` |
| Budget Scenario / Efficiency (NGO mode 70%) | PD Designer | PM (read-only) | `mirrorBudgetModel.ts` |
| Target Budget (project-level reference) | PD Designer | PM (read-only) | `targetBudget.ts` |

### PM Owned (Execution Phase)

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Actual Spending (legacy scalar) | PM Finance | PD (read-only) | `lfa_budget_items.actual_amount_idr` (deprecated) |
| Net Actual Expenditure (normalized ledger) | PM Finance | PD (read-only) | `project_budget_expenditures` |
| Budget Commitment (approved obligations) | PM Finance | PD (read-only) | `project_budget_commitments` |
| Committed Outstanding | PM Finance | PD (read-only) | `financeModel.ts §2` |
| Exposure (actual + committed outstanding) | PM Finance | PD (read-only) | `financeModel.ts §2` |
| Utilization % (actual / planned × 100) | PM Finance | PD (read-only) | `financeModel.ts` |
| Burn Rate (actual / duration months) | PM Finance | PD (read-only) | `budgetModel.ts` |
| Financial Variance (planned − actual) | PM Finance | PD (read-only) | `financeModel.ts` |
| Finance Health (healthy/watch/critical/overspent) | PM Finance | PD (read-only) | `financeModel.ts` |
| Cash Received (funding receipts) | PM Finance | PD (read-only) | `project_funding_receipts` |
| Cash Available (net received − net actual) | PM Finance | PD (read-only) | `financeModel.ts §3` |
| Funding Coverage (received / planned × 100) | PM Finance | PD (read-only) | `financeModel.ts §3` |
| Financial Bottleneck (blocker_category = 'financial') | PM Bottleneck | PD (read-only) | `bottleneckModel.ts` |

### PM Owned (Funding Phase — PM-F3)

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Funding Source (agreement/grant) | PM Finance | PD (read-only) | `project_funding_sources` |
| Funding Installment (termin schedule) | PM Finance | PD (read-only) | `project_funding_installments` |
| Funding Receipt (cash-in transaction) | PM Finance | PD (read-only) | `project_funding_receipts` |
| Receipt Reversal | PM Finance | PD (read-only) | `project_funding_receipts` |
| Funding Aggregate (net received, outstanding) | PM Finance | PD (read-only) | `financeModel.ts §3` |

---

## 2. Finance Lifecycle

```
Programme Design (LFA, Activity, Indicator)
    ↓
Budget Design (PD Budget Planning)
    ├── Budget Framework (categories, cost structure)
    ├── Budget Lines (item name, volume, unit, unit price)
    ├── Funding Plan (grant, self, partner)
    ├── Scenario Analysis (NGO multiplier, efficiency)
    └── Target Budget (project reference)
    ↓ Owner: PD Designer
    ↓
Materialization (PD → PM handoff)
    ├── PD Budget Lines → PM Financial Tracking Objects
    ├── planned = volume × unit_price_idr (becomes PM baseline)
    └── One-way operation; PD design preserved
    ↓ Owner: Materialization RPC (system)
    ↓
Financial Execution (PM Execution Phase)
    ├── Commitment (approved obligations against budget lines)
    ├── Expenditure (actual spending records)
    ├── Reversal (correction via new records)
    ├── Funding (cash-in receipts, installment tracking)
    └── Cash Position (net received vs net spent)
    ↓ Owner: PM Finance Owner
    ↓
Monitoring (PD reads execution signals)
    ├── Variance = planned − actual
    ├── Utilization = actual / planned × 100
    ├── Finance Health = classifyFinanceHealth(planned, actual)
    ├── Funding Coverage = received / planned × 100
    ├── Burn Rate = actual / duration months
    └── Financial Bottlenecks (blocker_category = 'financial')
    ↓ Owner: PD reads; PM provides
    ↓
Variance Analysis (PD evaluation)
    ├── Over/under budget identification
    ├── Category-level variance drill-down
    ├── Funding gap analysis
    └── Efficiency assessment
    ↓ Owner: PD MEAL / Evaluation
    ↓
Learning (feedback loop)
    ├── Budget assumptions validated against execution
    ├── Cost estimation accuracy improved
    ├── Funding pipeline adjusted
    └── Future programme design informed
    ↓ Owner: PD Learning
    ↓
Reporting (impact + financial)
    ├── Financial summary (planned vs actual vs committed)
    ├── Funding overview (received vs outstanding)
    ├── Efficiency metrics (cost per outcome)
    └── SROI integration (financial input to social value)
    ↓ Owner: PD Reporting
```

---

## 3. PD ↔ Finance Boundary Matrix

### Allowed: PD → PM Finance

| Flow | Data | Mechanism |
|------|------|-----------|
| PD Budget Line → PM planned baseline | `volume × unit_price_idr` | Same row in `lfa_budget_items` |
| PD Funding Plan → PM funding reference | `funding_source` field | Same row; PM reads |
| PD Cost Category → PM cost tracking | `cost_category` field | Same row; PM reads |
| PD Budget Structure → PM WBS linkage | `wbs_item_id` FK | Same row; PM reads |
| PD Target Budget → PM coverage reference | `lfa_projects.target_budget_idr` | PM reads for coverage % |
| PD Activity tier → PM budget grouping | Materialization RPC | Creates budget items per Activity |

### Allowed: PM Finance → PD (Execution Signals Only)

| Flow | Data | Mechanism |
|------|------|-----------|
| PM actual expenditure → PD variance analysis | `actual_amount_idr` / normalized ledger | PD reads; does not modify |
| PM utilization % → PD monitoring | Derived from actual/planned | PD reads PM aggregate |
| PM Finance Health → PD risk assessment | `classifyFinanceHealth()` result | PD reads canonical signal |
| PM committed outstanding → PD exposure view | Ledger aggregation | PD reads for planning review |
| PM cash received → PD funding coverage | `net_received_cash` from aggregate | PD reads for donor reporting |
| PM financial bottleneck → PD constraint signal | `blocker_category = 'financial'` | PD reads derived signal |
| PM burn rate → PD timeline review | Actual / duration months | PD reads for schedule alignment |

### Forbidden

| Violation | Reason |
|-----------|--------|
| PM modifies PD Budget Line quantity, unit, or price | PD owns planned allocation design |
| PM modifies PD Budget Framework (categories, structure) | PD owns cost structure |
| PM modifies PD Funding Source Plan | PD owns funding strategy |
| PM modifies PD Budget Assumptions (justification) | PD owns design rationale |
| PM creates PD Budget Lines during execution | PD designs; PM only tracks execution |
| PD modifies PM expenditure records | PM owns financial actuals |
| PD creates PM commitment records | PM owns obligation lifecycle |
| PD modifies PM funding receipts | PM owns cash-in transactions |
| PD reads PM raw commitment/expenditure tables directly | PD consumes aggregates, not raw ledgers |
| PD reports PM commitment status as PD data | Attribution must distinguish design from execution |

---

## 4. Materialization Contract

### PD Budget → PM Financial Baseline

```
PD Budget Line (design phase)
    ├── item_name: String
    ├── category: String (Honorarium, Transport, etc.)
    ├── volume: Numeric
    ├── unit: String (Orang, Hari, Paket)
    ├── unit_price_idr: Numeric
    ├── funding_source: Enum (grant, self, partner, inkind)
    ├── justification: Text
    ├── wbs_item_id: UUID (links to PD Activity)
    └── mode: Enum (simple, professional)
    ↓
Materialization (one-way, traceable)
    ├── Sources: GrantWriter deterministic engine, LFA Builder manual entry,
    │            Activity Autoload (BUDGET-R2)
    ├── planned = volume × unit_price_idr (becomes PM baseline)
    ├── Source identity preserved (mode, funding_source)
    └── Legacy actual_amount_idr = NULL for new rows (PM-F2B1 fix)
    ↓
PM Financial Baseline (execution phase)
    ├── Same row in lfa_budget_items
    ├── PM adds: actual tracking, commitment linking, expenditure records
    ├── PM adds: normalized ledger (project_budget_commitments,
    │            project_budget_expenditures)
    └── PD does not modify execution-phase fields
```

### Materialization Rules

1. **One-way operation**: PD → PM only. Materialization creates PM structure; never overwrites PD design.
2. **Immutable lineage**: Every PM financial record links back to its PD Budget Line via `budget_item_id`.
3. **Traceable source**: `mode` and `funding_source` fields carry source identity from PD through materialization into PM.
4. **No reverse overwrite**: PM execution data never modifies PD Budget Line design parameters.
5. **Re-materialization**: Creates new PM budget rows; preserves existing execution data.
6. **Activity Autoload**: Programme Design uses deterministic matching from SBM/INKINDO references; all values marked `ESTIMATE_UNVERIFIED`. PM acceptance is explicit user action.

---

## 5. Variance Contract

### Canonical Formulas

| Metric | Formula | Owner | Source |
|--------|---------|-------|--------|
| Planned Budget | `Σ (volume × unit_price_idr)` | PD | `budgetModel.ts`, `financeModel.ts` |
| Net Actual | `Σ (posted expenditure − posted reversal)` | PM | `project_budget_expenditures` |
| Variance | `planned − actual` | PM | `financeModel.ts` |
| Variance % | `(variance / planned) × 100` (if planned > 0) | PM | `financeModel.ts` |
| Utilization % | `(actual / planned) × 100` (if planned > 0) | PM | `financeModel.ts` |
| Commitment % | `(committed outstanding / planned) × 100` | PM | `financeModel.ts` |
| Finance Health | `classifyFinanceHealth(planned, actual)` | PM | `financeModel.ts` |
| Cash Available | `net_received_cash − net_actual` | PM | `financeModel.ts §3` |
| Budget Available | `planned − exposure` | PM | `financeModel.ts §2` |

### Ownership Rules

- **Planned Budget** is PD truth. PM reads. PM does not modify.
- **Variance** is PM truth. PD reads. PD does not compute independently.
- **Finance Health** is PM truth, derived deterministically from planned and actual.
- **Cash Available and Budget Available** are two different concepts. PD reads both but reports them under distinct labels.
- **Null semantics**: unavailable values remain null (never zero). PM-F1 contract enforced.
- **Legacy actual**: `actual_amount_idr` (deprecated scalar). PM-F2B2C establishes per-item precedence: items with normalized ledger records use `net_actual`; items without fall back to legacy scalar.

---

## 6. Learning Contract

Financial execution data feeds back into Programme Design learning:

### What PD Learns From PM Finance

| Learning Input | PM Source | PD Application |
|---------------|-----------|----------------|
| Variance by category | PM actual vs planned per category | Refine cost assumptions for future designs |
| Burn rate vs duration | PM actual spend / duration months | Adjust timeline and budget sizing |
| Utilization trajectory | PM actual/planned over time | Improve estimation accuracy |
| Funding coverage gap | PM received vs planned | Adjust funding strategy |
| Financial bottleneck frequency | PM blocker_category = 'financial' | Address recurring funding obstacles |
| Commitment-to-actual lag | PM approved_at → posted_at delta | Improve cash flow planning |
| Over/under realization by Activity | PM expenditure linked to WBS | Refine Activity-level costing |

### What PD Does NOT Learn From PM Finance

- PD does NOT automatically adjust planned values based on actuals. Budget revision is a deliberate PD action.
- PD does NOT adopt PM commitment amounts as new planned baseline. Commitment is execution, not design.
- PD does NOT treat funding receipts as guaranteed future income. Receipts are historical execution data.

### Learning Integration Points

| Integration | Mechanism | Status |
|-------------|-----------|--------|
| Budget assumptions validation | Compare planned vs actual variance in org learning notes | PARTIAL — `orgLearningModel.ts` exists; automated PD learning pipeline not complete |
| Cost estimation accuracy | Track per-category estimation error over multiple projects | MISSING |
| Funding pipeline optimization | Analyze receipt-to-scheduled ratio across projects | PARTIAL — Funding aggregate exists; cross-project analysis missing |
| Efficiency metrics for SROI | actual cost / outcome achieved ratio | COMPLETE — SROI calculator uses PD budget + PM actuals |

---

## Decision

Programme Design Budget and Project Management Finance are two distinct domains
that share the `lfa_budget_items` table but serve different purposes at different
phases of the project lifecycle.

**PD Budget** is a PLANNING artifact. It lives in `budgetModel.ts`, `mirrorBudgetModel.ts`,
and `targetBudget.ts`. It defines the budget framework, cost structure, and planned
allocation. It may be revised by PD Designers but never by PM execution.

**PM Finance** is an EXECUTION signal. It lives in `financeModel.ts`, `financeCommitments.ts`,
`financeExpenditures.ts`, and `projectFunding.ts`. It tracks actual spending,
commitments, funding receipts, and financial health. It feeds execution signals
back to PD as read-only data.

The boundary is enforced by:
1. Code-level separation (different modules, different UI entry points)
2. Data-level separation (normalized ledger tables are PM-only)
3. Application-level precedence (PM-F2B2C per-item ledger override)
4. Materialization one-way contract (PD → PM, never reverse)

## Consequences

### Positive
- Clear ownership prevents PM from modifying budget design
- PD can plan without PM execution noise
- PM can track execution in normalized ledgers without affecting PD design
- Variance analysis uses canonical PM Finance health — no duplicate computation
- Learning loop from PM execution back to PD design is explicit and traceable

### Negative
- PD and PM share `lfa_budget_items` table (application-level boundary, not structural)
- Legacy `actual_amount_idr` overlap between PD and PM (deprecated; precedence handled by PM-F2B2C)
- No PD-only budget snapshot (PD reads same rows as PM but interprets them differently)
- Cross-domain learning pipeline not fully automated

## Related ADRs and Files

- `docs/architecture/decisions/0006-canonical-lfa-hierarchy.md`
- `docs/architecture/decisions/0007-programme-design-canonical-architecture.md`
- `src/lib/budget/budgetModel.ts` — PD Budget model
- `src/lib/project-management/financeModel.ts` — PM Finance model (§2 Budget, §3 Funding)
- `src/lib/project-management/financeCommitments.ts` — PM Commitment service
- `src/lib/project-management/financeExpenditures.ts` — PM Expenditure service
- `src/lib/project-management/projectFunding.ts` — PM Funding service
