import React from 'react';
import { Layers, ShieldQuestion, BookLock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL } from './BerdayaHero';
import { ADDITIONAL_BENEFIT_GROUPS, ACCESS_TEASERS } from './berdayaValueData';

const badgeStyle = (badge: string) => {
  switch (badge) {
    case 'GRATIS':
    case 'TERMASUK':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'DISKON':
      return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
    case 'KREDIT':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  }
};

export const BerdayaAdditionalBenefits: React.FC = () => {
  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            <Layers className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
            Benefit Tambahan
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Belum Termasuk Puluhan Program Lainnya
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Belum termasuk potensi penghematan software lain hingga puluhan atau ratusan juta rupiah per tahun, sesuai skala organisasi dan program yang disetujui.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ADDITIONAL_BENEFIT_GROUPS.map((group) => (
            <div key={group.title} className="p-5 sm:p-6 rounded-2xl bg-[#0A1D25] border border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{group.title}</h3>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle(item.badge)}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Curiosity Gap: access isn't always straightforward */}
        <div className="mt-14 text-center max-w-2xl mx-auto mb-8">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 mb-4">
            <ShieldQuestion className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
            Aksesnya Tidak Selalu Langsung
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Benefitnya Terlihat. Jalur Mendapatkannya Tidak Selalu Sederhana.
          </h3>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Setiap program memiliki mekanisme verifikasi, persyaratan, urutan pengajuan, dan masa berlaku yang berbeda. Kesalahan kecil dapat membuat proses tertunda atau benefit yang sudah diperoleh tidak termanfaatkan maksimal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {ACCESS_TEASERS.map((t) => (
            <div key={t.title} className="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <p className="text-sm font-bold text-white mb-1">{t.title}</p>
              <p className="text-xs text-slate-400">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Locked-Knowledge Panel */}
        <div className="mt-10 p-6 sm:p-10 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-[#0A1D25] border border-amber-500/30 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BookLock className="w-7 h-7" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-white">Panduan Lengkapnya Ada di Dalam Buku</h3>
            <p className="mt-2 text-sm text-slate-300">
              Buku "Grant Banyak, Sistem Nggak Ada" membantu Anda memahami jalur akses, prioritas pengajuan, kesiapan organisasi, dan cara mengelola benefit setelah diperoleh.
            </p>
          </div>
          <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 text-center">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-6 py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all">
              <span>Buka Panduan Lengkap</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-[11px] text-amber-300/80 font-semibold mt-2">Mulai dari Rp129.000</p>
          </a>
        </div>

      </div>
    </section>
  );
};

export default BerdayaAdditionalBenefits;
