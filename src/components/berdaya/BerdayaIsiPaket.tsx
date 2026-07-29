import React from 'react';
import { Check, Cpu, FileText, Video, Users, HeartHandshake, Sparkles } from 'lucide-react';

export const BerdayaIsiPaket: React.FC = () => {
  const packageContents = [
    {
      icon: Cpu,
      title: "Buku & Platform Impactory",
      subtitle: "Akses Playbook & Software Utama",
      items: [
        "Buku Berdaya: Playbook Fondasi System Orchestration",
        "Akses Impactory GrantWriter AI (Generasi Proposal)",
        "Akses Impactory LFA Builder (Logframe Matrix)",
        "Akses Impactory Impact Dashboard & SROI Calculator",
        "Akses Resource Access Tracker & Donor CRM"
      ],
      badge: "Buku & Software"
    },
    {
      icon: FileText,
      title: "Bundle Template & SOP Pustaka",
      subtitle: "Dokumen Operasional Siap Pakai",
      items: [
        "Template Proposal Hibah Standar Donor Global",
        "SOP Keuangan, Pengadaan & Pengawasan Lapangan",
        "Checklist Kepatuhan & Audit Kesiapan Organisasi",
        "Database Prospek & Peluang Grant Pilihan",
        "Panduan Integrasi Indikator Keberhasilan"
      ],
      badge: "Ready Documents"
    },
    {
      icon: Video,
      title: "Modul & Video Guidance",
      subtitle: "Panduan Langkah demi Langkah",
      items: [
        "Video Tutorial Penggunaan Platform Impactory",
        "Modul Strategi Menulis Proposal Lolos Donor",
        "Panduan Metode Monetisasi Dampak Sosial (SROI)",
        "Studi Kasus Best Practices Yayasan Sukses",
        "Update Ringkasan Regulasi Sektor Sosial"
      ],
      badge: "Learning Hub"
    },
    {
      icon: Users,
      title: "Pendampingan & Komunitas",
      subtitle: "Jaringan & Sesi Konsultasi",
      items: [
        "Akses Komunitas Penggerak Berdaya",
        "Sesi Tanya Jawab & Q&A Rutin Bersama Ekspert",
        "Jaringan Kolaborasi Antar-Lembaga Sosial",
        "Dukungan Layanan Pelanggan (Customer Support)",
        "Update Fitur & Pembaharuan Sistem Berkala"
      ],
      badge: "Support Network"
    }
  ];

  return (
    <section id="isi-paket" className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            Komponen Terpadu
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Apa Saja yang Anda Dapatkan di Paket Berdaya?
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Satu investasi untuk mentransformasi operasional, meningkatkan kapasitas tim, dan membuka peluang pendanaan baru secara efisien.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {packageContents.map((pkg, idx) => {
            const Icon = pkg.icon;
            return (
              <div 
                key={idx}
                className="p-8 rounded-3xl bg-[#0A1D25] border border-white/10 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                {/* Glow Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {pkg.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">
                    {pkg.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mb-6">
                    {pkg.subtitle}
                  </p>

                  <ul className="space-y-3 mb-6">
                    {pkg.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bonus Wakaf Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-[#0A1D25] to-teal-950/60 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mx-auto sm:mx-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nilai Keberkahan Tambahan</span>
              </div>
              <h4 className="text-xl font-bold text-white">
                Sudah Termasuk Wakaf Masjid Ar-Rustendi
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Setiap pembelian Paket Berdaya secara otomatis berkontribusi dalam program Wakaf Pembangunan & Operasional Masjid Ar-Rustendi.
              </p>
            </div>
          </div>
          <a href="#wakaf" className="shrink-0">
            <span className="px-5 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30 inline-block transition-colors">
              Pelajari Program Wakaf &rarr;
            </span>
          </a>
        </div>

      </div>
    </section>
  );
};
