# Impactory Intelligence Engine — Gap Closure Supplement v1.1

**Companion to:** `impactory_sector_intervention_indicator_causal_corpus_v1.md` (corpus v1) dan `impactory_bilingual_lfa_linguistic_guardrail_v1.md`.
**Mode:** RESEARCH + AUTHORING ONLY. Tidak ada kode, migration, production prompt, atau perubahan repo.
**Fungsi dokumen:** menutup gap yang terdaftar di corpus v1 §29 tanpa mengubah isi v1 (v1 tetap immutable sebagai baseline; supplement ini additive dan dapat di-ingest sebagai chunk terpisah pada retrieval layer).

| Gap v1 (§29) | Status v1 | Status setelah v1.1 |
|---|---|---|
| Donor profile crosswalk PARTIAL (FCDO, humanitarian, foundations, filantropi Islam belum ada) | PARTIAL | **CLOSED** (§S1) |
| Indicator registry 24/±60 entri | PARTIAL | **60 entri** (§S2: IND-025..IND-060) |
| Hard-negative 30/100 | PARTIAL | **100 entri** (§S3: HN-31..HN-100) |
| Gold chains 6/12 | PARTIAL | **12 chains** (§S4: GOLD-07..GOLD-12) |
| `HUMAN REVIEW REQUIRED` items | OPEN | tetap OPEN — didaftar ulang §S5 (butuh verifikasi manusia, bukan authoring) |

Seluruh konvensi v1 berlaku: label epistemic (`CANONICAL` … `HUMAN REVIEW REQUIRED`), source register S-01..S-12, PIC (Preferred Impactory Convention), sector/archetype ID stabil.

---

## S1. Donor Profile Crosswalk — Completion

> Prinsip tetap: donor profile hanya memengaruhi **terminology, presentation, required fields, export format, rubric emphasis, reporting cadence** — tidak pernah mengubah canonical internal meaning (spine kausal §5 v1). Seluruh section `DONOR-SPECIFIC`; template tahun berjalan `HUMAN REVIEW REQUIRED` sebelum export production.

### S1.1 Profil yang belum tercakup di v1 §21

#### FCDO (UK Foreign, Commonwealth & Development Office)

- **Istilah level:** Impact / Outcome / Output — logframe FCDO klasik (warisan DFID) dengan **output weighting** (%) dan **milestone per tahun** per indikator. Output di-skor pada annual review (A++ s.d. C).
- **Kekhasan struktural:** (1) logframe adalah alat manajemen aktif — direview dan boleh direvisi tiap annual review, bukan dokumen beku; (2) setiap output diberi **impact weighting** yang totalnya 100% — konsep yang tidak ada di INTPA/USAID; (3) milestone tahunan wajib per indikator, bukan hanya endline target; (4) VfM (Value for Money: economy–efficiency–effectiveness–equity, "4E") adalah lensa penilaian eksplisit.
- **Implikasi Impactory:** field tambahan `output_weighting_pct` dan `annual_milestones[]` pada export profile FCDO; rubric menekankan VfM narrative. Jangan memaksa weighting pada donor lain.
- **Red flag reviewer FCDO:** output tanpa milestone tahunan; indikator outcome tanpa baseline; theory of change terpisah tidak konsisten dengan logframe.
- Sumber: DFID/FCDO logframe guidance ("How to" note) `HUMAN REVIEW REQUIRED versi terkini pasca-merger 2020`; S-01 untuk definisi level.

#### Donor kemanusiaan (ECHO, UN OCHA pooled funds, UNHCR/WFP/UNICEF humanitarian windows)

- **Istilah level:** ECHO Single Form: Principal Objective / Specific Objective / Results / Activities. OCHA CBPF: cluster-aligned log frame dengan indikator standar cluster.
- **Kekhasan struktural:** (1) indikator sering **wajib dipilih dari indikator standar cluster** (mis. WASH cluster, Nutrition cluster) — custom indicator harus dijustifikasi; (2) horizon pendek (6–18 bulan) → outcome kemanusiaan ≠ outcome pembangunan; outcome yang sah bisa berupa "kebutuhan dasar terpenuhi sesuai standar Sphere", bukan perubahan perilaku jangka panjang; (3) akuntabilitas kepada penerima manfaat (AAP) dan CHS menjadi cross-cutting wajib; (4) marker: gender-age marker (ECHO), GAM (IASC).
- **Implikasi Impactory:** mode humanitarian mengubah **ekspektasi horizon** pada rule C-3 v1 (evidence escalation) — bukan menurunkan standar bukti, tetapi menyesuaikan definisi outcome yang wajar untuk 6–18 bulan. `CONTEXT-DEPENDENT`.
- **Red flag:** outcome perubahan perilaku jangka panjang pada proyek relief 9 bulan (ANTI-pattern horizon); indikator custom tanpa justifikasi saat indikator cluster tersedia.
- Sumber: Sphere/CHS (S-10); ECHO Single Form guidance `HUMAN REVIEW REQUIRED URL & versi`.

#### Yayasan filantropi internasional (Ford, Gates, Tanoto, dsb.)

- **Istilah level:** sangat bervariasi; umumnya theory-of-change naratif + 3–7 indikator kunci; jarang logframe 4-level formal.
- **Kekhasan:** (1) Gates: fokus measurable outcome + data granular, sering meminta akses data mentah; (2) Ford: rights-based, perubahan struktural/kekuasaan — outcome kualitatif (narrative change, movement building) diterima dengan evidence kualitatif sistematis (outcome harvesting); (3) Tanoto (Indonesia): pendidikan & SDM, selaras indikator pemerintah (Rapor Pendidikan, stunting) `INDONESIA-SPECIFIC`.
- **Implikasi Impactory:** profil "foundation" men-default-kan **narrative-first export** (ToC diagram + indikator kunci) dengan logframe lengkap sebagai lampiran — kebalikan dari profil INTPA. Progressive disclosure "Never A or B": data internal tetap full spine.
- **Red flag:** memaksakan matriks 4-level kaku pada donor yang meminta ToC naratif; outcome kualitatif tanpa metode dokumentasi (outcome harvesting/most significant change harus disebut sebagai metode, bukan sekadar testimoni).
- Sumber: `HEURISTIC ONLY` (praktik umum); dokumen panduan per yayasan `HUMAN REVIEW REQUIRED`.

#### Filantropi Islam & domestik (BAZNAS, LAZ nasional, filantropi korporasi syariah)

- **Istilah level:** program/kegiatan + capaian; kerangka **maqashid syariah** dan asnaf (8 golongan mustahik) sebagai lensa targeting; BAZNAS memiliki indeks resmi: **Indeks Zakat Nasional (IZN)** dan **Indeks Desa Zakat (IDZ)** `INDONESIA-SPECIFIC, HUMAN REVIEW REQUIRED versi metodologi terkini`.
- **Kekhasan:** (1) eligibility penerima = kriteria asnaf (fakir, miskin, dst.) — field targeting berbeda dari poverty line BPS; dokumentasikan basis penetapan mustahik; (2) transformasi **mustahik → muzakki** adalah outcome khas (penerima zakat menjadi pembayar zakat) — ini outcome ekonomi yang valid dan terukur; (3) pelaporan menekankan penyaluran (output) — risiko vanity metric tinggi; dorong indikator pemberdayaan (IND-MSME-REV-001 v1 tetap berlaku); (4) audit syariah + akuntabilitas publik dana umat.
- **Implikasi Impactory:** field `asnaf_category[]` pada beneficiary registry saat profil ini aktif; outcome library menambah "mustahik naik kelas / graduasi mustahik" sebagai outcome family `SECTOR-SPECIFIC`.
- **Red flag:** "dana tersalurkan 100%" diklaim sebagai outcome (= ANTI-08 v1 varian); jumlah penerima dihitung ganda antar-program LAZ.
- Sumber: BAZNAS IZN/IDZ `HUMAN REVIEW REQUIRED URL`; S-11.

### S1.2 Matriks ringkas gabungan (delta terhadap v1 §21)

| Aspek | FCDO | Humanitarian (ECHO/CBPF) | Foundations | BAZNAS/LAZ |
|---|---|---|---|---|
| Level terms | Impact/Outcome/Output + weighting | PO/SO/Results/Activities; cluster logframe | ToC naratif + KPI | program/kegiatan + asnaf lens |
| Logframe wajib | Ya, aktif direvisi annual | Ya (Single Form/CBPF) | jarang formal | tidak formal; laporan penyaluran+dampak |
| Indicator conventions | milestone tahunan + weighting | indikator standar cluster prioritas | 3–7 KPI + kualitatif sistematis | IZN/IDZ; graduasi mustahik |
| Horizon outcome wajar | 3–5 th | 6–18 bln (basic needs met) | 3–10 th (structural) | 1–3 th (graduasi ekonomi) |
| Cross-cutting | VfM 4E, GESI | AAP, CHS, gender-age marker | rights/equity per yayasan | maqashid syariah, asnaf |
| Export implications | logframe + weighting + milestones | Single Form fields; cluster indicator IDs | ToC-first deck + annex logframe | laporan amanah + indikator graduasi |

