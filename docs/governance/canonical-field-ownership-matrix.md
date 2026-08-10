# Canonical Field Ownership Matrix v1.0

## Status

Accepted — Architecture Freeze ADR 0016

## Purpose

This document defines, at the **field level**, who may write, who may read, and
who may derive from every significant field in the Impactory Integrated Program
Lifecycle. It eliminates ambiguity about write authority, prevents cross-domain
mutation conflicts, and prepares the system for future automation and AI governance.

## Ownership Rules

| Rule | Definition |
|------|-----------|
| One Write Owner | Every persisted field has exactly one domain module authorized to create/update it |
| Many Readers | Any domain may read any field within its RLS scope |
| Derived Values | Computed values (health, percentage, aggregate) carry provenance; never edited directly |
| No Ambiguous Ownership | If a field is written by two different components, one is canonical; the other is deprecated |
| RLS Enforces Write | Backend SECURITY DEFINER RPCs validate ownership; UI guards are defense-in-depth |

---

## 1. Programme Design Fields

### `lfa_entries` (LFA Matrix)

| Field | Write Owner | Readers | Derived Consumers |
|-------|------------|---------|-------------------|
| `description` | PD Designer (`LFABuilderEditor`) | PM (read-only), Reporting | GrantWriter validation |
| `level` (goal/purpose/outcome/output/activity) | PD Designer | PM, MEAL, Reporting | Hierarchy rendering |
| `indicator` | PD Designer | PM, MEAL, Reporting | Monitoring target |
| `means_of_verification` | PD Designer | PM, MEAL | Evidence source reference |
| `assumption` | PD Designer | PM, Reporting | Assumption validation (future) |
| `responsible_party` | PD Designer | PM, Reporting | PIC assignment reference |
| `timeline_start` / `timeline_end` | PD Designer | PM, Reporting | Duration estimate |
| `sequence` | System (display order) | PD, PM, Reporting | Ordering; NOT semantic identity (ADR 0006) |
| `ai_suggestion` | GrantWriter (AI) | PD Designer (review) | AI prompt context |
| `parent_id` | PD Designer | PM, Materialization | Hierarchy traversal |

### `lfa_wbs_items` (WBS Design — Programme Design context)

| Field | Write Owner | Readers | Derived Consumers |
|-------|------------|---------|-------------------|
| `name` | PD Designer (`WBSBuilder`) | PM (read-only) | Work Plan display |
| `level` (1-4) | PD Designer | PM | Structural hierarchy |
| `parent_id` | PD Designer | PM | Tree traversal |
| `stage_id` | PD Designer (design phase) / PM (execution phase) | Both | Stage grouping |
| `sort_order` | PD Designer | PM | Display order |
| `indicator` | PD Designer | PM, MEAL | Indicator tracking |
| `lfa_entry_id` | PD Designer | PM | LFA linkage |
| `source_task_id` | Materialization RPC | PM | Provenance tracking |
| `mode` | PD Designer | PM | Simple/professional distinction |
| `notes` | PD Designer | PM | Design notes |

---

## 2. Budget Fields

### `lfa_budget_items` (shared PD + PM table)

| Field | Write Owner | Readers | Notes |
|-------|------------|---------|-------|
| `item_name` | **PD Designer** | PM | Design-time budget line name |
| `category` | **PD Designer** | PM | Honorarium, Transport, etc. |
| `cost_category` | **PD Designer** | PM | Personnel, Travel, etc. (professional mode) |
| `volume` | **PD Designer** | PM | Design-time quantity |
| `unit` | **PD Designer** | PM | Design-time unit |
| `unit_price_idr` | **PD Designer** | PM | Design-time unit price |
| `funding_source` | **PD Designer** | PM | Grant, self, partner, inkind plan |
| `justification` | **PD Designer** | PM | Budget assumption rationale |
| `needs_donor_approval` | **PD Designer** | PM | Donor requirement flag |
| `sort_order` | **PD Designer** | PM | Display order |
| `mode` | **PD Designer** | PM | Simple/professional budget mode |
| `wbs_item_id` | **PD Designer** (design) / Materialization (set) | PM | Activity linkage |
| `activity_name` | Materialization RPC | PM | Derived from WBS |
| `actual_amount_idr` | **DEPRECATED** — was PM; now overridden by normalized ledger precedence | PD (read) | Legacy scalar; PM-F2B2C per-item precedence |
| `realisasi_date` | PM Finance (legacy) | PD (read) | Legacy; not structural |
| `realisasi_notes` | PM Finance (legacy) | PD (read) | Legacy; not structural |
| `realisasi_evidence_url` | PM Finance (legacy) | PD (read) | Legacy; not structural |

