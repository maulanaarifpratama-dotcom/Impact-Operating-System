import React from 'react';
import { Megaphone, AppWindow, Cloud, Info } from 'lucide-react';

export const BerdayaCoreBenefits: React.FC = () => {
  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            Tiga Benefit Inti
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Nilai Akses Digital yang Bisa Dituju Organisasi Anda
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Tiga program resmi dari Google dan Microsoft yang menjadi fondasi nilai hingga Rp2,39 miliar per tahun*.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Google Ad Grants */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0A1D25] border border-white/10 hover:border-amber-500/40 transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Megaphone className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                Credit
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Google Ad Grants</h3>
            <p className="text-sm font-semibold text-amber-300 mb-3">Kredit iklan pencarian hingga Rp163 juta per bulan</p>
            <p className="text-sm text-slate-300 leading-relaxed flex-1">
              Ekuivalen hingga Rp1,956 miliar per tahun untuk organisasi yang memenuhi syarat, disetujui, dan menjaga kepatuhan akun.
            </p>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-white/10">
              Hanya untuk iklan Google Search. Bukan uang tunai dan tidak dapat dicairkan.
            </p>
          </div>

          {/* Microsoft 365 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0A1D25] border border-white/10 hover:border-teal-400/40 transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
                <AppWindow className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 uppercase tracking-wider">
                Free License
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Microsoft 365 untuk Nonprofit</h3>
            <p className="text-sm font-semibold text-teal-300 mb-3">Hingga 300 pengguna gratis</p>
            <ul className="text-sm text-slate-300 space-y-1.5 flex-1">
              <li>• Hingga 300 TB OneDrive (1 TB/pengguna)</li>
              <li>• Email organisasi &amp; Microsoft Teams</li>
              <li>• Word, Excel, PowerPoint, Outlook web/mobile</li>
              <li>• Microsoft 365 Copilot Chat termasuk</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-white/10">
              Estimasi penghematan lisensi hingga Rp410.760.000 per tahun dibanding harga komersial.
            </p>
          </div>

          {/* Azure Credit */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0A1D25] border border-white/10 hover:border-emerald-400/40 transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cloud className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wider">
                Cloud Credit
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Azure untuk Nonprofit</h3>
            <p className="text-sm font-semibold text-emerald-300 mb-3">Cloud credit hingga Rp32,6 juta per tahun</p>
            <p className="text-sm text-slate-300 leading-relaxed flex-1">
              Dapat membantu kebutuhan hosting, database, AI, penyimpanan, dan infrastruktur cloud sesuai layanan serta ketentuan program.
            </p>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-white/10">
              Bukan dana tunai. Perlu eligibility &amp; approval, dan diaktifkan ulang setiap tahun.
            </p>
          </div>

        </div>

        <div className="mt-8 flex items-start gap-2.5 max-w-3xl mx-auto text-xs text-slate-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>*Bukan dana tunai dan bukan jaminan approval. Nilai merupakan kombinasi kredit in-kind, estimasi penghematan lisensi, dan cloud credit bagi organisasi yang memenuhi syarat dan disetujui penyedia.</span>
        </div>

      </div>
    </section>
  );
};

export default BerdayaCoreBenefits;
