import React from 'react';
import { Layers, Link2, Sparkles, CheckCircle, ArrowRight, ShieldCheck, BookOpen, Cpu, XCircle } from 'lucide-react';
import { LYNK_URL } from './BerdayaHero';
import { Button } from '@/components/ui/button';

export const BerdayaEkosistemHub: React.FC = () => {
  const tools = [
    { name: "Google Workspace", role: "Dokumen & Drive", color: "from-blue-500/20 to-red-500/20", borderColor: "border-blue-500/30", iconColor: "text-blue-400" },
    { name: "Microsoft 365", role: "Spreadsheet & Word", color: "from-blue-600/20 to-teal-500/20", borderColor: "border-blue-600/30", iconColor: "text-sky-400" },
    { name: "Canva Pro", role: "Desain & Media Sosial", color: "from-cyan-500/20 to-purple-500/20", borderColor: "border-cyan-500/30", iconColor: "text-cyan-400" },
    { name: "Azure Cloud", role: "Infrastruktur Data", color: "from-sky-500/20 to-indigo-500/20", borderColor: "border-sky-500/30", iconColor: "text-indigo-400" },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#0D2530] via-[#0A1D25] to-[#081820] border-b border-white/10 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Fondasi Utama Pertumbuhan Organisasi</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Alat Canggih Banyak,<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
              Tapi Mengapa Tetap Sulit Berkembang?
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-xl leading-relaxed text-balance">
            Google ada. Microsoft ada. Canva ada. Azure ada.<br className="hidden sm:inline" />
            Namun banyak organisasi tetap kesulitan karena <strong className="text-white">tidak memiliki sistem yang menghubungkan semuanya</strong>.
          </p>
        </div>

        {/* Existing Tools Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {tools.map((tool, idx) => (
            <div 
              key={idx}
              className={`p-5 rounded-2xl bg-gradient-to-br ${tool.color} bg-slate-900/60 border ${tool.borderColor} backdrop-blur-md flex flex-col items-center text-center space-y-2 transition-all duration-300 hover:scale-105 hover:shadow-lg`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-base">
                {tool.name.charAt(0)}
              </div>
              <h4 className="text-sm font-bold text-white">{tool.name}</h4>
              <p className="text-xs text-slate-300">{tool.role}</p>
              <span className="inline-block text-[10px] font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40 mt-1">
                Terpisah (Silo)
              </span>
            </div>
          ))}
        </div>

        {/* Comparison Showcase: Fragmented vs Integrated System */}
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-teal-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: The Problem - Fragmented Tools */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <XCircle className="w-5 h-5" />
              <span>Tanpa System Orchestrator</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Data Tercecer & Koordinasi Lambat
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Copy-paste data manual dari Google Forms ke Excel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Proposal dibuat acak tanpa matriks LFA standar donor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Laporan dampak kualitatif tanpa angka SROI/EROI</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Ketergantungan penuh pada individu, bukan sistem</span>
              </li>
            </ul>
          </div>

          {/* Center Connector */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 animate-bounce">
              <Link2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              Solusi Terpadu
            </span>
          </div>

          {/* Right: The Solution - Buku & Paket Berdaya */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-teal-950/60 to-emerald-950/60 border border-teal-500/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Dengan Buku & Paket Berdaya</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Sistem Fondasi Pertumbuhan Sejati
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>Buku & Paket Berdaya</strong> menghubungkan seluruh aktivitas operasional, proposal AI, perencanaan LFA, pengukuran SROI, serta pengelolaan donor dalam satu pusat komando yang siap pakai.
            </p>
            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-xl bg-teal-900/40 border border-teal-500/30 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <strong className="text-white block">Buku Berdaya (Playbook Fondasi)</strong>
                  <span className="text-slate-300">Panduan strategi, SOP, dan mindset organisasi modern</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-900/40 border border-teal-500/30 flex items-center gap-3">
                <Cpu className="w-5 h-5 text-teal-400 shrink-0" />
                <div className="text-xs">
                  <strong className="text-white block">Paket Berdaya (Platform & Tools)</strong>
                  <span className="text-slate-300">Software Impactory terintegrasi + Wakaf Masjid Ar-Rustendi</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <a href={LYNK_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-xl shadow-teal-500/20 group transition-all duration-300 hover:scale-105">
              <span>Mulai Bangun Fondasi Sistem Sekarang</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
};
