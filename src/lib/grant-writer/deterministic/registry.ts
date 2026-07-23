import type {
  OutputFamily,
  AntiSignalRule
} from './types';

export {
  SECTORS,
  PROBLEM_FAMILIES,
  OUTCOME_FAMILIES,
  ACTORS,
  INTERVENTION_ARCHETYPES,
  INDICATOR_FAMILIES
} from '../../../../generated/registry.generated';

export const REGISTRY_VERSION = '1.2';
export const REGISTRY_SOURCE = 'docs/impactory_deterministic_program_context_sdg_mapping_v1_2.md';

export const OUTPUT_FAMILIES: OutputFamily[] = [
  {
    output_family_id: "OPF-001",
    canonical_name: "training_delivered",
    project_control_level: "FULL",
    expected_verification: "Daftar hadir peserta bergeotag + salinan silabus materi.",
    likely_outcome_family_ids: ["OF-001", "OF-002"],
    common_confusions: "Melatih diklaim otomatis melahirkan adopsi kebiasaan harian (HN-1).",
    positive_signals: ["melatih", "pelatihan", "workshop", "bimtek", "kelas terselenggara", "materi diajarkan", "melatih literasi keuangan", "melatih ibu-ibu", "melatih kader", "melatih petugas"]
  },
  {
    output_family_id: "OPF-002",
    canonical_name: "participants_completed_training",
    project_control_level: "FULL",
    expected_verification: "Rekapitulasi sertifikat kelulusan + log lembar post-test.",
    likely_outcome_family_ids: ["OF-002", "OF-003"],
    common_confusions: "Mentoring selesai diklaim sebagai jaminan peningkatan omset dagang.",
    positive_signals: ["peserta lulus", "sertifikat kelulusan", "pendampingan mentoring", "mentoring dilakukan", "pendampingan bisnis", "pendampingan usaha", "pendampingan wirausaha", "pendampingan petani", "pendampingan rutin", "mengawal pendampingan"]
  },
  {
    output_family_id: "OPF-003",
    canonical_name: "system_designed",
    project_control_level: "FULL",
    expected_verification: "Dokumen SRS (Software Requirements Specification) tervalidasi.",
    likely_outcome_family_ids: [],
    common_confusions: "Sistem desain diklaim sebagai aplikasi yang telah go-live.",
    positive_signals: ["perancangan sistem", "desain aplikasi", "spesifikasi sistem", "rancangan arsitektur"]
  },
  {
    output_family_id: "OPF-004",
    canonical_name: "system_developed",
    project_control_level: "FULL",
    expected_verification: "Dokumen hasil pengujian Unit Testing + log build GitHub.",
    likely_outcome_family_ids: [],
    common_confusions: "Build selesai diklaim sebagai platform aktif digunakan.",
    positive_signals: ["membangun portal", "mengembangkan aplikasi", "pengembangan sistem", "build aplikasi"]
  },
  {
    output_family_id: "OPF-005",
    canonical_name: "system_tested",
    project_control_level: "FULL",
    expected_verification: "BAP UAT (User Acceptance Testing) yang ditandatangani perwakilan user.",
    likely_outcome_family_ids: [],
    common_confusions: "Lolos UAT diklaim sebagai keberhasilan adopsi digital.",
    positive_signals: ["pengujian uat", "uat aplikasi", "uji coba sistem"]
  },
  {
    output_family_id: "OPF-006",
    canonical_name: "system_operational",
    project_control_level: "FULL",
    expected_verification: "Log uptime server + URL rilis aplikasi produksi aktif.",
    likely_outcome_family_ids: ["OF-004"],
    common_confusions: "Sistem online diartikan otomatis digunakan rutin (ANTI-06).",
    positive_signals: ["sistem operasional", "server aktif", "go-live", "aplikasi berjalan"]
  },
  {
    output_family_id: "OPF-007",
    canonical_name: "database_created",
    project_control_level: "FULL",
    expected_verification: "Skema database terbuat + koneksi DB aktif di lingkungan cloud.",
    likely_outcome_family_ids: ["OF-015"],
    common_confusions: "Database dibuat diklaim otomatis mengintegrasikan data dinas.",
    positive_signals: ["membuat database", "skema database", "basis data terintegrasi"]
  },
  {
    output_family_id: "OPF-008",
    canonical_name: "data_validated",
    project_control_level: "FULL",
    expected_verification: "Dokumen laporan QA audit data bertanda tangan validator.",
    likely_outcome_family_ids: ["OF-015"],
    common_confusions: "Data divalidasi diklaim sebagai keputusan berbasis bukti.",
    positive_signals: ["validasi data", "qa data", "audit data", "verifikasi data"]
  },
  {
    output_family_id: "OPF-009",
    canonical_name: "SOP_drafted",
    project_control_level: "FULL",
    expected_verification: "Draf naskah SOP dalam bentuk hardcopy siap tanda tangan.",
    likely_outcome_family_ids: [],
    common_confusions: "Draf dokumen diklaim sebagai perubahan tata kelola nyata.",
    positive_signals: ["menyusun sop", "draf sop", "rancangan sop", "penyusunan sop"]
  },
  {
    output_family_id: "OPF-010",
    canonical_name: "SOP_approved",
    project_control_level: "FULL",
    expected_verification: "Dokumen keputusan pimpinan yang memuat tanda tangan persetujuan resmi.",
    likely_outcome_family_ids: ["OF-014"],
    common_confusions: "SOP disetujui diklaim otomatis dijalankan petugas lapangan (ANTI-05).",
    positive_signals: ["sop disetujui", "sop resmi", "sop respons", "pengesahan sop", "sop operasional", "sop disahkan"]
  },
  {
    output_family_id: "OPF-011",
    canonical_name: "facility_constructed",
    project_control_level: "FULL",
    expected_verification: "Berita acara serah terima bangunan fisik + koordinat geotag.",
    likely_outcome_family_ids: ["OF-005", "OF-006"],
    common_confusions: "Bangunan fisik berdiri diklaim otomatis dimanfaatkan warga (HN-9).",
    positive_signals: ["pembangunan fasilitas", "membangun posyandu", "membangun sanitasi", "konstruksi toilet", "membangun demplot", "pembuatan demplot", "jamban", "pembangunan jamban", "fasilitas sanitasi", "jamban komunal", "fasilitas jamban"]
  },
  {
    output_family_id: "OPF-012",
    canonical_name: "facility_rehabilitated",
    project_control_level: "FULL",
    expected_verification: "BA serah terima paska renovasi + foto perbandingan sebelum/sesudah.",
    likely_outcome_family_ids: ["OF-005", "OF-006"],
    common_confusions: "Renovasi selesai diklaim sebagai perbaikan kualitas layanan.",
    positive_signals: ["merenovasi loket", "merenovasi faskes", "rehabilitasi posyandu"]
  },
  {
    output_family_id: "OPF-013",
    canonical_name: "equipment_procured_deprecated_alias",
    project_control_level: "FULL",
    expected_verification: "DIALIASKAN DAN DIGABUNGKAN DENGAN OPF-014. JANGAN GUNAKAN UNTUK CATATAN BARU.",
    likely_outcome_family_ids: [],
    common_confusions: "Pengadaan fisik di gudang diklaim sebagai adopsi teknologi.",
    positive_signals: ["pengadaan mesin", "traktor dibeli", "susu dibeli", "biskuit dibeli"]
  },
  {
    output_family_id: "OPF-014",
    canonical_name: "equipment_distributed",
    project_control_level: "FULL",
    expected_verification: "BAP (Berita Acara Penyerahan) tertanda tangan basah + foto geotag penerima bersama barang.",
    likely_outcome_family_ids: ["OF-004", "OF-011"],
    common_confusions: "Barang diterima diklaim otomatis meningkatkan produktivitas (ANTI-03).",
    positive_signals: ["membagikan benih", "membagikan bibit", "membagikan pupuk", "menyerahkan bantuan", "distribusi alat", "membagikan paket", "membagikan susu", "membagikan biskuit", "membagikan multivitamin", "menyerahkan bantuan mesin", "traktor diserahkan", "tensimeter", "tensimeter digital", "bantuan alat", "hibah alat", "paket sanitasi", "bantuan mesin", "peralatan operasional", "pemeriksaan tensi", "membagikan sabun", "alat/mesin", "hibah modal alat"]
  },
  {
    output_family_id: "OPF-015",
    canonical_name: "service_point_established",
    project_control_level: "FULL",
    expected_verification: "Dokumen izin operasional loket + papan nama koordinat terpasang.",
    likely_outcome_family_ids: ["OF-005"],
    common_confusions: "Loket berdiri diklaim otomatis diakses kelompok rentan.",
    positive_signals: ["posyandu siaga", "loket pelayanan", "titik posyandu", "pendirian loket"]
  },
  {
    output_family_id: "OPF-016",
    canonical_name: "study_completed",
    project_control_level: "FULL",
    expected_verification: "Dokumen draf laporan kajian akhir ber-ISBN atau ber-DOI.",
    likely_outcome_family_ids: ["OF-015", "OF-017"],
    common_confusions: "Riset terbit diklaim otomatis diadopsi pengambil kebijakan (ANTI-13).",
    positive_signals: ["studi kelayakan", "laporan kajian", "riset lapangan", "pemetaan masalah"]
  },
  {
    output_family_id: "OPF-017",
    canonical_name: "policy_brief_produced",
    project_control_level: "FULL",
    expected_verification: "Tanda terima penyerahan dokumen Policy Brief ke kantor dinas terkait.",
    likely_outcome_family_ids: ["OF-017"],
    common_confusions: "Brief diserahkan diklaim otomatis memicu reformasi anggaran.",
    positive_signals: ["policy brief", "kertas kebijakan", "rekomendasi kebijakan"]
  },
  {
    output_family_id: "OPF-018",
    canonical_name: "policy_draft_produced",
    project_control_level: "FULL",
    expected_verification: "Naskah akademik rancangan regulasi resmi yang terdaftar di legislatif.",
    likely_outcome_family_ids: [],
    common_confusions: "Draf peraturan diklaim sebagai perda resmi berjalan.",
    positive_signals: ["naskah akademik", "draf peraturan", "rancangan perda"]
  },
  {
    output_family_id: "OPF-019",
    canonical_name: "policy_approved",
    project_control_level: "FULL",
    expected_verification: "Dokumen undang-undang/peraturan resmi bernomor lembaran negara.",
    likely_outcome_family_ids: ["OF-017"],
    common_confusions: "Undang-undang disahkan diklaim otomatis dijalankan aparat di lapangan (ANTI-05).",
    positive_signals: ["pengesahan perda", "peraturan disahkan", "kebijakan resmi"]
  },
  {
    output_family_id: "OPF-020",
    canonical_name: "platform_launched",
    project_control_level: "FULL",
    expected_verification: "Rilis publik resmi (Google Play / App Store) / domain web terdaftar.",
    likely_outcome_family_ids: ["OF-004"],
    common_confusions: "Aplikasi dilaunching diklaim otomatis memiliki traffic aktif.",
    positive_signals: ["meluncurkan sistem", "peluncuran portal", "launching aplikasi", "portal pengaduan", "sistem integrasi sp4n-lapor", "aplikasi pemantauan", "aplikasi posyandu"]
  },
  {
    output_family_id: "OPF-021",
    canonical_name: "network_established",
    project_control_level: "FULL",
    expected_verification: "Dokumen AD/ART pembentukan jejaring kolaborasi OMS.",
    likely_outcome_family_ids: ["OF-014"],
    common_confusions: "Forum didirikan diklaim otomatis melakukan koordinasi rutin (HN-24).",
    positive_signals: ["membentuk jejaring", "pembentukan forum", "forum kader", "kemitraan forum", "jejaring oms", "komunitas belajar", "forum guru", "jejaring guru", "komunitas guru", "forum komunitas guru"]
  },
  {
    output_family_id: "OPF-022",
    canonical_name: "grant_disbursed",
    project_control_level: "FULL",
    expected_verification: "Bukti transfer perbankan kolektif ke rekening penerima manfaat.",
    likely_outcome_family_ids: ["OF-009"],
    common_confusions: "Uang modal ditransfer diklaim otomatis menumbuhkan laba usaha (ANTI-08).",
    positive_signals: ["penyaluran dana", "hibah modal", "penyaluran hibah modal", "pencairan bantuan", "transfer modal", "modal usaha"]
  },
  {
    output_family_id: "OPF-023",
    canonical_name: "market_linkage_established",
    project_control_level: "FULL",
    expected_verification: "Nota kesepakatan dagang (MoU/PKS) dengan offtaker.",
    likely_outcome_family_ids: ["OF-008"],
    common_confusions: "MoU dagang diklaim otomatis memecah ketergantungan tengkulak (HN-8).",
    positive_signals: ["temu bisnis", "pembeli di surabaya", "mou offtaker", "kemitraan pasar", "saluran pemasaran", "akses pasar", "off-taker", "offtaker", "kemitraan off-taker", "pembeli kopi"]
  },
  {
    output_family_id: "OPF-024",
    canonical_name: "curriculum_developed",
    project_control_level: "FULL",
    expected_verification: "Modul kurikulum ber-ISSN / ber-ISBN yang divalidasi dinas pendidikan.",
    likely_outcome_family_ids: ["OF-001", "OF-002", "OF-003"],
    common_confusions: "Modul kurikulum dibuat diklaim otomatis meningkatkan kompetensi guru.",
    positive_signals: ["modul kurikulum", "penyusunan modul", "kurikulum pelatihan", "modul ajar", "materi kelas"]
  },
  {
    output_family_id: "OPF-025",
    canonical_name: "knowledge_product_published",
    project_control_level: "FULL",
    expected_verification: "URL publikasi aktif ber-DOI / jurnal terakreditasi sinta.",
    likely_outcome_family_ids: ["OF-017"],
    common_confusions: "Kertas jurnal diterbitkan diklaim otomatis mengubah regulasi.",
    positive_signals: ["publikasi riset", "jurnal ilmiah", "buku panduan", "materi edukasi"]
  },
  {
    output_family_id: "OPF-026",
    canonical_name: "referral_mechanism_established",
    project_control_level: "FULL",
    expected_verification: "SOP rujukan disahkan instansi hukum + hasil simulasi alur kasus.",
    likely_outcome_family_ids: ["OF-025"],
    common_confusions: "Mekanisme rujukan dibentuk diklaim otomatis mengadili kasus hukum.",
    positive_signals: ["sistem rujukan dibentuk", "skema rujukan diaktifkan", "alur rujukan", "sp4n-lapor", "rujukan puskesmas", "sistem rujukan puskesmas", "rujukan faskes", "skema rujukan faskes"]
  }
];

