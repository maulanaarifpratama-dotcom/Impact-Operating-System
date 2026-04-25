import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Loader2, ArrowRight, Zap, Layers } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { QUICK_STEPS, WIZARD_STEPS } from '@/lib/grant-writer/types';

type Project = Database['public']['Tables']['gw_projects']['Row'];

const STATUS_LABEL: Record<GwProjectStatus, string> = {
  draft: 'Draft',
  generating: 'Sedang dibuat',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

type WizardMode = 'quick' | 'lfa';

function getProjectMode(p: Project): WizardMode {
  const wd = (p.wizard_data ?? {}) as Record<string, unknown>;
  return wd._mode === 'quick' ? 'quick' : 'lfa';
}

export default function GrantWriterIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<WizardMode>('quick');
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
          wizard_data: { _mode: mode } as never,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast({
        title: 'Proyek dibuat',
        description:
          mode === 'quick'
            ? 'Mode cepat: 4 langkah ke proposal donor-ready.'
            : 'Mode LFA lengkap: 7 langkah standar UN/OECD-DAC.',
      });
      navigate(
        mode === 'quick'
          ? `/dashboard/grant-writer/quick/${data.id}`
          : `/dashboard/grant-writer/${data.id}`,
      );
    } catch (err: any) {
      toast({ title: 'Gagal membuat proyek', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
      setCreateOpen(false);
      setTitle('');
      setMode('quick');
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
                Buat proyek pertama Anda — pilih mode <strong>Quick</strong> (4 langkah) atau{' '}
                <strong>LFA Lengkap</strong> (7 langkah).
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Mulai proyek baru
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const m = getProjectMode(p);
            const total = m === 'quick' ? QUICK_STEPS.length : WIZARD_STEPS.length;
            const href =
              m === 'quick'
                ? `/dashboard/grant-writer/quick/${p.id}`
                : `/dashboard/grant-writer/${p.id}`;
            return (
              <Link key={p.id} to={href} className="group">
                <Card className="h-full transition-all hover:shadow-elegant">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-base">{p.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {STATUS_LABEL[p.status as GwProjectStatus] ?? p.status}
                      </Badge>
                    </div>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1 text-xs',
                          m === 'quick'
                            ? 'border-primary/30 text-primary'
                            : 'border-accent/30 text-accent',
                        )}
                      >
                        {m === 'quick' ? (
                          <>
                            <Zap className="h-3 w-3" /> Quick · 4 langkah
                          </>
                        ) : (
                          <>
                            <Layers className="h-3 w-3" /> LFA Lengkap · 7 langkah
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>
                        Langkah {Math.min(p.current_step, total)}/{total}
                      </span>
                      <span>{new Date(p.updated_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{
                          width: `${Math.min(100, (p.current_step / total) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center text-accent group-hover:underline">
                      Lanjutkan <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat proyek baru</DialogTitle>
            <DialogDescription>
              Pilih mode dan beri nama proyek. Mode tidak bisa diubah setelah proyek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeOption
                active={mode === 'quick'}
                onClick={() => setMode('quick')}
                icon={<Zap className="h-4 w-4" />}
                title="Quick"
                subtitle="4 langkah · cocok untuk donor lokal/private"
                meta="≈ 15 menit"
              />
              <ModeOption
                active={mode === 'lfa'}
                onClick={() => setMode('lfa')}
                icon={<Layers className="h-4 w-4" />}
                title="LFA Lengkap"
                subtitle="7 langkah · standar UN/OECD-DAC, World Bank, USAID"
                meta="≈ 1–2 jam"
              />
            </div>
            <div className="space-y-2">
            <Label htmlFor="project-title">Nama proyek</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Program Literasi Anak Pesisir"
              autoFocus
            />
          </div>
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

function ModeOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all',
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
          : 'border-border hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {meta}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}