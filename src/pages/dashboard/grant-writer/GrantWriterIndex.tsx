import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Loader2, ArrowRight, Search, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import { useOrgRole } from '@/hooks/useOrgRole';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import type { Database } from '@/integrations/supabase/database.types';
import { cn } from '@/lib/utils';

type Project = Database['public']['Tables']['gw_projects']['Row'];

type StageKey = 'all' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';

interface StageInfo {
  stageNumber: number;
  stageKey: StageKey;
  badgeLabel: string;
  badgeClass: string;
  nextStepText: string;
  ctaText: string;
  targetHref: string;
  progressPercent: number;
  activeNodeIndex: number; // 0: Blueprint, 1: LFA, 2: WBS, 3: Budget, 4: Ready
}


function getProjectStageInfo(
  p: Project,
  lfaProjects: any[],
  lfaDocs: any[]
): StageInfo {
  const wd = (p.wizard_data ?? {}) as Record<string, any>;
  const hasProgram = lfaProjects.some((lp) => lp.linked_grant_id === p.id);
  const hasDoc = lfaDocs.some((ld) => ld.project_id === p.id);
  const isBlueprintApproved = wd.blueprintApproved === true;
  const currentStep = p.current_step ?? 1;

  // Stage 6: Ready (Completed & exported proposal)
  if (p.status === 'completed' && (hasDoc || hasProgram)) {
    return {
      stageNumber: 6,
      stageKey: 'stage6',
      badgeLabel: 'Stage 6: Ready',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
      nextStepText: 'Proposal program lengkap dan siap diunduh/submit',
      ctaText: 'Lihat Proposal Final',
      targetHref: `/dashboard/grant-writer/${p.id}/proposal`,
      progressPercent: 100,
      activeNodeIndex: 4,
    };
  }

  // Stage 5: Budget Studio
  if (wd.budgetReady === true) {
    return {
      stageNumber: 5,
      stageKey: 'stage5',
      badgeLabel: 'Stage 5: Budget Studio',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
      nextStepText: 'Lengkapi rincian anggaran biaya program',
      ctaText: 'Buka Studio Anggaran',
      targetHref: `/dashboard/grant-writer/${p.id}/proposal`,
      progressPercent: 85,
      activeNodeIndex: 3,
    };
  }

  // Stage 4: WBS & Schedule
  if (wd.wbsReady === true) {
    return {
      stageNumber: 4,
      stageKey: 'stage4',
      badgeLabel: 'Stage 4: WBS & Schedule',
      badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300',
      nextStepText: 'Susun rincian jadwal dan rencana kerja (WBS)',
      ctaText: 'Susun WBS',
      targetHref: `/dashboard/grant-writer/${p.id}/proposal`,
      progressPercent: 70,
      activeNodeIndex: 2,
    };
  }

  // Stage 3: LFA Studio
  if (isBlueprintApproved || hasProgram || hasDoc) {
    return {
      stageNumber: 3,
      stageKey: 'stage3',
      badgeLabel: 'Stage 3: LFA Studio',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
      nextStepText: 'Lengkapi Outcome, Output, dan Indikator di LFA Studio',
      ctaText: 'Buka LFA Studio',
      targetHref: (hasDoc || hasProgram) ? `/dashboard/grant-writer/${p.id}/proposal` : `/dashboard/grant-writer/quick/${p.id}`,
      progressPercent: 50,
      activeNodeIndex: 1,
    };
  }

  // Stage 2: Review Blueprint
  if (currentStep >= 2 || wd.currentFlowPage === 2 || wd.generatedContent) {
    return {
      stageNumber: 2,
      stageKey: 'stage2',
      badgeLabel: 'Stage 2: Review Blueprint',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
      nextStepText: 'Review dan setujui draf kerangka program',
      ctaText: 'Tinjau Blueprint',
      targetHref: `/dashboard/grant-writer/quick/${p.id}`,
      progressPercent: 30,
      activeNodeIndex: 0,
    };
  }

  // Stage 1: Blueprint Draft
  return {
    stageNumber: 1,
    stageKey: 'stage1',
    badgeLabel: 'Stage 1: Blueprint Draft',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300',
    nextStepText: 'Lengkapi cerita dan parameter utama program',
    ctaText: 'Lengkapi Blueprint',
    targetHref: `/dashboard/grant-writer/quick/${p.id}`,
    progressPercent: 15,
    activeNodeIndex: 0,
  };
}

