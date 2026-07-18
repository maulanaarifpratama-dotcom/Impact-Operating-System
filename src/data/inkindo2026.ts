export interface InkindoRole {
  role: string;
  category: 'Sub-Professional' | 'Supporting-Staff';
  price_idr: number;
}

export const INKINDO_ROLES: InkindoRole[] = [
  // Sub-Professional (Tabel 4-26)
  { role: 'Asisten Tenaga Ahli', category: 'Sub-Professional', price_idr: 17600000 },
  { role: 'Pemrogram Basis Data', category: 'Sub-Professional', price_idr: 17600000 },
  { role: 'Pemrogram Perangkat Lunak', category: 'Sub-Professional', price_idr: 17600000 },
  { role: 'Desain Grafis', category: 'Sub-Professional', price_idr: 17600000 },
  { role: 'Operator Basis Data', category: 'Sub-Professional', price_idr: 16900000 },
  { role: 'Pemelihara Sistem', category: 'Sub-Professional', price_idr: 16900000 },
  { role: 'Teknisi Jaringan Teknologi Informasi', category: 'Sub-Professional', price_idr: 16900000 },
  { role: 'Administrator Web', category: 'Sub-Professional', price_idr: 16900000 },
  { role: 'Operator CAD/CAM', category: 'Sub-Professional', price_idr: 14600000 },
  { role: 'Operator SIG', category: 'Sub-Professional', price_idr: 14600000 },
  { role: 'Teknisi Perangkat Keras', category: 'Sub-Professional', price_idr: 14600000 },
  { role: 'Fasilitator', category: 'Sub-Professional', price_idr: 14600000 },
  { role: 'Inspektur', category: 'Sub-Professional', price_idr: 14600000 },
  { role: 'Surveyor', category: 'Sub-Professional', price_idr: 13900000 },

  // Supporting Staff (Tabel 5-26)
  { role: 'Manajer Kantor', category: 'Supporting-Staff', price_idr: 14700000 },
  { role: 'Manajer Kantor Lapangan / Administrator', category: 'Supporting-Staff', price_idr: 13400000 },
  { role: 'Sekretaris Dwibahasa', category: 'Supporting-Staff', price_idr: 14600000 },
  { role: 'Sekretaris', category: 'Supporting-Staff', price_idr: 9400000 },
  { role: 'Operator Komputer', category: 'Supporting-Staff', price_idr: 8400000 },
  { role: 'Pengemudi', category: 'Supporting-Staff', price_idr: 6800000 },
  { role: 'Kurir', category: 'Supporting-Staff', price_idr: 6100000 },
  { role: 'Satpam', category: 'Supporting-Staff', price_idr: 6100000 },
  { role: 'Pesuruh Kantor', category: 'Supporting-Staff', price_idr: 5900000 }
];

export const INKINDO_PROVINCE_MULTIPLIERS: Record<string, number> = {
  'Nanggroe Aceh Darussalam': 0.963,
  'Sumatera Utara': 0.976,
  'Sumatera Barat': 0.947,
  'Riau': 1.080,
  'Kepulauan Riau': 1.101,
  'Jambi': 0.908,
  'Sumatera Selatan': 0.929,
  'Kepulauan Bangka Belitung': 0.910,
  'Bengkulu': 0.889,
  'Lampung': 0.899,
  'Banten': 0.950,
  'DKI Jakarta': 1.000,
  'Jawa Barat': 0.847,
  'Jawa Tengah': 0.823,
  'DI Yogyakarta': 0.838,
  'Jawa Timur': 0.979,
  'Bali': 0.958,
  'Nusa Tenggara Barat': 0.877,
  'Nusa Tenggara Timur': 0.841,
  'Kalimantan Barat': 0.937,
  'Kalimantan Tengah': 0.925,
  'Kalimantan Selatan': 0.918,
  'Kalimantan Timur': 1.030,
  'IKN': 1.294, // Ibu Kota Nusantara specific index (1.294)
  'Kalimantan Utara': 1.086,
  'Sulawesi Utara': 0.944,
  'Sulawesi Tengah': 0.908,
  'Sulawesi Tenggara': 0.947,
  'Sulawesi Selatan': 0.970,
  'Sulawesi Barat': 0.909,
  'Gorontalo': 0.924,
  'Maluku': 0.934,
  'Maluku Utara': 0.940,
  'Papua': 1.113,
  'Papua Barat': 1.202,
  'Papua Selatan': 1.114,
  'Papua Tengah': 1.130,
  'Papua Pegunungan': 1.153,
  'Papua Barat Daya': 1.194
};

