import React, { useState } from 'react';
import { Bot, FileCode2, BookOpenCheck, LineChart, ShieldCheck, ChevronRight } from 'lucide-react';

export const BerdayaDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grantwriter' | 'lfa' | 'sroi' | 'library'>('grantwriter');

  const demos = {
    grantwriter: {
      title: "GrantWriter AI",
      subtitle: "Asisten Penulis Proposal Hibah Otomatis",
      desc: "Hasilkan draf proposal proyek sosial lengkap dengan narasi masalah, tujuan, aktivitas LFA, dan rincian anggaran yang disesuaikan dengan kriteria spesifik donor.",
      tags: ["AI Proposal", "Donor Matched", "Export Word/PDF"],
      features: [
        "Analisis kriteria donor otomatis",
        "Penyusunan narasi Theory of Change",
        "Estimasi struktur anggaran WBS",
        "Dukungan multi-bahasa (ID/EN)"
      ],
      previewCode: `[Impactory GrantWriter AI]
> Menganalisis Dokumen Panduan Donor...
> Mengakses Database Program Organisasi...
✓ Menggenerasi Seksi 1: Latar Belakang & Justifikasi Masalah
✓ Menggenerasi Seksi 2: Matriks Logical Framework (LFA)
✓ Menggenerasi Seksi 3: Rencana Anggaran Biaya (RAB)
STATUS: Proposal Siap Diunduh (100% Complete)`
    },
    lfa: {
      title: "LFA & Work Breakdown Structure (WBS)",
      subtitle: "Perancangan Program Standar Donor Global",
      desc: "Rancang logika intervensi program secara visual mulai dari Goal, Outcome, Output, hingga Activity lengkap dengan Indikator Kinerja Utama (KPI).",
      tags: ["Matrix Builder", "Smart KPI", "Verification Means"],
      features: [
        "Matriks LFA interaktif 4x4",
        "Penjadwalan aktivitas & milestoning WBS",
        "Pemetaan sumber bukti verifikasi (Means of Verification)",
        "Manajemen penerima manfaat terintegrasi"
      ],
      previewCode: `[Matriks Logical Framework Analysis]
Impact : Peningkatan Kesejahteraan Petani Lokal
Outcome: +45% Pendapatan Rata-Rata Anggota Kelompok
Output : 120 Petani Tersertifikasi Budidaya Organik
Activity: Pelatihan Intensif & Pendampingan Lapangan`
    },
    sroi: {
      title: "Impact Calculator (SROI & EROI)",
      subtitle: "Pengukuran Kuantitatif Nilai Dampak Sosial",
      desc: "Ubah dampak kualitatif menjadi angka monetisasi yang valid untuk membuktikan akuntabilitas pengelolaan dana kepada para donor dan pemangku kepentingan.",
      tags: ["Monetization", "Proxy Library", "Auditable Report"],
      features: [
        "Kalkulator rasio Social Return on Investment",
        "Pustaka financial proxies lokal terverifikasi",
        "Visualisasi grafik dampak komprehensif",
        "Laporan bulanan instan (Monthly Operating Review)"
      ],
      previewCode: `[Kalkulator SROI Impactory]
Investasi Total : Rp 500.000.000
Nilai Dampak   : Rp 2.350.000.000 (Monetized Social Value)
Rasio SROI     : 1 : 4,70
KESIMPULAN     : Setiap Rp 1 donasi menghasilkan dampak senilai Rp 4,70`
    },
    library: {
      title: "Impactory Knowledge Library",
      subtitle: "Pustaka Template & SOP Organisasi Sosial",
      desc: "Akses ratusan modul, panduan kepatuhan hukum, template proposal memenang hibah, dan dokumen operasional standar.",
      tags: ["Ready Templates", "Best Practices", "Legal & Compliance"],
      features: [
        "Template proposal hibah teruji",
        "SOP keuangan dan pengadaan NGO",
        "Panduan legalitas & transparansi",
        "Checklist kesiapan audit donor"
      ],
      previewCode: `[Impactory Knowledge Library]
📂 Template_Proposal_Yayasan_V2.docx
📂 SOP_Pengadaan_Barang_Jasa_NGO.pdf
📂 Checklist_Readiness_Scorecard.xlsx
📂 Panduan_Pelaporan_Keuangan_Donor.pdf`
    }
  };

  const currentDemo = demos[activeTab];

  return (
    <section className="py-20 bg-[#0A1D25] border-b border-white/5 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            Showcase Platform Impactory
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Lihat Bagaimana Impactory Bekerja untuk Anda
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Satu platform terpadu yang dirancang khusus untuk memodernisasi ekosistem kerja organisasi sosial di Indonesia.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          <button
            onClick={() => setActiveTab('grantwriter')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'grantwriter'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>GrantWriter AI</span>
          </button>

          <button
            onClick={() => setActiveTab('lfa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'lfa'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>LFA Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('sroi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'sroi'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>SROI Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'library'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Knowledge Library</span>
          </button>
        </div>

        {/* Demo Display Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                {currentDemo.subtitle}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {currentDemo.title}
              </h3>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                {currentDemo.desc}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentDemo.tags.map((tag, i) => (
                <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  {tag}
                </span>
              ))}
            </div>

            <ul className="space-y-2.5 pt-2">
              {currentDemo.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-[#07161E] border border-white/10 p-5 font-mono text-xs sm:text-sm text-teal-300 leading-relaxed shadow-inner overflow-x-auto">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] font-sans text-slate-400">Impactory System Console</span>
              </div>
              <pre className="whitespace-pre-wrap">{currentDemo.previewCode}</pre>
            </div>
            {activeTab === 'sroi' && (
              <p className="text-[11px] text-slate-500 mt-2 italic">
                Contoh ilustrasi perhitungan untuk menunjukkan cara kerja fitur, bukan hasil aktual dari organisasi tertentu.
              </p>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
