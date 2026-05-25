import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/AuthProvider';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const nextActions = [
  'Rapikan dokumen dan profil organisasi',
  'Bangun Grant Pipeline pertama',
  'Siapkan proposal, campaign, atau laporan impact dari program prioritas',
];

const ninetyDayPlan = [
  { day: 'Day 1–15', phase: 'Foundation Audit' },
  { day: 'Day 16–30', phase: 'Platform Registration' },
  { day: 'Day 31–45', phase: 'Tools Activation' },
  { day: 'Day 46–60', phase: 'Campaign System' },
  { day: 'Day 61–75', phase: 'Grant System' },
  { day: 'Day 76–90', phase: 'Dashboard & Scale' },
];

const workflowModules = [
  {
    name: 'Grant Pipeline',
    description: 'Kelola peluang grant dari source, eligibility, deadline, confidence, sampai next action.',
    href: '/dashboard/grantfinder',
    icon: Search,
  },
  {
    name: 'Grantwriter / Proposal System',
    description: 'Bangun draft proposal dan LFA berbasis input terstruktur dengan Human Review Required.',
    href: '/dashboard/grant-writer',
    icon: FileText,
  },
  {
    name: 'Impact Library',
    description: 'Ubah dokumen lama, laporan, profil organisasi, dan cerita impact menjadi asset engine.',
    href: '/dashboard/impactory-library',
    icon: BookOpen,
  },
  {
    name: 'Campaign Builder',
    description: 'Bangun campaign brief dan copy untuk fundraising, advokasi, dan growth.',
    href: '/dashboard/impactory-ads',
    icon: Megaphone,
  },
  {
    name: 'Monthly Impact Report',
    description: 'Compile laporan bulanan sebagai proof system untuk donor dan funder.',
    icon: BarChart3,
    comingSoon: true,
  },
  {
    name: 'Donor CRM',
    description: 'Kelola donor journey, follow-up, dan retention.',
    icon: Users,
    comingSoon: true,
  },
];

const doctrineCards = [
  {
    title: 'Human Review Required',
    description:
      'AI mempercepat draft, tetapi proposal, data grant, klaim impact, dan cerita penerima manfaat tetap wajib direview manusia.',
  },
  {
    title: 'No Fabrication',
    description:
      'Impactory tidak boleh mengarang deadline, eligibility, funding amount, angka impact, atau cerita penerima manfaat.',
  },
  {
    title: 'System, not tools',
    description:
      'Setiap modul mengikuti G.R.O.W.T.H. System agar tools bekerja sebagai satu operating rhythm.',
  },
];

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const name = profile?.full_name || user?.email?.split('@')[0] || 'pembangun dampak';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-2xl border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <Badge className="border-white/30 bg-white/15 text-white hover:bg-white/15">
          NGO Growth OS Command Center
        </Badge>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
          Bangun NGO Growth Operating System Anda
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
          Impactory membantu organisasi sosial mengubah grant digital, dokumen, proposal, campaign, donor, dan laporan
          impact menjadi sistem kerja yang rapi, terukur, dan bisa diulang.
        </p>
        <p className="mt-3 text-sm text-white/75">Selamat datang, {name}. Mulai dari baseline sistem, bukan daftar tools.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white/70"
          >
            Mulai dari Readiness
            <Badge className="ml-2 border-white/20 bg-white/10 text-[10px] text-white/70 hover:bg-white/10">Segera hadir</Badge>
          </button>
          <Link
            to="/dashboard/grantfinder"
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-white/90"
          >
            Lihat Grant Pipeline
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">G.R.O.W.T.H. Score</p>
              <h2 className="mt-2 text-xl font-semibold">Baseline belum dibuat</h2>
            </div>
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Diagnosis awal untuk melihat kesiapan sistem NGO Anda.</p>
          <Badge variant="outline" className="mt-5 border-dashed text-muted-foreground">
            Scorecard segera hadir
          </Badge>
        </Card>

        <Card className="p-5 shadow-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Next Actions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {nextActions.map((action) => (
              <div key={action} className="rounded-lg border bg-muted/30 p-4 text-sm">
                <CheckCircle2 className="mb-3 h-4 w-4 text-accent" />
                {action}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-h4">90-Day Plan</h2>
            <p className="text-sm text-muted-foreground">Operating rhythm awal untuk membangun NGO-OS.</p>
          </div>
          <Badge variant="outline" className="w-fit">G.R.O.W.T.H. System</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ninetyDayPlan.map((item) => (
            <div key={item.day} className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground">{item.day}</p>
              <p className="mt-1 font-semibold">{item.phase}</p>
            </div>
          ))}
        </div>
      </Card>

      <section>
        <h2 className="text-h4">Workflow Modules</h2>
        <p className="text-sm text-muted-foreground">
          Modul MVP dipakai sebagai execution layer untuk NGO Growth Operating System.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflowModules.map((module) => {
            const Icon = module.icon;
            const card = (
              <Card className="h-full p-5 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-elegant">
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  {module.comingSoon ? <Badge variant="outline">Segera hadir</Badge> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <h3 className="mt-4 font-semibold">{module.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
              </Card>
            );

            if (module.href) {
              return (
                <Link
                  key={module.name}
                  to={module.href}
                  className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  aria-label={`Buka ${module.name}`}
                >
                  {card}
                </Link>
              );
            }

            return (
              <div key={module.name} className="opacity-80" aria-disabled="true">
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-h4">Trust Doctrine</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {doctrineCards.map((card) => (
            <Card key={card.title} className="border-dashed p-5">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="mt-3 font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}