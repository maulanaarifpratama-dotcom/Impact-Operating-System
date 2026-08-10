# PRD: Budget Compliance Engine v1.0

## Status

Proposed — For Product Review

## Date

2026-08-10

## Problem Definition

### Current Situation

| Observation | Detail |
|-------------|--------|
| INKINDO provides direct guidance | Professional billing rates help users price consultant/engineer line items. Users actively apply INKINDO rates because they answer "how much should I budget for this role?" |
| SBM exists but does not influence decisions | SBM items (transport, accommodation, consumables) are displayed as reference lookups. Users see "Rp 150.000/Orang" for transport but rarely adjust their budget based on it. |
| Compliance is fragmented | SBM warnings appear as inline messages in BudgetCalculator ("Item ini melebihi standar SBM 2026"). INKINDO checks happen separately. Donor rules are not checked at all. Organizational policies are not checked at all. |
| Budget validation is passive | Users must manually check each item against references. No aggregated compliance score. No report on which items violate which standards. No guidance on how to resolve violations. |

### Pain Points

1. **Users don't know if their budget will pass donor review.** A budget with 40 items has no overall compliance signal.
2. **SBM warnings are ignored** because they're scattered across individual line items with no cumulative impact.
3. **Donor restrictions are invisible.** Overhead caps, ineligible categories, and co-funding requirements are not checked.
4. **Internal policies are manual.** "Maximum 30% overhead" or "No single vendor > 50M IDR" must be remembered by the budget preparer.
5. **Proposal rejection risk is unknown.** Users submit budgets without knowing whether they comply with donor standards.

### Proposal Preparation Risks

| Risk | Impact | Current Mitigation |
|------|--------|-------------------|
| Budget exceeds donor overhead cap | Proposal rejected | None — not checked |
| Line items violate SBM without justification | Audit finding | Manual review only |
| Professional rates misaligned with INKINDO | Budget credibility loss | INKINDO calculator (used) |
| Ineligible cost categories included | Donor rejection | None — not checked |
| Internal policy violations | Management override required | Manual |

---

## Compliance Source Inventory

### SBM (Standar Biaya Masukan)

| Property | Value |
|----------|-------|
| Source | PMK 32/2025 (TA 2026) |
| Publisher | Kementerian Keuangan RI |
| Scope | Honorarium, Transport, Accommodation, Consumables, ATK, Printing |
| Applicability | All government-funded programmes |
| Owner | PD Designer (reference) |
| Current Implementation | Hardcoded in `sbm2026.ts`; 33 items across 6 categories |
| Verification Status | ESTIMATE_UNVERIFIED (GW-B1) |

### INKINDO

| Property | Value |
|----------|-------|
| Source | INKINDO 2026 (Tabel 2-26, 3-26, 4-26, 5-26) + Perlem LKPP 12/2021 |
| Publisher | INKINDO |
| Scope | Professional services, Sub-professional, Supporting staff |
| Applicability | All programmes with consultant/engineer personnel |
| Owner | PD Designer (reference) |
| Current Implementation | Hardcoded in `inkindo2026.ts`; 22 roles + province multipliers |
| Verification Status | ESTIMATE_UNVERIFIED (GW-B1) |

### Donor Rules

| Rule Type | Example | Current Check |
|-----------|---------|---------------|
| Overhead Cap | Maximum 15% of total budget for indirect costs | Not checked |
| Ineligible Categories | No entertainment, no alcohol, no political activity | Not checked |
| Co-Funding Requirement | Minimum 20% counterpart contribution | Not checked |
| Procurement Threshold | Purchases > 50M IDR require 3 quotations | Not checked |
| Reporting Frequency | Quarterly financial reports required | Not checked |
| Currency Restrictions | Budget must be in donor's reporting currency | Not checked |

### Internal Organizational Policy

| Policy Type | Example | Current Check |
|-------------|---------|---------------|
| Spending Limit | No single line item > 100M IDR without director approval | Not checked |
| Procurement Threshold | Purchases > 10M IDR require purchase order | Not checked |
| Delegation Authority | Manager can approve up to 50M; Director above 50M | Not checked |
| Overhead Policy | Maximum 20% overhead on all programmes | Not checked |
| Partner Budget Cap | Maximum 30% of budget to implementing partners | Not checked |

---

## Product Vision

### Budget Compliance Engine

**Provide real-time compliance guidance during budget design.**

