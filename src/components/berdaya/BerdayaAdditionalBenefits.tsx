import React from 'react';
import { Layers, DoorOpen } from 'lucide-react';
import { ADDITIONAL_BENEFIT_GROUPS, GATEWAY_PROGRAMS } from './berdayaValueData';

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

        {/* Gateway Programs */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-white/10">
          <div className="flex items-center gap-2 mb-5">
            <DoorOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Gateway Verifikasi yang Perlu Didaftarkan Lebih Dulu</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GATEWAY_PROGRAMS.map((gw) => (
              <div key={gw.name} className="flex items-start gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-500/30 bg-slate-500/10 text-slate-300 shrink-0 mt-0.5">
                  GATEWAY
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{gw.name}</p>
                  <p className="text-xs text-slate-400">{gw.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default BerdayaAdditionalBenefits;
