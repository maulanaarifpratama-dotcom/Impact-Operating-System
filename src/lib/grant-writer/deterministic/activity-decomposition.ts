/**
 * Activity Decomposition Engine (27.5k Brain Specification)
 * Module: activity-decomposition.ts
 *
 * Responsibilities:
 * - Accepts Page1Input, CanonicalOutputV2[] (from Output Expansion Engine), and CanonicalCandidate[].
 * - Decomposes each CanonicalOutputV2 into 2–4 parent-linked CanonicalActivityV2 nodes.
 * - Guarantees mandatory parent_output_id linkage on every single activity (no orphans).
 * - Bounds activity count per output to 2–4 operational activities.
 * - Assigns valid activity_type ('workshop' | 'procurement' | 'coaching' | 'construction' | 'software_dev' | 'campaign').
 */

import type {
  Page1Input,
  CanonicalOutputV2,
  CanonicalActivityV2,
  CanonicalCandidate
} from './types';

export interface ActivityDecompositionResult {
  activities: CanonicalActivityV2[];
  outputsWithActivities: CanonicalOutputV2[];
  guardrail_status: 'PASS' | 'WARNING' | 'FAIL';
  issues: string[];
}

interface ActivityTemplate {
  code_suffix: string;
  name_template: (outputName: string) => string;
  desc_template: (outputName: string) => string;
  activity_type: 'workshop' | 'procurement' | 'coaching' | 'construction' | 'software_dev' | 'campaign';
  owner_role: string;
}

const TRAINING_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'PREP',
    name_template: (outName) => `Penyusunan Kurikulum, Modul, dan Instumen ${outName}`,
    desc_template: (outName) => `Menyiapkan silabus, modul pelatihan, media presentasi, dan lembar evaluasi kompetensi peserta.`,
    activity_type: 'workshop',
    owner_role: 'Instruktur Utama / Specialist'
  },
  {
    code_suffix: 'RECRUIT',
    name_template: (outName) => `Sosialisasi dan Rekrutmen Peserta ${outName}`,
    desc_template: (outName) => `Melakukan verifikasi kriteria sasaran, pendaftaran, dan penetapan daftar peserta resmi.`,
    activity_type: 'campaign',
    owner_role: 'Fasilitator Lapangan'
  },
  {
    code_suffix: 'TRAIN',
    name_template: (outName) => `Penyelenggaraan Sesi Pelatihan dan Kelas Praktik ${outName}`,
    desc_template: (outName) => `Melaksanakan tatap muka kelas, simulasi praktik, pengerjaan tugas mandiri, dan tes kompetensi.`,
    activity_type: 'workshop',
    owner_role: 'Tim Proyek & Instruktur'
  },
  {
    code_suffix: 'COACH',
    name_template: (outName) => `Pendampingan Pasca-Pelatihan dan Evaluasi Kelulusan`,
    desc_template: (outName) => `Memberikan pendampingan rutin, penilaian paska-kelas, dan penerbitan sertifikat kompetensi kelulusan.`,
    activity_type: 'coaching',
    owner_role: 'Fasilitator Lapangan'
  }
];

const GOODS_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'SURVEY',
    name_template: (outName) => `Survei Spesifikasi Teknis dan Verifikasi Calon Penerima Bantuan`,
    desc_template: (outName) => `Melakukan identifikasi detail spesifikasi barang/paket dan verifikasi data penerima manfaat.`,
    activity_type: 'procurement',
    owner_role: 'Tim Proyek'
  },
  {
    code_suffix: 'PROCURE',
    name_template: (outName) => `Pengadaan Bantuan Sarana dan Peralatan`,
    desc_template: (outName) => `Pelaksanaan tender/pembelian barang sarana sesuai standar spesifikasi dan pemeriksaan mutu fisik.`,
    activity_type: 'procurement',
    owner_role: 'Tim Pengadaan / Vendor'
  },
  {
    code_suffix: 'DISTRIBUTE',
    name_template: (outName) => `Distribusi dan Penyerahan Sarana/Peralatan`,
    desc_template: (outName) => `Pengiriman unit/paket bantuan ke lokasi target dan penandatanganan berita acara serah terima (BAST).`,
    activity_type: 'procurement',
    owner_role: 'Fasilitator Lapangan'
  },
  {
    code_suffix: 'MONITOR',
    name_template: (outName) => `Pemantauan Pemanfaatan dan Pemeliharaan Sarana`,
    desc_template: (outName) => `Supervisi berkala penggunaan barang/peralatan oleh penerima manfaat agar berfungsi secara optimal.`,
    activity_type: 'coaching',
    owner_role: 'Fasilitator Lapangan'
  }
];

