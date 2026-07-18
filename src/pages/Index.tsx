import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  LibraryBig, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Ruler,
  Coins,
  ClipboardCheck,
  Share2,
  FolderSync,
  BarChart3,
  Users,
  Leaf,
  ClipboardList
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { homepageTranslations } from '@/data/translations/homepage';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLang = searchParams.get('lang');
  
  // Resolve initial language selection
  const getInitialLanguage = (): 'id' | 'en' => {
    if (urlLang === 'id' || urlLang === 'en') {
      return urlLang;
    }
    const saved = localStorage.getItem('impactory-lang');
    if (saved === 'id' || saved === 'en') {
      return saved;
    }
    return 'id';
  };

  const [lang, setLang] = useState<'id' | 'en'>(getInitialLanguage());
  const t = homepageTranslations[lang];

  // Sync language selection with URL parameter and localStorage
  useEffect(() => {
    localStorage.setItem('impactory-lang', lang);

    if (lang === 'en') {
      if (searchParams.get('lang') !== 'en') {
        setSearchParams({ lang: 'en' }, { replace: true });
      }
    } else {
      if (searchParams.has('lang')) {
        const params = new URLSearchParams(searchParams);
        params.delete('lang');
        setSearchParams(params, { replace: true });
      }
    }

    // Dynamic SEO overrides in React DOM
    document.title = t.meta.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t.meta.description);
    }
    document.documentElement.setAttribute('lang', lang);
  }, [lang, searchParams, setSearchParams, t]);

  // Set smooth scrolling behaviors
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

  // Map icons dynamically to avoid React imports inside translations dictionary file
  const resolveModuleIcon = (index: number) => {
    const icons = [
      ClipboardCheck, // Onboarding
      Ruler,          // LFA Builder
      FileText,       // WBS Builder
      Coins,          // Budget Calculator
      Search,         // MEAL Planner
      TrendingUp,     // MEAL Tracker
      Share2,         // Integrated SROI
      Coins,          // Standalone SROI
      LibraryBig,     // Impact Library
      FolderSync,     // OneDrive sync
      Sparkles,       // AI Assist
      BarChart3,      // Impact Dashboard
      FileText,       // Monthly Impact Report
      Users,          // Beneficiary Registry
      Leaf,           // E-ROI Carbon Tracker
      ClipboardList   // Monthly Operating Review
    ];
    return icons[index] || ShieldCheck;
  };

  const resolveWorkflowIcon = (index: number) => {
    const icons = [
      Ruler,          // Rancang Program
      Coins,          // Susun Anggaran
      TrendingUp,     // Pantau Capaian
      FolderSync,     // Kelola Bukti
      Share2,         // Hitung Dampak
      FileText        // Siapkan Laporan
    ];
    return icons[index] || CheckCircle2;
  };

  return (
    <div className="landing-page-wrap min-h-screen bg-brand-surface text-white font-sans selection:bg-teal-500/30 selection:text-teal-200">
      <Navbar lang={lang} onLangChange={setLang} />
      
      <main>
        {/* =========================================================================
            HERO SECTION: Vercel × Giving.tech hybrid with Dark Navy (brand-surface) & Teal (brand-accent)
            ========================================================================= */}
        <section className="relative overflow-hidden border-b border-brand-accent/10 bg-brand-surface pt-28 pb-20 md:py-32">
          {/* Subtle animated dot grid background (Vercel feel) */}
          <div 
            className="absolute inset-0 opacity-25 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.25) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />

          {/* Soft layered, breathing radial glows for hero ambient depth */}
          <div aria-hidden className="absolute -right-48 -top-48 h-[600px] w-[600px] rounded-full bg-brand-accent/15 blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute -bottom-56 -left-48 h-[600px] w-[600px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-brand-accent/10 blur-[100px] pointer-events-none" />
          
          <div className="container relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="max-w-3xl lg:col-span-7">
                <Badge variant="outline" className="border-brand-accent/30 bg-brand-accent/10 text-teal-300 font-semibold px-3 py-1 tracking-wide rounded-full text-xs">
                  {t.hero.badge}
                </Badge>
                
                {/* EXACTLY ONE H1 FOR SEO */}
                <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                  {t.hero.headingText} <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-400 to-brand-accent inline-block font-extrabold">{t.hero.headingHighlight}</span>
                </h1>
                
                <p className="mt-6 text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
                  {t.hero.subheading}
                </p>
                
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-gradient-to-r from-teal-500 to-brand-accent text-white font-bold hover:from-teal-600 hover:to-brand-accent/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow rounded-xl px-6 py-6 shadow-lg shadow-teal-500/10">
                    <Link to="/dashboard/readiness">
                      {t.hero.ctaPrimary}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-brand-accent/30 bg-transparent text-white hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6">
                    <a href="#growth-system">{t.hero.ctaSecondary}</a>
                  </Button>
                </div>
                
                <div className="mt-8 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs sm:text-sm text-slate-300 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-brand-accent/25">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  <span className="leading-relaxed">
                    {t.hero.trustBadge}
                  </span>
                </div>
              </div>
              
              {/* Product mockup frame with floating stats */}
              <div className="lg:col-span-5 relative flex items-center justify-center py-6">
                <div className="absolute -inset-2 bg-gradient-to-tr from-brand-accent/20 via-teal-500/5 to-transparent rounded-3xl blur-2xl opacity-60 pointer-events-none" />
                
                {/* Floating Chip 1 */}
                <div className="absolute -top-3 -left-4 z-20 pointer-events-none">
                  <div className="animate-float flex items-center gap-2.5 rounded-xl border border-brand-accent/30 bg-brand-surface/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs font-bold text-white">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span>{t.hero.floatingStat1}</span>
                  </div>
                </div>
  
                {/* Floating Chip 2 */}
                <div className="absolute -bottom-6 -left-2 z-20 pointer-events-none">
                  <div className="animate-float-delayed flex flex-col gap-1 rounded-xl border border-white/5 bg-brand-surface/95 backdrop-blur-md p-3 shadow-xl text-xs text-white">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-accent/20 text-teal-300 border border-brand-accent/30">
                        <ShieldCheck className="h-3 w-3" />
                      </span>
                      <span>{t.hero.floatingStat2}</span>
                    </div>
                  </div>
                </div>
  
                {/* Floating Chip 3 */}
                <div className="absolute top-12 -right-6 z-20 pointer-events-none">
                  <div className="animate-float flex flex-col gap-1.5 rounded-xl border border-white/5 bg-brand-surface/95 backdrop-blur-md p-3 shadow-xl text-xs text-white">
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                      <span>{t.hero.floatingStat3}</span>
                    </div>
                  </div>
                </div>
  
                {/* Primary Mockup Display Frame */}
                <div className="relative group w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden border border-brand-accent/30 shadow-2xl bg-brand-surface-deeper hover:border-brand-accent/50 transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/10 to-transparent pointer-events-none z-10" />
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
            PROBLEM SECTION: Clean whitespace section (Notion feel) with Dark theme integration
            ========================================================================= */}
        <section id="problem" className="py-20 md:py-28 bg-brand-surface-alt border-b border-brand-accent/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  {t.problem.badge}
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {t.problem.heading}
                </h2>
              </div>
              <Card className="premium-glass-card p-8 md:p-10 rounded-2xl text-slate-300">
                <p className="text-sm sm:text-base leading-relaxed font-normal">
                  {t.problem.description}
                </p>
                <p className="mt-6 text-lg font-bold text-teal-400 leading-snug">
                  {t.problem.highlight}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* =========================================================================
            G.R.O.W.T.H. SYSTEM SECTION: Dark-navy bg with glowing dot grids & glassmorphism cards
            ========================================================================= */}
        <section id="growth-system" className="relative overflow-hidden py-20 md:py-28 bg-brand-surface border-b border-brand-accent/10">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.25) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
          <div aria-hidden className="absolute -left-48 top-1/4 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute -right-48 bottom-1/4 h-[500px] w-[500px] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />

          <div className="container relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                {t.growth.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t.growth.heading}
              </h2>
              <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
                {t.growth.subheading}
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {t.growth.cards.map((card) => (
                <Card 
                  key={card.letter} 
                  className="premium-glass-card group relative overflow-hidden p-6 border-l-4 border-l-brand-accent rounded-r-2xl rounded-l-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-bl-full pointer-events-none" />
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-extrabold text-lg shadow-inner">
                    {card.letter}
                  </div>
                  <h3 className="mt-5 text-base font-extrabold text-slate-100 transition-colors duration-300 group-hover:text-teal-300">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                    {card.description}
                  </p>
                  
                  {/* Modules Sub-bullets */}
                  {card.modules && card.modules.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <div className="flex flex-wrap gap-1.5">
                        {card.modules.map((mod, mIdx) => (
                          <span 
                            key={mIdx} 
                            className="inline-flex items-center rounded-md bg-brand-accent/10 px-2 py-1 text-[10px] font-bold text-teal-300 border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            WORKFLOW SECTION: NGO 6-Step Workflow with semantic H2
            ========================================================================= */}
        <section id="workflow" className="py-20 md:py-28 bg-brand-surface border-b border-brand-accent/10 relative">
          <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
          
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                {t.workflow.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t.workflow.heading}
              </h2>
              <p className="mt-4 text-slate-400 text-sm sm:text-base">
                {t.workflow.subheading}
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {t.workflow.steps.map((step, idx) => {
                const Icon = resolveWorkflowIcon(idx);
                return (
                  <Card 
                    key={idx}
                    className="premium-glass-card p-6 rounded-2xl group overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-bl-full pointer-events-none" />
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-teal-400 tracking-wider">Langkah {idx + 1}</span>
                        <h3 className="text-base font-extrabold text-slate-100 group-hover:text-teal-300 transition-colors">
                          {step.title}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                      {step.desc}
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-semibold text-slate-500">
                      Module: <span className="text-teal-400/80 font-bold">{step.module}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            MODULES SECTION: Modern 10-module grid
            ========================================================================= */}
        <section id="modules" className="py-20 md:py-28 bg-brand-surface-alt border-b border-brand-accent/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                {t.modules.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t.modules.heading}
              </h2>
              <p className="mt-4 text-slate-400 text-sm sm:text-base">
                {t.modules.subheading}
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {t.modules.cards.map((module, idx) => {
                const Icon = resolveModuleIcon(idx);
                
                let gridSpan = "col-span-1";
                if (module.size === "hero") {
                  gridSpan = "col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2";
                } else if (module.size === "wide") {
                  gridSpan = "col-span-1 md:col-span-2 lg:col-span-2";
                } else if (module.size === "full") {
                  gridSpan = "col-span-1 md:col-span-2 lg:col-span-3";
                }

                // Render dynamic card style and structure based on Bento size
                let cardElement;
                if (module.size === "hero") {
                  cardElement = (
                    <Card 
                      className="premium-glass-card relative overflow-hidden flex h-full flex-col p-8 rounded-3xl group text-left bg-gradient-to-br from-[#0D3040] to-[#0F4A3C]"
                    >
                      <div 
                        className="absolute inset-0 opacity-15 pointer-events-none" 
                        style={{ 
                          backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.3) 1.5px, transparent 1.5px)', 
                          backgroundSize: '24px 24px' 
                        }} 
                      />
                      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-teal-500/20 transition-all duration-500" />
                      
                      <div className="flex items-start justify-between gap-4 relative z-10">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/20 text-teal-300 border border-teal-400/30 transition-transform duration-500 group-hover:scale-110 shadow-lg shadow-teal-500/10">
                          <Icon className="h-7 w-7" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-teal-300/70 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-teal-300" />
                      </div>
                      
                      <div className="relative z-10 flex-1 flex flex-col justify-between mt-8">
                        <div>
                          <h3 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-teal-200 transition-colors leading-tight">
                            {module.title}
                          </h3>
                          <p className="mt-4 text-slate-200 text-sm md:text-base leading-relaxed font-normal max-w-xl">
                            {module.description}
                          </p>
                        </div>
                        <div className="mt-8">
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-brand-accent text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 group-hover:translate-x-0.5">
                            {module.cta}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                } else if (module.size === "full") {
                  cardElement = (
                    <Card 
                      className="premium-glass-card relative overflow-hidden flex h-full flex-col p-8 rounded-3xl group bg-gradient-to-r from-[#0D3040] to-brand-surface-card"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-teal-500/5 opacity-50 pointer-events-none group-hover:opacity-75 transition-opacity" />
                      <div className="absolute -right-24 -bottom-24 w-60 h-60 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-teal-500/15 transition-colors duration-500" />
                      
                      <div className="flex flex-col lg:flex-row gap-8 items-stretch relative z-10 w-full h-full">
                        {/* Left Column: Core content */}
                        <div className="flex-1 flex flex-col justify-between gap-5 text-left">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 transition-transform duration-300 group-hover:scale-105 shadow-inner">
                                <Icon className="h-5.5 w-5.5" />
                              </div>
                              <Badge variant="outline" className="border-teal-400/40 bg-teal-400/15 text-teal-300 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                                {lang === 'id' ? 'Teknologi AI' : 'AI-Powered'}
                              </Badge>
                            </div>
                            
                            <h3 className="mt-5 text-xl md:text-2xl font-extrabold text-white group-hover:text-teal-300 transition-colors leading-tight">
                              {module.title}
                            </h3>
                            
                            <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed font-normal max-w-xl">
                              {module.description}
                            </p>
                          </div>
                          
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-400 transition-colors group-hover:text-teal-300">
                            {module.cta}
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                        </div>

                        {/* Right Column: Dynamic core capabilities list */}
                        <div className="lg:w-[320px] flex flex-col justify-center gap-3.5 bg-white/[0.02] border border-white/5 rounded-2xl p-6 shrink-0 text-left">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block border-b border-white/5 pb-1">
                            {lang === 'id' ? 'Kemampuan Kunci' : 'Core Capabilities'}
                          </span>
                          {(lang === 'id' 
                            ? ["Proposal Generator", "Audit-Ready RAG", "Draf Laporan Otomatis", "SROI Synthesis"]
                            : ["Proposal Generator", "Audit-Ready RAG", "Automated Report Drafting", "SROI Synthesis"]
                          ).map((tag, tIdx) => (
                            <div key={tIdx} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium py-1 px-1 rounded-lg transition-colors hover:text-white">
                              <div className="h-2 w-2 rounded-full bg-teal-400 shrink-0 shadow-glow" />
                              <span>{tag}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                } else if (module.size === "wide") {
                  cardElement = (
                    <Card 
                      className="premium-glass-card relative overflow-hidden flex h-full flex-col p-6 rounded-2xl group text-left"
                    >
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ 
                          backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.2) 1px, transparent 1px)', 
                          backgroundSize: '16px 16px' 
                        }} 
                      />
                      <div className="absolute -right-6 -bottom-6 w-28 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-colors duration-500" />
                      
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 transition-transform duration-300 group-hover:scale-105">
                          <Icon className="h-5.5 w-5.5" />
                        </div>
                        <ArrowRight className="h-4.5 w-4.5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-teal-400" />
                      </div>
                      
                      <div className="relative z-10 flex-1 flex flex-col justify-between mt-6">
                        <div>
                          <h3 className="text-lg font-extrabold text-white group-hover:text-teal-300 transition-colors leading-snug">
                            {module.title}
                          </h3>
                          <p className="mt-3 text-slate-300 text-sm leading-relaxed font-normal">
                            {module.description}
                          </p>
                        </div>
                        <span className="mt-6 text-sm font-bold text-teal-400 transition-colors group-hover:text-teal-300 flex items-center gap-1.5">
                          {module.cta}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Card>
                  );
                } else {
                  cardElement = (
                    <Card 
                      className="premium-glass-card relative overflow-hidden flex h-full flex-col p-5 rounded-2xl group text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 transition-transform duration-300 group-hover:scale-105">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          {module.badge && (
                            <Badge 
                              variant="outline" 
                              className={`font-bold px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider whitespace-nowrap ${
                                module.badgeVariant === 'w' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                                module.badgeVariant === 't' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                                'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                              }`}
                            >
                              {module.badge}
                            </Badge>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-teal-400" />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between mt-5">
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-100 group-hover:text-teal-300 transition-colors leading-snug">
                            {module.title}
                          </h3>
                          <p className="mt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal line-clamp-3">
                            {module.description}
                          </p>
                        </div>
                        <span className="mt-5 text-xs sm:text-sm font-bold text-teal-400 transition-colors group-hover:text-teal-300 block">
                          {module.cta}
                        </span>
                      </div>
                    </Card>
                  );
                }

                if (module.href) {
                  return (
                    <Link
                      key={idx}
                      to={module.href}
                      className={`group block rounded-2xl focus:outline-none transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] h-full ${gridSpan}`}
                    >
                      {cardElement}
                    </Link>
                  );
                }

                return (
                  <div key={idx} className={`opacity-80 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] h-full ${gridSpan}`}>
                    {cardElement}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            EVIDENCE AND REPORTING / AI ASSIST SECTION: Structured H2
            ========================================================================= */}
        <section id="evidence-reporting" className="py-20 md:py-28 bg-brand-surface border-b border-brand-accent/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  {t.evidenceAndReporting.badge}
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {t.evidenceAndReporting.heading}
                </h2>
                <p className="mt-5 text-slate-400 text-sm sm:text-base leading-relaxed">
                  {t.evidenceAndReporting.description}
                </p>
              </div>

              <div className="lg:col-span-7 grid gap-6 sm:grid-cols-2">
                {t.evidenceAndReporting.cards.map((item, idx) => (
                  <Card 
                    key={idx}
                    className="premium-glass-card p-6 rounded-2xl"
                  >
                    <h3 className="text-base font-extrabold text-slate-100 mb-3 flex items-center gap-2">
                      {idx === 0 ? <FolderSync className="h-4 w-4 text-teal-400" /> : <Sparkles className="h-4 w-4 text-teal-400" />}
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TRUST DOCTRINE SECTION: Dark section with glass cards & teal checkmarks
            ========================================================================= */}
          <section id="trust" className="bg-brand-surface-alt py-20 text-white md:py-28 relative overflow-hidden border-b border-brand-accent/10">
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.25) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                {t.trust.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t.trust.heading}
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {t.trust.cards.map((card, idx) => (
                <Card 
                  key={idx} 
                  className="premium-glass-card group relative overflow-hidden p-6 text-white rounded-2xl"
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
            90-DAY PLAN SECTION: Timeline visual, milestone indicator
            ========================================================================= */}
        <section id="timeline-plan" className="py-20 md:py-28 bg-brand-surface border-b border-brand-accent/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge variant="outline" className="mb-4 border-brand-accent/20 bg-brand-accent/5 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  {t.timeline90.badge}
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {t.timeline90.heading}
                </h2>
                <Button asChild className="mt-6 bg-brand-accent hover:bg-teal-700 text-white font-bold rounded-xl px-5 py-5 shadow-md shadow-teal-500/5 hover:-translate-y-0.5 transition-all">
                  <Link to="/dashboard/readiness">
                    {t.timeline90.cta}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 relative">
                {t.timeline90.steps.map((item, idx) => (
                  <Card 
                    key={idx} 
                    className="premium-glass-card group relative overflow-hidden p-6 rounded-2xl"
                  >
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-brand-accent" />
                    <div className="flex items-center gap-3.5">
                      <div className="h-7 w-7 rounded-full bg-teal-500/10 border border-teal-500/25 flex items-center justify-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                          {item.day}
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-200 transition-colors duration-300 group-hover:text-teal-300">
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
            FOUNDER AUTHORITY SECTION: Clean whitespace Notion card / Dark mode optimized
            ========================================================================= */}
        <section id="founder" className="bg-brand-surface-alt py-16 md:py-24 border-b border-brand-accent/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="premium-glass-card p-8 md:p-12 rounded-3xl">
              <div className="max-w-4xl">
                <Badge variant="outline" className="mb-4 border-brand-accent/40 bg-brand-accent/15 text-teal-300 font-semibold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full">
                  {t.founder.badge}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                  {t.founder.heading}
                </h2>
                <p className="mt-5 text-slate-400 text-xs sm:text-sm md:text-base leading-relaxed font-normal">
                  {t.founder.description}
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* =========================================================================
            FINAL CTA SECTION: Dark navy bg with glowing dot grids & vibrant gradients
            ========================================================================= */}
        <section className="py-20 md:py-28 bg-brand-surface">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="premium-glass-card overflow-hidden p-8 md:p-14 text-white rounded-3xl relative">
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{ 
                  backgroundImage: 'radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.2) 1.5px, transparent 1.5px)', 
                  backgroundSize: '24px 24px' 
                }} 
              />
              <div aria-hidden className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-brand-accent/15 blur-[80px] pointer-events-none" />

              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between relative z-10">
                <div className="max-w-2xl">
                  {/* H2 FOR BENEFITS/CTA */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                    {t.finalCta.heading}
                  </h2>
                  <p className="mt-4 text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 font-normal">
                    {t.finalCta.description}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                  <Button asChild size="lg" className="bg-gradient-to-r from-teal-500 to-brand-accent text-white font-bold hover:from-teal-600 hover:to-teal-700 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6 shadow-lg shadow-teal-500/15">
                    <Link to="/dashboard/readiness">{t.finalCta.ctaPrimary}</Link>
                  </Button>
                  <Button asChild size="lg" className="border border-brand-accent/35 bg-transparent text-white hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-6">
                    <Link to="/dashboard/grantfinder">{t.finalCta.ctaSecondary}</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
