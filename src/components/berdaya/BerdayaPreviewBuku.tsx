import React from 'react';
import { BookOpen, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL, LYNK_PAKET_URL } from './BerdayaHero';

export const BerdayaPreviewBuku: React.FC = () => {
  const chapters = [
    {
      num: "BAB 01",
      title: "Jebakan Operasional & Realita Pahit NGO Tanpa Sistem",
      desc: "Membedah akar masalah mengapa banyak yayasan kelelahan mengurusi admin manual, proposal sering ditolak donor, dan ketergantungan pada perseorangan.",
      highlights: ["Anatomi Burnout NGO", "Mengapa Spreadsheet Saja Tidak Cukup", "Studi Kasus Kesiapan Audit Donor"]
    },
    {
      num: "BAB 02",
      title: "Blueprint System Orchestration Organisasi Sosial",
      desc: "Cara menjahit tools yang sudah ada (Google Workspace, Microsoft 365, Canva Pro, Azure) menjadi satu pusat komando digital yang efisien.",
      highlights: ["Framework Integrasi Tools", "Arsitektur Data Terpusat", "SOP Digitalisasi Operasional"]
    },
    {
      num: "BAB 03",
      title: "Generasi Proposal AI Kilat & Matriks LFA Standar Donor",
      desc: "Panduan praktis menyusun Logical Framework Analysis (LFA) dan prompt engineering proposal hibah yang disukai lembaga donor internasional.",
      highlights: ["Matriks LFA 4x4 donor-matched", "Prompt Engineering GrantWriter AI", "Struktur Anggaran WBS"]
    },
    {
      num: "BAB 04",
      title: "Monetisasi Dampak (SROI) & Retensi Donor CRM",
      desc: "Metodologi mengukur Social Return on Investment (SROI) secara kuantitatif serta strategi mengelola jaringan pendana agar teratur.",
      highlights: ["Kalkulasi Monetisasi Dampak", "Peta Prospek Donor CRM", "Strategi Laporan Bulanan (MOR)"]
    },
    {
      num: "BAB 05",
      title: "Roadmap Eksekusi & Keberlanjutan Mandiri",
      desc: "Langkah demi langkah mengimplementasikan perubahan di organisasi Anda agar mandiri secara pendanaan dan memiliki dampak yang berkelanjutan.",
      highlights: ["Checklist Transisi 30 Hari", "Manajemen Perubahan Tim", "Prinsip Keberkahan & Wakaf"]
    }
  ];

  return (
    <section className="py-24 bg-[#0D2530] border-b border-white/10 relative overflow-hidden">
      {/* Glow Ambient */}
      <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Inti Pembahasan Buku</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Preview Isi Buku "Grant Banyak, Sistem Nggak Ada"
          </h2>

          <p className="text-slate-300 text-base sm:text-lg">
            Intip pokok bahasan dan strategi yang dirancang khusus untuk memodernisasi ekosistem kerja organisasi Anda.
          </p>
        </div>

        {/* Chapters Cards List */}
        <div className="space-y-6 max-w-5xl mx-auto">
          {chapters.map((ch, idx) => (
            <div 
              key={idx}
              className="p-6 sm:p-8 rounded-2xl bg-[#0A1D25] border border-white/10 hover:border-amber-500/40 transition-all duration-300 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center group"
            >
              
              <div className="lg:col-span-3 flex items-center gap-4">
                <span className="text-3xl font-black text-amber-400 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 shrink-0">
                  {ch.num}
                </span>
              </div>

              <div className="lg:col-span-9 space-y-3">
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  {ch.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {ch.desc}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {ch.highlights.map((h, i) => (
                    <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      ✓ {h}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* CTA Bar */}
        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all">
              <span>Beli Ebook Rp129.000 via Lynk</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>

          <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-teal-500/20 group transition-all">
              <span>Ambil Paket Berdaya Complete Rp499.000</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
};
