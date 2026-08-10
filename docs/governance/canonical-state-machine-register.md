# Canonical State Machine Register v1.0

## Status

Accepted — Architecture Freeze ADR 0016

## Purpose

This document is the single authoritative source for all lifecycle statuses,
state transitions, transition authorities, and automation boundaries across
the Impactory Integrated Program Lifecycle. It eliminates status ambiguity,
prevents lifecycle fragmentation, and prepares the system for future workflow
automation and AI orchestration.

---

## 1. Governance Principles

| Principle | Definition |
|-----------|-----------|
| One State = One Meaning | Each canonical status has exactly one semantic definition |
| One Meaning = One State | If two modules mean the same thing, they use the same status |
| No Synonyms | `approved` = `accepted` = `verified` is forbidden; pick one |
| Terminal States Explicit | Every lifecycle has documented terminal states |
| Authority Required | Every transition has an explicit role or system authorized to perform it |
| Derived States Not Persisted | If a state is computable from source data, it must not be stored |
| Immutable After Terminal | Records in terminal states cannot be edited directly |

---

## 2. Global Canonical Status Vocabulary

### Platform-Wide Canonical Statuses

| Status | Definition | Entry Criteria | Exit Criteria | Terminal |
|--------|-----------|---------------|---------------|----------|
| `draft` | Being prepared; not yet submitted for review | Record created | User submits | No |
| `submitted` | Submitted for review; locked for creator edits | User submits from `draft` | Reviewer approves or rejects | No |
| `approved` | Reviewer has accepted the record | Reviewer approves from `submitted` | May be superseded or cancelled | **Yes** (in most domains) |
| `rejected` | Reviewer has declined the record | Reviewer rejects from `submitted` | May be corrected and resubmitted (new cycle) | **Yes** |
| `verified` | Independent verifier confirms the record is authentic and complete | Verifier verifies from `resolved` or `approved` | May be closed | No |
| `cancelled` | Record has been voided; no longer active | Authorized user cancels; may require no downstream dependencies | None | **Yes** |
| `closed` | Record lifecycle complete; no further action expected | All conditions met (usually verified + reviewed) | None | **Yes** |
| `published` | Content is visible to intended audience | Authorized publisher publishes from `approved` | May be archived | **Yes** |
| `archived` | Retained for historical reference; not actively used | Record meets retention conditions | None | **Yes** |
| `posted` | Financial transaction recorded; immutable | Authorized user posts from `submitted` | None (correction via reversal) | **Yes** |
| `active` | Record is in effect and operational | Approved or equivalent gateway | May be cancelled or superseded | No |

### Status Ambiguity Resolution

| Ambiguous Pair | Resolution | Reason |
|---------------|------------|--------|
| `approved` vs `accepted` | Use `approved` | Standard across PD, PM, Finance, Deliverables |
| `verified` vs `validated` | Use `verified` | Bottleneck, Evidence, Evaluation all use `verified` |
| `completed` vs `closed` | `completed` = execution done; `closed` = lifecycle done | Work Plan vs Completion Claims vs Finance |
| `cancelled` vs `abandoned` | Use `cancelled` | Consistent across Finance and Bottleneck |
| `published` vs `released` | Use `published` | Learning and Reporting domains |
| `blocked` vs `on_hold` | Use `blocked` (derived from blocker_category) | Bottleneck pattern (executionModel) |
| `paid` vs `posted` | Use `posted` | PM-F2 contract; `paid` is legacy `wbs_financial_status` |

---

## 3. Programme Design State Machines

### Proposal (GrantWriter)

```
draft → generating → completed
```

| Status | Canonical Source | Terminal |
|--------|-----------------|----------|
| `draft` | `gw_projects.status` | No |
| `generating` | `gw_projects.status` | No |
| `completed` | `gw_projects.status` | **Yes** |

*Note: Proposal is pre-design; no approval workflow. `completed` means ready for LFA import.*

### LFA Matrix

```
design → materialized
```

| Status | Canonical Source | Terminal |
|--------|-----------------|----------|
| `design` (implicit) | LFA entries exist | No |
| `materialized` | Materialization RPC completed | **Yes** (per version) |

*Note: LFA entries are versioned via `lfa_materializations`. Re-materialization creates new version; previous versions preserved.*

### WBS Design

WBS design items have no persisted lifecycle status. They are structural artifacts.
Status is implicit: exists in PD = available for materialization.

### Budget Design

Budget items have no persisted lifecycle status. They are planning artifacts.
`mode` field distinguishes simple/professional — not lifecycle.

### MEAL Design

MEAL items have no persisted lifecycle status. They are measurement framework artifacts.

---

## 4. Materialization State Machine

```
not_materialized → materialized
```

