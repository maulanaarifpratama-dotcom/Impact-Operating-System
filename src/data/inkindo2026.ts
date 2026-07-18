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
