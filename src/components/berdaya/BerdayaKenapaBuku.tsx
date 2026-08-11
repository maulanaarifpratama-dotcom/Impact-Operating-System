import React from 'react';
import { BookOpen, Sparkles, AlertCircle, CheckCircle, HeartHandshake, ShieldCheck } from 'lucide-react';

export const BerdayaKenapaBuku: React.FC = () => {
  return (
    <section className="py-24 bg-[#0D2530] border-b border-white/10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Visual Book Asset */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group max-w-sm w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-teal-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-80 transition duration-300" />
              
              <div className="relative p-6 rounded-3xl bg-[#0A1D25] border border-white/20 shadow-2xl flex flex-col items-center">
                <img 
                  src="/images/ebook_grant_banyak_sistem_gak_ada.png" 
                  alt="Buku Grant Banyak, Sistem Nggak Ada" 
                  className="w-full h-auto object-contain rounded-2xl shadow-2xl"
                />
                <div className="mt-4 text-center">
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Peta & Tutor Akses Grant Digital
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Storytelling Narrative */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Latar Belakang & Filosofi</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Kenapa Buku Ini Ditulis?
            </h2>

            <div className="space-y-4 text-slate-300 text-base sm:text-lg leading-relaxed">
              <p>
                Selama bertahun-tahun di sektor sosial Indonesia, kami menyaksikan pola yang sama berulang kali: <strong className="text-white">Banyak NGO dan yayasan luar biasa yang niatnya tulus dan program lapangannya hebat, namun akhirnya tumbang atau stagnan.</strong>
              </p>

              <p>
                Bukan karena kekurangan dana, melainkan karena <strong className="text-amber-300">ketiadaan sistem (System Orchestration)</strong>. Pengurus kelelahan mengurusi administrasi manual, proposal dibuat mendadak tanpa standar donor, dan data penerima manfaat tercecer di berbagai spreadsheet.
              </p>

              <p>
                Google ada. Microsoft ada. Canva ada. Azure ada. Namun tanpa sistem yang menjahit semuanya, alat-alat tersebut hanya menjadi pulau-pulau terpisah.
              </p>

              <p className="text-white font-semibold pt-2 border-l-4 border-amber-400 pl-4 bg-white/5 py-3 rounded-r-xl">
                "Buku 'Grant Banyak, Sistem Nggak Ada' dan Paket Berdaya hadir sebagai blueprint praktis untuk membantu pimpinan dan aktivis sosial membangun mesin pertumbuhan yang mandiri, akuntabel, dan berkelanjutan."
              </p>

              <p>
                Buku ini berfungsi sebagai <strong className="text-white">peta dan tutor</strong> yang menyusun peluang yang tersebar menjadi satu playbook terarah — dari mengenali benefit, menentukan prioritas akses, membangun kesiapan organisasi, hingga mengelola benefit yang telah diperoleh.
              </p>
            </div>

            <ul className="space-y-2.5">
              {[
                'Peta ekosistem grant digital dan benefit nonprofit',
                'Framework menentukan prioritas akses',
                'Panduan membangun kesiapan organisasi',
                'Sistem mengelola benefit yang telah diperoleh',
                'Fondasi menuju G.R.O.W.T.H. dan Impactory',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 text-sm text-slate-400 italic">
              <p>Buku tidak menjamin approval. Buku tidak memberikan dana tunai. Buku memberikan peta, metode, tutorial, dan sistem kesiapan.</p>
              <p>Detail langkah, urutan, preparedness checklist, dan panduan implementasi tersedia di dalam buku.</p>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Ditulis dari Pengalaman Nyata</h4>
                  <p className="text-xs text-slate-400">Bukan teori akademis, tapi pengalaman empiris di lapangan.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Dampak & Keberkahan</h4>
                  <p className="text-xs text-slate-400">Dilengkapi dengan niat Wakaf Masjid Ar-Rustendi.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
