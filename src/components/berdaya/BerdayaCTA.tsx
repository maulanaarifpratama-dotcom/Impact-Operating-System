import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_URL } from './BerdayaHero';

export const BerdayaCTA: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-[#0A1D25] via-[#0D2530] to-[#07161E] relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-teal-500/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-4 relative z-10 text-center">
        
        <div className="p-8 sm:p-14 rounded-3xl bg-slate-900/90 border-2 border-teal-500/40 backdrop-blur-xl shadow-2xl space-y-8">
          
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-xs font-bold text-teal-300 border border-teal-500/20">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Saatnya Organisasi Anda Naik Kelas</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
            Siap Memperkuat Dampak & Akses Pendanaan Organisasi Anda?
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dapatkan Paket Berdaya sekarang di Lynk. Nikmati kemudahan pengelolaan program berstandar donor internasional sekaligus berkontribusi dalam Wakaf Masjid Ar-Rustendi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href={LYNK_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-lg px-10 py-7 rounded-xl shadow-xl shadow-teal-500/30 group transition-all duration-300 hover:scale-105">
                <span>Dapatkan Paket Berdaya di Lynk</span>
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400 border-t border-white/10 max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sistem Teruji & Aman</span>
            </div>
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              <span>Termasuk Wakaf Masjid</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Akses Instan via Lynk</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
