import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import {
  ArrowRight,
  Cloud,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Laptop,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Plus,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Types representing the database schema
interface PlatformAccessRecord {
  id?: string;
  organization_id?: string;
  platform_name: 'techsoup' | 'goodstack' | 'canva' | 'google' | 'microsoft';
  status: 'not_started' | 'submitted' | 'pending' | 'approved' | 'renewal_needed';
  owner_name: string;
  owner_email: string;
  applied_at: string | null;
  approved_at: string | null;
  renewal_at: string | null;
  benefit_notes?: string;
  gag_monthly_spend_usd: number;
  gag_campaigns_count: number;
  gag_activated: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// Configs for standard platform metadata
const PLATFORM_CONFIGS = {
  techsoup: {
    displayName: 'TechSoup Indonesia',
    icon: Cloud,
    benefit: 'Donasi & diskon software (Microsoft, Adobe, antivirus)',
    officialUrl: 'https://www.techsoup.or.id/',
    accentColor: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-600',
    iconBg: 'bg-blue-500/15 text-blue-600',
  },
  goodstack: {
    displayName: 'Goodstack (Benevity)',
    icon: ShieldCheck,
    benefit: 'Verifikasi global + akses corporate giving',
    officialUrl: 'https://goodstack.org/',
    accentColor: 'from-purple-500/10 to-indigo-500/5 border-purple-500/20 text-purple-600',
    iconBg: 'bg-purple-500/15 text-purple-600',
  },
  canva: {
    displayName: 'Canva for Nonprofits',
    icon: Sparkles,
    benefit: 'Canva Pro gratis sampai 50 user',
    officialUrl: 'https://www.canva.com/id_id/canva-untuk-nonprofit/',
    accentColor: 'from-pink-500/10 to-rose-500/5 border-pink-500/20 text-pink-600',
    iconBg: 'bg-pink-500/15 text-pink-600',
  },
  google: {
    displayName: 'Google for Nonprofits',
    icon: Laptop,
    benefit: 'Workspace gratis + Google Ads Grant US$10K/bulan',
    officialUrl: 'https://www.google.com/nonprofits/',
    accentColor: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-600',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
  },
  microsoft: {
    displayName: 'Microsoft for Nonprofits',
    icon: Building2,
    benefit: 'Microsoft 365 + Azure credit US$3.500/tahun',
    officialUrl: 'https://nonprofit.microsoft.com/',
    accentColor: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-600',
    iconBg: 'bg-amber-500/15 text-amber-600',
  },
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  submitted: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  pending: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  renewal_needed: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Belum Mulai',
  submitted: 'Sudah Submit',
  pending: 'Menunggu Verifikasi',
  approved: 'Terverifikasi (Approved)',
  renewal_needed: 'Butuh Perpanjangan',
};

const AI_TIPS: Record<string, { checklist: string[]; warning: string; confidence: number }> = {
  techsoup: {
    confidence: 98,
    checklist: [
      'Siapkan Akta Pendirian & SK Kemenkumham Kemenkes/Sosial.',
      'Nama organisasi pada formulir TechSoup harus persis sama dengan dokumen hukum.',
      'Sediakan NPWP atas nama organisasi.',
      'Proses verifikasi memakan waktu sekitar 3-5 hari kerja.',
    ],
    warning: 'Jangan mendaftar dengan nama singkatan jika di Akta Pendirian tertulis nama lengkap organisasi Anda.',
  },
  goodstack: {
    confidence: 96,
    checklist: [
      'Sediakan Rekening Bank atas nama lembaga resmi (bukan personal).',
      'Upload Bank Statement / Rekening Koran terbaru (kurang dari 3 bulan terakhir).',
      'Sediakan AD/ART lengkap.',
      'Pendaftaran ini membuka akses ke program CSR Benevity dan brand internasional.',
    ],
    warning: 'Goodstack sangat ketat mengenai kesesuaian nama pemilik bank dengan nama hukum organisasi.',
  },
  canva: {
    confidence: 97,
    checklist: [
      'Buat akun Canva standar menggunakan email institusi organisasi terlebih dahulu.',
      'Siapkan SK Kemenkumham serta AD/ART sebagai bukti non-profit.',
      'Sediakan deskripsi singkat dampak program sosial dan link website/sosmed aktif.',
      'Canva Pro gratis mendukung kolaborasi hingga 50 anggota tim.',
    ],
    warning: 'Canva sering menolak jika website organisasi Anda kosong atau dinilai tidak menunjukkan aktivitas program sosial.',
  },
  google: {
    confidence: 99,
    checklist: [
      'Selesaikan registrasi TechSoup terlebih dahulu untuk memperoleh "Validation Token".',
      'Buat email domain organisasi resmi (contoh: admin@organisasi.or.id).',
      'Pastikan website sudah HTTPS, bebas konten komersial, dan mencantumkan legalitas lengkap di footer.',
      'Google Ads Grant memberikan kredit promosi senilai US$10,000 per bulan.',
    ],
    warning: 'Jangan pernah mendaftar menggunakan email gmail pribadi pendiri, gunakan workspace domain resmi.',
  },
  microsoft: {
    confidence: 95,
    checklist: [
      'Gunakan Validation Token dari TechSoup untuk bypass verifikasi manual.',
      'Klaim lisensi Microsoft 365 Business Basic gratis hingga 10 user.',
      'Aktifkan credit Azure gratis senilai US$3,500/tahun untuk deployment server/database.',
      'Siapkan calendar alert untuk memantau pengunaan credit Azure Anda agar tidak over-limit.',
    ],
    warning: 'Selalu setup budget alert di portal Microsoft Azure agar saldo gratis Anda tidak terpotong habis tiba-tiba.',
  },
};

export default function ResourceAccessTracker() {
  const { user } = useAuth();
  
  // States for tracking and forms
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formState, setFormState] = useState<any>({});
  const [expandedMistakes, setExpandedMistakes] = useState(false);
  
  // AI assistant states
  const [aiSelectedPlatform, setAiSelectedPlatform] = useState<string>('techsoup');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  const [humanReviewChecked, setHumanReviewChecked] = useState(false);

  // 1. Fetch organization details
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // 2. Fetch platform access records
  const { data: dbPlatforms, isLoading: isPlatformsLoading, refetch } = useQuery({
    queryKey: ['resource_access_platforms', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('resource_access_platforms')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return (data || []) as PlatformAccessRecord[];
    },
    enabled: !!organizationId,
  });

  // 3. Upsert Platform Mutation
  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<PlatformAccessRecord>) => {
      if (!organizationId) throw new Error('No organization context available');
      
      const { error } = await (supabase as any)
        .from('resource_access_platforms')
        .upsert({
          organization_id: organizationId,
          ...payload,
        }, { onConflict: 'organization_id,platform_name' });
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pembaruan platform berhasil disimpan ke database');
      setEditingPlatform(null);
      void refetch();
    },
    onError: (err: any) => {
      console.error('[ResourceAccessTracker] Error saving:', err);
      toast.error(`Gagal menyimpan perubahan: ${err.message || 'Kesalahan Server'}`);
    }
  });

  // Transform records into a unified mapping
  const platformsMap = useMemo(() => {
    const map: Record<string, PlatformAccessRecord> = {};
    
    // Set defaults first
    const keys: Array<'techsoup' | 'goodstack' | 'canva' | 'google' | 'microsoft'> = [
      'techsoup', 'goodstack', 'canva', 'google', 'microsoft'
    ];
    
    keys.forEach(key => {
      map[key] = {
        platform_name: key,
        status: 'not_started',
        owner_name: '',
        owner_email: '',
        applied_at: null,
        approved_at: null,
        renewal_at: null,
        gag_monthly_spend_usd: 0,
        gag_campaigns_count: 0,
        gag_activated: false,
        notes: '',
      };
    });

    // Populate with actual DB records
    if (dbPlatforms) {
      dbPlatforms.forEach(record => {
        map[record.platform_name] = record;
      });
    }

    return map;
  }, [dbPlatforms]);

  // Statistics
  const stats = useMemo(() => {
    const keys = ['techsoup', 'goodstack', 'canva', 'google', 'microsoft'];
    const total = keys.length;
    const approved = keys.filter(k => platformsMap[k]?.status === 'approved').length;
    return { total, approved };
  }, [platformsMap]);

  // Renewal countdown calculator
  const getCountdownText = (renewalDateStr: string | null | undefined) => {
    if (!renewalDateStr) return null;
    const renewalDate = new Date(renewalDateStr);
    const today = new Date();
    renewalDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, text: `Lewat ${Math.abs(diffDays)} hari`, color: 'text-red-500 bg-red-500/10 border-red-500/20' };
    }
    if (diffDays === 0) {
      return { days: diffDays, text: 'Renewal HARI INI!', color: 'text-red-500 font-bold bg-red-500/20 animate-pulse border-red-500/30' };
    }
    if (diffDays < 30) {
      return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-red-500 font-semibold bg-red-500/10 border-red-500/20' };
    }
    if (diffDays < 60) {
      return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-amber-500 font-semibold bg-amber-500/10 border-amber-500/20' };
    }
    return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-emerald-500 font-medium bg-emerald-500/10 border-emerald-500/20' };
  };

  // List of active renewals for calendar view
  const renewalItems = useMemo(() => {
    const keys = ['techsoup', 'goodstack', 'canva', 'google', 'microsoft'];
    return keys
      .map(key => {
        const item = platformsMap[key];
        const config = PLATFORM_CONFIGS[key as keyof typeof PLATFORM_CONFIGS];
        const countdown = getCountdownText(item.renewal_at);
        return {
          key,
          displayName: config.displayName,
          status: item.status,
          renewalDate: item.renewal_at,
          countdown,
        };
      })
      .filter(item => item.status === 'approved' && item.renewalDate)
      .sort((a, b) => {
        const d1 = new Date(a.renewalDate!).getTime();
        const d2 = new Date(b.renewalDate!).getTime();
        return d1 - d2;
      });
  }, [platformsMap]);

  // Initiate edit mode
  const handleStartEdit = (platformName: string) => {
    const current = platformsMap[platformName];
    setEditingPlatform(platformName);
    setFormState({
      platform_name: platformName,
      status: current.status,
      owner_name: current.owner_name || '',
      owner_email: current.owner_email || '',
      applied_at: current.applied_at || '',
      approved_at: current.approved_at || '',
      renewal_at: current.renewal_at || '',
      notes: current.notes || '',
      gag_activated: current.gag_activated || false,
      gag_monthly_spend_usd: current.gag_monthly_spend_usd || 0,
      gag_campaigns_count: current.gag_campaigns_count || 0,
    });
  };

  // Save changes
  const handleSave = () => {
    if (!formState.owner_email && formState.owner_name) {
      toast.warning('Kami menyarankan untuk melengkapi email owner juga.');
    }
    upsertMutation.mutate(formState);
  };

  // Google Ads Grant specific update helper
  const handleSaveGagOnly = (googleItem: PlatformAccessRecord, spend: number, campaigns: number, activated: boolean) => {
    upsertMutation.mutate({
      ...googleItem,
      gag_monthly_spend_usd: spend,
      gag_campaigns_count: campaigns,
      gag_activated: activated,
    });
  };

  // Handle simulated AI copilot lookup
  const handleTriggerAiCopilot = () => {
    setAiLoading(true);
    setAiResponse(null);
    setHumanReviewChecked(false);

    // Dynamic delay representing localized AI calculations
    setTimeout(() => {
      const tips = AI_TIPS[aiSelectedPlatform as keyof typeof AI_TIPS];
      setAiResponse(tips);
      setAiLoading(false);
      toast.success(`AI Copilot memuat panduan pendaftaran ${PLATFORM_CONFIGS[aiSelectedPlatform as keyof typeof PLATFORM_CONFIGS].displayName}`);
    }, 900);
  };

  const googleItem = platformsMap['google'];
  const googleIsApproved = googleItem?.status === 'approved';

  if (isMembershipLoading || (!!organizationId && isPlatformsLoading)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat data resource tracker…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* 1. Glassmorphic Hero Banner */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Resource Access Tracker</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Resource Access Tracker</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Pantau pendaftaran, penanggung jawab, serta tanggal kedaluwarsa platform nonprofit Anda agar ekosistem digital tetap terjaga.
            </p>
          </div>
          
          {/* Header Score Circular Meter */}
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-elegant">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status Integrasi</p>
              <p className="text-lg font-bold text-foreground">
                {stats.approved} dari {stats.total} Approved
              </p>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-[#155F66] transition-all duration-500" 
                  style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Platform Cards Grid (One per platform) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Daftar Platform NGO Utama</h2>
          <span className="text-xs text-muted-foreground font-medium">Klik tombol edit untuk memperbarui status pendaftaran</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {Object.keys(PLATFORM_CONFIGS).map((key) => {
            const platformKey = key as 'techsoup' | 'goodstack' | 'canva' | 'google' | 'microsoft';
            const item = platformsMap[platformKey];
            const config = PLATFORM_CONFIGS[platformKey];
            const IconComponent = config.icon;
            const isEditing = editingPlatform === platformKey;
            const countdown = getCountdownText(item.renewal_at);

            return (
              <Card 
                key={platformKey} 
                className={cn(
                  "relative flex flex-col justify-between overflow-hidden border-border bg-card p-5 shadow-card hover:shadow-elegant transition-all duration-300",
                  isEditing && "ring-1 ring-accent border-accent/40 bg-accent-soft/10"
                )}
              >
                {/* Decorative Accent Strip */}
                <div className={cn("absolute top-0 left-0 h-1 w-full bg-gradient-to-r", config.accentColor)} />

                <div>
                  {/* Card Header & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shadow-sm shrink-0", config.iconBg)}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-snug">{config.displayName}</h3>
                        <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{config.benefit}</p>
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 shadow-sm border", STATUS_COLORS[item.status])}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        {item.status === 'approved' && countdown && (
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", countdown.color)}>
                            {countdown.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rendering VIEW Mode */}
                  {!isEditing ? (
                    <div className="mt-5 space-y-4">
                      {/* Metadata Area */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/20 p-3.5 text-xs">
                        <div>
                          <p className="font-bold text-muted-foreground">PIC / Owner</p>
                          <p className="mt-1 font-semibold text-foreground truncate">
                            {item.owner_name || <span className="text-muted-foreground/60 font-normal">Belum diset</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-muted-foreground">Email Kontak</p>
                          <p className="mt-1 font-semibold text-foreground truncate">
                            {item.owner_email || <span className="text-muted-foreground/60 font-normal">Belum diset</span>}
                          </p>
                        </div>
                        <div className="border-t border-border/60 pt-2 mt-1">
                          <p className="font-bold text-muted-foreground">Tgl Apply</p>
                          <p className="mt-0.5 font-semibold text-foreground">
                            {item.applied_at ? new Date(item.applied_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <div className="border-t border-border/60 pt-2 mt-1">
                          <p className="font-bold text-muted-foreground">Tgl Renewal</p>
                          <p className="mt-0.5 font-semibold text-foreground">
                            {item.renewal_at ? new Date(item.renewal_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="rounded-md bg-muted/40 p-2.5 border border-dashed border-border text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-bold text-foreground">Catatan internal:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Rendering EDIT Inline Form Mode */
                    <div className="mt-5 space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-[11px] font-bold">Status Pendaftaran</Label>
                          <select
                            value={formState.status}
                            onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="not_started">Belum Mulai</option>
                            <option value="submitted">Sudah Submit</option>
                            <option value="pending">Menunggu Verifikasi</option>
                            <option value="approved">Approved (Terverifikasi)</option>
                            <option value="renewal_needed">Butuh Perpanjangan</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Nama PIC / Owner</Label>
                          <Input
                            type="text"
                            value={formState.owner_name}
                            placeholder="Contoh: Budiono"
                            onChange={(e) => setFormState({ ...formState, owner_name: e.target.value })}
                            className="mt-1 h-8 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Email PIC</Label>
                          <Input
                            type="email"
                            value={formState.owner_email}
                            placeholder="budi@organisasi.org"
                            onChange={(e) => setFormState({ ...formState, owner_email: e.target.value })}
                            className="mt-1 h-8 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Tanggal Apply</Label>
                          <Input
                            type="date"
                            value={formState.applied_at || ''}
                            onChange={(e) => setFormState({ ...formState, applied_at: e.target.value || null })}
                            className="mt-1 h-8 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Tanggal Approved</Label>
                          <Input
                            type="date"
                            value={formState.approved_at || ''}
                            onChange={(e) => setFormState({ ...formState, approved_at: e.target.value || null })}
                            className="mt-1 h-8 text-xs font-medium"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-[11px] font-bold">Tanggal Renewal (Perpanjangan)</Label>
                          <Input
                            type="date"
                            value={formState.renewal_at || ''}
                            onChange={(e) => setFormState({ ...formState, renewal_at: e.target.value || null })}
                            className="mt-1 h-8 text-xs font-medium"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-[11px] font-bold">Catatan Pendukung / Token</Label>
                          <Textarea
                            value={formState.notes}
                            placeholder="Simpan token verifikasi atau catatan instruksi khusus perpanjangan akun di sini."
                            onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                            className="mt-1 min-h-[50px] text-xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 border-t border-border pt-3.5 flex items-center justify-between gap-3">
                  <a 
                    href={config.officialUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-medium text-accent hover:text-accent/85 hover:underline"
                  >
                    Situs Resmi
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>

                  {!isEditing ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStartEdit(platformKey)}
                      className="h-8 text-xs font-bold border-border"
                    >
                      <Edit2 className="mr-1.5 h-3 w-3" /> Edit status
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingPlatform(null)}
                        className="h-8 text-xs font-bold"
                        disabled={upsertMutation.isPending}
                      >
                        <X className="mr-1 h-3 w-3" /> Batal
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleSave}
                        className="h-8 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={upsertMutation.isPending}
                      >
                        {upsertMutation.isPending ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Menyimpan…
                          </>
                        ) : (
                          <>
                            <Save className="mr-1.5 h-3 w-3" /> Simpan
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. Google Ads Grant Sub-Section (renders only when google is approved) */}
      {googleIsApproved && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.01] p-5 shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Google Ads Grant sub-tracker</Badge>
                <Badge variant="outline" className="border-accent text-accent text-[10px]">Aktif</Badge>
              </div>
              <h3 className="text-lg font-bold tracking-tight">Google Ads Grant (GAG) Dashboard</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Google memberikan hibah biaya promosi penelusuran (search ads) senilai US$10.000 per bulan. Anda harus mematuhi kebijakan (seperti minimal CTR 5%) agar akun tidak terkena suspensi.
              </p>
              
              {/* Critical Alert Banner */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <div>
                  <span className="font-bold">Perhatian:</span> GAG membutuhkan proses aktivasi terpisah di Google Ads Portal setelah pengajuan Google for Nonprofits Anda disetujui.
                </div>
              </div>
            </div>

            {/* Live Interactive Tracker Card */}
            <div className="rounded-xl border bg-card p-4 shadow-sm w-full lg:w-96 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold">Status Aktivasi GAG</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold", googleItem.gag_activated ? "text-emerald-500" : "text-muted-foreground")}>
                    {googleItem.gag_activated ? 'AKTIF' : 'BELUM AKTIF'}
                  </span>
                  <Switch
                    checked={googleItem.gag_activated}
                    onCheckedChange={(checked) => handleSaveGagOnly(googleItem, googleItem.gag_monthly_spend_usd, googleItem.gag_campaigns_count, checked)}
                  />
                </div>
              </div>

              {googleItem.gag_activated && (
                <div className="space-y-4 animate-fade-in">
                  {/* Monthly Spend Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Pengeluaran Bulanan</span>
                      <span className="font-bold text-foreground">
                        ${googleItem.gag_monthly_spend_usd.toLocaleString('id-ID')} / $10.000
                      </span>
                    </div>
                    
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          (googleItem.gag_monthly_spend_usd / 10000) > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((googleItem.gag_monthly_spend_usd / 10000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Kredit terpakai: {Math.round((googleItem.gag_monthly_spend_usd / 10000) * 100)}% dari batas limit bulanan.
                    </p>
                  </div>

                  {/* Inline edit forms for Spend & Campaigns */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-bold">Aktual Belanja ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={googleItem.gag_monthly_spend_usd || ''}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value) || 0, 10000);
                          handleSaveGagOnly(googleItem, val, googleItem.gag_campaigns_count, googleItem.gag_activated);
                        }}
                        className="h-8 text-xs font-bold mt-1"
                        placeholder="Spend USD"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold">Kampanye Aktif</Label>
                      <Input
                        type="number"
                        min="0"
                        value={googleItem.gag_campaigns_count || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          handleSaveGagOnly(googleItem, googleItem.gag_monthly_spend_usd, val, googleItem.gag_activated);
                        }}
                        className="h-8 text-xs font-bold mt-1"
                        placeholder="Jumlah ad campaign"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 4. Renewal Calendar Section (Dynamic Timeline) */}
      <Card className="p-5 shadow-card border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold tracking-tight">Kalender & Linimasa Renewal</h2>
        </div>

        {renewalItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold text-sm">Belum ada linimasa renewal</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Tanggal perpanjangan akun akan tampil di sini secara urut setelah status platform diubah ke 'Approved' dan diisi Tanggal Renewal-nya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Urutan jadwal pembaruan platform terdekat untuk memandu tim Anda:</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {renewalItems.map((item) => {
                const isUrgent = item.countdown && item.countdown.days < 30;
                const isWarning = item.countdown && item.countdown.days >= 30 && item.countdown.days < 60;

                return (
                  <div 
                    key={item.key} 
                    className={cn(
                      "rounded-xl border p-4 flex flex-col justify-between shadow-sm bg-card",
                      isUrgent ? "border-red-500/25 bg-red-500/[0.01]" : isWarning ? "border-amber-500/25 bg-amber-500/[0.01]" : "border-border"
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-xs text-foreground leading-snug">{item.displayName}</span>
                        {item.countdown && (
                          <Badge variant="outline" className={cn("text-[9px] font-bold border px-1.5 py-0", item.countdown.color)}>
                            {item.countdown.text}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Renewal Date: <span className="font-bold text-foreground">{new Date(item.renewalDate!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        Platform Aktif
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => handleStartEdit(item.key)}
                        className="p-0 h-auto text-[10px] text-accent font-bold"
                      >
                        Edit Tanggal
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 5. AI Assistant Copilot Sidebar/Card (Centralized AI Layer Compliant) */}
      <Card className="border-accent-soft/80 bg-accent-soft/20 p-5 shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-accent-soft text-accent/15 -mr-4 -mt-4 transform rotate-12 pointer-events-none">
          <Sparkles className="h-16 w-16" />
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <Badge className="bg-accent/15 text-accent border border-accent/20">AI Registration Copilot</Badge>
            </div>
            <h3 className="text-lg font-bold tracking-tight">Butuh panduan pengajuan platform?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
              Asisten registrasi kami dapat menyusun daftar persyaratan taktis per platform sesuai kebijakan organisasi nonprofit di Indonesia secara instan.
            </p>
            
            {/* Platform Selection */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <select
                value={aiSelectedPlatform}
                onChange={(e) => {
                  setAiSelectedPlatform(e.target.value);
                  setAiResponse(null);
                  setHumanReviewChecked(false);
                }}
                className="rounded-md border bg-background px-3 py-1 text-xs font-semibold h-8 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {Object.keys(PLATFORM_CONFIGS).map((k) => (
                  <option key={k} value={k}>
                    {PLATFORM_CONFIGS[k as keyof typeof PLATFORM_CONFIGS].displayName}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleTriggerAiCopilot}
                className="h-8 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menyusun panduan…
                  </>
                ) : (
                  <>
                    Dapatkan Tips Registrasi (AI)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* AI Output Pane */}
          {aiResponse && (
            <div className="rounded-xl border bg-card p-4 shadow-sm w-full md:w-96 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-accent flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Tips Hasil Analisis AI
                </span>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                  {aiResponse.confidence}% Confidence
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Checklist Persyaratan:</p>
                <ul className="space-y-1.5 list-none pl-0">
                  {aiResponse.checklist.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rls Trust Doctrine / Human Review Gate */}
              <div className="border-t pt-3 space-y-2">
                <div className="rounded-lg border border-dashed border-red-500/30 bg-red-500/[0.01] p-3 text-[10px] leading-relaxed text-red-600 dark:text-red-400 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider">Human Review Required:</span> Rekomendasi di atas adalah saran taktis. Tim hukum/operasional Anda wajib membaca dan memvalidasi langsung formulir pengajuan di situs resmi platform terkait.
                  </div>
                </div>

                {/* Interactive gate authorization check */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="human-review-gate"
                    checked={humanReviewChecked}
                    onChange={(e) => setHumanReviewChecked(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <Label htmlFor="human-review-gate" className="text-[10px] font-bold text-foreground cursor-pointer">
                    Saya mengonfirmasi telah melakukan review manual
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 6. Common Mistakes Collapsible Card (Accordions style) */}
      <Card className="border border-dashed border-border bg-card">
        <button
          type="button"
          onClick={() => setExpandedMistakes(!expandedMistakes)}
          className="flex w-full items-center justify-between p-5 text-left focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold tracking-tight">Kekeliruan Umum (Common Mistakes to Avoid)</h2>
          </div>
          {expandedMistakes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedMistakes && (
          <CardContent className="p-5 pt-0 border-t border-dashed border-border grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Jangan mendaftar 5 platform di hari yang sama
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pendaftaran Canva, Google, dan Microsoft membutuhkan **Validation Token dari TechSoup**. Dapatkan persetujuan dari TechSoup terlebih dahulu sebelum mendaftar platform lainnya.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Setiap platform harus punya owner / PIC jelas
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platform yang tidak memiliki owner rawan mati diam-diam karena melewatkan verifikasi tahunan atau lupa memantau penggunaan limit kredit seperti hibah Azure.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Catat renewal calendar sejak hari pertama disetujui
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Banyak software gratis membatasi akses jika verifikasi legalitas tahunan terlewat. Catat tanggal perpanjangan di linimasa tracker ini sesaat setelah approved.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Hindari email pribadi pendiri untuk Google Nonprofits
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gunakan email berdomain organisasi resmi (contoh: `admin@organisasi.or.id`). Akun Google Nonprofits yang terkait dengan Gmail pribadi pendiri sulit diserahkan ke penerus tim IT.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 7. Bottom Navigation Area */}
      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 className="text-lg font-bold leading-snug">Hubungkan ke Workflow Pertumbuhan Lainnya</h2>
          <p className="text-xs text-muted-foreground">Resource Access Anda siap menjadi fondasi mesin pertumbuhan program sosial organisasi.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9 border-border">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 border-border">
            <Link to="/dashboard/readiness">Cek Readiness Scorecard</Link>
          </Button>
          <Button asChild size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/dashboard/impactory-library">Buka Impact Library</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
