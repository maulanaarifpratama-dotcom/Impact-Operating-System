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
  SECTOR_LABEL,
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

const KINDS: (LibraryKind | 'all')[] = ['all', 'data_sdg', 'riset', 'template', 'case_study'];

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
      {/* Hero */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-16 md:w-16">
            <BookOpen className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div className="space-y-1.5">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
              <Sparkles className="mr-1 h-3 w-3" />
              MVP — {MOCK_LIBRARY.length} item terkurasi
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Impactory Library</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Data SDGs, riset, template, dan studi kasus terpilih untuk memperkuat proposal & program Anda.
            </p>
          </div>
          {featuredCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="font-medium text-accent">{featuredCount} pilihan editor</span>
            </div>
          )}
        </div>
      </Card>

      {/* Search bar besar */}
      <Card className="relative space-y-3 overflow-hidden border-accent/20 bg-gradient-to-br from-primary/5 via-background to-accent-soft/30 p-5 shadow-card md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl"
        />
        <div className="group relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari data, riset, template, atau studi kasus..."
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
      </Card>

      {/* Tabs per kind */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {k === 'all' ? 'Semua' : KIND_LABEL[k as LibraryKind]}
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {counts[k] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

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

      {/* Note: SECTOR_LABEL imported elsewhere via LibraryCard; expose to keep tree-shake friendly. */}
      <LibraryDetailDialog item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}

// ensure SECTOR_LABEL retained as re-export (used by detail dialog)
void SECTOR_LABEL;