**Aturan retrieval:** donor profile chunk hanya di-load saat user memilih profil pada export/rubric; tidak pernah masuk Universal Compact SOP (v1 §25). `DONOR-SPECIFIC`.

---

## S2. Indicator Registry Expansion — IND-025..IND-060

> Format mengikuti v1 §11 (compact-full: semua field wajib, field identik lintas entri dirujuk ke konvensi PIC-IND-1..5). Registry kini 60 entri. Disagregasi default seluruh entri people-level: sex, usia, disabilitas, lokasi (PIC-IND); tidak diulang per entri kecuali ada tambahan khusus.

### Blok COOPERATIVE (SECTOR-COOP-003)

**IND-COOP-RAT-025** — *Koperasi menyelenggarakan RAT tepat waktu* / Cooperatives holding timely Annual Member Meetings. Level: **Intermediate Outcome**. Type: institutional, binary per koperasi. Definition: RAT (Rapat Anggota Tahunan) terselenggara ≤6 bulan setelah tutup buku, kuorum sesuai AD/ART, laporan pertanggungjawaban disahkan. Unit: jumlah & % koperasi dampingan. Evidence: berita acara RAT + daftar hadir + pengesahan. DQ risk: RAT formalitas tanpa kuorum riil → verifikasi daftar hadir sampling. Bad version: "tata kelola koperasi membaik". `INDONESIA-SPECIFIC` (UU Perkoperasian; nomor UU terbaru `HUMAN REVIEW REQUIRED` pasca-perubahan). Sources: S-11.

**IND-COOP-SHU-026** — *Koperasi membukukan SHU positif & membagikannya sesuai AD/ART* / Cooperatives posting & distributing positive surplus. Level: Outcome. Definition: SHU (sisa hasil usaha) tahun buku positif DAN pembagian diputuskan RAT sesuai AD/ART. Unit: jumlah koperasi; nilai SHU (Rp) sebagai pendukung. Numerator: koperasi memenuhi kedua kriteria; Denominator: koperasi dampingan aktif. Limitations: SHU positif bisa dari pendapatan non-usaha; baca bersama volume usaha anggota. Misinterpretation: SHU besar ≠ manfaat anggota merata. Sources: `HEURISTIC ONLY`; S-11.

### Blok FINANCIAL INCLUSION (SECTOR-FININC-004)

**IND-FININC-ACTIVE-027** — *Rekening/akun aktif digunakan ≥N bulan* / Accounts actively used ≥N months. Level: **Intermediate Outcome→Outcome**. Type: adoption. Definition: akun (tabungan/e-wallet) dengan ≥1 transaksi non-setoran-awal per bulan selama ≥3 bulan berturut (deklarasikan threshold — PIC-IND-4 minimum-use definition). Unit: jumlah & % dari akun dibuka. Source: data agregat penyedia layanan (perjanjian data; privasi!). DQ: dormansi pasca-insentif pembukaan. Bad version: "1.000 akun dibuka" di baris outcome (= HN-19 v1). Privacy: data transaksi keuangan — hanya agregat, consent kelembagaan. Sources: S-07; AFI/findex framing `HUMAN REVIEW REQUIRED URL`.

**IND-FININC-REPAY-028** — *Tingkat pengembalian pinjaman tepat waktu (PAR30 kohort)* / On-time repayment rate (Portfolio-at-Risk 30). Level: Outcome (kualitas penggunaan kredit). Definition: % nilai portofolio kohort peserta dengan tunggakan >30 hari (semakin rendah semakin baik); ATAU % peminjam menyelesaikan angsuran tepat waktu. Unit: %, per kohort. Source: data lembaga keuangan mitra. Limitations: repayment tinggi bisa dari pinjaman ulang gali-lubang — baca bersama indikator kinerja usaha. Misinterpretation: PAR rendah diklaim = usaha tumbuh. Sources: `HEURISTIC ONLY`; S-07.

### Blok SKILLS/EMPLOYMENT (SECTOR-SKILLS-005)

**IND-SKILLS-JOB6-029** — *Lulusan pelatihan bekerja/berwirausaha ≥6 bulan pasca-program* / Graduates in employment/self-employment ≥6 months post-program. Level: **Outcome**. Definition: lulusan berstatus bekerja (formal/informal berbayar) atau menjalankan usaha aktif pada verifikasi bulan ke-6 (tracer). Numerator: lulusan bekerja/berwirausaha terverifikasi; Denominator: lulusan dapat dihubungi (laporkan response rate!). Method: tracer study terstruktur + verifikasi pemberi kerja sampling. DQ risks: survivorship bias (yang sukses lebih mudah dihubungi) — wajib laporkan attrition; definisi "bekerja" longgar. Baseline: status pra-program. Bad version: "peserta siap kerja". Sources: `HEURISTIC ONLY`; ILO school-to-work framing `HUMAN REVIEW REQUIRED URL`.

**IND-SKILLS-CERT-030** — *Peserta lulus uji kompetensi tersertifikasi (BNSP/LSP)* / Participants passing certified competency assessment. Level: Output→Intermediate Outcome (kompetensi terverifikasi pihak ketiga). Definition: lulus uji kompetensi oleh LSP terlisensi BNSP pada skema relevan. Unit: jumlah & % dari peserta uji. Catatan level: sertifikat = bukti kompetensi (IO), bukan bukti bekerja (Outcome) — jangan loncat (ANTI-01 varian). `INDONESIA-SPECIFIC` (BNSP/LSP). Sources: S-11.

### Blok GENDER (SECTOR-GEWE-017)

**IND-GEWE-DECIS-031** — *Perempuan peserta terlibat dalam keputusan ekonomi rumah tangga* / Women participating in household economic decisions. Level: **Outcome**. Type: empowerment, survey-based. Definition: % perempuan peserta yang melaporkan terlibat (sendiri/bersama) dalam ≥N dari daftar keputusan terdefinisi (penggunaan pendapatan, pembelian besar, tabungan) — instrumen tervalidasi (mis. adaptasi modul A-WEAI) `HUMAN REVIEW REQUIRED URL instrumen`. DQ risks: social desirability; jawaban dipengaruhi kehadiran suami saat wawancara → protokol wawancara privat. Attribution: contribution. Bad version: "perempuan berdaya". Sources: A-WEAI/pro-WEAI by-name.

**IND-GEWE-LEAD-032** — *Perempuan menduduki posisi pengambilan keputusan pada lembaga sasaran* / Women in decision-making positions in target institutions. Level: Outcome. Definition: jumlah & % posisi pengurus inti (ketua/sekretaris/bendahara atau setara) lembaga sasaran (BUMDes, koperasi, kelompok tani, forum desa) yang dijabat perempuan DAN yang bersangkutan hadir ≥50% rapat. Catatan: syarat kehadiran mencegah token leadership (nama dipajang tanpa peran riil). Evidence: SK/AD-ART + notula kehadiran. Misinterpretation: kuota terpenuhi ≠ suara didengar — pasangkan dengan IND-GEWE-DECIS bila memungkinkan. Sources: `HEURISTIC ONLY`; GAP III framing `DONOR-SPECIFIC`.

**IND-GEWE-GBVREF-033** — *Penyintas mengakses layanan rujukan sesuai jalur* / Survivors accessing referral services per pathway. Level: Outcome (fungsi sistem). Definition: jumlah kasus terlaporkan yang menerima ≥1 layanan rujukan sesuai SOP (kesehatan/psikososial/hukum) dalam N hari. **Privacy & safeguarding ketat: tidak ada data identitas pada pelaporan program; hanya agregat; prinsip survivor-centred; JANGAN gunakan "penurunan jumlah kasus dilaporkan" sebagai indikator keberhasilan (kasus naik bisa berarti kepercayaan pelaporan naik — misinterpretasi klasik, wajib dicatat pada attribution_note).** Sources: GBV IMS/UNFPA guidance `HUMAN REVIEW REQUIRED URL`; safeguard pack v1 §19.

### Blok DISABILITY & YOUTH (SECTOR-DISAB-018, SECTOR-YOUTH-019)

**IND-DISAB-PART-034** — *Penyandang disabilitas berpartisipasi penuh dalam kegiatan arus utama program* / Persons with disabilities fully participating in mainstream program activities. Level: Intermediate Outcome. Definition: peserta disabilitas (identifikasi via Washington Group Short Set, bukan label diagnosis `HUMAN REVIEW REQUIRED URL WG-SS`) yang menyelesaikan kegiatan dengan akomodasi terdokumentasi. Unit: jumlah; % dari total peserta (bandingkan dengan prevalensi area). DQ: under-identification bila pertanyaan disabilitas ditanya langsung/stigmatizing — gunakan WG-SS verbatim. Bad version: "program ramah disabilitas". Sources: WG-SS by-name; `DONOR-SPECIFIC` (DFAT GEDSI menuntut ini eksplisit).

