# RC-5J — Ontology Migration Execution Runbook (M1–M5)

**Artifact:** `impactory_rc5j_migration_runbook_v1.md`
**Basis:** ADR-0001 Rev 2 (Accepted). Arsitektur dan source-of-truth decision FINAL — runbook ini murni eksekusi.
**Constraints keras (berlaku di semua fase):** no scoring changes · no threshold changes · no fixture edits · no manual edit pada file generated.
**Eksekutor:** Antigravity. **Reviewer/sign-off:** Maulana.

---

## 0. Preconditions & Global Rules

### 0.1 Preconditions (cek sebelum M1 mulai — semua harus YA)

```text
P-1  ADR-0001 Rev 2 ter-commit di docs/adr/ dengan status Accepted
P-2  Canonical files tersedia di repo:
     docs/impactory_deterministic_program_context_sdg_mapping_v1_1.md
     docs/impactory_bilingual_lfa_linguistic_guardrail_v1.md
     corpus v1 + v1.1 (sumber indicator registry & gold chains)
P-3  registry.ts legacy ter-tag: git tag ontology-legacy-baseline
P-4  Baseline fixture report tersimpan: hasil run GOLD 12 + HN saat ini
     (3 pass / 9 fail) BESERTA per-fixture per-layer score breakdown
     → file: reports/fixture-baseline-pre-migration.md
     Tanpa breakdown ini, no-regression guard M4 tidak bisa dibuktikan.
P-5  Daftar 23 dangling references dari audit runtime tersedia sebagai file
     → reports/dangling-audit-input.md
P-6  Branch protection aktif di main (PR + CI required)
```

### 0.2 Global rules untuk Antigravity

```text
G-1  Audit before fixing — setiap fase mulai dengan verifikasi state,
     bukan langsung menulis.
G-2  Satu fase = satu PR (atau lebih), TIDAK pernah lintas-fase dalam
     satu PR. M4 tidak boleh dicampur dengan M3.
G-3  Chrome MCP verification wajib sebelum setiap commit yang menyentuh
     runtime (M4): navigate localhost:8080 → screenshot → console zero
     errors. M1–M3 (data & script) cukup validation commands.
G-4  Field yang tidak bisa ditranskripsi dengan yakin → biarkan kosong
     + epistemic_label: HUMAN_REVIEW_REQUIRED. DILARANG mengarang isi.
G-5  Temuan tak terduga (konflik data canonical, ID misterius, angka
     tidak cocok) → STOP fase, tulis ke reports/migration-findings.md,
     eskalasi ke Maulana. Jangan auto-resolve.
G-6  Model policy: ini multi-file structured work — gunakan model tier
     tinggi (bukan Flash Medium) sesuai standing rule.
```

### 0.3 Command vocabulary (kontrak, nama final boleh disesuaikan npm scripts)

```text
ontology:generate   YAML + supplements → generated/registry.generated.ts
ontology:validate   V-01..V-09, V-12, V-13, V-15, V-16, V-17, V-19
ontology:sync       V-10, V-11, V-13, V-14, V-18 (regenerate-and-compare)
fixtures:run        GOLD 12 + HN suite, output per-fixture per-layer
                    breakdown ke reports/
```

Urutan build dependency: validate → generate → sync → fixtures:run.

---

## M1 — MD → YAML Extraction

**Goal:** 100% entri canonical tertranskripsi ke `ontology/*.yaml` sesuai schema ADR §3, tanpa satu pun field dikarang.

### Deliverables

