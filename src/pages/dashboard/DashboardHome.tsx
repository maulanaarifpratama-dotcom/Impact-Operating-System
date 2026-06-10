import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckSquare,
  Square,
  Building2,
} from 'lucide-react';

const SECTION_PHASE_MAP: Record<string, string> = {
  p1: 'g',
  p2: 'r',
  p3: 'o',
  p4: 't',
  p5: 'w',
  p6: 'h',
};

type GrowthCode = 'G' | 'R' | 'O' | 'W' | 'T' | 'H';

interface ScoreCategory {
  code: GrowthCode;
  title: string;
  itemsCount: number;
}

const CATEGORIES: ScoreCategory[] = [
  { code: 'G', title: 'G — Grant Readiness', itemsCount: 5 },
  { code: 'R', title: 'R — Resource Access', itemsCount: 5 },
  { code: 'O', title: 'O — Operating Library', itemsCount: 5 },
  { code: 'W', title: 'W — Workflow Engine', itemsCount: 5 },
  { code: 'T', title: 'T — Traction Engine', itemsCount: 4 },
  { code: 'H', title: 'H — Harvest & Review', itemsCount: 4 },
];

const ACTIONS: Record<GrowthCode, string> = {
  G: 'Rapikan dokumen legal, profil organisasi, website/email, dan PIC digital.',
  R: 'Petakan akses TechSoup, Goodstack, Canva, Google, Microsoft, dan tetapkan owner.',
  O: 'Bangun Impact Library agar proposal, laporan, template, dan cerita impact bisa dipakai ulang.',
  W: 'Bangun Grant Pipeline dengan source URL, deadline, eligibility, confidence, dan next action.',
  T: 'Buat campaign brief, CTA, donor list, dan follow-up sederhana.',
  H: 'Mulai monthly impact report dan review bulanan agar sistem tidak berhenti.',
};

const PLAN_SECTIONS = [
  {
    id: 'p1',
    day: 'Day 1–15',
    phase: 'Foundation Audit',
    tasks: [
      'Audit dokumen legal utama & simpan secara terpusat',
      'Buat profil ringkas organisasi (1-page sheet)',
      'Tentukan penanggung jawab digital (PIC Digital)',
    ],
  },
  {
    id: 'p2',
    day: 'Day 16–30',
    phase: 'Platform Registration',
    tasks: [
      'Registrasi akun di TechSoup Indonesia',
      'Lakukan verifikasi Goodstack untuk akses donor global',
      'Ajukan pendaftaran Canva for Nonprofits',
    ],
  },
  {
    id: 'p3',
    day: 'Day 31–45',
    phase: 'Tools Activation',
    tasks: [
      'Aktivasi Google for Nonprofits & Google Ads Grant ($10k/month)',
      'Klaim Microsoft for Nonprofits ($2k/year Azure credits)',
      'Siapkan struktur folder operating library terstandar',
    ],
  },
  {
    id: 'p4',
    day: 'Day 46–60',
    phase: 'Campaign System',
    tasks: [
      'Buat campaign brief pertama dengan target jelas',
      'Bangun landing page sederhana / link donasi',
      'Kumpulkan database kontak donor dalam satu format terstruktur',
    ],
  },
  {
    id: 'p5',
    day: 'Day 61–75',
    phase: 'Grant System',
    tasks: [
      'Mulai isi Grant Pipeline dengan minimal 3 peluang aktif',
      'Buat template proposal standard dengan AI Grantwriter',
      'Tentukan alur review internal sebelum pengajuan proposal',
    ],
  },
  {
    id: 'p6',
    day: 'Day 76–90',
    phase: 'Dashboard & Scale',
    tasks: [
      'Mulai pencatatan output/metrics program secara digital',
      'Buat draf laporan dampak bulanan pertama (Impact Report)',
      'Jadwalkan evaluasi sistem bulanan bersama tim',
    ],
  },
];

