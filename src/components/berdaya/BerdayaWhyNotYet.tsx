import React from 'react';
import { HelpCircle, XCircle } from 'lucide-react';
import { WHY_NOT_YET_REASONS } from './berdayaValueData';

export const BerdayaWhyNotYet: React.FC = () => {
  return (
    <section className="py-20 bg-[#0A1D25] border-b border-white/5 relative">
      <div className="container max-w-4xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 mb-4">
            <HelpCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
            Pertanyaan yang Wajar
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Kalau Benefitnya Sebesar Itu, Kenapa Banyak NGO Belum Mendapatkannya?
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Bukan karena programnya tertutup. Biasanya karena hal-hal kecil ini yang belum dibenahi:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {WHY_NOT_YET_REASONS.map((reason) => (
            <div key={reason} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-white/10">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-300">{reason}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default BerdayaWhyNotYet;