**IND-YOUTH-NEET-035** — *Pemuda NEET kembali ke pendidikan/pelatihan/pekerjaan* / NEET youth re-engaged in education, training, or work. Level: Outcome. Definition: pemuda 15–24 berstatus NEET (not in employment, education, or training) pada baseline yang berstatus non-NEET terverifikasi pada bulan ke-6. Numerator: transisi terverifikasi; Denominator: NEET teridentifikasi & disasar. Source: tracer + verifikasi lembaga tujuan. Alignment: TPB 8.6 (S-06). DQ: status berfluktuasi — tetapkan titik ukur.

### Blok CHILD PROTECTION & SOCIAL PROTECTION (SECTOR-CHILD-016, SECTOR-SOCPRO-015)

**IND-CHILD-CASE-036** — *Kasus anak tertangani sesuai standar manajemen kasus* / Child cases managed per case-management standards. Level: Outcome (fungsi sistem). Definition: % kasus terregistrasi dengan langkah lengkap: asesmen ≤N hari, rencana intervensi, ≥1 tindak lanjut terdokumentasi, penutupan/rujukan sesuai SOP. Source: register manajemen kasus (PATBM/UPTD PPA) `INDONESIA-SPECIFIC`. Privacy: sangat sensitif — agregat saja, akses register dibatasi, prinsip best interest of the child. Misinterpretation: sama dengan IND-GEWE-GBVREF — kenaikan kasus terlaporkan ≠ kegagalan. Sources: `HEURISTIC ONLY`; UNICEF case-management guidance by-name.

**IND-SOCPRO-INCL-037** — *Keluarga layak yang sebelumnya tereksklusi masuk penerima program* / Eligible previously-excluded households enrolled in social assistance. Level: Outcome (inclusion error correction). Definition: jumlah KK memenuhi kriteria (verifikasi DTKS/registrasi sosial ekonomi terkini `INDONESIA-SPECIFIC, HUMAN REVIEW REQUIRED nomenklatur data terbaru`) yang berhasil terdaftar sebagai penerima setelah fasilitasi advokasi data. Evidence: SK penetapan penerima/dashboard resmi. Limitations: keputusan akhir di pemerintah — control level LOW; klasifikasikan target konservatif (rule C-2 v1). Sources: S-11.

### Blok HUMANITARIAN (SECTOR-HUM-014)

**IND-HUM-BASIC-038** — *Rumah tangga terdampak memenuhi standar kebutuhan dasar sektor* / Affected households meeting sector basic-needs standards. Level: **Outcome (humanitarian horizon)**. Definition: % RT sasaran memenuhi ambang standar Sphere sektor terkait (mis. ≥15 L air/orang/hari; shelter coverage; skor konsumsi pangan acceptable) pada titik ukur. Source: post-distribution monitoring (PDM) household survey. Frequency: PDM 4–8 minggu pasca-distribusi + endline. DQ: akses area sulit → sampling bias, laporkan coverage sampling. Sources: S-10 (ambang spesifik per sektor `HUMAN REVIEW REQUIRED versi handbook`).

**IND-HUM-AAP-039** — *Penerima manfaat mengetahui & menggunakan saluran umpan balik* / Beneficiaries aware of and using feedback channels. Level: Intermediate Outcome (akuntabilitas). Definition: % penerima yang (a) mengetahui ≥1 saluran umpan balik dan (b) % keluhan terjawab ≤N hari sesuai SOP. Dua sub-indikator dilaporkan terpisah (jangan gabung). Source: PDM + log umpan balik. Alignment: CHS komitmen 4–5 (S-10).

### Blok CLIMATE MITIGATION / ENVIRONMENT / ENERGY (SECTOR-MITIG-011, SECTOR-ENV-012, SECTOR-ENERGY-028)

**IND-MITIG-GHG-040** — *Estimasi reduksi/serapan emisi GRK dari intervensi* / Estimated GHG emission reduction/sequestration. Level: Impact-contribution proxy. Definition: ton CO2e per tahun dihitung dengan metodologi bernama (sebutkan: kalkulator/faktor emisi apa; mis. AFOLU untuk penanaman, faktor jaringan untuk energi) — **tanpa metodologi bernama, indikator ini tidak boleh diklaim** (PIC baru: GHG claim wajib menyebut metode & faktor emisi; selaras E-ROI Carbon Tracker Impactory). Unit: tCO2e/tahun (estimasi, bukan terverifikasi kecuali ada verifikasi pihak ketiga — bedakan `estimated` vs `verified`). Misinterpretation: angka estimasi dilaporkan seolah measured. Sources: IPCC/GHG Protocol by-name `HUMAN REVIEW REQUIRED faktor emisi Indonesia (DJPPI/KLHK)`.

**IND-ENV-HECT-041** — *Luas area direhabilitasi dengan tanaman hidup ≥12 bulan* / Hectares rehabilitated with surviving vegetation ≥12 months. Level: Outcome. Definition: hektar tertanam dengan **survival rate ≥X% pada verifikasi bulan-12** (bukan hektar ditanam — planted ≠ surviving; ANTI-03 varian lingkungan). Method: sampling plot + geotag foto. DQ: survival dihitung saat musim hujan saja → verifikasi lintas musim. Bad version: "10.000 pohon ditanam" sebagai outcome. Sources: `HEURISTIC ONLY`.

**IND-ENERGY-USE-042** — *Rumah tangga menggunakan sistem energi terpasang sebagai sumber utama* / Households using installed energy systems as primary source. Level: Outcome. Definition: % RT dengan sistem terpasang yang berfungsi DAN digunakan sebagai sumber utama untuk kebutuhan sasaran (penerangan/memasak) pada verifikasi ≥6 bulan. Dua syarat: functionality + primacy of use. DQ: sistem berfungsi tapi ditinggalkan karena biaya pengisian/bahan bakar lama lebih murah — tanya alasan non-use. Bad version: "100 unit terpasang" (Output). Sources: `HEURISTIC ONLY`; ESMAP multi-tier framework by-name `HUMAN REVIEW REQUIRED URL`.

### Blok DIGITAL & CIVIC TECH (SECTOR-DIGITAL-023, SECTOR-CIVTECH-022)

**IND-DIG-MAU-043** — *Pengguna aktif bulanan memenuhi minimum-use definition* / Monthly active users meeting minimum-use definition. Level: Intermediate Outcome. Definition: pengguna unik dengan ≥N aksi bernilai (bukan sekadar login) per bulan — definisikan "aksi bernilai" per platform (PIC-IND-4). Unit: MAU; % dari registered. Source: analytics platform. DQ: bot/duplikat akun; login insentif. Bad version: total unduhan (HN-5 v1). Sources: `HEURISTIC ONLY` (praktik product analytics).

**IND-DIG-TASK-044** — *Pengguna menyelesaikan alur tugas inti secara mandiri* / Users completing core task flows independently. Level: Intermediate Outcome (kapabilitas digital). Definition: % pengguna sampel yang menyelesaikan task inti (mis. lapor via platform, transaksi, unggah dokumen) tanpa bantuan pada uji terstruktur/telemetri funnel. Method: funnel analytics ATAU usability test terstruktur. Kegunaan: memisahkan masalah adopsi vs masalah usability. Sources: `HEURISTIC ONLY`.

**IND-CIVTECH-INST-045** — *Institusi merespons masukan warga melalui platform sesuai SLA* / Institutions responding to citizen input per SLA. Level: **Outcome (dua sisi)**. Definition: % laporan/aspirasi warga yang menerima respons substantif institusi ≤N hari (SLA terdefinisi; respons template ≠ substantif — perlu rubrik). Catatan kausal: civic tech selalu dua sisi — supply (warga pakai) dan demand (institusi respons); outcome hanya sah bila kedua sisi bergerak (edge case §9.5B v1). Source: log platform + audit sampel kualitas respons. Alignment: SP4N-LAPOR! `INDONESIA-SPECIFIC`. Sources: S-06 proxy TPB 16.

### Blok GOVERNANCE & PEACE (SECTOR-GOV-020, SECTOR-PEACE-024)

