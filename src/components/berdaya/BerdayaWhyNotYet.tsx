import React from 'react';
import { HelpCircle, AlertCircle, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL } from './BerdayaHero';
import { WHY_NOT_YET_PROBLEMS } from './berdayaValueData';

export const BerdayaWhyNotYet: React.FC = () => {
  return (
    <section className="py-20 bg-[#0A1D25] border-b border-white/5 relative">
      <div className="container max-w-4xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            <HelpCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
            Peluang Besar, Akses Terbatas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Mengapa Benefit Sebesar Ini Masih Terlewat oleh Banyak Organisasi?
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Bukan karena organisasinya tidak layak. Sering kali informasinya tersebar, jalur pengajuannya berbeda-beda, dan prosesnya tidak dikelola sebagai satu sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
          {WHY_NOT_YET_PROBLEMS.map((p) => (
            <div key={p.title} className="p-5 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-2.5" />
              <p className="text-sm font-bold text-white mb-1">{p.title}</p>
              <p className="text-xs text-slate-400">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center space-y-5">
          <p className="text-slate-300 text-sm sm:text-base italic">
            Buku Berdaya menyusun potongan informasi tersebut menjadi panduan yang lebih terarah untuk NGO Indonesia.
          </p>
          <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-7 py-6 rounded-xl shadow-lg shadow-amber-500/20 group transition-all">
              <BookOpen className="mr-2 w-5 h-5" />
              <span>Pelajari Metodenya di Dalam Buku</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
};

export default BerdayaWhyNotYet;
