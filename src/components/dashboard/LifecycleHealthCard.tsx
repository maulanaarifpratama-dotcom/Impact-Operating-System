// src/components/dashboard/LifecycleHealthCard.tsx
// Executive lifecycle health card — aggregate view across all six health dimensions.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  Activity, FileCheck, ClipboardCheck, BookOpen, BarChart3, AlertTriangle,
  Shield, TrendingUp, ArrowRight, Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  computeLifecycleHealth,
  healthStatus,
  statusLabel,
  DIMENSION_LABELS,
  type LifecycleAggregate,
  type LifecycleHealthResult,
} from '@/lib/lifecycleHealth';
import { computeMealReadiness } from '@/lib/lfa/mealReadiness';

// ── Icons per dimension ─────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  budget: BarChart3,
  meal: ClipboardCheck,
  execution: Activity,
  evidence: FileCheck,
  evaluation: Shield,
  learning: BookOpen,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  healthy: 'border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-950',
  attention: 'border-amber-400/40 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-950',
  at_risk: 'border-rose-400/40 bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-950',
};

const SCORE_RING = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  attention: 'text-amber-500 dark:text-amber-400',
  at_risk: 'text-rose-500 dark:text-rose-400',
};

const BAR_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-500',
  attention: 'bg-amber-400',
  at_risk: 'bg-rose-400',
};

const DIMENSION_LINKS: Record<string, string> = {
  budget: '/dashboard/lfa-builder?tab=budget',
  meal: '/dashboard/lfa-builder?tab=meal',
  execution: '/dashboard/project-management',
  evidence: '/dashboard/project-management',
  evaluation: '/dashboard/project-management',
  learning: '/dashboard/learning?status=published',
};

// ── Component ───────────────────────────────────────────────────────────────

