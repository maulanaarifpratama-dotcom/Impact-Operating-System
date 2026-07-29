import React from 'react';
import { BookOpen, Zap, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL, LYNK_PAKET_URL } from './BerdayaHero';

export const BerdayaPanduanPilihan: React.FC = () => {
  return (
    <section className="py-24 bg-[#0A1D25] border-b border-white/10 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-teal-400" />
            <span>Panduan Mengambil Keputusan</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Mana Opsi yang Paling Tepat untuk Anda?
          </h2>

          <p className="text-slate-300 text-base sm:text-lg">
            Gunakan panduan ini untuk memilih opsi investasi yang paling sesuai dengan tahap dan kebutuhan organisasi Anda saat ini.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Mengapa Tidak Mulai Dengan Ebook? */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between shadow-xl relative overflow-hidden group">
            
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <BookOpen className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Opsi Ebook Only — Rp129.000
                </span>
                <h3 className="text-2xl font-black text-white">
                  Mengapa Tidak Mulai Dengan Ebook?
                </h3>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Opsi Ebook sangat tepat jika Anda adalah penggerak komunitas, aktivis sosial, atau pimpinan yang ingin mempelajari fondasi strategi terlebih dahulu sebelum investasi software.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Ingin memahami mindset & blueprint <strong>System Orchestration</strong></span>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Membutuhkan referensi penyusunan SOP & pembenahan organisasi</span>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Memiliki budget awal yang terjangkau (<strong>Rp129.000</strong>)</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-white/10">
              <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all">
                  <span>Beli Ebook Rp129.000</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </div>

          {/* Card 2: Kapan Harus Ambil Paket Berdaya? */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0D2530] via-[#0A1D25] to-[#081820] border-2 border-teal-500/50 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>

              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block mb-1">
                  Opsi Complete System — Rp499.000
                </span>
                <h3 className="text-2xl font-black text-white">
                  Kapan Harus Ambil Paket Berdaya?
                </h3>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Paket Berdaya wajib diambil jika organisasi Anda sedang aktif mengejar hibah donor, membutuhkan software otomatisasi proposal AI, dan ingin langsung memiliki tools siap pakai.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Siap mengejar grant & butuh <strong>Impactory GrantWriter AI</strong></span>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Butuh LFA Builder, SROI Calculator, & Donor CRM otomatis</span>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Ingin sekaligus berkontribusi dalam <strong>Wakaf Masjid Ar-Rustendi</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-white/10">
              <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button size="lg" className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-teal-500/20 group transition-all">
                  <span>Ambil Paket Berdaya Rp499.000</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
