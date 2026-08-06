import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { useOrgRole } from '@/hooks/useOrgRole';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';

/**
 * PM-3 scope only: Deliverables list/create/lifecycle/archive UI. Reuses
 * programme_deliverables and its existing create/update/transition/archive
 * RPCs unchanged in shape (create/update now also accept an optional
 * p_stage_id, added this sprint). No second Deliverables engine.
 */
const DELIVERABLE_TYPES = [
  'REPORT', 'DATASET', 'CODEBOOK', 'INSTRUMENT', 'MATRIX', 'WORKSHOP_OUTPUT',
  'PRESENTATION', 'COMMUNICATION_PRODUCT', 'CONTRACTUAL_SUBMISSION', 'OTHER',
];
const LIFECYCLE_STATUSES = [
  'DRAFT', 'PLANNED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED',
  'APPROVED', 'SUBMITTED', 'ACCEPTED', 'CANCELLED',
];
const NONE = '__none__';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  deliverable_type: string;
  lifecycle_status: string;
  wbs_item_id: string | null;
  stage_id: string | null;
  target_date: string;
  archived_at: string | null;
}

interface WbsOption {
  id: string;
  name: string;
  stage_id: string | null;
}

interface StageOption {
  id: string;
  title: string;
  archived_at: string | null;
}