```text
D-M1-1  ontology/manifest.yaml (versi awal 0.1.0, counts, checksums)
D-M1-2  ontology/sectors.yaml            (target: 30 entri)
D-M1-3  ontology/problem-families.yaml   (29)
D-M1-4  ontology/outcome-families.yaml   (26)
D-M1-5  ontology/output-families.yaml    (25+ — angka pasti dari canonical)
D-M1-6  ontology/actors.yaml             (35)
D-M1-7  ontology/archetypes.yaml         (40; 14 FULL sebagai template bentuk)
D-M1-8  ontology/indicators.yaml         (subset GOLD: indicator families
                                          milik 9 GOLD sectors; sisanya P1)
D-M1-9  ontology/sdg.yaml, anti-signals.yaml, cross-cutting.yaml
D-M1-10 ontology/concepts/lexicon.yaml + informal-phrases.yaml +
        ambiguous-terms.yaml  ← TIDAK BOLEH DITUNDA melewati M4
D-M1-11 ontology/rules/ (missing-information, conflict-rules,
        explanation-templates)
D-M1-12 scripts/migrate-md-to-yaml/ (disposable; FULL-entry parsing
        otomatis, compact-entry semi-manual)
D-M1-13 reports/m1-transcription-log.md — per registry: berapa entri
        dari FULL parse, berapa dari compact expansion, daftar entri
        HUMAN_REVIEW_REQUIRED
D-M1-14 Legacy-ID inventory awal (input §D2 ADR): semua ID di
        registry.ts legacy, belum diklasifikasi
```

### Files affected