| Transition | Trigger | Authority | Rules |
|-----------|---------|-----------|-------|
| `not_materialized` → `materialized` | User invokes materialization RPC | PD Designer or GrantWriter flow | One-way; lineage preserved; source identity recorded |
| `materialized` → (rematerialized) | User invokes materialization RPC again | PD Designer | Creates new PM rows; preserves existing execution data |
| `materialized` → (no reverse) | N/A | N/A | **Forbidden** — materialization is irreversible |

---

## 5. PM Execution State Machines

### Work Plan Activity

```
not_started → in_progress → completed
                     ↘ blocked (optional)
not_started → cancelled
in_progress → cancelled
```

| Status | Canonical Source | Terminal | Authority |
|--------|-----------------|----------|-----------|
| `not_started` | `executionModel.getExecutionBucket()` | No | PM Owner → `execute_wbs_item` RPC |
| `in_progress` | `executionModel.getExecutionBucket()` | No | PM Owner via execution RPCs |
| `completed` | `executionModel.getExecutionBucket()` | **Yes** | System (completion claim verified OR manual complete) |
| `cancelled` | WBS item status | **Yes** | PM Owner (if no active downstream dependencies) |

**Derived (not stored):**
- `blocked` — `executionModel.isBlocked()` returns true when `blocker_category` is set
- `overdue` — `executionModel.isOverdue()` returns true when `end_date` < now AND status ≠ completed

### Project Stages

```
planned → in_progress → completed
                   ↘ blocked
planned → cancelled
```

| Status | Canonical Source | Terminal |
|--------|-----------------|----------|
| `planned` | `project_stages.status` (or derived from dates) | No |
| `in_progress` | `project_stages.status` | No |
| `completed` | `project_stages.status` | **Yes** |
| `blocked` | Derived from child WBS bottlenecks | No |

### Project Objectives

```
active → completed → archived
  ↘ archived (direct)
```

| Status | Canonical Source | Terminal |
|--------|-----------------|----------|
| `active` | `project_objectives.status` | No |
| `completed` | `project_objectives.status` | **Yes** |
| `archived` | `project_objectives.archived_at` | **Yes** |

---

## 6. Deliverable State Machine

```
draft → submitted → under_review → approved
                              ↘ changes_requested → submitted
draft → cancelled
```

*Implemented as: `programme_deliverables.lifecycle_status`*

| Status | Authority | Terminal | RPC |
|--------|-----------|----------|-----|
| `draft` | PM Owner (create) | No | `create_programme_deliverable` |
| `submitted` | PM Owner (submit) | No | Deliverable lifecycle RPC |
| `under_review` | System (after submit) | No | Implicit |
| `approved` | Reviewer | **Yes** | `update_programme_deliverable_metadata` |
| `changes_requested` | Reviewer | No | Deliverable lifecycle RPC |
| `cancelled` | PM Owner | **Yes** | `archive_programme_deliverable` |

---

## 7. Completion Claim (ACR) State Machine

```
draft → submitted → verified
                   ↘ rejected
```

*Canonical: `executionModel.getClosureStatus()` from `wbs_completion_claims.status`*

| Status | Canonical | Terminal | Authority |
|--------|-----------|----------|-----------|
| `draft` | ACR status | No | PM Owner |
| `submitted` | ACR status (`DOCUMENTED_CLAIM_STATUS`) | No | PM Owner → `submit_wbs_completion_claim` RPC |
| `verified` | ACR status (`CLOSED_CLAIM_STATUS`) | **Yes** | Reviewer → `review_wbs_completion_claim` RPC |
| `rejected` | ACR status | **Yes** | Reviewer; may be resubmitted as new claim |

**Closure Status (derived from ACR):**
- `open` — no claim or claim is draft/rejected
- `documented` — claim submitted (status = 'submitted')
- `closed` — claim verified (status = 'verified')

---

## 8. Evidence State Machine

```
created → submitted → reviewed → verified → consumed → archived
                                          ↘ rejected
```

| Status | Authority | Terminal | Reference |
|--------|-----------|----------|-----------|
| `created` | Evidence provider | No | ADR 0011 §3 |
| `submitted` | Evidence provider | No | ADR 0011 §3 |
| `reviewed` | Reviewer | No | ADR 0011 §3 |
| `verified` | Reviewer | **Yes** | ADR 0011 §5 |
| `rejected` | Reviewer | **Yes** | ADR 0011 §3 |
| `consumed` | Consumer (Evaluation, Learning, SROI) | No | ADR 0011 §6 |
| `archived` | System | **Yes** | ADR 0011 §3 |

---

## 9. Finance State Machines

### Commitment

```
draft → submitted → approved → cancelled (if no linked actual)
                   ↘ rejected
```