export default function GrantWriterIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  // The database already refuses deletes from staff, PMO and expert roles
  // (20260727010000_restrict_deletes_to_admins.sql), but PostgREST answers a
  // fully filtered DELETE with 200 and an empty array — so without this the
  // button appeared to work and silently did nothing.
  const { canDelete } = useOrgRole();
  const { isPaid } = usePlan();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [lfaProjects, setLfaProjects] = useState<any[]>([]);
  const [lfaDocs, setLfaDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageKey>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deepLinkHandled = useRef(false);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList: Array<{ project: Project }>) => {
    const allFilteredIds = filteredList.map(({ project }) => project.id);
    const isAllSelected =
      allFilteredIds.length > 0 &&
      allFilteredIds.every((id) => selectedIds.includes(id));

    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  /**
   * Deletes one proposal or many.
   *
   * Both paths run the same three steps — unlink the LFA, drop the
   * materialisation, then remove the project — because a second copy of this
   * sequence written for single delete would be the copy that forgets to unlink
   * and leaves an LFA pointing at a project that no longer exists.
   */
  const deleteProposals = async (ids: string[]) => {
    if (ids.length === 0 || deleting) return;
    setDeleting(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);

      // 1. Unlink lfa_projects
      const { error: unlinkErr } = await supabase
        .from('lfa_projects')
        .update({ linked_grant_id: null } as any)
        .in('linked_grant_id', ids);
      if (unlinkErr) console.warn('LFA unlink error:', unlinkErr);

      // 2. Delete lfa_materializations
      const { error: matErr } = await supabase
        .from('lfa_materializations')
        .delete()
        .in('source_gw_project_id', ids);
      if (matErr) console.warn('Materialization cleanup error:', matErr);

      // 3. Delete gw_projects scoped strictly to orgId
      const { data: deleted, error: delErr } = await supabase
        .from('gw_projects')
        .delete()
        .eq('organization_id', orgId)
        .in('id', ids)
        .select('id');

      if (delErr) throw delErr;

      // RLS answers a fully filtered DELETE with success and zero rows, so
      // without this a staff user would see "berhasil dihapus" and watch the
      // card stay exactly where it was.
      if (!deleted || deleted.length === 0) {
        throw new Error(
          'Tidak ada proposal yang terhapus. Hanya pemilik atau admin organisasi yang boleh menghapus.',
        );
      }

      toast({
        title: 'Proposal Berhasil Dihapus',
        description: `${deleted.length} proposal telah dihapus.`,
      });

      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      await load();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal Menghapus Proposal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Gagal memuat proyek', description: error.message, variant: 'destructive' });
    } else {
      setProjects(data ?? []);

      const { data: lfap } = await supabase
        .from('lfa_projects')
        .select('id, linked_grant_id');
      setLfaProjects(lfap ?? []);

      const { data: lfad } = await supabase
        .from('gw_lfa_documents')
        .select('id, project_id, is_current')
        .eq('is_current', true);
      setLfaDocs(lfad ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleQuickCreate = async (customTitle?: string) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const orgId = await ensureDefaultOrg(user.id, profile?.full_name);
      const lfaProjectId = searchParams.get('lfa_project_id');
      const projectTitle = customTitle?.trim() || 'Program Baru';

      const { data, error } = await supabase
        .from('gw_projects')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          title: projectTitle,
          status: 'draft',
          current_step: 1,
          wizard_data: { _mode: 'quick', isTemporaryTitle: !customTitle, ...(lfaProjectId ? { lfa_project_id: lfaProjectId } : {}) } as never,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (lfaProjectId) {
        await supabase
          .from('lfa_projects')
          .update({ linked_grant_id: data.id })
          .eq('id', lfaProjectId);
      }

      toast({
        title: 'Program Baru Dibuat',
        description: 'Membuka Program Blueprint Studio...',
      });
      navigate(`/dashboard/grant-writer/quick/${data.id}`);
    } catch (err) {
      const error = err as Error;
      toast({ title: 'Gagal membuat program', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const roleParam = searchParams.get('role');
    const modeParam = searchParams.get('mode');
    if (roleParam || modeParam) {
      deepLinkHandled.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete('role');
      next.delete('mode');
      setSearchParams(next, { replace: true });
      void handleQuickCreate();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const lfaId = searchParams.get('lfa_project_id');
    if (lfaId) {
      const fetchLfaProjectName = async () => {
        try {
          const { data, error } = await supabase
            .from('lfa_projects')
            .select('name')
            .eq('id', lfaId)
            .maybeSingle();
          if (error) throw error;
          if (data?.name) {
            toast({
              title: 'LFA Ditemukan',
              description: `Menghubungkan program "${data.name}" ke proposal baru Anda.`,
            });
            void handleQuickCreate(data.name);
          }
        } catch (e) {
          console.error('Error fetching LFA project:', e);
        }
      };
      void fetchLfaProjectName();
    }
  }, [searchParams, toast]);

  // Compute stage info and counts for all projects
  const decoratedProjects = projects.map((p) => {
    const stageInfo = getProjectStageInfo(p, lfaProjects, lfaDocs);
    return { project: p, stageInfo };
  });

  const blueprintCount = decoratedProjects.filter(
    (dp) => dp.stageInfo.stageNumber === 1 || dp.stageInfo.stageNumber === 2
  ).length;
  const lfaCount = decoratedProjects.filter((dp) => dp.stageInfo.stageNumber === 3).length;
  const wbsCount = decoratedProjects.filter((dp) => dp.stageInfo.stageNumber === 4).length;
  const budgetCount = decoratedProjects.filter((dp) => dp.stageInfo.stageNumber === 5).length;
  const readyCount = decoratedProjects.filter((dp) => dp.stageInfo.stageNumber === 6).length;

  const filteredProjects = decoratedProjects.filter(({ project, stageInfo }) => {
    const matchesSearch = searchQuery
      ? project.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    if (!matchesSearch) return false;
    if (stageFilter === 'all') return true;
    if (stageFilter === 'stage1') return stageInfo.stageNumber === 1;
    if (stageFilter === 'stage2') return stageInfo.stageNumber === 2;
    if (stageFilter === 'stage3') return stageInfo.stageNumber === 3;
    if (stageFilter === 'stage4') return stageInfo.stageNumber === 4;
    if (stageFilter === 'stage5') return stageInfo.stageNumber === 5;
    if (stageFilter === 'stage6') return stageInfo.stageNumber === 6;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Task 4: Simplified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">GRANTWRITER</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Susun Blueprint, LFA, WBS, dan Anggaran Program Anda.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => void handleQuickCreate()}
          disabled={creating || !isPaid}
          className="gap-2 font-semibold shadow-md shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Program Baru
        </Button>
      </div>

      <UpgradeNotice module="Grantwriter" />

      {/* Task 5: Pipeline Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Program Saya</span>
          <Badge variant="secondary" className="rounded-full text-xs font-bold px-2 py-0.5">
            {projects.length} Total
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStageFilter(stageFilter === 'stage1' || stageFilter === 'stage2' ? 'all' : 'stage1')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
              stageFilter === 'stage1' || stageFilter === 'stage2'
                ? 'bg-primary/15 text-primary font-bold'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground'
            )}
          >
            <span>📝 Blueprint:</span>
            <span className="font-bold">{blueprintCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter(stageFilter === 'stage3' ? 'all' : 'stage3')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
              stageFilter === 'stage3'
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground'
            )}
          >
            <span>📊 LFA:</span>
            <span className="font-bold">{lfaCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter(stageFilter === 'stage4' ? 'all' : 'stage4')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
              stageFilter === 'stage4'
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground'
            )}
          >
            <span>📅 WBS:</span>
            <span className="font-bold">{wbsCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter(stageFilter === 'stage5' ? 'all' : 'stage5')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
              stageFilter === 'stage5'
                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground'
            )}
          >
            <span>💰 Budget:</span>
            <span className="font-bold">{budgetCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter(stageFilter === 'stage6' ? 'all' : 'stage6')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
              stageFilter === 'stage6'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
            )}
          >
            <span>✅ Ready:</span>
            <span className="font-bold">{readyCount}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat program…
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-h4 font-bold">Belum ada program</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Mulai susun proposal Anda dari ide dasar. Sistem akan memandu Anda dari Blueprint hingga Anggaran.
              </p>
            </div>
            {/* Was onClick={() => setCreateOpen(true)} — no such state existed, so
                the first button a new account ever sees threw a ReferenceError. */}
            <Button
              size="lg"
              disabled={creating || !isPaid}
              onClick={() => void handleQuickCreate()}
              className="gap-2 font-semibold"
            >
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Buat Program Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {/* Search, Filter & Bulk Selection Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama program..."
                  className="pl-9 text-sm"
                />
              </div>
              {canDelete && filteredProjects.length > 0 && (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none rounded-md border px-2.5 py-1.5 text-xs font-medium bg-card hover:bg-muted/50 shrink-0"
                  onClick={() => toggleSelectAll(filteredProjects)}
                >
                  <Checkbox
                    checked={
                      filteredProjects.length > 0 &&
                      filteredProjects.every(({ project }) => selectedIds.includes(project.id))
                    }
                    onCheckedChange={() => toggleSelectAll(filteredProjects)}
                  />
                  <span>Pilih Semua</span>
                </div>
              )}
            </div>

            {stageFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStageFilter('all')}
                className="text-xs text-muted-foreground hover:text-foreground w-fit"
              >
                Reset Filter ({stageFilter.replace('stage', 'Stage ')})
              </Button>
            )}
          </div>

          {/* Bulk Selection Action Banner */}
          {canDelete && selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-destructive">
                  {selectedIds.length} proposal terpilih
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="text-xs"
                >
                  Batal Pilih
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="gap-1.5 font-semibold text-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Terpilih ({selectedIds.length})
                </Button>
              </div>
            </div>
          )}

          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg bg-card">
              Tidak ada program yang sesuai dengan kriteria pencarian atau filter.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map(({ project: p, stageInfo }) => {
                const wd = (p.wizard_data ?? {}) as Record<string, any>;
                const locationStr = wd.lokasi ? String(wd.lokasi) : null;
                const targetStr = wd.sasaran ? String(wd.sasaran) : null;
                const isSelected = selectedIds.includes(p.id);

                return (
                  <Link key={p.id} to={stageInfo.targetHref} className="group">
                    <Card
                      className={cn(
                        'h-full flex flex-col justify-between transition-all hover:shadow-elegant hover:border-primary/40 border relative',
                        isSelected && 'border-primary/60 bg-primary/5 shadow-xs'
                      )}
                    >
                      <CardHeader className="pb-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div
                              className={cn('pt-0.5 shrink-0', !canDelete && 'hidden')}
                              onClick={(e) => toggleSelect(p.id, e)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(p.id)}
                                aria-label={`Pilih proposal ${p.title}`}
                                className="h-4 w-4"
                              />
                            </div>
                            <CardTitle className="line-clamp-2 text-base font-bold group-hover:text-primary transition-colors">
                              {p.title}
                            </CardTitle>
                          </div>
                          <Badge className={cn('shrink-0 border text-[10px] font-bold px-2 py-0.5', stageInfo.badgeClass)}>
                            {stageInfo.badgeLabel}
                          </Badge>
                        </div>

                        {(locationStr || targetStr) && (
                          <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                            {[locationStr, targetStr].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4 text-sm pt-0 flex-1 flex flex-col justify-between">
                        {/* Next Step Helper Text */}
                        <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1">
                          <span className="font-semibold text-foreground/80 block">Langkah Berikutnya:</span>
                          <p className="text-muted-foreground leading-relaxed">{stageInfo.nextStepText}</p>
                        </div>

                        {/* Progress Node Timeline Visualization */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Progress Lifecycle</span>
                            <span>{stageInfo.progressPercent}%</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground overflow-x-auto py-1">
                            {['Blueprint', 'LFA', 'WBS', 'Budget', 'Ready'].map((nodeName, idx) => {
                              const isCompleted = idx < stageInfo.activeNodeIndex;
                              const isCurrent = idx === stageInfo.activeNodeIndex;
                              return (
                                <div key={nodeName} className="flex items-center gap-1 shrink-0">
                                  {idx > 0 && <span className="text-muted-foreground/30 text-[10px]">→</span>}
                                  <span
                                    className={cn(
                                      'flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px]',
                                      isCurrent
                                        ? 'bg-primary/15 font-bold text-primary ring-1 ring-primary/30'
                                        : isCompleted
                                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                          : 'text-muted-foreground/50'
                                    )}
                                  >
                                    <span>{isCompleted ? '●' : isCurrent ? '⚡' : '○'}</span>
                                    <span>{nodeName}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Footer: Timestamp + CTA */}
                        <div className="flex items-center justify-between pt-3 border-t text-xs">
                          <span className="text-muted-foreground text-[11px]">
                            {formatRelativeTime(p.updated_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {canDelete && (
                              // The whole card is a Link, so the click has to be
                              // stopped before it navigates into the proposal.
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/20"
                                title="Hapus proposal"
                                disabled={deleting}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteTargetId(p.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <div className="flex items-center gap-1 font-bold text-primary transition-transform group-hover:translate-x-0.5">
                              <span>{stageInfo.ctaText}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Confirmation Dialog for Bulk Delete */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus {selectedIds.length} Proposal Terpilih?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus {selectedIds.length} proposal terpilih? Tindakan ini tidak bisa dibatalkan dan akan menghapus seluruh data blueprint, LFA, dan dokumen terkait.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteProposals(selectedIds)}
              disabled={deleting}
              className="gap-2 font-semibold"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Hapus {selectedIds.length} Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Single Delete */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus proposal ini?
            </DialogTitle>
            <DialogDescription className="pt-2">
              {(() => {
                const title = projects.find((p) => p.id === deleteTargetId)?.title;
                return title ? `"${title}" akan dihapus permanen, ` : 'Proposal ini akan dihapus permanen, ';
              })()}
              beserta seluruh blueprint, LFA, dan dokumen terkaitnya. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} disabled={deleting}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteProposals(deleteTargetId ? [deleteTargetId] : [])}
              disabled={deleting}
              className="gap-2 font-semibold"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}