import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, Filter, Search, ShieldAlert, Sparkles, TrendingUp, X } from 'lucide-react';
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

const ASSET_CATEGORIES = [
  {
    name: 'Legal Documents',
    description: 'Akta, SK, NPWP, legalitas, dan dokumen administratif utama.',
  },
  {
    name: 'Organization Profile',
    description: 'Profil organisasi, deskripsi program, bio founder, dan boilerplate resmi.',
  },
  {
    name: 'Past Proposals',
    description: 'Proposal lama yang bisa menjadi referensi struktur dan narasi.',
  },
  {
    name: 'Impact Reports',
    description: 'Laporan program, laporan donor, output, outcome, dan bukti capaian.',
  },
  {
    name: 'Financial Reports',
    description: 'Budget, laporan keuangan, dan dokumen pendukung akuntabilitas.',
  },
  {
    name: 'Program Data',
    description: 'Data penerima manfaat, lokasi program, aktivitas, dan indikator.',
  },
  {
    name: 'Beneficiary Stories',
    description: 'Cerita penerima manfaat yang sudah memiliki izin penggunaan.',
  },
  {
    name: 'Photos & Videos',
    description: 'Dokumentasi visual yang aman dipakai untuk proposal dan campaign.',
  },
  {
    name: 'Templates',
    description: 'Template proposal, campaign, report, email, dan komunikasi donor.',
  },
  {
    name: 'SOP',
    description: 'SOP operasional, alur kerja tim, dan panduan internal.',
  },
  {
    name: 'Donor Reports',
    description: 'Laporan khusus donor, update campaign, dan thank-you report.',
  },
  {
    name: 'Partnership Documents',
    description: 'MoU, deck partnership, pitch deck, dan dokumen kolaborasi.',
  },
];