const INFRASTRUCTURE_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'PLAN',
    name_template: (outName) => `Survei Lokasi dan Penyusunan Rencana Teknis Konstruksi`,
    desc_template: (outName) => `Melakukan pemetaan lahan, pengukuran teknis, dan penyusunan gambar kerja serta RAB pembangunan.`,
    activity_type: 'construction',
    owner_role: 'Tim Teknis / Insinyur'
  },
  {
    code_suffix: 'BUILD',
    name_template: (outName) => `Pelaksanaan Pembangunan Fisik dan Konstruksi Fasilitas`,
    desc_template: (outName) => `Pengerjaan fisik fasilitas/sarana publik oleh pekerja/mitra dengan pengawasan standar K3 dan kualitas.`,
    activity_type: 'construction',
    owner_role: 'Kontraktor / Tukang Lokal'
  },
  {
    code_suffix: 'INSPECT',
    name_template: (outName) => `Inspeksi Kualitas, Pengujian Fungsi, dan Serah Terima Bangunan`,
    desc_template: (outName) => `Uji kelayakan fungsi fasilitas, verifikasi dinas/pemangku kepentingan, dan serah terima operasional.`,
    activity_type: 'construction',
    owner_role: 'Tim Proyek & Dinas Terkait'
  }
];

const DIGITAL_SYSTEM_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'REQ',
    name_template: (outName) => `Analisis Kebutuhan Pengguna dan Desain Arsitektur Sistem`,
    desc_template: (outName) => `Mengumpulkan spesifikasi fitur, merancang alur rujukan/data, dan membuat mockup antarmuka digital.`,
    activity_type: 'software_dev',
    owner_role: 'System Analyst / Lead Dev'
  },
  {
    code_suffix: 'DEV',
    name_template: (outName) => `Pengembangan Platform Digital dan Pengujian (UAT)`,
    desc_template: (outName) => `Pengkodean sistem, integrasi basis data, pengujian keamanan, dan perbaikan bug bersama pengguna.`,
    activity_type: 'software_dev',
    owner_role: 'Tim IT / Developer'
  },
  {
    code_suffix: 'LAUNCH',
    name_template: (outName) => `Peluncuran Platform dan Pelatihan Operator/Admin`,
    desc_template: (outName) => `Deployment aplikasi ke server produksi, pelatihan tim admin/operator, dan sosialisasi penggunaan.`,
    activity_type: 'workshop',
    owner_role: 'Tim IT & Trainer'
  }
];

const SOP_DOCUMENT_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'DRAFT',
    name_template: (outName) => `Penyusunan Draf Dokumen SOP dan Pedoman Operasional`,
    desc_template: (outName) => `Mengkaji regulasi, menyusun alur tata kelola/prosedur kerja, dan penulisan draf awal SOP.`,
    activity_type: 'campaign',
    owner_role: 'Spesialis Tata Kelola'
  },
  {
    code_suffix: 'REVIEW',
    name_template: (outName) => `Lokakarya Konsultasi Stakeholder dan Pengesahan Dokumen`,
    desc_template: (outName) => `Menyelenggarakan FGD pembahasaan draf bersama pemangku kepentingan dan penandatanganan dokumen resmi.`,
    activity_type: 'workshop',
    owner_role: 'Tim Proyek & Pembina'
  },
  {
    code_suffix: 'SOCIALIZE',
    name_template: (outName) => `Sosialisasi dan Pendampingan Penerapan SOP`,
    desc_template: (outName) => `Mendistribusikan dokumen SOP yang telah disahkan, melatih staf pelaksana, dan mengawal uji coba penerapan.`,
    activity_type: 'campaign',
    owner_role: 'Fasilitator Lapangan'
  }
];

const SERVICE_MARKET_ACTIVITIES: ActivityTemplate[] = [
  {
    code_suffix: 'MAP',
    name_template: (outName) => `Pemetaan Mitra, Pembeli, dan Kelompok Sasaran`,
    desc_template: (outName) => `Melakukan pendataan calon mitra/offtaker, kualifikasi kelompok usaha, dan verifikasi kesiapan.`,
    activity_type: 'coaching',
    owner_role: 'Fasilitator Bisnis'
  },
  {
    code_suffix: 'FACILITATE',
    name_template: (outName) => `Fasilitasi Sesi Business Matching / Penyaluran Modal`,
    desc_template: (outName) => `Menyelenggarakan forum kemitraan pasar, penyusunan kesepakatan jual beli (PKS), atau pencairan dana hibah.`,
    activity_type: 'campaign',
    owner_role: 'Tim Proyek'
  },
  {
    code_suffix: 'MONITOR',
    name_template: (outName) => `Pendampingan Berkala dan Monitoring Kelancaran Kemitraan`,
    desc_template: (outName) => `Mengawal keterlaksanaan kontrak/penggunaan modal usaha dan evaluasi perkembangan transaksi.`,
    activity_type: 'coaching',
    owner_role: 'Fasilitator Lapangan'
  }
];

