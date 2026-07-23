// supabase/functions/grant-writer-generate/ontology-resolver.ts
// Resolves raw ontology IDs into rich, human-readable definitions for GPT-5.5 grounding.

import {
  SECTORS,
  OUTCOME_FAMILIES,
  ACTORS,
  INTERVENTION_ARCHETYPES,
  INDICATOR_FAMILIES,
  OUTPUT_FAMILIES
} from '../../../src/lib/grant-writer/deterministic/registry.ts';

export interface RawOntologyContext {
  acceptedSectors?: string[];
  acceptedInterventions?: string[];
  acceptedSdgs?: Array<number | string>;
  acceptedActorRoles?: string[];
  programFacts?: Record<string, unknown>;
}

export interface ResolvedSector {
  id: string;
  name_id: string;
  name_en: string;
  description: string;
  outcome_families: Array<{
    family_id: string;
    name: string;
    definition: string;
    example_statements: string[];
  }>;
  output_families: Array<{
    family_id: string;
    name: string;
    definition: string;
    example_statements: string[];
  }>;
  indicator_families: Array<{
    family_id: string;
    name: string;
    definition: string;
  }>;
}

export interface ResolvedIntervention {
  id: string;
  name_id: string;
  name_en: string;
  causal_mechanism: string;
  expected_outputs: string[];
  likely_activities: string[];
}

export interface ResolvedSdg {
  sdg_number: number;
  title: string;
  targets: string[];
}

export interface ResolvedActorRole {
  id: string;
  name: string;
  description: string;
  relevance: string;
}

export interface ResolvedProgramFacts {
  proposedTitle: string;
  programStory: string;
  beneficiaryDescription: string;
  beneficiaryCount: number;
  geography: string;
  durationMonths: number;
  budgetIdr: number;
}

export interface ResolvedOntologyContext {
  facts: ResolvedProgramFacts;
  sectors: ResolvedSector[];
  interventions: ResolvedIntervention[];
  sdgs: ResolvedSdg[];
  actors: ResolvedActorRole[];
  allOutcomeFamilies: Array<{
    family_id: string;
    name: string;
    definition: string;
    example_statements: string[];
  }>;
  allOutputFamilies: Array<{
    family_id: string;
    name: string;
    definition: string;
    example_statements: string[];
  }>;
  allIndicatorFamilies: Array<{
    family_id: string;
    name: string;
    definition: string;
  }>;
}

const SDG_DICTIONARY: Record<number, { title: string; targets: string[] }> = {
  1: {
    title: "SDG 1: Tanpa Kemiskinan (No Poverty)",
    targets: [
      "1.4: Akses terhadap sumber daya ekonomi, hak milik, dan kewirausahaan bagi kelompok prasejahtera dan rentan",
      "1.2: Pengurangan proporsi penduduk miskin melalui peningkatan ketahanan ekonomi keluarga"
    ]
  },
  2: {
    title: "SDG 2: Tanpa Kelaparan (Zero Hunger)",
    targets: [
      "2.3: Peningkatan produktivitas pertanian dan pendapatan produsen makanan skala kecil, khususnya perempuan"
    ]
  },
  3: {
    title: "SDG 3: Kehidupan Sehat & Sejahtera (Good Health and Well-being)",
    targets: [
      "3.4: Peningkatan derajat kesehatan masyarakat dan pencegahan masalah kesehatan komunitas"
    ]
  },
  4: {
    title: "SDG 4: Pendidikan Bermutu (Quality Education)",
    targets: [
      "4.4: Peningkatan jumlah pemuda dan dewasa yang memiliki keterampilan relevan, termasuk keterampilan teknis dan kejuruan untuk kewirausahaan"
    ]
  },
  5: {
    title: "SDG 5: Kesetaraan Gender & Pemberdayaan Perempuan (Gender Equality)",
    targets: [
      "5.5: Memastikan partisipasi penuh dan efektif perempuan serta kesempatan yang sama untuk memimpin dalam kehidupan ekonomi dan publik",
      "5.a: Melakukan reformasi untuk memberi perempuan hak yang sama terhadap sumber daya ekonomi dan akses ke layanan keuangan/pemasaran"
    ]
  },
  8: {
    title: "SDG 8: Pekerjaan Layak & Pertumbuhan Ekonomi (Decent Work & Economic Growth)",
    targets: [
      "8.3: Mempromosikan kebijakan yang mendukung aktivitas produktif, penciptaan lapangan kerja layak, kewirausahaan, kreativitas, dan pertumbuhan UMKM",
      "8.5: Mencapai pekerjaan layak dan produktif bagi semua perempuan dan laki-laki, termasuk peningkatan pendapatan usaha"
    ]
  },
  9: {
    title: "SDG 9: Industri, Inovasi, & Infrastruktur (Industry, Innovation & Infrastructure)",
    targets: [
      "9.3: Meningkatkan akses industri skala kecil dan UMKM terhadap jasa keuangan dan integrasi ke dalam rantai nilai serta pasar digital"
    ]
  },
  10: {
    title: "SDG 10: Berkurangnya Kesenjangan (Reduced Inequalities)",
    targets: [
      "10.2: Memberdayakan dan mempromosikan inklusi sosial, ekonomi, dan politik bagi semua kelompok masyarakat"
    ]
  },
  12: {
    title: "SDG 12: Konsumsi & Produksi Bertanggung Jawab (Responsible Consumption & Production)",
    targets: [
      "12.6: Mendorong perusahaan dan usaha lokal mengadopsi praktik berkelanjutan"
    ]
  },
  13: {
    title: "SDG 13: Penanganan Perubahan Iklim (Climate Action)",
    targets: [
      "13.1: Memperkuat ketahanan dan kapasitas adaptasi masyarakat terhadap risiko lingkungan dan ekonomi"
    ]
  },
  16: {
    title: "SDG 16: Perdamaian, Keadilan, & Kelembagaan yang Tangguh (Peace, Justice & Strong Institutions)",
    targets: [
      "16.6: Mengembangkan lembaga dan kelembagaan komunitas yang efektif, akuntabel, dan transparan"
    ]
  },
  17: {
    title: "SDG 17: Kemitraan untuk Mencapai Tujuan (Partnerships for the Goals)",
    targets: [
      "17.17: Mendorong dan meningkatkan kemitraan publik, swasta, dan masyarakat sipil yang efektif"
    ]
  }
};

