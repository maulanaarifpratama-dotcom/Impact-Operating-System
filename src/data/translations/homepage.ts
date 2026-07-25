export interface HomepageTranslation {
  meta: {
    title: string;
    description: string;
  };
  navbar: {
    problem: string;
    growth: string;
    products: string;
    login: string;
    startScorecard: string;
  };
  hero: {
    badge: string;
    hackathonBadge: string;
    hackathonBadgeShort: string;
    headingText: string;
    headingHighlight: string;
    subheading: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustBadge: string;
    floatingStat1: string;
    floatingStat2: string;
    floatingStat3: string;
  };
  problem: {
    badge: string;
    heading: string;
    description: string;
    highlight: string;
  };
  growth: {
    badge: string;
    heading: string;
    subheading: string;
    cards: Array<{
      letter: string;
      title: string;
      description: string;
      modules: string[];
    }>;
  };
  workflow: {
    badge: string;
    heading: string;
    subheading: string;
    steps: Array<{
      title: string;
      desc: string;
      module: string;
    }>;
  };
  modules: {
    badge: string;
    heading: string;
    subheading: string;
    cards: Array<{
      title: string;
      description: string;
      cta: string;
      href?: string;
      disabled?: boolean;
      size?: "small" | "wide" | "hero" | "full";
      variant?: "default" | "highlight" | "hero" | "ai";
      badge?: string;
      badgeVariant?: "w" | "t" | "h";
    }>;
  };
  evidenceAndReporting: {
    badge: string;
    heading: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
    }>;
  };
  trust: {
    badge: string;
    heading: string;
    cards: Array<{
      title: string;
      description: string;
    }>;
  };
  timeline90: {
    badge: string;
    heading: string;
    cta: string;
    steps: Array<{
      day: string;
      phase: string;
    }>;
  };
  founder: {
    badge: string;
    heading: string;
    description: string;
  };
  finalCta: {
    heading: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  footer: {
    tagline: string;
    rights: string;
  };
}

