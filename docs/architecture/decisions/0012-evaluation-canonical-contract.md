# ADR 0012: Evaluation Canonical Contract

## Status

Accepted

## Date

2026-08-10

## Context

ADR 0007–0011 established Programme Design, Finance, Bottleneck, Cross-Module,
and Evidence governance. The next major domain is **Evaluation**.

Currently, `project_evaluation_findings` exists as a database table with fields
(`finding`, `recommendation`, `severity`, `evidence_id` FK to `wbs_completion_evidence`).
However, Evaluation lacks:
- A canonical lifecycle contract
- Explicit ownership boundaries
- A defined taxonomy (Relevance, Effectiveness, Efficiency, Impact, Sustainability)
- A quality model
- Integration contracts with Evidence, Monitoring, Learning, and SROI

This ADR establishes Evaluation as a first-class architecture domain.

---

## 1. Evaluation Domain Definition

### What Evaluation IS

Evaluation is a **systematic, evidence-based assessment** of programme performance
against its design intentions.

| Characteristic | Definition |
|---------------|------------|
| Systematic | Follows a defined plan, scope, and methodology |
| Evidence-based | All findings are supported by observable evidence |
| Analytical | Goes beyond description to assess causality, effectiveness, and value |
| Actionable | Produces findings and recommendations that inform future decisions |
| Attributable | Every finding carries evaluator identity and timestamp |

### What Evaluation is NOT

| Non-Evaluation | Why Not |
|---------------|---------|
| Evidence | Evidence is input; evaluation is analysis |
| Activity Execution | Execution is PM domain; evaluation assesses execution outcomes |
| Reporting | Reporting synthesizes; evaluation analyzes |
| Programme Design | Design plans; evaluation assesses whether plans worked |
| Monitoring | Monitoring tracks; evaluation explains why |
| Opinion | Opinion is subjective; evaluation is evidence-grounded |

### Evaluation vs. Related Domains

```
Evidence (observed facts)
    ↓ consumed by
Evaluation (systematic assessment)
    ↓ produces
Findings + Recommendations
    ↓ feed into
Learning (lessons for future design)
    ↓ may influence
Programme Design (future cycles)
```

---

## 2. Evaluation Ownership Matrix

| Entity | Owner | Readers | Canonical Source |
|--------|-------|---------|-----------------|
| Evaluation Plan | PD Evaluator | PM (read-only) | Not yet implemented |
| Evaluation Cycle | PD Evaluator | PM (read-only) | Not yet implemented |
| Evaluation Scope | PD Evaluator | Stakeholders | Not yet implemented |
| Evaluation Question | PD Evaluator | PM (read-only) | Not yet implemented |
| Evaluation Method | PD Evaluator | Reviewer | Not yet implemented |
| Evaluation Finding | PD Evaluator | PM, Learning, Reporting | `project_evaluation_findings` |
| Finding Type | PD Evaluator | All consumers | `project_evaluation_findings.finding` (free text) |
| Finding Severity | PD Evaluator | All consumers | `project_evaluation_findings.severity` |
| Evaluation Recommendation | PD Evaluator | Learning, PD Designer | `project_evaluation_findings.recommendation` |
| Evaluation Conclusion | PD Evaluator | Stakeholders | Derived from findings |
| Evaluation Metadata | System | Auditors | `project_evaluation_findings.created_by`, `created_at` |
| Evidence Reference | Evaluator | All consumers | `project_evaluation_findings.evidence_id` (FK) |
| Evaluation RPCs | System | Authenticated | `create_evaluation_finding`, etc. (from migration) |

---

## 3. Evaluation Lifecycle

