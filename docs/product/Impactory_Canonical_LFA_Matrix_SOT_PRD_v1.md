---
title: "Impactory Canonical LFA Matrix — Source-of-Truth PRD v1"
status: "APPROVED PRODUCT SOURCE OF TRUTH"
architecture_direction: "APPROVED"
implementation: "NOT STARTED"
database_migration: "NOT APPROVED"
azure_changes: "NOT APPROVED"
baseline_at_approval: "eef518f"
date: "2026-07-19"
owner: "Impactory Product & Architecture"
---

# Impactory Canonical LFA Matrix

## Source-of-Truth Product Requirements Document — Version 1.0

> **Governance notice:** If runtime behavior, historical audits, implementation plans, code comments, or agent artifacts conflict with this approved PRD, this PRD governs product intent. Runtime evidence still governs factual implementation state.

## Document Control

| Field | Value |
|---|---|
| Product | Impactory.id |
| Document | Canonical LFA Matrix SOT PRD v1 |
| Status | APPROVED PRODUCT SOURCE OF TRUTH |
| Baseline repository | `main @ eef518f` |
| Architecture direction | APPROVED |
| Implementation | NOT STARTED |
| Database migration | NOT APPROVED |
| Program Skeleton V3 | NOT APPROVED |
| Azure changes | NOT APPROVED |

---

# 1. Executive Summary

Impactory akan menggunakan **Canonical LFA Matrix** sebagai fondasi desain program. Target arsitektur adalah expanded results chain yang membedakan dampak, tujuan khusus, outcome, output, dan activity. Produk tetap menyediakan Compact Mode untuk organisasi kecil tanpa membuat node Outcome tersembunyi atau sintetis.

## 1.1 Target Canonical Architecture

```text
Goal / Impact
→ Purpose / Specific Objective
→ Outcome
→ Output
→ Activity
```

Outcome bersifat:

- eksplisit dan diperlukan untuk kelengkapan **Expanded Mode**;
- opsional dan tidak dibuat secara sintetis pada **Compact Mode**.

Compact Mode:

```text
Goal
→ Purpose
→ Output
→ Activity
```

Expanded Mode:

```text
Goal
→ Purpose
→ Outcome
→ Output
→ Activity
```

## 1.2 Product Outcomes

1. User memahami perbedaan Goal, Purpose, Outcome, Output, dan Activity tanpa melihat istilah database.
2. Manual editor menjaga hierarchy melalui contextual actions.
3. Compact dan Expanded Mode berbagi canonical contract tanpa hidden Outcome.
4. LFA Activity menjadi sumber draft WBS; WBS memperinci pelaksanaan tanpa mengambil alih makna LFA.
5. Indicators dapat dipakai MEAL tanpa mencampur planning fields dengan actual evidence.
6. Legacy projects tetap terbaca tanpa silent rewrite atau deletion.
7. Azure menghasilkan structured draft yang dapat divalidasi, bukan fakta aktual.

## 1.3 Success Measures

- Tidak ada node yang identitasnya ditentukan hanya oleh `sequence`.
- Seluruh result nodes dan parent relations terlihat di editor dan export.
- Incomplete draft dapat disimpan tanpa dianggap structurally complete.
- Tidak ada legacy record yang diubah tanpa classifier, dry-run, dan approval.
- Stable canonical ID dapat ditelusuri ke downstream contracts.
- AI tidak dapat overwrite user-reviewed nodes secara diam-diam.
- Normal create flow tidak mengekspos generic level selector.

---

# 2. Context and Evidence Baseline

Evidence audit pada baseline `eef518f` membuktikan mismatch antara Program Skeleton, database, materializer, manual editor, dan PDF export.