| Status | Canonical Source | Terminal | Authority |
|--------|-----------------|----------|-----------|
| `draft` | `project_budget_commitments.workflow_status` | No | PM Finance Owner |
| `submitted` | Persisted | No | PM Finance Owner → `submit_commitment` RPC |
| `approved` | Persisted | **Yes** (immutable amount) | PM Finance Owner → `approve_commitment` RPC |
| `rejected` | Persisted | **Yes** | PM Finance Owner → `reject_commitment` RPC |
| `cancelled` | Persisted | **Yes** | PM Finance Owner → `cancel_commitment` RPC (only if no posted actual) |

### Expenditure

```
draft → submitted → posted → (reversal)
                   ↘ rejected
```

| Status | Canonical Source | Terminal | Authority |
|--------|-----------------|----------|-----------|
| `draft` | `project_budget_expenditures.workflow_status` | No | PM Finance Owner |
| `submitted` | Persisted | No | PM Finance Owner → `submit_expenditure` RPC |
| `posted` | Persisted | **Yes** (immutable; correction via reversal) | PM Finance Owner → `post_expenditure` RPC |
| `rejected` | Persisted | **Yes** | PM Finance Owner → `reject_expenditure` RPC |
| Reversal | New `posted` record with `reversal_of_id` set | **Yes** (immutable) | PM Finance Owner → `reverse_expenditure` RPC |

### Funding Source

```
draft → submitted → approved → cancelled (if no posted receipt + no active installment)
                   ↘ rejected
```

### Funding Installment

```
draft → scheduled → cancelled (if no net receipt)
```

**Derived (not stored):**
- `fully_received`, `partially_received`, `over_received`, `overdue`, `awaiting_receipt`, `upcoming`
  — `financeModel.computeInstallmentDerivedState()`

### Funding Receipt

```
draft → submitted → posted → (reversal)
                   ↘ rejected
```

---

## 10. Bottleneck State Machine

```
open → in_progress → resolved → verified → closed
                 ↘ resolved → in_progress (rollback)
                 ↘ verified → in_progress (rollback)
```

| Status | Canonical Source | Terminal | Authority |
|--------|-----------------|----------|-----------|
| `open` | `bottleneckModel.BottleneckStatus` | No | PM Owner |
| `in_progress` | Canonical | No | PM Owner |
| `resolved` | Canonical | No | PM Owner (requires `resolution_notes`) |
| `verified` | Canonical | No | Reviewer (separate from resolver) |
| `closed` | Canonical | **Yes** | Reviewer after verification |

**Forbidden transitions:**
- `open` → `closed` (must be verified first)
- `open` → `verified` (must be resolved first)
- `in_progress` → `closed` (must be verified first)

---

## 11. Evaluation State Machine

```
planned → in_progress → evidence_review → analysis → finding_draft → approved → closed
```

| Status | Authority | Terminal | Reference |
|--------|-----------|----------|-----------|
| `planned` | PD Evaluator | No | ADR 0012 §3 |
| `in_progress` | PD Evaluator | No | ADR 0012 §3 |
| `evidence_review` | PD Evaluator | No | ADR 0012 §3 |
| `analysis` | PD Evaluator | No | ADR 0012 §3 |
| `finding_draft` | PD Evaluator | No | ADR 0012 §3 |
| `approved` | PD Evaluator (self or peer) | **Yes** | ADR 0012 §3 |
| `closed` | PD Evaluator | **Yes** | ADR 0012 §3 |

*Note: Evaluation lifecycle is conceptual (ADR 0012 readiness = LOW). Current implementation only has `project_evaluation_findings` with no status field.*

---

## 12. Learning State Machine

```
draft → published → (superseded)
```

| Status | Canonical Source | Terminal | Reference |
|--------|-----------------|----------|-----------|
| `draft` | `org_learning_notes.status` | No | `orgLearningModel.ts` |
| `published` | `org_learning_notes.status` | **Yes** (immutable) | `orgLearningModel.ts` |

*Note: Published learning notes are permanent organizational knowledge. They may be superseded by new insights but never deleted.*

---

## 13. SROI State Machine

```
planned → configured → evidence_review → valuation → approved → published
```

| Status | Authority | Terminal | Reference |
|--------|-----------|----------|-----------|
| `planned` | PD SROI Analyst | No | ADR 0014 |
| `configured` | PD SROI Analyst | No | ADR 0014 |
| `evidence_review` | PD SROI Analyst | No | ADR 0014 |
| `valuation` | PD SROI Analyst | No | ADR 0014 |
| `approved` | PD SROI Analyst | **Yes** | ADR 0014 |
| `published` | PD SROI Analyst | **Yes** | ADR 0014 |

*Note: SROI lifecycle is conceptual. Current implementation is a calculator with no status field.*

---

## 14. Reporting State Machine

```
draft → generated → reviewed → approved → published → archived
```

