// src/pages/dashboard/SROIWorkspace.tsx
// Dedicated SROI Workspace — project selector + integrated SROI Calculator.

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  TrendingUp, Calculator, Layers, FileText, ArrowRight, Info,
  Loader2, PlusCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SROICalculator from './lfa-builder/SROICalculator';

const SROIWorkspace = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Org membership
  const { data: membership } = useQuery({
    queryKey: ['sroi-workspace-membership', user?.id],
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

  // Project list
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['sroi-workspace-projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('lfa_projects')
        .select('id, name, sector, duration_months, status')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!orgId,
  });

  // SROI config for the selected project
  const { data: sroiConfig } = useQuery({
    queryKey: ['sroi-workspace-config', routeProjectId],
    queryFn: async () => {
      if (!routeProjectId) return null;
      const { data } = await supabase
        .from('lfa_sroi_config')
        .select('sroi_ratio, total_gross_value_idr, total_present_value_idr, total_investment_idr, beneficiary_count')
        .eq('lfa_project_id', routeProjectId)
        .maybeSingle();
      return data;
    },
    enabled: !!routeProjectId,
  });

  // Outcome count for selected project
  const { data: outcomeCount = 0 } = useQuery({
    queryKey: ['sroi-workspace-outcomes', routeProjectId],
    queryFn: async () => {
      if (!routeProjectId) return 0;
      const { count } = await supabase
        .from('lfa_sroi_outcomes')
        .select('id', { count: 'exact', head: true })
        .eq('lfa_project_id', routeProjectId);
      return count || 0;
    },
    enabled: !!routeProjectId,
  });

  const selectedProject = useMemo(
    () => projects.find(p => p.id === routeProjectId),
    [projects, routeProjectId],
  );

  const handleProjectChange = (projectId: string) => {
    navigate(`/dashboard/sroi-workspace/${projectId}`, { replace: true });
  };

  // No org
  if (!orgId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">Hubungkan Organisasi</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Anda perlu tergabung dalam organisasi untuk mengakses SROI Workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">SROI Workspace</h1>
            <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20">Value Analysis Layer</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Hitung Social Return on Investment dengan financial proxies dan penyesuaian dampak nyata.
          </p>
        </div>

        {/* Project Selector */}
        <div className="min-w-[240px]">
          <Select
            value={routeProjectId || '__select__'}
            onValueChange={handleProjectChange}
            disabled={loadingProjects}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingProjects ? 'Memuat proyek...' : 'Pilih Proyek'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__select__" disabled>
                {loadingProjects ? 'Memuat...' : '— Pilih Proyek —'}
              </SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* No project selected — show list */}
      {!routeProjectId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Info className="h-4 w-4" />
            Pilih proyek yang sudah memiliki indikator MEAL untuk memulai kalkulasi SROI.
          </div>

          {projects.length === 0 && !loadingProjects && (
            <Card className="border-dashed border-border bg-muted/30">
              <CardContent className="p-8 text-center space-y-3">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-bold text-foreground">Belum Ada Proyek</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Buat proyek di LFA Builder terlebih dahulu, lalu lengkapi indikator MEAL. Setelah itu, SROI akan otomatis mengimpor indikator sebagai outcome.
                </p>
                <Button variant="outline" onClick={() => navigate('/dashboard/lfa-builder')}>
                  Buka LFA Builder
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {projects.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map(p => (
                <Card
                  key={p.id}
                  className="cursor-pointer border-border hover:border-accent/50 hover:shadow-card transition-all"
                  onClick={() => handleProjectChange(p.id)}
                >
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] font-sans">
                        {p.sector || 'Sektor Lainnya'}
                      </Badge>
                      <Badge className={`text-[9px] ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status === 'active' ? 'Aktif' : p.status}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {p.duration_months || 12} bulan
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Project selected — SROI Summary + Calculator */}
      {routeProjectId && selectedProject && (
        <div className="space-y-6">
          {/* Summary Card */}
          {sroiConfig && (
            <div className="grid gap-4 sm:grid-cols-5">
              <Card className="sm:col-span-2 border-accent/30 bg-gradient-to-br from-accent/5 to-white dark:from-accent/10 dark:to-slate-950">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SROI Ratio</div>
                  <div className="text-3xl font-black text-accent mt-1 tabular-nums">
                    {sroiConfig.sroi_ratio != null ? `${Number(sroiConfig.sroi_ratio).toFixed(2)}:1` : '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2">
                    Setiap Rp 1 menghasilkan dampak sosial senilai Rp {sroiConfig.sroi_ratio != null ? Number(sroiConfig.sroi_ratio).toFixed(0) : '—'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Investasi</div>
                  <div className="text-lg font-extrabold mt-1 tabular-nums">
                    Rp {(Number(sroiConfig.total_investment_idr || 0)).toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nilai Dampak Kotor</div>
                  <div className="text-lg font-extrabold mt-1 text-emerald-600 tabular-nums">
                    Rp {(Number(sroiConfig.total_gross_value_idr || 0)).toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nilai Sekarang</div>
                  <div className="text-lg font-extrabold mt-1 text-blue-600 tabular-nums">
                    Rp {(Number(sroiConfig.total_present_value_idr || 0)).toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Context: Outcomes Count */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span className="font-bold">{outcomeCount}</span> outcome terdefinisi
            </span>
            {sroiConfig?.beneficiary_count != null && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-bold">{sroiConfig.beneficiary_count}</span> penerima manfaat
              </span>
            )}
          </div>

          {/* Integrated SROI Calculator */}
          <SROICalculator
            projectId={routeProjectId}
            orgId={orgId}
            programDurationMonths={selectedProject.duration_months || 12}
            sector={(selectedProject as any).sector || 'Sektor Lainnya'}
          />
        </div>
      )}
    </div>
  );
};

export default SROIWorkspace;
