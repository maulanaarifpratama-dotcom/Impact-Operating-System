import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, FileText, LibraryBig, Megaphone, Search, ShieldCheck, Sparkles, TrendingUp, ShieldAlert } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const growthCards = [
  {
    letter: 'G',
    title: 'Grant Readiness',
    description: 'Grant readiness untuk fondasi legal, profil organisasi, website, email, dan PIC digital.',
  },
  {
    letter: 'R',
    title: 'Resource Access',
    description: 'Resource Access untuk TechSoup, Goodstack, Canva, Google, Microsoft, Azure, dan resource mapping dengan owner yang jelas.',
  },
  {
    letter: 'O',
    title: 'Operating Library',
    description: 'Dokumen lama menjadi asset engine untuk proposal workflow, campaign, dan impact documentation.',
  },
  {
    letter: 'W',
    title: 'Workflow Engine',
    description: 'Grant Pipeline dan Grantwriter merapikan proposal workflow agar tidak selalu mulai dari nol.',
  },
  {
    letter: 'T',
    title: 'Traction Engine',
    description: 'Campaign Builder dan donor workflow membuat growth lebih terukur.',
  },
  {
    letter: 'H',
    title: 'Harvest & Review',
    description: 'Dashboard, monthly reporting, dan review rhythm membuat sistem terus belajar.',
  },
];

const productModules = [
  {
    title: 'Readiness Scorecard',
    description: 'Ukur grant readiness sistem CSO/NGO Anda dalam 8 menit.',
    cta: 'Mulai Scorecard',
    href: '/dashboard/readiness',
    icon: ShieldCheck,
  },
  {
    title: 'Impact Library',
    description: 'Ubah dokumen lama, laporan, template, dan cerita impact menjadi impact documentation engine.',
    cta: 'Buka Library',
    href: '/dashboard/impactory-library',
    icon: LibraryBig,
  },
  {
    title: 'Grant Pipeline',
    description: 'Kelola peluang grant dari source, eligibility, deadline, confidence, sampai next action.',
    cta: 'Lihat Grant Pipeline',
    href: '/dashboard/grantfinder',
    icon: Search,
  },
  {
    title: 'Grantwriter',
    description: 'Buat draft proposal dan LFA dengan safe AI dan Human Review Required.',
    cta: 'Buka Grantwriter',
    href: '/dashboard/grant-writer',
    icon: FileText,
  },
  {
    title: 'Campaign Builder',
    description: 'Bangun campaign brief dan copy fundraising.',
    cta: 'Bangun Campaign',
    href: '/dashboard/impactory-ads',
    icon: Megaphone,
  },
  {
    title: 'Monthly Impact Report',
    description: 'Jadikan laporan bulanan sebagai proof system untuk donor dan funder.',
    cta: 'Segera hadir',
    icon: BookOpen,
    disabled: true,
  },
];

const trustCards = [
  {
    title: 'Human Review Required',
    description: 'Proposal, data grant, klaim impact, dan cerita penerima manfaat wajib direview manusia.',
  },
  {
    title: 'No Fabrication',
    description: 'Impactory tidak boleh mengarang deadline, eligibility, funding amount, atau angka impact.',
  },
  {
    title: 'Document Trust',
    description: 'Dokumen NGO sering berisi data sensitif dan harus dikelola dengan izin serta akses terbatas.',
  },
  {
    title: 'Confidence over Conviction',
    description: 'Rekomendasi harus menunjukkan tingkat keyakinan, bukan berpura-pura pasti.',
  },
];

const ninetyDayPlan = [
  { day: 'Day 1–15', phase: 'Foundation Audit' },
  { day: 'Day 16–30', phase: 'Platform Registration' },
  { day: 'Day 31–45', phase: 'Tools Activation' },
  { day: 'Day 46–60', phase: 'Campaign System' },
  { day: 'Day 61–75', phase: 'Grant System' },
  { day: 'Day 76–90', phase: 'Dashboard & Scale' },
];

