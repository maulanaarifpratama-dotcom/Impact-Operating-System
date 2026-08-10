# ADR 0011: Evidence Governance Canonical Contract

## Status

Accepted

## Date

2026-08-10

## Context

ADR 0007–0010 established the Integrated Program Lifecycle with clear PD/PM boundaries,
module ownership, signal architecture, and materialization contracts.

The biggest remaining gap identified in ADR 0010 §8–9 is **Evidence Governance**. Evidence
is currently:
- Spread across multiple tables (`wbs_completion_evidence`, `lfa_meal_tracking_entries`,
  `project_evaluation_findings`, scattered `evidence_url` columns)
- Without a unified lifecycle contract
- Without explicit immutability guarantees (beyond FK constraints)
- Without quality dimensions

Evidence is the foundation for Completion Claims, Monitoring, Evaluation, Learning,
SROI, and Impact Reporting. Without a formal contract, downstream analytics and
reporting risk inconsistency.

This ADR establishes Evidence as a first-class domain.

---

## 1. Evidence Domain Definition

### What Evidence IS

Evidence is an **observable, attributable, timestamped, traceable, and auditable**
record of something that happened.

| Characteristic | Definition |
|---------------|------------|
| Observable | Grounded in a specific event, measurement, or artifact |
| Attributable | Linked to a source (person, system, sensor, document) |
| Timestamped | Carries a creation or collection timestamp |
| Traceable | Links back to a specific Activity, Indicator, or Claim |
| Auditable | Can be reviewed, verified, or challenged |

### What Evidence is NOT

| Non-Evidence | Why Not |
|-------------|---------|
| Opinion | Subjective; may be stored as interpretation, not evidence |
| Assumption | Design artifact, not observed fact |
| Recommendation | Downstream interpretation of evidence |
| Interpretation | Derived from evidence; stored separately |
| Forecast / Projection | Not yet observed |
| Narrative without source | Unattributable claim |

### Evidence vs. Interpretation

```
Evidence (immutable)
    ↓ consumed by
Interpretation (mutable, attributed to interpreter)
    ├── Evaluation Finding
    ├── Learning Note
    ├── SROI Valuation
    └── Report Narrative
```

Evidence never changes. Interpretations may be revised.

---

## 2. Evidence Ownership Matrix

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Evidence Record (completion claim evidence) | PM Reviewer (uploads) | PD MEAL, Evaluation | `wbs_completion_evidence` |
| Evidence Attachment (file, document, photo) | Uploader | Reviewers, Auditors | `wbs_completion_evidence` |
| Evidence Metadata (type, description, date) | Uploader | All consumers | `wbs_completion_evidence` |
| Verification Record (verified_by, verified_at) | PM Reviewer | PD MEAL, Evaluation | `wbs_completion_claims.verification_state` |
| Validation Status (submitted/verified/rejected) | System (from reviewer action) | All consumers | `wbs_completion_claims.status` |
| Source Reference (link to Activity, Indicator) | Uploader | All consumers | FK references (wbs_item_id, meal_item_id) |
| Evidence URL (general purpose) | Record owner | Reviewers | Scattered `evidence_url` columns |
| Realisasi Evidence URL (budget actual) | PM Finance Owner | PD Budget tracking | `lfa_budget_items.realisasi_evidence_url` |
| Evidence Collection Event | Field observer | PD MEAL | `lfa_meal_tracking_entries` |
| Evidence Review Event | Reviewer | Auditors | Implicit in status transitions |

---

## 3. Evidence Lifecycle

```
Created (draft)
    │ Owner: Evidence provider (PM, field observer, uploader)
    │ State: Record exists; not yet submitted for review
    │ Action: Can be edited or deleted by creator
    ↓
Submitted
    │ Owner: Same as creator; status = 'submitted'
    │ State: Locked for editing by creator; ready for review
    │ Action: Reviewer can verify or reject
    ↓
Reviewed (in-progress)
    │ Owner: Reviewer
    │ State: Under review; neither verified nor rejected
    │ Action: Reviewer examines authenticity, relevance, completeness
    ↓
Verified
    │ Owner: System (reviewer action recorded)
    │ State: Confirmed authentic and relevant; immutable
    │ Action: May be consumed by downstream modules
    │ Metadata: verified_by, verified_at, verification_notes
    ↓
Consumed
    │ Owner: Consumer (Evaluation, Learning, SROI, Reporting)
    │ State: Referenced by downstream artifact
    │ Action: Consumer creates interpretation (finding, note, valuation)
    │ Rule: Consumer may NOT modify evidence
    ↓
Archived
    │ Owner: System
    │ State: Retained for audit; not actively referenced
    │ Action: Retained per retention policy; available for audit
```