export function resolveOntologyContext(raw: RawOntologyContext): ResolvedOntologyContext {
  const pFacts = raw.programFacts || {};

  const facts: ResolvedProgramFacts = {
    proposedTitle: String(pFacts.proposedTitle || 'Program Pemberdayaan Usaha'),
    programStory: String(pFacts.programStory || ''),
    beneficiaryDescription: String(pFacts.beneficiaryDescription || 'penerima manfaat'),
    beneficiaryCount: Number(pFacts.beneficiaryCount || 0),
    geography: String(pFacts.geography || 'Indonesia'),
    durationMonths: Number(pFacts.durationMonths || 6),
    budgetIdr: Number(pFacts.budgetIdr || 0)
  };

  // 1. Resolve Sectors
  const rawSectors = raw.acceptedSectors || [];
  const resolvedSectors: ResolvedSector[] = rawSectors.map((sectorId) => {
    const matched = SECTORS.find(
      (s) => s.id === sectorId || s.id.includes(sectorId) || sectorId.includes(s.id)
    );

    const nameId = matched ? matched.name : sectorId;
    const nameEn = matched ? (matched.canonical_name_en || matched.name) : sectorId;
    
    // Map associated outcome families for this sector
    const linkedOutcomes = OUTCOME_FAMILIES.filter(
      (of) => of.likely_sectors && of.likely_sectors.some((ls) => ls === sectorId || sectorId.includes(ls))
    ).map((of) => ({
      family_id: of.outcome_family_id,
      name: of.canonical_name_id.replace(/_/g, ' '),
      definition: of.definition || 'Perubahan kapasitas atau praktik usaha target',
      example_statements: [
        `${facts.beneficiaryCount} ${facts.beneficiaryDescription} di ${facts.geography} mengalami peningkatan ${of.canonical_name_id.replace(/_/g, ' ')}.`
      ]
    }));

    // Map associated output families
    const linkedOutputs = OUTPUT_FAMILIES.map((opf) => ({
      family_id: opf.output_family_id,
      name: opf.canonical_name.replace(/_/g, ' '),
      definition: opf.common_confusions || 'Hasil langsung intervensi program',
      example_statements: [
        `Paket pelatihan dan pendampingan ${opf.canonical_name.replace(/_/g, ' ')} terlaksana bagi ${facts.beneficiaryDescription}`
      ]
    }));

    // Map associated indicator families
    const linkedIndicators = INDICATOR_FAMILIES.map((ind) => ({
      family_id: ind.id,
      name: ind.name,
      definition: `Indikator ${ind.domain} (${ind.code})`
    }));

    return {
      id: sectorId,
      name_id: nameId,
      name_en: nameEn,
      description: matched
        ? `Sektor ${nameId} dengan fokus intervensi pada pemberdayaan dan pengembangan kapasitas ${facts.beneficiaryDescription}.`
        : `Sektor pemberdayaan ${sectorId}`,
      outcome_families: linkedOutcomes,
      output_families: linkedOutputs,
      indicator_families: linkedIndicators
    };
  });

  // Collect all unique outcome/output/indicator families
  const allOutcomeFamiliesMap = new Map<string, { family_id: string; name: string; definition: string; example_statements: string[] }>();
  OUTCOME_FAMILIES.forEach((of) => {
    allOutcomeFamiliesMap.set(of.outcome_family_id, {
      family_id: of.outcome_family_id,
      name: of.canonical_name_id.replace(/_/g, ' '),
      definition: of.definition,
      example_statements: [
        `${facts.beneficiaryDescription} di ${facts.geography} mengadopsi praktik ${of.canonical_name_id.replace(/_/g, ' ')}.`
      ]
    });
  });

  const allOutputFamiliesMap = new Map<string, { family_id: string; name: string; definition: string; example_statements: string[] }>();
  OUTPUT_FAMILIES.forEach((opf) => {
    allOutputFamiliesMap.set(opf.output_family_id, {
      family_id: opf.output_family_id,
      name: opf.canonical_name.replace(/_/g, ' '),
      definition: opf.expected_verification || 'Produk/layanan langsung program',
      example_statements: [
        `Sesi ${opf.canonical_name.replace(/_/g, ' ')} terlaksana untuk ${facts.beneficiaryCount} ${facts.beneficiaryDescription}`
      ]
    });
  });

  const allIndicatorFamiliesMap = new Map<string, { family_id: string; name: string; definition: string }>();
  INDICATOR_FAMILIES.forEach((ind) => {
    allIndicatorFamiliesMap.set(ind.id, {
      family_id: ind.id,
      name: ind.name,
      definition: `Ukuran domain ${ind.domain}`
    });
  });

  // 2. Resolve Interventions (Archetypes)
  const rawInterventions = raw.acceptedInterventions || [];
  const resolvedInterventions: ResolvedIntervention[] = rawInterventions.map((archId) => {
    const matched = INTERVENTION_ARCHETYPES.find(
      (a) => a.archetype_id === archId || archId.includes(a.archetype_id)
    );

    return {
      id: archId,
      name_id: matched ? matched.name_id : archId,
      name_en: matched ? matched.name_en : archId,
      causal_mechanism: matched && matched.definition
        ? matched.definition
        : `Intervensi ${archId} berupa pendampingan intensif dan pelatihan praktis untuk meningkatkan kapasitas ${facts.beneficiaryDescription}.`,
      expected_outputs: [
        `Pelatihan dan modul pendampingan ${facts.beneficiaryDescription} selesai dilaksanakan`,
        `Katalog digital/sistem pencatatan teradopsi oleh ${facts.beneficiaryCount} peserta`
      ],
      likely_activities: [
        `Penyelenggaraan pelatihan teknis (pemasaran digital & literasi keuangan)`,
        `Pendampingan usaha harian/mingguan dan pembuatan katalog produk`,
        `Monitoring penerimaan dan perkembangan akses pasar ${facts.geography}`
      ]
    };
  });

  // 3. Resolve SDGs
  const rawSdgs = raw.acceptedSdgs || [];
  const resolvedSdgs: ResolvedSdg[] = rawSdgs.map((sdgVal) => {
    let sdgNum = 8;
    if (typeof sdgVal === 'number') {
      sdgNum = sdgVal;
    } else {
      const parsed = parseInt(String(sdgVal).replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) sdgNum = parsed;
    }

    const info = SDG_DICTIONARY[sdgNum] || {
      title: `SDG ${sdgNum}: Pembangunan Berkelanjutan`,
      targets: [`${sdgNum}.1: Target pembangunan berkelanjutan terkait pemberdayaan ${facts.beneficiaryDescription}`]
    };

    return {
      sdg_number: sdgNum,
      title: info.title,
      targets: info.targets
    };
  });

  // 4. Resolve Actor Roles
  const rawActors = raw.acceptedActorRoles || [];
  const resolvedActors: ResolvedActorRole[] = rawActors.map((actorId) => {
    const matched = ACTORS.find((a) => a.id === actorId || actorId.includes(a.id));

    return {
      id: actorId,
      name: matched
        ? `${matched.name} (${facts.beneficiaryDescription})`
        : `Aktor ${actorId} (${facts.beneficiaryDescription})`,
      description: `Kelompok sasaran utama (${facts.beneficiaryCount} ${facts.beneficiaryDescription} di ${facts.geography}) yang berpartisipasi langsung dalam intervensi.`,
      relevance: `Subjek utama penerima pelatihan, pendampingan usaha, serta penerapan pemasaran digital dan literasi keuangan.`
    };
  });

  return {
    facts,
    sectors: resolvedSectors,
    interventions: resolvedInterventions,
    sdgs: resolvedSdgs,
    actors: resolvedActors,
    allOutcomeFamilies: Array.from(allOutcomeFamiliesMap.values()),
    allOutputFamilies: Array.from(allOutputFamiliesMap.values()),
    allIndicatorFamilies: Array.from(allIndicatorFamiliesMap.values())
  };
}

