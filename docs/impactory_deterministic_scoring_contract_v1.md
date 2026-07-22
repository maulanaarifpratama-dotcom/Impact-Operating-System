# Impactory Deterministic Scoring Contract Addendum v1

**Title:** Impactory P0-C Deterministic Scoring Contract Addendum  
**Status:** Proposed for Mechanical Acceptance  
**Contract Version:** `SCORING-CONTRACT-V1`  
**Parent Specification:** Deterministic Mapping v1.2 (`impactory_deterministic_program_context_sdg_mapping_v1_2.md`)  
**Guardrail Dependency:** Bilingual LFA Linguistic Guardrail v1 (`impactory_bilingual_lfa_linguistic_guardrail_v1.md`)  
**Date:** July 22, 2026  
**Implementation Gate:** `P0-C implementation is prohibited until this addendum passes mechanical acceptance.`

---

## 1. Executive Summary & Rationale

This document serves as the single, authoritative, and normative contract for the implementation of the Impactory Deterministic Scoring and Mapping Engine (`P0-C`). It is designed to resolve critical ambiguities, structural bottlenecks, and logical paradoxes identified in the initial execution attempts. 

To ensure complete architectural decoupling and release safety, this contract enforces a strict, mathematical separation between raw scoring, confidence calculations, conflict resolution, and recommendation assignments. It prohibits any form of run-time expected-value injection or fixture-based branching, mandating that the engine operates purely as a deterministic function of its inputs.

---

## 2. Resolving the 14 Rejected P0-C Failure Modes

This section outlines the exact normative policies designed to permanently eliminate the 14 systemic failure modes observed in the rejected implementation:

### 1. Fixture Reconciliation Override / Vacuous Pass
*   **Failure Mode:** Hardcoding checks or faking passes in the test runner to satisfy regression fixtures.
*   **Normative Policy:** Production scoring code is strictly prohibited from importing, referencing, or knowing about fixture files or test expectations. No conditional branches based on fixture IDs (e.g., `if (programId === 'FIX-GOLD-01')`) are allowed in the runtime engine.

### 2. Lock Recommendation Thresholds
*   **Failure Mode:** Fluid or un-anchored thresholds that change arbitrarily to make tests pass.
*   **Normative Policy:** All classification thresholds for Sectors, Archetypes, and SDGs are frozen under `INITIAL-HEURISTIC-CONFIG-V1` (see Section 4). Any change to these thresholds requires a versioned heuristic configuration upgrade.

### 3. Morphology-Only Confidence Cap vs. Eligibility Threshold Paradox
*   **Failure Mode:** Morphology-only matches have their confidence capped at `0.40`. However, the candidate eligibility threshold is `0.50`, meaning morphology-only matches are discarded before they can contribute as supporting evidence.
*   **Normative Policy (Co-Contribution Rule):** A candidate is eligible for initial scoring if and only if it has at least one **non-morphology** evidence match (lexical, object, actor, or explicit-user) with confidence $\ge 0.50$. Once initial eligibility is established, any morphology-only matches (with confidence capped at `0.40`) for that same Canonical ID may contribute to the saturation numerator. If a candidate has ONLY morphology-only matches, its confidence is capped at `0.40` and it is discarded.

### 4. Rounding Mode Ambiguity
*   **Failure Mode:** Campur-aduk between "round half up" and "round half to even" leading to floating-point differences.
*   **Normative Policy:** The engine must use the exact mathematical algorithm **`ROUND_HALF_UP`** to precisely 4 decimal places for all final scoring outputs (see Section 5).

### 5. Processing Types for CONF-001..CONF-013
*   **Failure Mode:** Ambiguity in whether a conflict is a numeric deduction, a hard gate, or a user review action.
*   **Normative Policy:** Every conflict ID is mapped to a strict processing category: `NUMERIC_PENALTY`, `HARD_GATE`, `RECLASSIFICATION`, `USER_REVIEW_ONLY`, or `INFORMATIONAL` (see Section 6).

### 6. Executable Conditions for MISS-001..MISS-024
*   **Failure Mode:** Missing-information rules written in prose without executable boolean logic.
*   **Normative Policy:** Every missing-information rule is defined as an executable logical expression over Page 1 fields or matched candidate outputs (see Section 7).

### 7. Confidence Formula
*   **Failure Mode:** Mixing up confidence (the strength of evidence for a concept) with the weighted recommendation score (how well a sector/SDG aligns).
*   **Normative Policy:** Confidence ($C_c$) is computed per-candidate on a `[0.00, 1.00]` scale based on match provenance and field diversity. It is a read-only input to the weighted scoring layer and cannot be altered by recommendation scores.

