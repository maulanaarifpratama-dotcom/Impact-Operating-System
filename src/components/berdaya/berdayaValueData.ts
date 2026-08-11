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
      { name: 'Canva untuk Nonprofit', badge: 'GRATIS', note: 'Akses desain premium hingga 50 anggota tim per organisasi terverifikasi.' },
      { name: 'Adobe Express & Acrobat Pro', badge: 'DISKON', note: 'Diskon untuk organisasi nonprofit yang memenuhi ketentuan.' },
    ],
  },
  {
    title: 'Project & Kolaborasi',
    items: [
      { name: 'Asana untuk Nonprofit', badge: 'DISKON', note: 'Diskon tim & project management sesuai paket yang berlaku.' },
      { name: 'Atlassian', badge: 'DISKON', note: 'Program diskon untuk organisasi nonprofit terverifikasi.' },
      { name: 'monday.com untuk Nonprofit', badge: 'DISKON', note: 'Diskon pengelolaan kerja tim sesuai paket yang berlaku.' },
      { name: 'Zoom untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi meeting & webinar untuk nonprofit.' },
    ],
  },
  {
    title: 'Cloud & Keamanan',
    items: [
      { name: 'AWS untuk Nonprofit', badge: 'KREDIT', note: 'Kredit/diskon cloud sesuai program dan ketentuan yang berlaku saat pengajuan.' },
      { name: 'Box untuk Nonprofit', badge: 'DISKON', note: 'Diskon penyimpanan & kolaborasi file untuk organisasi nonprofit.' },
      { name: 'Dropbox untuk Nonprofit', badge: 'DISKON', note: 'Diskon penyimpanan cloud untuk organisasi nonprofit.' },
      { name: 'Okta & 1Password untuk Nonprofit', badge: 'DISKON', note: 'Diskon keamanan identitas dan manajemen password tim.' },
    ],
  },
  {
    title: 'AI & Produktivitas',
    items: [
      { name: 'Microsoft 365 Copilot Chat', badge: 'TERMASUK', note: 'Sudah termasuk dalam lisensi Microsoft 365 untuk Nonprofit di atas — tidak dihitung terpisah.' },
      { name: 'Program AI Nonprofit Lainnya', badge: 'AKSES GATEWAY', note: 'Sejumlah penyedia AI membuka program khusus nonprofit; syarat & kuota mengikuti kebijakan masing-masing penyedia.' },
    ],
  },
  {
    title: 'Marketing & Donor Outreach',
    items: [
      { name: 'LinkedIn untuk Nonprofit', badge: 'AKSES GATEWAY', note: 'Akses program nonprofit LinkedIn sesuai ketentuan verifikasi.' },
      { name: 'Hootsuite, Constant Contact, Eventbrite', badge: 'DISKON', note: 'Diskon untuk kebutuhan penjadwalan konten, email, dan event donor.' },
    ],
  },
  {
    title: 'Data & Website',
    items: [
      { name: 'Tableau untuk Nonprofit', badge: 'DISKON', note: 'Diskon lisensi visualisasi data untuk pelaporan program.' },
      { name: 'Wix untuk Nonprofit', badge: 'DISKON', note: 'Diskon pembuatan & pengelolaan website organisasi.' },
      { name: 'Sage Intacct', badge: 'DISKON', note: 'Diskon sistem akuntansi untuk organisasi nonprofit berskala menengah-besar.' },
    ],
  },
];

export const GATEWAY_PROGRAMS = [
  { name: 'TechSoup Indonesia', note: 'Gateway verifikasi utama untuk mengklaim Canva, Google, dan Microsoft — menerbitkan Validation Token.' },
  { name: 'Goodstack', note: 'Gateway verifikasi rekening & identitas hukum organisasi, dibutuhkan sebelum sejumlah klaim benefit.' },
  { name: 'Corporate Giving Directory', note: 'Direktori program corporate giving yang dapat dijajaki organisasi terverifikasi.' },
  { name: 'Grant Assistant', note: 'Bantuan navigasi menemukan dan memprioritaskan program yang relevan dengan organisasi Anda.' },
];

export const WHY_NOT_YET_REASONS = [
  'Tidak tahu program apa saja yang sebenarnya tersedia untuk NGO',
  'Tidak tahu gateway verifikasi mana yang harus didaftarkan lebih dulu',
  'Dokumen legalitas dan profil organisasi belum siap saat mendaftar',
  'Laporan keuangan organisasi masih terlalu informal untuk lolos verifikasi',
  'Tidak ada satu orang yang benar-benar bertanggung jawab (PIC) atas proses klaim',
  'Status aplikasi tidak dipantau, sehingga proses terhenti tanpa disadari',
  'Tanggal renewal terlupakan sehingga akses yang sudah didapat hangus',
  'Benefit yang sudah diperoleh tidak dimanfaatkan secara optimal',
];

export const GROWTH_LETTERS = [
  { letter: 'G', label: 'Grant & Resource Access' },
  { letter: 'R', label: 'Readiness & Baseline' },
  { letter: 'O', label: 'Operating Program & WBS Control Center' },
  { letter: 'W', label: 'Work Evidence & Verification' },
  { letter: 'T', label: 'Tracking & Control Engine' },
  { letter: 'H', label: 'High-Impact & ESG Reporting' },
];
