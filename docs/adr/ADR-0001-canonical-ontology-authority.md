# ADR-0001 — Canonical Ontology Authority
## Revision 2 (RC-5I Hardening Patch)

**Status:** Accepted-Implemented (Rev 2)
**Supersedes:** ADR-0001 Rev 1 (RC-5G)
**Trigger:** RC-5H challenge review → MODIFY (arah disetujui, hardening diwajibkan)
**Mode:** ARCHITECTURE ONLY — no implementation code, no migration execution, no scoring/threshold/fixture changes.

**Revision log**
- Rev 1: keputusan dasar — YAML sebagai data authority, MD narrative companion, registry generated, migrasi M1–M5, CI V-01..V-13.
- Rev 2 (dokumen ini): + default-field generation contract (§D1), canonical ID normalization & alias resolution (§D2), CI ontology sync policy (§D3), runtime supplement layer (§D4), manifest versioning (§D5), revisi & penambahan validation rules (§D6). Seluruh isi Rev 1 yang tidak disebut di sini tetap berlaku tanpa perubahan.

---

## Context (delta dari Rev 1)

Rev 1 menetapkan YAML sebagai single source of truth dengan `registry.ts` sebagai artefak generated. Challenge review RC-5H menemukan lima area yang belum cukup keras: (1) perilaku field kosong tidak terdefinisi — generator bisa meng-emit `undefined` dan memindahkan defensive coding ke scoring engine; (2) registry.ts legacy memuat ID varian/suffix yang tidak identik dengan canonical ID — tanpa strategi normalisasi, cutover menciptakan dangling class baru; (3) tidak ada kontrak command/CI eksplisit — "generated" tanpa enforcement sync akan drift; (4) tidak ada jalur perubahan kecil yang sah — tanpa itu, tekanan operasional akan mendorong orang mengedit file generated atau menyelundupkan data lewat kode; (5) manifest belum punya versioning formal, sehingga "versi ontology yang mana" tidak bisa dijawab secara deterministik oleh build.

---

## Decision — Rev 2 Additions

### D1. Default-Field Generation Contract

Generator menjamin **runtime object tidak pernah mengekspos `undefined` collections atau strings**:

```text
Optional array field tidak terisi   → []
Optional string field tidak terisi  → ""
Optional enum/scalar tanpa default semantik yang aman
                                    → field tetap ada dengan nilai
                                      sentinel eksplisit per schema
                                      (bukan undefined; bukan dikarang)
```

Aturan pengaman yang WAJIB menyertai kontrak ini:

1. **Defaulting hanya berlaku untuk field OPTIONAL.** Required field yang kosong di YAML tetap gagal di V-01 — defaulting tidak boleh menjadi jalan menyamarkan data wajib yang hilang. Defaulting terjadi di generator (setelah validasi), bukan di validator.
2. **Semantik scoring: `[]` = "no signal", bukan error dan bukan match.** Layer yang membaca collection kosong berkontribusi 0 pada layer tersebut secara alami — tidak ada perubahan logika skor, hanya penghapusan kelas crash/branch `undefined` di runtime.
3. **Distingsi "kosong" vs "belum direview" tidak boleh hilang.** Entri hasil ekspansi compact yang field-nya belum terisi membawa `epistemic_label: HUMAN_REVIEW_REQUIRED` (Rev 1 §3); label ini ikut ter-generate sehingga `[]`-karena-memang-tidak-ada dan `[]`-karena-belum-ditranskripsi tetap bisa dibedakan dari data, bukan dari tebakan.
4. Kontrak ini ditegakkan V-14 (§D6), bukan dijanjikan oleh disiplin penulis generator.

### D2. Canonical ID Normalization & Alias Resolution

**Prinsip:** canonical ID (per namespace §9 canonical) adalah satu-satunya identitas internal. Legacy/suffix ID yang ada di registry.ts manual **tidak dipromosikan** menjadi ID — mereka diturunkan menjadi `aliases[]` pada entri canonical padanannya.

Proses normalisasi (M1/M2, arsitektur — bukan eksekusi):

