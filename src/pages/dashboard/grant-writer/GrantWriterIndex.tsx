import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Loader2, ArrowRight, Zap, Layers, AlertTriangle, ShieldCheck } from 'lucide-react';
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
const VALID_MODES: WizardMode[] = ['quick', 'lfa'];
const VALID_ROLES = [
  'foundation_lead',
  'umkm_owner',
  'changemaker',
  'consultant',
  'other',
] as const;
type RoleParam = (typeof VALID_ROLES)[number];

const TRUST_BADGES = [
  {
    title: 'Draft, bukan final',
    description: 'Output Grantwriter adalah draft awal yang harus direview sebelum submit.',
  },
  {
    title: 'Human Review Required',
    description: 'Proposal, angka impact, eligibility, dan budget narrative wajib dicek manusia.',
  },
  {
    title: 'No Fabrication',
    description: 'AI tidak boleh mengarang requirement, deadline, funding amount, atau klaim impact.',
  },
  {
    title: 'Source + Asset',
    description: 'Gunakan Grant Pipeline dan Impact Library sebagai konteks.',
  },
];

const REVIEW_CHECKLIST = [
  'Requirement donor sudah dicek dari sumber resmi',
  'Eligibility organisasi sudah sesuai',
  'Deadline dan format submission sudah benar',
  'Angka penerima manfaat dan budget berasal dari data organisasi',
  'Cerita dan dokumentasi memiliki izin penggunaan',
  'Draft sudah direview oleh PIC program/fundraising',
];

const FABRICATION_RULES = [
  'Jangan mengarang jumlah penerima manfaat',
  'Jangan mengarang funding amount',
  'Jangan mengarang eligibility',
  'Jangan mengarang requirement donor',
  'Jangan mengarang kutipan penerima manfaat',
  'Jangan mengarang capaian organisasi',
  'Tandai bagian yang membutuhkan verifikasi',
];

const WORKFLOW_CARDS = [
  {
    title: 'Grant Pipeline',
    description: 'Mulai dari peluang grant yang sudah jelas source, deadline, eligibility, dan fit.',
    cta: 'Buka Grant Pipeline',
    href: '/dashboard/grantfinder',
  },
  {
    title: 'Impact Library',
    description: 'Gunakan profil organisasi, proposal lama, laporan impact, data program, dan cerita penerima manfaat.',
    cta: 'Buka Impact Library',
    href: '/dashboard/impactory-library',
  },
  {
    title: 'Readiness Scorecard',
    description: 'Pastikan fondasi organisasi cukup siap sebelum mengejar grant prioritas.',
    cta: 'Cek Readiness',
    href: '/dashboard/readiness',
  },
];

const ROLE_COPY: Record<RoleParam, { suggestedMode: WizardMode; hint: string }> = {
  foundation_lead: {
    suggestedMode: 'lfa',
    hint: 'Untuk yayasan/NGO — kami sarankan mode LFA Lengkap (standar UN/OECD-DAC).',
  },
  consultant: {
    suggestedMode: 'lfa',
    hint: 'Untuk konsultan/fasilitator — mode LFA Lengkap memberi struktur penuh untuk klien.',
  },
  umkm_owner: {
    suggestedMode: 'quick',
    hint: 'Untuk UMKM sosial — mode Quick paling cepat ke proposal donor lokal/private.',
  },
  changemaker: {
    suggestedMode: 'quick',
    hint: 'Untuk changemaker individu — mode Quick cukup untuk hibah ringan.',
  },
  other: {
    suggestedMode: 'quick',
    hint: 'Pilih mode yang paling sesuai dengan kebutuhan proposal Anda.',
  },
};

function getProjectMode(p: Project): WizardMode {
  const wd = (p.wizard_data ?? {}) as Record<string, unknown>;
  return wd._mode === 'quick' ? 'quick' : 'lfa';
}