### Rejection Path

```
Submitted → Rejected
    │ Owner: Reviewer
    │ State: Not accepted; reason recorded
    │ Action: Provider may correct and resubmit (new submission cycle)
    │ Metadata: rejected_by, rejected_at, rejection_reason
```

### Expiry Path

```
Created (draft, unsubmitted, aged)
    → Expired
    │ Owner: System
    │ State: Draft abandoned; may be cleaned up per retention policy
```

---

## 4. Evidence Sources

### PM Sources (Execution Domain)

| Source | Evidence Type | Table | Verification |
|--------|--------------|-------|-------------|
| Completion Claim | Activity completion proof | `wbs_completion_evidence` | Reviewer verifies via `wbs_completion_claims` |
| Deliverable Acceptance | Output delivery proof | `programme_deliverables` lifecycle | Status transitions (submitted→accepted) |
| Progress Record | WBS progress % | `lfa_wbs_items.progress_percent` | Self-reported; verified via completion claims |
| Financial Record | Expenditure proof | `project_budget_expenditures.evidence_url` | Posted by PM Finance Owner |
| Funding Receipt | Cash-in proof | `project_funding_receipts.evidence_url` | Posted by PM Finance Owner |

### Monitoring Sources (MEAL Domain)

| Source | Evidence Type | Table | Verification |
|--------|--------------|-------|-------------|
| Indicator Tracking | Measured value | `lfa_meal_tracking_entries` | verification_state (submitted/verified) |
| Survey Response | Structured data | `lfa_meal_tracking_entries` | verification_state |
| Field Observation | Narrative + photo | `lfa_meal_tracking_entries` with evidence_url | verification_state |
| Assessment Report | Document | `lfa_meal_tracking_entries` with evidence_url | verification_state |

### External Sources (Imported)

| Source | Evidence Type | Storage | Governance |
|--------|--------------|---------|------------|
| Uploaded Document | File attachment | `wbs_completion_evidence` | FK to claim; RLS scoped |
| Photo / Image | File attachment | `wbs_completion_evidence` | FK to claim; RLS scoped |
| Video | File attachment | OneDrive integration (`onedrive_upload`) | FK to claim |
| Third-party Report | URL reference | `evidence_url` columns | No structural enforcement (gap) |
| OneDrive Document | Storage reference | `wbs_completion_evidence.storage_reference` | FK to claim; RLS scoped |

---

## 5. Verification Contract

### Statuses

| Status | Meaning | Who Sets | Editable? |
|--------|---------|----------|-----------|
| `draft` | Evidence record created; not yet submitted | Creator | Yes (by creator) |
| `submitted` | Submitted for review; locked for creator edit | Creator → submit action | No (creator) |
| `verified` | Reviewer confirms evidence is authentic and relevant | Reviewer → verify action | No (immutable) |
| `rejected` | Reviewer rejects evidence; reason required | Reviewer → reject action | No (immutable) |
| `expired` | Draft abandoned; cleanup candidate | System / policy | No |

### Verification Rules

1. **Verifier must be distinct from creator** where existing review patterns already enforce this (e.g., Completion Claims reviewer separation).
2. **Verification is a deliberate human action** — never automatic, never AI-driven.
3. **Verification metadata is immutable** after recording (`verified_by`, `verified_at`, `verification_notes`).
4. **Verified evidence may be consumed** by downstream modules (Evaluation, Learning, SROI, Reporting).
5. **Rejected evidence may be corrected and resubmitted** as a new submission cycle.
6. **Evidence truth is separated from interpretation.** Verification confirms authenticity; interpretation assesses meaning.

---

## 6. Evidence Consumption Matrix

