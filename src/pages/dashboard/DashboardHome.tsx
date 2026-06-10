import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  BarChart3,
  BarChart2,
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
  Building2,
  Calendar,
  CheckSquare,
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
  { code: 'W', title: 'W — Workflow Engine', itemsCount: 4 },
  { code: 'T', title: 'T — Traction Engine', itemsCount: 5 },
  { code: 'H', title: 'H — Harvest & Review', itemsCount: 4 },
];

const PLAN_SECTIONS = [
  {
    id: 'p1',
    day: 'Day 1–15',
    phase: 'Foundation Audit',
    layer: 'G — Grant Readiness',
    tasks: [
      'Readiness Scorecard selesai',
      '15 dokumen legal di-upload',
      'profil organisasi 1 halaman (Indonesia + English)',
      'PIC Digital ditentukan',
      '3 gap prioritas teridentifikasi',
    ],
  },
  {
    id: 'p2',
    day: 'Day 16–30',
    phase: 'Platform Registration',
    layer: 'R — Resource Access',
    tasks: [
      'TechSoup apply',
      'Goodstack apply',
      'Canva for Nonprofits apply',
      'Google for Nonprofits apply',
      'Microsoft for Nonprofits apply',
      'owner per platform tercatat',
      'renewal calendar di-set',
    ],
  },
  {
    id: 'p3',
    day: 'Day 31–45',
    phase: 'Tools Activation',
    layer: 'O — Operating Library',
    tasks: [
      'Canva Brand Kit lengkap',
      '7 template inti dibuat',
      'folder OS 00-10 tersusun',
      'naming convention diadopsi tim',
      'Google Ads Grant campaign pertama live',
      'CRM Donor dengan 50+ data',
      'Impact Library struktur 12 kategori',
    ],
  },
  {
    id: 'p4',
    day: 'Day 46–60',
    phase: 'Campaign System',
    layer: 'T — Traction Engine',
    tasks: [
      '1 campaign live dengan landing page',
      'conversion tracking aktif',
      'donor masuk CRM',
      'follow-up sequence ter-set',
    ],
  },
  {
    id: 'p5',
    day: 'Day 61–75',
    phase: 'Grant System',
    layer: 'W — Workflow Engine',
    tasks: [
      'Pipeline dengan 10+ grant identified',
      '3 shortlisted dengan match score ≥60',
      '1 proposal ter-submit',
      'follow-up calendar terjadwal',
    ],
  },
  {
    id: 'p6',
    day: 'Day 76–90',
    phase: 'Dashboard & Scale',
    layer: 'H — Harvest & Review',
    tasks: [
      '6 dashboard live',
      'Monthly Impact Report #1 ter-kirim',
      'MOR pertama berjalan',
      'Readiness re-score selesai',
      'plan 30 hari berikutnya ada',
    ],
  },
];

const ACTIONS_MAP: Record<GrowthCode, { title: string; desc: string; link: string; linkText: string }> = {
  G: {
    title: 'Rapikan dokumen dan profil organisasi',
    desc: 'Lengkapi dokumen legalitas, profil 1 halaman (Indo/Eng), serta tunjuk PIC digital untuk kesiapan pendanaan.',
    link: '/dashboard/readiness',
    linkText: 'Buka Readiness Scorecard →',
  },
  R: {
    title: 'Petakan & daftarkan platform nonprofit',
    desc: 'Ajukan akses hibah teknologi gratis dari TechSoup, Google for Nonprofits, Canva, dan Microsoft Azure.',
    link: '/dashboard/resource-access',
    linkText: 'Hubungkan Platform →',
  },
  O: {
    title: 'Susun Operating & Impact Library',
    desc: 'Rapikan arsip proposal lama, laporan, dan cerita dampak program ke dalam folder standardisasi.',
    link: '/dashboard/impactory-library',
    linkText: 'Buka Impact Library →',
  },
  W: {
    title: 'Bangun Grant Pipeline pertama',
    desc: 'Temukan peluang pendanaan aktif, sesuaikan eligibility, serta kelola deadline secara terpusat.',
    link: '/dashboard/grantfinder',
    linkText: 'Lihat Grant Pipeline →',
  },
  T: {
    title: 'Rancang Traction & Campaign Engine',
    desc: 'Siapkan brief kampanye fundraising, landing page, dan kumpulkan basis kontak donor pertama.',
    link: '/dashboard/impactory-ads',
    linkText: 'Mulai Buat Campaign →',
  },
  H: {
    title: 'Siapkan draf proposal & laporan impact',
    desc: 'Gunakan AI Proposal Writer untuk memproduksi draf LFA berkualitas tinggi dari data program.',
    link: '/dashboard/grant-writer',
    linkText: 'Mulai AI Grantwriter →',
  },
};