The engine:
- **Assists** — shows which rules apply to each line item
- **Explains** — provides plain-language explanations of violations
- **Scores** — computes an aggregate compliance score
- **Highlights** — flags violations, warnings, and missing justifications

The engine does NOT:
- Automatically block budget drafting
- Automatically overwrite budget line items
- Automatically edit line items to meet compliance
- Make approval/rejection decisions

### Value Proposition

| User | Value |
|------|-------|
| PD Designer | Real-time feedback during budget entry; confidence that budget will pass donor review |
| Programme Lead | Compliance dashboard before proposal submission; evidence for donor negotiations |
| Donor/Reviewer | Transparent compliance report with source references; faster review cycle |
| Auditor | Traceable compliance history with justification trail |

---

## Positioning in Architecture

### Recommended: Programme Design

The Budget Compliance Engine belongs in **Programme Design** — specifically in
the Budget Design phase.

**Rationale:**
1. Compliance is a **design-time concern**. It affects how the budget is structured, not how it is spent.
2. **Donor rules are design constraints.** They determine what CAN be included in the budget, not what WAS spent.
3. **SBM and INKINDO are reference standards** for budget formulation, not execution audit.
4. **PM Finance** tracks actuals against planned; compliance is a separate dimension.
5. **ADR 0008** establishes PD Budget as the design owner. Compliance is a design quality attribute.

### Interaction with PM

- PM sees **compliance history** — what was the original compliance score at design time?
- PM sees **original compliance score** — did the approved budget meet standards?
- PM does NOT perform compliance checks — execution compliance is a separate concern (financial audit, not budget design compliance).
- PM may see **justification trail** — why were certain line items approved despite compliance warnings?

---

## Compliance Workflow

```
Budget Draft (PD Designer)
    ↓ user triggers compliance check (or auto on save)
Compliance Analysis (Engine)
    ├── SBM check: is each line item within SBM reference?
    ├── INKINDO check: are professional rates aligned?
    ├── Donor check: does budget structure meet donor requirements?
    └── Policy check: does budget meet internal policies?
    ↓
Compliance Results (displayed inline)
    ├── Compliance Score: 92%
    ├── Issues: 34 compliant, 2 warnings, 1 violation
    └── Per-item findings with severity + explanation
    ↓
User Review (PD Designer)
    ├── Accept: acknowledge and justify (optional note)
    ├── Fix: adjust line item to meet compliance
    └── Override: mark as "justified" with mandatory reason
    ↓
Budget Revision (if needed)
    ↓
Approved Budget Design (with compliance score attached)
```

### Responsibilities

| Role | Responsibility |
|------|---------------|
| PD Designer | Designs budget; reviews compliance findings; decides to fix or justify |
| Budget Compliance Engine | Computes compliance score; generates findings; provides recommendations |
| Programme Lead | Reviews overall compliance before submission |
| System | Records compliance score at approval time; preserves compliance history |

---

## Compliance Model

### Line Item Compliance

| Status | Definition | Visual |
|--------|-----------|--------|
| `compliant` | Within all applicable reference ranges | Green |
| `warning` | Exceeds reference by < 20% OR within range but missing justification | Amber |
| `violation` | Exceeds reference by ≥ 20% OR violates donor/policy rule | Red |
| `not_applicable` | No applicable reference standard for this item | Grey |
| `justified` | Exceeds reference but has approved justification | Blue |

### Budget Compliance Score

**Recommended: 0–100 numeric score**

Score = weighted average of per-item compliance, where:
- Compliant items = 100
- Warning items = 50
- Violation items = 0
- Not applicable items = excluded from calculation

Weighted by item amount (larger items have more impact on score).

**Alternative considered:** GREEN/AMBER/RED — rejected because it loses granularity. A budget with 95% compliance is very different from one with 65%.

### Score Thresholds

| Score | Label | Action |
|-------|-------|--------|
| 90–100 | Strong Compliance | Ready for submission |
| 75–89 | Review Recommended | Review warnings before submission |
| 50–74 | Compliance Gap | Address violations before submission |
| < 50 | Significant Issues | Budget requires revision |

---

