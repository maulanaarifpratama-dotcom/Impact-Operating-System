# PD MEAL UX, Information Architecture, and Workflow Audit

## Status

Proposed — For Design Review

## Date

2026-08-10

## Executive Summary

The Programme Design MEAL module (`MEALPlanner.tsx`, ~3005 lines) is a
functional but table-heavy experience. It presents indicators, targets,
methods, MoV, frequency, PIC, and status in a spreadsheet-like grid. While
comprehensive, it lacks clear user guidance, indicator ownership visibility,
and a structured measurement readiness signal.

This audit identifies 10 UX problems, 10 quick wins, and proposes a
MEAL v2 direction focused on indicator-centric workflows and a MEAL
Readiness Score.

---

## 1. Current MEAL Experience Audit

### What MEALPlanner Does Well

| Strength | Detail |
|----------|--------|
| Comprehensive data model | Covers indicators, targets, methods, MoV, frequency, PIC, status, baseline/midline/endline, disaggregation, assumptions |
| Simple and Professional modes | Two-tier complexity for different user needs |
| WBS progress rollup | Shows execution progress per Output in MEAL context |
| SROI integration | Indicator data flows into SROI calculator |
| Print/Export | PDF export for MEAL framework |
| Autosave | Debounced save on field changes |
| Compliance scanner | SBM/INKINDO warnings in budget context |

### What MEALPlanner Does Poorly

| Weakness | Detail |
|----------|--------|
| Table-heavy | Everything is a spreadsheet row. No visual hierarchy. |
| Field-centric, not indicator-centric | Users manage columns, not indicators as a unit |
| No MEAL readiness signal | No way to know if measurement framework is complete |
| PIC assignment is invisible | PIC column is there but no discoverable assignment workflow |
| Sederhana vs Profesional feel identical | Both show table; professional just has more columns |
| Monitoring disconnect | "Kerangka MEAL" and "Pelacakan Capaian" feel like separate apps |
| Evidence linkage unclear | MoV column is just text; no visual link to evidence |
| No indicator health | Can't tell at a glance which indicators are on track |
| Overwhelming first impression | New users see a 15-column table with no onboarding |
| No guided workflow | User must know to fill every column; no step-by-step |

### Confusing Interactions

1. **Target Kuantitatif layout** was broken (fixed in PD-MEAL-U1) — unit input was too narrow
2. **Frequency chips** are hard to parse — month numbers without context
3. **WBS progress rollup badge** is present but disconnected from indicator context
4. **Baseline/Midline/Endline** in professional mode adds 3 more columns without obvious purpose for first-time users
5. **Disagregasi** column appears in professional mode with no guidance on what to enter

---

## 2. User Mental Model Analysis

### How Users Think (Natural Mental Model)

```
"What do I want to measure?"
    ↓ Indicator text
"How much change do I expect?"
    ↓ Target value + unit
"How will I measure it?"
    ↓ Method + Data collection tool
"Where will the proof come from?"
    ↓ Means of Verification (MoV) + Source
"How often should I check?"
    ↓ Frequency + Timeline
"Who is responsible?"
    ↓ PIC assignment
```

### How Current UI Presents It (Mismatch)

```
[LFA Level] [Indicator Text] [Baseline] [Target] [Target Unit]
[Method] [MoV] [Frequency] [PIC] [Status] [Disaggregation] [Assumptions]
```

The current UI presents all fields equally in a horizontal table. The user must
navigate 10-15 columns left-to-right to complete one indicator. The natural
workflow (top-to-bottom per indicator) is not supported.

---

## 3. Information Architecture Review

### Current Structure (Table Columns)

```
LFA Level | Indicator | Baseline | Target | Target Unit |
Method | Collection Tool | MoV | Frequency | PIC | Status |
Disaggregation | Assumptions | Context
```

### Proposed Structure (Indicator-Centric Card)

```
┌─────────────────────────────────────────────────────────┐
│ Indicator: [text]                           [LFA Level] │
│ Target: [value] [unit]     Baseline: [value]           │
│                                                         │
│ 📏 Measurement Method                                   │
│ Method: [text]    Data Source: [text]                   │
│                                                         │
│ 📋 Evidence (MoV)                                       │
│ Primary Source: [text]    Secondary: [text]             │
│                                                         │
│ 📅 Schedule                                             │
│ Frequency: [monthly]    Timeline: [chip visualization]  │
│                                                         │
│ 👤 Responsibility                                       │
│ PIC: [name]    Reviewer: [name]                         │
│                                                         │
│ [📝 Edit] [📊 Track] [✓ Complete]                       │
└─────────────────────────────────────────────────────────┘
```

