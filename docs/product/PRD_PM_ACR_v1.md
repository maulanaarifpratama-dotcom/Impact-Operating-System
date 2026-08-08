# PM ACR PRD v1
## Activity Completion Record for Project Management + MEAL Execution

**Status:** FINAL — Product Specification
**Scope:** Project Management (Project → Stage → Activity) + MEAL Execution layer
**Explicitly out of scope:** LFA, Goal/Outcome/Output, Indicator Framework, GrantWriter, Programme Design, Evaluation Framework, Advanced Reporting Engine, National MEAL Standards. These are noted as future integration points only — not designed or scoped here.

---

## 1. Product Vision

**Current problem:** A single real-world event — an Activity happening — currently requires the user to think in six disconnected domains: Status Verifikasi & Bukti, Deliverables, Status Siklus Keuangan, Bottleneck Intelligence, Progress, and Completion Claim. One event, six mental contexts, six places to update. This fragmentation makes Project Management feel heavier than the spreadsheet habits it's meant to replace.

**Why ACR is needed:** to give every Activity exactly one artifact that answers "did it happen, what proof exists, what came out of it, what did we learn, and can we trust it" — authored once, in one place, incrementally as the work happens rather than reconstructed afterward.

**What gets simplified:** Evidence, Facts, and Reflection collapse into one authoring surface (the ACR) instead of three-plus separate screens. Verification becomes one lightweight, self-contained check instead of an ambiguous "Completion Claim" step.

**What gets removed from the old workflow:** the standalone "Status Verifikasi & Bukti" screen and the standalone "Completion Claim" step disappear entirely — they're absorbed into ACR. "Bottleneck Intelligence" and Deliverables remain, but as clearly independent, linked entities rather than yet another tab competing for the same attention as evidence upload.

**What ACR deliberately does not become:** an Indicator engine, an Evaluation Framework, or a Reporting engine. Project Management stays as simple as a well-structured spreadsheet — ACR adds structure to that spreadsheet, it does not turn Project Management into a program-design tool.

---

## 2. Canonical Domain Model

```
Project
└─ Stage
    └─ Activity
         └─ Activity Completion Record (ACR)     [1:1 with Activity]
              ├─ Evidence
              ├─ Facts
              ├─ Reflection
              └─ Verification (Evidence Verification only, v1)
```

**Final ownership boundaries:**

| Entity | Owned by | Relationship to Activity/ACR |
|---|---|---|
| Project, Stage, Activity | Existing PM domain (unchanged core fields: title, owner, dates, planned scope) | — |
| ACR (Evidence, Facts, Reflection, Verification, Lifecycle, Next Action pointer) | ACR itself | 1:1 with Activity |
| Deliverable | Independent registry | Linked (many-to-many) to ACR/Activity — never embedded |
| Bottleneck | Independent registry | Linked to Activity — never embedded, lifecycle independent of ACR |

**Explicitly excluded from this domain model (future integration, not built in v1):** Goal, Outcome, Output, Indicator Registry, Evaluation Framework artifacts, GrantWriter objects, Advanced Reporting Engine constructs. If ACR data proves useful to those systems later, it will be *referenced* by them the same way Deliverables and Bottlenecks are referenced by ACR — never absorbed into this v1 model.

---

## 3. User Personas (PM daily use only)

### Project Manager
Plans and coordinates Activities across Stages. Daily use of ACR: scanning Closure Status across the Project/Stage board to see what's genuinely done vs. still pending documentation; following up on linked Deliverables and open Bottlenecks. Rarely authors ACR content directly unless personally executing an Activity.

### Field Officer
Executes the Activity. Daily use of ACR: the primary author — adds Evidence, fills Facts, writes Reflection, submits. Wants this to take minutes, not a form-filling ordeal, and wants to be able to add pieces of it *during* execution, not all at once at the end.

### MEAL Officer
In v1 (no Indicator Framework yet), the MEAL Officer's role is lighter than in the full vision: performing Evidence Verification (or delegating it — see §8) and browsing Facts/Reflection across Activities for lightweight, ad-hoc monitoring and learning extraction. No formal indicator sign-off exists yet — that's future integration.

---

## 4. Activity Lifecycle

**Execution Status** (field/PM-owned, never gated by ACR):
```
Not Started → In Progress → Execution Complete
```

**Closure Status** (derived from ACR, computed — not manually set):
```
Open → Documented (ACR Submitted) → Closed (ACR Submitted + Evidence Verification = Sufficient)
```

**Relationship rules:**
- Execution Complete never requires an ACR to exist — the field team can mark work done immediately, ACR-independent.
- Progress (%) is independent of ACR/Closure status and can move freely during In Progress.
- Reaching Progress = 100% triggers a reminder ("this activity looks done — complete its ACR"), not a block.
- Closed is always computed, never a button a user clicks directly — it becomes true automatically once ACR is Submitted and Evidence Verification resolves Sufficient.
- If Evidence Verification returns "insufficient," the ACR goes back to Draft with a reason; Closure Status reverts to Open until resubmitted and re-checked.

This keeps operational speed (Execution Status) and documentation rigor (Closure Status) on separate tracks, so a PM's timeline never looks "stuck" while a verification queue works in the background.

---

## 5. ACR Structure

| Section | Purpose |
|---|---|
| **Evidence** | Proof the Activity happened — photos, documents, links, videos. Exists for accountability and audit-readiness. |
| **Facts** | Simple structured numbers describing what this Activity produced (participants, women, men, etc.) — a quick, queryable recap, not an indicator engine. |
| **Reflection** | Narrative learning — Lessons Learned, Observations, Recommendations — captured while memory is fresh, plus a lightweight Next Action pointer. |
| **Verification** | A single, self-contained sufficiency check (Evidence Verification) confirming the proof submitted is present and adequate. |

