import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LYNK_EBOOK_URL = "http://lynk.id/impactory/0rdn61ky3j9z/checkout";
export const LYNK_PAKET_URL = "http://lynk.id/impactory/1od7mry9l0ej/checkout";

export const BerdayaHero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-10 pb-20 sm:pt-20 sm:pb-28 border-b border-white/10 bg-gradient-to-b from-[#07161E] via-[#0A1D25] to-[#0D2530]">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-teal-500/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Mobile First Main Hero Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 order-2 lg:order-1">
            
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-teal-300 border border-teal-500/25 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Panduan & Sistem Pertumbuhan untuk NGO Indonesia</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
              Grant Banyak,<br className="hidden sm:inline" />
              <span className="text-amber-400">Sistem Nggak Ada?</span>
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Banyak yayasan dan komunitas hebat tetap stagnan bukan karena kurang niat, tapi karena belum punya sistem untuk membuka akses dana dan mengelola pertumbuhannya. <strong className="text-white">Buku "Grant Banyak, Sistem Nggak Ada"</strong> menunjukkan caranya — dan <strong className="text-white">Paket Berdaya</strong> memberi Anda sistem lengkap yang nilainya jauh lebih besar dari harganya.
            </p>

            {/* DUAL CTA BUTTONS WITH EXPLICIT PRICES */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 pt-2">
              <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base px-7 py-6 rounded-xl shadow-lg shadow-teal-500/25 group transition-all duration-300 hover:scale-105">
                  <Zap className="mr-2 w-5 h-5 text-amber-300" />
                  <span>Paket Berdaya — Rp499.000</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>

              <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-base px-7 py-6 rounded-xl backdrop-blur-sm">
                  <BookOpen className="mr-2 w-5 h-5" />
                  <span>Ebook Only — Rp129.000</span>
                </Button>
              </a>
            </div>

            {/* Key Trust Badges */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Playbook Blueprint</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Software Impactory</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10 col-span-2 sm:col-span-1">
                <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Wakaf Masjid Termasuk</span>
              </div>
            </div>

          </div>

          {/* Right Hero Image (Desktop & Mobile Focal Point) */}
          <div className="lg:col-span-5 flex justify-center order-1 lg:order-2">
            <div className="relative group max-w-xs sm:max-w-sm w-full">
              {/* Product Glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              
              <div className="relative p-5 rounded-3xl bg-[#0A1D25] border border-white/20 shadow-2xl flex flex-col items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 mb-3">
                  Visual Utama Buku
                </span>

                <img 
                  src="/images/ebook_grant_banyak_sistem_gak_ada.png" 
                  alt="Cover Buku Grant Banyak, Sistem Nggak Ada" 
                  className="w-full h-auto object-contain rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
                />

                <div className="mt-3 text-center">
                  <h3 className="text-sm font-bold text-white">
                    "Grant Banyak, Sistem Nggak Ada"
                  </h3>
                  <p className="text-xs text-amber-300 font-semibold mt-0.5">
                    Tersedia Ebook Rp129.000 & Paket Rp499.000
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
