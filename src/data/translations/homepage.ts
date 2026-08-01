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
      badgeVariant?: "w" | "t" | "h" | "a";
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
      title: "Impactory.id — Platform Integrasi Siklus Program NGO, MEAL V2, SROI & ESG",
      description: "Impactory.id mengelola seluruh siklus program NGO: Proposal → LFA → WBS Control Center → Budget → MEAL V2 → SROI V2 → ESG / E-ROI → Donor-ready Reporting."
    },
    navbar: {
      problem: "Masalah",
      growth: "G.R.O.W.T.H.",
      products: "Produk",
      login: "Masuk",
      startScorecard: "Mulai Scorecard"
    },
    hero: {
      badge: "Integrated Program Lifecycle System",
      hackathonBadge: "🏆 Top 101 dari 1.500+ Peserta — Google Cloud Gen AI Academy APAC Hackathon",
      hackathonBadgeShort: "Peringkat 68/101 Finalis — Gen AI APAC Hackathon",
      headingText: "Kelola Seluruh Siklus Program &",
      headingHighlight: "Valuasi Dampak Berbasis Bukti.",
      subheading: "Platform ekosistem terpadu NGO: Proposal → LFA → WBS Control Center → Budget → MEAL V2 → SROI V2 → ESG / E-ROI → Donor-ready Reporting.",
      ctaPrimary: "Mulai Buat Program",
      ctaSecondary: "Lihat G.R.O.W.T.H. System",
      trustBadge: "Civic Resource Hub untuk CSO Akar Rumput & NGO, dilengkapi Workflow Kepemilikan, Persetujuan, dan Bukti Terverifikasi.",
      floatingStat1: "72 Peluang Grant Aktif",
      floatingStat2: "SDG & ESG Aligned Pipeline",
      floatingStat3: "Real-time MEAL & SROI Sync"
    },
    problem: {
      badge: "Masalah",
      heading: "NGO bukan miskin tools. NGO sering kali miskin sistem terintegrasi.",
      description: "Proposal masih diketik dari nol, aktivitas WBS terpisah dari anggaran, bukti MEAL tercecer di chat, persetujuan klaim manual, dan laporan dampak baru disusun saat donor meminta.",
      highlight: "Tools adalah komponen. Sistem terintegrasi adalah mesin eksekusi."
    },
    growth: {
      badge: "Framework",
      heading: "G.R.O.W.T.H. System",
      subheading: "Enam dimensi terstruktur untuk membangun operasional terintegrasi, akuntabilitas data, dan keberlanjutan dampak NGO.",
      cards: [
        {
          letter: "G",
          title: "Grant & Resource Access",
          description: "Temukan pendanaan baru, akselerasi draf proposal, dan buka akses sumber daya digital organisasi secara terpusat.",
          modules: ["Grant Pipeline", "AI Proposal Generator", "Resource Tracker"]
        },
        {
          letter: "R",
          title: "Readiness & Baseline",
          description: "Ukur kesiapan operasional, kelola hak akses tim (RLS), dan petakan baseline profil organisasi secara sistematis.",
          modules: ["Readiness Scorecard", "Guided Onboarding", "Google OAuth & Team RLS"]
        },
        {
          letter: "O",
          title: "Operating Program & WBS Control Center",
          description: "Rancang LFA, kelola WBS Control Center, alur klaim & approval, serta kalkulasi anggaran terhubung otomatis.",
          modules: ["LFA Builder", "WBS Control Center", "Budget Calculator"]
        },
        {
          letter: "W",
          title: "Work Evidence & Verification",
          description: "Simpan bukti kegiatan terverifikasi di cloud, kelola registry penerima manfaat, dan jembatani bukti ke indikator MEAL.",
          modules: ["MEAL Evidence Bridge", "OneDrive Evidence Sync", "Beneficiary Registry"]
        },
        {
          letter: "T",
          title: "Tracking & Control Engine",
          description: "Pantau agregasi indikator output/outcome/impact real-time, lacak hambatan (bottleneck), dan jalankan review bulanan.",
          modules: ["MEAL V2 Aggregation", "Program Health Summary", "Monthly Operating Review"]
        },
        {
          letter: "H",
          title: "High-Impact & ESG Reporting",
          description: "Kuantifikasikan nilai dampak berbasis bukti (SROI V2), emisi lingkungan (E-ROI ESG), dan ekspor laporan siap donor.",
          modules: ["SROI V2 Evidence Valuation", "E-ROI Carbon Tracker", "Donor-ready Reporting"]
        }
      ]
    },
    workflow: {
      badge: "Alur Kerja Utama",
      heading: "Satu Alur Kerja Terintegrasi dari Hulu ke Hilir",
      subheading: "Kelola siklus lengkap program NGO Anda dengan kepatuhan dan akuntabilitas standar donor internasional.",
      steps: [
        {
          title: "Proposal & Design",
          desc: "Susun draf proposal dengan AI dan desain kerangka logis (LFA Matrix) yang selaras dengan hierarki NORAD & EuropeAid.",
          module: "Grantwriter & LFA Builder"
        },
        {
          title: "WBS Control Center",
          desc: "Tetapkan penanggung jawab (ownership), reviewer, klaim, persetujuan (approval), dan deteksi hambatan operasional.",
          module: "WBS Control Center"
        },
        {
          title: "Budget & Financial Status",
          desc: "Kalkulasi anggaran berbasis kegiatan WBS dengan acuan SBM 2026 dan pantau variance anggaran secara otomatis.",
          module: "Budget Calculator"
        },
        {
          title: "MEAL V2 & Verification",
          desc: "Agregasi indikator output, outcome, & impact dengan workflow verifikasi dan bridge bukti fisik di cloud.",
          module: "MEAL V2 Engine"
        },
        {
          title: "Evidence-Backed SROI",
          desc: "Valuasi dampak sosial otomatis tersinkronisasi dari MEAL V2 dengan 4 penyesuaian SVI, skor keyakinan, dan jejak audit.",
          module: "SROI V2 Valuation"
        },
        {
          title: "Donor-Ready Reporting",
          desc: "Kompilasikan capaian terverifikasi, alokasi anggaran, dan bukti dampak menjadi laporan dan proposal siap donor.",
          module: "Reporting & AI Assist"
        }
      ]
    },
    modules: {
      badge: "Modul Ekosistem Terintegrasi",
      heading: "Kapabilitas Utama Platform Impactory",
      subheading: "Rangkaian modul yang saling terhubung untuk mengawal program dari fase gagasan hingga pelaporan donor.",
      cards: [
        {
          title: "WBS Control Center",
          description: "Pusat kendali operasional program: kelola penanggung jawab kegiatan (ownership), reviewer, pengajuan klaim, approval workflow, bukti lapangan, status keuangan, dan deteksi otomatis hambatan (bottleneck).",
          cta: "Buka Control Center",
          href: "/dashboard/lfa-builder",
          badge: "Control Center",
          badgeVariant: "a"
        },
        {
          title: "MEAL V2 Engine",
          description: "Mesin pemantauan & evaluasi tingkat lanjut: dukung tipe indikator kuantitatif/kualitatif, agregasi otomatis, workflow verifikasi data, dan bridge bukti langsung dari lapangan.",
          cta: "Kelola MEAL V2",
          href: "/dashboard/lfa-builder",
          badge: "MEAL V2",
          badgeVariant: "t"
        },
        {
          title: "SROI V2 Evidence Valuation",
          description: "Valuasi dampak sosial berbasis bukti: sinkronisasi real-time dari data MEAL V2, 4 penyesuaian standar SVI (attribution, deadweight, displacement, drop-off), confidence scoring, dan alasan audit.",
          cta: "Valuasi SROI V2",
          href: "/dashboard/sroi",
          badge: "SROI V2",
          badgeVariant: "h"
        },
        {
          title: "Budget & Financial Tracking",
          description: "Kalkulasi anggaran terikat aktivitas WBS, acuan standar SBM 2026, pemantauan realisasi keuangan, dan deteksi otomatis deviasi (variance flag).",
          cta: "Kelola Anggaran",
          href: "/dashboard/lfa-builder",
          badge: "Financials",
          badgeVariant: "w"
        },
        {
          title: "ESG & E-ROI Carbon Tracker",
          description: "Ukur dan laporkan jejak lingkungan program (Scope 1, 2, 3) berbasis GHG Protocol & IPCC 2019, yang terintegrasi langsung ke laporan SROI dan proposal donor.",
          cta: "Buka E-ROI Carbon",
          href: "/dashboard/eroi",
          badge: "ESG / E-ROI",
          badgeVariant: "h"
        },
        {
          title: "Evidence Workflow & OneDrive Sync",
          description: "Kelola dan verifikasi bukti fisik pelaksanaan program di cloud (Microsoft OneDrive) yang terhubung langsung dengan klaim WBS dan indikator MEAL.",
          cta: "Kelola Bukti",
          href: "/dashboard/impactory-library",
          badge: "Evidence",
          badgeVariant: "w"
        },
        {
          title: "Donor-Ready Reporting",
          description: "Hasilkan laporan dampak dan executive summary terverifikasi dengan hasil terukur, bukti fisik terlampir, dan akuntabilitas keuangan berbasis anggaran WBS.",
          cta: "Buat Laporan Donor",
          href: "/dashboard/monthly-report",
          badge: "Reporting",
          badgeVariant: "a"
        },
        {
          title: "Beneficiary Registry & PDP",
          description: "Database penerima manfaat per program dengan consent PDP, kelompok rentan, pencatatan demografis, dan ekspor data terproteksi.",
          cta: "Buka Registry",
          href: "/dashboard/beneficiary",
          badge: "Registry",
          badgeVariant: "w"
        },
        {
          title: "Proposal & Grant Pipeline",
          description: "Pusat penemuan peluang hibah, pemetaan kriteria donor, dan penyusunan draf proposal otomatis berbasis knowledge base organisasi.",
          cta: "Cari Grant",
          href: "/dashboard/grantfinder",
          badge: "Proposals",
          badgeVariant: "t"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Manajemen Bukti & Standardisasi Internasional",
      heading: "Kepercayaan Lahir dari Bukti Fisik & Transparansi Workflow",
      description: "Impactory memastikan setiap angka capaian dan nilai dampak didukung oleh alur kepemilikan, persetujuan berjenjang, dan bukti fisik terverifikasi yang selaras dengan standar SVI, GHG Protocol, MEAL DPro, dan logika NORAD/EuropeAid.",
      cards: [
        {
          title: "Evidence Workflow & OneDrive Bridge",
          description: "Tautkan bukti fisik (foto, absensi, dokumen) di cloud langsung pada klaim kegiatan WBS dan capaian indikator MEAL V2."
        },
        {
          title: "Ownership & Approval Workflow",
          description: "Kejelasan peran penanggung jawab kegiatan, reviewer, dan alur persetujuan klaim berbasis Row Level Security (RLS) terproteksi."
        },
        {
          title: "Standardisasi Internasional",
          description: "Selaras dengan Social Value International (SROI V2 4-adjustment), GHG Protocol (E-ROI ESG Scope 1/2/3), MEAL DPro, dan SBM 2026."
        }
      ]
    },
    trust: {
      badge: "Asas Kepercayaan",
      heading: "AI Mempercepat Draf. Workflow & Manusia Memastikan Akurasi.",
      cards: [
        {
          title: "Human Approval Workflow",
          description: "Proposal, klaim WBS, data keuangan, dan laporan dampak wajib melalui alur verifikasi & approval manusia."
        },
        {
          title: "No Fabrication Doctrine",
          description: "Sistem tidak mengarang angka impact, bukti kegiatan, atau kriteria donor. Semua angka berakar dari data MEAL & WBS."
        },
        {
          title: "Evidence Provenance & RLS",
          description: "Setiap klaim data memiliki jejak bukti fisik terlampir dan dilindungi oleh otorisasi keamanan Row Level Security."
        },
        {
          title: "Confidence Scoring",
          description: "Valuasi SROI dan kalkulasi dampak menyajikan skor keyakinan & alasan audit, bukan sekadar klaim sepihak."
        }
      ]
    },
    timeline90: {
      badge: "90-Day Plan",
      heading: "Bangun sistem terintegrasi NGO & CSO Anda dalam 90 hari.",
      cta: "Mulai dari Readiness Scorecard",
      steps: [
        { day: "Hari 1–15", phase: "Foundation & Readiness Audit" },
        { day: "Hari 16–30", phase: "WBS & Budget Control Setup" },
        { day: "Hari 31–45", phase: "MEAL V2 & Evidence Activation" },
        { day: "Hari 46–60", phase: "Ownership & Approval Workflow" },
        { day: "Hari 61–75", phase: "SROI V2 & ESG Integration" },
        { day: "Hari 76–90", phase: "Donor-ready Dashboard & Scale" }
      ]
    },
    founder: {
      badge: "Inisiatif Operator",
      heading: "Dibangun dari pengalaman operator.",
      description: "Impactory.id dikembangkan sebagai inisiatif civic technology oleh Yayasan Rumah Pembangunan Berkelanjutan untuk memperkuat akses sumber daya, operasional terintegrasi, dan kapasitas kerja organisasi masyarakat sipil di Indonesia. Pengalaman operator mengelola 20B+ budget digital marketing lintas NGO mendasari arsitektur WBS Control Center, MEAL V2, dan SROI V2 ini."
    },
    finalCta: {
      heading: "Mulai dari baseline. Integrasikan seluruh siklus program.",
      description: "Gunakan Readiness Scorecard sebagai titik awal, lalu aktifkan WBS Control Center, MEAL V2, SROI V2, dan laporan siap donor untuk organisasi Anda.",
      ctaPrimary: "Mulai Readiness Scorecard",
      ctaSecondary: "Buka Grant Pipeline"
    },
    footer: {
      tagline: "Integrated Program Lifecycle System & Civic Technology Resource Hub.",
      rights: "Semua Hak Dilindungi."
    }
  },
  en: {
    meta: {
      title: "Impactory.id — Integrated Program Lifecycle Platform for NGOs, MEAL V2, SROI & ESG",
      description: "Impactory.id manages the complete NGO program lifecycle: Proposal → LFA → WBS Control Center → Budget → MEAL V2 → SROI V2 → ESG / E-ROI → Donor-ready Reporting."
    },
    navbar: {
      problem: "Problem",
      growth: "G.R.O.W.T.H.",
      products: "Products",
      login: "Login",
      startScorecard: "Start Scorecard"
    },
    hero: {
      badge: "Integrated Program Lifecycle System",
      hackathonBadge: "🏆 Top 101 of 1,500+ Participants — Google Cloud Gen AI Academy APAC Hackathon",
      hackathonBadgeShort: "Ranked 68/101 Finalist — Gen AI APAC Hackathon",
      headingText: "Manage Entire Program Lifecycles &",
      headingHighlight: "Valuate Evidence-Backed Impact.",
      subheading: "An integrated ecosystem platform for NGOs: Proposal → LFA → WBS Control Center → Budget → MEAL V2 → SROI V2 → ESG / E-ROI → Donor-ready Reporting.",
      ctaPrimary: "Start a Program",
      ctaSecondary: "Explore G.R.O.W.T.H. System",
      trustBadge: "Civic Resource Hub for Grassroots CSOs & NGOs, equipped with Ownership, Approval, and Verified Evidence Workflows.",
      floatingStat1: "72 Active Grant Opportunities",
      floatingStat2: "SDG & ESG Aligned Pipeline",
      floatingStat3: "Real-time MEAL & SROI Sync"
    },
    problem: {
      badge: "Problem",
      heading: "NGOs are not short of tools. They are short of integrated systems.",
      description: "Proposals start from scratch, WBS activities are disconnected from budgets, MEAL evidence is scattered in chat apps, claim approvals are manual, and impact reports are compiled only on demand.",
      highlight: "Tools are individual components. An integrated system is the execution engine."
    },
    growth: {
      badge: "Framework",
      heading: "G.R.O.W.T.H. System",
      subheading: "Six structured dimensions to construct integrated operations, data accountability, and sustainable impact for NGOs.",
      cards: [
        {
          letter: "G",
          title: "Grant & Resource Access",
          description: "Discover new funding avenues, accelerate proposal drafts, and unlock digital resources centrally.",
          modules: ["Grant Pipeline", "AI Proposal Generator", "Resource Tracker"]
        },
        {
          letter: "R",
          title: "Readiness & Baseline",
          description: "Assess operational readiness, manage team access permissions (RLS), and map baseline profiles systematically.",
          modules: ["Readiness Scorecard", "Guided Onboarding", "Google OAuth & Team RLS"]
        },
        {
          letter: "O",
          title: "Operating Program & WBS Control Center",
          description: "Design standard LFAs, operate WBS Control Centers, handle claims & approvals, and auto-populate budgets.",
          modules: ["LFA Builder", "WBS Control Center", "Budget Calculator"]
        },
        {
          letter: "W",
          title: "Work Evidence & Verification",
          description: "Store verified activity evidence in the cloud, manage beneficiary registries, and bridge proof to MEAL indicators.",
          modules: ["MEAL Evidence Bridge", "OneDrive Evidence Sync", "Beneficiary Registry"]
        },
        {
          letter: "T",
          title: "Tracking & Control Engine",
          description: "Monitor real-time output/outcome/impact indicator aggregations, track bottlenecks, and run monthly reviews.",
          modules: ["MEAL V2 Aggregation", "Program Health Summary", "Monthly Operating Review"]
        },
        {
          letter: "H",
          title: "High-Impact & ESG Reporting",
          description: "Quantify evidence-backed impact values (SROI V2), environmental footprints (E-ROI ESG), and export donor-ready reports.",
          modules: ["SROI V2 Evidence Valuation", "E-ROI Carbon Tracker", "Donor-ready Reporting"]
        }
      ]
    },
    workflow: {
      badge: "Core Workflow",
      heading: "One Integrated End-to-End Workflow",
      subheading: "Manage your entire NGO program lifecycle with international donor compliance and accountability.",
      steps: [
        {
          title: "Proposal & Design",
          desc: "Draft AI-assisted proposals and design Logical Frameworks (LFA) aligned with NORAD & EuropeAid hierarchy.",
          module: "Grantwriter & LFA Builder"
        },
        {
          title: "WBS Control Center",
          desc: "Assign activity owners, reviewers, manage claims, approval workflows, and spot operational bottlenecks.",
          module: "WBS Control Center"
        },
        {
          title: "Budget & Financial Status",
          desc: "Calculate activity-based budgets dynamically linked to WBS actions and SBM 2026 references with variance tracking.",
          module: "Budget Calculator"
        },
        {
          title: "MEAL V2 & Verification",
          desc: "Aggregate output, outcome, & impact indicators backed by verification workflows and cloud evidence bridges.",
          module: "MEAL V2 Engine"
        },
        {
          title: "Evidence-Backed SROI",
          desc: "Valuate social impact synchronized real-time from MEAL V2 using 4 SVI adjustments, confidence scores, and audit trails.",
          module: "SROI V2 Valuation"
        },
        {
          title: "Donor-Ready Reporting",
          desc: "Compile verified outcomes, budget allocations, and linked impact evidence into donor-ready reports and proposals.",
          module: "Reporting & AI Assist"
        }
      ]
    },
    modules: {
      badge: "Integrated Ecosystem Modules",
      heading: "Core Capabilities of the Impactory Platform",
      subheading: "Interconnected modules built to lead programs seamlessly from proposal ideas to donor reporting.",
      cards: [
        {
          title: "WBS Control Center",
          description: "Program management control center: activity ownership, reviewers, claim submissions, approval workflows, field evidence, financial status, and automated bottleneck detection.",
          cta: "Open Control Center",
          href: "/dashboard/lfa-builder",
          badge: "Control Center",
          badgeVariant: "a"
        },
        {
          title: "MEAL V2 Engine",
          description: "Advanced monitoring & evaluation engine: supports output/outcome/impact indicators, automated aggregation, verification workflows, and direct evidence bridging.",
          cta: "Manage MEAL V2",
          href: "/dashboard/lfa-builder",
          badge: "MEAL V2",
          badgeVariant: "t"
        },
        {
          title: "SROI V2 Evidence Valuation",
          description: "Evidence-backed impact valuation: real-time sync from MEAL V2, 4 SVI adjustments (attribution, deadweight, displacement, drop-off), confidence scoring, and audit rationale.",
          cta: "Valuate SROI V2",
          href: "/dashboard/sroi",
          badge: "SROI V2",
          badgeVariant: "h"
        },
        {
          title: "Budget & Financial Tracking",
          description: "Activity-based budget calculator linked directly to WBS items, SBM 2026 benchmarks, financial tracking, and variance flags.",
          cta: "Manage Budget",
          href: "/dashboard/lfa-builder",
          badge: "Financials",
          badgeVariant: "w"
        },
        {
          title: "ESG & E-ROI Carbon Tracker",
          description: "Measure and report environmental footprints (Scope 1, 2, 3) following GHG Protocol & IPCC 2019, integrated into SROI and donor proposals.",
          cta: "Open E-ROI Carbon",
          href: "/dashboard/eroi",
          badge: "ESG / E-ROI",
          badgeVariant: "h"
        },
        {
          title: "Evidence Workflow & OneDrive Sync",
          description: "Manage and verify physical activity evidence in cloud folders (Microsoft OneDrive) directly attached to WBS claims and MEAL entries.",
          cta: "Manage Evidence",
          href: "/dashboard/impactory-library",
          badge: "Evidence",
          badgeVariant: "w"
        },
        {
          title: "Donor-Ready Reporting",
          description: "Generate verified impact reports and executive summaries with measured outcomes, linked physical evidence, and budget accountability.",
          cta: "Create Donor Report",
          href: "/dashboard/monthly-report",
          badge: "Reporting",
          badgeVariant: "a"
        },
        {
          title: "Beneficiary Registry & PDP",
          description: "Beneficiary database per program with PDP consent, vulnerable group categorization, demographic tracking, and protected export.",
          cta: "Open Registry",
          href: "/dashboard/beneficiary",
          badge: "Registry",
          badgeVariant: "w"
        },
        {
          title: "Proposal & Grant Pipeline",
          description: "Grant discovery hub, donor eligibility mapping, and automated proposal drafting grounded on organizational knowledge.",
          cta: "Find Grants",
          href: "/dashboard/grantfinder",
          badge: "Proposals",
          badgeVariant: "t"
        }
      ]
    },
    evidenceAndReporting: {
      badge: "Evidence Management & International Standards",
      heading: "Trust is Built on Physical Evidence & Workflow Transparency",
      description: "Impactory ensures every outcome figure and impact value is backed by explicit ownership, tiered approval workflows, and verified evidence aligned with SVI, GHG Protocol, MEAL DPro, and NORAD/EuropeAid logic.",
      cards: [
        {
          title: "Evidence Workflow & OneDrive Bridge",
          description: "Attach cloud evidence files (photos, attendance sheets, sign-ins) directly adjacent to WBS activity claims and MEAL V2 entries."
        },
        {
          title: "Ownership & Approval Workflow",
          description: "Clear activity owner and reviewer roles with tiered claim approval workflows protected under Row Level Security (RLS)."
        },
        {
          title: "International Standards Alignment",
          description: "Designed in alignment with Social Value International (SROI V2 4-adjustment), GHG Protocol (E-ROI ESG Scope 1/2/3), MEAL DPro, and SBM 2026."
        }
      ]
    },
    trust: {
      badge: "Trust Doctrine",
      heading: "AI Accelerates Drafts. Workflows & Humans Guarantee Accuracy.",
      cards: [
        {
          title: "Human Approval Workflow",
          description: "Proposals, WBS claims, financial entries, and impact reports must pass through human verification & approval workflows."
        },
        {
          title: "No Fabrication Doctrine",
          description: "The platform never invents impact figures, activity evidence, or donor criteria. All metrics root from MEAL & WBS data."
        },
        {
          title: "Evidence Provenance & RLS",
          description: "Every data claim has attached physical evidence trails and is safeguarded under Row Level Security authorization."
        },
        {
          title: "Confidence Scoring",
          description: "SROI valuations and impact calculations present confidence index scores and audit rationale rather than arbitrary assertions."
        }
      ]
    },
    timeline90: {
      badge: "90-Day Plan",
      heading: "Construct your integrated NGO digital operations workflow in 90 days.",
      cta: "Start from Readiness Scorecard",
      steps: [
        { day: "Day 1–15", phase: "Foundation & Readiness Audit" },
        { day: "Day 16–30", phase: "WBS & Budget Control Setup" },
        { day: "Day 31–45", phase: "MEAL V2 & Evidence Activation" },
        { day: "Day 46–60", phase: "Ownership & Approval Workflow" },
        { day: "Day 61–75", phase: "SROI V2 & ESG Integration" },
        { day: "Day 76–90", phase: "Donor-ready Dashboard & Scale" }
      ]
    },
    founder: {
      badge: "Operator Initiative",
      heading: "Built from operators' real experiences.",
      description: "Impactory.id was built as a civic technology project by Yayasan Rumah Pembangunan Berkelanjutan to strengthen resource access, integrated operations, and digital capacity across civil society in Indonesia. Its architecture for WBS Control Center, MEAL V2, and SROI V2 stems from experience managing 20B+ digital marketing budgets across NGOs."
    },
    finalCta: {
      heading: "Start from baseline. Integrate your complete program lifecycle.",
      description: "Take the Readiness Scorecard as a start, then activate WBS Control Center, MEAL V2, SROI V2, and donor-ready reporting for your organization.",
      ctaPrimary: "Start Readiness Scorecard",
      ctaSecondary: "View Grant Pipeline"
    },
    footer: {
      tagline: "Integrated Program Lifecycle System & Civic Technology Resource Hub.",
      rights: "All Rights Reserved."
    }
  }
};