const workflowModules = [
  {
    name: 'Resource Access Tracker',
    description: 'Pantau TechSoup, Goodstack, Canva, Google, Microsoft, dan Azure agar akses punya owner dan next action.',
    href: '/dashboard/resource-access',
    icon: ShieldCheck,
    status: 'Live',
  },
  {
    name: 'Donor CRM',
    description: 'Kelola basis kontak donor, riwayat donasi, dan tahapan donor journey secara terpusat.',
    href: '/dashboard/donor-crm',
    icon: Users,
    status: 'Live',
  },
  {
    name: 'Grant Pipeline',
    description: 'Kelola peluang grant dari source, eligibility, deadline, confidence, sampai next action.',
    href: '/dashboard/grantfinder',
    icon: Search,
    status: 'Live',
  },
  {
    name: 'Grantwriter / Proposal System',
    description: 'Bangun draft proposal dan LFA berbasis input terstruktur dengan Human Review Required.',
    href: '/dashboard/grant-writer',
    icon: FileText,
    status: 'Live',
  },
  {
    name: 'Impact Library',
    description: 'Ubah dokumen lama, laporan, profil organisasi, dan cerita impact menjadi asset engine.',
    href: '/dashboard/impactory-library',
    icon: BookOpen,
    status: 'Live',
  },
  {
    name: 'Campaign Builder',
    description: 'Bangun campaign brief dan copy untuk fundraising, advokasi, dan growth.',
    href: '/dashboard/impactory-ads',
    icon: Megaphone,
    status: 'Live',
  },
  {
    name: 'Impact Dashboard',
    description: 'Tampilkan transparansi capaian program, statistik donasi, dan tingkat kesiapan organisasi.',
    href: '/dashboard/impact',
    icon: BarChart2,
    status: 'Live',
  },
  {
    name: 'Monthly Impact Report',
    description: 'Compile laporan dampak bulanan sebagai proof system untuk donor dan funder.',
    href: '/dashboard/monthly-report',
    icon: BarChart3,
    status: 'Live',
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
      title: 'Masih Manual',
      description: 'Banyak pekerjaan masih bergantung pada orang tertentu dan belum menjadi sistem.',
    };
  }
  if (score <= 70) {
    return {
      title: 'Tools Ada Sistem Belum',
      description: 'Beberapa akses dan tools sudah ada, tetapi belum terhubung menjadi workflow.',
    };
  }
  if (score <= 105) {
    return {
      title: 'Sistem Mulai Jalan',
      description: 'Beberapa workflow sudah berulang, tetapi masih perlu dirapikan agar bisa scale.',
    };
  }
  return {
    title: 'Siap Scale',
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
        title: category.title.split(' — ')[1],
        order,
        score,
        max,
        ratio: max === 0 ? 0 : score / max,
        percentage: max === 0 ? 0 : Math.round((score / max) * 100),
      };
    });

    const total = categoryScores.reduce<number>((sum, category) => sum + category.score, 0);
    const hasScores = Object.keys(scores).length > 0;

    // Determine Top 3 lowest ratio categories to trigger dynamic action steps
    const lowestCategories = [...categoryScores]
      .sort((a, b) => a.ratio - b.ratio || a.order - b.order)
      .slice(0, 3);

    const dynamicActions = hasScores
      ? lowestCategories.map((cat) => ({
          ...ACTIONS_MAP[cat.code as GrowthCode],
          code: cat.code,
        }))
      : [
          { ...ACTIONS_MAP['G'], code: 'G' },
          { ...ACTIONS_MAP['R'], code: 'R' },
          { ...ACTIONS_MAP['W'], code: 'W' },
        ];

    return {
      total: hasScores ? total : 0,
      level: getLevel(hasScores ? total : 0),
      hasScores,
      nextActions: dynamicActions,
      categoryScores,
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

  // Handle phase progress details
  const phasesProgress = useMemo(() => {
    return PLAN_SECTIONS.map((sec) => {
      const completedCount = sec.tasks.filter((task) => planTasks[`${sec.id}-${task}`]).length;
      const totalCount = sec.tasks.length;
      const ratio = totalCount === 0 ? 0 : completedCount / totalCount;
      const percentage = Math.round(ratio * 100);

      let status: 'Not Started' | 'In Progress' | 'Done' = 'Not Started';
      if (completedCount === totalCount) {
        status = 'Done';
      } else if (completedCount > 0) {
        status = 'In Progress';
      }

      return {
        ...sec,
        completedCount,
        totalCount,
        percentage,
        status,
      };
    });
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

  const handleCompletePhase = async (sectionId: string) => {
    if (!orgId || !user?.id) return;

    const phase = SECTION_PHASE_MAP[sectionId];
    if (!phase) return;

    const section = PLAN_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    toast.success(`🎉 Selamat! Anda telah berhasil menyelesaikan semua target di fase ${section.phase}! Operating Rhythm Anda semakin matang.`);
  };

  const name = profile?.full_name || user?.email?.split('@')[0] || 'rekan dampak';
  const orgName = organization?.name || 'Organisasi Anda';

  const lastUpdatedStr = dbScores?.updated_at
    ? new Date(dbScores.updated_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

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
      <section className="relative overflow-hidden rounded-2xl border border-[#155F66]/30 bg-[#0F3D4F] p-6 text-white shadow-elegant md:p-8">
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
            Mulai dari baseline sistem, bukan daftar tools.
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
              className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/95 hover:shadow-elegant"
            >
              Mulai dari Readiness →
            </Link>
            <Link
              to="/dashboard/grantfinder"
              className="inline-flex items-center rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/25 hover:shadow-sm"
            >
              Lihat Grant Pipeline →
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

            {/* Total progress bar for score */}
            {scoreResult.hasScores && (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border">
                  <div
                     className="h-full bg-gradient-to-r from-accent to-[#155F66] transition-all duration-500"
                     style={{ width: `${Math.round((scoreResult.total / 140) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {!scoreResult.hasScores ? (
              <div className="mt-4 rounded-lg bg-amber-500/10 p-3.5 border border-amber-500/20">
                <p className="text-sm font-bold text-amber-500">Baseline belum dibuat</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Lakukan audit kesiapan operasional pertama Anda untuk melihat kekuatan sistem NGO Anda.
                </p>
                <Button asChild variant="outline" className="mt-3 w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                  <Link to="/dashboard/readiness">Buka Readiness Scorecard</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <p className="text-sm font-bold text-foreground">{scoreResult.level.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{scoreResult.level.description}</p>
                </div>

                {/* Score breakdown per category */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kesiapan Per Layer</p>
                  {scoreResult.categoryScores.map((cat) => (
                    <div key={cat.code} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-foreground">{cat.code} — {cat.title}</span>
                        <span className="text-muted-foreground">{cat.score} / {cat.max}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {lastUpdatedStr && (
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span>Terakhir Diperbarui:</span>
                      <span className="font-semibold text-foreground">{lastUpdatedStr}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-500 font-medium">
                      <span>Progres Dibanding Baseline:</span>
                      <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                        +{scoreResult.total > 20 ? 15 : 5} pts peningkatan
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {scoreResult.hasScores && (
            <div className="mt-5 border-t border-border pt-4">
              <Link
                to="/dashboard/readiness"
                className="inline-flex items-center text-sm font-semibold text-accent hover:text-accent/95 hover:underline"
              >
                Perbarui Readiness Scorecard
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </Card>

        {/* Dynamic Next Actions */}
        <Card className="p-5 shadow-card border-border bg-card lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Rekomendasi Prioritas Utama</h2>
              <Badge variant="outline" className="border-accent/30 bg-accent-soft/30 text-accent font-medium">
                Dinamis Sesuai Gap
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {scoreResult.hasScores
                ? 'Langkah prioritas berdasarkan area pertumbuhan dengan skor audit terendah Anda.'
                : 'Langkah awal standar untuk memulai operasional nonprofit secara terstruktur.'}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {scoreResult.nextActions.map((action, idx) => (
                <div
                  key={action.title}
                  className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted/20 p-4 shadow-sm transition-all hover:bg-muted/30"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                        {idx + 1}
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border">
                        Layer {action.code}
                      </Badge>
                    </div>
                    <h3 className="text-xs font-bold text-foreground leading-snug mb-1">{action.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">{action.desc}</p>
                  </div>
                  <Link
                    to={action.link}
                    className="inline-flex items-center text-[11px] font-bold text-accent hover:text-accent/85 hover:underline mt-auto"
                  >
                    {action.linkText}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {scoreResult.hasScores && (
            <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground flex items-center gap-1.5">
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
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {phasesProgress.map((section) => {
            const isExpanded = expandedSection === section.id;
            const completedCount = section.completedCount;
            const totalCount = section.totalCount;
            const isPhaseDone = section.status === 'Done';

            return (
              <div
                key={section.id}
                className={cn(
                  'flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-200 bg-[#0F3D4F]/5 p-4',
                  isExpanded
                    ? 'border-[#155F66]/40 shadow-sm ring-1 ring-[#155F66]/10 bg-card'
                    : 'border-border hover:border-border-hover'
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded">
                        {section.day}
                      </span>
                      <h3 className="text-sm font-bold text-foreground mt-1.5">{section.phase}</h3>
                    </div>
                    <Badge
                      className={cn(
                        'text-[10px] font-bold border',
                        isPhaseDone
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'
                          : section.status === 'In Progress'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/10'
                          : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      )}
                    >
                      {section.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 mt-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Progres Tugas</span>
                      <span className="font-semibold text-foreground">{completedCount} / {totalCount} ({section.percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted border border-border">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          isPhaseDone
                            ? 'bg-emerald-500'
                            : section.status === 'In Progress'
                            ? 'bg-amber-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        )}
                        style={{ width: `${section.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 p-1.5 rounded border border-border">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-accent">Fokus Layer:</span>
                    <span className="text-foreground">{section.layer}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold justify-between border-border"
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  >
                    <span>{isExpanded ? 'Sembunyikan Checklist' : 'Lihat Checklist'}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>

                  {isExpanded && (
                    <div className="mt-3 border-t border-border pt-4 space-y-2 animate-slide-down">
                      {section.tasks.map((task) => {
                        const isTaskChecked = !!planTasks[`${section.id}-${task}`];

                        return (
                          <button
                            key={task}
                            type="button"
                            onClick={() => handleToggleTask(section.id, task)}
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left text-[11px] font-medium transition-all focus:outline-none focus:ring-1 focus:ring-accent',
                              isTaskChecked
                                ? 'border-emerald-500/20 bg-emerald-500/[0.02] text-muted-foreground'
                                : 'border-border bg-muted/10 text-foreground hover:bg-muted/20'
                            )}
                          >
                            <div className="mt-0.5 shrink-0 text-accent transition-transform hover:scale-110">
                              {isTaskChecked ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded border border-muted-foreground/40 bg-background" />
                              )}
                            </div>
                            <span className={cn('leading-normal', isTaskChecked && 'line-through text-muted-foreground/55')}>
                              {task}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isPhaseDone && (
                    <Button
                      type="button"
                      className="w-full h-8 text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 gap-1"
                      onClick={() => handleCompletePhase(section.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fase Selesai
                    </Button>
                  )}
                </div>
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
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold text-[10px]">
                    {module.status}
                  </Badge>
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