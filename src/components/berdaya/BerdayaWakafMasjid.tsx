import React from 'react';
import { Landmark, Heart, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const BerdayaWakafMasjid: React.FC = () => {
  return (
    <section id="wakaf" className="py-20 bg-[#0A1D25] border-b border-white/5 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0D2530] to-[#081820] border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Landmark className="w-4 h-4 text-emerald-400" />
                <span>Program Wakaf & Social Responsibility</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Wakaf Masjid Ar-Rustendi
              </h2>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Setiap transaksi <strong className="text-white">Paket Berdaya</strong> tidak hanya membawa kemajuan operasional bagi organisasi Anda, tetapi juga diniatkan menjadi amal jariah yang terus mengalir melampaui usia.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Alokasi Transparan untuk Pembangunan & Operasional</h4>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Sebagian dari nilai pembelian Paket Berdaya dialokasikan secara khusus untuk mendukung pembangunan fasilitas dan kegiatan ibadah/dakwah di Masjid Ar-Rustendi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Amal Jariah Berkelanjutan (Sustainable Charity)</h4>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Menjadikan ikhtiar penguatan organisasi sosial beriringan dengan tabungan kebaikan akhirat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Laporan Keterbukaan & Akuntabilitas</h4>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Progres penyaluran wakaf dilaporkan secara berkala kepada seluruh pembeli Paket Berdaya sebagai komitmen transparansi Impactory.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/20 text-center space-y-6 shadow-xl relative">
                
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Heart className="w-10 h-10 animate-pulse" />
                </div>

                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                    Niat & Keberkahan
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    "Memberdayakan Sektor Sosial, Membangun Rumah di Syurga"
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Sinergi antara modernisasi teknologi manajemen dampak sosial dan penguatan sarana ibadah masyarakat.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Akuntabel & Terverifikasi Langsung oleh Tim Impactory</span>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
