# PM ACR v1 — Phase 1 Implementation Blueprint

**Status:** Approved for execution
**Scope:** Evidence (reuse existing), Reflection, Simple Facts, Evidence Verification, Closure Status
**Constraints:** Extend existing WBSBuilder experience only. No new Activity Detail page, no PM navigation changes, no Beneficiary Registry / ESG / Monthly Impact Report / Monitoring / Reporting integration.

---

## 1. User-Visible Changes

Within the existing WBS leaf-item panel (where Completion Claim + Evidence already render today):

- Existing Evidence section stays functionally identical, relabeled **"ACR Evidence."**
- New **Facts** mini-form: optional numeric fields for Participants, Women, Men, Organizations, Villages, Households, Beneficiaries, plus an "Add custom fact" row.
- New **Reflection** block: three prompts (Lessons Learned, Observations, Recommendations) plus a one-line optional Next Action field.
- The submit action becomes **"Submit ACR"** (was "Submit Completion Claim") — bundling Evidence + Facts + Reflection in one action instead of Evidence alone.
- The existing review dialog is relabeled **"Evidence Verification"** with Sufficient / Return-for-more-evidence wording (was Approve/Reject).
- A new **Closure Status badge** (Open / Documented / Closed) appears next to the item's existing progress indicator — computed automatically, never user-set.
- Bottleneck Intelligence and Deliverable-link dropdowns remain exactly where and how they are today — untouched in Phase 1.

---

## 2. Screens Affected

Only **WBSBuilder.tsx** (`src/pages/dashboard/lfa-builder/WBSBuilder.tsx`) changes in Phase 1.

Unaffected: ProjectTimelineView, ProjectDeliverablesPage, ProjectMilestonesPage, ProjectMEALPage, ProjectActivityPage, the Budget screen — no navigation, routing, or layout changes anywhere else.

---

## 3. Components Affected

- The existing leaf-item Completion Claim/Evidence inline block in `WBSBuilder.tsx` — extended with Facts and Reflection sub-sections and updated copy.
- `CompletionClaimReviewDialog.tsx` (`src/components/verification/`) — copy/labels updated to Evidence Verification language; approve/reject mechanics unchanged structurally.
- A small new presentational sub-component for Facts entry and one for Reflection entry may be split out of the growing inline block to avoid further bloating `WBSBuilder.tsx` — still rendered inline, not a new route.

---

## 4. Data Reuse Opportunities

- `wbs_completion_claims` — reused as the underlying ACR submission/lifecycle record; no new top-level entity needed for Phase 1.
- `wbs_completion_evidence` — reused as-is for Evidence, no changes.
- The claim's existing status / reviewed_by / reviewed_at fields — reused directly as the Evidence Verification decision (Sufficient / Returned), avoiding a new verification record type in Phase 1.
- Closure Status is **derived** at display time from the existing claim + verification state (Submitted → Documented; Verification Sufficient → Closed) — not a new independently-set field.
- Facts and Reflection are the only genuinely new data captured in Phase 1; they attach to the same completion-claim record. Exact field-level modeling is an implementation detail, not decided in this blueprint.

---

## 5. Features Replaced

- **Completion Claim submission** → **ACR submission** (same action, richer content: Evidence + Facts + Reflection instead of Evidence alone).
- **Completion Claim review (approve/reject)** → **Evidence Verification review** (same mechanics, relabeled decision language).

---

## 6. Features Removed

None. Bottleneck Intelligence and Deliverable linking remain fully intact and untouched — nothing is deleted, hidden, or merged away in Phase 1.

---

## 7. MVP Acceptance Criteria

A user can, inside the existing WBS leaf-item panel, without navigating to any new page:
- Enter Facts (any subset of the seven counters, or a custom fact).
- Enter Reflection (Lessons Learned required non-empty before submit; Next Action optional).
- Submit Evidence + Facts + Reflection together via a single "Submit ACR" action.
- See a Closure Status badge that automatically reflects Open/Documented/Closed with no manual override control.

A reviewer can, from the existing review dialog:
- See Evidence, Facts, and Reflection together in one view before deciding.
- Mark Sufficient or Return-for-more-evidence.
- On Return, the item's Closure Status reverts to Open and the record becomes editable again.

Regression guarantees:
- WBS tree editing, drag-drop, Bottleneck Intelligence, Deliverable linking, and Progress % behave identically before and after Phase 1.
- No new page or route is created; no navigation structure changes.
- No new imports or dependencies are introduced from Phase 1 code into Beneficiary Registry, ESG, Monthly Impact Reports, Monitoring, or Reporting modules.

---

## 8. Recommended Implementation Order

1. Add the Facts sub-section (UI + state) to the existing completion-claim panel — additive only, no relabeling yet, so the newest and least-integrated piece ships and is verified in isolation first.
2. Add the Reflection sub-section (UI + state) alongside Facts, same panel.
3. Wire Facts + Reflection into the existing submit handler so they're captured by the same action as Evidence — this is the point the "claim" behaviorally becomes an "ACR."
4. Relabel Evidence/Completion Claim copy across `WBSBuilder.tsx` and `CompletionClaimReviewDialog.tsx` to ACR/Evidence Verification language — pure copy change, done only after the data flow is proven.
5. Add the computed Closure Status badge, derived from existing claim + verification state — additive, read-only, no new interaction surface.
6. Run a regression pass on WBS tree editing, drag-drop, Bottleneck Intelligence, and Deliverable linking to confirm zero behavior change in untouched code paths.
7. Ship Phase 1.

This order front-loads the riskiest new logic (Facts/Reflection capture) before touching any existing labels or behavior, leaving the purely cosmetic relabeling and regression pass last — the point at which earlier additive changes would most likely reveal any destabilization of the surrounding monolith.