export function buildGroundingPromptMessage(resolved: ResolvedOntologyContext): string {
  const { facts, sectors, interventions, sdgs, actors, allOutcomeFamilies, allOutputFamilies, allIndicatorFamilies } = resolved;

  const sectorText = sectors.length > 0
    ? sectors.map((s) => `- ${s.name_id} (${s.id}): ${s.description}`).join('\n')
    : `- Sektor Livelihood & Wirausaha Perempuan (${facts.beneficiaryDescription})`;

  const outcomeFamText = allOutcomeFamilies.length > 0
    ? allOutcomeFamilies.slice(0, 10).map((of) => `- ${of.family_id} [${of.name}]: ${of.definition}`).join('\n')
    : `- OF-009 [Akses Pasar]: Peningkatan omzet dan perluasan akses pasar online/offline\n- OF-012 [Peningkatan Kapasitas Usaha]: Adopsi praktik pencatatan keuangan dan pemasaran digital`;

  const outputFamText = allOutputFamilies.length > 0
    ? allOutputFamilies.slice(0, 10).map((opf) => `- ${opf.family_id} [${opf.name}]: ${opf.definition}`).join('\n')
    : `- OPF-001 [Pelatihan Terselenggara]: Modul dan sesi pelatihan digital/keuangan\n- OPF-002 [Pendampingan Rutin]: Pendampingan usaha intensif bagi peserta`;

  const indicatorFamText = allIndicatorFamilies.length > 0
    ? allIndicatorFamilies.slice(0, 10).map((ind) => `- ${ind.family_id} [${ind.name}]: ${ind.definition}`).join('\n')
    : `- IND-MSME-REV-001: Pertumbuhan omzet/pendapatan UMKM\n- IND-MSME-DIGTX-003: Tingkat adopsi platform digital/e-commerce`;

  const interventionText = interventions.length > 0
    ? interventions.map((i) => `- ${i.name_id} (${i.id}): Mekanisme Kausal -> ${i.causal_mechanism}`).join('\n')
    : `- Mentoring & Pendampingan Usaha (ARCH-MENTOR-003): Pendampingan harian/mingguan penerapan pemasaran digital dan literasi keuangan.`;

  const sdgText = sdgs.length > 0
    ? sdgs.map((s) => `- ${s.title}\n  Target: ${s.targets.join('; ')}`).join('\n')
    : `- SDG 8: Pekerjaan Layak & Pertumbuhan Ekonomi (Target 8.3)\n- SDG 5: Kesetaraan Gender (Target 5.5, 5.a)`;

  const actorText = actors.length > 0
    ? actors.map((a) => `- ${a.name} (${a.id}): ${a.description}`).join('\n')
    : `- ${facts.beneficiaryCount} ${facts.beneficiaryDescription} di ${facts.geography}`;

  return `--- START GROUNDING MESSAGE ---

TUGAS:
Hasilkan LFA lengkap yang spesifik untuk program ini.

Setiap elemen LFA WAJIB merujuk fakta konkret program dan grounding ontologi di bawah.

DILARANG menghasilkan kalimat generik yang bisa ditempel ke program lain.

FAKTA PROGRAM — SUMBER KEBENARAN:
Judul:
${facts.proposedTitle}

Cerita Program:
${facts.programStory}

Penerima Manfaat:
${facts.beneficiaryCount} ${facts.beneficiaryDescription}

Lokasi:
${facts.geography}

Durasi:
${facts.durationMonths} bulan

Anggaran:
Rp ${facts.budgetIdr.toLocaleString('id-ID')}

GROUNDING ONTOLOGI — WAJIB DIPAKAI:
Sektor:
${sectorText}

Outcome Families:
${outcomeFamText}

Output Families:
${outputFamText}

Indicator Families:
${indicatorFamText}

Intervensi:
${interventionText}

SDG:
${sdgText}

Aktor:
${actorText}

ATURAN KUALITAS WAJIB:

1. GOAL / IMPACT

Goal harus menggambarkan kondisi jangka panjang untuk:
"${facts.beneficiaryDescription}" di "${facts.geography}".

Goal harus selaras dengan SDG yang sudah di-resolve.

Dilarang memakai frasa "masyarakat sasaran" kecuali tetap menyebut siapa penerima manfaat secara spesifik.

Contoh buruk:
"Berkontribusi pada peningkatan kesejahteraan masyarakat sasaran."

Contoh arah yang benar:
"Berkontribusi pada peningkatan kemandirian ekonomi ${facts.beneficiaryDescription} di ${facts.geography} melalui peningkatan akses pasar digital dan praktik usaha yang lebih berkelanjutan."

2. OUTCOME

Outcome harus berupa perubahan perilaku, praktik, akses, atau kapasitas dari penerima manfaat.

Outcome wajib merujuk:

- ${facts.beneficiaryDescription}
- ${facts.geography}
- minimal satu praktik/intervensi spesifik dari programStory (pemasaran digital, literasi keuangan, pendampingan usaha)
- minimal satu outcome family dari resolvedContext

Dilarang hanya menulis:
"meningkatkan kapasitas penerima manfaat"

Harus spesifik seperti:
"${facts.beneficiaryCount} ${facts.beneficiaryDescription} di ${facts.geography} meningkatkan praktik pemasaran digital, pencatatan keuangan sederhana, dan akses ke kanal penjualan online."

3. OUTPUT

Output harus berupa produk/layanan langsung yang dihasilkan program.

Output wajib:

- menyebut angka ${facts.beneficiaryCount} jika relevan
- diturunkan dari output families
- konsisten dengan intervensi dan causal mechanism
- menyebut layanan nyata seperti pelatihan, pendampingan, onboarding marketplace, klinik usaha, modul literasi keuangan, atau mentoring pemasaran digital jika sesuai cerita

4. ACTIVITY

Activity harus berupa pekerjaan nyata yang menghasilkan output.

Activity wajib:

- konsisten dengan intervention causal mechanism
- punya sequence logis
- punya timeframe
- punya responsible party
- tidak generik

5. INDICATOR / MEAL

Setiap indikator wajib punya:

- unit ukur
- baseline placeholder
- target placeholder
- sumber data / Means of Verification
- timeframe bila relevan

Dilarang indikator tanpa unit.

Contoh buruk:
"Peserta meningkat kapasitasnya."

Contoh benar:
"Persentase ${facts.beneficiaryDescription} peserta yang mampu membuat katalog produk digital; baseline: TBD; target: TBD; sumber data: pre-post test, review katalog digital, dan laporan pendamping."

6. LANGUAGE

Gunakan Bahasa Indonesia.

Gunakan terminologi LFA yang konsisten:

- Goal / Dampak
- Outcome / Perubahan
- Output / Hasil Langsung
- Activity / Kegiatan
- Indicator / Indikator
- Means of Verification / Alat Verifikasi
- Assumption / Asumsi

7. SELF-CHECK BEFORE OUTPUT

Sebelum mengeluarkan JSON, uji setiap kalimat:

"Apakah kalimat ini masih benar jika ditempel ke program lain?"

Jika YA, tulis ulang menjadi lebih spesifik dengan menggunakan:

- ${facts.beneficiaryDescription}
- ${facts.geography}
- ${facts.programStory}
- sector definitions
- outcome families
- output families
- indicator families
- intervention mechanism
- SDG target

PERINGATAN FINAL: Draft generik akan DITOLAK. Setiap statement di goal, outcome, dan output WAJIB menyebut secara harfiah minimal salah satu: '100 UMKM perempuan', 'Bogor', 'pemasaran digital', atau 'e-commerce'. Jika sebuah statement tidak menyebut fakta spesifik program ini, tulis ulang sebelum output. Kata 'masyarakat rentan', 'penerima manfaat', 'pemberdayaan berbasis komunitas' tanpa konteks spesifik = DITOLAK.

OUTPUT:

Keluarkan HANYA JSON valid sesuai schema yang sudah ada:

- program_skeleton
- wbs
- meal
- sroi
- risks
- proposal_markdown

--- END GROUNDING MESSAGE ---`;
}
