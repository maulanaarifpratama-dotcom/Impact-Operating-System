# ADR 0013: Learning Ledger Canonical Contract

## Status

Accepted

## Date

2026-08-10

## Context

ADR 0007–0012 established the full Programme Design and Evaluation chain:
Execution → Evidence → Evaluation → Finding → Recommendation.

The missing governance domain is **Learning** — the bridge between historical
execution insight and future programme design.

Existing codebase elements:
- `learningModel.ts` — severity labels for evaluation findings (informational, minor, major, critical)
- `orgLearningModel.ts` — organization-level learning notes with types (good_practice, failure_pattern, mixed),
  scope (project_specific, programme_wide, organization_wide), and status (draft, published)
- Learning pages in the dashboard that consume these models

This ADR establishes Learning as a first-class domain with a canonical lifecycle,
ownership, source traceability, and design revision boundary.

---

## 1. Learning Domain Definition

### What Learning IS

Learning is **evidence-informed, evaluation-aware, future-oriented insight** that
can improve future programme design and execution.

| Characteristic | Definition |
|---------------|------------|
| Evidence-informed | Grounded in actual execution data, evaluation findings, and evidence records |
| Evaluation-aware | Synthesizes findings and recommendations into actionable patterns |
| Future-oriented | Produces insights that inform future design decisions |
| Attributable | Every learning event carries author identity and timestamp |
| Reviewable | Learning undergoes review before being accepted as organizational knowledge |

### What Learning is NOT

| Non-Learning | Why Not |
|-------------|---------|
| Evidence | Evidence is raw observation; learning is synthesized insight |
| Evaluation Finding | Finding is assessment of current state; learning is forward-looking |
| Recommendation | Recommendation is specific to one finding; learning synthesizes patterns |
| Design Artifact | Design is the plan; learning informs plan revision |
| Execution Record | Execution records history; learning interprets history |
| Opinion | Opinion is unattributed; learning is evidence-grounded and reviewed |

### Learning vs. Related Domains

```
Evaluation Finding + Recommendation
    ↓ synthesized by
Learning (pattern recognition, cross-project synthesis)
    ↓ produces
Learning Insight (typed, scoped, status-tracked)
    ↓ may trigger
Design Change Proposal (optional, deliberative)
    ↓ requires
PD Designer Review (explicit approval)
    ↓ may result in
Programme Design Revision (new version)
```

---

## 2. Learning Ownership Matrix

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Learning Event (individual lesson) | PD Learning (author) | All org members | `org_learning_notes` |
| Learning Insight Type | PD Learning | All org members | `orgLearningModel.ts` (good_practice / failure_pattern / mixed) |
| Learning Insight (synthesized pattern) | PD Learning (author) | All org members | `org_learning_notes` |
| Learning Theme (category) | PD Learning | Org leadership | Not yet structural (free text or implied) |
| Learning Scope | PD Learning | All org members | `orgLearningModel.ts` (project_specific / programme_wide / organization_wide) |
| Learning Status | PD Learning (author → reviewer) | All org members | `orgLearningModel.ts` (draft / published) |
| Learning Evidence Base | System (derived from references) | All org members | FK references to ACR, evaluation findings |
| Learning Recommendation Link | PD Learning | Future designers | Implicit (manual cross-reference) |
| Design Change Proposal | PD Designer (optional, triggered by learning) | PM, Stakeholders | Not yet implemented |
| Learning Ledger (audit trail) | System | Org leadership | Not yet implemented (events table pattern exists) |

---

## 3. Learning Lifecycle

```
Captured (draft)
    │ Owner: PD Learning author
    │ Purpose: Record an insight from evidence, evaluation, or execution observation
    │ State: status = 'draft'
    │ Action: Author can edit; not yet visible to all consumers
    ↓
Reviewed
    │ Owner: PD Learning reviewer (peer or lead)
    │ Purpose: Validate insight quality, evidence support, and relevance
    │ Action: Reviewer assesses; may request revision
    │ State: Implicit review (no explicit review status; draft → published is current flow)
    ↓
Validated
    │ Owner: PD Learning reviewer
    │ Purpose: Confirm insight is evidence-grounded and actionable
    │ Action: Approve for publication
    │ State: Conceptual validation step; currently merged with publish
    ↓
Accepted (published)
    │ Owner: System; author retains attribution
    │ Purpose: Insight becomes organizational knowledge asset
    │ State: status = 'published'
    │ Action: Immutable; visible to all org members
    │ Rule: Published learning notes are permanent; may be superseded but not deleted
    ↓
Proposed for Design
    │ Owner: PD Designer (triggered by learning insight)
    │ Purpose: Translate insight into specific design change proposal
    │ State: Optional; not all insights lead to design changes
    │ Action: Designer reviews learning insight and proposes revision
    ↓
Implemented
    │ Owner: PD Designer
    │ Purpose: Design revision incorporated into new programme design version
    │ State: New design version created; old version retained
    │ Rule: Learning insight records which design version it influenced
    ↓
Archived
    │ Owner: System (retention-based)
    │ Purpose: Retain for historical reference; not actively promoted
    │ State: Retained per retention policy
```

