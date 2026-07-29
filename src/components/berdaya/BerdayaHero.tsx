import React from 'react';
import { ArrowRight, CheckCircle, Sparkles, ShieldCheck, HeartHandshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LYNK_URL = "https://lynk.id/impactory";

export const BerdayaHero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-white/10 bg-gradient-to-b from-[#07161E] via-[#0A1D25] to-[#0D2530]">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-teal-300 border border-teal-500/25 mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Program Penawaran Spesial: Paket Berdaya Impactory</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-5xl bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
            Akselerasi Dampak & Kemandirian Pendanaan Organisasi Anda
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl leading-relaxed font-normal">
            Solusi lengkap terpadu untuk NGO, Yayasan, dan Penggerak Komunitas: Dapatkan sistem manajemen program modern, kerangka proposal donor standar internasional, serta kontribusi wakaf keberlanjutan.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <a href={LYNK_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-teal-500/20 group transition-all duration-300 hover:scale-105">
                <span>Beli Paket Berdaya di Lynk</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            
            <a href="#isi-paket" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-base px-6 py-6 rounded-xl backdrop-blur-sm">
                Lihat Detail Isi Paket
              </Button>
            </a>
          </div>

          {/* Feature Badges Grid */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl text-left w-full">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <Zap className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Proposal AI Kilat</h4>
                <p className="text-xs text-slate-400">Siap kirim ke donor</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">LFA & Standard M&E</h4>
                <p className="text-xs text-slate-400">Standar donor global</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Lisensi Impactory</h4>
                <p className="text-xs text-slate-400">Akses penuh fitur platform</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <HeartHandshake className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Wakaf Masjid</h4>
                <p className="text-xs text-slate-400">Masjid Ar-Rustendi</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
