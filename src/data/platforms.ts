export type PlatformCategory =
  | 'gateway' | 'ops' | 'marketing' | 'ai' | 'project_mgmt'
  | 'crm' | 'finance' | 'tech' | 'security' | 'legal'
  | 'storage' | 'event' | 'data' | 'website'

export type PricingType = 'free' | 'discount' | 'credits' | 'admin_fee'
export type GatewayType = 'goodstack' | 'techsoup' | 'direct' | 'both'
export type RenewalType = 'auto' | 'manual' | 'none'
export type ProductStatus = 'free' | 'discount' | 'credits'

export interface PlatformProduct {
  name: string
  status: ProductStatus
  discount_percent?: number
  retail_price_usd?: string
  nonprofit_price_usd?: string
  description: string
  use_case_ngo: string
}

export interface Platform {
  id: string
  name: string
  gateway: GatewayType
  priority: number
  category: PlatformCategory[]
  pricing: {
    type: PricingType
    label: string
    detail: string
  }
  renewal: {
    type: RenewalType
    period: string
    note: string
  }
  description: string
  use_cases: string[]
  products: PlatformProduct[]
  requirements: {
    documents: string[]
    conditions: string[]
  }
  registration: {
    url: string
    estimated_time: string
    steps: string[]
    gotchas: string[]
  }
  not_eligible: string[]
}

