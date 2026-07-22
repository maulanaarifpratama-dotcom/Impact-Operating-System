# Impactory Bilingual LFA Linguistic Guardrail Standard v1

**Status:** Draft v1.0 — Research & Design artifact (no code, no schema changes)
**Date:** 22 July 2026
**Scope:** Proposal → LFA AI pipeline (LFA Builder MVP → V2 WBS/Budget → V3 MEAL)
**Languages:** Bahasa Indonesia (id) + English (en)
**Labels used throughout:** `CANONICAL` · `DONOR-SPECIFIC` · `INDONESIA-SPECIFIC` · `PREFERRED IMPACTORY CONVENTION` · `HEURISTIC ONLY` · `AMBIGUOUS / REQUIRES SEMANTIC REVIEW`

> **Sourcing honesty note.** Definitions labeled `CANONICAL` are traceable to OECD-DAC or convergent multi-donor primary sources verified during research (access date 22 July 2026). Items labeled `HEURISTIC ONLY` or `PREFERRED IMPACTORY CONVENTION` are design recommendations produced for Impactory and must not be presented as international standards. Where citation coverage is selective rather than exhaustive (this v1 was produced in a bounded research pass), the Source Register flags items recommended for verification in v1.1.

---

## Executive Summary

Impactory's Proposal → LFA feature converts narrative proposal text (Bahasa Indonesia or English) into a structured 4-level logical framework (Goal → Purpose/Outcome → Outputs → Activities), plus indicators, MoV, assumptions, and downstream WBS/Budget artifacts. The current failure mode is **level confusion**: activities written as outputs, outputs written as outcomes, indicators containing targets, assumptions written as risks, and result statements disguised as indicators — in both languages, with distinct linguistic causes in each.

This standard establishes:

1. **A terminology crosswalk** across OECD-DAC, EC/PRAG, UNDP, USAID, FCDO/DFID, World Bank, ADB, and Indonesian government (Bappenas/Kemenkeu/PANRB) vocabularies, with one **Canonical Impactory Vocabulary** that stores concepts internally while rendering donor-specific labels on export.
2. **A Universal Semantic Model**: language-independent rules for classifying statements into Input / Activity / Output / Outcome / Impact based on semantic role, actor, object of change, degree of control, time horizon, and causal distance — not surface words.
3. **Two language packs** (Indonesian, English) containing lexical/morphological signals explicitly labeled as *signals*, never absolute rules, with ≥20 counterexamples per language proving why prefix/verb-list rules mislead.
4. **Guardrails per artifact type**: result statements, indicators, baselines/targets, MoV, assumptions/risks/mitigations, WBS elements, budget-readiness.
5. **A cost-efficient rule allocation**: deterministic → lexical/morphological → confidence scoring → Azure semantic review only for genuinely ambiguous items (target ≤20% routed to AI), all **non-blocking**.
6. **An examples corpus**: 200 gold examples, 100 hard negatives, 10 full bilingual results chains for test fixtures.

**Headline design decisions** (full rationale in Final Recommendations):

- Canonical internal levels: `impact` · `outcome` · `intermediate_outcome` (optional) · `output` · `activity` · plus WBS sub-levels `work_package` · `task` · `milestone`. Donor labels are a **presentation-layer mapping**, never a storage concern.
- Activities **stay visible in the LFA editor** (EC classic style) even though PRAG 2015 and some donors move them to a separate activity matrix — consistent with "Never A or B": show simple 4-level by default, allow "donor mode" export that relocates activities.
- Indicators are stored **neutral** (measure + population + qualification), with direction-of-change, baseline, and target as **separate fields** — the multi-donor safe superset.
- Morphological rules (`me-`, `ter-`, `-nya`) are **signals with weights**, never verdicts. Counterexample corpus is mandatory in test fixtures.
- LFA Quality Score excludes PMK/SBM compliance entirely (Budget Readiness ≠ Budget Compliance).

---

## Research Method

- **Approach:** targeted primary-source research (web) on donor terminology and framework guidance; comparative analysis; linguistic analysis of Indonesian morphology and English result-statement grammar based on established descriptive linguistics; design synthesis for Impactory-specific rules.
- **Access date for all cited sources:** 22 July 2026.
- **Boundaries:** this is a bounded (non-exhaustive) research pass. Every definitional claim carries a source label; claims without a verified primary citation are labeled `HEURISTIC ONLY` or `PREFERRED IMPACTORY CONVENTION`. The Validation Plan includes a citation-hardening task for v1.1.
- **No implementation:** this document changes no code, schema, migration, or prompt in production. It is the knowledge source for a future rule engine + test fixtures.

## Source Hierarchy

| Tier | Sources used in this v1 | Role |
|---|---|---|
| 1 | OECD-DAC *Glossary of Key Terms in Evaluation and RBM for Sustainable Development*, 2nd ed. (2023); EC *Aid Delivery Methods Vol. 1: PCM Guidelines* (2004) & ECHO PCM manual; PRAG-era logframe template (2015); USAID ADS 201 + Results Framework technical notes; ADB *Guidelines for Preparing a Design and Monitoring Framework*; DFID *Guidance on using the revised Logical Framework*; Bappenas *Pedoman Evaluasi Kinerja Pembangunan Sektoral* (2009); PermenPAN PER/9/M.PAN/5/2007 (IKU) | Definitions, level semantics, indicator rules |
| 2 | BetterEvaluation (logframe variants) | Context on framework variants |
| 3 | Established descriptive linguistics of Indonesian (voice/affixation) and English (nominalization, participles) | Language packs — labeled analysis, not donor standard |

Full citations: **Source Register** (final section).

---

## Terminology Crosswalk

### The four/five levels across organizations

| Concept (Impactory canonical) | OECD-DAC 2023 | EC classic PCM (2004) | EC PRAG 2015 / UADT | UNDP RBM | USAID (ADS 201) | DFID/FCDO logframe | World Bank | ADB DMF | Bappenas / GoI |
|---|---|---|---|---|---|---|---|---|---|
| `impact` | Impact — long-term effects, direct/indirect, intended/unintended | Overall Objective | Overall objective / Impact | Impact | CDCS Goal | Impact (Goal) | Higher-level objective / long-term outcome | Impact (from national/sector strategy) | Dampak |
| `outcome` | Outcome — likely/achieved short & medium-term effects of outputs (often behavioral/organizational change) | Project Purpose (single) | Specific objective(s) / Outcome(s) | Outcome | Development Objective (DO); Project Purpose in LogFrame | Outcome (Purpose) | Project Development Objective (PDO) | Outcome — immediate/direct benefit of output use | Hasil |
| `intermediate_outcome` | (within outcome band) | — | (multiple specific objectives allowed) | (outputs→outcome chain) | Intermediate Result (IR), Sub-IR | (Output→Outcome pathway) | Intermediate outcome/results indicators | — | Hasil antara (praktik, bukan istilah baku) |
| `output` | Output — products, capital goods, services delivered | Results | Outputs | Output | Output (LogFrame level) | Output | Output | Output — goods/products/services delivered by the project | Keluaran |
| `activity` | Activity — actions taken / work performed | Activities | Activities (moved toward activity matrix / not always in logframe grid) | Activity | Inputs/activities (project design) | Activities (below Outputs; inputs summarized) | Activities/components | Activities & milestones (5-level DMF) | Kegiatan / Aktivitas |
| `input` | Input — financial, human, material resources | Means / Costs | Means & costs | Input | Inputs | Inputs (DFID share, FTEs) | Inputs | Inputs | Masukan |

Sources: OECD-DAC Glossary 2nd ed. (2023); EC PCM Guidelines; PRAG 2015 logframe analysis; USAID RF technical note ("IR = measurable lower-level changes that jointly achieve the DO; Sub-IR = changes that contribute to the IR"); ADB DMF Guidelines ("outputs are goods, products, or services delivered by the project; outcomes are the immediate and direct benefits of the use or application of the outputs"); DFID revised logframe guidance (Impact(Goal)/Outcome(Purpose)/Output); Bappenas Pedoman Evaluasi Kinerja Pembangunan Sektoral (hierarki Indikator Dampak, Hasil, Keluaran, Masukan). See Source Register.

### Answers to critical questions A.3–A.7

**A.3 — Are `Goal`, `Impact`, `Overall Objective` always identical?** `CANONICAL`-adjacent but **not identical**. They occupy the same *level* (highest, beyond project control, contribution not attribution) but differ in nuance: OECD-DAC "Impact" explicitly includes *unintended and negative* effects; "Goal/Overall Objective" is an *intended* aspiration only. Guardrail consequence: an Impactory `impact` statement is a **goal-style intended statement**; unintended-effects language belongs in MEAL, not the logframe top row. Label: `CANONICAL` for level equivalence; nuance documented.

**A.4 — Are `Outcome`, `Purpose`, `Specific Objective` always identical?** Same level, with two real structural differences: (a) EC classic PCM mandates **exactly one** Project Purpose; PRAG 2015 permits **multiple** specific objectives/outcomes; USAID DOs are strategy-level and multiple. (b) USAID "Intermediate Result" sits *inside* the outcome band (IR → DO), so a two-tier outcome is legitimate under USAID and awkward under EC classic. Guardrail consequence: Impactory permits 1..n outcomes, warns (`INFO`) when >1 outcome under EC-classic export mode. Label: `DONOR-SPECIFIC` variation documented.

**A.5 — When is `intermediate_outcome` needed?** `PREFERRED IMPACTORY CONVENTION`: only when (i) donor format requires it (USAID IR/Sub-IR), or (ii) the causal jump from output-use to the stated outcome spans >1 behavioral step (e.g., *trained* → *applies practice* → *income rises*: "applies practice" is the intermediate outcome). Default UI hides the tier (progressive disclosure); classifier can propose it when it detects a chained behavior inside one outcome statement.

