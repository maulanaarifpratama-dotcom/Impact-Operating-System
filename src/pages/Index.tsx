import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, FileText, LibraryBig, Megaphone, Search, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const growthCards = [
  {
    letter: 'G',
    title: 'Grant Readiness',
    description: 'Fondasi legal, profil organisasi, website, email, dan PIC digital.',
  },
  {
    letter: 'R',
    title: 'Resource Access',
    description: 'Akses TechSoup, Goodstack, Canva, Google, Microsoft, dan Azure dengan owner yang jelas.',
  },
  {
    letter: 'O',
    title: 'Operating Library',
    description: 'Dokumen lama menjadi asset engine untuk proposal, campaign, dan laporan impact.',
  },
  {
    letter: 'W',
    title: 'Workflow Engine',
    description: 'Grant Pipeline dan Grantwriter membuat proposal tidak selalu mulai dari nol.',
  },
  {
    letter: 'T',
    title: 'Traction Engine',
    description: 'Campaign Builder dan donor workflow membuat growth lebih terukur.',
  },
  {
    letter: 'H',
    title: 'Harvest & Review',
    description: 'Dashboard, monthly report, dan review rhythm membuat sistem terus belajar.',
  },
];

const productModules = [
  {
    title: 'Readiness Scorecard',
    description: 'Ukur kesiapan sistem NGO Anda dalam 8 menit.',
    cta: 'Mulai Scorecard',
    href: '/dashboard/readiness',
    icon: ShieldCheck,
  },
  {
    title: 'Impact Library',
    description: 'Ubah dokumen lama, laporan, template, dan cerita impact menjadi asset engine.',
    cta: 'Buka Library',
    href: '/dashboard/impactory-library',
    icon: LibraryBig,
  },
  {
    title: 'Grant Pipeline',
    description: 'Kelola peluang grant dari source, eligibility, deadline, confidence, sampai next action.',
    cta: 'Lihat Pipeline',
    href: '/dashboard/grantfinder',
    icon: Search,
  },
  {
    title: 'Grantwriter',
    description: 'Buat draft proposal dan LFA dengan Human Review Required.',
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-subtle">
          <div aria-hidden className="absolute -right-48 -top-48 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-56 -left-48 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl" />
          <div className="container relative py-20 md:py-28">
            <div className="max-w-4xl">
              <Badge variant="outline" className="border-primary/20 bg-background/70 text-primary">
                NGO Growth Operating System
              </Badge>
              <h1 className="mt-6 max-w-3xl text-display text-foreground">
                Grant Banyak. Sistem Belum Ada.
              </h1>
              <p className="mt-6 max-w-3xl text-subheading">
                Impactory.id adalah NGO Growth Operating System untuk membantu organisasi sosial mengubah grant digital,
                dokumen, proposal, campaign, donor, dan laporan impact menjadi sistem kerja yang rapi, terukur, dan
                bisa diulang.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="shadow-elegant">
                  <Link to="/dashboard/readiness">
                    Mulai Readiness Scorecard
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#growth-system">Lihat G.R.O.W.T.H. System</a>
                </Button>
              </div>
              <div className="mt-8 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground shadow-card">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  Dibangun dari pengalaman 20B+ budget digital marketing di NGO, social impact, education, dan campaign growth.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="py-20 md:py-24">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Badge variant="outline" className="mb-4">Problem</Badge>
                <h2 className="text-h2">NGO bukan miskin tools. NGO sering kali miskin sistem.</h2>
              </div>
              <Card className="border-border/70 p-6 shadow-card md:p-8">
                <p className="text-body text-muted-foreground">
                  Canva Pro sudah ada. Google Ads Grant sudah aktif. Workspace sudah dipakai. Tapi proposal masih mulai
                  dari nol, donor masih tercecer, laporan impact dibuat saat diminta, dan campaign sering dimulai dari panik.
                </p>
                <p className="mt-5 text-h4 text-primary">Tools adalah bahan bakar. Sistem adalah mesin.</p>
              </Card>
            </div>
          </div>
        </section>

        <section id="growth-system" className="bg-secondary/50 py-20 md:py-24">
          <div className="container">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-primary/20 text-primary">Framework</Badge>
              <h2 className="text-h2">G.R.O.W.T.H. System</h2>
              <p className="mt-3 text-subheading">
                Enam lapisan operasi untuk mengubah grant digital menjadi growth dan impact yang bisa diulang.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {growthCards.map((card) => (
                <Card key={card.letter} className="border-border/70 p-6 shadow-card">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    {card.letter}
                  </div>
                  <h3 className="mt-4 text-h4">{card.title}</h3>
                  <p className="mt-2 text-body-sm text-muted-foreground">{card.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="py-20 md:py-24">
          <div className="container">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4">Product Modules</Badge>
              <h2 className="text-h2">Dari diagnosis sampai laporan impact.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {productModules.map((module) => {
                const Icon = module.icon;
                const card = (
                  <Card className="flex h-full flex-col border-border/70 p-6 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <Icon className="h-5 w-5" />
                      </div>
                      {module.disabled ? <Badge variant="outline">Segera hadir</Badge> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <h3 className="mt-5 text-h4">{module.title}</h3>
                    <p className="mt-2 flex-1 text-body-sm text-muted-foreground">{module.description}</p>
                    <span className="mt-5 text-sm font-medium text-primary">{module.cta}</span>
                  </Card>
                );

                if (module.href) {
                  return (
                    <Link
                      key={module.title}
                      to={module.href}
                      className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {card}
                    </Link>
                  );
                }

                return (
                  <div key={module.title} className="opacity-80" aria-disabled="true">
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-primary py-20 text-primary-foreground md:py-24">
          <div className="container">
            <div className="max-w-3xl">
              <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">Trust Doctrine</Badge>
              <h2 className="text-h2 text-white">AI mempercepat draft. Manusia memastikan akurasi.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {trustCards.map((card) => (
                <Card key={card.title} className="border-white/10 bg-white/5 p-5 text-white shadow-none">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <h3 className="mt-4 font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">{card.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge variant="outline" className="mb-4">90-Day Plan</Badge>
                <h2 className="text-h2">Bangun sistem NGO Anda dalam 90 hari.</h2>
                <Button asChild className="mt-6">
                  <Link to="/dashboard/readiness">
                    Mulai dari Readiness Scorecard
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ninetyDayPlan.map((item) => (
                  <Card key={item.day} className="border-border/70 p-5 shadow-card">
                    <p className="text-overline text-muted-foreground">{item.day}</p>
                    <h3 className="mt-2 font-semibold">{item.phase}</h3>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/50 py-20 md:py-24">
          <div className="container">
            <Card className="border-border/70 p-6 shadow-card md:p-8">
              <div className="max-w-3xl">
                <Badge variant="outline" className="mb-4">Founder Authority</Badge>
                <h2 className="text-h2">Dibangun dari pengalaman operator.</h2>
                <p className="mt-4 text-body text-muted-foreground">
                  Impactory.id lahir dari pengalaman mengelola 20B+ budget digital marketing lintas NGO, social impact,
                  education, dan brand growth — serta kerja founder-operator di BisaBaik.or.id, Little Champ Daycare,
                  dan Immersia Konsultan Impact.
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="container">
            <Card className="overflow-hidden border-border/70 bg-gradient-hero p-6 text-white shadow-elegant md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-h2 text-white">Mulai dari baseline. Bangun sistemnya.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                    Gunakan Readiness Scorecard sebagai titik awal, lalu rapikan pipeline, library, proposal, campaign,
                    dan laporan impact.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/dashboard/readiness">Mulai Readiness Scorecard</Link>
                  </Button>
                  <Button asChild size="lg" className="border border-white/30 bg-white/10 text-white hover:bg-white/20">
                    <Link to="/dashboard">Masuk Dashboard</Link>
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
