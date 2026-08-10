/**
 * Evidence Expectation Guidance — derived evidence planning for MEAL indicators.
 *
 * Pure functions. No persistence. Maps indicator context (method, MoV, keywords)
 * to expected evidence types that should be collected later.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface EvidenceExpectation {
  label: string;
  category: 'primary' | 'secondary' | 'supporting';
}

export interface EvidenceGuidanceResult {
  expectations: EvidenceExpectation[];
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

// ── Keyword → Evidence Mapping ──────────────────────────────────────────────

interface MethodEntry {
  keywords: string[];
  evidence: EvidenceExpectation[];
  note: string;
}

const METHOD_MAP: MethodEntry[] = [
  {
    keywords: ['survei', 'survey', 'kuesioner', 'questionnaire', 'polling', 'angket'],
    evidence: [
      { label: 'Laporan Survei (Baseline & Endline)', category: 'primary' },
      { label: 'Kuesioner / Instrumen Survei', category: 'primary' },
      { label: 'Dataset Mentah (CSV/XLSX)', category: 'secondary' },
      { label: 'Dokumentasi Pengambilan Data', category: 'supporting' },
    ],
    note: 'Survei menghasilkan data kuantitatif yang memerlukan instrumen terstruktur dan dokumentasi pengumpulan.',
  },
  {
    keywords: ['wawancara', 'interview', 'indepth', 'in-depth', 'mendalam'],
    evidence: [
      { label: 'Transkrip Wawancara', category: 'primary' },
      { label: 'Panduan Wawancara / Topic Guide', category: 'primary' },
      { label: 'Rekaman Audio/Video', category: 'secondary' },
      { label: 'Informed Consent', category: 'supporting' },
    ],
    note: 'Wawancara mendalam membutuhkan transkrip dan rekaman sebagai bukti utama.',
  },
  {
    keywords: ['fgd', 'focus group', 'diskusi kelompok', 'diskusi terpumpun', 'group discussion'],
    evidence: [
      { label: 'Transkrip FGD', category: 'primary' },
      { label: 'Panduan Diskusi / FGD Guide', category: 'primary' },
      { label: 'Daftar Hadir Peserta', category: 'secondary' },
      { label: 'Foto / Dokumentasi Kegiatan', category: 'supporting' },
    ],
    note: 'FGD memerlukan transkrip diskusi, panduan, dan daftar hadir peserta.',
  },
  {
    keywords: ['pelatihan', 'training', 'workshop', 'lokakarya', 'bimtek', 'capacity building', 'peningkatan kapasitas'],
    evidence: [
      { label: 'Laporan Pelatihan', category: 'primary' },
      { label: 'Daftar Hadir Peserta', category: 'primary' },
      { label: 'Modul / Materi Pelatihan', category: 'secondary' },
      { label: 'Pre-test & Post-test', category: 'secondary' },
      { label: 'Foto / Dokumentasi Kegiatan', category: 'supporting' },
    ],
    note: 'Pelatihan memerlukan laporan, daftar hadir, dan evaluasi pre/post-test.',
  },
  {
    keywords: ['observasi', 'observation', 'pengamatan', 'spot check', 'inspeksi', 'inspeksi'],
    evidence: [
      { label: 'Lembar Observasi / Checklist', category: 'primary' },
      { label: 'Laporan Hasil Observasi', category: 'primary' },
      { label: 'Foto Temuan Lapangan', category: 'secondary' },
    ],
    note: 'Observasi memerlukan lembar checklist dan laporan hasil pengamatan.',
  },
  {
    keywords: ['dokumen', 'document', 'review', 'desk review', 'studi dokumen', 'telaah', 'literatur', 'literature'],
    evidence: [
      { label: 'Daftar Dokumen yang Ditelaah', category: 'primary' },
      { label: 'Matriks / Laporan Hasil Telaah', category: 'primary' },
      { label: 'Dokumen Sumber (Referensi)', category: 'secondary' },
    ],
    note: 'Telaah dokumen memerlukan daftar dokumen, matriks hasil, dan dokumen sumber.',
  },
  {
    keywords: ['data sekunder', 'secondary data', 'statistik', 'laporan tahunan', 'administratif', 'administrasi', 'catatan', 'register', 'registrasi'],
    evidence: [
      { label: 'Data Sekunder (Sumber Asli)', category: 'primary' },
      { label: 'Ringkasan / Ekstraksi Data', category: 'primary' },
      { label: 'Surat Izin Akses Data', category: 'supporting' },
    ],
    note: 'Data sekunder memerlukan dokumen sumber, ringkasan ekstraksi, dan bukti akses.',
  },
  {
    keywords: ['foto', 'photo', 'visual', 'dokumentasi visual', 'gambar'],
    evidence: [
      { label: 'Koleksi Foto (Metadata Lengkap)', category: 'primary' },
      { label: 'Daftar Deskripsi Foto', category: 'secondary' },
      { label: 'Informed Consent (jika ada orang)', category: 'supporting' },
    ],
    note: 'Dokumentasi visual memerlukan foto dengan metadata dan deskripsi.',
  },
  {
    keywords: ['kehadiran', 'absensi', 'attendance', 'partisipasi', 'peserta', 'daftar hadir'],
    evidence: [
      { label: 'Daftar Hadir / Attendance Sheet', category: 'primary' },
      { label: 'Rekapitulasi Kehadiran', category: 'primary' },
      { label: 'Foto Kegiatan', category: 'supporting' },
    ],
    note: 'Monitoring kehadiran memerlukan daftar hadir dan rekapitulasi partisipasi.',
  },
  {
    keywords: ['sampel', 'sample', 'tes', 'test', 'pengukuran', 'measurement', 'uji', 'laboratorium', 'lab'],
    evidence: [
      { label: 'Hasil Uji / Pengukuran', category: 'primary' },
      { label: 'Protokol Pengambilan Sampel', category: 'primary' },
      { label: 'Sertifikat Kalibrasi Alat', category: 'secondary' },
      { label: 'Foto Proses Pengukuran', category: 'supporting' },
    ],
    note: 'Pengukuran/tes memerlukan hasil uji, protokol sampling, dan bukti kalibrasi.',
  },
];

// ── MoV → Evidence Mapping ──────────────────────────────────────────────────

interface MovEntry {
  keywords: string[];
  evidence: EvidenceExpectation[];
}

const MOV_MAP: MovEntry[] = [
  {
    keywords: ['laporan', 'report'],
    evidence: [
      { label: 'Laporan Final / Naratif', category: 'primary' },
    ],
  },
  {
    keywords: ['foto', 'photo', 'gambar', 'visual'],
    evidence: [
      { label: 'Dokumentasi Foto (dengan tanggal & lokasi)', category: 'secondary' },
    ],
  },
  {
    keywords: ['video', 'rekaman', 'recording'],
    evidence: [
      { label: 'Rekaman Video / Audio', category: 'secondary' },
    ],
  },
  {
    keywords: ['database', 'data', 'sistem', 'system', 'aplikasi', 'app', 'dashboard'],
    evidence: [
      { label: 'Screenshot/Ekspor dari Sistem', category: 'secondary' },
    ],
  },
  {
    keywords: ['sertifikat', 'certificate', 'ijazah'],
    evidence: [
      { label: 'Salinan Sertifikat / Dokumen Resmi', category: 'secondary' },
    ],
  },
  {
    keywords: ['berita', 'news', 'media', 'publikasi', 'koran'],
    evidence: [
      { label: 'Kliping Berita / Tautan Publikasi', category: 'secondary' },
    ],
  },
];

// ── Engine ──────────────────────────────────────────────────────────────────

function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

export function getEvidenceExpectations(
  indicatorText: string | null | undefined,
  collectionMethod: string | null | undefined,
  secondarySource: string | null | undefined,
): EvidenceGuidanceResult {
  const combined = [indicatorText, collectionMethod, secondarySource]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!combined.trim()) {
    return {
      expectations: [],
      confidence: 'low',
      note: 'Isi metode pengumpulan data dan/atau indikator terlebih dahulu untuk melihat panduan bukti.',
    };
  }

  const expectations: EvidenceExpectation[] = [];
  const seen = new Set<string>();
  let bestConfidence: 'high' | 'medium' | 'low' = 'low';
  let primaryNote = '';

  // Match against method map
  let methodMatchCount = 0;
  for (const entry of METHOD_MAP) {
    if (matchKeywords(combined, entry.keywords)) {
      methodMatchCount++;
      if (methodMatchCount === 1) primaryNote = entry.note;
      for (const ev of entry.evidence) {
        if (!seen.has(ev.label)) {
          seen.add(ev.label);
          expectations.push(ev);
        }
      }
    }
  }

  // Match against MoV map
  for (const entry of MOV_MAP) {
    if (matchKeywords(secondarySource || '', entry.keywords)) {
      for (const ev of entry.evidence) {
        if (!seen.has(ev.label)) {
          seen.add(ev.label);
          expectations.push(ev);
        }
      }
    }
  }

  // Confidence
  if (methodMatchCount >= 2) {
    bestConfidence = 'high';
  } else if (methodMatchCount === 1) {
    bestConfidence = 'medium';
  } else {
    bestConfidence = 'low';
  }

  if (expectations.length === 0) {
    return {
      expectations: [
        { label: 'Dokumentasi Kegiatan', category: 'primary' },
        { label: 'Laporan Pelaksanaan', category: 'primary' },
        { label: 'Data Pendukung', category: 'secondary' },
      ],
      confidence: 'low',
      note: 'Tidak ada metode spesifik terdeteksi. Bukti umum yang disarankan: dokumentasi kegiatan, laporan, dan data pendukung.',
    };
  }

  // Sort: primary first, then secondary, then supporting
  const order: Record<string, number> = { primary: 0, secondary: 1, supporting: 2 };
  expectations.sort((a, b) => (order[a.category] ?? 3) - (order[b.category] ?? 3));

  return {
    expectations,
    confidence: bestConfidence,
    note: primaryNote || 'Bukti yang disarankan berdasarkan metode pengumpulan data yang teridentifikasi.',
  };
}

// ── Evidence Readiness ──────────────────────────────────────────────────────

export type EvidenceReadiness = 'evidence_ready' | 'evidence_unclear' | 'missing_mov' | 'no_method';

export function getEvidenceReadiness(
  indicatorText: string | null | undefined,
  collectionMethod: string | null | undefined,
  secondarySource: string | null | undefined,
): EvidenceReadiness {
  if (!secondarySource || !secondarySource.trim()) return 'missing_mov';
  if (!collectionMethod || !collectionMethod.trim()) return 'no_method';

  const guidance = getEvidenceExpectations(indicatorText, collectionMethod, secondarySource);
  if (guidance.confidence === 'high' && guidance.expectations.length >= 3) return 'evidence_ready';
  if (guidance.confidence === 'medium') return 'evidence_ready';
  return 'evidence_unclear';
}

// ── Aggregation ─────────────────────────────────────────────────────────────

export interface EvidenceCoverageResult {
  totalIndicators: number;
  evidenceReady: number;
  evidenceUnclear: number;
  missingMov: number;
  noMethod: number;
}

export function computeEvidenceCoverage(
  items: Array<{
    indicator_text?: string | null;
    collection_method?: string | null;
    secondary_source?: string | null;
  }>,
): EvidenceCoverageResult {
  let evidenceReady = 0;
  let evidenceUnclear = 0;
  let missingMov = 0;
  let noMethod = 0;

  for (const item of items) {
    const state = getEvidenceReadiness(item.indicator_text, item.collection_method, item.secondary_source);
    switch (state) {
      case 'evidence_ready': evidenceReady++; break;
      case 'evidence_unclear': evidenceUnclear++; break;
      case 'missing_mov': missingMov++; break;
      case 'no_method': noMethod++; break;
    }
  }

  return {
    totalIndicators: items.length,
    evidenceReady,
    evidenceUnclear,
    missingMov,
    noMethod,
  };
}