Each section can be filled incrementally during In Progress, not only at the end — this is the primary defense against end-of-activity recall loss.

---

## 6. Facts Design (PM field-level, not an indicator engine)

A simple, fixed starter set of counter fields, matching how NGO field teams already think in spreadsheets:

```
Participants
Women
Men
Organizations
Villages
Households
Beneficiaries
```

Each is a plain `{label, value, unit}` row — no indicator mapping, no target comparison, no framework logic in v1. A "custom fact" option remains available for anything outside the standard list, entered the same simple way. This deliberately stops short of the Indicator Registry/mapping design explored in earlier reviews — that becomes a *future integration* once an Indicator Framework exists; v1 Facts exist to give PM and MEAL a fast, structured recap, not to feed a formal M&E system yet.

---

## 7. Reflection Design

```
Lessons Learned     — "What would you want the next person running a similar activity to know?"
Observations         — "What did you notice that wasn't part of the plan?"
Recommendations      — "What would you change next time?"
Next Action Pointer  — one-line optional note on a needed follow-up (not a tracked task workflow in v1)
```

Kept exactly as validated in the domain review: authored once, at the moment of completion, by the person closest to the work. Next Action stays a pointer only — no task-assignment workflow is built in v1; that stays a manual follow-up for the PM.

---

## 8. Verification — v1 Decision: Evidence Verification Only

**Decision: v1 ships Evidence Verification only. Outcome Verification is deferred to a future release**, once an Indicator Framework exists to verify outcomes against.

**Why:** Outcome Verification's entire value proposition in earlier reviews was checking whether a claimed Fact/outcome matches an Indicator target — that check has no meaningful target to compare against while the Indicator Registry is explicitly out of scope. Building an Outcome Verification step now, with nothing structured to verify outcomes *against*, would be verification theater — exactly the overengineering this PRD is instructed to avoid.

**Evidence Verification alone is self-contained and immediately useful:** it answers "is there sufficient proof this happened," which requires no other subsystem and directly serves the PM's daily need to trust that Closure Status means something. Whoever is assigned as the Activity's verifier (a Stage owner, PM, or MEAL Officer, depending on team size — v1 keeps this role assignable rather than hard-coded to a title) reviews and marks Sufficient / Returned-for-more-evidence.

---

## 9. Deliverable Relationship

Deliverables remain an **independent registry**, unchanged in ownership. From Activity Detail:
- A compact "Related Deliverables" list shows anything already linked.
- A simple **link/search action** attaches this Activity/ACR to an existing Deliverable (many-to-many — one Deliverable can be linked from several Activities).
- Creating a brand-new Deliverable hands off to the Deliverable registry itself, not an inline field on ACR.

No embedding, no duplicate Deliverable data inside ACR — just a link, kept as low-friction as possible for daily PM use.

---

## 10. Bottleneck Relationship

Bottlenecks stay **independent and can be flagged at any point** in the Activity's life — not gated on ACR or Execution Status, since a bottleneck often needs flagging *before* an Activity can even finish. From Activity Detail:
- A "Flag Bottleneck" action creates or links an existing Bottleneck record.
- Resolution happens on the Bottleneck's own record; Activity Detail just reflects a live status badge (open/resolved).

This matches how bottlenecks actually surface day-to-day: noticed mid-execution, not discovered during paperwork.

---

## 11. UX Architecture

**Activity Detail is the single hub** where a user does essentially all their work for a given Activity:

```
Activity Detail
├─ Activity Overview            (existing core fields, unchanged)
├─ Activity Completion Record   (dominant panel: Evidence / Facts / Reflection / Verification badge / Closure status)
├─ Related Deliverables         (compact, link-only)
└─ Related Bottleneck           (compact, flag/status-only)
```

**Design priorities, in order:** simple, fast, minimal clicks, minimal re-entry. Concretely:
- Evidence/Facts/Reflection can be entered in any order, interleaved with actual execution — no forced linear wizard.
- Autosave on every field — no separate "save draft" step.
- Mobile-friendly entry for field conditions (photo upload, quick number entry).
- No screen requires re-typing something already entered elsewhere (Deliverable/Bottleneck data always linked, never retyped).

---

## 12. Success Metrics

| Metric | What it tells us |
|---|---|
| **Duplicate data entry reduction** | % of Activities where Evidence/Facts/Reflection are entered once and never re-typed elsewhere |
| **Evidence attachment rate** | Increase in Activities with at least one Evidence item, before vs. after ACR adoption |
| **Reflection completion rate** | % of Closed Activities with a non-empty Lessons Learned entry |
| **Documentation lag** | Average time between Execution Complete and Closed — shorter means ACR isn't creating a paperwork backlog |
| **Adoption rate** | % of completed Activities with a Submitted ACR, out of all completed Activities |
| **Qualitative PM feedback** | Fewer support questions/complaints about "where do I update X for this activity" — a proxy for reduced fragmentation |

---

## Future Integration Notes (not designed in this PRD)

The following are acknowledged as valuable future directions, referenced here only so they aren't lost, and are explicitly **not** part of v1 scope, design, or build:

- LFA hierarchy (Goal/Outcome/Output) integration with ACR Facts
- Indicator Registry and Fact→Indicator mapping
- Outcome Verification (once an Indicator Framework exists to verify against)
- Evaluation Framework / Evaluation Reports synthesizing multiple ACRs
- GrantWriter integration
- Advanced/automated Reporting Engine built on ACR + Verification + Indicators
- National MEAL Standards compliance mapping

---

**Final Status: PM ACR PRD v1 — READY TO BE SAVED AS OFFICIAL PRODUCT DOCUMENT**