### Rationale

- **Indicator-centric**: Each indicator is a card, not a row. Natural grouping.
- **Visual hierarchy**: Sections (Measurement, Evidence, Schedule, Responsibility) provide scannability.
- **Actionable**: Each card has context-appropriate actions.
- **Adaptive**: Simple mode shows 3 sections; Professional mode shows all 6.

---

## 4. Assignment / PIC Audit

### Current State

- PIC is a text input in a table column
- No autocomplete from organization members
- No job_title integration
- No ownership visibility at a glance
- "Who owns this indicator?" requires scanning the PIC column

### Recommended Model

```
PIC Assignment
├── Autocomplete from organization_members
├── Display: Name + Job Title (if available)
├── Filter: "My Indicators" view
└── Ownership badge on indicator card
```

### Integration Opportunities

- `organization_members` table (user_id, role, job_title)
- Functional roles from LFA entries (`responsible_party`)
- Team assignment patterns from Work Plan (`owner_id`, `reviewer_id`)

---

## 5. Sederhana vs Profesional Audit

### Current State

| Aspect | Sederhana | Profesional |
|--------|-----------|-------------|
| Columns | ~8 | ~14 |
| Baseline | Hidden | Visible |
| Midline/Endline | Hidden | Visible |
| Disaggregation | Hidden | Visible |
| Assumptions | Hidden | Visible |
| Cost Category | Simple | Donor-aligned |
| Experience | Feels like "fewer columns" | Feels like "more columns" |

### Problem

Both modes present the same table UI. "Profesional" just adds more columns.
There is no workflow difference, no guidance difference, no UX difference
beyond column count.

### Recommended Redesign

| Aspect | Sederhana | Profesional |
|--------|-----------|-------------|
| Layout | Indicator cards (3 sections) | Indicator cards (6 sections) |
| Workflow | Guided: Indicator → Target → Method → Done | Full: All sections with donor alignment |
| Baseline | Auto: "Baseline = 0" for new indicators | Manual entry |
| Midline/Endline | Hidden | Visible with timeline visualization |
| Cost Category | Auto-mapped | Donor-aligned (Personnel, Travel, etc.) |
| Validation | Soft warnings | Hard compliance rules |
| User | First-time PD Designer | Experienced M&E Specialist |

---

## 6. Indicator Management Audit

### Current State: Field-Centric

- User manages columns (Indicator, Target, Method, MoV, etc.) independently
- Each field has its own input, autosave, and validation
- No concept of "this indicator is complete"

### Recommended: Indicator-Centric

- Each indicator is a self-contained management unit
- Indicator has status: `draft`, `ready`, `tracking`, `complete`
- "Add Indicator" creates a card, not a row
- Completing all required fields transitions indicator to `ready`

### Indicator States

| Status | Meaning | Visual |
|--------|---------|--------|
| `draft` | Indicator text entered; required fields incomplete | Grey |
| `ready` | All required fields complete; ready for tracking | Blue |
| `tracking` | Data collection has begun | Green |
| `complete` | Target achieved or period ended | Checkmark |

---

## 7. MEAL Readiness Concept

### MEAL Readiness Score

A single score showing how complete the measurement framework is.

```
MEAL Readiness: 84%

✅ Indicators Defined        12/12
✅ Targets Set               12/12
✅ Methods Defined           11/12
⚠  MoV Complete              9/12
⚠  PIC Assigned              8/12
✅ Schedule Complete         12/12

3 indicators need attention
```

### Calculation

```
Score = weighted average of:
- Indicators defined (all have text): 20%
- Targets set (all have target_value): 20%
- Methods defined: 20%
- MoV complete: 15%
- PIC assigned: 15%
- Schedule complete: 10%
```

### Value Proposition

- Immediate visibility into measurement framework completeness
- Guides user to incomplete areas
- Donor-ready signal: "Is our MEAL framework ready for proposal submission?"

---

## 8. Monitoring Flow Audit

### Current State

"Kerangka MEAL" (design) and "Pelacakan Capaian" (tracking) are separate tabs
in the same component. The relationship is implicit:
- Design tab sets up indicators
- Tracking tab records values

### Gap

- No visual connection between "this indicator was designed here" and "this indicator is being tracked here"
- WBS progress rollup exists but is disconnected from indicator progress
- No "go track this indicator" action from design view
- No "see design context" from tracking view

### Recommended

- Indicator cards in both views use the same visual language
- Design card has "Mulai Pelacakan" action that opens tracking for that indicator
- Tracking card shows "Lihat Kerangka" action for design context
- Progress visualization shows design target vs actual on the same card

---

## 9. Evidence Alignment Review