### 8. Recommendation Score vs. Confidence Distinction
*   **Failure Mode:** Displaying confidence as the recommendation score on Page 2 or vice-versa.
*   **Normative Policy:** Recommendation Score is a weighted summation of aligned components (Problem, Outcome, Actor, Archetype, Indicator) after applying anti-signals and conflicts. Confidence measures extraction certainty, whereas Recommendation Score measures structural alignment.

### 9. Ambiguity Margin & Exact Tie Behavior
*   **Failure Mode:** Undefined behavior when multiple sectors or SDGs have identical or extremely close scores.
*   **Normative Policy:** If the margin between the top 1 and top 2 sectors is $< 0.10$ (`margin = 0.10`), the primary sector is set to `null` and both are flagged as ambiguous, forcing a `USER_REVIEW_ONLY` trigger (`CONF-001`). If there is an exact score tie, tie-breaker rules (outcome specificity, planned indicators, then canonical ID alphabetical sort) are executed.

### 10. SDG Primary Coverage Gate and Input Prerequisites
*   **Failure Mode:** Forcing SDGs into "Primary" status when the necessary supporting outcome or indicator evidence is missing or unresolved.
*   **Normative Policy:** An SDG is gated from being "Primary" unless it is supported by at least 1 outcome family and (1 indicator family OR 1 official target alignment) with confidence $\ge 0.60$. If these inputs are unresolved or unavailable in the active input, it is capped at `secondary` with `coverage_status: UNRESOLVED`.

### 11. Candidate Eligibility and Evidence Requirements
*   **Failure Mode:** Fabricating candidates or evidence spans from weak morphological variants to satisfy fixtures.
*   **Normative Policy:** Candidates must be derived strictly from the text via P0-B token matches, or explicitly implied by an eligible active candidate (e.g. expected outcomes implied by an active archetype). Every implied candidate must accumulate the evidence span of its parent.

### 12. Duplicate Evidence / Conflict / Penalty Suppression
*   **Failure Mode:** Double-penalizing or applying multiple overlapping conflicts to the same candidate.
*   **Normative Policy:** Each conflict rule or anti-signal can apply at most once per target candidate by utilizing an `apply_once_key` derived from the Canonical ID. Duplicate evidence is merged using the `max` confidence before scoring.

### 13. Missing P0-B Inputs
*   **Failure Mode:** Manufacturing missing fields (e.g., inventing a location or beneficiary count) within the P0-C layer to make tests pass.
*   **Normative Policy:** P0-C must accept P0-B inputs as read-only and immutable. If a required field is missing, P0-C must trigger the corresponding `MISS-*` rule and use the defined slot fallback behavior.

### 14. Fixture Assertion Policy
*   **Failure Mode:** Altering production code or registry values to satisfy a single fixture without canonical rationale.
*   **Normative Policy:** The regression suite is read-only. Adjusting the registry to satisfy one test must not break other tests. The assertion layer must support range-checks, exact matches, and order-only validation as specified in Section 8.

---

## 3. P0-C Input Contract

The input to the P0-C engine is an immutable, read-only data structure produced by the P0-B extraction layer. The P0-C engine **MUST NOT** mutate this structure.

```typescript
interface EvidenceSpan {
  field: 'program_title' | 'program_story' | 'beneficiary_description' | 'duration' | 'funding_amount' | 'location';
  startChar: number;
  endChar: number;
  matchedText: string;
  normalizedMatch: string;
  signalType: 'lexical' | 'object' | 'actor' | 'explicit_user' | 'morphology' | 'implied_outcome' | 'anti_signal';
  signalId: string;
}

interface InputCandidate {
  canonicalId: string; // CNC-*, SECTOR-*, ARCH-*, PF-*, OF-*, OPF-*, ACT-*, SDG-*
  candidateType: 'sector' | 'archetype' | 'problem' | 'outcome' | 'output' | 'actor' | 'indicator' | 'sdg';
  matchedSignals: string[];
  negativeSignals: string[];
  antiSignals: string[];
  confusableCandidateIds: string[];
  rawEvidenceSpans: EvidenceSpan[];
  minimumEvidenceStatus: 'verified' | 'unverified' | 'missing';
  morphologyOnly: boolean;
  fieldDiversity: number; // Count of unique source fields where the candidate was found
}

interface Page1InputSnapshot {
  programId: string;
  programTitle: string;
  programStory: string;
  beneficiaryDescription: string;
  durationValue: number | null; // in months
  fundingAmount: number | null; // in IDR/USD
  locationValue: string | null; // raw text or 'unknown'
  candidates: InputCandidate[];
}
```

---

## 4. Versioned Heuristic Configuration

The following YAML block defines the immutable, machine-parseable parameter configuration for `INITIAL-HEURISTIC-CONFIG-V1`:

```yaml
scoring_contract:
  contract_version: "SCORING-CONTRACT-V1"
  heuristic_config_version: "INITIAL-HEURISTIC-CONFIG-V1"
  
  # Candidate eligibility
  eligibility:
    minimum_non_morphology_confidence: 0.50
    morphology_confidence_cap: 0.40
    field_diversity_boost: 0.05
    max_field_diversity_boost: 0.15

  # Sector scoring parameters
  sector_scoring:
    weights:
      problem_family_alignment: 0.25
      outcome_family_alignment: 0.25
      target_actor_alignment: 0.15
      intervention_alignment: 0.15
      indicator_family_alignment: 0.10
      language_alignment: 0.05
      supporting_document_bonus: 0.05
    saturation_thresholds:
      problem_family_alignment: 3.0
      outcome_family_alignment: 2.0
      target_actor_alignment: 1.0
      intervention_alignment: 2.0
      indicator_family_alignment: 2.0
      language_alignment: 2.0
      supporting_document_bonus: 1.0
    thresholds:
      primary: 0.70
      secondary: 0.50
      optional: 0.40
    limits:
      max_primary: 1
      max_secondary: 2
    ambiguity_margin: 0.10

  # SDG scoring parameters
  sdg_scoring:
    weights:
      problem_family_alignment: 0.15
      outcome_family_alignment: 0.30
      target_actor_alignment: 0.05
      intervention_alignment: 0.08
      indicator_family_alignment: 0.25
      cross_cutting_relevance: 0.04
      explicit_donor_alignment: 0.03
      official_target_alignment: 0.10 # Remaining 10% reserve for verified official targets
    saturation_thresholds:
      problem_family_alignment: 3.0
      outcome_family_alignment: 2.0
      target_actor_alignment: 1.0
      intervention_alignment: 2.0
      indicator_family_alignment: 2.0
      cross_cutting_relevance: 1.0
      explicit_donor_alignment: 1.0
      official_target_alignment: 1.0
    thresholds:
      primary: 0.75
      secondary: 0.55
      optional: 0.40
    limits:
      max_primary: 2
      max_secondary: 2

  # Global penalties
  penalties:
    anti_signal_default: -0.25
    anti_signal_generic_only: -0.15
    unsupported_claim_penalty: -0.30
    unverified_inference_penalty: -0.15

  # Numeric policy
  precision:
    decimal_places: 4
    rounding_mode: "ROUND_HALF_UP"
    clamp_range: [0.0000, 1.0000]
```

---

## 5. Rounding and Numeric Policy

The engine must strictly enforce the **`ROUND_HALF_UP`** algorithm to precisely 4 decimal places for all intermediate and final scores to prevent platform-dependent floating-point divergence.

### Mathematical Formulation
For any real number $x$:
$$\text{round}(x) = \text{sign}(x) \times \frac{\lfloor |x| \cdot 10000 + 0.5 \rfloor}{10000}$$

### Precise Order of Operations
To prevent rounding cascade errors, all intermediate calculations must be processed in raw floating-point numbers. Clamping and Rounding must occur exactly once at the end of the calculation pipeline, immediately before producing the final recommendation.

```text
Raw Component Scores (floating point)
  → Apply Penalties & Deductions (floating point)
  → Clamp to [0.0000, 1.0000]
  → Apply ROUND_HALF_UP to 4 decimal places
  → Output Final Score
```

### Reference Examples
- `0.74994` rounds to `0.7499`
- `0.74995` rounds to `0.7500`
- `0.54999` rounds to `0.5500`
- `-0.15005` rounds to `-0.1501`

---

## 6. Conflict Resolution Registry (`CONF-001..CONF-013`)

The following YAML block specifies the exact normative rules and processing behaviors for resolving conflicts:

```yaml
conflict_registry:
  - id: "CONF-001"
    condition: "Math.abs(top_sector_score - second_sector_score) < 0.10"
    processing_type: "USER_REVIEW_ONLY"
    candidate_types: ["sector"]
    hard_gate_if_applicable: false
    fallback_behavior: "Primary sector is set to null; both top candidates are classified as Secondary."
    template_id: "TPL-CONF-001"

  - id: "CONF-002"
    condition: "actor_role_conflict_detected == true"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["actor_role"]
    hard_gate_if_applicable: true
    reclassification_target: "target_actor"
    fallback_behavior: "Enforce target_actor role according to sector registry default mapping."
    template_id: "TPL-CONF-002"

  - id: "CONF-003"
    condition: "dual_role_overlap_detected == true"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["actor_role"]
    hard_gate_if_applicable: false
    reclassification_target: "dual_role_flag"
    fallback_behavior: "Enable both roles and log dual-role flag in the provenance tracking."
    template_id: null

  - id: "CONF-004"
    condition: "confusable_archetype_overlap_detected == true"
    processing_type: "NUMERIC_PENALTY"
    candidate_types: ["intervention"]
    numeric_value: -0.20
    hard_gate_if_applicable: false
    fallback_behavior: "Deduct 0.20 from the lower-scoring confusable archetype; output warning."
    template_id: "TPL-CONF-004"

  - id: "CONF-005"
    condition: "result_level_mismatch == 'invalid_impact'"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["result_level"]
    hard_gate_if_applicable: true
    reclassification_target: "outputs"
    fallback_behavior: "Force claim to outputs category; trigger rejection template TPL-REJ-LEVEL-001."
    template_id: "TPL-REJ-LEVEL-001"

  - id: "CONF-006"
    condition: "result_level_mismatch == 'invalid_outcome_no_criteria'"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["result_level"]
    hard_gate_if_applicable: true
    reclassification_target: "activities"
    fallback_behavior: "Force claim to activities category; trigger rejection template TPL-REJ-LEVEL-002."
    template_id: "TPL-REJ-LEVEL-002"

  - id: "CONF-007"
    condition: "sdg_gap_alignment_detected == true"
    processing_type: "USER_REVIEW_ONLY"
    candidate_types: ["sdg"]
    hard_gate_if_applicable: false
    fallback_behavior: "Present gap options in UI; do not block saving draft."
    template_id: "TPL-CONF-007"

  - id: "CONF-008"
    condition: "Math.abs(top_sdg_score - second_sdg_score) < 0.05 && limit_exceeded == true"
    processing_type: "USER_REVIEW_ONLY"
    candidate_types: ["sdg"]
    hard_gate_if_applicable: false
    fallback_behavior: "Present the two competing SDGs to the user for explicit primary selection."
    template_id: "TPL-CONF-008"

  - id: "CONF-009"
    condition: "long_term_impact_duration_under_12_months == true"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["result_level"]
    hard_gate_if_applicable: true
    reclassification_target: "outcomes"
    fallback_behavior: "Downgrade long-term impact claim with duration under 12 months to outcome."
    template_id: "TPL-CONF-009"

  - id: "CONF-010"
    condition: "beneficiary_count_mismatch == true"
    processing_type: "USER_REVIEW_ONLY"
    candidate_types: ["beneficiary_count"]
    hard_gate_if_applicable: true
    fallback_behavior: "Enforce beneficiary count from structured field; narrative becomes footnote."
    template_id: "TPL-CONF-010"

  - id: "CONF-011"
    condition: "location_mismatch == true"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["location"]
    hard_gate_if_applicable: true
    reclassification_target: "structured_location"
    fallback_behavior: "Strictly enforce location from structured field; discard narrative location."
    template_id: null

  - id: "CONF-012"
    condition: "budget_scope_mismatch_detected == true"
    processing_type: "NUMERIC_PENALTY"
    candidate_types: ["budget_scope"]
    numeric_value: -0.10
    hard_gate_if_applicable: false
    fallback_behavior: "Deduct 0.10 from proposal confidence; display warning."
    template_id: "TPL-CONF-012"

  - id: "CONF-013"
    condition: "cross_cutting_relevance_mismatch == true"
    processing_type: "RECLASSIFICATION"
    candidate_types: ["cross_cutting"]
    hard_gate_if_applicable: true
    reclassification_target: "unresolved_questions"
    fallback_behavior: "Downgrade cross-cutting relevance to unresolved question; remove from automatic recommendations."
    template_id: null
```

---

## 7. Missing-Information Registry (`MISS-001..MISS-024`)

Every missing-information rule is defined by an executable condition, severity, and resolution path:

```yaml
missing_information_registry:
  - id: "MISS-001"
    condition: "durationValue == null || durationValue == 0"
    severity: "IMPORTANT_FOR_GOLDEN_GENERATION"
    blocking: false
    question_id: "TPL-MISS-Q001"
    question_id_text_id: "Berapa perkiraan jumlah penerima manfaat langsung dari program ini?"
    question_en_text: "What is the estimated number of direct beneficiaries for this program?"
    template_id: "TPL-MISS-001"
    affected_fields: ["proposal_scope"]
    resolution_condition: "Direct beneficiary count is set to a positive integer."

  - id: "MISS-002"
    condition: "locationValue == 'unknown' || locationValue == null"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q002"
    question_id_text_id: "Di kabupaten/kota mana lokasi utama pelaksanaan program ini?"
    question_en_text: "In which district/city is the main location of this program?"
    template_id: "TPL-MISS-002"
    affected_fields: ["location_level", "suggested_partners"]
    resolution_condition: "Location is resolved to a valid Indonesian administrative gazetteer entry."

  - id: "MISS-003"
    condition: "durationValue == null || durationValue == 0"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q003"
    question_id_text_id: "Berapa lama perkiraan jangka waktu pelaksanaan program ini?"
    question_en_text: "What is the estimated duration of this program?"
    template_id: "TPL-MISS-003"
    affected_fields: ["time_horizon_guidance"]
    resolution_condition: "Duration value is set to a positive integer in months."

  - id: "MISS-004"
    condition: "fundingAmount == null || fundingAmount == 0"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q004"
    question_id_text_id: "Berapa perkiraan total anggaran yang dibutuhkan untuk program ini?"
    question_en_text: "What is the estimated total budget required for this program?"
    template_id: "TPL-MISS-004"
    affected_fields: ["budget_scope"]
    resolution_condition: "Funding amount is set to a positive number."

  - id: "MISS-005"
    condition: "donor_or_call_optional == null"
    severity: "OPTIONAL_FOR_DRAFT"
    blocking: false
    question_id: "TPL-MISS-Q005"
    question_id_text_id: "Apakah program ini ditujukan untuk memprioritaskan kriteria dari donor tertentu?"
    question_en_text: "Is this program intended to prioritize criteria from a specific donor?"
    template_id: "TPL-MISS-005"
    affected_fields: []
    resolution_condition: "Donor preference is selected or explicitly skipped."

  - id: "MISS-006"
    condition: "candidates.filter(c => c.candidateType === 'actor' && c.confidence >= 0.50).length == 0"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q006"
    question_id_text_id: "Siapa pihak yang diharapkan mengubah praktik atau perilakunya dalam program ini? (bisa berbeda dari penerima manfaat)"
    question_en_text: "Who is expected to change their practices or behaviors in this program? (can differ from direct beneficiaries)"
    template_id: "TPL-MISS-006"
    affected_fields: ["expected_changes"]
    resolution_condition: "At least one target actor is confirmed with confidence >= 0.60."

  - id: "MISS-007"
    condition: "candidates.filter(c => c.candidateType === 'problem' && c.confidence >= 0.50).length == 0"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q007"
    question_id_text_id: "Apa masalah utama/kendala riil di lapangan yang ingin diselesaikan oleh program ini?"
    question_en_text: "What is the main problem/barrier in the field that this program aims to solve?"
    template_id: "TPL-MISS-007"
    affected_fields: ["problem_summary"]
    resolution_condition: "At least one Problem Family is confirmed with confidence >= 0.60."

  - id: "MISS-008"
    condition: "candidates.filter(c => c.candidateType === 'outcome' && c.confidence >= 0.50).length == 0"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q008"
    question_id_text_id: "Perubahan konkret apa yang diharapkan terjadi pada diri sasaran setelah program selesai?"
    question_en_text: "What concrete change is expected to happen to the target group after the program is completed?"
    template_id: "TPL-MISS-008"
    affected_fields: ["expected_changes", "sdg_recommendations"]
    resolution_condition: "At least one Outcome Family is confirmed by the user."

  - id: "MISS-009"
    condition: "candidates.filter(c => c.candidateType === 'archetype' && c.confidence >= 0.50).length == 0"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q009"
    question_id_text_id: "Pendekatan atau intervensi utama apa yang akan dilakukan dalam program ini?"
    question_en_text: "What is the main intervention or approach that will be implemented in this program?"
    template_id: "TPL-MISS-009"
    affected_fields: ["direct_results"]
    resolution_condition: "At least one Archetype is confirmed by the user."

  - id: "MISS-010"
    condition: "baseline == null || baseline == 'none'"
    severity: "REQUIRES_BASELINE"
    blocking: false
    question_id: "TPL-MISS-Q010"
    question_id_text_id: "Apakah sudah ada data kondisi awal (baseline) terkait masalah ini di wilayah tersebut?"
    question_en_text: "Is there any baseline data regarding this problem in that location?"
    template_id: "TPL-MISS-010"
    affected_fields: ["problem_summary"]
    resolution_condition: "Baseline data is provided or explicitly skipped."

  - id: "MISS-011"
    condition: "target_angka == null || target_angka == ''"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q011"
    question_id_text_id: "Berapa target angka perubahan yang ingin dicapai (misal: naik 20%, atau menjadi 80 kepala keluarga)?"
    question_en_text: "What is the target change metric to achieve (e.g., increase by 20%, or reach 80 families)?"
    template_id: "TPL-MISS-011"
    affected_fields: ["expected_changes"]
    resolution_condition: "Target metric is provided manually."

  - id: "MISS-012"
    condition: "target_date == null"
    severity: "OPTIONAL"
    blocking: false
    question_id: "TPL-MISS-Q012"
    question_id_text_id: "Kapan target waktu pencapaian hasil perubahan ini?"
    question_en_text: "When is the target completion date for achieving this change?"
    template_id: "TPL-MISS-012"
    affected_fields: []
    resolution_condition: "Target date is confirmed."

  - id: "MISS-013"
    condition: "unit_indikator == null"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q013"
    question_id_text_id: "Apa satuan ukuran untuk mengukur keberhasilan indikator ini (misal: persen, orang, ton)?"
    question_en_text: "What is the unit of measurement to measure this indicator's success (e.g., percent, people, tons)?"
    template_id: "TPL-MISS-013"
    affected_fields: ["expected_changes"]
    resolution_condition: "Unit is selected from options."

  - id: "MISS-014"
    condition: "sumber_data == null && !hasDiscreteAssessmentTerm(programStory)"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q014"
    question_id_text_id: "Bagaimana cara Anda memverifikasi atau mendapatkan data pencapaian hasil tersebut?"
    question_en_text: "How will you verify or obtain the data for achieving those results?"
    template_id: "TPL-MISS-014"
    affected_fields: ["direct_results"]
    resolution_condition: "Verification method/source data description is confirmed."

  - id: "MISS-015"
    condition: "penanggung_jawab == null"
    severity: "OPTIONAL"
    blocking: false
    question_id: "TPL-MISS-Q015"
    question_id_text_id: "Siapa nama penanggung jawab pemantauan indikator ini di internal tim Anda?"
    question_en_text: "Who is the person in charge of monitoring this indicator in your team?"
    template_id: "TPL-MISS-015"
    affected_fields: []
    resolution_condition: "Person in charge name is entered."

  - id: "MISS-016"
    condition: "ketergantungan_mitra_aktif == true && tidak_ada_komitmen_tertulis == true"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q016"
    question_id_text_id: "Apakah sudah ada kesepakatan awal dengan instansi pemerintah setempat (seperti Puskesmas/Kelurahan) yang layanannya akan diakses?"
    question_en_text: "Is there an initial agreement with the local government agency whose services will be accessed?"
    template_id: "TPL-MISS-016"
    affected_fields: ["suggested_partners"]
    resolution_condition: "Written commitment status is updated to verbal or formal MOU."

  - id: "MISS-017"
    condition: "beneficiary_description_ambigu == true && active_actors.length == 0"
    severity: "CRITICAL_FOR_BLUEPRINT"
    blocking: false
    question_id: "TPL-MISS-Q017"
    question_id_text_id: "Penerima manfaat tertulis secara sangat luas ('masyarakat'). Bisakah Anda merinci kelompok warga spesifik mana yang disasar (misal: ibu menyusui, atau petani tadah hujan)?"
    question_en_text: "The beneficiaries are written too broadly ('the community'). Can you specify which group of citizens is targeted (e.g., breastfeeding mothers, or rainfed farmers)?"
    template_id: "TPL-MISS-017"
    affected_fields: ["problem_summary", "expected_changes"]
    resolution_condition: "Specific beneficiary subgroup category (ACT-ID) is linked."

  - id: "MISS-018"
    condition: "unresolved_ambiguous_terms_count >= 3"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q018"
    question_id_text_id: "Proposal Anda memuat banyak kata bermakna ganda (seperti 'pemberdayaan', 'kapasitas', 'aktif'). Harap verifikasi rincian praktis dari istilah tersebut."
    question_en_text: "Your proposal contains many ambiguous terms (like 'empowerment', 'capacity', 'active'). Please verify the practical details of these terms."
    template_id: "TPL-MISS-018"
    affected_fields: ["expected_changes", "direct_results"]
    resolution_condition: "All flagged ambiguous terms are resolved by the user."

  - id: "MISS-019"
    condition: "active_sectors.length > 2 && unrelated_sectors_detected == true"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q019"
    question_id_text_id: "Program Anda mencoba menyelesaikan terlalu banyak isu yang tidak saling berhubungan (misal: pertanian sekaligus gizi buruk stunting). Kami menyarankan memfokuskan program agar dampak lebih optimal."
    question_en_text: "Your program attempts to solve too many unrelated issues (e.g., agriculture and stunting nutrition). We suggest focusing the program for better impact."
    template_id: "TPL-MISS-019"
    affected_fields: ["problem_summary"]
    resolution_condition: "Unrelated issues are removed, or user consciously proceeds with integrated draft."

  - id: "MISS-020"
    condition: "candidates.filter(c => c.candidateType === 'archetype' && c.confidence >= 0.50).length > 6"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q020"
    question_id_text_id: "Metode kegiatan yang dirancang terlalu banyak (>6 intervensi). Bisakah beberapa kegiatan digabungkan (misal: kelas pelatihan dan mentoring digabung menjadi satu paket peningkatan kapasitas)?"
    question_en_text: "The planned interventions are too many (>6). Can some activities be bundled (e.g., training classes and mentoring bundled into a capacity-building package)?"
    template_id: "TPL-MISS-020"
    affected_fields: ["direct_results"]
    resolution_condition: "Intervention groups are consolidated to <= 4 work packages."

  - id: "MISS-021"
    condition: "candidates.filter(c => c.candidateType === 'sdg' && c.score >= 0.75).length > 4"
    severity: "IMPORTANT"
    blocking: false
    question_id: "TPL-MISS-Q021"
    question_id_text_id: "Program terhubung ke lebih dari 4 SDGs utama. Kami menyarankan memilih maksimal 2 tujuan utama yang paling langsung diukur oleh indikator Anda."
    question_en_text: "The program links to more than 4 primary SDGs. We suggest choosing at most 2 primary goals that are most directly measured by your indicators."
    template_id: "TPL-MISS-021"
    affected_fields: ["sdg_recommendations"]
    resolution_condition: "Primary SDGs are reduced to <= 2 goals."

  - id: "MISS-022"
    condition: "claim_impact_without_intermediate_outcome == true"
    severity: "REQUIRES_HUMAN_CONFIRMATION"
    blocking: false
    question_id: "TPL-MISS-Q022"
    question_id_text_id: "Proposal mengklaim sasaran akhir yang sangat tinggi (misal: mengentaskan kemiskinan daerah), tetapi tidak mencantumkan hasil perubahan menengah tingkat keluarga. Harap verifikasi alur logis rantai dampak."
    question_en_text: "The proposal claims a very high long-term impact (e.g., eradicating district poverty), but lacks intermediate family-level outcomes. Please verify the logical impact chain."
    template_id: "TPL-MISS-022"
    affected_fields: ["impact_direction"]
    resolution_condition: "Logical intermediate outcomes are linked or contribution framing accepted."

  - id: "MISS-023"
    condition: "sensitive_personal_data_detected == true"
    severity: "REQUIRES_HUMAN_CONFIRMATION"
    blocking: false
    question_id: "TPL-MISS-Q023"
    question_id_text_id: "Kami mendeteksi adanya data pribadi sensitif (seperti NIK, nomor handphone, atau nama korban KDRT) di narasi Anda. Apakah Anda bersedia jika sistem menyamarkan data tersebut di draf publik?"
    question_en_text: "We detected sensitive personal data (such as national ID numbers, phone numbers, or names of domestic violence survivors) in your narrative. Do you agree to mask this data in public drafts?"
    template_id: "TPL-MISS-023"
    affected_fields: ["problem_summary", "proposal_story"]
    resolution_condition: "Sensitive data is masked or manually removed from input."

  - id: "MISS-024"
    condition: "safeguarding_concern_active == true"
    severity: "REQUIRES_HUMAN_CONFIRMATION"
    blocking: false
    question_id: "TPL-MISS-Q024"
    question_id_text_id: "Program Anda bersentuhan langsung dengan kelompok rentan (seperti anak-anak atau korban kekerasan). Apakah Anda bersedia jika sistem otomatis memunculkan modul pengaman sosial (safeguards) wajib di rancangan akhir?"
    question_en_text: "Your program directly interacts with vulnerable groups (such as children or violence survivors). Do you agree to automatically enable mandatory social safeguards in the final design?"
    template_id: "TPL-MISS-024"
    affected_fields: ["cross_cutting_relevance"]
    resolution_condition: "Mandatory safeguard policy implementation is confirmed by the user."
```