| Layer | Observed baseline |
|---|---|
| Program Skeleton | Purpose tunggal, Outcomes array, Outputs dengan outcome reference, WBS tasks |
| Database | `lfa_entries.level` hanya `goal`, `purpose`, `output`, `activity`; tidak ada native `outcome` |
| Materializer | Purpose → `purpose sequence=1`; Outcomes → `purpose sequence>=2` |
| Sequence | Display order sekaligus semantic fallback |
| Manual editor | Hanya membaca first `purpose`; manual Outputs dapat `parent_id=null` |
| PDF export | Hanya first Purpose; Outputs flat; Activities nested under Outputs |
| Generated Activity | Saat ini berasal dari WBS Level-2 tasks |
| Metadata | Indicator, MoV, Assumption berupa single embedded strings |
| Lineage | Skeleton source IDs tidak survive persistence/reload |
| Production shape | Aggregate production shape belum di-query; migration risk belum dihitung |

> **Important:** PRD ini menyetujui target architecture, bukan menyatakan migration aman. Production data-shape query tetap menjadi gate wajib.

---

# 3. Product Principles

## P1 — Meaning over mechanics

User mengelola makna program. Sistem mengelola level, parent reference, ordering, dan lineage.

## P2 — Manual-first, AI-assisted

Seluruh canonical nodes dapat dibuat dan diedit manual. AI bersifat opsional.

## P3 — Drafts are valid

Incomplete draft boleh disimpan. Validator menjelaskan gap; database tidak memaksa donor-ready state.

## P4 — No synthetic facts

Tidak ada hidden Outcome, invented baseline, fake evidence, actual result, actual expenditure, atau validated finding buatan AI.

## P5 — Stable lineage

Canonical IDs harus survive persistence dan menjadi reference downstream.

## P6 — Never silently overwrite

Regeneration atau synchronization menggunakan diff serta explicit user action.

## P7 — Compatibility before migration

Read adapter hadir sebelum migration. Ambiguous legacy rows tetap reviewable.

## P8 — Readiness is multidimensional

Structural, measurement, implementation, donor, dan impact-valuation readiness dipisahkan.

## P9 — Donor adaptation at presentation layer

Canonical meaning tetap stabil. Export/template menyesuaikan kebutuhan donor.

## P10 — Evidence governs claims

Target tidak boleh dipresentasikan sebagai actual. Suggestion tidak boleh dipresentasikan sebagai validated.

---

# 4. Canonical Terminology

## 4.1 Goal / Impact — Dampak Jangka Panjang

Perubahan pembangunan jangka panjang yang program kontribusikan dan berada di luar kontrol penuh program.

## 4.2 Purpose / Specific Objective — Tujuan Khusus Program

Perubahan utama yang hendak dicapai dalam horizon program. Satu Purpose per LFA Matrix.

## 4.3 Outcome — Perubahan Menengah

Perubahan perilaku, praktik, kapasitas, relasi, atau institusi yang dialami stakeholder setelah menggunakan Outputs.

## 4.4 Output — Keluaran Program

Produk, jasa, sistem, kapasitas terbangun, atau hasil langsung yang berada dalam kontrol program.

## 4.5 Activity — Kegiatan Utama

Intervensi utama untuk menghasilkan Output. Activity bukan WBS Task.

## 4.6 Deliverable — Bukti Serah / Hasil Kerja

Artefak atau hasil kerja yang menunjukkan pelaksanaan Activity atau work package. Deliverable bukan level hasil pembangunan.

## 4.7 WBS Work Package — Paket Kerja

Kelompok pekerjaan operasional yang menurunkan Activity.

## 4.8 WBS Task — Tugas Operasional

Unit kerja terjadwal untuk menjalankan Work Package atau Activity.

## 4.9 Milestone — Titik Pencapaian

Checkpoint tanpa durasi atau titik kelulusan deliverable.

## 4.10 Indicator — Indikator

Variabel kuantitatif atau kualitatif untuk menilai result.

## 4.11 Means of Verification — Bukti Verifikasi

Jenis bukti yang dapat membuktikan indikator.

## 4.12 Data Source — Sumber Data

Sistem, register, dokumen, atau populasi asal data.

## 4.13 Collection Method — Metode Pengumpulan

Cara data dikumpulkan.

## 4.14 Collection Tool — Instrumen Pengumpulan

Instrumen spesifik yang digunakan.

## 4.15 Assumption — Asumsi Kritis

