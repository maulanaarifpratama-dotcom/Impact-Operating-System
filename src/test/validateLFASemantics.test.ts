import { describe, it, expect } from "vitest";

// Pure function under test replicated for Node/Vitest test runner
function validateLFASemantics(matrix: any) {
  const reasons: string[] = [];
  let code: 'FAIL_OUTPUT_SEMANTICS' | 'FAIL_OUTCOME_STRENGTH' | 'ACTIVITY_FLOOR_FAILED' | undefined;

  if (!matrix || typeof matrix !== 'object') {
    return { isValid: false, code: 'ACTIVITY_FLOOR_FAILED', reasons: ['Matrix is missing or invalid object'] };
  }

  const outcomes = matrix.outcomes || [];
  const outputs = matrix.outputs || [];
  const activities = matrix.activities || [];

  // 1. Cardinality Floor Check
  if (outputs.length < 3) {
    reasons.push(`Outputs count (${outputs.length}) is below MVP floor of 3.`);
    code = 'ACTIVITY_FLOOR_FAILED';
  }

  if (activities.length < 9) {
    reasons.push(`Total activities count (${activities.length}) is below MVP floor of 9.`);
    code = 'ACTIVITY_FLOOR_FAILED';
  }

  const actCounts = new Map<number, number>();
  for (const act of activities) {
    const idx = act.output_index ?? 0;
    actCounts.set(idx, (actCounts.get(idx) || 0) + 1);
  }

  for (let i = 0; i < outputs.length; i++) {
    const count = actCounts.get(i) || 0;
    if (count < 3) {
      reasons.push(`Output ${i + 1} has only ${count} activities (minimum 3 required).`);
      code = 'ACTIVITY_FLOOR_FAILED';
    }
  }

  if (reasons.length > 0 && code === 'ACTIVITY_FLOOR_FAILED') {
    return { isValid: false, code, reasons };
  }

  // 2. Output Level Semantic Check
  const forbiddenOutputVerbs = [
    'terlaksana',
    'dilaksanakan',
    'diselenggarakan',
    'melakukan',
    'memfasilitasi',
    'mengadakan',
    'menyelenggarakan',
    'melatih',
    'menyusun'
  ];

  for (let i = 0; i < outputs.length; i++) {
    const op = outputs[i];
    const stmt = op.statement || '';
    const lower = stmt.toLowerCase();

    for (const verb of forbiddenOutputVerbs) {
      if (lower.includes(verb)) {
        reasons.push(`Output [OP-${i + 1}] contains forbidden activity/passive verb '${verb}': "${stmt}". Output must be a finished noun deliverable.`);
        if (!code) code = 'FAIL_OUTPUT_SEMANTICS';
      }
    }
  }

  if (reasons.length > 0 && code === 'FAIL_OUTPUT_SEMANTICS') {
    return { isValid: false, code, reasons };
  }

  // 3. Outcome Level Semantic Check
  for (let i = 0; i < outcomes.length; i++) {
    const oc = outcomes[i];
    const stmt = oc.statement || '';
    const lower = stmt.toLowerCase();

    const isKnowledgeOnly = (lower.includes('pengetahuan') || lower.includes('pemahaman') || lower.includes('kesadaran') || lower.includes('literasi')) &&
                           !(lower.includes('menerapkan') || lower.includes('memanfaatkan') || lower.includes('praktik') || lower.includes('mematuhi') || lower.includes('menggunakan') || lower.includes('adopsi') || lower.includes('mengalami'));

    if (isKnowledgeOnly) {
      reasons.push(`Outcome [OC-${i + 1}] is knowledge/awareness-only without behavioral state change: "${stmt}". Must express adoption, practice, or state change.`);
      if (!code) code = 'FAIL_OUTCOME_STRENGTH';
    }

    if (stmt.startsWith('Meningkatkan ')) {
      reasons.push(`Outcome [OC-${i + 1}] starts with action verb 'Meningkatkan': "${stmt}". Must use state change or beneficiary adoption phrasing (e.g. "Meningkatnya...", "Penerima manfaat mempraktikkan...").`);
      if (!code) code = 'FAIL_OUTCOME_STRENGTH';
    }
  }

  if (reasons.length > 0 && code === 'FAIL_OUTCOME_STRENGTH') {
    return { isValid: false, code, reasons };
  }

  // 4. Activity Level Semantic Check
  const activeVerbPrefixes = ['melakukan', 'memfasilitasi', 'mengadakan', 'menyelenggarakan', 'melatih', 'menyusun', 'melaksanakan', 'mendaftarkan', 'membantu', 'mengumpulkan', 'menyiapkan', 'mengembangkan', 'memberikan', 'mendokumentasikan', 'membangun', 'merekrut'];

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const stmt = act.statement || '';
    const lower = stmt.toLowerCase();

    const hasActiveVerb = activeVerbPrefixes.some(prefix => lower.includes(prefix));
    if (!hasActiveVerb) {
      reasons.push(`Activity [ACT-${i + 1}] lacks a valid active action verb: "${stmt}".`);
      if (!code) code = 'FAIL_OUTPUT_SEMANTICS';
    }
  }

  if (reasons.length > 0) {
    return { isValid: false, code: code || 'FAIL_OUTPUT_SEMANTICS', reasons };
  }

  return { isValid: true, reasons: [] };
}

