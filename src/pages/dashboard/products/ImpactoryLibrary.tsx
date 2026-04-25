import { useMemo, useState } from 'react';
import { BookOpen, Filter, Search, Sparkles, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MOCK_LIBRARY } from '@/lib/library/mockItems';
import {
  type LibraryItem,
  type LibraryKind,
  KIND_DESC,
  KIND_LABEL,
  SDG_LABELS,
} from '@/lib/library/types';
import { LibraryCard } from '@/components/library/LibraryCard';
import { LibraryDetailDialog } from '@/components/library/LibraryDetailDialog';

/** 5 grup sektor — sama mapping seperti Grantfinder agar konsisten. */
import type { GrantSector } from '@/lib/grantfinder/types';

type SectorGroup = 'pendidikan' | 'kesehatan' | 'lingkungan' | 'pemberdayaan' | 'seni_budaya';

const SECTOR_GROUPS: { key: SectorGroup; label: string; maps: GrantSector[] }[] = [
  { key: 'pendidikan', label: 'Pendidikan', maps: ['pendidikan'] },
  { key: 'kesehatan', label: 'Kesehatan', maps: ['kesehatan', 'air_sanitasi'] },
  { key: 'lingkungan', label: 'Lingkungan', maps: ['lingkungan', 'energi', 'pertanian'] },
  { key: 'pemberdayaan', label: 'Pemberdayaan', maps: ['ekonomi', 'gender', 'tata_kelola', 'kemanusiaan'] },
  { key: 'seni_budaya', label: 'Seni Budaya', maps: ['kebudayaan'] },
];

const KINDS: (LibraryKind | 'all')[] = ['all', 'template', 'data_sdg', 'riset', 'panduan'];

export default function ImpactoryLibrary() {
  const [tab, setTab] = useState<LibraryKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sectorGroups, setSectorGroups] = useState<SectorGroup[]>([]);
  const [sdg, setSdg] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<LibraryItem | null>(null);

  const activeSectors = useMemo(() => {
    if (sectorGroups.length === 0) return null;
    const set = new Set<GrantSector>();
    for (const g of sectorGroups) {
      SECTOR_GROUPS.find((x) => x.key === g)?.maps.forEach((s) => set.add(s));
    }
    return set;
  }, [sectorGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_LIBRARY.filter((it) => {
      if (tab !== 'all' && it.kind !== tab) return false;
      if (q && !`${it.title} ${it.source} ${it.summary} ${(it.tags ?? []).join(' ')}`.toLowerCase().includes(q))
        return false;
      if (activeSectors && !it.sectors.some((s) => activeSectors.has(s))) return false;
      if (sdg !== 'all' && !it.sdgs.includes(Number(sdg))) return false;
      return true;
    }).sort((a, b) => {
      // featured first, then year desc
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return b.year - a.year;
    });
  }, [tab, search, activeSectors, sdg]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: MOCK_LIBRARY.length };
    for (const it of MOCK_LIBRARY) map[it.kind] = (map[it.kind] ?? 0) + 1;
    return map;
  }, []);

  const featuredCount = useMemo(() => MOCK_LIBRARY.filter((x) => x.featured).length, []);

  const hasActiveFilter = !!search || sectorGroups.length > 0 || sdg !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSectorGroups([]);
    setSdg('all');
  };

  const toggleSectorGroup = (key: SectorGroup) =>
    setSectorGroups((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero: Library + search bar besar + filter tabs */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl"
        />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14">
              <BookOpen className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <div className="flex-1 space-y-1">
              <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
                <Sparkles className="mr-1 h-3 w-3" />
                MVP — {MOCK_LIBRARY.length} item terkurasi
                {featuredCount > 0 && <> · {featuredCount} pilihan editor</>}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Library</h1>
            </div>
          </div>

          {/* Search bar besar */}
          <div className="group relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari template, data SDGs, riset, atau panduan..."
              className="h-14 rounded-xl border-2 border-border bg-card pl-12 pr-12 text-base shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 md:text-lg"
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

          {/* Filter tabs di dalam hero */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-card/60 p-1 backdrop-blur">
              {KINDS.map((k) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm"
                >
                  {k === 'all' ? 'Semua' : KIND_LABEL[k as LibraryKind]}
                  <Badge
                    variant="secondary"
                    className="ml-2 text-[10px] data-[state=active]:bg-accent-foreground/20"
                  >
                    {counts[k] ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Tabs content (controlled by hero tabs) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>

        {KINDS.map((k) => (
          <TabsContent key={k} value={k} className="mt-5">
            {k !== 'all' && (
              <p className="mb-4 text-sm text-muted-foreground">{KIND_DESC[k as LibraryKind]}</p>
            )}

            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              {/* Filter panel */}
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

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      SDG
                    </Label>
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
                  </div>
                </Card>
              </aside>

              {/* Results */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Menampilkan <strong className="text-foreground">{filtered.length}</strong> item
                </p>
                {filtered.length === 0 ? (
                  <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tidak ada item yang cocok</p>
                      <p className="text-sm text-muted-foreground">
                        Coba longgarkan filter atau pencarian.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset filter
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {filtered.map((it) => (
                      <LibraryCard key={it.id} item={it} onOpen={() => setActiveItem(it)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <LibraryDetailDialog item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}