| Consumer | What It May Do | What It May NOT Do |
|----------|---------------|-------------------|
| Monitoring | Read evidence; compute indicator progress | Modify evidence records |
| Evaluation | Read evidence; create evaluation findings referencing evidence | Modify evidence; modify verification status |
| Learning | Read evidence; create learning notes referencing evidence | Modify evidence |
| SROI | Read evidence; use as input to outcome valuation | Modify evidence; change evidence attribution |
| Reporting | Read evidence; cite in reports; aggregate statistics | Modify evidence; rewrite evidence narrative |
| Control Center | Read evidence counts; compute evidence health | Modify evidence |

### Consumption Rules

1. Consumers may **interpret** evidence. They may not **alter** evidence.
2. Consumers may **reference** evidence by ID. They may not **replace** evidence.
3. Consumers may **aggregate** evidence statistics (completeness, verification rate). They may not **fabricate** evidence.
4. Interpretations (findings, notes, valuations) must reference their source evidence via FK or documented reference.

---

## 7. Evidence Lineage Contract

```
Evidence Record (immutable)
    │ id, type, source, timestamp, verification_status
    │ Referenced by: finding.evidence_id, learning.source_id
    ↓
Evaluation Finding (interpretation, mutable)
    │ What the evidence means for outcome achievement
    │ Owner: Evaluator; may be revised
    ↓
Learning Note (interpretation, mutable)
    │ What should change in future design
    │ Owner: Learning; may be superseded
    ↓
Design Revision (PD action, deliberate)
    │ Updated LFA, Budget, or MEAL based on learning
    │ Owner: PD Designer; new version created
```

### Lineage Rules

1. **Evidence is the immutable root.** All downstream artifacts trace back to evidence records.
2. **Downstream artifacts are interpretations.** They carry attribution (who interpreted, when).
3. **Lineage is uni-directional.** Evidence → Finding → Learning → Design. Never reverse.
4. **When evidence is rejected**, downstream artifacts that referenced it should be reviewed (not automatically invalidated).
5. **When evidence is archived**, lineage references persist for audit.

---

## 8. Evidence Quality Model

| Dimension | Definition | Owner | Scoring |
|-----------|-----------|-------|---------|
| Completeness | Does the evidence fully support the claim? | Reviewer | 0–100 (subjective, reviewer-scored) |
| Credibility | Is the source trustworthy? | Reviewer | High / Medium / Low |
| Timeliness | Was evidence collected within the monitoring period? | System | On-time / Late / Missing date |
| Traceability | Can the evidence be traced to a specific Activity, Indicator, or Claim? | System | Linked / Unlinked / Dangling |
| Verifiability | Can the evidence be independently verified? | Reviewer | Verifiable / Partially / Not Verifiable |
| Relevance | Does the evidence directly relate to the claim or indicator? | Reviewer | Direct / Indirect / Unrelated |

### Quality Scoring (Future Implementation)

```
Evidence Quality Score = weighted_average(
    completeness × 0.25,
    credibility_score × 0.25,
    timeliness_score × 0.15,
    traceability_score × 0.15,
    verifiability_score × 0.10,
    relevance_score × 0.10
)
```

Scoring is conceptual. Implementation deferred to dedicated Evidence module.

---

## 9. Forbidden Mutations

| Action | Forbidden For | Reason |
|--------|--------------|--------|
| Modify verified evidence record | Anyone | Immutable after verification |
| Delete verified evidence | Anyone | Audit trail preservation |
| Change evidence attribution after submission | Anyone | Attribution is part of evidence identity |
| Modify verification metadata (verified_by, verified_at) | Anyone | Immutable after recording |
| Evaluation modifies evidence to support finding | Evaluator | Interpretations reference evidence; don't alter it |
| Reporting rewrites evidence narrative | Reporter | Reports cite evidence; don't change it |
| Learning reinterprets evidence without traceability | Learner | Learning notes must reference source evidence |
| SROI changes evidence values for favorable ratio | SROI Analyst | SROI uses evidence as-is; assumptions are separate |
| Consumer fabricates evidence from interpretation | Any consumer | Evidence must be observable and attributable |

---

## 10. Integration Matrix