#### Refined `hasDiscreteAssessmentTerm` Implementation
To prevent false positives like matching the substring `"scores"` inside words like `"literacy scores"`, `hasDiscreteAssessmentTerm` MUST evaluate discrete word boundaries (`\b` in regular expressions) rather than checking simple substrings:

```typescript
function hasDiscreteAssessmentTerm(story: string): boolean {
  // Regex matches exact words or phrases, avoiding substring issues inside larger words.
  const assessmentRegex = /\b(scores|tes|nilai|evaluasi|pre-test|post-test|survey|survei|assessment|asesmen)\b/i;
  return assessmentRegex.test(story);
}
```

---

## 8. SDG Primary Coverage Gate

The SDG Primary Coverage Gate operates as a strict binary validator. An SDG candidate with a raw score $\ge 0.75$ **MUST NOT** be assigned to the `primary` recommendation level unless it satisfies the minimum structural evidence prerequisites.

### Gate Evaluation States
1.  **`SUPPORTED`**: The SDG has $\ge 1$ active Outcome Family and ($\ge 1$ active Indicator Family OR $\ge 1$ verified official target alignment) with evidence confidence $\ge 0.60$. The candidate remains eligible for `primary` level recommendation.
2.  **`UNSUPPORTED`**: The SDG score is below the minimum recommendation threshold ($< 0.40$), or a severe anti-signal is matched with no supporting outcome. The recommendation level is downgraded to `rejected`.
3.  **`UNRESOLVED`**: The outcome-indicator mapping data or specific indicator evidence is missing or unresolved at the P0-C level (which is normal before the P0-D runtime linkage is completed). The candidate is safely capped as follows:
    *   `coverage_status: "UNRESOLVED"`
    *   `maximum_recommendation_level: "secondary"`
    *   `explanation_template_id: "TPL-AMB-001"` (directs the user to confirm outcomes/indicators on Page 2).

