import type { Fixture } from './types';

export const REGRESSION_FIXTURES: Fixture[] = [
  // 15 Hard-Negative Fixtures
  {
    fixture_id: "FIX-HN-101",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Petani Naik Kelas",
      location: "Kab. Garut",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Petani sayur di 3 kecamatan",
      beneficiary_count: 500,
      beneficiary_unit: "orang",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami akan melatih literasi keuangan untuk petani agar mereka pintar mengelola pengeluaran mereka."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_2"],
      reason_it_looks_right: "beneficiary_description mengandung kata 'petani' yang memicu asosiasi naif ke SDG 2 kelaparan/pertanian."
    },
    expected_mapping: {
      sector_primary: "SECTOR-FININC-004",
      sector_secondary: ["SECTOR-LIVELIHOOD-002"],
      interventions_primary: ["ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: ["OF-003"],
      output_families: ["OPF-001", "OPF-002"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_1"],
      sdg_rejected_as_primary: ["SDG_2"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: ["SDG-ANTI-FARMER-001"],
    expected_confidence_behavior: "SDG 2 score <= 0.50 setelah penalti anti-signal FARMER-001 diaplikasikan.",
    pass_criteria: "Sektor Primary beralih tegas ke FININC-004; SDG 2 ditolak masuk kelompok Primary.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-102",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Pelatihan Menjahit Perempuan Mandiri",
      location: "Kab. Sleman",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Perempuan kepala keluarga prasejahtera",
      beneficiary_count: 50,
      beneficiary_unit: "orang",
      funding_amount: 50000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami melatih ibu-ibu prasejahtera menjahit agar memiliki keterampilan untuk menyambung hidup."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_5"],
      reason_it_looks_right: "Ibu-ibu/perempuan memicu naif SDG 5 Kesetaraan Gender secara otomatis."
    },
    expected_mapping: {
      sector_primary: "SECTOR-SKILLS-005",
      sector_secondary: ["SECTOR-LIVELIHOOD-002"],
      interventions_primary: ["ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-014"],
        beneficiary: ["ACT-014"]
      },
      outcome_families: ["OF-002"],
      output_families: ["OPF-001", "OPF-002"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_1"],
      sdg_rejected_as_primary: ["SDG_5"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: ["SDG-ANTI-WOMAN-002"],
    expected_confidence_behavior: "SDG 5 score <= 0.55 paska penalti WOMAN-002; dipaksa turun ke kelompok Secondary.",
    pass_criteria: "SDG 5 diturunkan ke Secondary karena tidak ada outcome kesetaraan relasi kuasa formal (seperti kepemimpinan atau regulasi KDRT).",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-103",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Pemberian Makanan Tambahan Balita",
      location: "Kab. Kupang",
      duration_value: 3,
      duration_unit: "bulan",
      beneficiary_description: "Anak balita penderita kurang gizi",
      beneficiary_count: 200,
      beneficiary_unit: "orang",
      funding_amount: 90000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Membagikan susu, biskuit sehat, dan multivitamin kepada anak balita kurang gizi di posyandu."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_4"],
      reason_it_looks_right: "Kata 'anak balita' memicu asosiasi naif ke SDG 4 Pendidikan karena mengira anak sekolah dasar."
    },
    expected_mapping: {
      sector_primary: "SECTOR-NUTRI-008",
      sector_secondary: ["SECTOR-HEALTH-007"],
      interventions_primary: ["ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-017"],
        beneficiary: ["ACT-020"]
      },
      outcome_families: ["OF-024"],
      output_families: ["OPF-014"],
      sdg_primary: ["SDG_2"],
      sdg_secondary: ["SDG_3"],
      sdg_rejected_as_primary: ["SDG_4"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: ["SDG-ANTI-CHILD-003"],
    expected_confidence_behavior: "SDG 4 score <= 0.30 karena melanggar uji relevansi sasaran balita non-sekolah formal.",
    pass_criteria: "SDG 4 ditolak mutlak dari kelompok rekomendasi Primary/Secondary; diarahkan penuh ke SDG 2 (Gizi).",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-104",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Sistem Aplikasi Nelayan Juang",
      location: "Kab. Trenggalek",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Nelayan tradisional pesisir",
      beneficiary_count: 300,
      beneficiary_unit: "orang",
      funding_amount: 300000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami merancang dan melaunching aplikasi mobile Nelayan Juang agar nelayan di desa kami melek teknologi digital."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_9"],
      reason_it_looks_right: "Membangun aplikasi digital memicu biner otomatis ke SDG 9 Infrastruktur & Inovasi."
    },
    expected_mapping: {
      sector_primary: "SECTOR-DIGITAL-023",
      sector_secondary: [],
      interventions_primary: ["ARCH-DIGDEV-007"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: [],
      output_families: ["OPF-020"],
      sdg_primary: [],
      sdg_secondary: ["SDG_9"],
      sdg_rejected_as_primary: ["SDG_9"],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: ["SDG-ANTI-DIGITAL-004"],
    expected_confidence_behavior: "SDG 9 Primary ditolak karena tidak ada target adopsi terukur (no outcome); SDG dialihkan ke Secondary.",
    pass_criteria: "Lolosnya aturan Primary Coverage Gate yang biner menurunkan ranking SDG 9 ke Secondary karena tidak memiliki outcome yang valid.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-105",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Gerakan Sadar Perubahan Iklim Desa",
      location: "Kab. Malang",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Warga desa umum",
      beneficiary_count: 1000,
      beneficiary_unit: "orang",
      funding_amount: 45000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menyelenggarakan sosialisasi keliling membagikan brosur agar warga sadar bahaya perubahan iklim global."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_13"],
      reason_it_looks_right: "Kata 'iklim' memicu naif SDG 13 Aksi Iklim."
    },
    expected_mapping: {
      sector_primary: "SECTOR-KNOW-030",
      sector_secondary: ["SECTOR-ENV-012"],
      interventions_primary: ["ARCH-AWARE-006"],
      actor_roles: {
        target_actor: ["ACT-030"],
        beneficiary: ["ACT-030"]
      },
      outcome_families: ["OF-001"],
      output_families: ["OPF-001"],
      sdg_primary: [],
      sdg_secondary: ["SDG_13"],
      sdg_rejected_as_primary: ["SDG_13"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: ["SDG-ANTI-CLIMATE-005"],
    expected_confidence_behavior: "SDG 13 score <= 0.45 paska penalti CLIMATE-005; diturunkan dari Primary.",
    pass_criteria: "SDG 13 gagal masuk Primary karena intervensi sosialisasi satu arah tanpa adanya aksi mitigasi fisik/adaptasi praktis yang terukur.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-106",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Melatih Keterampilan Desain Grafis",
      location: "Kota Semarang",
      duration_value: 3,
      duration_unit: "bulan",
      beneficiary_description: "Anak muda menganggur",
      beneficiary_count: 30,
      beneficiary_unit: "orang",
      funding_amount: 40000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Target akhir program kami adalah mencetak 30 pemuda yang terlatih dan menguasai aplikasi desain Photoshop."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_8"],
      reason_it_looks_right: "Melatih anak muda menganggur memicu otomatis SDG 8 pekerjaan layak."
    },
    expected_mapping: {
      sector_primary: "SECTOR-SKILLS-005",
      sector_secondary: ["SECTOR-YOUTH-019"],
      interventions_primary: ["ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-016"],
        beneficiary: ["ACT-016"]
      },
      outcome_families: ["OF-002"],
      output_families: ["OPF-002"],
      sdg_primary: [],
      sdg_secondary: ["SDG_8"],
      sdg_rejected_as_primary: ["SDG_8"],
      warnings_expected: [],
      missing_information_expected: ["MISS-006"]
    },
    anti_signal_ids: ["SDG-ANTI-TRAINING-006"],
    expected_confidence_behavior: "SDG 8 diturunkan paska penalti TRAINING-006; expected_changes dikosongkan karena tidak ada outcome adopsi.",
    pass_criteria: "SDG 8 gagal masuk Primary karena program hanya mengukur pencapaian kelulusan kelas (*completion output*), bukan penyerapan kerja nyata.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-107",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Pemberian Bantuan Air Bersih Tanggap Darurat",
      location: "Kab. Wonogiri",
      duration_value: 2,
      duration_unit: "bulan",
      beneficiary_description: "Warga terdampak kekeringan ekstrim",
      beneficiary_count: 1000,
      beneficiary_unit: "orang",
      funding_amount: 35000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami berhasil menjangkau 1.000 warga dengan menyalurkan pasokan tangki air bersih setiap hari selama musim kemarau."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_6"],
      reason_it_looks_right: "Kata 'air bersih' memicu biner otomatis ke SDG 6 sanitasi."
    },
    expected_mapping: {
      sector_primary: "SECTOR-HUM-014",
      sector_secondary: ["SECTOR-WASH-009"],
      interventions_primary: ["ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-021"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: ["OF-024"],
      output_families: ["OPF-014"],
      sdg_primary: ["SDG_2"],
      sdg_secondary: ["SDG_6"],
      sdg_rejected_as_primary: ["SDG_6"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: ["SDG-ANTI-REACH-010"],
    expected_confidence_behavior: "Skor SDG 6 diturunka ke Secondary; dialihkan penuh ke SDG 2 / Sektor HUM karena horizon tanggap darurat.",
    pass_criteria: "Penyaluran logistik tangki insidental (*reach output*) tidak memenuhi kualifikasi SDG 6 yang mensyaratkan utilisasi infrastruktur air bersih berkelanjutan.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-108",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Membagikan Traktor Tangan Kelompok Tani",
      location: "Kab. Ngawi",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Kelompok tani makmur desa",
      beneficiary_count: 5,
      beneficiary_unit: "kelompok",
      funding_amount: 120000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Membagikan traktor tangan gratis agar produktivitas lahan sawah petani kami meningkat secara drastis."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_2"],
      reason_it_looks_right: "Traktor + petani memicu otomatis SDG 2 pangan."
    },
    expected_mapping: {
      sector_primary: "SECTOR-AGRI-001",
      sector_secondary: [],
      interventions_primary: ["ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: [],
      output_families: ["OPF-014"],
      sdg_primary: [],
      sdg_secondary: ["SDG_2"],
      sdg_rejected_as_primary: ["SDG_2"],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: ["SDG-ANTI-INFRA-008"],
    expected_confidence_behavior: "SDG 2 diturunkan ke Secondary paska gate validasi intervensi tanpa adanya outcome adopsi penggunaan (OF-004).",
    pass_criteria: "Gagal asersi Primary SDG 2 karena tidak merancang unit tracking penggunaan alat (*utilization logic*) untuk membuktikan lompatan kausal ke produktivitas.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-109",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Penyusunan Ringkasan Kebijakan Pendidikan",
      location: "Kota Bandung",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Dinas Pendidikan Kota",
      beneficiary_count: 1,
      beneficiary_unit: "lembaga",
      funding_amount: 80000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menerbitkan policy brief rekomendasi perubahan tata kelola sekolah dasar agar mutu pengajaran meningkat."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_4"],
      reason_it_looks_right: "Kata 'sekolah/pendidikan' memicu biner otomatis ke SDG 4."
    },
    expected_mapping: {
      sector_primary: "SECTOR-KNOW-030",
      sector_secondary: ["SECTOR-EDU-006"],
      interventions_primary: ["ARCH-POLICY-019"],
      actor_roles: {
        target_actor: ["ACT-027"],
        beneficiary: ["ACT-020"]
      },
      outcome_families: [],
      output_families: ["OPF-017"],
      sdg_primary: [],
      sdg_secondary: ["SDG_16"],
      sdg_rejected_as_primary: ["SDG_4"],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: ["SDG-ANTI-POLICYDOC-012"],
    expected_confidence_behavior: "SDG 4 ditolak mutlak dari Primary; SDG 16 Secondary diaktifkan untuk porsi advokasi tata kelola.",
    pass_criteria: "Penerbitan dokumen rekomendasi (*brief product*) tidak terbukti memengaruhi regulasi formal tanpa adanya komitmen implementasi dinas.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-110",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Portal Suara Warga Digital",
      location: "Kota Surabaya",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Warga kota umum",
      beneficiary_count: 10000,
      beneficiary_unit: "orang",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menargetkan website pengaduan kami diakses oleh 100.000 pengunjung per bulan untuk mewujudkan transparansi kota."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_16"],
      reason_it_looks_right: "Transparansi kota memicu otomatis SDG 16."
    },
    expected_mapping: {
      sector_primary: "SECTOR-CIVTECH-022",
      sector_secondary: ["SECTOR-DIGITAL-023"],
      interventions_primary: ["ARCH-DIGDEV-007"],
      actor_roles: {
        target_actor: ["ACT-027"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: [],
      output_families: ["OPF-020"],
      sdg_primary: [],
      sdg_secondary: ["SDG_16"],
      sdg_rejected_as_primary: ["SDG_16"],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: ["SDG-ANTI-SOCMED-013"],
    expected_confidence_behavior: "Skor SDG 16 diturunkan ke Secondary karena murni menargetkan traffic web kasar (*hit reach*) tanpa adanya indikator resolusi aduan.",
    pass_criteria: "Lalu lintas pengunjung digital (*click traffic*) ditolak sebagai bukti partisipasi aktif warga formal.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-111",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Penyaluran Modal Usaha Mikro Zakat",
      location: "Kab. Demak",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Mustahik prasejahtera produktif",
      beneficiary_count: 100,
      beneficiary_unit: "orang",
      funding_amount: 100000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Menyalurkan modal zakat produktif 100% tepat sasaran agar kemiskinan di desa tersebut tuntas hilang."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_1"],
      reason_it_looks_right: "Mustahik prasejahtera + modal memicu otomatis SDG 1 tanpa kemiskinan."
    },
    expected_mapping: {
      sector_primary: "SECTOR-SOCPRO-015",
      sector_secondary: ["SECTOR-LIVELIHOOD-002"],
      interventions_primary: ["ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-012"],
        beneficiary: ["ACT-012"]
      },
      outcome_families: [],
      output_families: ["OPF-022"],
      sdg_primary: [],
      sdg_secondary: ["SDG_1"],
      sdg_rejected_as_primary: ["SDG_1"],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: ["SDG-ANTI-CASH-007"],
    expected_confidence_behavior: "SDG 1 Primary ditolak karena murni pencairan dana biner (*disbursement*) tanpa pelacakan rantai penggunaan modal.",
    pass_criteria: "Menerapkan penalti anti-signal CASH-007 untuk mencegah klaim kelulusan garis kemiskinan instan dari aktivitas pencairan dana semata.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-112",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Desa Bina Sejahtera Terpadu",
      location: "Kab. Sigi",
      duration_value: 24,
      duration_unit: "bulan",
      beneficiary_description: "Warga desa marjinal tertinggal",
      beneficiary_count: 1500,
      beneficiary_unit: "orang",
      funding_amount: 900000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menjalankan program terpadu di desa binaan: membina UMKM, mengajari baca tulis anak, melatih kader posyandu, membagikan jamban sehat, dan menanam bibit pohon pelindung."
    },
    incorrect_mapping: {
      sdg_primary: ["SDG_1", "SDG_2", "SDG_3", "SDG_4", "SDG_5", "SDG_6", "SDG_8", "SDG_13", "SDG_15"],
      reason_it_looks_right: "Program multi-sektor terintegrasi mengklaim mencakup hampir seluruh target SDGs sekaligus."
    },
    expected_mapping: {
      sector_primary: undefined,
      sector_secondary: [],
      interventions_primary: [],
      actor_roles: {
        target_actor: [],
        beneficiary: ["ACT-030"]
      },
      outcome_families: [],
      output_families: [],
      sdg_primary: [],
      sdg_secondary: [],
      sdg_rejected_as_primary: [],
      warnings_expected: ["TPL-MISS-019", "TPL-MISS-020", "TPL-MISS-021"],
      missing_information_expected: ["MISS-019", "MISS-020", "MISS-021"]
    },
    anti_signal_ids: ["SDG-ANTI-UNIVERSAL-016"],
    expected_confidence_behavior: "Sektor Primary diset null; seluruh SDG Primary dibekukan; draf blueprint dikosongkan dengan warning keras.",
    pass_criteria: "Aturan biner Stuffing Rule (§22.3) memaksa penolakan draf terintegrasi acak-acakan; meminta pemecahan proposal menjadi draf spesifik.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-113",
    fixture_type: "hard_negative",
    language: "en",
    page_1_input: {
      program_title: "ICT Training for Better Schools",
      location: "Kab. Sikka",
      duration_value: 12,
      duration_unit: "months",
      beneficiary_description: "Junior high school students",
      beneficiary_count: 1200,
      beneficiary_unit: "people",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "We will train junior high school students to use computers and master school software."
    },
    incorrect_mapping: {
      sdg_primary: [], // Custom added for P0-B compat
      reason_it_looks_right: "Menulis siswa sebagai target utama perubahan kompetensi pengajaran formal."
    },
    expected_mapping: {
      sector_primary: "SECTOR-SKILLS-005",
      sector_secondary: ["SECTOR-EDU-006"],
      interventions_primary: ["ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-020"],
        beneficiary: ["ACT-020"]
      },
      outcome_families: ["OF-002"],
      output_families: ["OPF-002"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_4"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "Sektor dialihkan ke SKILLS-005; SDG 4 dipaksa menjadi Secondary karena peran guru tidak terdeteksi aktif.",
    pass_criteria: "Logika klasifikasi peran (§15) menolak siswa sebagai target actor peningkatan kualitas pengajaran formal dinas.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-114",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Penyusunan SOP Pengelolaan Keuangan LSM",
      location: "Kota Yogyakarta",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Lembaga Swadaya Masyarakat lokal",
      beneficiary_count: 5,
      beneficiary_unit: "lembaga",
      funding_amount: 30000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menargetkan penyusunan dokumen SOP keuangan diselesaikan dan ditandatangani oleh pimpinan lembaga."
    },
    incorrect_mapping: {
      sdg_primary: [], // Custom added for P0-B compat
      reason_it_looks_right: "Menulis draf dokumen SOP sebagai hasil akhir tingkat Outcome."
    },
    expected_mapping: {
      sector_primary: "SECTOR-CSO-021",
      sector_secondary: [],
      interventions_primary: ["ARCH-CAPACITY-018"],
      actor_roles: {
        target_actor: ["ACT-025"],
        beneficiary: ["ACT-025"]
      },
      outcome_families: [],
      output_families: ["OPF-009", "OPF-010"],
      sdg_primary: ["SDG_16"],
      sdg_secondary: [],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-008"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "Outcome Family dikosongkan; draf expected_changes blueprint memicu placeholder peringatan level.",
    pass_criteria: "Mesin biner Invalid Relationship Checks memindahkan paksa naskah SOP dari array outcome ke output keluarga OPF-010.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-HN-115",
    fixture_type: "hard_negative",
    language: "id",
    page_1_input: {
      program_title: "Rapat Koordinasi Satgas Kebencanaan",
      location: "Kab. Sleman",
      duration_value: 3,
      duration_unit: "bulan",
      beneficiary_description: "Anggota satgas kebencanaan daerah",
      beneficiary_count: 25,
      beneficiary_unit: "orang",
      funding_amount: 15000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menyelenggarakan rapat koordinasi bulanan sebanyak 12 kali pertemuan di kantor BPBD."
    },
    incorrect_mapping: {
      sdg_primary: [], // Custom added for P0-B compat
      reason_it_looks_right: "Kegiatan rutin rapat koordinasi diklaim sebagai Output hasil."
    },
    expected_mapping: {
      sector_primary: "SECTOR-DRR-013",
      sector_secondary: [],
      interventions_primary: [],
      actor_roles: {
        target_actor: [],
        beneficiary: ["ACT-021"]
      },
      outcome_families: [],
      output_families: [],
      sdg_primary: [],
      sdg_secondary: [],
      sdg_rejected_as_primary: [],
      warnings_expected: ["TPL-MISS-009", "TPL-MISS-008"],
      missing_information_expected: ["MISS-009", "MISS-008"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "Tolak entri; output diset kosong karena kegiatan rapat bulanan di bawah standar kelulusan hasil proyek.",
    pass_criteria: "Menolak rapat rutin dinas sebagai output proyek terstruktur karena tidak memiliki kriteria serah-terima hasil operasional.",
    source_ref: "Audit IRR Guardrail v1",
    epistemic_label: "CANONICAL_IMPACTORY"
  },

  // 12 Gold Standard Fixtures
  {
    fixture_id: "FIX-GOLD-01",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Demplot Padi Organik Adaptif",
      location: "Kab. Ngawi",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Petani kecil di desa tadah hujan",
      beneficiary_count: 150,
      beneficiary_unit: "orang",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami memfasilitasi pembuatan demplot pertanian organik, melatih pembuatan pupuk hayati, membagikan paket benih padi unggul toleran kekeringanBMKG, mengawal pendampingan rutin kelompok tani di sawah, dan memfasilitasi temu bisnis dengan pembeli di Surabaya agar harga jual panen meningkat."
    },
    expected_mapping: {
      sector_primary: "SECTOR-AGRI-001",
      sector_secondary: [],
      interventions_primary: ["ARCH-TRAINING-001", "ARCH-MENTOR-003", "ARCH-MARKET-015"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: ["OF-003", "OF-008", "OF-010"],
      output_families: ["OPF-001", "OPF-002", "OPF-014", "OPF-023"],
      sdg_primary: ["SDG_2"],
      sdg_secondary: ["SDG_8"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 2 score >= 0.80 karena memiliki kecocokan penuh konsep outcome pertanian dan indikator panen terukur.",
    pass_criteria: "SDG 2 lulus sebagai Primary; penalti anti-signal FARMER-001 secara biner tidak terpicu karena didukung bukti outcome yang memadai.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-02",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Pendampingan Bisnis UMKM Naik Kelas",
      location: "Kota Surakarta",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Pelaku usaha mikro kuliner perempuan",
      beneficiary_count: 80,
      beneficiary_unit: "orang",
      funding_amount: 100000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami melatih pembukuan keuangan digital, memberikan pendampingan mentoring bisnis mingguan di ruko, mendistribusikan alat timbangan digital presisi, dan menghubungkan pelaku usaha mikro ke marketplace Tokopedia agar omzet penjualan mereka meningkat."
    },
    expected_mapping: {
      sector_primary: "SECTOR-LIVELIHOOD-002",
      sector_secondary: [],
      interventions_primary: ["ARCH-TRAINING-001", "ARCH-MENTOR-003", "ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-008"],
        beneficiary: ["ACT-014"]
      },
      outcome_families: ["OF-003", "OF-004", "OF-009"],
      output_families: ["OPF-001", "OPF-002", "OPF-014", "OPF-020"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_1"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 8 score >= 0.80; penalti TRAINING-006 mati karena ada outcome pendapatan (OF-009).",
    pass_criteria: "SDG 8 menjadi Primary; Sektor Primary ter-resolve ke LIVELIHOOD-002.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-03",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Kapasitas Tata Kelola Yayasan Peduli",
      location: "Kota Makassar",
      duration_value: 18,
      duration_unit: "bulan",
      beneficiary_description: "Lembaga Swadaya Masyarakat lokal Sulsel",
      beneficiary_count: 10,
      beneficiary_unit: "lembaga",
      funding_amount: 250000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Mengadakan pendampingan intensif penyusunan SOP tata kelola internal keuangan, melatih staf administrasi akuntansi, dan memfasilitasi proses audit akuntabilitas keuangan oleh KAP eksternal independen agar kredibilitas lembaga meningkat."
    },
    expected_mapping: {
      sector_primary: "SECTOR-CSO-021",
      sector_secondary: [],
      interventions_primary: ["ARCH-CAPACITY-018", "ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-025"],
        beneficiary: ["ACT-025"]
      },
      outcome_families: ["OF-014"],
      output_families: ["OPF-001", "OPF-002", "OPF-009", "OPF-010"],
      sdg_primary: ["SDG_16"],
      sdg_secondary: ["SDG_17"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 16 score >= 0.78; penalti MoU/dokumen mati karena outcome audit keuangan nyata dimasukkan.",
    pass_criteria: "SDG 16 lulus Primary; Sektor Primary ter-resolve ke CSO-021.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-04",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Sertifikasi Teknisi Komputer Muda",
      location: "Kota Medan",
      duration_value: 6,
      duration_unit: "bulan",
      beneficiary_description: "Anak muda pengangguran lulusan SMK",
      beneficiary_count: 100,
      beneficiary_unit: "orang",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Melatih anak muda pengangguran perbaikan hardware komputer, menyusun modul kurikulum standar industri, menyelenggarakan ujian sertifikasi kompetensi teknisi, dan menyalurkan lulusan terbaik ke program magang industri."
    },
    expected_mapping: {
      sector_primary: "SECTOR-SKILLS-005",
      sector_secondary: ["SECTOR-YOUTH-019"],
      interventions_primary: ["ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-016"],
        beneficiary: ["ACT-016"]
      },
      outcome_families: ["OF-002", "OF-013"],
      output_families: ["OPF-001", "OPF-002", "OPF-024"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_4"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 8 score >= 0.77; penalti ANTI-01 ditolak karena didukung penyaluran magang nyata.",
    pass_criteria: "SDG 8 lulus Primary; Sektor Primary ter-resolve ke SKILLS-005.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-05",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Kemitraan Offtaker Kopi Rakyat",
      location: "Kab. Gayo Lues",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Petani kopi lereng gunung",
      beneficiary_count: 250,
      beneficiary_unit: "orang",
      funding_amount: 180000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Menghubungkan kelompok tani kopi lokal dengan perusahaan eksportir di Medan, menyelenggarakan business matching, mengawal penyusunan dokumen kontrak jual beli (PKS), dan melatih pengemasan standar ekspor agar margin harga stabil."
    },
    expected_mapping: {
      sector_primary: "SECTOR-AGRI-001",
      sector_secondary: [],
      interventions_primary: ["ARCH-MARKET-015", "ARCH-TRAINING-001"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: ["OF-008", "OF-010"],
      output_families: ["OPF-001", "OPF-002", "OPF-023"],
      sdg_primary: ["SDG_8"],
      sdg_secondary: ["SDG_2"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 8 dan SDG 2 bersaing; dipecah otomatis sesuai tie-breaking rule outcome harga jual (OF-010).",
    pass_criteria: "SDG 8 lulus sebagai Primary; penalti HN-8 tidak aktif karena ada verifikasi proses pengiriman logistik pasca kontrak.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-06",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Posyandu Siaga Hipertensi Lansia",
      location: "Kab. Sleman",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Warga lansia berisiko hipertensi",
      beneficiary_count: 400,
      beneficiary_unit: "orang",
      funding_amount: 60000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Melatih kader kesehatan melakukan skrining tensi darah, menyediakan alat tensimeter digital di 5 titik posyandu, and menyusun SOP alur penanganan rujukan darurat pasien hipertensi ke Puskesmas kecamatan setempat."
    },
    expected_mapping: {
      sector_primary: "SECTOR-HEALTH-007",
      sector_secondary: [],
      interventions_primary: ["ARCH-TOT-002", "ARCH-EQUIP-010"],
      actor_roles: {
        target_actor: ["ACT-017"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: ["OF-003", "OF-006", "OF-025"],
      output_families: ["OPF-002", "OPF-014", "OPF-026"],
      sdg_primary: ["SDG_3"],
      sdg_secondary: ["SDG_16"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010", "MISS-016"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 3 score >= 0.82; safeguard rujukan Puskesmas XC-001 dipaksa tampil otomatis.",
    pass_criteria: "SDG 3 lulus Primary; Sektor Primary ter-resolve ke HEALTH-007.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-07",
    fixture_type: "gold",
    language: "en",
    page_1_input: {
      program_title: "Better Teaching, Better Learning",
      location: "Kab. Sumba Timur",
      duration_value: 24,
      duration_unit: "months",
      beneficiary_description: "Early-grade students in 30 schools",
      beneficiary_count: 3600,
      beneficiary_unit: "people",
      funding_amount: 120000,
      currency: "USD",
      donor_or_call_optional: "foundation call on foundational learning",
      program_story: "Student literacy scores are low. We will train and coach 90 early-grade teachers to apply differentiated instruction, and build teacher learning communities across schools."
    },
    expected_mapping: {
      sector_primary: "SECTOR-EDU-006",
      sector_secondary: [],
      interventions_primary: ["ARCH-TRAINING-001", "ARCH-MENTOR-003"],
      actor_roles: {
        target_actor: ["ACT-019"],
        beneficiary: ["ACT-020"]
      },
      outcome_families: ["OF-003", "OF-001"],
      output_families: ["OPF-001", "OPF-002", "OPF-021"],
      sdg_primary: ["SDG_4"],
      sdg_secondary: [],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010", "MISS-014"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 4 score >= 0.84; penalti CHILD-003 mati karena ada target guru yang mengubah praktik nyata.",
    pass_criteria: "SDG 4 lulus Primary; Sektor Primary ter-resolve ke EDU-006.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-08",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Kader Sehat Cegah Hipertensi",
      location: "Kab. Sleman",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Warga paruh baya di 10 posyandu",
      beneficiary_count: 250,
      beneficiary_unit: "orang",
      funding_amount: 45000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami melatih 30 kader Posyandu, menyediakan tensimeter digital di lokasi, dan merancang aplikasi pencatatan rujukan berbasis web terintegrasi dengan Puskesmas agar warga berisiko hipertensi dipantau pengobatannya secara rutin."
    },
    expected_mapping: {
      sector_primary: "SECTOR-HEALTH-007",
      sector_secondary: [],
      interventions_primary: ["ARCH-TOT-002", "ARCH-EQUIP-010", "ARCH-DIGDEV-007"],
      actor_roles: {
        target_actor: ["ACT-017"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: ["OF-002", "OF-006", "OF-025"],
      output_families: ["OPF-002", "OPF-014", "OPF-020"],
      sdg_primary: ["SDG_3"],
      sdg_secondary: [],
      sdg_rejected_as_primary: ["SDG_9"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010", "MISS-016"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 9 Primary ditolak karena aplikasi murni bersifat pendukung offline bagi kader posyandu.",
    pass_criteria: "SDG 3 lulus Primary; SDG 9 terbukti ditahan masuk kelompok Primary.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-09",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Sanitasi Total Berbasis Masyarakat Desa",
      location: "Kab. Grobogan",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Masyarakat di 5 desa rawan diare",
      beneficiary_count: 1500,
      beneficiary_unit: "orang",
      funding_amount: 200000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menyelenggarakan kampanye pemicuan STBM, melatih kelompok pengurus air minum desa (Wusan), mengawal pembangunan sarana tangki air bersih, and memfasilitasi deklarasi Verifikasi Bebas Buang Air Sembarangan (ODF) dinas."
    },
    expected_mapping: {
      sector_primary: "SECTOR-WASH-009",
      sector_secondary: ["SECTOR-HEALTH-007"], // Aligned with secondary
      interventions_primary: ["ARCH-FACIL-004", "ARCH-PREPAREDNESS-036"],
      actor_roles: {
        target_actor: ["ACT-030"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: ["OF-006"],
      output_families: ["OPF-011", "OPF-014"],
      sdg_primary: ["SDG_6"],
      sdg_secondary: ["SDG_3"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 6 score >= 0.85; penalti INFRA-008 ditolak karena ada verifikasi ODF formal dinas.",
    pass_criteria: "SDG 6 lulus Primary; Sektor Primary ter-resolve ke WASH-009.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-10",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Kemandirian Ekonomi Perempuan Kepala Keluarga",
      location: "Kab. Lombok Utara",
      duration_value: 18,
      duration_unit: "bulan",
      beneficiary_description: "Perempuan kepala keluarga janda/marjinal",
      beneficiary_count: 120,
      beneficiary_unit: "orang",
      funding_amount: 150000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami menyalurkan bantuan hibah modal bertahap lewat rekening, melakukan pendampingan manajemen keuangan bisnis PEKKA, and memfasilitasi pelibatan aktif hak suara perempuan dalam musyawarah desa agar memiliki kontrol keputusan atas ekonomi."
    },
    expected_mapping: {
      sector_primary: "SECTOR-GEWE-017",
      sector_secondary: [],
      interventions_primary: ["ARCH-MENTOR-003"],
      actor_roles: {
        target_actor: ["ACT-014"],
        beneficiary: ["ACT-014"]
      },
      outcome_families: ["OF-009", "OF-019"],
      output_families: ["OPF-002", "OPF-022"],
      sdg_primary: ["SDG_5", "SDG_8"],
      sdg_secondary: ["SDG_1"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 5 lulus Primary bersama SDG 8 (Dual Primary) karena ada outcome kontrol keputusan (OF-019).",
    pass_criteria: "Penalti WOMAN-002 tidak memblokir SDG 5 masuk Primary karena program memenuhi kualifikasi kesetaraan relasi musyawarah.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-11",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Sekolah Lapang Iklim Tani Tangguh",
      location: "Kab. Indramayu",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Petani padi sawah irigasi teknis",
      beneficiary_count: 300,
      beneficiary_unit: "orang",
      funding_amount: 140000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Kami memfasilitasi sekolah lapang iklim tani secara rutin, mengajari pemanfaatan data perkiraan BMKG, mengawal adopsi benih varietas padi gogo toleran panas, and memasang satu unit sensor cuaca digital di desa."
    },
    expected_mapping: {
      sector_primary: "SECTOR-CCA-010",
      sector_secondary: ["SECTOR-AGRI-001"], // Custom aligned secondary
      interventions_primary: ["ARCH-TRAINING-001", "ARCH-PREPAREDNESS-036"],
      actor_roles: {
        target_actor: ["ACT-001"],
        beneficiary: ["ACT-001"]
      },
      outcome_families: ["OF-022"],
      output_families: ["OPF-001", "OPF-002", "OPF-014"],
      sdg_primary: ["SDG_13"],
      sdg_secondary: ["SDG_2"],
      sdg_rejected_as_primary: [],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 13 score >= 0.81; penalti CLIMATE-005 tidak aktif karena didukung penuh oleh outcome resiliensi (OF-022).",
    pass_criteria: "SDG 13 lulus Primary; Sektor Primary ter-resolve ke CCA-010.",
    epistemic_label: "CANONICAL_IMPACTORY"
  },
  {
    fixture_id: "FIX-GOLD-12",
    fixture_type: "gold",
    language: "id",
    page_1_input: {
      program_title: "Aplikasi Lapor Mandiri SP4N",
      location: "Kota Cimahi",
      duration_value: 12,
      duration_unit: "bulan",
      beneficiary_description: "Warga kota pelapor pengaduan",
      beneficiary_count: 5000,
      beneficiary_unit: "orang",
      funding_amount: 220000000,
      currency: "IDR",
      donor_or_call_optional: null,
      program_story: "Membangun portal pengaduan warga digital, meluncurkan sistem integrasi SP4N-LAPOR, menyusun SOP respons tindak lanjut dinas, and melatih petugas admin di 5 OPD kota agar pengaduan warga selesai ditindaklanjuti dalam waktu 3 hari."
    },
    expected_mapping: {
      sector_primary: "SECTOR-CIVTECH-022",
      sector_secondary: [],
      interventions_primary: ["ARCH-DIGDEV-007", "ARCH-CAPACITY-018"],
      actor_roles: {
        target_actor: ["ACT-027"],
        beneficiary: ["ACT-021"]
      },
      outcome_families: ["OF-019"],
      output_families: ["OPF-010", "OPF-020", "OPF-026"],
      sdg_primary: ["SDG_16"],
      sdg_secondary: [],
      sdg_rejected_as_primary: ["SDG_9"],
      warnings_expected: [],
      missing_information_expected: ["MISS-010"]
    },
    anti_signal_ids: [],
    expected_confidence_behavior: "SDG 16 score >= 0.80; SDG 9 Primary ditolak masuk karena hanya berupa platform pendukung offline dinas.",
    pass_criteria: "SDG 16 lulus Primary; Sektor Primary ter-resolve ke CIVTECH-022.",
    epistemic_label: "CANONICAL_IMPACTORY"
  }
];
