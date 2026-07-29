import React from 'react';
import { Check, Sparkles, ArrowRight, BookOpen, Layers, ShieldCheck, HeartHandshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL, LYNK_PAKET_URL } from './BerdayaHero';

export const BerdayaPilihJalur: React.FC = () => {
  return (
    <section id="pilih-jalur" className="py-24 bg-[#0A1D25] border-b border-white/10 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[700px] bg-teal-500/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20">
            Penawaran Resmi Impactory
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Pilih Jalur Pertumbuhan Anda
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Dua pilihan investasi cerdas untuk membantu organisasi Anda membangun fondasi sistemik dan akselerasi pendanaan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Card 1: Ebook Only */}
          <div className="lg:col-span-5 p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all duration-300 flex flex-col justify-between shadow-2xl relative group">
            
            <div>
              {/* Product Visual Thumbnail */}
              <div className="w-full h-56 rounded-2xl bg-[#07161E] border border-white/10 p-4 mb-6 flex items-center justify-center overflow-hidden group-hover:border-amber-500/30 transition-colors">
                <img 
                  src="/images/ebook_grant_banyak_sistem_gak_ada.png" 
                  alt="Ebook Grant Banyak, Sistem Nggak Ada" 
                  className="h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Opsi Playbook Fondasi</span>
              </div>

              <h3 className="text-2xl font-black text-white">
                Buku: "Grant Banyak, Sistem Nggak Ada"
              </h3>
              
              <p className="text-sm text-slate-300 mt-2 mb-6">
                Ebook panduan komprehensif (Master Blueprint) untuk pimpinan NGO & aktivis sosial yang ingin mengubah arus hibah digital menjadi mesin pertumbuhan organisasi yang terstruktur.
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Ebook PDF Lengkap</strong> (Grant Banyak, Sistem Nggak Ada)</span>
                </li>

                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Mindset System Orchestration</strong> untuk Organisasi Nirlaba</span>
                </li>

                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Framework Integrasi Tools</strong> (Google, Microsoft, Canva, Azure)</span>
                </li>

                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Akses Pengunduhan Langsung</strong> via Lynk Checkout</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10">
              <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all duration-300">
                  <span>Beli Ebook Only di Lynk</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </div>

          {/* Card 2: Paket Berdaya Complete (FEATURED) */}
          <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0D2530] via-[#0A1D25] to-[#081820] border-2 border-teal-500/50 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            
            {/* Top Recommended Ribbon Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-emerald-500 text-slate-950 font-black text-xs uppercase px-6 py-2 rounded-bl-2xl tracking-wider shadow-lg flex items-center gap-1.5 z-20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Solusi Komplit All-in-One</span>
            </div>

            <div>
              {/* Product Visual Asset */}
              <div className="w-full h-64 rounded-2xl bg-[#07161E] border border-teal-500/30 p-4 mb-6 flex items-center justify-center overflow-hidden relative">
                <img 
                  src="/images/paket_berdaya.png" 
                  alt="Paket Berdaya Impactory Visual Asset" 
                  className="h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 mb-3">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Paket Berdaya Complete + Software + Wakaf</span>
              </div>

              <h3 className="text-3xl font-black text-white">
                Paket Berdaya Complete System
              </h3>
              
              <p className="text-sm text-slate-300 mt-2 mb-6">
                Pilihan paling diminati! Dapatkan Buku Playbook + Lisensi Software Platform Impactory + Bundle Template SOP + Video Modul + Komunitas + Kontribusi Wakaf Masjid Ar-Rustendi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <div className="flex items-start gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Ebook Buku Berdaya</strong> Master Blueprint</span>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Impactory GrantWriter AI</strong> Proposal Auto</span>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>LFA Builder & WBS</strong> Standard Donor</span>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Impact Calculator</strong> (SROI & EROI)</span>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Resource & Donor CRM</strong> Prospek Hibah</span>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-emerald-300 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20 sm:col-span-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Termasuk Wakaf Pembangunan & Operasional Masjid Ar-Rustendi</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button size="lg" className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-lg py-7 rounded-xl shadow-xl shadow-teal-500/30 group transition-all duration-300 hover:scale-[1.02]">
                  <span>Beli Paket Berdaya Complete di Lynk</span>
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