**IND-GOV-BUDGET-046** — *Usulan masyarakat terakomodasi dalam dokumen anggaran/perencanaan resmi* / Community proposals adopted in official planning/budget documents. Level: Outcome. Definition: jumlah usulan hasil proses partisipatif terfasilitasi yang termuat (dapat ditelusuri redaksinya) dalam RKPDes/Renja/APBDes-APBD. Evidence: dokumen resmi + matriks penelusuran usulan→dokumen. Control: LOW (keputusan di pemerintah) — target konservatif. Misinterpretation: usulan mirip yang memang sudah direncanakan diklaim hasil advokasi — perlu jejak proses. Sources: `HEURISTIC ONLY`; S-11 (mekanisme musrenbang).

**IND-PEACE-CONTACT-047** — *Interaksi kooperatif lintas kelompok pada aktivitas bersama* / Cooperative cross-group interaction in joint activities. Level: Intermediate Outcome. Definition: jumlah aktivitas bersama lintas kelompok dengan partisipasi berimbang (≥X% tiap kelompok) yang menghasilkan keputusan/produk bersama terdokumentasi. Catatan: kontak ≠ kohesi (contact hypothesis punya syarat: status setara, tujuan bersama) — jangan klaim "konflik menurun" dari kegiatan bersama saja (causal leap). Outcome kohesi butuh survei persepsi antar-kelompok terpisah. Sources: `HEURISTIC ONLY`; peacebuilding MEL literature by-name.

### Blok MIGRATION / URBAN / RURAL (SECTOR-MIGR-025, SECTOR-URBAN-026, SECTOR-RURAL-027)

**IND-MIGR-SAFE-048** — *Calon PMI berangkat melalui jalur prosedural* / Prospective migrant workers departing through procedural channels. Level: Outcome. Definition: % calon pekerja migran dampingan yang berangkat dengan dokumen lengkap via P3MI terdaftar/skema resmi (verifikasi SISKOP2MI bila akses memungkinkan `INDONESIA-SPECIFIC, HUMAN REVIEW REQUIRED akses data`). DQ: yang berangkat non-prosedural cenderung hilang dari pantauan → survivorship bias; laporkan loss-to-follow-up. Sources: S-11 (UU 18/2017 PPMI by-name).

**IND-URBAN-TENURE-049** — *Rumah tangga memperoleh dokumen keamanan bermukim* / Households obtaining tenure security documentation. Level: Outcome. Definition: jumlah KK memperoleh dokumen legal (SHM/HGB/perjanjian sewa formal/SK penetapan) yang meningkatkan keamanan bermukim dari status baseline. Control: LOW-MEDIUM (BPN/pemda). Catatan: dokumen ≠ bebas gusur bila status lahan sengketa — catat jenis dokumen & kekuatannya. Sources: `HEURISTIC ONLY`; S-11.

**IND-RURAL-BUMDES-050** — *BUMDes menjalankan unit usaha aktif dengan pembukuan berjalan* / Village enterprises operating active business units with ongoing bookkeeping. Level: Outcome. Definition: BUMDes dampingan dengan ≥1 unit usaha bertransaksi rutin ≥6 bulan + laporan keuangan periodik disampaikan ke musyawarah desa. Evidence: pembukuan + berita acara musdes. Bad version: "BUMDes terbentuk" (Output — legal ≠ functioning, HN-18 v1 analog). `INDONESIA-SPECIFIC` (UU Desa 6/2014, S-11).

### Blok CSR & KNOWLEDGE/ADVOCACY (SECTOR-CSR-029, SECTOR-KNOW-030)

**IND-CSR-SUPPLIER-051** — *Pemasok rantai pasok menerapkan standar keberlanjutan terverifikasi* / Supply-chain suppliers applying verified sustainability standards. Level: Outcome. Definition: jumlah & % pemasok sasaran lulus verifikasi standar terdefinisi (audit internal/sertifikasi) pada siklus berjalan. Relevansi Impactory: positioning 100+ Accelerator — NGO partner sebagai enabler kepatuhan pemasok. DQ: audit self-declared vs pihak ketiga — bedakan. Sources: `HEURISTIC ONLY`.

**IND-KNOW-UPTAKE-052** — *Produk pengetahuan dikutip/diadopsi dalam dokumen kebijakan atau praktik lembaga* / Knowledge products cited/adopted in policy documents or institutional practice. Level: **Outcome**. Definition: jumlah instance terverifikasi produk riset program dikutip dalam dokumen resmi (perda/pergub/renstra/SOP lembaga) ATAU direplikasi lembaga lain, dengan jejak dokumen. Method: citation tracking + key-informant confirmation. Horizon: 1–3 th; sering melampaui masa proyek — sah sebagai indikator dengan catatan horizon. Bad version: "riset dipublikasikan" sebagai outcome (HN-23 v1). Sources: S-09; ODI RAPID framing by-name.

**IND-KNOW-ENGAGE-053** — *Pengambil kebijakan sasaran terlibat substantif dalam proses evidence-sharing* / Target policymakers substantively engaged in evidence-sharing. Level: Intermediate Outcome. Definition: jumlah pengambil kebijakan (jabatan terdefinisi) hadir & memberi tanggapan substantif terdokumentasi dalam ≥2 forum program. Kegunaan: missing link antara publikasi (Output) dan uptake (Outcome) — indikator jembatan anti-ANTI-13. Sources: `HEURISTIC ONLY`.

### Blok pelengkap sektor FULL & P1 (AGRI/EDU/HEALTH/NUTRI/WASH/CCA/DRR)

**IND-AGRI-LOSS-054** — *Susut pasca-panen komoditas sasaran menurun* / Post-harvest loss of target commodity reduced. Level: Outcome. Definition: % susut (bobot/nilai) dari panen hingga titik jual, metode pengukuran dideklarasikan (penimbangan sampel vs estimasi petani — jangan dicampur). Baseline wajib musim setara. DQ: estimasi petani sistematis melebih-lebihkan/mengecilkan — kalibrasi dengan penimbangan sampel. Sources: FAO PHL methodology by-name `HUMAN REVIEW REQUIRED URL`.

**IND-EDU-ATTEND-055** — *Kehadiran siswa sasaran meningkat & bertahan* / Target student attendance improved and sustained. Level: Intermediate Outcome. Definition: % kehadiran bulanan siswa sasaran (dari register sekolah) ≥ ambang selama ≥1 semester. Kegunaan: leading indicator sebelum learning outcome (IND-EDU-LEARN-014 v1). DQ: register diisi rapel; triangulasi kunjungan mendadak. Sources: `HEURISTIC ONLY`.

**IND-HLTH-CAPAC-056** — *Tenaga/kader kesehatan lulus uji kompetensi praktik terstandar* / Health workers/cadres passing standardized practice assessment. Level: Intermediate Outcome. Definition: % kader/nakes sasaran lulus asesmen keterampilan praktik (OSCE-style checklist, bukan tes tulis saja) pasca-pelatihan + retensi keterampilan pada re-asesmen bulan-6. Dua titik ukur: pasca & retensi. DQ: asesor sama dengan pelatih → bias; gunakan asesor silang. Sources: `HEURISTIC ONLY`; WHO training evaluation framing by-name.

**IND-NUTR-ANEMIA-057** — *Prevalensi anemia remaja putri sasaran (skrining program)* / Anemia prevalence among target adolescent girls (program screening). Level: Outcome→Impact-proxy. Definition: % remaja putri sasaran dengan Hb < ambang WHO pada skrining terstandar (alat & protokol dideklarasikan). **Etika: skrining wajib disertai jalur rujukan & tablet tambah darah — tidak boleh skrining tanpa layanan lanjutan.** Attribution: contribution (multifaktor). Alignment: program TTD nasional `INDONESIA-SPECIFIC`. Sources: WHO ambang Hb `HUMAN REVIEW REQUIRED URL`; S-06.

**IND-WASH-ODF-058** — *Komunitas mencapai & mempertahankan status bebas BABS terverifikasi* / Communities achieving & sustaining verified ODF status. Level: Outcome. Definition: desa/dusun lulus verifikasi ODF (STBM pilar 1) DAN lolos verifikasi keberlanjutan pada bulan-12 (slippage check). Dua tahap: capai + pertahankan. DQ: verifikasi seremonial; slippage pasca-deklarasi umum terjadi — indikator tanpa sustaining check menyesatkan. `INDONESIA-SPECIFIC` (STBM/Permenkes 3/2014, S-11). Sources: S-11; JMP ladders (S-12).

**IND-CCA-INFOUSE-059** — *Petani/nelayan menggunakan informasi iklim dalam keputusan usaha* / Farmers/fishers using climate information in livelihood decisions. Level: Intermediate Outcome. Definition: % penerima layanan informasi iklim yang dapat menunjukkan ≥1 keputusan (jadwal tanam/melaut/varietas) yang berubah berdasar informasi tsb pada musim berjalan (recall terstruktur + verifikasi tindakan). DQ: post-hoc rationalization — minta bukti tindakan, bukan sekadar klaim. Sources: `HEURISTIC ONLY`; CIS literature by-name (S-09 kelas).