```text
1. Inventaris semua ID yang muncul di registry.ts legacy
2. Klasifikasi per ID:
   a. identik dengan canonical            → no-op
   b. varian/suffix dari canonical        → tambah ke aliases[] entri
      (mis. bentuk pendek, suffix legacy)   canonical + provenance
                                            "legacy_registry_ts"
   c. tidak punya padanan canonical       → BUKAN otomatis entri baru;
                                            masuk matrix D1–D5 (RC-5E §4)
                                            — kandidat kuat rule D5 atau
                                            temuan transkripsi salah
3. Mapping table a/b/c didokumentasikan sebagai artefak M2, human-reviewed
```

**Alias-resolution strategy (runtime):**

```text
- Resolusi terjadi HANYA di ingestion boundary:
  extraction candidates, fixture loading, data tersimpan lama
- Mekanisme: satu lookup map alias→canonical, single-pass
- Dilarang: alias chains (alias→alias), resolusi rekursif,
  fuzzy/prefix matching pada ID
- Setelah boundary: storage, scoring, explanation, output, telemetry
  memakai canonical ID EKSKLUSIF — alias tidak pernah bocor keluar
- Collision (satu alias menunjuk ≥2 canonical, atau alias == id lain)
  = build fail (V-03/V-06), bukan tie-break runtime
- Alias tidak pernah dihapus (konsisten ID immutability);
  boleh diberi flag deprecated untuk telemetry
```

Konsekuensi penting: fixture yang merujuk legacy ID **tidak diedit** (constraint tetap) — mereka resolve via alias map di loading. Jika sebuah fixture ID tidak resolve, itu temuan (V-13 fail), bukan alasan mengedit fixture.

### D3. CI Ontology Sync Policy

Tiga command dengan kontrak eksplisit:

```text
ontology:generate
  Input : ontology/*.yaml + registry-supplements.ts (§D4)
  Output: generated/registry.generated.ts + stamp (§D5)
  Sifat : deterministik (input sama → output byte-identik, V-11);
          dijalankan developer secara lokal; hasilnya di-commit
  CI    : TIDAK menjalankan generate-lalu-commit. CI tidak pernah
          menulis ke repo.

ontology:validate
  Input : ontology/*.yaml + supplements + fixtures (referensi saja)
  Output: pass/fail terhadap V-01..V-19 kelompok data
          (V-01..V-09, V-12, V-15, V-16, V-17)
  Sifat : read-only, no network, no LLM

ontology:sync
  Input : ontology/*.yaml + supplements + generated file ter-commit
  Output: pass/fail — regenerate in-memory, bandingkan checksum
          terhadap file ter-commit (V-10) + stamp consistency (V-18)
  Makna : "yang di-commit adalah benar-benar hasil generate dari
          sumber yang di-commit"
```

**CI enforcement:** setiap PR yang menyentuh `ontology/`, `registry-supplements.ts`, `scripts/generate-registry/`, atau `generated/` wajib hijau pada `ontology:validate` + `ontology:sync`. PR yang mengubah generated file tanpa perubahan sumber yang menjelaskannya → sync fail by construction. Merge tanpa kedua gate = tidak mungkin (branch protection). Tidak ada jalur bypass; hotfix pun lewat jalur yang sama karena generate lokal + commit hanya butuh satu langkah.

### D4. Runtime Supplement Layer

**Masalah yang dipecahkan:** perlu jalur sah untuk koreksi kecil bervelositas tinggi (alias baru dari telemetry, istilah lexicon informal baru, normalisasi typo) tanpa menunggu siklus edit-YAML-canonical — dan tanpa membuka pintu shadow ontology.

**Struktur:**

```text
generated/registry.generated.ts   ← DO NOT EDIT, hasil ontology:generate
src/.../registry-supplements.ts   ← hand-maintained, scope sempit, reviewed
```

**Allowed (whitelist, tertutup):**
1. `aliases` tambahan pada entri canonical yang SUDAH ADA;
2. lexicon additions (positive/informal term tambahan) pada entri yang SUDAH ADA;
3. typo normalization (mapping bentuk-salah-tulis → term yang sudah ada).

