export type RecommendationLevel = 'primary' | 'secondary' | 'optional' | 'ambiguous' | 'rejected';
export type ConfidenceBand = 'high' | 'medium' | 'low';
export type ActorRole = 'rights_holder' | 'target_actor' | 'institutional_actor' | 'beneficiary' | 'intermediary' | 'other';

export interface EvidenceSpan {
  sourceField: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface MappingRecommendation {
  id: string;
  label: string;
  level: RecommendationLevel;
  confidence: ConfidenceBand;
  confidenceScore?: number;
  explanation: string;
  evidence?: EvidenceSpan;
  evidenceSpans?: EvidenceSpan[];
}

export interface SDGRecommendation {
  num: number;
  label: string;
  level: RecommendationLevel;
  confidence: ConfidenceBand;
  confidenceScore?: number;
  explanation: string;
  evidence?: EvidenceSpan;
  evidenceSpans?: EvidenceSpan[];
}

export interface ActorRoleRecommendation {
  id: string;
  actorName: string;
  role?: ActorRole;
  level: RecommendationLevel;
  confidence: ConfidenceBand;
  confidenceScore?: number;
  explanation: string;
  evidence?: EvidenceSpan;
  evidenceSpans?: EvidenceSpan[];
}

export interface AmbiguityItem {
  id: string;
  field: string;
  description: string;
  candidates: string[];
  evidence?: EvidenceSpan;
  evidenceSpans?: EvidenceSpan[];
  resolvedValue?: string;
  requiredForApproval?: boolean;
}

export interface MissingInformationItem {
  id: string;
  question: string;
  priority: 'critical' | 'recommended';
  resolvedValue?: string;
  resolutionState: 'unresolved' | 'answered_with_evidence' | 'answered_with_assertion';
  blocking: boolean;
  requiredForApproval: boolean;
}

export interface MappingWarning {
  id: string;
  code: string;
  severity: 'informational' | 'needs_review' | 'important' | 'blocking';
  message: string;
}

export interface BlueprintItem {
  id: string;
  section: string;
  text: string;
  status: 'from_source' | 'inferred' | 'modified' | 'confirmed';
  explanation?: string;
  evidence?: EvidenceSpan;
  evidenceSpans?: EvidenceSpan[];
}

export interface Page1Input {
  organization?: OrganizationSnapshotReference;
  programTitle: string;
  geography: string;
  geographyLevel?: string;
  geographyStatus?: 'known' | 'unknown' | 'unentered';
  durationMonths: number | 'unknown' | 'unentered';
  durationValue?: number;
  durationUnit?: 'bulan' | 'tahun';
  beneficiaryDescription: string;
  beneficiaryCount: number | 'unknown' | 'unentered';
  beneficiaryCountValue?: number;
  beneficiaryUnit?: 'orang' | 'KK' | 'kelompok' | 'lembaga' | 'desa';
  budgetIdr: number | 'unknown' | 'unentered';
  fundingAmount?: number;
  currency?: string;
  targetDonor?: string;
  donorStandard?: string;
  programStory: string;
  supportingDocumentRefs?: string[];
}

export interface OrganizationSnapshotReference {
  orgId?: string;
  orgName: string;
  orgType: string;
  sdgFocus: number[];
  snapshotVersion?: string;
}

export interface ProgramBlueprint {
  items: BlueprintItem[];
}

export interface ProvenanceMetadata {
  contractVersion: string;
  engineVersion: string;
  registryVersions: Record<string, string>;
  createdAt: string;
  sourceFixtureId: string;
  scenarioPurpose: string;
  passCriteria?: string;
  epistemicLabel?: string;
}

export interface ResolutionHistoryEntry {
  itemId: string;
  field: string;
  action: 'accept' | 'override' | 'resolve';
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
}

export interface AdapterValidationIssue {
  id: string;
  code: 'VAL-CONFIDENCE' | 'VAL-EVIDENCE-OFFSETS' | 'VAL-ACTOR-ROLE';
  severity: 'needs_review' | 'blocking';
  message: string;
}

export interface ProvisionalDomainResponse {
  adapterValidationIssues?: AdapterValidationIssue[];
  contractVersion: string;
  contractStatus: 'provisional_against_v1_2';
  engineVersion: string;
  registryVersions: Record<string, string>;
  sourceFixtureId: string;
  createdAt: string;
  scenarioPurpose: string;
  
  sectors: MappingRecommendation[];
  interventions: MappingRecommendation[];
  sdgs: SDGRecommendation[];
  actorRoles: ActorRoleRecommendation[];
  
  ambiguities: AmbiguityItem[];
  missingInformation: MissingInformationItem[];
  warnings: MappingWarning[];
  blueprint: ProgramBlueprint;

  // Rich metadata for complete lossless representation of Page 2 Context
  outcomeFamilies?: string[];
  outputFamilies?: string[];
  crossCuttingRelevance?: string[];
  explanationTemplateMetadata?: Record<string, string>;
  resolutionHistory?: ResolutionHistoryEntry[];
  provenance?: ProvenanceMetadata;
  passthrough?: Record<string, unknown>;
  rawCanonicalPayload: Readonly<Record<string, unknown>>;
}

export interface ApprovedPage2Snapshot {
  programFacts: Page1Input;
  organization?: OrganizationSnapshotReference;
  originalRecommendations: {
    sectors: MappingRecommendation[];
    interventions: MappingRecommendation[];
    sdgs: SDGRecommendation[];
    actorRoles: ActorRoleRecommendation[];
  };
  acceptedSectors: string[];
  rejectedSectors: string[];
  acceptedInterventions: string[];
  rejectedInterventions: string[];
  acceptedSdgs: number[];
  rejectedSdgs: number[];
  acceptedActorRoles: string[];
  rejectedActorRoles: string[];
  
