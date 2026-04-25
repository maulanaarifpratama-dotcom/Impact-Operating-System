import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  BellRing,
  Bookmark,
  Filter,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  type ApplicationStatus,
  type Grant,
  type GrantOrigin,
  type GrantSector,
  GEO_LABEL,
  ORIGIN_LABEL,
  REGIONS,
  SDG_LABELS,
  SECTOR_LABEL,
  daysUntil,
} from '@/lib/grantfinder/types';
import { MOCK_GRANTS } from '@/lib/grantfinder/mockGrants';
import { matchScore } from '@/lib/grantfinder/matching';
import { useApplications, useOrgProfile } from '@/lib/grantfinder/storage';
import { GrantCard } from '@/components/grantfinder/GrantCard';
import { GrantDetailDialog } from '@/components/grantfinder/GrantDetailDialog';
import { OrgProfileForm } from '@/components/grantfinder/OrgProfileForm';

type SortKey = 'match' | 'deadline' | 'amount';
type DeadlineFilter = 'all' | 'urgent' | 'soon' | 'open';

const ORIGINS: GrantOrigin[] = ['lokal', 'internasional', 'multilateral', 'korporat'];
const SECTORS = Object.keys(SECTOR_LABEL) as GrantSector[];

export default function Grantfinder() {
  const { profile } = useOrgProfile();
  const { apps, upsert, remove, get } = useApplications();
  const { toast } = useToast();

  const [tab, setTab] = useState<'catalog' | 'tracker' | 'profile'>('catalog');
  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState<GrantOrigin | 'all'>('all');
  const [sector, setSector] = useState<GrantSector | 'all'>('all');
  const [region, setRegion] = useState<string>('all');
  const [sdg, setSdg] = useState<string>('all');
  const [deadline, setDeadline] = useState<DeadlineFilter>('all');
  const [sort, setSort] = useState<SortKey>(profile ? 'match' : 'deadline');
  const [activeGrant, setActiveGrant] = useState<Grant | null>(null);

  const urgentCount = useMemo(
    () =>
      MOCK_GRANTS.filter((g) => {
        const d = daysUntil(g.deadline);
        return d >= 0 && d <= 14;
      }).length,
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = MOCK_GRANTS.filter((g) => {
      if (q && !`${g.title} ${g.donor} ${g.summary}`.toLowerCase().includes(q)) return false;
      if (origin !== 'all' && g.origin !== origin) return false;
      if (sector !== 'all' && !g.sectors.includes(sector)) return false;
      if (region !== 'all') {
        const broad = ['nasional', 'global', 'asia_tenggara'];
        if (!g.geography.includes(region) && !g.geography.some((x) => broad.includes(x))) return false;
      }
      if (sdg !== 'all' && !g.sdgs.includes(Number(sdg))) return false;
      if (deadline !== 'all') {
        const d = daysUntil(g.deadline);
        if (deadline === 'urgent' && !(d >= 0 && d <= 14)) return false;
        if (deadline === 'soon' && !(d > 14 && d <= 45)) return false;
        if (deadline === 'open' && !(d > 45)) return false;
      }
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
  }, [search, origin, sector, region, sdg, deadline, sort, profile]);

  const trackedGrants = useMemo(() => {
    const map = new Map(MOCK_GRANTS.map((g) => [g.id, g]));
    return apps
      .map((a) => ({ app: a, grant: map.get(a.grantId) }))
      .filter((x): x is { app: typeof apps[number]; grant: Grant } => !!x.grant)
      .sort((a, b) => (b.app.updatedAt > a.app.updatedAt ? 1 : -1));
  }, [apps]);

  const hasActiveFilter =
    !!search || origin !== 'all' || sector !== 'all' || region !== 'all' || sdg !== 'all' || deadline !== 'all';

  const resetFilters = () => {
    setSearch('');
    setOrigin('all');
    setSector('all');
    setRegion('all');
    setSdg('all');
    setDeadline('all');
  };

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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Grantfinder</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Temukan hibah dari donor lokal & internasional yang paling cocok untuk misi organisasi Anda.
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
        <TabsContent value="catalog" className="mt-5 space-y-4">
          <Card className="relative space-y-4 overflow-hidden border-accent/20 bg-gradient-to-br from-primary/5 via-background to-accent-soft/30 p-5 shadow-card md:p-6">
            {/* Decorative gradient blob */}
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
                  placeholder="Cari donor, judul program, atau kata kunci..."
                  className="h-14 rounded-xl border-2 border-border bg-card pl-12 pr-4 text-base shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 md:text-lg"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
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

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={origin} onValueChange={(v) => setOrigin(v as typeof origin)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua donor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua donor</SelectItem>
                  {ORIGINS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {ORIGIN_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sector} onValueChange={(v) => setSector(v as typeof sector)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua sektor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua sektor</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SECTOR_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={sdg} onValueChange={setSdg}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua SDG" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  <SelectItem value="all">Semua SDG</SelectItem>
                  {Object.entries(SDG_LABELS).map(([n, l]) => (
                    <SelectItem key={n} value={n}>
                      SDG {n} · {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deadline} onValueChange={(v) => setDeadline(v as DeadlineFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua deadline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua deadline</SelectItem>
                  <SelectItem value="urgent">≤14 hari (urgent)</SelectItem>
                  <SelectItem value="soon">15-45 hari</SelectItem>
                  <SelectItem value="open">&gt;45 hari</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span>
                  Menampilkan <strong className="text-foreground">{filtered.length}</strong> dari{' '}
                  {MOCK_GRANTS.length} hibah
                </span>
              </div>
              {hasActiveFilter && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Reset filter
                </Button>
              )}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Tidak ada hibah yang cocok</p>
                <p className="text-sm text-muted-foreground">Coba longgarkan filter atau kata kunci.</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset semua filter
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
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