### Current State

```
Indicator → MoV (text field) → Evidence (separate entity, not linked)
```

The MoV field is free text. There is no structural link between an indicator's
MoV and actual evidence records that satisfy it.

### Gap

- Can't answer: "What evidence proves this indicator was achieved?"
- MoV text may reference sources that don't exist
- No evidence completeness signal per indicator

### Recommended

- MoV field links to evidence types (Completion Claim, Tracking Entry, Document)
- Indicator card shows evidence count: "2/3 evidence records collected"
- Evidence tab shows which indicators each evidence record supports

---

## 10. Quick Wins (< 1 day)

| # | Win | Impact |
|---|-----|--------|
| 1 | Add indicator count badge to tab ("Kerangka MEAL (12)") | LOW — immediate visibility |
| 2 | Add "Filter: My PIC" toggle | MEDIUM — ownership clarity |
| 3 | Add "Filter: Incomplete" toggle | HIGH — guides user to gaps |
| 4 | Show indicator status color on row | MEDIUM — scannability |
| 5 | Group indicators by LFA level with section headers | MEDIUM — hierarchy |
| 6 | Add tooltip to frequency chips showing month names | LOW — readability |
| 7 | Add "Complete Indicator" checklist inline | HIGH — guided workflow |
| 8 | Add MEAL Readiness Score card above table | HIGH — immediate signal |
| 9 | Add PIC autocomplete from org members | MEDIUM — assignment workflow |
| 10 | Add visual MoV → Evidence link indicator | MEDIUM — traceability |

### Medium Refactors (< 1 week)

1. Convert table to indicator cards for Simple mode
2. Add MEAL Readiness Score computation
3. Add PIC assignment workflow with org member selector
4. Add indicator status lifecycle (draft → ready → tracking → complete)

### Major Improvements (> 1 sprint)

1. Full MEAL v2 with indicator-centric card UI for both modes
2. Evidence linkage per indicator
3. Monitoring ↔ Design bidirectional navigation
4. Sederhana vs Profesional mode differentiation (not just more columns)
5. Guided MEAL creation wizard for first-time users

---

## 11. Priority Roadmap

### P0 — Immediate Impact
1. MEAL Readiness Score (indicator completeness signal)
2. Indicator status badges (draft/ready/tracking/complete)
3. "Filter: Incomplete" toggle

### P1 — Next Sprint
1. Indicator-centric card layout for Simple mode
2. PIC assignment autocomplete from org members
3. Sederhana vs Profesional UX differentiation

### P2 — Medium-term
1. Professional mode full card layout
2. Evidence linkage per indicator
3. Design ↔ Tracking bidirectional navigation

### P3 — Future
1. Guided MEAL creation wizard
2. AI-assisted indicator suggestion
3. Cross-project MEAL comparison

---

## 12. Redesign Proposal: MEAL v2

### Vision

**MEAL v2 is indicator-centric, not field-centric.** Each indicator is a
self-contained management unit with clear status, ownership, and evidence
linkage. The MEAL Readiness Score provides immediate feedback on framework
completeness.

### Navigation

```
┌──────────────────────────────────────────┐
│ MEAL Framework    Tracking              │
│                                            │
│ ┌─ MEAL Readiness: 84% ────────────────┐ │
│ │ ✅ 12/12 Indicators    ⚠ 9/12 MoV     │ │
│ │ ✅ 12/12 Targets       ⚠ 8/12 PIC     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [Filter: All ▼] [Only Mine] [Incomplete]  │
│                                            │
│ ┌─ Output: Pelatihan UMKM ───────────────┐ │
│ │ ┌ Indicator Card ────────────────────┐ │ │
│ │ │ 📊 % UMKM terlatih    ✅ Ready     │ │ │
│ │ │ Target: 80% | Method: Survey       │ │ │
│ │ │ MoV: Laporan Survey | PIC: Budi     │ │ │
│ │ │ [Edit] [Track]                     │ │ │
│ │ └────────────────────────────────────┘ │ │
│ │ ┌ Indicator Card ────────────────────┐ │ │
│ │ │ 📊 Jumlah peserta       ⚠ Draft    │ │ │
│ │ │ Target: 200 orang                  │ │ │
│ │ │ ❌ Method belum diisi              │ │ │
│ │ │ ❌ PIC belum ditentukan            │ │ │
│ │ │ [Lengkapi]                         │ │ │
│ │ └────────────────────────────────────┘ │ │
│ └────────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Recommended Next Sprint

Implement P0 items: MEAL Readiness Score + indicator status badges + incomplete filter. These deliver immediate user value with minimal code changes to the existing `MEALPlanner.tsx`.