**Forbidden (ditegakkan V-15, bukan konvensi):**
- entitas baru kelas apa pun: PF, OF, ACT, ARCH — dan diperluas eksplisit ke SECTOR, OPF, IND, XC, SDG, CNC, anti-signal, rule. "New PF/OF/ACT/ARCH" pada patch request dibaca sebagai contoh, bukan daftar lengkap; celah "bikin sector baru via supplement" harus tertutup juga;
- menghapus atau meng-override nilai canonical apa pun (supplement bersifat **additive-only union**; konflik nilai = build fail);
- menyentuh field scoring-structural: `confusable_*_ids`, `sdg_affinities`, relasi `*_ids` antar-registry, `result_level`, `allowed_roles` — karena mengubah ini setara mengubah perilaku klasifikasi lewat pintu samping.

**Guardrail tambahan (dari review, bukan dari patch request — dua-duanya penting):**

1. **Lexicon additions mengubah perilaku matching.** Legal, tapi behavior-affecting → setiap PR supplement yang menambah lexicon wajib menjalankan fixture suite penuh (GOLD+HN) sebagai gate, dengan no-regression guard yang sama seperti M4. Alias dan typo-normalization murni identitas → cukup validate+sync.
2. **Drain policy — supplement adalah staging, bukan tempat tinggal.** Setiap entri supplement wajib punya `added_at` + `reason`. Ambang: supplement berisi > N entri (usulan awal N=25, kalibrasi dari telemetry) atau entri berumur > 2 siklus rilis → CI warning (V-19) yang menuntut upstreaming ke `ontology/*.yaml`. Tanpa drain policy, supplement layer perlahan menjadi ontology kedua dan single-source-of-truth mati diam-diam.
3. Merge order deterministik: generated dulu, supplement di-apply additive saat build oleh `ontology:generate` — sehingga output akhir tetap satu artefak ter-stamp, dan V-11 determinism mencakup keduanya.

### D5. Manifest Versioning

`ontology/manifest.yaml` diperluas:

```yaml
ontology_version:   # semver; MAJOR = perubahan schema/breaking,
                    # MINOR = entri baru, PATCH = koreksi field/alias.
                    # Wajib naik saat ontology_hash berubah (V-17).
ontology_hash:      # content hash kanonik atas seluruh ontology/*.yaml
                    # + registry-supplements.ts, urutan file deterministik
generator_version:  # versi scripts/generate-registry
generated_at:       # timestamp ISO — HANYA di manifest/build metadata,
                    # TIDAK di-embed ke registry.generated.ts
counts:             # per-registry entry counts (Rev 1, tetap — V-07)
checksums:          # per-file + generated artifact (Rev 1, tetap — V-10)
```

Keputusan determinisme: `registry.generated.ts` meng-embed stamp `{ontology_version, ontology_hash, generator_version}` tapi **bukan** `generated_at` — kalau timestamp ikut di-embed, V-11 (byte-determinism) mati dan `ontology:sync` tidak bisa membandingkan checksum. Timestamp hidup di manifest saja. Runtime bisa melaporkan "ontology vX @ hash Y" untuk telemetry dan audit trail (selaras prinsip Explainable AI / Audit Trail Intelligence Engine) tanpa mengorbankan reproducibility.

Trigger bump: perubahan apa pun pada `ontology/*.yaml` atau supplements → hash berubah → version wajib naik → V-17 menegakkan. `generator_version` naik terpisah saat logika generator berubah; kombinasi (ontology_hash × generator_version) mengidentifikasi build artefak secara unik.

### D6. Validation Rules — Review V-01..V-13 + Penambahan

**Hasil review existing (tiga revisi, sisanya tetap):**