This mechanism guarantees that P0-C does not invent relationships that are not yet verified, deferring final resolution safely to P0-D.

---

## 9. Fixture Safety and Anti-Vacuous-Pass Policy

The regression testing framework exists to verify mathematical logic. To ensure absolute production integrity, the following rules are locked:

*   **No Runtime branching on Fixture IDs:** Production scoring algorithms must be completely blind to test IDs (e.g. `FIX-GOLD-01`, `FIX-HN-112`). It is prohibited to write code like `if (programId.startsWith('FIX')) { ... }`.
*   **No Expected Value Injections:** Production code must never read fixture files or inject expected scores into runtime variables.
*   **No Registry Poisoning:** Modifying canonical parameters (such as likely sectors or archetypes) in `registry.ts` to make one test pass is prohibited if it breaks the ontological accuracy of other mappings.
*   **Read-Only Assertion Layer:** The assertion layer inside `deterministic.test.ts` is the only component that loads expected results. It evaluates actual engine outputs using the following assertion policies:
    *   `Range Check`: For heuristic scores, check that the score falls within a specific range (e.g. $\ge 0.80$ or $\le 0.50$) rather than asserting exact decimal matches if not normatively specified.
    *   `Order Assertion`: Assert that Sektor A score > Sektor B score when relative ranking is the primary normative outcome.
    *   `Status Check`: Assert that correct `MISS-*` or `CONF-*` rules are active.