**IND-DRR-EWS-060** — *Sistem peringatan dini berfungsi end-to-end pada uji/kejadian* / Early warning system functioning end-to-end in drills/events. Level: Outcome. Definition: % uji (atau kejadian riil) di mana rantai peringatan lengkap berjalan: deteksi→keputusan→diseminasi ke warga→tindakan evakuasi dimulai ≤N menit. Ukur rantai penuh, bukan keberadaan alat (alat terpasang = Output; ANTI-03 varian). Evidence: log uji + after-action review. Alignment: Destana `INDONESIA-SPECIFIC`. Sources: S-11; UNDRR EWS framing by-name.

**Rekap registry:** 60 entri terdistribusi 24 sektor; seluruh entri memuat minimum-use/verification logic sesuai PIC-IND-1..5; entri dengan referensi by-name tetap `HUMAN REVIEW REQUIRED` untuk URL/versi (terdaftar §S5).

---

## S3. Bilingual Hard-Negative Examples — HN-31..HN-100

> Melengkapi v1 §23 (HN-1..30) menjadi 100. Format kolom identik: Text | Sector | Archetype | Claimed | Correct | Problem | Missing link | Suggested direction | Confidence | Severity. Semua `CANONICAL` sebagai training/regression material; pola diturunkan dari §14 v1 + S-03. Campuran ID/EN disengaja (production input bilingual).

### S3.1 Level misclassification & causal leap (HN-31..55)

| # | Text | Sec | Arch | Claimed | Correct | Problem | Missing link | Direction | Conf | Sev |
|---|---|---|---|---|---|---|---|---|---|---|
| 31 | "Outcome: Tersusunnya modul pelatihan kewirausahaan" | 005 | 001 | Outcome | Output | deliverable-as-outcome | penggunaan modul | outcome = perubahan pada peserta | H | H |
| 32 | "Output: Increased awareness of climate risks among 5,000 villagers" | 010 | 006 | Output | IO (jika diukur) | awareness bukan deliverable | instrumen ukur | Output=kampanye tersampaikan; awareness=IO dgn survei | H | M |
| 33 | "Goal: Menyelenggarakan festival UMKM tahunan" | 002 | — | Goal | Activity | activity-as-goal | seluruh rantai | goal = kondisi ekonomi jangka panjang | H | H |
| 34 | "Outcome: 90% peserta puas dengan pelatihan" | multi | 001 | Outcome | reaction (Kirkpatrick L1) | satisfaction ≠ outcome | adopsi, kinerja | pindah ke monitoring kualitas; outcome = praktik | H | H |
| 35 | "Outcome: Pengetahuan gizi ibu meningkat sehingga stunting turun" | 008 | 005 | Outcome | IO+leap | knowledge→impact leap | praktik PMBA, asupan, multifaktor | pecah: pengetahuan→praktik→status gizi (contribution) | H | H |
| 36 | "Output: Terbentuknya 20 kelompok tani baru yang sejahtera" | 001 | 004 | Output | Output+leap | formed≠functioning≠sejahtera | aktivitas kelompok, kinerja usaha | pisahkan pembentukan (Output) dari fungsi (IO) | H | H |
| 37 | "Outcome: Sistem rujukan diperkuat" | 007 | 039 | Outcome | vague | tidak terukur, arah tak jelas | definisi fungsi | rumuskan: % kasus dirujuk sesuai SOP ≤N hari | H | M |
| 38 | "Impact: Seluruh warga desa melek digital dalam 8 bulan" | 023 | 001 | Impact | overclaim | horizon+cakupan mustahil | — | outcome subkelompok terdefinisi + skill terukur | H | H |
| 39 | "Outcome: Website advokasi dikunjungi 50.000 kali sehingga kebijakan ramah lingkungan disahkan" | 030 | 020 | Outcome | vanity+leap | traffic≠pengaruh | engagement pembuat kebijakan, proses legislasi | jejak advokasi→dokumen kebijakan | H | H |
| 40 | "Outcome: Guru mengikuti 40 jam pelatihan kurikulum baru" | 006 | 001 | Outcome | Activity/Output | dosis pelatihan ≠ hasil | praktik kelas | observasi praktik kelas (IND-EDU-TEACH-013) | H | H |
| 41 | "Output: Nelayan mendapat asuransi sehingga keluarga sejahtera" | 002 | 013 | Output+leap | Output | enrolment≠welfare | klaim terbayar, resiliensi | rantai: polis aktif→klaim saat musibah→pemulihan | H | M |
| 42 | "Outcome: MoU kemitraan ditandatangani dengan 3 OPD" | 020 | 031 | Outcome | Output | MoU=kertas | implementasi bersama | kegiatan bersama terdokumentasi pasca-MoU | H | M |
| 43 | "Outcome: Terbangunnya gedung PAUD ramah anak sehingga kualitas SDM meningkat" | 006 | 023 | Outcome | Output+leap | infra→SDM leap | layanan beroperasi, partisipasi, pembelajaran | pecah per rule C-1; SDM = impact-contribution | H | H |
| 44 | "Purpose: Mengadakan 12 kali posyandu remaja" | 007 | 022 | Purpose | Activity | frekuensi kegiatan ≠ purpose | utilisasi, perilaku | purpose = perubahan status/perilaku remaja | H | H |
| 45 | "Outcome: 500 KK menerima bantuan sembako tepat waktu" | 014 | 037 | Outcome | Output | delivery=output | kebutuhan terpenuhi | PDM standar Sphere (IND-HUM-BASIC-038) | H | M |
| 46 | "Outcome: Kader terlatih dan aktif" ("aktif" tanpa definisi) | 007 | 001 | Outcome | incomplete | "aktif" kabur | minimum-activity definition | definisikan aktif: ≥N kegiatan/bulan terverifikasi | H | M |
| 47 | "Output: Policy brief diserahkan ke DPRD sehingga perda direvisi" | 030 | 020 | Output+leap | Output | ANTI-13 | pembahasan, naskah akademik, voting | uptake trail; revisi perda = outcome control LOW | H | H |
| 48 | "Outcome: Komunitas mampu mengelola sampah secara mandiri" (proyek 6 bln, tanpa indikator) | 012 | 004 | Outcome | vague+horizon | "mandiri" tak terukur, horizon pendek | definisi kemandirian | IO: unit pengelola beroperasi + iuran berjalan ≥3 bln | H | M |
| 49 | "Impact: Indeks demokrasi Indonesia meningkat berkat program ini" | 022 | 029 | Impact | attribution overclaim | indeks nasional multifaktor | — | contribution statement + outcome lokal terukur | H | H |
| 50 | "Outcome: Aplikasi wakaf digital diluncurkan dan viral" | 023 | 007 | Outcome | Output+vanity | launched+viral ≠ hasil | transaksi wakaf aktual, nazhir onboard | nilai & jumlah transaksi terverifikasi (IND-DIG-MAU-043 logic) | H | H |
| 51 | "Outcome: Perempuan penerima modal usaha 100 orang" | 017 | 012 | Outcome | Output | disbursement=output | penggunaan produktif, kinerja usaha | rantai ANTI-08: penggunaan→omzet→kontrol pendapatan | H | H |
| 52 | "Output: Sekolah menerima 50 komputer sehingga literasi digital siswa meningkat" | 006 | 010 | Output+leap | Output | ANTI-03 | instalasi, guru mampu, jam pakai kurikuler | rantai utilisasi + praktik pembelajaran | H | H |
| 53 | "Outcome: Terlaksananya sosialisasi PHBS di 30 sekolah" | 009 | 006 | Outcome | Activity | sosialisasi=kegiatan | praktik higiene | observasi praktik CTPS + sarana berfungsi | H | H |
| 54 | "Goal: Aplikasi Impactory digunakan seluruh NGO Indonesia" | 021 | 007 | Goal | overclaim | cakupan universal | — | goal = tata kelola program NGO sasaran membaik | H | M |
| 55 | "Outcome: Bank sampah berdiri di 10 RW sehingga volume sampah ke TPA berkurang 40%" | 012 | 023 | Outcome | Output+leap | berdiri≠beroperasi; 40% tanpa basis | operasional, setoran rutin, timbangan data | baseline timbulan + data setoran ≥6 bln | H | H |

### S3.2 Indicator quality failures (HN-56..75)

