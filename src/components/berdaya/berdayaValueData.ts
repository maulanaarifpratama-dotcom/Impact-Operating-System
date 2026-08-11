// Local benefit/value data exclusive to /berdaya. Source-verified against official
// vendor pages (Google, Microsoft) at time of writing; Canva figure reused from the
// existing Impactory Resource Access Tracker dataset. FX assumption: USD 1 = Rp16.300.

export const formatRp = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

export const FX_RATE_NOTE =
  'Ilustrasi menggunakan kurs Rp16.300 per USD. Nilai rupiah dapat berubah mengikuti kurs dan harga resmi penyedia.';

export const CORE_VALUE_LEDGER = [
  {
    key: 'google-ad-grants',
    name: 'Google Ad Grants',
    type: 'CREDIT' as const,
    annualRp: 1_956_000_000,
  },
  {
    key: 'microsoft-365',
    name: 'Microsoft 365 untuk Nonprofit',
    type: 'FREE LICENSE' as const,
    annualRp: 410_760_000,
  },
  {
    key: 'azure-credit',
    name: 'Azure untuk Nonprofit',
    type: 'CLOUD CREDIT' as const,
    annualRp: 32_600_000,
  },
];

export const CORE_VALUE_TOTAL_RP = CORE_VALUE_LEDGER.reduce((sum, item) => sum + item.annualRp, 0);

export const ADDITIONAL_BENEFIT_GROUPS = [
  {
    title: 'Desain & Komunikasi',
    items: [
      { name: 'Canva untuk Nonprofit', badge: 'GRATIS', note: 'Akses desain premium untuk mendukung kampanye, proposal, dan laporan organisasi.' },
      { name: 'Adobe Express & Acrobat Pro', badge: 'DISKON', note: 'Diskon untuk organisasi nonprofit yang memenuhi syarat.' },
    ],
  },
  {
    title: 'Project & Kolaborasi',
    items: [
      { name: 'Asana untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi untuk tim & project management.' },
      { name: 'Atlassian', badge: 'DISKON', note: 'Diskon lisensi untuk organisasi nonprofit.' },
      { name: 'monday.com untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi pengelolaan kerja tim.' },
      { name: 'Zoom untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi meeting & webinar.' },
    ],
  },
  {
    title: 'Cloud & Keamanan',
    items: [
      { name: 'AWS untuk Nonprofit', badge: 'KREDIT', note: 'Potensi kredit atau diskon cloud sesuai program yang berlaku.' },
      { name: 'Box untuk Nonprofit', badge: 'DISKON', note: 'Diskon penyimpanan & kolaborasi file.' },
      { name: 'Dropbox untuk Nonprofit', badge: 'DISKON', note: 'Diskon penyimpanan cloud.' },
      { name: 'Okta & 1Password untuk Nonprofit', badge: 'DISKON', note: 'Diskon keamanan identitas & manajemen password.' },
    ],
  },
  {
    title: 'AI & Produktivitas',
    items: [
      { name: 'Microsoft 365 Copilot Chat', badge: 'TERMASUK', note: 'Sudah termasuk dalam lisensi Microsoft 365 di atas — tidak dihitung terpisah.' },
      { name: 'AI Nonprofit Lainnya', badge: 'DISKON', note: 'Sejumlah penyedia AI membuka program khusus untuk organisasi nonprofit.' },
    ],
  },
  {
    title: 'Marketing & Donor Outreach',
    items: [
      { name: 'LinkedIn untuk Nonprofit', badge: 'DISKON', note: 'Program nonprofit untuk kebutuhan branding & talent.' },
      { name: 'Hootsuite, Constant Contact, Eventbrite', badge: 'DISKON', note: 'Diskon untuk kebutuhan konten, email, dan event donor.' },
    ],
  },
  {
    title: 'Data & Website',
    items: [
      { name: 'Tableau untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi visualisasi data.' },
      { name: 'Wix untuk Nonprofit', badge: 'DISKON', note: 'Diskon pembuatan & pengelolaan website.' },
      { name: 'Sage Intacct', badge: 'DISKON', note: 'Diskon sistem akuntansi untuk organisasi skala menengah-besar.' },
    ],
  },
];

export const ACCESS_TEASERS = [
  { title: 'Kelayakan Organisasi', desc: 'Tidak semua benefit menggunakan standar kelayakan yang sama.' },
  { title: 'Urutan Pengajuan', desc: 'Beberapa program membutuhkan tahapan tertentu sebelum pengajuan utama dapat dilakukan.' },
  { title: 'Kesiapan Informasi', desc: 'Data organisasi yang tidak konsisten dapat memperlambat proses verifikasi.' },
  { title: 'Masa Berlaku', desc: 'Sejumlah benefit perlu dikelola dan diperbarui agar akses tetap aktif.' },
];

export const WHY_NOT_YET_PROBLEMS = [
  { title: 'Informasi Tersebar', desc: 'Benefit tersedia di banyak penyedia dengan ketentuan yang berbeda.' },
  { title: 'Jalur Tidak Seragam', desc: 'Setiap program memiliki proses, waktu, dan mekanisme verifikasi sendiri.' },
  { title: 'Tidak Ada Sistem', desc: 'Pengajuan, status, penggunaan, dan masa berlaku sering tidak dikelola secara terpusat.' },
];

export const GROWTH_LETTERS = [
  { letter: 'G', label: 'Grant & Resource Access' },
  { letter: 'R', label: 'Readiness & Baseline' },
  { letter: 'O', label: 'Operating Program & WBS Control Center' },
  { letter: 'W', label: 'Work Evidence & Verification' },
  { letter: 'T', label: 'Tracking & Control Engine' },
  { letter: 'H', label: 'High-Impact & ESG Reporting' },
];
