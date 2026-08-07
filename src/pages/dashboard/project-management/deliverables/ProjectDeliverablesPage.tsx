import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, CheckCircle2, Package,
} from 'lucide-react';
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
import type {
  ProjectDeliverable,
  DeliverableStatus,
  WbsItem,
} from '@/pages/dashboard/lfa-builder/types';

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
};

const STATUS_VARIANTS: Record<DeliverableStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_started: 'secondary',
  in_progress: 'default',
  submitted: 'outline',
  approved: 'default',
};

export default function ProjectDeliverablesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role: orgRole } = useOrgRole();
  const isOwner = orgRole === 'owner';

  const [searchParams, setSearchParams] = useSearchParams();
  const autoCreate = searchParams.get('create') === '1';
  const prefillActId = searchParams.get('actId');
  const prefillActName = searchParams.get('actName');
  const prefillActPic = searchParams.get('actPic');
  const prefillActDate = searchParams.get('actDate');

  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, string[]>>({});
  const [wbsActivities, setWbsActivities] = useState<WbsItem[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<DeliverableStatus>('not_started');
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  const loadOrgId = useCallback(async () => {
    if (!projectId) return;
    const { data, error: fetchError } = await supabase
      .from('lfa_projects')
      .select('org_id')
      .eq('id', projectId)
      .single();
    if (!fetchError && data) setOrgId(data.org_id);
  }, [projectId]);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const client = supabase as any;

      const delivRes = await client
        .from('project_deliverables')
        .select('*')
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      const delivIds = (delivRes.data || []).map((d: any) => d.id);

      const linkRes = delivIds.length > 0
        ? await client
            .from('project_deliverable_activities')
            .select('deliverable_id, wbs_item_id')
            .in('deliverable_id', delivIds)
        : { data: [], error: null };

      const wbsRes = await supabase
        .from('lfa_wbs_items')
        .select('id, name, level, parent_id, sort_order')
        .eq('lfa_project_id', projectId)
        .eq('level', 2)
        .order('sort_order');

      if (delivRes.error) throw delivRes.error;

      setDeliverables((delivRes.data || []) as ProjectDeliverable[]);
      setWbsActivities((wbsRes.data || []) as WbsItem[]);

      const map: Record<string, string[]> = {};
      if (linkRes.data) {
        for (const link of linkRes.data as any[]) {
          if (!map[link.deliverable_id]) map[link.deliverable_id] = [];
          map[link.deliverable_id].push(link.wbs_item_id);
        }
      }
      setActivitiesMap(map);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { if (orgId) void loadData(); }, [loadData, orgId]);

  useEffect(() => {
    if (autoCreate && isOwner && prefillActId && prefillActName) {
      setName(prefillActName);
      if (prefillActPic) setOwner(prefillActPic);
      if (prefillActDate) setDueDate(prefillActDate);
      setSelectedActivityIds([prefillActId]);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [autoCreate, isOwner, prefillActId, prefillActName]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDueDate('');
    setOwner('');
    setStatus('not_started');
    setSelectedActivityIds([]);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (d: ProjectDeliverable) => {
    setName(d.name);
    setDescription(d.description || '');
    setDueDate(d.due_date || '');
    setOwner(d.owner || '');
    setStatus(d.status);
    setSelectedActivityIds(activitiesMap[d.id] || []);
    setEditingId(d.id);
    setDialogOpen(true);
  };

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !projectId || !orgId) return;
    setSaving(true);
    const client = supabase as any;
    try {
      if (editingId) {
        const { error: updateError } = await client
          .from('project_deliverables')
          .update({
            name: name.trim(),
            description: description || null,
            due_date: dueDate || null,
            owner: owner || null,
            status,
          })
          .eq('id', editingId);
        if (updateError) throw updateError;

        await client
          .from('project_deliverable_activities')
          .delete()
          .eq('deliverable_id', editingId);

        if (selectedActivityIds.length > 0) {
          const { error: linkError } = await client
            .from('project_deliverable_activities')
            .insert(
              selectedActivityIds.map((wbsId) => ({
                deliverable_id: editingId,
                wbs_item_id: wbsId,
              })),
            );
          if (linkError) throw linkError;
        }

        toast({ title: 'Deliverable diperbarui' });
      } else {
        const { data: created, error: insertError } = await client
          .from('project_deliverables')
          .insert({
            org_id: orgId,
            project_id: projectId,
            name: name.trim(),
            description: description || null,
            due_date: dueDate || null,
            owner: owner || null,
            status,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;

        if (selectedActivityIds.length > 0 && created) {
          const { error: linkError } = await client
            .from('project_deliverable_activities')
            .insert(
              selectedActivityIds.map((wbsId) => ({
                deliverable_id: created.id,
                wbs_item_id: wbsId,
              })),
            );
          if (linkError) throw linkError;
        }

        toast({ title: 'Deliverable ditambahkan' });
      }

      setDialogOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Arsipkan deliverable ini?')) return;
    try {
      const client = supabase as any;
      const { error: archiveError } = await client
        .from('project_deliverables')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (archiveError) throw archiveError;
      toast({ title: 'Deliverable diarsipkan' });
      void loadData();
    } catch (err) {
      toast({ title: 'Gagal mengarsipkan', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve deliverable ini?')) return;
    try {
      const client = supabase as any;
      const { error: approveError } = await client
        .from('project_deliverables')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (approveError) throw approveError;
      toast({ title: 'Deliverable disetujui' });
      void loadData();
    } catch (err) {
      toast({ title: 'Gagal menyetujui', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const getActivityName = (wbsId: string) =>
    wbsActivities.find((w) => w.id === wbsId)?.name || wbsId;

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
          <p className="text-sm text-muted-foreground">
            Output dan hasil kerja proyek yang harus dihasilkan.
          </p>
        </div>
        {isOwner && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Deliverable Baru
          </Button>
        )}
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
      ) : deliverables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <CardTitle className="text-lg">Belum ada Deliverable</CardTitle>
            <CardDescription>
              Deliverable adalah output dari Activity yang sudah selesai.<br />
              Dari Work Plan, klik <strong>Buat Deliverable</strong> di bagian Rincian Activity.
            </CardDescription>
            {isOwner && (
              <Button onClick={openCreate} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Deliverable Baru
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <Badge variant={STATUS_VARIANTS[d.status]}>
                        {STATUS_LABELS[d.status]}
                      </Badge>
                    </div>
                    {d.description && (
                      <p className="text-sm text-muted-foreground">{d.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {d.due_date && <span>Due: {d.due_date}</span>}
                      {d.owner && <span>Owner: {d.owner}</span>}
                    </div>
                    {(activitiesMap[d.id]?.length ?? 0) > 0 && (
                      <div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                          onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                        >
                          {expandedId === d.id ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {activitiesMap[d.id]?.length} aktivitas terkait
                        </button>
                        {expandedId === d.id && (
                          <ul className="mt-1 space-y-0.5 pl-4 text-xs text-muted-foreground list-disc">
                            {activitiesMap[d.id].map((wbsId) => (
                              <li key={wbsId}>{getActivityName(wbsId)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner && d.status === 'submitted' && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(d.id)} className="text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="icon" onClick={() => handleArchive(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Deliverable' : 'Deliverable Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="deliv-name">Nama *</Label>
              <Input id="deliv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Inception Report" />
            </div>
            <div>
              <Label htmlFor="deliv-desc">Deskripsi</Label>
              <Textarea id="deliv-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliv-due">Due Date</Label>
                <Input id="deliv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="deliv-owner">Owner</Label>
                <Input id="deliv-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Nama PIC" />
              </div>
            </div>
            <div>
              <Label htmlFor="deliv-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DeliverableStatus)}>
                <SelectTrigger id="deliv-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Activities</Label>
              {wbsActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Belum ada activity di Work Plan. Tambahkan activity terlebih dahulu.
                </p>
              ) : (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {wbsActivities.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedActivityIds.includes(w.id)}
                        onChange={() => toggleActivity(w.id)}
                        className="h-4 w-4"
                      />
                      {w.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => { setDialogOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