Kondisi eksternal yang diperlukan agar causal link bekerja.

## 4.16 Risk — Risiko

Kejadian atau kondisi tidak pasti yang dapat menghambat result atau implementation.

> **Terminology guard:** Outcome ≠ Output; Output ≠ Deliverable; Activity ≠ WBS Task; MoV ≠ Data Source ≠ Collection Method.

---

# 5. Target Canonical Architecture

```text
PROGRAM
└── LFA Matrix / Workstream
    └── Goal / Impact [1]
        └── Purpose / Specific Objective [1]
            ├── Outcome [0..n; required in Expanded Mode]
            │   └── Output [0..n]
            │       └── Activity [0..n]
            └── Output [0..n; Compact Mode only]
                └── Activity [0..n]
```

## 5.1 Parent Rules

- Goal dimiliki oleh LFA Matrix.
- Purpose dimiliki oleh Goal/Matrix.
- Outcome dimiliki oleh Purpose.
- Output dimiliki oleh Outcome pada Expanded Mode atau Purpose pada Compact Mode.
- Activity dimiliki oleh Output.
- Indicator dimiliki oleh Goal, Purpose, Outcome, atau Output.

## 5.2 Multiple Purposes

Multiple Purposes tidak didukung dalam satu LFA Matrix v1. Program kompleks dapat memakai multiple matrices/workstreams pada fase lanjutan.

---

# 6. Compact and Expanded Modes

## 6.1 Compact Mode

```text
Goal → Purpose → Output → Activity
```

Rules:

- Outcome tidak dibuat secara tersembunyi.
- Output menginduk langsung ke Purpose.
- Cocok untuk program kecil atau grassroots NGO.
- Dapat dikembangkan ke Expanded Mode tanpa memalsukan node historis.

## 6.2 Expanded Mode

```text
Goal → Purpose → Outcome → Output → Activity
```

Rules:

- Outcome eksplisit dan user-visible.
- Output menginduk ke Outcome.
- Cocok untuk program multi-outcome atau institutional grant.

## 6.3 Mode Switching

- Compact → Expanded: Existing Outputs tetap dapat melekat pada Purpose sampai user melakukan explicit organization/reparenting.
- Expanded → Compact: Diblok jika explicit Outcomes masih ada, kecuali user memilih reversible mapping plan.
- Tidak ada silent merge atau silent deletion.

> **Rejected pattern:** Compact Mode tidak boleh membuat hidden default Outcome.

---

# 7. Cardinality and Draft-State Rules

| Relation | Draft allowed | Structurally complete | Recommended | Hard DB content constraint |
|---|---:|---:|---:|---:|
| Program → Goal | 0–1 | 1 | 1 | No |
| Goal → Purpose | 0–1 | 1 | 1 | No |
| Purpose → Outcome | 0–n | ≥1 only in Expanded | 1–4 | No |
| Purpose/Outcome → Output | 0–n | ≥1 | 1–4 per parent | No |
| Output → Activity | 0–n | ≥1 | 1–6 per Output | No |
| Result → Indicator | 0–n | ≥1 for measured results | 1–3 | No |
| Indicator → MoV | 0–n | ≥1 or explicit evidence plan | 1–3 | No |

Recommended quantities adalah quality guidance, bukan database constraints.

---

# 8. Canonical Node Contracts

## 8.1 Common Fields

- `canonical_id` — stable UUID/ULID generated before or at creation.
- `program_id` — owning programme.
- `matrix_id` — owning LFA matrix/workstream.
- `node_type` — `goal | purpose | outcome | output | activity`.
- `statement` — human-readable result/activity statement.
- `description` — optional explanation.
- `parent_node_id` — canonical parent reference.
- `sequence` — display order only.
- `origin` — `ai_generated | user_created | imported | materialized`.
- `last_modified_by_type` — `user | system | ai | import`.
- `validation_status` — `draft | needs_review | validated | approved | archived`.
- `source_external_id` — optional external/source reference.
- `created_at`, `updated_at` — audit timestamps.

## 8.2 Goal

- One per structurally complete Matrix.
- May have Indicators, Assumptions, and Risks.
- AI may draft; user review required.

