import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_PAKET_URL } from './BerdayaHero';
import { GROWTH_LETTERS } from './berdayaValueData';

export const BerdayaGrowthSystem: React.FC = () => {
  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[600px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5 text-amber-400" />
            Metode Pertumbuhan
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Gunakan Framework G.R.O.W.T.H.
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Setelah akses dan resource mulai didapat, G.R.O.W.T.H. adalah metode yang menyusunnya menjadi pertumbuhan organisasi yang terkendali.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {GROWTH_LETTERS.map((g) => (
            <div key={g.letter} className="p-4 rounded-2xl bg-[#0A1D25] border border-white/10 text-center flex flex-col items-center gap-2">
              <span className="text-2xl font-black text-amber-400">{g.letter}</span>
              <span className="text-[11px] text-slate-300 leading-snug">{g.label}</span>
            </div>
          ))}
        </div>

        <blockquote className="max-w-2xl mx-auto text-center text-slate-200 text-sm sm:text-base italic border-l-2 border-amber-400 pl-5 sm:border-l-0 sm:pl-0 sm:border-t sm:pt-5 sm:border-white/10">
          "Buku menunjukkan cara membuka aksesnya. G.R.O.W.T.H. memberi metode pertumbuhannya. Impactory membantu organisasi menjalankannya sebagai sistem yang terintegrasi."
        </blockquote>

        <div className="mt-10 text-center">
          <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-teal-500/20 group transition-all">
              <span>Jalankan G.R.O.W.T.H. dengan Paket Berdaya</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
};

export default BerdayaGrowthSystem;