| Status | Authority | Terminal | Reference |
|--------|-----------|----------|-----------|
| `draft` | PD Reporting | No | ADR 0015 §3 |
| `generated` | System (or PD Reporting) | No | ADR 0015 §3 |
| `reviewed` | PD Reporting reviewer | No | ADR 0015 §3 |
| `approved` | Programme Lead | **Yes** (immutable snapshot) | ADR 0015 §3 |
| `published` | System | **Yes** | ADR 0015 §3 |
| `archived` | System | **Yes** | ADR 0015 §3 |

---

## 15. Transition Authority Matrix

| Transition | Owner | Member | Reviewer | System |
|-----------|-------|--------|----------|--------|
| `draft` → `submitted` | **Yes** | No | No | No |
| `submitted` → `approved` | No | No | **Yes** | No |
| `submitted` → `rejected` | No | No | **Yes** | No |
| `draft` → `cancelled` | **Yes** | No | No | No (backend may reject if downstream dependencies) |
| `resolved` → `verified` | No | No | **Yes** (separate from resolver) | No |
| `verified` → `closed` | No | No | **Yes** | No |
| `approved` → `cancelled` | **Yes** | No | No | No (backend may reject if posted actuals) |
| `draft` → `posted` (financial) | Not allowed | Not allowed | Not allowed | Must go through `submitted` |
| `resolved` → `closed` (bottleneck) | Not allowed | Not allowed | Not allowed | Must go through `verified` |
| `not_materialized` → `materialized` | **Yes** (explicit action) | No | No | RPC executes |
| Any terminal → edit | Not allowed | Not allowed | Not allowed | Not allowed |

---

## 16. Automation Safety Matrix

| Transition | Safe for Automation | Requires Human | Rationale |
|-----------|--------------------|----------------|-----------|
| `draft` → `generated` (report) | **Yes** | No | Deterministic data aggregation |
| Status derived from data (blocked, overdue, health) | **Yes** | No | Pure computation from canonical sources |
| `submitted` → `approved` | No | **Yes** | Financial or design approval requires judgment |
| `submitted` → `rejected` | No | **Yes** | Rejection requires reason and authority |
| `resolved` → `verified` | No | **Yes** | Verification requires independent human review |
| `posted` → reversal | No | **Yes** | Financial correction requires deliberate action |
| `not_materialized` → `materialized` | No | **Yes** | Materialization is a deliberate PD → PM handoff |
| Dashboard health computation | **Yes** | No | Read-model aggregation only |
| KPI computation | **Yes** | No | Deterministic from canonical sources |

---

## 17. Conflict Analysis

| Conflict | Severity | Detail | Recommendation |
|----------|----------|--------|---------------|
| `completed` vs `closed` across domains | **LOW** | Work Plan uses `completed` (execution done); Completion Claims uses `closed` (lifecycle done); Finance uses `closed` (reconciled). Different semantics → different states — no conflict. | Document the distinction; no renaming needed. |
| `paid` (legacy `wbs_financial_status`) vs `posted` (PM-F2) | **LOW** | `paid` is legacy WBS-level status; `posted` is canonical expenditure status. Migration `20260808080000` removed `blocked_by_finance` from the enum. | `paid` is legacy compatibility; `posted` is canonical. No conflict in current code. |
| `approved` used in multiple domains | **LOW** | Funding source `approved`, commitment `approved`, deliverable `approved`, evaluation finding `approved` — same word, different domain scopes. | Acceptable — domain context disambiguates. |
| `verified` in Bottleneck vs Evidence | **LOW** | Same semantics (independent confirmation). Consistent nomenclature. | No conflict. |
| No status field on Evaluation Findings | **MEDIUM** | `project_evaluation_findings` has no status field. Findings are implicitly "approved" on creation. | Add status field when Evaluation readiness improves (P1). |

---

## 18. Readiness Assessment

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| Lifecycle Clarity | **HIGH** | All 13 domain state machines documented; transitions explicit |
| Workflow Consistency | **HIGH** | Canonical models enforce transitions in code (executionModel, financeModel, bottleneckModel) |
| Automation Readiness | **MEDIUM** | Derived states are identified; deterministic computation paths exist. Cross-domain automation (evaluation→learning→design) not yet structural. |
| AI Readiness | **MEDIUM** | AI may read statuses; AI must never transition statuses without explicit allowlist. Allowlist not yet defined. |

---

## Related Files

- `src/lib/project-management/executionModel.ts` — Work Plan, Blocked, Overdue, Closure status
- `src/lib/project-management/financeModel.ts` — Finance health, funding derived states
- `src/lib/project-management/bottleneckModel.ts` — Bottleneck lifecycle + transitions
- `src/lib/project-management/controlCenterModel.ts` — Aggregated health
- `docs/architecture/decisions/0010-*.md` through `0016-*.md` — All ADRs
- `docs/governance/canonical-field-ownership-matrix.md` — Field ownership
