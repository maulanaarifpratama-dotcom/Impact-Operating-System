import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Link } from 'react-router-dom';
import {
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  Sparkles,
  Briefcase,
  Award,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOrgCarbonSummary } from '@/lib/carbon/aggregation';


// Helpers for score card maturity levels
function getLevel(score: number) {
  if (score <= 35) {
    return 'Masih manual';
  }
  if (score <= 70) {
    return 'Tools ada, sistem belum';
  }
  if (score <= 105) {
    return 'Sistem mulai jalan';
  }
  return 'Siap scale';
}

function getImpactReadinessLevel(score: number) {
  if (score <= 10) {
    return 'Activity-Driven (Kematangan Awal)';
  }
  if (score <= 18) {
    return 'Output-Driven (Kematangan Menengah)';
  }
  return 'Impact-Driven (Kematangan Tinggi)';
}

export default function ImpactDashboard() {
  const { user } = useAuth();

  // 1. Fetch organization member details
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization_members_exec_summary', user?.id],
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

  const organizationId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // 2. Fetch Organization Details
  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organizations_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // 3. Fetch G.R.O.W.T.H. Readiness Score
  const { data: readinessScore, isLoading: isReadinessLoading } = useQuery({
    queryKey: ['readiness_scores_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // 4. Fetch LFA Projects
  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['lfa_projects_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('org_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 5. Fetch Donors
  const { data: donors = [], isLoading: isDonorsLoading } = useQuery({
    queryKey: ['donors_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 6. Fetch Donations
  const { data: donations = [], isLoading: isDonationsLoading } = useQuery({
    queryKey: ['donations_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 7. Fetch Grant Pipeline (gw_projects)
  const { data: gwProjects = [], isLoading: isGwProjectsLoading } = useQuery({
    queryKey: ['gw_projects_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 8. Fetch SROI Configurations
  const { data: sroiConfigs = [], isLoading: isSroiLoading } = useQuery({
    queryKey: ['lfa_sroi_config_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('lfa_sroi_config')
        .select('*')
        .eq('org_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 9. Fetch Impact Readiness Assessments
  const { data: assessments = [], isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ['impact_readiness_assessments_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('impact_readiness_assessments')
        .select('*')
        .eq('org_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 10. Fetch Beneficiaries Summaries
  const { data: beneficiariesSummary = [], isLoading: isBeneficiariesSummaryLoading } = useQuery({
    queryKey: ['beneficiaries_summary_exec_summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      try {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('id, status')
          .eq('org_id', organizationId);
        
        if (error) {
          if (
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table') ||
            error.code?.includes('42P01') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205'
          ) {
            console.warn('Using localStorage fallback for executive summary beneficiaries count:', error);
            const saved = localStorage.getItem('impactory_local_beneficiaries');
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.map((b: any) => ({ id: b.id, status: b.status }));
          }
          throw error;
        }
        return data || [];
      } catch (err) {
        console.warn('Beneficiaries query failed in dashboard, falling back to localStorage:', err);
        const saved = localStorage.getItem('impactory_local_beneficiaries');
        const parsed = saved ? JSON.parse(saved) : [];
        return parsed.map((b: any) => ({ id: b.id, status: b.status }));
      }
    },
    enabled: !!organizationId,
  });

  // 11. Fetch Cumulative Carbon Summary
  const { data: carbonData, isLoading: isCarbonLoading } = useQuery({
    queryKey: ['org-carbon-summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return getOrgCarbonSummary(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000
  });

  // Global Loading State
  const isLoading =
    isMembershipLoading ||
    isOrgLoading ||
    isReadinessLoading ||
    isProgramsLoading ||
    isDonorsLoading ||
    isDonationsLoading ||
    isGwProjectsLoading ||
    isSroiLoading ||
    isAssessmentsLoading ||
    isBeneficiariesSummaryLoading ||
    isCarbonLoading;

  // Formatting Date Helper
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    // GROWTH SCORE
    const scoreG = readinessScore?.score_g || 0;
    const scoreR = readinessScore?.score_r || 0;
    const scoreO = readinessScore?.score_o || 0;
    const scoreW = readinessScore?.score_w || 0;
    const scoreT = readinessScore?.score_t || 0;
    const scoreH = readinessScore?.score_h || 0;
    const growthTotalScore = scoreG + scoreR + scoreO + scoreW + scoreT + scoreH;
    const growthLevel = getLevel(growthTotalScore);

    // PROGRAMS
    const totalPrograms = programs.length;
    const onTrackPrograms = programs.filter((p: any) => p.status === 'active').length;
    const completedPrograms = programs.filter((p: any) => p.status === 'completed').length;

    // FUNDRAISING
    const totalDonors = donors.length;
    const totalDonationsAmount = donations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const activeGrants = gwProjects.filter((g: any) => g.status !== 'draft').length;

    // SROI
    let highestSroiRatio = 0;
    let sroiProjectName = '';
    if (sroiConfigs.length > 0) {
      const highestConfig = [...sroiConfigs].sort((a, b) => (b.sroi_ratio || 0) - (a.sroi_ratio || 0))[0];
      highestSroiRatio = highestConfig?.sroi_ratio || 0;
      const matchingProject = programs.find((p: any) => p.id === highestConfig?.lfa_project_id);
      sroiProjectName = matchingProject?.name || 'Program SROI';
    }

    // IMPACT READINESS ASSESSMENT
    let latestAssessmentScore = 0;
    let latestAssessmentLevel = 'Belum ada asesmen';
    if (assessments.length > 0) {
      // Find the assessment with the highest scores or latest
      const sortedAssessments = [...assessments].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      const latest = sortedAssessments[0];
      latestAssessmentScore =
        (latest.score_q1 || 0) +
        (latest.score_q2 || 0) +
        (latest.score_q3 || 0) +
        (latest.score_q4 || 0) +
        (latest.score_q5 || 0);
      latestAssessmentLevel = getImpactReadinessLevel(latestAssessmentScore);
    }

    // BENEFICIARIES SUMMARY
    const totalBeneficiariesCount = beneficiariesSummary.length;
    const activeBeneficiariesCount = beneficiariesSummary.filter((b: any) => b.status === 'active').length;
    const alumniBeneficiariesCount = beneficiariesSummary.filter((b: any) => b.status === 'alumni').length;

    // NEXT ACTIONS (AI-free, Rule-based, max 3)
    const nextActions: { text: string; href: string }[] = [];
    if (growthTotalScore < 100) {
      nextActions.push({ text: 'Lengkapi Readiness Scorecard', href: '/dashboard/readiness' });
    }
    if (totalPrograms === 0) {
      nextActions.push({ text: 'Buat program pertama di LFA Builder', href: '/dashboard/lfa-builder' });
    }
    if (totalDonationsAmount === 0) {
      nextActions.push({ text: 'Setup Donor CRM & catat donasi pertama', href: '/dashboard/donor-crm' });
    }
    if (highestSroiRatio === 0 && totalPrograms > 0) {
      nextActions.push({ text: 'Hitung SROI program kamu', href: '/dashboard/sroi' });
    }
    if (latestAssessmentScore <= 10 && assessments.length > 0) {
      nextActions.push({
        text: 'Tingkatkan kematangan program ke Output-Driven',
        href: '/dashboard/readiness?tab=program',
      });
    }

    return {
      scoreG,
      scoreR,
      scoreO,
      scoreW,
      scoreT,
      scoreH,
      growthTotalScore,
      growthLevel,
      totalPrograms,
      onTrackPrograms,
      completedPrograms,
      totalDonors,
      totalDonationsAmount,
      activeGrants,
      highestSroiRatio,
      sroiProjectName,
      latestAssessmentScore,
      latestAssessmentLevel,
      totalBeneficiariesCount,
      activeBeneficiariesCount,
      alumniBeneficiariesCount,
      nextActions: nextActions.slice(0, 3),
    };
  }, [readinessScore, programs, donors, donations, gwProjects, sroiConfigs, assessments, beneficiariesSummary]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[brand-border]" />
          <p className="text-sm text-muted-foreground animate-pulse">Menyiapkan Executive Summary…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-4 md:p-6 max-w-6xl">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6 border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[brand-active] dark:text-white">
            Executive Summary
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ringkasan kesehatan organisasi untuk leadership dan donor
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {organization && (
            <Badge className="bg-[brand-border] text-white px-3 py-1 text-xs font-semibold hover:bg-[brand-border]/90">
              <Building2 className="h-3 w-3 mr-1.5" />
              {organization.name}
            </Badge>
          )}
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
            <Calendar className="h-3 w-3 mr-1.5 text-slate-400" />
            Update: {formattedToday}
          </Badge>
        </div>
      </div>

      {/* Grid Layout: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. G.R.O.W.T.H. SCORE CARD */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  G.R.O.W.T.H. Readiness Score
                </CardTitle>
                <CardDescription className="text-xs">Kesiapan operasional NGO</CardDescription>
              </div>
              <Badge variant="secondary" className="font-extrabold text-xs">
                {metrics.growthLevel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[brand-border] dark:text-teal-400">
                {metrics.growthTotalScore}
              </span>
              <span className="text-sm text-slate-400 font-semibold">/ 150</span>
            </div>

            {/* score dimensions grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
              {[
                { label: 'G', val: metrics.scoreG, title: 'Grant' },
                { label: 'R', val: metrics.scoreR, title: 'Resource' },
                { label: 'O', val: metrics.scoreO, title: 'Library' },
                { label: 'W', val: metrics.scoreW, title: 'Workflow' },
                { label: 'T', val: metrics.scoreT, title: 'Traction' },
                { label: 'H', val: metrics.scoreH, title: 'Harvest' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5 text-center border"
                >
                  <span className="text-[10px] font-extrabold text-slate-400 block" title={item.title}>
                    {item.label}
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/readiness"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Lihat Detail <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 3. PROGRAM AKTIF */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Program & Portofolio
            </CardTitle>
            <CardDescription className="text-xs">Kesehatan manajemen logical framework</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[brand-border] dark:text-teal-400">
                {metrics.totalPrograms}
              </span>
              <span className="text-sm text-slate-400 font-semibold">Total Program</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                <span className="text-[10px] font-extrabold text-emerald-600 block uppercase">On-Track</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {metrics.onTrackPrograms} Program
                </span>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                <span className="text-[10px] font-extrabold text-blue-600 block uppercase">Selesai</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {metrics.completedPrograms} Program
                </span>
              </div>
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/lfa-builder"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Kelola Program <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 3.5. PENERIMA MANFAAT */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Penerima Manfaat
            </CardTitle>
            <CardDescription className="text-xs">Database & sebaran penerima manfaat program</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[brand-border] dark:text-teal-400">
                {metrics.totalBeneficiariesCount}
              </span>
              <span className="text-sm text-slate-400 font-semibold">Total Penerima</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[brand-green]/5 border border-[brand-green]/10 rounded-lg p-3">
                <span className="text-[10px] font-extrabold text-[brand-green] block uppercase">Aktif</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {metrics.activeBeneficiariesCount} Jiwa
                </span>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                <span className="text-[10px] font-extrabold text-amber-600 block uppercase">Alumni</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {metrics.alumniBeneficiariesCount} Jiwa
                </span>
              </div>
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/beneficiary"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Kelola Registry <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 4. DANA & HIBAH */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Dana & Hibah
            </CardTitle>
            <CardDescription className="text-xs">Kesehatan finansial dan pipeline donor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[brand-border] dark:text-teal-400 whitespace-nowrap">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }).format(metrics.totalDonationsAmount)}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Total Dana Masuk</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Total Donor</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {metrics.totalDonors} Kontak
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Grant Aktif</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {metrics.activeGrants} Proposal
                </span>
              </div>
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/grant-pipeline"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Lihat Pipeline <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 5. SROI TERBARU */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Social Return on Investment (SROI)
            </CardTitle>
            <CardDescription className="text-xs">Rasio pengembalian nilai sosial tertinggi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {metrics.highestSroiRatio > 0 ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[brand-border] dark:text-teal-400">
                    Rp {metrics.highestSroiRatio.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">per Rp1 Terinvestasi</span>
                </div>
                <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-lg">
                  <span className="text-[10px] font-extrabold text-[brand-border] block uppercase">
                    Program Terbaik
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {metrics.sroiProjectName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-muted-foreground">Belum ada kalkulasi SROI</p>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/sroi"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Hitung SROI <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 🌱 Dampak Lingkungan (E-ROI) Card */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-emerald-500" />
                  Dampak Lingkungan (E-ROI)
                </CardTitle>
                <CardDescription className="text-xs">
                  Analisis jejak karbon dan kontribusi hijau organisasi
                </CardDescription>
              </div>
              {carbonData && carbonData.activitiesWithCarbon > 0 && (
                <Badge
                  className={`${
                    carbonData.netImpact === 'reduction'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : carbonData.netImpact === 'emission'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                  } text-[10px] font-bold uppercase tracking-wider`}
                  variant="outline"
                >
                  {carbonData.netImpact === 'reduction'
                    ? 'Net Reduction 🌱'
                    : carbonData.netImpact === 'emission'
                    ? 'Net Emission ⚠️'
                    : 'Net Neutral ⚖️'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-grow">
            {carbonData && carbonData.activitiesWithCarbon > 0 ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${
                    carbonData.totalCarbonKg < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {carbonData.totalCarbonKg < 0 ? '-' : ''}
                    {Math.abs(carbonData.totalCarbonKg).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-slate-400 font-semibold">kg CO₂</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
                    <span className="text-[9px] font-extrabold text-emerald-600 block uppercase">Pereduksian</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {carbonData.reductionKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg
                    </span>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                    <span className="text-[9px] font-extrabold text-amber-600 block uppercase">Pelepasan</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {carbonData.emissionKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg
                    </span>
                  </div>
                </div>

                {carbonData.equivalentTrees > 0 && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center gap-3">
                    <div className="text-2xl">🌳</div>
                    <div>
                      <span className="text-[9px] font-extrabold text-[brand-border] dark:text-teal-400 block uppercase leading-none">Setara Penyerapan</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {carbonData.equivalentTrees.toLocaleString('id-ID', { maximumFractionDigits: 1 })} pohon / tahun
                      </p>
                    </div>
                  </div>
                )}
                
                <p className="text-[9px] text-slate-400 italic text-center mt-1">
                  *Estimasi berbasis durasi program sebagai proxy jumlah aktivitas (sementara)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                <Leaf className="h-8 w-4 text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
                <p className="text-xs text-muted-foreground">Belum ada aktivitas dengan tracking karbon</p>
                <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mt-1">
                  Aktifkan Analisis Karbon di WBS Builder program Anda untuk melihat ringkasan.
                </p>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/lfa-builder"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Kelola Program <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 6. IMPACT READINESS */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Impact Readiness Assessment
            </CardTitle>
            <CardDescription className="text-xs">Tingkat kematangan pengukuran dampak</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assessments.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[brand-border] dark:text-teal-400">
                    {metrics.latestAssessmentScore}
                  </span>
                  <span className="text-sm text-slate-400 font-semibold">/ 25</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border rounded-lg">
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">
                    Klasifikasi
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {metrics.latestAssessmentLevel}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-muted-foreground">Belum ada asesmen kesiapan dampak</p>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex justify-end rounded-b-xl">
            <Link
              to="/dashboard/readiness?tab=program"
              className="text-xs font-bold text-[brand-border] hover:text-[brand-active] flex items-center gap-1 transition-all"
            >
              Ukur Kesiapan Dampak <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* 7. NEXT ACTIONS */}
        <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[brand-border] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Rekomendasi Tindakan Strategis
            </CardTitle>
            <CardDescription className="text-xs">
              Langkah prioritas berikutnya untuk meningkatkan tata kelola dan akuntabilitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.nextActions.length > 0 ? (
              metrics.nextActions.map((action, i) => (
                <Link
                  key={i}
                  to={action.href}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-[brand-border] hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-teal-500 dark:hover:bg-slate-900/50 transition-all group"
                >
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                    {action.text}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[brand-border] dark:group-hover:text-teal-400 transition-all" />
                </Link>
              ))
            ) : (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/5 text-emerald-600 rounded-lg text-xs font-semibold">
                Semua sistem tata kelola Anda dalam kondisi prima! Teruskan ritme operasional hebat ini.
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex items-center justify-between rounded-b-xl text-[10px] text-slate-400">
            <span>Rekomendasi otomatis berbasis data operasional</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