export const INKINDO_DIRECT_COST_MULTIPLIERS: Record<string, number> = {
  'Nanggroe Aceh Darussalam': 0.927,
  'Sumatera Utara': 1.012,
  'Sumatera Barat': 0.878,
  'Riau': 0.907,
  'Kepulauan Riau': 1.049,
  'Jambi': 0.882,
  'Sumatera Selatan': 0.853,
  'Kepulauan Bangka Belitung': 0.911,
  'Bengkulu': 0.835,
  'Lampung': 0.825,
  'Banten': 0.860,
  'DKI Jakarta': 1.000,
  'Jawa Barat': 0.990,
  'Jawa Tengah': 0.934,
  'DI Yogyakarta': 0.939,
  'Jawa Timur': 0.962,
  'Bali': 0.960,
  'Nusa Tenggara Barat': 0.951,
  'Nusa Tenggara Timur': 0.843,
  'Kalimantan Barat': 0.898,
  'Kalimantan Tengah': 0.918,
  'Kalimantan Selatan': 0.936,
  'Kalimantan Timur': 1.091,
  'IKN': 1.292, // Ibu Kota Nusantara specific direct cost index
  'Kalimantan Utara': 1.100,
  'Sulawesi Utara': 0.894,
  'Sulawesi Tengah': 0.877,
  'Sulawesi Tenggara': 0.888,
  'Sulawesi Selatan': 0.898,
  'Sulawesi Barat': 0.822,
  'Gorontalo': 0.871,
  'Maluku': 1.004,
  'Maluku Utara': 0.988,
  'Papua': 1.443,
  'Papua Barat': 1.332,
  'Papua Selatan': 0.915,
  'Papua Tengah': 0.994,
  'Papua Pegunungan': 0.911,
  'Papua Barat Daya': 0.880
};

/**
 * Calculates local billing rates scaled for provinces and NGO multipliers
 * according to INKINDO 2026 and Perlem LKPP 12/2021 guidelines.
 */
export function calculateInkindoRate(
  roleName: string,
  province: string,
  unit: 'Month' | 'Week' | 'Day' | 'Hour',
  isNgoMode: boolean = true
): number {
  const role = INKINDO_ROLES.find(r => r.role === roleName);
  if (!role) return 0;

  const baseRate = role.price_idr;
  const pIndex = INKINDO_PROVINCE_MULTIPLIERS[province] || 1.0;
  const ngoMultiplier = isNgoMode ? 0.70 : 1.00;

  // SBOB (Satuan Biaya Orang Bulan)
  const SBOB = baseRate * pIndex * ngoMultiplier;

  switch (unit) {
    case 'Month':
      return Math.round(SBOB);
    case 'Week':
      // SBOM = SBOB / 4,1
      return Math.round(SBOB / 4.1);
    case 'Day':
      // SBOH = (SBOB / 22) * 1,1
      return Math.round((SBOB / 22) * 1.1);
    case 'Hour':
      // SBOJ = (SBOH / 8) * 1,3
      const SBOH = (SBOB / 22) * 1.1;
      return Math.round((SBOH / 8) * 1.3);
    default:
      return Math.round(SBOB);
  }
}

// ==========================================
// INKINDO 2026 PROFESSIONAL BILLING TABLES
// ==========================================

