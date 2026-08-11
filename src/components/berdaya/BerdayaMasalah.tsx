import React from 'react';
import { AlertTriangle, FileX, Clock, Database, SearchX, Coins } from 'lucide-react';

export const BerdayaMasalah: React.FC = () => {
  const problems = [
    {
      icon: FileX,
      title: "Proposal Sering Ditolak Donor",
      description: "Menyusun proposal dengan Logical Framework Analysis (LFA) dan narasi dampak sesuai standar donor internasional membutuhkan waktu berminggu-minggu dan sering kali kurang tepat sasaran."
    },
    {
      icon: Clock,
      title: "Waktu Habis untuk Admin Manual",
      description: "Tim lapangan & manajemen tenggelam dalam pengisian spreadsheet manual, pencatatan penerima manfaat yang tercecer, serta pelaporan keuangan yang tidak tersinkronisasi."
    },
    {
      icon: Database,
      title: "Sulit Membuktikan Nilai Dampak (SROI)",
      description: "Donor kini menuntut bukti kuantitatif (Social Return on Investment). Tanpa tool akuntabilitas yang tepat, organisasi kesulitan menunjukkan seberapa besar dampak dari setiap rupiah yang disalurkan."
    },
    {
      icon: SearchX,
      title: "Ketinggalan Informasi Peluang Grant",
      description: "Informasi hibah dan pendanaan dari lembaga donor nasional maupun internasional sering kali terlewat karena tidak adanya sistem pemantauan prospek yang terpusat."
    },
    {
      icon: Coins,
      title: "Biaya Software & Konsultan Mahal",
      description: "Software enterprise buatan luar negeri atau jasa konsultan manajemen program harganya sangat tinggi dan tidak sesuai dengan kapasitas anggaran yayasan lokal."
    },
    {
      icon: AlertTriangle,
      title: "Keberlanjutan Program Terancam",
      description: "Ketergantungan pada satu sumber pendanaan dan ketiadaan sistem CRM donor membuat organisasi rentan saat pendana utama menyelesaikan periode program."
    }
  ];

  return (
    <section className="py-20 bg-[#0A1D25] border-b border-white/5 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 mb-4">
            Tantangan Nyata Sektor Sosial
          </span>
          <p className="text-amber-300 font-semibold text-sm sm:text-base mb-3">
            Mendapatkan grant digital adalah awal. Mengelolanya adalah tantangan berikutnya.
          </p>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Grant Banyak, Sistem Nggak Ada?
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Banyak yayasan dan komunitatif hebat di Indonesia memiliki niat tulus, namun terhambat oleh keterbatasan sistem operasional dan akses pendanaan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((p, index) => {
            const Icon = p.icon;
            return (
              <div 
                key={index} 
                className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-rose-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-950/20"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-200 transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