export function LifecycleHealthCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Determine orgId ─────────────────────────────────────────────────────
  const { data: membership } = useQuery({
    queryKey: ['lifecycle-health-membership', user?.id],
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
    staleTime: 5 * 60 * 1000,
  });
  const orgId = (membership as any)?.organization_id as string | undefined;

  // ── MEAL ─────────────────────────────────────────────────────────────────
  const { data: mealItems = [] } = useQuery({
    queryKey: ['lifecycle-health-meal', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('lfa_meal_items')
        .select('id,indicator_text,target_value,target_unit,collection_method,secondary_source,frequency,pic')
        .eq('org_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Execution (WBS activities) ─────────────────────────────────────────
  const { data: wbsItems = [] } = useQuery({
    queryKey: ['lifecycle-health-wbs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('lfa_wbs_items')
        .select('id,status,end_date,progress_percent')
        .eq('org_id', orgId)
        .eq('level', 2);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Evidence (completion claims) ─────────────────────────────────────────
  const { data: claims = [] } = useQuery({
    queryKey: ['lifecycle-health-claims', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('wbs_completion_claims')
        .select('id,status')
        .eq('org_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Evaluation findings ───────────────────────────────────────────────────
  const { data: findings = [] } = useQuery({
    queryKey: ['lifecycle-health-findings', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('project_evaluation_findings')
        .select('id,severity')
        .eq('org_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Learning entries ──────────────────────────────────────────────────────
  const { data: learningEntries = [] } = useQuery({
    queryKey: ['lifecycle-health-learning', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('org_learning_entries')
        .select('id,status')
        .eq('org_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Compute aggregate ─────────────────────────────────────────────────────
  const result: LifecycleHealthResult | null = useMemo(() => {
    if (!orgId) return null;

    const now = new Date();

    // MEAL
    const mealReadiness = computeMealReadiness(mealItems as any);

    // Execution
    const completed = wbsItems.filter((w: any) => w.status === 'completed').length;
    const inProgress = wbsItems.filter((w: any) => w.status === 'in_progress' || w.status === 'Sedang Berjalan').length;
    const overdue = wbsItems.filter((w: any) => {
      if (!w.end_date || w.status === 'completed') return false;
      return new Date(w.end_date) < now;
    }).length;

    // Evidence
    const verifiedClaims = claims.filter((c: any) => c.status === 'verified' || c.status === 'closed').length;
    const pendingClaims = claims.filter((c: any) => c.status === 'submitted').length;

    // Evaluation
    const criticalFindings = findings.filter((f: any) =>
      f.severity === 'critical' || f.severity === 'kritis'
    ).length;

    // Learning
    const published = learningEntries.filter((e: any) => e.status === 'published').length;
    const drafts = learningEntries.filter((e: any) => e.status === 'draft').length;

    const agg: LifecycleAggregate = {
      budget: { complianceScore: null, utilizationPct: null },
      meal: {
        readinessScore: mealReadiness.score,
        totalIndicators: mealReadiness.totalIndicators,
        readyIndicators: mealReadiness.readyIndicators,
        missingPic: mealReadiness.missingPic,
        missingMov: mealReadiness.missingMov,
        missingTarget: mealReadiness.missingTarget,
        missingMethod: mealReadiness.missingMethod,
        missingFrequency: mealReadiness.missingFrequency,
        incomplete: mealReadiness.incomplete,
      },
      execution: {
        totalActivities: wbsItems.length,
        completedActivities: completed,
        inProgressActivities: inProgress,
        overdueActivities: overdue,
        progressPct: wbsItems.length > 0
          ? Math.round(wbsItems.reduce((sum: number, w: any) => sum + (w.progress_percent || 0), 0) / wbsItems.length)
          : null,
      },
      evidence: {
        totalClaims: claims.length,
        verifiedClaims,
        pendingClaims,
      },
      evaluation: {
        totalFindings: findings.length,
        criticalFindings,
        openFindings: findings.length,
      },
      learning: {
        totalEntries: learningEntries.length,
        publishedEntries: published,
        draftEntries: drafts,
      },
    };

    return computeLifecycleHealth(agg);
  }, [orgId, mealItems, wbsItems, claims, findings, learningEntries]);

  // ── Loading / No Org ──────────────────────────────────────────────────────
  if (!orgId) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Hubungkan dengan organisasi untuk melihat kesehatan lifecycle.
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const { score, status, statusLabel: lbl, dimensions, alerts } = result;

  return (
    <Card className={`relative overflow-hidden border shadow-card hover:shadow-elegant transition-all duration-300 ${STATUS_COLORS[status] || STATUS_COLORS.healthy}`}>
      <CardContent className="p-6">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground/80">
                Kesehatan Siklus Program
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Skor agregat 6 dimensi lifecycle program Anda
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-3xl font-black tracking-tight ${SCORE_RING[status] || SCORE_RING.healthy}`}>
              {score}%
            </div>
            <Badge className={`text-[10px] font-bold uppercase ${
              status === 'healthy' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
              status === 'attention' ? 'bg-amber-100 text-amber-700 border-amber-300' :
              'bg-rose-100 text-rose-700 border-rose-300'
            }`}>
              {lbl}
            </Badge>
          </div>
        </div>

        {/* Alerts Row — only if there are alerts */}
        {alerts.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {alerts.slice(0, 5).map(alert => (
              <TooltipProvider key={alert.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(alert.linkTo)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors hover:shadow-sm ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' :
                        alert.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' :
                        'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {alert.message} ({alert.count})
                      <ArrowRight className="h-3 w-3 ml-0.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Klik untuk navigasi ke {DIMENSION_LABELS[alert.dimension] || alert.dimension}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* No alerts — healthy message */}
        {alerts.length === 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-medium">Semua dimensi dalam kondisi sehat</span>
          </div>
        )}

        {/* Dimension Bars */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {dimensions.map(dim => {
            const Icon = DIMENSION_ICONS[dim.key] || BarChart3;
            const barColor = BAR_COLORS[dim.status] || BAR_COLORS.healthy;
            return (
              <TooltipProvider key={dim.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(DIMENSION_LINKS[dim.key] || '/dashboard')}
                      className="group text-left w-full rounded-lg border border-border/60 bg-white/60 dark:bg-slate-950/40 p-2.5 hover:bg-white dark:hover:bg-slate-900/60 hover:border-border transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {dim.label}
                          </span>
                        </div>
                        <span className={`text-[11px] font-extrabold tabular-nums ${dim.score >= 80 ? 'text-emerald-600' : dim.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {dim.score}%
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(2, dim.score)}%` }}
                        />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[200px]">
                    <p className="font-semibold">{dim.label}</p>
                    <p className="text-muted-foreground">{dim.detail}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
