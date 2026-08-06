import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Trash2, RotateCcw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useOrgRole } from '@/hooks/useOrgRole';
import { supabase } from '@/integrations/supabase/client';

interface Objective {
  id: string;
  title: string;
  description: string | null;
  success_criteria: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  sort_order: number;
  archived_at: string | null;
}

interface Props {
  projectId: string;
}

export default function ProjectObjectivesPanel({ projectId }: Props) {
  const { toast } = useToast();
  const { canDelete } = useOrgRole();
  const [searchParams] = useSearchParams();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'completed'>('draft');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('project_objectives')
        .select('id, title, description, success_criteria, status, sort_order, archived_at')
        .eq('project_id', projectId)
        .order('archived_at', { ascending: true, nullsFirst: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setObjectives((data || []) as Objective[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadObjectives(); }, [loadObjectives]);

  // Open panel when URL contains ?panel=objectives
  useEffect(() => {
    if (searchParams.get('panel') === 'objectives') {
      setOpen(true);
    }
  }, [searchParams]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSuccessCriteria('');
    setStatus('draft');
    setAdvancedOpen(false);
  };

  const openCreate = () => { setEditing(null); resetForm(); setCreateOpen(true); };
  const openEdit = (obj: Objective) => {
    setEditing(obj);
    setTitle(obj.title);
    setDescription(obj.description || '');
    setSuccessCriteria(obj.success_criteria || '');
    setStatus(obj.status === 'archived' ? 'draft' : obj.status);
    setAdvancedOpen(Boolean(obj.description || obj.success_criteria));
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase.rpc as any)('create_project_objective', {
        p_project_id: projectId,
        p_title: title.trim(),
        p_description: description || null,
        p_success_criteria: successCriteria || null,
      });
      if (error) throw error;
      toast({ title: 'Tujuan Ditambahkan' });
      setCreateOpen(false);
      resetForm();
      void loadObjectives();
    } catch (err: any) {
      toast({ title: 'Gagal menambah Tujuan', description: err?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editing || !title.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase.rpc as any)('update_project_objective_metadata', {
        p_objective_id: editing.id,
        p_title: title.trim(),
        p_description: description || null,
        p_success_criteria: successCriteria || null,
        p_status: status,
      });
      if (error) throw error;
      toast({ title: 'Tujuan Diperbarui' });
      setCreateOpen(false);
      setEditing(null);
      resetForm();
      void loadObjectives();
    } catch (err: any) {
      toast({ title: 'Gagal memperbarui Tujuan', description: err?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleArchive = async (obj: Objective) => {
    try {
      const { error } = await (supabase.rpc as any)('archive_project_objective', { p_objective_id: obj.id });
      if (error) throw error;
      toast({ title: 'Tujuan Diarsipkan' });
      void loadObjectives();
    } catch (err: any) {
      toast({ title: 'Gagal', description: err?.message, variant: 'destructive' });
    }
  };

  const handleRestore = async (obj: Objective) => {
    try {
      const { error } = await (supabase.rpc as any)('restore_project_objective', { p_objective_id: obj.id });
      if (error) throw error;
      toast({ title: 'Tujuan Dikembalikan' });
      void loadObjectives();
    } catch (err: any) {
      toast({ title: 'Gagal', description: err?.message, variant: 'destructive' });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const active = objectives.filter((o) => !o.archived_at);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= active.length) return;
    const reordered = [...active];
    [reordered[index], reordered[targetIdx]] = [reordered[targetIdx], reordered[index]];
    try {
      const { error } = await (supabase.rpc as any)('reorder_project_objectives', {
        p_project_id: projectId,
        p_ordered_ids: reordered.map((o) => o.id),
      });
      if (error) throw error;
      void loadObjectives();
    } catch (err: any) {
      toast({ title: 'Gagal mengubah urutan', description: err?.message, variant: 'destructive' });
    }
  };

  const activeObjectives = objectives.filter((o) => !o.archived_at);
  const archivedObjectives = objectives.filter((o) => o.archived_at);

  const statusVariant = (s: Objective['status']) =>
    s === 'completed' ? 'default' : s === 'active' ? 'secondary' : 'outline';

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold -ml-2">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Tujuan Proyek
                {activeObjectives.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px] py-0 h-4">{activeObjectives.length}</Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={openCreate}>
              <Plus className="mr-1 h-3 w-3" /> Tambah Tujuan
            </Button>
          </div>

          <CollapsibleContent>
            <div className="border-t px-4 py-2 space-y-1">
              {loading ? (
                <div className="text-xs text-muted-foreground italic py-2">Memuat...</div>
              ) : activeObjectives.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  Belum ada Tujuan Proyek. Tujuan bersifat opsional untuk alignment proyek.
                </div>
              ) : (
                activeObjectives.map((obj, idx) => (
                  <div key={obj.id} className="flex items-center gap-2 py-1">
                    <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{obj.title}</div>
                      {obj.description && (
                        <div className="text-[10px] text-muted-foreground truncate">{obj.description}</div>
                      )}
                    </div>
                    <Badge variant={statusVariant(obj.status)} className="text-[9px] py-0 h-4 shrink-0">{obj.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => handleMove(idx, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === activeObjectives.length - 1} onClick={() => handleMove(idx, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => openEdit(obj)}>Edit</Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => handleArchive(obj)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}

              {archivedObjectives.length > 0 && (
                <div className="pt-2 mt-1 border-t border-dashed">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1">Diarsipkan</div>
                  {archivedObjectives.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-2 py-0.5 opacity-70">
                      <Badge variant="outline" className="text-[8px] py-0 h-4 shrink-0">{obj.title}</Badge>
                      <Badge variant="outline" className="text-[8px] py-0 h-4 shrink-0">archived</Badge>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="h-5 text-[8px]" onClick={() => handleRestore(obj)}>
                          <RotateCcw className="mr-1 h-2.5 w-2.5" />Kembalikan
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Objective Create/Edit Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditing(null); resetForm(); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tujuan' : 'Tambah Tujuan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="obj-title">Judul Tujuan</Label>
              <Input id="obj-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="obj-desc">Deskripsi</Label>
              <Textarea id="obj-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="obj-criteria">Kriteria Sukses</Label>
              <Textarea id="obj-criteria" value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} />
            </div>
            {editing && (
              <div>
                <Label htmlFor="obj-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger id="obj-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => { setCreateOpen(false); setEditing(null); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={editing ? handleUpdate : handleCreate} disabled={saving || !title.trim()}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
