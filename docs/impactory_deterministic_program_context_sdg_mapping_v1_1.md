# Impactory Deterministic Program Context & SDG/TPB Mapping v1

**Artifact:** `impactory_deterministic_program_context_sdg_mapping_v1.md`
**Mode:** DEEP RESEARCH + ONTOLOGY AUTHORING + DETERMINISTIC MAPPING DESIGN + REGISTRY DATA AUTHORING + FUZZY-SCORING DESIGN + EXPLANATION-TEMPLATE AUTHORING + REGRESSION-FIXTURE AUTHORING.
**Bukan implementasi.** Tidak ada application code, migration, UI, prompt runtime, atau panggilan Azure di dokumen ini. Dokumen ini adalah knowledge feeding untuk implementasi Antigravity setelah review.

---

## 1. Executive Summary

Dokumen ini adalah corpus ketiga dalam keluarga knowledge Impactory, dan yang pertama yang dirancang untuk **deterministic runtime** (bukan LLM runtime). Ia mendefinisikan ontology, registry, weighted mapping rules, fuzzy scoring, anti-signals, explanation templates, missing-information rules, conflict-resolution rules, dan regression fixtures untuk flow GrantWriter dua halaman: Page 1 (informasi inti) → deterministic context mapping → Page 2 (review Program Blueprint) → approval → Golden Generation (GPT-5.5, satu-satunya titik konsumsi token besar).

**Keputusan desain kunci:**

1. **Concept-ID-first, bukan keyword-first.** Language ontology (§10–12) menerjemahkan teks user (formal/informal, ID/EN) menjadi canonical concept IDs. Seluruh scoring (§14, §17, §22) beroperasi pada concept IDs — keyword similarity bukan dimensi scoring utama. Ini yang membedakan ontology dari keyword list.
2. **SDG alignment dibuktikan oleh Outcome + Indicator, bukan oleh siapa penerima manfaatnya.** Primary SDG mensyaratkan minimal 1 supported outcome family DAN (1 supported indicator family ATAU 1 verified official target alignment) — §22.2. Anti-signal registry (§23) secara eksplisit memblokir jalan pintas "petani→SDG2, perempuan→SDG5, anak→SDG4, platform→SDG9, iklim→SDG13".
3. **Beneficiary ≠ Target Actor.** Registry aktor (§15) memisahkan tujuh peran; kesalahan klasik "siswa = target actor program pelatihan guru" ditangani sebagai conflict rule (§28) dan fixture (§31).
4. **Setiap mapping wajib punya evidence span + provenance.** Tidak ada mapping tanpa jejak ke teks/field sumber (§13, §29). Explanation dihasilkan dari template deterministic (§24), bukan LLM.
5. **Ambiguity adalah first-class output, bukan kegagalan.** Bila skor top-1 dan top-2 terlalu dekat, sistem menampilkan pilihan ringkas kepada user (§28), tidak memutuskan diam-diam.
6. **Kompatibilitas penuh dengan corpus existing.** Seluruh sector IDs (SECTOR-XXX-NNN), archetype IDs (ARCH-XXX-NNN), indicator IDs (IND-*), anti-pattern IDs (ANTI-*), hard negatives (HN-1..100), dan gold chains dipertahankan; namespace baru hanya untuk kelas concept yang belum ada (§9).

**Status akhir:** `DETERMINISTIC_ONTOLOGY_CORPUS_PARTIAL_WITH_IDENTIFIED_GAPS` — seluruh 41 section wajib terisi dan seluruh registry minimal terpenuhi; gap yang tersisa bersifat pendalaman (entri FULL tambahan per registry, kalibrasi bobot dari telemetry, verifikasi URL sumber ber-label `HUMAN_REVIEW_REQUIRED`) dan terdaftar di §37–38. Tidak ada gap struktural yang menghalangi P0-A implementasi.

---

## 2. Scope and Non-Goals

**In scope:** ontology definitions; lexicon bilingual (formal + informal Indonesia); registry data (sector, actor, problem family, archetype, outcome family, output family, cross-cutting, SDG/TPB); weighted fuzzy scoring design; threshold & confidence model; anti-signal registry; explanation templates; missing-information rules; conflict/ambiguity rules; Page 1/Page 2 data contracts; 30 end-to-end examples; regression fixtures; machine-extractable YAML annexes; runtime extraction recommendation (konseptual); evaluation plan.

**Non-goals (mengikat):** tidak ada application code dalam bahasa pemrograman apa pun; tidak ada pseudocode yang menyerupai source code; tidak ada skema database/migration; tidak ada UI; tidak ada production prompt; tidak ada pemanggilan model; tidak ada perubahan pada tiga canonical source files; tidak ada fabrikasi nomor target/indikator SDG/TPB; tidak ada keputusan donor-specific yang diangkat menjadi aturan universal.

**Batas kemampuan yang diakui sejak awal:** deterministic engine ini dirancang untuk *mapping dan review*, bukan *pemahaman terbuka*. Cerita bebas yang benar-benar di luar coverage ontology akan menghasilkan low-confidence result + disambiguation questions — itu perilaku yang benar, bukan bug. Extraction model murah (opsional) hanya menghasilkan candidate structured signals; keputusan final selalu di rules engine.

---

## 3. Research Methodology

1. **Source files diperiksa:** `impactory_sector_intervention_indicator_causal_corpus_v1.md` (1.886 baris; sector taxonomy §6, archetype taxonomy §8, indicator registry §11, causal patterns §13–14, safeguard packs §19, Indonesia pack §20); `impactory_corpus_gap_closure_supplement_v1_1.md` (347 baris; IND-025..060, HN-31..100, GOLD-07..12, donor profiles §S1); dan `impactory_bilingual_lfa_linguistic_guardrail_v1.md` (1.207 baris — **diverifikasi langsung**; awalnya tidak tersedia, kemudian disediakan dan di-cross-check penuh). Hasil cross-check guardrail: (a) Universal Semantic Model + decision tree Q1–Q5 dan rules V-2 (proposisi bukan kata pertama), V-3 (control test), V-4 (quantity ≠ level) **konsisten** dengan invalid relationships §8 dan aturan extraction §13 dokumen ini; (b) prinsip morphology-as-signal-never-verdict **konsisten** dengan §12; (c) confidence bands guardrail (0.60/0.80 cut points) **identik** dengan band §27; (d) delta yang direkonsiliasi: margin rule guardrail 0.15 berlaku untuk *klasifikasi level statement*, sedangkan margin 0.10 dokumen ini berlaku untuk *sector scoring* — dua domain berbeda, keduanya dipertahankan dan tidak boleh dikonflasi oleh implementasi; bobot klasifikasi level guardrail (semantic role 40 / object 20 / control 20 / linguistic 15 / quant 5) dipakai layer level-classification, terpisah dari bobot sector/SDG scoring §14/§22.
2. **External sources diperiksa:** UN SDG Global Indicator Framework (A/RES/71/313 + 2025 Comprehensive Review yang disahkan UNSC sesi ke-56, Maret 2025 — diverifikasi via unstats.un.org); Bappenas TPB metadata (S-06 register v1); OECD DAC (S-01); INTPA (S-03); dan sumber Tier 2 by-name sesuai kebutuhan entri.
3. **Ekstraksi concepts:** concept diekstrak dari (a) outcome/output/problem families yang sudah implisit di sector packs v1 §7, (b) archetype signals v1 §9, (c) frasa informal pada HN-1..100 dan gold chains, (d) daftar wajib pada spesifikasi task ini. Setiap concept diberi ID stabil (§9) dan minimal satu sumber.
4. **Normalisasi synonyms:** sinonim dikelompokkan pada satu canonical concept; bentuk formal/informal/abbreviation/misspelling disimpan sebagai lexicon variants, bukan concept terpisah. Near-synonym yang berbeda makna operasional (mis. "pendapatan" vs "omzet" vs "laba") TIDAK digabung — dipisah sebagai related concepts dengan disambiguation.
5. **Pemisahan ambiguous terms:** istilah ambigu (§12) tidak pernah menjadi trigger tunggal untuk mapping; ia menghasilkan multiple candidates + disambiguation question. Morphology (imbuhan pe-an, ke-an, ter-) hanya supporting signal — didokumentasikan eksplisit karena bahasa Indonesia sangat produktif secara morfologis dan imbuhan yang sama bisa menghasilkan Activity noun ("pelatihan") maupun Outcome noun ("peningkatan").
6. **Stable ID convention:** §9.
7. **Sector hierarchy:** mewarisi 30 sektor v1 §6 tanpa perubahan; subsector diperkenalkan sebagai lapisan opsional (namespace SUB-) hanya bila dibutuhkan disambiguasi — v1 tidak memiliki subsector formal, dan memaksakan hirarki penuh sekarang akan mengarang struktur tanpa evidence. `HEURISTIC_ONLY` untuk subsector yang dibuat di dokumen ini.
8. **Archetype methodology:** mewarisi 40 archetype v1 §8; mapping ini menambah signals (action/object/actor), bukan archetype baru.
9. **Outcome/output-family methodology:** families diekstrak dari result families sector packs v1 + daftar wajib spec; setiap family dipetakan ke indicator families (IND-*) yang sudah ada agar SDG scoring bisa berjalan di atas registry yang sama.
10. **SDG/TPB mapping methodology:** affinity dibangun dari arah Outcome→Target (bukan sector→Goal); setiap affinity menunjuk official target ID; indikator resmi hanya dikutip nomor + judul ringkas (tidak menyalin metadata penuh — menghormati aturan "jangan menyalin berlebihan").
11. **Fuzzy-weight methodology:** bobot awal dari spec diadopsi sebagai prior; §22 menambahkan aturan normalisasi, saturasi, dan interaksi anti-signal; §36 mendefinisikan prosedur kalibrasi terhadap fixtures.
12. **Anti-signal methodology:** anti-signal = kondisi yang MENGURANGI skor atau MEMBLOKIR level rekomendasi meski positive signals ada; diturunkan dari ANTI-01..15 v1, HN-1..100, dan invalid relationships §4.2 spec.
13. **Gold-chain usage:** 12 gold chains menjadi fixtures ekspektasi-positif (§32) dan sumber kalibrasi threshold "harus lolos".
14. **Hard-negative usage:** HN-1..100 menjadi fixtures ekspektasi-negatif (§31) dan sumber kalibrasi "harus ditolak/di-warning".
15. **Source-verification:** label epistemik per entri (§4); yang belum diverifikasi tidak dinyatakan sebagai fakta resmi.
16. **Limitations:** §37.

**Pembedaan kelas artefak (mengikat untuk seluruh dokumen):**

```text
Ontology  → apa concept-nya dan bagaimana hubungannya (§8, §10)
Lexicon   → bagaimana concept diekspresikan dalam bahasa (§10–12)
Registry  → data terstruktur untuk lookup (§14–21, §23, §26)
Rule      → bagaimana signals memengaruhi mapping (§22, §25, §27–28)
Template  → bagaimana explanation dibuat tanpa LLM (§24)
Fixture   → contoh untuk menguji hasil mapping (§30–32)
```

---

## 4. Source Hierarchy

| Tier | Sumber | Peran | Label default |
|---|---|---|---|
| 1 | UN SDG framework (A/RES/71/313; 2025 Comprehensive Review, UNSC-56 Mar 2025); UN SDG metadata repository; Bappenas TPB/SDGs; BPS Indikator TPB; metadata resmi TPB Edisi II | nomor & judul Goal/Target/Indicator; TPB alignment | `VERIFIED_OFFICIAL` (nomor target level Goal/Target); indikator pasca-2025-review `HUMAN_REVIEW_REQUIRED` untuk delta |
| 2 | OECD-DAC, INTPA, UNDP, UNICEF, WHO, FAO, ILO, UN Women, UNDRR, World Bank, ADB, USAID, FCDO, DFAT, GIZ, Bappenas, K/L Indonesia | definisi hasil, indikator sektoral, konvensi | per-entri; by-name tanpa URL → `HUMAN_REVIEW_REQUIRED` |
| 3 | Canonical Impactory corpus (guardrail v1; corpus v1; supplement v1.1) | language ontology, taxonomy, families, causal patterns, HN, gold | `CANONICAL_IMPACTORY` |

Label epistemik yang dipakai di seluruh dokumen: `VERIFIED_OFFICIAL`, `CANONICAL_IMPACTORY`, `INDONESIA_SPECIFIC`, `SECTOR_SPECIFIC`, `INTERVENTION_SPECIFIC`, `DONOR_SPECIFIC`, `CONTEXT_DEPENDENT`, `HEURISTIC_ONLY`, `HUMAN_REVIEW_REQUIRED`. Format source tracing per mapping: organization | document title | year/version | URL | section | target/indicator ref | verification status (register lengkap §41).

---

## 5. Relationship to Existing Impactory Corpora

```text
Linguistic Guardrail v1 (lexical + level-classification layer) — TERVERIFIKASI
  → canonical levels (impact/outcome/intermediate_outcome/output/activity
    + WBS work_package/task/milestone); terminology crosswalk 9 organisasi;
    Universal Semantic Model (decision tree Q1–Q5; rules V-2/V-3/V-4);
    language packs ID+EN (signals berbobot, ≥20 counterexamples/bahasa);
    deterministic rule catalogue; confidence scoring level-classification
    (40/20/20/15/5; bands 0.60/0.80; margin 0.15); fixtures: 200 gold,
    100 hard negatives, 10 full bilingual chains
Corpus v1 + Supplement v1.1 (semantic/plausibility layer)
  → sektor, archetype, indikator, causal patterns, anti-patterns
Dokumen ini (deterministic mapping layer)
  → BAGAIMANA input user dipetakan ke concept IDs dari dua layer di atas,
    dengan skor, ambang, penjelasan, dan fixtures — tanpa LLM.
```

Pembagian kerja runtime (mengikat): guardrail menjawab "statement ini level apa?" (level classification); dokumen ini menjawab "program ini tentang apa?" (context mapping). Keduanya berbagi prinsip (control test, morphology-as-signal, non-blocking findings) tetapi memakai konfigurasi bobot & margin masing-masing. Label epistemik guardrail dipetakan ke label dokumen ini: `CANONICAL` → `CANONICAL_IMPACTORY` (bila sumber OECD-DAC/multi-donor: `VERIFIED_OFFICIAL`); `DONOR-SPECIFIC` → `DONOR_SPECIFIC`; `INDONESIA-SPECIFIC` → `INDONESIA_SPECIFIC`; `PREFERRED IMPACTORY CONVENTION` → `CANONICAL_IMPACTORY` (konvensi internal, bukan standar internasional); `HEURISTIC ONLY` → `HEURISTIC_ONLY`; `AMBIGUOUS / REQUIRES SEMANTIC REVIEW` → status ambiguity §28, bukan label sumber.

Aturan kompatibilitas: (1) dokumen ini TIDAK mendefinisikan ulang makna canonical apa pun dari corpus v1 — bila ada ketegangan, corpus v1 menang dan ketegangan dicatat di §38; (2) seluruh referensi ke indikator memakai IND-001..060; ke anti-pattern memakai ANTI-01..15; ke hard negatives memakai HN-nn; ke gold memakai GOLD-ID; (3) rule C-1 (leap detection), C-2 (control menurun ke atas), C-3 (evidence escalation) dari v1 §5 berlaku sebagai constraint pada blueprint assembly (§25).

---

## 6. Page 1 Input Contract

Field Page 1 (final, tidak ditambah tanpa revisi kontrak):

| field_id | classification | required | allow_unknown | validation_type | catatan |
|---|---|---|---|---|---|
| program_title | USER_FACT | ya | tidak | non_empty_text ≤200 char | dipakai sebagai signal lemah (judul sering aspiratif — jangan over-weight) |
| location | USER_FACT | ya | ya (`unknown` eksplisit) | gazetteer-resolvable text | resolusi ke admin hierarchy Indonesia (§10 geography concepts); lokasi luar negeri → `CONTEXT_DEPENDENT` |
| duration_value + duration_unit | USER_FACT | ya | ya | positive_number + enum(bulan/tahun) | dipakai oleh duration-impact mismatch rule (§28) |
| beneficiary_description | USER_FACT | ya | tidak | non_empty_text | input utama actor classification |
| beneficiary_count + beneficiary_unit | USER_ESTIMATE | ya | ya | non_negative_integer + enum(orang/KK/kelompok/lembaga/desa) | `fabrication_forbidden: true` — engine tidak pernah mengisi angka |
| funding_amount + currency | USER_ESTIMATE | ya | ya | non_negative_number + ISO currency | budget-scope mismatch rule (§28) |
| donor_or_call_optional | OPTIONAL | tidak | ya | text/registry-match | bila match donor registry → aktifkan `DONOR_SPECIFIC` layer; tidak pernah mengubah canonical meaning |
| program_story | USER_FACT (naratif) | ya | tidak | text 50–3.000 char (soft) | satu-satunya sumber extraction naratif |
| supporting_documents_optional | OPTIONAL | tidak | ya | file refs | evidence bonus 5% pada sector score; TIDAK diekstrak deterministic v1 (P1) |

Klasifikasi tambahan per field: `REQUIRES_CONFIRMATION` melekat pada setiap nilai `unknown`; `NEVER_INFER_WITHOUT_REVIEW` melekat pada beneficiary_count, funding_amount, duration (engine boleh MENANYAKAN, tidak boleh MENGISI).

Contoh kontrak field (format acuan; seluruh field mengikuti pola ini):

```yaml
field_id: beneficiary_count
classification: USER_ESTIMATE
required: true
allow_unknown: true
validation_type: non_negative_integer
unknown_state: requires_confirmation
used_for: [proposal_scope, indicator_targeting, preliminary_cost_drivers]
fabrication_forbidden: true
```

---

## 7. Organization Profile Reuse Contract

Data organisasi TIDAK diminta ulang di GrantWriter. Sumber: Active Organization Profile → Settings → Impact Library. Field yang di-reuse: organization_name, organization_type, organization_year_established, organization_profile, organization_focus, organization_operating_area, organization_website, organization_experience, organization_documents.

Aturan bila profil belum lengkap: tampilkan warning non-blocking + link ke Organization Settings; draft tetap boleh dibuat; blocking HANYA bila donor requirement aktif secara eksplisit mensyaratkan field tsb (`DONOR_SPECIFIC`, dievaluasi dari donor registry — bukan aturan universal).

**Snapshot rule (mengikat):** bedakan `current organization profile` (hidup, bisa berubah) dari `proposal organization snapshot` (beku per proposal saat dibuat/di-regenerate atas perintah user). Proposal existing membaca snapshot-nya sendiri; perubahan profil organisasi tidak pernah mengubah dokumen lama secara diam-diam. Blueprint provenance (§25.6) mencatat snapshot version yang dipakai.

---

## 8. Ontology Architecture

Struktur concept program (node) — mengikuti spec, dipetakan ke registry section dokumen ini:

```text
Program
├── Organization Context (§7)      ├── Geography (§10)
├── Duration (§10)                 ├── Funding Context (§10)
├── Donor Context (§10, DONOR_SPECIFIC)
├── Problem (§16)
│   ├── Structural Cause  ├── Immediate Cause
│   ├── Manifestation     └── Affected Condition
├── Actor (§15): Target Actor | Beneficiary | Implementing Actor |
│   Institution | Duty Bearer | Rights Holder | Intermediary |
│   Service Provider | Decision Maker
├── Sector (§14) ── Subsector (opsional, HEURISTIC_ONLY)
├── Intervention Archetype (§17)
├── Activity | Output (§19) | Intermediate Outcome | Outcome (§18) | Impact
├── Indicator (IND-001..060, corpus v1/v1.1)
├── Evidence | Assumption | Risk | Mitigation (corpus v1 §17–18)
├── Cross-Cutting Concern (§20)
└── SDG/TPB Alignment (§21–23)
```

**Valid relationships (edge types yang boleh dibuat engine):**

```text
problem caused_by cause · problem affects beneficiary · problem involves actor
intervention addresses problem_or_cause · activity implements intervention
activity produces output · output enables outcome · actor uses output
actor adopts practice · outcome contributes_to impact
indicator measures result · evidence verifies indicator
assumption conditions causal_link · risk threatens causal_link
mitigation reduces risk · sector contains subsector
archetype applies_to sector · result aligns_with sdg_target
indicator aligns_with sdg_indicator
```

