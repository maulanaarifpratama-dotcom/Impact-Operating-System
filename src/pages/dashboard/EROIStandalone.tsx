// src/pages/dashboard/EROIStandalone.tsx
// Standalone E-ROI Carbon Tracker page for Sprint 4

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Leaf,
  ArrowRight,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Trees as TreesIcon,
  TrendingDown,
  TrendingUp,
  Info,
  Activity,
  ArrowUpRight,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface SummaryMetrics {
  total: number;
  reduction: number;
  emission: number;
  trees: number;
  count: number;
  missingQtyCount: number;
  scope1: number;
  scope2: number;
  scope3: number;
  unassignedScopeCount: number;
}

export default function EROIStandalone() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<'all' | string>('all');

  // --- QUERY 1: ORG NAME (Retrieved via membership) ---
  const { data: membership } = useQuery({
    queryKey: ['organization_members_eroi', user?.id],
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

  // Fetch organization name/details for the badge
  const { data: organization } = useQuery({
    queryKey: ['organization_eroi', orgId],
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

  // --- QUERY 2: PROGRAM LIST ---
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('id, name')
        .eq('org_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // --- QUERY 3: WBS ITEMS WITH CARBON ---
  const { data: tableData, isLoading: isTableLoading } = useQuery({
    queryKey: ['eroi_carbon_wbs_items', orgId, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from('lfa_wbs_items')
        .select(`
          name,
          carbon_factor,
          carbon_unit,
          carbon_source,
          carbon_quantity,
          carbon_scope,
          duration_weeks,
          lfa_projects (name)
        `)
        .eq('org_id', orgId)
        .eq('carbon_enabled', true)
        .eq('level', 2)
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedProject !== 'all') {
        query = query.eq('lfa_project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });

  // --- COMPUTE SUMMARY (NO EXTRA QUERY) ---
  const summary = useMemo<SummaryMetrics>(() => {
    if (!tableData) {
      return { total: 0, reduction: 0, emission: 0, trees: 0, count: 0, missingQtyCount: 0, scope1: 0, scope2: 0, scope3: 0, unassignedScopeCount: 0 };
    }

    let total = 0;
    let reduction = 0;
    let emission = 0;
    let missingQtyCount = 0;
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    let unassignedScopeCount = 0;

    for (const item of tableData) {
      if (item.carbon_factor == null) continue;

      const qty = item.carbon_quantity;
      if (qty == null || qty === '' || isNaN(Number(qty))) {
        missingQtyCount++;
        continue;
      }

      const impact = Number(item.carbon_factor) * Number(qty);

      total += impact;
      if (impact < 0) reduction += Math.abs(impact);
      else emission += impact;

      if (item.carbon_scope === 'scope_1') scope1 += impact;
      else if (item.carbon_scope === 'scope_2') scope2 += impact;
      else if (item.carbon_scope === 'scope_3') scope3 += impact;
      else unassignedScopeCount++;
    }

    return {
      total,
      reduction,
      emission,
      trees: Math.abs(total) / 5,
      count: tableData.length,
      missingQtyCount,
      scope1,
      scope2,
      scope3,
      unassignedScopeCount
    };
  }, [tableData]);

  const globalLoading = isProjectsLoading || isTableLoading;

  if (globalLoading && !tableData) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-950 p-6 rounded-2xl border shadow-elegant animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-72 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-2xl border" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border animate-pulse" />
      </div>
    );
  }

  return (
    <div id="eroi-standalone-root" data-testid="eroi-standalone-root" className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-950 p-6 rounded-2xl border shadow-elegant">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-xl text-2xl shadow-sm flex items-center justify-center">
              <Leaf className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  E-ROI Carbon Tracker
                </h1>
                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-100 dark:border-emerald-900/50">
                  🌱 Carbon Standalone
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Pantau emisi, reduksi, dan net impact karbon dari seluruh aktivitas program LFA secara real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Organisasi Terdaftar</span>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border px-3 py-1.5 rounded-lg">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {organization?.name || 'Mengambil data...'}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & PROGRAM SELECTOR CONTAINER */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Berdasarkan Program LFA</h4>
          <p className="text-[11px] text-muted-foreground">Pilih program tertentu untuk menyaring data emisi dan kalkulasi ringkasan.</p>
        </div>
        <div className="flex items-center gap-2">
          {globalLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 mr-1" />}
          <select
            id="eroi-program-select"
            data-testid="eroi-program-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm min-w-[200px]"
          >
            <option value="all">Semua Program</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      {summary.count === 0 ? (
        /* EMPTY STATE FOR ALL CARDS AND TABLES */
        <Card className="border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm rounded-2xl">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Leaf className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Belum ada data carbon tracking
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Aktivitas pada program yang dipilih belum mengaktifkan pelacakan karbon. Anda dapat mengonfigurasi faktor emisi karbon di WBS Builder untuk masing-masing aktivitas.
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard/lfa-builder')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-5 rounded-lg flex items-center gap-1.5 mx-auto shadow-sm"
          >
            Buka LFA Builder <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ) : (
        /* SUMMARY CARDS & DATA TABLE */
        <div className="space-y-6">
          {/* SUMMARY CARDS (4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* NET IMPACT CARBON */}
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Carbon Net Impact
                </CardTitle>
                {summary.total <= 0 ? (
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                    summary.total <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {summary.total <= 0 ? '' : '+'}{summary.total.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">kg CO₂</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-bold ${
                    summary.total <= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300'
                  }`}>
                    {summary.total <= 0 ? 'Carbon Negative / Offset' : 'Carbon Positive / Emisi'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* CARBON REDUCTION */}
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Reduksi Karbon
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    -{summary.reduction.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">kg CO₂</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Total akumulasi dampak aktivitas hijau yang mengabsorpsi emisi.
                </p>
              </CardContent>
            </Card>

            {/* GROSS EMISSIONS */}
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Emisi Kotor
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                    +{summary.emission.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">kg CO₂</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Total akumulasi emisi karbon kotor yang diproduksi aktivitas operasional.
                </p>
              </CardContent>
            </Card>

            {/* TREES EQUIVALENT */}
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ekuivalen Penanaman Pohon
                </CardTitle>
                <TreesIcon className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {summary.trees.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">pohon</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Rerata penyerapan setara {summary.total <= 0 ? 'menyerap emisi kotor' : 'butuh penanaman tambahan'} selama durasi program.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* GHG PROTOCOL SCOPE BREAKDOWN CARD */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Breakdown Emisi Berdasarkan Standard GHG Protocol (WRI/WBCSD)
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">
                Scope 1 / Scope 2 / Scope 3
              </Badge>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SCOPE 1 */}
              <div className="p-4 rounded-xl border bg-slate-50/30 dark:bg-slate-900/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Scope 1 (Emisi Langsung)</span>
                  <Badge className="bg-red-100 text-red-700 border-0 text-[9px] px-1.5">Kendaraan / Genset</Badge>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {summary.scope1.toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Emisi langsung dari kendaraan operasional & fasilitas milik organisasi.</p>
              </div>

              {/* SCOPE 2 */}
              <div className="p-4 rounded-xl border bg-slate-50/30 dark:bg-slate-900/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Scope 2 (Energi Tidak Langsung)</span>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] px-1.5">Listrik PLN / Gedung</Badge>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {summary.scope2.toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Emisi tidak langsung dari konsumsi energi listrik PLN / gedung kantor.</p>
              </div>

              {/* SCOPE 3 */}
              <div className="p-4 rounded-xl border bg-slate-50/30 dark:bg-slate-900/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Scope 3 (Rantai Nilai & Impact)</span>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px] px-1.5">Travel / Event / Pohon</Badge>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {summary.scope3.toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Emisi perjalanan dinas, rantai pasok, pelatihan, dan penyerapan karbon pohon.</p>
              </div>
            </CardContent>
            {summary.unassignedScopeCount > 0 && (
              <div className="px-4 pb-3 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Terdapat {summary.unassignedScopeCount} aktivitas belum dikategorikan Scope GHG (dapat dikategorikan lewat WBS Builder).</span>
              </div>
            )}
          </Card>

          {/* TABLE COMPONENT CARD */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="py-4 px-5 border-b bg-slate-50/30 dark:bg-slate-900/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-md">
                    <Leaf className="h-4 w-4" />
                  </span>
                  Rincian Aktivitas Terlacak & Kalkulasi Karbon
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Menampilkan aktivitas yang diaktifkan pelacakan emisi (Dibatasi maksimal 200 aktivitas).
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-950 text-xs font-semibold py-0.5 px-2 self-start sm:self-center">
                Terlacak: {summary.count} Aktivitas
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Nama Aktivitas</th>
                    <th className="py-3 px-4 font-bold">Program</th>
                    <th className="py-3 px-4 font-bold text-center">Scope GHG</th>
                    <th className="py-3 px-4 font-bold text-right">Faktor Emisi</th>
                    <th className="py-3 px-4 font-bold">Unit</th>
                    <th className="py-3 px-4 font-bold text-center">Kuantitas</th>
                    <th className="py-3 px-4 font-bold text-right">Dampak (kg CO₂)</th>
                    <th className="py-3 px-4 font-bold">Sumber Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {tableData?.map((item: any, idx: number) => {
                    const qty = item.carbon_quantity;
                    const factor = item.carbon_factor ?? 0;
                    const hasQty = qty != null && qty !== '' && !isNaN(Number(qty));
                    const impact = hasQty ? factor * Number(qty) : 0;

                    const prName = item.lfa_projects
                      ? Array.isArray(item.lfa_projects)
                        ? item.lfa_projects[0]?.name
                        : item.lfa_projects.name
                      : 'Manual / Tanpa Program';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium max-w-xs truncate" title={item.name}>
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500 max-w-[180px] truncate" title={prName}>
                          {prName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.carbon_scope === 'scope_1' && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-0 text-[10px]">Scope 1</Badge>
                          )}
                          {item.carbon_scope === 'scope_2' && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]">Scope 2</Badge>
                          )}
                          {item.carbon_scope === 'scope_3' && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">Scope 3</Badge>
                          )}
                          {!item.carbon_scope && (
                            <Badge variant="outline" className="text-slate-400 border-dashed text-[10px]">Belum dikategorikan</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {factor > 0 ? '+' : ''}{factor.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {item.carbon_unit || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">
                          {hasQty ? (
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                              {Number(qty).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] whitespace-nowrap">
                              Belum diisi
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          {hasQty ? (
                            <span className={impact < 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-amber-600 dark:text-amber-400 font-mono'}>
                              {impact < 0 ? '' : '+'}{impact.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100/60 text-amber-800 border-amber-300 text-[10px] whitespace-nowrap">
                              Kuantitas belum diisi -- perhitungan tidak akurat
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-[150px] truncate" title={item.carbon_source}>
                          {item.carbon_source || 'Referensi Internal'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* METHODOLOGY CARD (WAJIB) */}
      <Card className="border border-indigo-50 dark:border-indigo-950/40 shadow-elegant bg-indigo-50/10 dark:bg-indigo-950/10 overflow-hidden">
        <CardHeader className="py-3.5 px-5 border-b bg-indigo-50/20 dark:bg-indigo-950/20 flex flex-row items-center gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <CardTitle className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
            Metodologi & Landasan Teori Perhitungan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p className="font-semibold text-slate-800 dark:text-slate-200">🔍 PEMBERITAHUAN METODOLOGI & ESTIMASI:</p>
          <p>
            Metodologi perhitungan menggunakan faktor emisi <strong>IPCC 2019</strong> dan <strong>PLN Indonesia 2023</strong>.
          </p>
          <p>
            Estimasi berbasis durasi program sebagai proxy jumlah aktivitas (sementara). Data ini berguna untuk estimasi awal dalam pelaporan net-zero dan penyusunan proposal pendanaan hijau kepada donor internasional.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