## Compliance Findings Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `finding_id` | UUID | Auto | Unique finding identifier |
| `budget_item_id` | UUID | Yes | Link to budget line item |
| `source` | Enum | Yes | `sbm`, `inkindo`, `donor_rule`, `org_policy` |
| `source_reference` | String | Yes | Specific rule reference (e.g., "SBM 2026, Tabel Honorarium") |
| `rule` | String | Yes | The rule that was checked |
| `expected_value` | Numeric | Optional | The reference value |
| `actual_value` | Numeric | Yes | The budgeted value |
| `deviation_pct` | Numeric | Optional | Percentage deviation |
| `severity` | Enum | Yes | `info`, `warning`, `violation` |
| `explanation` | String | Yes | Plain-language explanation in Bahasa Indonesia |
| `recommendation` | String | Yes | Suggested action to resolve |
| `justification_required` | Boolean | Yes | Whether justification is mandatory |
| `justification` | String | Optional | User-provided justification |
| `resolved` | Boolean | Default false | Whether finding has been addressed |

### Example Findings

```
Finding: SBM exceeded by 15%
Source: SBM 2026 PMK 32/2025
Rule: Transport Luar Kota — Reference: Rp 500.000/Orang
Expected: Rp 500.000
Actual: Rp 575.000
Deviation: +15%
Severity: WARNING
Explanation: Item "Transport ke lokasi" melebihi standar SBM untuk Transport Luar Kota sebesar 15%.
Recommendation: Sesuaikan nilai ke Rp 500.000/Orang atau berikan justifikasi mengapa diperlukan nilai lebih tinggi.
Justification Required: Yes
```

```
Finding: Overhead cap exceeded
Source: Donor Rule — USAID Standard Provisions
Rule: Maximum 15% indirect costs of total direct costs
Expected: ≤ 15%
Actual: 18.3%
Deviation: +3.3pp
Severity: VIOLATION
Explanation: Biaya tidak langsung melebihi batas maksimum 15% yang ditetapkan donor.
Recommendation: Kurangi biaya tidak langsung atau dapatkan persetujuan tertulis dari donor.
Justification Required: Yes
```

---

## User Experience

### Budget Compliance Panel

```
┌─────────────────────────────────────────────┐
│ Budget Compliance Score                     │
│                                             │
│   92%                                       │
│   ████████████████████░░                     │
│                                             │
│   ✅ 34 compliant items                     │
│   ⚠  2 warnings                             │
│   ❌ 1 violation                            │
│   ◌  5 not applicable                      │
│                                             │
│   [View All Findings]                       │
└─────────────────────────────────────────────┘
```

### Compliance Panel Placement

The compliance panel appears:
1. **Inline** — below each budget line item that has findings (expandable)
2. **Summary** — in a collapsible panel above the budget table
3. **Report** — included in budget export/PDF

### User Actions

| Action | Where | Effect |
|--------|-------|--------|
| View finding | Inline or panel | Expand finding details |
| Fix item | Inline | Adjust budget value to meet compliance |
| Justify | Inline | Provide mandatory reason; marks finding as "justified" |
| Accept all warnings | Summary panel | Marks all warnings as "acknowledged" |
| Export compliance report | Summary panel | Generates compliance PDF for proposal package |

---

## PM Interaction Model

### Recommended: Read-Only Historical View

PM should see compliance as historical context, not as an active check:

| What PM Sees | Source | Purpose |
|-------------|--------|---------|
| Original compliance score | PD Budget Design snapshot | Context for financial execution |
| Justified violations | PD Budget justification trail | Understanding design decisions |
| Compliance history | Immutable at approval time | Audit trail |