## 8.3 Purpose

- Exactly one per structurally complete Matrix.
- Represents central specific objective.
- Cannot be silently duplicated by materializer.

## 8.4 Outcome

- Explicit in Expanded Mode.
- Absent in Compact Mode.
- Represents stakeholder or institutional change.
- Parent is Purpose.

## 8.5 Output

- Parent is Outcome in Expanded Mode.
- Parent is Purpose in Compact Mode.
- Must be within programme management control.
- Legacy null-parent Output remains visible under Unassigned / Needs Review.

## 8.6 Activity

- Parent must be Output.
- Describes major intervention, not granular execution step.
- Becomes canonical source for WBS draft.
- May carry timeline, role, deliverable, and resource hints.

---

# 9. Indicator, MoV, Assumption, and Risk

## 9.1 Canonical Indicator Model

### LFA Core Fields

- `indicator_id`
- `result_node_id`
- `statement`
- `indicator_type`
- `unit`
- `target_value` / `target_text`
- `target_date`
- `baseline_status`
- provenance and validation status

### MEAL Enrichment Fields

- definition
- baseline value/text/source
- data source
- collection method
- collection tool
- frequency
- responsible role
- disaggregation
- formula
- numerator
- denominator
- data-quality method

### Actual Monitoring Fields — not part of canonical LFA

- reporting period
- actual value
- evidence reference
- data-quality status
- reviewer
- validation date

## 9.2 Means of Verification

MoV is conceptually owned by Indicator. Compact UI may show one simple field; canonical model may support multiple records later.

## 9.3 Assumption

Assumption belongs to a result node or causal transition. Multiple assumptions are conceptually supported.

## 9.4 Risk

Risk uses a structured registry with optional scope to Program, Result, or Activity. Minimum fields:

- stable ID
- scope/reference ID
- statement
- likelihood
- impact
- mitigation
- owner role
- status
- provenance
- validation status

---

# 10. LFA Activity and WBS Boundary

## 10.1 Canonical Direction

```text
LFA Activity
→ deterministic WBS draft
```

Not:

```text
WBS Task
→ canonical LFA Activity
```

## 10.2 Semantic Difference

- LFA Activity: major intervention needed to produce an Output.
- WBS Work Package: operational package derived from Activity.
- WBS Task: schedulable work unit.
- WBS Subtask: execution detail.
- Milestone: zero-duration checkpoint.

## 10.3 Sync Policy

- WBS draft generation may be deterministic.
- Subsequent LFA changes generate a diff.
- User explicitly approves synchronization.
- Manual WBS edits are never overwritten silently.
- Target reference: `wbs_item.source_lfa_activity_id` or an implementation-equivalent stable reference.

---

# 11. Manual Editor UX

## 11.1 Principle

User manages programme meaning. System manages hierarchy, IDs, references, and ordering.

## 11.2 Contextual Actions

### Goal

- Edit Goal
- Add/Edit Indicator
- Add Assumption

### Purpose

- Add Outcome in Expanded Mode
- Add Output in Compact Mode
- Add Indicator
- Add Assumption

### Outcome

- Add Output
- Add Indicator
- Add Assumption
- Add Risk

### Output

- Add Activity
- Add Indicator
- Add MoV
- Add Risk

### Activity

- Create/Update WBS Draft
- Edit timing, responsible-role, deliverable, and resource hints
- Add Risk

## 11.3 UX Rules

- Generic level dropdown is removed from normal contextual flow.
- Global Add Element and bulk import may retain level selection for advanced users.
- Reparent and reorder are explicit structural actions with impact preview and confirmation.
- Delete is blocked or converted to archive when children/downstream references exist.
- Legacy unassigned Outputs remain visible.
- AI origin and validation state are visible in professional mode.

---

# 12. Readiness Model

## 12.1 Structural Completeness

Measures hierarchy, statements, valid parents, and required nodes.

## 12.2 Measurement Readiness

Measures Indicators, Targets, baseline status/plan, and MoV.

## 12.3 Implementation Readiness