---

## 4. Learning Sources

| Source | Type | Canonical Path | Status |
|--------|------|---------------|--------|
| Evaluation Findings | Assessment of programme performance | `project_evaluation_findings` → learning note | PARTIAL — manual cross-reference |
| Evaluation Recommendations | Actionable proposals from evaluation | `project_evaluation_findings.recommendation` | PARTIAL — no structural link |
| Evidence Patterns | Repeated evidence types across projects | `wbs_completion_evidence` aggregation | MISSING — no automated pattern detection |
| Repeated Bottlenecks | Recurring blocker categories / statuses | `bottleneckModel.computeBottleneckCounts()` | PARTIAL — data exists; no learning pipeline |
| Financial Variance | Over/under budget patterns | `financeModel` variance data | PARTIAL — data exists; no learning pipeline |
| Monitoring Trends | Indicator trajectory over time | `lfa_meal_tracking_entries` aggregation | PARTIAL — data exists; no learning pipeline |
| Execution Lessons | Work Plan completion patterns | `executionModel` status aggregation | PARTIAL — data exists; no learning pipeline |
| Cross-Project Synthesis | Patterns across multiple projects | Manual analysis | MISSING — no cross-project analytics |

---

## 5. Learning Contract

### Finding → Recommendation → Learning Event

```
Evaluation Finding (specific observation)
    ↓ may generate
Recommendation (advisory proposal)
    ↓ may be synthesized into
Learning Event (pattern insight)
    │ with: insight_type, scope, status
    │ linked to: evidence_base (ACR references, finding references)
    │ authored by: PD Learning role
    ↓ may trigger
Design Change Proposal
```

### Learning Event Rules

1. **Traceable**: Every learning insight must reference its source (evaluation finding, ACR evidence, monitoring data).
2. **Attributable**: Every learning insight carries author identity and timestamp.
3. **Timestamped**: Creation and publication dates are recorded.
4. **Reviewable**: Learning insights undergo draft → published lifecycle with review.
5. **Scope-explicit**: Every insight declares its applicability (project / programme / organization).
6. **Type-explicit**: Every insight declares its nature (good_practice / failure_pattern / mixed).

---

## 6. Design Revision Boundary

### Learning May

| Action | Mechanism |
|--------|-----------|
| Inform design review | Published learning insights are visible to PD Designers |
| Trigger discussion | Learning insight may prompt design review meeting |
| Trigger planning review | Programme-wide insights may trigger strategic review |
| Propose design change | Designer creates change proposal referencing learning insight |
| Influence future design | Learning insights inform next programme design cycle |

### Learning May NOT

| Action | Reason |
|--------|--------|
| Automatically revise design | Requires explicit PD Designer action |
| Automatically revise indicators | PD owns measurement framework |
| Automatically revise assumptions | PD owns design assumptions |
| Automatically revise budget | PD owns budget design |
| Overwrite historical execution data | Execution records are immutable |
| Delete or modify published learning | Published insights are permanent; may be superseded, not deleted |
| Claim causality without evidence | Learning must be evidence-grounded |

---

## 7. Learning Taxonomy

| Category | Definition | Owner | Example |
|----------|-----------|-------|---------|
| Design Learning | Insights about intervention logic, LFA structure, or theory of change | PD Designer | "Output-level indicators consistently lag behind Outcome indicators by 6 months" |
| Execution Learning | Insights about Work Plan, timeline, or deliverable execution | PM Owner | "Activities with dedicated PIC complete 40% faster than shared-PIC activities" |
| Financial Learning | Insights about budget accuracy, cost efficiency, or funding pipeline | PM Finance | "Honorarium line items consistently overrun by 15-25% across projects" |
| Monitoring Learning | Insights about indicator measurement, data quality, or MEAL methods | PD MEAL | "Survey-based indicators have 3x higher variance than administrative data indicators" |
| Governance Learning | Insights about stakeholder management, compliance, or accountability | PD / Org Leadership | "Projects with monthly stakeholder meetings have 2x fewer bottlenecks" |
| Outcome Learning | Insights about what drives or hinders outcome achievement | PD Evaluator | "Training-only interventions without mentoring show 30% lower sustained outcomes" |

### Insight Types (from `orgLearningModel.ts`)

| Type | Definition | Example |
|------|-----------|---------|
| `good_practice` | Something that worked well; should be repeated or scaled | "Community co-design workshops increased beneficiary enrollment by 60%" |
| `failure_pattern` | Something that repeatedly failed; should be avoided or redesigned | "Centralized procurement adds 8-12 weeks delay across all field projects" |
| `mixed` | Contains both positive and negative elements | "Digital M&E tools improved data quality but reduced field staff engagement" |

---

## 8. Learning Quality Model

| Dimension | Definition | Scoring |
|-----------|-----------|---------|
| Evidence Support | How many evidence/finding references support this insight? | Count of linked evidence/findings |
| Relevance | How applicable is this insight to future projects? | Scope: project / programme / organization |
| Traceability | Can the insight be traced to specific sources? | Linked sources present / absent |
| Repeatability | Has this pattern been observed across multiple projects? | Single-project / Multi-project |
| Actionability | Can this insight be translated into concrete design change? | Specific proposal / General guidance |
| Confidence | How certain is the author about this insight? | High / Medium / Low (subjective) |