export const PLATFORMS: Platform[] = [

  // ============================================================
  // GATEWAY
  // ============================================================

  {
    id: 'goodstack',
    name: 'Goodstack',
    gateway: 'direct',
    priority: 1,
    category: ['gateway'],
    pricing: {
      type: 'free',
      label: 'GRATIS',
      detail: 'Free forever untuk verified nonprofit',
    },
    renewal: {
      type: 'manual',
      period: 'Tahunan',
      note: 'Update dokumen jika ada perubahan legalitas organisasi',
    },
    description: 'Kartu identitas nonprofit digital global. Daftar Goodstack DULU sebelum apply platform lain — mayoritas program tech nonprofit internasional kini verifikasi via Goodstack: Google, Canva, Microsoft, OpenAI, Zoom, Asana, dan lainnya.',
    use_cases: [
      'Verifikasi status nonprofit untuk unlock 30+ program tech diskon',
      'Akses Grant Assistant (Maia AI) untuk discover funding opportunities',
      'Masuk direktori global untuk terima donasi dari employee giving programs perusahaan mitra',
    ],
    products: [
      {
        name: 'Nonprofit Verification',
        status: 'free',
        description: 'Verifikasi resmi status yayasan/NGO untuk akses semua program partner',
        use_case_ngo: 'Syarat utama untuk klaim semua produk partner Goodstack',
      },
      {
        name: 'Grant Assistant (Maia AI)',
        status: 'free',
        description: 'AI assistant untuk discover dan apply grant funding',
        use_case_ngo: 'Cari grant yang cocok dengan profil organisasi secara otomatis',
      },
      {
        name: 'Corporate Giving Directory',
        status: 'free',
        description: 'Masuk direktori global penerima donasi korporat',
        use_case_ngo: 'Terima donasi tidak terikat dari employee giving programs perusahaan global',
      },
    ],
    requirements: {
      documents: [
        'SK Kemenkumham (aktif)',
        'Akta Notaris pendirian yayasan',
        'NPWP Yayasan (bukan NPWP pribadi)',
        'Email domain organisasi (bukan Gmail/Yahoo pribadi)',
        'Website atau media sosial aktif yang mencantumkan profil organisasi',
      ],
      conditions: [
        'Terdaftar legal sebagai nonprofit di negara asal',
        'Pemohon benar-benar terkait dengan organisasi',
        'Organisasi dalam status aktif (good standing)',
      ],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-7 hari kerja',
      steps: [
        'Buka goodstack.org → klik Sign up as a cause',
        'Isi profil organisasi lengkap termasuk misi dan program',
        'Upload SK Kemenkumham dan Akta Notaris',
        'Tunggu verifikasi dari tim Goodstack',
        'Setelah approved, buka Product Offers untuk klaim diskon platform lain',
      ],
      gotchas: [
        'Email pendaftar HARUS email domain organisasi, bukan Gmail pribadi',
        'Nama organisasi di semua dokumen harus konsisten (SK, Akta, NPWP)',
        'Deskripsi misi yang jelas dan spesifik mempercepat verifikasi',
        'Goodstack bisa reject jika misi organisasi tidak cukup jelas atau ambigu',
      ],
    },
    not_eligible: [
      'Lembaga pemerintah',
      'Organisasi politik',
      'Perusahaan for-profit',
      'Grant-making foundations (lembaga pemberi grant, bukan penerima)',
    ],
  },

  {
    id: 'techsoup',
    name: 'TechSoup Indonesia',
    gateway: 'direct',
    priority: 2,
    category: ['gateway'],
    pricing: {
      type: 'admin_fee',
      label: 'GRATIS daftar + Admin Fee per produk',
      detail: 'Admin fee per produk $0–$475 tergantung produk. Jauh di bawah harga retail.',
    },
    renewal: {
      type: 'manual',
      period: 'Tahunan',
      note: 'Keanggotaan perlu diperbarui tiap tahun dengan dokumen terbaru',
    },
    description: 'Marketplace tech untuk NGO dengan 100+ software partner. Gateway untuk Microsoft, Adobe, AWS, Autodesk, dan lainnya. Berbeda dari Goodstack: TechSoup adalah marketplace berbasis admin fee, Goodstack adalah verifikasi + diskon langsung dari vendor.',
    use_cases: [
      'Klaim Microsoft 365 gratis untuk seluruh tim (300 lisensi)',
      'Dapatkan Adobe Creative Cloud dengan diskon signifikan',
      'Akses AWS credits untuk cloud hosting',
      'Software operasional dengan harga nonprofit',
    ],
    products: [
      {
        name: 'Microsoft 365 Business Basic',
        status: 'free',
        nonprofit_price_usd: '$0',
        description: 'Email domain, Teams, OneDrive, SharePoint — 300 lisensi',
        use_case_ngo: 'Email resmi @organisasi.or.id untuk seluruh tim dan relawan',
      },
      {
        name: 'Microsoft 365 Business Standard',
        status: 'discount',
        retail_price_usd: '$12.50/user/month',
        nonprofit_price_usd: '$3/user/month',
        description: 'Full Office desktop apps + Teams + OneDrive',
        use_case_ngo: 'Tim yang butuh Word, Excel, PowerPoint versi desktop',
      },
      {
        name: 'Microsoft 365 Business Premium',
        status: 'discount',
        retail_price_usd: '$22/user/month',
        nonprofit_price_usd: '$5.50/user/month',
        description: 'Full Office + Teams + Intune + Defender enterprise security',
        use_case_ngo: 'Setup lengkap dengan keamanan enterprise untuk organisasi yang handle data sensitif',
      },
      {
        name: 'Adobe Creative Cloud Pro',
        status: 'discount',
        discount_percent: 60,
        nonprofit_price_usd: '$5 admin fee (year 1)',
        description: 'Photoshop, Illustrator, Premiere, InDesign, dan 20+ apps',
        use_case_ngo: 'Desain materi kampanye profesional, edit video dokumentasi, layout laporan tahunan',
      },
      {
        name: 'Slack for Nonprofits',
        status: 'free',
        nonprofit_price_usd: '$0 admin fee',
        description: 'Channel-based messaging platform',
        use_case_ngo: 'Ganti WhatsApp group dengan channel terstruktur per program/project',
      },
      {
        name: 'AWS Credits (Smaller)',
        status: 'credits',
        nonprofit_price_usd: '$95 admin fee',
        description: 'AWS cloud credits untuk smaller nonprofits',
        use_case_ngo: 'Hosting website organisasi, storage backup data program',
      },
      {
        name: 'AWS Credits (Medium)',
        status: 'credits',
        nonprofit_price_usd: '$190 admin fee',
        description: 'AWS cloud credits untuk medium nonprofits',
        use_case_ngo: 'Aplikasi internal, database program, analitik data beneficiary',
      },
      {
        name: 'AWS Credits (Larger)',
        status: 'credits',
        nonprofit_price_usd: '$475 admin fee',
        description: 'AWS cloud credits untuk larger nonprofits',
        use_case_ngo: 'Infrastruktur cloud skala besar untuk layanan digital organisasi',
      },
      {
        name: 'Asana Starter/Advanced',
        status: 'discount',
        nonprofit_price_usd: '$0 admin fee',
        description: 'Project management — access to discounted rates',
        use_case_ngo: 'Tracking task per program, monitoring deadline laporan donor',
      },
      {
        name: 'Box for Nonprofits',
        status: 'discount',
        nonprofit_price_usd: '$91 admin fee',
        description: 'Enterprise cloud storage dan content management',
        use_case_ngo: 'Backup dokumen legal, sharing file besar dengan donor/mitra',
      },
      {
        name: 'Dropbox Standard',
        status: 'discount',
        nonprofit_price_usd: '$60 admin fee',
        description: 'Cloud storage dan file sync',
        use_case_ngo: 'Sync foto dokumentasi lapangan, backup otomatis',
      },
      {
        name: 'Dropbox Advanced',
        status: 'discount',
        nonprofit_price_usd: '$85 admin fee',
        description: 'Cloud storage dengan admin controls lebih lengkap',
        use_case_ngo: 'Tim besar dengan kebutuhan storage dan kontrol akses lebih kompleks',
      },
      {
        name: 'Hootsuite for Nonprofits',
        status: 'discount',
        discount_percent: 60,
        description: 'Social media management platform',
        use_case_ngo: 'Jadwalkan konten sosmed, monitor engagement, analisis performa',
      },
      {
        name: 'Tableau Desktop Professional (2 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$74 admin fee',
        description: 'Data visualization dan analytics',
        use_case_ngo: 'Visualisasi data dampak program untuk laporan donor dan stakeholder',
      },
      {
        name: 'Zoho for Nonprofits',
        status: 'discount',
        description: 'Suite CRM, email, project management, accounting',
        use_case_ngo: 'All-in-one: CRM donor, email blast, invoicing tanpa banyak tools terpisah',
      },
      {
        name: 'monday.com for Nonprofits',
        status: 'discount',
        description: 'Work management platform dengan visual board',
        use_case_ngo: 'Visual tracking progress semua program dalam satu dashboard',
      },
      {
        name: 'Foxit PDF Editor+',
        status: 'discount',
        discount_percent: 68,
        nonprofit_price_usd: '$16 admin fee/year',
        description: 'PDF editor dengan AI integration',
        use_case_ngo: 'Edit, merge, dan sign dokumen PDF proposal dan laporan',
      },
      {
        name: 'Foxit eSign Business',
        status: 'discount',
        discount_percent: 60,
        nonprofit_price_usd: '$30 admin fee/year',
        description: 'Cloud-based e-signature platform',
        use_case_ngo: 'Tanda tangan MOU dan kontrak dari jarak jauh',
      },
      {
        name: 'Wix Premium Core (2 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$17 admin fee',
        description: 'Website builder premium 2 tahun',
        use_case_ngo: 'Website organisasi dengan domain sendiri dan template profesional',
      },
      {
        name: 'Wix Premium Business (2 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$25 admin fee',
        description: 'Website builder dengan fitur ecommerce',
        use_case_ngo: 'Website organisasi dengan fitur donasi online dan toko merchandise',
      },
      {
        name: 'IDCloudHost Domain + Hosting (1 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$14 admin fee',
        description: 'Local Indonesian hosting provider',
        use_case_ngo: 'Hosting lokal dengan server Indonesia untuk audience Indonesia',
      },
      {
        name: 'Constant Contact',
        status: 'discount',
        nonprofit_price_usd: '$59 admin fee',
        description: 'Email marketing dan outreach platform',
        use_case_ngo: 'Newsletter donor bulanan, update program ke mailing list stakeholder',
      },
      {
        name: 'Kintone for Nonprofits',
        status: 'free',
        description: 'No-code app builder untuk nonprofit',
        use_case_ngo: 'Buat database beneficiary, form survei lapangan, tracking program tanpa coding',
      },
      {
        name: 'Okta for Nonprofits',
        status: 'discount',
        discount_percent: 50,
        description: 'Identity & access management — SSO dan MFA',
        use_case_ngo: 'Keamanan akses semua sistem organisasi dengan satu login',
      },
      {
        name: 'Norton 360 Deluxe (5 devices, 1 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$17 admin fee',
        description: 'Antivirus dan cybersecurity untuk 5 device',
        use_case_ngo: 'Proteksi laptop/PC tim dari malware, phishing, dan ransomware',
      },
      {
        name: 'Bitdefender GravityZone Business Security (10 users)',
        status: 'discount',
        nonprofit_price_usd: '$63 admin fee',
        description: 'Enterprise endpoint security',
        use_case_ngo: 'Proteksi jaringan dan device untuk organisasi dengan 10+ komputer',
      },
      {
        name: 'Webex Meetings for Nonprofits',
        status: 'free',
        description: 'Video conferencing Cisco',
        use_case_ngo: 'Alternatif Zoom untuk rapat dan webinar dengan donor atau mitra',
      },
      {
        name: 'Visio Professional',
        status: 'discount',
        nonprofit_price_usd: '$443 admin fee',
        description: 'Diagram dan flowchart tool dari Microsoft',
        use_case_ngo: 'Buat flowchart proses program, org chart, dan diagram sistem',
      },
      {
        name: 'Autodesk AutoCAD (1 tahun)',
        status: 'discount',
        nonprofit_price_usd: '$220 admin fee',
        description: 'CAD software untuk 2D dan 3D design',
        use_case_ngo: 'NGO bidang konstruksi/infrastruktur/lingkungan untuk desain teknis',
      },
    ],
    requirements: {
      documents: [
        'SK Kemenkumham (aktif)',
        'Akta Notaris pendirian yayasan',
        'NPWP Yayasan (bukan pribadi)',
        'NIB dari OSS',
        'Laporan keuangan terakhir',
        'Foto kantor atau kegiatan organisasi',
      ],
      conditions: [
        'Terdaftar sebagai yayasan atau LSM aktif',
        'Beroperasi untuk kepentingan publik non-profit',
        'Comply dengan TechSoup Anti-Discrimination Policy',
      ],
    },
    registration: {
      url: 'https://www.techsoupindonesia.or.id',
      estimated_time: '2-5 hari kerja',
      steps: [
        'Buka techsoupindonesia.or.id → klik Daftar',
        'Isi profil organisasi lengkap',
        'Upload semua dokumen yang dibutuhkan',
        'Tunggu validasi 2-5 hari kerja',
        'Setelah approved, browse katalog dan tambahkan ke cart',
        'Bayar admin fee via transfer (jika ada)',
        'Aktifkan produk sesuai instruksi masing-masing',
      ],
      gotchas: [
        'Tiap produk punya eligibility tersendiri — tidak semua NGO bisa klaim semua produk',
        'Ada batas kuantitas per organisasi per tahun untuk beberapa produk Microsoft',
        'Admin fee harus dibayar meski kecil — siapkan metode pembayaran',
        'Keanggotaan harus diperbarui tiap tahun dengan dokumen terbaru',
      ],
    },
    not_eligible: [
      'Perusahaan for-profit',
      'Lembaga pemerintah',
      'Organisasi tanpa legalitas resmi',
    ],
  },

  // ============================================================
  // OPS & KOMUNIKASI
  // ============================================================

  {
    id: 'microsoft_nonprofit',
    name: 'Microsoft for Nonprofits',
    gateway: 'goodstack',
    priority: 3,
    category: ['ops', 'tech', 'ai'],
    pricing: {
      type: 'discount',
      label: 'DISKON 75% + CREDITS $2.000/tahun',
      detail: 'M365 Business Premium $5.50/user/month. Azure $2.000 credits/tahun, renewal manual.',
    },
    renewal: {
      type: 'manual',
      period: 'Tahunan',
      note: 'Azure grant HARUS direnew manual tiap tahun via Nonprofit Hub. Sisa credits tidak rollover. Sudah terbukti bisa dipakai 2+ tahun berturut-turut selama renewal dilakukan.',
    },
    description: 'Suite lengkap Microsoft untuk NGO — dari email, kolaborasi, cloud computing, hingga AI. Salah satu program paling valuable karena mencakup banyak kebutuhan sekaligus dalam satu ekosistem.',
    use_cases: [
      'Email domain resmi organisasi dengan Outlook',
      'Kolaborasi dokumen real-time dengan Teams dan SharePoint',
      'Cloud hosting website/aplikasi dengan Azure $2.000 credits/tahun',
      'Build custom app internal dengan Power Apps tanpa coding',
      'AI assistant untuk produktivitas dengan Microsoft Copilot',
    ],
    products: [
      {
        name: 'Microsoft 365 Business Premium',
        status: 'discount',
        discount_percent: 75,
        retail_price_usd: '$22/user/month',
        nonprofit_price_usd: '$5.50/user/month',
        description: 'Full Office apps, Teams, SharePoint, Intune, Defender',
        use_case_ngo: 'Setup lengkap: email domain, rapat video, storage cloud, keamanan device — semua dalam satu paket',
      },
      {
        name: 'Microsoft Azure Grant',
        status: 'credits',
        nonprofit_price_usd: '$2.000 credits/tahun',
        description: '$2.000 credits/tahun untuk semua layanan Azure first-party. Renewal manual tiap tahun.',
        use_case_ngo: 'Hosting aplikasi internal, database program, Azure OpenAI untuk chatbot, VM untuk server',
      },
      {
        name: 'Microsoft Power Apps',
        status: 'free',
        nonprofit_price_usd: 'Free 10 users, $2.50/user/month tambahan',
        description: 'Low-code app builder — 10 user pertama gratis',
        use_case_ngo: 'Buat form pendaftaran beneficiary, sistem monitoring internal, app laporan lapangan',
      },
      {
        name: 'Microsoft 365 Copilot',
        status: 'discount',
        discount_percent: 15,
        description: 'AI assistant terintegrasi di Word, Excel, Teams, Outlook',
        use_case_ngo: 'Draft laporan donor otomatis, ringkas meeting Teams, analisis data Excel dengan AI',
      },
      {
        name: 'Microsoft Dynamics 365',
        status: 'discount',
        description: 'CRM dan ERP enterprise untuk NGO besar',
        use_case_ngo: 'Donor management, volunteer tracking, grant management terintegrasi',
      },
    ],
    requirements: {
      documents: [
        'Akun Goodstack terverifikasi (wajib dulu)',
        'SK Kemenkumham',
        'Email domain organisasi',
      ],
      conditions: [
        'Sudah verified di Goodstack',
        'Bukan lembaga pemerintah atau for-profit',
      ],
    },
    registration: {
      url: 'https://www.microsoft.com/en-us/nonprofits',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Pastikan sudah verified di Goodstack terlebih dahulu',
        'Buka microsoft.com/nonprofits → Get started',
        'Login dengan akun Microsoft organisasi',
        'Verifikasi nonprofit status via Goodstack (otomatis)',
        'Untuk Azure: aktifkan di Nonprofit Hub → Offers → Azure $2.000 Sponsorship',
        'Pasang reminder 30 hari sebelum anniversary untuk renewal Azure',
      ],
      gotchas: [
        'Azure credits TIDAK rollover — sisa expired tiap tahun, tidak bisa dibawa ke tahun berikutnya',
        'Azure renewal MANUAL — wajib pasang reminder kalender, tidak ada auto-reminder yang reliable',
        'Credits hanya untuk Azure first-party services — tidak bisa untuk marketplace third-party',
        'Jika melebihi $2.000, otomatis kena charge pay-as-you-go — pantau usage di Azure Cost Management',
        'Kartu kredit tetap harus terdaftar meski tidak dicharge selama dalam limit $2.000',
      ],
    },
    not_eligible: [
      'Lembaga pemerintah',
      'Organisasi politik',
    ],
  },

  {
    id: 'google_nonprofits',
    name: 'Google for Nonprofits',
    gateway: 'goodstack',
    priority: 4,
    category: ['ops', 'marketing', 'tech'],
    pricing: {
      type: 'free',
      label: 'GRATIS + Google Ads Grant $10.000/bulan',
      detail: 'Google Workspace gratis. Google Ads Grant senilai $10.000/bulan untuk Search Ads.',
    },
    renewal: {
      type: 'auto',
      period: 'Tahunan',
      note: 'Perlu konfirmasi eligibility tahunan',
    },
    description: 'Program Google untuk NGO — email profesional gratis, cloud storage, dan Google Ads Grant senilai $10.000/bulan. Ads Grant adalah salah satu program paling high-ROI yang tersedia untuk NGO.',
    use_cases: [
      'Email domain @organisasi.or.id gratis untuk seluruh tim',
      'Iklan Google senilai $10.000/bulan untuk awareness dan volunteer recruitment',
      'Kolaborasi dokumen real-time dengan Google Docs, Sheets, Slides',
      'Storage dan sharing file dengan Google Drive',
      'Survey dan form dengan Google Forms',
    ],
    products: [
      {
        name: 'Google Workspace for Nonprofits',
        status: 'free',
        description: 'Gmail domain, Drive 30GB/user, Meet, Calendar, Docs, Sheets, Forms',
        use_case_ngo: 'Email resmi tim, rapat video, kolaborasi dokumen — semua dalam satu ekosistem Google',
      },
      {
        name: 'Google Ads Grant',
        status: 'free',
        nonprofit_price_usd: '$10.000/month in Search Ads',
        description: '$10.000/bulan untuk Google Search Ads',
        use_case_ngo: 'Target keyword misi organisasi: donasi, relawan, program — tingkatkan traffic website dan awareness',
      },
      {
        name: 'YouTube Nonprofit Program',
        status: 'free',
        description: 'Donation button di video, nonprofit cards',
        use_case_ngo: 'Tambah tombol donasi langsung di video program untuk fundraising',
      },
    ],
    requirements: {
      documents: [
        'Akun Goodstack terverifikasi',
        'Website aktif dengan konten program yang jelas dan berkualitas',
        'Email domain organisasi',
      ],
      conditions: [
        'Sudah verified di Goodstack',
        'Bukan lembaga pemerintah, rumah sakit, atau sekolah',
        'Website harus HTTPS dan punya konten substantif tentang program',
      ],
    },
    registration: {
      url: 'https://www.google.com/nonprofits',
      estimated_time: '1-2 minggu',
      steps: [
        'Pastikan sudah verified di Goodstack',
        'Buka google.com/nonprofits → Apply now',
        'Login dengan akun Google organisasi',
        'Verifikasi via Goodstack (otomatis jika sudah approved)',
        'Setup Google Workspace dengan domain organisasi',
        'Untuk Ads Grant: apply terpisah di google.com/grants setelah Workspace aktif',
      ],
      gotchas: [
        'Google Ads Grant tidak boleh untuk iklan produk/jasa berbayar',
        'Harus maintain CTR minimum 5% agar grant tidak disuspend',
        'Website harus punya SSL (https) untuk eligible Ads Grant',
        'Iklan hanya untuk keyword yang relevan dengan misi organisasi',
        'Ads Grant butuh management aktif — bukan set and forget',
      ],
    },
    not_eligible: [
      'Lembaga pemerintah',
      'Rumah sakit dan klinik',
      'Sekolah dan universitas',
      'Organisasi yang primary activity-nya menjual produk/jasa',
    ],
  },

  {
    id: 'zoom',
    name: 'Zoom for Nonprofits',
    gateway: 'both',
    priority: 7,
    category: ['ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON 50%',
      detail: 'Via Goodstack atau TechSoup',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Video conferencing untuk rapat tim, webinar donor, dan koordinasi tim lapangan dari jarak jauh.',
    use_cases: [
      'Rapat koordinasi tim lapangan mingguan',
      'Webinar untuk donor dan mitra',
      'Online training dan capacity building',
      'Focus group discussion dengan beneficiary di lokasi berbeda',
    ],
    products: [
      {
        name: 'Zoom Pro/Business',
        status: 'discount',
        discount_percent: 50,
        description: 'Video conferencing hingga 100-300 peserta',
        use_case_ngo: 'Rapat internal dan webinar eksternal dalam satu platform',
      },
    ],
    requirements: {
      documents: ['Verifikasi via Goodstack atau TechSoup'],
      conditions: ['Sudah verified di salah satu gateway'],
    },
    registration: {
      url: 'https://zoom.us/nonprofit',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Apply via Goodstack → Product Offers → Zoom, ATAU',
        'Via TechSoup catalog → Zoom for Nonprofits',
        'Ikuti instruksi aktivasi akun',
      ],
      gotchas: [
        'Pilih satu gateway saja — jangan double apply untuk produk yang sama',
        'Free tier Zoom (40 menit) mungkin sudah cukup untuk tim kecil sebelum upgrade',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // MARKETING & KONTEN
  // ============================================================

  {
    id: 'canva',
    name: 'Canva for Nonprofits',
    gateway: 'goodstack',
    priority: 5,
    category: ['marketing'],
    pricing: {
      type: 'free',
      label: 'GRATIS 100%',
      detail: 'Canva Pro penuh untuk 50 user',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Canva Pro gratis penuh untuk NGO — tools desain profesional tanpa perlu background designer. Salah satu yang paling mudah dan cepat di-apply.',
    use_cases: [
      'Brand kit organisasi: logo, warna, font konsisten di semua materi',
      'Content plan media sosial bulanan dalam satu workspace tim',
      'Impact report visual untuk donor',
      'Poster event dan kampanye penggalangan dana',
      'Presentasi proposal program untuk donor atau pemerintah',
      'Infografis data program untuk media sosial',
      'Newsletter digital untuk stakeholder',
    ],
    products: [
      {
        name: 'Canva Pro (full access, 50 users)',
        status: 'free',
        description: 'Semua fitur premium: Brand Kit, Magic AI tools, template premium, background remover, resize otomatis',
        use_case_ngo: '50 user bisa desain profesional tanpa background desain sama sekali',
      },
    ],
    requirements: {
      documents: [
        'Verifikasi Goodstack (paling mudah)',
        'SK Kemenkumham atau dokumen legalitas setara',
      ],
      conditions: [
        'Terdaftar sebagai yayasan/NGO/CSO aktif',
        'Tidak bergerak di bidang politik, pendidikan formal, atau pemerintahan',
      ],
    },
    registration: {
      url: 'https://www.canva.com/canva-for-nonprofits/',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Buka canva.com/canva-for-nonprofits → Apply now',
        'Login atau buat akun Canva dengan email domain organisasi',
        'Pilih verifikasi via Goodstack',
        'Goodstack otomatis verifikasi jika sudah approved sebelumnya',
        'Setelah approved, setup Brand Kit dengan logo, warna, font organisasi',
        'Invite anggota tim ke workspace',
      ],
      gotchas: [
        'Gunakan email domain organisasi, bukan Gmail pribadi',
        'Brand Kit hanya bisa di-setup oleh Admin akun',
        'Invite semua anggota tim ke satu workspace agar brand konsisten',
        'Approval bisa ditolak jika misi organisasi tidak jelas di website',
      ],
    },
    not_eligible: [
      'Lembaga pemerintah',
      'Sekolah dan universitas (ada Canva Education terpisah)',
      'Organisasi politik',
      'Perusahaan for-profit',
      'Grant-making foundations',
    ],
  },

  {
    id: 'adobe_express',
    name: 'Adobe Express',
    gateway: 'goodstack',
    priority: 8,
    category: ['marketing'],
    pricing: {
      type: 'free',
      label: 'GRATIS',
      detail: 'Adobe Express Premium via Goodstack',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Tools desain konten sosial media, flyer, dan video pendek dari ekosistem Adobe. Lebih simpel dari Adobe Creative Cloud, lebih terintegrasi dengan Adobe assets.',
    use_cases: [
      'Konten Instagram/TikTok dengan template siap pakai',
      'Edit video pendek untuk stories dan reels',
      'Desain flyer event dan poster kampanye',
      'Quick branding materials tanpa perlu Photoshop',
    ],
    products: [
      {
        name: 'Adobe Express Premium',
        status: 'free',
        description: 'Template premium, AI generative tools, brand kit, video editing basic',
        use_case_ngo: 'Komplemen atau alternatif Canva dari ekosistem Adobe',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → Adobe Express → Apply',
        'Ikuti instruksi aktivasi dengan Adobe ID organisasi',
      ],
      gotchas: [
        'Berbeda dengan Adobe Creative Cloud — Express lebih simpel',
        'Untuk Photoshop/Illustrator/Premiere penuh, apply Adobe CC via TechSoup',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'adobe_acrobat',
    name: 'Adobe Acrobat Pro',
    gateway: 'goodstack',
    priority: 9,
    category: ['legal', 'ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON 94%',
      detail: 'Via Goodstack — salah satu diskon terbesar di katalog',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'PDF editor profesional dengan e-signature. Untuk organisasi yang intensif handle dokumen: proposal, laporan, MOU, kontrak.',
    use_cases: [
      'Edit dan merge dokumen PDF proposal dan laporan donor',
      'E-signature untuk dokumen resmi',
      'Convert Word/Excel ke PDF dengan format terjaga',
      'Protect PDF dengan password untuk dokumen confidential',
      'Fill PDF forms dari donor atau pemerintah',
    ],
    products: [
      {
        name: 'Adobe Acrobat Pro',
        status: 'discount',
        discount_percent: 94,
        description: 'Full PDF editing, e-signature, form creation, OCR',
        use_case_ngo: 'Handle semua kebutuhan dokumen PDF profesional dalam satu tool',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → Adobe Acrobat Pro → Apply',
        'Ikuti instruksi aktivasi dengan Adobe ID',
      ],
      gotchas: [
        'Berbeda dengan Adobe Express — Acrobat Pro khusus untuk PDF management',
        'Foxit PDF Editor di TechSoup bisa jadi alternatif yang lebih murah',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'hootsuite',
    name: 'Hootsuite for Nonprofits',
    gateway: 'both',
    priority: 10,
    category: ['marketing'],
    pricing: {
      type: 'discount',
      label: 'DISKON 60%',
      detail: 'Via Goodstack atau TechSoup',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Social media management platform — jadwalkan konten, monitor engagement, dan analisis performa semua akun sosmed dalam satu dashboard.',
    use_cases: [
      'Jadwalkan posting Instagram, Facebook, Twitter/X, LinkedIn sekaligus',
      'Monitor mention dan komentar dari satu dashboard',
      'Analisis performa konten kampanye',
      'Kolaborasi tim konten dengan approval workflow',
    ],
    products: [
      {
        name: 'Hootsuite Professional/Team',
        status: 'discount',
        discount_percent: 60,
        description: 'Social media scheduling, monitoring, dan analytics untuk multiple accounts',
        use_case_ngo: 'Hemat waktu tim konten — 1 minggu posting bisa dijadwalkan dalam 1 jam',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack atau TechSoup'],
      conditions: ['Sudah verified di salah satu gateway'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Apply via Goodstack → Product Offers → Hootsuite, ATAU',
        'Via TechSoup catalog → Hootsuite for Nonprofits',
      ],
      gotchas: [
        'Trial 30 hari tersedia — manfaatkan untuk evaluasi sebelum commit',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'linkedin_nonprofits',
    name: 'LinkedIn for Nonprofits',
    gateway: 'goodstack',
    priority: 11,
    category: ['marketing', 'crm'],
    pricing: {
      type: 'discount',
      label: 'DISKON 75%',
      detail: 'LinkedIn Sales Navigator Core via Goodstack',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'LinkedIn Sales Navigator dengan diskon besar untuk cari donor, mitra korporat, dan kandidat staf profesional.',
    use_cases: [
      'Cari dan reach out ke potential donor korporat dan CSR manager',
      'Rekrut staf dan relawan profesional',
      'Bangun network dengan praktisi NGO dan donor internasional',
      'Riset lembaga donor sebelum apply grant',
    ],
    products: [
      {
        name: 'LinkedIn Sales Navigator Core',
        status: 'discount',
        discount_percent: 75,
        description: 'Advanced prospect search, InMail credits, lead tracking',
        use_case_ngo: 'Identifikasi dan hubungi CSR manager perusahaan untuk partnership dan donasi korporat',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → LinkedIn → Apply',
        'Connect dengan akun LinkedIn organisasi',
      ],
      gotchas: [
        'Sales Navigator berbeda dari LinkedIn Premium biasa — lebih powerful untuk prospecting',
        'Butuh orang yang dedicated untuk manage outreach agar efektif',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'constant_contact',
    name: 'Constant Contact',
    gateway: 'both',
    priority: 12,
    category: ['marketing'],
    pricing: {
      type: 'discount',
      label: 'DISKON 10-35%',
      detail: '10% monthly, 25% untuk 6-bulan prepay, 35% untuk annual prepay',
    },
    renewal: { type: 'auto', period: 'Sesuai paket', note: '' },
    description: 'Email marketing platform untuk newsletter donor, update program, dan outreach stakeholder.',
    use_cases: [
      'Newsletter donor bulanan dengan template profesional',
      'Automated email sequence untuk new donor onboarding',
      'Update program dan impact report ke mailing list',
      'Event invitation dan reminder ke stakeholder',
    ],
    products: [
      {
        name: 'Constant Contact Email Marketing',
        status: 'discount',
        discount_percent: 35,
        description: 'Email builder, list management, analytics, automation',
        use_case_ngo: 'Komunikasi rutin dengan donor dan stakeholder secara profesional',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack atau TechSoup'],
      conditions: ['Sudah verified di salah satu gateway'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Apply via Goodstack → Product Offers → Constant Contact, ATAU',
        'Via TechSoup catalog → Constant Contact',
      ],
      gotchas: [
        'Diskon terbesar (35%) hanya untuk annual prepay',
        'Mailchimp free tier bisa jadi alternatif untuk mailing list < 500 kontak',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // AI TOOLS
  // ============================================================

  {
    id: 'openai',
    name: 'OpenAI ChatGPT',
    gateway: 'goodstack',
    priority: 13,
    category: ['ai'],
    pricing: {
      type: 'discount',
      label: 'DISKON ~60% Team / DISKON 75% Enterprise',
      detail: 'ChatGPT Team: $8/user/month (retail $20). Enterprise: negosiasi langsung.',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'ChatGPT dari OpenAI untuk produktivitas harian tim NGO. Versi Team paling praktis untuk tim kecil-menengah.',
    use_cases: [
      'Brainstorm konten kampanye dan program',
      'Draft email fundraising dan donor communication',
      'Riset cepat untuk proposal program',
      'Translate dan adaptasi dokumen',
      'Buat FAQ dan materi komunikasi publik',
    ],
    products: [
      {
        name: 'ChatGPT Team',
        status: 'discount',
        discount_percent: 60,
        retail_price_usd: '$20/user/month',
        nonprofit_price_usd: '$8/user/month',
        description: 'GPT-4o akses penuh, workspace tim, no message limits',
        use_case_ngo: 'AI assistant untuk tim dengan akses penuh tanpa batasan pesan harian',
      },
      {
        name: 'ChatGPT Enterprise',
        status: 'discount',
        discount_percent: 75,
        description: 'Enterprise-grade dengan keamanan data lebih tinggi, negosiasi langsung',
        use_case_ngo: 'NGO besar dengan kebutuhan AI intensif dan standar keamanan data tinggi',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → OpenAI → Apply',
        'Ikuti instruksi aktivasi ChatGPT Team',
      ],
      gotchas: [
        'Tidak perlu keduanya untuk tim kecil — pilih satu dulu',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // PROJECT MANAGEMENT
  // ============================================================

  {
    id: 'asana',
    name: 'Asana for Nonprofits',
    gateway: 'both',
    priority: 14,
    category: ['project_mgmt'],
    pricing: {
      type: 'discount',
      label: 'DISKON 50%',
      detail: 'Via Goodstack (50% off) atau TechSoup (admin fee $0)',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Project management platform untuk koordinasi program NGO, tracking deadline, dan monitoring progress tim secara terstruktur.',
    use_cases: [
      'Tracking semua task tim per program dalam satu workspace',
      'Monitor deadline laporan donor dan milestone program',
      'Koordinasi tim lapangan dengan remote tim kantor',
      'Onboarding relawan baru dengan checklist terstruktur',
      'Timeline visual untuk perencanaan program',
    ],
    products: [
      {
        name: 'Asana Starter/Advanced',
        status: 'discount',
        discount_percent: 50,
        description: 'Project tracking, timeline, reporting, workflow automation',
        use_case_ngo: 'Ganti Excel tracking manual dengan sistem yang terintegrasi dan real-time',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack atau TechSoup'],
      conditions: ['Sudah verified di salah satu gateway'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Apply via Goodstack → Asana (50% off), ATAU',
        'Via TechSoup → Asana Starter/Advanced (admin fee $0)',
      ],
      gotchas: [
        'Asana free tier sudah cukup untuk tim < 15 orang',
        'Upgrade ke Starter/Advanced jika butuh timeline, reporting, dan automasi',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'monday',
    name: 'monday.com for Nonprofits',
    gateway: 'goodstack',
    priority: 15,
    category: ['project_mgmt'],
    pricing: {
      type: 'free',
      label: 'GRATIS 10 user + DISKON 70% tambahan',
      detail: '10 user pertama gratis, user tambahan diskon 70%',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Work management dengan visual board yang intuitif. Cocok untuk tim yang prefer pendekatan visual dalam tracking program.',
    use_cases: [
      'Visual board untuk semua program dalam satu tampilan',
      'Tracking budget per program dengan kolom kustom',
      'Automasi notifikasi deadline ke tim',
      'Progress update otomatis untuk laporan donor',
    ],
    products: [
      {
        name: 'monday.com Work OS',
        status: 'free',
        nonprofit_price_usd: 'Free 10 users, 70% off additional',
        description: '10 user gratis, user tambahan diskon 70%',
        use_case_ngo: 'Visual board untuk semua program — lebih intuitif dari spreadsheet untuk tim non-teknis',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '1-3 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → monday.com → Get started',
      ],
      gotchas: [
        '10 user gratis sudah cukup untuk sebagian besar NGO kecil-menengah',
        'Pilih monday.com ATAU Asana — tidak perlu keduanya',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'atlassian',
    name: 'Atlassian (Jira + Confluence + Trello)',
    gateway: 'goodstack',
    priority: 16,
    category: ['project_mgmt'],
    pricing: {
      type: 'discount',
      label: 'DISKON 75%',
      detail: 'Jira, Confluence, dan Trello via Goodstack',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Suite project management dari Atlassian — Trello untuk visual kanban board, Confluence untuk dokumentasi internal, Jira untuk tracking issue kompleks.',
    use_cases: [
      'Trello: kanban board sederhana untuk tim non-teknis',
      'Confluence: wiki internal untuk SOP, dokumentasi program, knowledge base',
      'Jira: issue tracking untuk NGO yang punya tim tech/IT',
    ],
    products: [
      {
        name: 'Trello Premium',
        status: 'discount',
        discount_percent: 75,
        description: 'Visual kanban board dengan automation dan dashboard',
        use_case_ngo: 'Board sederhana untuk tracking status proposal grant dan task tim',
      },
      {
        name: 'Confluence',
        status: 'discount',
        discount_percent: 75,
        description: 'Wiki dan dokumentasi internal organisasi',
        use_case_ngo: 'Simpan SOP, panduan program, dan knowledge base — sangat berguna saat ada pergantian staf',
      },
      {
        name: 'Jira',
        status: 'discount',
        discount_percent: 75,
        description: 'Issue tracking dan sprint management',
        use_case_ngo: 'Untuk NGO yang punya tim tech/developer internal',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack'],
      conditions: ['Sudah verified di Goodstack'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Login Goodstack → Product Offers → Atlassian → Apply',
      ],
      gotchas: [
        'Trello free tier sangat capable — apply diskon jika butuh fitur advanced',
        'Confluence sangat valuable untuk organisasi yang sering berganti staf',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // FINANCE & ACCOUNTING
  // ============================================================

  {
    id: 'sage',
    name: 'Sage Intacct',
    gateway: 'goodstack',
    priority: 17,
    category: ['finance'],
    pricing: {
      type: 'discount',
      label: 'DISKON 50%',
      detail: 'Cloud accounting enterprise via Goodstack',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Software akuntansi cloud untuk NGO yang butuh pelaporan keuangan akuntabel ke donor internasional. Lebih robust dari spreadsheet untuk organisasi dengan grant kompleks.',
    use_cases: [
      'Laporan donor kustom dan pelaporan multi-entitas',
      'Pelacakan dan manajemen dana hibah (grant tracking) secara akuntabel',
      'Otomatisasi proses keuangan harian dan konsolidasi laporan keuangan untuk audit',
    ],
    products: [
      {
        name: 'Sage Intacct for Nonprofits',
        status: 'discount',
        discount_percent: 50,
        description: 'Sistem manajemen keuangan cloud kelas enterprise dengan diskon nonprofit khusus',
        use_case_ngo: 'Pelaporan keuangan multi-entitas dan kepatuhan audit donor internasional',
      },
    ],
    requirements: {
      documents: [
        'Akun Goodstack terverifikasi',
        'Laporan keuangan terakhir (teraudit jika ada)',
        'Struktur bagan akun (chart of accounts) saat ini',
      ],
      conditions: [
        'Sudah terverifikasi di Goodstack',
        'Memiliki tim keuangan berdedikasi karena sistem berskala enterprise',
      ],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '2-4 minggu',
      steps: [
        'Login ke Goodstack → cari program Sage Intacct',
        'Ajukan minat dan dapatkan kode verifikasi khusus',
        'Hubungi representatif Sage untuk diskusi kebutuhan dan demo produk',
        'Lakukan kustomisasi dan implementasi sistem bersama tim teknis Sage',
      ],
      gotchas: [
        'Memerlukan biaya implementasi awal meskipun ada diskon subscription bulanan',
        'Sangat kompleks dan tidak direkomendasikan untuk NGO skala mikro tanpa staf keuangan berdedikasi',
      ],
    },
    not_eligible: [
      'Organisasi tanpa verifikasi Goodstack',
      'Pemerintah dan lembaga for-profit',
    ],
  },

  // ============================================================
  // STORAGE & FILE MANAGEMENT
  // ============================================================

  {
    id: 'box',
    name: 'Box for Nonprofits',
    gateway: 'both',
    priority: 18,
    category: ['storage', 'ops'],
    pricing: {
      type: 'free',
      label: 'GRATIS 10 lisensi + DISKON 50%',
      detail: '10 lisensi Box Starter gratis, diskon hingga 50% untuk plan Business via TechSoup',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Platform manajemen konten cloud kelas enterprise yang aman untuk kolaborasi dan penyimpanan file organisasi.',
    use_cases: [
      'Penyimpanan aman untuk dokumen legalitas dan data sensitif organisasi',
      'Kolaborasi dokumen internal dan eksternal secara real-time',
      'Manajemen konten terpusat dengan kontrol akses ketat',
    ],
    products: [
      {
        name: 'Box Starter (10 Users)',
        status: 'free',
        nonprofit_price_usd: '$0',
        description: 'Penyimpanan file cloud aman untuk 10 pengguna gratis',
        use_case_ngo: 'Penyimpanan terpusat dokumen operasional tim kecil',
      },
      {
        name: 'Box Business Plan',
        status: 'discount',
        discount_percent: 50,
        description: 'Penyimpanan unlimited dengan kontrol keamanan lanjutan',
        use_case_ngo: 'Kolaborasi file skala besar dengan enkripsi data sensitif',
      },
    ],
    requirements: {
      documents: ['Verifikasi Goodstack atau TechSoup'],
      conditions: ['Sudah terverifikasi di salah satu gateway'],
    },
    registration: {
      url: 'https://goodstack.org',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Apply via Goodstack atau bayar admin fee via TechSoup',
        'Ikuti instruksi email untuk aktivasi akun Box organisasi',
      ],
      gotchas: [
        'Pastikan memilih program Box Starter gratis jika hanya membutuhkan 10 user atau kurang',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'dropbox',
    name: 'Dropbox for Nonprofits',
    gateway: 'both',
    priority: 19,
    category: ['storage', 'ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON hingga 40%',
      detail: 'Diskon hingga 40% untuk langganan Standard/Advanced via TechSoup atau direct',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Penyimpanan cloud populer dan sinkronisasi file cepat untuk produktivitas tim harian.',
    use_cases: [
      'Sinkronisasi file cepat lintas perangkat untuk tim lapangan',
      'Berbagi foto dan video dokumentasi program dengan mudah',
      'Backup otomatis seluruh file komputer operasional',
    ],
    products: [
      {
        name: 'Dropbox Standard',
        status: 'discount',
        discount_percent: 40,
        description: 'Penyimpanan 5 TB dengan fitur kolaborasi standar',
        use_case_ngo: 'Sync foto dokumentasi lapangan dan backup dokumen program',
      },
      {
        name: 'Dropbox Advanced',
        status: 'discount',
        discount_percent: 40,
        description: 'Penyimpanan unlimited dengan kontrol admin lanjutan',
        use_case_ngo: 'Tim skala besar dengan kebutuhan penyimpanan data yang tidak terbatas',
      },
    ],
    requirements: {
      documents: ['Verifikasi TechSoup atau bukti status legalitas organisasi'],
      conditions: ['Sudah terverifikasi nonprofit'],
    },
    registration: {
      url: 'https://www.dropbox.com/nonprofit',
      estimated_time: '2-4 hari kerja',
      steps: [
        'Ajukan status nonprofit melalui halaman pendaftaran Dropbox',
        'Upload dokumen verifikasi legalitas organisasi',
        'Tunggu email konfirmasi dan instruksi pembayaran diskon',
      ],
      gotchas: [
        'Dropbox juga tersedia via TechSoup dengan biaya administrasi khusus',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // CYBERSECURITY
  // ============================================================

  {
    id: 'onepassword',
    name: '1Password for Nonprofits',
    gateway: 'direct',
    priority: 20,
    category: ['security', 'ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON 50%',
      detail: 'Diskon 50% untuk semua paket Teams dan Business directly dari 1Password',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Pengelola kata sandi (password manager) yang aman untuk seluruh tim organisasi, mencegah kebocoran kredensial akun sosial media, email, dan database.',
    use_cases: [
      'Penyimpanan aman kredensial akun media sosial organisasi bersama (e.g., Canva, Instagram)',
      'Berbagi password sensitif antar anggota tim dengan aman tanpa teks biasa',
      'Autentikasi dua faktor (2FA) terpusat untuk akun bersama',
    ],
    products: [
      {
        name: '1Password Teams / Business',
        status: 'discount',
        discount_percent: 50,
        description: 'Manajemen password enterprise dengan shared vault khusus tim',
        use_case_ngo: 'Ganti praktik berbagi password via WhatsApp dengan sistem shared vault terenkripsi',
      },
    ],
    requirements: {
      documents: [
        'SK Kemenkumham atau bukti status nonprofit',
        'Website organisasi aktif',
        'Email domain resmi organisasi',
      ],
      conditions: [
        'Berstatus organisasi nonprofit resmi',
      ],
    },
    registration: {
      url: 'https://1password.com/nonprofit',
      estimated_time: '2-4 hari kerja',
      steps: [
        'Daftar akun trial di 1Password Teams atau Business',
        'Kirim permohonan diskon nonprofit melalui form khusus di website 1Password',
        'Upload SK Kemenkumham dan dokumen pendukung',
        'Tunggu verifikasi tim 1Password untuk pengaktifan diskon 50%',
      ],
      gotchas: [
        'Gunakan shared vaults untuk membagi password tim secara aman daripada personal vaults',
      ],
    },
    not_eligible: [],
  },

  {
    id: 'okta',
    name: 'Okta for Nonprofits',
    gateway: 'direct',
    priority: 21,
    category: ['security', 'tech'],
    pricing: {
      type: 'free',
      label: 'GRATIS 25 user + DISKON 50%',
      detail: '25 lisensi Okta Workforce Identity gratis, diskon 50% untuk lisensi tambahan',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Sistem manajemen identitas dan akses (IAM) terdepan untuk Single Sign-On (SSO) dan Multi-Factor Authentication (MFA) yang aman.',
    use_cases: [
      'Amankan akses seluruh sistem internal organisasi dengan SSO satu pintu',
      'Wajibkan autentikasi dua faktor (MFA) untuk mencegah peretasan akun',
      'Manajemen pembuatan dan penghapusan akun otomatis saat ada staf baru/keluar',
    ],
    products: [
      {
        name: 'Okta Workforce Identity Cloud',
        status: 'free',
        nonprofit_price_usd: 'Free 25 users, 50% off additional',
        description: 'Sistem Single Sign-On (SSO) dan Multi-Factor Authentication (MFA) premium',
        use_case_ngo: 'Satu akun masuk untuk email, dashboard donor, asana, dan file storage secara aman',
      },
    ],
    requirements: {
      documents: [
        'Akun Goodstack terverifikasi',
        'Email domain organisasi resmi',
      ],
      conditions: [
        'Terverifikasi sebagai organisasi nonprofit',
      ],
    },
    registration: {
      url: 'https://www.okta.com/okta-for-good',
      estimated_time: '3-7 hari kerja',
      steps: [
        'Kunjungi portal Okta for Good dan ajukan permohonan',
        'Hubungkan atau verifikasi status organisasi via Goodstack',
        'Tunggu proses approval dan setup tenant Okta nonprofit khusus',
      ],
      gotchas: [
        'Membutuhkan administrator IT dengan pemahaman teknis dasar untuk setup SSO awal',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // EVENT MANAGEMENT
  // ============================================================

  {
    id: 'eventbrite',
    name: 'Eventbrite for Nonprofits',
    gateway: 'direct',
    priority: 22,
    category: ['event', 'ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON biaya transaksi',
      detail: 'Diskon biaya pemrosesan tiket untuk event nonprofit berbayar',
    },
    renewal: { type: 'auto', period: 'Tahunan', note: '' },
    description: 'Platform manajemen event dan penjualan tiket global untuk seminar, webinar, workshop, dan penggalangan dana.',
    use_cases: [
      'Pendaftaran tiket otomatis untuk webinar atau workshop publik',
      'Pengelolaan check-in peserta di lokasi event dengan aplikasi mobile',
      'Penjualan tiket event penggalangan dana (charity concert/seminar)',
    ],
    products: [
      {
        name: 'Eventbrite Professional Service',
        status: 'discount',
        description: 'Pembebasan biaya pendaftaran untuk tiket gratis, diskon biaya layanan untuk tiket berbayar',
        use_case_ngo: 'Registrasi otomatis ribuan peserta webinar nasional secara gratis tanpa biaya admin',
      },
    ],
    requirements: {
      documents: [
        'SK Kemenkumham atau dokumen legalitas setara',
        'Bukti status nonprofit resmi',
      ],
      conditions: [
        'Event mematuhi standar komunitas Eventbrite',
      ],
    },
    registration: {
      url: 'https://www.eventbrite.com',
      estimated_time: '2-5 hari kerja',
      steps: [
        'Buat organisasi/akun di Eventbrite',
        'Kirim tiket dukungan ke tim Eventbrite untuk mengajukan diskon nonprofit',
        'Lampirkan dokumen legalitas yayasan',
        'Tunggu konfirmasi penyesuaian biaya layanan akun',
      ],
      gotchas: [
        'Eventbrite selalu 100% gratis jika Anda hanya membuat tiket gratis (free events)',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // DATA & ANALYTICS
  // ============================================================

  {
    id: 'tableau',
    name: 'Tableau for Nonprofits',
    gateway: 'both',
    priority: 23,
    category: ['data', 'tech'],
    pricing: {
      type: 'discount',
      label: 'DISKON besar via TechSoup',
      detail: 'Lisensi Tableau Desktop Professional 2 tahun seharga $74 admin fee via TechSoup',
    },
    renewal: { type: 'manual', period: '2 Tahun', note: 'Harus mengajukan ulang lisensi baru via TechSoup setelah 2 tahun' },
    description: 'Software visualisasi data (business intelligence) terkuat untuk mengubah spreadsheet rumit menjadi grafik interaktif yang mudah dipahami.',
    use_cases: [
      'Visualisasi data kualitatif dan kuantitatif dampak program sosial',
      'Pembuatan dashboard interaktif untuk dipublikasikan di website organisasi',
      'Analisis database penerima manfaat program secara mendalam',
    ],
    products: [
      {
        name: 'Tableau Desktop Professional (2-year)',
        status: 'discount',
        nonprofit_price_usd: '$74 admin fee',
        description: 'Lisensi Tableau Desktop penuh selama 2 tahun',
        use_case_ngo: 'Membuat visualisasi grafik interaktif dampak program untuk laporan donor tahunan',
      },
    ],
    requirements: {
      documents: [
        'Verifikasi keanggotaan TechSoup Indonesia aktif',
      ],
      conditions: [
        'Hanya untuk organisasi yang terdaftar di TechSoup',
      ],
    },
    registration: {
      url: 'https://www.techsoupindonesia.or.id',
      estimated_time: '3-5 hari kerja',
      steps: [
        'Buka katalog TechSoup Indonesia dan cari Tableau',
        'Tambahkan ke keranjang belanja dan lakukan checkout',
        'Lakukan pembayaran biaya administrasi',
        'Tunggu kode aktivasi dikirimkan melalui email organisasi',
      ],
      gotchas: [
        'Lisensi berlaku selama 2 tahun penuh, setelah itu harus membeli ulang lisensi donor baru via TechSoup',
      ],
    },
    not_eligible: [],
  },

  // ============================================================
  // WEBSITE BUILDERS
  // ============================================================

  {
    id: 'wix',
    name: 'Wix for Nonprofits',
    gateway: 'techsoup',
    priority: 24,
    category: ['website', 'ops'],
    pricing: {
      type: 'discount',
      label: 'DISKON hingga 70%',
      detail: 'Akses diskon langganan Wix Premium 2 tahun via TechSoup dengan admin fee rendah',
    },
    renewal: { type: 'manual', period: '2 Tahun', note: 'Beli ulang kupon diskon via TechSoup sebelum masa aktif premium habis' },
    description: 'No-code website builder premium dengan drag-and-drop editor yang sangat mudah digunakan oleh tim non-teknis.',
    use_cases: [
      'Pembuatan website profil resmi organisasi secara cepat',
      'Setup landing page khusus kampanye program atau penerimaan donasi',
      'Integrasi formulir online dan newsletter dalam satu website',
    ],
    products: [
      {
        name: 'Wix Premium Core (2-year)',
        status: 'discount',
        nonprofit_price_usd: '$17 admin fee',
        description: 'Paket langganan premium Wix Core selama 2 tahun',
        use_case_ngo: 'Website portofolio program resmi organisasi dengan domain sendiri',
      },
      {
        name: 'Wix Premium Business (2-year)',
        status: 'discount',
        nonprofit_price_usd: '$25 admin fee',
        description: 'Paket langganan premium Wix Business dengan fitur ecommerce/donasi online',
        use_case_ngo: 'Website resmi dengan sistem donasi online dan toko penjualan merchandise',
      },
    ],
    requirements: {
      documents: ['Keanggotaan TechSoup Indonesia aktif'],
      conditions: ['Terdaftar di TechSoup'],
    },
    registration: {
      url: 'https://www.techsoupindonesia.or.id',
      estimated_time: '2-4 hari kerja',
      steps: [
        'Cari produk Wix di katalog TechSoup Indonesia',
        'Pilih plan Core atau Business sesuai kebutuhan lalu checkout',
        'Bayar admin fee ke TechSoup',
        'Terima kode kupon diskon Wix melalui email',
        'Terapkan kode kupon saat upgrade situs Wix Anda',
      ],
      gotchas: [
        'Kupon diskon memotong biaya langganan Wix secara signifikan saat checkout di portal Wix',
      ],
    },
    not_eligible: [],
  },
];