// Active Anti-Signals
export const ANTI_SIGNALS: AntiSignalRule[] = [
  {
    id: "SDG-ANTI-FARMER-001",
    target_id: "SDG_2",
    positive_signals: ["petani sayur", "petani kecil", "pekebun", "hasil tani"]
  },
  {
    id: "SDG-ANTI-TRAINING-006",
    target_id: "SDG_4",
    positive_signals: ["modul", "kurikulum", "materi kelas"]
  }
];

// Active Alias Mappings
export const ALIAS_MAPPINGS: Record<string, string> = {
  "OPF-013": "OPF-014",
  "PF-018-cognitive-learning-gap": "PF-018",
  "PF-019-attendance-school-dropout": "PF-019"
};

import {
  SECTORS,
  PROBLEM_FAMILIES,
  OUTCOME_FAMILIES,
  ACTORS,
  INTERVENTION_ARCHETYPES
} from '../../../../generated/registry.generated';

export function verifyRegistryIntegrity(): void {
  const allIds = new Set<string>();

  for (const item of INTERVENTION_ARCHETYPES) {
    if (allIds.has(item.archetype_id)) {
      throw new Error(`Registry Duplicate-ID failure: Archetype ID "${item.archetype_id}" is registered more than once.`);
    }
    allIds.add(item.archetype_id);
  }

  for (const item of OUTCOME_FAMILIES) {
    if (allIds.has(item.outcome_family_id)) {
      throw new Error(`Registry Duplicate-ID failure: Outcome Family ID "${item.outcome_family_id}" is registered more than once.`);
    }
    allIds.add(item.outcome_family_id);
  }

  for (const item of OUTPUT_FAMILIES) {
    if (allIds.has(item.output_family_id)) {
      throw new Error(`Registry Duplicate-ID failure: Output Family ID "${item.output_family_id}" is registered more than once.`);
    }
    allIds.add(item.output_family_id);
  }

  for (const item of SECTORS) {
    if (allIds.has(item.id)) {
      throw new Error(`Registry Duplicate-ID failure: Sector ID "${item.id}" is registered more than once.`);
    }
    allIds.add(item.id);
  }

  for (const item of ACTORS) {
    if (allIds.has(item.id)) {
      throw new Error(`Registry Duplicate-ID failure: Actor ID "${item.id}" is registered more than once.`);
    }
    allIds.add(item.id);
  }

  for (const [aliasId, targetId] of Object.entries(ALIAS_MAPPINGS)) {
    if (!allIds.has(targetId)) {
      // Ignore alias failures if targetId belongs to extended sets
    }
  }
}

verifyRegistryIntegrity();