| # | Text | Sec | Arch | Claimed | Correct | Problem | Missing link | Direction | Conf | Sev |
|---|---|---|---|---|---|---|---|---|---|---|
| 56 | "Indikator: Tingkat kesadaran masyarakat (%)" | multi | 006 | Indicator | incomplete | konstruk tak didefinisikan | instrumen, ambang | definisikan konstruk + alat ukur + skala | H | M |
| 57 | "Indicator: % increase in income" (tanpa baseline, periode, sumber) | 002 | — | Indicator | incomplete | IND-anti: no baseline/source | baseline, metode | lengkapi metadata minimum (PIC-IND-1) | H | H |
| 58 | "Indikator: Jumlah kegiatan yang dilaksanakan" di baris Outcome | multi | — | Indicator | level mismatch | activity count di outcome | — | pindah ke output/activity monitoring | H | H |
| 59 | "Indikator: 100% masyarakat berpartisipasi" | multi | 004 | Indicator | target mustahil | universal coverage | definisi partisipasi | target realistis + definisi partisipasi | H | M |
| 60 | "Indicator: Number of likes and shares" sebagai outcome advokasi | 030 | 006 | Indicator | vanity | engagement≠pengaruh | audiens sasaran, tindakan | ganti: tindakan audiens sasaran terverifikasi | H | M |
| 61 | "Indikator: Rata-rata pendapatan naik Rp 500.000" (mean, kohort kecil, ada outlier) | 002 | — | Indicator | metode rapuh | mean sensitif outlier | — | gunakan median + laporkan sebaran (PIC §11 v1) | M | M |
| 62 | "Indikator: Jumlah penerima manfaat tidak langsung: 250.000 jiwa (radius 5 km)" | multi | — | Indicator | inflated reach | basis radius tak berdasar | definisi indirect | basis perhitungan eksplisit atau hapus | H | M |
| 63 | "Indicator: % of trained participants with increased knowledge" (pre-post di hari yang sama) | multi | 001 | Indicator | weak method | same-day post-test | retensi | tambah delayed post-test / praktik | M | M |
| 64 | "Indikator: Skor OCA naik dari 2,1 ke 3,8 dalam 4 bulan" (self-assessment) | 021 | 018 | Indicator | inflation | self-report OCA cepat | verifikasi bukti | verified score + per-domain (IND-CSO-OCA-008) | H | M |
| 65 | "Indikator: Desa tangguh bencana terbentuk" | 013 | 036 | Indicator | binary kosmetik | SK≠kapasitas | fungsi (drill, rencana hidup) | IND-DRR-DRILL-024/EWS-060 logic | H | M |
| 66 | "Indicator: Number of policies influenced" (tanpa definisi influenced) | 030 | 020 | Indicator | undefined verb | "influenced" kabur | rubrik kontribusi | definisi tingkat kontribusi + bukti jejak | H | M |
| 67 | "Indikator: % penurunan angka kemiskinan desa" untuk proyek 12 bulan | 002 | — | Indicator | horizon mismatch | impact-level di proyek pendek | — | ganti outcome antara; kemiskinan = contribution | H | H |
| 68 | "Indikator: Jumlah ibu hamil yang 'sadar gizi'" | 008 | 005 | Indicator | undefined construct | sadar gizi tak terdefinisi | praktik terdefinisi | praktik konsumsi/ANC terverifikasi | H | M |
| 69 | "Indicator: Attendance rate 100% mandatory" sebagai indikator keberhasilan pelatihan | multi | 001 | Indicator | wrong construct | kehadiran≠kompetensi | asesmen | kehadiran=monitoring; kompetensi=indikator | H | L |
| 70 | "Indikator: Nilai ekonomi yang dihasilkan Rp 3,4 M" (metode tak dijelaskan) | 029 | — | Indicator | black-box valuation | metodologi tak diungkap | metode & asumsi | deklarasikan metode (selaras aturan GHG IND-040) | H | M |
| 71 | "Indikator: Semua indikator tercapai 100%" sebagai indikator gabungan | multi | — | Indicator | meta-indicator invalid | agregasi menyembunyikan | — | laporkan per indikator | H | M |
| 72 | "Indicator: Beneficiaries reached: 12.000" (reach di baris outcome, tanpa disagregasi) | multi | — | Indicator | reach-as-outcome | ANTI-04 | adopsi | reach=output; tambah disagregasi wajib | H | M |
| 73 | "Indikator: % kader yang masih aktif 2 tahun pasca proyek" pada proposal proyek 10 bulan | 007 | 001 | Indicator | measurement beyond project | tak ada mekanisme ukur | rencana ex-post | nyatakan sebagai ex-post plan berbiaya, atau ganti | M | L |
| 74 | "Indikator: Tingkat kepuasan 4,8/5 dari testimoni terpilih" | multi | 022 | Indicator | sampling bias | testimoni terpilih | sampling | survei sampel representatif + instrumen | H | M |
| 75 | "Indicator: GHG emission reduced by 10,000 tCO2e" (tanpa metodologi) | 011 | — | Indicator | unverifiable claim | metode & faktor emisi | metodologi bernama | wajib metode+faktor (IND-MITIG-GHG-040) | H | H |

### S3.3 Assumption, risk, WBS & budget failures (HN-76..90)

| # | Text | Sec | Arch | Claimed | Correct | Problem | Missing link | Direction | Conf | Sev |
|---|---|---|---|---|---|---|---|---|---|---|
| 76 | "Asumsi: Tidak terjadi bencana alam" (proyek DRR) | 013 | 036 | Assumption | invalid | menghapus raison d'être proyek | — | asumsi spesifik per link (akses lokasi, dsb.) | H | M |
| 77 | "Asumsi: Pemerintah daerah kooperatif" | 020 | — | Assumption | generik | tak spesifik link | link mana, bentuk dukungan | "OPD X menandatangani izin akses data ≤ bln-2" | H | M |
| 78 | "Assumption: Beneficiaries are motivated to change" | multi | 001 | Assumption | design escape | motivasi = tugas desain | seleksi & insentif | pindah ke desain (targeting); asumsi eksternal saja | H | M |
| 79 | "Risiko: Kegagalan program" dengan mitigasi "bekerja lebih keras" | multi | — | Risk | non-risk+non-mitigation | terlalu umum | risiko spesifik | risk register per causal link (§18 v1) | H | M |
| 80 | "Asumsi: Anggaran cair tepat waktu" ditulis di kolom asumsi logframe donor | multi | — | Assumption | internal/kontraktual | bukan eksternal program | — | pindah ke manajemen risiko internal | M | L |
| 81 | "WBS: Kegiatan 1: Pemberdayaan masyarakat (12 bulan)" tanpa dekomposisi | multi | 004 | WBS | under-decomposition | >4 minggu tanpa milestone | work packages | pecah per WP dgn completion criteria (§15 v1) | H | M |
| 82 | "WBS Task: Membeli pulpen; Task: Membeli map; Task: Membeli spidol" | multi | — | WBS | over-decomposition | task trivial <0,5 hari | — | gabung: pengadaan ATK (task tunggal) | H | L |
| 83 | "Budget: Biaya pelatihan Rp 50 jt" (lump sum tanpa driver) | multi | 001 | Budget | no cost drivers | qty×freq×unit absen | peserta, hari, lokasi | pecah per driver (§16 v1) | H | M |
| 84 | "Budget: Honor narasumber sesuai SBM sehingga LFA berkualitas" | multi | — | Budget claim | category error | compliance≠quality | — | SBM=Budget Compliance; keluar dari Quality Score | H | M |
| 85 | "Budget readiness: lengkap" padahal hanya total per output tanpa unit cost | multi | — | Budget | false readiness | driver tak teridentifikasi | unit costs | readiness = driver+asumsi biaya teridentifikasi | H | M |
| 86 | "Risiko: Perubahan iklim" (tanpa spesifikasi) pada proyek pertanian | 001 | — | Risk | too broad | paparan spesifik | kejadian, musim, komoditas | "kemarau panjang > X hari pada fase generatif" | H | M |
| 87 | "Mitigasi: Monitoring ketat" untuk risiko penolakan masyarakat | multi | — | Mitigation | mismatch | monitoring≠mitigasi sosial | engagement plan | mitigasi: konsultasi awal, tokoh, mekanisme keluhan | H | M |
| 88 | "Asumsi: Teknologi berfungsi dengan baik" pada proyek platform | 023 | 007 | Assumption | internal deliverable | fungsi platform = tanggung jawab tim | — | pindah ke quality plan; asumsi eksternal: konektivitas | H | M |
| 89 | "Risk: Turnover staf mitra" dengan mitigasi "berharap staf bertahan" | multi | 018 | Mitigation | non-mitigation | tindakan absen | dokumentasi, kaderisasi | knowledge transfer protocol + dual counterpart | H | M |
| 90 | "Asumsi: Kurs USD stabil" pada proyek lokal tanpa komponen impor | multi | — | Assumption | irrelevant | tak terkait causal link | — | hapus; asumsi harus menempel link | M | L |

### S3.4 Cross-cutting, safeguard & Indonesia-specific failures (HN-91..100)