const workflowModules = [
  {
    name: 'Resource Access Tracker',
    description: 'Pantau TechSoup, Goodstack, Canva, Google, Microsoft, dan Azure agar akses punya owner dan next action.',
    href: '/dashboard/resource-access',
    icon: ShieldCheck,
  },
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
    href: '/dashboard/monthly-report',
    icon: BarChart3,
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

function getLevel(score: number) {
  if (score === 0) {
    return {
      title: 'Baseline belum dibuat',
      description: 'Diagnosis awal untuk melihat kesiapan sistem NGO Anda.',
    };
  }
  if (score <= 35) {
    return {
      title: 'Masih manual',
      description: 'Banyak pekerjaan masih bergantung pada orang tertentu dan belum menjadi sistem.',
    };
  }
  if (score <= 70) {
    return {
      title: 'Tools ada, sistem belum',
      description: 'Beberapa akses dan tools sudah ada, tetapi belum terhubung menjadi workflow.',
    };
  }
  if (score <= 105) {
    return {
      title: 'Sistem mulai jalan',
      description: 'Beberapa workflow sudah berulang, tetapi masih perlu dirapikan agar bisa scale.',
    };
  }
  return {
    title: 'Siap scale',
    description: 'Fondasi, workflow, campaign, dan review sudah cukup kuat untuk ditingkatkan.',
  };
}

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [planTasks, setPlanTasks] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>('p1');

  // Query organization memberships for the current user
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = membership?.organization_id;

  // Query organization details
  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Query readiness scores from Supabase
  const { data: dbScores, isLoading: isScoresLoading } = useQuery({
    queryKey: ['readiness_scores', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Query 90-day plan progress from Supabase
  const { data: dbProgress, isLoading: isProgressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['day_plan_progress', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('day_plan_progress')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Synchronize scores from database into local state
  useEffect(() => {
    if (dbScores?.details) {
      setScores(dbScores.details as Record<string, number>);
    } else {
      setScores({});
    }
  }, [dbScores]);

  // Synchronize 90-day plan checklists from database into local state
  useEffect(() => {
    if (dbProgress) {
      const mapped: Record<string, boolean> = {};
      dbProgress.forEach((item) => {
        const sectionId = Object.keys(SECTION_PHASE_MAP).find(
          (k) => SECTION_PHASE_MAP[k] === item.phase
        );
        if (sectionId) {
          mapped[`${sectionId}-${item.item_key}`] = item.is_completed;
        }
      });
      setPlanTasks(mapped);
    } else {
      setPlanTasks({});
    }
  }, [dbProgress]);

  // Compute live scores and next actions
  const scoreResult = useMemo(() => {
    const categoryScores = CATEGORIES.map((category, order) => {
      const score = Array.from({ length: category.itemsCount }).reduce<number>((sum, _, index) => {
        const key = `${category.code}-${index}`;
        return sum + (scores[key] ?? 0);
      }, 0);
      const max = category.itemsCount * 5;

      return {
        code: category.code,
        order,
        score,
        max,
        ratio: max === 0 ? 0 : score / max,
      };
    });

    const total = categoryScores.reduce<number>((sum, category) => sum + category.score, 0);
    const hasScores = Object.keys(scores).length > 0;

    // Determine Top 3 lowest ratio categories to trigger dynamic action steps
    const lowestCategories = [...categoryScores]
      .sort((a, b) => a.ratio - b.ratio || a.order - b.order)
      .slice(0, 3);

    const dynamicActions = hasScores
      ? lowestCategories.map((cat) => ACTIONS[cat.code as GrowthCode] || ACTIONS[cat.code])
      : [
          'Jawab pertanyaan audit di halaman G.R.O.W.T.H. Readiness Scorecard.',
          'Identifikasi level operasional baseline Anda sebelum mengaktifkan AI tools.',
          'Petakan owner / penanggung jawab akses untuk TechSoup, Google, dan Microsoft.',
        ];

    return {
      total: hasScores ? total : 0,
      level: getLevel(hasScores ? total : 0),
      hasScores,
      nextActions: dynamicActions,
    };
  }, [scores]);

  // 90-Day Plan Checklist Calculations
  const planStats = useMemo(() => {
    const totalTasks = PLAN_SECTIONS.reduce((sum, sec) => sum + sec.tasks.length, 0);
    const completedTasks = PLAN_SECTIONS.reduce((sum, sec) => {
      return sum + sec.tasks.filter((task) => planTasks[`${sec.id}-${task}`]).length;
    }, 0);

    return {
      total: totalTasks,
      completed: completedTasks,
      percentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    };
  }, [planTasks]);

  const handleToggleTask = async (sectionId: string, task: string) => {
    if (!orgId || !user?.id) return;

    const phase = SECTION_PHASE_MAP[sectionId];
    if (!phase) return;

    const key = `${sectionId}-${task}`;
    const nextState = !planTasks[key];

    // 1. Optimistic UI update
    setPlanTasks((current) => ({ ...current, [key]: nextState }));

    try {
      // 2. Upsert status to Supabase
      const { error } = await supabase
        .from('day_plan_progress')
        .upsert({
          organization_id: orgId,
          phase,
          item_key: task,
          is_completed: nextState,
          completed_by: user.id,
          completed_at: nextState ? new Date().toISOString() : null,
        }, { onConflict: 'organization_id,phase,item_key' });

      if (error) {
        console.error('[DashboardHome] error saving progress:', error);
        toast.error('Gagal memperbarui status tugas');
        // Revert on failure
        setPlanTasks((current) => ({ ...current, [key]: !nextState }));
      } else {
        void refetchProgress();
      }
    } catch (e) {
      console.error('[DashboardHome] exception saving progress:', e);
      // Revert on failure
      setPlanTasks((current) => ({ ...current, [key]: !nextState }));
    }
  };

  const name = profile?.full_name || user?.email?.split('@')[0] || 'rekan dampak';
  const orgName = organization?.name || 'Organisasi Anda';

  if (isMembershipLoading || isOrgLoading || isScoresLoading || isProgressLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Menghubungkan ke Command Center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#155F66]/30 bg-gradient-to-br from-[#0F3D4F] via-[#155F66] to-[#1D7A75] p-6 text-white shadow-elegant md:p-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-accent/25 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/30 bg-white/15 text-white hover:bg-white/15">
              NGO Growth OS Command Center
            </Badge>
            <Badge className="border-accent/40 bg-[#F59E0B]/20 text-[#F59E0B] font-medium">
              Multi-tenant Active
            </Badge>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            Bangun NGO Growth Operating System Anda
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
            Impactory membantu organisasi sosial mengubah dokumen, proposal, campaign, donor, dan laporan dampak
            menjadi operating rhythm yang rapi, terukur, dan berkelanjutan.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-white/10 pt-5 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="font-semibold text-white">{orgName}</span>
            </div>
            <div className="hidden sm:block text-white/40">|</div>
            <div className="flex items-center gap-1 text-white/80">
              Selamat datang kembali, <span className="font-medium text-white">{name}</span>.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/dashboard/readiness"
              className="inline-flex items-center rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/25 hover:shadow-sm"
            >
              Mulai dari Kesiapan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/dashboard/grantfinder"
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-[#0F3D4F] transition-all hover:bg-white/95 hover:shadow-elegant"
            >
              Cari Peluang Grant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Section Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* GROWTH Score Card */}
        <Card className="flex flex-col justify-between border-border bg-card p-5 shadow-card hover:shadow-elegant transition-shadow duration-300">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">G.R.O.W.T.H. Score</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  {scoreResult.hasScores ? `${scoreResult.total} / 140` : 'Belum Dibuat'}
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            {/* Micro progress bar for score */}
            {scoreResult.hasScores && (
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.round((scoreResult.total / 140) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-muted/40 p-3.5 border border-border">
              <p className="text-sm font-bold text-foreground">{scoreResult.level.title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{scoreResult.level.description}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Link
              to="/dashboard/readiness"
              className="inline-flex items-center text-sm font-semibold text-accent hover:text-accent/95 hover:underline"
            >
              {scoreResult.hasScores ? 'Perbarui Readiness Scorecard' : 'Mulai Isi Scorecard'}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Dynamic Next Actions */}
        <Card className="p-5 shadow-card border-border bg-card lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Rekomendasi Prioritas Utama</h2>
              <Badge variant="outline" className="border-accent/30 bg-accent-soft/30 text-accent font-medium">
                Sistem Kerja OS
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {scoreResult.hasScores
                ? 'Berdasarkan area pertumbuhan dengan skor terendah di audit kesiapan Anda.'
                : 'Langkah awal untuk menginisiasi baseline kerja nonprofit.'}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {scoreResult.nextActions.map((action, idx) => (
                <div
                  key={action}
                  className="relative overflow-hidden rounded-xl border border-border bg-muted/20 p-4 shadow-sm transition-all hover:bg-muted/30"
                >
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent to-[#155F66]" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold mb-3">
                    {idx + 1}
                  </div>
                  <p className="text-xs font-medium text-foreground leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {scoreResult.hasScores && (
            <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
              Sistem akan memperbarui prioritas otomatis saat Anda meningkatkan skor G.R.O.W.T.H.
            </div>
          )}
        </Card>
      </div>

      {/* Redesigned 90-Day Plan Checklist Section */}
      <Card className="border-border bg-card p-6 shadow-card hover:shadow-elegant transition-shadow duration-300">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Interactive 90-Day Plan</h2>
              <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/20">
                Operating Rhythm
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau progres implementasi sistem organisasi Anda di setiap tahapan pertumbuhan.
            </p>
          </div>

          {/* Premium Progress circle or bar */}
          <div className="flex items-center gap-4 bg-muted/30 border border-border px-4 py-2.5 rounded-xl">
            <div className="flex flex-col text-right">
              <span className="text-xs text-muted-foreground font-medium">Progress Penyelesaian</span>
              <span className="text-sm font-bold text-foreground">
                {planStats.completed} dari {planStats.total} tugas ({planStats.percentage}%)
              </span>
            </div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-bold border border-accent/20">
              {planStats.percentage}%
            </div>
          </div>
        </div>

        {/* Big visual progress bar */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted border border-border">
          <div
            className="h-full bg-gradient-to-r from-accent via-[#155F66] to-[#1D7A75] transition-all duration-500"
            style={{ width: `${planStats.percentage}%` }}
          />
        </div>

        {/* Phase Checklist Accordion */}
        <div className="mt-6 grid gap-3">
          {PLAN_SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.id;
            const completedInSection = section.tasks.filter((task) => planTasks[`${section.id}-${task}`]).length;
            const isPhaseDone = completedInSection === section.tasks.length;

            return (
              <div
                key={section.id}
                className={cn(
                  'overflow-hidden rounded-xl border transition-all duration-200 bg-[#0F3D4F]/5',
                  isExpanded
                    ? 'border-[#155F66]/40 shadow-sm ring-1 ring-[#155F66]/10'
                    : 'border-border hover:border-border-hover'
                )}
              >
                {/* Header accordion trigger */}
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="flex w-full items-center justify-between p-4 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                        isPhaseDone
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {completedInSection}/{section.tasks.length}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">{section.day}</span>
                      <h3 className="text-sm font-bold text-foreground mt-0.5">{section.phase}</h3>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Sub-tasks lists (animated) */}
                {isExpanded && (
                  <div className="border-t border-border bg-card p-4 space-y-3 animate-slide-down">
                    {section.tasks.map((task) => {
                      const isTaskChecked = !!planTasks[`${section.id}-${task}`];

                      return (
                        <button
                          key={task}
                          type="button"
                          onClick={() => handleToggleTask(section.id, task)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-accent',
                            isTaskChecked
                              ? 'border-emerald-500/20 bg-emerald-500/[0.02] text-muted-foreground'
                              : 'border-border bg-muted/10 text-foreground hover:bg-muted/20'
                          )}
                        >
                          <div className="mt-0.5 shrink-0 text-accent transition-transform hover:scale-110">
                            {isTaskChecked ? (
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                            ) : (
                              <div className="h-4 w-4 rounded border border-muted-foreground/40 bg-background" />
                            )}
                          </div>
                          <span className={cn('leading-relaxed', isTaskChecked && 'line-through text-muted-foreground/60')}>
                            {task}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Workflow Execution Layer */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Alur Kerja (Workflow Modules)</h2>
          <p className="text-sm text-muted-foreground">
            Modul eksekusi siap pakai untuk memproses operating system NGO Anda secara harian.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflowModules.map((module) => {
            const Icon = module.icon;
            const card = (
              <Card className="relative overflow-hidden h-full p-5 shadow-card transition-all duration-300 group hover:-translate-y-1 hover:border-accent/40 hover:shadow-elegant bg-card">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent/20 to-[#155F66]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F3D4F] to-[#155F66] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  {module.comingSoon ? (
                    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground">
                      Segera hadir
                    </Badge>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  )}
                </div>
                <h3 className="mt-4 font-bold text-sm tracking-tight text-foreground group-hover:text-accent transition-colors">
                  {module.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{module.description}</p>
              </Card>
            );

            if (module.href) {
              return (
                <Link
                  key={module.name}
                  to={module.href}
                  className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  aria-label={`Buka ${module.name}`}
                >
                  {card}
                </Link>
              );
            }

            return (
              <div key={module.name} className="opacity-70 cursor-not-allowed" aria-disabled="true">
                {card}
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust Doctrine Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Doktrin Kepercayaan (Trust Doctrine)</h2>
          <p className="text-sm text-muted-foreground">
            Sistem G.R.O.W.T.H. mengedepankan etika, transparansi, dan kolaborasi manusia dengan kecerdasan buatan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {doctrineCards.map((card) => (
            <Card key={card.title} className="relative overflow-hidden border-dashed bg-card/60 p-5 hover:bg-card hover:border-accent/40 transition-colors">
              <div className="absolute top-0 left-0 h-1 w-8 bg-accent" />
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <h3 className="mt-3 font-bold text-sm text-foreground">{card.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}