export default function Index() {
  useEffect(() => {
    const NAV_OFFSET = 72;

    const scrollToTarget = (id: string) => {
      let lastTop = -1;
      let stableFrames = 0;
      const start = performance.now();

      const tick = () => {
        const el = document.getElementById(id);
        const elapsed = performance.now() - start;

        if (!el) {
          if (elapsed < 1500) requestAnimationFrame(tick);
          return;
        }

        const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;

        if (Math.abs(top - lastTop) < 1) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        lastTop = top;

        if (stableFrames >= 2 || elapsed > 1500) {
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          return;
        }
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const handleHash = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      const id = decodeURIComponent(hash.slice(1));
      scrollToTarget(id);
    };

    if (window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      handleHash();
    }
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main>
        {/* =========================================================================
            HERO SECTION: Vercel × Giving.tech hybrid with Dark Navy (#0F3D4F) & Teal (#1D7A75)
            ========================================================================= */}
        <section className="relative overflow-hidden border-b border-[#1D7A75]/10 bg-[#0A1D25] pt-28 pb-20 md:py-32">
          {/* Subtle animated dot grid background (Vercel feel) */}
          <div 
            className="absolute inset-0 opacity-25 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(29, 122, 117, 0.25) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />

          {/* Soft layered, breathing radial glows for hero ambient depth */}
          <div aria-hidden className="absolute -right-48 -top-48 h-[600px] w-[600px] rounded-full bg-[#1D7A75]/15 blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute -bottom-56 -left-48 h-[600px] w-[600px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-[#1D7A75]/10 blur-[100px] pointer-events-none" />
          
          <div className="container relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="max-w-3xl lg:col-span-7">
                <Badge variant="outline" className="border-[#1D7A75]/30 bg-[#1D7A75]/10 text-teal-300 font-semibold px-3 py-1 animate-fade-in-up tracking-wide rounded-full text-xs">
                  NGO Growth Operating System
                </Badge>
                <h1 className="opacity-0 animate-fade-in-up delay-100 mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                  Grant Banyak. <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-400 to-[#1D7A75] inline-block font-extrabold">Sistem Belum Ada.</span>
                </h1>
                <p className="opacity-0 animate-fade-in-up delay-200 mt-6 text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
                  Impactory.id adalah civic technology resource hub dan NGO Growth Operating System untuk membantu CSO, NGO, organisasi sosial, dan komunitas akar rumput mengubah grant digital, dokumen, proposal workflow, campaign, donor, dan laporan impact menjadi sistem kerja yang rapi, terukur, dan bisa diulang.
                </p>
                <div className="opacity-0 animate-fade-in-up delay-300 mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white font-bold hover:from-teal-600 hover:to-[#1D7A75]/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow rounded-xl px-6 py-6 shadow-lg shadow-teal-500/10">
                    <Link to="/dashboard/readiness">
                      Mulai Readiness Scorecard
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-[#1D7A75]/30 bg-transparent text-white hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6">
                    <a href="#growth-system">Lihat G.R.O.W.T.H. System</a>
                  </Button>
                </div>
                <div className="opacity-0 animate-fade-in-up delay-400 mt-8 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs sm:text-sm text-slate-300 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-[#1D7A75]/25">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  <span className="leading-relaxed">
                    Civic Resource Hub untuk CSO Akar Rumput, dibangun dari pengalaman 20B+ budget digital marketing di NGO, social impact, education, dan campaign growth.
                  </span>
                </div>
              </div>
              
              {/* Product mockup frame with floating stats (Vercel × Giving.tech feel) */}
              <div className="opacity-0 animate-fade-in-up delay-300 lg:col-span-5 relative flex items-center justify-center py-6">
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#1D7A75]/20 via-teal-500/5 to-transparent rounded-3xl blur-2xl opacity-60 pointer-events-none" />
                
                {/* Floating Chip 1 */}
                <div className="absolute -top-3 -left-4 z-20 opacity-0 animate-fade-in-up delay-400 pointer-events-none">
                  <div className="animate-float flex items-center gap-2.5 rounded-xl border border-[#1D7A75]/30 bg-[#0A1D25]/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs font-bold text-white">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span>72 Peluang Grant Aktif</span>
                  </div>
                </div>
 
                {/* Floating Chip 2 */}
                <div className="absolute -bottom-6 -left-2 z-20 opacity-0 animate-fade-in-up delay-500 pointer-events-none">
                  <div className="animate-float-delayed flex flex-col gap-1 rounded-xl border border-white/5 bg-[#0A1D25]/95 backdrop-blur-md p-3 shadow-xl text-xs text-white">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#1D7A75]/20 text-teal-300 border border-[#1D7A75]/30">
                        <ShieldCheck className="h-3 w-3" />
                      </span>
                      <span>SDG-Aligned Pipeline</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium pl-7">
                      Target 17.17 mapped • Ready
                    </div>
                  </div>
                </div>
 
                {/* Floating Chip 3 */}
                <div className="absolute top-12 -right-6 z-20 opacity-0 animate-fade-in-up delay-600 pointer-events-none">
                  <div className="animate-float flex flex-col gap-1.5 rounded-xl border border-white/5 bg-[#0A1D25]/95 backdrop-blur-md p-3 shadow-xl text-xs text-white">
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                      <span>AI Match: High Fit</span>
                    </div>
                    <div className="h-1.5 w-24 rounded-full bg-[#0A1D25] border border-[#1D7A75]/20 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-[#1D7A75] rounded-full" style={{ width: '94%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                      <span>Confidence</span>
                      <span className="text-teal-300 font-bold">94%</span>
                    </div>
                  </div>
                </div>
 
                {/* Primary Mockup Display Frame */}
                <div className="relative group w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden border border-[#1D7A75]/30 shadow-2xl bg-[#07161E] hover:border-[#1D7A75]/50 transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#1D7A75]/10 to-transparent pointer-events-none z-10" />
                  <img
                    src="/hero-visual.png"
                    alt="Impactory NGO Growth Operating System"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            PROBLEM SECTION: Clean whitespace section (Notion feel)
            ========================================================================= */}
        <section id="problem" className="py-20 md:py-28 bg-white">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-[#1D7A75]/20 bg-[#1D7A75]/5 text-[#1D7A75] font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  Problem
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  NGO bukan miskin tools. NGO sering kali miskin sistem.
                </h2>
              </div>
              <Card className="border border-slate-100 p-8 shadow-sm md:p-10 bg-slate-50/50 rounded-2xl">
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
                  Canva Pro sudah ada. Google Ads Grant sudah aktif. Workspace sudah dipakai. Tapi civil society resource access belum terpetakan, proposal masih mulai dari nol, donor masih tercecer, laporan impact dibuat saat diminta, dan campaign sering dimulai dari panik.
                </p>
                <p className="mt-6 text-lg font-bold text-[#1D7A75] leading-snug">
                  Tools adalah bahan bakar. Sistem adalah mesin.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* =========================================================================
            G.R.O.W.T.H SYSTEM SECTION: Dark cards with teal left border accent, hover lift effect
            ========================================================================= */}
        <section id="growth-system" className="bg-[#F8FAFC] py-20 md:py-28 border-y border-slate-100">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-[#1D7A75]/20 bg-[#1D7A75]/5 text-[#1D7A75] font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                Framework
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                G.R.O.W.T.H. System
              </h2>
              <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
                Enam lapisan operasi untuk mengubah grant digital, resource mapping, proposal workflow, dan monthly reporting menjadi growth dan impact yang bisa diulang.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {growthCards.map((card) => (
                <Card 
                  key={card.letter} 
                  className="group relative overflow-hidden border-y border-r border-slate-100 border-l-4 border-l-[#1D7A75] p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl bg-white hover:border-slate-200/50 rounded-r-2xl rounded-l-md"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D7A75]/10 border border-[#1D7A75]/15 text-[#1D7A75] font-extrabold text-lg shadow-inner">
                    {card.letter}
                  </div>
                  <h3 className="mt-5 text-base font-extrabold text-slate-800 transition-colors duration-300 group-hover:text-[#1D7A75]">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                    {card.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            MODULES SECTION: Clean white cards, teal icon color, hover shadow elevation
            ========================================================================= */}
        <section id="modules" className="py-20 md:py-28 bg-white">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-[#1D7A75]/20 bg-[#1D7A75]/5 text-[#1D7A75] font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                Product Modules
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Dari grant readiness sampai laporan impact.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {productModules.map((module) => {
                const Icon = module.icon;
                const card = (
                  <Card className="relative overflow-hidden flex h-full flex-col border border-slate-100 p-7 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl bg-white rounded-2xl group-hover:border-[#1D7A75]/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D7A75]/10 text-[#1D7A75] border border-[#1D7A75]/15 transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      {module.disabled ? (
                        <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-400 font-semibold rounded-full text-[10px] px-2.5 py-0.5">
                          Segera hadir
                        </Badge>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#1D7A75]" />
                      )}
                    </div>
                    <h3 className="mt-5 text-base font-extrabold text-slate-800 transition-colors duration-300 group-hover:text-[#1D7A75]">
                      {module.title}
                    </h3>
                    <p className="mt-2.5 flex-1 text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                      {module.description}
                    </p>
                    <span className="mt-5 text-xs sm:text-sm font-bold text-[#1D7A75] transition-colors duration-300 group-hover:text-teal-600 block">
                      {module.cta}
                    </span>
                  </Card>
                );

                if (module.href) {
                  return (
                    <Link
                      key={module.title}
                      to={module.href}
                      className="group block rounded-2xl focus:outline-none"
                    >
                      {card}
                    </Link>
                  );
                }

                return (
                  <div key={module.title} className="opacity-75" aria-disabled="true">
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            TRUST DOCTRINE SECTION: Dark section with glass cards & teal checkmarks
            ========================================================================= */}
        <section className="bg-[#0A1D25] py-20 text-white md:py-28 relative overflow-hidden border-t border-[#1D7A75]/10">
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(29, 122, 117, 0.25) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-[#1D7A75]/40 bg-[#1D7A75]/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                Trust Doctrine
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Safe AI mempercepat draft. Manusia memastikan akurasi.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {trustCards.map((card) => (
                <Card 
                  key={card.title} 
                  className="group relative overflow-hidden border border-white/5 bg-white/[0.02] p-6 text-white shadow-xl transition-all duration-300 hover:bg-white/[0.04] hover:border-[#1D7A75]/30 hover:-translate-y-1 rounded-2xl"
                >
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0" />
                  <h3 className="mt-4 font-bold text-sm sm:text-base text-slate-100 group-hover:text-teal-300 transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-400 font-normal">
                    {card.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            90-DAY PLAN SECTION: Timeline visual, milestone indicator, and connector line
            ========================================================================= */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge variant="outline" className="mb-4 border-[#1D7A75]/20 bg-[#1D7A75]/5 text-[#1D7A75] font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  90-Day Plan
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Bangun sistem NGO, CSO, dan komunitas akar rumput Anda dalam 90 hari.
                </h2>
                <Button asChild className="mt-6 bg-[#1D7A75] hover:bg-teal-700 text-white font-bold rounded-xl px-5 py-5 shadow-md shadow-teal-500/5 hover:-translate-y-0.5 transition-all">
                  <Link to="/dashboard/readiness">
                    Mulai dari Readiness Scorecard
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 relative">
                {ninetyDayPlan.map((item) => (
                  <Card 
                    key={item.day} 
                    className="group relative overflow-hidden border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#1D7A75]/20 rounded-2xl"
                  >
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#1D7A75]" />
                    <div className="flex items-center gap-3.5">
                      <div className="h-7 w-7 rounded-full bg-[#1D7A75]/10 border border-[#1D7A75]/25 flex items-center justify-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-[#1D7A75] animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#1D7A75] uppercase tracking-wider">
                          {item.day}
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-800 transition-colors duration-300 group-hover:text-[#1D7A75]">
                          {item.phase}
                        </h3>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FOUNDER AUTHORITY SECTION: Clean whitespace Notion card
            ========================================================================= */}
        <section className="bg-[#F8FAFC] py-16 md:py-24 border-t border-slate-100">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border border-slate-100 p-8 shadow-sm md:p-12 bg-white rounded-3xl">
              <div className="max-w-4xl">
                <Badge variant="outline" className="mb-4 border-[#1D7A75]/20 bg-[#1D7A75]/5 text-[#1D7A75] font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  Founder Authority
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Dibangun dari pengalaman operator.
                </h2>
                <p className="mt-5 text-slate-500 text-xs sm:text-sm md:text-base leading-relaxed font-normal">
                  Impactory.id dikembangkan sebagai inisiatif civic technology oleh Yayasan Rumah Pembangunan Berkelanjutan untuk memperkuat akses sumber daya, dokumentasi dampak, dan kapasitas kerja organisasi masyarakat sipil di Indonesia. Pengembangan awalnya didukung oleh pengalaman operator dari Immersia Konsultan Impact dalam mengelola 20B+ budget digital marketing lintas NGO, social impact, education, campaign growth, dan sistem kerja digital untuk organisasi sosial. Dalam fase pilot, Impactory.id dapat digunakan untuk mendampingi CSO dan komunitas terpilih melalui klinik, template, workflow, dan human-reviewed AI assistance.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* =========================================================================
            FINAL CTA SECTION: Dark navy bg with glowing dot grids & vibrant gradients
            ========================================================================= */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="overflow-hidden border border-[#1D7A75]/20 bg-[#0A1D25] p-8 md:p-14 text-white shadow-2xl rounded-3xl relative">
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{ 
                  backgroundImage: 'radial-gradient(circle, rgba(29, 122, 117, 0.2) 1.5px, transparent 1.5px)', 
                  backgroundSize: '24px 24px' 
                }} 
              />
              <div aria-hidden className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-[#1D7A75]/15 blur-[80px] pointer-events-none" />

              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between relative z-10">
                <div className="max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                    Mulai dari baseline. Bangun sistemnya.
                  </h2>
                  <p className="mt-4 text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 font-normal">
                    Gunakan Readiness Scorecard sebagai titik awal, lalu rapikan Grant Pipeline, library, proposal workflow, campaign, impact documentation, dan monthly reporting untuk organisasi sosial.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                  <Button asChild size="lg" className="bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white font-bold hover:from-teal-600 hover:to-teal-700 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6 shadow-lg shadow-teal-500/15">
                    <Link to="/dashboard/readiness">Mulai Readiness Scorecard</Link>
                  </Button>
                  <Button asChild size="lg" className="border border-[#1D7A75]/35 bg-transparent text-white hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6">
                    <Link to="/dashboard/grantfinder">Lihat Grant Pipeline</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