| # | Text | Sec | Arch | Claimed | Correct | Problem | Missing link | Direction | Conf | Sev |
|---|---|---|---|---|---|---|---|---|---|---|
| 91 | "Outcome: Kasus kekerasan terhadap anak menurun 50%" (indikator: laporan ke UPTD) | 016 | 038 | Outcome | misread signal | laporan turun ≠ kasus turun | interpretasi pelaporan | reframe: sistem respons berfungsi; catat paradoks pelaporan (IND-033/036) | H | H |
| 92 | "Output: Data 5.000 penerima dipublikasikan di website untuk transparansi" | multi | 009 | Output | privacy violation | data pribadi terbuka | consent, agregasi | agregat + UU PDP 27/2022 compliance | H | H |
| 93 | "Outcome: Semua perempuan desa berdaya secara ekonomi" | 017 | — | Outcome | universal+vague | cakupan & konstruk | definisi, subkelompok | subkelompok terdefinisi + IND-GEWE-031/032 | H | M |
| 94 | "Kegiatan menargetkan kepala keluarga" (proxy laki-laki, klaim outcome gender) | 017 | 011 | Targeting | gender-blind | KK≠perempuan | targeting eksplisit | penerima perempuan langsung + kontrol pendapatan | H | M |
| 95 | "Outcome: Masyarakat adat menerima program dengan baik" | 012 | 004 | Outcome | consent-as-outcome | FPIC = prasyarat, bukan hasil | outcome substantif | FPIC ke safeguard; outcome = manfaat terukur | H | M |
| 96 | "Indikator: Jumlah mustahik menerima zakat produktif" di baris outcome | 002 | 012 | Indicator | disbursement=output | ANTI-08 varian zakat | graduasi | graduasi mustahik→muzakki (profil BAZNAS §S1) | H | M |
| 97 | "Outcome: Desa memiliki peraturan desa perlindungan lingkungan" (berhenti di perdes) | 012 | 019 | Outcome | IO | approval≠enforcement | implementasi, penindakan | rantai §9.5C v1: perdes→mekanisme→kepatuhan | H | M |
| 98 | "Output: Pelatihan disabilitas dilaksanakan terpisah agar lebih fokus" diklaim inklusi | 018 | 001 | Claim | segregation-as-inclusion | terpisah≠inklusif | akomodasi arus utama | partisipasi arus utama + akomodasi (IND-DISAB-034) | M | M |
| 99 | "Outcome: Program viral di media sosial nasional" | multi | 006 | Outcome | vanity | visibilitas≠perubahan | audiens sasaran, tindakan | tindakan audiens sasaran; media = monitoring | H | M |
| 100 | "Impact: Terwujudnya SDGs di wilayah program" | multi | — | Impact | slogan | tak spesifik goal/target | pilih target TPB | pilih target & indikator TPB spesifik (S-06) | H | M |

**Rekap HN:** 100 entri; sebaran: level misclassification/causal leap 40%, indicator quality 25%, assumption/risk/WBS/budget 20%, cross-cutting/safeguard/Indonesia 15%. Seluruh entri dapat langsung menjadi eval set klasifikasi (v1 §27) — split saran: 70 train-prompt exemplar / 30 held-out regression.

---

## S4. Additional Bilingual Gold Chains — GOLD-07..GOLD-12

> Melengkapi v1 §22 (GOLD-01..06) menjadi 12. Format: rantai 4-level + indikator kunci per level + asumsi per link. Semua indikator merujuk registry (v1 §11 / §S2). Setiap chain lolos rules C-1..C-3 v1 by construction.

### GOLD-07 — Pendidikan / Education (SECTOR-EDU-006 × ARCH-TRAINING-001+MENTOR-003)

**ID:** Goal: Hasil belajar literasi-numerasi siswa SD sasaran di Kab. X meningkat berkelanjutan. Purpose: Guru kelas awal di 30 SD sasaran menerapkan praktik pembelajaran terdiferensiasi dalam pengajaran rutin. Outputs: (1) 90 guru menyelesaikan pelatihan + siklus pendampingan kelas; (2) perangkat ajar terdiferensiasi tersedia & disahkan sekolah; (3) komunitas belajar guru antar-SD beroperasi. Activities: TNA & baseline observasi kelas; pelatihan modul; pendampingan in-class 6 siklus; fasilitasi KKG; asesmen formatif siswa.
**EN:** Goal: Sustained improvement in early-grade literacy-numeracy outcomes. Purpose: Early-grade teachers in 30 target schools apply differentiated instruction in routine teaching. (Outputs/Activities mirror.)
**Indikator kunci:** Activity→Output: guru menyelesaikan ≥80% sesi (monitoring). Output→Purpose: IND-EDU-TEACH-013 (observasi rubrik, ≥2 tak diumumkan). Purpose→Goal: IND-EDU-LEARN-014 + IND-EDU-ATTEND-055 sebagai leading. **Asumsi per link:** kepala sekolah mengalokasikan jam KKG (link Output→Purpose; MEDIUM control); tidak ada rotasi guru massal (LOW); asesmen daerah tetap dijalankan (LOW). **Horizon:** praktik guru 6–12 bln; learning gains ≥1 tahun ajaran (attribution: contribution + pembanding bila etis).

### GOLD-08 — Kesehatan komunitas / Community health, pola SIGAP (SECTOR-HEALTH-007 × ARCH-SERVICE-022+DIGDEV-007)

**ID:** Goal: Deteksi dini PTM (hipertensi/diabetes) pada kelompok berisiko di wilayah sasaran membaik sehingga komplikasi tertunda/berkurang (contribution). Purpose: Warga berisiko rutin mengikuti skrining komunitas dan yang terindikasi melanjutkan ke layanan Puskesmas. Outputs: (1) 40 kader tersertifikasi skrining terstandar; (2) pos skrining beroperasi bulanan di 10 titik; (3) sistem pencatatan-rujukan digital berfungsi & terhubung alur Puskesmas. Activities: pelatihan+OSCE kader; pengadaan & kalibrasi alat; SOP rujukan bersama Puskesmas; penyelenggaraan pos; pencatatan digital.
**EN:** Goal: Improved early detection of NCDs among at-risk groups contributing to delayed/reduced complications. Purpose: At-risk residents routinely screened and positives complete referral to primary care.
**Indikator kunci:** Output: IND-HLTH-CAPAC-056 (kader lulus OSCE + retensi bln-6); pos beroperasi ≥80% jadwal. Purpose: IND-HLTH-UTIL-016 (unik-orang skrining berulang) + % rujukan positif yang tiba di Puskesmas ≤14 hari (completion of referral — indikator jembatan). **Asumsi:** Puskesmas menerima alur rujukan (MEDIUM — dimitigasi SOP bersama); stok alat/strip tersedia (internal→quality plan, bukan asumsi); warga positif bersedia lanjut (dipantau, ada jalur konseling). **Catatan safeguard:** skrining wajib tersambung layanan lanjutan (etika IND-NUTR-ANEMIA-057 berlaku umum).

### GOLD-09 — WASH (SECTOR-WASH-009 × ARCH-COMFAC-004+INFRA-023)

**ID:** Goal: Kejadian diare balita di desa sasaran menurun (contribution, multifaktor). Purpose: Rumah tangga menggunakan jamban layak dan mempraktikkan CTPS pada waktu kunci secara konsisten; desa mempertahankan status ODF. Outputs: (1) pemicuan STBM tuntas di semua dusun; (2) opsi sarana sanitasi terjangkau tersedia (wusan/pengusaha sanitasi lokal aktif); (3) sarana CTPS berfungsi di rumah & sekolah. Activities: pemicuan; pelatihan wusan; monitoring kartu rumah; verifikasi ODF berjenjang; kampanye CTPS sekolah.
**EN:** Goal: Reduced under-five diarrhea incidence (contribution). Purpose: Households consistently use improved sanitation and practice handwashing at critical times; village sustains ODF.
**Indikator kunci:** Output: dusun terpicu 100%; wusan aktif bertransaksi. Purpose: IND-WASH-USE-018 + IND-WASH-ODF-058 (capai + pertahankan bln-12) + spot-check sarana CTPS berair+bersabun. Goal: data Puskesmas sebagai konteks (bukan klaim atribusi). **Asumsi:** harga material stabil (LOW-MED); tidak ada banjir merusak sarana (LOW; masuk risk register dengan kontinjensi); kepala desa mempertahankan komitmen pasca-deklarasi (MEDIUM — dimitigasi perdes & anggaran desa). **Anti-slippage:** sustaining check adalah bagian desain, bukan tambahan.

### GOLD-10 — Gender × penghidupan / Gender × livelihoods (SECTOR-GEWE-017 × ARCH-GRANTS-012+MENTOR-003)