// Base rates for DKI Jakarta benchmark (Index = 1.000) - Tabel 2-26: Tenaga Ahli Profesional dengan SKK
export const RATES_S1_SKK = [
  28850000, 30600000, 32300000, 34000000, 35700000, // Year 1 to 5
  37400000, 39150000, 40850000, 42550000, 44250000, // Year 6 to 10
  46000000, 47700000, 49400000, 51100000, 52800000, // Year 11 to 15
  54550000, 56250000, 57950000, 59650000, 61350000, // Year 16 to 20
  63100000, 64800000, 66500000, 68200000, 69900000  // Year 21 to 25
];

export const RATES_S2_SKK = [
  37700000, 39800000, 41900000, 44000000, 46100000, // Year 1 to 5
  48200000, 50300000, 52400000, 54500000, 56600000, // Year 6 to 10
  58700000, 60850000, 62950000, 65050000, 67150000, // Year 11 to 15
  69250000, 71350000, 73450000, 75550000, 77650000, // Year 16 to 20
  79750000, 81850000, 83950000, 86050000, 88200000  // Year 21 to 25
];

export const RATES_S3_SKK = [
  48500000, 50700000, 52900000, 55150000, 57350000, // Year 1 to 5
  59550000, 61750000, 64000000, 66200000, 68400000, // Year 6 to 10
  70650000, 72850000, 75050000, 77300000, 79500000, // Year 11 to 15
  81700000, 83900000, 86150000, 88350000, 90550000, // Year 16 to 20
  92800000, 95000000, 97200000, 99400000, 101650000 // Year 21 to 25
];

/**
 * Calculates deterministic Professional Personnel billing rates scaled for provinces and NGO multipliers
 * according to INKINDO 2026 (Tabel 2-26 & Tabel 3-26) and Perlem LKPP 12/2021 guidelines.
 */
export function calculateInkindoProfessionalRate(
  education: 'S1' | 'S2' | 'S3',
  experienceYears: number, // 1 to 25
  hasSkk: boolean,
  province: string,
  unit: 'Month' | 'Week' | 'Day' | 'Hour',
  isNgoMode: boolean = true
): number {
  let baseRate = 0;
  // bound experience inside 1 to 25 years
  const boundedExp = Math.min(25, Math.max(1, experienceYears));
  const expIndex = boundedExp - 1;

  if (hasSkk) {
    if (education === 'S1') baseRate = RATES_S1_SKK[expIndex];
    else if (education === 'S2') baseRate = RATES_S2_SKK[expIndex];
    else if (education === 'S3') baseRate = RATES_S3_SKK[expIndex];
  } else {
    // Without SKK (Tabel 3-26)
    if (education === 'S1') {
      if (boundedExp < 3) {
        // S1 < 3 years experience is considered Sub-Professional. Use Asisten Tenaga Ahli rate.
        baseRate = 17600000;
      } else {
        // Year Y without SKK is equivalent to Year Y-2 with SKK
        baseRate = RATES_S1_SKK[expIndex - 2];
      }
    } else if (education === 'S2') {
      if (boundedExp === 1) baseRate = 33450000;
      else if (boundedExp === 2) baseRate = 35600000;
      else {
        baseRate = RATES_S2_SKK[expIndex - 2];
      }
    } else if (education === 'S3') {
      if (boundedExp === 1) baseRate = 44050000;
      else if (boundedExp === 2) baseRate = 46250000;
      else {
        baseRate = RATES_S3_SKK[expIndex - 2];
      }
    }
  }

  const pIndex = INKINDO_PROVINCE_MULTIPLIERS[province] || 1.0;
  const ngoMultiplier = isNgoMode ? 0.70 : 1.00;

  // SBOB (Satuan Biaya Orang Bulan)
  const SBOB = baseRate * pIndex * ngoMultiplier;

  switch (unit) {
    case 'Month':
      return Math.round(SBOB);
    case 'Week':
      // SBOM = SBOB / 4,1
      return Math.round(SBOB / 4.1);
    case 'Day':
      // SBOH = (SBOB / 22) * 1,1
      return Math.round((SBOB / 22) * 1.1);
    case 'Hour':
      // SBOJ = (SBOH / 8) * 1,3
      const SBOH = (SBOB / 22) * 1.1;
      return Math.round((SBOH / 8) * 1.3);
    default:
      return Math.round(SBOB);
  }
}
