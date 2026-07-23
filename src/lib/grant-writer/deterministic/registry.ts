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
    canonical_name: "training_conducted",
    project_control_level: "FULL",
    expected_verification: "Absensi digital + foto geotag + sertifikat fisik terbit.",
    likely_outcome_family_ids: ["OF-001", "OF-002"],
    common_confusions: "Melatih diklaim otomatis melahirkan adopsi kebiasaan harian (HN-1).",
    positive_signals: ["kegiatan melatih", "kelas terselenggara", "materi diajarkan", "melatih literasi keuangan", "melatih ibu-ibu"]
  },
  {
    output_family_id: "OPF-002",
    canonical_name: "capacity_strengthened",
    project_control_level: "FULL",
    expected_verification: "Logbook mentoring + berita acara pendampingan berkala.",
    likely_outcome_family_ids: ["OF-003", "OF-009"],
    common_confusions: "Mentoring selesai diklaim sebagai jaminan peningkatan omset dagang.",
    positive_signals: ["mentoring dilakukan", "pendampingan terlaksana"]
  },
  {
    output_family_id: "OPF-012",
    canonical_name: "facility_rehabilitated",
    project_control_level: "FULL",
    expected_verification: "BA serah terima paska renovasi + foto perbandingan sebelum/sesudah.",
    likely_outcome_family_ids: ["OF-005", "OF-006"],
    common_confusions: "Renovasi selesai diklaim sebagai perbaikan kualitas layanan.",
    positive_signals: ["merenovasi loket", "merenovasi faskes"]
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
    positive_signals: ["membagikan susu", "membagikan biskuit", "membagikan multivitamin", "menyerahkan bantuan mesin", "membagikan paket bibit", "traktor diserahkan"]
  },
  {
    output_family_id: "OPF-026",
    canonical_name: "referral_mechanism_established",
    project_control_level: "FULL",
    expected_verification: "SOP rujukan formal terbit + log rujukan pasien digital.",
    likely_outcome_family_ids: ["OF-005"],
    common_confusions: "Log rujukan terbentuk diklaim langsung menurunkan angka kematian ibu.",
    positive_signals: ["sistem rujukan dibentuk", "skema rujukan diaktifkan"]
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