  blueprint: ProgramBlueprint;
  ambiguities: AmbiguityItem[];
  missingInformation: MissingInformationItem[];
  warnings: MappingWarning[];
  
  contractVersion: string;
  engineVersion: string;
  registryVersions: Record<string, string>;
  approvalTimestamp: string;

  // Fully preserve Page 2 context at approval handoff boundary
  outcomeFamilies?: string[];
  outputFamilies?: string[];
  crossCuttingRelevance?: string[];
  explanationTemplateMetadata?: Record<string, string>;
  resolutionHistory?: ResolutionHistoryEntry[];
  provenance?: ProvenanceMetadata;
  passthrough?: Record<string, unknown>;
  rawCanonicalPayload?: Readonly<Record<string, unknown>>;
  adapterValidationIssues?: AdapterValidationIssue[];
}

/**
 * Shape of the fixtures below, which are adapter *input* rather than output.
 *
 * `adaptProvisionalResponse` derives `rawCanonicalPayload` itself, by deep
 * cloning and freezing whatever it was handed, so a fixture cannot supply one:
 * it is the record of what arrived, not a field of it. Annotating these as
 * `ProvisionalDomainResponse` claimed they were already adapted and left four
 * type errors saying a property was missing that nothing should have provided.
 */
type ProvisionalFixture = Omit<ProvisionalDomainResponse, 'rawCanonicalPayload'>;

// -----------------------------------------------------------------
// FIXTURE 1: High Confidence
// -----------------------------------------------------------------
const FIXTURE_HIGH_CONFIDENCE: ProvisionalFixture = {
  contractVersion: '1.2',
  contractStatus: 'provisional_against_v1_2',
  engineVersion: 'det-engine-v1.0',
  registryVersions: {
    sectors: 'v1.2.0',
    archetypes: 'v1.2.0',
    sdgs: 'v1.2.0'
  },
  sourceFixtureId: 'FIX-DEV-HC-1',
  scenarioPurpose: 'High Confidence scenario testing',
  createdAt: new Date().toISOString(),
  
  sectors: [
    {
      id: 'SEC-ECON',
      label: 'Pemberdayaan Ekonomi',
      level: 'primary',
      confidence: 'high',
      confidenceScore: 0.95,
      explanation: 'Program berfokus langsung pada peningkatan kapasitas ekonomi petani kecil melalui pelatihan dan alat pertanian.',
      evidence: {
        sourceField: 'programStory',
        text: 'pelatihan pertanian berkelanjutan bagi 50 petani kecil di desa Sukamaju',
        startOffset: 12,
        endOffset: 80
      },
      evidenceSpans: [
        {
          sourceField: 'programStory',
          text: 'pelatihan pertanian berkelanjutan bagi 50 petani kecil',
          startOffset: 12,
          endOffset: 65
        },
        {
          sourceField: 'programStory',
          text: 'menaikkan pendapatan petani rata-rata 30%',
          startOffset: 150,
          endOffset: 191
        }
      ]
    },
    {
      id: 'SEC-AGRI',
      label: 'Pangan & Pertanian',
      level: 'secondary',
      confidence: 'high',
      confidenceScore: 0.88,
      explanation: 'Intervensi berlokasi di lahan pertanian dan menggunakan metode pertanian organik.',
      evidence: {
        sourceField: 'programStory',
        text: 'pertanian berkelanjutan bagi 50 petani kecil',
        startOffset: 22,
        endOffset: 65
      }
    }
  ],
  
  interventions: [
    {
      id: 'ARCH-TRAINING-001',
      label: 'Pelatihan Pertanian Berkelanjutan',
      level: 'primary',
      confidence: 'high',
      confidenceScore: 0.92,
      explanation: 'Penyelenggaraan kelas praktek lapangan tentang pembuatan pupuk organik dan konservasi air.',
      evidence: {
        sourceField: 'programStory',
        text: 'pelatihan pertanian berkelanjutan',
        startOffset: 12,
        endOffset: 45
      }
    },
    {
      id: 'ARCH-EQUIP-010',
      label: 'Distribusi Peralatan Panen',
      level: 'secondary',
      confidence: 'medium',
      confidenceScore: 0.65,
      explanation: 'Bantuan alat panen modern untuk menekan susut hasil pasca-panen (losses).',
      evidence: {
        sourceField: 'programStory',
        text: 'peralatan panen modern',
        startOffset: 100,
        endOffset: 122
      }
    }
  ],
  
  sdgs: [
    {
      num: 1,
      label: 'Tanpa Kemiskinan',
      level: 'primary',
      confidence: 'high',
      confidenceScore: 0.94,
      explanation: 'Peningkatan pendapatan petani secara langsung berkontribusi pada penurunan angka kemiskinan desa.',
      evidence: {
        sourceField: 'programStory',
        text: 'menaikkan pendapatan petani rata-rata 30%',
        startOffset: 150,
        endOffset: 191
      }
    },
    {
      num: 2,
      label: 'Tanpa Kelaparan',
      level: 'secondary',
      confidence: 'high',
      confidenceScore: 0.85,
      explanation: 'Penerapan metode organik meningkatkan produktivitas ketahanan pangan lokal berkelanjutan.',
      evidence: {
        sourceField: 'programStory',
        text: 'produksi beras organik lokal',
        startOffset: 200,
        endOffset: 228
      }
    },
    {
      num: 5,
      label: 'Kesetaraan Gender',
      level: 'rejected',
      confidence: 'low',
      confidenceScore: 0.15,
      explanation: 'Meskipun target gender diusulkan, fokus utama program adalah pemberdayaan ekonomi non-gender.',
      evidence: {
        sourceField: 'programStory',
        text: 'petani kecil',
        startOffset: 47,
        endOffset: 59
      }
    }
  ],
  
  actorRoles: [
    {
      id: 'ACT-RIGHTS-HOLDER',
      actorName: 'Petani skala kecil',
      role: 'beneficiary',
      level: 'primary',
      confidence: 'high',
      confidenceScore: 0.97,
      explanation: 'Petani kecil adalah subjek hak utama yang akan menerima manfaat peningkatan kapasitas dan ekonomi.',
      evidence: {
        sourceField: 'programStory',
        text: '50 petani kecil di desa Sukamaju',
        startOffset: 47,
        endOffset: 80
      }
    },
    {
      id: 'ACT-TARGET-ACTOR',
      actorName: 'Kelompok tani desa',
      role: 'target_actor',
      level: 'secondary',
      confidence: 'high',
      confidenceScore: 0.91,
      explanation: 'Kelompok tani bertindak sebagai target utama untuk mengorganisir latihan dan alat.',
      evidence: {
        sourceField: 'programStory',
        text: 'mengorganisir lewat kelompok tani desa',
        startOffset: 250,
        endOffset: 288
      }
    }
  ],
  
  ambiguities: [],
  
  missingInformation: [
    {
      id: 'MISS-001',
      question: 'Berapakah kapasitas produksi awal (baseline) padi organik sebelum program dimulai?',
      priority: 'recommended',
      resolutionState: 'unresolved',
      blocking: false,
      requiredForApproval: false
    }
  ],
  
  warnings: [
    {
      id: 'WARN-INFO-1',
      code: 'WARN-001',
      severity: 'informational',
      message: 'Organisasi memiliki kelengkapan profil 85%. Rekomendasi informasi siap digunakan.'
    }
  ],
  
  blueprint: {
    items: [
      {
        id: 'BLU-1',
        section: 'Problem Summary',
        text: 'Petani skala kecil di Desa Sukamaju mengalami keterbatasan alat pertanian modern dan ketergantungan pada pupuk kimia mahal, menekan pendapatan bersih mereka.',
        status: 'from_source'
      },
      {
        id: 'BLU-2',
        section: 'Impact Direction',
        text: 'Meningkatkan kesejahteraan petani lokal melalui peralihan metode pertanian beras organik berkelanjutan.',
        status: 'inferred'
      },
      {
        id: 'BLU-3',
        section: 'Expected Changes',
        text: '50 petani beralih menggunakan pupuk organik buatan sendiri dan menekan biaya produksi hingga 40%.',
        status: 'inferred'
      },
      {
        id: 'BLU-4',
        section: 'Direct Results',
        text: 'Pemberian modul pelatihan organik terlaksana dan 10 paket alat panen terdistribusi merata.',
        status: 'inferred'
      },
      {
        id: 'BLU-5',
        section: 'Suggested Partners',
        text: 'Dinas Pertanian Kabupaten Kabupaten Sleman',
        status: 'inferred',
        explanation: 'Mitra potensial — perlu dikonfirmasi'
      },
      {
        id: 'BLU-6',
        section: 'Cross-Cutting Relevance',
        text: 'Inklusi petani perempuan diutamakan dalam porsi 40% kuota peserta pelatihan pertanian.',
        status: 'inferred'
      }
    ]
  }
};

// -----------------------------------------------------------------
// FIXTURE 2: Sector Ambiguity
// -----------------------------------------------------------------
const FIXTURE_SECTOR_AMBIGUITY: ProvisionalFixture = {
  contractVersion: '1.2',
  contractStatus: 'provisional_against_v1_2',
  engineVersion: 'det-engine-v1.0',
  registryVersions: {
    sectors: 'v1.2.0',
    archetypes: 'v1.2.0',
    sdgs: 'v1.2.0'
  },
  sourceFixtureId: 'FIX-DEV-SA-2',
  scenarioPurpose: 'Sector Ambiguity scenario testing',
  createdAt: new Date().toISOString(),
  
  sectors: [
    {
      id: 'SEC-ECON',
      label: 'Pemberdayaan Ekonomi',
      level: 'ambiguous',
      confidence: 'medium',
      explanation: 'Terdapat tumpang tindih antara aktivitas pengembangan UMKM dan penguatan koperasi pertanian.',
      evidence: {
        sourceField: 'programStory',
        text: 'akses pasar bersama koperasi dan pembinaan UMKM lokal',
        startOffset: 120,
        endOffset: 175
      }
    },
    {
      id: 'SEC-AGRI',
      label: 'Pangan & Pertanian',
      level: 'ambiguous',
      confidence: 'medium',
      explanation: 'Aktivitas juga mengarah kuat pada rantai nilai agro-pertanian hulu ke hilir.',
      evidence: {
        sourceField: 'programStory',
        text: 'akses pasar bersama koperasi',
        startOffset: 120,
        endOffset: 147
      }
    }
  ],
  
  interventions: [
    {
      id: 'ARCH-A2F-013',
      label: 'Pengembangan Akses Finansial',
      level: 'primary',
      confidence: 'medium',
      explanation: 'Menyediakan skema kredit mikro melalui koperasi lokal.',
      evidence: {
        sourceField: 'programStory',
        text: 'skema kredit mikro koperasi',
        startOffset: 180,
        endOffset: 207
      }
    }
  ],
  
  sdgs: [
    {
      num: 8,
      label: 'Pekerjaan Layak & Pertumbuhan Ekonomi',
      level: 'primary',
      confidence: 'medium',
      explanation: 'Program mendorong pembentukan UMKM berbadan hukum koperasi dengan hak pekerja yang terlindungi.',
      evidence: {
        sourceField: 'programStory',
        text: 'pembinaan UMKM lokal mandiri',
        startOffset: 152,
        endOffset: 180
      }
    }
  ],
  
  actorRoles: [
    {
      id: 'ACT-BENEFICIARY',
      actorName: 'Anggota Koperasi',
      role: 'rights_holder',
      level: 'primary',
      confidence: 'medium',
      explanation: 'Anggota koperasi yang berprofesi sebagai pedagang kecil.'
    }
  ],
  
  ambiguities: [
    {
      id: 'AMB-SEC-1',
      field: 'sector',
      description: 'Klasifikasi sektor tidak dapat ditentukan secara otomatis karena program menggabungkan penguatan koperasi (Ekonomi) dan budidaya kopi (Pertanian) dengan porsi bobot yang sama seimbang.',
      candidates: ['Pemberdayaan Ekonomi', 'Pangan & Pertanian', 'Lainnya'],
      requiredForApproval: true
    }
  ],
  
  missingInformation: [],
  warnings: [
    {
      id: 'WARN-AMB-1',
      code: 'WARN-002',
      severity: 'needs_review',
      message: 'Sektor tumpang tindih terdeteksi. Silakan pilih prioritas sektor secara manual pada daftar ambiguitas.'
    }
  ],
  
  blueprint: {
    items: [
      {
        id: 'BLU-SA-1',
        section: 'Problem Summary',
        text: 'Pedagang kopi lokal kesulitan menembus pasar ritel akibat skala usaha kecil-kecil dan belum terorganisir dalam badan hukum.',
        status: 'from_source'
      },
      {
        id: 'BLU-SA-2',
        section: 'Impact Direction',
        text: 'Mengonsolidasikan kapasitas kolektif pedagang lewat pembentukan koperasi produsen kopi modern.',
        status: 'inferred'
      }
    ]
  }
};

// -----------------------------------------------------------------
// FIXTURE 3: Actor Role Distinction
// -----------------------------------------------------------------
const FIXTURE_ACTOR_ROLE_DISTINCTION: ProvisionalFixture = {
  contractVersion: '1.2',
  contractStatus: 'provisional_against_v1_2',
  engineVersion: 'det-engine-v1.0',
  registryVersions: {
    sectors: 'v1.2.0',
    archetypes: 'v1.2.0',
    sdgs: 'v1.2.0'
  },
  sourceFixtureId: 'FIX-DEV-AR-3',
  scenarioPurpose: 'Actor Role Distinction scenario testing',
  createdAt: new Date().toISOString(),
  
  sectors: [
    {
      id: 'SEC-EDU',
      label: 'Pendidikan',
      level: 'primary',
      confidence: 'high',
      explanation: 'Intervensi berfocus langsung pada ekosistem sekolah dan kualitas pengajaran.',
      evidence: {
        sourceField: 'programStory',
        text: 'kualitas belajar mengajar siswa SD',
        startOffset: 10,
        endOffset: 45
      }
    }
  ],
  
  interventions: [
    {
      id: 'ARCH-TOT-002',
      label: 'Training of Trainers (ToT)',
      level: 'primary',
      confidence: 'high',
      explanation: 'Pelatihan metode pedagogi interaktif bagi para guru sekolah dasar.',
      evidence: {
        sourceField: 'programStory',
        text: 'pelatihan metode pedagogi bagi guru',
        startOffset: 50,
        endOffset: 85
      }
    }
  ],
  
  sdgs: [
    {
      num: 4,
      label: 'Pendidikan Berkualitas',
      level: 'primary',
      confidence: 'high',
      explanation: 'Peningkatan metode mengajar guru secara langsung menaikkan output pendidikan siswa.',
      evidence: {
        sourceField: 'programStory',
        text: 'kualitas mengajar guru sekolah',
        startOffset: 60,
        endOffset: 80
      }
    }
  ],
  
  actorRoles: [
    {
      id: 'ACT-BEN-STUDENT',
      actorName: 'Siswa Sekolah Dasar',
      role: 'rights_holder',
      level: 'primary',
      confidence: 'high',
      explanation: 'Siswa adalah penerima manfaat akhir (beneficiary) yang berhak atas standar layanan pendidikan berkualitas.',
      evidence: {
        sourceField: 'programStory',
        text: 'siswa SD di wilayah terpencil',
        startOffset: 34,
        endOffset: 62
      }
    },
    {
      id: 'ACT-TAR-TEACHER',
      actorName: 'Guru Sekolah Dasar',
      role: 'target_actor',
      level: 'primary',
      confidence: 'high',
      explanation: 'Guru adalah aktor sasaran langsung (target actor) yang perlu mengubah metode pengajarannya demi siswa.',
      evidence: {
        sourceField: 'programStory',
        text: 'guru sebagai agen pengajar utama',
        startOffset: 120,
        endOffset: 154
      }
    },
    {
      id: 'ACT-INST-SCHOOL',
      actorName: 'Manajemen Sekolah Dasar',
      role: 'institutional_actor',
      level: 'secondary',
      confidence: 'medium',
      explanation: 'Sekolah bertindak sebagai duty bearer kelembagaan lokal yang menyediakan prasarana belajar.',
      evidence: {
        sourceField: 'programStory',
        text: 'fasilitas sarana sekolah dasar',
        startOffset: 180,
        endOffset: 211
      }
    }
  ],
  
  ambiguities: [],
  missingInformation: [],
  warnings: [],
  blueprint: {
    items: [
      {
        id: 'BLU-AR-1',
        section: 'Problem Summary',
        text: 'Siswa SD di desa tertinggal memiliki minat baca rendah akibat materi ajar yang kaku dan belum interaktif dari tenaga pendidik.',
        status: 'from_source'
      },
      {
        id: 'BLU-AR-2',
        section: 'Expected Changes',
        text: 'Guru SD aktif menerapkan visual storytelling di kelas sehingga siswa betah mengikuti kelas membaca.',
        status: 'inferred'
      }
    ]
  }
};

// -----------------------------------------------------------------
// FIXTURE 4: Scope Too Broad
// -----------------------------------------------------------------
const FIXTURE_SCOPE_TOO_BROAD: ProvisionalFixture = {
  contractVersion: '1.2',
  contractStatus: 'provisional_against_v1_2',
  engineVersion: 'det-engine-v1.0',
  registryVersions: {
    sectors: 'v1.2.0',
    archetypes: 'v1.2.0',
    sdgs: 'v1.2.0'
  },
  sourceFixtureId: 'FIX-DEV-SB-4',
  scenarioPurpose: 'Scope Too Broad scenario testing',
  createdAt: new Date().toISOString(),
  
  sectors: [
    {
      id: 'SEC-ECON',
      label: 'Pemberdayaan Ekonomi',
      level: 'primary',
      confidence: 'high',
      explanation: 'Menyediakan modal usaha bagi karang taruna pedesaan.'
    },
    {
      id: 'SEC-WASH',
      label: 'Air Bersih & Sanitasi',
      level: 'secondary',
      confidence: 'medium',
      explanation: 'Sekaligus memperbaiki saluran sanitasi posyandu desa.'
    }
  ],
  
  interventions: [
    {
      id: 'ARCH-CASH-002',
      label: 'Pemberian Modal Usaha Mikro',
      level: 'primary',
      confidence: 'high',
      explanation: 'Bantuan hibah kompetitif untuk kelompok usaha pemuda.'
    }
  ],
  
  sdgs: [
    {
      num: 6,
      label: 'Air Bersih & Sanitasi',
      level: 'primary',
      confidence: 'medium',
      explanation: 'Upaya pembenahan sanitasi sekolah dasar berkontribusi langsung pada SDG 6.'
    }
  ],
  
  actorRoles: [
    {
      id: 'ACT-BEN-YOUTH',
      actorName: 'Karang Taruna Pemuda',
      role: 'rights_holder',
      level: 'primary',
      confidence: 'high',
      explanation: 'Pemuda lokal yang mendapatkan bantuan modal usaha.'
    }
  ],
  
  ambiguities: [],
  
  missingInformation: [
    {
      id: 'MISS-SB-1',
      question: 'Dapatkah Anda merinci intervensi prioritas yang ingin dijalankan terlebih dahulu (Water vs Ekonomi)?',
      priority: 'critical',
      resolutionState: 'unresolved',
      blocking: true,
      requiredForApproval: true
    }
  ],
  
  warnings: [
    {
      id: 'WARN-SCOPE-1',
      code: 'WARN-003',
      severity: 'important',
      message: 'Program ini mencakup terlalu banyak intervensi yang tidak terfokus (Scope Too Broad).'
    },
    {
      id: 'WARN-STUFFING-1',
      code: 'WARN-004',
      severity: 'blocking',
      message: 'Terdeteksi upaya klaim SDG yang berlebihan tanpa evidence kuat (SDG-Stuffing Warning).'
    }
  ],
  
  blueprint: {
    items: [
      {
        id: 'BLU-SB-1',
        section: 'Problem Summary',
        text: 'Masyarakat mengalami masalah pipa air rusak, pengangguran usia produktif, dan kurangnya nutrisi posyandu secara bersamaan.',
        status: 'from_source'
      }
    ]
  }
};

// Expose a clean, secure map of fixtures to avoid direct individual constant imports
export const PROVISIONAL_FIXTURES: Record<string, ProvisionalFixture> = {
  'FIX-DEV-HC-1': FIXTURE_HIGH_CONFIDENCE,
  'FIX-DEV-SA-2': FIXTURE_SECTOR_AMBIGUITY,
  'FIX-DEV-AR-3': FIXTURE_ACTOR_ROLE_DISTINCTION,
  'FIX-DEV-SB-4': FIXTURE_SCOPE_TOO_BROAD
};

// -----------------------------------------------------------------
// ADAPTER IMPLEMENTATION
// -----------------------------------------------------------------
export interface RawEvidenceSpan {
  sourceField?: string;
  text?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface RawRecommendation {
  id?: string;
  label?: string;
  level?: string;
  confidence?: string;
  confidenceScore?: number;
  explanation?: string;
  evidence?: RawEvidenceSpan;
  evidenceSpans?: RawEvidenceSpan[];
}

export interface RawSdg {
  num?: number;
  label?: string;
  level?: string;
  confidence?: string;
  confidenceScore?: number;
  explanation?: string;
  evidence?: RawEvidenceSpan;
  evidenceSpans?: RawEvidenceSpan[];
}

export interface RawActorRole {
  id?: string;
  actorName?: string;
  role?: string;
  level?: string;
  confidence?: string;
  confidenceScore?: number;
  explanation?: string;
  evidence?: RawEvidenceSpan;
  evidenceSpans?: RawEvidenceSpan[];
}

export interface RawAmbiguity {
  id?: string;
  field?: string;
  description?: string;
  candidates?: string[];
  evidence?: RawEvidenceSpan;
  evidenceSpans?: RawEvidenceSpan[];
  resolvedValue?: string;
  requiredForApproval?: boolean;
}

export interface RawMissingInfo {
  id?: string;
  question?: string;
  priority?: string;
  resolvedValue?: string;
  resolutionState?: string;
  blocking?: boolean;
  requiredForApproval?: boolean;
}

export interface RawWarning {
  id?: string;
  code?: string;
  severity?: string;
  message?: string;
}

export interface RawBlueprintItem {
  id?: string;
  section?: string;
  text?: string;
  status?: string;
  explanation?: string;
  evidence?: RawEvidenceSpan;
  evidenceSpans?: RawEvidenceSpan[];
}

export interface RawBlueprint {
  items?: RawBlueprintItem[];
}

export interface RawProvisionalDomainResponse {
  contractVersion?: string;
  engineVersion?: string;
  registryVersions?: Record<string, string>;
  sourceFixtureId?: string;
  createdAt?: string;
  scenarioPurpose?: string;
  sectors?: RawRecommendation[];
  interventions?: RawRecommendation[];
  sdgs?: RawSdg[];
  actorRoles?: RawActorRole[];
  ambiguities?: RawAmbiguity[];
  missingInformation?: RawMissingInfo[];
  warnings?: RawWarning[];
  blueprint?: RawBlueprint;