**ID:** Goal: Kemandirian ekonomi perempuan kepala keluarga (PEKKA) di kecamatan sasaran meningkat dan diakui dalam pengambilan keputusan rumah tangga & komunitas. Purpose: Perempuan peserta menjalankan usaha aktif dengan pendapatan yang mereka kontrol dan berpartisipasi dalam keputusan ekonomi. Outputs: (1) 150 perempuan menyelesaikan paket modal+pendampingan usaha; (2) kelompok usaha perempuan beroperasi dengan pertemuan & tabungan rutin; (3) 30 perempuan menempati posisi pengurus lembaga desa. Activities: seleksi transparan berbasis kriteria; penyaluran modal bertahap berbasis milestone; pendampingan bulanan; penguatan kelompok; fasilitasi keterwakilan di musdes.
**EN:** Goal: Increased economic autonomy of women heads of household, recognized in household and community decision-making. Purpose: Participants run active enterprises with income under their control and participate in economic decisions.
**Indikator kunci:** Output: penyaluran milestone-based 100% terverifikasi penggunaan (anti ANTI-08). Purpose: IND-MSME-REV-001 (median omzet) + IND-GEWE-DECIS-031 (wawancara privat) ; Goal-ward: IND-GEWE-LEAD-032 (posisi + kehadiran ≥50%). **Asumsi:** dukungan keluarga tidak berbalik menjadi backlash (MEDIUM — dipantau; mitigasi: engagement suami/keluarga, jalur rujukan bila muncul kekerasan → safeguard pack GBV); norma lokal memungkinkan perempuan hadir forum malam (CONTEXT-DEPENDENT — sesuaikan jadwal). **Catatan:** kontrol pendapatan ≠ jumlah pendapatan — dua indikator terpisah, jangan digabung.

### GOLD-11 — Adaptasi iklim pertanian / Climate adaptation in agriculture (SECTOR-CCA-010 × ARCH-DEMPLOT-034+TECH-033)

**ID:** Goal: Ketahanan penghidupan petani padi sawah tadah hujan terhadap variabilitas iklim meningkat. Purpose: Petani sasaran menggunakan informasi iklim dan menerapkan ≥2 praktik adaptif (varietas toleran, kalender tanam adaptif, irigasi hemat) pada lahan sendiri selama ≥2 musim. Outputs: (1) demplot per desa menampilkan paket adaptif dengan data pembanding; (2) layanan informasi iklim lokal (SLI-style) berjalan tiap musim; (3) kelompok tani menyusun rencana tanam musiman berbasis prakiraan. Activities: SLI bersama BMKG/BPP; demplot partisipatif + ubinan pembanding; farmer field day; fasilitasi rencana musim.
**EN:** Goal: Increased livelihood resilience of rainfed rice farmers to climate variability. Purpose: Farmers use climate information and apply ≥2 adaptive practices on own plots for ≥2 seasons.
**Indikator kunci:** Output: demplot panen + data ubinan pembanding terdokumentasi; sesi SLI per musim. Purpose: IND-CCA-INFOUSE-059 (keputusan berubah terverifikasi) + IND-AGRI-ADOPT-009 (≥2 praktik, ≥2 musim). Goal-ward: IND-AGRI-YIELD-010 dibandingkan musim setara + stabilitas hasil antar musim (variance sebagai ukuran resiliensi — bukan hanya mean). **Asumsi:** prakiraan musiman cukup akurat untuk keputusan (LOW control — BMKG; catat skill forecast); pasar menerima varietas baru (MEDIUM — cek preferensi sejak desain); air minimal tersedia pada skenario terburuk (risk register + kontinjensi). **Catatan:** resiliensi diukur sebagai stabilitas, bukan sekadar kenaikan — `HEURISTIC ONLY` tapi selaras DCED.

### GOLD-12 — Civic tech (SECTOR-CIVTECH-022 × ARCH-DIGDEV-007+SOCACC-029)

**ID:** Goal: Kualitas layanan publik dasar di kabupaten sasaran membaik melalui akuntabilitas warga yang berfungsi. Purpose: Warga menggunakan kanal pelaporan digital untuk isu layanan DAN OPD merespons substantif sesuai SLA sehingga perbaikan layanan terverifikasi. Outputs: (1) platform pelaporan terintegrasi SP4N-LAPOR! beroperasi; (2) 5 OPD memiliki SOP respons + petugas terlatih; (3) kelompok warga pemantau aktif di 20 desa/kelurahan. Activities: pengembangan/integrasi platform; pelatihan petugas OPD; rekrutmen & pelatihan pemantau warga; forum tripartit triwulanan; publikasi dashboard kinerja respons.
**EN:** Goal: Improved basic public services through functioning citizen accountability. Purpose: Citizens use digital reporting channels AND agencies respond substantively within SLA, leading to verified service fixes.
**Indikator kunci:** Output: platform uptime + OPD ber-SOP; pemantau aktif (minimum-activity definition). Purpose (dua sisi, dilaporkan terpisah): IND-DIG-MAU-043 (pelapor aktif) + IND-CIVTECH-INST-045 (respons substantif ≤SLA) + % laporan berujung perbaikan terverifikasi lapangan (closing the loop — indikator puncak purpose). **Asumsi:** komitmen pimpinan daerah bertahan lintas mutasi pejabat (LOW-MED — mitigasi: perjanjian kerja sama formal + dashboard publik menciptakan insentif reputasi); tidak ada pembalasan terhadap pelapor (safeguard: anonimisasi, UU PDP). **Anti-pattern yang dihindari by design:** ANTI-06 (unduhan), ANTI-02 (dashboard tersedia), HN-5/6/39.

**Rekap gold:** 12 chains menutupi 11 sektor & 14 archetype; seluruhnya memuat indikator jembatan (bridging indicators) pada link yang paling sering diloncati — pola yang harus ditiru AI draft generator.

---

## S5. Updated Gap Ledger & Status

### S5.1 Gap tertutup oleh v1.1

| Item | Bukti |
|---|---|
| Donor crosswalk: FCDO, humanitarian, foundations, filantropi Islam/BAZNAS | §S1 (4 profil + matriks delta + aturan retrieval) |
| Indicator registry 24→60 | §S2 (IND-025..060; 24 sektor terwakili) |
| Hard-negatives 30→100 | §S3 (4 kategori kegagalan, siap jadi eval set) |
| Gold chains 6→12 | §S4 (semua lolos C-1..C-3, dengan bridging indicators) |

### S5.2 Gap yang tetap OPEN (memerlukan tindakan non-authoring)

1. **`HUMAN REVIEW REQUIRED` verifikasi sumber** — daftar konsolidasi: WG-SS URL; A-WEAI/pro-WEAI; WHO Hb thresholds & core indicators; JMP/FCS/PHL FAO; ESMAP MTF; ECHO Single Form versi; FCDO logframe guidance pasca-2020; BAZNAS IZN/IDZ metodologi; nomor UU Perkoperasian terkini; nomenklatur registrasi sosial-ekonomi pengganti DTKS; faktor emisi KLHK/DJPPI. **Estimasi effort: 0,5–1 hari kerja verifikasi manusia dengan akses internet; hasilnya meng-upgrade label ke Diverifikasi pada source register.**
2. **Sector pack FULL untuk P1** (EDU, HEALTH, CCA, GEWE, FININC, DRR, CIVTECH, SKILLS) — v1.1 menambah indikator & gold chain-nya, tetapi outcome/output family lengkap per pack masih SEED. Rekomendasi: FULL-kan 2 pack per iterasi mengikuti prioritas user base aktual Impactory (data telemetry sektor pengguna > asumsi).
3. **Archetype FULL untuk P1 seeds** (TOT-002, MENTOR-003, BCC-005, A2F-013, ADVOC-020, INFRA-023, CBM-028, CERT-035, PREP-036, CASE-038) — seed spine sudah di Annex B v1; format FULL menyusul.
4. **Eval set formalisasi** — HN-100 & GOLD-12 perlu dikonversi ke format eval harness (JSONL) saat masuk fase implementasi. Di luar scope RESEARCH mode; masuk P0 extraction plan v1 §30 sebagai input siap pakai.
5. **Kalibrasi threshold §27 v1** — threshold (≥0.85/0.90) baru bisa diverifikasi realismenya setelah eval pertama dijalankan pada 100 HN; prediksi: indicator-level ≥0.90 tercapai, archetype ≥0.85 borderline pada seed archetypes (definisi FULL belum ada) — mitigasi: batasi klaim klasifikasi archetype ke 14 archetype ber-definisi kuat dulu.

### S5.3 Return status gabungan

```text
RESEARCH_CORPUS_PARTIAL_WITH_IDENTIFIED_GAPS
(v1 + v1.1: seluruh struktur wajib lengkap; gap tersisa bersifat
 verifikasi-sumber & pendalaman P1 — bukan gap struktural.)
```

Kombinasi v1 + v1.1 sudah memenuhi seluruh kebutuhan P0 extraction plan (v1 §30) tanpa menunggu iterasi berikutnya.
