import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, FolderKanban, Search, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrgRole } from '@/hooks/useOrgRole';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';

interface ProjectManagementProject {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
}

export default function ProjectManagementIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canDelete } = useOrgRole();

  const [projects, setProjects] = useState<ProjectManagementProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState('');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const visibleIds = useMemo(() => new Set(filteredProjects.map((p) => p.id)), [filteredProjects]);

  const allVisibleSelected = filteredProjects.length > 0 && filteredProjects.every((p) => selectedIds.has(p.id));

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);

      const { data, error } = await (supabase.from('lfa_projects') as any)
        .select('id, name, status, created_at')
        .eq('org_id', orgId)
        .eq('project_mode', 'project_management')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as ProjectManagementProject[]);
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal memuat proyek',
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

  const resetForm = () => {
    setName('');
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...visibleIds]));
    }
  };

  const openDeleteConfirm = (ids: string[], label: string) => {
    setDeleteTargetIds(ids);
    setDeleteTargetLabel(label);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (deleteTargetIds.length === 0) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('lfa_projects')
        .delete()
        .in('id', deleteTargetIds)
        .eq('project_mode', 'project_management');

      if (error) throw error;

      toast({
        title: deleteTargetIds.length === 1 ? 'Proyek Dihapus' : 'Proyek Dihapus',
        description: deleteTargetIds.length === 1
          ? 'Proyek berhasil dihapus beserta seluruh Stage, WBS, dan Budget terkait.'
          : `${deleteTargetIds.length} proyek berhasil dihapus.`,
      });

      setProjects((prev) => prev.filter((p) => !deleteTargetIds.includes(p.id)));
      clearSelection();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menghapus proyek',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await (supabase.rpc as any)('create_project_management_project', {
        p_name: name.trim(),
        p_sector: null,
        p_location: null,
        p_duration_months: null,
        p_start_date: null,
        p_beneficiary_count: null,
        p_beneficiary_description: null,
      });

      if (error) throw error;

      const newProjectId = (data as { id: string }[] | null)?.[0]?.id;

      toast({
        title: 'Proyek Berhasil Dibuat',
        description: 'Lanjutkan dengan membuat Stage pertama.',
      });
      setCreateOpen(false);
      resetForm();
      if (newProjectId) {
        navigate(`/dashboard/project-management/${newProjectId}/wbs`);
      } else {
        void loadProjects();
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal membuat proyek',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          <p className="text-sm text-muted-foreground">
            Entry point terpisah untuk proyek non-LFA — Objective, Stage, WBS, Budget, MEAL, dan
            Deliverables yang sama digunakan kembali di sini.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Proyek Baru
        </Button>
      </div>

      {!loading && projects.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIds(new Set());
              }}
              placeholder="Cari project..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-accent/30 px-4 py-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedIds.size} proyek dipilih
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAllVisible}
              className="text-xs"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Batalkan Pilihan
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  Pilih Semua
                </>
              )}
            </Button>
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteConfirm([...selectedIds], `${selectedIds.size} proyek dipilih`)}
                className="text-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Hapus Terpilih
              </Button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground" />
            <CardTitle className="text-lg">Belum ada proyek Project Management</CardTitle>
            <CardDescription>
              Buat proyek baru untuk mulai bekerja tanpa Logical Framework Analysis (LFA).
            </CardDescription>
            <Button onClick={() => setCreateOpen(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Proyek Baru
            </Button>
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Search className="h-10 w-10" />
          <p className="text-sm">Tidak ditemukan proyek dengan kata kunci "{searchQuery.trim()}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Hapus Pencarian</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => {
            const isSelected = selectedIds.has(p.id);
            return (
              <Card
                key={p.id}
                className={`transition-colors hover:border-primary/50 ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <CardTitle
                        className="text-base cursor-pointer hover:text-primary truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/project-management/${p.id}/wbs`);
                        }}
                      >
                        {p.name}
                      </CardTitle>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const label = p.name;
                          openDeleteConfirm([p.id], `"${label}"`);
                        }}
                        title="Hapus proyek"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="secondary">{p.status || 'draft'}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proyek Project Management Baru</DialogTitle>
            <DialogDescription>
              Proyek ini tidak memerlukan LFA Matrix — Anda dapat langsung menyusun WBS secara
              manual setelah proyek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pm-name">Judul Project</Label>
              <Input
                id="pm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) void handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Buat Proyek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        icon="trash"
        variant="destructive"
        loading={deleting}
        title={deleteTargetIds.length === 1 ? 'Hapus Proyek' : 'Hapus Proyek Terpilih'}
        description={
          deleteTargetIds.length === 1
            ? `Proyek "${deleteTargetLabel}" beserta seluruh Stage, WBS, Budget, MEAL, dan Deliverables akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
            : `${deleteTargetIds.length} proyek beserta seluruh Stage, WBS, Budget, MEAL, dan Deliverables akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={executeDelete}
      />
    </div>
  );
}
