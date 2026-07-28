/**
 * AUTO-GENERATED ONTOLOGY REGISTRY — DO NOT EDIT DIRECTLY
 * Generated At: 2026-07-26T22:47:18.770Z
 * Ontology Version: 0.1.0
 * Content Hash: 440381eea1c3
 * Source Authority: ADR-0001 Rev 2 (100% YAML Derived)
 */

import type {
  InterventionArchetype,
  OutcomeFamily,
  OutputFamily,
  Sector,
  Actor,
  ProblemFamily
} from '../src/lib/grant-writer/deterministic/types';

export const ONTOLOGY_METADATA = {
  version: "0.1.0",
  contentHash: "440381eea1c3",
  generatedAt: "2026-07-26T22:47:18.772Z",
  sourceTrace: "100% YAML-derived (ontology/*.yaml)"
};

export const SECTORS: Sector[] = [
  {
    "id": "SECTOR-AGRI-001",
    "name": "panen",
    "positive_signals": [
      "panen",
      "tengkulak",
      "pupuk"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-LIVELIHOOD-002",
    "name": "UMKM",
    "positive_signals": [
      "UMKM",
      "omzet",
      "jualan",
      "modal"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-COOP-003",
    "name": "koperasi",
    "positive_signals": [
      "koperasi",
      "RAT",
      "SHU",
      "anggota"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-FININC-004",
    "name": "modal",
    "positive_signals": [
      "modal",
      "pinjaman",
      "tabungan",
      "bankable"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-SKILLS-005",
    "name": "kerja",
    "positive_signals": [
      "kerja",
      "magang",
      "sertifikasi",
      "nganggur"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-EDU-006",
    "name": "sekolah",
    "positive_signals": [
      "sekolah",
      "guru",
      "siswa",
      "belajar"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-HEALTH-007",
    "name": "puskesmas",
    "positive_signals": [
      "puskesmas",
      "kader",
      "skrining",
      "posyandu"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-NUTRI-008",
    "name": "gizi",
    "positive_signals": [
      "gizi",
      "stunting",
      "PMBA",
      "MPASI"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-WASH-009",
    "name": "air bersih",
    "positive_signals": [
      "air bersih",
      "jamban",
      "CTPS",
      "BABS"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-CCA-010",
    "name": "iklim",
    "positive_signals": [
      "iklim",
      "kekeringan",
      "adaptasi",
      "musim"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-MITIG-011",
    "name": "emisi",
    "positive_signals": [
      "emisi",
      "karbon",
      "energi bersih"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-ENV-012",
    "name": "sampah",
    "positive_signals": [
      "sampah",
      "konservasi",
      "mangrove",
      "DAS"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-DRR-013",
    "name": "bencana",
    "positive_signals": [
      "bencana",
      "siaga",
      "evakuasi",
      "Destana"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-HUM-014",
    "name": "darurat",
    "positive_signals": [
      "darurat",
      "pengungsi",
      "bantuan",
      "terdampak"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-SOCPRO-015",
    "name": "bansos",
    "positive_signals": [
      "bansos",
      "DTKS",
      "PKH",
      "tepat sasaran"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-CHILD-016",
    "name": "anak",
    "positive_signals": [
      "anak",
      "kekerasan",
      "perlindungan",
      "PATBM"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-GEWE-017",
    "name": "perempuan",
    "positive_signals": [
      "perempuan",
      "kesetaraan",
      "KDRT",
      "PEKKA"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-DISAB-018",
    "name": "disabilitas",
    "positive_signals": [
      "disabilitas",
      "aksesibilitas",
      "inklusi"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-YOUTH-019",
    "name": "pemuda",
    "positive_signals": [
      "pemuda",
      "NEET",
      "karang taruna"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-GOV-020",
    "name": "OPD",
    "positive_signals": [
      "OPD",
      "musrenbang",
      "layanan publik",
      "SAKIP"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-CSO-021",
    "name": "OMS",
    "positive_signals": [
      "OMS",
      "yayasan",
      "tata kelola",
      "audit"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-CIVTECH-022",
    "name": "lapor",
    "positive_signals": [
      "lapor",
      "platform warga",
      "partisipasi digital"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-DIGITAL-023",
    "name": "aplikasi",
    "positive_signals": [
      "aplikasi",
      "sistem",
      "digitalisasi",
      "platform"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-PEACE-024",
    "name": "konflik",
    "positive_signals": [
      "konflik",
      "damai",
      "antar-kelompok"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-MIGR-025",
    "name": "PMI",
    "positive_signals": [
      "PMI",
      "migran",
      "pengungsi",
      "prosedural"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-URBAN-026",
    "name": "kumuh",
    "positive_signals": [
      "kumuh",
      "hunian",
      "sertifikat",
      "gusur"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-RURAL-027",
    "name": "desa",
    "positive_signals": [
      "desa",
      "BUMDes",
      "dana desa",
      "musdes"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-ENERGY-028",
    "name": "listrik",
    "positive_signals": [
      "listrik",
      "PLTS",
      "energi",
      "terang"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-CSR-029",
    "name": "rantai pasok",
    "positive_signals": [
      "rantai pasok",
      "pemasok",
      "keberlanjutan bisnis"
    ],
    "negative_signals": []
  },
  {
    "id": "SECTOR-KNOW-030",
    "name": "riset",
    "positive_signals": [
      "riset",
      "kajian",
      "policy brief",
      "advokasi"
    ],
    "negative_signals": []
  }
];
export const PROBLEM_FAMILIES: ProblemFamily[] = [
  {
    "id": "PF-001",
    "name": "limited_market_access",
    "positive_signals": [
      "susah jualan",
      "tengkulak",
      "akses pasar",
      "bergantung tengkulak",
      "stok tak terserap",
      "belum masuk pasar modern",
      "tidak ada kontak pembeli",
      "kontrak jual beli",
      "pembeli",
      "limited_market_access",
      "susah jualan, tengkulak"
    ]
  },
  {
    "id": "PF-002",
    "name": "low_income",
    "positive_signals": [
      "pendapatan kecil",
      "pas-pasan",
      "omzet rendah",
      "usaha mikro",
      "pendapatan",
      "omzet",
      "low_income",
      "pendapatan kecil, pas-pasan"
    ]
  },
  {
    "id": "PF-003",
    "name": "low_margin",
    "positive_signals": [
      "harga rendah",
      "rugi",
      "margin kecil",
      "harga dimainkan pengepul",
      "low_margin",
      "harga rendah, rugi"
    ]
  },
  {
    "id": "PF-004",
    "name": "low_productivity",
    "positive_signals": [
      "hasil sedikit",
      "lambat",
      "produktivitas rendah",
      "panen sedikit",
      "low_productivity",
      "hasil sedikit, lambat"
    ]
  },
  {
    "id": "PF-005",
    "name": "weak_business_records",
    "positive_signals": [
      "belum ada pencatatan",
      "tidak mencatat keuangan",
      "pembukuan",
      "catatan usaha",
      "manajemen keuangan",
      "weak_business_records"
    ]
  },
  {
    "id": "PF-006",
    "name": "limited_finance_access",
    "positive_signals": [
      "belum bankable",
      "susah modal",
      "modal usaha",
      "akses pembiayaan",
      "hibah modal",
      "limited_finance_access",
      "belum bankable, susah modal"
    ]
  },
  {
    "id": "PF-007",
    "name": "weak_institutional_capacity",
    "positive_signals": [
      "organisasi tak jalan",
      "SOP tak ada",
      "tata kelola internal",
      "akuntabilitas keuangan",
      "kredibilitas lembaga",
      "weak_institutional_capacity",
      "organisasi tak jalan, SOP tak ada"
    ]
  },
  {
    "id": "PF-008",
    "name": "low_service_access",
    "positive_signals": [
      "layanan jauh",
      "mahal",
      "akses faskes",
      "akses sekolah",
      "low_service_access",
      "layanan jauh, mahal"
    ]
  },
  {
    "id": "PF-009",
    "name": "low_service_utilization",
    "positive_signals": [
      "ada tapi tak dipakai",
      "kurang sosialisasi",
      "pemanfaatan rendah",
      "low_service_utilization"
    ]
  },
  {
    "id": "PF-010",
    "name": "poor_service_quality",
    "positive_signals": [
      "layanan ribet",
      "lama",
      "kualitas buruk",
      "poor_service_quality",
      "layanan ribet, lama"
    ]
  },
  {
    "id": "PF-011",
    "name": "low_technology_adoption",
    "positive_signals": [
      "belum melek digital",
      "manual",
      "belum terdigitalisasi",
      "low_technology_adoption",
      "belum melek digital, manual"
    ]
  },
  {
    "id": "PF-012",
    "name": "weak_accountability",
    "positive_signals": [
      "tidak transparan",
      "keluhan diabaikan",
      "akuntabilitas publik",
      "weak_accountability",
      "tidak transparan, keluhan diabaikan"
    ]
  },
  {
    "id": "PF-013",
    "name": "limited_participation",
    "positive_signals": [
      "warga tidak didengar",
      "partisipasi rendah",
      "hak suara",
      "limited_participation"
    ]
  },
  {
    "id": "PF-014",
    "name": "exclusion_and_discrimination",
    "positive_signals": [
      "tersisih",
      "tidak dilibatkan",
      "diskriminasi",
      "kelompok terpinggirkan",
      "exclusion_and_discrimination",
      "tersisih, tidak dilibatkan"
    ]
  },
  {
    "id": "PF-015",
    "name": "skills_mismatch",
    "positive_signals": [
      "lulusan nganggur",
      "skill tak cocok",
      "pengangguran muda",
      "kompetensi kerja",
      "skills_mismatch",
      "lulusan nganggur, skill tak cocok"
    ]
  },
  {
    "id": "PF-016",
    "name": "food_insecurity",
    "positive_signals": [
      "rawan pangan",
      "makan seadanya",
      "kekurangan gizi",
      "food_insecurity",
      "rawan pangan, makan seadanya"
    ]
  },
  {
    "id": "PF-017",
    "name": "health_service_gap",
    "positive_signals": [
      "faskes jauh",
      "kader kurang",
      "hipertensi",
      "lansia",
      "penyakit tidak menular",
      "tensi darah",
      "health_service_gap",
      "faskes jauh, kader kurang"
    ]
  },
  {
    "id": "PF-018",
    "name": "learning_gap",
    "positive_signals": [
      "nilai rendah",
      "tak naik kelas",
      "literasi rendah",
      "learning gap",
      "kualitas belajar rendah",
      "guru dilatih",
      "learning_gap",
      "nilai rendah, tak naik kelas"
    ]
  },
  {
    "id": "PF-019",
    "name": "(id sama dgn 018 utk kehadiran/ATS) learning_gap-attendance",
    "positive_signals": [
      "sering bolos",
      "putus sekolah",
      "presensi rendah",
      "(id sama dgn 018 utk kehadiran/ATS) learning_gap-attendance",
      "sering bolos, putus sekolah"
    ]
  },
  {
    "id": "PF-020",
    "name": "WASH_access_gap",
    "positive_signals": [
      "air susah",
      "BABS",
      "air bersih",
      "sanitasi",
      "buang air sembarangan",
      "ODF",
      "STBM",
      "air minum",
      "tangki air",
      "jamban",
      "MCK",
      "kesulitan air",
      "WASH_access_gap",
      "air susah, BABS"
    ]
  },
  {
    "id": "PF-021",
    "name": "climate_vulnerability",
    "positive_signals": [
      "musim tak menentu",
      "gagal panen iklim",
      "perubahan iklim",
      "iklim",
      "sekolah lapang iklim",
      "sensor cuaca",
      "climate_vulnerability",
      "musim tak menentu, gagal panen iklim"
    ]
  },
  {
    "id": "PF-022",
    "name": "environmental_degradation",
    "positive_signals": [
      "sampah",
      "banjir kiriman",
      "hutan gundul",
      "pencemaran",
      "environmental_degradation",
      "sampah, banjir kiriman, hutan gundul"
    ]
  },
  {
    "id": "PF-023",
    "name": "disaster_vulnerability",
    "positive_signals": [
      "rawan bencana",
      "tak siap",
      "kebencanaan",
      "peringatan dini",
      "disaster_vulnerability",
      "rawan bencana, tak siap"
    ]
  },
  {
    "id": "PF-024",
    "name": "weak_protection_response",
    "positive_signals": [
      "kasus tak ditangani",
      "kekerasan",
      "perlindungan anak",
      "perlindungan perempuan",
      "weak_protection_response"
    ]
  },
  {
    "id": "PF-025",
    "name": "policy_implementation_gap",
    "positive_signals": [
      "perda ada tapi tak jalan",
      "pelaksanaan kebijakan",
      "policy_implementation_gap"
    ]
  },
  {
    "id": "PF-026",
    "name": "data_fragmentation",
    "positive_signals": [
      "data berantakan",
      "tak terpakai",
      "fragmentasi data",
      "data_fragmentation",
      "data berantakan, tak terpakai"
    ]
  },
  {
    "id": "PF-027",
    "name": "weak_evidence_use",
    "positive_signals": [
      "keputusan tanpa data",
      "bukti kurang",
      "weak_evidence_use"
    ]
  },
  {
    "id": "PF-028",
    "name": "coordination_gap",
    "positive_signals": [
      "program tumpang tindih",
      "koordinasi lemah",
      "coordination_gap"
    ]
  },
  {
    "id": "PF-029",
    "name": "infrastructure_gap",
    "positive_signals": [
      "jalan/sarana rusak/tak ada",
      "jalan rusak",
      "sarana tak ada",
      "infrastruktur rusak",
      "infrastructure_gap"
    ]
  }
];
export const OUTCOME_FAMILIES: OutcomeFamily[] = [
  {
    "outcome_family_id": "OF-001",
    "canonical_name_id": "pengetahuan_meningkat",
    "canonical_name_en": "knowledge_increased",
    "definition": "Peningkatan pemahaman kognitif kelompok sasaran terhadap konsep, metodologi, atau isu tertentu.",
    "allowed_target_actor_types": [
      "ACT-019",
      "ACT-017",
      "ACT-001",
      "ACT-007"
    ],
    "positive_predicates_id": [
      "paham",
      "mengerti",
      "memiliki wawasan",
      "sadar",
      "skor literasi",
      "literasi siswa",
      "pengetahuan_meningkat"
    ],
    "positive_predicates_en": [
      "understands",
      "aware",
      "acquired knowledge",
      "literacy scores",
      "student literacy",
      "reading scores"
    ],
    "object_of_change_ids": [
      "wawasan teoritis",
      "skor pre-post test"
    ],
    "negative_signals": [
      "menghadiri kelas"
    ],
    "anti_signals": [
      "SDG-ANTI-TRAINING-006"
    ],
    "minimum_evidence": "Hasil rekapitulasi penilaian ujian kognitif pre-test dan post-test",
    "likely_sectors": [
      "SECTOR-EDU-006",
      "SECTOR-HEALTH-007"
    ],
    "likely_archetypes": [
      "ARCH-TRAINING-001",
      "ARCH-AWARE-006"
    ],
    "indicator_family_ids": [
      "IND-EDU-TEACH-013"
    ],
    "sdg_affinities": [],
    "time_horizon_guidance": "Sekejap paska pelatihan (1-2 hari)",
    "common_output_confusions": [
      "OPF-001",
      "OPF-002"
    ],
    "common_activity_confusions": [
      "kegiatan penyuluhan"
    ],
    "causal_leap_risks": [
      "ANTI-01",
      "ANTI-12"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-002",
    "canonical_name_id": "keahlian_dikuasai",
    "canonical_name_en": "skill_retained",
    "definition": "Penguasaan keahlian psikomotorik atau kompetensi teknis praktis yang terverifikasi melalui uji kompetensi.",
    "allowed_target_actor_types": [
      "ACT-019",
      "ACT-007",
      "ACT-016"
    ],
    "positive_predicates_id": [
      "mampu mempraktikkan",
      "terampil",
      "menguasai metode",
      "cakap",
      "sertifikasi kompetensi",
      "kompetensi teknisi",
      "sertifikasi",
      "keahlian_dikuasai"
    ],
    "positive_predicates_en": [
      "competent",
      "mastered",
      "skilled",
      "capable"
    ],
    "object_of_change_ids": [
      "skor unjuk kerja",
      "pencatatan teknis"
    ],
    "negative_signals": [
      "memiliki sertifikat kehadiran"
    ],
    "anti_signals": [
      "SDG-ANTI-TRAINING-006"
    ],
    "minimum_evidence": "Rubrik lembar penilaian uji kompetensi praktik langsung",
    "likely_sectors": [
      "SECTOR-SKILLS-005",
      "SECTOR-EDU-006"
    ],
    "likely_archetypes": [
      "ARCH-TRAINING-001",
      "ARCH-TOT-002"
    ],
    "indicator_family_ids": [
      "IND-HLTH-CAPAC-056"
    ],
    "sdg_affinities": [],
    "time_horizon_guidance": "1-4 minggu paska intervensi teknis",
    "common_output_confusions": [
      "OPF-002"
    ],
    "common_activity_confusions": [
      "sesi praktikum"
    ],
    "causal_leap_risks": [
      "ANTI-01"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-003",
    "canonical_name_id": "praktik_diadopsi",
    "canonical_name_en": "practice_adopted",
    "definition": "Penerapan kompetensi baru secara konsisten di dalam rutinitas kerja sehari-hari oleh kelompok sasaran.",
    "allowed_target_actor_types": [
      "ACT-019",
      "ACT-001",
      "ACT-017",
      "ACT-007"
    ],
    "positive_predicates_id": [
      "mengadopsi",
      "mempraktikkan rutin",
      "rutin mencatat",
      "rutin menyusui",
      "praktik_diadopsi"
    ],
    "positive_predicates_en": [
      "routinely applies",
      "adopted practice",
      "systematically registers",
      "apply differentiated instruction",
      "apply differentiated",
      "differentiated instruction"
    ],
    "object_of_change_ids": [
      "rutinitas harian",
      "buku pencatatan"
    ],
    "negative_signals": [
      "mengetahui cara"
    ],
    "anti_signals": [],
    "minimum_evidence": "Observasi berkala tim penilai independen di lapangan",
    "likely_sectors": [
      "SECTOR-AGRI-001",
      "SECTOR-LIVELIHOOD-002",
      "SECTOR-EDU-006",
      "SECTOR-CCA-010"
    ],
    "likely_archetypes": [
      "ARCH-MENTOR-003",
      "ARCH-BCC-005"
    ],
    "indicator_family_ids": [
      "IND-MSME-PRACT-002",
      "IND-AGRI-ADOPT-009",
      "IND-EDU-TEACH-013",
      "IND-CCA-PRACT-023"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_4",
        "official_target_ids": [
          "4.1"
        ],
        "condition": "Bila target actor adalah guru"
      }
    ],
    "time_horizon_guidance": "3-6 bulan paska pendampingan rutin",
    "common_output_confusions": [
      "OPF-002",
      "OPF-009"
    ],
    "common_activity_confusions": [
      "praktik terbimbing"
    ],
    "causal_leap_risks": [
      "ANTI-01",
      "ANTI-12"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-004",
    "canonical_name_id": "teknologi_digunakan",
    "canonical_name_en": "technology_used",
    "definition": "Penggunaan alat produksi atau platform digital secara aktif oleh pengguna akhir dalam frekuensi normal.",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-007",
      "ACT-027"
    ],
    "positive_predicates_id": [
      "menggunakan alat",
      "mengoperasikan mesin",
      "login aktif",
      "bertransaksi digital",
      "teknologi_digunakan"
    ],
    "positive_predicates_en": [
      "routinely operates",
      "active usage",
      "logged in actively"
    ],
    "object_of_change_ids": [
      "utilitas mesin",
      "log aplikasi MAU"
    ],
    "negative_signals": [
      "menerima pembagian mesin"
    ],
    "anti_signals": [
      "SDG-ANTI-DIGITAL-004"
    ],
    "minimum_evidence": "Data analitik digital (MAU/DAU) atau lembar log utilitas jam mesin",
    "likely_sectors": [
      "SECTOR-DIGITAL-023",
      "SECTOR-AGRI-001"
    ],
    "likely_archetypes": [
      "ARCH-DIGDEV-007",
      "ARCH-EQUIP-010"
    ],
    "indicator_family_ids": [
      "IND-DIG-MAU-043",
      "IND-MSME-DIGTX-003"
    ],
    "sdg_affinities": [],
    "time_horizon_guidance": "3-12 bulan paska go-live/serah terima",
    "common_output_confusions": [
      "OPF-006",
      "OPF-014",
      "OPF-020"
    ],
    "common_activity_confusions": [
      "instalasi hardware"
    ],
    "causal_leap_risks": [
      "ANTI-03",
      "ANTI-06"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-005",
    "canonical_name_id": "layanan_diakses",
    "canonical_name_en": "service_accessed",
    "definition": "Pencapaian akses fisik, finansial, atau prosedural ke titik layanan publik oleh kelompok sasaran terpinggirkan.",
    "allowed_target_actor_types": [
      "ACT-010",
      "ACT-011",
      "ACT-015",
      "ACT-022"
    ],
    "positive_predicates_id": [
      "mengakses faskes",
      "mendaftar sekolah",
      "mendapat rujukan",
      "terdaftar layanan",
      "layanan_diakses"
    ],
    "positive_predicates_en": [
      "accessed facility",
      "registered to service",
      "referred successfully"
    ],
    "object_of_change_ids": [
      "jarak tempuh",
      "registrasi pendaftaran"
    ],
    "negative_signals": [
      "berdirinya gedung baru"
    ],
    "anti_signals": [],
    "minimum_evidence": "Buku register kunjungan instansi formal mitra",
    "likely_sectors": [
      "SECTOR-HEALTH-007",
      "SECTOR-EDU-006",
      "SECTOR-WASH-009"
    ],
    "likely_archetypes": [
      "ARCH-EQUIP-010",
      "ARCH-FACIL-004"
    ],
    "indicator_family_ids": [
      "IND-EDU-ATS-015"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_1",
        "official_target_ids": [
          "1.4"
        ],
        "condition": "Konteks kemiskinan"
      }
    ],
    "time_horizon_guidance": "1-6 bulan",
    "common_output_confusions": [
      "OPF-015"
    ],
    "common_activity_confusions": [
      "pembukaan loket pendaftaran"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-006",
    "canonical_name_id": "layanan_digunakan_rutin",
    "canonical_name_en": "service_utilized_routinely",
    "definition": "Kelompok sasaran menggunakan layanan secara berkala untuk memenuhi standar hidup dasarminimum yang layak.",
    "allowed_target_actor_types": [
      "ACT-010",
      "ACT-011",
      "ACT-021"
    ],
    "positive_predicates_id": [
      "rutin berkunjung",
      "imunisasi lengkap",
      "menggunakan jamban sehat",
      "menyetor sampah",
      "bebas buang air sembarangan",
      "verifikasi odf",
      "deklarasi odf",
      "odf",
      "mengakses air bersih",
      "akses air bersih",
      "akses air minum layak",
      "akses air layak",
      "menggunakan air perpipaan",
      "terlayani jaringan air",
      "berlangganan layanan air",
      "layanan_digunakan_rutin"
    ],
    "positive_predicates_en": [
      "regularly utilizes",
      "complete immunization",
      "routinely uses toilets",
      "accesses safe drinking water",
      "uses piped water supply"
    ],
    "object_of_change_ids": [
      "frekuensi berkala",
      "volume konsumsi/pasokan"
    ],
    "negative_signals": [
      "pernah berkunjung sekali"
    ],
    "anti_signals": [],
    "minimum_evidence": "Kartu KMS Posyandu, log pemeliharaan air bersih, atau kuesioner utilitas berkala",
    "likely_sectors": [
      "SECTOR-HEALTH-007",
      "SECTOR-WASH-009",
      "SECTOR-ENERGY-028"
    ],
    "likely_archetypes": [
      "ARCH-BCC-005",
      "ARCH-EQUIP-010"
    ],
    "indicator_family_ids": [
      "IND-HLTH-UTIL-016",
      "IND-WASH-USE-018",
      "IND-ENERGY-USE-042"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_3",
        "official_target_ids": [
          "3.8"
        ],
        "condition": "Layanan kesehatan"
      },
      {
        "sdg_id": "SDG_6",
        "official_target_ids": [
          "6.1",
          "6.2"
        ],
        "condition": "Layanan air/sanitasi"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-015",
      "OPF-011"
    ],
    "common_activity_confusions": [
      "sosialisasi pembukaan layanan"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-007",
    "canonical_name_id": "kualitas_layanan_meningkat",
    "canonical_name_en": "service_quality_improved",
    "definition": "Pemberi layanan meningkatkan waktu respons, akurasi penanganan, dan tingkat kepuasan warga.",
    "allowed_target_actor_types": [
      "ACT-027",
      "ACT-028",
      "ACT-029"
    ],
    "positive_predicates_id": [
      "layanan lebih cepat",
      "keluhan direspon",
      "kepuasan meningkat",
      "kualitas_layanan_meningkat"
    ],
    "positive_predicates_en": [
      "faster response",
      "complaints resolved",
      "satisfaction index grew"
    ],
    "object_of_change_ids": [
      "indeks kepuasan SP4N-LAPOR",
      "SLA waktu tanggap"
    ],
    "negative_signals": [
      "SOP disahkan"
    ],
    "anti_signals": [],
    "minimum_evidence": "Data survei kepuasan pelanggan independen semesteran",
    "likely_sectors": [
      "SECTOR-GOV-020",
      "SECTOR-CIVTECH-022"
    ],
    "likely_archetypes": [
      "ARCH-CAPACITY-018",
      "ARCH-DIGDEV-007"
    ],
    "indicator_family_ids": [
      "IND-GOV-SVC-022"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.6"
        ],
        "condition": "Peningkatan mutu kepuasan 16.6.2"
      }
    ],
    "time_horizon_guidance": "6-18 bulan",
    "common_output_confusions": [
      "OPF-009",
      "OPF-010"
    ],
    "common_activity_confusions": [
      "pembagian kuesioner kepuasan"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-008",
    "canonical_name_id": "akses_pasar_membaik",
    "canonical_name_en": "market_access_improved",
    "definition": "Petani/UMKM melakukan transaksi perdagangan rutin ke kanal pasar formal dengan harga jual yang disepakati bersama.",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-007",
      "ACT-008"
    ],
    "positive_predicates_id": [
      "menjual langsung ke pembeli",
      "mengapalkan produk",
      "kontrak disepakati",
      "kontrak jual beli",
      "pks jual beli",
      "dokumen kontrak",
      "akses_pasar_membaik"
    ],
    "positive_predicates_en": [
      "routinely supplies",
      "finalized trade contract",
      "direct sales modern trade"
    ],
    "object_of_change_ids": [
      "volume pasokan bulanan",
      "kontrak kerja sama aktif"
    ],
    "negative_signals": [
      "MoU tanpa pengiriman barang"
    ],
    "anti_signals": [],
    "minimum_evidence": "Arsip surat jalan PO (Purchase Order) + kuitansi pembayaran modern trade",
    "likely_sectors": [
      "SECTOR-AGRI-001",
      "SECTOR-LIVELIHOOD-002",
      "SECTOR-COOP-003"
    ],
    "likely_archetypes": [
      "ARCH-MARKET-015"
    ],
    "indicator_family_ids": [
      "IND-AGRI-PRICE-011"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.3"
        ],
        "condition": "Nelayan/petani kecil"
      },
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.3"
        ],
        "condition": "Konteks integrasi UMKM"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-023"
    ],
    "common_activity_confusions": [
      "pertemuan silaturahmi dengan offtaker"
    ],
    "causal_leap_risks": [
      "ANTI-01"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-009",
    "canonical_name_id": "pendapatan_membaik",
    "canonical_name_en": "income_improved",
    "definition": "Peningkatan pendapatan/omzet riil aktor sasaran dari aktivitas ekonomi yang didukung program, terverifikasi terhadap baseline.",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-007",
      "ACT-008",
      "ACT-012",
      "ACT-014"
    ],
    "positive_predicates_id": [
      "pendapatan meningkat",
      "omzet naik",
      "penghasilan bertambah",
      "pendapatan_membaik"
    ],
    "positive_predicates_en": [
      "income increased",
      "revenue grew"
    ],
    "object_of_change_ids": [
      "pendapatan/omzet usaha atau rumah tangga"
    ],
    "negative_signals": [
      "omzet musim ramai tanpa baseline setara"
    ],
    "anti_signals": [
      "klaim % naik tanpa baseline (HN-57)"
    ],
    "minimum_evidence": "catatan penjualan/pendapatan + baseline musim setara (IND-MSME-REV-001 logic)",
    "likely_sectors": [
      "SECTOR-LIVELIHOOD-002",
      "SECTOR-AGRI-001",
      "SECTOR-GEWE-017"
    ],
    "likely_archetypes": [
      "ARCH-TRAINING-001",
      "ARCH-MENTOR-003",
      "ARCH-MARKET-015",
      "ARCH-A2F-013",
      "ARCH-GRANTS-012"
    ],
    "indicator_family_ids": [
      "IND-MSME-REV-001",
      "IND-AGRI-PRICE-011",
      "IND-MSME-JOB-004"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.3"
        ],
        "condition": "Usaha kecil"
      },
      {
        "sdg_id": "SDG_1",
        "official_target_ids": [
          "1.4"
        ],
        "condition": "Kelompok miskin"
      },
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.3"
        ],
        "condition": "Petani kecil"
      }
    ],
    "time_horizon_guidance": "12–18 bulan; hati-hati musiman",
    "common_output_confusions": [
      "dana tersalur (OPF-022)",
      "pelatihan selesai"
    ],
    "common_activity_confusions": [
      "kegiatan pemasaran"
    ],
    "causal_leap_risks": [
      "ANTI-01",
      "ANTI-08"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-010",
    "canonical_name_id": "margin_membaik",
    "canonical_name_en": "margin_improved",
    "definition": "Peningkatan laba bersih produsen dengan menekan kerugian paska panen atau memotong perantara asimetri informasi.",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-007",
      "ACT-008"
    ],
    "positive_predicates_id": [
      "laba bersih naik",
      "harga per kg meningkat",
      "susut panen berkurang",
      "margin harga",
      "margin harga stabil",
      "harga stabil",
      "margin_membaik"
    ],
    "positive_predicates_en": [
      "net margin increased",
      "profit margins rose",
      "post-harvest loss minimized"
    ],
    "object_of_change_ids": [
      "selisih harga jual dan pokok produksi",
      "persentase susut tonase"
    ],
    "negative_signals": [
      "harga komoditas pasar nasional naik secara umum di luar kendali program"
    ],
    "anti_signals": [],
    "minimum_evidence": "Buku kas rugi laba bulanan pelaku usaha",
    "likely_sectors": [
      "SECTOR-AGRI-001",
      "SECTOR-LIVELIHOOD-002"
    ],
    "likely_archetypes": [
      "ARCH-MARKET-015",
      "ARCH-EQUIP-010"
    ],
    "indicator_family_ids": [
      "IND-AGRI-PRICE-011",
      "IND-AGRI-LOSS-054"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.3"
        ],
        "condition": "Petani/nelayan kecil"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-023"
    ],
    "common_activity_confusions": [
      "audit harga pasar"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-011",
    "canonical_name_id": "produktivitas_meningkat",
    "canonical_name_en": "productivity_improved",
    "definition": "Peningkatan hasil keluaran per satuan unit input secara berkelanjutan (misal: tonase panen per hektar).",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-007"
    ],
    "positive_predicates_id": [
      "hasil panen meningkat",
      "yield naik",
      "kapasitas produksi harian bertambah",
      "produktivitas_meningkat"
    ],
    "positive_predicates_en": [
      "yield per hectare increased",
      "daily production capacity grew"
    ],
    "object_of_change_ids": [
      "ton per hektar",
      "unit output per jam kerja"
    ],
    "negative_signals": [
      "lahan diperluas secara fisik (itu ekstensifikasi",
      "bukan produktivitas)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Laporan ubinan panen dinas pertanian daerah / lembar log produksi pabrik",
    "likely_sectors": [
      "SECTOR-AGRI-001",
      "SECTOR-LIVELIHOOD-002"
    ],
    "likely_archetypes": [
      "ARCH-EQUIP-010",
      "ARCH-TRAINING-001"
    ],
    "indicator_family_ids": [
      "IND-AGRI-YIELD-010"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.3"
        ],
        "condition": "Petani kecil"
      },
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.2"
        ],
        "condition": "Diversifikasi teknologi"
      }
    ],
    "time_horizon_guidance": "1 siklus musim panen penuh (3-6 bulan)",
    "common_output_confusions": [
      "OPF-014"
    ],
    "common_activity_confusions": [
      "pembajakan sawah bersama"
    ],
    "causal_leap_risks": [
      "ANTI-03"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-012",
    "canonical_name_id": "kinerja_usaha_membaik",
    "canonical_name_en": "business_performance_improved",
    "definition": "Unit usaha (UMKM atau Koperasi) mencapai kesehatan finansial, pertumbuhan neraca, dan penciptaan lapangan kerja baru.",
    "allowed_target_actor_types": [
      "ACT-007",
      "ACT-005",
      "ACT-006"
    ],
    "positive_predicates_id": [
      "kelayakan kredit naik",
      "penyerapan tenaga kerja bertambah",
      "koperasi berkembang",
      "kinerja_usaha_membaik"
    ],
    "positive_predicates_en": [
      "credit rating improved",
      "formal jobs created",
      "cooperative assets grew"
    ],
    "object_of_change_ids": [
      "jumlah karyawan formal baru",
      "nilai neraca aset tahunan"
    ],
    "negative_signals": [],
    "anti_signals": [],
    "minimum_evidence": "Arsip laporan SPT tahunan usaha atau dokumen neraca audited Koperasi",
    "likely_sectors": [
      "SECTOR-LIVELIHOOD-002",
      "SECTOR-COOP-003"
    ],
    "likely_archetypes": [
      "ARCH-CAPACITY-018",
      "ARCH-MARKET-015"
    ],
    "indicator_family_ids": [
      "IND-MSME-REV-001",
      "IND-MSME-JOB-004"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.3",
          "8.5"
        ],
        "condition": "Pengembangan usaha"
      }
    ],
    "time_horizon_guidance": "12-24 bulan",
    "common_output_confusions": [
      "OPF-010"
    ],
    "common_activity_confusions": [
      "pembuatan logo merek baru"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-013",
    "canonical_name_id": "pekerjaan_diperoleh",
    "canonical_name_en": "employment_obtained",
    "definition": "Pencari kerja atau pemuda NEET berhasil mendapatkan kontrak kerja formal minimal 6 bulan paska intervensi.",
    "allowed_target_actor_types": [
      "ACT-016",
      "ACT-010"
    ],
    "positive_predicates_id": [
      "bekerja formal",
      "terserap industri",
      "mendapat kontrak kerja",
      "diterima magang",
      "program magang",
      "magang industri",
      "menyalurkan lulusan",
      "pekerjaan_diperoleh"
    ],
    "positive_predicates_en": [
      "employed formally",
      "signed employment contract",
      "hired",
      "transitioned to work"
    ],
    "object_of_change_ids": [
      "jumlah bulan slip gaji rutin",
      "surat keputusan penerimaan kerja"
    ],
    "negative_signals": [
      "menerima sertifikat kompetensi tanpa kontrak kerja"
    ],
    "anti_signals": [],
    "minimum_evidence": "Surat kontrak kerja resmi yang diverifikasi lewat tracer study bulan ke-6",
    "likely_sectors": [
      "SECTOR-SKILLS-005",
      "SECTOR-YOUTH-019"
    ],
    "likely_archetypes": [
      "ARCH-TRAINING-001",
      "ARCH-TOT-002"
    ],
    "indicator_family_ids": [
      "IND-SKILLS-JOB6-029",
      "IND-YOUTH-NEET-035"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.5",
          "8.6"
        ],
        "condition": "Pemuda NEET/Pekerjaan Layak"
      }
    ],
    "time_horizon_guidance": "6-12 bulan paska kelulusan kelas pelatihan",
    "common_output_confusions": [
      "OPF-002",
      "OPF-024"
    ],
    "common_activity_confusions": [
      "sesi bursa kerja (job fair)"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-014",
    "canonical_name_id": "kinerja_institusi_membaik",
    "canonical_name_en": "institutional_performance_improved",
    "definition": "Lembaga masyarakat, koperasi, atau kantor pemda mencapai transparansi pelaporan keuangan dan opini audit wajar.",
    "allowed_target_actor_types": [
      "ACT-025",
      "ACT-005",
      "ACT-006",
      "ACT-027"
    ],
    "positive_predicates_id": [
      "laporan keuangan wajar",
      "kapasitas organisasi naik",
      "akuntabilitas terjamin",
      "audit akuntabilitas",
      "akuntabilitas keuangan",
      "tata kelola internal",
      "kinerja_institusi_membaik"
    ],
    "positive_predicates_en": [
      "unqualified audit opinion",
      "compliance index improved",
      "capacity score increased"
    ],
    "object_of_change_ids": [
      "indeks penilaian kapasitas OCA",
      "opini KAP keuangan"
    ],
    "negative_signals": [
      "SOP sekedar disusun di laci"
    ],
    "anti_signals": [],
    "minimum_evidence": "Sertifikat audit kepatuhan eksternal independen / piagam OCA",
    "likely_sectors": [
      "SECTOR-CSO-021",
      "SECTOR-COOP-003",
      "SECTOR-GOV-020"
    ],
    "likely_archetypes": [
      "ARCH-CAPACITY-018"
    ],
    "indicator_family_ids": [
      "IND-CSO-AUDIT-005",
      "IND-CSO-FUND-006",
      "IND-CSO-PRACT-007",
      "IND-COOP-RAT-025",
      "IND-RURAL-BUMDES-050"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.6"
        ],
        "condition": "Kredibilitas lembaga"
      },
      {
        "sdg_id": "SDG_17",
        "official_target_ids": [
          "17.17"
        ],
        "condition": "Kemitraan OMS"
      }
    ],
    "time_horizon_guidance": "12-18 bulan",
    "common_output_confusions": [
      "OPF-009",
      "OPF-010"
    ],
    "common_activity_confusions": [
      "kegiatan rapat koordinasi"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-015",
    "canonical_name_id": "keputusan_berbasis_bukti",
    "canonical_name_en": "data_informed_decision_making",
    "definition": "Pemangku kebijakan menggunakan dashboard terintegrasi untuk menyusun alokasi program kerja daerah nyata paska integrasi.",
    "allowed_target_actor_types": [
      "ACT-026",
      "ACT-027"
    ],
    "positive_predicates_id": [
      "menggunakan dashboard keputusan",
      "kebijakan berbasis data",
      "alokasi berbasis peta",
      "keputusan_berbasis_bukti"
    ],
    "positive_predicates_en": [
      "decided based on dashboard",
      "policy informed by evidence",
      "data-driven budget allocation"
    ],
    "object_of_change_ids": [
      "dokumen usulan APBD",
      "notulen rapat kabinet daerah"
    ],
    "negative_signals": [
      "dashboard sekadar diinstal tanpa riwayat login berkala pimpinan"
    ],
    "anti_signals": [
      "SDG-ANTI-DIGITAL-004"
    ],
    "minimum_evidence": "Kutipan dokumen RKPD daerah resmi yang mereferensikan analisis dashboard data program",
    "likely_sectors": [
      "SECTOR-GOV-020",
      "SECTOR-DIGITAL-023"
    ],
    "likely_archetypes": [
      "ARCH-DASH-009"
    ],
    "indicator_family_ids": [
      "IND-GOV-SVC-022"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.6"
        ],
        "condition": "Responsivitas data"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-007",
      "OPF-008"
    ],
    "common_activity_confusions": [
      "serah terima password admin"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-016",
    "canonical_name_id": "partisipasi_warga_meningkat",
    "canonical_name_en": "participation_improved",
    "definition": "Warga sipil terpinggirkan berhasil memasukkan aspirasi tertulis ke dalam draf persetujuan anggaran pembangunan formal.",
    "allowed_target_actor_types": [
      "ACT-021",
      "ACT-031",
      "ACT-010"
    ],
    "positive_predicates_id": [
      "menyampaikan usulan",
      "suara didengar",
      "usulan masuk RKPD",
      "terlibat aktif rembuk",
      "partisipasi_warga_meningkat"
    ],
    "positive_predicates_en": [
      "proposals included in planning",
      "active citizen participation",
      "voice incorporated"
    ],
    "object_of_change_ids": [
      "jumlah lembar usulan warga yang disetujui",
      "notulen musrenbang resmi"
    ],
    "negative_signals": [
      "hadir musrenbang tanpa berbicara/usul (hanya sekadar tanda tangan daftar hadir)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Dokumen berita acara Musrenbangdes tertanda tangan perwakilan warga marjinal",
    "likely_sectors": [
      "SECTOR-GOV-020",
      "SECTOR-CIVTECH-022"
    ],
    "likely_archetypes": [
      "ARCH-FACIL-004"
    ],
    "indicator_family_ids": [
      "IND-CIVIC-ACTIVE-020",
      "IND-GOV-BUDGET-046"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.7"
        ],
        "condition": "Keterwakilan inklusif 16.7.2"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-018",
      "OPF-021"
    ],
    "common_activity_confusions": [
      "penyediaan konsumsi rembuk"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-017",
    "canonical_name_id": "kebijakan_dijalankan",
    "canonical_name_en": "policy_implemented",
    "definition": "Peraturan yang telah disahkan terverifikasi diimplementasikan dengan adanya alokasi anggaran dan tim pelaksana khusus.",
    "allowed_target_actor_types": [
      "ACT-026",
      "ACT-027"
    ],
    "positive_predicates_id": [
      "perda berjalan",
      "regulasi ditegakkan",
      "anggaran dialokasikan perda",
      "kebijakan_dijalankan"
    ],
    "positive_predicates_en": [
      "policy enforced",
      "budget allocated to regulation",
      "execution team formed"
    ],
    "object_of_change_ids": [
      "nilai DPA APBD pelaksanaan regulasi",
      "laporan pengawasan penegakan SK"
    ],
    "negative_signals": [
      "perda disahkan tanpa anggaran turunan (SOP kosong)"
    ],
    "anti_signals": [
      "SDG-ANTI-POLICYDOC-012"
    ],
    "minimum_evidence": "Arsip lembar dokumen DPA pelaksanaan perda/regulasi resmi dinas terkait",
    "likely_sectors": [
      "SECTOR-GOV-020",
      "SECTOR-KNOW-030"
    ],
    "likely_archetypes": [
      "ARCH-POLICY-019"
    ],
    "indicator_family_ids": [
      "IND-CIVTECH-INST-045"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.6"
        ],
        "condition": "Kinerja kepatuhan formal"
      }
    ],
    "time_horizon_guidance": "12-24 bulan paska pengesahan naskah",
    "common_output_confusions": [
      "OPF-019",
      "OPF-018"
    ],
    "common_activity_confusions": [
      "sosialisasi naskah perda"
    ],
    "causal_leap_risks": [
      "ANTI-05"
    ],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-018",
    "canonical_name_id": "kepatuhan_mitra_meningkat",
    "canonical_name_en": "compliance_improved",
    "definition": "Pemasok atau mitra rantai pasok menerapkan prinsip etika bisnis dan standar keberlanjutan yang diaudit berkala.",
    "allowed_target_actor_types": [
      "ACT-033",
      "ACT-007"
    ],
    "positive_predicates_id": [
      "lulus audit CSR",
      "mematuhi standar ketenagakerjaan",
      "sertifikasi berkelanjutan diperoleh",
      "kepatuhan_mitra_meningkat"
    ],
    "positive_predicates_en": [
      "passed sustainability audit",
      "complies with labor standards",
      "certified sustainable"
    ],
    "object_of_change_ids": [
      "persentase kepatuhan pasokan",
      "opini audit eksternal CSR"
    ],
    "negative_signals": [
      "menandatangani kode etik kemitraan tanpa audit kepatuhan lapangan"
    ],
    "anti_signals": [],
    "minimum_evidence": "Sertifikat kelulusan audit keberlanjutan dari lembaga sertifikasi independen",
    "likely_sectors": [
      "SECTOR-CSR-029",
      "SECTOR-ENV-012"
    ],
    "likely_archetypes": [
      "ARCH-CAPACITY-018"
    ],
    "indicator_family_ids": [
      "IND-CSR-SUPPLIER-051"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_12",
        "official_target_ids": [
          "12.6"
        ],
        "condition": "Pelaporan berkelanjutan perusahaan"
      },
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.8"
        ],
        "condition": "Hak ketenagakerjaan"
      }
    ],
    "time_horizon_guidance": "12-18 bulan",
    "common_output_confusions": [
      "OPF-021"
    ],
    "common_activity_confusions": [
      "rapat sosialisasi kode etik"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-019",
    "canonical_name_id": "akuntabilitas_kelembagaan",
    "canonical_name_en": "accountability_improved",
    "definition": "Lembaga penyedia layanan merespons laporan warga secara tervalidasi dan transparan sesuai komitmen SLA.",
    "allowed_target_actor_types": [
      "ACT-027",
      "ACT-028",
      "ACT-029"
    ],
    "positive_predicates_id": [
      "laporan diselesaikan",
      "responsif penanganan kasus",
      "transparan merespons",
      "akuntabilitas_kelembagaan"
    ],
    "positive_predicates_en": [
      "cases resolved",
      "transparent reply published",
      "citizen grievance addressed"
    ],
    "object_of_change_ids": [
      "persentase penyelesaian pengaduan LAPOR",
      "log kepatuhan audit internal"
    ],
    "negative_signals": [
      "menerima laporan pengaduan tanpa adanya bukti penyelesaian/tindakan balasan"
    ],
    "anti_signals": [],
    "minimum_evidence": "Laporan indeks kepatuhan penanganan pengaduan resmi SP4N-LAPOR",
    "likely_sectors": [
      "SECTOR-CIVTECH-022",
      "SECTOR-GOV-020"
    ],
    "likely_archetypes": [
      "ARCH-DIGDEV-007"
    ],
    "indicator_family_ids": [
      "IND-CIVTECH-INST-045",
      "IND-CIVIC-RESP-021"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.6",
          "16.10"
        ],
        "condition": "Transparansi kelembagaan"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-020"
    ],
    "common_activity_confusions": [
      "pemasangan kotak aduan fisik"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-020",
    "canonical_name_id": "norma_sosial_berubah",
    "canonical_name_en": "social_norm_changed",
    "definition": "Perubahan pandangan kolektif komunitas yang tercermin dari penurunan penerimaan tindak kekerasan atau bias gender di desa.",
    "allowed_target_actor_types": [
      "ACT-030",
      "ACT-021"
    ],
    "positive_predicates_id": [
      "menolak kekerasan",
      "mendukung kesetaraan gender",
      "tidak mempekerjakan anak",
      "norma_sosial_berubah"
    ],
    "positive_predicates_en": [
      "rejected domestic violence",
      "supports equal leadership",
      "child labor restricted"
    ],
    "object_of_change_ids": [
      "persentase persetujuan norma bias gender",
      "indeks sikap komunitas"
    ],
    "negative_signals": [
      "pemasangan banner sosialisasi anti kekerasan"
    ],
    "anti_signals": [],
    "minimum_evidence": "Hasil survei persepsi norma komunitas (KAP Survey) tahunan oleh eksternal",
    "likely_sectors": [
      "SECTOR-GEWE-017",
      "SECTOR-CHILD-016"
    ],
    "likely_archetypes": [
      "ARCH-BCC-005",
      "ARCH-FACIL-004"
    ],
    "indicator_family_ids": [],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_5",
        "official_target_ids": [
          "5.1",
          "5.2"
        ],
        "condition": "Konteks diskriminasi gender"
      }
    ],
    "time_horizon_guidance": "18-36 bulan (Sangat panjang)",
    "common_output_confusions": [
      "OPF-001"
    ],
    "common_activity_confusions": [
      "penyuluhan satu hari"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-021",
    "canonical_name_id": "resiliensi_ekonomi_meningkat",
    "canonical_name_en": "economic_resilience_improved",
    "definition": "Rumah tangga miskin memiliki tabungan darurat aktif dan diversifikasi aset penghidupan agar tangguh terhadap guncangan ekonomi.",
    "allowed_target_actor_types": [
      "ACT-011",
      "ACT-014"
    ],
    "positive_predicates_id": [
      "memiliki aset cadangan",
      "tabungan darurat terbentuk",
      "tangguh guncangan ekonomi",
      "resiliensi_ekonomi_meningkat"
    ],
    "positive_predicates_en": [
      "emergency savings established",
      "livelihood diversified",
      "economically resilient"
    ],
    "object_of_change_ids": [
      "indeks kepemilikan aset dasar",
      "jumlah bulan cadangan biaya hidup"
    ],
    "negative_signals": [
      "menerima transfer tunai langsung (itu bantuan darurat",
      "belum tentu tangguh)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Buku rekening tabungan keluarga / survei neraca rumah tangga kohor miskin",
    "likely_sectors": [
      "SECTOR-SOCPRO-015",
      "SECTOR-FININC-004"
    ],
    "likely_archetypes": [
      "ARCH-A2F-013",
      "ARCH-TRAINING-001"
    ],
    "indicator_family_ids": [
      "IND-FININC-ACTIVE-027"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_1",
        "official_target_ids": [
          "1.5"
        ],
        "condition": "Pengurangan kerentanan kemiskinan"
      },
      {
        "sdg_id": "SDG_8",
        "official_target_ids": [
          "8.10"
        ],
        "condition": "Akses lembaga keuangan"
      }
    ],
    "time_horizon_guidance": "12-24 bulan",
    "common_output_confusions": [
      "OPF-022"
    ],
    "common_activity_confusions": [
      "pembagian sembako gratis"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-022",
    "canonical_name_id": "resiliensi_iklim_petani",
    "canonical_name_en": "climate_resilience_improved",
    "definition": "Petani menerapkan kalender tanam adaptif, benih tahan kekeringan, dan mitigasi risiko iklim terverifikasi.",
    "allowed_target_actor_types": [
      "ACT-001",
      "ACT-003"
    ],
    "positive_predicates_id": [
      "menerapkan benih adaptif iklim",
      "menyesuaikan jadwal tanam",
      "menggunakan irigasi hemat",
      "adopsi benih",
      "benih varietas",
      "toleran panas",
      "varietas padi gogo",
      "resiliensi_iklim_petani"
    ],
    "positive_predicates_en": [
      "implemented climate-smart crop",
      "adjusted calendar of cultivation",
      "used precision irrigation"
    ],
    "object_of_change_ids": [
      "tingkat keberhasilan panen saat anomali cuaca",
      "persentase lahan beririgasi hemat"
    ],
    "negative_signals": [
      "hadir sekolah lapang iklim tanpa modifikasi cara tanam"
    ],
    "anti_signals": [
      "SDG-ANTI-CLIMATE-005"
    ],
    "minimum_evidence": "Laporan observasi lapangan komparatif paska periode cuaca ekstrem ekstrem",
    "likely_sectors": [
      "SECTOR-CCA-010",
      "SECTOR-AGRI-001"
    ],
    "likely_archetypes": [
      "ARCH-BCC-005",
      "ARCH-PREPAREDNESS-036"
    ],
    "indicator_family_ids": [
      "IND-CCA-PRACT-023",
      "IND-INFOUSE-059",
      "IND-DRR-EWS-060"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_13",
        "official_target_ids": [
          "13.1"
        ],
        "condition": "Adaptasi iklim"
      },
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.4"
        ],
        "condition": "Sistem pangan berkelanjutan"
      }
    ],
    "time_horizon_guidance": "12-18 bulan",
    "common_output_confusions": [
      "OPF-014",
      "OPF-001"
    ],
    "common_activity_confusions": [
      "pembagian brosur perkiraan cuaca BMKG"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-023",
    "canonical_name_id": "kondisi_lingkungan_membaik",
    "canonical_name_en": "environmental_condition_improved",
    "definition": "Penurunan timbulan sampah terkelola, pemulihan tutupan mangrove dalam hektar, dan peningkatan kualitas DAS lokal.",
    "allowed_target_actor_types": [
      "ACT-010",
      "ACT-021"
    ],
    "positive_predicates_id": [
      "tutupan hutan pulih",
      "sampah plastik berkurang",
      "sungai bersih dari limbah",
      "kondisi_lingkungan_membaik"
    ],
    "positive_predicates_en": [
      "hectares of forest restored",
      "waste volume reduced",
      "river clean index improved"
    ],
    "object_of_change_ids": [
      "jumlah tonase sampah daur ulang",
      "persentase kelangsungan hidup bibit mangrove"
    ],
    "negative_signals": [
      "jumlah bibit pohon yang ditanam (itu output",
      "bukan tutupan hutan yang hidup berkala)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Hasil foto udara citra satelit atau laporan timbangan bulanan TPS3R",
    "likely_sectors": [
      "SECTOR-ENV-012",
      "SECTOR-URBAN-026"
    ],
    "likely_archetypes": [
      "ARCH-FACIL-004",
      "ARCH-EQUIP-010"
    ],
    "indicator_family_ids": [
      "IND-ENV-HECT-041"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_15",
        "official_target_ids": [
          "15.2",
          "15.3"
        ],
        "condition": "Tutupan lahan"
      },
      {
        "sdg_id": "SDG_12",
        "official_target_ids": [
          "12.5"
        ],
        "condition": "Daur ulang sampah"
      }
    ],
    "time_horizon_guidance": "12-36 bulan (Sangat panjang)",
    "common_output_confusions": [
      "OPF-011",
      "OPF-014"
    ],
    "common_activity_confusions": [
      "seremonial penanaman sejuta pohon"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-024",
    "canonical_name_id": "kebutuhan_dasar_terpenuhi",
    "canonical_name_en": "basic_needs_met",
    "definition": "Korban terdampak bencana alam/darurat memperoleh air bersih, pangan darurat sesuai standar kecukupan kalori Sphere.",
    "allowed_target_actor_types": [
      "ACT-021",
      "ACT-022"
    ],
    "positive_predicates_id": [
      "menerima air bersih layak",
      "kebutuhan gizi darurat terpenuhi",
      "hunian darurat didiami",
      "kebutuhan_dasar_terpenuhi"
    ],
    "positive_predicates_en": [
      "received daily water ration",
      "nutritional diet secured",
      "temporary shelter inhabited"
    ],
    "object_of_change_ids": [
      "liter air per kapita per hari",
      "kalori konsumsi harian"
    ],
    "negative_signals": [
      "distribusi logistik di posko (itu output serah terima",
      "bukan konsumsi nyata warga di shelter)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Hasil survei PDM (Post Distribution Monitoring) tingkat keluarga korban",
    "likely_sectors": [
      "SECTOR-HUM-014",
      "SECTOR-WASH-009"
    ],
    "likely_archetypes": [
      "ARCH-EQUIP-010",
      "ARCH-PREPAREDNESS-036"
    ],
    "indicator_family_ids": [
      "IND-HUM-BASIC-038"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_2",
        "official_target_ids": [
          "2.1"
        ],
        "condition": "Krisis darurat pangan"
      }
    ],
    "time_horizon_guidance": "Siklus tanggap darurat jangka pendek (1-3 bulan)",
    "common_output_confusions": [
      "OPF-014",
      "OPF-011"
    ],
    "common_activity_confusions": [
      "bongkar muat logistik di pelabuhan"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-025",
    "canonical_name_id": "penanganan_kasus_meningkat",
    "canonical_name_en": "protection_response_improved",
    "definition": "Anak atau perempuan korban kekerasan memperoleh layanan konseling psikologis dan bantuan hukum yang tuntas.",
    "allowed_target_actor_types": [
      "ACT-027",
      "ACT-010"
    ],
    "positive_predicates_id": [
      "kasus diproses hukum",
      "memperoleh pemulihan psikologis",
      "pendampingan UPTD tuntas",
      "penanganan_kasus_meningkat"
    ],
    "positive_predicates_en": [
      "case legally prosecuted",
      "received trauma counseling",
      "referred to protection unit"
    ],
    "object_of_change_ids": [
      "jumlah berkas kasus P21 resmi",
      "skor asesmen trauma paska konseling"
    ],
    "negative_signals": [
      "jumlah laporan kasus masuk menurun (bisa jadi fenomena gunung es karena takut melapor)"
    ],
    "anti_signals": [],
    "minimum_evidence": "Berita acara penutupan kasus resmi dari dinas DP3A/UPTD PPA",
    "likely_sectors": [
      "SECTOR-CHILD-016",
      "SECTOR-GEWE-017"
    ],
    "likely_archetypes": [
      "ARCH-CAPACITY-018"
    ],
    "indicator_family_ids": [
      "IND-CHILD-CASE-036",
      "IND-GEWE-GBVREF-033"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_16",
        "official_target_ids": [
          "16.2"
        ],
        "condition": "Kekerasan anak"
      },
      {
        "sdg_id": "SDG_5",
        "official_target_ids": [
          "5.2"
        ],
        "condition": "KDRT/GBV"
      }
    ],
    "time_horizon_guidance": "6-12 bulan",
    "common_output_confusions": [
      "OPF-026"
    ],
    "common_activity_confusions": [
      "pembagian brosur stiker anti kekerasan"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C1"
    ]
  },
  {
    "outcome_family_id": "OF-026",
    "canonical_name_id": "graduasi_mustahik",
    "canonical_name_en": "mustahik_graduation",
    "definition": "Transformasi mustahik (penerima zakat) menjadi muzakki (pemberi zakat) melalui program pemberdayaan ekonomi terstruktur.",
    "allowed_target_actor_types": [
      "ACT-012",
      "ACT-008"
    ],
    "positive_predicates_id": [
      "mustahik graduasi",
      "mandiri ekonomi zakat",
      "keluar dari asnaf miskin",
      "graduasi_mustahik"
    ],
    "positive_predicates_en": [
      "mustahik graduated",
      "economically self-sufficient",
      "transitioned out of mustahik status"
    ],
    "object_of_change_ids": [
      "garis kemiskinan BPS daerah",
      "nilai wajib zakat tahunan"
    ],
    "negative_signals": [
      "menerima santunan zakat konsumtif rutin bulanan"
    ],
    "anti_signals": [],
    "minimum_evidence": "Surat ketetapan kelulusan program pemberdayaan yang dikeluarkan BAZNAS/LAZ",
    "likely_sectors": [
      "SECTOR-SOCPRO-015",
      "SECTOR-LIVELIHOOD-002"
    ],
    "likely_archetypes": [
      "ARCH-A2F-013",
      "ARCH-TRAINING-001"
    ],
    "indicator_family_ids": [
      "IND-MSME-REV-001"
    ],
    "sdg_affinities": [
      {
        "sdg_id": "SDG_1",
        "official_target_ids": [
          "1.2"
        ],
        "condition": "Pengurangan kemiskinan nasional"
      }
    ],
    "time_horizon_guidance": "12-18 bulan",
    "common_output_confusions": [
      "OPF-022"
    ],
    "common_activity_confusions": [
      "seremoni penyerahan dana zakat produktif"
    ],
    "causal_leap_risks": [],
    "epistemic_label": "CANONICAL_IMPACTORY",
    "sources": [
      "S-C2"
    ]
  }
];
export const ACTORS: Actor[] = [
  {
    "id": "ACT-001",
    "name": "petani kecil",
    "positive_signals": [
      "petani kecil"
    ]
  },
  {
    "id": "ACT-002",
    "name": "petani muda",
    "positive_signals": [
      "petani muda"
    ]
  },
  {
    "id": "ACT-003",
    "name": "kelompok tani",
    "positive_signals": [
      "kelompok tani"
    ]
  },
  {
    "id": "ACT-004",
    "name": "gapoktan",
    "positive_signals": [
      "gapoktan"
    ]
  },
  {
    "id": "ACT-005",
    "name": "koperasi",
    "positive_signals": [
      "koperasi"
    ]
  },
  {
    "id": "ACT-006",
    "name": "BUMDes",
    "positive_signals": [
      "BUMDes"
    ]
  },
  {
    "id": "ACT-007",
    "name": "UMKM",
    "positive_signals": [
      "UMKM"
    ]
  },
  {
    "id": "ACT-008",
    "name": "usaha mikro",
    "positive_signals": [
      "usaha mikro"
    ]
  },
  {
    "id": "ACT-009",
    "name": "pelaku usaha",
    "positive_signals": [
      "pelaku usaha"
    ]
  },
  {
    "id": "ACT-010",
    "name": "masyarakat rentan",
    "positive_signals": [
      "masyarakat rentan"
    ]
  },
  {
    "id": "ACT-011",
    "name": "keluarga miskin",
    "positive_signals": [
      "keluarga miskin"
    ]
  },
  {
    "id": "ACT-012",
    "name": "mustahik",
    "positive_signals": [
      "mustahik"
    ]
  },
  {
    "id": "ACT-013",
    "name": "muzakki",
    "positive_signals": [
      "muzakki"
    ]
  },
  {
    "id": "ACT-014",
    "name": "perempuan kepala keluarga",
    "positive_signals": [
      "perempuan kepala keluarga"
    ]
  },
  {
    "id": "ACT-015",
    "name": "penyandang disabilitas",
    "positive_signals": [
      "penyandang disabilitas"
    ]
  },
  {
    "id": "ACT-016",
    "name": "pemuda NEET",
    "positive_signals": [
      "pemuda NEET"
    ]
  },
  {
    "id": "ACT-017",
    "name": "kader",
    "positive_signals": [
      "kader"
    ]
  },
  {
    "id": "ACT-018",
    "name": "tenaga kesehatan",
    "positive_signals": [
      "tenaga kesehatan"
    ]
  },
  {
    "id": "ACT-019",
    "name": "guru",
    "positive_signals": [
      "guru"
    ]
  },
  {
    "id": "ACT-020",
    "name": "siswa",
    "positive_signals": [
      "siswa"
    ]
  },
  {
    "id": "ACT-021",
    "name": "warga terdampak",
    "positive_signals": [
      "warga terdampak"
    ]
  },
  {
    "id": "ACT-022",
    "name": "pengungsi",
    "positive_signals": [
      "pengungsi"
    ]
  },
  {
    "id": "ACT-023",
    "name": "pekerja migran",
    "positive_signals": [
      "pekerja migran"
    ]
  },
  {
    "id": "ACT-024",
    "name": "masyarakat adat",
    "positive_signals": [
      "masyarakat adat"
    ]
  },
  {
    "id": "ACT-025",
    "name": "OMS/CSO",
    "positive_signals": [
      "OMS/CSO"
    ]
  },
  {
    "id": "ACT-026",
    "name": "pemerintah daerah",
    "positive_signals": [
      "pemerintah daerah"
    ]
  },
  {
    "id": "ACT-027",
    "name": "OPD",
    "positive_signals": [
      "OPD"
    ]
  },
  {
    "id": "ACT-028",
    "name": "puskesmas",
    "positive_signals": [
      "puskesmas"
    ]
  },
  {
    "id": "ACT-029",
    "name": "sekolah",
    "positive_signals": [
      "sekolah"
    ]
  },
  {
    "id": "ACT-030",
    "name": "komunitas",
    "positive_signals": [
      "komunitas"
    ]
  },
  {
    "id": "ACT-031",
    "name": "kelompok perempuan",
    "positive_signals": [
      "kelompok perempuan"
    ]
  },
  {
    "id": "ACT-032",
    "name": "kelompok pemuda",
    "positive_signals": [
      "kelompok pemuda"
    ]
  },
  {
    "id": "ACT-033",
    "name": "pembeli/offtaker",
    "positive_signals": [
      "pembeli/offtaker"
    ]
  },
  {
    "id": "ACT-034",
    "name": "penyuluh",
    "positive_signals": [
      "penyuluh"
    ]
  },
  {
    "id": "ACT-035",
    "name": "pengurus koperasi",
    "positive_signals": [
      "pengurus koperasi"
    ]
  }
];
export const INTERVENTION_ARCHETYPES: InterventionArchetype[] = [
  {
    "archetype_id": "ARCH-TRAINING-001",
    "name_id": "001 Training & Capacity Building",
    "name_en": "001 Training & Capacity Building",
    "definition": "001 Training & Capacity Building",
    "positive_action_signals": [
      "melatih",
      "pelatihan",
      "workshop",
      "bimtek"
    ],
    "object_signals": [
      "peserta",
      "modul",
      "kurikulum"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-002",
      "PF-004",
      "PF-005",
      "PF-015",
      "PF-016",
      "PF-017",
      "PF-018"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-TOT-002",
    "name_id": "002 Training of Trainers (ToT)",
    "name_en": "002 Training of Trainers (ToT)",
    "definition": "002 Training of Trainers (ToT)",
    "positive_action_signals": [
      "melatih pelatih",
      "kaderisasi fasilitator"
    ],
    "object_signals": [
      "master trainer",
      "kader"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-018"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-MENTOR-003",
    "name_id": "003 Coaching & Mentorship",
    "name_en": "003 Coaching & Mentorship",
    "definition": "003 Coaching & Mentorship",
    "positive_action_signals": [
      "mendampingi",
      "pendampingan",
      "coaching"
    ],
    "object_signals": [
      "mentee",
      "usaha dampingan"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-005",
      "PF-018"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-FACIL-004",
    "name_id": "004 Facilitation & Dialogue",
    "name_en": "004 Facilitation & Dialogue",
    "definition": "004 Facilitation & Dialogue",
    "positive_action_signals": [
      "memfasilitasi",
      "musyawarah",
      "rembug"
    ],
    "object_signals": [
      "forum warga",
      "pemdes"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-014",
      "PF-019",
      "PF-020",
      "PF-022"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-BCC-005",
    "name_id": "005 Behavior Change Communication",
    "name_en": "005 Behavior Change Communication",
    "definition": "005 Behavior Change Communication",
    "positive_action_signals": [
      "sosialisasi",
      "kampanye gizi",
      "edukasi publik"
    ],
    "object_signals": [
      "masyarakat",
      "ibu hamil"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-009"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-AWARE-006",
    "name_id": "006 Awareness & Sensitization",
    "name_en": "006 Awareness & Sensitization",
    "definition": "006 Awareness & Sensitization",
    "positive_action_signals": [
      "penyuluhan",
      "sebar leaflet",
      "siaran radio"
    ],
    "object_signals": [
      "warga desa"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-022"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-DIGDEV-007",
    "name_id": "007 Digital & App Development",
    "name_en": "007 Digital & App Development",
    "definition": "007 Digital & App Development",
    "positive_action_signals": [
      "mengembangkan aplikasi",
      "onboarding digital",
      "platform online"
    ],
    "object_signals": [
      "pengguna",
      "web portal"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-011"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-RESEARCH-008",
    "name_id": "008 Action Research & Policy Diagnostics",
    "name_en": "008 Action Research & Policy Diagnostics",
    "definition": "008 Action Research & Policy Diagnostics",
    "positive_action_signals": [
      "studi kelayakan",
      "riset aksi",
      "kajian kebijakan"
    ],
    "object_signals": [
      "laporan riset",
      "rekomendasi"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-011"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-DASH-009",
    "name_id": "009 Dashboard & Management Information System",
    "name_en": "009 Dashboard & Management Information System",
    "definition": "009 Dashboard & Management Information System",
    "positive_action_signals": [
      "sistem informasi",
      "dashboard pantau"
    ],
    "object_signals": [
      "mis daerah",
      "admin"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-026",
      "PF-027"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-EQUIP-010",
    "name_id": "010 Equipment & Tool Provision",
    "name_en": "010 Equipment & Tool Provision",
    "definition": "010 Equipment & Tool Provision",
    "positive_action_signals": [
      "mencetak",
      "menyerahkan bantuan alat",
      "hibah mesin"
    ],
    "object_signals": [
      "mesin pengolah",
      "alat tangkap"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-004"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-INFRA-011",
    "name_id": "011 Small-scale Rural Infrastructure",
    "name_en": "011 Small-scale Rural Infrastructure",
    "definition": "011 Small-scale Rural Infrastructure",
    "positive_action_signals": [
      "pembangunan sarana",
      "jalan tani",
      "irigasi desa"
    ],
    "object_signals": [
      "infrastruktur fisik"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-016"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-GRANTS-012",
    "name_id": "012 Micro-grants & Cash Transfer",
    "name_en": "012 Micro-grants & Cash Transfer",
    "definition": "012 Micro-grants & Cash Transfer",
    "positive_action_signals": [
      "penyaluran dana hibah",
      "bantuan modal",
      "seed funding"
    ],
    "object_signals": [
      "penerima manfaat"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-002"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-A2F-013",
    "name_id": "013 Access to Finance & Microfinance Linkage",
    "name_en": "013 Access to Finance & Microfinance Linkage",
    "definition": "013 Access to Finance & Microfinance Linkage",
    "positive_action_signals": [
      "linking ke bank",
      "fasilitasi kredit usaha",
      "akses pinjaman"
    ],
    "object_signals": [
      "debitur",
      "lembaga keuangan"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-002",
      "PF-006"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-INCUB-014",
    "name_id": "014 Business Incubation & Acceleration",
    "name_en": "014 Business Incubation & Acceleration",
    "definition": "014 Business Incubation & Acceleration",
    "positive_action_signals": [
      "inkubasi bisnis",
      "akselerasi umkm",
      "bootcamp wirausaha"
    ],
    "object_signals": [
      "tenant",
      "startup"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-006",
      "PF-015"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-MARKET-015",
    "name_id": "015 Market Linkage & Buyer Matching",
    "name_en": "015 Market Linkage & Buyer Matching",
    "definition": "015 Market Linkage & Buyer Matching",
    "positive_action_signals": [
      "menghubungkan ke off-taker",
      "temu bisnis",
      "pemasaran bersama"
    ],
    "object_signals": [
      "pembeli formal",
      "supermarket"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-001",
      "PF-002",
      "PF-003"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-VALUECHAIN-016",
    "name_id": "016 Value Chain & Supply Linkage Enhancement",
    "name_en": "016 Value Chain & Supply Linkage Enhancement",
    "definition": "016 Value Chain & Supply Linkage Enhancement",
    "positive_action_signals": [
      "rantai pasok",
      "rantai nilai",
      "offtaker pasar"
    ],
    "object_signals": [
      "pemasok",
      "agregator"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-001",
      "PF-003"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-COOP-017",
    "name_id": "017 Institutional Cooperative Development",
    "name_en": "017 Institutional Cooperative Development",
    "definition": "017 Institutional Cooperative Development",
    "positive_action_signals": [
      "penguatan koperasi",
      "kelembagaan tani",
      "bumdes"
    ],
    "object_signals": [
      "pengurus",
      "anggota"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-007"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-CAPACITY-018",
    "name_id": "018 CSO & Institutional Strengthening",
    "name_en": "018 CSO & Institutional Strengthening",
    "definition": "018 CSO & Institutional Strengthening",
    "positive_action_signals": [
      "penguatan organisasi",
      "pelatihan tata kelola",
      "sop lembaga"
    ],
    "object_signals": [
      "staf cso",
      "pengurus lsm"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-007",
      "PF-010"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-POLICY-019",
    "name_id": "019 Policy Drafting & Local Regulation",
    "name_en": "019 Policy Drafting & Local Regulation",
    "definition": "019 Policy Drafting & Local Regulation",
    "positive_action_signals": [
      "menyusun perdes",
      "drafting ranperda",
      "policy brief"
    ],
    "object_signals": [
      "peraturan desa",
      "sk bupati"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-025"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-SERVICE-020",
    "name_id": "020 Direct Service Delivery & Outreach",
    "name_en": "020 Direct Service Delivery & Outreach",
    "definition": "020 Direct Service Delivery & Outreach",
    "positive_action_signals": [
      "layanan langsung",
      "posyandu keliling",
      "bantuan sosial"
    ],
    "object_signals": [
      "warga terpencil"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-025"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-REHAB-021",
    "name_id": "021 Environmental Restoration & Rehabilitation",
    "name_en": "021 Environmental Restoration & Rehabilitation",
    "definition": "021 Environmental Restoration & Rehabilitation",
    "positive_action_signals": [
      "rehabilitasi lahan",
      "penanaman mangrove",
      "restorasi sungai"
    ],
    "object_signals": [
      "hektar lahan"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-025"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-ADVOCACY-022",
    "name_id": "022 Policy Advocacy & Campaigning",
    "name_en": "022 Policy Advocacy & Campaigning",
    "definition": "022 Policy Advocacy & Campaigning",
    "positive_action_signals": [
      "advokasi kebijakan",
      "kampanye publik",
      "draft perdes"
    ],
    "object_signals": [
      "stakeholder kunci"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-008",
      "PF-009",
      "PF-010",
      "PF-017"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-SCHOLAR-023",
    "name_id": "023 Scholarship & Education Financial Support",
    "name_en": "023 Scholarship & Education Financial Support",
    "definition": "023 Scholarship & Education Financial Support",
    "positive_action_signals": [
      "beasiswa sekolah",
      "bantuan biaya pendidikan"
    ],
    "object_signals": [
      "siswi kurang mampu"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-008",
      "PF-020",
      "PF-022",
      "PF-029"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-CLINIC-024",
    "name_id": "024 Mobile Clinic & Health Screening",
    "name_en": "024 Mobile Clinic & Health Screening",
    "definition": "024 Mobile Clinic & Health Screening",
    "positive_action_signals": [
      "klinik keliling",
      "pemeriksaan kesehatan gratis"
    ],
    "object_signals": [
      "pasien terpencil"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-029"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-WASTE-025",
    "name_id": "025 Community Waste Management & Recycling",
    "name_en": "025 Community Waste Management & Recycling",
    "definition": "025 Community Waste Management & Recycling",
    "positive_action_signals": [
      "bank sampah",
      "daur ulang",
      "pengolahan sampah"
    ],
    "object_signals": [
      "nasabah bank sampah"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-027"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-WATER-026",
    "name_id": "026 Clean Water Facility Installation",
    "name_en": "026 Clean Water Facility Installation",
    "definition": "026 Clean Water Facility Installation",
    "positive_action_signals": [
      "pipanisasi air",
      "pembangunan pamsimas",
      "sumur bor"
    ],
    "object_signals": [
      "kk penerima air"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-ENERGY-027",
    "name_id": "027 Renewable Energy & Solar Installation",
    "name_en": "027 Renewable Energy & Solar Installation",
    "definition": "027 Renewable Energy & Solar Installation",
    "positive_action_signals": [
      "plts komunal",
      "panel surya",
      "biogas"
    ],
    "object_signals": [
      "unit terpasang"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-026"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-PROTECT-028",
    "name_id": "028 Child & Vulnerable Group Protection",
    "name_en": "028 Child & Vulnerable Group Protection",
    "definition": "028 Child & Vulnerable Group Protection",
    "positive_action_signals": [
      "perlindungan anak",
      "pos pengaduan gbv",
      "ruang aman"
    ],
    "object_signals": [
      "korban kekerasan"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-012"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-SOCACC-029",
    "name_id": "029 Social Accountability & Community Scorecard",
    "name_en": "029 Social Accountability & Community Scorecard",
    "definition": "029 Social Accountability & Community Scorecard",
    "positive_action_signals": [
      "citizen report card",
      "audit sosial",
      "kotak aduan"
    ],
    "object_signals": [
      "penyedia layanan"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-012",
      "PF-013"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-NETWORK-030",
    "name_id": "030 Multi-Stakeholder Network Building",
    "name_en": "030 Multi-Stakeholder Network Building",
    "definition": "030 Multi-Stakeholder Network Building",
    "positive_action_signals": [
      "jaringan kerja",
      "mou konsorsium",
      "forum multi-pihak"
    ],
    "object_signals": [
      "mitra strategis"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-013",
      "PF-023",
      "PF-028"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-PEER-031",
    "name_id": "031 Peer-to-Peer Learning & Exchange Visit",
    "name_en": "031 Peer-to-Peer Learning & Exchange Visit",
    "definition": "031 Peer-to-Peer Learning & Exchange Visit",
    "positive_action_signals": [
      "studi banding",
      "kunjungan antar-petani",
      "peer learning"
    ],
    "object_signals": [
      "komunitas belajar"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-028"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-FEEDING-032",
    "name_id": "032 Supplementary Nutrition & Feeding Program",
    "name_en": "032 Supplementary Nutrition & Feeding Program",
    "definition": "032 Supplementary Nutrition & Feeding Program",
    "positive_action_signals": [
      "pmt anak stunting",
      "makanan tambahan ibu hamil"
    ],
    "object_signals": [
      "balita stunting"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-TECH-033",
    "name_id": "033 Appropriate Technology Transfer",
    "name_en": "033 Appropriate Technology Transfer",
    "definition": "033 Appropriate Technology Transfer",
    "positive_action_signals": [
      "penerapan teknologi tepat guna",
      "mesin pengolah"
    ],
    "object_signals": [
      "kelompok tani"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-004",
      "PF-011",
      "PF-021"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-DEMPLOT-034",
    "name_id": "034 Demonstration Plot & Field Trials",
    "name_en": "034 Demonstration Plot & Field Trials",
    "definition": "034 Demonstration Plot & Field Trials",
    "positive_action_signals": [
      "demplot tani",
      "lahan percontohan",
      "uji coba varietas"
    ],
    "object_signals": [
      "petani peserta"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-004",
      "PF-021"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-CERT-035",
    "name_id": "035 Standards & Product Certification",
    "name_en": "035 Standards & Product Certification",
    "definition": "035 Standards & Product Certification",
    "positive_action_signals": [
      "sertifikasi halal",
      "bpom",
      "sertifikat organik"
    ],
    "object_signals": [
      "produk umkm"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-001"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-PREPAREDNESS-036",
    "name_id": "036 Disaster Preparedness & Contingency Plan",
    "name_en": "036 Disaster Preparedness & Contingency Plan",
    "definition": "036 Disaster Preparedness & Contingency Plan",
    "positive_action_signals": [
      "menyusun rencana kontinjensi",
      "simulasi bencana",
      "drill"
    ],
    "object_signals": [
      "dokumen kontinjensi",
      "tim siaga"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-021",
      "PF-023"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "ACTIVE",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-SEED-037",
    "name_id": "037 High-Quality Seed & Seedling Distribution",
    "name_en": "037 High-Quality Seed & Seedling Distribution",
    "definition": "037 High-Quality Seed & Seedling Distribution",
    "positive_action_signals": [
      "bantuan bibit unggul",
      "benih tersertifikasi"
    ],
    "object_signals": [
      "petani penerima"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-016"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-MIGRANT-038",
    "name_id": "038 Migrant Worker Safe Migration & Empowerment",
    "name_en": "038 Migrant Worker Safe Migration & Empowerment",
    "definition": "038 Migrant Worker Safe Migration & Empowerment",
    "positive_action_signals": [
      "perekrutan aman",
      "perlindungan pmi",
      "desa peduli pmi"
    ],
    "object_signals": [
      "pekerja migran"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-014",
      "PF-019",
      "PF-024"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-LEGAL-039",
    "name_id": "039 Legal Aid & Identity Documentation",
    "name_en": "039 Legal Aid & Identity Documentation",
    "definition": "039 Legal Aid & Identity Documentation",
    "positive_action_signals": [
      "bantuan hukum",
      "pembuatan akta lahir",
      "ktp-el"
    ],
    "object_signals": [
      "warga tanpa akta"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-008",
      "PF-017",
      "PF-024"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  },
  {
    "archetype_id": "ARCH-URBAN-040",
    "name_id": "040 Slum Upgrading & Housing Improvement",
    "name_en": "040 Slum Upgrading & Housing Improvement",
    "definition": "040 Slum Upgrading & Housing Improvement",
    "positive_action_signals": [
      "penataan kawasan kumuh",
      "bedah rumah",
      "sanitasi komunal"
    ],
    "object_signals": [
      "kk kawasan kumuh"
    ],
    "actor_signals": [],
    "explicit_user_phrases": [],
    "problem_family_ids": [
      "PF-027"
    ],
    "expected_output_family_ids": [],
    "expected_intermediate_outcome_ids": [],
    "expected_outcome_family_ids": [],
    "wbs_pattern_ids": [],
    "cost_driver_pattern_ids": [],
    "meal_pattern_ids": [],
    "negative_signals": [],
    "anti_signals": [],
    "confusable_archetype_ids": [],
    "minimum_evidence": "",
    "disambiguation_questions": "",
    "epistemic_label": "HUMAN_REVIEW_REQUIRED",
    "sources": [
      "Corpus v1.1"
    ]
  }
];
export const INDICATOR_FAMILIES = [
  {
    "id": "IND-MSME-REV-001",
    "name": "UMKM Revenue & Turnover Growth",
    "domain": "MSME / Economic",
    "code": "IND-001",
    "sdg_targets": [
      "SDG_8.3",
      "SDG_1.4"
    ],
    "signals": [
      "omzet meningkat",
      "pendapatan naik",
      "penjualan bertambah",
      "revenue growth",
      "turnover"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-MSME-PRACT-002",
    "name": "Business Best Practice Adoption Rate",
    "domain": "MSME / Operations",
    "code": "IND-002",
    "sdg_targets": [
      "SDG_8.3"
    ],
    "signals": [
      "pencatatan keuangan",
      "SOP usaha",
      "tata kelola UMKM",
      "sop diterapkan"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-MSME-DIGTX-003",
    "name": "Digital Tool & E-commerce Adoption Rate",
    "domain": "MSME / Digital",
    "code": "IND-003",
    "sdg_targets": [
      "SDG_9.c",
      "SDG_8.3"
    ],
    "signals": [
      "onboarding e-commerce",
      "pemasaran digital",
      "pakai qris",
      "transaksi digital"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-MSME-JOB-004",
    "name": "Direct & Indirect Jobs Created",
    "domain": "MSME / Employment",
    "code": "IND-004",
    "sdg_targets": [
      "SDG_8.5"
    ],
    "signals": [
      "lapangan kerja",
      "tenaga kerja baru",
      "rekrut karyawan",
      "jobs created"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-AGRI-YIELD-010",
    "name": "Agricultural Crop Productivity & Yield",
    "domain": "Agriculture",
    "code": "IND-010",
    "sdg_targets": [
      "SDG_2.3"
    ],
    "signals": [
      "produktivitas panen",
      "hasil ton per hektar",
      "panen meningkat",
      "crop yield"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-AGRI-PRICE-011",
    "name": "Farmer Selling Price & Farmgate Value",
    "domain": "Agriculture",
    "code": "IND-011",
    "sdg_targets": [
      "SDG_2.3"
    ],
    "signals": [
      "harga jual panen",
      "harga jual petani",
      "farmgate price",
      "harga tingkat petani"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-AGRI-LOSS-054",
    "name": "Post-Harvest Loss Reduction Rate",
    "domain": "Agriculture",
    "code": "IND-054",
    "sdg_targets": [
      "SDG_12.3",
      "SDG_2.3"
    ],
    "signals": [
      "susut panen berkurang",
      "kerusakan hasil panen",
      "post-harvest loss"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-WASH-USE-018",
    "name": "Safe Water & Sanitation Access Rate",
    "domain": "WASH",
    "code": "IND-018",
    "sdg_targets": [
      "SDG_6.1",
      "SDG_6.2"
    ],
    "signals": [
      "akses air bersih",
      "sanitasi layak",
      "toilet sehat",
      "bebas buang air sembarangan",
      "ODF"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-EDU-LEARN-014",
    "name": "Student Learning Outcome & Literacy Rate",
    "domain": "Education",
    "code": "IND-014",
    "sdg_targets": [
      "SDG_4.1",
      "SDG_4.6"
    ],
    "signals": [
      "kemampuan membaca",
      "literasi numerasi",
      "nilai tes meningkat",
      "learning score"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-GEWE-DECIS-031",
    "name": "Women Household & Community Decision Making",
    "domain": "Gender & Inclusion",
    "code": "IND-031",
    "sdg_targets": [
      "SDG_5.5"
    ],
    "signals": [
      "keputusan rumah tangga",
      "peran perempuan",
      "partisipasi perempuan",
      "women leadership"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-DRR-EWS-060",
    "name": "Disaster Early Warning & Preparedness Coverage",
    "domain": "Disaster / Climate",
    "code": "IND-060",
    "sdg_targets": [
      "SDG_13.1",
      "SDG_11.5"
    ],
    "signals": [
      "sistem peringatan dini",
      "simulasi bencana",
      "peta risiko bencana",
      "early warning"
    ],
    "status": "ACTIVE"
  },
  {
    "id": "IND-CSO-OCA-008",
    "name": "CSO Organizational Capacity Score",
    "domain": "CSO / Governance",
    "code": "IND-008",
    "sdg_targets": [
      "SDG_16.6",
      "SDG_17.17"
    ],
    "signals": [
      "kredibilitas meningkat",
      "kapasitas organisasi",
      "akuntabilitas lembaga",
      "cso capacity"
    ],
    "status": "ACTIVE"
  }
];
export const OUTPUT_FAMILIES: OutputFamily[] = [];
export const ANTI_SIGNALS = [];

export function verifyRegistryIntegrity(): boolean {
  return (
    SECTORS.length === 30 &&
    PROBLEM_FAMILIES.length === 29 &&
    OUTCOME_FAMILIES.length === 26 &&
    ACTORS.length === 35 &&
    INTERVENTION_ARCHETYPES.length === 40 &&
    INDICATOR_FAMILIES.length >= 12
  );
}