Measures WBS, timeline, roles, dependencies, and budget coverage.

## 12.4 Donor Readiness

Donor-specific: required sections, annexes, formats, safeguarding, compliance, and M&E requirements.

## 12.5 Impact Valuation Readiness

Optional future dimension for SROI/economic valuation. Not a universal donor-readiness criterion.

No single percentage may claim all dimensions.

---

# 13. Stable IDs, Provenance, and Validation

```text
origin:
  ai_generated | user_created | imported | materialized

last_modified_by_type:
  user | system | ai | import

validation_status:
  draft | needs_review | validated | approved | archived
```

Rules:

- Editing does not equal validation.
- User edit to AI draft keeps `origin=ai_generated`.
- User edit sets `last_modified_by_type=user`.
- Status remains or becomes `needs_review` until explicit review action.
- Sequence is display order only.
- Canonical IDs survive persistence and reload.
- External/source IDs are stored separately.

---

# 14. Legacy Compatibility and Adapter Policy

## 14.1 Classification States

- `CONFIRMED_PURPOSE`
- `CONFIRMED_OUTCOME`
- `LEGACY_COMPACT`
- `LEGACY_AMBIGUOUS`
- `ORPHANED_RESULT`
- `NEEDS_REVIEW`

## 14.2 Adapter Rules

- `level=purpose, sequence=1` may be a Purpose candidate.
- `level=purpose, sequence>1` may be an Outcome candidate only when corroborated by generated provenance, parented Outputs, Program Skeleton linkage, or materialization metadata.
- Sequence alone is never sufficient.
- Adapter performs read-time mapping first.
- Adapter does not silently write or reclassify records.
- Ambiguous rows remain visible for explicit review.

---

# 15. Program Skeleton V3 Direction

Target direction only; implementation not approved.

- Purpose and Outcomes remain distinct.
- Outputs explicitly reference Purpose or Outcome according to mode.
- Activities explicitly reference Output.
- LFA Activities—not WBS tasks—become the source for WBS draft.
- All nodes and Indicators carry stable source IDs.
- Indicators are arrays with result references.
- Actual baseline may remain null with `baseline_status=required`.
- Provenance, prompt version, model tier, and validation requirement accompany generated content.
- Quality report identifies missing elements and relation gaps.

---

# 16. AI Responsibility Matrix

## AI may auto-fill draft

- Goal
- Purpose
- Outcomes
- Outputs
- Activities
- Indicator statements
- Assumptions
- Risks
- draft MoV
- timeline hints
- responsible-role hints

## AI may suggest, requires review

- targets
- methods
- tools
- frequency
- disaggregation
- budget requirement categories
- evaluation questions
- SROI candidate categories

## Manual/import/integration required

- actual baseline
- actual endline
- actual achieved value
- evidence
- actual beneficiary count
- actual expenditure
- real staff/PIC identity
- validated findings
- approved recommendations

## AI prohibited from fabricating

- actual facts
- evidence references that do not exist
- validated causal claims
- evaluative SROI results from proposal data alone

---

# 17. Downstream Boundary Contracts

## 17.1 LFA Activity → WBS

Deterministic transport:

- stable Activity ID
- statement
- parent Output
- timing hints
- role hints
- deliverable hints

AI may suggest work packages/tasks; user approves sync.

## 17.2 LFA/WBS → Budget

Transport:

- source IDs
- duration
- participant count
- geography
- resource/category hints

AI suggests resource requirements. Deterministic rate engine or manual quote determines pricing.

## 17.3 Indicator → MEAL

Transport:

- Indicator ID
- Result ID
- statement
- target
- unit
- deadline
- MoV
- baseline status

User/AI enrichment:

- method
- tool
- frequency
- sampling
- responsible role
- disaggregation

## 17.4 Outcome → Evaluation Candidate

Transport:

- Outcome ID
- stakeholder context
- Indicators
- Assumptions
- Risks
- evidence requirements

AI may draft evaluation questions/matrix. Evaluator approves.

## 17.5 Outcome → SROI Planning Candidate

Transport:

- Outcome ID
- stakeholder context
- intended change
- Indicator references
- evidence-readiness state

AI may suggest candidate outcome map or proxy category. No final value claim.

---

# 18. Migration Prerequisites

> **Migration status: NOT APPROVED.**

Before any native Outcome or Indicator migration:

1. Safe organization-scoped read-only production-shape query.
2. Backup and tested rollback plan.
3. Classifier using provenance, parent relations, source metadata, and sequence only as supporting evidence.
4. Ambiguous-row report requiring explicit resolution.
5. Parent-reference and zero-orphan validation.
6. Stable-ID and source-lineage strategy.
7. RLS and tenant-isolation review.
8. Generated TypeScript types update plan.
9. Legacy adapter deterministic tests.
10. Staging/replica dry-run report.
11. Manual-edit preservation and export regression tests.
12. Explicit Product Owner approval and maintenance window.

---

# 19. Functional Requirements

- **FR-LFA-001:** Support Compact and Expanded modes without synthetic hidden Outcome.
- **FR-LFA-002:** Maintain one Goal and one Purpose per structurally complete Matrix.
- **FR-LFA-003:** Support zero or more Outcomes while drafting and one or more for Expanded completeness.
- **FR-LFA-004:** Output references Purpose or Outcome explicitly; null legacy parent remains visible.
- **FR-LFA-005:** Activity references Output explicitly.
- **FR-LFA-006:** Sequence controls ordering only.
- **FR-LFA-007:** Manual editor uses contextual create actions.
- **FR-LFA-008:** Support result-owned structured Indicator child records conceptually.
- **FR-LFA-009:** Separate LFA planning from MEAL actual monitoring data.
- **FR-LFA-010:** LFA Activity is source for WBS draft.
- **FR-LFA-011:** Synchronization shows diff and preserves manual edits.
- **FR-LFA-012:** AI-generated nodes expose provenance and require review.
- **FR-LFA-013:** User edit does not automatically validate.
- **FR-LFA-014:** Legacy adapter never silently rewrites records.
- **FR-LFA-015:** Export preserves hierarchy and all non-archived nodes.
- **FR-LFA-016:** Readiness is reported across separate dimensions.
- **FR-LFA-017:** Donor adapters alter presentation, not stored semantics.
- **FR-LFA-018:** Delete with children/downstream references requires safe resolution.
- **FR-LFA-019:** Canonical nodes and Indicators have stable IDs that survive reload.
- **FR-LFA-020:** Incomplete drafts remain savable and explicitly labelled.

---

# 20. Acceptance Criteria

- **AC-01:** Compact project works without an Outcome and exports correctly.
- **AC-02:** Expanded project renders Purpose, all Outcomes, associated Outputs, and Activities.
- **AC-03:** No semantic meaning depends solely on sequence.
- **AC-04:** Parent links survive save/reload.
- **AC-05:** Legacy null-parent Outputs remain visible and reviewable.
- **AC-06:** PDF/export includes all non-archived nodes with correct grouping.
- **AC-07:** Manual Activity can generate WBS draft through explicit action.
- **AC-08:** WBS manual edits survive LFA edits until user approves sync.
- **AC-09:** Indicator planning fields transport to MEAL skeleton without actual-data fabrication.
- **AC-10:** AI regeneration produces a diff and cannot silently overwrite reviewed nodes.
- **AC-11:** User edit changes modifier metadata but does not auto-validate.
- **AC-12:** Dashboard can show structurally complete but measurement-incomplete.
- **AC-13:** Legacy adapter identifies ambiguous rows without rewriting.
- **AC-14:** Tenant isolation and RLS remain intact after approved schema evolution.
- **AC-15:** No migration proceeds without production-shape report and rollback rehearsal.

---

# 21. Non-Goals

This PRD does not authorize:

- Full WBS redesign or critical-path management.
- Full Budget/RAB redesign or price-engine redesign.
- Full MEAL Planner, evidence, accountability, or learning workflow.
- Evaluation Plan/Findings implementation.
- SROI calculation, proxy, discounting, or assurance redesign.
- Sidebar consolidation.
- Unified workspace tabs.
- Campaign Builder.
- Proposal editor redesign.
- Azure prompt implementation.
- Database migration.
- Production data cleanup.