---

## 10. Engine Processing Order

The P0-C engine must execute operations in the following strict, linear sequence:

1.  **Input Snapshot Validation:** Read `Page1InputSnapshot`; verify basic types and validate that P0-B candidate objects are read-only.
2.  **Alias Resolution & Canonicalization:** Map all input signals to their corresponding Canonical IDs in `registry.ts`.
3.  **Candidate Eligibility Filtration:** Run the morphology co-contribution rule to filter out ineligible concepts (confidence $< 0.50$, unless co-contributing with a valid non-morphology match).
4.  **Evidence Deduplication:** Deduplicate and merge overlapping evidence spans using the `max` confidence rule.
5.  **Component Scoring:** Compute raw scores ($S_{comp}$) for each active sector and SDG using the *Capped Match Contribution Method*.
6.  **Apply Component Weights:** Compute `Raw Score` = $\sum (S_{comp} \times W_{comp})$.
7.  **Apply Anti-Signals:** Process active anti-signals and apply penalties to obtain the `Intermediary Score`.
8.  **Process Conflicts:** Evaluate conflicts (`CONF-001..CONF-013`) in order of precedence; apply numeric penalties and execute reclassifications.
9.  **Score Clamping and Rounding:** Clamp the score to `[0.0000, 1.0000]` and round using `ROUND_HALF_UP` to 4 decimal places.
10. **Apply SDG Primary Coverage Gate:** Evaluate coverage rules for active SDG recommendations; downgrade `UNRESOLVED` primary candidates to `secondary`.
11. **Evaluate Missing Information:** Run executable missing-information rules (`MISS-001..MISS-024`) and flag unresolved fields.
12. **Assemble Recommendation Output:** Produce final sorted recommendations (Primary, Secondary, Optional) with detailed trace metadata (provenance, matched spans, and template IDs).

---

## 11. Machine-Readable Acceptance Manifest

```yaml
mechanical_acceptance:
  contract_version: "SCORING-CONTRACT-V1"
  expected_conflict_rules: 13
  expected_missing_information_rules: 24
  required_rounding_mode: "ROUND_HALF_UP"
  required_sector_weight_sum: 1.0000
  required_sdg_weight_sum: 1.0000 # (0.90 composite weights + 0.10 official target reserve)
  prohibited_runtime_behaviors:
    - "fixture_expected_value_injection"
    - "fixture_id_scoring_branch"
    - "ui_side_scoring"
    - "ai_model_scoring"
    - "fabricated_coverage_inputs"
    - "raw_substring_assessment_match"
```