### Conflict: `lfa_budget_items` Shared Write

| Status | Detail |
|--------|--------|
| RISK | MEDIUM — PD and PM share `lfa_budget_items` table |
| Current mitigation | Application-level boundary: PD edits design fields; PM reads. PM writes `actual_amount_idr` (deprecated). Normalized ledgers are PM-only. |
| Future resolution | PM-F2B2C precedence: normalized ledger overrides legacy scalar. No PD writes to commitment/expenditure tables. |

---

## 3. PM Execution Fields

### `lfa_wbs_items` (PM execution context — same table as §1)

| Field | Write Owner | Readers | Notes |
|-------|------------|---------|-------|
| `status` (execution) | **PM Owner** (via `execute_wbs_item` RPC) | PD (read), Control Center | not_started / in_progress / completed |
| `progress_percent` | **PM Owner** (via WBS status update RPC) | PD (read), Control Center | 0-100; completed = 100 |
| `owner_id` | **PM Owner** (via `assign_wbs_owner` RPC) | PD (read) | PIC assignment |
| `reviewer_id` | **PM Owner** (via assignment RPC) | PD (read) | Reviewer assignment |
| `start_month` / `duration_weeks` | **PM Owner** (via `update_wbs_item_v2` RPC) | PD (read), Timeline | Schedule parameters |
| `blocker_category` | **PM Owner** (via Bottleneck RPC) | PD (read), Control Center | Bottleneck taxonomy |
| `blocker_notes` | **PM Owner** | PD (read) | Bottleneck description |
| `blocked_reason` | **PM Owner** (DEPRECATED) | — | Legacy; replaced by blocker_category |
| `completed_at` / `completed_by` | System (via completion RPC) | All | Audit metadata |
| `dependencies` | PM Owner | Work Plan | Task dependency array |
| `carbon_*` fields | PM Owner (via carbon RPC) | ESG Dashboard | Carbon tracking |
| `financial_status` | PM Owner (via `financeModel.ts`) | PD (read) | WBS resource-flow lifecycle |

### `project_stages`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `title` | PM Owner (via `create_project_stage` / `update_project_stage_metadata` RPC) | PD, Reporting |
| `status` | PM Owner | Control Center |
| `planned_start_date` / `planned_end_date` | PM Owner | Timeline, PD |
| `actual_start_date` / `actual_end_date` | PM Owner | Timeline, PD (read) |
| `sort_order` | PM Owner (via `reorder_project_stages` RPC) | Display |
| `primary_objective_id` | PM Owner | PM Objectives |
| `archived_at` | PM Owner (via `archive_project_stage` RPC) | Display filter |

### `project_objectives`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `title` / `description` | PM Owner | PD, Reporting |
| `status` | PM Owner | Control Center |
| `success_criteria` | PM Owner | Evaluation (future) |

### `programme_deliverables`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `title` / `description` | PM Owner (via deliverable RPCs) | PD, Reporting |
| `lifecycle_status` | PM Owner (via deliverable lifecycle RPC) | Control Center |
| `owner_id` / `reviewer_id` | PM Owner | Assignment display |
| `target_date` / `forecast_date` | PM Owner | Timeline |
| `accepted_at` / `approved_at` | System (via lifecycle transitions) | Audit |

---

## 4. Finance Execution Fields (PM-F2, PM-F3)

### `project_budget_commitments`

| Field | Write Owner | Readers | Notes |
|-------|------------|---------|-------|
| `amount_idr` | **PM Finance Owner** (via `create_commitment_draft` / `update_commitment_draft` RPC) | PD (read), Reporting | Immutable after approval |
| `workflow_status` | **PM Finance Owner** (via lifecycle RPCs) | PD (read), Reporting | draft/submitted/approved/rejected/cancelled |
| `description` | PM Finance Owner | PD | |
| `counterparty_name` | PM Finance Owner | PD | |
| `reference_number` | PM Finance Owner | PD | |
| `expected_realization_date` | PM Finance Owner | PD | |
| `evidence_url` | PM Finance Owner | PD | |
| `submitted_by` / `submitted_at` | System (via `submit_commitment` RPC) | Audit | Server-controlled |
| `approved_by` / `approved_at` | System (via `approve_commitment` RPC) | Audit | Server-controlled |
| `cancelled_by` / `cancelled_at` | System (via `cancel_commitment` RPC) | Audit | Server-controlled |
| `rejected_by` / `rejected_at` | System (via `reject_commitment` RPC) | Audit | Server-controlled |
| `created_by` | System (auth.uid()) | Audit | Server-controlled |