const WORKFLOW_CARDS = [
  {
    title: 'Grantwriter',
    description: 'Gunakan profil organisasi, proposal lama, dan laporan impact sebagai bahan draft proposal.',
    cta: 'Buka Grantwriter',
    href: '/dashboard/grant-writer',
  },
  {
    title: 'Campaign Builder',
    description: 'Gunakan cerita, dokumentasi, dan data program untuk membangun campaign yang lebih kuat.',
    cta: 'Bangun Campaign',
    href: '/dashboard/impactory-ads',
  },
  {
    title: 'Monthly Impact Report',
    description: 'Gunakan data program dan dokumentasi untuk membuat laporan bulanan yang lebih konsisten.',
    cta: 'Segera hadir',
  },
  {
    title: 'Grant Pipeline',
    description: 'Gunakan dokumen legal dan profil organisasi untuk mempercepat proses apply grant.',
    cta: 'Lihat Grant Pipeline',
    href: '/dashboard/grantfinder',
  },
];

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

  const libraryHealth = useMemo(
    () => [
      { label: 'Total resource', value: MOCK_LIBRARY.length.toString(), helper: 'Item referensi dan template tersedia' },
      { label: 'Kategori aset', value: ASSET_CATEGORIES.length.toString(), helper: 'Kerangka asset engine NGO' },
      { label: 'Siap dipakai untuk proposal', value: featuredCount.toString(), helper: 'Item pilihan editor untuk mulai cepat' },
      { label: 'Perlu dilengkapi', value: 'Baseline', helper: 'Upload asset organisasi segera hadir' },
    ],
    [featuredCount],
  );

  /**
   * Deterministic mock "downloads" so the ranking is stable across renders.
   * Featured items get a baseline boost so they trend higher.
   */
  const withDownloads = useMemo(
    () =>
      MOCK_LIBRARY.map((it) => {
        if (typeof it.downloads === 'number') return it;
        const seed = it.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const base = 120 + (seed % 880); // 120–999
        const boost = it.featured ? 600 : 0;
        return { ...it, downloads: base + boost };
      }),
    [],
  );

  const recommended = useMemo(
    () =>
      withDownloads
        .filter((it) => it.featured)
        .sort((a, b) => b.year - a.year)
        .slice(0, 4),
    [withDownloads],
  );

  const mostDownloaded = useMemo(
    () => [...withDownloads].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, 4),
    [withDownloads],
  );

  const showHighlights = tab === 'all' && !hasActiveFilter;

  const resetFilters = () => {
    setSearch('');
    setSectorGroups([]);
    setSdg('all');
  };

  const toggleSectorGroup = (key: SectorGroup) =>
    setSectorGroups((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero: Impact Library + search bar besar + filter tabs */}
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
                Operating Library — {MOCK_LIBRARY.length} item terkurasi
                {featuredCount > 0 && <> · {featuredCount} pilihan editor</>}
              </Badge>
              <h1 className="text-h1">Impact Library</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Ubah dokumen lama, laporan, proposal, template, dan cerita impact menjadi asset engine untuk proposal,
                campaign, dan laporan donor.
              </p>
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

      <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card">
        <p className="text-sm leading-6 text-muted-foreground">
          Dokumen lama bukan arsip mati. Dokumen lama adalah aset untuk proposal berikutnya, campaign berikutnya, dan
          bukti impact berikutnya.
        </p>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Library Health / Asset Readiness</h2>
          <p className="text-sm text-muted-foreground">
            Baseline library membantu tim melihat aset mana yang siap dipakai dan mana yang perlu dilengkapi.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {libraryHealth.map((item) => (
            <Card key={item.label} className="p-5 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
            </Card>
          ))}
        </div>
        {MOCK_LIBRARY.length === 0 && (
          <Card className="flex flex-col gap-3 border-dashed p-6">
            <div>
              <h3 className="font-semibold">Library baseline belum dibuat</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Mulai dengan mengelompokkan aset organisasi ke 12 kategori: legal, profil organisasi, proposal lama,
                laporan impact, data program, cerita penerima manfaat, template, dan dokumen partnership.
              </p>
            </div>
            <Button type="button" variant="outline" disabled className="w-fit">
              Upload Asset — segera hadir
            </Button>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Asset Categories</h2>
          <p className="text-sm text-muted-foreground">
            Mulai dengan mengelompokkan aset organisasi ke 12 kategori agar mudah ditemukan dan dipakai ulang.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ASSET_CATEGORIES.map((category) => (
            <Card key={category.name} className="p-5 shadow-card">
              <Badge variant="outline" className="text-[10px]">Asset</Badge>
              <h3 className="mt-3 font-semibold">{category.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-h4">Dipakai di seluruh sistem</h2>
          <p className="text-sm text-muted-foreground">
            Impact Library menjadi bahan baku untuk modul lain. Semakin rapi aset organisasi, semakin cepat proposal,
            campaign, dan laporan bisa dibuat tanpa mulai dari nol.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_CARDS.map((card) => (
            <Card key={card.title} className="flex h-full flex-col p-5 shadow-card">
              <h3 className="font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              {card.href ? (
                <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                  <Link to={card.href}>
                    {card.cta}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled className="mt-4 w-fit">
                  {card.cta}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-amber-500/30 bg-amber-500/5 p-5 shadow-card">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold">Data sensitif butuh perlindungan</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Dokumen NGO sering berisi data sensitif. Cerita penerima manfaat, foto anak, data keluarga, laporan
              keuangan, dan dokumen legal harus dikelola dengan izin, akses terbatas, dan human review.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Pastikan cerita dan foto penerima manfaat memiliki izin penggunaan.</li>
              <li>Pisahkan dokumen publik, internal, dan sensitif.</li>
              <li>Jangan gunakan data sensitif untuk proposal atau campaign tanpa review manusia.</li>
            </ul>
          </div>
        </div>
      </Card>

      <section className="space-y-2">
        <h2 className="text-h4">Referensi dan Template Siap Pakai</h2>
        <p className="text-sm text-muted-foreground">
          Gunakan referensi ini sebagai inspirasi, template, dan bahan awal untuk proposal, campaign, serta laporan
          impact.
        </p>
      </section>

      {/* Tabs content (controlled by hero tabs) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>

        {showHighlights && (
          <div className="mt-5 space-y-6">
            {/* Direkomendasikan */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-h4">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Direkomendasikan
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Pilihan editor untuk memperkuat proposal & program Anda.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {recommended.map((it) => (
                  <LibraryCard key={`rec-${it.id}`} item={it} onOpen={() => setActiveItem(it)} />
                ))}
              </div>
            </section>

            {/* Paling Diunduh */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Paling Diunduh
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Item terlaris pekan ini berdasarkan unduhan & pembukaan.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {mostDownloaded.map((it, idx) => (
                  <Card
                    key={`top-${it.id}`}
                    className="group relative flex h-full flex-col gap-2 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elegant"
                  >
                    <div className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                      {idx + 1}
                    </div>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {KIND_LABEL[it.kind]}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setActiveItem(it)}
                      className="line-clamp-2 pr-7 text-left text-sm font-semibold leading-snug hover:text-accent focus:outline-none"
                    >
                      {it.title}
                    </button>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{it.source}</p>
                    <div className="mt-auto flex items-center justify-between pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-accent">
                        <Download className="h-3 w-3" />
                        {(it.downloads ?? 0).toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveItem(it)}
                        className="text-xs font-medium text-muted-foreground hover:text-accent"
                      >
                        Lihat →
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Jelajahi semua
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

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

      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">Bangun asset engine organisasi</h2>
          <p className="text-sm text-muted-foreground">
            Hubungkan library dengan proposal, campaign, dan dashboard kerja NGO Growth OS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/grant-writer">Buat Proposal dengan Grantwriter</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/impactory-ads">Bangun Campaign</Link>
          </Button>
          <Button type="button" variant="outline" disabled>
            Upload Asset — segera hadir
          </Button>
        </div>
      </Card>

      <LibraryDetailDialog item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}