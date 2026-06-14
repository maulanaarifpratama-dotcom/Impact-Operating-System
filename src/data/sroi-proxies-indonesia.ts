// src/data/sroi-proxies-indonesia.ts
// Indonesian SROI Proxy reference library.
// All values are starter estimates based on public references and local studies.

export interface SroiProxyItem {
  id: string;
  category: string;
  name: string;
  value_idr: number;
  unit: string;
  source: string;
  citation: string;
}

export const SROI_PROXIES_INDONESIA: SroiProxyItem[] = [
  // --- PENDIDIKAN ---
  {
    id: 'edu-01',
    category: 'Pendidikan',
    name: 'Peningkatan literasi dasar anak usia dini',
    value_idr: 4200000,
    unit: 'orang/tahun',
    source: 'Kementerian Pendidikan & Studi Dampak NGO',
    citation: 'Estimasi biaya les/bimbingan belajar membaca intensif non-formal lokal per tahun.'
  },
  {
    id: 'edu-02',
    category: 'Pendidikan',
    name: 'Pelatihan keterampilan digital untuk pemuda',
    value_idr: 6800000,
    unit: 'orang',
    source: 'Kominfo & Lembaga Pelatihan Swasta',
    citation: 'Rata-rata biaya bootcamp/kursus keterampilan digital intensif tingkat pemula.'
  },
  {
    id: 'edu-03',
    category: 'Pendidikan',
    name: 'Peningkatan angka kelulusan SMA (Pencegahan putus sekolah)',
    value_idr: 28000000,
    unit: 'orang',
    source: 'BPS & Bank Dunia Indonesia',
    citation: 'Nilai peningkatan potensi pendapatan seumur hidup (lifetime earning premium) lulusan SMA vs SMP.'
  },
  {
    id: 'edu-04',
    category: 'Pendidikan',
    name: 'Beasiswa pendidikan tinggi (Diploma/Sarjana)',
    value_idr: 45000000,
    unit: 'orang',
    source: 'Kementerian Keuangan - LPDP',
    citation: 'Biaya rata-rata uang kuliah tunggal (UKT) ditambah biaya hidup minimal mahasiswa per tahun.'
  },

  // --- KESEHATAN ---
  {
    id: 'health-01',
    category: 'Kesehatan',
    name: 'Pencegahan stunting pada balita',
    value_idr: 32000000,
    unit: 'anak',
    source: 'Kementerian Kesehatan & WHO Indonesia',
    citation: 'Nilai penghematan biaya medis seumur hidup dan pencegahan kehilangan produktivitas masa depan anak.'
  },
  {
    id: 'health-02',
    category: 'Kesehatan',
    name: 'Akses layanan kesehatan dasar (Poli/Klinik Desa)',
    value_idr: 1800000,
    unit: 'orang/tahun',
    source: 'BPJS Kesehatan & Kemenkes',
    citation: 'Rata-rata iuran kapitasi jaminan kesehatan nasional ditambah biaya out-of-pocket pasien per tahun.'
  },
  {
    id: 'health-03',
    category: 'Kesehatan',
    name: 'Penurunan angka kematian ibu (maternal mortality)',
    value_idr: 180000000,
    unit: 'kasus',
    source: 'Kemenkes & Analisis Ekonomi Kesehatan',
    citation: 'Valuasi ekonomi pencegahan kematian ibu melahirkan berdasarkan kontribusi domestik tangga.'
  },
  {
    id: 'health-04',
    category: 'Kesehatan',
    name: 'Peningkatan sanitasi lingkungan (Jamban Sehat)',
    value_idr: 3500000,
    unit: 'KK',
    source: 'Kementerian PUPR - Sanimas',
    citation: 'Biaya konstruksi toilet sehat standar rumah tangga ditambah estimasi penurunan diare keluarga.'
  },

  // --- EKONOMI ---
  {
    id: 'econ-01',
    category: 'Ekonomi',
    name: 'Peningkatan pendapatan UMKM binaan',
    value_idr: 15000000, // This is a baseline, can be customized (3x multiplier is applied in simple mode if selected, or custom input)
    unit: 'UMKM/tahun',
    source: 'Kementerian Koperasi & UKM',
    citation: 'Nilai tambah ekonomi bersih (net income increase) UMKM setelah pembinaan bisnis.'
  },
  {
    id: 'econ-02',
    category: 'Ekonomi',
    name: 'Akses modal usaha mikro',
    value_idr: 5000000,
    unit: 'penerima',
    source: 'OJK & PNM Mekaar',
    citation: 'Rata-rata pinjaman usaha mikro produktif ditambah estimasi perputaran modal lokal (2.5x multiplier).'
  },
  {
    id: 'econ-03',
    category: 'Ekonomi',
    name: 'Pelatihan wirausaha baru / inkubasi bisnis',
    value_idr: 8500000,
    unit: 'peserta',
    source: 'Kemenaker & Balai Latihan Kerja',
    citation: 'Biaya rata-rata pelatihan kejuruan teknis lengkap ditambah paket peralatan awal wirausaha.'
  },
  {
    id: 'econ-04',
    category: 'Ekonomi',
    name: 'Pembukaan lapangan kerja baru (Penyerapan tenaga kerja)',
    value_idr: 24000000,
    unit: 'orang/tahun',
    source: 'BPS - Upah Minimum Regional (UMR)',
    citation: 'Nilai agregat upah tahunan minimum pekerja di sektor informal/formal non-perkotaan.'
  },

  // --- LINGKUNGAN ---
  {
    id: 'env-01',
    category: 'Lingkungan',
    name: 'Pengurangan emisi karbon (CO2)',
    value_idr: 150000,
    unit: 'ton CO2',
    source: 'Kementerian LHK - Nilai Ekonomi Karbon',
    citation: 'Standar harga acuan karbon domestik Indonesia dalam bursa karbon nasional (IDXCarbon).'
  },
  {
    id: 'env-02',
    category: 'Lingkungan',
    name: 'Penghijauan / reforestasi hutan rusak',
    value_idr: 12000000,
    unit: 'hektar',
    source: 'Kementerian LHK & Perhutani',
    citation: 'Biaya bibit tanaman keras, penanaman, serta pemeliharaan area kritis selama 1 tahun.'
  },
  {
    id: 'env-03',
    category: 'Lingkungan',
    name: 'Pengelolaan sampah terpadu (TPS3R)',
    value_idr: 2800000,
    unit: 'ton/tahun',
    source: 'Kementerian PUPR - Tata Ruang',
    citation: 'Penghematan biaya tipping fee, pemilahan, dan nilai ekonomi daur ulang sampah plastik/organik.'
  },
  {
    id: 'env-04',
    category: 'Lingkungan',
    name: 'Akses air bersih pedesaan (Pipanisasi)',
    value_idr: 4500000,
    unit: 'KK',
    source: 'Kementerian PUPR & NGO Air Bersih',
    citation: 'Nilai penghematan waktu pengumpulan air oleh perempuan/anak ditambah penurunan infeksi air kotor.'
  },

  // --- SOSIAL ---
  {
    id: 'soc-01',
    category: 'Sosial',
    name: 'Pencegahan Kekerasan Dalam Rumah Tangga (KDRT)',
    value_idr: 45000000,
    unit: 'kasus',
    source: 'Kementerian PPPA & Komnas Perempuan',
    citation: 'Penghematan biaya penanganan hukum, konseling trauma psikologis, dan pemulihan korban.'
  },
  {
    id: 'soc-02',
    category: 'Sosial',
    name: 'Perlindungan anak dari eksploitasi/pekerja anak',
    value_idr: 38000000,
    unit: 'anak',
    source: 'KPAI & UNICEF Indonesia',
    citation: 'Nilai pemulihan kesejahteraan sosial-emosional anak dan reintegrasi ke sekolah formal.'
  },
  {
    id: 'soc-03',
    category: 'Sosial',
    name: 'Pemberdayaan kelompok perempuan kepala keluarga (PEKKA)',
    value_idr: 12000000,
    unit: 'orang',
    source: 'Studi PEKKA & SROI Network',
    citation: 'Peningkatan kapasitas advokasi, penghematan hukum komunitas, dan kepercayaan diri sosial.'
  },
  {
    id: 'soc-04',
    category: 'Sosial',
    name: 'Integrasi sosial penyandang disabilitas (Aksesibilitas/Alat Bantu)',
    value_idr: 18000000,
    unit: 'orang',
    source: 'Kementerian Sosial & Komunitas Disabilitas',
    citation: 'Biaya penyediaan alat bantu ortopedi/pelatihan khusus ditambah nilai kemandirian aktivitas harian.'
  }
];

export const SROI_SECTORS = [
  'Pendidikan',
  'Kesehatan',
  'Ekonomi',
  'Lingkungan',
  'Sosial',
  'Lainnya'
];
