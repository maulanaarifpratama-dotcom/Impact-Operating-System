# ADR-0006: WBS V2 Program Management Control Center

## Status

Proposed

---

## Context

Current Impactory Program Lifecycle Architecture:

```text
Proposal ➔ LFA ➔ WBS ➔ Budget ➔ MEAL ➔ SROI ➔ EROI ➔ ESG ➔ Reports
```

Comprehensive technical and product audits conducted across the platform identified the following core operational findings:

1. **WBS → MEAL Relational Disconnect:** MEAL Output indicator progress calculations currently rely on fuzzy string matching or array index matching rather than explicit relational foreign keys.
2. **Unbound PIC Ownership:** Person In Charge (PIC) fields in WBS and MEAL are free-text strings without binding to authenticated organization members or role-based accountabilities.
3. **Insufficient Ownership Model:** Lack of a structured Owner/Reviewer/Approver model creates ambiguity during activity sign-off and evidence verification.
4. **Missing Financial Lifecycle:** Budget items track planned vs. actual amounts but lack financial status lifecycle enums (`committed`, `disbursed`, `blocked_by_finance`).
5. **Mature WBS Evidence Model:** The existing `wbs_completion_claims` and `wbs_completion_evidences` architecture provides a strong foundation for verification auditability.
6. **WBS as the Operational Backbone:** WBS sits at the intersection of execution, schedule, budget, carbon emissions, and MEAL evidence, making it the natural Operational Control Center for Impactory.

---

## Decision

Impactory formalizes the evolution of the **Work Breakdown Structure (WBS)** into the **Program Management Control Center (WBS V2)**.

### Core WBS V2 Responsibilities

1. **Relational Integrity Engine:**
   - Establish explicit foreign key relationships (`lfa_meal_items.wbs_item_id` and `lfa_wbs_items.lfa_entry_id`) to eliminate all fuzzy string matching.
   - Maintain 100% backward compatibility with fallback matching for legacy projects.

2. **Enterprise Ownership Model (Option B):**
   - Bind execution responsibility to `owner_id` (UUID referencing `auth.users`).
   - Bind review/approval authority to `reviewer_id` (UUID referencing `auth.users`).
   - Retain `pic_display_name` as a fallback display label.

3. **Schedule & Execution Precision:**
   - Extend timeline tracking with `planned_start_date`, `planned_end_date`, `actual_start_date`, and `actual_completion_date`.
   - Automatically compute schedule variance days and progress roll-ups across leaf activities.

4. **Financial Integration & Lifecycle Tracking:**
   - Integrate budget realization with `budget_disbursement_status_enum` (`draft`, `committed`, `disbursement_requested`, `paid`, `blocked_by_finance`).
   - Expose financial bottleneck flags directly on WBS activities.

5. **Evidence Bridge Pipeline:**
   - Establish a bridge between `wbs_completion_evidences` and `lfa_meal_tracking_logs`.
   - Allow M&E Officers to select uploaded WBS activity evidence as candidate proof for MEAL indicator verification with 1-click linking.

6. **Structured Bottleneck Analytics:**
   - Classify activity blockers using `blocker_category_enum` (`finance_holding`, `vendor_delay`, `internal_approval`, `donor_disbursement`, `force_majeure`).

---

## Consequences

### Positive
- **Relational Integrity:** 100% precise linking between LFA Outputs, WBS Activities, Budget Lines, and MEAL Indicators.
- **Enterprise Auditability:** Clear audit trail of who performed, reviewed, and approved every program activity and evidence submission.
- **Zero Double Entry:** WBS completion evidence automatically surfaces as candidate proof for MEAL indicator verification.
- **Improved Donor Confidence:** Financial and schedule bottleneck tracking provides transparent, audit-ready program reporting.

### Tradeoffs / Migration Strategy
- Requires a phased 4-sprint rollout to ensure zero downtime and complete backward compatibility.
- Additive database schema migrations ensure existing production data remains unaffected.

---

## Implementation Roadmap

```text
   [ SPRINT 1 ]              [ SPRINT 2 ]              [ SPRINT 3 ]              [ SPRINT 4 ]
 Relational Integrity    Ownership Option B      Financial Lifecycle      Evidence Bridge & MEAL V2
  • Add Foreign Keys      • Add owner_id          • Financial Enums        • WBS Evidence Pool
  • Backfill Script       • Add reviewer_id       • Blocker Categories     • MEAL Aggregation Math
  • Replace Fuzzy Match   • Claim Sign-off UI     • EVM Financial Status   • Verification State
```

1. **Sprint 1 — Relational Integrity:** Add `wbs_item_id` to `lfa_meal_items` and `lfa_entry_id` to `lfa_wbs_items`. Update GrantWriter materializer and MEAL rollup logic.
2. **Sprint 2 — Enterprise Ownership Model:** Implement Option B (`owner_id`, `reviewer_id`) with claim sign-off UI.
3. **Sprint 3 — Financial Lifecycle & Bottlenecks:** Introduce `budget_disbursement_status_enum` and `blocker_category_enum`.
4. **Sprint 4 — Evidence Bridge & MEAL V2:** Implement WBS-to-MEAL evidence pipeline and `indicator_type` aggregation math (`SUM`, `LATEST`, `AVERAGE`).