```
Planned
    │ Owner: PD Evaluator
    │ Purpose: Define scope, questions, methods, evidence requirements
    │ Outputs: Evaluation plan, question list, evidence checklist
    │ Status: Not yet implemented in codebase
    ↓
In Progress
    │ Owner: PD Evaluator
    │ Purpose: Collect evidence, review documents, conduct analysis
    │ Outputs: Draft findings, evidence cross-references
    │ Status: Implicit in evaluation workflow
    ↓
Evidence Review
    │ Owner: PD Evaluator
    │ Purpose: Verify evidence authenticity, relevance, sufficiency
    │ Action: Cross-reference evidence records; identify gaps
    │ Rule: Evaluator reads evidence; never modifies it
    ↓
Analysis
    │ Owner: PD Evaluator
    │ Purpose: Apply evaluation methods to evidence
    │ Outputs: Analyzed data, causal assessment, impact estimation
    │ Status: Manual process; not structurally tracked
    ↓
Finding Draft
    │ Owner: PD Evaluator
    │ Purpose: Articulate findings with evidence support
    │ Outputs: Draft finding records (project_evaluation_findings rows)
    │ Status: Can be created and updated
    ↓
Finding Approved
    │ Owner: PD Evaluator (self-approve or peer-review)
    │ Purpose: Finalize finding for consumption
    │ Outputs: Approved finding; immutable
    │ Status: No explicit approval workflow
    ↓
Recommendation Issued
    │ Owner: PD Evaluator
    │ Purpose: Propose actionable changes based on findings
    │ Outputs: Recommendation text linked to finding
    │ Rule: Recommendations are advisory; never auto-apply to design
    ↓
Closed
    │ Owner: PD Evaluator
    │ Purpose: Evaluation cycle complete
    │ Outputs: Final evaluation report, findings archive
    │ Status: No explicit closure workflow
```

---

## 4. Evidence Consumption Contract

### Evaluation May

| Action | Mechanism |
|--------|-----------|
| Read evidence records | `wbs_completion_evidence`, `lfa_meal_tracking_entries` |
| Aggregate evidence counts | Per Activity, per Indicator, per Outcome |
| Analyze evidence patterns | Correlation between evidence type and outcome achievement |
| Classify evidence by quality | Using Evidence Quality dimensions (ADR 0011 §8) |
| Reference evidence in findings | `project_evaluation_findings.evidence_id` FK |
| Cite evidence in recommendations | Textual reference in recommendation field |

### Evaluation May NOT

| Action | Reason |
|--------|--------|
| Modify evidence records | Evidence is immutable (ADR 0011 §9) |
| Delete evidence | Audit trail preservation |
| Overwrite verification state | Verification is reviewer domain, not evaluator |
| Fabricate evidence for findings | All findings must reference real evidence |
| Change evidence attribution | Attribution is part of evidence identity |
| Mark unevaluated evidence as "reviewed" | Evaluator only reads; reviewer verifies |

---

## 5. Finding Contract

### Evaluation Finding

A finding is a **structured observation** resulting from systematic evidence analysis.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | `project_evaluation_findings.id` |
| `finding` | Text | Yes | The observation or conclusion |
| `finding_type` | Enum (conceptual) | No | Relevance, Effectiveness, Efficiency, Impact, Sustainability, Governance |
| `evidence_id` | UUID (FK) | No | Links to `wbs_completion_evidence` |
| `severity` | Enum | Yes | Critical, Major, Minor, Observation, Positive |
| `recommendation` | Text | No | Actionable suggestion based on finding |
| `scope` | Enum (conceptual) | No | Activity-level, Output-level, Outcome-level, Programme-level |
| `confidence` | Enum (conceptual) | No | High, Medium, Low — based on evidence sufficiency |
| `created_by` | UUID | Auto | Evaluator identity |
| `created_at` | Timestamp | Auto | When finding was recorded |

### Finding Rules

1. Every finding should reference evidence (`evidence_id`), where available.
2. Finding severity must be explicit (Critical, Major, Minor, Observation, Positive).
3. Findings are immutable after approval (conceptual; not structurally enforced).
4. Findings may be linked to specific Activities, Outputs, or Outcomes (via scope field).
5. Multiple findings may reference the same evidence record.

---

## 6. Recommendation Contract

### Evaluation Recommendation

A recommendation is an **advisory proposal** derived from one or more findings.

| Property | Rule |
|----------|------|
| Source | Derived from one or more findings |
| Addressee | PD Designer, PM Owner, or Organization Leadership |
| Mutability | May be revised or superseded |
| Adoption | Requires explicit design review; never auto-applied |
| Traceability | Must reference source finding(s) |
| Accountability | Carries evaluator identity and timestamp |

