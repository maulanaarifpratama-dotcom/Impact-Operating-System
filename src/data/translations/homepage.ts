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
      size?: "small" | "wide" | "full";
      variant?: "default" | "highlight" | "ai";
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
          description: "Ukur kesiapan digital organisasi dan petakan baseline profil secara sistematis.",
          modules: ["Readiness Scorecard", "Guided Onboarding"]
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
          description: "Catat capaian indikator dan simpan bukti pelaksanaan program langsung di cloud.",
          modules: ["MEAL Tracker", "OneDrive Evidence Sync", "Impact Library"]
        },
        {
          letter: "T",
          title: "Tracking & Monitoring",
          description: "Rencanakan indikator pemantauan, dashboard real-time, dan laporan bulanan otomatis.",
          modules: ["MEAL Planner", "Impact Dashboard", "Monthly Report"]
        },
        {
          letter: "H",
          title: "High-Impact Reporting",
          description: "Kalkulasikan nilai dampak sosial program dan buat draf laporan proposal otomatis dengan AI.",
          modules: ["SROI Calculator", "Monthly Impact Report", "AI Assist Writer"]
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
          desc: "Desain Logical Framework Approach (LFA Matrix) and Work Breakdown Structure (WBS) secara runut.",
          module: "LFA Builder & WBS Builder"
        },
        {
          title: "Susun Anggaran",
          desc: "Kalkulasi anggaran kegiatan yang terhubung langsung ke aktivitas WBS secara otomatis.",
          module: "Budget Calculator"
        },
        {
          title: "Pantau Capaian",
          desc: "Tentukan indikator keberhasilan program dan catat realisasi capaian dalam satu tab.",
          module: "MEAL Planner & Tracker"
        },
        {
          title: "Kelola Bukti",
          desc: "Simpan dokumentasi dan bukti pelaksanaan program langsung di cloud yang aman.",
          module: "OneDrive Sync & Library"
        },
        {
          title: "Hitung Dampak",
          desc: "Kuantifikasikan nilai dampak program sosial Anda menggunakan proxy moneter terverifikasi.",
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
          description: "Mulai perjalanan digitalisasi organisasi Anda dengan setup profil dan pemetaan aset terpadu.",
          cta: "Mulai Onboarding",
          href: "/onboarding",
          size: "small",
          variant: "default"
        },
        {
          title: "LFA Builder",
          description: "Desain matriks Logical Framework Approach yang komprehensif, menghubungkan tujuan, output, aktivitas, dan asumsi.",
          cta: "Buka LFA Builder",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "WBS Builder",
          description: "Pecah aktivitas program menjadi paket kerja (Work Breakdown Structure) yang jelas dan terstruktur.",
          cta: "Desain Aktivitas",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Budget Calculator",
          description: "Kalkulasi anggaran operasional dan aktivitas yang terhubung langsung dengan alur logis program.",
          cta: "Kalkulasi Anggaran",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "MEAL Planner",
          description: "Rumuskan indikator, baseline, target, dan metode pengumpulan data pemantauan program secara praktis.",
          cta: "Rencanakan MEAL",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "MEAL Tracker",
          description: "Catat dan telusuri realisasi capaian aktual indikator secara real-time, lengkap dengan catatan verifikasi.",
          cta: "Telusuri Capaian",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Kalkulator SROI Terintegrasi",
          description: "Hitung nilai Social Return on Investment (SROI) secara otomatis yang diimpor dari indikator MEAL & anggaran LFA.",
          cta: "Lihat SROI Terintegrasi",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "Kalkulator SROI Mandiri",
          description: "Hitung rasio SROI secara instan tanpa LFA dengan memasukkan data investasi dan manfaat sosial secara manual.",
          cta: "Gunakan SROI Mandiri",
          href: "/dashboard/sroi",
          size: "small",
          variant: "default"
        },
        {
          title: "Impact Library",
          description: "Ubah tumpukan dokumen lama, proposal lama, laporan, dan cerita sukses menjadi knowledge base AI.",
          cta: "Buka Library",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "OneDrive Evidence Sync",
          description: "Kelola bukti fisik dan dokumen pendukung dengan sinkronisasi otomatis ke folder cloud Microsoft OneDrive.",
          cta: "Kelola Bukti Dampak",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Gunakan asisten AI berbasis pengetahuan internal Anda sendiri untuk mempercepat penulisan draf proposal, laporan dampak, dan pembuatan salinan kampanye digital.",
          cta: "Buka AI Assist",
          href: "/dashboard/impactory-library",
          size: "full",
          variant: "ai"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Manajemen Bukti & AI Assist",
      heading: "Kepercayaan Lahir dari Bukti Fisik dan Keaslian Data",
      description: "Impactory tidak hanya membantu Anda merancang program, tapi juga memastikan kepatuhan akuntabilitas tingkat tinggi melalui manajemen bukti program yang teratur di mata donor nasional dan internasional.",
      cards: [
        {
          title: "Integrasi OneDrive",
          description: "Kaitkan tautan dokumen pendukung seperti kuesioner, foto kegiatan, dan absensi di OneDrive langsung di samping laporan capaian MEAL Anda."
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Gunakan asisten AI berbasis pengetahuan internal Anda sendiri untuk mempercepat penulisan draf proposal, laporan dampak, dan pembuatan salinan kampanye digital."
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
          description: "Assess digital readiness and map operational profiles systematically from the start.",
          modules: ["Readiness Scorecard", "Guided Onboarding"]
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
          description: "Log actual indicator accomplishments and secure physical evidence in the cloud.",
          modules: ["MEAL Tracker", "OneDrive Evidence Sync", "Impact Library"]
        },
        {
          letter: "T",
          title: "Tracking & Monitoring",
          description: "Formulate monitoring metrics, manage live dashboards, and compile monthly progress reports.",
          modules: ["MEAL Planner", "Impact Dashboard", "Monthly Report"]
        },
        {
          letter: "H",
          title: "High-Impact Reporting",
          description: "Quantify social return on investment and draft polished, AI-assisted reports.",
          modules: ["SROI Calculator", "Monthly Impact Report", "AI Assist Writer"]
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
          desc: "Design your Logical Framework Approach (LFA Matrix) and Work Breakdown Structure (WBS) step-by-step.",
          module: "LFA Builder & WBS Builder"
        },
        {
          title: "Budget",
          desc: "Calculate activity-based budgets dynamically linked to your WBS actions.",
          module: "Budget Calculator"
        },
        {
          title: "Track Outcomes",
          desc: "Define program success indicators and record actual tracking progress entries in one integrated tab.",
          module: "MEAL Planner & Tracker"
        },
        {
          title: "Organize Evidence",
          desc: "Store verification documentation and program files directly in secure cloud folders.",
          module: "OneDrive Sync & Library"
        },
        {
          title: "Calculate Impact",
          desc: "Quantify the social impact value of your program using verified monetary proxy values.",
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
          description: "Kickstart your digital transformation with automated profiling and resource mapping.",
          cta: "Start Onboarding",
          href: "/onboarding",
          size: "small",
          variant: "default"
        },
        {
          title: "LFA Builder",
          description: "Design standard Logical Framework Approach matrices connecting goals, outcomes, outputs, and assumptions.",
          cta: "Open LFA Builder",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "WBS Builder",
          description: "Deconstruct program activities into structured, clear, and executable Work Breakdown Structures.",
          cta: "Design Activities",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Budget Calculator",
          description: "Perform precise budget estimations that link directly to your WBS framework.",
          cta: "Calculate Budget",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "MEAL Planner",
          description: "Formulate metrics, baseline numbers, targets, and data collection plans logically.",
          cta: "Plan MEAL",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "MEAL Tracker",
          description: "Log and monitor real-time actual progress of indicator accomplishments with verification notes.",
          cta: "Track Outcomes",
          href: "/dashboard/lfa-builder",
          size: "small",
          variant: "default"
        },
        {
          title: "Integrated SROI Calculator",
          description: "Generate SROI ratios instantly utilizing data imported from MEAL targets and LFA budgets.",
          cta: "View Integrated SROI",
          href: "/dashboard/lfa-builder",
          size: "wide",
          variant: "highlight"
        },
        {
          title: "Standalone SROI Calculator",
          description: "Estimate SROI quickly without LFA configuration by typing investment and outcome metrics manually.",
          cta: "Use Standalone SROI",
          href: "/dashboard/sroi",
          size: "small",
          variant: "default"
        },
        {
          title: "Impact Library",
          description: "Turn piles of past files, previous proposals, and reports into a secure AI-powered search database.",
          cta: "Open Library",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "OneDrive Evidence Sync",
          description: "Manage physical evidence and reports with automated folder syncs to Microsoft OneDrive.",
          cta: "Manage Evidence",
          href: "/dashboard/impactory-library",
          size: "small",
          variant: "default"
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Leverage AI grounded on your private organizational history to speed up drafting proposals, reports, and copy.",
          cta: "Open AI Assist",
          href: "/dashboard/impactory-library",
          size: "full",
          variant: "ai"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Evidence & AI Assist",
      heading: "Trust is Built on Physical Evidence & Verifiable Data",
      description: "Impactory does not just help you design programs, it ensures high compliance and trust under national and global donor audits.",
      cards: [
        {
          title: "OneDrive Sync Integration",
          description: "Link evidence files (questionnaires, photos, sign-in sheets) from Microsoft OneDrive directly adjacent to your MEAL entries."
        },
        {
          title: "AI Assist (RAG & Copilot)",
          description: "Leverage AI grounded on your private organizational history to speed up drafting proposals, reports, and copy."
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