### `project_budget_expenditures`

| Field | Write Owner | Readers | Notes |
|-------|------------|---------|-------|
| `amount_idr` | **PM Finance Owner** (via `create_expenditure_draft` / `update_expenditure_draft` RPC) | PD (read), Reporting | Immutable after post |
| `workflow_status` | **PM Finance Owner** (via lifecycle RPCs) | PD (read) | draft/submitted/posted/rejected |
| `commitment_id` | PM Finance Owner (draft phase) | PD (read) | NULLABLE; links to commitment |
| `reversal_of_id` | System (via `reverse_expenditure` RPC) | Audit | Immutable new record |
| `transaction_date` | PM Finance Owner | PD | |
| `description` | PM Finance Owner | PD | |
| `posted_by` / `posted_at` | System (via `post_expenditure` RPC) | Audit | Server-controlled |
| All actor/timestamp fields | System (RPC server-side) | Audit | Never sent by client |

### `project_funding_sources` / `project_funding_installments` / `project_funding_receipts`

| All fields | **PM Finance Owner** (via typed funding RPCs) | PD (read), Reporting | PM-F3 domain |
| All actor/timestamp fields | System (RPC server-side) | Audit | Server-controlled |

---

## 5. Evidence Fields

### `wbs_completion_claims`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `status` | PM Reviewer (via `submit_wbs_completion_claim` / `review_wbs_completion_claim` RPC) | PD MEAL, Evaluation |
| `claimed_progress` | PM Owner (claim submitter) | Reviewer |
| `facts` | PM Owner | Reviewer, Evaluation |
| `lessons_learned` | PM Owner | Learning |
| `next_action` | PM Owner | PM |
| `claimed_by` / `claimed_at` | System (via submit RPC) | Audit |
| `reviewed_by` / `reviewed_at` | System (via review RPC) | Audit |

### `wbs_completion_evidence`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `title` / `description` | PM Owner (uploader) | Reviewer, Evaluation |
| `evidence_type` | PM Owner | Reviewer |
| `storage_reference` | System (via OneDrive upload) | Reviewer |
| `uploaded_by` / `uploaded_at` | System | Audit |

### `lfa_meal_tracking_entries`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `recorded_value` | PD MEAL (field observer / data collector) | PM, Evaluation, Reporting |
| `recorded_date` | PD MEAL | Evaluation |
| `evidence_note` | PD MEAL | Evaluation |
| `evidence_url` / `evidence_source_type` | PD MEAL | Evaluation |
| `verification_state` | PD MEAL Reviewer | Evaluation, Reporting |
| `verified_by` / `verified_at` | System (via verification action) | Audit |
| `recorded_by` | System (auth.uid()) | Audit |

---

## 6. Evaluation Fields

### `project_evaluation_findings`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `finding` | **PD Evaluator** | PM, Learning, Reporting |
| `recommendation` | **PD Evaluator** | Learning, PD Designer |
| `severity` | **PD Evaluator** | Reporting |
| `evidence_id` | **PD Evaluator** | Audit |
| `created_by` | System (auth.uid()) | Audit |

---

## 7. Learning Fields

### `org_learning_notes`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `title` / `content` | **PD Learning** (author) | All org members |
| `insight_type` (good_practice/failure_pattern/mixed) | **PD Learning** | Reporting |
| `scope` (project/programme/organization) | **PD Learning** | Reporting |
| `status` (draft/published) | **PD Learning** (author → publisher) | All org members |
| `created_by` | System (auth.uid()) | Audit |

---

## 8. SROI Fields

### `sroi_outcomes`

| Field | Write Owner | Readers |
|-------|------------|---------|
| `outcome_name` | **PD SROI Analyst** | PD, Reporting |
| `financial_proxy` | **PD SROI Analyst** | Reporting |
| `deadweight` / `attribution` / `displacement` / `dropoff` | **PD SROI Analyst** | Reporting |
| `impact_value` | Derived (SROI Calculator) | Reporting |
| `sroi_ratio` | Derived (SROI Calculator) | Reporting |

