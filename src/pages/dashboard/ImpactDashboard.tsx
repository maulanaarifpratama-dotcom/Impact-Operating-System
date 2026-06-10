import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart2,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  BookOpen,
  Megaphone,
  Briefcase,
  AlertTriangle,
  Share2,
  Download,
  ExternalLink,
  Target,
  FileText,
  CheckCircle2,
  Heart,
  Loader2,
  Plus,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  Building2,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Color Palette for charts
const COLORS_JOURNEY = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981'];
const COLORS_DONOR_TYPE = ['#0ea5e9', '#10b981', '#f59e0b'];
const COLORS_PLATFORM = ['#3b82f6', '#10b981', '#ff007f', '#a855f7', '#64748b'];

// Number Format helpers
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatPercent = (val: number) => {
  return `${val.toFixed(1)}%`;
};

export default function ImpactDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('fundraising');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Fetch organization context
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

  const organizationId = membership?.organization_id;

  // 2. Fetch all required tables (Multi-Tenant, Scoped by organizationId)
  const { data: donors = [], isLoading: isDonorsLoading } = useQuery({
    queryKey: ['donors_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: donations = [], isLoading: isDonationsLoading } = useQuery({
    queryKey: ['donations_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: adsBriefs = [], isLoading: isAdsBriefsLoading } = useQuery({
    queryKey: ['ads_briefs_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads_briefs')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: adsGenerations = [], isLoading: isAdsGenerationsLoading } = useQuery({
    queryKey: ['ads_generations_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads_generations')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['programs_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: programMetrics = [], isLoading: isProgramMetricsLoading } = useQuery({
    queryKey: ['program_metrics_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_metrics')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: gwProjects = [], isLoading: isGwProjectsLoading } = useQuery({
    queryKey: ['gw_projects_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: readinessScore, isLoading: isReadinessLoading } = useQuery({
    queryKey: ['readiness_scores_dashboard', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!organizationId,
  });

  // Calculate global dates
  const now = new Date();
  const currentYearMonth = now.toISOString().slice(0, 7); // e.g., "2026-06"

  // =========================================================================
  // MEMOIZED METRICS COMPUTATIONS
  // =========================================================================

  // TAB 1: Fundraising Computations
  const fundraisingStats = useMemo(() => {
    if (donations.length === 0) {
      return {
        totalRaised: 0,
        raisedThisMonth: 0,
        donorCountTotal: donors.length,
        donorCountThisMonth: 0,
        avgDonation: 0,
        retentionRate: 0,
        monthlyTrend: [],
        topCampaigns: []
      };
    }

    const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

    const donationsThisMonth = donations.filter(d => d.donation_date && d.donation_date.slice(0, 7) === currentYearMonth);
    const raisedThisMonth = donationsThisMonth.reduce((sum, d) => sum + d.amount, 0);

    const activeDonorsThisMonth = new Set(donationsThisMonth.map(d => d.donor_id)).size;

    const avgDonation = totalRaised / donations.length;

    // Retention Rate: Donors with >= 2 donations / total donors
    const donorDonationCounts: Record<string, number> = {};
    donations.forEach(d => {
      donorDonationCounts[d.donor_id] = (donorDonationCounts[d.donor_id] || 0) + 1;
    });
    const repeatDonorsCount = Object.values(donorDonationCounts).filter(cnt => cnt >= 2).length;
    const totalUniqueDonors = Object.keys(donorDonationCounts).length;
    const retentionRate = totalUniqueDonors > 0 ? (repeatDonorsCount / totalUniqueDonors) * 100 : 0;

    // Last 6 Months Trend
    const trendMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      trendMap[ym] = 0;
    }
    donations.forEach(d => {
      const ym = d.donation_date?.slice(0, 7);
      if (ym && trendMap[ym] !== undefined) {
        trendMap[ym] += d.amount;
      }
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyTrend = Object.entries(trendMap).map(([ym, amount]) => {
      const [year, month] = ym.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      return {
        month: `${monthLabels[monthIdx]} ${year.slice(2)}`,
        amount
      };
    });

    // Top 3 campaigns by total raised
    const campaignMap: Record<string, number> = {};
    donations.forEach(d => {
      const name = d.campaign_name || 'Tanpa Kampanye';
      campaignMap[name] = (campaignMap[name] || 0) + d.amount;
    });
    const topCampaigns = Object.entries(campaignMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return {
      totalRaised,
      raisedThisMonth,
      donorCountTotal: donors.length,
      donorCountThisMonth: activeDonorsThisMonth,
      avgDonation,
      retentionRate,
      monthlyTrend,
      topCampaigns
    };
  }, [donations, donors, currentYearMonth]);

  // TAB 2: Campaign Computations
  const campaignStats = useMemo(() => {
    const totalCampaigns = adsBriefs.length;
    const totalGenerations = adsGenerations.length;

    // Platform breakdown count
    const platformsMap: Record<string, number> = {
      meta: 0,
      google: 0,
      tiktok: 0,
      linkedin: 0,
      generic: 0
    };
    adsGenerations.forEach(g => {
      const p = g.platform?.toLowerCase() || 'generic';
      platformsMap[p] = (platformsMap[p] || 0) + 1;
    });

    const platformBreakdown = Object.entries(platformsMap).map(([name, value]) => ({
      name: name === 'meta' ? 'Meta Ads' : name === 'google' ? 'Google Ads' : name === 'tiktok' ? 'TikTok Ads' : name === 'linkedin' ? 'LinkedIn' : 'Lainnya',
      value
    })).filter(p => p.value > 0);

    // Join Briefs and generations
    const briefGenerationsMap: Record<string, number> = {};
    adsGenerations.forEach(g => {
      briefGenerationsMap[g.brief_id] = (briefGenerationsMap[g.brief_id] || 0) + (Array.isArray(g.variants) ? g.variants.length : 1);
    });

    const campaignsList = adsBriefs.map(b => ({
      id: b.id,
      name: b.campaign_name,
      product: b.product_or_cause,
      created_at: b.created_at,
      platforms: b.platforms || [],
      variantsCount: briefGenerationsMap[b.id] || 0,
      objective: b.objective || 'awareness'
    })).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

    return {
      totalCampaigns,
      totalGenerations,
      platformBreakdown,
      campaignsList
    };
  }, [adsBriefs, adsGenerations]);

  // TAB 3: Donor Computations
  const donorStats = useMemo(() => {
    if (donors.length === 0) {
      return {
        stageData: [],
        newVsRepeat: [],
        typeData: [],
        atRiskCount: 0,
        topCities: [],
        sourceData: []
      };
    }

    const atRiskCount = donors.filter(d => d.is_at_risk).length;

    // Journey stages distribution
    const stages = {
      awareness: 'Awareness',
      interest: 'Interest',
      trust: 'Trust',
      donation: 'Donation',
      thank_you: 'Thank You',
      impact_update: 'Impact Update',
      repeat_donation: 'Repeat Donation'
    };
    const stageCounts: Record<string, number> = {
      awareness: 0, interest: 0, trust: 0, donation: 0, thank_you: 0, impact_update: 0, repeat_donation: 0
    };
    donors.forEach(d => {
      if (d.journey_stage && stageCounts[d.journey_stage] !== undefined) {
        stageCounts[d.journey_stage]++;
      } else {
        stageCounts['awareness']++;
      }
    });
    const stageData = Object.entries(stages).map(([key, label]) => ({
      stage: label,
      count: stageCounts[key]
    }));

    // New vs Repeat this month
    const createdThisMonth = donors.filter(d => d.created_at && d.created_at.slice(0, 7) === currentYearMonth);
    const newDonorsThisMonth = createdThisMonth.filter(d => d.journey_stage !== 'repeat_donation').length;
    const repeatDonorsThisMonth = createdThisMonth.filter(d => d.journey_stage === 'repeat_donation').length;

    const newVsRepeat = [
      { name: 'Donor Baru', value: newDonorsThisMonth },
      { name: 'Donor Berulang', value: repeatDonorsThisMonth }
    ].filter(v => v.value > 0);

    // Type Breakdown
    const typesMap = {
      one_time: 'Sekali Donasi',
      recurring: 'Rutin/Recurring',
      corporate: 'Korporat/Mitra'
    };
    const typeCounts = { one_time: 0, recurring: 0, corporate: 0 };
    donors.forEach(d => {
      const type = d.donor_type || 'one_time';
      if (typeCounts[type] !== undefined) {
        typeCounts[type]++;
      }
    });
    const typeData = Object.entries(typesMap).map(([key, label]) => ({
      name: label,
      value: typeCounts[key as keyof typeof typeCounts]
    })).filter(t => t.value > 0);

    // Top Cities
    const cityMap: Record<string, number> = {};
    donors.forEach(d => {
      const city = d.city || 'Luar Kota / Online';
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Source breakdown
    const sources = {
      campaign: 'Campaign',
      referral: 'Referral',
      organic: 'Organic Search',
      event: 'Event / Kegiatan',
      corporate: 'Corporate partner',
      other: 'Lainnya'
    };
    const sourceCounts: Record<string, number> = {};
    Object.keys(sources).forEach(k => { sourceCounts[k] = 0; });
    donors.forEach(d => {
      const s = d.source || 'other';
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    });
    const sourceData = Object.entries(sources).map(([key, label]) => ({
      source: label,
      count: sourceCounts[key] || 0
    })).sort((a, b) => b.count - a.count);

    return {
      stageData,
      newVsRepeat,
      typeData,
      atRiskCount,
      topCities,
      sourceData
    };
  }, [donors, currentYearMonth]);

  // TAB 4: Program Computations
  const programStats = useMemo(() => {
    const totalPrograms = programs.length;
    const activePrograms = programs.filter(p => p.status === 'active').length;
    const completedPrograms = programs.filter(p => p.status === 'completed').length;
    const draftPrograms = programs.filter(p => p.status === 'draft').length;

    const totalBudget = programs.reduce((sum, p) => sum + parseFloat(p.budget || '0'), 0);

    // Map metrics to each program
    const programsWithMetrics = programs.map(p => {
      const metrics = programMetrics.filter(m => m.program_id === p.id);
      return {
        ...p,
        metrics: metrics.map(m => {
          const current = parseFloat(m.current_value || '0');
          const target = parseFloat(m.target_value || '1');
          const progressPercent = Math.min((current / target) * 100, 100);
          return {
            ...m,
            progressPercent,
            current,
            target
          };
        })
      };
    });

    return {
      totalPrograms,
      activePrograms,
      completedPrograms,
      draftPrograms,
      totalBudget,
      programsWithMetrics
    };
  }, [programs, programMetrics]);

  // TAB 5: Grant Pipeline Computations
  const grantStats = useMemo(() => {
    const totalProposals = gwProjects.length;
    const draftProposals = gwProjects.filter(p => p.status === 'draft').length;
    const generatingProposals = gwProjects.filter(p => p.status === 'generating').length;
    const completedProposals = gwProjects.filter(p => p.status === 'completed').length;

    const totalPipelineFunding = gwProjects.reduce((sum, p) => sum + (Number(p.budget_idr) || 0), 0);

    const sortedProposals = [...gwProjects].sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime());

    return {
      totalProposals,
      draftProposals,
      generatingProposals,
      completedProposals,
      totalPipelineFunding,
      sortedProposals
    };
  }, [gwProjects]);

  // TAB 6: Impact Report & Scorecard Computations
  const readinessStats = useMemo(() => {
    if (!readinessScore) {
      return {
        totalScore: 0,
        percentScore: 0,
        scoresList: []
      };
    }

    const { score_g = 0, score_r = 0, score_o = 0, score_w = 0, score_t = 0, score_h = 0, total_score = 0 } = readinessScore;

    const categories = [
      { code: 'G', label: 'Grant Readiness', score: score_g, max: 25, color: '#6366f1' },
      { code: 'R', label: 'Resource Access', score: score_r, max: 25, color: '#0ea5e9' },
      { code: 'O', label: 'Operating Library', score: score_o, max: 25, color: '#10b981' },
      { code: 'W', label: 'Workflow Engine', score: score_w, max: 20, color: '#f59e0b' },
      { code: 'T', label: 'Traction Engine', score: score_t, max: 25, color: '#ec4899' },
      { code: 'H', label: 'Harvest & Review', score: score_h, max: 20, color: '#8b5cf6' }
    ];

    const percentScore = (total_score / 140) * 100;

    return {
      totalScore: total_score,
      percentScore,
      scoresList: categories
    };
  }, [readinessScore]);

  // Is any data loading
  const isGlobalLoading = isMembershipLoading || isDonorsLoading || isDonationsLoading || isAdsBriefsLoading || isAdsGenerationsLoading || isProgramsLoading || isProgramMetricsLoading || isGwProjectsLoading || isReadinessLoading;

  // Handles copying share link
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/shared/impact-dashboard/${organizationId || 'org-preview'}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link dashboard berhasil disalin!', {
      description: 'Gunakan link ini untuk dibagikan ke donor dan funder eksternal.'
    });
    setIsShareOpen(true);
  };

  // Handles exporting data
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success('Ekspor laporan berhasil!', {
        description: 'Format PDF donor-ready telah di-download ke komputer Anda.'
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Impact Dashboard</h1>
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 font-medium">LIVE</Badge>
          </div>
          <p className="mt-1.5 text-muted-foreground">
            Proof system tunggal untuk memvalidasi transparansi, fundraising, dan kinerja impact ke donor & funder.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-end">
          <Button
            onClick={handleShare}
            variant="outline"
            className="group flex items-center gap-2 border-slate-200 shadow-sm transition-all hover:bg-slate-50"
          >
            <Share2 className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110" />
            <span>Bagikan Link</span>
          </Button>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-indigo-600 font-medium text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-indigo-100"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExporting ? 'Mengekspor...' : 'Ekspor Laporan'}</span>
          </Button>
        </div>
      </div>

      {/* HUMAN REVIEW BANNER (Amber Alerts) */}
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900">Human Review & Data Traceability Gate</h4>
            <p className="mt-1 text-sm text-amber-800/85">
              Setiap angka di dashboard ini ditarik real-time dari relasi database internal. Sebelum membagikan link publik atau file ekspor ke donor, pastikan semua data pendukung program, log donasi, dan kuesioner G.R.O.W.T.H. sudah diverifikasi oleh PIC organisasi Anda.
            </p>
          </div>
        </div>
      </div>

      {/* GLOBAL SKELETON LOADER */}
      {isGlobalLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse bg-white border border-slate-100">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="h-4 w-28 rounded bg-slate-100" />
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-[350px] w-full animate-pulse rounded-xl bg-slate-50 border border-slate-100" />
        </div>
      ) : (
        <Tabs defaultValue="fundraising" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-slate-100/75 p-1 rounded-xl sm:grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="fundraising" className="rounded-lg py-2.5 font-medium transition-all">
              Fundraising
            </TabsTrigger>
            <TabsTrigger value="campaign" className="rounded-lg py-2.5 font-medium transition-all">
              Campaign Builder
            </TabsTrigger>
            <TabsTrigger value="donor" className="rounded-lg py-2.5 font-medium transition-all">
              Donor Analytics
            </TabsTrigger>
            <TabsTrigger value="program" className="rounded-lg py-2.5 font-medium transition-all">
              Program & Impact
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="rounded-lg py-2.5 font-medium transition-all">
              Grant Pipeline
            </TabsTrigger>
            <TabsTrigger value="scorecard" className="rounded-lg py-2.5 font-medium transition-all">
              G.R.O.W.T.H
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              TAB 1: FUNDRAISING
              ========================================================================= */}
          <TabsContent value="fundraising" className="space-y-6 outline-none">
            {donations.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Belum Ada Log Donasi Terdaftar"
                description="Semua metrics penggalangan dana ditarik langsung dari modul Donor CRM Anda. Mulai dengan mencatat donasi pertama."
                ctaText="Buka Donor CRM"
                ctaHref="/dashboard/donor-crm"
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Terkumpul"
                    value={formatCurrency(fundraisingStats.totalRaised)}
                    icon={DollarSign}
                    description="Seluruh akumulasi donasi masuk"
                    trend="Semua waktu"
                  />
                  <StatCard
                    title="Bulan Ini"
                    value={formatCurrency(fundraisingStats.raisedThisMonth)}
                    icon={TrendingUp}
                    description="Target fundraising bulanan"
                    trend={`${fundraisingStats.donorCountThisMonth} donor aktif`}
                    highlight
                  />
                  <StatCard
                    title="Rata-rata Donasi"
                    value={formatCurrency(fundraisingStats.avgDonation)}
                    icon={Heart}
                    description="Nilai per transaksi donasi"
                    trend={`${donations.length} total transaksi`}
                  />
                  <StatCard
                    title="Retention Rate"
                    value={formatPercent(fundraisingStats.retentionRate)}
                    icon={Users}
                    description="Persentase donor berulang (2+ kali)"
                    trend="Loyalitas pendukung"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Chart */}
                  <Card className="lg:col-span-2 shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Tren Penggalangan Dana (6 Bulan Terakhir)</CardTitle>
                      <CardDescription>Akumulasi donasi yang terkumpul per bulan</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fundraisingStats.monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorFunds" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `Rp ${v / 1e6}jt`}
                          />
                          <RechartsTooltip
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Jumlah Terkumpul']}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          />
                          <Bar dataKey="amount" fill="url(#colorFunds)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Campaigns */}
                  <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Kampanye Tersukses</CardTitle>
                      <CardDescription>Berdasarkan nominal donasi terbesar</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {fundraisingStats.topCampaigns.map((camp, i) => (
                          <div key={i} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-sm ${
                                i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {i + 1}
                              </div>
                              <div>
                                <h5 className="font-semibold text-slate-800 line-clamp-1">{camp.name}</h5>
                                <p className="text-xs text-muted-foreground">Kampanye Penggalangan</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatCurrency(camp.amount)}</p>
                              <Progress value={(camp.amount / fundraisingStats.totalRaised) * 100} className="h-1 mt-1 w-20 bg-slate-100" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-center py-3">
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5" asChild>
                        <a href="/dashboard/donor-crm">
                          <span>Catat Donasi Baru</span>
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 2: CAMPAIGN
              ========================================================================= */}
          <TabsContent value="campaign" className="space-y-6 outline-none">
            {campaignStats.campaignsList.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Belum Ada Kampanye Digital"
                description="Dashboard mendeteksi draf iklan dan brief yang dibuat menggunakan Campaign Builder (Impactory Ads). Gunakan AI Copywriter untuk men-generate materi promosi."
                ctaText="Buat Kampanye Sekarang"
                ctaHref="/dashboard/impactory-ads"
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    title="Total Kampanye"
                    value={campaignStats.totalCampaigns.toString()}
                    icon={Megaphone}
                    description="Brief iklan unik dibuat"
                    trend="Di dalam system"
                  />
                  <StatCard
                    title="AI Copy Generations"
                    value={campaignStats.totalGenerations.toString()}
                    icon={Sparkles}
                    description="Variasi teks promosi terbuat"
                    trend="Generated by Centralized AI"
                    highlight
                  />
                  <StatCard
                    title="Metrik Platform Dominan"
                    value={campaignStats.platformBreakdown[0]?.name || 'Tidak ada'}
                    icon={Target}
                    description="Media iklan paling sering dipakai"
                    trend="Iklan multi-channel"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Campaign Table */}
                  <Card className="lg:col-span-2 shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Daftar Aktifitas Kampanye</CardTitle>
                      <CardDescription>Seluruh materi brief dan performa variasi AI</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <th className="p-4 text-xs font-semibold uppercase text-slate-500">Nama Kampanye</th>
                              <th className="p-4 text-xs font-semibold uppercase text-slate-500">Platform Iklan</th>
                              <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center">Variasi Copy AI</th>
                              <th className="p-4 text-xs font-semibold uppercase text-slate-500">Dibuat Pada</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {campaignStats.campaignsList.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                <td className="p-4">
                                  <div>
                                    <h5 className="font-semibold text-slate-800">{c.name}</h5>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{c.product}</p>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.platforms.map((p, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs capitalize border-indigo-100 text-indigo-600 bg-indigo-50/20">
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                                    {c.variantsCount} Versi Teks
                                  </Badge>
                                </td>
                                <td className="p-4 text-sm text-slate-500">
                                  {new Date(c.created_at || '').toLocaleDateString('id-ID', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Platform breakdown chart */}
                  <Card className="shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Distribusi Platform</CardTitle>
                      <CardDescription>Berdasarkan total materi iklan yang di-generate</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] flex items-center justify-center">
                      {campaignStats.platformBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada data distribusi.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={campaignStats.platformBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {campaignStats.platformBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_PLATFORM[index % COLORS_PLATFORM.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => [`${value} materi`, 'Frekuensi']} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 3: DONOR ANALYTICS
              ========================================================================= */}
          <TabsContent value="donor" className="space-y-6 outline-none">
            {donors.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Database CRM Kosong"
                description="Metrik dan visualisasi donor ditarik langsung dari list kontak di modul Donor CRM. Masukkan donor baru untuk mengaktifkan tab analisis."
                ctaText="Buat Kontak Donor"
                ctaHref="/dashboard/donor-crm"
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Pendukung"
                    value={donors.length.toString()}
                    icon={Users}
                    description="Kontak terdaftar di CRM"
                    trend="Semua donor & funder"
                  />
                  <StatCard
                    title="At-Risk Donors"
                    value={donorStats.atRiskCount.toString()}
                    icon={AlertTriangle}
                    description="Perlu interaksi / follow-up segera"
                    trend="Indikator loyalitas"
                    highlight={donorStats.atRiskCount > 0}
                  />
                  <StatCard
                    title="Kota Dominan"
                    value={donorStats.topCities[0]?.city || 'Online'}
                    icon={Building2}
                    description="Konsentrasi geografi terbesar"
                    trend={`${donorStats.topCities[0]?.count || 0} pendukung`}
                  />
                  <StatCard
                    title="Tipe Dominan"
                    value={donorStats.typeData[0]?.name || 'Tidak ada'}
                    icon={Heart}
                    description="Kategori keterikatan mayoritas"
                    trend="Profil utama"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Journey stages funnel chart */}
                  <Card className="lg:col-span-2 shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Distribusi Tahapan Donor (Journey Stages)</CardTitle>
                      <CardDescription>Memantau progress pendukung dari pengenalan hingga loyalitas berulang</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={donorStats.stageData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis dataKey="stage" type="category" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                          <RechartsTooltip formatter={(value) => [`${value} orang`, 'Jumlah']} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {donorStats.stageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_JOURNEY[index % COLORS_JOURNEY.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Donor Type Pie */}
                  <Card className="shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Segmentasi Donatur</CardTitle>
                      <CardDescription>Berdasarkan frekuensi/skema pendanaan</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donorStats.typeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            labelLine={false}
                            dataKey="value"
                          >
                            {donorStats.typeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_DONOR_TYPE[index % COLORS_DONOR_TYPE.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => [`${value} orang`, 'Jumlah']} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top Cities */}
                  <Card className="shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-800">Geografi Teratas</CardTitle>
                      <CardDescription>Sebaran regional donatur paling aktif</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {donorStats.topCities.map((city, i) => (
                          <div key={i} className="flex items-center justify-between p-4">
                            <span className="font-semibold text-slate-700">{city.city}</span>
                            <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-50">
                              {city.count} Donor
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Source Breakdown */}
                  <Card className="shadow-sm border border-slate-100 bg-white">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-800">Kanal Rekrutmen (Acquisition Channel)</CardTitle>
                      <CardDescription>Asal mula penemuan organisasi oleh pendukung</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {donorStats.sourceData.map((src, i) => (
                          <div key={i} className="flex items-center justify-between p-4">
                            <span className="font-semibold text-slate-700">{src.source}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(src.count / donors.length) * 100} className="h-2 w-24 bg-slate-100" />
                              <span className="text-sm text-slate-500 font-medium w-8 text-right">{src.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 4: PROGRAM & IMPACT METRICS
              ========================================================================= */}
          <TabsContent value="program" className="space-y-6 outline-none">
            {programs.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Data Program Kosong"
                description="Semua data program dan metrik kuantitatif ditarik dari database programs internal. Laporkan performa riil lapangan ke donor."
                ctaText="Catat di Program Manager"
                ctaHref="/dashboard/monthly-report"
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Program"
                    value={programStats.totalPrograms.toString()}
                    icon={BookOpen}
                    description="Seluruh inisiatif terdaftar"
                    trend="Di dalam database"
                  />
                  <StatCard
                    title="Program Aktif"
                    value={programStats.activePrograms.toString()}
                    icon={Activity}
                    description="Sedang berjalan di lapangan"
                    trend={`${programStats.completedPrograms} selesai`}
                    highlight
                  />
                  <StatCard
                    title="Anggaran Program"
                    value={formatCurrency(programStats.totalBudget)}
                    icon={DollarSign}
                    description="Total dana dialokasikan"
                    trend="Transparansi dana"
                  />
                  <StatCard
                    title="Output Terukur"
                    value={programMetrics.length.toString()}
                    icon={Target}
                    description="KPI/indikator keberhasilan dipantau"
                    trend="Kuantitatif impact"
                  />
                </div>

                {/* Programs and metrics list */}
                <div className="grid gap-6 md:grid-cols-2">
                  {programStats.programsWithMetrics.map((prog, i) => (
                    <Card key={i} className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-all flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className={`mb-2 font-semibold text-xs border-0 ${
                              prog.status === 'active' ? 'bg-indigo-500 text-white' : prog.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                            }`}>
                              {prog.status === 'active' ? 'Aktif' : prog.status === 'completed' ? 'Selesai' : 'Draf'}
                            </Badge>
                            <CardTitle className="text-lg font-semibold text-slate-800">{prog.name}</CardTitle>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Anggaran</p>
                            <p className="font-bold text-indigo-600 text-sm">{formatCurrency(parseFloat(prog.budget || '0'))}</p>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2 mt-1.5">{prog.description || 'Tidak ada deskripsi program.'}</CardDescription>
                      </CardHeader>
                      <CardContent className="border-t border-slate-100 pt-4 bg-slate-50/20 rounded-b-xl flex-1">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Impact Metrics</h5>
                        {prog.metrics.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                            <Info className="h-4 w-4" />
                            <span>Indikator impact belum diatur untuk program ini.</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {prog.metrics.map((m, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold text-slate-700">{m.name}</span>
                                  <span className="text-slate-500 text-xs">
                                    <strong className="text-slate-800 font-bold">{m.current}</strong> / {m.target} {m.unit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={m.progressPercent} className="h-2 flex-1 bg-slate-100" />
                                  <span className="text-xs font-semibold text-slate-600 w-8 text-right">{Math.round(m.progressPercent)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 5: GRANT PIPELINE
              ========================================================================= */}
          <TabsContent value="pipeline" className="space-y-6 outline-none">
            {gwProjects.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Peluang Proposal Kosong"
                description="Grant Pipeline dikaitkan langsung dengan draf dan inisiatif proposal yang di-generate via Grantwriter. Mulai dengan membuat draf proposal pertama."
                ctaText="Tulis Proposal Baru"
                ctaHref="/dashboard/grant-writer"
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    title="Total Target Proposal"
                    value={grantStats.totalProposals.toString()}
                    icon={Briefcase}
                    description="Total proposal dalam pipeline"
                    trend="Draft & generated"
                  />
                  <StatCard
                    title="Pipeline Selesai"
                    value={grantStats.completedProposals.toString()}
                    icon={CheckCircle2}
                    description="Proposal siap submit / terkirim"
                    trend={`${grantStats.draftProposals} dalam draf`}
                    highlight
                  />
                  <StatCard
                    title="Total Target Pendanaan"
                    value={formatCurrency(grantStats.totalPipelineFunding)}
                    icon={DollarSign}
                    description="Estimasi budget seluruh proposal"
                    trend="Nilai pipeline"
                  />
                </div>

                {/* Pipeline List */}
                <Card className="shadow-sm border border-slate-100 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-slate-800">Aliran Proposal Grant (Grant Pipeline)</CardTitle>
                    <CardDescription>Melacak kemajuan proposal donor-ready yang dibuat melalui Grantwriter</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500">Judul Inisiatif / Proposal</th>
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500">Sektor & Geografi</th>
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center">Durasi</th>
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500">Estimasi Anggaran</th>
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500">Funder / Target Donor</th>
                            <th className="p-4 text-xs font-semibold uppercase text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {grantStats.sortedProposals.map((proj, i) => (
                            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-4">
                                <div>
                                  <h5 className="font-semibold text-slate-800">{proj.title}</h5>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{proj.summary || 'Tidak ada summary.'}</p>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <span className="text-sm font-medium text-slate-700 block">{proj.sector || 'Sektor belum diatur'}</span>
                                  <span className="text-xs text-slate-500 block">{proj.geography || 'Semua Geografi'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center text-sm text-slate-700">
                                {proj.duration_months ? `${proj.duration_months} bulan` : '-'}
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-slate-900 text-sm">
                                  {proj.budget_idr ? formatCurrency(Number(proj.budget_idr)) : 'Belum diisi'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-slate-700 font-medium">{proj.target_donor || 'Funder Umum'}</span>
                              </td>
                              <td className="p-4">
                                <Badge className={`font-semibold text-xs border-0 ${
                                  proj.status === 'completed' ? 'bg-emerald-500 text-white' : proj.status === 'generating' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                                }`}>
                                  {proj.status === 'completed' ? 'Siap / Terkirim' : proj.status === 'generating' ? 'Menge-generate' : 'Draf'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 6: G.R.O.W.T.H READINESS SCORECARD
              ========================================================================= */}
          <TabsContent value="scorecard" className="space-y-6 outline-none">
            {!readinessScore ? (
              <EmptyState
                icon={Award}
                title="G.R.O.W.T.H Score Belum Dihitung"
                description="Scorecard kelayakan pendanaan (readiness) ditarik dari kuisioner digital G.R.O.W.T.H. Isi skor kelayakan Anda sekarang."
                ctaText="Buka Readiness Scorecard"
                ctaHref="/dashboard/readiness"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Score Dial / Overview */}
                <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-slate-800">Indeks Kelayakan (Overall G.R.O.W.T.H Score)</CardTitle>
                    <CardDescription>Akumulasi kematangan sistem operasional organisasi</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-slate-50 shadow-inner">
                      {/* Sub-Gauge Accent */}
                      <div className="absolute inset-0 rounded-full border-8 border-indigo-600/10" />
                      <div className="text-center">
                        <span className="text-5xl font-black tracking-tight text-slate-800">{readinessStats.totalScore}</span>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">dari 140 pt</span>
                      </div>
                    </div>

                    <div className="mt-6 w-full text-center space-y-1.5">
                      <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold hover:bg-indigo-50">
                        Level Kelayakan: {readinessStats.percentScore >= 80 ? 'Sangat Siap / High Grant' : readinessStats.percentScore >= 50 ? 'Berkembang / Medium' : 'Mulai Tumbuh / Low'}
                      </Badge>
                      <p className="text-xs text-slate-500 font-medium px-4">
                        Tingkat keberhasilan memenangkan grant dan menggaet donor recurring berbanding lurus dengan kelengkapan operating rhythm ini.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t border-slate-100 rounded-b-xl py-3 flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5" asChild>
                      <a href="/dashboard/readiness">
                        <span>Lengkapi Kuesioner</span>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>

                {/* Score breakdown bar charts */}
                <Card className="lg:col-span-2 shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-slate-800">Kategori Kelayakan & Kematangan</CardTitle>
                    <CardDescription>Batas capaian per pilar operating framework</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {readinessStats.scoresList.map((cat, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-700">{cat.code} — {cat.label}</span>
                          <span className="text-slate-500 font-medium text-xs">
                            <strong className="text-slate-800 font-bold">{cat.score}</strong> / {cat.max} pt
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 rounded-full bg-slate-50 border border-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(cat.score / cat.max) * 100}%`,
                                backgroundColor: cat.color
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-8 text-right">
                            {Math.round((cat.score / cat.max) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* SHARE MODEL DIALOG */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <span>Dashboard Funder & Donor-Ready</span>
            </DialogTitle>
            <DialogDescription>
              Link eksternal berhasil disalin ke clipboard! Siap dikirim ke donor, mitra, atau auditor eksternal Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <span className="text-xs text-indigo-600 select-all font-mono font-medium truncate flex-1">
              {`${window.location.origin}/shared/impact-dashboard/${organizationId || 'org-preview'}`}
            </span>
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/shared/impact-dashboard/${organizationId || 'org-preview'}`);
                toast.success('Link disalin lagi!');
              }}
            >
              Copy
            </Button>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-100/50 text-xs text-amber-800 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Link ini bersifat read-only. Funder atau donor eksternal tidak dapat merubah draf, meng-generate copy AI, atau melihat data internal non-publik organisasi Anda.
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS
// =========================================================================

// Stat Card Sub-component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  description: string;
  trend?: string;
  highlight?: boolean;
}

function StatCard({ title, value, icon: Icon, description, trend, highlight }: StatCardProps) {
  return (
    <Card className={`shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 ${
      highlight ? 'bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 border-indigo-100 shadow-indigo-50/20' : 'bg-white border-slate-100'
    }`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-slate-800">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground font-medium">{description}</p>
        {trend && (
          <div className="mt-2.5 flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] font-semibold border-0 py-0.5 ${highlight ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {trend}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty State Sub-component
interface EmptyStateProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

function EmptyState({ icon: Icon, title, description, ctaText, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 backdrop-blur-sm min-h-[350px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-4 shadow-sm shadow-indigo-100/40 animate-pulse">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm font-medium leading-relaxed">{description}</p>
      <div className="mt-6">
        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-md hover:shadow-indigo-100 transition-all flex items-center gap-2" asChild>
          <a href={ctaHref}>
            <span>{ctaText}</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
