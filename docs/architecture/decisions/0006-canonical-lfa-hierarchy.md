# ADR 0006: Canonical LFA Hierarchy

## Status

```text
Accepted
```

## Date

```text
2026-07-19
```

## Context

Program Skeleton existing membedakan Purpose dan Outcomes.

Database existing belum mempunyai native Outcome level.

Generated Outcomes saat ini disimpan sebagai additional purpose rows.

Sequence saat ini mempunyai dual role:
- display order;
- semantic identity fallback.

Manual editor dan PDF export existing tidak menampilkan seluruh Outcomes.

Generated LFA Activity saat ini berasal dari WBS task contract.

Program Skeleton source IDs tidak survive persistence/reload.

Indicator, MoV, dan Assumption masih berupa embedded single strings.

Production aggregate data shape belum tersedia.

Migration risk belum dapat dihitung.

## Decision

Tetapkan canonical hierarchy:
Goal / Impact
→ Purpose / Specific Objective
→ Outcome
→ Output
→ Activity

Tetapkan Compact Mode:
Goal
→ Purpose
→ Output
→ Activity

Tanpa hidden/synthetic Outcome.

Tetapkan Expanded Mode:
Goal
→ Purpose
→ Outcome
→ Output
→ Activity

Tetapkan:
One Purpose per LFA Matrix.

Outcome optional in Compact Mode.

Output parent:
- Purpose in Compact Mode;
- Outcome in Expanded Mode.

Activity parent:
- Output.

Sequence:
- display order only.

LFA Activity:
- source for deterministic WBS draft.

Indicator:
- target conceptual model is structured child record.

Actual monitoring:
- remains in MEAL runtime.

Legacy adapter:
- required before migration.

Native Outcome migration:
- not approved.

Program Skeleton V3:
- not approved.

Azure changes:
- not approved.

## Consequences

### Positive

- terminology lebih jelas;
- hierarchy tidak bergantung pada sequence;
- explicit Outcome tersedia untuk program kompleks;
- Compact Mode tetap sederhana;
- tidak ada synthetic hidden node;
- downstream contracts lebih stabil;
- export dapat menjaga hierarchy;
- manual dan AI flows dapat mengikuti model yang sama;
- lineage dan provenance dapat diperkuat.

### Negative

- runtime existing belum sesuai;
- legacy adapter diperlukan;
- kemungkinan schema evolution;
- production-shape query wajib;
- manual editor dan PDF memerlukan perubahan di masa depan;
- migration dapat kompleks;
- migration belum diizinkan;
- Azure contract belum boleh diubah.

## Alternatives Considered

### Alternative A — Compact-only hierarchy

```text
Goal → Purpose → Output → Activity
```

Ditolak sebagai canonical target tunggal karena explicit Outcomes dari program kompleks akan hilang atau dipaksa menjadi Output.

### Alternative B — Hidden default Outcome

Ditolak karena:
- membuat synthetic node;
- mengaburkan provenance;
- membingungkan export;
- berisiko masuk ke MEAL/SROI sebagai Outcome nyata;
- menyulitkan mode switching.

### Alternative C — Multiple Purposes in one Matrix

Ditunda karena meningkatkan causal dan UX complexity.
Program kompleks dapat menggunakan separate matrices/workstreams pada fase berikutnya.

### Alternative D — Sequence-based direct migration

Ditolak karena sequence tidak cukup menjadi semantic classifier.

### Alternative E — WBS Task as source for LFA Activity

Ditolak karena WBS Task adalah decomposition operasional, bukan canonical intervention logic.

## Migration Status

```text
NOT APPROVED
```

Migration baru dapat dipertimbangkan setelah:
- production-shape query;
- classifier;
- ambiguous-row report;
- parent validation;
- staging dry-run;
- rollback rehearsal;
- RLS review;
- explicit Product Owner approval.

## Implementation Status

```text
NOT STARTED
```

## Azure Status

```text
NOT APPROVED
```

## Related Files

```text
docs/product/Impactory_Canonical_LFA_Matrix_SOT_PRD_v1.md
```