### Recommendation → Design Path

```
Finding (evidence-grounded observation)
    ↓ informs
Recommendation (advisory proposal)
    ↓ reviewed by
Learning Process (ADR 0010 §15)
    ↓ may trigger
Design Revision (deliberate PD action)
    ↓ creates
New Programme Design Version
```

Recommendations **do not mutate design automatically**. They require human review and deliberate action.

---

## 7. Evaluation Taxonomy

| Category | Definition | Owner | Required Evidence |
|----------|-----------|-------|-----------------|
| Relevance | Is the programme addressing the right problem? | PD Evaluator | Needs assessment, Stakeholder input, Context analysis |
| Effectiveness | Are outcomes being achieved? | PD Evaluator | MEAL indicator tracking, Outcome progress data |
| Efficiency | Are resources being used optimally? | PD Evaluator | Budget vs actual, Cost per outcome, Timeline adherence |
| Impact | What lasting change has the programme created? | PD Evaluator | SROI data, Longitudinal tracking, Stakeholder surveys |
| Sustainability | Will benefits continue after programme ends? | PD Evaluator | Capacity assessment, Institutionalization evidence, Funding pipeline |
| Governance | Is the programme well-managed and accountable? | PD Evaluator | Compliance evidence, Audit records, Stakeholder feedback |

### Severity Scale

| Severity | Definition | Example |
|----------|-----------|---------|
| Critical | Threatens programme viability or outcome achievement | No evidence of any outcome progress after 12 months |
| Major | Significantly impairs effectiveness or efficiency | 40% budget overrun without compensating outcomes |
| Minor | Manageable issue; does not threaten core outcomes | Minor delay in one activity delivery |
| Observation | Neutral or informational finding | Stakeholder noted preference for different communication channel |
| Positive | Exceeds expectations; good practice identified | Outcome achieved 6 months ahead of schedule |

---

## 8. Evaluation Quality Model

| Dimension | Definition | Scoring |
|-----------|-----------|---------|
| Evidence Sufficiency | Are findings supported by adequate evidence? | Count of evidence references per finding; reviewer-assessed |
| Traceability | Can each finding be traced to specific evidence? | evidence_id present / absent |
| Credibility | Is the evaluator qualified and independent? | Evaluator identity; potential conflict-of-interest check |
| Reproducibility | Would another evaluator reach similar conclusions? | Method documented; evidence accessible |
| Transparency | Is the evaluation process documented? | Evaluation plan exists; method described |
| Coverage | Are all evaluation questions addressed? | Questions answered / total questions |

Quality scoring is conceptual. Implementation deferred.

---

## 9. Forbidden Mutations

| Action | Forbidden For | Reason |
|--------|--------------|--------|
| Evaluation modifies evidence | Evaluator | Evidence is immutable (ADR 0011) |
| Evaluation modifies completion claims | Evaluator | PM execution domain |
| Evaluation modifies deliverables | Evaluator | PM execution domain |
| Evaluation modifies monitoring records | Evaluator | MEAL tracking domain |
| Evaluation modifies indicators | Evaluator | PD design domain |
| Evaluation modifies outcomes | Evaluator | PD design domain |
| Evaluation modifies outputs | Evaluator | PD design domain |
| Evaluation modifies assumptions | Evaluator | PD design domain |
| Evaluation modifies budget design | Evaluator | PD budget domain |
| Recommendation auto-applies to design | System | Requires explicit PD Designer action |
| Finding fabricated without evidence | Evaluator | Violates evidence-based principle |

---

## 10. Integration Matrix