| Integration | Status | Evidence Flow |
|-------------|--------|--------------|
| Completion Claims ↔ Evidence | COMPLETE | `wbs_completion_claims` → `wbs_completion_evidence` (FK) |
| Deliverables ↔ Evidence | PARTIAL | Lifecycle status transitions; no dedicated evidence table |
| Budget Actual ↔ Evidence | PARTIAL | `realisasi_evidence_url` exists; no structural enforcement |
| Commitment ↔ Evidence | PARTIAL | `evidence_url` exists; no verification workflow |
| Expenditure ↔ Evidence | PARTIAL | `evidence_url` exists; no verification workflow |
| Funding Receipt ↔ Evidence | PARTIAL | `evidence_url` exists; no verification workflow |
| MEAL Tracking ↔ Evidence | COMPLETE | `verification_state` with verified_by/verified_at |
| Evaluation ↔ Evidence | COMPLETE | `project_evaluation_findings` references evidence |
| Learning ↔ Evidence | PARTIAL | `orgLearningModel.ts` exists; evidence linkage not structural |
| SROI ↔ Evidence | PARTIAL | SROI uses indicator values; evidence chain not explicitly modeled |
| Reporting ↔ Evidence | PARTIAL | Reports aggregate data; evidence provenance not structurally enforced |
| Control Center ↔ Evidence | MISSING | No Evidence Health metric in Control Center |

---

## 11. Gap Analysis

| Area | Status | Gap |
|------|--------|-----|
| Unified Evidence Table | MISSING | Evidence is scattered across domain tables; no single evidence registry |
| Verification Workflow (universal) | PARTIAL | Completion Claims have verification; other evidence types do not |
| Evidence Quality Scoring | MISSING | No automated quality dimensions; conceptual model only |
| Evidence Health Metric | MISSING | Control Center has no Evidence Health dimension |
| Cross-domain Evidence Lineage | PARTIAL | FK references exist; no automated lineage tracking |
| Evidence Retention Policy | MISSING | No defined archival or retention rules |
| Evidence Tamper Detection | MISSING | No checksums or version history for evidence records |
| External Evidence Governance | PARTIAL | `evidence_url` columns accept any URL; no source validation |
| Evidence Consumption Audit | MISSING | No tracking of which downstream artifacts reference which evidence |
| OneDrive Evidence Integration | COMPLETE | `onedrive_upload` Edge Function; `storage_reference` on evidence |

---

## 12. Readiness Decision

**Architecture Readiness: MEDIUM**

### Rationale

Evidence governance is PARTIAL across the system:
- **Strong**: Completion Claims have a dedicated evidence table with structured verification.
- **Moderate**: MEAL tracking entries have verification states. Budget/commitment/expenditure entities have `evidence_url` fields but no verification workflow.
- **Weak**: No unified evidence registry. No quality scoring. No evidence health metric. No cross-domain lineage tracking.

Evidence is functionally usable for current workflows (completion claims, MEAL tracking). However, systematic evidence governance (quality, lineage, health, retention) requires dedicated infrastructure that does not yet exist.

### Path to HIGH Readiness

1. Define a canonical Evidence type in the codebase (not just scattered `evidence_url` columns).
2. Add evidence health metric to `controlCenterModel.ts`.
3. Implement evidence quality scoring for Completion Claims (the most mature evidence path).
4. Extend verification workflow to expenditure and receipt evidence URLs.
5. Create evidence lineage tracking (FK from findings and learning notes to evidence records).
6. Define retention policy.

---

## Decision

Evidence is a first-class domain in the Integrated Program Lifecycle.

- Evidence is observable, attributable, timestamped, traceable, and auditable.
- Evidence is the immutable root of the interpretation chain (Finding → Learning → Design).
- Verification is a deliberate human action that separates authentic evidence from unverified claims.
- Consumers (Evaluation, Learning, SROI, Reporting) may interpret evidence but may never alter it.
- The `wbs_completion_evidence` table and `verification_state` pattern are the canonical templates for future evidence governance.

Current readiness is MEDIUM. Evidence is functionally adequate for completion claims and MEAL tracking but lacks unified governance, quality scoring, and system-wide lineage.

## Related ADRs and Files

- `docs/architecture/decisions/0010-integrated-program-lifecycle-cross-module-contract-matrix.md` (§4, §8–9)
- `src/lib/project-management/executionModel.ts` (ClosureStatus, `DOCUMENTED_CLAIM_STATUS`)
- `supabase/migrations/20260724180000_wbs_completion_claims_evidence.sql`
- `supabase/migrations/20260808100000_add_evaluation_findings.sql`
- `src/lib/project-management/learningModel.ts`
- `src/lib/project-management/controlCenterModel.ts` (Evidence Health → MISSING)
