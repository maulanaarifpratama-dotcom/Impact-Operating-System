import React from 'react';
import { Check, Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_URL } from './BerdayaHero';

export const BerdayaPricing: React.FC = () => {
  return (
    <section id="pricing" className="py-20 bg-[#0A1D25] border-b border-white/5 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            Investasi Pertumbuhan
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Penawaran Spesial Paket Berdaya
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Dapatkan seluruh akses platform Impactory, modul pelatihan, template SOP, serta alokasi wakaf dalam satu paket investasi hemat.
          </p>
        </div>

        {/* Pricing Card Showcase */}
        <div className="max-w-4xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0D2530] via-[#0A1D25] to-[#07161E] border-2 border-teal-500/50 shadow-2xl relative overflow-hidden">
            
            {/* Top Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase px-6 py-2 rounded-bl-2xl tracking-wider shadow-lg flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rekomendasi Utama</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 mb-3">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lengkap & Terpadu</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white">
                    Paket Berdaya Impactory
                  </h3>
                  <p className="text-sm text-slate-300 mt-2">
                    Akses penuh untuk tim organisasi Anda menuju kemandirian operasional dan akuntabilitas dampak.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Akses Platform Impactory</strong> (GrantWriter AI, LFA Builder, SROI, Donor CRM)</span>
                  </div>

                  <div className="flex items-start gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Bundle Template Proposal & SOP</strong> Siap Pakai</span>
                  </div>

                  <div className="flex items-start gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Modul & Video Guidance</strong> Pelatihan Intensif</span>
                  </div>

                  <div className="flex items-start gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Akses Komunitas & Sesi Konsultasi</strong> Eksklusif</span>
                  </div>

                  <div className="flex items-start gap-3 text-sm text-emerald-300 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                    <HeartHandshake className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Termasuk Wakaf Masjid Ar-Rustendi untuk Keberkahan Keberlanjutan</span>
                  </div>
                </div>
              </div>

              {/* Price & CTA Column */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-2xl text-center space-y-6 flex flex-col justify-between shadow-xl">
                
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Harga Penawaran Khusus
                  </span>
                  
                  <div className="flex items-center justify-center gap-2 my-2">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      Paket Spesial
                    </span>
                  </div>

                  <p className="text-xs text-teal-300 font-medium bg-teal-500/10 py-1.5 px-3 rounded-lg border border-teal-500/20 inline-block">
                    Akses Langsung via Lynk
                  </p>
                </div>

                <div className="space-y-3">
                  <a href={LYNK_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <Button size="lg" className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-teal-500/25 group transition-all duration-300 hover:scale-105">
                      <span>Beli via Lynk Sekarang</span>
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </a>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Pembayaran Aman & Akses Otomatis</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
