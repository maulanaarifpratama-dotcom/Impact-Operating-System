import React from 'react';
import { Layers, CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_PAKET_URL } from './BerdayaHero';

export const BerdayaValueStack: React.FC = () => {
  const valueItems = [
    { title: "Buku Playbook 'Grant Banyak, Sistem Nggak Ada' PDF", val: "Rp 350.000" },
    { title: "Akses Lisensi Platform Software Impactory (GrantWriter AI, LFA, SROI)", val: "Rp 1.500.000" },
    { title: "Bundle Template Proposal & SOP Operasional Standar Donor Global", val: "Rp 750.000" },
    { title: "Modul Video Guidance & Pelatihan Intensif Penetapan KPI", val: "Rp 500.000" },
    { title: "Akses Komunitas Penggerak Berdaya & Sesi Konsultasi Q&A", val: "Rp 300.000" },
    { title: "Alokasi Wakaf Pembangunan & Operasional Masjid Ar-Rustendi", val: "INCLUDED" }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#0A1D25] via-[#0D2530] to-[#0A1D25] border-b border-white/10 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Rincian Total Nilai Investasi</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Value Stack: Semua yang Anda Dapatkan
          </h2>

          <p className="text-slate-300 text-base sm:text-lg">
            Nilai akses sistem dan peluang pendanaan digital yang Anda dapatkan jauh lebih besar dari investasinya. Jika seluruh item di bawah ini dibeli secara terpisah, totalnya bisa mencapai jutaan rupiah.
          </p>
        </div>

        {/* Value Stack Table Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 backdrop-blur-xl shadow-2xl space-y-6">
          
          <div className="divide-y divide-white/10">
            {valueItems.map((item, idx) => (
              <div key={idx} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base font-semibold text-slate-200">
                    {item.title}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shrink-0 self-end sm:self-auto">
                  Nilai: {item.val}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-950/60 p-6 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-widest block">Total Nilai Keseluruhan</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 line-through">Rp 3.400.000+</span>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Harga Spesial Paket Berdaya</span>
              <span className="text-3xl sm:text-4xl font-black text-amber-400">Hanya Rp 499.000</span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-lg px-10 py-7 rounded-xl shadow-xl shadow-teal-500/25 group transition-all duration-300 hover:scale-105">
                <span>Dapatkan Paket Berdaya Rp499.000 Sekarang</span>
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
