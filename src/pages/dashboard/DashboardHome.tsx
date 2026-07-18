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
import { MOCK_GRANTS } from '@/lib/grantfinder/mockGrants';
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
  const [hasManuallySelected, setHasManuallySelected] = useState(false);

  // Query organization memberships for the current user
  const { data: membership, isLoading: isMembershipLoading, isError: isMembershipError, error: membershipError } = useQuery({
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

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // Query organization details
  const { data: organization, isLoading: isOrgLoading, isError: isOrgError, error: orgError } = useQuery({
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
  const { data: dbScores, isLoading: isScoresLoading, isError: isScoresError, error: scoresError } = useQuery({
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

  // Query all program assessments for the organization to compute average/highest maturity level
  const { data: assessments = [], isLoading: isAssessmentsLoading, isError: isAssessmentsError, error: assessmentsError } = useQuery({
    queryKey: ['impact_readiness_assessments', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('impact_readiness_assessments')
        .select('*')
        .eq('org_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Compute program maturity level and count
  const kematanganStats = useMemo(() => {
    if (!assessments || assessments.length === 0) {
      return {
        hasAssessments: false,
        totalAssessed: 0,
        bestLevel: 'Belum dinilai',
        bestLevelText: 'Asesmen kesiapan program belum diisi.',
      };
    }

    const levels = (assessments ?? []).map((a: any) => a.level);
    let bestLevel = 'Activity-Driven';
    let bestLevelText = 'Fokus pada penyelesaian aktivitas lapangan sehari-hari.';

    if (levels.includes('impact')) {
      bestLevel = 'Impact-Driven';
      bestLevelText = 'Sistem fokus penuh pada perubahan berkelanjutan jangka panjang.';
    } else if (levels.includes('output')) {
      bestLevel = 'Output-Driven';
      bestLevelText = 'Sistem mulai berorientasi pada pencapaian luaran/output.';
    }

    return {
      hasAssessments: true,
      totalAssessed: assessments.length,
      bestLevel,
      bestLevelText,
    };
  }, [assessments]);

  // Query resource access platforms to compute registered platforms count
  const { data: dbPlatforms, isLoading: isPlatformsLoading, isError: isPlatformsError, error: platformsError } = useQuery({
    queryKey: ['resource_access_platforms', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('resource_access_platforms')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Query 90-day plan progress from Supabase
  const { data: dbProgress, isLoading: isProgressLoading, isError: isProgressError, error: progressError, refetch: refetchProgress } = useQuery({
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

  useEffect(() => {
    if (dbProgress) {
      const mapped: Record<string, boolean> = {};
      (dbProgress ?? []).forEach((item) => {
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
        return (sum ?? 0) + (scores[key] ?? 0);
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

    const total = categoryScores.reduce<number>((sum, category) => (sum ?? 0) + (category.score ?? 0), 0);
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
    const totalTasks = PLAN_SECTIONS.reduce((sum, sec) => (sum ?? 0) + (sec.tasks?.length ?? 0), 0);
    const completedTasks = PLAN_SECTIONS.reduce((sum, sec) => {
      return (sum ?? 0) + (sec.tasks?.filter((task) => planTasks[`${sec.id}-${task}`])?.length ?? 0);
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
      const completedCount = (sec.tasks ?? []).filter((task) => planTasks[`${sec.id}-${task}`]).length;
      const totalCount = sec.tasks?.length ?? 0;
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

  // Automatically expand the first non-completed phase on load
  useEffect(() => {
    if (!hasManuallySelected && phasesProgress && phasesProgress.length > 0) {
      const firstIncomplete = phasesProgress.find((p) => p.status !== 'Done');
      if (firstIncomplete) {
        setExpandedSection(firstIncomplete.id);
      }
    }
  }, [phasesProgress, hasManuallySelected]);

  // Compute registered platforms count using dbPlatforms query data
  const registeredPlatformsCount = useMemo(() => {
    if (!dbPlatforms) return 0;
    return (dbPlatforms ?? []).filter((p: any) => p.status && p.status !== 'not_started').length;
  }, [dbPlatforms]);

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

      if (error) throw error;
      void refetchProgress();
      toast.success('Progress berhasil diperbarui');
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DashboardHome] Task update error:', err);
      toast.error('Gagal memperbarui status tugas: ' + ((err as Error)?.message ?? 'Silakan coba lagi.'));
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

  const isAnyError = isMembershipError || isOrgError || isScoresError || isAssessmentsError || isPlatformsError || isProgressError;
  const anyError = membershipError || orgError || scoresError || assessmentsError || platformsError || progressError;

  if (isAnyError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <p className="text-red-500 text-sm">
          Gagal memuat data: {(anyError as Error)?.message ?? 'Kesalahan tidak diketahui'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-teal-600 underline">
          Muat Ulang
        </button>
      </div>
    );
  }

  if (isMembershipLoading || (!!orgId && (isOrgLoading || isScoresLoading || isProgressLoading || isAssessmentsLoading))) {
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
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in-up">
      {/* ZONE 1: Status Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[brand-border]/30 bg-[brand-active] p-6 text-white shadow-elegant md:p-8 animate-fade-in-up">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-accent/25 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/30 bg-white/15 text-white hover:bg-white/15">
                NGO Growth OS Command Center
              </Badge>
              <Badge className="border-accent/40 bg-[brand-amber]/20 text-[brand-amber] font-medium animate-pulse-glow">
                Sistem Aktif
              </Badge>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white/90">
                <Building2 className="h-4.5 w-4.5 text-accent shrink-0" />
                <span className="text-sm font-bold tracking-wider uppercase opacity-75">{orgName}</span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
                Selamat datang kembali, {name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/80 max-w-2xl">
                Sistem Anda aktif. <span className="font-extrabold text-accent">{registeredPlatformsCount}</span> platform terdaftar, <span className="font-extrabold text-accent">{MOCK_GRANTS.length}</span> peluang grant aktif.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/dashboard/readiness"
                className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground transition-all duration-300 hover:bg-accent/95 hover:shadow-elegant hover:scale-[1.02] active:scale-[0.98]"
              >
                Ubah Baseline Readiness
              </Link>
              <Link
                to="/dashboard/resource-access"
                className="inline-flex h-9 items-center justify-center rounded-md bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Kelola Platform
              </Link>
            </div>
          </div>

          {/* G.R.O.W.T.H Category Progress Chips */}
          <div className="flex flex-col gap-2 bg-black/20 border border-white/10 p-4 rounded-xl shrink-0 md:max-w-xs w-full">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/60 mb-1">
              G.R.O.W.T.H. Score Baseline
            </span>
            <div className="grid grid-cols-3 gap-2">
              {scoreResult.categoryScores.map((cat) => {
                const isFull = cat.score === cat.max;
                const isPartial = cat.score > 0 && cat.score < cat.max;
                return (
                  <div
                    key={cat.code}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg p-2 border text-center transition-all duration-300 shadow-sm",
                      isFull
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : isPartial
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-white/5 text-white/40 border-white/10"
                    )}
                    title={`${cat.title}: ${cat.score}/${cat.max}`}
                  >
                    <span className="text-xs font-black">{cat.code}</span>
                    <span className="text-[10px] font-semibold mt-0.5">{cat.score}/{cat.max}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Section Grid: Status Baseline & ZONE 2 Priorities */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* GROWTH Status Baseline Card */}
        <Card className="group relative overflow-hidden flex flex-col justify-between border-border bg-card p-5 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-[brand-border]/30">
          <div className="absolute top-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-500" />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kematangan Sistem</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                  Status Baseline NGO
                </h2>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            {!scoreResult.hasScores ? (
              <div className="rounded-lg bg-amber-500/10 p-4 border border-amber-500/20 animate-pulse-glow">
                <p className="text-sm font-bold text-amber-500">Baseline Belum Dibuat</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Lakukan audit kesiapan operasional pertama Anda untuk memetakan kekuatan sistem NGO Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3.5 border border-border">
                  <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Level Saat Ini</p>
                  <p className="text-sm font-black text-foreground">{scoreResult.level.title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{scoreResult.level.description}</p>
                </div>

                {lastUpdatedStr && (
                  <div className="space-y-2 border-t border-border pt-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Terakhir Diperbarui:</span>
                      <span className="font-semibold text-foreground">{lastUpdatedStr}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-500 font-medium">
                      <span>Progres vs Baseline:</span>
                      <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
                        +{scoreResult.total > 20 ? 15 : 5} pts peningkatan
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Link
              to="/dashboard/readiness"
              className="inline-flex items-center text-xs font-bold text-accent hover:text-accent/95 hover:underline transition-transform duration-200 hover:translate-x-0.5"
            >
              {scoreResult.hasScores ? 'Perbarui Baseline Kesiapan' : 'Mulai Baseline Kesiapan'}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Kematangan Program Card (Fitur 1 MVP) */}
        <Card className="group relative overflow-hidden flex flex-col justify-between border-border bg-card p-5 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-[brand-border]/30">
          <div className="absolute top-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-500" />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kesiapan Dampak</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                  Kematangan Program
                </h2>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3.5 border border-border">
                <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Maturity Terkini</p>
                <p className="text-sm font-black text-foreground">{kematanganStats.bestLevel}</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {kematanganStats.bestLevelText}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-border pt-3.5">
                <span className="text-muted-foreground">Program Dinilai:</span>
                <Badge variant="outline" className="font-bold border-accent/20 bg-accent/5 text-accent">
                  {kematanganStats.totalAssessed} Asesmen
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Link
              to="/dashboard/readiness?tab=program"
              className="inline-flex items-center text-xs font-bold text-accent hover:text-accent/95 hover:underline transition-transform duration-200 hover:translate-x-0.5"
            >
              Evaluasi Kesiapan Program
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* ZONE 2: Rekomendasi Prioritas Utama */}
        <Card className="group/priorities relative overflow-hidden p-5 shadow-card border-border bg-card lg:col-span-2 flex flex-col justify-between transition-all duration-300 hover:shadow-elegant">
          <div className="absolute top-0 left-0 h-1 w-0 bg-[brand-border] group-hover/priorities:w-full transition-all duration-500" />
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Rekomendasi Prioritas Utama</h2>
              <Badge variant="outline" className="border-accent/30 bg-accent-soft/30 text-accent font-medium animate-pulse-glow">
                Dinamis Sesuai Gap
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {scoreResult.hasScores
                ? 'Langkah prioritas berdasarkan area pertumbuhan dengan skor audit terendah Anda.'
                : 'Langkah awal standar untuk memulai operasional nonprofit secara terstruktur.'}
            </p>

            <div className="mt-5 space-y-3.5">
              {scoreResult.nextActions.map((action, idx) => (
                <div
                  key={action.title}
                  className="group/act flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-all duration-300 hover:bg-muted/40 hover:border-accent/20"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent text-sm font-extrabold shadow-sm transition-transform duration-300 group-hover/act:scale-105">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground transition-colors duration-200 group-hover/act:text-accent leading-snug">
                          {action.title}
                        </h3>
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                          Layer {action.code}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={action.link}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-accent hover:border-accent/30 transition-all duration-300 group-hover/act:bg-accent group-hover/act:text-accent-foreground group-hover/act:border-accent"
                    aria-label={action.linkText}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {scoreResult.hasScores && (
            <div className="mt-5 border-t border-border pt-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
              Sistem mendeteksi gap terendah secara real-time dan menyusun prioritas otomatis.
            </div>
          )}
        </Card>
      </div>

      {/* Redesigned 90-Day Plan Checklist Section (Zone 3) */}
      <Card className="group relative overflow-hidden border-border bg-card p-6 shadow-card hover:shadow-elegant transition-all duration-300">
        <div className="absolute top-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-500" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Interactive 90-Day Plan</h2>
              <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/20 animate-pulse-glow">
                Operating Rhythm
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau progres implementasi sistem organisasi Anda di setiap tahapan pertumbuhan.
            </p>
          </div>

          {/* Premium Progress Badge */}
          <div className="flex items-center gap-4 bg-muted/30 border border-border px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-muted/50">
            <div className="flex flex-col text-right">
              <span className="text-xs text-muted-foreground font-medium">Progress Penyelesaian</span>
              <span className="text-sm font-bold text-foreground">
                {planStats.completed} dari {planStats.total} tugas ({planStats.percentage}%)
              </span>
            </div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-bold border border-accent/20 animate-pulse-glow">
              {planStats.percentage}%
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border mb-6">
          <div
            className="h-full bg-gradient-to-r from-accent via-[brand-border] to-[brand-accent] transition-all duration-500"
            style={{ width: `${planStats.percentage}%` }}
          />
        </div>

        {/* Visual Stepper / Timeline Header */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center min-w-0 justify-between gap-3 relative">
            {/* Stepper horizontal connector line */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-muted -translate-y-1/2 z-0 hidden md:block" />

            {phasesProgress.map((sec, idx) => {
              const isActive = expandedSection === sec.id;
              const isDone = sec.status === 'Done';
              const isInProgress = sec.status === 'In Progress';

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setExpandedSection(sec.id);
                    setHasManuallySelected(true);
                  }}
                  className={cn(
                    "relative z-10 flex-1 flex flex-col items-center p-3 rounded-xl border text-center transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-accent",
                    isActive
                      ? "bg-[brand-active] border-[brand-border]/50 text-white shadow-elegant scale-[1.02]"
                      : isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/15"
                      : isInProgress
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/15"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {/* Step status dot */}
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold mb-1.5 border shadow-sm transition-all duration-300",
                      isActive
                        ? "bg-white text-[brand-active] border-white"
                        : isDone
                        ? "bg-emerald-500 text-white border-emerald-400"
                        : isInProgress
                        ? "bg-amber-500 text-white border-amber-400"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {isDone && !isActive ? "✓" : idx + 1}
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                    {sec.day}
                  </span>
                  <span className="text-[11px] font-bold leading-tight truncate max-w-[110px] mt-0.5">
                    {sec.phase}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expanded Detailed Active Phase Card */}
        {(() => {
          const activeSection = phasesProgress.find((sec) => sec.id === expandedSection) || phasesProgress[0];
          if (!activeSection) return null;

          return (
            <div className="mt-6 rounded-2xl border border-accent/20 bg-accent-soft/10 p-6 md:p-8 shadow-inner animate-fade-in">
              <div className="grid gap-6 md:grid-cols-5">
                {/* Left side: Phase overview */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/20 font-bold uppercase tracking-wider text-[10px]">
                      Fase Aktif: {activeSection.day}
                    </Badge>
                    <h3 className="text-xl font-extrabold text-foreground mt-2 leading-tight">
                      {activeSection.phase}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Fokus Layer G.R.O.W.T.H: <span className="font-bold text-accent">{activeSection.layer}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Progres Fase Ini</span>
                      <span className="font-bold text-foreground">
                        {activeSection.completedCount} / {activeSection.totalCount} ({activeSection.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          activeSection.status === "Done" ? "bg-emerald-500" : "bg-accent"
                        )}
                        style={{ width: `${activeSection.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/50 p-4 text-xs text-muted-foreground leading-relaxed">
                    Penyelesaian tugas di fase ini membantu memperkuat sistem operasional NGO Anda secara bertahap dan teratur.
                  </div>

                  {activeSection.status === 'Done' && (
                    <Button
                      type="button"
                      className="w-full h-10 text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 gap-1.5 transition-transform duration-200 active:scale-[0.98] shadow-sm"
                      onClick={() => handleCompletePhase(activeSection.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Fase Berhasil Selesai!
                    </Button>
                  )}
                </div>

                {/* Right side: Interactive tasks checkboxes */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-widest mb-1.5">
                    Checklist Tugas:
                  </h4>
                  <div className="space-y-2.5">
                    {activeSection.tasks.map((task) => {
                      const isTaskChecked = !!planTasks[`${activeSection.id}-${task}`];

                      return (
                        <button
                          key={task}
                          type="button"
                          role="checkbox"
                          aria-checked={isTaskChecked}
                          onClick={() => handleToggleTask(activeSection.id, task)}
                          className={cn(
                            'group/task flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent active:scale-[0.98]',
                            isTaskChecked
                              ? 'border-emerald-500/20 bg-emerald-500/[0.02] text-muted-foreground/80 shadow-inner'
                              : 'border-border bg-card text-foreground hover:bg-muted/30 hover:border-accent/20 hover:shadow-sm'
                          )}
                        >
                          <div className="mt-0.5 shrink-0 text-accent transition-all duration-200 group-hover/task:scale-110">
                            {isTaskChecked ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-fade-in" />
                            ) : (
                              <div className="h-4 w-4 rounded-md border border-muted-foreground/40 bg-background transition-all group-hover/task:border-accent" />
                            )}
                          </div>
                          <span className={cn('leading-normal transition-colors duration-200', isTaskChecked && 'line-through text-muted-foreground/45')}>
                            {task}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
              <Card className="relative overflow-hidden h-full p-5 shadow-card transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-accent/20 group-hover:shadow-elegant bg-card">
                <div className="absolute top-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-300" />
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[brand-active] to-[brand-border] text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold text-[10px] shadow-sm transition-all duration-300 group-hover:bg-emerald-500/25">
                    {module.status}
                  </Badge>
                </div>
                <h3 className="mt-4 font-bold text-sm tracking-tight text-foreground group-hover:text-accent transition-colors duration-300">
                  {module.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{module.description}</p>
                <div className="mt-4 flex items-center text-xs font-bold text-accent opacity-0 group-hover:opacity-100 transition-all duration-300">
                  Buka Modul <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Card>
            );

            if (module.href) {
              return (
                <Link
                  key={module.name}
                  to={module.href}
                  className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-transform duration-200 active:scale-[0.99]"
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
      <section className="space-y-4 animate-fade-in-up delay-100">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Doktrin Kepercayaan (Trust Doctrine)</h2>
          <p className="text-sm text-muted-foreground">
            Sistem G.R.O.W.T.H. mengedepankan etika, transparansi, dan kolaborasi manusia dengan kecerdasan buatan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {doctrineCards.map((card) => (
            <Card key={card.title} className="group relative overflow-hidden border-dashed bg-card/60 p-5 hover:bg-card hover:border-accent/40 hover:shadow-sm transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-300" />
              <Sparkles className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
              <h3 className="mt-3 font-bold text-sm text-foreground transition-colors group-hover:text-accent">{card.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}