import React from 'react';
import { Building2, UserCheck, HeartHandshake, Rocket, GraduationCap } from 'lucide-react';

export const BerdayaTargetPengguna: React.FC = () => {
  const targets = [
    {
      icon: Building2,
      title: "Pimpinan & Pengurus Yayasan / NGO",
      desc: "Untuk direktur eksekutif atau pengurus yayasan yang ingin mentransformasi tata kelola organisasi menjadi lebih akuntabel, profesional, dan siap diaudit donor."
    },
    {
      icon: UserCheck,
      title: "Manager Program & Tim M&E",
      desc: "Untuk praktisi lapangan yang ingin merancang LFA, menyusun jadwal WBS, mengelola data penerima manfaat, dan menerbitkan laporan dampak bulanan secara efisien."
    },
    {
      icon: HeartHandshake,
      title: "Fundraiser & Partnership Officer",
      desc: "Untuk tim pengembangan pendanaan yang membutuhkan kepastian draf proposal hibah berkualitas tinggi serta sistem pelacakan prospek donor CRM."
    },
    {
      icon: Rocket,
      title: "Penggerak Komunitas & Inisiatif Sosial",
      desc: "Untuk gerakan pemuda dan komunitas lokal yang ingin menaikkan level keorganisasian agar berbadan hukum dan layak mendapatkan hibah pendanaan."
    },
    {
      icon: GraduationCap,
      title: "Social Entrepreneur & Konsultan Dampak",
      desc: "Untuk wirausaha sosial dan konsultan yang ingin mengukur Social Return on Investment (SROI) dari setiap proyek intervensi yang dijalankan."
    }
  ];

  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            Pengguna Sasaran
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Siapa yang Sangat Membutuhkan Paket Berdaya?
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Dirancang fleksibel untuk mendukung berbagai peran kunci di ekosistem nirlaba dan pemberdayaan masyarakat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targets.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-[#0A1D25] border border-white/10 hover:border-teal-400/40 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-200 transition-colors">
                  {t.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