---

## 9. Reporting Fields

| Field | Owner | Notes |
|-------|-------|-------|
| Report content | **PD Reporting** — generated from domain sources | Point-in-time snapshot |
| Report template | **PD Reporting** | Not yet implemented |
| KPI definitions | Domain owners define; Reporting presents | Reporting never redefines KPIs |
| Narrative content | **PD Reporting** (author) | Attribution required |

---

## 10. Derived Field Matrix

Fields that **MUST NOT be edited directly** — they are computed from canonical sources.

| Derived Field | Source Fields | Calculation Owner | Consumers |
|--------------|---------------|-------------------|-----------|
| `progress_percent` (parent WBS) | Child WBS `progress_percent` + `status` | `workPlan.computeParentProgress()` | Work Plan, Control Center |
| `isOverdue` | `end_date` + `status` | `executionModel.isOverdue()` | Control Center |
| `isBlocked` | `blocker_category` | `executionModel.isBlocked()` | Control Center |
| `ClosureStatus` | `wbs_completion_claims.status` | `executionModel.getClosureStatus()` | MEAL, Control Center |
| `FinanceHealth` | `planned` + `actual` | `financeModel.classifyFinanceHealth()` | Control Center, Reporting |
| `net_received_cash` | Receipt amounts − reversals | `compute_project_funding_aggregates` RPC | Funding dashboard, Reporting |
| `committed_outstanding` | Approved commitments − linked actuals | `compute_budget_aggregates` RPC | Finance summary |
| `CashAvailable` | `net_received_cash` − `net_actual` | `financeModel.computeProjectCashPosition()` | Reporting |
| `BudgetAvailable` | `planned` − `exposure` | `financeModel` aggregate | Reporting |
| `ProjectHealth` (overall) | Execution + Delivery + Constraint + Financial health | `controlCenterModel.computeOverallProjectHealth()` | Control Center, Reporting |
| `InstallmentDerivedState` | `workflow_status` + `net_received` + `due_date` | `financeModel.computeInstallmentDerivedState()` | Funding UI |
| `BottleneckCounts` | Bottleneck statuses | `bottleneckModel.computeBottleneckCounts()` | Control Center |
| `evidence_count` / `evidence_health` | Evidence table aggregation | Future: Control Center | Reporting |

---

## 11. Conflict Detection

| Conflict | Severity | Detail |
|----------|----------|--------|
| `lfa_budget_items` shared PD/PM write | **MEDIUM** | PD writes design fields; PM writes actual_amount_idr (deprecated). Normalized ledgers are PM-only. Resolved by PM-F2B2C precedence. |
| `lfa_wbs_items` shared PD/PM write | **LOW** | PD writes design fields (name, level, parent_id); PM writes execution fields (status, progress, blocker). No overlap. |
| `actual_amount_idr` dual meaning | **LOW** | Was PD and PM field before PM-F2. Now deprecated; normalized ledgers are canonical. |
| `stage_id` assignment authority | **LOW** | PD sets during WBS design; PM may reassign. Both valid within their phase. |
| `verification_state` dual table | **LOW** | `lfa_meal_tracking_entries.verification_state` and `wbs_completion_claims.status` are different semantics — no conflict. |

---

## 12. Readiness Assessment

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| Ownership Clarity | **HIGH** | Every major field has a single write owner; documented here |
| Mutation Safety | **HIGH** | RLS + SECURITY DEFINER RPCs enforce write boundaries; no direct table writes for Finance |
| Automation Readiness | **MEDIUM** | Derived fields identified; auto-computation paths defined. Cross-domain automation (evaluation→learning→design) not yet structural. |
| AI Readiness | **MEDIUM** | AI may read any field; AI must never write to canonical fields. AI write allowlist not yet defined. |

---

## Related Files

- `docs/architecture/decisions/0007-programme-design-canonical-architecture.md` — PD ownership
- `docs/architecture/decisions/0008-programme-design-finance-canonical-contract.md` — Finance ownership
- `docs/architecture/decisions/0010-integrated-program-lifecycle-cross-module-contract-matrix.md` — Cross-module matrix
- `docs/architecture/decisions/0016-integrated-program-lifecycle-architecture-freeze-v1.md` — Architecture freeze
