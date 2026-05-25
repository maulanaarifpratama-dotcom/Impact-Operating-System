import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Bookmark,
  CalendarIcon,
  Filter,
  GitBranch,
  ListChecks,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ApplicationStatus,
  type Grant,
  type GrantSector,
  GEO_LABEL,
  REGIONS,
  formatIdr,
  daysUntil,
} from '@/lib/grantfinder/types';
import { MOCK_GRANTS } from '@/lib/grantfinder/mockGrants';
import { matchScore } from '@/lib/grantfinder/matching';
import { useApplications, useOrgProfile } from '@/lib/grantfinder/storage';
import { GrantCard } from '@/components/grantfinder/GrantCard';
import { GrantDetailDialog } from '@/components/grantfinder/GrantDetailDialog';
import { OrgProfileForm } from '@/components/grantfinder/OrgProfileForm';
import { aiGrantSearch } from '@/lib/grantfinder/aiSearch';

type SortKey = 'match' | 'deadline' | 'amount';

/** 5 grup sektor yang ditampilkan sebagai checkbox; tiap grup memetakan 1+ sektor di dataset. */
type SectorGroup = 'pendidikan' | 'kesehatan' | 'lingkungan' | 'pemberdayaan' | 'seni_budaya';

const SECTOR_GROUPS: { key: SectorGroup; label: string; maps: GrantSector[] }[] = [
  { key: 'pendidikan', label: 'Pendidikan', maps: ['pendidikan'] },
  { key: 'kesehatan', label: 'Kesehatan', maps: ['kesehatan', 'air_sanitasi'] },
  { key: 'lingkungan', label: 'Lingkungan', maps: ['lingkungan', 'energi', 'pertanian'] },
  { key: 'pemberdayaan', label: 'Pemberdayaan', maps: ['ekonomi', 'gender', 'tata_kelola', 'kemanusiaan'] },
  { key: 'seni_budaya', label: 'Seni Budaya', maps: ['kebudayaan'] },
];

const AMOUNT_MIN_JT = 0;
const AMOUNT_MAX_JT = 20_000; // 20 M dalam juta
const AMOUNT_STEP = 50;

const PIPELINE_STAGES = [
  {
    title: 'Identified',
    description: 'Peluang ditemukan, tetapi belum direview.',
  },
  {
    title: 'Shortlisted',
    description: 'Peluang terlihat cocok dengan misi, sektor, atau wilayah organisasi.',
  },
  {
    title: 'Drafting',
    description: 'Requirement sudah cukup jelas dan proposal mulai disiapkan.',
  },
  {
    title: 'Submitted',
    description: 'Proposal sudah dikirim dan masuk tracking.',
  },
  {
    title: 'Result Pending',
    description: 'Menunggu hasil atau follow-up dari funder.',
  },
  {
    title: 'Awarded / Rejected',
    description: 'Hasil dicatat agar organisasi belajar dari submission sebelumnya.',
  },
];

const PIPELINE_RULES = [
  {
    title: 'Source URL wajib',
    description: 'Jangan masukkan peluang grant tanpa sumber yang bisa dicek.',
  },
  {
    title: 'Deadline harus jelas',
    description: 'Jika deadline belum pasti, beri label perlu verifikasi.',
  },
  {
    title: 'Eligibility tidak boleh ditebak',
    description: 'Eligibility harus berasal dari teks resmi funder, bukan asumsi.',
  },
  {
    title: 'Confidence over conviction',
    description: 'Gunakan confidence score untuk membedakan peluang kuat, sedang, dan lemah.',
  },
];

const IDEAL_PIPELINE_FIELDS = [
  'Source URL',
  'Deadline',
  'Eligibility',
  'Region',
  'Sector',
  'Funding amount',
  'Confidence',
  'Status',
  'Next action',
];

const WORKFLOW_CARDS = [
  {
    title: 'Grantwriter / Proposal System',
    description: 'Gunakan peluang grant yang sudah diverifikasi sebagai konteks awal untuk draft proposal.',
    cta: 'Buka Grantwriter',
    href: '/dashboard/grant-writer',
  },
  {
    title: 'Impact Library',
    description: 'Ambil profil organisasi, proposal lama, laporan impact, dan data program sebagai bahan proposal.',
    cta: 'Buka Impact Library',
    href: '/dashboard/impactory-library',
  },
  {
    title: 'Readiness Scorecard',
    description: 'Cek apakah fondasi organisasi sudah siap sebelum mengejar grant prioritas.',
    cta: 'Cek Readiness',
    href: '/dashboard/readiness',
  },
];

