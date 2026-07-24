import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileText,
  Loader2,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
  ClipboardList,
  Target,
  Download,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import { LfaProject, LfaEntry, AiActivity } from './types';

export default function LFABuilderIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromQuickProposal = searchParams.get('from') === 'quick_proposal';

  const [projects, setProjects] = useState<LfaProject[]>([]);
  const [completenessMap, setCompletenessMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal States
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [pasteModalOpen, setProposalModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [sector, setSector] = useState('Pendidikan');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState('');
  const [beneficiaryDesc, setBeneficiaryDesc] = useState('');
  const [proposalText, setProposalDesc] = useState('');

  // Loading indicator for AI generation
  const [generating, setGenerating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);
      
      const { data: projData, error: projErr } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;

      // Fetch entries to calculate completeness %
      const { data: entryData, error: entryErr } = await supabase
        .from('lfa_entries')
        .select('project_id, level')
        .eq('org_id', orgId);

      if (entryErr) throw entryErr;

      // Calculate completeness %
      // Rule: Goal=25%, Purpose=25%, Output=25%, Activity=25% based on existence
      const compMap: Record<string, number> = {};
      const projs = (projData || []) as LfaProject[];

      projs.forEach((p) => {
        const pEntries = (entryData || []).filter((e) => e.project_id === p.id);
        const hasGoal = pEntries.some((e) => e.level === 'goal');
        const hasPurpose = pEntries.some((e) => e.level === 'purpose');
        const hasOutput = pEntries.some((e) => e.level === 'output');
        const hasActivity = pEntries.some((e) => e.level === 'activity');

        let score = 0;
        if (hasGoal) score += 25;
        if (hasPurpose) score += 25;
        if (hasOutput) score += 25;
        if (hasActivity) score += 25;
        compMap[p.id] = score;
      });

      setProjects(projs);
      setCompletenessMap(compMap);
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal memuat logframe',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, toast]);

  useEffect(() => {
    if (user) {
      void loadProjects();
    }
  }, [user, loadProjects]);

  const handleCreateFromScratch = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);
      const { data, error } = await supabase
        .from('lfa_projects')
        .insert({
          org_id: orgId,
          name: name.trim(),
          sector,
          location: location || null,
          duration_months: duration ? parseInt(duration, 10) : null,
          start_date: startDate || null,
          beneficiary_count: beneficiaryCount ? parseInt(beneficiaryCount, 10) : null,
          beneficiary_description: beneficiaryDesc || null,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Program Berhasil Dibuat',
        description: 'Membuka workspace editor LFA...',
      });
      navigate(`/dashboard/lfa-builder/${data.id}`);
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal membuat program',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setSetupModalOpen(false);
      resetForm();
    }
  };

  const handleCreateFromProposal = async () => {
    if (!name.trim() || !proposalText.trim()) return;
    setGenerating(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);

      // Invoke AI draft Edge function
      const { data: aiDraft, error: fnError } = await supabase.functions.invoke(
        'lfa-ai-draft',
        {
          body: {
            proposal_text: proposalText.trim(),
            project_name: name.trim(),
            sector,
            org_id: orgId,
          },
        }
      );

      if (fnError || aiDraft?.error) {
        throw new Error(fnError?.message || aiDraft?.error || 'Gagal generate LFA.');
      }

      toast({
        title: 'LFA Berhasil Digenerate',
        description: 'Menyimpan draf program baru Anda...',
      });

      // Insert project
      const { data: project, error: pErr } = await supabase
        .from('lfa_projects')
        .insert({
          org_id: orgId,
          name: name.trim(),
          sector,
          location: location || null,
          duration_months: duration ? parseInt(duration, 10) : null,
          start_date: startDate || null,
          beneficiary_count: beneficiaryCount ? parseInt(beneficiaryCount, 10) : null,
          beneficiary_description: beneficiaryDesc || null,
          status: 'draft',
        })
        .select('id')
        .single();

      if (pErr) throw pErr;

      // Insert structured entries
      const entriesToInsert: LfaEntry[] = [];

      // 1. Goal
      if (aiDraft.goal) {
        entriesToInsert.push({
          org_id: orgId,
          project_id: project.id,
          level: 'goal',
          sequence: 1,
          description: aiDraft.goal.description || '',
          indicator: aiDraft.goal.indicator || '',
          means_of_verification: aiDraft.goal.means_of_verification || '',
          assumption: aiDraft.goal.assumption || '',
        });
      }

      // 2. Purpose
      if (aiDraft.purpose) {
        entriesToInsert.push({
          org_id: orgId,
          project_id: project.id,
          level: 'purpose',
          sequence: 1,
          description: aiDraft.purpose.description || '',
          indicator: aiDraft.purpose.indicator || '',
          means_of_verification: aiDraft.purpose.means_of_verification || '',
          assumption: aiDraft.purpose.assumption || '',
        });
      }

      // We need to insert the entries sequentially/hierarchically or as a batch.
      // For batch, we can insert everything, but for activities we need to map parent output.
      // So let's insert outputs first, get their generated IDs, then insert activities.
      if (aiDraft.outputs && Array.isArray(aiDraft.outputs)) {
        for (let i = 0; i < aiDraft.outputs.length; i++) {
          const out = aiDraft.outputs[i];
          const outputId = crypto.randomUUID();

          entriesToInsert.push({
            id: outputId,
            org_id: orgId,
            project_id: project.id,
            level: 'output',
            sequence: out.sequence || (i + 1),
            description: out.description || '',
            indicator: out.indicator || '',
            means_of_verification: out.means_of_verification || '',
            assumption: out.assumption || '',
          });

          if (out.activities && Array.isArray(out.activities)) {
            out.activities.forEach((act: AiActivity, idx: number) => {
              entriesToInsert.push({
                id: crypto.randomUUID(),
                org_id: orgId,
                project_id: project.id,
                level: 'activity',
                sequence: act.sequence || (idx + 1),
                parent_id: outputId,
                description: act.description || '',
                indicator: act.indicator || '',
                means_of_verification: act.means_of_verification || '',
                assumption: act.assumption || '',
                timeline_start: act.timeline_start || null,
                timeline_end: act.timeline_end || null,
              });
            });
          }
        }
      }

      if (entriesToInsert.length > 0) {
        const { error: rpcErr } = await supabase.rpc('materialize_lfa_matrix_transactional', {
          p_project_id: project.id,
          p_entries: entriesToInsert
        });
        if (rpcErr) throw rpcErr;
      }

      toast({
        title: 'Draft LFA Sukses Dibuat!',
        description: 'Membuka editor logframe...',
      });
      navigate(`/dashboard/lfa-builder/${project.id}`);
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'AI Drafting Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setProposalModalOpen(false);
      resetForm();
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTargetId(id);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setActionLoadingId(id);
    try {
      const { error } = await supabase
        .from('lfa_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Program Berhasil Dihapus',
        description: 'Database telah diperbarui.',
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menghapus program',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
      setDeleteTargetId(null);
    }
  };

  const handleExportPDF = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActionLoadingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('lfa-export-pdf', {
        body: { projectId: id },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      } else {
        toast({
          title: 'Export PDF',
          description: 'Fitur PDF sedang disiapkan pada Edge Function.',
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal mengekspor PDF',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const resetForm = () => {
    setName('');
    setSector('Pendidikan');
    setLocation('');
    setDuration('');
    setStartDate('');
    setBeneficiaryCount('');
    setBeneficiaryDesc('');
    setProposalDesc('');
  };

  const completedCount = Object.values(completenessMap).filter((c) => c === 100).length;
  const linkedCount = projects.filter((p) => p.linked_grant_id !== null).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2">
      {/* LFA ENTRY INFORMATION BANNER (RC-9B.6 Task 5) */}
      {isFromQuickProposal && (
        <div data-testid="lfa-entry-banner" className="rounded-lg border border-indigo-200 bg-indigo-50/90 p-4 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Program Blueprint telah disetujui.
                </span>
              </div>
              <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium mt-0.5">
                Tahap saat ini: <span className="font-bold underline">Penyusunan LFA Matrix</span>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-indigo-300 text-indigo-800 dark:border-indigo-700 dark:text-indigo-300 font-semibold text-[10px] bg-white/80 dark:bg-indigo-950/80 shrink-0">
            Tahap 2: LFA Matrix
          </Badge>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </span>
          <h1 className="text-h2 font-bold tracking-tight text-slate-950 dark:text-white">LFA Builder</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Bantu organisasi Anda merancang Logical Framework Approach (Logframe) yang coherent, solid, dan langsung donor-ready dalam 15 menit menggunakan AI terintegrasi.
        </p>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Program LFA</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">LFA terdokumentasi di organisasi</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LFA Selesai (100%)</CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? '-' : completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Dampak, Tujuan, Hasil, & Kegiatan terisi</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terhubung Proposal</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{loading ? '-' : linkedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Logframe yang dihubungkan ke Grantwriter</p>
          </CardContent>
        </Card>
      </div>

      {/* ENTRY CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Mulai dari nol */}
        <Card className="flex flex-col h-full border-border/60 shadow-elegant hover:shadow-card transition-all group duration-300">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-2">
              <Plus className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Mulai dari Nol</CardTitle>
            <CardDescription className="text-xs leading-5">Panduan step-by-step membuat logframe dari awal dengan bimbingan standar internasional.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-2">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200" onClick={() => setSetupModalOpen(true)}>
              Mulai Sekarang <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: AI Draft dari proposal */}
        <Card className="flex flex-col h-full border-border/60 shadow-elegant hover:shadow-card transition-all group duration-300 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-semibold text-[10px]">
              <Sparkles className="mr-1 h-2.5 w-3 text-primary animate-pulse" /> AI-Powered
            </Badge>
          </div>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Draft dari Proposal</CardTitle>
            <CardDescription className="text-xs leading-5">Paste narasi proposal atau ToR yang sudah ada, AI akan mengekstrak LFA otomatis secara instan.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-2">
            <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white border-0" onClick={() => setProposalModalOpen(true)}>
              Upload Proposal <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Template */}
        <Card className="flex flex-col h-full border-border/60 shadow-elegant opacity-75 relative">
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="font-semibold text-[10px]">Coming Soon</Badge>
          </div>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 mb-2">
              <ClipboardList className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold text-muted-foreground">Dari Template</CardTitle>
            <CardDescription className="text-xs leading-5">Gunakan framework best-practice dari template sektor relevan yang disukai donor global.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-2">
            <Button variant="outline" className="w-full cursor-not-allowed" disabled>
              Gunakan Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SAVED PROJECTS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Program LFA Aktif</h2>
          <p className="text-xs text-muted-foreground">Logframe program organisasi Anda yang sedang berjalan.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat daftar program LFA...
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-2 py-16 text-center shadow-none bg-slate-50/40 dark:bg-slate-900/10">
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/5 p-4 text-primary">
                <Layers className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Belum ada program LFA</h3>
                <p className="max-w-md text-xs leading-5 text-muted-foreground">
                  Mulai rancang Logical Framework Anda untuk memetakan Goal, Purpose, Outputs, dan Activities program Anda secara coherent.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setSetupModalOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Mulai dari Nol
                </Button>
                <Button variant="outline" size="sm" onClick={() => setProposalModalOpen(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Draft dari Proposal
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => {
              const score = completenessMap[p.id] ?? 0;
              return (
                <Card
                  key={p.id}
                  onClick={() => navigate(`/dashboard/lfa-builder/${p.id}`)}
                  className="cursor-pointer hover:border-slate-300 dark:hover:border-slate-800 hover:shadow-card transition-all group duration-200 border-border/70 relative"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-base font-bold group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0">
                            {p.sector || 'Lainnya'}
                          </Badge>
                          {p.location && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              • {p.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className="shrink-0 font-semibold text-[10px]" variant={p.status === 'complete' ? 'default' : 'outline'}>
                        {p.status === 'complete' ? 'Selesai' : 'Draf'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground font-medium">
                        <span>Kelengkapan LFA</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{score}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                        <div
                          className={`h-full transition-all duration-500 ${
                            score === 100
                              ? 'bg-emerald-500'
                              : score >= 50
                              ? 'bg-primary'
                              : 'bg-indigo-400'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3 mt-1">
                      <div className="flex items-center text-xs text-primary font-semibold group-hover:underline">
                        Lanjutkan Pengisian <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900"
                          title="Export PDF"
                          disabled={actionLoadingId === p.id}
                          onClick={(e) => void handleExportPDF(p.id, e)}
                        >
                          {actionLoadingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Hapus Program"
                          disabled={actionLoadingId === p.id}
                          onClick={(e) => handleDeleteClick(p.id, e)}
                        >
                          {actionLoadingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SETUP MODAL (scratch) */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Program Baru</DialogTitle>
            <DialogDescription>
              Isi data dasar program untuk merintis Logical Framework Approach (LFA) dari awal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="prog-name">Nama Program <span className="text-red-500">*</span></Label>
              <Input
                id="prog-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Program Akses Air Bersih Garut Selatan"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prog-sector">Sektor</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger id="prog-sector">
                    <SelectValue placeholder="Pilih Sektor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                    <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                    <SelectItem value="Lingkungan">Lingkungan</SelectItem>
                    <SelectItem value="Ekonomi">Ekonomi</SelectItem>
                    <SelectItem value="Sosial">Sosial</SelectItem>
                    <SelectItem value="Kebencanaan">Kebencanaan</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-loc">Lokasi Program</Label>
                <Input
                  id="prog-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mis. Garut, Jawa Barat"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prog-dur">Durasi Program (Bulan)</Label>
                <Input
                  id="prog-dur"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Mis. 12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-date">Tanggal Mulai</Label>
                <Input
                  id="prog-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prog-bencount">Target Beneficiary (Jiwa)</Label>
                <Input
                  id="prog-bencount"
                  type="number"
                  value={beneficiaryCount}
                  onChange={(e) => setBeneficiaryCount(e.target.value)}
                  placeholder="Mis. 500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-bendesc">Profil Beneficiary</Label>
                <Input
                  id="prog-bendesc"
                  value={beneficiaryDesc}
                  onChange={(e) => setBeneficiaryDesc(e.target.value)}
                  placeholder="Mis. Keluarga pra-sejahtera"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupModalOpen(false)} disabled={generating}>
              Batal
            </Button>
            <Button onClick={handleCreateFromScratch} disabled={!name.trim() || generating}>
              {generating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Buat Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROPOSAL MODAL (ai generate) */}
      <Dialog open={pasteModalOpen} onOpenChange={setProposalModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> AI Proposal-to-LFA Draft Generator
            </DialogTitle>
            <DialogDescription>
              Copy-paste narasi proposal, concept note, atau Term of Reference (ToR) Anda di sini. Impactory AI akan membaca, mengekstrak, dan menyusun LFA terstruktur untuk Anda dalam hitungan detik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-name">Nama Program <span className="text-red-500">*</span></Label>
                <Input
                  id="prop-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mis. Program Pemberdayaan Petani Kopi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-sector">Sektor Utama</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger id="prop-sector">
                    <SelectValue placeholder="Pilih Sektor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                    <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                    <SelectItem value="Lingkungan">Lingkungan</SelectItem>
                    <SelectItem value="Ekonomi">Ekonomi</SelectItem>
                    <SelectItem value="Sosial">Sosial</SelectItem>
                    <SelectItem value="Kebencanaan">Kebencanaan</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-loc">Lokasi</Label>
                <Input
                  id="prop-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mis. Kintamani, Bali"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-dur">Durasi (Bulan)</Label>
                <Input
                  id="prop-dur"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Mis. 6"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-date">Target Mulai</Label>
                <Input
                  id="prop-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-text">Isi Narasi Proposal <span className="text-red-500">*</span></Label>
              <Textarea
                id="prop-text"
                rows={10}
                value={proposalText}
                onChange={(e) => setProposalDesc(e.target.value)}
                placeholder="Copy paste narasi proposal, Term of Reference (ToR), atau concept note yang sudah Anda miliki di sini secara detail..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalModalOpen(false)} disabled={generating}>
              Batal
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white border-0"
              onClick={handleCreateFromProposal}
              disabled={!name.trim() || !proposalText.trim() || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Impactory AI sedang membaca proposal Anda...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Generate LFA dengan AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Hapus LFA Program?"
        description="Apakah Anda yakin ingin menghapus LFA program ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Program"
        cancelText="Batal"
        variant="destructive"
        icon="trash"
        loading={!!actionLoadingId}
        onConfirm={executeDelete}
      />
    </div>
  );
}