**Invalid relationships (edge yang TIDAK PERNAH dibuat otomatis).** Dua belas relasi terlarang, masing-masing dengan analisis. Format kolom: mengapa invalid | missing causal link | missing actor | missing evidence | arah koreksi | severity | deterministic detectability | human review.

| # | Invalid edge | Mengapa invalid | Missing link | Missing actor | Missing evidence | Koreksi | Sev | Det | HR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | activity = impact | kegiatan bukan kondisi jangka panjang | seluruh spine | target actor | semua level | turunkan ke Activity; bangun rantai | H | TINGGI (pola leksikal "terlaksananya…" di baris impact) | tidak |
| 2 | training completion = behaviour change | selesai ≠ menerapkan (ANTI-01) | adopsi, enabler | peserta sbg agen | verifikasi praktik | tambah IO practice_adopted | H | TINGGI | tidak |
| 3 | platform availability = adoption | tersedia ≠ dipakai (ANTI-02/06) | minimum-use | pengguna aktif | analytics ber-threshold | IO technology_used + MAU def | H | TINGGI | tidak |
| 4 | equipment distribution = productivity | diterima ≠ dipakai (ANTI-03) | utilisasi, O&M | operator | log pemakaian | IO technology_used → yield | H | TINGGI | tidak |
| 5 | policy document = policy implementation | disahkan ≠ dijalankan (ANTI-05) | mekanisme, anggaran | duty bearer | bukti implementasi | pecah approval→implementation | H | TINGGI | tidak |
| 6 | beneficiary reach = wellbeing | dijangkau ≠ sejahtera (ANTI-04) | adopsi→kinerja | — | outcome terukur | reach=output; tulis outcome | H | TINGGI | tidak |
| 7 | fund disbursement = business growth | cair ≠ tumbuh (ANTI-08) | penggunaan produktif | pelaku usaha | kinerja usaha | rantai penggunaan→omzet | H | TINGGI | tidak |
| 8 | awareness campaign = behaviour change | tahu ≠ berperilaku (ANTI-12) | kemampuan, enabler | subkelompok | ukur perilaku | IO knowledge→practice | H | SEDANG (perlu deteksi klaim perilaku) | tidak |
| 9 | infrastructure built = service utilization | terbangun ≠ dipakai | operasional, akses | pengelola, pengguna | data utilisasi | IO service_utilized | H | TINGGI | tidak |
| 10 | MoU signed = institutional change | kertas ≠ fungsi (HN-42) | aksi bersama | kedua institusi | kegiatan pasca-MoU | output→IO kolaborasi konkret | M | TINGGI | tidak |
| 11 | research published = policy adoption | terbit ≠ diadopsi (ANTI-13) | engagement, uptake | pengambil kebijakan | jejak kutipan | IND-KNOW-ENGAGE-053 bridge | H | TINGGI | tidak |
| 12 | SDG selection = impact evidence | memilih SDG ≠ bukti dampak | outcome+indicator | — | alignment tervalidasi | §22.2 coverage requirement | H | TINGGI (structural check) | tidak |

Seluruhnya `CANONICAL_IMPACTORY` (diturunkan dari ANTI-01..15 + HN corpus). Deterministic detectability TINGGI berarti terdeteksi dari kombinasi output_family + klaim outcome tanpa IO pendukung — tanpa LLM.

---

## 9. Stable ID and Namespace Convention

ID existing dipertahankan (tidak diganti, tidak dialias ulang): `SECTOR-XXX-NNN`, `ARCH-XXX-NNN`, `IND-XXX-NNN`, `ANTI-NN`, `HN-NN`, `GOLD-*`, `CAUSAL-XXX-NNN`, S-NN (source register v1).

Namespace BARU yang diperkenalkan dokumen ini (semua uppercase, hyphenated, ≤5 segmen):

```text
CNC-<KELAS>-NNN     language concept (KELAS: PROB, CAUSE, ACTOR, GEO, DUR,
                    BUDG, DONOR, XCUT, MISC)
PF-NNN              problem family
OF-NNN              outcome family
OPF-NNN             output family
ACT-NNN             actor entry
XC-NNN              cross-cutting entry
SUB-<SECTOR>-NN     subsector opsional (HEURISTIC_ONLY)
SDG_N               SDG goal (1..17); target resmi memakai notasi resmi "N.n";
                    indikator resmi "N.n.m" — tidak dibuat ID internal baru
                    untuk objek resmi UN
SDG-ANTI-XXX-NNN    SDG anti-signal
TPL-<KELAS>-NNN     explanation template (KELAS: PRI, SEC, REJ, AMB, STUF,
                    BLUE, MISS, CONF)
MISS-NNN            missing-information rule
CONF-NNN            conflict rule
FIX-HN-NNN          hard-negative fixture · FIX-GOLD-NN gold fixture
```

Aturan: ID immutable setelah publikasi; perubahan nama → field `aliases[]`, bukan ID baru; duplikasi dicegah dengan registry manifest tunggal per namespace (§34); setiap entri menyimpan `source_document` + `source_section`.

---

## 10. Bilingual Language Ontology

Ontology memuat 22 concept families wajib: problem, structural-cause, immediate-cause, actor, beneficiary, institution, sector, subsector, intervention, outcome, output, activity, indicator, evidence, risk, assumption, mitigation, geography, duration, budget, donor, cross-cutting, SDG/TPB. Families sector/intervention/outcome/output/indicator/actor mendapat registry penuh di §14–19; family lain didefinisikan di sini.

**Metadata wajib per concept** — schema penuh di Annex A (§33). Dua entri contoh FULL sebagai format acuan; entri lain dalam dokumen ini memakai bentuk kompak (canonical name + variants + signals) dan diekspansi ke schema penuh saat runtime extraction (§34):

```yaml
concept_id: CNC-PROB-001
canonical_name: limited_market_access
preferred_id: "akses pasar terbatas"
preferred_en: "limited market access"
definition_id: >
  Kondisi ketika pelaku usaha/produsen tidak dapat menjangkau pembeli,
  kanal penjualan, atau pasar bernilai lebih baik secara berkelanjutan.
definition_en: >
  Condition in which producers/enterprises cannot sustainably reach
  buyers, sales channels, or higher-value markets.
synonyms_id: ["akses pasar rendah", "sulit memasarkan", "pasar terbatas"]
synonyms_en: ["poor market access", "market exclusion"]
informal_expressions_id: ["susah jualan", "gak punya akses pasar",
  "bergantung tengkulak", "harga dimainkan pengepul",
  "belum masuk pasar modern", "akses pembeli susah"]
formal_expressions_id: ["keterbatasan akses pasar"]
formal_expressions_en: ["restricted market access"]
abbreviations: []
common_misspellings: ["ases pasar", "tengkulak/tengkulak2"]
near_synonyms: ["harga rendah (CNC-PROB-002 low_margin) — BUKAN concept sama:
  akses bisa ada tapi margin rendah"]
broader_concepts: ["PF-001 limited_market_access family"]
narrower_concepts: ["ketergantungan tengkulak", "tidak ada offtaker"]
related_concepts: ["CNC-PROB-006 limited_finance_access"]
ambiguous_terms: ["akses (lihat §12)"]
negative_expressions: ["sudah punya kontrak offtaker", "pasar bukan masalah"]
exclusion_expressions: ["akses jalan", "akses air" ]
positive_signals: ["tengkulak", "pengepul", "offtaker", "pembeli",
  "harga jual", "pasar modern", "marketplace (dlm konteks jualan)"]
negative_signals: ["akses layanan", "akses informasi"]
anti_signals: ["'akses' tanpa objek pasar/pembeli"]
applicable_sectors: [SECTOR-AGRI-001, SECTOR-LIVELIHOOD-002, SECTOR-COOP-003]
applicable_archetypes: [ARCH-MARKET-015, ARCH-VALUECHAIN-016, ARCH-CERT-035]
applicable_result_levels: [problem]
disambiguation_questions: ["Apakah masalah utamanya menjangkau pembeli,
  atau harga/margin yang diterima?"]
epistemic_label: CANONICAL_IMPACTORY
sources: ["corpus v1 §7.1–7.2", "S-07"]
```

```yaml
concept_id: CNC-ACTOR-014
canonical_name: teacher
preferred_id: "guru"
preferred_en: "teacher"
definition_id: "Pendidik pada satuan pendidikan formal/nonformal."
definition_en: "Educator in formal/non-formal education units."
synonyms_id: ["pendidik", "guru kelas", "wali kelas"]
synonyms_en: ["educator", "classroom teacher"]
informal_expressions_id: ["bapak/ibu guru", "ustadz/ustadzah (konteks madrasah)"]
abbreviations: ["GTT", "PNS guru"]
common_misspellings: []
near_synonyms: ["tutor PKBM", "fasilitator belajar — peran mirip, lembaga beda"]
broader_concepts: [CNC-ACTOR-000 service_provider]
related_concepts: ["CNC-ACTOR-015 siswa", "CNC-ACTOR-016 kepala sekolah"]
ambiguous_terms: []
positive_signals: ["mengajar", "kelas", "kurikulum", "pembelajaran"]
negative_signals: []
anti_signals: ["'guru' sebagai kiasan (guru kehidupan)"]
applicable_sectors: [SECTOR-EDU-006]
applicable_archetypes: [ARCH-TRAINING-001, ARCH-MENTOR-003, ARCH-TOT-002]
applicable_result_levels: [actor]
disambiguation_questions: ["Apakah guru adalah pihak yang berubah praktiknya
  (target actor), atau penyelenggara kegiatan (implementer)?"]
epistemic_label: CANONICAL_IMPACTORY
sources: ["corpus v1 GOLD-07 (v1.1 §S4)"]
```

**Concept families non-registry (definisi + contoh kompak):**

- **Geography (CNC-GEO-*):** hirarki resmi provinsi→kabupaten/kota→kecamatan→desa/kelurahan→dusun/RW/RT; entitas khusus: desa adat, kawasan 3T. Normalisasi lokasi ke level terendah yang disebut; simpan `admin_level`. `INDONESIA_SPECIFIC`. Lokasi menghasilkan signal untuk partner suggestion (§25.5) dan TIDAK pernah menjadi signal SDG.
- **Duration (CNC-DUR-*):** normalisasi ke bulan; kelas: `short (≤12)`, `medium (13–36)`, `long (>36)`. Dipakai oleh duration-impact mismatch (§28) dan time_horizon_guidance outcome families (§18).
- **Budget (CNC-BUDG-*):** normalisasi currency; kelas magnitudo per beneficiary (`budget_per_beneficiary`) sebagai sanity signal — TIDAK menjadi dasar cost estimate (fabrication_forbidden). Budget Readiness ≠ Budget Compliance (aturan corpus v1 §16 berlaku).
- **Donor (CNC-DONOR-*):** match ke donor registry (INTPA, USAID, UNDP, WB/ADB, DFAT, GIZ, FCDO, humanitarian, foundations, BAZNAS/LAZ, Bappenas/pemerintah, CSR — corpus v1 §21 + v1.1 §S1). Match mengaktifkan layer `DONOR_SPECIFIC` (required fields, terminology, marker) — tidak mengubah scoring canonical, kecuali komponen "explicit donor/call alignment" 3% (§22).
- **Evidence/Assumption/Risk/Mitigation concepts:** mewarisi definisi corpus v1 §17–18; di layer bahasa hanya perlu lexicon pendeteksi (mis. "asumsi", "risiko", "jika…maka", "dengan syarat") untuk memisahkan klaim user dari fakta.
- **Indicator concepts:** frasa indikator dalam story ("kami ukur lewat…", "targetnya X%") menjadi indicator_family candidates — dipetakan ke IND-* via keluarga, bukan exact match.

---

## 11. Indonesian Informal Language Registry

Register frasa informal → canonical concept + problem family + catatan. Mapping menjaga makna asli, tidak menaikkan result level, tidak menyimpulkan causal claim, dan selalu menyimpan evidence span. `CANONICAL_IMPACTORY`; sumber: HN corpus + praktik lapangan `HEURISTIC_ONLY` untuk frasa yang belum muncul di corpus.

| Frasa informal (ID) | Canonical concept | Problem family (§16) | Catatan mapping |
|---|---|---|---|
| gak punya akses pasar | limited_market_access | PF-001 | — |
| masih bergantung tengkulak | dependence_on_middlemen (narrower PF-001) | PF-001 | JANGAN otomatis berarti tengkulak buruk — bisa jadi satu-satunya kanal; jangan mengarang intervensi "putus tengkulak" |
| susah jualan | limited_market_access ATAU low_demand | PF-001 | ambigu ringan → dua candidates bila tak ada konteks |
| belum punya pencatatan | weak_business_records | PF-005 | signal kuat ARCH-TRAINING-001/MENTOR-003 |
| usaha jalan di tempat | business_stagnation | PF-002/PF-004 | manifestasi, bukan penyebab — jangan pilih cause tanpa signal lain |
| koperasi gak aktif | weak_institutional_capacity (koperasi) | PF-007 | aktifkan ambiguous term "aktif" (§12) |
| data masih berantakan | data_fragmentation | PF-026 | signal ARCH-DATA-009/MIS-027 |
| hasil panen sering rugi | low_margin / post_harvest_loss | PF-003 | dua candidates: harga vs susut (IND-AGRI-LOSS-054) |
| belum melek digital | low_technology_adoption / digital_exclusion | PF-011 + XC-016 | jangan otomatis → SDG 9 (SDG-ANTI) |
| akses pembeli susah | limited_market_access | PF-001 | — |
| harga dimainkan pengepul | low_margin + price_information_asymmetry | PF-003 | klaim kausal user — simpan sebagai candidate cause, requires_confirmation |
| belum bankable | limited_finance_access | PF-006 | signal ARCH-A2F-013; JANGAN loncat ke "kredit = tumbuh" (ANTI-08) |
| belum masuk pasar modern | limited_market_access (kanal formal) | PF-001 | signal ARCH-CERT-035 (standar sering prasyarat) |
| belum ada SOP | weak_institutional_capacity | PF-007 | output family SOP_drafted relevan; SOP ≠ outcome |
| layanan masih ribet | poor_service_quality | PF-010 | sektor tergantung objek layanan |
| warga tidak didengar | limited_participation / weak_accountability | PF-013/PF-012 | dua candidates; signal ARCH-SOCACC-029 |
| program tidak nyambung | coordination_gap | PF-027 | — |
| bantuan tidak tepat sasaran | targeting_error (narrower weak_accountability) | PF-012 | relevan SOCPRO; IND-SOCPRO-INCL-037 |
| susah dapat modal | limited_finance_access | PF-006 | — |
| anak sering tidak masuk sekolah | learning_gap (manifestasi kehadiran) | PF-019 | IND-EDU-ATTEND-055; ATS bila putus |
| layanan kesehatan jauh | low_service_access (kesehatan) | PF-008 | akses ≠ utilisasi — dua family beda |
| air bersih susah | WASH_access_gap | PF-020 | — |

Aturan umum: frasa informal menghasilkan **candidate** dengan confidence sedang (0.5–0.7), bukan verdict; dua kandidat bila makna bercabang; evidence span wajib.

---

## 12. Ambiguous Language Registry

25 istilah wajib. Format ringkas per istilah: makna-makna | konteks yang membedakan | risiko result level | pertanyaan bila tak terurai. Morphology hanya supporting signal. Satu entri FULL sebagai acuan format:

```yaml
term: "pemberdayaan"
possible_meanings:
  - intervention_process (serangkaian kegiatan penguatan)
  - outcome_claim (kondisi berdaya tercapai)
  - sector_frame (program "pemberdayaan" generik)
required_context: [objek yang diberdayakan, perubahan spesifik yang dimaksud]
disambiguation_signals:
  - "kegiatan/pelatihan/pendampingan pemberdayaan" → process
  - "masyarakat menjadi berdaya/mandiri" → outcome_claim (butuh definisi)
negative_signals: ["pemberdayaan" + daftar kegiatan → hampir pasti process]
result_level_risks: [Activity ditulis sebagai Outcome (HN-17), outcome claim
  tanpa definisi terukur (HN-93)]
questions_if_unresolved:
  - "Perubahan konkret apa pada siapa yang dimaksud dengan pemberdayaan?"
false_positive_examples: ["pemberdayaan aparatur (konteks birokrasi internal)"]
false_negative_examples: ["penguatan ekonomi perempuan (tanpa kata
  pemberdayaan, tetap empowerment concept)"]
```