| Integration | Status | Notes |
|-------------|--------|-------|
| Evaluation ↔ Evidence | COMPLETE | FK from `project_evaluation_findings.evidence_id` to `wbs_completion_evidence` |
| Evaluation ↔ Monitoring | PARTIAL | MEAL tracking data is available; no structured evaluation consumption path |
| Evaluation ↔ Completion Claims | PARTIAL | Completion claims are evidence sources; no structured evaluation linkage |
| Evaluation ↔ Deliverables | MISSING | Deliverable acceptance status not consumed by evaluation |
| Evaluation ↔ Finance | MISSING | Budget variance data not structurally linked to evaluation findings |
| Evaluation ↔ Bottlenecks | MISSING | Bottleneck resolution patterns not consumed by evaluation |
| Evaluation ↔ Learning | PARTIAL | `orgLearningModel.ts` exists; evaluation-to-learning pipeline not automated |
| Evaluation ↔ SROI | PARTIAL | SROI uses outcome data; evaluation findings not direct SROI input |
| Evaluation ↔ Reporting | PARTIAL | Findings referenced in reports; no structural linkage |
| Evaluation ↔ Programme Design | MISSING | No mechanism for evaluation findings to trigger design revision workflow |

---

## 11. Gap Analysis

| Area | Status | Gap |
|------|--------|-----|
| Evaluation Plan entity | MISSING | No database table for evaluation plans, cycles, or questions |
| Evaluation Method entity | MISSING | No structured method documentation |
| Finding type taxonomy | PARTIAL | `finding` is free text; no structured type classification |
| Finding approval workflow | MISSING | No status field; no approval lifecycle |
| Recommendation traceability | PARTIAL | `recommendation` exists as text; not structurally linked to design revision |
| Scope classification | MISSING | Findings not classified by Activity/Output/Outcome scope |
| Confidence scoring | MISSING | No confidence or evidence-sufficiency scoring |
| Evaluation quality model | MISSING | Conceptual only; not implemented |
| Evaluation ↔ Learning automation | MISSING | Manual process; no structural pipeline |
| Evaluation ↔ Design feedback loop | MISSING | No mechanism for findings to trigger design review |
| Multi-cycle evaluation tracking | MISSING | No concept of evaluation cycles |

---

## 12. Readiness Assessment

**Architecture Readiness: LOW**

### Rationale

Evaluation has a functional database table (`project_evaluation_findings`) with basic fields (finding, recommendation, severity, evidence_id FK), but:

- No lifecycle workflow (findings are created/updated without approval stages)
- No evaluation plan or cycle concept
- No structured taxonomy (finding type, scope, confidence are free-text)
- No automated pipeline to Learning or Programme Design
- No quality model
- Cross-domain integrations are PARTIAL or MISSING across most dimensions

Evaluation is usable for basic finding documentation but cannot support systematic programme evaluation without dedicated infrastructure.

### Path to MEDIUM Readiness

1. Add structured finding type and scope classifications.
2. Implement finding approval workflow (draft → approved).
3. Create evaluation → learning automated linkage.
4. Add confidence scoring per finding.
5. Document evaluation method per cycle.

### Path to HIGH Readiness

1. Implement Evaluation Plan and Cycle entities.
2. Implement evaluation quality scoring.
3. Automate evaluation → design revision feedback loop.
4. Implement multi-cycle comparative evaluation.
5. Integrate evaluation findings into Control Center health model.

---

## Decision

Evaluation is a first-class PD domain that consumes evidence and produces
findings and recommendations. It is the systematic assessment layer between
raw evidence (ADR 0011) and actionable learning (ADR 0010 §15).

- Evaluation findings are **evidence-grounded observations** with severity and scope.
- Evaluation recommendations are **advisory proposals** that require explicit design review.
- Evaluation **never modifies evidence, design, or execution records.**
- The `project_evaluation_findings` table is the canonical storage for findings.
- Evaluation readiness is **LOW** — functional for basic finding documentation but lacks
  systematic lifecycle, taxonomy, quality model, and cross-domain automation.

## Related ADRs and Files

- `docs/architecture/decisions/0010-integrated-program-lifecycle-cross-module-contract-matrix.md` (§14)
- `docs/architecture/decisions/0011-evidence-governance-canonical-contract.md`
- `supabase/migrations/20260808100000_add_evaluation_findings.sql`
- `src/lib/project-management/learningModel.ts`
- `src/lib/project-management/orgLearningModel.ts`
