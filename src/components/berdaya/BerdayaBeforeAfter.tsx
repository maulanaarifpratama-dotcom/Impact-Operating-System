import React from 'react';
import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const BerdayaBeforeAfter: React.FC = () => {
  const comparisons = [
    {
      before: "Penyusunan proposal butuh waktu berminggu-minggu dan sering kali ditolak donor karena narasi kurang pas.",
      after: "Proposal AI otomatis siap dalam hitungan jam lengkap dengan narasi LFA standar donor internasional."
    },
    {
      before: "Logframe & KPI program dibuat sekadarnya, membingungkan tim M&E dan staf di lapangan.",
      after: "Matriks LFA & jadwal WBS tersusun rapi dengan indikator capaian dan verifikasi yang terstruktur."
    },
    {
      before: "Laporan dampak hanya berupa cerita kualitatif tanpa angka monetisasi yang valid (SROI).",
      after: "Perhitungan nilai Social Return on Investment (SROI) & EROI kuantitatif yang transparan dan dapat diaudit."
    },
    {
      before: "Data penerima manfaat & prospek donor tercecer di berbagai file Excel dan chat WhatsApp.",
      after: "Sistem CRM Donor & registrasi penerima manfaat tersentralisasi dalam satu dashboard terpadu."
    },
    {
      before: "Organisasi rentan terhenti operasionalnya saat pendana/grant utama menyelesaikan periode program.",
      after: "Sistem fondasi mandiri + keberlanjutan dampak dengan keberkahan Wakaf Masjid Ar-Rustendi."
    }
  ];

  return (
    <section className="py-24 bg-[#0A1D25] border-b border-white/10 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20">
            Transformasi Nyata Organisasi
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Sebelum vs Sesudah Memiliki Sistem
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Lihat perubahan nyata yang dialami organisasi setelah mengimplementasikan Buku & Paket Berdaya.
          </p>
        </div>

        <div className="space-y-4 max-w-5xl mx-auto">
          {comparisons.map((c, idx) => (
            <div 
              key={idx}
              className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:border-teal-500/30 transition-colors"
            >
              
              {/* Before Column */}
              <div className="md:col-span-5 p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                    Sebelum (Tanpa Sistem)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {c.before}
                  </p>
                </div>
              </div>

              {/* Arrow Divider Column */}
              <div className="md:col-span-2 flex justify-center">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
                </div>
              </div>

              {/* After Column */}
              <div className="md:col-span-5 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    Sesudah (Buku & Paket Berdaya)
                  </span>
                  <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                    {c.after}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