**A.6 — Do activities officially live in the logframe?** Split practice. EC classic 2004: activities are the 4th row of the matrix. PRAG 2015/UADT: intervention logic emphasizes outputs→outcomes→overall objective, activities handled in work plan/activity matrix; DFID logframe carries outputs with activities/inputs summarized beneath; ADB DMF keeps a 5-level list including "Activities with milestones." **Decision (Final Recommendations #2): Impactory always stores and displays activities in the LFA editor; export profiles decide whether they print inside the matrix or as a separate activity schedule.** Label: `DONOR-SPECIFIC` + `PREFERRED IMPACTORY CONVENTION`.

**A.7 — Canonical internal terminology without losing donor compatibility?** Store canonical level keys; attach an **export profile** per donor that supplies (i) label mapping, (ii) structural constraints (single purpose? activities in matrix? indicator placement?), (iii) tense/style lint rules (e.g., ADB wants outputs phrased in past tense as already achieved — "rural roads constructed"). Never store donor labels in data; never hard-code one donor's constraint into the classifier.

---

## Canonical Impactory Vocabulary

`PREFERRED IMPACTORY CONVENTION` — internal keys, bilingual display labels:

| Key | EN label | ID label | One-line semantic contract |
|---|---|---|---|
| `impact` | Impact / Goal | Dampak / Tujuan Umum | Long-term societal/sectoral condition change the project *contributes to*; beyond project control |
| `outcome` | Outcome / Purpose | Hasil / Tujuan Khusus | Change in behavior, practice, performance, access, or institutional functioning of target groups resulting from *use of outputs*; project influence, not control |
| `intermediate_outcome` | Intermediate Outcome | Hasil Antara | Earlier behavioral/uptake change on the path to the outcome (optional tier) |
| `output` | Output | Keluaran | Product, good, service, or completed deliverable directly produced by project work; within project control |
| `activity` | Activity | Kegiatan | Meaningful intervention (work performed by the project team/partners) that produces one or more outputs |
| `work_package` | Work Package | Paket Kerja | Group of related work producing a defined deliverable (WBS tier) |
| `task` | Task | Tugas | Assignable work unit with owner, duration, dependency, completion criterion |
| `milestone` | Milestone | Tonggak Capaian | Zero-duration checkpoint; a state/date, not work |
| `input` | Input | Masukan | Financial, human, material resources consumed |
| `indicator` | Indicator | Indikator | Neutral, verifiable variable measuring a result statement |
| `baseline` | Baseline | Data Dasar / Baseline | Indicator value before/at start |
| `target` | Target | Target | Committed indicator value at a date |
| `mov` | Means of Verification | Sumber & Cara Verifikasi | Source + method + frequency + responsible party |
| `assumption` | Assumption | Asumsi | External condition, outside full project control, required for the causal link to hold (stated positively) |
| `risk` | Risk | Risiko | Uncertain event/condition that could impede results (stated as threat) |
| `mitigation` | Mitigation | Mitigasi | Project action reducing risk likelihood/impact |
| `beneficiary` | Beneficiary | Penerima Manfaat | Individual/household/group whose condition the intervention intends to improve |
| `target_group` | Target Group | Kelompok Sasaran | Directly addressed group (may be intermediaries, e.g., teachers, cadres) |
| `stakeholder` | Stakeholder | Pemangku Kepentingan | Any party affecting/affected by the intervention (superset) |
| `result` | Result | Hasil (generik) | Umbrella: output, outcome, or impact (OECD-DAC) — never a storable level on its own |
| `objective` | Objective | Tujuan | Generic aim wording; must resolve to a level, never stored as one |
| `strategy` / `approach` | Strategy / Approach | Strategi / Pendekatan | *How* results are pursued; not a chain level |
| `component` | Component | Komponen | Organizational grouping of outputs/activities; not a causal level |
| `program` / `project` | Program / Project | Program / Proyek | Program = portfolio of projects sharing higher objective (EC); GoI: Program→Kegiatan→Output hierarchy |
| `theory_of_change` | Theory of Change | Teori Perubahan | Narrative + diagram of how/why change happens incl. pathways & assumptions; richer than logframe |
| `results_chain` | Results Chain | Rantai Hasil | Linear input→activity→output→outcome→impact sequence |
| `results_framework` | Results Framework | Kerangka Hasil | Hierarchical results diagram (USAID RF: Goal–DO–IR–Sub-IR) |
| `logical_framework_matrix` | Logframe Matrix | Matriks Kerangka Logis | 4×4 grid: intervention logic × indicators × MoV × assumptions |

**Guardrail rule V-1 (`DETERMINISTIC`):** the words *result*, *objective*, *strategy*, *approach*, *component* may appear in text but may never be persisted as a causal level. If the AI draft labels a node with one of these, emit finding `GENERIC_LEVEL_LABEL` (severity WARNING) and force resolution to a canonical key.

---

## Universal Semantic Model

Language-independent classification. Surface words are evidence; **semantic role is the verdict**.

### The five levels — diagnostic profile

| Dimension | Input | Activity | Output | Outcome | Impact |
|---|---|---|---|---|---|
| Diagnostic question | What resources are consumed? | What work does the project do? | What does the project directly deliver/complete? | What do target groups do differently / what capacity-access-performance changes because outputs are used? | What long-term condition improves in society/sector? |
| Primary actor | — (resources) | Project team / implementing partner | Project (as producer); deliverable is the subject | **Target group / beneficiary / institution** (they act or change) | Population / system / society |
| Object of change | — | Work itself | Existence/availability/completion of a thing | Behavior, practice, use, access, capacity, compliance, performance | Wellbeing, prevalence, income, resilience, equity, sustainability of conditions |
| Degree of project control | Full | Full | **High/direct control** | **Influence, not control** (depends on others' choices + assumptions) | Contribution only |
| Time horizon | Continuous | During implementation | By end of activity/period | During–shortly after project (short/medium term) | Medium–long term, often post-project |
| Causal distance from work | 0 | 0 | 1 step | 2 steps (via output use) | ≥3 steps |
| Evidence form | Financial/HR records | Attendance, activity reports, logs | Physical/administrative verification of deliverable | Behavioral/uptake data: usage logs, practice observation, performance records, surveys | Statistics, prevalence surveys, longitudinal data |
| Typical indicator | Budget spent, staff-months | # sessions held, # participants reached (process) | # produced/trained/installed/published; availability status | % using/applying/adopting/accessing; performance rates | Rates in population: poverty, stunting, emissions, income, mortality |
| Classic misclassification | — | Written as noun → mistaken for output | "X trained" mistaken for outcome; or restated activity | "Increased income" placed here though it's impact; or "report produced" mislabeled outcome | Written as project promise (attribution overclaim) |

Level-equivalence sources: OECD-DAC (Output = products/capital goods/services; Outcome = short/medium-term effects of outputs, usually behavioral or organizational change; Impact = long-term effects incl. unintended; Input = financial/human/material resources) — `CANONICAL`. ADB adds the crispest operational cut: outcome = *immediate and direct benefit of the use or application of outputs* — adopted as Impactory's outcome test. `CANONICAL`/`DONOR-SPECIFIC` (ADB phrasing).

### Decision tree (classification order)

```text
Q1. Is the statement about resources (money, staff, equipment as consumables)?
    → YES: input
Q2. Is the grammatical/semantic AGENT the project team, and the core meaning "work being done"?
    (conduct/melaksanakan, organize/menyelenggarakan, train [as act of training]…)
    → YES: activity
Q3. Does it assert that a product/service/deliverable EXISTS, IS COMPLETED, or IS AVAILABLE,
    where the project directly controls that existence?
    (module tersedia, 300 farmers trained [= completion of training], system operational)
    → YES: output
Q4. Does it assert that a TARGET GROUP or INSTITUTION uses, applies, adopts, accesses,
    complies, participates, performs better, or has changed capacity/behavior —
    something the project influences but cannot guarantee?
    → YES: outcome
    Q4b. Is it an early uptake step feeding a later behavioral/performance change
         stated elsewhere? → intermediate_outcome (optional tier)
Q5. Does it assert a broad, long-term change in living conditions, prevalence,
    institutional norms at system level, environment, or economy,
    beyond what this project alone can deliver?
    → YES: impact
Ambiguity: if ≥2 levels remain plausible after Q1–Q5 (confidence margin < 0.15)
    → AMBIGUOUS / REQUIRES SEMANTIC REVIEW
```

**Rule V-2 (`STRUCTURAL RULE`):** the tree runs on the *proposition*, not the sentence's first word. Nominalized activities ("Pelaksanaan pelatihan…") are still activities (Q2 on semantic agent). Passive outputs ("Modul disusun") are still outputs (Q3 on existence/completion).

**Rule V-3 (`STRUCTURAL RULE`, control test):** if achieving the statement requires *someone outside the project to choose to act* (farmer adopts, clinic complies, ministry allocates), it cannot be an output. This single test resolves most output/outcome confusion in both languages.

**Rule V-4 (`STRUCTURAL RULE`, quantity ≠ level):** numbers appear at every level (300 farmers trained = output; 60% of farmers apply = outcome; stunting falls to 14% = impact). "Contains a number → output" is forbidden as a rule; it is at most a weak prior. `HEURISTIC ONLY`.

---

## Indonesian Language Pack

All items below are **signals** (weights feed confidence scoring), never verdicts. Morphological facts follow standard descriptive grammar of Indonesian (see Source Register, Tier 3). Signal-to-level mappings are `HEURISTIC ONLY` unless noted.

### Morphology — what each pattern actually encodes

| Pattern | Grammatical meaning | Level signal | Strength | Trap |
|---|---|---|---|---|
| `meN-` (me-/mem-/men-/meng-/meny-) + transitive verb | Active voice, agent-focused action | activity | Medium | Agent may be the *beneficiary* → outcome ("Petani **menggunakan** pupuk organik") |
| `di-` passive | Patient-focus; agent demoted | output (completion) *or* activity (procedural) | Weak | "Pelatihan **dilaksanakan**" = activity in passive clothing |
| `ter-` | Stative/resultative ("in a state of having been X-ed") or accidental | output | Medium-strong | State may be a *behavioral/relational* state → outcome/impact ("**ter**bangunnya kepercayaan masyarakat") |
| `ber-` | Intransitive/middle: having, doing, being in state | outcome (behavior: **ber**partisipasi, **ber**operasi mandiri) | Weak-medium | "**ber**operasi" for a system = output (operational status) |
| `peN-…-an` / `pe-…-an` nominalization | Process noun of an action ("the conducting of…") | **activity** (despite noun form) | Strong | Never read noun form as deliverable; "pelatihan" as *event* = activity, as *completed package delivered* = output — context decides |
| `ke-…-an` nominalization | Abstract state/quality noun | outcome/impact (state language) | Weak | "ketersediaan modul" = output availability |
| `-nya` on verb-derived noun (meningkat**nya**, tersedia**nya**) | Definitizes an event/state as a topic: "the increasing of…" | result-statement style (output/outcome/impact all possible) | Weak | Formal GoI style puts `-nya` on *every* level incl. outputs ("tersedianya dokumen…") |
| Active transitive verb, agent = project | action | activity | Strong | — |
| Active verb, agent = target group | behavior | **outcome** | Strong | Verify the agent really is the target group, not project staff |
| Existential/availability construction (tersedia, terdapat, ada) | existence | output | Medium | "tersedianya akses pasar" — access is relational → outcome |
| Change-of-state intransitives (meningkat, menurun, membaik, menguat) | change in a magnitude/quality | outcome/impact | Medium | The *thing that changes* decides the level (jumlah modul meningkat = output land) |

### Indonesian Activity signals (lexicon, weight: medium unless marked)

Verbs: melaksanakan, melakukan, menyelenggarakan, mengadakan, menyusun, mengembangkan, memetakan, mengidentifikasi, mendata, mendistribusikan, memberikan, memfasilitasi, mendampingi, melatih, merekrut, menyeleksi, membangun, memasang, menguji, memvalidasi, memantau, mengevaluasi, mengadvokasi, mengoordinasikan, mensosialisasikan, mengoperasikan (weight: weak — operating can be an output status), menyalurkan, menggelar, menyiapkan, merancang, memproduksi, mencetak, merevisi, menerjemahkan.

Nominalizations (still activity-signaling): pelaksanaan, penyelenggaraan, penyusunan, pengembangan, pendataan, pelatihan, pendampingan, fasilitasi, distribusi, pembangunan, pemasangan, monitoring, evaluasi, koordinasi, sosialisasi, advokasi, perekrutan, pengadaan, pemetaan, pengujian, pencetakan, diseminasi.

**Disambiguator D-ID-1:** nominalization + object + *no completion/recipient-change claim* → activity. Nominalization + explicit completion state ("telah tersusun", "selesai") → output. Nominalization + agent = beneficiary ("pelaksanaan praktik pencatatan **oleh petani**") → outcome.

### Indonesian Output signals

tersedia, tersusun, terbentuk, terbangun, terpasang, terlatih, tersertifikasi, terdistribusi, terpublikasi, terpetakan, terdata, terdaftar, terdigitalisasi, terlayani, selesai dikembangkan, siap digunakan, beroperasi, disahkan, diterbitkan, diproduksi, dicetak, dibangun (completed sense), menerima layanan, menyelesaikan pelatihan, "X unit … dibangun", "dokumen … tersusun", "sistem … berfungsi".

**Disambiguator D-ID-2:** `ter-` + concrete deliverable noun (modul, gedung, sistem, SOP, kurikulum, sumur, aplikasi) → output (strong). `ter-` + abstract relational noun (kepercayaan, kesadaran, komitmen, kemitraan) → outcome/impact (the `ter-` form is stylistic).

### Indonesian Outcome signals

menggunakan, menerapkan, mengadopsi, memanfaatkan, mengakses, mempraktikkan, mematuhi, berpartisipasi, mengelola (by target group), mengambil keputusan, merespons, mengintegrasikan, mempertahankan praktik, meningkatkan kinerja (subject = target org), menurunkan risiko (subject = target group), lebih mampu, memiliki akses, memiliki kapasitas, memperoleh manfaat, mulai menjual, aktif melapor, rutin mencatat, melanjutkan usaha.

**Disambiguator D-ID-3:** these verbs signal outcome **only when the agent ∈ {kelompok sasaran, penerima manfaat, lembaga sasaran}**. Same verbs with project as agent ("Tim proyek menerapkan protokol M&E") = activity.

### Indonesian Impact signals

meningkatnya, membaiknya, menguatnya, berkurangnya, menurunnya, terwujudnya, terciptanya, terjaganya, terpeliharanya, terpenuhinya, tercapainya — **combined with** population-level object (kesejahteraan, pendapatan masyarakat, prevalensi stunting, ketahanan pangan, kualitas lingkungan, kemiskinan).

**Disambiguator D-ID-4:** the `-nya` frame is level-neutral; the **object** decides. meningkatnya *pendapatan rumah tangga sasaran* → impact-leaning (or high outcome). meningkatnya *jumlah modul yang tersusun* → output. GoI documents routinely write outputs in `-nya` style (tersedianya dokumen perencanaan) — `INDONESIA-SPECIFIC` stylistic fact.

### Required caveat — why prefix rules must never be absolute

The naive rules `me- → Activity`, `ter- → Output`, `-nya → Impact`, `angka → Output` fail because Indonesian voice morphology encodes **information structure (which participant is topical)**, not **causal level**. Level lives in (agent × object-of-change × control), which any voice can express. ≥20 counterexamples:

| # | Text (ID) | Naive rule says | Correct | Why |
|---|---|---|---|---|
| 1 | Petani **me**nggunakan pencatatan biaya produksi | Activity (me-) | Outcome | Agent = beneficiary; behavior change |
| 2 | Masyarakat **me**manfaatkan layanan posyandu | Activity | Outcome | Beneficiary uptake |
| 3 | Koperasi **me**ngelola dana bergulir secara mandiri | Activity | Outcome | Institutional practice change |
| 4 | Pemerintah desa **me**ngalokasikan APBDes untuk sanitasi | Activity | Outcome | External institution's decision (no project control) |
| 5 | Kader **me**lakukan kunjungan rumah rutin pasca proyek | Activity | Outcome | Sustained practice by trained target group |
| 6 | **Ter**bangunnya kepercayaan masyarakat terhadap koperasi | Output (ter-) | Outcome | Relational/attitudinal state, not deliverable |
| 7 | **Ter**wujudnya ketahanan pangan rumah tangga | Output | Impact | Long-term condition |
| 8 | **Ter**capainya kepatuhan pelaporan 90% oleh mitra | Output | Outcome | Compliance = behavior of others |
| 9 | **Ter**jadinya penurunan prevalensi stunting | Output | Impact | Population statistic |
| 10 | Anggaran pelatihan **ter**serap 100% | Output | Input/process metric | Absorption ≠ result |
| 11 | Meningkat**nya** jumlah modul yang disusun | Impact (-nya) | Output | Object = deliverable count |
| 12 | Tersedia**nya** akses pasar yang lebih luas | Output (tersedia) | Outcome | "Akses" is relational; depends on buyer/market behavior |
| 13 | Meningkat**nya** kehadiran peserta pelatihan | Impact | Process/activity metric | Attendance measures delivery, not change |
| 14 | Terlaksana**nya** 12 sesi pendampingan | Impact/Output | Activity (completion) | Completion of work ≠ deliverable benefit; process milestone |
| 15 | Meningkat**nya** kapasitas 30 fasilitator (lulus uji) | Impact | Output | Trained/certified persons = classic output (OECD-DAC: outputs may include capacity changes directly delivered) |
| 16 | 300 petani dilatih | Output (angka) | Output — but **60% petani menerapkan** also has angka → Outcome | Numbers are level-neutral (V-4) |
| 17 | Pendapatan petani naik 25% | Output (angka) | Impact/high outcome | Population magnitude |
| 18 | Pelaksanaan praktik pencatatan biaya **oleh petani** | Activity (pelaksanaan) | Outcome | Nominalized *beneficiary* behavior |
| 19 | Penerapan tata kelola koperasi sesuai AD/ART | Activity (penerapan) | Outcome | Adoption by institution |
| 20 | Pembangunan 5 sumur bor **selesai** | Activity (pembangunan) | Output | Completion state flips process→deliverable |
| 21 | Sistem informasi **ber**operasi penuh | Outcome (ber-) | Output | Operational status of deliverable |
| 22 | Masyarakat **ber**partisipasi dalam musyawarah desa | Output? | Outcome | Participation = behavior |
| 23 | Modul **di**susun dalam dua bahasa | Activity (di- passive of work) | Output (if asserting completion) / Activity (if plan) | Aspect decides; passive is level-neutral |
| 24 | Advokasi kebijakan **di**lakukan di 3 kabupaten | Output? | Activity | Work performed, passive voice |

`AMBIGUOUS / REQUIRES SEMANTIC REVIEW` worked examples (from the brief):

- *Meningkatnya jumlah modul yang disusun* → Output (object = deliverable count), competing Impact by frame; confidence gap small only if object unclear.
- *Pelaksanaan praktik pencatatan biaya oleh petani* → Outcome (agent = petani), competing Activity (nominalization); `oleh petani` resolves it.
- *Penerapan tata kelola koperasi* → Outcome, competing Activity; if agent unstated, route to semantic review.
- *Terbangunnya kepercayaan masyarakat* → Outcome, competing Output (ter-) and Impact (if societal trust at scale).
- *Masyarakat menggunakan layanan kesehatan* → Outcome (clean).
- *Tersedianya akses pasar yang lebih luas* → Outcome, competing Output (tersedia); "akses pasar" requires market counterparties.

---

## English Language Pack

Same principle: signals, not verdicts. `HEURISTIC ONLY` unless noted.

### Activity signals
conduct, organize, organise, develop, design, produce, procure, distribute, install, establish, train, facilitate, mentor, survey, map, monitor, evaluate, coordinate, advocate, provide, deliver, implement, carry out, hold (sessions), recruit, pilot, roll out, disseminate, draft, translate, print.
**Form cue:** infinitive/imperative/base-form verb with project as agent ("Conduct 12 training sessions") — strong activity signal. EC PCM writes activities in base verb form. `DONOR-SPECIFIC` style.

### Output signals
produced, developed, established, installed, trained, certified, published, delivered, completed, available, operational, functional, approved, adopted (of a *document* by the project side), launched, constructed, rehabilitated, in place, ready for use.
**Form cue:** past-participle/resultative with deliverable subject ("Rural roads constructed in the southern districts") — ADB explicitly instructs outputs be phrased in past tense with a completion word. `DONOR-SPECIFIC` (ADB), useful signal generally.

### Outcome signals
use, apply, adopt (of a *practice* by target group), access, participate, comply, practice, improve/increase/reduce **when subject = target group's performance/behavior**, manage, make decisions using, benefit from, maintain, respond, integrate, continue (a practice), report (regularly), enrol, retain, uptake, utilization.
**Form cue:** present-tense clause whose subject is the target group/institution; comparative adverbs (more, better, regularly, independently).

### Impact signals
improved, increased, reduced, strengthened, enhanced, sustained, more resilient, more inclusive, more equitable, more prosperous, less vulnerable — **with population/system-level subject** (household income, food security, child mortality, emissions, poverty incidence).
**Form cue:** DFID/FCDO impact statements are noun-phrase visions ("Improved food security for smallholder households in X") — the participle+population frame.

### English grammar risks

- **Infinitive purpose statements** ("To improve farmer incomes"): infinitive marks *intent*, not level; "to improve" can head an outcome or impact. Strip "to" and classify the proposition.
- **Gerunds** ("Improving access to finance"): gerund nominalizes either work (activity) or change (outcome/impact). Level-neutral.
- **Active vs passive**: passive is level-neutral in English exactly as `di-` is in Indonesian ("Training was conducted" = activity; "Modules were produced" = output).
- **Result participles** (trained, established, adopted): completion signal, but *whose* state completes decides level ("policy adopted by ministry" = outcome — external actor's decision).
- **Nominalization** (provision, establishment, adoption, implementation, utilization): hides agent and aspect; the classic ambiguity generator. Always recover agent.
- **State-of-being** ("System is operational" = output; "Cooperative is financially viable" = outcome/impact).
- **Change-of-state** ("X increases/decreases") — object decides level.
- **Ambiguous lexemes:** establish (project establishes a center = output; ministry establishes a policy = outcome), implement (project implements activities = activity; clinic implements protocol = outcome), improve/increase/strengthen (level set by object), develop (produce vs mature), access (deliverable connection vs realized use), adoption (of deliverable by project vs of practice by target group).

### ≥20 English counterexamples (verb list / passive voice insufficient)

| # | Text (EN) | Naive rule says | Correct | Why |
|---|---|---|---|---|
| 1 | Farmers use climate-resilient seeds | Activity (verb "use"? no—outcome list) but naive activity-verb reading of present simple | Outcome | Agent = target group |
| 2 | The ministry adopts the new curriculum | Output ("adopted" list) | Outcome | External institution's decision |
| 3 | 500 teachers trained | Outcome? ("trained" people changed) | Output | Direct deliverable of project work |
| 4 | Teachers apply active-learning methods in class | Activity ("apply") | Outcome | Behavior of target group |
| 5 | The project applies a gender-transformative approach | Outcome ("apply") | Activity/approach | Agent = project; and "approach" isn't a level |
| 6 | Health centers are equipped with cold-chain units | Passive → activity? | Output | Completion of deliverable |
| 7 | The report was disseminated to 40 stakeholders | Passive → output? | Activity | Dissemination is work performed |
| 8 | Community water committees are established | Output ("established") | Output — but "committees **function** monthly" → Outcome | Existence vs functioning |
| 9 | Improved irrigation infrastructure | Impact ("improved") | Output | Object = physical deliverable |
| 10 | Improved household food security | Output? (parallel form to #9) | Impact | Object = population condition |
| 11 | Increased number of training modules available | Impact ("increased") | Output | Deliverable count |
| 12 | Increased loan repayment rates among members | Output (number) | Outcome | Performance behavior of target group |
| 13 | To conduct a baseline survey | Purpose statement → outcome? | Activity | Infinitive of work |
| 14 | To reduce child stunting in District X | Activity (infinitive)? | Impact | Proposition is population change |
| 15 | Provision of psychosocial support to 200 children | Nominalization → output? | Activity (service delivery work) / Output if framed "200 children received support" | Aspect & framing |
| 16 | Adoption of the SOP by the project team | Outcome ("adoption") | Activity/internal process | Agent = project |
| 17 | The app is launched | Output ("launched") | Output — but "10,000 users actively use the app" → Outcome | Launch ≠ use |
| 18 | Women participate in village planning forums | Activity (verb) | Outcome | Participation behavior |
| 19 | The project participates in the district WASH cluster | Outcome ("participate") | Activity (coordination work) | Agent = project |
| 20 | Access roads constructed → markets accessed by farmers | Both "access" | Output → Outcome | Deliverable vs realized use |
| 21 | Strengthened referral system operational across 5 puskesmas | Impact ("strengthened") | Outcome (institutional functioning) | System behavior, not population condition |
| 22 | Policy brief published | Outcome ("published"→adopted?) | Output | Publication is deliverable; *policy changed* would be outcome |
| 23 | Sustained decrease in open defecation | Output (number-ish)? | Impact | Population behavior at scale, long-term |
| 24 | Enumerators trained and deployed | Output ("trained") | Activity/process | Internal project staffing, not benefit to target group |

**Rule V-5 (`STRUCTURAL RULE`):** counterexamples #16/#19/#24 generalize: capacity or actions of the **project's own staff/systems** are never outputs/outcomes; they are activities or inputs. Outputs/outcomes concern target groups and deliverables to them.

---

## Impact/Goal Guardrails

- I-1 (`DETERMINISTIC`): exactly one impact per LFA (MVP scope). >1 → WARNING `MULTIPLE_IMPACTS`.
- I-2 (`SEMANTIC`): impact must be *contribution-framed*; flag attribution overclaim ("Proyek ini akan menghapus kemiskinan di Kabupaten X") → HIGH `IMPACT_ATTRIBUTION_OVERCLAIM`.
- I-3 (`HYBRID`): object must be population/system condition. Deliverable objects at impact level → HIGH `IMPACT_IS_OUTPUT`.
- I-4 (`LEXICAL`): id `-nya` change frames + population object; en participle + population object. Absence is only INFO.
- I-5 (`STRUCTURAL`): no activity verbs with project agent at this level → HIGH `IMPACT_IS_ACTIVITY`.

## Outcome/Purpose Guardrails

- O-1 (`STRUCTURAL`): control test V-3 must fail-for-control (i.e., requires external actors) — if fully project-controlled → likely output, WARNING `OUTCOME_LIKELY_OUTPUT`.
- O-2 (`SEMANTIC`): must name **who changes** (target group/institution). Missing changer → WARNING `OUTCOME_NO_ACTOR`.
- O-3 (`DETERMINISTIC`): EC-classic export profile: 1 purpose only → INFO if >1.
- O-4 (`HYBRID`): chained behaviors in one statement ("petani mengadopsi dan pendapatannya meningkat") → suggest split into intermediate_outcome + outcome/impact, WARNING `COMPOUND_OUTCOME`.
- O-5 (`SEMANTIC`): outcome must be plausibly reachable from listed outputs (vertical sufficiency) → AI review only.

## Output Guardrails

- P-1 (`STRUCTURAL`): control test must pass (project can guarantee it barring force majeure).
- P-2 (`HYBRID`): behavior/use language at output level → HIGH `OUTPUT_LIKELY_OUTCOME`.
- P-3 (`DETERMINISTIC`): each output linked to ≥1 activity and ≥1 indicator; orphan → WARNING `ORPHAN_OUTPUT`.
- P-4 (`LEXICAL`): pure process restatement of an activity ("Pelatihan dilaksanakan" as output) → WARNING `OUTPUT_RESTATES_ACTIVITY`; suggest completion/deliverable phrasing.
- P-5 (`DONOR-SPECIFIC` lint): ADB profile: past-tense completion phrasing; EC profile: results as achieved states.

## Activity Guardrails

- A-1 (`STRUCTURAL`): agent must be project/partner; beneficiary agent → HIGH `ACTIVITY_LIKELY_OUTCOME`.
- A-2 (`DETERMINISTIC`): each activity maps to exactly ≥1 output; unlinked → WARNING `ORPHAN_ACTIVITY`.
- A-3 (`HYBRID`): activity that merely restates its output ("Menyusun modul" → output "Modul tersusun" is fine; output "Penyusunan modul" is not) — see P-4.
- A-4 (`HEURISTIC`): too-broad activity (multiple distinct interventions joined by "dan") → INFO `ACTIVITY_TOO_BROAD`, suggest split for WBS.

## WBS Work Package, Task, and Milestone Guardrails

Definitions (`PREFERRED IMPACTORY CONVENTION`, aligned with generic PM practice):
**Activity** = meaningful intervention producing an output. **Work Package** = group of related work with a defined deliverable. **Task** = assignable unit with owner, duration, dependency, completion criterion. **Milestone** = zero-duration checkpoint (state/date).

Detections (all non-blocking):

| Code | Condition | Severity | Bilingual example (wrong → right) |
|---|---|---|---|
| `WBS_ACTIVITY_TOO_BROAD` | activity decomposes into >~8 heterogeneous tasks / >1 deliverable type | INFO | "Meningkatkan kapasitas koperasi" → split: pelatihan; pendampingan; audit |
| `WBS_TASK_TOO_BIG` | task duration > iteration (e.g., >10 hari kerja) or multiple owners | WARNING | "Selenggarakan seluruh pelatihan" → per-batch tasks |
| `WBS_TASK_TOO_SMALL` | trivial steps polluting plan (kirim email undangan sebagai task terpisah ×20) | INFO | merge into checklist |
| `WBS_MILESTONE_IS_WORK` | milestone phrased as verb of work | WARNING | "Menyusun laporan baseline" → "Laporan baseline disetujui (30 Sep)" / "Baseline report approved (30 Sep)" |
| `WBS_WP_NO_DELIVERABLE` | work package lacks deliverable noun | WARNING | "Koordinasi umum" → "Paket kerja: Laporan koordinasi kuartalan" |
| `WBS_ACTIVITY_NO_OUTPUT_LINK` | activity not linked to output | WARNING | link or drop |
| `WBS_TASK_NO_OWNER` / `WBS_TASK_NO_DONE_CRITERION` | missing fields | INFO/WARNING | add owner; add "selesai jika…" |
| `WBS_OUTPUT_IS_TASK` | "output" is actually an internal step ("TOR finalized") | WARNING | demote to task under a WP |
| `WBS_ACTIVITY_RESTATES_OUTPUT` | mirror wording both sides | INFO | rephrase one side |

Milestone test (`DETERMINISTIC`): has date/state, zero duration, no owner-effort verb. Task test: owner + duration + done-criterion present (field checks).

---

## Indicator Language Standard

### Result vs Indicator vs Target — the contract

| Element | Is | Is not |
|---|---|---|
| Result statement | The change/deliverable itself ("Petani menerapkan pencatatan biaya") | A number |
| Indicator | Neutral variable that evidences it ("% petani sasaran yang menerapkan pencatatan biaya sesuai SOP") | The change statement; a target |
| Unit of measure | %, jumlah orang, Rp, ha, skor | — |
| Baseline | Value at start (12%, 2026) | "belum ada data" without plan |
| Target | Committed value+date (60%, Q4 2027) | Part of the indicator string |
| Milestone (indicator sense) | Interim target point | Work step |
| Current value | Latest measured | — |
| Data source / method / frequency / disaggregation / responsible | MoV block | "dokumentasi" |

**Neutrality decision.** Donor practice splits: DFID/FCDO instructs indicators state only *what will be measured* — no baseline/target elements embedded (`DONOR-SPECIFIC`, cited). ADB requires indicator + baseline + target as separate DMF elements aligned to one result each. Some GoI IKU practice embeds direction ("meningkatnya…") in the indicator title (`INDONESIA-SPECIFIC`). **`PREFERRED IMPACTORY CONVENTION`: store neutral indicator + separate direction, baseline, target fields.** Export profiles may render direction into the label where a donor expects it. Rationale: neutral storage is losslessly convertible to every donor format; direction-embedded storage is not.

### Indicator formula (bilingual)

```text
Measure + Population/Object + Qualification/Condition [+ disaggregation note]
ID: Persentase petani sasaran yang menggunakan pencatatan biaya produksi sesuai SOP
EN: Percentage of target farmers using production-cost records in accordance with the SOP
```

Measure lexicon — ID: jumlah, persentase, proporsi, rasio, tingkat, rata-rata, median, indeks, skor, nilai, volume, luas, frekuensi, durasi, waktu rata-rata, persentase perubahan. EN: number, percentage, proportion, ratio, rate, average, median, index, score, value, volume, area, frequency, duration, average time, percentage change. (`DETERMINISTIC` presence check: indicator should start with or contain a measure term; absence → WARNING `INDICATOR_NO_MEASURE`.)

### Indicator red flags (finding codes, all non-blocking)

| Code | Trigger | Sev | Fix pattern |
|---|---|---|---|
| `IND_VAGUE_TERM` | active, improved, functional, quality, empowered, successful, sustainable / aktif, berkualitas, berdaya, layak — undefined | WARNING | add operational definition or rubric |
| `IND_COMPOUND` | two variables joined ("jumlah dan kepuasan peserta") | WARNING | split |
| `IND_NO_UNIT` | no measure/unit | WARNING | apply formula |
| `IND_IS_RESULT` | reads as change statement, no measure ("Petani lebih sejahtera") | HIGH | derive measure |
| `IND_CONTAINS_TARGET` | number+date embedded ("60% petani pada 2027 …") | WARNING | strip to fields |
| `IND_IS_ACTIVITY` | work phrasing ("melaksanakan 12 pelatihan") | HIGH | measure the deliverable/change |
| `IND_VANITY` | reach/likes/downloads at outcome level | INFO | pair with use/benefit metric |
| `IND_ATTRIBUTION_OVERCLAIM` | population statistic claimed at output level | WARNING | move level or reframe |
| `IND_NO_FEASIBLE_SOURCE` | no plausible MoV linked | WARNING | require source |
| `IND_DENOMINATOR_AMBIGUOUS` | % without defined denominator | WARNING | define population |
| `IND_NO_DISAGGREGATION` | people-indicator without sex/age/disability split (donor profiles requiring it) | INFO | add disaggregation |
| `IND_NO_TIMEFRAME` / `IND_NO_BASELINE` | fields empty | INFO/WARNING | fill or plan baseline study |
| `IND_DOUBLE_COUNT` | same person counted across overlapping indicators | INFO | define counting rule |
| `IND_WRONG_LEVEL` | indicator measures adjacent level (ADB: don't measure next/previous level) | WARNING | realign |

## Baseline and Target Standard

`DETERMINISTIC` field checks: baseline {value|"TBD + study planned (date)"} required; target requires value + date + same unit as baseline; milestone targets optional per year. `SEMANTIC`: implausible leap baseline→target (e.g., 5%→95% in 12 months) → INFO `TARGET_AMBITION_CHECK` (AI/human).

## Means of Verification Standard

MoV = **source + collection method + frequency + responsible party** (+ verification/audit trail, limitations, privacy note where personal data). Missing any core element → WARNING `MOV_INCOMPLETE`. Generic single-word MoV (dokumentasi, laporan, survei, database, foto, records) without the four elements → WARNING `MOV_TOO_GENERIC`.

Source lexicon (bilingual): daftar hadir/attendance records; pre-post test; log transaksi/transaction logs; survei rumah tangga/household survey; wawancara/interviews; catatan administrasi/administrative records; statistik pemerintah (BPS)/government statistics; observasi terstruktur/structured observation; asesmen/assessments; log sistem/system logs; bukti geospasial/geospatial evidence; catatan keuangan/financial records; dokumen kebijakan/policy documents; data manajemen kasus/case-management data.

Privacy flag (`DETERMINISTIC` keyword class): case-management, health, child, GBV data sources → INFO `MOV_PRIVACY_REVIEW` (data protection note required). Child-protection MoV never names individual children in public artifacts.

## Assumption, Risk, and Mitigation Standard

Definitions (`CANONICAL`-aligned; EC/ECHO: assumptions = external factors outside project control that could affect progress; ADB: include the critical assumption **or** the corresponding risk, not both):

- **Assumption:** external condition, positively stated, needed for the causal link to hold, not fully project-controlled. *"Harga pasar komoditas tetap stabil."*
- **Risk:** uncertain event/condition that could impede results, threat-stated. *"Kekeringan berkepanjangan menggagalkan musim tanam."*
- **Mitigation:** project's own action reducing likelihood/impact. *"Menyediakan pelatihan irigasi hemat air dan varietas tahan kering."*

Rules: ASM-1 (`STRUCTURAL`) assumption with project as agent → HIGH `ASSUMPTION_IS_ACTIVITY`. ASM-2 (`LEXICAL`) negative framing at assumption slot → WARNING `ASSUMPTION_NEGATIVE_FRAMING` (convert risk↔assumption). ASM-3 (`HYBRID`) same content in both columns → INFO `ASSUMPTION_RISK_DUPLICATE` (keep one, ADB rule). ASM-4 mitigation without agency ("semoga tidak terjadi") → WARNING. ASM-5 assumption that is 100% project-controllable → WARNING `ASSUMPTION_CONTROLLABLE` (it's a task). ASM-6 "killer assumption" (unlikely to hold) → HIGH `KILLER_ASSUMPTION` → redesign advice.

15 bilingual correct/incorrect examples:

| # | Text | Labeled as | Verdict |
|---|---|---|---|
| 1 | Pemerintah daerah tetap mendukung program (ID) | Assumption | ✔ correct |
| 2 | Local government continues co-funding (EN) | Assumption | ✔ |
| 3 | Melakukan advokasi ke pemda | Assumption | ✘ → Activity |
| 4 | Banjir besar melanda lokasi proyek | Assumption | ✘ negative → Risk |
| 5 | No major flooding occurs during construction | Assumption | ✔ (positive twin of #4) |
| 6 | Petani mungkin menjual aset produktif saat krisis | Risk | ✔ |
| 7 | Menyusun SOP pengaduan | Risk | ✘ → Activity/Mitigation depending on link |
| 8 | Turnover kader tinggi | Risk | ✔ |
| 9 | Kader tetap aktif selama proyek | Risk | ✘ positive → Assumption |
| 10 | Provide refresher training every quarter | Mitigation (for #8) | ✔ |
| 11 | Kepercayaan masyarakat meningkat | Assumption | ✘ → Outcome (result, not external condition) |
| 12 | Exchange-rate volatility raises equipment costs | Risk | ✔ |
| 13 | Kurs stabil sepanjang proyek | Mitigation | ✘ → Assumption (project can't act a currency stable) |
| 14 | Secure fixed-price procurement contracts early | Mitigation (for #12) | ✔ |
| 15 | Masyarakat bersedia berpartisipasi dalam kegiatan | Assumption | ✔ at activity→output link; if it *is* the outcome itself → ✘ `ASSUMPTION_IS_RESULT` |

## Beneficiary and Stakeholder Standard

Beneficiary ⊂ Target group ⊂ Stakeholder. Rules: B-1 counting rule required (direct vs indirect; households vs individuals) → INFO if absent. B-2 intermediaries (guru, kader, penyuluh) are target groups, not final beneficiaries — outcome statements should trace to final beneficiaries at impact level → INFO `INTERMEDIARY_AS_BENEFICIARY`. B-3 "stakeholder" used where a specific changer is needed (O-2) → WARNING.

---

## Cross-Level Confusion Matrix

Columns: distinction · ID signals · EN signals · false positives · finding code (sev) · correction.

| Pair | Semantic distinction | ID signals | EN signals | Common false positives | Code (Sev) | Correction |
|---|---|---|---|---|---|---|
| Goal→Outcome | Long-term population condition vs target-group change project can influence in-period | objek populasi luas + jangka panjang vs kelompok sasaran spesifik | national/sector nouns vs named target group | Ambitious outcome ≠ goal | `GOAL_LIKELY_OUTCOME` (WARNING) | demote; add true impact above |
| Outcome→Goal | Reverse: outcome slot holding poverty/stunting-scale change | prevalensi, kesejahteraan, kemiskinan at outcome slot | mortality, poverty, GDP at outcome | Local-scale income change can be legit high outcome | `OUTCOME_LIKELY_GOAL` (WARNING) | promote or scope to target group |
| Outcome→Output | Change-in-others vs deliverable; control test V-3 | menggunakan/menerapkan vs tersedia/tersusun | use/apply vs produced/available | "menyelesaikan pelatihan" (completing training = output) | `OUTCOME_LIKELY_OUTPUT` (WARNING) | move down; write use-statement above |
| Output→Outcome | Deliverable slot holding behavior/use | perilaku/pemanfaatan wording di baris output | adoption/uptake at output row | policy *adopted by ministry* is outcome even if drafted by project | `OUTPUT_LIKELY_OUTCOME` (HIGH) | split deliverable vs use |
| Output→Activity | Completed thing vs work | pelaksanaan/penyelenggaraan noun at output | conduct/organize phrasing at output | pelatihan (event vs delivered package) | `OUTPUT_RESTATES_ACTIVITY` (WARNING) | completion phrasing + deliverable noun |
| Activity→Output | Work slot holding a deliverable state | "tersusunnya modul" listed as kegiatan | "Module completed" as activity | plan-stage passives | `ACTIVITY_IS_OUTPUT` (INFO) | move up / verbify |
| Result→Indicator | Statement of change vs neutral measure | kalimat perubahan tanpa ukuran di kolom indikator | sentence w/o measure in indicator col | qualitative indicators are fine if rubric'd | `IND_IS_RESULT` (HIGH) | apply formula |
| Indicator→Target | Variable vs committed value+date | angka+tahun tertanam | "60% by 2027" inside indicator | milestone-style indicators in some GoI formats | `IND_CONTAINS_TARGET` (WARNING) | split fields |
| Target→Milestone (WBS) | Value point vs schedule checkpoint | target tahunan vs tonggak jadwal | annual target vs schedule gate | interim targets legitimately called milestones (indicator sense) | `TARGET_MILESTONE_CONFLATION` (INFO) | tag which sense |
| Activity→Task | Intervention producing output vs assignable unit | kegiatan besar di daftar task | umbrella verbs in task list | small projects legitimately flatten | `ACTIVITY_TASK_GRANULARITY` (INFO) | decompose |
| Task→Milestone | Work w/ duration vs zero-duration state | verba kerja pada milestone | verb-of-work milestone | approval tasks vs approval milestones | `WBS_MILESTONE_IS_WORK` (WARNING) | state+date phrasing |
| Assumption→Risk | Positive external condition vs threat event | framing negatif di kolom asumsi | negative framing in assumption col | one twin allowed, not both (ADB) | `ASSUMPTION_NEGATIVE_FRAMING` (WARNING) | flip framing |
| Risk→Mitigation | Threat vs project counter-action | tindakan proyek di kolom risiko | project verb in risk col | contingency budget lines | `RISK_IS_MITIGATION` (WARNING) | move to mitigation |
| Strategy→Activity | How-orientation vs discrete intervention | "pendekatan", "strategi" as kegiatan | "approach", "strategy" as activity | named methodologies (SBCC) can head real activities | `STRATEGY_AS_ACTIVITY` (INFO) | decompose to interventions |
| Objective→Result | Aspiration wording vs classified level | "tujuan" tanpa level | "objective" node unresolved | — | `GENERIC_LEVEL_LABEL` (WARNING) | force level resolution |
| Beneficiary→Stakeholder | Benefit-receiver vs any interested party | pemangku kepentingan sebagai penerima manfaat | donors/government listed as beneficiaries | intermediaries (see B-2) | `STAKEHOLDER_AS_BENEFICIARY` (INFO) | reclassify |

---

## Deterministic Rule Catalogue

Run locally, zero AI cost, always-on:

1. Structure: exactly 1 impact; ≥1 outcome; each outcome ≥1 output; each output ≥1 activity & ≥1 indicator; each indicator ≥1 MoV. (`MISSING_LEVEL`, `ORPHAN_*`)
2. Field presence: baseline, target(value+date+unit), MoV 4 elements, task owner/duration/done-criterion, milestone zero-duration.
3. Pattern checks: measure-term presence in indicator; number+year inside indicator string (`IND_CONTAINS_TARGET`); % without denominator phrase (`sasaran|target|dari total|of`) → denominator flag; generic-MoV single-word list; vague-term dictionary hit (`IND_VAGUE_TERM`); privacy keyword class.
4. Cross-links: duplicate text across assumption/risk; mirror wording activity↔output (similarity ≥0.9 string ratio) → restatement flags.
5. Export-profile lints: EC-classic single purpose; ADB output past-tense heuristic (participle/`ter-` presence) — INFO only.

## Semantic Review Rule Catalogue (Azure-eligible only)

Causal sufficiency (outputs→outcome plausibility); achievability/ambition; relevance to problem statement; attribution overclaim judgment; ambiguous level classification (margin rule); compound-outcome split proposals; killer-assumption assessment; suggested rewrites (always returning both a corrected statement and the reason). Human review required: final sign-off on donor submission; any CRITICAL data-integrity finding; contested classifications after AI review.

## Rule Allocation (M)

| Check | Class |
|---|---|
| missing level / missing indicator / numeric target presence / timeframe pattern | DETERMINISTIC |
| Indonesian affix & lexicon hits; English verb-form & lexicon hits | MORPHOLOGICAL / LEXICAL SIGNAL |
| matrix completeness, links, single-purpose | STRUCTURAL RULE |
| ambition leap, outlier target vs baseline distribution | STATISTICAL HEURISTIC |
| output/activity & output/outcome suspicion | HYBRID (signals → margin → AI) |
| causal sufficiency, achievability, relevance, attribution | SEMANTIC AI REVIEW |
| donor submission sign-off | HUMAN REVIEW REQUIRED |

---

## Confidence Scoring Model

Per statement, per candidate level: weighted evidence sum → per-level confidence (`goalConfidence`, `outcomeConfidence`, `outputConfidence`, `activityConfidence`; analogues for indicator/assumption/risk typing).

**Evaluation of the proposed formula** (Semantic role 40 / Object of change 20 / Control 15 / Linguistic pattern 15 / Quantification 10): direction is right — semantics dominate, surface patterns are minority evidence. Two amendments (`PREFERRED IMPACTORY CONVENTION`):

1. Merge *semantic role* and *object of change* conceptually but keep separate features; **raise Control to 20** and **drop Quantification to 5**, because (a) the control test V-3 is the single most decisive resolver of the highest-volume confusion (output↔outcome), and (b) quantification is proven level-neutral (V-4) — 10% overweights it.

```text
Final v1 weights:
Semantic role (agent+predicate class)  40%
Object of change                        20%
Degree of project control               20%
Linguistic pattern (lexicon+morphology) 15%
Quantification/context                   5%
```

2. Bands (adopted as proposed, to be calibrated on the labeled set):

```text
0.00–0.39 Low evidence · 0.40–0.59 Ambiguous · 0.60–0.79 Probable · 0.80–1.00 Strong
Margin rule: top1 − top2 < 0.15 → status AMBIGUOUS, eligible for semantic AI review.
```

Assessment: 0.15 margin is a reasonable starting point but **must be tuned against the routed-to-AI ≤20% budget**; if routing exceeds budget, tighten to 0.12; if precision suffers, widen to 0.18. Ship as config, not constant.

## LFA Quality Score Alignment

Proposed 15/25/20/15/15/5/5. **Critique:**

- **Indicator Quality vs SMART:** heavy overlap (Specific≈vagueness, Measurable≈measure-term, Time-bound≈timeframe). Keeping both double-counts. **Fix:** fold SMART into Indicator Quality as sub-criteria; reallocate.
- **Classification vs Structure:** distinct (grid completeness vs level correctness) — keep both.
- **WBS vs Budget Readiness:** budget readiness depends on WBS clarity; partial overlap acceptable at 5pt weight.
- **Indicator Quality vs MEAL Readiness:** MEAL = MoV completeness + baseline plan + frequency; keep separate but define MEAL strictly on MoV/baseline fields to avoid overlap.

**Final recommended formula (one decision, per brief):**

```text
Structure & Completeness      15
Classification Correctness    30
Indicator Quality (incl. SMART sub-criteria) 25
WBS Readiness                 15
Budget Readiness               5   (readiness ONLY — PMK/SBM compliance excluded)
MEAL Readiness                10
------------------------------------
TOTAL                        100
```

Per-dimension: deterministic sub-scores with penalties (each WARNING −x, HIGH −2x within dimension, floor 0, cap 100); Classification uses confidence-weighted correctness (findings at HIGH severity cap the dimension at 60 until resolved). Evidence requirement: every deduction cites a finding id. Deterministic except Classification (hybrid) and ambition checks. **Budget Compliance (PMK 32/2025 / SBM 2026 rates, procurement rules) is a separate module and never enters this score** — per brief, restated as hard rule Q-1.

## Non-Blocking Finding Model

Schema (design contract, not code):

```json
{
  "code": "OUTPUT_LIKELY_OUTCOME",
  "severity": "high",
  "confidence": 0.87,
  "language": "id",
  "level": "output",
  "message": "Luaran kemungkinan merupakan outcome.",
  "evidence": ["aktif menjual", "secara rutin menggunakan"],
  "reason": "Pernyataan menggambarkan perubahan perilaku pengguna.",
  "suggestedAction": "Pisahkan deliverable dari perubahan pengguna.",
  "suggestedOutput": "Pelatihan pemasaran digital untuk 50 UMKM terselesaikan",
  "suggestedOutcome": "50 UMKM sasaran aktif menjual melalui kanal digital",
  "requiresAiReview": false
}
```

Severity policy: **INFO** = style/enrichment, no quality impact beyond hints. **WARNING** = likely misclassification or missing element; score deduction. **HIGH** = classification almost certainly wrong or indicator unusable; dimension cap. **CRITICAL** = reserved exclusively for data-integrity/security conditions that make materialization unsafe (e.g., org_id mismatch, injection in materialized fields) — the only blocking class. Everything else is advisory; user can always proceed ("Never A or B": guidance and autonomy).

---

## Sector Lexicons

All entries are **contextual signals** (`HEURISTIC ONLY`), never deterministic rules. Format per sector: actors/beneficiaries · activity terms · deliverables · behavioral outcomes · institutional outcomes · impact concepts · units · data sources · ambiguity trap.

1. **Livelihoods & MSMEs** — pelaku UMKM, pedagang / pelatihan kewirausahaan, pendampingan usaha, business coaching / rencana usaha, akses modal tersalurkan, marketplace onboarding / UMKM aktif menjual, mengadopsi pembukuan, using digital payments / koperasi/asosiasi berfungsi / peningkatan pendapatan, ketahanan ekonomi / Rp omzet, # usaha, % profit margin / catatan penjualan, laporan keuangan / **trap:** "onboarded" (output) vs "actively selling" (outcome).
2. **Agriculture & food security** — petani, kelompok tani, penyuluh / demplot, sekolah lapang, distribusi benih / demplot terbangun, benih terdistribusi / petani menerapkan GAP, adopsi varietas / gapoktan mengelola pascapanen / produktivitas, ketahanan pangan / ton/ha, % adopsi / ubinan, catatan usahatani / **trap:** "produksi meningkat" — outcome (farm performance) vs impact (regional food security).
3. **Climate & environment** — masyarakat pesisir, KTH / rehabilitasi mangrove, pelatihan pengelolaan sampah / bibit tertanam, bank sampah berdiri / warga memilah sampah, kelompok memelihara tanaman / perdes lingkungan diterapkan / emisi turun, ekosistem pulih / ha, tCO2e, % survival rate / citra satelit, log bank sampah / **trap:** "tertanam" (output) vs "survival & maintained" (outcome).
4. **Health & nutrition** — ibu balita, kader, puskesmas / kelas ibu, pelatihan kader, PMT / kader terlatih, alat antropometri tersedia / ibu mempraktikkan PMBA, balita rutin ditimbang / puskesmas menjalankan tata laksana gizi / stunting/prevalensi turun / %, per-1000 / e-PPGBM, register posyandu / **trap:** "terlayani" (output: received service) vs "menerapkan perilaku" (outcome).
5. **Education** — siswa, guru, sekolah / pelatihan guru, penyediaan buku / guru terlatih, perpustakaan berfungsi / guru menerapkan pembelajaran aktif, siswa hadir & tuntas / sekolah menerapkan MBS / literasi/numerasi meningkat / skor AKM, % kelulusan / rapor pendidikan, observasi kelas / **trap:** "trained teachers" (output) vs "teachers applying methods" (outcome).
6. **Child protection** — anak, pengasuh, PATBM / pelatihan pengasuhan, pembentukan mekanisme rujukan / SOP rujukan tersusun, PATBM terbentuk / pengasuh menerapkan disiplin positif, kasus dirujuk tepat / desa mengalokasikan dana perlindungan / kekerasan terhadap anak menurun / # kasus, % rujukan / case-management (privasi!), SIMFONI / **trap:** case counts rising can mean better reporting (outcome) not more violence.
7. **Gender equality** — perempuan, organisasi perempuan / pelatihan kepemimpinan, dialog gender / modul GEDSI tersusun / perempuan bersuara di musdes, mengelola usaha / kuota perempuan diterapkan lembaga / kesetaraan, GBV menurun / % perempuan, indeks / notulen musdes, survei / **trap:** attendance of women (process) vs voice/decision (outcome).
8. **Disability inclusion** — penyandang disabilitas, OPD / audit aksesibilitas, pelatihan inklusi / ramp terbangun, alat bantu terdistribusi / penyandang disabilitas mengakses layanan, bekerja / layanan menerapkan standar inklusif / partisipasi & kesejahteraan meningkat / #, % akses / observasi fasilitas, data disagregasi / **trap:** devices distributed (output) vs devices used daily (outcome).
9. **Humanitarian response** — penyintas, IDPs / distribusi NFI, cash transfer / bantuan terdistribusi, hunian darurat terbangun / penyintas memenuhi kebutuhan dasar, menggunakan cash sesuai rencana / cluster coordination berjalan / mortalitas/morbiditas dicegah / # KK, coverage % / PDM (post-distribution monitoring) / **trap:** distribution ≠ utilization — PDM measures the outcome.
10. **WASH** — warga, KPSPAMS / pembangunan sarana, pemicuan STBM / sumur/jamban terbangun / warga BAB di jamban, CTPS / KPSPAMS mengelola iuran / ODF, diare menurun / # SR, % akses / verifikasi ODF, uji kualitas air / **trap:** jamban terbangun (output) vs ODF (behavioral outcome, verified status).
11. **Governance** — pemdes, OPD, warga / pelatihan perencanaan, forum multipihak / perdes tersusun, sistem pengaduan terpasang / pemdes mempublikasikan APBDes, warga menggunakan kanal aduan / musrenbang partisipatif melembaga / akuntabilitas & layanan publik membaik / #, skor indeks / dokumen APBDes, log aduan / **trap:** "perdes disahkan" — output for the drafting project, outcome if project only advocated (control test).
12. **Digital transformation** — staf lembaga, pengguna / pengembangan sistem, pelatihan admin / aplikasi live, admin terlatih / staf menginput data rutin, lembaga memakai dashboard untuk keputusan / SOP digital diadopsi organisasi / efisiensi layanan, jangkauan / MAU, % uptime, waktu proses / system logs, analytics / **trap:** "launched" (output) vs "actively used" (outcome) — Impactory sendiri hidup di trap ini.
13. **Cooperative development** — anggota, pengurus koperasi / pelatihan tata kelola, penyusunan AD/ART / AD/ART tersusun, RAT terselenggara / koperasi menjalankan RAT rutin, anggota menabung aktif / koperasi memperoleh NIK/sertifikasi & mengelola unit usaha / kesejahteraan anggota meningkat / # anggota aktif, SHU, NPL / laporan RAT, pembukuan / **trap:** RAT terselenggara (output/event) vs RAT rutin tahunan mandiri (institutional outcome).
14. **Financial inclusion** — unbanked, kelompok simpan pinjam / literasi keuangan, agent banking setup / rekening dibuka, agen terlatih / nasabah menabung rutin, menggunakan kredit produktif / lembaga menerapkan client protection / ketahanan finansial rumah tangga / # rekening aktif ≠ dibuka, % NPL / core-banking logs / **trap:** accounts opened (output/vanity) vs accounts active 90-day (outcome).
15. **Social protection** — KPM, pendamping / verifikasi data, penyaluran bansos / data DTKS termutakhirkan, bansos tersalurkan / KPM memanfaatkan bansos untuk kebutuhan esensial, graduasi / pemda menjalankan mekanisme graduasi / kemiskinan menurun / # KPM, inclusion/exclusion error / SIKS-NG, PDM / **trap:** disbursed vs utilized vs graduated — three levels.
16. **Civil society strengthening** — OMS/CSO, jaringan / capacity building, ICI assessment, sub-granting / rencana penguatan tersusun, staf terlatih / OMS menerapkan SOP keuangan, memenangkan hibah baru / koalisi advokasi berfungsi / civic space & keberlanjutan OMS menguat / skor ICI, # hibah / dokumen organisasi, audit / **trap:** ICI score naik = outcome (capacity applied) hanya jika dimensi perilaku, bukan sekadar dokumen tersedia.
17. **Peacebuilding** — kelompok berkonflik, tokoh / dialog damai, pelatihan mediasi / forum damai terbentuk / pihak menggunakan mekanisme mediasi, insiden direspons damai / perjanjian damai dipatuhi / kohesi sosial menguat, insiden turun / # insiden, indeks kohesi / catatan insiden, survei persepsi / **trap:** forum terbentuk (output) vs forum dipakai saat konflik nyata (outcome).
18. **Disaster risk reduction** — warga rawan bencana, destana / penyusunan renkon, simulasi / renkon tersusun, EWS terpasang / warga mengevakuasi sesuai prosedur saat simulasi/kejadian, desa menganggarkan PRB / destana aktif melembaga / korban & kerugian menurun / # desa, waktu evakuasi / laporan simulasi, data BNPB / **trap:** EWS terpasang (output) vs warga merespons alarm (outcome).
19. **Employment & skills** — pencari kerja, pemuda / pelatihan vokasi, job matching / peserta tersertifikasi / alumni bekerja/berwirausaha dalam 6 bulan, retained 12 bulan / BLK menerapkan kurikulum industri / pengangguran muda menurun, pendapatan naik / % placement, retention / tracer study, kontrak kerja / **trap:** certified (output) vs employed (outcome) vs employed-because-of-training (attribution — needs tracer design).
20. **Research & policy advocacy** — peneliti, policymakers / riset, policy dialogue, penyusunan policy brief / brief terpublikasi, naskah akademik tersusun / policymaker mengutip/menggunakan bukti, regulasi mengadopsi rekomendasi / mekanisme konsultasi publik melembaga / kebijakan berbasis bukti, kondisi populasi membaik / # sitasi kebijakan, # regulasi / dokumen kebijakan, risalah / **trap:** brief published (output) vs recommendation adopted in regulation (outcome, external actor) — the control test in its purest form.

---

## Bilingual Gold Examples (200)

Test-fixture ready; each line = one correctly-leveled statement.

### Goal/Impact — Bahasa Indonesia (25)
1. Meningkatnya kesejahteraan ekonomi rumah tangga petani di Kabupaten Garut.
2. Menurunnya prevalensi stunting pada balita di 10 desa sasaran.
3. Terwujudnya ketahanan pangan rumah tangga rentan di wilayah pesisir.
4. Berkurangnya angka kemiskinan ekstrem di kecamatan sasaran.
5. Membaiknya kualitas lingkungan pesisir melalui pulihnya ekosistem mangrove.
6. Menguatnya kohesi sosial antarkelompok masyarakat pasca konflik.
7. Menurunnya angka kekerasan terhadap anak di tingkat kabupaten.
8. Meningkatnya inklusi keuangan masyarakat pedesaan.
9. Terpenuhinya hak pendidikan dasar bagi anak-anak di daerah 3T.
10. Berkurangnya emisi gas rumah kaca dari sektor persampahan kota.
11. Meningkatnya ketahanan masyarakat terhadap bencana hidrometeorologi.
12. Membaiknya derajat kesehatan ibu dan anak di wilayah program.
13. Terciptanya lapangan kerja yang layak bagi pemuda perdesaan.
14. Menurunnya angka putus sekolah pada jenjang SMP di kabupaten sasaran.
15. Meningkatnya kemandirian ekonomi penyandang disabilitas.
16. Terjaganya sumber daya air bersih bagi generasi mendatang.
17. Menguatnya tata kelola pemerintahan desa yang akuntabel dan partisipatif.
18. Meningkatnya kesetaraan gender dalam pengambilan keputusan publik.
19. Berkurangnya kerentanan penghidupan nelayan skala kecil.
20. Terwujudnya sistem pangan lokal yang berkelanjutan.
21. Menurunnya angka pernikahan anak di wilayah intervensi.
22. Meningkatnya kualitas hidup lansia di komunitas dampingan.
23. Membaiknya akses masyarakat miskin terhadap keadilan (level sistem).
24. Menguatnya ekosistem masyarakat sipil yang berkelanjutan di Indonesia.
25. Menurunnya angka kecelakaan kerja di sektor konstruksi informal.

### Goal/Impact — English (25)
26. Improved economic wellbeing of smallholder farming households in the target districts.
27. Reduced prevalence of child stunting in ten target villages.
28. Strengthened food security among vulnerable coastal households.
29. Reduced extreme poverty in the target sub-districts.
30. Restored coastal ecosystem health through mangrove recovery.
31. Strengthened social cohesion among post-conflict communities.
32. Reduced violence against children at district level.
33. Increased financial inclusion of rural communities.
34. Fulfilled basic education rights for children in remote areas.
35. Reduced greenhouse-gas emissions from the municipal waste sector.
36. More resilient communities against hydrometeorological disasters.
37. Improved maternal and child health status in the program area.
38. Decent employment created for rural youth.
39. Reduced junior-secondary dropout rates in the target district.
40. Increased economic independence of persons with disabilities.
41. Sustained access to clean water resources for future generations.
42. More accountable and participatory village governance.
43. Greater gender equality in public decision-making.
44. Reduced livelihood vulnerability of small-scale fishers.
45. A more sustainable local food system.
46. Reduced child-marriage rates in the intervention area.
47. Improved quality of life for older persons in assisted communities.
48. Improved access to justice for the poor at system level.
49. A stronger, more sustainable civil-society ecosystem in Indonesia.
50. Reduced occupational accidents in informal construction.

### Outcome — Bahasa Indonesia (25)
51. Petani sasaran menerapkan praktik pertanian ramah iklim di lahannya.
52. UMKM dampingan aktif menjual produk melalui kanal digital.
53. Ibu balita mempraktikkan pemberian makan bayi dan anak sesuai anjuran.
54. Koperasi menjalankan Rapat Anggota Tahunan secara rutin dan mandiri.
55. Warga desa menggunakan jamban sehat secara konsisten.
56. Guru menerapkan metode pembelajaran aktif di kelas.
57. Kader posyandu melakukan pemantauan pertumbuhan setiap bulan tanpa pendampingan.
58. Pemerintah desa mengalokasikan APBDes untuk kegiatan pengurangan risiko bencana.
59. Kelompok perempuan menyuarakan usulan dalam musyawarah perencanaan desa.
60. Penyandang disabilitas mengakses layanan kesehatan dasar di puskesmas.
61. Rumah tangga sasaran menabung secara rutin di lembaga keuangan formal.
62. Petani menggunakan pencatatan biaya produksi dalam pengambilan keputusan usahatani.
63. Puskesmas menerapkan tata laksana gizi buruk sesuai standar.
64. Alumni pelatihan vokasi bekerja atau berwirausaha dalam enam bulan setelah lulus.
65. Masyarakat memilah sampah rumah tangga dan menyetorkannya ke bank sampah.
66. Organisasi masyarakat sipil mitra menerapkan SOP pengelolaan keuangan.
67. Pemangku kebijakan kabupaten menggunakan hasil riset dalam penyusunan regulasi.
68. Kelompok tani hutan memelihara tanaman mangrove yang telah direhabilitasi.
69. Warga mengevakuasi diri sesuai prosedur saat peringatan dini berbunyi.
70. Anggota koperasi memanfaatkan pinjaman untuk usaha produktif.
71. Orang tua menerapkan pengasuhan positif tanpa kekerasan di rumah.
72. Pelaku usaha mematuhi standar keamanan pangan dalam produksi.
73. Sekolah menindaklanjuti hasil asesmen literasi dalam perencanaan pembelajaran.
74. Penerima manfaat bantuan tunai membelanjakan dana untuk kebutuhan esensial keluarga.
75. Pemuda dampingan melanjutkan usaha rintisannya hingga tahun kedua.

### Outcome — English (25)
76. Target farmers apply climate-smart practices on their plots.
77. Assisted MSMEs actively sell through digital channels.
78. Mothers of under-fives practice recommended infant and young child feeding.
79. Cooperatives hold annual member meetings routinely and independently.
80. Villagers consistently use improved sanitation facilities.
81. Teachers apply active-learning methods in their classrooms.
82. Posyandu cadres conduct monthly growth monitoring without external support.
83. Village governments allocate budget for disaster-risk-reduction activities.
84. Women's groups voice proposals in village planning forums.
85. Persons with disabilities access primary health services at local clinics.
86. Target households save regularly with formal financial institutions.
87. Farmers use production-cost records in farm-management decisions.
88. Health centers implement the national malnutrition-management protocol.
89. Vocational graduates are employed or self-employed within six months.
90. Communities sort household waste and deposit it at waste banks.
91. Partner CSOs apply financial-management SOPs.
92. District policymakers use research evidence in drafting regulations.
93. Forest-farmer groups maintain rehabilitated mangrove stands.
94. Residents evacuate according to procedure when early warnings sound.
95. Cooperative members use loans for productive enterprises.
96. Parents practice positive, non-violent discipline at home.
97. Food producers comply with food-safety standards.
98. Schools act on literacy-assessment results in lesson planning.
99. Cash-transfer recipients spend assistance on essential family needs.
100. Supported youth sustain their start-ups into a second year.

### Output — Bahasa Indonesia (25)
101. Modul pelatihan pertanian ramah iklim tersusun dalam dua bahasa.
102. 300 petani menyelesaikan pelatihan dan dinyatakan kompeten.
103. Lima sumur bor selesai dibangun dan berfungsi di tiga desa.
104. Sistem informasi manajemen program beroperasi penuh.
105. 40 kader posyandu terlatih dan tersertifikasi.
106. SOP rujukan kasus perlindungan anak tersusun dan disahkan pengurus.
107. Bank sampah terbentuk dan beroperasi di delapan RW.
108. Kurikulum pelatihan vokasi berbasis kebutuhan industri tersedia.
109. 1.000 paket bantuan non-pangan terdistribusi kepada keluarga terdampak.
110. Peta risiko bencana desa terpetakan dan tercetak.
111. Aplikasi pencatatan keuangan koperasi diluncurkan dan siap digunakan.
112. 25 unit ramp aksesibilitas terpasang di fasilitas publik.
113. Naskah akademik peraturan desa tentang perlindungan anak tersusun.
114. Rumah produksi bersama UMKM terbangun dan beroperasi.
115. Basis data penerima manfaat termutakhirkan dan terverifikasi.
116. 12 forum dialog damai tingkat kecamatan terselenggara dengan dokumentasi lengkap.
117. Alat peraga edukasi gizi terdistribusi ke 30 posyandu.
118. Perpustakaan sekolah direvitalisasi dan berfungsi di 15 sekolah.
119. Sistem peringatan dini banjir terpasang dan teruji.
120. Policy brief hasil riset terpublikasi dan terdiseminasi.
121. 60 fasilitator masyarakat terlatih metode pemicuan STBM.
122. Gudang pascapanen berkapasitas 20 ton terbangun.
123. Mekanisme pengaduan berbasis komunitas terbentuk di 10 desa.
124. Materi KIE kesehatan reproduksi remaja tersedia dalam format digital.
125. Dokumen rencana kontinjensi desa tersusun dan disahkan kepala desa.

### Output — English (25)
126. A climate-smart agriculture training module is produced in two languages.
127. 300 farmers complete training and are assessed as competent.
128. Five boreholes are constructed and functional in three villages.
129. The program management information system is fully operational.
130. 40 posyandu cadres are trained and certified.
131. A child-protection referral SOP is drafted and endorsed by the board.
132. Waste banks are established and operating in eight neighborhoods.
133. An industry-aligned vocational curriculum is available.
134. 1,000 non-food-item kits are distributed to affected families.
135. Village disaster-risk maps are completed and printed.
136. A cooperative bookkeeping app is launched and ready for use.
137. 25 accessibility ramps are installed in public facilities.
138. An academic draft of the village child-protection regulation is completed.
139. A shared MSME production house is built and operational.
140. The beneficiary database is updated and verified.
141. 12 sub-district peace-dialogue forums are held with full documentation.
142. Nutrition-education kits are distributed to 30 posyandu.
143. School libraries are revitalized and functional in 15 schools.
144. A flood early-warning system is installed and tested.
145. A research-based policy brief is published and disseminated.
146. 60 community facilitators are trained in CLTS triggering.
147. A 20-ton post-harvest warehouse is constructed.
148. Community-based complaint mechanisms are established in ten villages.
149. Adolescent reproductive-health IEC materials are available digitally.
150. Village contingency plans are completed and endorsed by village heads.

### Activity — Bahasa Indonesia (25)
151. Menyelenggarakan pelatihan pertanian ramah iklim untuk 300 petani (12 angkatan).
152. Menyusun dan menguji coba modul pelatihan dua bahasa.
153. Membangun lima sumur bor di tiga desa sasaran.
154. Mengembangkan sistem informasi manajemen program.
155. Melatih 40 kader posyandu tentang pemantauan pertumbuhan.
156. Memfasilitasi penyusunan SOP rujukan kasus perlindungan anak.
157. Mendampingi pembentukan bank sampah di delapan RW.
158. Melakukan analisis kebutuhan industri untuk kurikulum vokasi.
159. Mendistribusikan 1.000 paket bantuan non-pangan.
160. Memetakan risiko bencana secara partisipatif di setiap desa.
161. Mengadakan bimbingan teknis penggunaan aplikasi keuangan koperasi.
162. Memasang 25 unit ramp aksesibilitas di fasilitas publik.
163. Menyusun naskah akademik peraturan desa bersama pemdes.
164. Membangun rumah produksi bersama untuk klaster UMKM.
165. Memverifikasi dan memutakhirkan basis data penerima manfaat.
166. Menggelar 12 forum dialog damai tingkat kecamatan.
167. Mengadakan pelatihan konseling gizi bagi kader.
168. Merevitalisasi perpustakaan di 15 sekolah sasaran.
169. Menguji coba sistem peringatan dini bersama BPBD.
170. Melaksanakan riset kebijakan dan menyusun policy brief.
171. Melatih 60 fasilitator metode pemicuan STBM.
172. Mengawasi konstruksi gudang pascapanen.
173. Mensosialisasikan mekanisme pengaduan kepada warga 10 desa.
174. Memproduksi materi KIE dalam format digital.
175. Memfasilitasi musyawarah penyusunan rencana kontinjensi desa.

### Activity — English (25)
176. Conduct climate-smart agriculture training for 300 farmers in 12 batches.
177. Develop and pilot a bilingual training module.
178. Construct five boreholes in three target villages.
179. Develop the program management information system.
180. Train 40 posyandu cadres on growth monitoring.
181. Facilitate drafting of the child-protection referral SOP.
182. Mentor the establishment of waste banks in eight neighborhoods.
183. Conduct an industry needs analysis for the vocational curriculum.
184. Distribute 1,000 non-food-item kits.
185. Map disaster risks participatorily in each village.
186. Deliver technical coaching on the cooperative bookkeeping app.
187. Install 25 accessibility ramps in public facilities.
188. Draft the village regulation's academic paper with the village government.
189. Build a shared production house for the MSME cluster.
190. Verify and update the beneficiary database.
191. Hold 12 sub-district peace-dialogue forums.
192. Organize nutrition-counselling training for cadres.
193. Revitalize libraries in 15 target schools.
194. Test the early-warning system jointly with the disaster agency.
195. Conduct policy research and produce a policy brief.
196. Train 60 facilitators in CLTS triggering.
197. Supervise construction of the post-harvest warehouse.
198. Socialize the complaint mechanism to residents of ten villages.
199. Produce IEC materials in digital formats.
200. Facilitate village deliberations to draft contingency plans.

Note the deliberate triplets (e.g., 151→101→51; 176→126→76): same intervention expressed at activity → output → outcome. These triplets are the core regression fixtures.

---

## Bilingual Hard-Negative Examples (100)

Columns: text · expected · competing · reasoning + key signals · conf (expected) · false-positive note.

### Bahasa Indonesia (50)

| # | Text | Expected | Competing | Reasoning / signals | Conf | FP note |
|---|---|---|---|---|---|---|
| 1 | Meningkatnya jumlah modul yang disusun | Output | Impact | `-nya` frame, tapi objek = deliverable count | 0.80 | frame lures Impact |
| 2 | Pelaksanaan praktik pencatatan biaya oleh petani | Outcome | Activity | nominalization tapi agen = petani | 0.78 | "pelaksanaan" lures Activity |
| 3 | Penerapan tata kelola koperasi sesuai AD/ART | Outcome | Activity | penerapan+institusi sasaran; agen implisit | 0.62 | if agent=project team → Activity |
| 4 | Terbangunnya kepercayaan masyarakat terhadap koperasi | Outcome | Output/Impact | `ter-` tapi objek relasional | 0.70 | scale decides vs Impact |
| 5 | Masyarakat menggunakan layanan kesehatan | Outcome | Activity | agen=masyarakat, verba pemanfaatan | 0.92 | — |
| 6 | Tersedianya akses pasar yang lebih luas | Outcome | Output | "tersedia" tapi akses = relational | 0.60 | availability wording lures Output |
| 7 | 300 petani dilatih | Output | Outcome | completion of delivery; people-changed lure | 0.85 | "trained ≠ changed behavior" |
| 8 | 60% petani sasaran menerapkan pupuk organik | Outcome | Output | angka bukan penentu; verba adopsi | 0.88 | number lures Output |
| 9 | Terlaksananya 12 sesi pendampingan | Activity | Output | completion of *work*, bukan deliverable benefit | 0.72 | `ter-`+`-nya` lures Output |
| 10 | Meningkatnya kehadiran peserta pelatihan | Activity/process | Outcome | attendance = delivery metric | 0.65 | change-frame lures Outcome |
| 11 | Pendapatan petani meningkat 25% | Impact | Outcome | magnitudo populasi sasaran | 0.62 | small-scope arg for Outcome |
| 12 | Menyusun laporan baseline | Activity | Milestone | verba kerja | 0.90 | listed under milestones often |
| 13 | Laporan baseline disetujui donor | Milestone | Output | state+external approval+date-able | 0.70 | approval as deliverable |
| 14 | Kader mampu menjelaskan materi gizi | Output | Outcome | kompetensi hasil pelatihan langsung | 0.55 | AMBIGUOUS — competence vs practice |
| 15 | Kader menerapkan konseling gizi saat posyandu | Outcome | Output | practice in real setting | 0.88 | — |
| 16 | Pemerintah desa menerbitkan perdes perlindungan anak | Outcome | Output | keputusan aktor eksternal | 0.75 | if project drafts it → still external adoption |
| 17 | Draf perdes perlindungan anak tersusun | Output | Outcome | deliverable proyek | 0.90 | — |
| 18 | Sosialisasi program kepada 500 warga | Activity | Output | kerja diseminasi | 0.85 | reach number lures Output |
| 19 | 500 warga memahami alur pengaduan | Outcome | Output | perubahan pengetahuan pihak sasaran | 0.60 | knowledge-vs-KAP debate |
| 20 | Terbentuknya 10 kelompok tani baru | Output | Outcome | pembentukan difasilitasi & terkontrol proyek | 0.68 | groups functioning → Outcome |
| 21 | 10 kelompok tani aktif berproduksi bersama | Outcome | Output | functioning behavior | 0.85 | — |
| 22 | Monitoring dan evaluasi dilaksanakan berkala | Activity | Output | internal project process | 0.90 | M&E as "output" is common error |
| 23 | Anggaran terserap 95% | Input/process | Output | absorption metric | 0.85 | — |
| 24 | Koperasi memperoleh sertifikasi NIK | Outcome | Output | keputusan lembaga eksternal (pemerintah) | 0.60 | if purely administrative & guaranteed → Output arg |
| 25 | Website organisasi diluncurkan | Output | Outcome | launch = deliverable | 0.90 | "adoption" ≠ launch |
| 26 | 1.200 pengunjung mengakses website per bulan | Outcome (weak) | Output | penggunaan, tapi vanity risk | 0.55 | flag IND_VANITY at outcome |
| 27 | Terjalinnya kemitraan dengan 5 perusahaan | Outcome | Output | relational, kesepakatan dua pihak | 0.62 | MoU signed → Output arg |
| 28 | MoU dengan 5 perusahaan ditandatangani | Output | Outcome | dokumen selesai; tanda tangan pihak lain hampir pasti dlm kendali proses | 0.58 | AMBIGUOUS — external signature |
| 29 | Menguatnya kapasitas organisasi mitra | Outcome | Output/Impact | capacity *applied*? vague | 0.50 | AMBIGUOUS; ask for behavior |
| 30 | Skor ICI mitra naik dari 2,1 ke 3,4 | Outcome | Output | performa institusi terukur | 0.72 | doc-based score could be Output-ish |
| 31 | Pengadaan alat antropometri untuk 30 posyandu | Activity | Output | procurement work | 0.80 | delivered kits → Output |
| 32 | Alat antropometri tersedia di 30 posyandu | Output | Outcome | availability | 0.90 | — |
| 33 | Posyandu menggunakan alat sesuai SOP | Outcome | Output | use behavior | 0.90 | — |
| 34 | Berkurangnya sampah plastik ke TPA sebesar 15% | Impact | Outcome | system-level flow change | 0.58 | AMBIGUOUS — city vs RW scope |
| 35 | Warga memilah sampah di 8 RW | Outcome | Impact | behavior at defined group | 0.85 | — |
| 36 | Advokasi kebijakan dilakukan di 3 kabupaten | Activity | Outcome | kerja advokasi | 0.88 | "kebijakan" lures Outcome |
| 37 | Kebijakan kabupaten mengadopsi rekomendasi riset | Outcome | Impact | keputusan aktor eksternal | 0.80 | policy-level lures Impact |
| 38 | Terwujudnya desa ODF | Outcome | Impact | verified behavioral status desa | 0.60 | ODF as impact in WASH norms debate |
| 39 | Jamban sehat terbangun di 200 rumah | Output | Outcome | konstruksi terkendali | 0.88 | — |
| 40 | Menurunnya kasus diare balita di desa sasaran | Impact | Outcome | health statistic | 0.75 | — |
| 41 | Peserta hadir 90% di seluruh sesi | Activity/process | Outcome | attendance | 0.80 | commitment arg for Outcome |
| 42 | Alumni membuka usaha baru dalam 6 bulan | Outcome | Impact | behavior of graduates | 0.82 | income change → Impact |
| 43 | Terdatanya 2.000 penerima manfaat dalam sistem | Output | Activity | database state | 0.78 | pendataan (work) vs terdata (state) |
| 44 | Melakukan pendataan 2.000 penerima manfaat | Activity | Output | work | 0.88 | — |
| 45 | Sistem rujukan berfungsi di 5 puskesmas | Outcome | Output | institutional functioning | 0.58 | AMBIGUOUS — "berfungsi" teknis vs perilaku |
| 46 | Menurunnya risiko gagal panen petani dampingan | Outcome | Impact | risk profile of target group | 0.55 | AMBIGUOUS |
| 47 | Petani memiliki akses ke informasi cuaca | Outcome | Output | "memiliki akses" — jika = layanan tersedia → Output | 0.50 | AMBIGUOUS; realized use? |
| 48 | Aplikasi cuaca terinstal di 500 ponsel petani | Output | Outcome | install terkontrol (dgn consent) | 0.60 | install needs farmer action |
| 49 | Petani memeriksa prakiraan cuaca sebelum menyemprot | Outcome | Output | decision behavior | 0.90 | — |
| 50 | Keberlanjutan program terjamin | (reject) | Impact | vague, non-classifiable | 0.30 | route to review; ask rewrite |

### English (50)

| # | Text | Expected | Competing | Reasoning / signals | Conf | FP note |
|---|---|---|---|---|---|---|
| 51 | Increased number of modules developed | Output | Impact | "increased" + deliverable object | 0.80 | participle lures Impact |
| 52 | Farmers' practice of cost record-keeping | Outcome | Activity | nominalized beneficiary behavior | 0.75 | gerund lures Activity |
| 53 | Adoption of cooperative governance standards | Outcome | Activity | adoption by institution; agent implicit | 0.60 | if by project → Activity |
| 54 | Community trust in the cooperative is built | Outcome | Output | relational state | 0.70 | passive lures Output |
| 55 | Communities use health services | Outcome | Activity | agent = community | 0.92 | — |
| 56 | Wider market access is available | Outcome | Output | access = relational | 0.60 | "available" lures Output |
| 57 | 300 farmers trained | Output | Outcome | delivery completion | 0.85 | — |
| 58 | 60% of target farmers apply organic fertilizer | Outcome | Output | number neutral; verb decides | 0.88 | — |
| 59 | 12 mentoring sessions completed | Activity | Output | completed *work* | 0.72 | — |
| 60 | Increased training attendance | Activity/process | Outcome | delivery metric | 0.65 | — |
| 61 | Farmer incomes rise by 25% | Impact | Outcome | population magnitude | 0.62 | — |
| 62 | Draft the baseline report | Activity | Milestone | verb of work | 0.90 | — |
| 63 | Baseline report approved by donor | Milestone | Output | state + date-able | 0.70 | — |
| 64 | Cadres can explain nutrition messages | Output | Outcome | immediate competence | 0.55 | AMBIGUOUS |
| 65 | Cadres deliver nutrition counselling at posyandu | Outcome | Output/Activity | practice in real setting; cadres = target group not staff | 0.80 | if cadres are project staff → Activity |
| 66 | The ministry issues the child-protection decree | Outcome | Output | external decision | 0.78 | — |
| 67 | Decree draft completed | Output | Outcome | project deliverable | 0.90 | — |
| 68 | Program socialization reached 500 residents | Activity | Output | dissemination work; reach | 0.82 | — |
| 69 | 500 residents understand the complaint pathway | Outcome | Output | knowledge change in target group | 0.60 | knowledge-only debate |
| 70 | Ten new farmer groups formed | Output | Outcome | facilitated, controllable formation | 0.68 | — |
| 71 | Ten farmer groups jointly market their produce | Outcome | Output | functioning behavior | 0.85 | — |
| 72 | Monitoring visits conducted quarterly | Activity | Output | internal process | 0.90 | — |
| 73 | 95% budget absorption achieved | Input/process | Output | absorption metric | 0.85 | — |
| 74 | The cooperative obtains legal registration | Outcome | Output | external authority decision | 0.60 | near-guaranteed admin arg |
| 75 | Organization website launched | Output | Outcome | deliverable | 0.90 | — |
| 76 | 1,200 monthly active users on the platform | Outcome (weak) | Output | usage but vanity risk | 0.55 | pair with benefit metric |
| 77 | Partnerships established with five companies | Outcome | Output | two-party relational commitment | 0.58 | AMBIGUOUS ("established" lure) |
| 78 | Five MoUs signed | Output | Outcome | documents completed | 0.58 | AMBIGUOUS — external signature |
| 79 | Strengthened partner-organization capacity | Outcome | Output/Impact | vague; applied capacity? | 0.50 | AMBIGUOUS; request behavior |
| 80 | Partner ICI score improves from 2.1 to 3.4 | Outcome | Output | measured institutional performance | 0.72 | — |
| 81 | Procurement of anthropometry kits for 30 posyandu | Activity | Output | procurement work | 0.80 | — |
| 82 | Anthropometry kits available in 30 posyandu | Output | Outcome | availability | 0.90 | — |
| 83 | Posyandu use the kits per SOP | Outcome | Output | use behavior | 0.90 | — |
| 84 | 15% reduction of plastic waste to landfill | Impact | Outcome | system flow change | 0.58 | AMBIGUOUS scope |
| 85 | Households in 8 neighborhoods sort their waste | Outcome | Impact | defined-group behavior | 0.85 | — |
| 86 | Policy advocacy conducted in three districts | Activity | Outcome | advocacy work | 0.88 | — |
| 87 | District policy adopts the research recommendations | Outcome | Impact | external adoption | 0.80 | — |
| 88 | Villages achieve verified ODF status | Outcome | Impact | verified behavioral status | 0.60 | AMBIGUOUS by convention |
| 89 | Improved latrines constructed in 200 homes | Output | Outcome | controlled construction | 0.88 | — |
| 90 | Reduced under-five diarrhea cases in target villages | Impact | Outcome | health statistic | 0.75 | — |
| 91 | 90% attendance across all sessions | Activity/process | Outcome | attendance | 0.80 | — |
| 92 | Graduates start new businesses within six months | Outcome | Impact | graduate behavior | 0.82 | — |
| 93 | 2,000 beneficiaries registered in the system | Output | Activity | database state | 0.78 | — |
| 94 | Register 2,000 beneficiaries | Activity | Output | work | 0.88 | — |
| 95 | Referral system functions across five clinics | Outcome | Output | institutional functioning | 0.58 | AMBIGUOUS |
| 96 | Reduced crop-failure risk among assisted farmers | Outcome | Impact | target-group risk profile | 0.55 | AMBIGUOUS |
| 97 | Farmers have access to weather information | Outcome | Output | availability vs realized use | 0.50 | AMBIGUOUS |
| 98 | Weather app installed on 500 farmers' phones | Output | Outcome | requires farmer consent/action | 0.60 | — |
| 99 | Farmers check forecasts before spraying | Outcome | Output | decision behavior | 0.90 | — |
| 100 | Program sustainability is ensured | (reject) | Impact | vague, non-classifiable | 0.30 | rewrite request |

---

## Full Bilingual Results Chains (10)

Each chain: Impact→Outcome→Output→Activity→Task→Indicator→Baseline→Target→MoV→Assumption→Risk→Mitigation. ID / EN pairs.

**1. Agriculture / Livelihoods**
- Impact: Meningkatnya kesejahteraan ekonomi rumah tangga petani sasaran / Improved economic wellbeing of target farming households
- Outcome: Petani menerapkan pencatatan biaya produksi dalam keputusan usahatani / Farmers use production-cost records in farm decisions
- Output: 300 petani menyelesaikan pelatihan pencatatan biaya / 300 farmers complete cost-recording training
- Activity: Menyelenggarakan pelatihan 12 angkatan / Conduct training in 12 batches
- Task: Rekrut & kontrak 4 pelatih (owner: PM; 10 hari; selesai jika kontrak ttd) / Recruit and contract 4 trainers
- Indicator: Persentase petani sasaran yang menggunakan pencatatan biaya sesuai SOP / % of target farmers using cost records per SOP
- Baseline: 12% (survei 2026) · Target: 60% (Q4 2027)
- MoV: Survei sampel usahatani, tim MEAL, semesteran, verifikasi buku catatan / Farm-record sample survey, MEAL team, semi-annual
- Assumption: Harga input pertanian relatif stabil / Input prices remain relatively stable
- Risk: Musim tanam gagal karena kekeringan / Drought disrupts the planting season
- Mitigation: Modul menyertakan praktik hemat air; jadwal fleksibel / Include water-saving practices; flexible scheduling

**2. WASH**
- Impact: Menurunnya kasus diare balita di desa sasaran / Reduced under-five diarrhea in target villages
- Outcome: Warga menggunakan jamban sehat secara konsisten (status ODF terverifikasi) / Villagers consistently use improved latrines (verified ODF)
- Output: Jamban sehat terbangun di 200 rumah; 60 fasilitator STBM terlatih / 200 improved latrines constructed; 60 CLTS facilitators trained
- Activity: Pemicuan STBM di 10 dusun; pendampingan tukang lokal / CLTS triggering in 10 hamlets; mason coaching
- Task: Jadwalkan pemicuan dusun 1–10 (owner: FO; 20 hari) / Schedule triggering sessions
- Indicator: Persentase rumah tangga yang menggunakan jamban sehat / % of households using improved latrines
- Baseline: 41% · Target: 95% (2027)
- MoV: Verifikasi ODF lintas pihak, kader+puskesmas, tahunan / Cross-party ODF verification, annual
- Assumption: Ketersediaan material lokal terjangkau / Local materials remain affordable
- Risk: Banjir merusak sarana terbangun / Flooding damages built facilities
- Mitigation: Standar konstruksi tahan banjir / Flood-resilient construction standards

**3. Education**
- Impact: Meningkatnya capaian literasi siswa SD sasaran / Improved literacy outcomes of target primary students
- Outcome: Guru menerapkan pembelajaran aktif berbasis asesmen / Teachers apply assessment-informed active learning
- Output: 120 guru terlatih & tersertifikasi; 15 perpustakaan berfungsi / 120 teachers trained & certified; 15 libraries functional
- Activity: Pelatihan guru 3 gelombang; revitalisasi perpustakaan / Teacher training in 3 waves; library revitalization
- Task: Finalisasi modul dengan dinas (owner: EduLead; 15 hari) / Finalize module with district office
- Indicator: Persentase guru terlatih yang menerapkan ≥3 praktik pembelajaran aktif saat observasi / % of trained teachers applying ≥3 active-learning practices at observation
- Baseline: 18% · Target: 70% (2027)
- MoV: Observasi kelas terstruktur, pengawas+tim, per semester / Structured classroom observation, per semester
- Assumption: Rotasi guru antar-sekolah rendah / Teacher transfers remain low
- Risk: Kebijakan kurikulum berubah mendadak / Sudden curriculum policy change
- Mitigation: Desain modul modular adaptif / Modular adaptive module design

**4. Health & Nutrition**
- Impact: Menurunnya prevalensi stunting balita / Reduced under-five stunting prevalence
- Outcome: Ibu balita mempraktikkan PMBA; kader memantau pertumbuhan bulanan mandiri / Mothers practice IYCF; cadres run monthly growth monitoring independently
- Output: 40 kader terlatih; alat antropometri tersedia di 30 posyandu / 40 cadres trained; kits available in 30 posyandu
- Activity: Pelatihan kader; pengadaan & distribusi alat / Cadre training; kit procurement & distribution
- Task: Uji fungsi alat sebelum distribusi (owner: HealthOff; 5 hari) / Function-test kits before distribution
- Indicator: Persentase balita sasaran yang dipantau pertumbuhannya setiap bulan / % of target under-fives with monthly growth monitoring
- Baseline: 55% · Target: 90% (2027)
- MoV: Register posyandu & e-PPGBM, bidan desa, bulanan / Posyandu registers & e-PPGBM, monthly
- Assumption: Puskesmas terus memasok logistik dasar / Health center keeps supplying basics
- Risk: Turnover kader tinggi / High cadre turnover
- Mitigation: Refresher triwulanan & insentif non-tunai / Quarterly refreshers & non-cash incentives

**5. MSME / Digital economy**
- Impact: Meningkatnya pendapatan UMKM dampingan / Increased incomes of assisted MSMEs
- Outcome: UMKM aktif menjual melalui kanal digital / MSMEs actively sell via digital channels
- Output: 50 UMKM menyelesaikan onboarding marketplace; rumah produksi beroperasi / 50 MSMEs complete marketplace onboarding; production house operational
- Activity: Pelatihan pemasaran digital; pendampingan onboarding / Digital-marketing training; onboarding mentoring
- Task: Kurasi 50 UMKM peserta (owner: BizDev; 10 hari) / Curate 50 participating MSMEs
- Indicator: Persentase UMKM dampingan dengan ≥5 transaksi digital/bulan / % of assisted MSMEs with ≥5 digital transactions/month
- Baseline: 8% · Target: 50% (2027)
- MoV: Log transaksi marketplace (consent), tim program, bulanan / Marketplace transaction logs (consented), monthly
- Assumption: Biaya platform tetap terjangkau / Platform fees stay affordable
- Risk: Perubahan algoritma menurunkan visibilitas / Algorithm changes cut visibility
- Mitigation: Diversifikasi kanal (WA Business, tokoonline sendiri) / Channel diversification

**6. Governance**
- Impact: Menguatnya tata kelola desa akuntabel / Stronger accountable village governance
- Outcome: Pemdes mempublikasikan APBDes & warga menggunakan kanal aduan / Village govts publish budgets & residents use complaint channels
- Output: Sistem pengaduan terpasang di 10 desa; 30 aparat terlatih / Complaint systems installed in 10 villages; 30 officials trained
- Activity: Pengembangan sistem; pelatihan aparat; sosialisasi warga / System development; official training; citizen outreach
- Task: UAT sistem dengan 2 desa pilot (owner: Tech; 7 hari) / UAT with 2 pilot villages
- Indicator: Jumlah aduan warga yang ditindaklanjuti sesuai SLA / Number of complaints resolved within SLA
- Baseline: 0 · Target: 200/tahun (2027)
- MoV: Log sistem aduan + sampel verifikasi, admin & MEAL, bulanan / System logs + verification sample, monthly
- Assumption: Kades tetap berkomitmen pada transparansi / Village heads stay committed
- Risk: Pergantian kepala desa menghentikan praktik / Leadership change halts practice
- Mitigation: Perdes payung & kaderisasi operator / Umbrella regulation & operator cadre

**7. DRR**
- Impact: Berkurangnya korban & kerugian bencana / Reduced disaster casualties and losses
- Outcome: Warga mengevakuasi sesuai prosedur saat peringatan dini / Residents evacuate per procedure on early warning
- Output: EWS terpasang & teruji; renkon desa disahkan / EWS installed & tested; contingency plans endorsed
- Activity: Pemasangan EWS; simulasi evakuasi 2×/tahun / EWS installation; evacuation drills twice yearly
- Task: Koordinasi frekuensi sirine dgn BPBD (owner: DRR-Off; 5 hari) / Coordinate siren protocol with disaster agency
- Indicator: Persentase warga zona merah yang mencapai titik kumpul ≤15 menit saat simulasi / % of red-zone residents reaching assembly points ≤15 min in drills
- Baseline: 35% · Target: 85% (2027)
- MoV: Laporan simulasi terstandar, BPBD+tim, semesteran / Standardized drill reports, semi-annual
- Assumption: Tidak ada bencana besar sebelum sistem siap / No major disaster before readiness
- Risk: Vandalisme perangkat EWS / EWS vandalism
- Mitigation: Serah terima aset ke desa + ronda / Asset handover + community watch

**8. Child protection**
- Impact: Menurunnya kekerasan terhadap anak / Reduced violence against children
- Outcome: Orang tua menerapkan pengasuhan positif; kasus dirujuk tepat / Parents practice positive discipline; cases correctly referred
- Output: SOP rujukan disahkan; 10 PATBM terbentuk / Referral SOP endorsed; 10 community mechanisms formed
- Activity: Pelatihan pengasuhan; fasilitasi PATBM / Parenting training; mechanism facilitation
- Task: Susun kurikulum pengasuhan (owner: CP-Spec; 12 hari) / Draft parenting curriculum
- Indicator: Persentase kasus teridentifikasi yang dirujuk sesuai SOP / % of identified cases referred per SOP
- Baseline: 20% · Target: 80% (2027)
- MoV: Data manajemen kasus (anonim, terlindungi), petugas CP, triwulanan — catatan privasi wajib / Case-management data (anonymized), quarterly — privacy note mandatory
- Assumption: Layanan rujukan pemerintah berfungsi / Government referral services function
- Risk: Stigma menghambat pelaporan / Stigma suppresses reporting
- Mitigation: Kampanye anti-stigma & kanal aman / Anti-stigma campaign & safe channels

**9. Climate / Environment**
- Impact: Pulihnya ekosistem mangrove & menurunnya abrasi / Restored mangrove ecosystem and reduced abrasion
- Outcome: KTH memelihara tegakan mangrove (survival terjaga) / Forest-farmer groups maintain mangrove stands
- Output: 50.000 bibit tertanam di 25 ha / 50,000 seedlings planted across 25 ha
- Activity: Pembibitan, penanaman, patroli pemeliharaan / Nursery, planting, maintenance patrols
- Task: Pemetaan titik tanam GPS (owner: FieldCoord; 8 hari) / GPS mapping of planting points
- Indicator: Persentase tegakan hidup pada bulan ke-12 / % seedling survival at month 12
- Baseline: — (0, penanaman baru) · Target: ≥75% (2027)
- MoV: Sampling plot + citra drone, tim lingkungan, semesteran / Plot sampling + drone imagery, semi-annual
- Assumption: Tidak ada konversi lahan oleh pihak lain / No land conversion by third parties
- Risk: Gelombang ekstrem merusak bibit muda / Extreme waves destroy young seedlings
- Mitigation: Pemecah ombak sederhana & jadwal tanam musiman / Simple wave breaks & seasonal planting

**10. Research & policy advocacy**
- Impact: Kebijakan perlindungan sosial kabupaten berbasis bukti / Evidence-based district social-protection policy
- Outcome: Pemkab menggunakan hasil riset dalam revisi perbup / District govt uses research in regulation revision
- Output: Policy brief & naskah akademik terpublikasi / Policy brief & academic paper published
- Activity: Riset lapangan; policy dialogue 3 putaran / Field research; three policy-dialogue rounds
- Task: IRB/etik & izin riset (owner: Researcher; 15 hari) / Ethics & research permits
- Indicator: Jumlah rekomendasi riset yang diadopsi dalam dokumen kebijakan / Number of recommendations adopted in policy documents
- Baseline: 0 · Target: ≥3 (2027)
- MoV: Analisis dokumen kebijakan + risalah, policy lead, per revisi / Policy-document analysis + minutes
- Assumption: Jadwal revisi perbup berjalan sesuai rencana / Regulation revision proceeds on schedule
- Risk: Pergantian pejabat kunci / Key-official turnover
- Mitigation: Engagement multi-level, bukan satu champion / Multi-level engagement, not single champion

Vertical logic check: setiap chain lolos uji "if-then + assumption"; horizontal logic: indikator↔MoV konsisten level.

---

## Recommended Impactory Architecture

Evaluated target architecture — **endorsed with amendments**:

```text
Universal Semantic Core (runs locally, free)
├── Canonical terminology & level keys
├── Causal-level rules (decision tree V-1…V-5)
├── Degree-of-control classifier (agent extraction + control lexicon)
├── Actor & object-of-change detection
├── Cross-level overlap detection (confusion-matrix rules)
└── Quality scoring (deterministic dimensions)
├── Indonesian Language Pack   ├── English Language Pack
│   morphology, lexicons,      │   lexicons, grammar cues,
│   nominalization handling,   │   nominalization handling,
│   sector vocab, id findings  │   sector vocab, en findings
├── Deterministic Review Layer (structure, completeness, indicator
│   components, timeframe, WBS/budget readiness)
└── Optional Azure Semantic Adjudicator (on-demand only)
    ambiguous classification · causal coherence · relevance ·
    achievability · suggested rewrite
```

**Amendments:** (1) add a **language-detection gate** before packs (mixed-language statements are common in Indonesian proposals — route tokens per-language, classify on the dominant proposition language); (2) add a **feature-extraction layer** shared by both packs producing the 5 scored features (semantic role, object, control, pattern, quantification) so the confidence formula is pack-independent; (3) the Adjudicator returns findings in the same schema, flagged `requiresAiReview:false` post-review.

### Azure Credit Efficiency Strategy

- **Free/local always:** deterministic + structural + lexical/morphological + confidence scoring + all findings generation for unambiguous items. Expected coverage ≥80% of statements.
- **On-demand (user-triggered):** "Review my LFA deeply" runs Adjudicator over AMBIGUOUS + HIGH items only.
- **Azure required:** margin<0.15 items; causal sufficiency; achievability; rewrite suggestions.
- **Azure must NOT be called when:** confidence ≥0.80 with margin ≥0.15; deterministic finding already explains the issue; identical statement hash already adjudicated (cache hit); user disabled AI review.
- **Minimum context sent:** the statement, its claimed level, top-2 candidate levels + scores, extracted agent/object, ≤2 sibling statements for chain context. Never the whole document.
- **Output schema:** finding JSON above + `adjudicatedLevel`, `rationale`, ≤2 rewrites. Enforce JSON-only response.
- **Caching:** key = normalized statement hash + prompt version + pack version; store adjudication in `lfa_*` review table (design note only — `org_id` convention applies).
- **Prompt versioning:** semver prompts; regression fixtures (gold + hard negatives) run per prompt bump.
- **Usage logging:** tokens, latency, cache-hit rate, route-to-AI %, per-org — feeds the ≤20% routing budget alarm.
- **Confidence threshold & fallback:** if Azure call fails → keep local classification, finding stays `AMBIGUOUS`, UI marks "AI review unavailable — heuristic result shown". Never block.
- **Model tiering (per standing rule):** deterministic gets no model; ambiguous adjudication uses the mid-tier deployment; the senior model is reserved for full-document coherence review on explicit user request. No senior model for checks solvable deterministically.

## Known Limitations

1. Citation coverage is selective (bounded research pass) — Tier-1 verification pass scheduled for v1.1; items most needing hardening: UNDP RBM Handbook exact definitions, World Bank PDO guidance, PermenPAN full text, PRAG current edition.
2. Signals were curated analytically, not corpus-derived; real proposal corpora (Impactory user data, with consent) should recalibrate weights.
3. Knowledge/attitude changes (KAP "K") sit ambiguously between output and outcome across donors — v1 defaults to Output-for-immediate-competence, Outcome-for-applied-practice; document per-donor override.
4. Mixed-language (code-switched) statements degrade lexical signals; language gate mitigates but doesn't solve.
5. Confusion-matrix severities are design estimates pending calibration data.
6. Sector lexicons are starter sets (breadth over depth).

## Validation and Evaluation Plan

- **Labeled test set:** the 200 gold + 100 hard negatives here as seed; extend to ≥600 items stratified across 20 sectors × 2 languages, dual-annotated by MEAL experts; report Cohen's κ (target ≥0.75 before rules are judged against it).
- **Metrics:** per-pair precision/recall/F1 + full confusion matrix; FP and FN qualitative review each cycle; regression tests on every rule/prompt/pack version bump; threshold calibration (margin 0.15 ± sweep 0.10–0.20); cost-per-review and route-to-AI% tracking; deterministic-only vs hybrid A/B on the same test set.
- **Acceptance criteria (proposed → assessed):**
  - Activity vs Output precision ≥0.90 — **realistic** (strong structural separability).
  - Output vs Outcome precision ≥0.85 — **ambitious but right target**; hardest pair; expect 0.78–0.85 deterministic-only, hybrid should clear 0.85.
  - Goal vs Outcome precision ≥0.85 — **realistic**.
  - False blocking rate = 0 — **by construction** (only CRITICAL blocks, and only integrity/security).
  - Ambiguous routed to AI ≤20% — **realistic if** margin tuned; monitor.
  - Deterministic resolution ≥80% — **realistic**, complement of the above.

## Final Recommendations (Decisions 1–15)

1. **Canonical terminology:** adopt the Canonical Impactory Vocabulary table (keys + bilingual labels) as the single internal standard.
2. **Activities in LFA editor:** YES, always displayed; export profiles relocate to activity matrix for donors that separate it (PRAG-style). "Never A or B."
3. **Universal semantic rules:** V-1…V-5 + decision tree adopted as the core classifier contract.
4. **Indonesian language pack:** adopted as specified, all mappings weighted signals; counterexample table ships as fixtures.
5. **English language pack:** adopted as specified, same conditions.
6. **Confidence formula:** 40/20/20/15/5 (amended), bands as proposed, margin 0.15 shipped as config.
7. **Quality Score:** 15/30/25/15/5/10 (amended; SMART folded into Indicator Quality); PMK/SBM compliance excluded permanently.
8. **Deterministic rules:** catalogue §Deterministic — always-on, free.
9. **AI-assisted rules:** catalogue §Semantic — margin-gated, cached, budgeted.
10. **Human review:** donor-submission sign-off; contested post-AI classifications; CRITICAL findings.
11. **Severity policy:** INFO/WARNING/HIGH advisory; CRITICAL = integrity/security only = sole blocking class.
12. **P0 (MVP):** deterministic catalogue + both language-pack lexicons + decision tree + confidence scoring + finding schema + gold/hard-negative fixtures + Quality Score deterministic dimensions.
13. **P1:** Azure Adjudicator (margin-gated) + caching + rewrite suggestions + routing budget telemetry.
14. **P2:** full-document coherence review, corpus-derived signal weights, per-donor export lints, MEAL-linked live indicator health.
15. **Risks:** hardest pair (output/outcome) may miss 0.85 deterministic-only — mitigated by hybrid; annotation disagreement on KAP items — mitigated by convention in Limitations #3; signal drift across sectors — mitigated by sector lexicon tagging + recalibration.

## Source Register

Tier 1 (all accessed 22 July 2026):

1. OECD (2023). *Glossary of Key Terms in Evaluation and Results-Based Management for Sustainable Development*, 2nd ed. https://www.oecd.org/en/publications/glossary-of-key-terms-in-evaluation-and-results-based-management-for-sustainable-development-second-edition_632da462-en-fr-es.html — definitions of input, output, outcome, impact, logframe; 2019 criteria integration. `CANONICAL`
2. World Bank IEG. *Glossary of Key Terms* (OECD-DAC-based). https://ieg.worldbankgroup.org/evaluation-international-development/appendix-glossary-key-terms — Impact/Input/Outcome/Output/Logframe verbatim OECD-DAC definitions. `CANONICAL`
3. European Commission (2004). *Aid Delivery Methods Vol. 1 — Project Cycle Management Guidelines* (+ ECHO PCM manuals). Overall Objective / Purpose (single, sustainable benefits for target groups) / Results / Activities; assumptions as external factors. `DONOR-SPECIFIC`
4. PRAG 2015 logframe analysis (europabook.eu review of EC Unified Action Document Template): intervention logic Outputs → Specific objective(s)/Outcome(s) → Overall objective; activities toward separate treatment; Work Package/Deliverable practice in framework programmes. `DONOR-SPECIFIC`
5. USAID. *Developing Results Frameworks* technical note + ADS 201 + Project Starter pages: Goal–DO–IR–Sub-IR definitions; LogFrame derived from RF. `DONOR-SPECIFIC`
6. ADB. *Guidelines for Preparing a Design and Monitoring Framework*: outputs = goods/products/services delivered; outcomes = immediate and direct benefits of output use; indicator-per-result, no cross-level measurement; assumption-or-risk-not-both; outputs phrased past tense. `DONOR-SPECIFIC`
7. DFID (2011). *Guidance on using the revised Logical Framework*: Impact(Goal)/Outcome(Purpose)/Output tiers; indicators state only what is measured, excl. baseline/target. `DONOR-SPECIFIC`
8. Bappenas (2009). *Pedoman Evaluasi Kinerja Pembangunan Sektoral*: hierarki Indikator Dampak–Hasil–Keluaran–Masukan; hasil = berfungsinya keluaran. `INDONESIA-SPECIFIC`
9. PermenPAN No. PER/9/M.PAN/5/2007 (IKU) + derivative regional guidance: indikator outcome/dampak definitions; measure types (jumlah, persentase, rasio, rata-rata, indeks). `INDONESIA-SPECIFIC`
10. UU 25/2004 / PP 39/2006 ecosystem (monev keluaran-hasil-dampak) — cited via secondary GoI documents; primary verification queued v1.1. `INDONESIA-SPECIFIC`

Tier 2: BetterEvaluation, *Logframe* method page (variants: GOPP, Social Framework, Outcome Mapping context).

Tier 3 (linguistic basis, standard references — not fetched this pass, listed for v1.1 verification): Sneddon et al., *Indonesian Reference Grammar* (voice & affixation); Halliday & Matthiessen (nominalization/grammatical metaphor); standard RBM literature (Kusek & Rist, *Ten Steps to a Results-Based M&E System*, World Bank).

— END OF STANDARD v1 —
