import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import type { Database, GwProjectStatus } from '@/integrations/supabase/database.types';

type Project = Database['public']['Tables']['gw_projects']['Row'];

const STATUS_LABEL: Record<GwProjectStatus, string> = {
  draft: 'Draft',
  generating: 'Sedang dibuat',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

export default function GrantWriterIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

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
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const orgId = await ensureDefaultOrg(user.id, profile?.full_name);
      const { data, error } = await supabase
        .from('gw_projects')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          title: title.trim(),
          status: 'draft',
          current_step: 1,
          wizard_data: {},
        })
        .select('id')
        .single();
      if (error) throw error;
      toast({ title: 'Proyek dibuat', description: 'Mulai isi konteks proyek Anda.' });
      navigate(`/dashboard/grant-writer/${data.id}`);
    } catch (err: any) {
      toast({ title: 'Gagal membuat proyek', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
      setCreateOpen(false);
      setTitle('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grant Writer</h1>
          <p className="text-sm text-muted-foreground">
            Bangun Logical Framework Approach (LFA) sesuai standar UN/OECD-DAC dari nol sampai
            proposal donor-ready.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Proyek baru
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat proyek…
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-accent/10 p-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Belum ada proyek</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Buat proyek pertama Anda untuk memulai wizard 7 langkah LFA.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Mulai proyek baru
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to={`/dashboard/grant-writer/${p.id}`} className="group">
              <Card className="h-full transition-all hover:shadow-elegant">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{p.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {STATUS_LABEL[p.status as GwProjectStatus] ?? p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Langkah {p.current_step}/7</span>
                    <span>{new Date(p.updated_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, (p.current_step / 7) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center text-accent group-hover:underline">
                    Lanjutkan <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat proyek baru</DialogTitle>
            <DialogDescription>
              Beri nama proyek Anda. Anda bisa mengubahnya nanti di langkah konteks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="project-title">Nama proyek</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Program Literasi Anak Pesisir"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat proyek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}