export default function ProjectDeliverablesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canDelete } = useOrgRole();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [wbsOptions, setWbsOptions] = useState<WbsOption[]>([]);
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliverableType, setDeliverableType] = useState('OTHER');
  const [targetDate, setTargetDate] = useState('');
  const [wbsItemId, setWbsItemId] = useState<string>(NONE);
  const [stageId, setStageId] = useState<string>(NONE);

  const [transitionTarget, setTransitionTarget] = useState<Record<string, string>>({});
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [delivRes, wbsRes, stageRes] = await Promise.all([
        (supabase as any)
          .from('programme_deliverables')
          .select('id, title, description, deliverable_type, lifecycle_status, wbs_item_id, stage_id, target_date, archived_at')
          .eq('lfa_project_id', projectId)
          .order('created_at', { ascending: false }),
        (supabase as any).from('lfa_wbs_items').select('id, name, stage_id').eq('lfa_project_id', projectId),
        (supabase as any).from('project_stages').select('id, title, archived_at').eq('project_id', projectId),
      ]);

      if (delivRes.error) throw delivRes.error;
      if (wbsRes.error) throw wbsRes.error;
      if (stageRes.error) throw stageRes.error;

      setDeliverables((delivRes.data || []) as Deliverable[]);
      setWbsOptions((wbsRes.data || []) as WbsOption[]);
      setStageOptions((stageRes.data || []) as StageOption[]);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeliverableType('OTHER');
    setTargetDate('');
    setWbsItemId(NONE);
    setStageId(NONE);
  };

  const inheritedStageId = wbsItemId !== NONE ? wbsOptions.find((w) => w.id === wbsItemId)?.stage_id : null;

  const handleCreate = async () => {
    if (!title.trim() || !targetDate || !projectId) return;
    setSaving(true);
    try {
      const { error: rpcError } = await (supabase.rpc as any)('create_programme_deliverable', {
        p_lfa_project_id: projectId,
        p_wbs_item_id: wbsItemId === NONE ? null : wbsItemId,
        p_deliverable_type: deliverableType,
        p_title: title.trim(),
        p_description: description || null,
        p_owner_id: null,
        p_external_owner_text: null,
        p_reviewer_id: null,
        p_target_date: targetDate,
        p_target_date_is_estimated: false,
        p_forecast_date: null,
        p_stage_id: stageId === NONE ? null : stageId,
      });
      if (rpcError) throw rpcError;

      toast({ title: 'Deliverable Ditambahkan' });
      setCreateOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      const e = err as Error;
      toast({ title: 'Gagal menambahkan Deliverable', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (deliverableId: string) => {
    const target = transitionTarget[deliverableId];
    if (!target) return;
    try {
      const { error: rpcError } = await (supabase.rpc as any)('transition_programme_deliverable', {
        p_deliverable_id: deliverableId,
        p_to_status: target,
        p_reason: null,
        p_submitted_at: null,
      });
      if (rpcError) throw rpcError;
      toast({ title: 'Status Diperbarui' });
      void loadData();
    } catch (err) {
      const e = err as Error;
      toast({ title: 'Gagal mengubah status', description: e.message, variant: 'destructive' });
    }
  };

  const handleArchive = async () => {
    if (!archiveTargetId || !archiveReason.trim()) return;
    try {
      const { error: rpcError } = await (supabase.rpc as any)('archive_programme_deliverable', {
        p_deliverable_id: archiveTargetId,
        p_archive_reason: archiveReason.trim(),
      });
      if (rpcError) throw rpcError;
      toast({ title: 'Deliverable Diarsipkan' });
      setArchiveTargetId(null);
      setArchiveReason('');
      void loadData();
    } catch (err) {
      const e = err as Error;
      toast({ title: 'Gagal mengarsipkan Deliverable', description: e.message, variant: 'destructive' });
    }
  };

  const activeDeliverables = deliverables.filter((d) => !d.archived_at);
  const archivedDeliverables = deliverables.filter((d) => d.archived_at);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {projectId && <ProjectWorkspaceNav projectId={projectId} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deliverables</h1>
          <p className="text-sm text-muted-foreground">Hasil kerja proyek yang dapat ditautkan ke WBS dan Stage.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Deliverable Baru
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : activeDeliverables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CardTitle className="text-lg">Belum ada Deliverable</CardTitle>
            <CardDescription>Tambahkan Deliverable pertama untuk proyek ini.</CardDescription>
            <Button onClick={() => setCreateOpen(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Deliverable Baru
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeDeliverables.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{d.title}</CardTitle>
                    <Badge variant="secondary">{d.lifecycle_status}</Badge>
                    <Badge variant="outline">{d.deliverable_type}</Badge>
                  </div>
                  {canDelete && (
                    <Button variant="outline" size="icon" onClick={() => setArchiveTargetId(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Target: {d.target_date}
                  {d.stage_id && ` · Stage: ${stageOptions.find((s) => s.id === d.stage_id)?.title || d.stage_id}`}
                  {d.wbs_item_id && ` · WBS: ${wbsOptions.find((w) => w.id === d.wbs_item_id)?.name || d.wbs_item_id}`}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Select
                    value={transitionTarget[d.id] || ''}
                    onValueChange={(v) => setTransitionTarget((prev) => ({ ...prev, [d.id]: v }))}
                  >
                    <SelectTrigger className="h-8 w-48 text-xs">
                      <SelectValue placeholder="Transisi ke..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => void handleTransition(d.id)}>
                    Terapkan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {archivedDeliverables.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Diarsipkan</h2>
          {archivedDeliverables.map((d) => (
            <Card key={d.id} className="opacity-70">
              <CardContent className="flex items-center gap-2 py-4">
                <CardTitle className="text-base">{d.title}</CardTitle>
                <Badge variant="outline">archived</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliverable Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliv-title">Judul</Label>
              <Input id="deliv-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="deliv-desc">Deskripsi</Label>
              <Textarea id="deliv-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliv-type">Tipe</Label>
                <Select value={deliverableType} onValueChange={setDeliverableType}>
                  <SelectTrigger id="deliv-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deliv-target">Target Tanggal</Label>
                <Input id="deliv-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="deliv-wbs">WBS Item (opsional)</Label>
              <Select value={wbsItemId} onValueChange={setWbsItemId}>
                <SelectTrigger id="deliv-wbs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tidak ada</SelectItem>
                  {wbsOptions.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deliv-stage">Stage (opsional)</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger id="deliv-stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tidak ada</SelectItem>
                  {stageOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}{s.archived_at ? ' (archived)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inheritedStageId && stageId === NONE && (
                <p className="mt-1 text-xs text-muted-foreground">
                  WBS item ini sudah tertaut ke Stage: {stageOptions.find((s) => s.id === inheritedStageId)?.title}.
                  Kosongkan atau pilih Stage yang sama untuk menghindari penolakan.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => { setCreateOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim() || !targetDate}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveTargetId} onOpenChange={(open) => { if (!open) { setArchiveTargetId(null); setArchiveReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan Deliverable</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="archive-reason">Alasan (wajib)</Label>
            <Textarea id="archive-reason" value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setArchiveTargetId(null); setArchiveReason(''); }}>
              Batal
            </Button>
            <Button onClick={() => void handleArchive()} disabled={!archiveReason.trim()}>
              Arsipkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
