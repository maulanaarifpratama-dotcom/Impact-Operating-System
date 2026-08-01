// supabase/functions/grant-writer-generate/ontology-resolver.ts
// Resolves raw ontology IDs into rich, human-readable definitions for GPT grounding.

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
  beneficiaryCount: number | null;
  geography: string | null;
  durationMonths: number | null;
  budgetIdr: number | null;
}

export interface ProgramFacts {
  title: string | null;
  story: string | null;
  beneficiaryDescription: string | null;
  beneficiaryCount: number | string | null;
  geography: string | null;
  durationMonths: number | null;
  budgetIdr: number | null;
  optionalNotes: string | null;
  knownFacts: string[];
  missingFacts: string[];
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
      "4.4: Peningkatan jumlah pemuda dan dewasa yang memiliki keterampilan relevan, termasuk keterampilan teknis dan kejuruan"
    ]
  },
  5: {
    title: "SDG 5: Kesetaraan Gender & Pemberdayaan Perempuan (Gender Equality)",
    targets: [
      "5.5: Memastikan partisipasi penuh dan efektif perempuan serta kesempatan yang sama untuk memimpin dalam kehidupan ekonomi dan publik",
      "5.a: Melakukan reformasi untuk memberi perempuan hak yang sama terhadap sumber daya ekonomi"
    ]
  },
  8: {
    title: "SDG 8: Pekerjaan Layak & Pertumbuhan Ekonomi (Decent Work & Economic Growth)",
    targets: [
      "8.3: Mempromosikan kebijakan yang mendukung aktivitas produktif, penciptaan lapangan kerja layak, kewirausahaan, dan kreativitas",
      "8.5: Mencapai pekerjaan layak dan produktif bagi semua perempuan dan laki-laki"
    ]
  },
  9: {
    title: "SDG 9: Industri, Inovasi, & Infrastruktur (Industry, Innovation & Infrastructure)",
    targets: [
      "9.3: Meningkatkan akses industri skala kecil terhadap jasa keuangan dan integrasi ke dalam rantai nilai"
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

export function buildProgramFactsForPrompt(input: any): ProgramFacts {
  const pFacts = input?.programFacts || input?.ontology_context?.programFacts || input || {};
  const project = input?.project || {};
  const wizardData = input?.wizard_data || {};
  const wizardContext = wizardData?.context || {};

  /**
   * The wizard encodes "the author did not tell us" as the literal strings
   * 'unknown' and 'unentered', not as null. Numeric fields survive that by
   * accident — Number('unknown') is NaN and fails the > 0 test — but text fields
   * do not, so a program whose location was marked unknown was announced to the
   * model as a known fact: "Lokasi/Geografi: unknown". Worse, validateGrounding
   * then required the word "unknown" to appear in the generated logframe, failed,
   * and triggered a full retry — a second pass over the 27,500 token budget for
   * no reason. Treat the sentinels as absent.
   */
  const SENTINELS = new Set(['unknown', 'unentered', 'null', 'undefined', '']);
  const cleanText = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return SENTINELS.has(trimmed.toLowerCase()) ? null : trimmed || null;
  };

  const title = cleanText(pFacts.proposedTitle) || cleanText(pFacts.title) || cleanText(pFacts.programTitle)
    || cleanText(project.title) || cleanText(wizardContext.proposedTitle) || null;
  const story = cleanText(pFacts.programStory) || cleanText(pFacts.story) || cleanText(project.summary)
    || cleanText(wizardContext.background) || cleanText(wizardContext.problemStatement) || null;
  const beneficiaryDescription = cleanText(pFacts.beneficiaryDescription) || cleanText(wizardContext.beneficiaryDescription) || null;

  const rawCount = pFacts.beneficiaryCount ?? input?.beneficiaries ?? project.beneficiaryCount ?? wizardContext.beneficiaryCount;
  let beneficiaryCount: number | string | null = null;
  if (rawCount !== undefined && rawCount !== null && rawCount !== '' && Number(rawCount) > 0) {
    beneficiaryCount = Number(rawCount);
  }

  const geography = cleanText(pFacts.geography) || cleanText(project.geography) || cleanText(wizardContext.geography) || null;
  
  const rawDuration = pFacts.durationMonths ?? project.duration_months ?? wizardContext.durationMonths;
  let durationMonths: number | null = null;
  if (rawDuration !== undefined && rawDuration !== null && rawDuration !== '' && Number(rawDuration) > 0) {
    durationMonths = Number(rawDuration);
  }

  const rawBudget = pFacts.budgetIdr ?? project.budget_idr ?? wizardContext.budgetIdr;
  let budgetIdr: number | null = null;
  if (rawBudget !== undefined && rawBudget !== null && rawBudget !== '' && Number(rawBudget) > 0) {
    budgetIdr = Number(rawBudget);
  }

  const optionalNotes = cleanText(pFacts.optionalNotes) || cleanText(pFacts.notes) || cleanText(wizardContext.notes) || null;

  const knownFacts: string[] = [];
  const missingFacts: string[] = [];

  if (title) {
    knownFacts.push(`Judul Program: ${title}`);
  } else {
    missingFacts.push("Judul program belum dijelaskan oleh pengguna.");
  }

  if (story) {
    knownFacts.push(`Cerita Program: ${story}`);
  } else {
    missingFacts.push("Cerita/latar belakang program belum dijelaskan oleh pengguna.");
  }

  if (beneficiaryDescription) {
    knownFacts.push(`Deskripsi Penerima Manfaat: ${beneficiaryDescription}`);
  } else {
    missingFacts.push("Deskripsi penerima manfaat belum dijelaskan oleh pengguna.");
  }

  if (beneficiaryCount !== null) {
    knownFacts.push(`Jumlah Penerima Manfaat: ${beneficiaryCount}`);
  } else {
    missingFacts.push("Jumlah penerima manfaat belum dijelaskan oleh pengguna. Jangan mengarang angka penerima manfaat.");
  }

  if (geography) {
    knownFacts.push(`Lokasi/Geografi: ${geography}`);
  } else {
    missingFacts.push("Lokasi belum dijelaskan oleh pengguna. Jangan mengarang lokasi.");
  }

  if (durationMonths !== null) {
    knownFacts.push(`Durasi: ${durationMonths} bulan`);
  } else {
    missingFacts.push("Durasi belum dijelaskan oleh pengguna. Jangan mengarang durasi.");
  }

  if (budgetIdr !== null) {
    knownFacts.push(`Anggaran: Rp ${budgetIdr.toLocaleString('id-ID')}`);
  } else {
    missingFacts.push("Anggaran belum dijelaskan oleh pengguna. Jangan mengarang nilai anggaran.");
  }

  if (optionalNotes) {
    knownFacts.push(`Catatan Opsional: ${optionalNotes}`);
  }

  return {
    title,
    story,
    beneficiaryDescription,
    beneficiaryCount,
    geography,
    durationMonths,
    budgetIdr,
    optionalNotes,
    knownFacts,
    missingFacts
  };
}

export function extractGroundingTerms(programFacts: ProgramFacts, resolvedContext: ResolvedOntologyContext): string[] {
  const termsSet = new Set<string>();

  if (programFacts.beneficiaryDescription) {
    termsSet.add(programFacts.beneficiaryDescription);
  }
  if (programFacts.geography) {
    termsSet.add(programFacts.geography);
  }
  if (programFacts.beneficiaryCount !== null) {
    termsSet.add(String(programFacts.beneficiaryCount));
  }
  if (programFacts.durationMonths !== null) {
    termsSet.add(`${programFacts.durationMonths} bulan`);
  }
  if (programFacts.budgetIdr !== null) {
    termsSet.add(`Rp ${programFacts.budgetIdr.toLocaleString('id-ID')}`);
  }

  /**
   * Story-derived terms: proper nouns and domain vocabulary only.
   *
   * This used to take the first ten words longer than three characters that were
   * not in a short stopword list. On a real Indonesian program story that yields
   * "banyak", "ayah", "muda", "tidak", "terlibat", "melatih" — and the grounding
   * message then *orders* the model to work those words into Goal, Outcome,
   * Output and Indikator text. Forcing "tidak" and "banyak" into an indicator is
   * how you get an unmeasurable indicator.
   *
   * Keep only tokens that carry grounding value: capitalised proper nouns
   * (Cibuntu, Posyandu, Bandung) and all-caps domain acronyms (HPK, PMBA, KIA).
   * A sentence-initial word is skipped unless it repeats elsewhere mid-sentence,
   * since capitalisation there proves nothing.
   *
   * Safe to tighten: validateGrounding only ever checks beneficiaryDescription,
   * geography and beneficiaryCount, so these tokens never drive a retry — they
   * only shape the prompt.
   */
  if (programFacts.story) {
    const story = programFacts.story;
    const stopWords = new Set([
      'dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'pada', 'dengan', 'adalah', 'ini', 'itu',
      'atau', 'sebagai', 'oleh', 'serta', 'dalam', 'akan', 'dapat', 'kami', 'program',
      'tersebut', 'sangat', 'melalui', 'secara', 'agar', 'bisa', 'para', 'bagi',
      'banyak', 'tidak', 'sudah', 'belum', 'masih', 'juga', 'lebih', 'hanya', 'saja',
      'karena', 'sehingga', 'namun', 'tetapi', 'antara', 'setiap', 'seluruh', 'sebuah'
    ]);

    // Positions where a token starts a sentence — capitalisation is not evidence there.
    const sentenceStarts = new Set<string>();
    story.split(/(?<=[.!?])\s+/).forEach((sentence) => {
      const first = sentence.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}-]/gu, '');
      if (first) sentenceStarts.add(first);
    });

    const tokens = story
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const counts = new Map<string, number>();
    tokens.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));

    const isAcronym = (w: string) => w.length >= 3 && w.length <= 6 && /^[\p{Lu}\p{N}]+$/u.test(w) && /\p{Lu}/u.test(w);
    const isProperNoun = (w: string) => w.length > 3 && /^\p{Lu}\p{Ll}+/u.test(w);

    const kept: string[] = [];
    for (const token of tokens) {
      if (kept.length >= 8) break;
      if (stopWords.has(token.toLowerCase())) continue;
      if (kept.includes(token)) continue;
      if (!isAcronym(token) && !isProperNoun(token)) continue;
      // A word that only ever appears at a sentence start is probably just
      // sentence case, not a name.
      if (sentenceStarts.has(token) && (counts.get(token) ?? 0) < 2) continue;
      kept.push(token);
    }

    kept.forEach((w) => termsSet.add(w));
  }

  // Extract ONLY from matched sectors
  if (resolvedContext.sectors) {
    resolvedContext.sectors.forEach((s) => {
      if (s.name_id) termsSet.add(s.name_id);
      s.outcome_families?.slice(0, 3).forEach((of) => {
        if (of.name) termsSet.add(of.name);
      });
      s.output_families?.slice(0, 3).forEach((opf) => {
        if (opf.name) termsSet.add(opf.name);
      });
    });
  }

  // Extract ONLY from matched interventions
  if (resolvedContext.interventions) {
    resolvedContext.interventions.forEach((i) => {
      if (i.name_id) termsSet.add(i.name_id);
    });
  }

  // Extract ONLY from matched SDGs
  if (resolvedContext.sdgs) {
    resolvedContext.sdgs.forEach((s) => {
      if (s.title) termsSet.add(s.title);
    });
  }

  // Extract ONLY from matched Actors
  if (resolvedContext.actors) {
    resolvedContext.actors.forEach((a) => {
      if (a.name) termsSet.add(a.name);
    });
  }

  return Array.from(termsSet).filter(Boolean);
}