export const homepageTranslations: Record<'id' | 'en', HomepageTranslation> = {
  id: {
    meta: {
      title: "Impactory.id — Platform AI untuk NGO, MEAL, SROI, dan Laporan Dampak",
      description: "Impactory.id membantu NGO merancang program, menyusun anggaran, memantau capaian MEAL, mengelola bukti, dan menghitung SROI dalam satu platform."
    },
    navbar: {
      problem: "Masalah",
      growth: "G.R.O.W.T.H.",
      products: "Produk",
      login: "Masuk",
      startScorecard: "Mulai Scorecard"
    },
    hero: {
      badge: "NGO Growth Operating System",
      hackathonBadge: "🏆 Top 101 dari 1.500+ Peserta — Google Cloud Gen AI Academy APAC Hackathon",
      hackathonBadgeShort: "Peringkat 68/101 Finalis — Gen AI APAC Hackathon",
      headingText: "Rancang Program & Hitung SROI.",
      headingHighlight: "Mudah & Terukur.",
      subheading: "Platform AI untuk merancang program, menyusun anggaran, memantau capaian, mengelola bukti, dan menghitung nilai dampak sosial NGO.",
      ctaPrimary: "Mulai buat program",
      ctaSecondary: "Lihat G.R.O.W.T.H. System",
      trustBadge: "Civic Resource Hub untuk CSO Akar Rumput, dibangun dari pengalaman 20B+ budget digital marketing di NGO.",
      floatingStat1: "72 Peluang Grant Aktif",
      floatingStat2: "SDG-Aligned Pipeline",
      floatingStat3: "AI Match: High Fit"
    },
    problem: {
      badge: "Masalah",
      heading: "NGO bukan miskin tools. NGO sering kali miskin sistem.",
      description: "Canva Pro sudah ada. Google Ads Grant sudah aktif. Workspace sudah dipakai. Tapi civil society resource access belum terpetakan, proposal masih mulai dari nol, donor masih tercecer, laporan impact dibuat saat diminta, dan campaign sering dimulai dari panik.",
      highlight: "Tools adalah bahan bakar. Sistem adalah mesin."
    },
    growth: {
      badge: "Framework",
      heading: "G.R.O.W.T.H. System",
      subheading: "Enam dimensi terstruktur untuk membangun operational excellence, akuntabilitas data, dan keberlanjutan dampak NGO.",
      cards: [
        {
          letter: "G",
          title: "Grant & Resource Access",
          description: "Temukan pendanaan baru dan buka akses sumber daya digital organisasi secara terpusat.",
          modules: ["Resource Access Tracker", "Grant Pipeline", "Grantwriter"]
        },
        {
          letter: "R",
          title: "Readiness & Baseline",
          description: "Ukur kesiapan digital organisasi, kelola hak akses tim, dan petakan baseline profil secara sistematis.",
          modules: ["Readiness Scorecard", "Guided Onboarding", "Google OAuth & Team RLS"]
        },
        {
          letter: "O",
          title: "Operating Program",
          description: "Rancang kerangka logis, aktivitas kerja, dan anggaran program secara presisi.",
          modules: ["LFA Builder", "WBS Builder", "Budget Calculator"]
        },
        {
          letter: "W",
          title: "Work Evidence & Proof",
          description: "Catat capaian indikator, simpan bukti pelaksanaan program langsung di cloud, dan kelola data penerima manfaat secara terstruktur.",
          modules: ["MEAL Tracker", "OneDrive Evidence Sync", "Impact Library", "Beneficiary Registry"]
        },
        {
          letter: "T",
          title: "Tracking & Monitoring",
          description: "Rencanakan indikator pemantauan, pantau capaian program secara real-time melalui dashboard, dan hasilkan laporan berkala tanpa rekap manual.",
          modules: ["MEAL Planner", "Impact Dashboard", "Monthly Report", "Operating Review"]
        },
        {
          letter: "H",
          title: "High-Impact Reporting",
          description: "Kalkulasikan nilai dampak sosial dan lingkungan program, hasilkan executive summary dan insight dashboard, serta draf proposal berbasis data dengan AI.",
          modules: ["SROI Calculator", "E-ROI Carbon", "Monthly Impact Report", "AI Assist Writer"]
        }
      ]
    },
    workflow: {
      badge: "Alur Kerja Utama",
      heading: "Satu Alur Kerja Terintegrasi dari Hulu ke Hilir",
      subheading: "Kelola seluruh program NGO Anda dengan standar internasional dalam 6 langkah mudah.",
      steps: [
        {
          title: "Rancang Program",
          desc: "Desain Logical Framework Approach (LFA Matrix) dan Work Breakdown Structure (WBS) sesuai hierarki vertikal NORAD & EuropeAid.",
          module: "LFA Builder & WBS Builder"
        },
        {
          title: "Susun Anggaran",
          desc: "Kalkulasi anggaran kegiatan terintegrasi langsung dengan aktivitas WBS dan referensi SBM 2026 secara otomatis.",
          module: "Budget Calculator"
        },
        {
          title: "Pantau Capaian",
          desc: "Tentukan indikator keberhasilan program sesuai standar MEAL DPro dan catat realisasi capaian dalam satu tab.",
          module: "MEAL Planner & Tracker"
        },
        {
          title: "Kelola Bukti",
          desc: "Simpan dokumentasi dan bukti pelaksanaan program langsung di cloud yang aman.",
          module: "OneDrive Sync & Library"
        },
        {
          title: "Hitung Dampak",
          desc: "Kuantifikasikan nilai dampak program sosial Anda menggunakan 4 adjustment standar Social Value International (SVI).",
          module: "SROI Calculator"
        },
        {
          title: "Siapkan Laporan",
          desc: "Kompilasikan semua data capaian, anggaran, dan bukti dampak menjadi draf proposal & laporan matang.",
          module: "AI Assist Writer"
        }
      ]
    },
    modules: {
      badge: "Modul Kerja Terintegrasi",
      heading: "Modul Lengkap untuk NGO Indonesia Modern",
      subheading: "Solusi end-to-end yang dirancang khusus untuk memperkuat kapasitas organisasi masyarakat sipil di Indonesia.",
      cards: [
        {
          title: "Guided Onboarding",
          description: "Mulai perjalanan digitalisasi organisasi dengan setup profil dan pemetaan aset terpadu sesuai standar G.R.O.W.T.H.",
          cta: "Mulai Onboarding",
          href: "/onboarding",
          size: "small",
          variant: "default"
        },
        {
          title: "LFA Builder",
          description: "Desain matriks Logical Framework Approach komprehensif berbasis norma NORAD & EuropeAid, menghubungkan tujuan, output, aktivitas, dan asumsi program secara terstruktur.",
          cta: "Buka LFA Builder",
          href: "/dashboard/lfa-builder",
          size: "hero",
          variant: "hero"
        },
        {
          title: "WBS Builder",
          description: "Pecah aktivitas program menjadi paket kerja terstruktur dengan Gantt chart otomatis, estimasi durasi AI, dan sinkronisasi anggaran.",
          cta: "Desain Aktivitas",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Budget Calculator",
          description: "Kalkulasi anggaran operasional & kegiatan dengan auto-populate langsung dari WBS, referensi SBM 2026, dan deteksi otomatis deviasi anggaran (variance flag).",
          cta: "Kalkulasi Anggaran",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "MEAL Planner",
          description: "Rumuskan indikator, baseline, target, dan metode pengumpulan data pemantauan program sesuai kerangka kerja MEAL DPro secara terstandar.",
          cta: "Rencanakan MEAL",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "MEAL Tracker",
          description: "Catat dan telusuri capaian aktual indikator secara real-time, lengkap dengan catatan verifikasi dan bukti lapangan.",
          cta: "Telusuri Capaian",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "LFA Builder (SROI Terintegrasi)",
          description: "Hitung nilai Social Return on Investment secara otomatis dari indikator MEAL DPro dan anggaran LFA yang tersimpan, lengkap dengan 4 adjustment standar SVI.",
          cta: "Lihat SROI Terintegrasi",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "SROI Calculator Standalone",
          description: "Hitung rasio SROI dengan 4 penyesuaian SVI (attribution, deadweight, displacement, drop-off), analisis sensitivitas 3 skenario, breakdown stakeholder group, dan ekspor laporan PDF siap donor.",
          cta: "Gunakan SROI Mandiri",
          href: "/dashboard/sroi",
          size: "small",
          variant: "default"
        },
        {
          title: "Impact Library",
          description: "Ubah dokumen, proposal, dan laporan lama menjadi knowledge base AI yang dapat digunakan kembali untuk insight dan penulisan otomatis.",
          cta: "Buka Library",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "OneDrive Evidence Sync",
          description: "Sinkronisasi bukti kegiatan secara otomatis ke folder cloud Microsoft OneDrive untuk menjaga transparansi dan akuntabilitas data program.",
          cta: "Kelola Bukti Dampak",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Gunakan AI berbasis knowledge internal organisasi untuk menghasilkan executive summary dampak, insight dari dashboard, proposal, laporan, dan materi kampanye secara cepat dan konsisten.",
          cta: "Buka AI Assist",
          href: "/dashboard/impactory-library",
          size: "full",
          variant: "ai"
        },
        {
          title: "Impact Dashboard",
          description: "Transparansi capaian program, statistik donasi, serta Program Health Summary 3 dimensi (implementasi, keuangan, hasil) dengan deteksi otomatis variance progress WBS vs realisasi anggaran.",
          cta: "Buka Dashboard",
          href: "/dashboard/impact",
          size: "small",
          variant: "default"
        },
        {
          title: "Monthly Impact Report",
          description: "Kompilasikan laporan dampak bulanan sebagai proof system yang terverifikasi untuk donor dan funder secara otomatis.",
          cta: "Buat Laporan",
          href: "/dashboard/monthly-report",
          size: "small",
          variant: "default"
        },
        {
          title: "Beneficiary Registry",
          description: "Database penerima manfaat per program dengan mode sederhana dan profesional. Rekam data demografis, kelompok rentan, dan consent PDP. Export CSV/PDF siap untuk pelaporan donor.",
          cta: "Buka Registry",
          href: "/dashboard/beneficiary",
          size: "small",
          variant: "default",
          badge: "Work Evidence",
          badgeVariant: "w"
        },
        {
          title: "E-ROI Carbon Tracker",
          description: "Ukur dan laporkan dampak lingkungan program dengan breakdown Scope 1, Scope 2, dan Scope 3 sesuai GHG Protocol, menggunakan faktor emisi terverifikasi IPCC 2019 dan PLN Indonesia 2023. Terintegrasi ke SROI dan Grant Writer.",
          cta: "Buka E-ROI",
          href: "/dashboard/eroi",
          size: "small",
          variant: "default",
          badge: "High-Impact",
          badgeVariant: "h"
        },
        {
          title: "Monthly Operating Review",
          description: "Review bulanan kinerja program, capaian indikator MEAL, dan dokumentasi keputusan adaptif berbasis data lapangan. Fondasi akuntabilitas internal organisasi.",
          cta: "Buka Review",
          href: "/dashboard/operating-review",
          size: "small",
          variant: "default",
          badge: "Tracking",
          badgeVariant: "t"
        },
        {
          title: "Keamanan & Kolaborasi Tim",
          description: "Sign-in instan dengan Google OAuth, kelola peran organisasi (Owner, Admin, Member), dan undang tim secara aman melalui token link unik terproteksi Row Level Security (RLS).",
          cta: "Kelola Akses Tim",
          href: "/dashboard/settings",
          size: "small",
          variant: "default",
          badge: "Keamanan",
          badgeVariant: "w"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Manajemen Bukti & Standardisasi Internasional",
      heading: "Kepercayaan Lahir dari Bukti Fisik dan Keaslian Data",
      description: "Impactory tidak hanya membantu Anda merancang program, tetapi juga memastikan kepatuhan akuntabilitas tingkat tinggi yang selaras dengan standar internasional: Social Value International (SROI), GHG Protocol (E-ROI Scope 1/2/3), MEAL DPro, dan logika vertikal NORAD/EuropeAid.",
      cards: [
        {
          title: "Integrasi OneDrive",
          description: "Kaitkan tautan dokumen pendukung seperti kuesioner, foto kegiatan, dan absensi di OneDrive langsung di samping laporan capaian MEAL Anda."
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Gunakan asisten AI berbasis pengetahuan internal Anda sendiri untuk mempercepat penulisan draf proposal, laporan dampak, dan pembuatan salinan kampanye digital."
        },
        {
          title: "Selaras Standar Internasional",
          description: "Kalkulasi dan kerangka kerja dirancang selaras dengan Social Value International (SROI 4-adjustment), GHG Protocol (E-ROI Scope 1/2/3), MEAL DPro, dan logika hirarkis NORAD/EuropeAid."
        }
      ]
    },
    trust: {
      badge: "Asas Kepercayaan",
      heading: "Safe AI mempercepat draf. Manusia memastikan akurasi.",
      cards: [
        {
          title: "Human Review Required",
          description: "Proposal, data grant, klaim impact, dan cerita penerima manfaat wajib direview manusia."
        },
        {
          title: "No Fabrication",
          description: "Impactory tidak boleh mengarang deadline, eligibility, funding amount, atau angka impact."
        },
        {
          title: "Document Trust",
          description: "Dokumen NGO sering berisi data sensitif dan harus dikelola dengan izin serta akses terbatas."
        },
        {
          title: "Confidence over Conviction",
          description: "Rekomendasi harus menunjukkan tingkat keyakinan, bukan berpura-pura pasti."
        }
      ]
    },
    timeline90: {
      badge: "90-Day Plan",
      heading: "Bangun sistem NGO, CSO, dan komunitas akar rumput Anda dalam 90 hari.",
      cta: "Mulai dari Readiness Scorecard",
      steps: [
        { day: "Hari 1–15", phase: "Foundation Audit" },
        { day: "Hari 16–30", phase: "Platform Registration" },
        { day: "Hari 31–45", phase: "Tools Activation" },
        { day: "Hari 46–60", phase: "Campaign System" },
        { day: "Hari 61–75", phase: "Grant System" },
        { day: "Hari 76–90", phase: "Dashboard & Scale" }
      ]
    },
    founder: {
      badge: "Inisiatif Operator",
      heading: "Dibangun dari pengalaman operator.",
      description: "Impactory.id dikembangkan sebagai inisiatif civic technology oleh Yayasan Rumah Pembangunan Berkelanjutan untuk memperkuat akses sumber daya, dokumentasi dampak, dan kapasitas kerja organisasi masyarakat sipil di Indonesia. Pengembangan awalnya didukung oleh pengalaman operator dari Immersia Konsultan Impact dalam mengelola 20B+ budget digital marketing lintas NGO, social impact, education, campaign growth, dan sistem kerja digital untuk organisasi sosial."
    },
    finalCta: {
      heading: "Mulai dari baseline. Bangun sistemnya.",
      description: "Gunakan Readiness Scorecard sebagai titik awal, lalu rapikan Grant Pipeline, library, proposal workflow, campaign, impact documentation, dan laporan dampak untuk organisasi sosial.",
      ctaPrimary: "Mulai Readiness Scorecard",
      ctaSecondary: "Lihat Grant Pipeline"
    },
    footer: {
      tagline: "NGO Growth Operating System & Civic Technology Resource Hub.",
      rights: "Semua Hak Dilindungi."
    }
  },
  en: {
    meta: {
      title: "Impactory.id — AI Platform for NGOs, MEAL, SROI, and Impact Reporting",
      description: "Impactory.id helps NGOs design programs, manage budgets, track MEAL outcomes, organize evidence, and calculate SROI in one platform."
    },
    navbar: {
      problem: "Problem",
      growth: "G.R.O.W.T.H.",
      products: "Products",
      login: "Login",
      startScorecard: "Start Scorecard"
    },
    hero: {
      badge: "NGO Growth Operating System",
      hackathonBadge: "🏆 Top 101 of 1,500+ Participants — Google Cloud Gen AI Academy APAC Hackathon",
      hackathonBadgeShort: "Ranked 68/101 Finalist — Gen AI APAC Hackathon",
      headingText: "Design Programs & Measure SROI.",
      headingHighlight: "Seamless & Scalable.",
      subheading: "An AI-powered platform for NGOs to design programs, manage budgets, track outcomes, organize evidence, and calculate social impact value.",
      ctaPrimary: "Start a program",
      ctaSecondary: "Explore G.R.O.W.T.H. System",
      trustBadge: "Civic Resource Hub for Grassroots CSOs, built from 20B+ digital marketing budget experience in NGOs.",
      floatingStat1: "72 Active Grant Opportunities",
      floatingStat2: "SDG-Aligned Pipeline",
      floatingStat3: "AI Match: High Fit"
    },
    problem: {
      badge: "Problem",
      heading: "NGOs are not short of tools. They are short of systems.",
      description: "Canva Pro is set. Google Ads Grant is active. Workspaces are used. But civil society resource access remains unmapped, proposals start from scratch, donors are scattered, impact reports are compiled only on demand, and campaigns start out of panic.",
      highlight: "Tools are the fuel. System is the engine."
    },
    growth: {
      badge: "Framework",
      heading: "G.R.O.W.T.H. System",
      subheading: "Six structured dimensions to construct operational excellence, data accountability, and impact sustainability for NGOs.",
      cards: [
        {
          letter: "G",
          title: "Grant & Resource Access",
          description: "Discover new funding avenues and unlock digital resources centrally for your organization.",
          modules: ["Resource Access Tracker", "Grant Pipeline", "Grantwriter"]
        },
        {
          letter: "R",
          title: "Readiness & Baseline",
          description: "Assess digital readiness, manage team access permissions, and map operational profiles systematically.",
          modules: ["Readiness Scorecard", "Guided Onboarding", "Google OAuth & Team RLS"]
        },
        {
          letter: "O",
          title: "Operating Program",
          description: "Design standard logical frameworks, break down activities, and estimate budgets precisely.",
          modules: ["LFA Builder", "WBS Builder", "Budget Calculator"]
        },
        {
          letter: "W",
          title: "Work Evidence & Proof",
          description: "Log indicator accomplishments, store program evidence directly in the cloud, and manage beneficiary data in a structured manner.",
          modules: ["MEAL Tracker", "OneDrive Evidence Sync", "Impact Library", "Beneficiary Registry"]
        },
        {
          letter: "T",
          title: "Tracking & Monitoring",
          description: "Plan monitoring indicators, track program progress in real-time through the dashboard, and generate periodic reports without manual compiling.",
          modules: ["MEAL Planner", "Impact Dashboard", "Monthly Report", "Operating Review"]
        },
        {
          letter: "H",
          title: "High-Impact Reporting",
          description: "Calculate social and environmental impacts, generate executive summaries and dashboard insights, and draft data-driven proposals with AI.",
          modules: ["SROI Calculator", "E-ROI Carbon", "Monthly Impact Report", "AI Assist Writer"]
        }
      ]
    },
    workflow: {
      badge: "Core Workflow",
      heading: "One Integrated End-to-End Workflow",
      subheading: "Manage your entire NGO program with international standards in 6 simple steps.",
      steps: [
        {
          title: "Design Programs",
          desc: "Design your Logical Framework Approach (LFA Matrix) and Work Breakdown Structure (WBS) aligned with NORAD & EuropeAid hierarchy.",
          module: "LFA Builder & WBS Builder"
        },
        {
          title: "Budget",
          desc: "Calculate activity-based budgets dynamically linked to your WBS actions and SBM 2026 references.",
          module: "Budget Calculator"
        },
        {
          title: "Track Outcomes",
          desc: "Define program success indicators following MEAL DPro standards and record progress entries in one integrated tab.",
          module: "MEAL Planner & Tracker"
        },
        {
          title: "Organize Evidence",
          desc: "Store verification documentation and program files directly in secure cloud folders.",
          module: "OneDrive Sync & Library"
        },
        {
          title: "Calculate Impact",
          desc: "Quantify the social impact value of your program using Social Value International (SVI) 4-adjustment standards.",
          module: "SROI Calculator"
        },
        {
          title: "Prepare Reports",
          desc: "Compile outcomes, budgets, and evidence data into polished drafts of proposals & reports.",
          module: "AI Assist Writer"
        }
      ]
    },
    modules: {
      badge: "Integrated Modules",
      heading: "Full-Suite Modules for Modern NGOs",
      subheading: "An end-to-end solution custom-designed to strengthen civil society capacity.",
      cards: [
        {
          title: "Guided Onboarding",
          description: "Begin your organization's digitalization journey with unified profile setup and asset mapping aligned with G.R.O.W.T.H. standards.",
          cta: "Start Onboarding",
          href: "/onboarding",
          size: "small",
          variant: "default"
        },
        {
          title: "LFA Builder",
          description: "Design a comprehensive Logical Framework Approach matrix based on NORAD & EuropeAid norms, connecting objectives, outputs, activities, and assumptions.",
          cta: "Open LFA Builder",
          href: "/dashboard/lfa-builder",
          size: "hero",
          variant: "hero"
        },
        {
          title: "WBS Builder",
          description: "Deconstruct program activities into structured work packages with automated Gantt charts, AI duration estimation, and budget sync.",
          cta: "Design Activities",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Budget Calculator",
          description: "Calculate operational & activity budgets auto-populated from WBS, SBM 2026 references, and automated budget variance flags.",
          cta: "Calculate Budget",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "MEAL Planner",
          description: "Formulate monitoring indicators, baselines, targets, and data collection methods standardized to the MEAL DPro framework.",
          cta: "Plan MEAL",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "MEAL Tracker",
          description: "Record and track real-time actual progress of indicators, complete with verification notes and field evidence.",
          cta: "Track Outcomes",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Integrated SROI Calculator",
          description: "Calculate Social Return on Investment values automatically from MEAL DPro indicators and LFA budgets, complete with 4 SVI standard adjustments.",
          cta: "View Integrated SROI",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "Standalone SROI Calculator",
          description: "Calculate SROI ratios with 4 SVI adjustments (attribution, deadweight, displacement, drop-off), 3-scenario sensitivity analysis, stakeholder group breakdown, and donor-ready PDF exports.",
          cta: "Use Standalone SROI",
          href: "/dashboard/sroi",
          size: "small",
          variant: "default"
        },
        {
          title: "Impact Library",
          description: "Turn old documents, proposals, and reports into an AI knowledge base reusable for insights and automated writing.",
          cta: "Open Library",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "OneDrive Evidence Sync",
          description: "Synchronize activity evidence automatically to Microsoft OneDrive cloud folders to maintain transparency and accountability of program data.",
          cta: "Manage Evidence",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Use AI based on private organizational knowledge to quickly and consistently generate impact executive summaries, dashboard insights, proposals, reports, and campaign copy.",
          cta: "Open AI Assist",
          href: "/dashboard/impactory-library",
          size: "full",
          variant: "ai"
        },
        {
          title: "Impact Dashboard",
          description: "Display program achievements, donation statistics, and 3-lens Program Health Summary (implementation, financial, outcomes) with automatic WBS progress vs budget variance flags.",
          cta: "Open Dashboard",
          href: "/dashboard/impact",
          size: "small",
          variant: "default"
        },
        {
          title: "Monthly Impact Report",
          description: "Compile monthly impact reports as a verified proof system for donors and funders automatically.",
          cta: "Create Report",
          href: "/dashboard/monthly-report",
          size: "small",
          variant: "default"
        },
        {
          title: "Beneficiary Registry",
          description: "Database of beneficiaries per program with simple and professional modes. Record demographic data, vulnerable groups, and PDP consent. Export CSV/PDF ready for donor reporting.",
          cta: "Open Registry",
          href: "/dashboard/beneficiary",
          size: "small",
          variant: "default",
          badge: "Work Evidence",
          badgeVariant: "w"
        },
        {
          title: "E-ROI Carbon Tracker",
          description: "Measure and report program environmental impact with Scope 1, 2, and 3 breakdowns according to GHG Protocol, utilizing IPCC 2019 and PLN Indonesia 2023 emission factors. Integrated into SROI and Grant Writer.",
          cta: "Open E-ROI",
          href: "/dashboard/eroi",
          size: "small",
          variant: "default",
          badge: "High-Impact",
          badgeVariant: "h"
        },
        {
          title: "Monthly Operating Review",
          description: "Monthly review of program performance, MEAL indicator achievements, and documentation of adaptive decisions based on field data. Foundation of internal organizational accountability.",
          cta: "Open Review",
          href: "/dashboard/operating-review",
          size: "small",
          variant: "default",
          badge: "Tracking",
          badgeVariant: "t"
        },
        {
          title: "Team Collaboration & Security",
          description: "Instant sign-in with Google OAuth, manage org roles (Owner, Admin, Member), and invite team members via secure token links protected by Row Level Security (RLS).",
          cta: "Manage Team Access",
          href: "/dashboard/settings",
          size: "small",
          variant: "default",
          badge: "Security",
          badgeVariant: "w"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Evidence & International Standards",
      heading: "Trust is Built on Physical Evidence & Verifiable Data",
      description: "Impactory does not just help you design programs; it ensures high-level accountability aligned with international standards: Social Value International (SROI), GHG Protocol (E-ROI Scope 1/2/3), MEAL DPro, and NORAD/EuropeAid vertical logic.",
      cards: [
        {
          title: "OneDrive Sync Integration",
          description: "Link evidence files (questionnaires, photos, sign-in sheets) from Microsoft OneDrive directly adjacent to your MEAL entries."
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Leverage AI grounded on your private organizational history to speed up drafting proposals, reports, and copy."
        },
        {
          title: "International Standards Alignment",
          description: "Calculations and frameworks designed in alignment with Social Value International (SROI 4-adjustment), GHG Protocol (E-ROI Scope 1/2/3), MEAL DPro, and NORAD/EuropeAid vertical logic."
        }
      ]
    },
    trust: {
      badge: "Trust Doctrine",
      heading: "Safe AI accelerates drafts. Humans ensure absolute accuracy.",
      cards: [
        {
          title: "Human Review Required",
          description: "Proposals, grant lists, impact claims, and case stories must be verified by human eyes."
        },
        {
          title: "No Fabrication",
          description: "Impactory is designed strictly to avoid inventing deadlines, eligibility requirements, or impact numbers."
        },
        {
          title: "Document Trust",
          description: "NGO documents often house sensitive information and are protected under strict permission parameters."
        },
        {
          title: "Confidence over Conviction",
          description: "AI guidance highlights rating margins and confidence index scores instead of pretending to be absolute."
        }
      ]
    },
    timeline90: {
      badge: "90-Day Plan",
      heading: "Construct your complete digital NGO operations workflow inside 90 days.",
      cta: "Start from Readiness Scorecard",
      steps: [
        { day: "Day 1–15", phase: "Foundation Audit" },
        { day: "Day 16–30", phase: "Platform Registration" },
        { day: "Day 31–45", phase: "Tools Activation" },
        { day: "Day 46–60", phase: "Campaign System" },
        { day: "Day 61–75", phase: "Grant System" },
        { day: "Day 76–90", phase: "Dashboard & Scale" }
      ]
    },
    founder: {
      badge: "Operator Initiative",
      heading: "Built from operators' real experiences.",
      description: "Impactory.id was built as a civic technology project by Yayasan Rumah Pembangunan Berkelanjutan to strengthen resource access, documentation, and digital capacity across civil society in Indonesia. Its development is backed by operators from Immersia Impact Consultants, bringing experience managing 20B+ digital marketing budgets across NGOs, education, and digital work structures."
    },
    finalCta: {
      heading: "Start from baseline. Scale your systems.",
      description: "Take the Readiness Scorecard as a start, then structure your Grant Pipeline, library, proposal flows, and impact reporting pipelines.",
      ctaPrimary: "Start Readiness Scorecard",
      ctaSecondary: "View Grant Pipeline"
    },
    footer: {
      tagline: "NGO Growth Operating System & Civic Technology Resource Hub.",
      rights: "All Rights Reserved."
    }
  }
};
