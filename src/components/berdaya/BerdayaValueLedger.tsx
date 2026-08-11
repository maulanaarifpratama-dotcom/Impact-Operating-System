import React from 'react';
import { Info, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL } from './BerdayaHero';
import { CORE_VALUE_LEDGER, CORE_VALUE_TOTAL_RP, FX_RATE_NOTE, formatRp } from './berdayaValueData';

export const BerdayaValueLedger: React.FC = () => {
  return (
    <section id="value-ledger" className="py-20 bg-[#0A1D25] border-b border-white/5 relative scroll-mt-20">
      <div className="container max-w-4xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            Rincian Angka
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Dari Mana Angka Rp2,39 Miliar Berasal?
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Tiga komponen ini dihitung tanpa tumpang tindih (no double counting) — OneDrive dan Copilot Chat sudah termasuk dalam nilai Microsoft 365, tidak dihitung terpisah.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-white/10 divide-y divide-white/10 overflow-hidden">
          {CORE_VALUE_LEDGER.map((item) => (
            <div key={item.key} className="p-5 sm:p-6 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  {item.type}
                </span>
                <p className="text-white font-semibold mt-1.5 text-sm sm:text-base">{item.name}</p>
              </div>
              <span className="text-amber-300 font-bold text-sm sm:text-lg text-right shrink-0 tabular-nums">
                {formatRp(item.annualRp)}
                <span className="block text-[10px] font-normal text-slate-500 text-right">/ tahun</span>
              </span>
            </div>
          ))}
          <div className="p-5 sm:p-6 flex items-center justify-between gap-4 bg-slate-950/60">
            <span className="text-white font-black text-sm sm:text-lg">Total Nilai Inti</span>
            <span className="text-emerald-400 font-black text-lg sm:text-2xl tabular-nums">{formatRp(CORE_VALUE_TOTAL_RP)}<span className="text-xs sm:text-sm font-semibold text-slate-400"> /tahun</span></span>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-xs text-slate-400 max-w-2xl mx-auto">
          <p className="flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>*Terdiri atas kredit iklan in-kind, estimasi penghematan lisensi, dan cloud credit. Bukan dana tunai. Memerlukan eligibility, approval, kepatuhan, dan pemanfaatan aktif.</span></p>
          <p className="flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>{FX_RATE_NOTE}</span></p>
        </div>

        <div className="mt-10 text-center">
          <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all">
              <BookOpen className="mr-2 w-5 h-5" />
              <span>Pelajari Cara Mengaksesnya di Buku — Rp129.000</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
};

export default BerdayaValueLedger;