export default function Grantfinder() {
  const { profile } = useOrgProfile();
  const { apps, upsert, remove, get } = useApplications();
  const { toast } = useToast();

  const [tab, setTab] = useState<'catalog' | 'tracker' | 'profile'>('catalog');
  const [search, setSearch] = useState('');
  const [sectorGroups, setSectorGroups] = useState<SectorGroup[]>([]);
  const [region, setRegion] = useState<string>('all');
  const [deadlineFrom, setDeadlineFrom] = useState<Date | undefined>(undefined);
  const [deadlineTo, setDeadlineTo] = useState<Date | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<[number, number]>([AMOUNT_MIN_JT, AMOUNT_MAX_JT]);
  const [sort, setSort] = useState<SortKey>(profile ? 'match' : 'deadline');
  const [activeGrant, setActiveGrant] = useState<Grant | null>(null);

  const [aiResults, setAiResults] = useState<{ grants: Grant[]; summary: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const urgentCount = useMemo(
    () =>
      MOCK_GRANTS.filter((g) => {
        const d = daysUntil(g.deadline);
        return d >= 0 && d <= 14;
      }).length,
    [],
  );

  /** Sektor internal yang aktif berdasarkan grup yang dicentang. Empty = tidak memfilter. */
  const activeSectors = useMemo(() => {
    if (sectorGroups.length === 0) return null;
    const set = new Set<GrantSector>();
    for (const g of sectorGroups) {
      SECTOR_GROUPS.find((x) => x.key === g)?.maps.forEach((s) => set.add(s));
    }
    return set;
  }, [sectorGroups]);

  const localFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minIdr = amountRange[0] * 1_000_000;
    const maxIdr = amountRange[1] * 1_000_000;
    const list = MOCK_GRANTS.filter((g) => {
      if (q && !`${g.title} ${g.donor} ${g.summary}`.toLowerCase().includes(q)) return false;
      if (activeSectors && !g.sectors.some((s) => activeSectors.has(s))) return false;
      if (region !== 'all') {
        const broad = ['nasional', 'global', 'asia_tenggara'];
        if (!g.geography.includes(region) && !g.geography.some((x) => broad.includes(x))) return false;
      }
      // Deadline range — cocokkan deadline grant dalam window from..to
      const dl = new Date(g.deadline + 'T23:59:59');
      if (deadlineFrom && dl < deadlineFrom) return false;
      if (deadlineTo) {
        const end = new Date(deadlineTo);
        end.setHours(23, 59, 59, 999);
        if (dl > end) return false;
      }
      // Amount range overlap: grant range [min..max] beririsan dengan filter [minIdr..maxIdr]
      if (g.amountMaxIdr < minIdr || g.amountMinIdr > maxIdr) return false;
      return true;
    });

    if (sort === 'match' && profile) {
      return [...list].sort((a, b) => matchScore(b, profile) - matchScore(a, profile));
    }
    if (sort === 'amount') {
      return [...list].sort((a, b) => b.amountMaxIdr - a.amountMaxIdr);
    }
    // deadline asc, expired last
    return [...list].sort((a, b) => {
      const da = daysUntil(a.deadline);
      const db = daysUntil(b.deadline);
      if (da < 0 && db >= 0) return 1;
      if (db < 0 && da >= 0) return -1;
      return da - db;
    });
  }, [search, activeSectors, region, deadlineFrom, deadlineTo, amountRange, sort, profile]);

  const filtered = aiResults ? aiResults.grants : localFiltered;

  const trackedGrants = useMemo(() => {
    const map = new Map(MOCK_GRANTS.map((g) => [g.id, g]));
    return apps
      .map((a) => ({ app: a, grant: map.get(a.grantId) }))
      .filter((x): x is { app: typeof apps[number]; grant: Grant } => !!x.grant)
      .sort((a, b) => (b.app.updatedAt > a.app.updatedAt ? 1 : -1));
  }, [apps]);

  const pipelineHealth = useMemo(
    () => [
      {
        label: 'Peluang teridentifikasi',
        value: MOCK_GRANTS.length.toString(),
        helper: 'Bahan awal untuk discovery dan shortlist.',
      },
      {
        label: 'Perlu review',
        value: trackedGrants.length.toString(),
        helper: 'Peluang yang belum lengkap source, deadline, atau eligibility.',
      },
      {
        label: 'Deadline dekat',
        value: urgentCount.toString(),
        helper: 'Prioritaskan grant dengan deadline terdekat dan fit tertinggi.',
      },
      {
        label: 'Siap ke Grantwriter',
        value: apps.filter((app) => app.status === 'draft').length.toString(),
        helper: 'Peluang yang sudah cukup jelas untuk mulai draft proposal.',
      },
    ],
    [apps, trackedGrants.length, urgentCount],
  );

  const isAmountDefault = amountRange[0] === AMOUNT_MIN_JT && amountRange[1] === AMOUNT_MAX_JT;
  const hasActiveFilter =
    !!search ||
    sectorGroups.length > 0 ||
    region !== 'all' ||
    !!deadlineFrom ||
    !!deadlineTo ||
    !isAmountDefault;

  const resetFilters = () => {
    setSearch('');
    setSectorGroups([]);
    setRegion('all');
    setDeadlineFrom(undefined);
    setDeadlineTo(undefined);
    setAmountRange([AMOUNT_MIN_JT, AMOUNT_MAX_JT]);
    setAiResults(null);
  };

  const handleSearchClick = async () => {
    if (!search && sectorGroups.length === 0 && region === 'all') {
      setAiResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await aiGrantSearch({
        query: search,
        filters: {
          sector: Array.from(activeSectors ?? []),
          country: region !== 'all' ? [region] : undefined,
          min_amount_usd: amountRange[0] * 1_000_000 / 15000,
          max_amount_usd: amountRange[1] * 1_000_000 / 15000,
        },
      });

      if (res.used && !res.error && res.results) {
        if (res.results.length === 0) {
          // AI search succeeded, but the live grants_catalog table on the
          // server returned zero matches. The Catalog tab in this UI is
          // backed by local MOCK_GRANTS, NOT by grants_catalog. To avoid
          // misleading the user with "0 dari 28 (Hasil AI)", we keep the
          // local mock catalog visible and surface an honest info toast.
          setAiResults(null);
          toast({
            title: 'Belum ada hibah real di server',
            description:
              'Katalog hibah di database server masih kosong. Menampilkan katalog contoh lokal untuk sementara.',
          });
        } else {
          setAiResults({ grants: res.results as Grant[], summary: res.summary });
          toast({
            title: 'Pencarian AI Berhasil',
            description: 'Menemukan ' + res.results.length + ' hibah.',
          });
        }
      } else {
        toast({
          title: 'Koneksi ke Azure Foundry Gagal',
          description: 'Menggunakan fallback pencarian lokal. Error: ' + (res.error || 'Unknown'),
          variant: 'destructive',
        });
        setAiResults(null);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSectorGroup = (key: SectorGroup) =>
    setSectorGroups((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

  const handleToggleSave = (grant: Grant) => {
    if (get(grant.id)) {
      remove(grant.id);
      toast({ title: 'Dihapus dari shortlist', description: grant.title });
    } else {
      upsert(grant.id, 'interested');
      toast({ title: 'Disimpan ke shortlist', description: grant.title });
    }
  };

  const handleSaveStatus = (status: ApplicationStatus, notes?: string) => {
    if (!activeGrant) return;
    upsert(activeGrant.id, status, notes);
    toast({ title: 'Tracker diperbarui', description: activeGrant.title });
  };

  const handleRemove = () => {
    if (!activeGrant) return;
    remove(activeGrant.id);
    toast({ title: 'Dihapus dari tracker' });
    setActiveGrant(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-16 md:w-16">
            <Search className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div className="space-y-1.5">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
              <Sparkles className="mr-1 h-3 w-3" />
              MVP — {MOCK_GRANTS.length} hibah aktif
            </Badge>
            <h1 className="text-h1">Grant Pipeline</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Kelola peluang grant dari discovery, shortlist, eligibility, deadline, sampai next action.
            </p>
          </div>
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <BellRing className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">{urgentCount} deadline ≤14 hari</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card">
        <p className="text-sm leading-6 text-muted-foreground">
          Grantfinder bukan hanya tempat mencari hibah. Di NGO Growth OS, setiap peluang harus masuk pipeline: jelas
          sumbernya, jelas eligibility-nya, jelas deadline-nya, dan jelas langkah berikutnya.
        </p>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Pipeline Health / Grant Readiness</h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan awal untuk melihat jumlah peluang, prioritas review, dan kesiapan menuju proposal.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pipelineHealth.map((item) => (
            <Card key={item.label} className="p-5 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-accent" />
          <h2 className="text-h4">Pipeline Stages</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STAGES.map((stage, index) => (
            <Card key={stage.title} className="p-4 shadow-card">
              <Badge variant="outline" className="text-[10px]">Stage {index + 1}</Badge>
              <h3 className="mt-3 font-semibold">{stage.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{stage.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-accent" />
          <h2 className="text-h4">Rule Grant Pipeline</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_RULES.map((rule) => (
            <Card key={rule.title} className="p-4 shadow-card">
              <h3 className="font-semibold">{rule.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-amber-500/30 bg-amber-500/5 p-5 shadow-card">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold">No Fabrication Rule</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Impactory tidak boleh mengarang deadline, eligibility, funding amount, requirement, atau peluang grant.
              Jika data belum jelas, tandai sebagai perlu verifikasi sebelum dipakai di proposal.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Deadline harus dicek dari sumber resmi.</li>
              <li>Eligibility harus berasal dari teks funder, bukan asumsi.</li>
              <li>Funding amount dan requirement tidak boleh ditebak.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Profile nudge */}
      {!profile && tab === 'catalog' && (
        <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium">Lengkapi profil organisasi untuk skor kecocokan</p>
            <p className="text-xs text-muted-foreground">
              Tanpa profil, hibah ditampilkan tanpa rekomendasi personal.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setTab('profile')}>
            Isi profil
          </Button>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="catalog">
            Katalog
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {MOCK_GRANTS.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="tracker">
            <Bookmark className="mr-1 h-3.5 w-3.5" />
            Tracker
            {apps.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {apps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">Profil organisasi</TabsTrigger>
        </TabsList>

        {/* Catalog */}
        <TabsContent value="catalog" className="mt-5">
          {/* Search bar besar (full width) */}
          <Card className="relative space-y-3 overflow-hidden border-accent/20 bg-gradient-to-br from-primary/5 via-background to-accent-soft/30 p-5 shadow-card md:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl"
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="group relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSearchClick();
                  }}
                  placeholder="Cari donor, judul program, atau kata kunci..."
                  className="h-14 rounded-xl border-2 border-border bg-card pl-12 pr-4 text-base shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 md:text-lg"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setAiResults(null); }}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSearchClick}
                disabled={isSearching}
                className="h-14 rounded-xl px-6"
              >
                {isSearching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Cari AI
              </Button>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-14 rounded-xl border-2 sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match" disabled={!profile}>
                    Kecocokan {!profile && '(perlu profil)'}
                  </SelectItem>
                  <SelectItem value="deadline">Deadline terdekat</SelectItem>
                  <SelectItem value="amount">Nilai tertinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <section className="mt-5 space-y-3">
            <div>
              <h2 className="text-h4">Peluang Grant</h2>
              <p className="text-sm text-muted-foreground">
                Gunakan daftar ini sebagai bahan awal pipeline. Verifikasi source, deadline, eligibility, dan fit sebelum
                masuk ke tahap draft proposal.
              </p>
            </div>
            <Card className="p-4 shadow-card">
              <h3 className="font-semibold">Field ideal untuk pipeline grant</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Idealnya setiap peluang grant memiliki source URL, deadline, eligibility, region, sector, funding amount,
                confidence, status, dan next action. Jika data belum tersedia, tandai sebagai perlu verifikasi.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {IDEAL_PIPELINE_FIELDS.map((field) => (
                  <Badge key={field} variant="outline" className="text-[11px]">
                    {field}
                  </Badge>
                ))}
              </div>
            </Card>
          </section>

          {/* 2 kolom: filter panel kiri, hasil kanan */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
            {/* FILTER PANEL */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <Card className="space-y-5 p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-semibold">Filter</h2>
                  </div>
                  {hasActiveFilter && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetFilters}>
                      Reset
                    </Button>
                  )}
                </div>

                {/* Sektor */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sektor
                  </Label>
                  <div className="space-y-2">
                    {SECTOR_GROUPS.map((s) => (
                      <label
                        key={s.key}
                        className="flex cursor-pointer items-center gap-2.5 text-sm transition-colors hover:text-accent"
                      >
                        <Checkbox
                          checked={sectorGroups.includes(s.key)}
                          onCheckedChange={() => toggleSectorGroup(s.key)}
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Geografi */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Geografi
                  </Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua wilayah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua wilayah</SelectItem>
                      {REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {GEO_LABEL[r.value] ?? r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Deadline range */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Deadline
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <DateField
                      label="Dari"
                      value={deadlineFrom}
                      onChange={setDeadlineFrom}
                      onClear={() => setDeadlineFrom(undefined)}
                    />
                    <DateField
                      label="Sampai"
                      value={deadlineTo}
                      onChange={setDeadlineTo}
                      onClear={() => setDeadlineTo(undefined)}
                      minDate={deadlineFrom}
                    />
                  </div>
                </div>

                {/* Besaran dana */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Besaran Dana
                    </Label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatIdr(amountRange[0] * 1_000_000)} – {formatIdr(amountRange[1] * 1_000_000)}
                      {amountRange[1] === AMOUNT_MAX_JT ? '+' : ''}
                    </span>
                  </div>
                  <Slider
                    min={AMOUNT_MIN_JT}
                    max={AMOUNT_MAX_JT}
                    step={AMOUNT_STEP}
                    value={amountRange}
                    onValueChange={(v) => setAmountRange([v[0], v[1]] as [number, number])}
                    className="pt-1"
                  />
                </div>
              </Card>
            </aside>

            {/* HASIL */}
            <div className="space-y-3">
              {aiResults?.summary && (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-accent-foreground shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-accent">
                    <Sparkles className="h-4 w-4" /> Ringkasan AI
                  </div>
                  {aiResults.summary}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Menampilkan <strong className="text-foreground">{filtered.length}</strong> dari{' '}
                  {MOCK_GRANTS.length} hibah
                  {aiResults ? ' (Hasil AI)' : ' (Filter Lokal)'}
                </span>
              </div>

              {filtered.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Pipeline grant belum terisi</p>
                    <p className="text-sm text-muted-foreground">
                      Mulai dengan menambahkan atau meninjau peluang grant yang relevan dengan sektor, wilayah, dan
                      kapasitas organisasi Anda.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Untuk MVP ini, gunakan daftar peluang yang tersedia sebagai bahan awal. Pastikan setiap peluang
                      memiliki source, deadline, eligibility, dan next action sebelum masuk ke tahap proposal.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset semua filter
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/readiness">Cek Readiness</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/impactory-library">Rapikan Impact Library</Link>
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {filtered.map((g) => (
                    <GrantCard
                      key={g.id}
                      grant={g}
                      profile={profile}
                      saved={get(g.id)}
                      onOpen={() => setActiveGrant(g)}
                      onToggleSave={() => handleToggleSave(g)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tracker */}
        <TabsContent value="tracker" className="mt-5">
          {trackedGrants.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Belum ada aplikasi tersimpan</p>
                <p className="text-sm text-muted-foreground">
                  Simpan hibah dari katalog untuk memantau status di sini.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab('catalog')}>
                Jelajahi katalog
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {trackedGrants.map(({ grant }) => (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  profile={profile}
                  saved={get(grant.id)}
                  onOpen={() => setActiveGrant(grant)}
                  onToggleSave={() => handleToggleSave(grant)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="mt-5">
          <OrgProfileForm />
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Dari Pipeline ke Proposal</h2>
          <p className="text-sm text-muted-foreground">
            Peluang yang sudah jelas source, deadline, eligibility, dan fit dapat dilanjutkan ke Grantwriter untuk mulai
            draft proposal. Proposal yang kuat tidak dimulai dari halaman kosong, tapi dari peluang grant yang sudah
            diverifikasi dan aset organisasi yang rapi.
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
          <h2 className="font-semibold">Kelola grant sebagai workflow</h2>
          <p className="text-sm text-muted-foreground">
            Hubungkan pipeline dengan readiness, asset library, dan sistem proposal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/grant-writer">Buka Grantwriter</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/impactory-library">Rapikan Impact Library</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/readiness">Cek Readiness</Link>
          </Button>
        </div>
      </Card>

      <GrantDetailDialog
        grant={activeGrant}
        profile={profile}
        saved={activeGrant ? get(activeGrant.id) : null}
        onClose={() => setActiveGrant(null)}
        onSave={handleSaveStatus}
        onRemove={handleRemove}
      />
    </div>
  );
}

/* ----------------------- Helpers ----------------------- */

interface DateFieldProps {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  onClear: () => void;
  minDate?: Date;
}

function DateField({ label, value, onChange, onClear, minDate }: DateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 w-full justify-start gap-1.5 px-2.5 text-xs font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {value ? format(value, 'd MMM yy', { locale: idLocale }) : label}
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Hapus ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onClear();
                }
              }}
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