export function resolveOntologyContext(raw: RawOntologyContext): ResolvedOntologyContext {
  const pFacts = raw.programFacts || {};
  const pf = buildProgramFactsForPrompt(pFacts);

  const facts: ResolvedProgramFacts = {
    proposedTitle: pf.title || '',
    programStory: pf.story || '',
    beneficiaryDescription: pf.beneficiaryDescription || '',
    beneficiaryCount: pf.beneficiaryCount !== null && pf.beneficiaryCount !== undefined ? Number(pf.beneficiaryCount) : null,
    geography: pf.geography || null,
    durationMonths: pf.durationMonths !== null && pf.durationMonths !== undefined ? Number(pf.durationMonths) : null,
    budgetIdr: pf.budgetIdr !== null && pf.budgetIdr !== undefined ? Number(pf.budgetIdr) : null
  };

  // 1. Resolve Sectors
  const rawSectors = raw.acceptedSectors || [];
  const resolvedSectors: ResolvedSector[] = rawSectors.map((sectorId) => {
    const matched = SECTORS.find(
      (s) => s.id === sectorId || s.id.includes(sectorId) || sectorId.includes(s.id)
    );

    const nameId = matched ? matched.name : sectorId;
    const nameEn = matched ? (matched.canonical_name_en || matched.name) : sectorId;
    
    const linkedOutcomes = OUTCOME_FAMILIES.filter(
      (of) => of.likely_sectors && of.likely_sectors.some((ls) => ls === sectorId || sectorId.includes(ls))
    ).map((of) => ({
      family_id: of.outcome_family_id,
      name: of.canonical_name_id.replace(/_/g, ' '),
      definition: of.definition || 'Perubahan kapasitas atau praktik target',
      example_statements: [
        `Peningkatan ${of.canonical_name_id.replace(/_/g, ' ')} pada penerima manfaat.`
      ]
    }));

    const linkedOutputs = OUTPUT_FAMILIES.map((opf) => ({
      family_id: opf.output_family_id,
      name: opf.canonical_name.replace(/_/g, ' '),
      definition: opf.common_confusions || 'Hasil langsung intervensi program',
      example_statements: [
        `Layanan/produk ${opf.canonical_name.replace(/_/g, ' ')} terlaksana`
      ]
    }));

    const linkedIndicators = INDICATOR_FAMILIES.filter((ind) => {
      const lowerSec = sectorId.toLowerCase();
      const lowerDomain = (ind.domain || '').toLowerCase();
      const lowerCode = (ind.code || '').toLowerCase();

      if (lowerSec.includes('health') || lowerSec.includes('posyandu') || lowerSec.includes('007')) {
        return lowerDomain.includes('health') || lowerDomain.includes('nutrition') || lowerCode.includes('health');
      }
      if (lowerSec.includes('agri') || lowerSec.includes('panen') || lowerSec.includes('001')) {
        return lowerDomain.includes('agri') || lowerDomain.includes('food') || lowerCode.includes('agri');
      }
      if (lowerSec.includes('liv') || lowerSec.includes('umkm') || lowerSec.includes('002')) {
        return lowerDomain.includes('msme') || lowerDomain.includes('economic');
      }
      return true;
    }).map((ind) => ({
      family_id: ind.id,
      name: ind.name,
      // The registry code is already carried by family_id. Repeating it inside
      // the human-readable definition put "IND-001" in front of the model twice
      // per row and it echoed the codes back into indicator statements.
      definition: `Indikator ${ind.domain}`
    }));

    return {
      id: sectorId,
      name_id: nameId,
      name_en: nameEn,
      description: matched
        ? `Sektor ${nameId} dengan fokus intervensi pada kelompok sasaran.`
        : `Sektor ${sectorId}`,
      outcome_families: linkedOutcomes,
      output_families: linkedOutputs,
      indicator_families: linkedIndicators
    };
  });

  const allOutcomeFamiliesMap = new Map<string, { family_id: string; name: string; definition: string; example_statements: string[] }>();
  OUTCOME_FAMILIES.forEach((of) => {
    allOutcomeFamiliesMap.set(of.outcome_family_id, {
      family_id: of.outcome_family_id,
      name: of.canonical_name_id.replace(/_/g, ' '),
      definition: of.definition,
      example_statements: [
        `Penerima manfaat mengadopsi praktik ${of.canonical_name_id.replace(/_/g, ' ')}.`
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
        `Sesi ${opf.canonical_name.replace(/_/g, ' ')} terlaksana`
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

  // 2. Resolve Interventions
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
        : `Intervensi ${archId} berupa pendampingan dan pelatihan praktis untuk meningkatkan kapasitas target.`,
      expected_outputs: [
        `Pelatihan dan modul pendampingan selesai dilaksanakan`,
        `Sistem/modul teradopsi oleh peserta`
      ],
      likely_activities: [
        `Penyelenggaraan pelatihan teknis`,
        `Pendampingan harian/mingguan`,
        `Monitoring perkembangan peserta`
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
      targets: [`${sdgNum}.1: Target pembangunan berkelanjutan terkait kelompok sasaran`]
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
      name: matched ? matched.name : `Aktor ${actorId}`,
      description: `Kelompok sasaran utama yang berpartisipasi langsung dalam intervensi.`,
      relevance: `Subjek utama penerima manfaat dan partisipan aktivitas program.`
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

export function buildGroundingPromptMessage(resolved: ResolvedOntologyContext, factsInput?: ProgramFacts): string {
  const programFacts = factsInput || buildProgramFactsForPrompt(resolved.facts);
  const requiredGroundingTerms = extractGroundingTerms(programFacts, resolved);

  const { sectors, interventions, sdgs, actors, allOutcomeFamilies, allOutputFamilies, allIndicatorFamilies } = resolved;

  const sectorText = sectors.length > 0
    ? sectors.map((s) => `- ${s.name_id} (${s.id}): ${s.description}`).join('\n')
    : `- Sektor belum teridentifikasi`;

  const matchedOutcomes = sectors.flatMap((s) => s.outcome_families);
  const outcomeFamText = matchedOutcomes.length > 0
    ? matchedOutcomes.slice(0, 10).map((of) => `- ${of.family_id} [${of.name}]: ${of.definition}`).join('\n')
    : `- Outcome family belum teridentifikasi`;

  const matchedOutputs = sectors.flatMap((s) => s.output_families);
  const outputFamText = matchedOutputs.length > 0
    ? matchedOutputs.slice(0, 10).map((opf) => `- ${opf.family_id} [${opf.name}]: ${opf.definition}`).join('\n')
    : `- Output family belum teridentifikasi`;

  const matchedIndicators = sectors.flatMap((s) => s.indicator_families);
  const indicatorFamText = matchedIndicators.length > 0
    ? matchedIndicators.slice(0, 10).map((ind) => `- ${ind.family_id} [${ind.name}]: ${ind.definition}`).join('\n')
    : `- Indikator belum teridentifikasi`;

  const interventionText = interventions.length > 0
    ? interventions.map((i) => `- ${i.name_id} (${i.id}): Mekanisme Kausal -> ${i.causal_mechanism}`).join('\n')
    : `- Intervensi belum teridentifikasi`;

  const sdgText = sdgs.length > 0
    ? sdgs.map((s) => `- ${s.title}\n  Target: ${s.targets.join('; ')}`).join('\n')
    : `- SDG belum teridentifikasi`;

  const actorText = actors.length > 0
    ? actors.map((a) => `- ${a.name} (${a.id}): ${a.description}`).join('\n')
    : `- Aktor belum teridentifikasi`;

  return `--- START GROUNDING MESSAGE ---

TUGAS:
Hasilkan LFA lengkap yang spesifik untuk program ini.

Setiap elemen LFA WAJIB merujuk fakta konkret program dan grounding ontologi di bawah.

DILARANG menghasilkan kalimat generik yang bisa ditempel ke program lain.

FAKTA PROGRAM YANG DIKETAHUI:
${programFacts.knownFacts.length > 0 ? programFacts.knownFacts.map((f) => `- ${f}`).join('\n') : '- Tidak ada fakta khusus yang diketahui'}

FAKTA PROGRAM YANG BELUM DIJELASKAN:
${programFacts.missingFacts.length > 0 ? programFacts.missingFacts.map((mf) => `- ${mf}`).join('\n') : '- Semua fakta utama telah dijelaskan'}

TERMS GROUNDING WAJIB:
${requiredGroundingTerms.length > 0 ? requiredGroundingTerms.map((term) => `- ${term}`).join('\n') : '- Tidak ada term khusus'}

GROUNDING ONTOLOGI:

KODE REGISTRI ADALAH REFERENSI INTERNAL — DILARANG DITULIS DI OUTPUT.
Setiap baris di bawah diawali kode internal seperti IND-001, OF-..., OPF-...,
SECTOR-..., PF-..., atau ACT-.... Kode itu hanya untuk membantu Anda memilih
rujukan yang tepat. Gunakan MAKNA dan NAMA-nya, lalu tulis ulang dengan kalimat
program yang konkret.

DILARANG menyalin, mengutip, atau menyisipkan kode tersebut ke dalam teks apa
pun yang dibaca manusia — termasuk statement, indicator, mov, target, baseline,
assumption, judul, dan narasi proposal. Contoh yang SALAH: "IND-001: Persentase
balita terpantau", "Prevalensi stunting (IND-001)", "IND 01 Cakupan Posyandu".
Contoh yang BENAR: "Persentase balita 0-59 bulan yang pertumbuhannya dipantau
setiap bulan di Posyandu".

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
- WAJIB gunakan judul program "${programFacts.title || 'Program'}" sebagai judul utama proposal (# ${programFacts.title || 'Program'}). DILARANG MENGGUNAKAN "Program Baru".
- Jika Anggaran, Durasi, atau Lokasi DIKETAHUI di FAKTA PROGRAM, WAJIB gunakan nilai tersebut (Anggaran: Rp ${programFacts.budgetIdr?.toLocaleString('id-ID') ?? 'diketahui'}, Durasi: ${programFacts.durationMonths ?? 'diketahui'} bulan, Lokasi: ${programFacts.geography ?? 'diketahui'}) di dalam meta, narasi Executive Summary, Problem Statement, dan Budget Narrative.
- Jika fakta TIDAK TERSEDIA (ada di FAKTA PROGRAM YANG BELUM DIJELASKAN), nyatakan secara eksplisit sebagai belum dijelaskan dalam asumsi/catatan, JANGAN mengarang angka atau lokasi fiktif.
- Tetap hasilkan LFA yang spesifik berdasarkan cerita program dan grounding ontologi yang tersedia.
- Wajib menyertakan kata/istilah dari TERMS GROUNDING WAJIB di dalam narasi Goal, Outcome, Output, Aktivitas, dan Indikator. Sisipkan secara wajar — jangan memaksakan sebuah term jika membuat kalimat tidak bermakna, terutama pada Indikator yang harus tetap terukur.
- MATRIKS WAJIB TERISI PENUH DI SEMUA BARIS. Setiap baris Goal, Purpose/Outcome, Output, DAN Aktivitas wajib memiliki keempat kolom: uraian, indikator, sumber verifikasi (MoV), dan asumsi. Baris Aktivitas paling sering terlewat — jangan tinggalkan MoV atau asumsi aktivitas kosong. Untuk aktivitas, MoV adalah dokumen atau catatan konkret yang membuktikan kegiatan terjadi (daftar hadir, notulen, berita acara, laporan, foto berlokasi), dan asumsi adalah kondisi eksternal yang harus benar agar aktivitas bisa berjalan.
- Aktivitas juga wajib memuat bulan mulai dan bulan selesai dalam rentang durasi program.

OUTPUT:
Keluarkan HANYA JSON valid sesuai schema yang sudah ada:
- matrix
- proposal_markdown
- program_skeleton

--- END GROUNDING MESSAGE ---`;
}

export interface ValidationResult {
  isValid: boolean;
  failures: string[];
}

export function validateGrounding(
  matrix: any,
  programFacts: ProgramFacts,
  resolvedContext: ResolvedOntologyContext,
  proposalMarkdown?: string
): ValidationResult {
  const failures: string[] = [];

  const goalText = (matrix?.goal?.statement || '').toLowerCase();
  const outcomesText = (matrix?.outcomes || []).map((o: any) => o.statement || '').join(' ').toLowerCase();
  const outputsText = (matrix?.outputs || []).map((o: any) => o.statement || '').join(' ').toLowerCase();
  const indicatorsText = [
    ...(matrix?.goal?.indicators || []),
    ...(matrix?.outcomes || []).flatMap((o: any) => o.indicators || []),
    ...(matrix?.outputs || []).flatMap((o: any) => o.indicators || [])
  ].join(' ').toLowerCase();
  const markdownText = (proposalMarkdown || '').toLowerCase();
  const fullText = `${goalText} ${outcomesText} ${outputsText} ${indicatorsText} ${markdownText}`;

  if (programFacts.beneficiaryDescription) {
    const benTerm = programFacts.beneficiaryDescription.toLowerCase();
    if (!fullText.includes(benTerm)) {
      failures.push(`Goal/Outcome/Proposal belum merujuk penerima manfaat: "${programFacts.beneficiaryDescription}".`);
    }
  }

  if (programFacts.geography) {
    const geoTerm = programFacts.geography.toLowerCase();
    if (!fullText.includes(geoTerm)) {
      failures.push(`Goal/Outcome/Proposal belum merujuk lokasi program: "${programFacts.geography}".`);
    }
  }

  if (programFacts.beneficiaryCount !== null && programFacts.beneficiaryCount !== undefined && programFacts.beneficiaryCount > 0) {
    const countStr = String(programFacts.beneficiaryCount);
    if (!fullText.includes(countStr)) {
      failures.push(`LFA/Proposal belum menyebutkan angka penerima manfaat: ${countStr}.`);
    }
  }

  return {
    isValid: failures.length === 0,
    failures
  };
}

export function buildDynamicRetryPrompt(
  failures: string[],
  programFacts: ProgramFacts,
  resolvedContext: ResolvedOntologyContext
): string {
  const requiredGroundingTerms = extractGroundingTerms(programFacts, resolvedContext);
  const floorFailures = failures.filter(f => f.includes('floor') || f.includes('minimum') || f.includes('activities') || f.includes('Outputs count'));
  const floorNotice = floorFailures.length > 0
    ? `\nCRITICAL STRUCTURAL REQUIREMENT (CARDINALITY FLOOR FAILED):\nYour previous generation failed the required LFA structure floor with the following issues:\n${floorFailures.map(f => `  * EXPLICIT FAILURE: ${f}`).join('\n')}\nACTION REQUIRED: Please break down the program intervention into more detailed phases/deliverables. Ensure you generate AT LEAST 2 to 3 distinct Outputs, and AT LEAST 2 to 3 Activities per Output (total >= 6 Activities across the matrix).\n`
    : '';

  return `RETRY REQUEST — GROUNDING & STRUKTUR LFA BELUM MEMENUHI KUALITAS:
${floorNotice}
Rewrite using these required grounding terms derived from current request:
${requiredGroundingTerms.map((t) => `- ${t}`).join('\n')}

Missing or weak grounding / structural failures to fix:
${failures.map((f) => `- ${f}`).join('\n')}

Do NOT invent any facts listed as missing:
${programFacts.missingFacts.length > 0 ? programFacts.missingFacts.map((mf) => `- ${mf}`).join('\n') : '- None'}

Instruction:
Please regenerate the full LFA matrix, proposal markdown, and program skeleton ensuring all required grounding terms, structural cardinality floors (min 2-3 outputs, min 6-9 activities), and program facts are strictly integrated. Do not use generic statements.`;
}
