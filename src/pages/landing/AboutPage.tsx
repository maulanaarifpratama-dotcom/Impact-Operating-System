import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/layout/Footer';
import { NewsletterSection } from '@/components/landing/NewsletterSection';
import { Card } from '@/components/ui/card';
import { 
  Award, 
  BookOpen, 
  ChevronRight, 
  Coins, 
  LineChart, 
  ShieldAlert, 
  Users, 
  Zap, 
  Compass, 
  Flag, 
  CheckCircle2 
} from 'lucide-react';

export default function AboutPage() {
  const metrics = [
    { value: "100.000+", label: "Yayasan terdaftar di Indonesia", desc: "Mulai dari komunitas lokal hingga yayasan nasional berskala besar." },
    { value: "500.000+", label: "NGO di Asia", desc: "Menghadapi tantangan kepatuhan donor, transparansi data, dan akuntabilitas dampak." },
    { value: "0", label: "Software lokal sebelum Impactory", desc: "Satu-satunya sistem manajemen program berbasis kearifan sektor sosial lokal." }
  ];

  const growthFramework = [
    { code: "G", title: "Grant and Resource Access", desc: "Akses dan persiapan pendanaan serta manajemen prospek filantropi secara tersentralisasi.", icon: Coins, color: "from-amber-500 to-orange-600" },
    { code: "R", title: "Readiness and Baseline", desc: "Asesmen kepatuhan internal organisasi dan standarisasi operasional minimum standar donor.", icon: ShieldAlert, color: "from-teal-500 to-[#1D7A75]" },
    { code: "O", title: "Operating Program", desc: "Eksekusi alur kerja logis (LFA), penjadwalan WBS, manajemen anggaran, dan registrasi penerima manfaat.", icon: Zap, color: "from-blue-500 to-indigo-600" },
    { code: "W", title: "Work Evidence and Proof", desc: "Pengumpulan bukti kerja lapangan, sinkronisasi file awan, dan validasi fisik aktivitas program.", icon: BookOpen, color: "from-purple-500 to-pink-600" },
    { code: "T", title: "Tracking and Monitoring", desc: "Pengawasan performa indikator keberhasilan secara dinamis menggunakan metrik SROI dan E-ROI.", icon: LineChart, color: "from-rose-500 to-red-600" },
    { code: "H", title: "High-Impact Reporting", desc: "Penyusunan laporan dampak komprehensif, infografis donor, dan tinjauan bulanan instan.", icon: Award, color: "from-emerald-500 to-teal-600" }
  ];

  return (
    <div className="min-h-screen bg-[#0A1D25] text-white selection:bg-teal-500 selection:text-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 border-b border-white/5">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-12 left-10 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container max-w-6xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-400 border border-teal-500/20 mb-6 uppercase tracking-wider">
            Cerita di Balik Impactory
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Dibangun dari dalam NGO, untuk NGO
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Bukan tool buatan orang IT yang belum pernah nulis proposal. Impactory lahir dari pengalaman langsung di sektor sosial Indonesia.
          </p>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 sm:py-24 border-b border-white/5 relative">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Left side: Bio */}
            <div className="md:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-400 tracking-widest uppercase">Sang Pendiri</span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
                Maulana Arif Pratama
              </h2>
              <p className="text-sm text-teal-400 font-semibold uppercase tracking-wider">
                Founder & CEO, Impactory
              </p>
              <blockquote className="border-l-2 border-teal-500 pl-4 italic text-slate-300 text-sm leading-relaxed">
                "8 tahun di sektor sosial Indonesia. Founder Yayasan Bisa Baik Bersama."
              </blockquote>
              <p className="text-xs text-slate-400 leading-relaxed">
                Menghabiskan waktu bertahun-tahun di garis depan implementasi sosial memberi saya pemahaman mendalam tentang rasa sakit administratif yang dihadapi tim NGO setiap hari. Kami menciptakan Impactory untuk menjembatani jurang pemisah antara niat baik di lapangan dan tuntutan profesionalisme donor global.
              </p>
              <div>
                <a 
                  href="mailto:arif@impactory.id" 
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors group"
                >
                  Lihat profil lengkap <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right side: Photo Card */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-[#1D7A75] rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <Card className="relative bg-[#0E2833] border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center w-64 h-64 shadow-2xl">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-teal-500 to-[#1D7A75] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-teal-500/20 mb-4">
                    MAP
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">Maulana Arif Pratama</h3>
                  <p className="text-xs text-slate-400 mt-1">Founder, Impactory</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-24 bg-[#081820] border-b border-white/5 relative">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500/10 items-center justify-center text-teal-400 border border-teal-500/20 mb-6">
            <Flag className="h-5 w-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">Misi Kami</h2>
          <p className="mt-6 text-base sm:text-lg text-slate-200 leading-relaxed max-w-3xl mx-auto italic font-medium">
            "Kami percaya program yang berdampak besar layak dikelola dengan sistem yang sama besarnya. Impactory hadir agar pengelola NGO bisa fokus pada programnya — bukan pada administrasinya."
          </p>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-16 sm:py-24 border-b border-white/5">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {metrics.map((m, idx) => (
              <Card key={idx} className="bg-[#0E2833]/40 border-white/5 hover:border-white/10 transition-all rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-full relative group shadow-lg">
                <div className="space-y-4">
                  <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-teal-400 to-[#1D7A75] bg-clip-text text-transparent">
                    {m.value}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{m.label}</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* G.R.O.W.T.H Framework Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[#081820]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="container max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-teal-400 tracking-widest uppercase">Kerangka Kerja G.R.O.W.T.H.</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight mt-3">
              Standardisasi Skalabilitas NGO
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
              Metodologi komprehensif yang dirancang untuk mempertemukan akuntabilitas operasional dengan ketatnya standardisasi internasional.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {growthFramework.map((f) => (
              <Card key={f.code} className="bg-[#0E2833]/50 border-white/5 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-black text-teal-400">{f.code}</span>
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      <f.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-slate-200 mt-4 leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <NewsletterSection />
      <Footer />
    </div>
  );
}