| Term | Makna mungkin | Pembeda konteks | Risiko level | Pertanyaan kunci |
|---|---|---|---|---|
| kapasitas | kemampuan individu / fungsi lembaga / daya tampung fisik | objek: orang, organisasi, atau infrastruktur | "peningkatan kapasitas" sebagai outcome kosong (HN-17) | Kapasitas siapa, dalam hal apa, dibuktikan bagaimana? |
| keberlanjutan | finansial / lingkungan / kelembagaan / kontinuitas program | pendamping kata: dana, ekologi, organisasi | sustainability leap (IND-11 anti-pattern) | Berlanjut dalam arti apa, siapa penanggungnya pasca-proyek? |
| aktif | frekuensi kegiatan / status legal / minimum-use | ada threshold? (PIC-IND-4) | "aktif" tanpa definisi = HN-46 | Apa definisi minimum aktif per bulan? |
| berdaya | ekonomi / psikologis / politik | domain yang disebut | outcome claim tanpa ukur (HN-93) | Perubahan terukur apa yang menandakan berdaya? |
| mandiri | finansial / operasional / keputusan | pasca-proyek? sumber daya sendiri? | horizon overclaim (HN-48) | Mandiri dari dukungan apa, sejak kapan? |
| meningkat | arah tanpa baseline/besaran | ada baseline & unit? | indikator tanpa metadata (HN-57) | Dari berapa ke berapa, diukur bagaimana? |
| digitalisasi | pembuatan sistem / adopsi penggunaan / transformasi proses | output vs use signals | platform=adoption (invalid #3) | Sistem dibuat, dipakai, atau mengubah proses? |
| penguatan | pelatihan / pendampingan / restrukturisasi | kegiatan yang disebut | activity-as-outcome | Penguatan lewat kegiatan apa, hasil terverifikasinya apa? |
| akses | fisik / finansial / informasi / legal | objek akses | akses ≠ utilisasi | Akses ke apa; apakah penggunaan juga ditargetkan? |
| inklusif | disabilitas / gender / ekonomi / semua | kelompok yang disebut | generic inclusion (HN-98) | Kelompok mana; akomodasi apa yang disediakan? |
| berkualitas | standar apa? | rubrik/standar disebut? | tak terukur | Kualitas menurut standar/rubrik apa? |
| efektif | mencapai target / efisien / dipatuhi | — | tak terukur | Efektif diukur dengan apa? |
| transparan | publikasi / auditability / partisipasi | media & audiens | — | Informasi apa terbuka untuk siapa? |
| akuntabel | pelaporan / respons keluhan / audit | mekanisme disebut | — | Mekanisme akuntabilitas mana yang dimaksud? |
| ketahanan | pangan / iklim / ekonomi / bencana | domain | resiliensi = stabilitas, bukan mean naik (GOLD-11) | Ketahanan terhadap guncangan apa? |
| kesejahteraan | pendapatan / multidimensi | ada indikator? | impact-level di baris bawah (HN-3) | Dimensi kesejahteraan mana yang diukur? |
| partisipasi | kehadiran / suara didengar / keputusan | tingkat tangga partisipasi | kehadiran ≠ pengaruh | Partisipasi pada tingkat apa? |
| kolaborasi | MoU / kegiatan bersama / hasil bersama | artefak yang disebut | MoU=change (invalid #10) | Hasil kolaboratif konkret apa? |
| inovasi | produk baru / cara baru / teknologi | objek | buzzword | Apa yang baru dan bagi siapa? |
| transformasi | perubahan besar tak spesifik | — | overclaim | Perubahan terukur apa dalam horizon proyek? |
| produktif | hasil/jam / penggunaan produktif dana | konteks usaha vs kredit | ANTI-08 | Produktif dalam ukuran apa? |
| berfungsi | terpasang / beroperasi / digunakan | bukti operasional | built≠used (HN-9) | Bukti fungsi apa yang tersedia? |
| terverifikasi | oleh siapa / metode | verifikator disebut | self-report inflation (HN-64) | Diverifikasi pihak mana dengan cara apa? |
| terlatih | hadir / lulus asesmen / kompeten | asesmen disebut | completion=competence | Lulus asesmen apa? |
| meningkatkan (kata kerja judul) | aspirasi umum | judul program sering aspiratif | judul ≠ outcome | (turunkan bobot judul; jangan tanya) |

---

## 13. Structured Program-Story Extraction Contract

Target shape hasil extraction dari `program_story` (dan field lain) — shape ini adalah **kontrak data**, bukan kode:

```yaml
detected_language:            # id | en | mixed
problem_candidates: []        # → PF-*
structural_cause_candidates: []
immediate_cause_candidates: []
affected_condition_candidates: []
target_actor_candidates: []   # → ACT-*
beneficiary_candidates: []
institution_candidates: []
implementing_actor_candidates: []
sector_candidates: []         # → SECTOR-*
subsector_candidates: []
intervention_candidates: []   # → ARCH-*
expected_change_candidates: []
outcome_family_candidates: [] # → OF-*
output_family_candidates: []  # → OPF-*
cross_cutting_candidates: []  # → XC-*
risk_candidates: []
assumption_candidates: []
unknowns: []
contradictions: []
ambiguities: []
confidence_by_candidate: {}
evidence_spans: {}
source_fields: {}
```

Setiap candidate wajib:

```yaml
candidate_id:
canonical_concept_id:
confidence:                 # 0.00–1.00
source_field:               # program_story | beneficiary_description | ...
evidence_span:              # offset/teks kutipan pendek
positive_signals: []
negative_signals: []
anti_signals: []
conflict_signals: []
ambiguity_status:           # none | multi_meaning | low_margin
requires_user_confirmation: # boolean
epistemic_label:
```

Aturan mengikat: (1) **tidak ada mapping tanpa evidence span**; (2) frasa multi-makna → beberapa candidates dengan skor masing-masing + disambiguation question — jangan memilih paksa; (3) klaim kausal user ("karena harga dimainkan pengepul") disimpan sebagai *cause candidate dengan status user-claim*, bukan fakta; (4) angka dalam story (jumlah, target) menjadi USER_ESTIMATE candidates — tidak pernah dinaikkan menjadi fakta; (5) contradictions (story vs field terstruktur, mis. beneficiary_count 100 tapi story "melatih 500") masuk `contradictions[]` → conflict rule CONF-010 (§28); (6) bila extraction model murah dipakai untuk story yang sulit, outputnya HARUS dalam shape yang sama dan diperlakukan sebagai candidates ber-provenance `model_extracted` dengan confidence cap 0.75 — keputusan final tetap deterministic.

---

## 14. Sector and Subsector Registry

Registry mewarisi 30 sektor v1 §6 dengan ID tidak berubah. Schema penuh di Annex B. Satu entri FULL sebagai acuan format; sisanya dalam tabel mapping kompak yang memuat field diskriminatif (positive/informal terms, confusable, anti-signal, SDG affinities). Field yang tidak tercantum di tabel diisi dari sector packs corpus v1 §7 saat runtime extraction.

```yaml
sector_id: SECTOR-AGRI-001
name_id: "Pertanian & Ketahanan Pangan"
name_en: "Agriculture & Food Security"
parent_sector_id: null
definition_id: "Produksi pangan/komoditas pertanian, rantai nilai pertanian,
  dan ketahanan pangan rumah tangga."
positive_terms_id: [petani, panen, lahan, sawah, komoditas, pupuk, benih,
  penyuluh, poktan, gapoktan, ubinan, hasil pertanian]
positive_terms_en: [farmer, harvest, yield, crop, extension]
informal_terms_id: ["hasil panen sering rugi", "harga dimainkan pengepul",
  "gagal panen", "musim gak nentu"]
problem_family_ids: [PF-001, PF-003, PF-004, PF-017, PF-021]
actor_family_ids: [ACT-001 petani kecil, ACT-003 kelompok tani, ACT-004
  gapoktan, ACT-034 penyuluh, ACT-033 offtaker]
intervention_archetype_ids: [ARCH-TRAINING-001, ARCH-DEMPLOT-034,
  ARCH-TECH-033, ARCH-MARKET-015, ARCH-VALUECHAIN-016, ARCH-EQUIP-010]
outcome_family_ids: [OF-003, OF-004, OF-008, OF-009, OF-010, OF-012, OF-022]
output_family_ids: [OPF-001, OPF-002, OPF-013, OPF-023]
indicator_family_ids: [IND-AGRI-ADOPT-009, IND-AGRI-YIELD-010,
  IND-AGRI-PRICE-011, IND-AGRI-FCS-012, IND-AGRI-LOSS-054]
sdg_affinities: [SDG_2 (target 2.3, 2.4), SDG_1 (1.4 kondisional),
  SDG_8 (8.3 bila fokus pendapatan usaha), SDG_13 (13.1 bila adaptasi)]
negative_signals: ["pertanian" sebagai latar lokasi saja tanpa intervensi
  pertanian]
anti_signals: ["petani sebagai beneficiary tanpa outcome pertanian
  → SDG-ANTI-FARMER-001; program literasi keuangan utk petani ≠ sektor AGRI"]
confusable_sector_ids: [SECTOR-LIVELIHOOD-002 (bila fokus usaha/pendapatan
  non-budidaya), SECTOR-CCA-010 (bila fokus adaptasi iklim),
  SECTOR-NUTRI-008 (bila fokus konsumsi gizi)]
disambiguation_questions: ["Apakah perubahan utama pada praktik
  budidaya/hasil panen, atau pada usaha/pendapatan secara umum?"]
epistemic_label: CANONICAL_IMPACTORY
sources: ["corpus v1 §7.1"]
```

**Tabel mapping kompak 30 sektor** (kolom: informal cue khas | confusable | anti-signal khas | SDG affinities utama — target resmi dalam kurung):

| Sector | Cue khas (ID informal) | Confusable dgn | Anti-signal khas | SDG affinities |
|---|---|---|---|---|
| AGRI-001 | panen, tengkulak, pupuk | 002, 010, 008 | petani-as-label | 2 (2.3,2.4), 8, 13 |
| LIVELIHOOD-002 | UMKM, omzet, jualan, modal | 001, 003, 004 | pelatihan-as-outcome | 8 (8.3,8.5), 1 (1.4), 9 (9.3) |
| COOP-003 | koperasi, RAT, SHU, anggota | 002, 004 | badan hukum=fungsi (HN-18) | 8 (8.3), 2 kondisional |
| FININC-004 | modal, pinjaman, tabungan, bankable | 002, 003 | disbursement=growth (ANTI-08) | 8 (8.10), 1 (1.4), 9 (9.3) |
| SKILLS-005 | kerja, magang, sertifikasi, nganggur | 006, 019 | terlatih=bekerja | 8 (8.5,8.6), 4 (4.4) |
| EDU-006 | sekolah, guru, siswa, belajar | 005, 016 | guru terlatih=belajar naik (HN-40) | 4 (4.1,4.c), 10 (10.2) |
| HEALTH-007 | puskesmas, kader, skrining, posyandu | 008, 009 | kunjungan=sehat | 3 (3.4,3.8) |
| NUTRI-008 | gizi, stunting, PMBA, MPASI | 007, 001 | stunting 12-bln claim (HN-10) | 2 (2.2), 3 |
| WASH-009 | air bersih, jamban, CTPS, BABS | 007, 026 | terbangun=dipakai (HN-9) | 6 (6.1,6.2) |
| CCA-010 | iklim, kekeringan, adaptasi, musim | 001, 013 | kata iklim=SDG13 (SDG-ANTI) | 13 (13.1), 2 (2.4) |
| MITIG-011 | emisi, karbon, energi bersih | 028, 012 | GHG tanpa metode (HN-75) | 13 (13.2), 7 |
| ENV-012 | sampah, konservasi, mangrove, DAS | 011, 026 | pohon ditanam=outcome (HN-41 analog) | 15 (15.2,15.3), 12 (12.5), 14 |
| DRR-013 | bencana, siaga, evakuasi, Destana | 010, 014 | dokumen=kesiapan (HN-25) | 11 (11.5,11.b), 13 (13.1) |
| HUM-014 | darurat, pengungsi, bantuan, terdampak | 013, 025 | delivery=outcome (HN-45) | 2 (2.1), 6, 11; horizon khusus (v1.1 §S1) |
| SOCPRO-015 | bansos, DTKS, PKH, tepat sasaran | 016, 002 | tersalur=sejahtera | 1 (1.3), 10 (10.2) |
| CHILD-016 | anak, kekerasan, perlindungan, PATBM | 006, 017 | laporan turun=kasus turun (HN-91) | 16 (16.2), 5 |
| GEWE-017 | perempuan, kesetaraan, KDRT, PEKKA | 016, 002 | perempuan-as-label → SDG5 (SDG-ANTI) | 5 (5.5,5.a,5.2) |
| DISAB-018 | disabilitas, aksesibilitas, inklusi | 017, 015 | terpisah=inklusi (HN-98) | 10 (10.2), 4 (4.5), 8 (8.5) |
| YOUTH-019 | pemuda, NEET, karang taruna | 005, 006 | anak-muda-as-label | 8 (8.6), 4 |
| GOV-020 | OPD, musrenbang, layanan publik, SAKIP | 021, 022 | MoU=perubahan (HN-42) | 16 (16.6,16.7) |
| CSO-021 | OMS, yayasan, tata kelola, audit | 020, 002 | OCA self-report (HN-64) | 16 (16.6), 17 (17.17) |
| CIVTECH-022 | lapor, platform warga, partisipasi digital | 023, 020 | traffic=partisipasi (HN-39) | 16 (16.6,16.7,16.10), 9 kondisional |
| DIGITAL-023 | aplikasi, sistem, digitalisasi, platform | 022, 002 | platform=SDG9 (SDG-ANTI) | 9 (9.c) HANYA dgn outcome adopsi; sektor tujuan menentukan SDG |
| PEACE-024 | konflik, damai, antar-kelompok | 021, 020 | kontak=kohesi (IND-047 nota) | 16 (16.1) |
| MIGR-025 | PMI, migran, pengungsi, prosedural | 014, 005 | berangkat=aman | 8 (8.8), 10 (10.7) |
| URBAN-026 | kumuh, hunian, sertifikat, gusur | 009, 015 | dokumen=aman (IND-049 nota) | 11 (11.1) |
| RURAL-027 | desa, BUMDes, dana desa, musdes | 020, 002 | BUMDes terbentuk=fungsi (HN analog) | 8, 1, 16 — via outcome; jarang Primary sendiri |
| ENERGY-028 | listrik, PLTS, energi, terang | 011, 026 | terpasang=dipakai (IND-042) | 7 (7.1,7.b) |
| CSR-029 | rantai pasok, pemasok, keberlanjutan bisnis | 002, 012 | nilai ekonomi black-box (HN-70) | 12 (12.6), 8, 17 |
| KNOW-030 | riset, kajian, policy brief, advokasi | 020, 021 | published=adopted (ANTI-13) | 16 (16.10), 17; SDG substantif ikut topik riset |

Subsector opsional (`SUB-*`, `HEURISTIC_ONLY`) hanya dibuat bila disambiguasi memerlukannya; v1 mendefinisikan tiga contoh: SUB-AGRI-01 budidaya, SUB-AGRI-02 pasca-panen/rantai nilai, SUB-AGRI-03 perikanan-budidaya — jangan memperbanyak tanpa kebutuhan fixture.

### 14.1 Sector Scoring

```text
sector_score = Σ komponen ternormalisasi − penalti

Problem-family alignment       25%
Outcome-family alignment       25%
Target-actor alignment         15%
Intervention alignment         15%
Indicator alignment            10%
Language alignment              5%
Supporting-document evidence    5%
− anti-signals (per registry, tipikal 0.10–0.25 per trigger, cap total 0.40)
− conflict penalties (§28)
```

Normalisasi: tiap komponen bernilai 0..1 = (jumlah concept ter-match yang mendukung sektor) / (jumlah concept terdeteksi pada family tsb), dengan saturasi: ≥3 match kuat = 1.0 (mencegah story panjang mendominasi). Language alignment (5%) HANYA dari lexicon match yang tidak sudah dihitung via concept lain — mencegah double counting.

Thresholds (starting, dikalibrasi §36): `≥0.80` Primary; `0.60–0.79` Secondary; `0.45–0.59` ambiguous candidate; `<0.45` tidak direkomendasikan. Maksimum Page 2: 1 Primary + 2 Secondary. Bila |top1 − top2| < 0.10 → `SECTOR_AMBIGUOUS_REQUIRES_REVIEW` → tampilkan pilihan (§28). Kalibrasi wajib terhadap FIX-GOLD (semua gold harus menghasilkan Primary sesuai ekspektasi) dan FIX-HN (tidak ada Primary dari label beneficiary saja).

---

## 15. Target Actor and Beneficiary Registry

Definisi peran (mengikat): **Beneficiary** = pihak yang mendapat manfaat; **Target Actor** = pihak yang harus mengubah praktik/perilaku/penggunaan/keputusan; **Implementing Actor** = pelaksana Activity; **Institutional Actor** = organisasi yang fungsi/tata kelolanya berubah; **Duty Bearer** = pemegang kewajiban formal; **Rights Holder** = pemegang hak; **Intermediary** = penghubung layanan/pasar/aktor; plus **Service Provider** dan **Decision Maker** sebagai sub-peran umum. Satu aktor dapat memegang >1 peran dalam satu program; peran ditetapkan per program, bukan intrinsik.

Contoh kanonis (dari spec, dipertahankan):

```text
Program pendidikan: Beneficiary = siswa; Target Actor = guru;
Duty Bearer = sekolah/pemerintah; Implementer = NGO/mitra pelatihan.
```

Registry 35 aktor wajib — tabel kompak (kolom: peran default | sektor | outcome families lazim | kebingungan umum | catatan privasi/disagregasi). Schema penuh per entri = §7 spec; format acuan YAML lihat CNC-ACTOR-014 (§10).

| ACT-ID | Aktor | Peran default | Sektor utama | OF lazim | Kebingungan umum | Privasi/disagregasi |
|---|---|---|---|---|---|---|
| 001 | petani kecil | target actor + beneficiary | 001 | OF-003,009,010 | dianggap otomatis SDG2 | sex, luas lahan |
| 002 | petani muda | idem + youth lens | 001,019 | idem | umur tak diverifikasi | umur |
| 003 | kelompok tani | institutional | 001 | OF-014 | kelompok=anggota (agregasi keliru) | — |
| 004 | gapoktan | institutional/intermediary | 001 | OF-008,014 | idem | — |
| 005 | koperasi | institutional | 003 | OF-014 | legal=fungsi | — |
| 006 | BUMDes | institutional | 027 | OF-014 | terbentuk=fungsi | — |
| 007 | UMKM | target actor | 002 | OF-009,011,012 | UMKM=orang (unit usaha!) | skala PP 7/2021, sex pemilik |
| 008 | usaha mikro | target actor | 002 | idem | idem | idem |
| 009 | pelaku usaha | target actor | 002 | idem | terlalu generik → tanya | sex |
| 010 | masyarakat rentan | beneficiary | lintas | — | bukan target actor otomatis | definisikan kerentanan |
| 011 | keluarga miskin | beneficiary | 015 | OF-024 | miskin=DTKS (verifikasi) | — |
| 012 | mustahik | beneficiary (zakat) | 002/015 | OF-009 graduasi | penyaluran=outcome (HN-96) | asnaf (v1.1 §S1) |
| 013 | muzakki | actor (pemberi) | — | — | — | — |
| 014 | perempuan kepala keluarga | beneficiary+target actor | 017,002 | OF-009,019 | PEKKA=janda saja (tidak) | sex, status KK |
| 015 | penyandang disabilitas | beneficiary+target actor | 018 | OF-006,013 | label=SDG10 otomatis | WG-SS, jangan diagnosis |
| 016 | pemuda NEET | target actor | 019,005 | OF-013 | NEET fluktuatif | umur, status verifikasi |
| 017 | kader | target actor + intermediary | 007,008 | OF-002,003 | kader=nakes (bukan) | sex |
| 018 | tenaga kesehatan | target actor/service provider | 007 | OF-003,007 | — | — |
| 019 | guru | target actor | 006 | OF-003 practice | guru=beneficiary program siswa | sex, status kepegawaian |
| 020 | siswa | beneficiary | 006 | OF-001 (via guru) | siswa=target actor pelatihan guru (CONF-002) | sex, kelas |
| 021 | warga terdampak | beneficiary | 014,013 | OF-024 | — | sex, umur, disabilitas |
| 022 | pengungsi | beneficiary+rights holder | 025,014 | OF-024,025 | — | proteksi data ketat |
| 023 | pekerja migran | target actor+rights holder | 025 | OF-020 prosedural | berangkat=aman | privasi dokumen |
| 024 | masyarakat adat | rights holder | 012 | — | FPIC=outcome (HN-95) | FPIC prasyarat |
| 025 | OMS/CSO | institutional+implementer | 021 | OF-014 | CSO=beneficiary akhir | — |
| 026 | pemerintah daerah | duty bearer+decision maker | 020 | OF-016,017 | pemda=implementer program NGO | — |
| 027 | OPD | duty bearer | 020 | OF-016,019 | — | — |
| 028 | puskesmas | service provider+institutional | 007 | OF-007,014 | — | — |
| 029 | sekolah | duty bearer+institutional | 006 | OF-014 | — | — |
| 030 | komunitas | beneficiary/target (tanya) | lintas | — | terlalu generik | — |
| 031 | kelompok perempuan | institutional+target actor | 017 | OF-014,019 | kelompok=perempuan individual | — |
| 032 | kelompok pemuda | institutional | 019 | OF-014 | idem | — |
| 033 | pembeli/offtaker | intermediary+decision maker | 001,002 | (enabler OF-008) | offtaker=beneficiary | komersial |
| 034 | penyuluh | intermediary/service provider | 001 | OF-003 | penyuluh=petani | — |
| 035 | pengurus koperasi | target actor (dlm ARCH-017) | 003 | OF-003,014 | pengurus=anggota | — |

**Aturan keras:** beneficiary TIDAK otomatis target actor; bila story hanya menyebut beneficiary tanpa aktor yang berubah praktiknya → `unclear target actor` (MISS-006) + pertanyaan; program yang target actor-nya institusi (guru, OPD, koperasi) tetap mencatat beneficiary akhir untuk blueprint, dengan rantai kontribusi eksplisit.

---

## 16. Problem Family Registry

29 problem families (PF-001..029). Format acuan FULL satu entri; sisanya tabel kompak. Aturan: problem TIDAK menyimpulkan intervention tanpa konteks tambahan (archetype butuh action/object signals §17).

```yaml
problem_family_id: PF-001
name_id: "akses pasar terbatas"
name_en: "limited market access"
definition: "Produsen/usaha tidak dapat menjangkau pembeli atau kanal
  bernilai lebih baik secara berkelanjutan."
manifestation_signals: ["susah jualan", "bergantung tengkulak",
  "stok tak terserap", "belum masuk pasar modern"]
immediate_cause_signals: ["tidak ada kontak pembeli", "kualitas belum
  memenuhi standar", "volume kecil & terpencar"]
structural_cause_signals: ["rantai pasok dikuasai sedikit pihak",
  "infrastruktur logistik lemah", "asimetri informasi harga"]
common_actor_ids: [ACT-001, ACT-003, ACT-004, ACT-007, ACT-033]
sector_ids: [SECTOR-AGRI-001, SECTOR-LIVELIHOOD-002, SECTOR-COOP-003]
likely_archetype_ids: [ARCH-MARKET-015, ARCH-VALUECHAIN-016, ARCH-CERT-035]
likely_outcome_family_ids: [OF-008, OF-009, OF-010]
invalid_shortcuts: ["MoU buyer = akses membaik (HN-8)", "sertifikat =
  ekspor (HN-21)"]
anti_signals: ["'pasar' dalam arti pasar fisik/bangunan"]
missing_information_questions: ["Komoditas/produk apa dan pembeli seperti
  apa yang disasar?"]
sources: ["corpus v1 §7.1–7.2", "S-07"]
epistemic_label: CANONICAL_IMPACTORY
```

| PF | Family | Manifestasi khas | Sektor | Likely ARCH | Likely OF | Invalid shortcut |
|---|---|---|---|---|---|---|
| 001 | limited_market_access | susah jualan, tengkulak | 001,002,003 | 015,016,035 | 008,009,010 | MoU=akses |
| 002 | low_income | pendapatan kecil, pas-pasan | 002,001,015 | 001,012,013,015 | 009,012 | transfer=income naik permanen |
| 003 | low_margin | harga rendah, rugi | 001,002 | 015,016 | 010 | harga pasar naik=program |
| 004 | low_productivity | hasil sedikit, lambat | 001,002 | 001,033,034,010 | 011 | alat=produktivitas (ANTI-03) |
| 005 | weak_business_records | belum ada pencatatan | 002,003 | 001,003 | 003 practice | catat=untung |
| 006 | limited_finance_access | belum bankable, susah modal | 004,002 | 013,014 | 009,012 via penggunaan | cair=tumbuh (ANTI-08) |
| 007 | weak_institutional_capacity | organisasi tak jalan, SOP tak ada | 021,003,020 | 018,017 | 014 | pelatihan=kapasitas |
| 008 | low_service_access | layanan jauh, mahal | 007,006,009 | 022,023,039 | 005 | dibangun=diakses |
| 009 | low_service_utilization | ada tapi tak dipakai | 007,009 | 005,022 | 006 | sosialisasi=pakai |
| 010 | poor_service_quality | layanan ribet, lama | 020,007 | 022,018 | 007 | SOP=kualitas |
| 011 | low_technology_adoption | belum melek digital, manual | 023,001,002 | 007,008,033 | 004 | platform=adopsi |
| 012 | weak_accountability | tidak transparan, keluhan diabaikan | 020,022 | 029,028 | 017 | dashboard=akuntabel (ANTI-02) |
| 013 | limited_participation | warga tidak didengar | 020,022 | 030,029 | 016 | hadir=berpengaruh |
| 014 | exclusion_and_discrimination | tersisih, tidak dilibatkan | 018,017,015 | 004,038 | 013,016 | kuota=inklusi |
| 015 | skills_mismatch | lulusan nganggur, skill tak cocok | 005,019 | 001,014 | 013 | sertifikat=kerja (IND-030 nota) |
| 016 | food_insecurity | rawan pangan, makan seadanya | 008,001,014 | 011,037,001 | 022,024 | distribusi=tahan pangan |
| 017 | health_service_gap | faskes jauh, kader kurang | 007 | 022,001,039 | 005,006,007 | kunjungan naik=sehat |
| 018 | learning_gap | nilai rendah, tak naik kelas | 006 | 001,003,002 | 001,003 (guru) | guru dilatih=nilai naik |
| 019 | (id sama dgn 018 utk kehadiran/ATS) learning_gap-attendance | sering bolos, putus sekolah | 006 | 004,038 | 005 re-enrol | kembali=bertahan |
| 020 | WASH_access_gap | air susah, BABS | 009 | 023,004 | 006,021 | terbangun=dipakai |
| 021 | climate_vulnerability | musim tak menentu, gagal panen iklim | 010,001 | 034,033,036 | 023 | kata iklim=SDG13 |
| 022 | environmental_degradation | sampah, banjir kiriman, hutan gundul | 012 | 023,004,006 | 022 kondisi | pohon ditanam=pulih |
| 023 | disaster_vulnerability | rawan bencana, tak siap | 013 | 036,030 | 021 kesiapan | dokumen=siap |
| 024 | weak_protection_response | kasus tak ditangani | 016,017 | 038,039 | 025 | laporan turun=aman (HN-91) |
| 025 | policy_implementation_gap | perda ada tapi tak jalan | 020,030 | 019,021,020 | 017 | disahkan=dijalankan |
| 026 | data_fragmentation | data berantakan, tak terpakai | 020,023 | 009,027 | 015 | dashboard=keputusan |
| 027 | weak_evidence_use | keputusan tanpa data | 020,030 | 025,040,009 | 015 | riset=kebijakan |
| 028 | coordination_gap | program tumpang tindih | 020,021 | 031,030 | 018 kolaborasi | forum=koordinasi (HN-24) |
| 029 | infrastructure_gap | jalan/sarana rusak/tak ada | 026,009,028 | 023,024 | 005,006 | dibangun=manfaat |

Catatan: PF-018/019 dipisah karena rantai kausal & indikator berbeda (kualitas belajar vs kehadiran/ATS) meski keduanya "learning gap" — alias didokumentasikan agar tidak duplikasi.

---

## 17. Intervention Archetype Mapping

Mewarisi 40 archetype v1 §8 (ID tidak berubah). Mapping ini menambah **signals** untuk deteksi deterministic. Satu entri FULL sebagai acuan; 14 archetype prioritas dalam tabel signals; sisanya memakai seed spine Annex B corpus v1 §24 + signals generik kelasnya.

```yaml
archetype_id: ARCH-MARKET-015
name_id: "Akses Pasar"
name_en: "Market Access"
definition: "Menghubungkan produsen/usaha dengan pembeli atau kanal
  bernilai lebih baik hingga terjadi transaksi berkelanjutan."
positive_action_signals: ["menghubungkan", "memfasilitasi kemitraan",
  "business matching", "onboarding marketplace", "kurasi produk",
  "temu bisnis", "linkage"]
object_signals: ["pembeli", "offtaker", "marketplace", "pasar modern",
  "ekspor", "kontrak", "PO"]
actor_signals: [ACT-001, ACT-003, ACT-004, ACT-007, ACT-033]
explicit_user_phrases: ["kami hubungkan ke pembeli", "bantu masuk
  marketplace", "cari offtaker"]
problem_family_ids: [PF-001, PF-003]
expected_output_family_ids: [OPF-023 market_linkage_established]
expected_intermediate_outcome_ids: [OF-008 via trial transaction]
expected_outcome_family_ids: [OF-008, OF-009, OF-010]
wbs_pattern_ids: ["corpus v1 §15 (Market Access)"]
cost_driver_pattern_ids: ["corpus v1 §16"]
meal_pattern_ids: ["corpus v1 §17"]
negative_signals: ["membangun pasar (fisik)"]
anti_signals: ["MoU sebagai hasil akhir (HN-8)", "sertifikat=ekspor (HN-21)"]
confusable_archetype_ids: [ARCH-VALUECHAIN-016 (lebih luas dari linkage),
  ARCH-CERT-035 (standar sbg prasyarat)]
minimum_evidence: ["transaksi percobaan → repeat order (corpus v1 §9)"]
disambiguation_questions: ["Apakah program berhenti di perkenalan pembeli,
  atau mengawal sampai transaksi berulang?"]
sources: ["corpus v1 §9 ARCH-MARKET-015 FULL"]
epistemic_label: CANONICAL_IMPACTORY
```

**Tabel signals 14 archetype prioritas** (kolom: action signals | object signals | expected OPF→OF | anti-signal khas | confusable):

| ARCH | Action signals (ID) | Object | OPF → OF | Anti-signal | Confusable |
|---|---|---|---|---|---|
| 001 Training | melatih, pelatihan, workshop, bimtek | peserta, modul, kurikulum | OPF-001/002 → OF-001,002,003 | selesai=berubah (ANTI-01) | 002 ToT, 003 mentoring |
| 002 ToT | melatih pelatih, kaderisasi fasilitator | master trainer, kader | OPF-002 → OF-003 (kader melatih) | ToT=jangkauan otomatis | 001 |
| 003 Mentoring | mendampingi, coaching, pendampingan rutin | mentee, usaha, kunjungan | OPF-002 → OF-003 | kunjungan=adopsi | 001, 004 |
| 004 Community Facilitation | memfasilitasi, pengorganisasian, rembuk | komunitas, kelompok, forum | OPF-018 → OF-016 | terbentuk=berfungsi | 030 |
| 005 BCC | edukasi perilaku, kampanye perubahan | pesan, perilaku sasaran | OPF-001 → OF-001→003 | tahu=lakukan (ANTI-12) | 006 |
| 006 Awareness | sosialisasi, kampanye, penyuluhan massal | audiens, media | OPF-001 → OF-001 | jangkauan=perilaku (ANTI-04) | 005 |
| 007 Digital Platform | mengembangkan aplikasi/platform/sistem | fitur, pengguna, uptime | OPF-020/007 → OF-004 | launched=adopted (ANTI-06) | 009, 027 |
| 009 Data/Dashboard | membangun dashboard, integrasi data | data, indikator, OPD | OPF-007/008 → OF-015 | tersedia=dipakai (ANTI-02) | 027 |
| 010 Equipment | mendistribusikan alat, hibah alsintan | alat, mesin, unit | OPF-014 → OF-004→011 | diterima=produktif (ANTI-03) | 012 |
| 013 A2F | menghubungkan pembiayaan, fasilitasi KUR | pinjaman, LKM, agunan | OPF-023 → OF-009 via penggunaan | cair=tumbuh (ANTI-08) | 012 grants |
| 015 Market | (entri FULL di atas) | | | | |
| 018 Capacity | menguatkan kelembagaan, tata kelola, SOP | organisasi, sistem, kebijakan internal | OPF-009/010 → OF-014 | dokumen=kapasitas | 017 koperasi |
| 019 Policy Dev | menyusun kebijakan, naskah akademik, perda | draft, pasal, DPRD | OPF-016/017/018 → OF-017 | disahkan=dijalankan (ANTI-05) | 020 advokasi |
| 036 Preparedness | menyusun rencana kontinjensi, simulasi, drill | dokumen, jalur evakuasi, EWS | OPF-010 → OF-021 | dokumen=siap | 023 infra |

**Archetype scoring:**

```text
archetype_score = explicit intervention statement (bobot dominan, 0.35)
 + action signal (0.20) + object signal (0.15) + problem fit (0.10)
 + target actor fit (0.08) + expected output fit (0.06)
 + expected outcome fit (0.06)
 − anti-signals − contradiction penalties
```

Prinsip: **explicit user input > inference** — bila user menulis "kami melatih…", archetype 001 tidak boleh dikalahkan inference lain kecuali ada kontradiksi keras. Maksimum Page 2: 3 Primary + 3 Supporting interventions. Bila >6 archetype lolos threshold → `PROGRAM_SCOPE_TOO_BROAD`: tampilkan saran penggabungan (mis. 001+002+003 = paket capacity-building; 007+009 = paket digital) dan pemisahan (intervensi lintas problem family yang tak berbagi outcome → sarankan dipecah menjadi program terpisah).

---

## 18. Outcome Family Registry

26 outcome families (OF-001..026). Satu entri FULL; sisanya tabel kompak. Setiap OF memetakan ke indicator families (IND-*) — jembatan ke SDG scoring.

```yaml
outcome_family_id: OF-009
name_id: "pendapatan membaik"
name_en: "income_improved"
definition: "Peningkatan pendapatan/omzet riil aktor sasaran dari aktivitas
  ekonomi yang didukung program, terverifikasi terhadap baseline."
target_actor_types: [ACT-001, ACT-007, ACT-008, ACT-012, ACT-014]
positive_predicates_id: ["pendapatan meningkat", "omzet naik",
  "penghasilan bertambah"]
positive_predicates_en: ["income increased", "revenue grew"]
object_of_change_ids: ["pendapatan/omzet usaha atau rumah tangga"]
minimum_evidence: ["catatan penjualan/pendapatan + baseline musim setara
  (IND-MSME-REV-001 logic)"]
minimum_use_definition_required: false
time_horizon_guidance: "12–18 bulan; hati-hati musiman"
likely_sector_ids: [SECTOR-LIVELIHOOD-002, SECTOR-AGRI-001, SECTOR-GEWE-017]
likely_archetype_ids: [ARCH-TRAINING-001, ARCH-MENTOR-003, ARCH-MARKET-015,
  ARCH-A2F-013, ARCH-GRANTS-012]
indicator_family_ids: [IND-MSME-REV-001, IND-AGRI-PRICE-011, IND-MSME-JOB-004]
sdg_affinities: [SDG_8 (8.3), SDG_1 (1.4 kondisional kemiskinan),
  SDG_2 (2.3 bila small-scale food producers)]
common_output_confusions: ["dana tersalur (OPF-022)", "pelatihan selesai"]
common_activity_confusions: ["kegiatan pemasaran"]
causal_leap_risks: [ANTI-01, ANTI-08]
negative_signals: ["omzet musim ramai tanpa baseline setara"]
anti_signals: ["klaim % naik tanpa baseline (HN-57)"]
sources: ["corpus v1 §7.2, §11", "S-07"]
epistemic_label: CANONICAL_IMPACTORY
```

| OF | Family | Target actor khas | IND families | SDG affinities (target) | Leap risk |
|---|---|---|---|---|---|
| 001 | knowledge_increased | peserta | (pre-post; leading) | — (tak pernah dasar Primary SDG) | ANTI-12 |
| 002 | skill_retained | peserta | IND-HLTH-CAPAC-056 pola | — (leading) | completion=skill |
| 003 | practice_adopted | guru, petani, kader, UMKM | IND-MSME-PRACT-002, IND-AGRI-ADOPT-009, IND-EDU-TEACH-013, IND-CCA-PRACT-023 | via domain (2.4, 4.1-jalur, 3-jalur) | verifikasi praktik wajib |
| 004 | technology_used | pengguna platform/alat | IND-DIG-MAU-043, IND-MSME-DIGTX-003 | 9.c bila konteks digital-divide; biasanya pendukung | ANTI-03/06 |
| 005 | service_accessed | warga | IND-EDU-ATS-015, IND-HUM pola | 1.4, 3.8, 4.1, 6.1 per domain | akses≠guna |
| 006 | service_utilized_routinely | warga | IND-HLTH-UTIL-016, IND-WASH-USE-018, IND-ENERGY-USE-042 | 3.8, 6.1/6.2, 7.1 | rutin perlu threshold |
| 007 | service_quality_improved | penyedia layanan | IND-GOV-SVC-022 | 16.6 (16.6.2 kepuasan) | SOP=kualitas |
| 008 | market_access_improved | produsen | IND-AGRI-PRICE-011 + transaksi | 2.3, 8.3 | MoU=akses |
| 009 | income_improved | (FULL di atas) | | 8.3, 1.4, 2.3 | |
| 010 | margin_improved | produsen | IND-AGRI-PRICE-011, LOSS-054 | 2.3 | harga pasar umum |
| 011 | productivity_improved | produsen | IND-AGRI-YIELD-010 | 2.3, 2.4, 8.2 | ANTI-03 |
| 012 | business_performance_improved | UMKM/koperasi | IND-MSME-REV-001, JOB-004, COOP-SHU-026 | 8.3, 8.5 | omzet≠laba |
| 013 | employment_obtained | pencari kerja/NEET | IND-SKILLS-JOB6-029, YOUTH-NEET-035 | 8.5, 8.6 | sertifikat=kerja |
| 014 | institutional_performance_improved | OMS, koperasi, BUMDes, OPD | IND-CSO-AUDIT-005, FUND-006, PRACT-007, COOP-RAT-025, RURAL-BUMDES-050 | 16.6, 17.17 | dokumen=kinerja |
| 015 | data_informed_decision_making | OPD/manajemen | (keputusan terdokumentasi; ANTI-02 kontrol) | 16.6 | dashboard=keputusan |
| 016 | participation_improved | warga/kelompok | IND-CIVIC-ACTIVE-020, GOV-BUDGET-046 | 16.7 (16.7.2) | hadir=pengaruh |
| 017 | policy_implemented | duty bearer | (bukti implementasi; ANTI-05) | 16.6 + SDG topik kebijakan | disahkan=jalan |
| 018 | compliance_improved | pemasok/lembaga | IND-CSR-SUPPLIER-051 | 12.6, 8.8 | audit self-declared |
| 019 | accountability_improved | institusi | IND-CIVTECH-INST-045, CIVIC-RESP-021 | 16.6, 16.10 | respons template |
| 020 | social_norm_changed | komunitas | (survei norma; horizon panjang) | 5.1/5.2 (bila GBV), 16 | kampanye=norma |
| 021 | economic_resilience_improved | RT/usaha | (stabilitas pendapatan, tabungan aktif IND-027) | 1.5, 8.10 | resiliensi=mean naik |
| 022 | climate_resilience_improved | petani/desa | IND-CCA-PRACT-023, INFOUSE-059, DRR-EWS-060 | 13.1 (13.1.2/13.1.3-jalur lokal), 2.4 | kata iklim |
| 023 | environmental_condition_improved | kawasan | IND-ENV-HECT-041 | 15.2/15.3, 14.b, 12.5 | ditanam=pulih |
| 024 | basic_needs_met | RT terdampak | IND-HUM-BASIC-038 | 2.1, 6.1, 11.5 (humanitarian horizon) | delivery=met |
| 025 | protection_response_improved | sistem layanan | IND-CHILD-CASE-036, GEWE-GBVREF-033 | 16.2, 5.2 | laporan turun=aman |
| 026 | (reserved: mustahik_graduation, alias OF-009 varian zakat) | mustahik | graduasi mustahik (v1.1 §S1) | 1.2-jalur | penyaluran=graduasi |

---

## 19. Output Family Registry

25 output families (OPF-001..025) — tabel kompak (kolom: project control | verifikasi | likely OF | kebingungan umum). `project_control_level` selalu HIGH/FULL (definisi Output); output TIDAK pernah otomatis dianggap Outcome.

| OPF | Family | Verifikasi | Likely OF | Kebingungan umum |
|---|---|---|---|---|
| 001 | training_delivered | daftar hadir, dokumentasi | OF-001,002 | dianggap outcome (HN-1) |
| 002 | participants_completed_training | kriteria completion + asesmen | OF-002,003 | completion=adopsi (ANTI-01) |
| 003 | system_designed | dokumen desain disetujui | → OPF-004 | desain=sistem |
| 004 | system_developed | build teruji | → OPF-005/006 | developed=used |
| 005 | system_tested | UAT terdokumentasi | → OPF-006 | tested=adopted |
| 006 | system_operational | uptime, go-live | OF-004 | operational=used (ANTI-06) |
| 007 | database_created | skema terisi, akses | OF-015 jalur | data ada=dipakai |
| 008 | data_validated | QA report | OF-015 | valid=keputusan |
| 009 | SOP_drafted | draft final | → OPF-010 | draft=praktik |
| 010 | SOP_approved | pengesahan | OF-014 jalur | approved=dijalankan |
| 011 | facility_constructed | BA serah terima, foto geotag | OF-005/006 jalur | built=used (HN-9) |
| 012 | facility_rehabilitated | idem | idem | idem |
| 013 | (alias OPF-014) equipment_procured | — | — | — |
| 014 | equipment_distributed | BA distribusi | OF-004→011 | diterima=produktif |
| 015 | service_point_established | titik layanan aktif | OF-005 | berdiri=diakses |
| 016 | study_completed | laporan final | OF-015/017 jalur | riset=kebijakan (ANTI-13) |
| 017 | policy_brief_produced | dokumen terbit | idem | brief=reform (HN-47) |
| 018 | policy_draft_produced | draft/naskah akademik | → policy_approved | draft=perda |
| 019 | policy_approved | nomor perda/SK | OF-017 jalur | disahkan=dijalankan (ANTI-05) |
| 020 | platform_launched | rilis publik | OF-004 jalur | launched=viral=hasil (HN-50) |
| 021 | network_established | dokumen jejaring + agenda | OF-018-kolab jalur | forum=koordinasi (HN-24) |
| 022 | grant_disbursed | bukti transfer | OF-009 via penggunaan | cair=tumbuh (ANTI-08) |
| 023 | market_linkage_established | kontrak/PO pertama | OF-008 | MoU=akses (HN-8) |
| 024 | curriculum_developed | modul tervalidasi | OF-001..003 jalur | modul=kompetensi (HN-31) |
| 025 | knowledge_product_published | terbit + DOI/URL | OF-017 jalur via ENGAGE-053 | published=adopted |
| — | referral_mechanism_established (OPF-026) | SOP rujukan + uji alur | OF-025 | mekanisme=kasus tertangani |

(OPF-013 dialiaskan ke OPF-014 untuk mencegah duplikasi procured/distributed; OPF-026 ditambahkan untuk referral — namespace tetap konsisten.)

---

## 20. Cross-Cutting Relevance Registry

16 entri (XC-001..016). Aturan keras: cross-cutting TIDAK direkomendasikan hanya karena beneficiary label — setiap XC punya **relevance test** (kondisi applicability) dan **not_applicable_conditions**. Satu entri FULL; sisanya kompak.

```yaml
cross_cutting_id: XC-001
name_id: "kesetaraan gender"
name_en: "gender_equality"
applicability_triggers: ["outcome menyasar perubahan relasi/kontrol/posisi
  perempuan", "intervensi dengan risiko dampak gender berbeda",
  "sektor dengan kesenjangan gender terdokumentasi"]
actor_triggers: [ACT-014, ACT-031]
sector_triggers: [SECTOR-GEWE-017 (inheren), lainnya kondisional]
intervention_triggers: [ARCH-GRANTS-012, ARCH-A2F-013 (kontrol pendapatan)]
risk_triggers: ["beban ganda", "backlash KDRT", "token leadership"]
positive_signals: ["kontrol pendapatan", "pengambilan keputusan",
  "keterwakilan"]
negative_signals: ["perempuan hanya disebut sebagai penerima"]
anti_signals: ["perempuan-as-label → SDG5/gender lens otomatis"]
required_questions: ["Apakah program mengubah kontrol/keputusan, atau hanya
  menjangkau perempuan sebagai peserta?"]
possible_indicator_family_ids: [IND-GEWE-DECIS-031, LEAD-032]
required_disaggregation: [sex seluruh people-level indicators]
risk_patterns: ["backlash → jalur rujukan wajib (safeguard corpus v1 §19)"]
not_applicable_conditions: ["program tanpa dimensi manusia langsung
  (mis. murni riset metodologi)"]
false_generic_inclusion_examples: ["'program ini inklusif gender' tanpa
  desain apa pun"]
sources: ["corpus v1 §19", "GAP III DONOR_SPECIFIC"]
epistemic_label: CANONICAL_IMPACTORY
```

| XC | Concern | Relevance test (ringkas) | Not applicable bila | Disagregasi/aksi wajib |
|---|---|---|---|---|
| 001 | gender_equality | (FULL di atas) | | sex |
| 002 | disability_inclusion | peserta manusia ada → tanya akomodasi; jangan asumsi prevalensi nol | tak ada peserta manusia | WG-SS, akomodasi |
| 003 | child_safeguarding | ada kontak dengan anak (langsung/data) | tak ada kontak anak | kebijakan safeguarding, kode etik |
| 004 | PSEA | ada relasi kuasa program↔penerima | — (hampir selalu applicable pada program dengan penerima) | mekanisme keluhan, pelatihan staf |
| 005 | environmental_safeguards | ada konstruksi/pengadaan/limbah | murni layanan non-fisik | screening dampak |
| 006 | conflict_sensitivity | wilayah/isu berpotensi memecah | konteks homogen tanpa sejarah konflik | analisis pembagi-perekat |
| 007 | do_no_harm | selalu applicable sebagai lensa | — | identifikasi harm channel per intervensi |
| 008 | leave_no_one_behind | targeting universal/komunitas | targeting sudah spesifik kelompok tertinggal | analisis siapa tertinggal |
| 009 | data_privacy | ada data pribadi | data agregat publik saja | UU PDP 27/2022, consent |
| 010 | informed_consent | ada pengumpulan data/foto/partisipasi | — | protokol consent |
| 011 | AAP | ada penerima layanan/bantuan | — | saluran umpan balik (IND-HUM-AAP-039) |
| 012 | localization | ada mitra lokal/sub-grant | implementasi sepenuhnya lokal | porsi anggaran & keputusan lokal |
| 013 | indigenous_peoples | wilayah/SDA masyarakat adat | tak bersinggungan | FPIC = prasyarat, bukan outcome (HN-95) |
| 014 | climate_risk | aset/kegiatan terpapar iklim | kegiatan indoor jangka pendek | screening risiko iklim |
| 015 | accessibility | ada layanan/produk/venue publik | — | standar akses fisik & digital |
| 016 | digital_exclusion | intervensi bergantung kanal digital | non-digital | kanal alternatif non-digital |

---

## 21. Official SDG/TPB Registry

Registry seluruh 17 SDGs. **Aturan resmi:** nomor Goal/Target/Indicator mengikuti UN Global Indicator Framework (A/RES/71/313; refinement 2025 Comprehensive Review, UNSC-56 Maret 2025) — `VERIFIED_OFFICIAL` untuk nomor & judul ringkas target level; detail indikator pasca-review 2025 `HUMAN_REVIEW_REQUIRED` per entri sebelum ditampilkan sebagai teks resmi di produk. TPB alignment: Perpres 111/2022 (pelaksanaan TPB, pemutakhiran Perpres 59/2017) + Metadata Indikator TPB Bappenas Edisi II (S-06) — `INDONESIA_SPECIFIC`; nomor Perpres `HUMAN_REVIEW_REQUIRED` verifikasi pasal. Judul target di bawah adalah parafrase ringkas, bukan teks resmi verbatim (menghindari penyalinan berlebihan; teks resmi diambil dari metadata repository saat implementasi).

Satu entri FULL sebagai acuan format (schema lengkap Annex D); 16 lainnya kompak.

```yaml
sdg_id: SDG_8
number: 8
name_id: "Pekerjaan Layak dan Pertumbuhan Ekonomi"
name_en: "Decent Work and Economic Growth"
official_description_id: "(ambil dari metadata Bappenas saat implementasi)"
official_description_en: "(ambil dari UN metadata repository)"
official_target_ids: ["8.2", "8.3", "8.5", "8.6", "8.8", "8.10"]
official_indicator_ids: ["8.3.1", "8.5.1", "8.5.2", "8.6.1", "8.10.2"]
relevant_sector_ids: [SECTOR-LIVELIHOOD-002, SECTOR-SKILLS-005,
  SECTOR-COOP-003, SECTOR-FININC-004, SECTOR-MIGR-025]
relevant_problem_family_ids: [PF-002, PF-004, PF-005, PF-006, PF-015]
relevant_actor_ids: [ACT-007, ACT-008, ACT-009, ACT-016, ACT-023]
relevant_intervention_ids: [ARCH-TRAINING-001, ARCH-MENTOR-003,
  ARCH-INCUB-014, ARCH-MARKET-015, ARCH-A2F-013]
relevant_outcome_family_ids: [OF-009, OF-011, OF-012, OF-013, OF-021]
relevant_indicator_family_ids: [IND-MSME-REV-001, IND-MSME-JOB-004,
  IND-SKILLS-JOB6-029, IND-YOUTH-NEET-035, IND-FININC-ACTIVE-027]
relevant_cross_cutting_ids: [XC-001, XC-008]
positive_signals: ["pendapatan usaha", "pekerjaan", "produktivitas usaha",
  "NEET", "formalisasi usaha"]
negative_signals: ["pelatihan disebut tanpa outcome kerja/pendapatan"]
anti_signals: [SDG-ANTI-TRAINING-006]
common_false_matches: ["semua program pelatihan", "semua program ekonomi
  tanpa indikator pendapatan/kerja"]
common_overclaim_patterns: ["pertumbuhan ekonomi daerah diklaim dari
  program mikro"]
primary_explanation_template_ids: [TPL-PRI-001]
secondary_explanation_template_ids: [TPL-SEC-001]
rejection_template_ids: [TPL-REJ-001]
indonesia_tpb_alignment: ["Pilar Ekonomi; metadata TPB tujuan 8 (S-06)"]
sources: ["UN GIF via unstats.un.org", "S-06"]
verification_status: "VERIFIED_OFFICIAL (target level); indikator 2025-review
  HUMAN_REVIEW_REQUIRED"
```

**Tabel kompak 17 SDGs** (kolom: target resmi yang relevan untuk NGO Indonesia | OF pendukung Primary | IND families bukti | anti-signal utama | catatan TPB):

| SDG | Nama (ID) | Target relevan | OF pendukung Primary | IND bukti | Anti-signal utama | TPB |
|---|---|---|---|---|---|---|
| 1 | Tanpa Kemiskinan | 1.2, 1.3, 1.4, 1.5 | OF-009 (konteks miskin), OF-021, OF-024, OF-026 | IND-SOCPRO-INCL-037, MSME-REV-001 (kohort miskin) | bantuan dana=SDG1 (SDG-ANTI-CASH-007) | Pilar Sosial |
| 2 | Tanpa Kelaparan | 2.1, 2.2, 2.3, 2.4 | OF-011, OF-010, OF-022 (2.4), OF-024 pangan; gizi: OF-003 PMBA | IND-AGRI-YIELD-010, FCS-012, NUTR-PMBA-017, ANEMIA-057 | petani-as-label (SDG-ANTI-FARMER-001) | Pilar Ekonomi (2.3/2.4) & Sosial (2.1/2.2) |
| 3 | Kehidupan Sehat | 3.4, 3.8, 3.1, 3.2 | OF-005/006 (layanan), OF-003 (praktik kes.), OF-025 | IND-HLTH-UTIL-016, CAPAC-056 | kunjungan=sehat; skrining tanpa rujukan | Pilar Sosial |
| 4 | Pendidikan Berkualitas | 4.1, 4.4, 4.5, 4.6, 4.c | OF-003 (guru), OF-005 (ATS), learning outcome | IND-EDU-TEACH-013, LEARN-014, ATS-015, ATTEND-055 | anak-as-label (SDG-ANTI-CHILD-003) | Pilar Sosial; Perpres 3/2026 ATS |
| 5 | Kesetaraan Gender | 5.1, 5.2, 5.5, 5.a, 5.b | OF-019 varian gender (LEAD/DECIS), OF-025 GBV, OF-020 norma | IND-GEWE-DECIS-031, LEAD-032, GBVREF-033 | perempuan-as-label (SDG-ANTI-WOMAN-002) | Pilar Sosial; PUG |
| 6 | Air Bersih & Sanitasi | 6.1, 6.2, 6.b | OF-006 (penggunaan), OF-024 air | IND-WASH-USE-018, FUNC-019, ODF-058 | terbangun=dipakai (SDG-ANTI-INFRA-008 varian) | Pilar Lingkungan; STBM |
| 7 | Energi Bersih | 7.1, 7.b | OF-006 energi | IND-ENERGY-USE-042 | terpasang=akses | Pilar Ekonomi |
| 8 | Pekerjaan Layak | (FULL di atas) | | | | |
| 9 | Industri, Inovasi, Infrastruktur | 9.3, 9.c | OF-004+OF-012 (UMKM ke rantai nilai/kredit), konektivitas digunakan | IND-MSME-DIGTX-003, FININC-ACTIVE-027 | platform-as-label (SDG-ANTI-DIGITAL-004); infrastruktur-as-label (SDG-ANTI-INFRA-008) | Pilar Ekonomi |
| 10 | Berkurangnya Kesenjangan | 10.2, 10.3, 10.7 | OF-013/016 kelompok tereksklusi, OF-020 anti-diskriminasi | IND-DISAB-PART-034, SOCPRO-INCL-037, MIGR-SAFE-048 | label kelompok rentan tanpa outcome inklusi | Pilar Sosial |
| 11 | Kota & Permukiman | 11.1, 11.5, 11.b | OF-024 hunian, OF-021/022 DRR perkotaan | IND-URBAN-TENURE-049, DRR-DRILL-024 | dokumen rencana=tangguh | Pilar Lingkungan |
| 12 | Konsumsi & Produksi | 12.5, 12.6, 12.8 | OF-018 (pemasok), OF-003 praktik 3R, OF-023 sampah | IND-CSR-SUPPLIER-051 | kampanye=perilaku 3R | Pilar Lingkungan |
| 13 | Penanganan Iklim | 13.1, 13.2, 13.3 | OF-022 (resiliensi), OF-021 kesiapan | IND-CCA-PRACT-023, INFOUSE-059, MITIG-GHG-040 | kata-iklim (SDG-ANTI-CLIMATE-005); GHG tanpa metode | Pilar Lingkungan; Destana |
| 14 | Ekosistem Lautan | 14.b, 14.2 | OF-008 nelayan kecil, OF-023 pesisir | (IND perikanan = gap P1) | nelayan-as-label | Pilar Lingkungan |
| 15 | Ekosistem Daratan | 15.2, 15.3 | OF-023 | IND-ENV-HECT-041 | pohon ditanam=SDG15 | Pilar Lingkungan |
| 16 | Perdamaian, Keadilan, Kelembagaan | 16.2, 16.6, 16.7, 16.10, 16.1, 16.9 | OF-014/019 (institusi), OF-016/017, OF-025 (anak/GBV) | IND-CIVTECH-INST-045, CIVIC-ACTIVE-020, RESP-021, GOV-SVC-022, CHILD-CASE-036 | campaign=SDG16 (SDG-ANTI-CAMPAIGN-009); MoU=kelembagaan | Pilar Hukum & Tata Kelola |
| 17 | Kemitraan | 17.17 | OF-018-kolaborasi TERUKUR | (hasil kolaboratif konkret) | forum/jejaring=kemitraan | lintas pilar; hampir tidak pernah Primary utk NGO tunggal — default Secondary |

**Aturan penyalinan:** registry menyimpan nomor + judul ringkas + source pointer; TIDAK menyalin metadata resmi lengkap (definisi komputasi, disagregasi resmi) ke dalam corpus — runtime menautkan ke metadata repository.

---

## 22. Deterministic SDG/TPB Scoring Logic

```text
SDG_score(g) = 0.30·Outcome-family alignment
             + 0.25·Indicator-family alignment
             + 0.15·Problem-family alignment
             + 0.10·Sector/subsector alignment
             + 0.08·Intervention alignment
             + 0.05·Target-actor alignment
             + 0.04·Cross-cutting relevance
             + 0.03·Explicit donor/call alignment
             − Σ anti-signal penalties
             − unsupported-claim penalties
             − conflict penalties
```

Ketentuan komponen: (1) tiap komponen 0..1 dengan saturasi ≥2 match kuat = 1.0; (2) **language keyword similarity bukan dimensi** — ontology menemukan concept IDs, scoring bekerja pada concept IDs; (3) Outcome alignment hanya dihitung dari outcome family yang LOLOS validasi level (bukan output menyamar — invalid relationships §8 diterapkan lebih dulu); (4) Indicator alignment dihitung dari indicator family yang terhubung ke outcome ter-support (indikator yatim tidak dihitung); (5) donor alignment 3% hanya bila donor/call eksplisit menyebut SDG/tema (`DONOR_SPECIFIC`); (6) penalti anti-signal per §23, cap total −0.45; (7) skor dipotong di [0,1].

### 22.1 Thresholds

```text
≥ 0.75     Primary SDG candidate
0.55–0.74  Secondary SDG candidate
0.40–0.54  Optional candidate (hidden by default, "Lihat semua")
< 0.40     Do not recommend
```

Page 2: maksimum **2 Primary + 2 Secondary**.

### 22.2 Primary SDG Coverage Requirement (hard gate, melampaui skor)

SDG tidak boleh Primary tanpa: **≥1 supported outcome family** DAN (**≥1 supported indicator family** ATAU **≥1 verified official target alignment**). "Supported" = candidate ber-evidence-span dengan confidence ≥0.6 dan lolos validasi level. Sector/beneficiary saja TIDAK cukup — meski skor numerik melewati 0.75, gate ini menurunkannya ke Secondary + explanation TPL-AMB.

### 22.3 SDG Stuffing Rule

Bila >4 SDGs melewati threshold: rank berdasarkan (Outcome + Indicator alignment) saja; tampilkan 2 Primary + 2 Secondary; sisanya `Lihat semua`; warning TPL-STUF-001 bila user memilih >4. Program "terintegrasi" bukan pengecualian (FIX-HN-112).

### 22.4 User Override

User boleh menambah/menghapus SDG. SDG pilihan user tanpa dukungan → status `UNSUPPORTED_SDG_SELECTION` + explanation (TPL-AMB varian): tampilkan apa yang kurang (outcome/indicator yang dibutuhkan) — **jangan mencegah simpan draft**. Override tercatat di provenance (`modified_by_user`).

### 22.5 Tie-breaking antar-SDG

Bila dua SDG bersaing di Primary (mis. SDG 2 vs SDG 8 pada program petani-pendapatan): pilih berdasarkan (a) outcome family paling spesifik-domain (yield/FCS → 2; income/job → 8), (b) indicator family yang benar-benar direncanakan, (c) bila tetap seri → tampilkan pilihan ke user (CONF-008). Jangan memutuskan dari jumlah keyword.

---

## 23. SDG Anti-Signal Registry

Format acuan FULL (dari spec, diadopsi):

```yaml
anti_signal_id: SDG-ANTI-FARMER-001
trigger: beneficiary_is_farmer_only        # petani terdeteksi TANPA
                                           # outcome/indicator pangan-pertanian
affected_sdg_ids: [SDG_2]
penalty: -0.25
reason_id: >
  Menjadi petani tidak otomatis berarti program mengatasi kelaparan,
  ketahanan pangan, atau produktivitas pertanian.
reason_en: >
  Having farmers as beneficiaries does not automatically prove alignment
  with hunger, food security, or agricultural productivity.
required_support: [food_security_outcome, agricultural_productivity_indicator,
  food_access_result]
epistemic_label: CANONICAL_IMPACTORY
```

Registry (penalty default −0.25 pada SDG terdampak; −0.15 untuk pola "only" generik; semua memakai pola `required_support` seperti acuan):

| ID | Trigger | SDG terdampak | Required support |
|---|---|---|---|
| SDG-ANTI-FARMER-001 | beneficiary petani saja | 2 | outcome pangan/produktivitas + IND-AGRI-* |
| SDG-ANTI-WOMAN-002 | beneficiary perempuan saja | 5 | outcome kesetaraan (DECIS/LEAD/GBV) + IND-GEWE-* |
| SDG-ANTI-CHILD-003 | beneficiary anak saja | 4 | learning/akses outcome + IND-EDU-* |
| SDG-ANTI-DIGITAL-004 | platform digital disebut saja | 9 | adopsi terukur + outcome domain; SDG ikut sektor tujuan |
| SDG-ANTI-CLIMATE-005 | kata iklim disebut saja | 13 | OF-022 + IND-CCA-*/GHG bermetode |
| SDG-ANTI-TRAINING-006 | pelatihan saja (completion only) | 8 (dan SDG domain) | OF-003/009/013 + IND terkait |
| SDG-ANTI-CASH-007 | bantuan dana/disbursement saja | 1 | OF-009/021/024 pada kohort miskin + IND |
| SDG-ANTI-INFRA-008 | infrastruktur dibangun saja | 9, 6, 7, 11 | OF-005/006 utilisasi + IND fungsi |
| SDG-ANTI-CAMPAIGN-009 | kampanye/jangkauan saja | 16 (dan domain) | OF-016/019/020 terukur |
| SDG-ANTI-REACH-010 | participants reached only | semua | outcome level berikutnya |
| SDG-ANTI-MOU-011 | MoU signed only | 16, 17 | aksi bersama terdokumentasi |
| SDG-ANTI-POLICYDOC-012 | dokumen kebijakan diproduksi saja | 16 + domain | OF-017 bukti implementasi |
| SDG-ANTI-SOCMED-013 | social-media reach only | semua | tindakan audiens sasaran |
| SDG-ANTI-EMPOWER-014 | klaim pemberdayaan generik | 5, 10, 1 | definisi terukur perubahan |
| SDG-ANTI-SUSTAIN-015 | klaim keberlanjutan generik | 12, 13 | mekanisme + indikator |
| SDG-ANTI-UNIVERSAL-016 | klaim "seluruh warga/semua" | semua | subkelompok terdefinisi |
| SDG-ANTI-NATIONAL-017 | klaim dampak nasional/indeks makro | semua | outcome lokal terukur + contribution |
| SDG-ANTI-SLOGAN-018 | SDG disebut tanpa target ("mewujudkan SDGs") | semua | pilih target spesifik (HN-100) |
| SDG-ANTI-GENDER-KK-019 | targeting "kepala keluarga" diklaim gender | 5 | penerima perempuan langsung + kontrol (HN-94) |
| SDG-ANTI-DISAB-SEG-020 | kegiatan terpisah diklaim inklusi | 10 | partisipasi arus utama + akomodasi (HN-98) |

---

## 24. Explainable Recommendation Templates

Seluruh explanation dihasilkan dari template deterministic + slot dari registry — **tanpa LLM**. Slot memakai preferred label bahasa aktif; template ID stabil; versi ID & EN untuk setiap template.

**TPL-PRI-001 (Primary SDG)**
ID: `{SDG_NAME} direkomendasikan sebagai tujuan utama karena program menargetkan {OUTCOME_FAMILIES} bagi {TARGET_ACTORS} dan mengukurnya melalui {INDICATOR_FAMILIES}.`
EN: `{SDG_NAME} is recommended as a primary goal because the program targets {OUTCOME_FAMILIES} for {TARGET_ACTORS} and measures them through {INDICATOR_FAMILIES}.`

**TPL-SEC-001 (Secondary SDG)**
ID: `{SDG_NAME} relevan sebagai tujuan pendukung karena {INTERVENTION_OR_CROSS_CUTTING_LINK} berkontribusi pada {SUPPORTING_OUTCOME}, tetapi bukan hasil utama program.`
EN: `{SDG_NAME} is relevant as a supporting goal because {INTERVENTION_OR_CROSS_CUTTING_LINK} contributes to {SUPPORTING_OUTCOME}, but it is not the program's main result.`

**TPL-REJ-001 (Rejected SDG)**
ID: `{SDG_NAME} tidak direkomendasikan sebagai tujuan utama karena hubungannya saat ini hanya berasal dari {WEAK_SIGNAL} dan belum didukung Outcome atau indikator yang terukur.`
EN: `{SDG_NAME} is not recommended as a primary goal because its current link comes only from {WEAK_SIGNAL} and is not yet supported by a measurable Outcome or indicator.`

**TPL-AMB-001 (Ambiguous SDG)**
ID: `Kami belum yakin apakah {SDG_NAME} relevan. Konfirmasi apakah program juga menargetkan {MISSING_RESULT_OR_INDICATOR}.`
EN: `We are not yet sure whether {SDG_NAME} is relevant. Please confirm whether the program also targets {MISSING_RESULT_OR_INDICATOR}.`

**TPL-STUF-001 (SDG stuffing)**
ID: `Program saat ini terhubung dengan terlalu banyak SDGs. Pilih maksimal dua tujuan utama yang paling langsung diukur oleh Outcome dan indikator program.`
EN: `The program is currently linked to too many SDGs. Choose at most two primary goals that are most directly measured by the program's Outcomes and indicators.`

Template turunan (ID stabil, isi mengikuti pola yang sama): TPL-PRI-SECTOR-001 (penjelasan Primary sector: problem+outcome+actor), TPL-PRI-ARCH-001 (intervensi: action+object+expected output), TPL-REJ-ARCH-001, TPL-CONF-* (per conflict §28), TPL-MISS-* (per missing rule §26), TPL-BLUE-* (§25). Aturan slot: slot kosong dilarang — bila slot tak terisi, template tidak dipakai dan sistem jatuh ke TPL-AMB; maksimal 3 item per slot list (sisanya "dan lainnya"); bahasa mengikuti detected_language, default ID.

---

## 25. Program Blueprint Mapping Rules

Page 2 menyajikan: program facts, detected sector & focus, primary/supporting interventions, primary/secondary SDGs, problem summary, impact direction, expected changes, direct results, potential partners, cross-cutting relevance, unknowns & assumptions.

### 25.1 Problem Summary
Dibentuk dari: problem families (max 3, urut confidence) + target actors + location + evidence spans. Template TPL-BLUE-PROB-001: `Di {LOCATION}, {TARGET_ACTORS} menghadapi {PROBLEM_FAMILY_LABELS}: "{EVIDENCE_SNIPPET}".` — kutipan singkat dari story sebagai grounding, bukan prosa generatif.

### 25.2 Impact Direction
Impact direction ≠ final Goal. Dibentuk dari: problem family + target population + long-term condition + sector impact theme. Template TPL-BLUE-IMP-001: `Program mengarah pada {LONG_TERM_CONDITION} bagi {TARGET_POPULATION} di {LOCATION_LEVEL}.` Larangan: tanpa daftar Activities; tanpa metode; tanpa klaim full attribution (selalu contribution framing); tanpa target universal ("seluruh warga" diblokir SDG-ANTI-UNIVERSAL-016). Rule C-2 v1: control level impact = LOW, wording harus arah bukan janji.

### 25.3 Expected Changes
Formula: target actor + outcome family + object of change. Template TPL-BLUE-CHG-001: `{TARGET_ACTOR} {OUTCOME_PREDICATE} {OBJECT_OF_CHANGE}.` Contoh sah: `Petani menggunakan pencatatan biaya untuk keputusan usaha.` / `Koperasi menggunakan data untuk pemasaran.` Maks 4 item; setiap item harus punya outcome family ter-support; item hasil inferensi diberi badge `inferred`.

### 25.4 Direct Results
Formula: intervention archetype + output family + target institution/actor. Template TPL-BLUE-RES-001: `{OUTPUT_FAMILY_LABEL} untuk/bersama {TARGET_INSTITUTION_OR_ACTOR} melalui {ARCHETYPE_LABEL}.` Dilarang menghasilkan detail yang tidak diberikan user dan tidak didukung pattern (jumlah, lokasi spesifik, nama lembaga tidak boleh dikarang).

### 25.5 Potential Partners
Sumber: sector institution registry (penyuluh/BPP utk AGRI; Puskesmas/Dinkes utk HEALTH; Disdik/sekolah utk EDU; DinkopUKM utk COOP; BPBD utk DRR; DP3A/UPTD PPA utk CHILD/GEWE; Dinsos utk SOCPRO; DLH utk ENV — `INDONESIA_SPECIFIC`) × location level × target actors × intervention requirements. Label wajib: `SUGGESTED_PARTNER` — bukan fact/commitment; tidak masuk dokumen proposal tanpa konfirmasi user.

### 25.6 Blueprint Provenance
Setiap item blueprint menyimpan: `confidence`, `source_evidence` (field + span), `manual|inferred`, `requires_confirmation`, `accepted_by_user`, `modified_by_user`, plus `organization_snapshot_version` (§7). Item tanpa provenance tidak boleh dirender.

---

## 26. Missing-Information Registry

24 rules (MISS-001..024). Severity: `CRITICAL_FOR_BLUEPRINT` | `IMPORTANT_FOR_GOLDEN_GENERATION` | `OPTIONAL_FOR_DRAFT` | `DONOR_REQUIRED` | `REQUIRES_BASELINE` | `REQUIRES_HUMAN_CONFIRMATION`. Page 2 menampilkan maks 3 critical + 3 recommended; sisanya `Lihat detail`. **Draft tidak pernah diblokir** hanya karena baseline, donor, atau target final belum ada.

Format acuan:

```yaml
missing_rule_id: MISS-006
condition: "tidak ada target_actor_candidate dengan confidence ≥0.5"
severity: CRITICAL_FOR_BLUEPRINT
blocking: false
allow_unknown: false
question_id: "Siapa yang diharapkan berubah praktik/perilakunya dalam
  program ini? (bisa berbeda dari penerima manfaat)"
draft_behavior: "blueprint expected_changes dikosongkan + placeholder"
page_2_message_id: TPL-MISS-006
```

| MISS | Kondisi | Severity | Blocking |
|---|---|---|---|
| 001 | beneficiary_count unknown | IMPORTANT_FOR_GOLDEN_GENERATION | tidak |
| 002 | location unknown | CRITICAL_FOR_BLUEPRINT | tidak |
| 003 | duration unknown | IMPORTANT | tidak |
| 004 | budget unknown | IMPORTANT | tidak |
| 005 | donor/call kosong | OPTIONAL_FOR_DRAFT | tidak |
| 006 | target actor tak jelas | CRITICAL | tidak |
| 007 | masalah utama tak jelas (tak ada PF ≥0.5) | CRITICAL | tidak |
| 008 | expected change tak jelas (tak ada OF) | CRITICAL | tidak |
| 009 | intervensi tak jelas (tak ada ARCH ≥0.5) | CRITICAL | tidak |
| 010 | baseline tak disebut | REQUIRES_BASELINE (untuk Golden) | tidak |
| 011 | target angka tak ada | IMPORTANT | tidak |
| 012 | target date tak ada | OPTIONAL | tidak |
| 013 | unit indikator tak ada | IMPORTANT | tidak |
| 014 | sumber data tak ada | IMPORTANT | tidak |
| 015 | penanggung jawab tak ada | OPTIONAL | tidak |
| 016 | komitmen mitra tak ada padahal intervensi butuh (mis. Puskesmas utk rujukan) | IMPORTANT | tidak |
| 017 | definisi beneficiary ambigu ("masyarakat") | CRITICAL | tidak |
| 018 | ambiguous term tak terurai (§12) | IMPORTANT | tidak |
| 019 | scope terlalu luas (>3 PF tak berhubungan) | IMPORTANT | tidak |
| 020 | >6 intervensi (PROGRAM_SCOPE_TOO_BROAD) | IMPORTANT | tidak |
| 021 | >4 SDG dipilih | IMPORTANT | tidak |
| 022 | unsupported impact claim terdeteksi | REQUIRES_HUMAN_CONFIRMATION | tidak |
| 023 | sensitive-data concern (data pribadi di story) | REQUIRES_HUMAN_CONFIRMATION | tidak (tapi data di-mask di blueprint) |
| 024 | safeguarding trigger (anak/GBV/adat) | REQUIRES_HUMAN_CONFIRMATION | tidak; XC terkait dipaksa tampil |

---

## 27. Confidence Model

Skala 0.00–1.00 per candidate & per blueprint item. Sumber confidence: (a) kekuatan match lexicon→concept (exact canonical 0.9; synonym 0.8; informal 0.6–0.7; morphology-only 0.4 cap); (b) konvergensi multi-field (story + beneficiary_description sepakat → +0.1); (c) anti-signal → penalti; (d) model-extracted candidates cap 0.75 (§13). Band pelaporan ke user: `tinggi ≥0.8` (ditampilkan sebagai pernyataan), `sedang 0.6–0.79` (ditampilkan dengan badge "perkiraan"), `rendah <0.6` (hanya sebagai pertanyaan/pilihan — tidak pernah pernyataan). **Dilarang confidence palsu:** nilai tidak boleh dinaikkan tanpa evidence baru; agregat blueprint = min(confidence komponen kritisnya), bukan rata-rata (rantai selemah link terlemahnya — konsisten rule C-1).

**Alignment dengan guardrail v1 (terverifikasi):** cut points band identik (0.60 / 0.80) sehingga satu vocabulary confidence berlaku lintas layer. Perbedaan yang disengaja: (a) guardrail memakai margin 0.15 untuk ambiguity klasifikasi level statement + routing ke semantic review (budget ≤20% ke AI); dokumen ini memakai margin 0.10 untuk sector ambiguity — keduanya di-ship sebagai config terpisah (`level_classification_config` vs `scoring_config`), dituning independen; (b) bobot level-classification guardrail (semantic role 40 / object of change 20 / control 20 / linguistic 15 / quantification 5) TIDAK menggantikan bobot sector/archetype/SDG scoring dokumen ini — domain berbeda.

---

## 28. Conflict and Ambiguity Resolution

Prinsip: bila confidence rendah atau margin tipis — **do not silently decide; show concise choice to user**. Contoh tampilan pilihan (format, bukan UI final):

```text
Kami belum yakin fokus utama program:
○ Pertanian dan akses pasar
○ Pengembangan UMKM
○ Penguatan koperasi
```

Format acuan rule:

```yaml
conflict_id: CONF-001
candidate_types: [sector]
signals: ["skor AGRI dan LIVELIHOOD margin <0.10"]
severity: medium
resolution_signals: [main outcome family, primary actor, indicator family,
  intervention mechanism]
tie_breaking_rule: "outcome family domain-spesifik menang (yield/panen→AGRI;
  omzet/usaha→LIVELIHOOD); bila tetap seri → user choice"
page_2_behavior: "tampilkan pilihan sektor (3 opsi maks)"
user_question: "Fokus utama program pada praktik budidaya/hasil panen,
  atau pengembangan usaha/pendapatan?"
fallback: "kedua sektor sebagai Secondary; tidak ada Primary sampai dipilih"
```

| CONF | Konflik | Resolusi utama | Fallback |
|---|---|---|---|
| 001 | sector mismatch AGRI vs LIVELIHOOD (contoh §19.1 spec) | outcome+actor+indicator+mekanisme | user choice |
| 002 | beneficiary–target-actor conflict (siswa vs guru) | siapa yang praktiknya berubah = target actor | tanya (MISS-006) |
| 003 | actor-role conflict (pemda: duty bearer vs implementer) | siapa pemilik kewajiban vs pelaksana kegiatan | tandai dual-role |
| 004 | intervention–outcome mismatch (ARCH-006 klaim OF-003) | minta bridging IO atau turunkan klaim | warning ANTI-12 |
| 005 | output–outcome confusion | invalid relationships §8 → reklasifikasi | badge + template REJ |
| 006 | activity–output confusion (HN-90 pola) | completion criterion ada? → output | reklasifikasi ke task/activity |
| 007 | donor–SDG conflict (call minta SDG X, program mendukung Y) | tampilkan gap; jangan memaksa X jadi Primary | UNSUPPORTED_SDG_SELECTION bila user memaksa |
| 008 | SDG tie (contoh §19.2 spec: petani→2, pendapatan→8, kemiskinan→1, platform→9) | Primary dari Outcome+Indicator, bukan jumlah keyword; §22.5 | user choice 2 opsi |
| 009 | duration–impact mismatch (impact 12 bln) | reklasifikasi klaim ke outcome/contribution | warning HN-10/38 pola |
| 010 | beneficiary-count inconsistency (field vs story) | field terstruktur menang; story jadi catatan | tanya konfirmasi |
| 011 | location inconsistency | field menang | tanya |
| 012 | budget–scope mismatch (budget/penerima ekstrem) | sanity warning, bukan blocker | tampilkan rasio, minta cek |
| 013 | cross-cutting false positive (label rentan tanpa desain) | relevance test §20 | XC diturunkan ke "pertanyaan", bukan rekomendasi |

Aturan umum: user manual input mengalahkan inference (kecuali melanggar schema/safety); setiap resolusi tercatat di provenance.

---

## 29. Page 2 Data Contract

```yaml
program_facts:              # seluruh field Page 1 + org snapshot ref

detected_context:
  primary_sector:           # nullable bila SECTOR_AMBIGUOUS
  secondary_sectors: []     # maks 2
  target_actors: []
  beneficiaries: []
  primary_interventions: [] # maks 3
  supporting_interventions: []  # maks 3

sdg_recommendations:
  primary: []               # maks 2
  secondary: []             # maks 2
  optional: []              # hidden by default
  rejected: []              # dengan TPL-REJ explanation

blueprint:
  problem_summary:
  impact_direction:
  expected_changes: []      # maks 4
  direct_results: []
  suggested_partners: []    # label SUGGESTED_PARTNER

cross_cutting_relevance: []
missing_information: []     # maks 3 critical + 3 recommended tampil
ambiguities: []             # user-choice objects
warnings: []                # PROGRAM_SCOPE_TOO_BROAD, stuffing, dsb.
user_review_status:         # pending | approved | modified
```

Setiap derived item wajib membawa: `source`, `evidence_span`, `confidence`, `positive_signals`, `anti_signals`, `explanation` (template ID + rendered), `accepted_by_user`, `modified_by_user`. Approval Page 2 membekukan payload ini sebagai input retrieval Golden Generation (§35).

---

## 30. End-to-End Page 1 → Page 2 Examples

30 contoh bilingual (EX-01..30) menutupi 20 sektor prioritas. Dua contoh FULL sebagai acuan format; 28 lainnya kompak terstandar. Skor adalah nilai ilustratif hasil penerapan bobot §14/§17/§22 pada signals yang tercantum — menjadi ekspektasi kalibrasi, bukan angka sakral.

### EX-01 (FULL) — Agriculture, bahasa informal

**Page 1:** judul "Petani Naik Kelas"; lokasi "Kab. Garut"; durasi 18 bulan; penerima "petani sayur anggota 8 kelompok tani"; jumlah 240 orang; dana Rp 850 jt; donor: —; story: *"Petani sayur di desa kami hasil panennya sering rugi karena harga dimainkan pengepul dan gak punya akses pasar. Kami mau latih pencatatan usaha tani, dampingi kelompok, dan hubungkan ke pembeli supermarket dan hotel di Bandung supaya pendapatan naik."*

**Extraction:** language=id-informal. Problems: PF-003 (0.8, span "harga dimainkan pengepul"), PF-001 (0.85, "gak punya akses pasar"), PF-005 (0.7, "latih pencatatan"). Cause candidate (user-claim): price_information_asymmetry (requires_confirmation). Actors: ACT-001 target+beneficiary (0.9), ACT-003 institutional (0.8), ACT-033 intermediary ("pembeli supermarket"). Interventions: ARCH-001 (explicit "latih", 0.9), ARCH-003 (0.8 "dampingi"), ARCH-015 (explicit "hubungkan ke pembeli", 0.9). OF: 003 (0.7), 008 (0.85), 009 (0.8 "pendapatan naik"). OPF: 001/002, 023.

**Sector scores:** AGRI-001 = 0.86 (Primary); LIVELIHOOD-002 = 0.71 (Secondary); COOP-003 = 0.38 (tidak). Margin 0.15 > 0.10 → tidak ambigu.

**SDG scores:** SDG_2 = 0.78 → **gate §22.2**: outcome pangan/produktivitas? OF terdeteksi = market/income, BUKAN yield/food security → SDG_2 turun ke Secondary + TPL-AMB ("konfirmasi apakah produktivitas/ketahanan pangan juga ditargetkan"). SDG_8 = 0.81 Primary (OF-009 + IND-MSME-REV-001 family). SDG_1 = 0.44 optional (status kemiskinan kohort tak disebut). SDG_9, SDG_5 tidak muncul. **Primary: SDG_8. Secondary: SDG_2.** Rejected tampil: — . Anti-signal aktif: tidak ada (petani BUKAN satu-satunya signal).

**Missing:** MISS-010 baseline; MISS-016 komitmen pembeli (ARCH-015 butuh); MISS-013 unit indikator. **Ambiguities:** "pendapatan" vs "harga diterima" (OF-009 vs OF-010) → pertanyaan ringan.

**Blueprint:** problem summary via TPL-BLUE-PROB-001; impact direction: "Program mengarah pada penghidupan petani sayur yang lebih menguntungkan dan stabil di Kab. Garut"; expected changes: "Petani menerapkan pencatatan usaha tani untuk keputusan usaha" (OF-003), "Kelompok tani bertransaksi rutin dengan pembeli terstruktur" (OF-008); direct results: pelatihan+pendampingan (OPF-001/002), linkage pembeli (OPF-023); partners: BPP/penyuluh, DinkopUKM — SUGGESTED_PARTNER. **Templates:** TPL-PRI-001 (SDG_8), TPL-AMB-001 (SDG_2), TPL-PRI-SECTOR-001. **Review questions:** target actor konfirmasi (petani ✓), pembeli sudah ada kontak?

### EX-02 (FULL) — Education, English input

**Page 1:** title "Better Teaching, Better Learning"; location "Kab. Sumba Timur"; 24 months; beneficiaries "early-grade students in 30 schools"; 3,600; USD 120,000; donor: foundation call on foundational learning; story: *"Student literacy scores are low. We will train and coach 90 early-grade teachers to apply differentiated instruction, and build teacher learning communities across schools."*

**Extraction:** language=en. PF-018 (0.85). Actors: ACT-020 siswa = **beneficiary** (0.9); ACT-019 guru = **target actor** (0.9, "teachers to apply") — CONF-002 tidak terpicu karena story eksplisit. ARCH-001 (0.9), ARCH-003 (0.85 "coach"), ARCH-031-network (0.6 "learning communities"). OF-003 (guru, 0.85), OF-001 jalur. OPF-001/002, 021.

**Sector:** EDU-006 = 0.88 Primary; SKILLS-005 = 0.31. **SDG:** SDG_4 = 0.84 → gate lolos (OF-003 guru + IND-EDU-TEACH-013/LEARN-014 families) → **Primary SDG_4**; SDG_10 = 0.42 optional; SDG-ANTI-CHILD-003 tidak aktif (bukan label anak saja). Secondary: — (tidak ada ≥0.55; blueprint tetap sah dengan 1 Primary). Donor alignment +0.03 (call = foundational learning).

**Missing:** MISS-010 baseline (learning assessment instrument belum disebut → juga MISS-014). **Blueprint** expected changes: "Teachers apply differentiated instruction in routine classes"; impact direction: "toward sustained improvement in early-grade literacy in Sumba Timur" (contribution framing, ≥1 tahun ajaran per OF time_horizon). Fixture kalibrasi: harus cocok GOLD-07.

### EX-03..EX-30 (kompak)

Format kolom: Page 1 inti + story-cue → mapping kunci → SDG (P/S/rejected) → missing/ambiguity/warning utama.

**EX-03 MSME/kuliner (ID):** "UMKM kuliner belum punya pencatatan, belum melek digital; latih & onboarding marketplace", 150 usaha, 12 bln → PF-005,011; ARCH-001,007/008; OF-003,004,012 → **P: SDG_8** (0.79, OF-012+DIGTX-003); S: SDG_9 (0.58 — adopsi terukur direncanakan); rejected tampil: SDG_9 sebagai Primary bila user pilih tanpa MAU def → UNSUPPORTED. Missing: minimum-use definition (MISS-013).
**EX-04 Koperasi (ID):** "koperasi gak aktif, RAT gak jalan; dampingi tata kelola & unit usaha", 12 koperasi → PF-007; ARCH-017,018; OF-014 (IND-COOP-RAT-025, SHU-026) → **P: SDG_8** (0.76); S: SDG_16 (0.57 institusi). Warning: "aktif" ambigu → definisi minimum. HN-guard: badan hukum≠fungsi.
**EX-05 Financial inclusion (ID):** "ibu-ibu pelaku usaha mikro susah dapat modal; fasilitasi KUR + literasi keuangan", 300 → PF-006; ARCH-013,001; OF-009 via penggunaan (ANTI-08 guard aktif) → **P: SDG_8** (8.10/8.3); S: SDG_1 (0.61 bila kohort miskin — tanya), SDG_5 kandidat 0.52 → TPL-AMB (kontrol pendapatan ditargetkan?). Anti: SDG-ANTI-WOMAN-002 menahan SDG_5 dari Primary.
**EX-06 Skills/NEET (EN):** "vocational training + job placement for NEET youth", 200, 18 mo → PF-015; ARCH-001,014; OF-013 (IND-SKILLS-JOB6-029, YOUTH-NEET-035) → **P: SDG_8 (8.6)**; S: SDG_4 (4.4). Missing: tracer plan (MISS-014); anti: sertifikat≠kerja dicatat.
**EX-07 Health/PTM pola SIGAP (ID):** "kader skrining hipertensi/diabetes + rujukan Puskesmas + pencatatan digital", 40 kader/10 titik → PF-008,017; ARCH-022,001,007; OF-006 (HLTH-UTIL-016), OF-002 (CAPAC-056) → **P: SDG_3 (3.4)**; S: SDG_16? tidak (0.3); S: — ; optional SDG_9 0.41 (digital pendukung). Safeguard: skrining wajib jalur rujukan (XC catatan). Fixture: GOLD-08.
**EX-08 Nutrition (ID):** "edukasi PMBA + posyandu penguatan utk baduta", 500 baduta → PF-016/017; ARCH-005,001; OF-003 (NUTR-PMBA-017) → **P: SDG_2 (2.2)**; S: SDG_3. Warning HN-10 guard: stunting turun ≤12 bln = overclaim → impact direction contribution.
**EX-09 WASH (ID):** "pemicuan STBM + wusan + verifikasi ODF", 15 desa → PF-020; ARCH-004,023; OF-006 (WASH-USE-018, ODF-058) → **P: SDG_6 (6.2)**; S: SDG_3 (0.56 jalur diare-contribution). Missing: sustaining check bln-12 (dari IND-058 logic). Fixture: GOLD-09.
**EX-10 Climate adaptation (ID):** "SLI + demplot varietas toleran utk petani tadah hujan", 8 desa → PF-021; ARCH-034,033; OF-022 (CCA-PRACT-023, INFOUSE-059) → **P: SDG_13 (13.1)**; S: SDG_2 (2.4). Anti-signal CLIMATE-005 TIDAK aktif (OF-022+IND ada). Fixture: GOLD-11.
**EX-11 Gender×livelihood (ID):** "modal bertahap + pendampingan usaha PEKKA + keterwakilan musdes", 150 → PF-002,014; ARCH-012,003; OF-009 + OF-019-gender (GEWE-DECIS-031, LEAD-032) → **P: SDG_5 (5.5/5.a)** — gate lolos karena outcome kesetaraan eksplisit; **P2: SDG_8** (0.76); S: SDG_1 (tanya status miskin). Safeguard: backlash → jalur rujukan (XC-001 risk). Fixture: GOLD-10.
**EX-12 Disability inclusion (ID):** "pelatihan kerja inklusif dgn akomodasi utk penyandang disabilitas", 80 → PF-014,015; ARCH-001; OF-013 + OF-partisipasi (DISAB-PART-034 via WG-SS) → **P: SDG_8 (8.5)**; S: SDG_10 (10.2). Anti: DISAB-SEG-020 guard (pastikan arus utama). Missing: definisi akomodasi.
**EX-13 Governance/musrenbang (ID):** "fasilitasi usulan warga masuk RKPDes/APBDes", 20 desa → PF-013; ARCH-030; OF-016 (GOV-BUDGET-046) → **P: SDG_16 (16.7)**; S: — . Control LOW dicatat → target konservatif; missing: MISS-016 komitmen pemdes.
**EX-14 CSO strengthening (ID):** "penguatan tata kelola & keuangan 25 OMS sampai auditable", 24 bln → PF-007; ARCH-018; OF-014 (CSO-AUDIT-005, PRACT-007) → **P: SDG_16 (16.6)**; S: SDG_17 (0.56). Anti: OCA self-report guard (HN-64) → verified score wajib.
**EX-15 Civic tech (ID):** "platform lapor warga terintegrasi SP4N-LAPOR! + SOP respons 5 OPD", 20 desa/kel → PF-012,013; ARCH-007,029; OF-019 dua sisi (DIG-MAU-043 + CIVTECH-INST-045) → **P: SDG_16 (16.6)**; S: SDG_9? DITOLAK Primary (SDG-ANTI-DIGITAL-004) → optional 0.48. Fixture: GOLD-12; HN-5/6/39 guard.
**EX-16 Humanitarian (ID):** "respons banjir: distribusi + PDM standar Sphere", 1.500 KK, 9 bln → PF-016,029; ARCH-037; OF-024 (HUM-BASIC-038) → **P: SDG_2 (2.1)** horizon humanitarian sah; S: SDG_6, SDG_11 per sektor distribusi. Warning CONF-009: klaim jangka panjang diblokir; AAP (XC-011) dipaksa tampil.
**EX-17 Child protection (ID):** "penguatan PATBM + manajemen kasus UPTD", 10 kecamatan → PF-024; ARCH-038,039; OF-025 (CHILD-CASE-036) → **P: SDG_16 (16.2)**; S: SDG_5 bila GBV remaja. Guard HN-91: "kasus turun" ditolak sebagai indikator; privacy XC-009 dipaksa.
**EX-18 Digital transformation UMKM (EN):** "digitize bookkeeping and sales channels for 200 MSMEs" → PF-011,005; ARCH-007/008,001; OF-004,012 (DIGTX-003) → **P: SDG_8**; S: SDG_9 (9.3 kredit/rantai nilai bila ada). Anti DIGITAL-004 menahan SDG_9 dari Primary.
**EX-19 Policy advocacy (ID):** "riset + advokasi perda perlindungan pekerja rumah tangga", 18 bln → PF-025,027; ARCH-025,020; OF-017 jalur (KNOW-ENGAGE-053 bridge) → **P: SDG_16**? gate: outcome=policy_implemented BELUM ada (baru engagement) → **SDG_16 Secondary**, Primary = — sampai user konfirmasi target implementasi; SDG_8 (8.8) S bila outcome perlindungan pekerja terukur. Warning ANTI-13/HN-47.
**EX-20 Environment/waste (ID):** "bank sampah 10 RW + edukasi pemilahan", 12 bln → PF-022; ARCH-023-ringan,004,005 → OF-023? guard HN-55: "berdiri≠beroperasi" → OF diarahkan ke operasional+setoran → **P: SDG_12 (12.5)** bila indikator timbangan; S: SDG_11. Missing: baseline timbulan.
**EX-21 DRR (ID):** "Destana: rencana kontinjensi + drill + EWS", 6 desa → PF-023; ARCH-036,030; OF-021 (DRR-DRILL-024, EWS-060) → **P: SDG_11 (11.b)/SDG_13 (13.1)** → CONF-008 tie → resolusi: fokus kesiapsiagaan lokal → 13.1 bila framing iklim, 11.b bila framing tata kota — tanya user (2 opsi). Guard HN-25/65.
**EX-22 Energy (ID):** "PLTS komunal 4 dusun + pelatihan pengelola" → PF-029/008; ARCH-023,001; OF-006 (ENERGY-USE-042) → **P: SDG_7 (7.1)**; S: — . Anti INFRA-008: terpasang≠akses → indikator primacy of use wajib.
**EX-23 Social protection (ID):** "advokasi data: keluarga layak masuk penerima bansos", 3 kecamatan → PF-012-targeting; ARCH-028/029; OF-005 (SOCPRO-INCL-037) → **P: SDG_1 (1.3)**; S: SDG_10. Control LOW → target konservatif dicatat di blueprint.
**EX-24 Migration (ID):** "edukasi & pendampingan calon PMI jalur prosedural", 400 → PF-024/008; ARCH-001,038; OF-020-prosedural (MIGR-SAFE-048) → **P: SDG_8 (8.8)**; S: SDG_10 (10.7). DQ note survivorship masuk asumsi blueprint.
**EX-25 Cooperative×fisheries (ID):** "koperasi nelayan: cold chain + akses pembeli", 5 koperasi → PF-001,003; ARCH-015,010,017 → OF-008,010 → **P: SDG_8**; S: SDG_14 (14.b akses nelayan kecil — gate: butuh indikator akses/pendapatan nelayan; bila ada → S naik). Anti: alat=produktivitas guard (ANTI-03).
**EX-26 Peace (ID):** "forum lintas komunitas + kegiatan kolaboratif pasca-konflik", 4 desa → PF-028/014; ARCH-031,004; OF-018-kolab (PEACE-CONTACT-047) → **P: SDG_16 (16.1)** hanya bila survei kohesi direncanakan; else Secondary + TPL-AMB. Guard: kontak≠kohesi.
**EX-27 Research/KM (EN):** "policy research on village fund effectiveness + dissemination" → PF-027; ARCH-025,040; OPF-016/025; OF-015/017 jalur → SDG substantif ikut topik (village governance → SDG_16 S). **Primary: —** (research-only; outcome uptake belum dirancang) + TPL-AMB. Guard ANTI-13.
**EX-28 CSR supply chain (EN):** "capacity building for smallholder suppliers to meet sustainability standards", 600 petani → PF-004; ARCH-001,035; OF-018 (CSR-SUPPLIER-051), OF-011 → **P: SDG_12 (12.6)**; **P2: SDG_2 (2.3/2.4)** bila yield/praktik diukur; S: SDG_8, SDG_17. Stuffing guard aktif (4 kandidat ≥0.55) → rank Outcome+Indicator.
**EX-29 Multi-sektor "terintegrasi" (ID):** "program terpadu: ekonomi, kesehatan, pendidikan, lingkungan utk desa binaan" → 5 PF tak berhubungan; 8 ARCH kandidat → **PROGRAM_SCOPE_TOO_BROAD** + MISS-019/020/021; SDG stuffing → TPL-STUF-001; saran gabung/pecah. Tidak ada Primary sampai difokuskan. (fixture negatif utama)
**EX-30 Zakat produktif (ID):** "zakat produktif: modal usaha mustahik + pendampingan graduasi", 100 mustahik, donor LAZ → PF-002,006; ARCH-012,003; OF-026/009 graduasi → **P: SDG_1 (1.2)**; S: SDG_8. Donor profile BAZNAS aktif (asnaf fields, DONOR_SPECIFIC); guard HN-96: penyaluran≠outcome.

---

## 31. Hard-Negative Regression Fixtures

Fixtures ekspektasi-negatif: input yang secara naif memicu mapping keliru; engine WAJIB menolak/menurunkan/memberi warning sesuai ekspektasi. Sumber: HN-1..100 (corpus v1 §23 + v1.1 §S3) + 15 kasus mapping-spesifik dari spec. Satu fixture FULL sebagai acuan schema (Annex F); sisanya tabel kompak. Konvensi: FIX-HN-101..115 = 15 kasus mapping-spesifik; FIX-HN-001..100 dipetakan 1:1 dari HN-1..100 (di-generate dari registry HN saat runtime extraction; tidak ditulis satu-satu di sini — duplikasi teks HN dilarang oleh aturan penyalinan internal).

```yaml
fixture_id: FIX-HN-101
language: id
page_1_input_summary: >
  Beneficiary: "500 petani di 3 kecamatan". Story: "Kami akan melatih
  literasi keuangan untuk petani." Tidak ada outcome pertanian.
incorrect_mapping:
  sdg_primary: SDG_2
  reason_it_looks_right: "beneficiary = petani"
expected_mapping:
  sector_primary: SECTOR-FININC-004 atau LIVELIHOOD-002 (bukan AGRI)
  sdg_primary_candidates: [SDG_8]     # bila outcome keuangan/pendapatan ada
  sdg_rejected_as_primary: [SDG_2]
anti_signal_ids: [SDG-ANTI-FARMER-001]
expected_warning: TPL-REJ-001 (SDG_2, weak_signal="profil penerima manfaat")
expected_confidence_behavior: "SDG_2 ≤ 0.50 setelah penalti"
reason: "SDG dibuktikan Outcome+Indicator, bukan label beneficiary"
source_hard_negative_id: null   # kasus mapping-spesifik dari spec
epistemic_label: CANONICAL_IMPACTORY
```

| FIX | Input naif (ringkas) | Mapping keliru | Ekspektasi engine | Anti-signal/guard |
|---|---|---|---|---|
| HN-101 | petani + literasi keuangan | SDG_2 Primary | SDG_2 rejected-as-primary | FARMER-001 |
| HN-102 | perempuan penerima pelatihan menjahit | SDG_5 Primary | SDG_5 ≤ Secondary + TPL-AMB (outcome kesetaraan?) | WOMAN-002 |
| HN-103 | anak penerima paket gizi | SDG_4 Primary | SDG_4 rejected; SDG_2/3 dievaluasi | CHILD-003 |
| HN-104 | "membangun platform digital utk nelayan" tanpa adopsi | SDG_9 Primary | SDG_9 rejected-as-primary; sektor tujuan menentukan | DIGITAL-004 |
| HN-105 | "program sadar iklim" (kampanye) | SDG_13 Primary | SDG_13 rejected; OF-022 tidak ada | CLIMATE-005 |
| HN-106 | "500 orang terlatih" sebagai expected change | OF-009 income | expected_changes kosong + MISS-008; OPF-002 saja | TRAINING-006; invalid #2 |
| HN-107 | "1.000 warga terjangkau" sebagai outcome | OF-024 | reach = output; TPL-REJ | REACH-010; ANTI-04 |
| HN-108 | "alsintan dibagikan → produktivitas naik" tanpa utilisasi | OF-011 langsung | wajib IO technology_used; warning | invalid #4; ANTI-03 |
| HN-109 | "policy brief terbit → reformasi anggaran" | OF-017 | OF-017 unsupported; bridging ENGAGE-053 diminta | invalid #11; POLICYDOC-012 |
| HN-110 | "traffic web 100k = partisipasi publik" | OF-016 | ditolak; IND-CIVIC-ACTIVE-020 threshold diminta | SOCMED-013; HN-39 |
| HN-111 | "dana bergulir cair 100% = kemiskinan turun" | SDG_1 Primary | SDG_1 rejected; rantai penggunaan diminta | CASH-007; ANTI-08 |
| HN-112 | program "terintegrasi" memilih 9 SDGs | 9 SDGs | stuffing rule; TPL-STUF-001; rank Outcome+Indicator | §22.3 |
| HN-113 | "siswa" ditulis sebagai target actor pelatihan guru | target=siswa | CONF-002 → target=guru, siswa=beneficiary | §15 |
| HN-114 | "SOP disusun" ditulis di kolom Outcome | OF-014 | reklasifikasi OPF-009; TPL-REJ level | CONF-005; invalid #5 pola |
| HN-115 | "rapat koordinasi 12x" ditulis sebagai Output | OPF | reklasifikasi activity/task (tak ada completion criterion hasil) | CONF-006; HN-90 |

Ekspektasi umum seluruh FIX-HN-001..100 (mapping dari HN registry): engine minimal harus (a) tidak menghasilkan Primary sector/SDG dari pola tersebut, (b) memunculkan warning/level-reclassification yang sesuai anti-pattern rujukannya, (c) menyimpan explanation template yang tepat. Fixture runner menganggap fixture LULUS bila ketiganya terpenuhi.

**Sumber fixture tambahan (terverifikasi):** guardrail v1 memuat set fixture sendiri — 200 gold examples, 100 hard negatives, dan 10 full bilingual results chains — untuk layer level-classification. Set tersebut TIDAK diduplikasi ke sini; fixture runner menjalankan dua suite terpisah (level-classification suite dari guardrail; context-mapping suite dari dokumen ini) dan keduanya menjadi gate rilis P0-E.

---

## 32. Gold Regression Fixtures

Fixtures ekspektasi-positif dari 12 gold chains: FIX-GOLD-01..12. Sumber chain: GOLD-AGRI (v1 §7.1 strong chain), GOLD-MSME (v1 §7.2), GOLD-CSO (v1 §7.3), GOLD-ARCH-TRAINING/MARKET/DIGDEV/CAPACITY (v1 §9, digabung sebagai 1 fixture per chain — 4 fixtures), GOLD-CIVTECH-001 + GOLD-HEALTH (v1 §22), GOLD-07..12 (v1.1 §S4). Total dipetakan ke 12 fixture dengan prioritas eksplisit di bawah. Satu FULL sebagai acuan:

```yaml
fixture_id: FIX-GOLD-07
source_gold_id: GOLD-07 (EDU, v1.1 §S4)
language: en
page_1_input: (EX-02 §30 dipakai sebagai input page 1)
expected_sector_primary: SECTOR-EDU-006
expected_interventions_primary: [ARCH-TRAINING-001, ARCH-MENTOR-003]
expected_actor_roles:
  target_actor: [ACT-019 guru]
  beneficiary: [ACT-020 siswa]
expected_outcome_families: [OF-003 (guru), OF-001 jalur siswa]
expected_output_families: [OPF-001, OPF-002]
expected_sdg_primary: [SDG_4]
expected_sdg_secondary: []
expected_sdg_rejected_as_primary: []
expected_missing_information: [MISS-010, MISS-014]
expected_blueprint_impact_direction_contains:
  ["literasi kelas awal", "contribution framing", "≥1 tahun ajaran"]
pass_criteria: "seluruh expected_* terpenuhi; tidak ada Primary tambahan"
```

| FIX-GOLD | Sumber chain | Sector P | ARCH P | OF kunci | SDG P | Guard yang harus TIDAK aktif |
|---|---|---|---|---|---|---|
| 01 | v1 §7.1 AGRI chain | AGRI-001 | 001,034/033 | OF-003,011 | SDG_2 (2.3/2.4) | FARMER-001 (karena outcome ada) |
| 02 | v1 §7.2 MSME chain | LIVELIHOOD-002 | 001,003 | OF-003,012 | SDG_8 | TRAINING-006 |
| 03 | v1 §7.3 CSO chain | CSO-021 | 018 | OF-014 | SDG_16 | MoU/dokumen guard |
| 04 | v1 §9 ARCH-TRAINING gold | (per sektor chain) | 001 | OF-003 | per domain | ANTI-01 |
| 05 | v1 §9 ARCH-MARKET gold | AGRI/LIVELIHOOD | 015 | OF-008→009 | SDG_8/2 via §22.5 | HN-8 |
| 06 | v1 §22 GOLD-HEALTH | HEALTH-007 | 022,001 | OF-006 | SDG_3 | kunjungan=sehat |
| 07 | v1.1 GOLD-07 EDU | (FULL di atas) | | | | |
| 08 | v1.1 GOLD-08 Health/SIGAP | HEALTH-007 | 022,007 | OF-006,002 | SDG_3 (3.4) | DIGITAL-004 (digital = pendukung) |
| 09 | v1.1 GOLD-09 WASH | WASH-009 | 004,023 | OF-006 | SDG_6 (6.2) | INFRA-008 |
| 10 | v1.1 GOLD-10 Gender×Livelihood | GEWE-017 + 002 | 012,003 | OF-009 + OF-019-gender | SDG_5 + SDG_8 dual | WOMAN-002 (outcome kesetaraan ada) |
| 11 | v1.1 GOLD-11 CCA | CCA-010 | 034,033 | OF-022 | SDG_13 (13.1) | CLIMATE-005 |
| 12 | v1.1 GOLD-12 Civic tech + GOLD-CIVTECH-001 | CIVTECH-022 | 007,029 | OF-019 dua sisi | SDG_16 | DIGITAL-004 |

Pass criteria global: 12/12 gold fixtures harus menghasilkan Primary yang diharapkan TANPA anti-signal false positive — ini sekaligus menguji bahwa anti-signals tidak over-fire pada program yang benar.

---

## 33. Machine-Extractable Annexes

Enam schema fenced-YAML untuk runtime extraction. Schema = kontrak bentuk data; nilai contoh merujuk entri dokumen ini.

### Annex A — Language Concept Schema
```yaml
language_concept:
  concept_id: string            # CNC-<KELAS>-NNN
  canonical_name: string
  preferred_id: string          # label Bahasa Indonesia
  preferred_en: string
  definition_id: string
  definition_en: string
  synonyms_id: [string]
  synonyms_en: [string]
  informal_expressions_id: [string]
  formal_expressions_id: [string]
  formal_expressions_en: [string]
  abbreviations: [string]
  common_misspellings: [string]
  near_synonyms: [string]
  broader_concepts: [concept_id]
  narrower_concepts: [concept_id]
  related_concepts: [concept_id]
  ambiguous_terms: [string]     # rujuk §12
  negative_expressions: [string]
  exclusion_expressions: [string]
  positive_signals: [string]
  negative_signals: [string]
  anti_signals: [string]
  applicable_sectors: [sector_id]
  applicable_archetypes: [archetype_id]
  applicable_result_levels: [enum: problem|actor|activity|output|
    intermediate_outcome|outcome|impact|indicator|risk|assumption]
  disambiguation_questions: [string]
  epistemic_label: enum         # §4
  sources: [source_ref]
```

### Annex B — Sector Mapping Schema
```yaml
sector_mapping:
  sector_id: string
  name_id: string
  name_en: string
  parent_sector_id: string|null
  subsector_ids: [string]       # SUB-*, opsional
  definition_id: string
  positive_terms: {id: [string], en: [string]}
  informal_terms_id: [string]
  problem_family_ids: [PF]
  actor_family_ids: [ACT]
  intervention_archetype_ids: [ARCH]
  outcome_family_ids: [OF]
  output_family_ids: [OPF]
  indicator_family_ids: [IND]
  sdg_affinities: [{sdg_id, official_target_ids: [string], condition}]
  negative_signals: [string]
  anti_signals: [string]
  confusable_sector_ids: [{sector_id, disambiguation}]
  disambiguation_questions: [string]
  scoring_weights_ref: "§14.1"
  epistemic_label: enum
  sources: [source_ref]
```

### Annex C — Intervention Mapping Schema
```yaml
intervention_mapping:
  archetype_id: string
  name_id: string
  name_en: string
  definition: string
  positive_action_signals: [string]
  object_signals: [string]
  actor_signals: [ACT]
  explicit_user_phrases: [string]
  problem_family_ids: [PF]
  expected_output_family_ids: [OPF]
  expected_intermediate_outcome_ids: [OF|IO-desc]
  expected_outcome_family_ids: [OF]
  wbs_pattern_ids: [ref corpus v1 §15]
  cost_driver_pattern_ids: [ref corpus v1 §16]
  meal_pattern_ids: [ref corpus v1 §17]
  negative_signals: [string]
  anti_signals: [string]
  confusable_archetype_ids: [{archetype_id, disambiguation}]
  minimum_evidence: [string]
  disambiguation_questions: [string]
  scoring_weights_ref: "§17"
  epistemic_label: enum
  sources: [source_ref]
```

### Annex D — SDG Mapping Schema
```yaml
sdg_mapping:
  sdg_id: string                # SDG_N
  number: int
  name_id: string
  name_en: string
  official_target_ids: [string]     # notasi resmi "N.n"
  official_indicator_ids: [string]  # notasi resmi "N.n.m"
  official_text_policy: "link ke metadata repository; tidak disalin penuh"
  relevant_sector_ids: [SECTOR]
  relevant_problem_family_ids: [PF]
  relevant_actor_ids: [ACT]
  relevant_intervention_ids: [ARCH]
  relevant_outcome_family_ids: [OF]
  relevant_indicator_family_ids: [IND]
  relevant_cross_cutting_ids: [XC]
  positive_signals: [string]
  negative_signals: [string]
  anti_signal_ids: [SDG-ANTI]
  common_false_matches: [string]
  common_overclaim_patterns: [string]
  primary_explanation_template_ids: [TPL]
  secondary_explanation_template_ids: [TPL]
  rejection_template_ids: [TPL]
  indonesia_tpb_alignment: [string]   # pilar + metadata ref (S-06)
  scoring_weights_ref: "§22"
  thresholds_ref: "§22.1"
  coverage_gate_ref: "§22.2"
  sources: [source_ref]
  verification_status: enum
```

### Annex E — Mapping Result Schema (per derived item)
```yaml
mapping_result_item:
  item_id: string
  item_type: enum               # sector|actor|archetype|of|opf|xc|sdg|blueprint_*
  canonical_id: string
  recommendation_level: enum    # primary|secondary|optional|rejected|ambiguous
  confidence: number            # 0.00–1.00
  confidence_band: enum         # high|medium|low (§27)
  score_components: {component: contribution}
  positive_signals: [string]
  negative_signals: [string]
  anti_signals_fired: [id]
  evidence_spans: [{source_field, span_text_or_offset}]
  explanation: {template_id, rendered_id, rendered_en}
  requires_user_confirmation: boolean
  accepted_by_user: boolean|null
  modified_by_user: boolean
  provenance: {engine_version, registry_versions: {}, org_snapshot_version,
    created_at, resolution_history: []}
```

### Annex F — Regression Fixture Schema
```yaml
regression_fixture:
  fixture_id: string            # FIX-HN-NNN | FIX-GOLD-NN
  fixture_type: enum            # hard_negative | gold
  language: enum                # id | en | mixed
  page_1_input: {…Page 1 contract §6…}
  incorrect_mapping: {…}        # hard_negative saja
  expected_mapping:
    sector_primary: id|null
    sector_secondary: [id]
    interventions_primary: [id]
    actor_roles: {target_actor: [], beneficiary: [], others: {}}
    outcome_families: [id]
    output_families: [id]
    sdg_primary: [id]
    sdg_secondary: [id]
    sdg_rejected_as_primary: [id]
    warnings_expected: [id]
    missing_information_expected: [MISS]
  anti_signal_ids: [id]
  expected_confidence_behavior: string
  pass_criteria: string
  source_ref: string            # HN-nn | GOLD-id | spec-case
  epistemic_label: enum
```

---

## 34. Runtime Asset Extraction Recommendation (konseptual, tanpa kode)

**15 asset groups** yang diekstrak dari dokumen ini menjadi runtime registries:

1. `language_ontology` (§10, Annex A) — concepts + lexicon variants
2. `informal_phrase_registry` (§11)
3. `ambiguous_term_registry` (§12)
4. `extraction_contract` (§13, shape saja)
5. `sector_registry` (§14, Annex B; diperkaya sector packs v1 §7)
6. `actor_registry` (§15)
7. `problem_family_registry` (§16)
8. `intervention_signal_registry` (§17, Annex C)
9. `outcome_family_registry` (§18) + `output_family_registry` (§19)
10. `cross_cutting_registry` (§20)
11. `sdg_tpb_registry` (§21, Annex D) + `sdg_anti_signal_registry` (§23)
12. `scoring_config` (§14.1, §17, §22 — bobot/threshold sebagai konfigurasi berversi, bukan hard-coded)
13. `explanation_template_registry` (§24) + `blueprint_rule_registry` (§25)
14. `missing_info_registry` (§26) + `conflict_rule_registry` (§28) + `confidence_config` (§27)
15. `regression_fixtures` (§31–32, Annex F)

**Metadata wajib per asset:** `version` (semver per registry), `source_document` + `source_section`, `epistemic_label`, `language`, `sector_scope`/`archetype_scope` (bila spesifik), `effective_date`, `verification_status`, `checksum`. **Registry boundaries:** satu namespace = satu registry = satu manifest; tidak ada entri lintas-manifest; referensi antar-registry hanya via ID. **Versioning & rollback (konseptual):** setiap rilis registry immutable; mapping result menyimpan `registry_versions{}` yang dipakai (Annex E provenance) sehingga hasil lama dapat direproduksi; rollback = menunjuk kembali ke versi manifest sebelumnya, bukan mengedit entri. **Testability:** setiap perubahan registry wajib lolos seluruh FIX-GOLD dan FIX-HN sebelum dipromosikan. **Duplication prevention:** ID unik global per namespace; alias eksplisit (`aliases[]`) untuk penggabungan; linter manifest menolak canonical_name duplikat dalam satu registry.

---

## 35. Azure Credit Protection Architecture (dikonfirmasi)

1. **Page 1 → Page 2 = nol token.** Seluruh extraction, scoring, blueprint assembly, explanation rendering berjalan deterministic dari registries §34. Tidak ada panggilan Azure OpenAI dalam alur ini. (Satu-satunya pengecualian yang diizinkan spec: extraction model murah opsional untuk story sulit — §13 aturan 6 — dan itu pun bukan GPT-5.5 dan bukan prasyarat.)
2. **GPT-5.5 hanya setelah approval Page 2**, untuk Golden Generation, dengan konteks maksimum 27.500 token.
3. **Page 2 context = retrieval metadata untuk seleksi chunk Golden Generation:** primary/secondary sector (+subsector bila ada), target actors & roles, primary/supporting archetypes, outcome families, output families, SDG primary/secondary (+target IDs), donor profile aktif, cross-cutting relevan, missing-information yang tersisa. Metadata ini memilih chunk corpus (sector pack, archetype pack, indicator families, donor profile, safeguard pack) yang masuk konteks — bukan seluruh corpus.
4. **Larangan:** GPT-5.5 tidak pernah dipakai untuk lookup nama SDG, label sektor, explanation Page 2, atau operasi apa pun yang bisa dijawab registry. Explanation = template §24, selalu.

---

## 36. Evaluation and Calibration Plan

**Metrics:** precision/recall per registry level pada fixture set + human-labelled set. Prosedur kalibrasi: (1) jalankan seluruh FIX-GOLD + FIX-HN pada bobot/threshold awal; (2) tuning HANYA via `scoring_config` (bukan mengubah registry makna); (3) tambahkan 30 kasus riil ter-label (target: dari pilot user) sebelum melonggarkan threshold apa pun; (4) setiap rilis config baru diuji regresi penuh.

**Starting acceptance criteria (dari spec) + asesmen realisme:**

| Kriteria | Target awal | Realistis? |
|---|---|---|
| Primary sector precision | ≥0.90 | Ya, dengan fixture-driven tuning; recall awal mungkin 0.75–0.85 (tidak apa — ambiguous→user choice adalah jalur sah, bukan kegagalan precision) |
| Intervention detection (Primary) | ≥0.85 | Ya untuk 14 archetype ber-signals; archetype ekor panjang mungkin <0.85 → laporkan per-archetype |
| Target actor classification | ≥0.90 | Ya bila MISS-006 agresif bertanya; hitung "bertanya" bukan sebagai salah |
| Outcome family detection | ≥0.85 | Menantang pada story informal; terima 0.80 di rilis awal dengan catatan |
| Output/outcome confusion detection | ≥0.90 | Ya — pola leksikal kuat (§8 invalid, HN corpus) |
| Primary SDG precision | ≥0.90 | Ya — gate §22.2 membuat false Primary struktural sulit |
| Secondary SDG precision | ≥0.80 | Ya |
| False Primary SDG rate | ≤0.05 | Ya dengan gate; ukur pada FIX-HN penuh |
| Hard-negative rejection | ≥0.90 | Ya (target desain utama) |
| SDG stuffing detection | ≥0.90 | Ya (aturan struktural) |
| Reviewer agreement blueprint | ≥0.80 | Butuh rubrik reviewer; siapkan panduan sebelum mengukur |
| Explanation traceability | 100% | Ya — struktural (template+slot dari registry) |
| Unsupported factual claims di blueprint | 0 | Ya — struktural (provenance wajib §25.6) |

Rekomendasi tambahan: pisahkan metrik "salah" dari "bertanya" (ask-rate). Ask-rate awal yang sehat: 20–35% program memunculkan ≥1 pertanyaan disambiguasi; ask-rate ~0% justru indikasi over-confidence.

---

## 37. Known Limitations

1. Registry kompak (tabel) belum berbentuk entri FULL per schema Annex — ekspansi adalah pekerjaan mekanis saat runtime extraction, tetapi tetap pekerjaan.
2. Skor pada §30 adalah ekspektasi kalibrasi ilustratif, bukan hasil eksekusi engine — angka final ditetapkan saat kalibrasi §36.
3. Lexicon informal (§11) belum menutup variasi dialek regional (Jawa/Sunda/Melayu lokal campur ID); ditandai `HEURISTIC_ONLY` untuk perluasan dari telemetry.
4. Subsector layer minimal (3 contoh AGRI); sektor lain menyusul on-demand.
5. Indicator family perikanan/kelautan (SDG 14) = gap yang diwarisi dari corpus v1/v1.1 (P1).
6. TPB alignment baru pada level pilar + rujukan metadata; pemetaan target-ke-indikator-TPB per entri belum dieksplisitkan (butuh S-06 halaman-per-indikator).
7. Deteksi kontradiksi naratif kompleks (klaim saling bertentangan dalam satu paragraf) di luar kemampuan deterministic v1 — fallback: extraction model murah + requires_confirmation.
8. Fixture FIX-HN-001..100 didefinisikan by-reference ke HN registry, belum di-materialisasi satu-satu.

## 38. Human-Review-Required Items

1. ~~Guardrail file tidak tersedia~~ — **RESOLVED**: file disediakan dan di-cross-check penuh (§3.1, §5). Sisa tindak lanjut kecil: guardrail §Validation Plan sendiri memuat citation-hardening task untuk v1.1-nya — sinkronkan bila guardrail dirilis ulang.
2. **Perpres 111/2022** (pemutakhiran Perpres 59/2017 tentang pelaksanaan TPB): verifikasi nomor, status berlaku, dan lampiran indikator.
3. **Delta 2025 Comprehensive Review**: 2 penggantian + 6 revisi + 3 penambahan indikator (per laporan IAEG-SDGs) — pastikan `official_indicator_ids` di Annex D sinkron dengan versi pasca-review sebelum ditampilkan di produk.
4. **Sumber Tier 2 by-name tanpa URL terverifikasi** (WHO/FAO/ILO/UN Women/UNDRR sektor-spesifik): lengkapi URL + versi (≈0,5–1 hari kerja, konsisten estimasi v1.1 §S5).
5. **Perpres 3/2026 (ATS)** yang dirujuk baris SDG 4: verifikasi nomor regulasi.
6. **Daftar institusi partner Indonesia** (§25.5): validasi nomenklatur OPD terkini per daerah pilot.

## 39. Implementation Sequence for Antigravity (konseptual)

- **P0-A** Runtime extraction 15 asset groups (§34) + manifest & versioning. 
- **P0-B** Extraction layer: lexicon matcher + candidate builder sesuai kontrak §13 (tanpa LLM). 
- **P0-C** Scoring engines: sector (§14.1) → actor roles (§15) → archetype (§17) → OF/OPF validation (§18–19, invalid §8) → SDG (§22–23). Urutan ini penting: SDG bergantung OF/IND yang tervalidasi. 
- **P0-D** Blueprint assembly + explanation rendering (§24–25) + missing/conflict/confidence (§26–28) + Page 2 contract (§29). 
- **P0-E** Fixture runner: FIX-GOLD 12 + FIX-HN 115 (101–115 materialized; 001–100 generated) — gate rilis. 
- **P0-F** Golden Generation handoff: freeze approved Page 2 payload → retrieval metadata (§35). 
- **P1** Supporting-document extraction; dialek lexicon dari telemetry; subsector expansion; TPB target-level mapping; SDG-14 indicator family; kalibrasi bobot dari data riil.

## 40. Final Recommendations

1. Perlakukan `scoring_config` sebagai produk berversi yang dikalibrasi fixture — jangan pernah menyetel bobot langsung di kode.
2. Pertahankan disiplin "bertanya itu fitur": ask-rate sehat lebih baik daripada Primary yang percaya diri tapi salah; UX Page 2 harus membuat menjawab pertanyaan terasa 10 detik, bukan interogasi.
3. Jadwalkan verifikasi §38 item 1–3 SEBELUM P0-A (guardrail file & nomor regulasi memengaruhi isi registry).
4. Materialisasi FIX-HN-001..100 dari HN registry sebagai langkah pertama P0-E — murah dan menaikkan keyakinan regresi drastis.
5. Setelah 50–100 proposal riil: review ask-rate, anti-signal fire-rate, dan distribusi Primary SDG; kalibrasi ulang; baru pertimbangkan pelonggaran threshold.

## 41. Source Register

| ID | Sumber | Peran | Status |
|---|---|---|---|
| S-A1 | UN GA A/RES/71/313 + refinements; 2025 Comprehensive Review (UNSC-56, 4–7 Mar 2025) — unstats.un.org/sdgs | nomor & struktur Goal/Target/Indicator | VERIFIED_OFFICIAL (diverifikasi via web, Jul 2026) |
| S-A2 | UN SDG Indicators Metadata Repository — unstats.un.org/sdgs/metadata | teks & metadata resmi indikator (ditautkan, tidak disalin) | VERIFIED_OFFICIAL |
| S-A3 | Laporan IAEG-SDGs utk UNSC-56 (delta 2025 review: 2 replace, 6 revisi, 3 tambah; tier status Nov 2024: 231 unik) | sinkronisasi indikator | VERIFIED_OFFICIAL (ringkasan); delta per-indikator HUMAN_REVIEW_REQUIRED |
| S-A4 | Perpres 111/2022 (TPB, pemutakhiran 59/2017) | dasar hukum TPB | HUMAN_REVIEW_REQUIRED (verifikasi nomor/pasal) |
| S-A5 | Bappenas — Metadata Indikator TPB Edisi II (= S-06 register v1) | TPB alignment, terminologi ID | INDONESIA_SPECIFIC |
| S-A6 | BPS — publikasi Indikator TPB | data & definisi nasional | INDONESIA_SPECIFIC |
| S-01..S-12 | Register corpus v1 §25 (OECD DAC, INTPA, UNDP, USAID, dst.) | diwarisi utuh | per status v1 |
| S-C1 | impactory_sector_intervention_indicator_causal_corpus_v1.md | canonical semantic layer | CANONICAL_IMPACTORY |
| S-C2 | impactory_corpus_gap_closure_supplement_v1_1.md | IND-025..060, HN-31..100, GOLD-07..12, donor | CANONICAL_IMPACTORY |
| S-C3 | impactory_bilingual_lfa_linguistic_guardrail_v1.md (Draft v1.0, 22 Jul 2026; 1.207 baris) | lexical + level-classification layer; Universal Semantic Model; language packs ID/EN; 200 gold + 100 HN + 10 chains | CANONICAL_IMPACTORY — diverifikasi langsung |

---

**FINAL STATUS: DETERMINISTIC_ONTOLOGY_CORPUS_PARTIAL_WITH_IDENTIFIED_GAPS**

Seluruh 41 section terisi; seluruh registry minimum spec terpenuhi (22 concept families, 22 frasa informal, 25 ambiguous terms, 30 sektor, 35 aktor, 29 PF, 40 ARCH ber-signal (14 FULL-signal), 26 OF, 25(+1) OPF, 16 XC, 17 SDG, 20 SDG-anti, 24 MISS, 13 CONF, 30 contoh end-to-end, 15+100 HN fixtures, 12 gold fixtures, 6 annex schema). Gap yang tersisa: pendalaman entri FULL, materialisasi fixture by-reference, verifikasi item §38 — tidak ada yang menghalangi P0-A.