export default function GrantWriterIndex() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<WizardMode>('quick');
  const [creating, setCreating] = useState(false);
  const [roleHint, setRoleHint] = useState<string | null>(null);
  const [paramWarning, setParamWarning] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);

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

  // Demo-mode deep link from landing CTAs:
  //   /dashboard/grant-writer?role=foundation_lead&mode=lfa
  //
  // Rules:
  //   - Auto-open the "create project" dialog ONLY when both `role` and
  //     `mode` are present and valid. Anything else stays on the index
  //     page so the user can pick deliberately.
  //   - If a param is present but invalid, surface a soft warning instead
  //     of silently ignoring it.
  //   - Always strip the params after handling so reloads behave normally.
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const roleParam = searchParams.get('role');
    const modeParam = searchParams.get('mode');
    if (!roleParam && !modeParam) return;
    deepLinkHandled.current = true;

    const isValidRole = roleParam !== null && (VALID_ROLES as readonly string[]).includes(roleParam);
    const isValidMode = modeParam !== null && (VALID_MODES as string[]).includes(modeParam);

    if (isValidRole && isValidMode) {
      const role = roleParam as RoleParam;
      setMode(modeParam as WizardMode);
      setRoleHint(ROLE_COPY[role].hint);
      setCreateOpen(true);
    } else {
      setParamWarning(
        'Tautan onboarding tidak lengkap atau tidak dikenali. Pilih mode di bawah untuk melanjutkan.',
      );
    }

    const next = new URLSearchParams(searchParams);
    next.delete('role');
    next.delete('mode');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateWithMode = (m: WizardMode) => {
    setMode(m);
    setRoleHint(null);
    setParamWarning(null);
    setCreateOpen(true);
  };

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
      setRoleHint(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2">Grantwriter</h1>
          <p className="text-sm text-muted-foreground">
            Bangun draft proposal, concept note, dan LFA dari peluang grant yang jelas, aset organisasi yang rapi, dan
            review manusia.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Proyek baru
        </Button>
      </div>

      <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card">
        <h2 className="font-semibold">Proposal tidak dimulai dari halaman kosong</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Proposal yang kuat lahir dari tiga bahan: peluang grant yang sudah diverifikasi, aset organisasi yang rapi,
          dan review manusia. Grantwriter membantu membuat draft, bukan menggantikan tanggung jawab operator.
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {TRUST_BADGES.map((item) => (
          <Card key={item.title} className="p-4 shadow-card">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </Card>
        ))}
      </div>

      {paramWarning && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{paramWarning}</div>
          <button
            type="button"
            onClick={() => setParamWarning(null)}
            className="text-xs font-medium uppercase tracking-wide opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Mode picker — always visible so users know the two onboarding paths
          even when they did not arrive via a role-aware deep link. */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <ModeOption
            active={false}
            onClick={() => openCreateWithMode('quick')}
            icon={<Zap className="h-4 w-4" />}
            title="Mulai mode Quick"
            subtitle="4 langkah · cocok untuk donor lokal/private"
            meta="≈ 15 menit"
          />
          <ModeOption
            active={false}
            onClick={() => openCreateWithMode('lfa')}
            icon={<Layers className="h-4 w-4" />}
            title="Mulai mode LFA Lengkap"
            subtitle="7 langkah · standar UN/OECD-DAC, World Bank, USAID"
            meta="≈ 1–2 jam"
          />
        </CardContent>
      </Card>

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
              <h3 className="text-h4">Belum ada draft proposal</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Mulai dari peluang grant yang sudah jelas atau gunakan mode Quick untuk menyusun draft awal. Proposal
                tetap harus direview sebelum submit.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => openCreateWithMode('quick')}>
                <Zap className="mr-1.5 h-4 w-4" /> Mulai mode Quick
              </Button>
              <Button variant="outline" onClick={() => openCreateWithMode('lfa')}>
                <Layers className="mr-1.5 h-4 w-4" /> Mulai LFA Lengkap
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/grantfinder">Buka Grant Pipeline</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/impactory-library">Buka Impact Library</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="text-h4">Draft proposal tersimpan</h2>
            <p className="text-sm text-muted-foreground">
              Gunakan draft ini sebagai working document. Pastikan setiap proposal melewati human review sebelum dikirim
              ke donor atau funder.
            </p>
          </div>
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
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h2 className="text-h4">Human Review Required</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            AI dapat mempercepat draft proposal, tetapi keputusan final tetap di tangan operator. Jangan submit proposal
            tanpa mengecek requirement donor, eligibility, angka impact, budget, dan kesesuaian program.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {REVIEW_CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 shadow-card">
          <h2 className="text-h4">No Fabrication Rule</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Grantwriter tidak boleh mengarang data. Jika informasi belum tersedia, tandai sebagai perlu dilengkapi,
            bukan dibuat seolah-olah benar.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {FABRICATION_RULES.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Dari Pipeline dan Library ke Proposal</h2>
          <p className="text-sm text-muted-foreground">
            Draft proposal paling kuat ketika Grantwriter memakai konteks dari Grant Pipeline dan Impact Library.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {WORKFLOW_CARDS.map((card) => (
            <Card key={card.title} className="flex h-full flex-col p-5 shadow-card">
              <h3 className="font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                <Link to={card.href}>
                  {card.cta}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">Review adalah bagian dari sistem</h2>
          <p className="text-sm text-muted-foreground">
            AI mempercepat draft, manusia memastikan akurasi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/grantfinder">Buka Grant Pipeline</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/impactory-library">Buka Impact Library</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/readiness">Cek Readiness</Link>
          </Button>
        </div>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setRoleHint(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat proyek baru</DialogTitle>
            <DialogDescription>
              Pilih mode dan beri nama proyek. Mode tidak bisa diubah setelah proyek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {roleHint && (
              <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
                {roleHint}
              </p>
            )}
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