PM should NOT:
- Perform new compliance checks on execution data
- Re-score compliance during execution
- Modify compliance findings
- Add execution-time justifications (that's PD domain)

---

## AI Enhancement Opportunities

### Allowed AI Roles

| Role | Input | Output | Guardrail |
|------|-------|--------|-----------|
| Explain violation | Finding data, source reference | Plain-language explanation in Bahasa Indonesia | Never fabricate source references |
| Suggest alternatives | Violated item, reference standard | List of compliant item alternatives from catalog | Only suggest items from verified catalog; never fabricate prices |
| Summarize donor restrictions | Donor rule set | Plain-language summary for budget preparer | Never modify rule text; cite source |
| Generate justification draft | Violated item, justification note | Draft justification paragraph | User must review and edit before saving |

### Forbidden AI Roles

- AI must never bypass compliance rules
- AI must never override compliance sources
- AI must never invent compliance references or standards
- AI must never auto-approve violations
- AI must never fabricate source URLs, page numbers, or document references

---

## MVP Definition

### In Scope (MVP v1.0)

| Feature | Detail |
|---------|--------|
| SBM compliance check | Compare each budget line item against SBM reference table |
| INKINDO compliance check | Compare personnel items against INKINDO rates |
| Per-item compliance status | `compliant` / `warning` / `violation` / `not_applicable` / `justified` |
| Budget Compliance Score | 0–100 weighted score |
| Inline findings display | Per-item expandable findings in BudgetCalculator |
| Justification workflow | User can provide justification for violations |
| Compliance export | Include compliance score in budget PDF export |

### Out of Scope (MVP)

| Feature | Rationale |
|---------|-----------|
| Donor rule engine | Requires donor rule data model and management UI |
| Internal policy engine | Requires policy management module |
| Historical compliance tracking | Requires compliance snapshot persistence |
| AI-powered explanations | AI governance for financial data not yet established |
| PM compliance dashboard | Requires compliance snapshot in PM context |

### Future Scope

| Phase | Feature |
|-------|---------|
| v1.1 | Donor rule engine (USAID, EU, World Bank templates) |
| v1.2 | Internal policy engine (per-org configurable rules) |
| v1.3 | AI-powered violation explanations |
| v2.0 | Compliance history and trend analysis across programmes |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Compliance score visibility | 100% of budgets show a compliance score | Product analytics |
| Violation resolution rate | > 80% of violations addressed before submission | Finding status tracking |
| Budget revision cycles | 50% reduction in revision cycles | Before/after comparison |
| User adoption | > 60% of PD Designers use compliance panel | Feature usage analytics |
| Proposal acceptance | 20% improvement in first-pass acceptance | Donor feedback tracking |

---

## Risks and Open Questions

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SBM coverage gaps — not all budget categories have SBM references | MEDIUM | Mark uncovered items as `not_applicable`; don't penalize |
| SBM/INKINDO data is ESTIMATE_UNVERIFIED per GW-B1 | MEDIUM | Display provenance status prominently; don't claim verification |
| Donor rules vary significantly across donors | HIGH | Defer donor rules to v1.1; focus MVP on SBM + INKINDO |
| Compliance score may be gamed (users optimize for score, not for real compliance) | LOW | Score is guidance, not enforcement; justification workflow exists |
| Policy updates (SBM 2027, INKINDO 2027) require data refresh | MEDIUM | Source versioning via reference catalog (BUDGET-R1) |
| Internal policies differ per organization | MEDIUM | Defer to v1.2; MVP uses global rules only |
| Maintenance burden of compliance rule updates | LOW | Rules are declarative; update source data, not engine code |

### Open Questions

1. Should compliance scoring be real-time (on every edit) or on-demand (user triggers check)?
2. Should compliance findings be persisted or recomputed?
3. Should compliance score be visible to donors/reviewers by default?
4. Should "justified" violations require approver sign-off?

---

## Recommendation

### SBM Should Become One Compliance Source Within a Larger Budget Compliance Engine

**Rationale:**

1. **SBM alone does not provide decision-making value.** Users see SBM references but rarely act on them because there's no consequence for ignoring them. A compliance score creates accountability.

2. **INKINDO is already used actively** because it provides actionable guidance ("how much should I budget?"). SBM can provide equal value when integrated into a compliance workflow.

3. **Donor rules are the hidden risk.** Budgets that violate donor restrictions (overhead caps, ineligible categories) are rejected outright. This is higher-impact than SBM compliance but currently has zero tooling support.

4. **The engine pattern scales.** Adding a new compliance source (new donor, new regulation) should add data, not change engine logic. The engine is a framework; compliance sources are data.

5. **Compliance is a PD design concern.** It affects budget structure, not execution tracking. The engine belongs in PD Budget Design, aligned with ADR 0008.

### Recommended Roadmap

```
MVP v1.0: SBM + INKINDO compliance scoring and inline findings
    ↓
v1.1: Donor rule engine (USAID, EU, World Bank templates)
    ↓
v1.2: Internal policy engine (per-org configurable)
    ↓
v1.3: AI-powered violation explanations
    ↓
v2.0: Compliance history and cross-programme trend analysis
```

### Final Verdict on SBM Positioning

**SBM is NOT deprecated.** It is repositioned from a standalone reference lookup to one compliance source within the Budget Compliance Engine. Its value increases when it contributes to an aggregate score that has consequences for budget approval readiness.