- **V-06 (alias hygiene) — DIPERLUAS:** ruang pemeriksaan kini merged view (canonical + supplements): no empty-string, no self-reference, no chains, no collision lintas seluruh id+alias space termasuk yang datang dari supplement dan dari normalisasi legacy (§D2).
- **V-10 (checksum) — DIPERLUAS:** mencakup `registry.generated.ts` terhadap (ontology/*.yaml + supplements) via regenerate-and-compare — ini mesin dari `ontology:sync`.
- **V-11 (determinism) — DIPRESISIKAN:** byte-identik dengan `generated_at` dikecualikan by design (tidak di-embed, §D5); tidak ada field pengecualian lain.

**Rules baru:**

```text
V-14 Default-field conformance
     Generated output tidak memuat undefined pada collection/string
     field mana pun; optional kosong = [] / "" / sentinel per schema.
     Audit otomatis atas artefak generated, bukan janji generator.

V-15 Supplement scope enforcement
     registry-supplements.ts hanya memuat kelas allowed (§D4);
     setiap supplement mereferensikan canonical ID yang ada;
     tidak ada ID entitas baru dari namespace mana pun;
     additive-only — konflik nilai dengan canonical = fail;
     field scoring-structural tidak tersentuh;
     setiap entri punya added_at + reason.

V-16 Alias-resolution soundness (merged view)
     Peta alias→canonical acyclic, single-hop, total-resolvable;
     tidak ada alias yang unresolved pasca-merge;
     legacy-ID mapping table (§D2) konsisten dengan aliases[] aktual.

V-17 Manifest version-hash consistency
     ontology_hash == hash terhitung ulang; hash berubah tanpa
     ontology_version naik = fail; counts & checksums konsisten
     dengan isi aktual (memperkuat V-07/V-10).

V-18 Generated stamp consistency
     Stamp {ontology_version, ontology_hash, generator_version} yang
     ter-embed di registry.generated.ts == manifest. Mismatch = ada
     artefak basi ter-commit = fail.

V-19 Supplement drain warning        [WARNING, bukan fail]
     Supplement > N entri ATAU entri berumur > 2 siklus rilis
     → warning wajib-triase: upstream ke YAML atau justifikasi
     tertulis. Warning berulang tanpa triase dieskalasi manual —
     bukan otomatis fail, supaya hotfix tidak terblokir.
```

Pemetaan command→rules: `ontology:validate` = V-01..V-09, V-12, V-15, V-16, V-17, V-19; `ontology:sync` = V-10, V-11, V-14, V-18; V-13 (fixture reference check) berjalan di kedua-duanya karena bergantung pada merged view final.

---

## Consequences (delta Rev 2)

Positif: scoring engine bebas dari defensive `undefined` handling tanpa mengubah logika skor; legacy ID mati sebagai identitas tapi tetap hidup sebagai alias (zero breakage pada fixture & data lama, zero edit fixture); drift generated-vs-source jadi mustahil merge, bukan sekadar tidak sopan; ada jalur perubahan kecil yang legal sehingga tekanan untuk mengedit file generated hilang; setiap artefak runtime bisa menjawab "ontology versi apa, hash apa, generator apa" — audit-trail-ready.

Biaya/risiko yang diterima sadar: supplement layer adalah pintu — dijaga tiga lapis (whitelist V-15, fixture-gate untuk lexicon, drain V-19), tapi tetap butuh disiplin review manusia; kontrak default menambah sedikit kompleksitas generator (satu tempat, teruji V-14) sebagai ganti menghapus kompleksitas tersebar di seluruh scoring engine; versioning menambah satu kewajiban kecil per perubahan (bump version) yang ditegakkan mesin, bukan ingatan.

Tidak berubah dari Rev 1: seluruh keputusan authority (YAML canonical, MD narrative), struktur repo, schema §3, migration plan M1–M5, gate M4 no-regression, pemisahan gate RC-5G vs konvergensi RC-5F, dan ketiga constraint keras: **zero scoring changes, zero fixture changes, zero threshold changes** — Rev 2 tidak memuat satu pun mekanisme yang menyentuh bobot, gate logic, margin, threshold, atau isi fixture.

---

## Acceptance Delta (menambah checklist Rev 1 §7)

```text
[ ] A-11 V-14..V-19 hijau di CI; V-06/V-10/V-11 versi diperluas aktif
[ ] A-12 Legacy-ID mapping table (§D2) lengkap, human-reviewed,
         semua kelas (a)/(b)/(c) ter-triase; kelas (c) selesai
         via matrix D1–D5
[ ] A-13 ontology:generate/validate/sync terdefinisi & enforced
         di branch protection; dibuktikan dengan satu PR uji yang
         sengaja drift dan tertolak
[ ] A-14 registry-supplements.ts ada, kosong atau minimal saat cutover,
         dengan drain policy terdokumentasi
[ ] A-15 Manifest memuat keempat field versioning; stamp embedded
         terverifikasi match (V-18)
```

**Status akhir dokumen:** ADR-0001 Rev 2 — Proposed, menunggu sign-off untuk eksekusi M1. Tidak ada migrasi yang dijalankan oleh dokumen ini.