Quality scoring is conceptual. Implementation deferred.

---

## 9. Forbidden Mutations

| Action | Forbidden For | Reason |
|--------|--------------|--------|
| Learning modifies evidence | Learner | Evidence is immutable (ADR 0011) |
| Learning modifies evaluation findings | Learner | Findings are evaluator domain (ADR 0012) |
| Learning modifies PM execution records | Learner | Execution records are immutable |
| Learning modifies PD design records | Learner | PD design requires explicit revision |
| Learning deletes published insights | Learner | Published learning is organizational knowledge |
| Learning auto-applies design changes | System | Requires explicit PD Designer action |
| Learning fabricates evidence references | Learner | Violates evidence-grounded principle |
| Learning rewrites historical execution facts | Learner | Learning interprets history; doesn't change it |

---

## 10. Integration Matrix

| Integration | Status | Notes |
|-------------|--------|-------|
| Learning ↔ Evidence | PARTIAL | Learning notes reference ACR evidence implicitly; no structural FK |
| Learning ↔ Evaluation | PARTIAL | Learning synthesizes findings; no automated pipeline |
| Learning ↔ Finance | MISSING | Financial variance patterns not fed into learning |
| Learning ↔ Bottlenecks | MISSING | Recurring bottleneck patterns not captured as learning |
| Learning ↔ Monitoring | PARTIAL | Indicator trends exist; no structural learning consumption |
| Learning ↔ SROI | MISSING | SROI outcome valuations not fed into learning |
| Learning ↔ Reporting | PARTIAL | Learning insights may appear in reports; no structural linkage |
| Learning ↔ Programme Design | PARTIAL | Design review may consult learning; no automated trigger |

---

## 11. Gap Analysis

| Area | Status | Gap |
|------|--------|-----|
| Learning Event entity | COMPLETE | `org_learning_notes` table with `orgLearningModel.ts` |
| Learning Insight types | COMPLETE | good_practice, failure_pattern, mixed |
| Learning Scope | COMPLETE | project_specific, programme_wide, organization_wide |
| Learning Status lifecycle | PARTIAL | draft → published exists; review/validation step implicit |
| Evidence base linkage | PARTIAL | Learning notes reference ACR; not structurally enforced |
| Evaluation → Learning pipeline | MISSING | No automated flow from findings to learning |
| Cross-project pattern detection | MISSING | No multi-project analytics |
| Design change proposal | MISSING | No structural link from learning to design revision |
| Learning quality model | MISSING | Conceptual only |
| Learning audit ledger | MISSING | No dedicated events table for learning lifecycle |
| Learning → Design feedback automation | MISSING | Manual process only |

---

## 12. Readiness Assessment

**Architecture Readiness: MEDIUM**

### Rationale

Learning has a functional data model (`org_learning_notes` with types, scope, status)
and canonical codebase support (`learningModel.ts`, `orgLearningModel.ts`). The
draft → published lifecycle is implemented. Insight types and scopes are well-defined.

However, Learning lacks:
- Automated pipelines from upstream domains (evaluation → learning, evidence → learning)
- Cross-project pattern detection
- Structural linkage to design revision workflow
- A dedicated learning audit ledger
- Quality scoring

Learning is functionally usable for manual insight capture and sharing. It is the
most mature of the "interpretation layer" domains (more mature than Evaluation
at LOW readiness) but not yet ready for automated cross-domain synthesis.

### Path to HIGH Readiness

1. Implement structural evidence base linkage (FK from learning notes to ACR/findings).
2. Automate evaluation → learning pipeline (flag high-severity findings for learning review).
3. Implement design change proposal entity with learning insight reference.
4. Add cross-project pattern detection (aggregate insight types and scopes).
5. Implement learning audit ledger (events table for learning lifecycle).
6. Integrate learning health into Control Center model.

---

## Decision

Learning is a first-class PD domain that synthesizes insights from execution data,
evidence, evaluation findings, and cross-project patterns into organizational knowledge.

- Learning insights are **evidence-grounded, typed, scoped, and status-tracked**.
- The `org_learning_notes` table and `orgLearningModel.ts` are the canonical sources.
- Learning **never automatically mutates design** — it informs design review but requires explicit PD Designer action for revision.
- Published learning insights are **permanent organizational knowledge assets**.
- Learning readiness is **MEDIUM** — functional for manual insight capture; needs automated cross-domain pipelines for full maturity.

## Related ADRs and Files

- `docs/architecture/decisions/0010-integrated-program-lifecycle-cross-module-contract-matrix.md` (§15)
- `docs/architecture/decisions/0011-evidence-governance-canonical-contract.md`
- `docs/architecture/decisions/0012-evaluation-canonical-contract.md`
- `src/lib/project-management/learningModel.ts`
- `src/lib/project-management/orgLearningModel.ts`
- `src/lib/project-management/learningEvidencePicker.ts`
