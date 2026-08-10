// src/pages/dashboard/ExecutivePortfolioDashboard.tsx
// Executive Portfolio Dashboard — org-wide project health command center.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Target,
  ArrowRight, FileText, Layers, BarChart3, Activity, CheckCircle2, Info, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  computePortfolioSummary,
  rankProjects,
  computeRiskMetrics,
  computeProjectScore,
  projectRisk,
  projectAlerts,
  type ProjectSnapshot,
  type PortfolioMetric,
} from '@/lib/portfolioHealth';
import { computeMealReadiness } from '@/lib/lfa/mealReadiness';

const RISK_COLORS: Record<string, string> = {
  healthy: 'text-emerald-600 bg-emerald-100 border-emerald-300',
  attention: 'text-amber-600 bg-amber-100 border-amber-300',
  at_risk: 'text-rose-600 bg-rose-100 border-rose-300',
};

const RISK_LABELS: Record<string, string> = {
  healthy: 'Sehat',
  attention: 'Perlu Perhatian',
  at_risk: 'Berisiko',
};

const SCORE_COLORS = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
};

export default function ExecutivePortfolioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Org membership
  const { data: membership } = useQuery({
    queryKey: ['portfolio-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });
  const orgId = (membership as any)?.organization_id as string | undefined;

  // Projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['portfolio-projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('lfa_projects')
        .select('id, name, status, updated_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!orgId,
  });
  const projectIds = projects.map(p => p.id);

  // MEAL items aggregated
  const { data: mealItems = [] } = useQuery({
    queryKey: ['portfolio-meal', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('lfa_meal_items')
        .select('id,lfa_project_id,indicator_text,target_value,target_unit,collection_method,secondary_source,frequency,pic')
        .in('lfa_project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // WBS activities
  const { data: wbsItems = [] } = useQuery({
    queryKey: ['portfolio-wbs', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('lfa_wbs_items')
        .select('id,lfa_project_id,status,end_date,progress_percent')
        .eq('level', 2)
        .in('lfa_project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // Claims
  const { data: claims = [] } = useQuery({
    queryKey: ['portfolio-claims', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('wbs_completion_claims')
        .select('id,lfa_project_id,status')
        .in('lfa_project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // Findings
  const { data: findings = [] } = useQuery({
    queryKey: ['portfolio-findings', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('project_evaluation_findings')
        .select('id,project_id,severity')
        .in('project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // Learning
  const { data: learningEntries = [] } = useQuery({
    queryKey: ['portfolio-learning', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('org_learning_entries')
        .select('id,status')
        .eq('org_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // SROI configs
  const { data: sroiConfigs = [] } = useQuery({
    queryKey: ['portfolio-sroi', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('lfa_sroi_config')
        .select('lfa_project_id,sroi_ratio')
        .in('lfa_project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // Budget
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['portfolio-budget', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data } = await supabase
        .from('lfa_budget_items')
        .select('id,lfa_project_id,volume,unit_price_idr,actual_amount_idr')
        .in('lfa_project_id', projectIds);
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // ── Build snapshots ─────────────────────────────────────────────────────
  const snapshots: ProjectSnapshot[] = useMemo(() => {
    const sroiProjectIds = new Set(sroiConfigs.map(c => c.lfa_project_id));
    const sroiMap = new Map(sroiConfigs.map(c => [c.lfa_project_id, c.sroi_ratio]));

    return projects.map(p => {
      const pMeal = mealItems.filter(m => (m as any).lfa_project_id === p.id);
      const pWbs = wbsItems.filter(w => (w as any).lfa_project_id === p.id);
      const pClaims = claims.filter(c => (c as any).lfa_project_id === p.id);
      const pFindings = findings.filter(f => (f as any).project_id === p.id);

      const mealReadiness = computeMealReadiness(pMeal as any);
      const now = new Date();
      const completed = pWbs.filter(w => (w as any).status === 'completed').length;
      const overdue = pWbs.filter(w => {
        const wd = w as any;
        if (!wd.end_date || wd.status === 'completed') return false;
        return new Date(wd.end_date) < now;
      }).length;
      const verified = pClaims.filter(c => (c as any).status === 'verified').length;
      const pending = pClaims.filter(c => (c as any).status === 'submitted').length;
      const critical = pFindings.filter(f => (f as any).severity === 'critical' || (f as any).severity === 'kritis').length;

      return {
        id: p.id,
        name: (p as any).name || 'Unnamed',
        status: (p as any).status || 'unknown',
        updatedAt: (p as any).updated_at || null,
        mealScore: mealReadiness.score,
        totalIndicators: mealReadiness.totalIndicators,
        missingPic: mealReadiness.missingPic,
        missingMov: mealReadiness.missingMov,
        totalActivities: pWbs.length,
        completedActivities: completed,
        overdueActivities: overdue,
        totalClaims: pClaims.length,
        verifiedClaims: verified,
        pendingClaims: pending,
        totalFindings: pFindings.length,
        criticalFindings: critical,
        totalLearning: 0,
        publishedLearning: 0,
        draftLearning: 0,
        budgetComplianceScore: null,
        hasSroi: sroiProjectIds.has(p.id),
        sroiRatio: sroiMap.get(p.id) ?? null,
      };
    });
  }, [projects, mealItems, wbsItems, claims, findings, sroiConfigs]);

  const summary = useMemo(() => computePortfolioSummary(snapshots), [snapshots]);
  const ranks = useMemo(() => rankProjects(snapshots), [snapshots]);
  const metrics = useMemo(() => computeRiskMetrics(snapshots), [snapshots]);

  // ── Loading / Empty ─────────────────────────────────────────────────────
  if (!orgId || loadingProjects) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
        <p>Memuat portfolio...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-bold">Belum Ada Proyek</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Buat proyek pertama Anda di LFA Builder untuk melihat portfolio health.
        </p>
        <Button onClick={() => navigate('/dashboard/lfa-builder')}>
          Buka LFA Builder
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-extrabold tracking-tight">Portfolio Eksekutif</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Kesehatan seluruh portofolio program organisasi Anda dalam satu tampilan.
          </p>
        </div>
        <Badge className={`text-xs px-3 py-1 ${summary.avgLifecycleScore >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : summary.avgLifecycleScore >= 60 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-rose-100 text-rose-700 border-rose-300'}`}>
          {summary.avgLifecycleScore}% Portfolio Health
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.slice(0, 8).map(m => (
          <Card
            key={m.label}
            className="border-border hover:border-accent/30 hover:shadow-card transition-all cursor-pointer"
            onClick={() => navigate(m.linkTo)}
          >
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.label}</span>
                <TrendIcon trend={m.trend} />
              </div>
              <div className="text-2xl font-black tracking-tight tabular-nums">{m.value}</div>
              <div className="text-[10px] text-muted-foreground line-clamp-1">{m.sublabel}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority Alert Panel */}
      {summary.atRiskProjects > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400">Perlu Perhatian Sekarang</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.atRiskProjects > 0 && (
                <Badge variant="outline" className="cursor-pointer text-[10px] border-rose-300 bg-white text-rose-700 hover:bg-rose-100" onClick={() => {
                  const el = document.getElementById('at-risk-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  {summary.atRiskProjects} proyek berisiko — lihat detail
                </Badge>
              )}
              {summary.projectsWithoutSroi > 0 && (
                <Badge variant="outline" className="cursor-pointer text-[10px] border-amber-300 bg-white text-amber-700 hover:bg-amber-100" onClick={() => navigate('/dashboard/sroi-workspace')}>
                  {summary.projectsWithoutSroi} proyek tanpa SROI
                </Badge>
              )}
              {summary.projectsWithCriticalFindings > 0 && (
                <Badge variant="outline" className="cursor-pointer text-[10px] border-rose-300 bg-white text-rose-700 hover:bg-rose-100" onClick={() => navigate('/dashboard/project-management')}>
                  {summary.projectsWithCriticalFindings} proyek dengan temuan kritis
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section: Top Projects */}
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          Peringkat Kesehatan Proyek
        </h2>
        <div className="space-y-2">
          {ranks.map((r, i) => {
            const rankBadge = i === 0 ? 'bg-amber-100 text-amber-800 border-amber-300' :
              i === 1 ? 'bg-slate-200 text-slate-700 border-slate-300' :
              i === 2 ? 'bg-orange-100 text-orange-700 border-orange-300' : '';
            return (
              <Card
                key={r.id}
                className="border-border hover:border-accent/20 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard/lfa-builder/${r.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {rankBadge && <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${rankBadge}`}>{i + 1}</span>}
                    {!rankBadge && <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{i + 1}</span>}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{r.status}</Badge>
                        {r.alerts.map((a, ai) => (
                          <span key={ai} className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />{a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-lg font-black tabular-nums ${SCORE_COLORS(r.score)}`}>{r.score}%</span>
                    <Badge className={`text-[9px] ${RISK_COLORS[r.risk]}`}>{RISK_LABELS[r.risk]}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section: At-Risk Projects */}
      {snapshots.filter(s => projectRisk(computeProjectScore(s)) === 'at_risk').length > 0 && (
        <div id="at-risk-section">
          <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-rose-600">
            <Shield className="h-5 w-5" />
            Proyek Memerlukan Intervensi
          </h2>
          <div className="space-y-2">
            {snapshots
              .map(s => ({ ...s, score: computeProjectScore(s) }))
              .filter(s => projectRisk(s.score) === 'at_risk')
              .sort((a, b) => a.score - b.score)
              .map(s => (
                <Card
                  key={s.id}
                  className="border-rose-200 bg-rose-50/30 dark:bg-rose-950/10 cursor-pointer hover:border-rose-300 transition-all"
                  onClick={() => navigate(`/dashboard/lfa-builder/${s.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-sm">{s.name}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {projectAlerts(s).map((a, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-rose-200 text-rose-700">{a}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xl font-black text-rose-600">{s.score}%</span>
                      <ArrowRight className="h-4 w-4 text-rose-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'LFA Builder', icon: FileText, to: '/dashboard/lfa-builder', desc: 'Desain & MEAL' },
          { label: 'Project Mgmt', icon: Layers, to: '/dashboard/project-management', desc: 'Klaim & Evidence' },
          { label: 'SROI Workspace', icon: TrendingUp, to: '/dashboard/sroi-workspace', desc: 'Kalkulasi dampak' },
          { label: 'Learning Library', icon: Target, to: '/dashboard/learning', desc: 'Pembelajaran' },
        ].map(nav => (
          <Card
            key={nav.label}
            className="border-border hover:border-accent/30 hover:shadow-card transition-all cursor-pointer"
            onClick={() => navigate(nav.to)}
          >
            <CardContent className="p-4">
              <nav.icon className="h-5 w-5 text-accent mb-2" />
              <div className="text-sm font-bold">{nav.label}</div>
              <div className="text-[10px] text-muted-foreground">{nav.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
