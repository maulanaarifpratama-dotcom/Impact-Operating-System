import React from 'react';
import { BookOpen, Target, Sparkles, BarChart3, UserCheck, ShieldCheck } from 'lucide-react';

export const BerdayaPelajaran: React.FC = () => {
  const learningPoints = [
    {
      icon: Target,
      tag: "Strategi Program",
      title: "Penyusunan LFA & Theory of Change",
      desc: "Kuasai cara menyusun matriks Logical Framework Analysis (LFA) yang disukai donor global, lengkap dengan indikator capaian, asumsi risiko, dan verifikasi objek."
    },
    {
      icon: Sparkles,
      tag: "AI & Otomasi",
      title: "Generasi Proposal Kilat Berbasis AI",
      desc: "Pelajari metode akselerasi penulisan proposal hibah menggunakan Impactory GrantWriter AI agar draf proposal siap dalam hitungan jam, bukan minggu."
    },
    {
      icon: BarChart3,
      tag: "Akuntabilitas Dampak",
      title: "Kalkulasi SROI & EROI Kuantitatif",
      desc: "Pahami metodologi perhitungan Social Return on Investment (SROI) untuk membuktikan setiap nominal pendanaan menghasilkan dampak sosial yang nyata dan terukur."
    },
    {
      icon: UserCheck,
      tag: "Fundraising & CRM",
      title: "Manajemen Hubungan Donor (Donor CRM)",
      desc: "Kelola jaringan pendana, saluran komitmen donasi, serta strategi retensi donor agar organisasi memiliki fondasi pendanaan yang lebih berkelanjutan."
    },
    {
      icon: ShieldCheck,
      tag: "Standar Operasional",
      title: "Tata Kelola & Kepatuhan Organisasi",
      desc: "Terapkan scorecard kesiapan operasional, pelaporan bulanan instan (Monthly Operating Review), serta manajemen pendaftaran penerima manfaat secara terorganisir."
    },
    {
      icon: BookOpen,
      tag: "Knowledge Base",
      title: "Akses Library Standard operating Procedure (SOP)",
      desc: "Akses ratusan template SOP, panduan legalitas, serta studi kasus terbaik manajemen program sosial di Indonesia."
    }
  ];

  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            Materi & Kapabilitas Utama
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Apa yang Akan Anda Pelajari & Kuasai?
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Paket Berdaya tidak hanya memberikan perangkat lunak, tetapi juga membekali tim Anda dengan keahlian strategis standar profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {learningPoints.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-[#0A1D25] border border-teal-500/20 hover:border-teal-400/50 transition-all duration-300 flex flex-col justify-between group hover:shadow-lg hover:shadow-teal-900/30"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-teal-400 bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-800/40">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-200 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
