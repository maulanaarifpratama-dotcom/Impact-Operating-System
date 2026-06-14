export interface SbmItem {
  name: string;
  category: string;
  price: number;
  unit: string;
}

export const SBM_2026: Record<string, SbmItem[]> = {
  'Honorarium': [
    { name: 'Narasumber Nasional', category: 'Honorarium', price: 1700000, unit: 'jam' },
    { name: 'Narasumber Lokal', category: 'Honorarium', price: 900000, unit: 'jam' },
    { name: 'Moderator', category: 'Honorarium', price: 900000, unit: 'Kegiatan' },
    { name: 'Fasilitator', category: 'Honorarium', price: 750000, unit: 'Hari' },
    { name: 'Panitia', category: 'Honorarium', price: 300000, unit: 'Hari' },
    { name: 'Petugas Lapangan', category: 'Honorarium', price: 250000, unit: 'Hari' },
  ],
  'Transport': [
    { name: 'Transport Dalam Kota', category: 'Transport', price: 150000, unit: 'Orang' },
    { name: 'Transport Luar Kota (estimasi)', category: 'Transport', price: 500000, unit: 'Orang' },
    { name: 'Uang Harian Dalam Kota', category: 'Transport', price: 380000, unit: 'Hari' },
    { name: 'Uang Harian Luar Kota', category: 'Transport', price: 530000, unit: 'Hari' },
  ],
  'Akomodasi': [
    { name: 'Hotel Bintang 3', category: 'Akomodasi', price: 750000, unit: 'Hari' },
    { name: 'Hotel Bintang 2', category: 'Akomodasi', price: 450000, unit: 'Hari' },
    { name: 'Penginapan Sederhana', category: 'Akomodasi', price: 250000, unit: 'Hari' },
  ],
  'Konsumsi': [
    { name: 'Makan + 2 Snack', category: 'Konsumsi', price: 117000, unit: 'Orang' },
    { name: 'Makan Siang', category: 'Konsumsi', price: 60000, unit: 'Orang' },
    { name: 'Snack', category: 'Konsumsi', price: 30000, unit: 'Orang' },
    { name: 'Air Mineral', category: 'Konsumsi', price: 15000, unit: 'Orang' },
  ],
  'ATK': [
    { name: 'Modul/Materi Pelatihan', category: 'ATK', price: 50000, unit: 'Paket' },
    { name: 'Fotokopi', category: 'ATK', price: 500, unit: 'Lembar' },
  ],
  'Cetak': [
    { name: 'Spanduk 3x1m', category: 'Cetak', price: 150000, unit: 'Unit' },
    { name: 'Backdrop', category: 'Cetak', price: 500000, unit: 'Unit' },
  ]
};

// Flat list for global quick lookup/suggestions
export const SBM_FLAT_ITEMS: SbmItem[] = Object.values(SBM_2026).flat();