function selectTemplatesForOutput(output: CanonicalOutputV2): ActivityTemplate[] {
  const code = output.code;
  const deliverable = output.deliverable_type;

  if (code === 'OPF-011' || code === 'OPF-015') {
    return INFRASTRUCTURE_ACTIVITIES;
  }
  if (code === 'OPF-020' || code === 'OPF-026' || deliverable === 'digital_system') {
    return DIGITAL_SYSTEM_ACTIVITIES;
  }
  if (code === 'OPF-009' || code === 'OPF-010' || deliverable === 'sop_document') {
    return SOP_DOCUMENT_ACTIVITIES;
  }
  if (code === 'OPF-014' || deliverable === 'tangible_good') {
    return GOODS_ACTIVITIES;
  }
  if (code === 'OPF-001' || code === 'OPF-002' || code === 'OPF-024' || deliverable === 'training_completed') {
    return TRAINING_ACTIVITIES;
  }
  if (code === 'OPF-021' || code === 'OPF-022' || code === 'OPF-023' || deliverable === 'service') {
    return SERVICE_MARKET_ACTIVITIES;
  }

  // Default fallbacks
  return TRAINING_ACTIVITIES;
}

export function decomposeActivities(
  input: Page1Input,
  outputs: CanonicalOutputV2[],
  candidates: CanonicalCandidate[] = []
): ActivityDecompositionResult {
  const issues: string[] = [];
  const allActivities: CanonicalActivityV2[] = [];
  const outputsWithActivities: CanonicalOutputV2[] = [];

  let globalActivityIndex = 1;

  for (let opIdx = 0; opIdx < outputs.length; opIdx++) {
    const output = outputs[opIdx];

    if (!output.id) {
      issues.push(`Output at index ${opIdx} is missing mandatory id field.`);
      continue;
    }

    const templates = selectTemplatesForOutput(output);
    const activityCount = Math.min(Math.max(templates.length, 2), 4);
    const selectedTemplates = templates.slice(0, activityCount);

    const outputActivities: CanonicalActivityV2[] = [];

    for (let actIdx = 0; actIdx < selectedTemplates.length; actIdx++) {
      const tmpl = selectedTemplates[actIdx];
      const actId = `ACT-${globalActivityIndex++}`;
      const actCode = `ACT-${output.id.replace('OP-', '')}.${actIdx + 1}`;

      const activityNode: CanonicalActivityV2 = {
        id: actId,
        parent_output_id: output.id, // Mandatory Hard Requirement
        code: actCode,
        activity_name: tmpl.name_template(output.output_name),
        description: tmpl.desc_template(output.output_name),
        activity_type: tmpl.activity_type,
        owner_role: tmpl.owner_role,
        cost_drivers: []
      };

      outputActivities.push(activityNode);
      allActivities.push(activityNode);
    }

    // Attach activities array directly to CanonicalOutputV2
    const updatedOutputNode: CanonicalOutputV2 = {
      ...output,
      activities: outputActivities
    };

    outputsWithActivities.push(updatedOutputNode);
  }

  // Guardrail Evaluation
  let guardrail_status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

  if (outputs.length === 0) {
    guardrail_status = 'WARNING';
    issues.push('No outputs provided for activity decomposition.');
  }

  // Check orphan activities
  const orphanActivities = allActivities.filter((a) => !a.parent_output_id);
  if (orphanActivities.length > 0) {
    guardrail_status = 'FAIL';
    issues.push(`Found ${orphanActivities.length} orphan activities missing parent_output_id.`);
  }

  // Check activity bounding per output
  for (const op of outputsWithActivities) {
    if (!op.activities || op.activities.length === 0) {
      guardrail_status = 'FAIL';
      issues.push(`Output ${op.id} (${op.code}) has 0 activities.`);
    } else if (op.activities.length === 1) {
      if (guardrail_status !== 'FAIL') {
        guardrail_status = 'WARNING';
      }
      issues.push(`Output ${op.id} (${op.code}) has only 1 activity.`);
    } else if (op.activities.length < 2 || op.activities.length > 4) {
      if (guardrail_status !== 'FAIL') {
        guardrail_status = 'WARNING';
      }
      issues.push(`Output ${op.id} (${op.code}) has ${op.activities.length} activities (expected 2-4).`);
    }
  }

  return {
    activities: allActivities,
    outputsWithActivities,
    guardrail_status,
    issues
  };
}