  // Raw Page 2 extensions
  outcomeFamilies?: string[];
  outputFamilies?: string[];
  crossCuttingRelevance?: string[];
  explanationTemplateMetadata?: Record<string, string>;
  resolutionHistory?: unknown[];
  provenance?: unknown;
}

function validateConfidenceScore(score: unknown, id: string, type: string, issues: AdapterValidationIssue[]): number | undefined {
  if (score === undefined || score === null) {
    return undefined;
  }
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    issues.push({
      id: `VAL-CONF-${type}-${id}`,
      code: 'VAL-CONFIDENCE',
      severity: 'needs_review',
      message: `Confidence score for ${type} ${id} is not a finite number.`
    });
    return undefined;
  }
  if (score < 0 || score > 1) {
    issues.push({
      id: `VAL-CONF-${type}-${id}`,
      code: 'VAL-CONFIDENCE',
      severity: 'needs_review',
      message: `Confidence score for ${type} ${id} is out of range [0..1]: ${score}`
    });
    return undefined;
  }
  return score;
}

function normalizeEvidence(ev: RawEvidenceSpan, id: string, type: string, issues: AdapterValidationIssue[]): EvidenceSpan | undefined {
  const sourceField = String(ev.sourceField || 'programStory');
  const text = String(ev.text || '');
  const startOffset = typeof ev.startOffset === 'number' && Number.isFinite(ev.startOffset) ? ev.startOffset : 0;
  const endOffset = typeof ev.endOffset === 'number' && Number.isFinite(ev.endOffset) ? ev.endOffset : 0;

  if (startOffset < 0 || endOffset < 0 || endOffset < startOffset) {
    issues.push({
      id: `VAL-EVID-${type}-${id}`,
      code: 'VAL-EVIDENCE-OFFSETS',
      severity: 'needs_review',
      message: `Evidence span offsets on ${type} ${id} are invalid: start=${startOffset}, end=${endOffset}`
    });
    return undefined;
  }

  return {
    sourceField,
    text,
    startOffset,
    endOffset
  };
}

function validateAndNormalizeEvidenceSpans(spans: unknown, id: string, type: string, issues: AdapterValidationIssue[]): EvidenceSpan[] | undefined {
  if (!Array.isArray(spans)) {
    return undefined;
  }
  const result: EvidenceSpan[] = [];
  for (let i = 0; i < spans.length; i++) {
    const rawSpan = spans[i];
    if (rawSpan && typeof rawSpan === 'object') {
      const normalized = normalizeEvidence(rawSpan as RawEvidenceSpan, `${id}-span-${i}`, type, issues);
      if (normalized) {
        result.push(normalized);
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

export function adaptProvisionalResponse(raw: unknown): ProvisionalDomainResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Response is null, undefined, or invalid object');
  }

  const r = raw as RawProvisionalDomainResponse;

  // Validate contract minimum version
  const version = r.contractVersion || '';
  if (version !== '1.2' && version !== 'provisional_against_v1_2') {
    throw new Error(`Unsupported contract version: ${version}. Expected 1.2 or provisional_against_v1_2`);
  }

  // Preserve unrecognized additive fields
  const knownKeys = new Set([
    'contractVersion', 'contractStatus', 'engineVersion', 'registryVersions', 'sourceFixtureId',
    'createdAt', 'scenarioPurpose', 'sectors', 'interventions', 'sdgs', 'actorRoles',
    'ambiguities', 'missingInformation', 'warnings', 'blueprint', 'provenance',
    'outcomeFamilies', 'outputFamilies', 'crossCuttingRelevance', 'explanationTemplateMetadata', 'resolutionHistory'
  ]);
  const passthrough: Record<string, unknown> = {};
  for (const key of Object.keys(r)) {
    if (!knownKeys.has(key)) {
      passthrough[key] = (r as Record<string, unknown>)[key];
    }
  }

  // Pre-parse warnings so our validators can append issue codes safely
  const warnings: MappingWarning[] = Array.isArray(r.warnings) ? r.warnings.map(normalizeWarning) : [];
  const adapterValidationIssues: AdapterValidationIssue[] = [];

  // Form safe normalized response
  const normalizedSectors = Array.isArray(r.sectors) ? r.sectors.map(item => normalizeRecommendation(item, adapterValidationIssues)) : [];
  const normalizedInterventions = Array.isArray(r.interventions) ? r.interventions.map(item => normalizeRecommendation(item, adapterValidationIssues)) : [];
  const normalizedSdgs = Array.isArray(r.sdgs) ? r.sdgs.map(item => normalizeSdg(item, adapterValidationIssues)) : [];
  const normalizedActorRoles = Array.isArray(r.actorRoles) ? r.actorRoles.map(item => normalizeActorRole(item, adapterValidationIssues)) : [];

  const normalizedAmbiguities = Array.isArray(r.ambiguities) ? r.ambiguities.map(item => normalizeAmbiguity(item, adapterValidationIssues)) : [];
  const normalizedMissingInformation = Array.isArray(r.missingInformation) ? r.missingInformation.map(normalizeMissingInfo) : [];
  const normalizedBlueprint = normalizeBlueprint(r.blueprint, adapterValidationIssues);

  // Construct unmutated raw canonical payload
  const rawCanonicalPayload = Object.freeze(JSON.parse(JSON.stringify(raw)) as Record<string, unknown>);

  // Parse raw provenance safely if it exists
  let provenance: ProvenanceMetadata | undefined = undefined;
  if (r.provenance && typeof r.provenance === 'object') {
    const p = r.provenance as Record<string, unknown>;
    provenance = {
      contractVersion: String(p.contractVersion || r.contractVersion || '1.2'),
      engineVersion: String(p.engineVersion || r.engineVersion || 'unknown'),
      registryVersions: (p.registryVersions && typeof p.registryVersions === 'object' ? p.registryVersions : r.registryVersions || {}) as Record<string, string>,
      createdAt: String(p.createdAt || r.createdAt || new Date().toISOString()),
      sourceFixtureId: String(p.sourceFixtureId || r.sourceFixtureId || 'unknown'),
      scenarioPurpose: String(p.scenarioPurpose || r.scenarioPurpose || ''),
      passCriteria: p.passCriteria ? String(p.passCriteria) : undefined,
      epistemicLabel: p.epistemicLabel ? String(p.epistemicLabel) : undefined,
    };
  }

  return {
    contractVersion: String(r.contractVersion || '1.2'),
    contractStatus: 'provisional_against_v1_2',
    engineVersion: String(r.engineVersion || 'unknown'),
    registryVersions: r.registryVersions || {},
    sourceFixtureId: String(r.sourceFixtureId || 'unknown'),
    createdAt: String(r.createdAt || new Date().toISOString()),
    scenarioPurpose: String(r.scenarioPurpose || 'Custom raw adapted scenario'),
    
    sectors: normalizedSectors,
    interventions: normalizedInterventions,
    sdgs: normalizedSdgs,
    actorRoles: normalizedActorRoles,
    
    ambiguities: normalizedAmbiguities,
    missingInformation: normalizedMissingInformation,
    warnings: warnings,
    blueprint: normalizedBlueprint,

    // v1.2 Page 2 extensions
    outcomeFamilies: Array.isArray(r.outcomeFamilies) ? r.outcomeFamilies.map(String) : undefined,
    outputFamilies: Array.isArray(r.outputFamilies) ? r.outputFamilies.map(String) : undefined,
    crossCuttingRelevance: Array.isArray(r.crossCuttingRelevance) ? r.crossCuttingRelevance.map(String) : undefined,
    explanationTemplateMetadata: r.explanationTemplateMetadata || undefined,
    resolutionHistory: Array.isArray(r.resolutionHistory) ? (r.resolutionHistory as ResolutionHistoryEntry[]) : undefined,
    provenance,
    passthrough: Object.keys(passthrough).length > 0 ? passthrough : undefined,
    rawCanonicalPayload,
    adapterValidationIssues: adapterValidationIssues.length > 0 ? adapterValidationIssues : undefined
  };
}

function normalizeRecommendation(item: RawRecommendation, issues: AdapterValidationIssue[]): MappingRecommendation {
  const normalizedSpans = validateAndNormalizeEvidenceSpans(item.evidenceSpans, item.id || '', 'recommendation', issues);
  const singleEvidence = item.evidence ? normalizeEvidence(item.evidence, item.id || '', 'recommendation', issues) : undefined;

  return {
    id: String(item.id || ''),
    label: String(item.label || ''),
    level: (item.level || 'optional') as RecommendationLevel,
    confidence: (item.confidence || 'low') as ConfidenceBand,
    confidenceScore: validateConfidenceScore(item.confidenceScore, item.id || '', 'recommendation', issues),
    explanation: String(item.explanation || ''),
    evidence: singleEvidence || (normalizedSpans && normalizedSpans.length > 0 ? normalizedSpans[0] : undefined),
    evidenceSpans: normalizedSpans
  };
}

function normalizeSdg(item: RawSdg, issues: AdapterValidationIssue[]): SDGRecommendation {
  const normalizedSpans = validateAndNormalizeEvidenceSpans(item.evidenceSpans, String(item.num || 0), 'sdg', issues);
  const singleEvidence = item.evidence ? normalizeEvidence(item.evidence, String(item.num || 0), 'sdg', issues) : undefined;

  return {
    num: Number(item.num || 0),
    label: String(item.label || ''),
    level: (item.level || 'optional') as RecommendationLevel,
    confidence: (item.confidence || 'low') as ConfidenceBand,
    confidenceScore: validateConfidenceScore(item.confidenceScore, String(item.num || 0), 'sdg', issues),
    explanation: String(item.explanation || ''),
    evidence: singleEvidence || (normalizedSpans && normalizedSpans.length > 0 ? normalizedSpans[0] : undefined),
    evidenceSpans: normalizedSpans
  };
}

function normalizeActorRole(item: RawActorRole, issues: AdapterValidationIssue[]): ActorRoleRecommendation {
  const normalizedSpans = validateAndNormalizeEvidenceSpans(item.evidenceSpans, item.id || '', 'actorRole', issues);
  const singleEvidence = item.evidence ? normalizeEvidence(item.evidence, item.id || '', 'actorRole', issues) : undefined;

  const validRoles = new Set(['rights_holder', 'target_actor', 'institutional_actor', 'beneficiary', 'intermediary', 'other']);
  let role: ActorRole | undefined = undefined;
  if (item.role && validRoles.has(item.role)) {
    role = item.role as ActorRole;
  } else {
    issues.push({
      id: `VAL-ACTOR-${item.id || 'unnamed'}`,
      code: 'VAL-ACTOR-ROLE',
      severity: 'needs_review',
      message: `Actor role '${item.role || ''}' is not a valid canonical role.`
    });
  }

  return {
    id: String(item.id || ''),
    actorName: String(item.actorName || ''),
    role,
    level: (item.level || 'optional') as RecommendationLevel,
    confidence: (item.confidence || 'low') as ConfidenceBand,
    confidenceScore: validateConfidenceScore(item.confidenceScore, item.id || '', 'actorRole', issues),
    explanation: String(item.explanation || ''),
    evidence: singleEvidence || (normalizedSpans && normalizedSpans.length > 0 ? normalizedSpans[0] : undefined),
    evidenceSpans: normalizedSpans
  };
}

function normalizeAmbiguity(item: RawAmbiguity, issues: AdapterValidationIssue[]): AmbiguityItem {
  const normalizedSpans = validateAndNormalizeEvidenceSpans(item.evidenceSpans, item.id || '', 'ambiguity', issues);
  const singleEvidence = item.evidence ? normalizeEvidence(item.evidence, item.id || '', 'ambiguity', issues) : undefined;

  return {
    id: String(item.id || ''),
    field: String(item.field || ''),
    description: String(item.description || ''),
    candidates: Array.isArray(item.candidates) ? item.candidates.map(String) : [],
    evidence: singleEvidence || (normalizedSpans && normalizedSpans.length > 0 ? normalizedSpans[0] : undefined),
    evidenceSpans: normalizedSpans,
    resolvedValue: item.resolvedValue ? String(item.resolvedValue) : undefined,
    requiredForApproval: item.requiredForApproval !== false
  };
}

function normalizeMissingInfo(item: RawMissingInfo): MissingInformationItem {
  const isBlocking = Boolean(item.blocking);
  return {
    id: String(item.id || ''),
    question: String(item.question || ''),
    priority: (item.priority || 'recommended') as 'critical' | 'recommended',
    resolvedValue: item.resolvedValue ? String(item.resolvedValue) : undefined,
    resolutionState: (item.resolutionState || 'unresolved') as 'unresolved' | 'answered_with_evidence' | 'answered_with_assertion',
    blocking: isBlocking,
    requiredForApproval: Boolean(item.requiredForApproval !== false && (isBlocking || item.requiredForApproval))
  };
}

function normalizeWarning(item: RawWarning): MappingWarning {
  return {
    id: String(item.id || ''),
    code: String(item.code || ''),
    severity: (item.severity || 'informational') as 'informational' | 'needs_review' | 'important' | 'blocking',
    message: String(item.message || '')
  };
}

function normalizeBlueprint(bp: RawBlueprint | undefined, issues: AdapterValidationIssue[]): ProgramBlueprint {
  if (!bp || !Array.isArray(bp.items)) {
    return { items: [] };
  }
  return {
    items: bp.items.map((item: RawBlueprintItem) => {
      const normalizedSpans = validateAndNormalizeEvidenceSpans(item.evidenceSpans, item.id || '', 'blueprint', issues);
      const singleEvidence = item.evidence ? normalizeEvidence(item.evidence, item.id || '', 'blueprint', issues) : undefined;

      return {
        id: String(item.id || ''),
        section: item.section || 'Problem Summary',
        text: String(item.text || ''),
        status: (item.status || 'inferred') as 'from_source' | 'inferred' | 'modified' | 'confirmed',
        explanation: item.explanation ? String(item.explanation) : undefined,
        evidence: singleEvidence || (normalizedSpans && normalizedSpans.length > 0 ? normalizedSpans[0] : undefined),
        evidenceSpans: normalizedSpans
      };
    })
  };
}