---

# 22. Rollout Strategy

## Phase A — Approve SOT PRD and ADR

Documentation only.

## Phase B — Read-only implementation gap assessment

Compare approved PRD against runtime baseline `eef518f`.

## Phase C — Production-shape query and legacy classifier design

Read-only evidence and deterministic tests.

## Phase D — Contextual editor and read adapter behind feature flag

No production migration.

## Phase E — Stable ID and Indicator contract

Schema evolution only after separate approval.

## Phase F — LFA → WBS transport correction

Deterministic and user-controlled sync.

## Phase G — Program Skeleton V3 and Azure alignment

Only after canonical runtime stabilizes.

## Phase H — Migration dry-run and phased rollout

Explicit approval required.

---

# 23. Open Decisions

- **OD-01:** Should a Program eventually contain multiple LFA Matrices/workstreams?
- **OD-02:** When should native Outcome migration occur?
- **OD-03:** Should Indicator migration ship separately from Outcome migration?
- **OD-04:** How long should legacy flat Outputs remain writable?
- **OD-05:** Which donor adapters are first priority?
- **OD-06:** Which role may approve `validation_status=approved`?

Defaults until decided:

- one Matrix per Program for v1;
- migration blocked;
- Indicator migration separate unless evidence proves combined change safer;
- legacy records remain indefinitely readable;
- donor priority follows product roadmap;
- approval role requires RBAC decision.

---

# 24. ADR Requirements

The following ADRs are required:

1. Canonical LFA hierarchy and Compact/Expanded modes.
2. Stable IDs, provenance, and validation states.
3. Legacy adapter before native Outcome migration.
4. LFA Activity as source for WBS draft.
5. Structured Indicator boundary with MEAL.
6. Program Skeleton V3 and AI responsibility governance.

---

# 25. Standards and References

- **[S1]** OECD (2023), *Glossary of Key Terms in Evaluation and Results-Based Management for Sustainable Development, Second Edition*: https://www.oecd.org/en/publications/glossary-of-key-terms-in-evaluation-and-results-based-management-for-sustainable-development-second-edition_632da462-en-fr-es.html
- **[S2]** European Commission DG INTPA, *Methodological Guidance on Results and Indicators* (2021): https://capacity4dev.europa.eu/sites/default/files/sig_website_methodo_2021.pdf
- **[S3]** European Commission Capacity4dev, *Results and Indicators for Development*: https://capacity4dev.europa.eu/resources/results-indicators_en
- **[S4]** UNDP, Programme and Project Management / Results-Based Management guidance hub: https://popp.undp.org/programme-and-project-management
- **[S5]** Project Management Institute, WBS basics and relationship to schedule and budget: https://www.pmi.org/learning/library/work-breakdown-structure-basics-5919
- **[S6]** Social Value International, Principles and Standards: https://www.socialvalueint.org/principles and https://www.socialvalueint.org/standards

Reference use note: External standards inform vocabulary, results-chain principles, WBS boundaries, and future impact-governance boundaries. Impactory product decisions remain explicitly stated in this PRD and do not claim universal donor equivalence.

---

# 26. Architecture Approval Record

| Decision | Status |
|---|---|
| Preferred architecture: expanded results chain with Compact presentation mode | APPROVED |
| No hidden default Outcome | APPROVED |
| One Purpose per LFA Matrix | APPROVED |
| Outcome optional in Compact Mode | APPROVED |
| LFA Activity → WBS direction | APPROVED |
| Structured Indicator target model | APPROVED CONCEPTUALLY |
| Legacy adapter before migration | APPROVED |
| Native Outcome schema migration | NOT APPROVED |
| Production data migration | NOT APPROVED |
| Program Skeleton V3 implementation | NOT APPROVED |
| Azure Brain changes | NOT APPROVED |

**Product Owner decision:** APPROVED — Canonical LFA Matrix SOT PRD v1  
**Approval date:** 2026-07-19