Baru: seluruh `ontology/`, `scripts/migrate-md-to-yaml/`, `reports/m1-*`. **Tidak disentuh:** registry.ts legacy, scoring engine, fixtures, docs/*.md (belum di-pin — itu M5).

### Validation commands

```text
ontology:validate  → boleh PARTIAL PASS di M1: V-01/V-02/V-03/V-08/V-09
                     wajib hijau; V-04 (referential) boleh merah SELAMA
                     setiap merah tercatat di transcription log
                     (referensi ke entri yang belum ditranskripsi batch
                     berikutnya). Akhir M1: V-04 wajib hijau.
Manual check       → counts manifest vs tabel baseline (30/29/26/…)
```

### Rollback

Trivial: hapus branch. Tidak ada konsumen YAML.

### Acceptance criteria

```text
AC-M1-1  Counts per registry == baseline canonical (V-07 hijau)
AC-M1-2  V-01..V-04, V-08, V-09 hijau penuh di akhir fase
AC-M1-3  Transcription log lengkap; setiap entri compact-expansion
         ter-flag untuk review M2
AC-M1-4  Zero field berisi teks yang tidak ada di dokumen sumber
         (spot-check M2 memverifikasi)
AC-M1-5  Provenance (source_document + source_section) terisi 100%
```

### Expected risks

**R-M1-1 (TERTINGGI seluruh migrasi):** silent mistranscription pada compact entries — konvensi inline (`"OF-003,011"`, `"SDG_2 (2.3/2.4)"`, `"per sektor chain"`) ambigu. Mitigasi: semi-manual + log + review M2; entri ragu → kosong + label, bukan tebakan. **R-M1-2:** parser FULL-entry salah baca fenced YAML multi-baris → mitigasi: counts check per registry segera setelah parse. **R-M1-3:** scope creep "sekalian rapikan data" → dilarang; M1 = transkripsi verbatim, perbaikan konten = temuan G-5.

---

## M2 — Validation & Human Review

**Goal:** YAML terbukti benar (bukan cuma valid bentuk); 23 dangling terklasifikasi final; legacy-ID mapping selesai.

### Deliverables

```text
D-M2-1  reports/m2-review-log.md — hasil human review:
        · 100% entri Minimum GOLD set (RC-5E §3) direview baris-per-baris
        · 100% entri compact-expansion direview
        · entri FULL-parse: sampling ≥20% per registry
D-M2-2  reports/dangling-resolution-matrix.md — 23 baris, format RC-5E §4.3,
        setiap ID diklasifikasi D1–D5 dengan justifikasi;
        resolusi Delete hanya jika lolos D5
D-M2-3  reports/legacy-id-mapping.md — klasifikasi (a) identik /
        (b) varian→aliases[] / (c) tanpa padanan→matrix;
        aliases[] di YAML ter-update untuk kelas (b)
D-M2-4  ontology/*.yaml revisi hasil review (perbaikan transkripsi ONLY)
D-M2-5  Backlog file: seluruh entri HUMAN_REVIEW_REQUIRED dengan owner
        (boleh belum selesai — wajib terinventaris, A-08)
```

### Files affected

`ontology/*.yaml` (koreksi), `reports/m2-*`. **Tidak disentuh:** runtime, fixtures, scoring.

### Validation commands

```text
ontology:validate  → V-01..V-09 + V-12 + V-16 + V-17 hijau PENUH
Cross-check        → matrix dangling: expected mayoritas resolve via D2
                     (entri kini ada). Pola berbeda dari prediksi
                     = trigger G-5 (kategori dangling ketiga).
```

### Rollback

Koreksi di branch; masih zero konsumen runtime.

### Acceptance criteria

```text
AC-M2-1  Seluruh V kelompok data hijau, TERMASUK V-04 zero dangling
AC-M2-2  Matrix 23/23 terklasifikasi + signed-off Maulana
AC-M2-3  Legacy-ID mapping 100% ter-triase; kelas (c) selesai via matrix
AC-M2-4  Review log menunjukkan cakupan sesuai D-M2-1
AC-M2-5  Sign-off eksplisit Maulana untuk melanjutkan ke M3
         (gate manusia — satu-satunya momen review data massal)
```

### Expected risks

**R-M2-1:** review fatigue → data salah lolos dan terkunci sebagai canonical. Mitigasi: prioritas review berjenjang (GOLD set dulu, compact kedua, FULL sampling); jangan kompres fase ini. **R-M2-2:** tergoda "memperbaiki" konten canonical saat review (mis. OF yang definisinya terasa kurang) → itu perubahan ontology, bukan transkripsi; catat sebagai temuan, jangan ubah. **R-M2-3:** matrix dangling menemukan ID yang dipakai scoring engine legacy tapi tidak ada di canonical → jangan buat entri baru; eskalasi G-5.

---

## M3 — Registry Generation

**Goal:** `generated/registry.generated.ts` diproduksi deterministik dan terbukti setara-semantik dengan registry.ts legacy untuk entri yang overlap.

### Deliverables

```text
D-M3-1  scripts/generate-registry/ (permanen; deterministik; no network;
        implement default-field contract ADR §D1 + stamp embed §D5)
D-M3-2  scripts/validate-ontology/ (V-rules engine untuk CI)
D-M3-3  registry-supplements.ts — dibuat KOSONG (struktur + guard V-15;
        isi = 0 entri saat cutover, sesuai A-14)
D-M3-4  generated/registry.generated.ts (artefak pertama, ter-commit,
        header DO NOT EDIT, stamp {version, hash, generator_version})
D-M3-5  reports/m3-semantic-diff.md — diff struktural registry.generated.ts
        vs registry.ts legacy:
        · entri overlap → WAJIB identik semantik
        · entri baru → listed, expected (inilah coverage gain)
        · delta lain → temuan (bug generator ATAU salah transkripsi lama)
          → G-5, bukan auto-resolve
D-M3-6  CI pipeline update: ontology:validate + ontology:sync sebagai
        required checks; branch protection rule terpasang
```

### Files affected

Baru: `scripts/generate-registry/`, `scripts/validate-ontology/`, `generated/`, `registry-supplements.ts`, CI config (GitHub Actions workflow). **Tidak disentuh:** registry.ts legacy (masih dipakai runtime), scoring engine, fixtures.

### Validation commands

```text
ontology:generate      → sukses, output ter-stamp
ontology:sync          → V-10, V-11, V-14, V-18 hijau
                         (V-11: generate dua kali → byte-identik)
ontology:validate      → hijau penuh termasuk V-13 (fixture refs resolve
                         terhadap merged view — alias map legacy aktif)
Semantic diff manual   → D-M3-5 review + sign-off
CI dry-run             → satu PR uji sengaja drift generated file
                         → CI MENOLAK (bukti untuk A-13)
```

### Rollback

Buang generated artifacts + CI rules di branch; runtime tidak pernah tersentuh.

### Acceptance criteria

```text
AC-M3-1  V-10/V-11/V-14/V-18 hijau; determinism terbukti dua-run
AC-M3-2  Semantic diff: zero delta tak terjelaskan pada entri overlap
AC-M3-3  V-13 hijau — SEMUA fixture ID resolve tanpa satu pun fixture diedit
AC-M3-4  PR-uji-drift tertolak CI (A-13 terbukti)
AC-M3-5  registry-supplements.ts kosong dan ter-guard V-15
```

### Expected risks

**R-M3-1:** shape output generator menyimpang dari yang dikonsumsi scoring engine → di M4 terlihat seperti bug scoring. Mitigasi: semantic diff D-M3-5 adalah gate keras, dan overlap-identik adalah buktinya. **R-M3-2:** V-13 merah karena fixture memakai legacy ID yang mapping-nya terlewat di M2 → kembali ke legacy-id-mapping, tambah alias; JANGAN edit fixture. **R-M3-3:** default-field contract diterapkan ke required field (menyamarkan data wajib hilang) → V-01 harus jalan SEBELUM defaulting di pipeline generator; urutan ini diverifikasi review kode script oleh Maulana.

---

## M4 — Runtime Cutover

**Goal:** runtime membaca `registry.generated.ts` (+ supplements kosong); fixture suite membuktikan zero-regression.

### Deliverables

```text
D-M4-1  Build switch: import path runtime → generated/registry.generated.ts
        (satu titik ganti; revert = satu commit)
D-M4-2  reports/fixture-post-cutover.md — hasil fixtures:run penuh
        dengan per-fixture per-layer breakdown
D-M4-3  reports/m4-comparison.md — side-by-side vs baseline P-4:
        · 3 GOLD pass → status & breakdown per layer
        · 9 GOLD fail → skor per layer (naik di layer mana, kenapa)
        · HN suite → daftar anti-signal firing, delta vs baseline
D-M4-4  Chrome MCP evidence: screenshot localhost:8080 + console log
        zero errors, ter-attach di PR (G-3)
```

### Files affected

Import path runtime (1 file), `reports/m4-*`. **Tidak disentuh:** scoring engine internals, thresholds, fixtures, registry.ts legacy (masih di repo — dihapus di M5).

### Validation commands

```text
ontology:validate + ontology:sync  → hijau (prasyarat merge)
fixtures:run                       → gate di bawah
Chrome MCP                         → navigate → screenshot → console
Vercel preview deploy              → smoke test flow GrantWriter Page 1→2
                                     (fitur pengguna tidak berubah perilaku
                                     di jalur yang sudah pass)
```

### GATE M4 (wajib pass sebelum merge ke main)

```text
GATE-1  3 GOLD baseline-pass → TETAP PASS, dan breakdown per layer
        ter-explain (skor berubah HANYA pada layer yang datanya
        bertambah; pass-berubah-alasan = fail gate)
GATE-2  HN suite: ZERO anti-signal false positive baru
GATE-3  V-04 zero dangling di CI
GATE-4  Tidak ada fixture yang pass lewat sector/SDG primary yang
        berbeda dari expected_* (misklasifikasi-kebetulan-pass)
GATE-5  Console zero errors (Chrome MCP) + build hijau
```

**Eksplisit:** GOLD boleh masih < 12 di sini. Kekurangan pass yang tersisa adalah workstream konvergensi RC-5F (IMPL-1 indicator matcher dst.), BUKAN kegagalan migrasi — jangan "memperbaiki" dengan menyentuh scoring/threshold.

### Rollback

```text
1. Revert satu commit switch (import path kembali ke registry.ts legacy)
2. Verifikasi fixtures:run == baseline P-4 persis
3. Tulis root cause ke reports/migration-findings.md sebelum retry
Rollback runbook ini DIUJI SEKALI bolak-balik sebelum merge (A-10).
```

### Acceptance criteria

```text
AC-M4-1  GATE-1..GATE-5 hijau, evidence ter-attach di PR
AC-M4-2  m4-comparison menunjukkan improvement HANYA dari ketersediaan
         data (layer yang tadinya 0 karena entry missing kini terisi)
AC-M4-3  Rollback teruji bolak-balik (A-10)
AC-M4-4  Vercel production deploy stabil ≥ 1 siklus kerja normal
         sebelum M5 dimulai
```

### Expected risks

**R-M4-1:** salah satu dari 3 GOLD regress → indikator kegagalan migrasi paling keras; STOP, rollback, root cause (kemungkinan: transkripsi entri yang dipakai fixture itu, atau shape mismatch lolos M3). **R-M4-2:** HN false positive baru → anti-signals.yaml salah transkripsi; rollback, perbaiki di ontology/, ulangi M3→M4. **R-M4-3:** GOLD naik pass lewat jalur salah (GATE-4) → data baru membuat kompetitor salah menang; ini temuan data, triase via canonical — bukan via threshold. **R-M4-4:** edge functions tidak terverifikasi oleh localhost (standing knowledge) → jika ada edge function yang membaca registry, verifikasi via production URL pasca-deploy + `gh run list` untuk status auto-deploy.

---

## M5 — Legacy Removal & Sealing

**Goal:** satu sumber kebenaran tersegel; jalur regresi ke dunia lama ditutup.

### Deliverables

```text
D-M5-1  Hapus registry.ts legacy (git history + tag P-3 tetap ada)
D-M5-2  scripts/migrate-md-to-yaml/ → dipindah ke archive/ dengan README
        "single-use, executed <tanggal>, do not maintain"
D-M5-3  docs/…v1_1.md diberi header:
        "NARRATIVE COMPANION — data authority: /ontology/*.yaml
         (sejak ontology_version X.Y.Z)" + pinned
D-M5-4  ADR-0001 Rev 2 status → Accepted-Implemented, dengan tautan
        ke seluruh reports/m1..m4
D-M5-5  reports/migration-closure.md — checklist A-01..A-15 final,
        semua tercentang dengan evidence link
D-M5-6  Handoff note untuk RC-5F konvergensi: state coverage baru,
        sisa GOLD fail + layer breakdown-nya, backlog
        HUMAN_REVIEW_REQUIRED — input langsung untuk IMPL-1
```

### Files affected

Hapus: registry.ts legacy. Pindah: migration script → archive/. Edit: header docs, ADR status, reports. **Tidak disentuh:** ontology/, generated/, scoring, fixtures.

### Validation commands

```text
ontology:validate + ontology:sync  → hijau pasca-penghapusan
fixtures:run                       → identik dengan hasil M4 (penghapusan
                                     legacy TIDAK mengubah apa pun —
                                     kalau berubah, ada konsumen legacy
                                     tersembunyi → G-5)
grep-check                         → zero import/referensi ke path
                                     registry.ts legacy di seluruh src/
```

### Rollback

Git history (tag P-3). Jika M5 memicu perubahan perilaku apa pun, itu bukti konsumen tersembunyi — restore file, temukan konsumen, migrasi konsumen itu dulu, ulangi M5.

### Acceptance criteria

```text
AC-M5-1  fixtures:run pasca-hapus == hasil M4, byte-per-byte pada report
AC-M5-2  Zero referensi legacy di src/ (grep bersih)
AC-M5-3  Checklist A-01..A-15 lengkap dengan evidence
AC-M5-4  Handoff note RC-5F terbit — migrasi resmi selesai,
         konvergensi resmi mulai
```

### Expected risks

**R-M5-1:** konsumen tersembunyi registry.ts (import tak terduga, edge function, script CI lama) → grep-check + fixtures identik adalah detektornya. **R-M5-2:** premature sealing — M5 dieksekusi sebelum M4 stabil satu siklus → ditahan oleh AC-M4-4 sebagai prasyarat masuk M5.

---

## Sequencing & Effort

```text
M1  transkripsi + tooling disposable      ~1–1.5 hari Antigravity
M2  human review + matrix + mapping       ~0.5–1 hari (mayoritas Maulana)
M3  generator + CI + semantic diff        ~0.5–1 hari
M4  cutover + gates + evidence            ~0.5 hari + 1 siklus stabilisasi
M5  sealing                               ~0.25 hari
```

Dependensi keras: M2 sign-off (AC-M2-5) sebelum M3; AC-M4-4 sebelum M5. M1 D-M1-10 (lexicon) boleh paralel tapi wajib selesai sebelum GATE M4 dijalankan.

**Stop conditions global:** GATE-1/GATE-2 merah → rollback wajib, bukan debug-sambil-jalan di main. Temuan G-5 apa pun → fase berhenti sampai triase. Dan tiga larangan tetap tidak punya pengecualian di fase mana pun: scoring, threshold, fixture.