describe("GW-P1.9 validateLFASemantics Level-Scoped Rules", () => {
  it("should PASS when all levels satisfy semantic and cardinality rules", () => {
    const validMatrix = {
      goal: { statement: "Berkontribusi pada peningkatan ekonomi berkelanjutan." },
      outcomes: [
        { statement: "Kelompok tani secara konsisten menerapkan praktik pertanian organik di lahannya." },
        { statement: "Penerima manfaat mengalami peningkatan pendapatan rumah tangga dari penjualan produk organik." }
      ],
      outputs: [
        { outcome_index: 0, statement: "Modul pelatihan pertanian organik dan panduan lapangan tersedia." },
        { outcome_index: 0, statement: "Unit rumah kompos komunitas terbangun dan beroperasi." },
        { outcome_index: 1, statement: "Dokumen kerja sama pemasaran dengan toko ritel disepakati." }
      ],
      activities: [
        { output_index: 0, statement: "Menyusun modul pelatihan pertanian organik berbasis praktik lokal." },
        { output_index: 0, statement: "Melaksanakan pelatihan teori dan laboratorium tanah bagi petani." },
        { output_index: 0, statement: "Mendokumentasikan materi dan membagikan panduan cetak ke peserta." },
        { output_index: 1, statement: "Membangun fasilitas fisik rumah kompos komunitas di area terdekat." },
        { output_index: 1, statement: "Menyiapkan alat pengolah limbah dan bak fermentasi pupuk." },
        { output_index: 1, statement: "Melatih pengurus komunitas untuk pemeliharaan fasilitas rumah kompos." },
        { output_index: 2, statement: "Melakukan fasilitasi negosiasi kesepakatan harga dengan mitra ritel." },
        { output_index: 2, statement: "Menyusun draf perjanjian kerja sama pasokan produk organik." },
        { output_index: 2, statement: "Memfasilitasi penandatanganan nota kesepahaman pemasaran." }
      ]
    };

    const res = validateLFASemantics(validMatrix);
    expect(res.isValid).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it("should REJECT Output containing forbidden activity verbs ('terlaksana') with FAIL_OUTPUT_SEMANTICS", () => {
    const matrix = {
      outcomes: [{ statement: "Kelompok tani menerapkan pengomposan." }],
      outputs: [
        { outcome_index: 0, statement: "Pelatihan pengomposan dilaksanakan di desa." }, // Forbidden verb
        { outcome_index: 0, statement: "Modul pelatihan tersedia." },
        { outcome_index: 0, statement: "Sistem monitoring terbentuk." }
      ],
      activities: Array(9).fill(null).map((_, i) => ({ output_index: i % 3, statement: "Melaksanakan aktivitas kerja." }))
    };

    const res = validateLFASemantics(matrix);
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("FAIL_OUTPUT_SEMANTICS");
    expect(res.reasons[0]).toContain("contains forbidden activity/passive verb");
  });

  it("should REJECT Outcome starting with 'Meningkatkan ' with FAIL_OUTCOME_STRENGTH", () => {
    const matrix = {
      outcomes: [{ statement: "Meningkatkan kapasitas produksi petani." }], // Action verb start
      outputs: [
        { outcome_index: 0, statement: "Modul pelatihan tersedia." },
        { outcome_index: 0, statement: "Dokumen baseline selesai." },
        { outcome_index: 0, statement: "Unit demonstrasi terpasang." }
      ],
      activities: Array(9).fill(null).map((_, i) => ({ output_index: i % 3, statement: "Melatih petani secara langsung." }))
    };

    const res = validateLFASemantics(matrix);
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("FAIL_OUTCOME_STRENGTH");
    expect(res.reasons.some(r => r.includes("starts with action verb 'Meningkatkan'"))).toBe(true);
  });

  it("should ALLOW active verbs in Activities while banning them in Outputs (Level-Scoped)", () => {
    const matrix = {
      outcomes: [{ statement: "Petani mengadopsi benih unggul pada musim tanam." }],
      outputs: [
        { outcome_index: 0, statement: "Modul dan benih unggul tersedia bagi kelompok tani." },
        { outcome_index: 0, statement: "Lahan demplot percobaan terbangun." },
        { outcome_index: 0, statement: "Laporan evaluasi uji coba terbit." }
      ],
      activities: [
        { output_index: 0, statement: "Melakukan pendampingan pembenihan." }, // Valid active verb
        { output_index: 0, statement: "Menyusun jadwal penyuluhan." }, // Valid active verb
        { output_index: 0, statement: "Melaksanakan distribusi benih." }, // Valid active verb
        { output_index: 1, statement: "Menyiapkan peralatan olah tanah." },
        { output_index: 1, statement: "Melatih pengelola demplot." },
        { output_index: 1, statement: "Memfasilitasi penanaman perdana." },
        { output_index: 2, statement: "Mengumpulkan data pertumbuhan tanaman." },
        { output_index: 2, statement: "Melakukan analisis hasil demplot." },
        { output_index: 2, statement: "Menyusun rekomendasi pupuk lanjutan." }
      ]
    };

    const res = validateLFASemantics(matrix);
    expect(res.isValid).toBe(true);
  });
});
