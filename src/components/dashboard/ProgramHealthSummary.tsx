import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  DollarSign,
  TrendingUp,
  HeartPulse,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Folder,
  Layers,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProgramHealthSummaryProps {
  organizationId?: string;
  programs: Array<{
    id: string;
    name: string;
    code?: string;
    status?: string;
  }>;
}

export function ProgramHealthSummary({ organizationId, programs }: ProgramHealthSummaryProps) {
  // Selected Program ID ('all' or specific lfa_project_id)
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');

  // 1. Fetch WBS Items
  const { data: wbsItems = [], isLoading: isWbsLoading } = useQuery({
    queryKey: ['program_health_wbs', organizationId, selectedProgramId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase.from('lfa_wbs_items').select('*').eq('org_id', organizationId);
      if (selectedProgramId && selectedProgramId !== 'all') {
        query = query.eq('lfa_project_id', selectedProgramId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 2. Fetch Budget Items
  const { data: budgetItems = [], isLoading: isBudgetLoading } = useQuery({
    queryKey: ['program_health_budget', organizationId, selectedProgramId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase.from('lfa_budget_items').select('*').eq('org_id', organizationId);
      if (selectedProgramId && selectedProgramId !== 'all') {
        query = query.eq('lfa_project_id', selectedProgramId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 3. Fetch MEAL Items (Output Level)
  const { data: mealItems = [], isLoading: isMealLoading } = useQuery({
    queryKey: ['program_health_meal', organizationId, selectedProgramId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from('lfa_meal_items')
        .select('*')
        .eq('org_id', organizationId)
        .eq('lfa_level', 'output');
      if (selectedProgramId && selectedProgramId !== 'all') {
        query = query.eq('lfa_project_id', selectedProgramId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // 4. Fetch MEAL Tracking Entries
  const { data: mealEntries = [], isLoading: isTrackingLoading } = useQuery({
    queryKey: ['program_health_meal_entries', organizationId, selectedProgramId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase.from('lfa_meal_tracking_entries').select('*').eq('org_id', organizationId);
      if (selectedProgramId && selectedProgramId !== 'all') {
        query = query.eq('lfa_project_id', selectedProgramId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const isLoading = isWbsLoading || isBudgetLoading || isMealLoading || isTrackingLoading;

  // Compute 3 Lenses Rollup
  const metrics = useMemo(() => {
    // A. Physical Progress (Level 2 WBS Activities)
    const level2Items = wbsItems.filter((item: any) => Number(item.level) === 2);
    const totalLevel2Count = level2Items.length;
    let physicalPct: number | null = null;
    let completedLevel2Count = 0;

    if (totalLevel2Count > 0) {
      let sumProgress = 0;
      level2Items.forEach((item: any) => {
        const itemProg = item.status === 'completed' ? 100 : Number(item.progress_percent ?? 0);
        sumProgress += itemProg;
        if (item.status === 'completed' || itemProg === 100) {
          completedLevel2Count++;
        }
      });
      physicalPct = Math.round(sumProgress / totalLevel2Count);
    }

    // B. Financial Progress (Realisasi / Anggaran)
    let totalAnggaran = 0;
    let totalRealisasi = 0;
    budgetItems.forEach((item: any) => {
      const volume = Number(item.volume ?? 1);
      const unitPrice = Number(item.unit_price_idr ?? 0);
      const itemBudget = volume * unitPrice;
      const itemRealisasi = Number(item.actual_amount_idr ?? 0);
      totalAnggaran += itemBudget;
      totalRealisasi += itemRealisasi;
    });

    let financialPct: number | null = null;
    if (totalAnggaran > 0) {
      financialPct = Math.round((totalRealisasi / totalAnggaran) * 100);
    }

    // C. Results Progress (Output MEAL Indicators)
    const outputWithTarget = mealItems.filter((item: any) => Number(item.target_value ?? 0) > 0);
    const totalOutputCount = outputWithTarget.length;
    let resultsPct: number | null = null;

    if (totalOutputCount > 0) {
      let sumAchievement = 0;
      outputWithTarget.forEach((item: any) => {
        const targetVal = Number(item.target_value);
        // Find latest recorded value for this item
        const itemEntries = mealEntries.filter((e: any) => e.meal_item_id === item.id);
        itemEntries.sort(
          (a: any, b: any) =>
            new Date(b.recorded_date || b.created_at || 0).getTime() -
            new Date(a.recorded_date || a.created_at || 0).getTime()
        );

        const latestValue = itemEntries.length > 0 ? Number(itemEntries[0].recorded_value) : Number(item.baseline ?? 0);
        const achievementRatio = Math.min(100, Math.max(0, (latestValue / targetVal) * 100));
        sumAchievement += achievementRatio;
      });
      resultsPct = Math.round(sumAchievement / totalOutputCount);
    }

    return {
      totalLevel2Count,
      completedLevel2Count,
      physicalPct,
      totalAnggaran,
      totalRealisasi,
      financialPct,
      totalOutputCount,
      resultsPct,
    };
  }, [wbsItems, budgetItems, mealItems, mealEntries]);

  const effectivePct = useMemo(() => {
    return {
      p: metrics.physicalPct,
      f: metrics.financialPct,
      r: metrics.resultsPct,
    };
  }, [metrics]);

  // Determine if we have sufficient data
  const hasData = effectivePct.p !== null || effectivePct.f !== null || effectivePct.r !== null;

  // Compute Automated Interpretation
  const interpretation = useMemo(() => {
    const p = effectivePct.p;
    const f = effectivePct.f;
    const r = effectivePct.r;

    if (p === null && f === null && r === null) {
      return null;
    }

    // All 3 metrics exist
    if (p !== null && f !== null && r !== null) {
      const maxVal = Math.max(p, f, r);
      const minVal = Math.min(p, f, r);
      const spread = maxVal - minVal;

      if (spread < 20) {
        return {
          title: 'Program Berjalan Seimbang ⚖️',
          badgeVariant: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          text: 'Program berjalan seimbang antara implementasi, keuangan, dan hasil.',
        };
      }

      if (f - p >= 20 && f - r >= 20) {
        return {
          title: 'Tinjauan Realisasi Anggaran ⚠️',
          badgeVariant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          text: 'Perlu ditinjau: realisasi anggaran lebih cepat dari kemajuan kerja dan capaian hasil.',
        };
      }

      if (p - r >= 20) {
        return {
          title: 'Evaluasi Efektivitas Intervensi 🔍',
          badgeVariant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          text: 'Aktivitas berjalan baik, namun capaian hasil belum sebanding — tinjau efektivitas intervensi.',
        };
      }

      if (r - f >= 20 && p - f >= 20) {
        return {
          title: 'Sangat Efisien 🚀',
          badgeVariant: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
          text: 'Kemajuan fisik dan capaian hasil melampaui penyerapan anggaran — program beroperasi sangat efisien.',
        };
      }

      if (r - p >= 20) {
        return {
          title: 'Capaian Hasil Terakselerasi ✨',
          badgeVariant: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
          text: 'Capaian hasil terakselerasi dengan baik relatif terhadap progres fisik dan penyerapan anggaran.',
        };
      }

      return {
        title: 'Dalam Pemantauan 📊',
        badgeVariant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
        text: 'Kemajuan program terpantau aktif. Lakukan pemantauan berkala pada penyelarasan fisik, keuangan, dan hasil.',
      };
    }

    // Only 2 exist
    if (f !== null && p !== null && r === null) {
      if (f - p >= 20) {
        return {
          title: 'Tinjauan Realisasi ⚠️',
          badgeVariant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          text: 'Perlu ditinjau: realisasi anggaran lebih cepat dari kemajuan kerja fisik. Lengkapi indikator MEAL untuk mengukur hasil.',
        };
      }
      return {
        title: 'Fisik & Keuangan Aktif 📊',
        badgeVariant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
        text: 'Progress fisik dan realisasi anggaran terpantau aktif. Tambahkan indikator MEAL untuk evaluasi hasil.',
      };
    }

    if (p !== null && r !== null && f === null) {
      if (p - r >= 20) {
        return {
          title: 'Evaluasi Intervensi 🔍',
          badgeVariant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          text: 'Aktivitas berjalan baik, namun capaian hasil belum sebanding. Rencana anggaran belum diset.',
        };
      }
      return {
        title: 'Fisik & Hasil Aktif 📊',
        badgeVariant: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        text: 'Aktivitas fisik dan capaian hasil terpantau aktif. Tambahkan data anggaran untuk analisis biaya.',
      };
    }

    return {
      title: 'Data Sebagian ℹ️',
      badgeVariant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
      text: 'Data kesehatan program terisi sebagian. Lengkapi WBS, Budget, dan MEAL di LFA Builder untuk evaluasi 3-lens penuh.',
    };
  }, [effectivePct]);

  // Currency Formatter
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Card className="border border-slate-150 shadow-elegant bg-white dark:bg-slate-950 overflow-hidden lg:col-span-2">
      {/* Header with Title & Program Dropdown Filter */}
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-border/10 rounded-xl text-brand-border dark:text-teal-400">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                Program Health Summary
                <Badge variant="outline" className="text-[10px] font-semibold bg-brand-border/5 text-brand-border border-brand-border/20">
                  3-Lens Rollup
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Monitoring holistik keselarasan fisik (WBS), keuangan (Budget), dan hasil (MEAL)
              </CardDescription>
            </div>
          </div>

          {/* Program Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap hidden sm:inline">
              Pilih Program:
            </span>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-[200px] h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Pilih Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">
                  🌐 Semua Program ({programs.length})
                </SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    📂 {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Activity className="h-8 w-8 animate-spin text-brand-border" />
            <p className="text-xs font-semibold text-slate-400">Menghitung indikator kesehatan program…</p>
          </div>
        ) : !hasData ? (
          /* REQUIREMENT 5: Clear Empty State when data is insufficient */
          <div className="py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum ada cukup data untuk menghitung kesehatan program
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tambahkan WBS Activity (Level 2), Rencana Anggaran (Budget), dan Indikator Output (MEAL) di LFA Builder untuk mengaktifkan analisis kesehatan program 3-lens.
              </p>
            </div>
            <Link
              to="/dashboard/lfa-builder"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-border text-white text-xs font-bold rounded-lg hover:bg-brand-border/90 transition-all shadow-sm"
            >
              Lengkapi di LFA Builder <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* REQUIREMENT 3: 3 Cards / Gauges Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lens 1: Physical Progress (WBS) */}
              <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    Progress Fisik (WBS)
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400">
                    WBS Level 2
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {effectivePct.p !== null ? `${effectivePct.p}%` : 'N/A'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Rata-rata Activity
                    </span>
                  </div>
                  <Progress
                    value={effectivePct.p ?? 0}
                    className="h-2 bg-slate-200 dark:bg-slate-800 [&>div]:bg-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Aktivitas Level 2</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {metrics.totalLevel2Count > 0
                      ? `${metrics.completedLevel2Count} / ${metrics.totalLevel2Count} Selesai`
                      : 'Belum diset'}
                  </span>
                </div>
              </div>

              {/* Lens 2: Financial Progress (Realisasi / Anggaran) */}
              <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Progress Keuangan
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400">
                    Realisasi Anggaran
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {effectivePct.f !== null ? `${effectivePct.f}%` : 'N/A'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Burn Rate
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, effectivePct.f ?? 0)}
                    className={`h-2 bg-slate-200 dark:bg-slate-800 ${
                      (effectivePct.f ?? 0) > 100 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Realisasi vs Total</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={`${formatIDR(metrics.totalRealisasi)} / ${formatIDR(metrics.totalAnggaran)}`}>
                    {metrics.totalAnggaran > 0
                      ? `${formatIDR(metrics.totalRealisasi)}`
                      : 'Belum diset'}
                  </span>
                </div>
              </div>

              {/* Lens 3: Results Progress (Indikator MEAL) */}
              <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-teal-500" />
                    Capaian Hasil
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-extrabold text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400">
                    Indikator MEAL
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {effectivePct.r !== null ? `${effectivePct.r}%` : 'N/A'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Tingkat Output
                    </span>
                  </div>
                  <Progress
                    value={effectivePct.r ?? 0}
                    className="h-2 bg-slate-200 dark:bg-slate-800 [&>div]:bg-teal-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Indikator Output</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {metrics.totalOutputCount > 0
                      ? `${metrics.totalOutputCount} Indikator Target`
                      : 'Belum diset'}
                  </span>
                </div>
              </div>
            </div>

            {/* REQUIREMENT 4: Automated Short Interpretation Box */}
            {interpretation && (
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 flex items-start gap-3">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-brand-border dark:text-teal-400 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Interpretasi Otomatis Kesehatan Program:
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${interpretation.badgeVariant}`}>
                      {interpretation.title}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {interpretation.text}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
