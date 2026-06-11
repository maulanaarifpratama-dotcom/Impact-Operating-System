import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, Filter, Search, ShieldAlert, Sparkles, TrendingUp, X, Loader2, MessageSquare, Send, Plus, Upload, CheckCircle2, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ingestLibraryText, askLibrary, type RagCitation } from '@/lib/library/ai';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Cloud } from 'lucide-react';
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [tab, setTab] = useState<LibraryKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sectorGroups, setSectorGroups] = useState<SectorGroup[]>([]);
  const [sdg, setSdg] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<LibraryItem | null>(null);

  // Form states for Ingestion
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadKind, setUploadKind] = useState<LibraryKind>('template');
  const [uploadConsentStatus, setUploadConsentStatus] = useState<'none' | 'implied' | 'written'>('none');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  const [uploadTags, setUploadTags] = useState('');
  const [uploadSectors, setUploadSectors] = useState<GrantSector[]>([]);
  const [uploadSdgs, setUploadSdgs] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Chat states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'assistant'; text: string; citations?: RagCitation[] }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatActiveDocIds, setChatActiveDocIds] = useState<string[]>([]);

  // Query organization memberships for the current user
  const { data: membership } = useQuery({
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

  // Check if any document is in indexing state
  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ['library_documents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('library_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const hasProcessing = useMemo(() => {
    return documents?.some((doc: any) => doc.status === 'processing' || doc.status === 'uploaded');
  }, [documents]);

  // If there are indexing files, automatically poll every 4 seconds to show live updates
  const { data: liveDocs } = useQuery({
    queryKey: ['library_documents_polled', organizationId, hasProcessing],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('library_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Triggers invalidation on main document queries to sync list
      queryClient.setQueryData(['library_documents', organizationId], data);
      return data ?? [];
    },
    enabled: !!organizationId && hasProcessing,
    refetchInterval: 4000,
  });

  // Map backend documents to LibraryItem interface
  const libraryItems = useMemo<LibraryItem[]>(() => {
    const list = documents || [];
    return list.map((doc: any) => {
      const meta = doc.metadata || {};
      return {
        id: doc.id,
        kind: meta.kind || 'template',
        title: doc.title,
        source: doc.source_url || meta.source || 'Upload',
        year: meta.year || new Date(doc.created_at).getFullYear(),
        summary: doc.description || meta.summary || '',
        sectors: meta.sectors || [],
        sdgs: meta.sdgs || [],
        region: meta.region || 'Nasional',
        format: meta.format || (doc.mime_type?.includes('pdf') ? 'pdf' : 'web'),
        url: doc.source_url || meta.url || '#',
        readMinutes: meta.readMinutes || 5,
        featured: !!meta.featured,
        tags: doc.tags || meta.tags || [],
        downloads: meta.downloads || 0,
        status: doc.status,
        consent_status: meta.consent_status || 'none',
      };
    });
  }, [documents]);

  // Handle doc ingestion submission
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error('Gagal: ID Organisasi belum diselesaikan');
      return;
    }
    if (!uploadTitle.trim() || !uploadText.trim()) {
      toast.error('Harap lengkapi Judul dan Isi Dokumen');
      return;
    }

    if (selectedFile) {
      // 1. OneDrive Binary Upload Flow (Secure App-Only Backend Flow)
      setIsUploading(true);
      try {
        // Generate a new document UUID on the client side
        const documentId = crypto.randomUUID();

        // Prepare multipart form data
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('organizationId', organizationId);
        formData.append('documentId', documentId);
        formData.append('fileName', selectedFile.name);

        // Invoke the Supabase Edge Function
        const { data: uploadResult, error: funcErr } = await supabase.functions.invoke('onedrive-upload', {
          body: formData,
        });

        if (funcErr || !uploadResult) {
          throw new Error(funcErr?.message || 'Gagal memanggil fungsi onedrive-upload.');
        }

        // Save metadata record to library_documents table
        const { error: dbErr } = await (supabase as any)
          .from('library_documents')
          .insert({
            id: documentId,
            organization_id: organizationId,
            uploaded_by: user?.id,
            title: uploadTitle.trim(),
            source_url: uploadResult.webUrl,
            status: 'ready', // Set directly to ready for Phase 1
            original_file_name: selectedFile.name,
            storage_provider: 'onedrive',
            storage_path: uploadResult.storagePath,
            storage_item_id: uploadResult.storageItemId,
            drive_id: uploadResult.driveId,
            web_url: uploadResult.webUrl,
            size_bytes: uploadResult.sizeBytes,
            mime_type: uploadResult.mimeType,
            metadata: {
              kind: uploadKind,
              consent_status: uploadConsentStatus,
              year: parseInt(uploadYear) || new Date().getFullYear(),
              sectors: uploadSectors,
              sdgs: uploadSdgs,
              readMinutes: 5,
              tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
            }
          });

        if (dbErr) {
          throw new Error(`Gagal menyimpan data metadata dokumen ke database: ${dbErr.message}`);
        }

        toast.success('Sukses: File berhasil diunggah ke OneDrive dan tercatat di library!');
        
        // Reset state
        setSelectedFile(null);
        setUploadTitle('');
        setUploadText('');
        setUploadUrl('');
        setUploadTags('');
        setUploadSectors([]);
        setUploadSdgs([]);
        queryClient.invalidateQueries({ queryKey: ['library_documents', organizationId] });
      } catch (err: any) {
        console.error('OneDrive upload flow error:', err);
        toast.error(`Gagal mengunggah ke OneDrive: ${err.message || err}`);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // 2. Standard Text Ingestion Flow
    if (uploadText.trim().length < 50) {
      toast.error('Isi teks dokumen minimal harus 50 karakter agar dapat dianalisis AI');
      return;
    }

    setIsUploading(true);
    try {
      const input = {
        title: uploadTitle.trim(),
        text: uploadText.trim(),
        source_url: uploadUrl.trim() || undefined,
        tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
        metadata: {
          kind: uploadKind,
          consent_status: uploadConsentStatus,
          year: parseInt(uploadYear) || new Date().getFullYear(),
          sectors: uploadSectors,
          sdgs: uploadSdgs,
          readMinutes: Math.max(1, Math.ceil(uploadText.length / 800) * 2),
        }
      };

      const res = await ingestLibraryText(input);
      if (res.error) {
        toast.error(`Gagal melakukan ingestion: ${res.error}`);
      } else {
        toast.success('Sukses: Dokumen berhasil dikirim dan sedang diindeks secara real-time!');
        // Reset form
        setUploadTitle('');
        setUploadText('');
        setUploadUrl('');
        setUploadTags('');
        setUploadSectors([]);
        setUploadSdgs([]);
        // Force refetch to populate instantly
        queryClient.invalidateQueries({ queryKey: ['library_documents', organizationId] });
      }
    } catch (err) {
      toast.error(`Kesalahan: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Q&A prompt submission
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    if (!organizationId) {
      toast.error('Gagal: ID Organisasi belum diselesaikan');
      return;
    }

    const question = chatQuestion.trim();
    setChatQuestion('');
    setChatHistory(prev => [...prev, { sender: 'user', text: question }]);
    setChatLoading(true);

    try {
      const res = await askLibrary({
        question,
        document_ids: chatActiveDocIds.length > 0 ? chatActiveDocIds : undefined,
      });

      if (res.error) {
        setChatHistory(prev => [...prev, { sender: 'assistant', text: `Gagal memproses pertanyaan: ${res.error}` }]);
        toast.error(`AI Error: ${res.error}`);
      } else {
        setChatHistory(prev => [...prev, { sender: 'assistant', text: res.answer, citations: res.citations }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'assistant', text: `Kesalahan internal: ${(err as Error).message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

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
    return libraryItems.filter((it) => {
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
  }, [tab, search, activeSectors, sdg, libraryItems]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: libraryItems.length };
    for (const it of libraryItems) map[it.kind] = (map[it.kind] ?? 0) + 1;
    return map;
  }, [libraryItems]);

  const featuredCount = useMemo(() => libraryItems.filter((x) => x.featured).length, [libraryItems]);

  const hasActiveFilter = !!search || sectorGroups.length > 0 || sdg !== 'all';

  const libraryHealth = useMemo(
    () => [
      { label: 'Total resource', value: libraryItems.length.toString(), helper: 'Aset & referensi di organisasi Anda' },
      { label: 'Kategori aset', value: ASSET_CATEGORIES.length.toString(), helper: 'Kerangka asset engine NGO' },
      { label: 'Siap dipakai untuk proposal', value: featuredCount.toString(), helper: 'Item pilihan editor untuk mulai cepat' },
      { label: 'Status Dokumen', value: hasProcessing ? 'Mengindeks...' : 'Semua Sinkron', helper: hasProcessing ? 'Sedang melakukan pemrosesan AI' : 'Semua siap digunakan' },
    ],
    [libraryItems.length, featuredCount, hasProcessing],
  );

  /**
   * Deterministic mock "downloads" so the ranking is stable across renders.
   * Featured items get a baseline boost so they trend higher.
   */
  const withDownloads = useMemo(
    () =>
      libraryItems.map((it) => {
        if (typeof it.downloads === 'number' && it.downloads > 0) return it;
        const seed = it.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const base = 120 + (seed % 880); // 120–999
        const boost = it.featured ? 600 : 0;
        return { ...it, downloads: base + boost };
      }),
    [libraryItems],
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
                Operating Library — {libraryItems.length} item terkurasi
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

      {/* SECTION: Interactive AI Console (Q&A + Upload Ingestion Flow) */}
      <Card className="border-accent/20 bg-card p-6 shadow-card">
        <Tabs defaultValue="qa" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted p-1">
            <TabsTrigger value="qa" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Tanya Library (AI RAG)
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Unggah Dokumen Baru
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qa" className="space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Asisten Pintar Impact Library (RAG)
              </h3>
              <p className="text-xs text-muted-foreground">
                Ajukan pertanyaan tentang apa saja di dokumen legal, laporan, profil, atau template Anda. AI akan merespons lengkap dengan referensi.
              </p>
            </div>

            {/* Chat History Box */}
            <div className="border border-border rounded-xl bg-muted/30 p-4 min-h-[220px] max-h-[380px] overflow-y-auto space-y-4">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-[200px] space-y-3">
                  <div className="bg-accent/10 text-accent p-3 rounded-full">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Mulai Percakapan</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Ketik pertanyaan Anda di bawah ini, atau gunakan salah satu saran pencarian cepat berikut:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {[
                      'Apa saja legalitas utama organisasi kita?',
                      'Bagaimana pencapaian program pemberdayaan ekonomi tahun lalu?',
                      'Apa target SDG utama organisasi kita?'
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setChatQuestion(q);
                        }}
                        className="text-[11px] bg-card hover:bg-accent hover:text-accent-foreground text-foreground px-2.5 py-1.5 rounded-lg border border-border transition-colors shadow-xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col space-y-1 max-w-[85%] rounded-xl p-3.5 text-sm",
                      chat.sender === 'user'
                        ? "bg-accent text-accent-foreground ml-auto"
                        : "bg-card text-foreground mr-auto border border-border"
                    )}
                  >
                    <span className="text-[10px] uppercase font-bold opacity-70">
                      {chat.sender === 'user' ? 'Anda' : 'Asisten AI'}
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{chat.text}</p>
                    {chat.citations && chat.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wide block">Rujukan Sumber ({chat.citations.length}):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {chat.citations.map((cit, cidx) => {
                            const refDoc = libraryItems.find(item => item.id === cit.document_id);
                            return (
                              <button
                                key={cidx}
                                onClick={() => {
                                  if (refDoc) {
                                    setActiveItem(refDoc);
                                  } else {
                                    toast.info(`Sumber: ${cit.document_title}`);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] bg-muted hover:bg-accent-soft hover:text-accent border border-border/80 px-2 py-0.5 rounded-md font-medium text-muted-foreground transition-all"
                                title={cit.excerpt}
                              >
                                <FileText className="h-3 w-3" />
                                {cit.document_title} (Sim: {(cit.similarity * 100).toFixed(0)}%)
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex items-center gap-2 mr-auto bg-card border border-border rounded-xl p-3 text-sm max-w-[85%] shadow-xs animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-xs text-muted-foreground">AI sedang menganalisis & menyusun jawaban...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAsk} className="flex gap-2">
              <Input
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Tanyakan analisis program, legalitas, atau ringkasan dari library..."
                className="flex-1 rounded-xl focus-visible:ring-accent"
                disabled={chatLoading}
              />
              <Button type="submit" disabled={chatLoading} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-5">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-accent" />
                Ingest & Sinkronisasi Dokumen Baru (AI Powered)
              </h3>
              <p className="text-xs text-muted-foreground">
                Tulis teks atau masukkan URL dokumen untuk diproses, dipecah menjadi chunks, dan di-embed ke database vektor secara otomatis.
              </p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 pt-2">
               {/* Microsoft OneDrive Integration File Picker */}
              <div className="border border-accent/20 bg-accent-soft/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-accent" />
                  <div>
                    <h4 className="text-sm font-semibold">Integrasi Storage OneDrive</h4>
                    <p className="text-[11px] text-muted-foreground">Unggah file fisik Anda langsung ke storage OneDrive organisasi tanpa login.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Pilih File untuk OneDrive (Opsional)</Label>
                  <Input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file) {
                        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        setUploadTitle(nameWithoutExt);
                        setUploadText(`[OneDrive File] File "${file.name}" selected for direct secure upload to organization central OneDrive.`);
                      } else {
                        setUploadTitle('');
                        setUploadText('');
                      }
                    }}
                    className="cursor-pointer file:text-accent file:font-semibold"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      File terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB) - File akan diunggah langsung ke OneDrive.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider">Judul Dokumen <span className="text-destructive">*</span></Label>
                  <Input
                    id="title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Contoh: Laporan Dampak Program Air Bersih 2025"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sourceUrl" className="text-xs font-semibold uppercase tracking-wider">URL Sumber (Opsional)</Label>
                  <Input
                    id="sourceUrl"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="Contoh: https://impactory.id/reports/air-2025"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="text" className="text-xs font-semibold uppercase tracking-wider">Isi Dokumen (Teks Polos) <span className="text-destructive">*</span></Label>
                <Textarea
                  id="text"
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder={selectedFile ? "File OneDrive terpilih. Isi dokumen fisik disimpan langsung di cloud storage." : "Tempel dokumen proposal, cerita penerima manfaat, atau laporan Anda di sini (minimal 50 karakter)..."}
                  className="min-h-[140px] font-sans"
                  required={!selectedFile}
                  disabled={!!selectedFile}
                />
                <span className="text-[10px] text-muted-foreground float-right block">
                  Jumlah Karakter: {uploadText.length} {selectedFile ? "" : "(Minimal 50)"}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Tipe Aset</Label>
                  <Select value={uploadKind} onValueChange={(v) => setUploadKind(v as LibraryKind)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tipe Aset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="data_sdg">Data SDGs</SelectItem>
                      <SelectItem value="riset">Riset & Whitepaper</SelectItem>
                      <SelectItem value="case_study">Studi Kasus</SelectItem>
                      <SelectItem value="panduan">Panduan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Izin Penggunaan (Consent)</Label>
                  <Select value={uploadConsentStatus} onValueChange={(v) => setUploadConsentStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tingkat Izin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum Ada Izin (Sangat Sensitif)</SelectItem>
                      <SelectItem value="implied">Izin Tersirat (Implied Consent)</SelectItem>
                      <SelectItem value="written">Izin Tertulis (Written Consent)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs font-semibold uppercase tracking-wider">Tahun Publikasi/Data</Label>
                  <Input
                    id="year"
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    placeholder="Contoh: 2025"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold uppercase tracking-wider block">Sektor Terkait (Opsional)</Label>
                <div className="flex flex-wrap gap-3 p-3 border border-border rounded-xl bg-muted/10">
                  {SECTOR_GROUPS.map((s) => (
                    <label
                      key={s.key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground hover:text-accent transition-colors"
                    >
                      <Checkbox
                        checked={uploadSectors.some(sect => s.maps.includes(sect))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUploadSectors(prev => [...Array.from(new Set([...prev, ...s.maps]))]);
                          } else {
                            setUploadSectors(prev => prev.filter(sect => !s.maps.includes(sect)));
                          }
                        }}
                      />
                      <span className="text-xs">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wider">Tag Tambahan (Pisahkan dengan Koma)</Label>
                  <Input
                    id="tags"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="Contoh: air bersih, kebersihan, kemitraan, sani"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sdgs" className="text-xs font-semibold uppercase tracking-wider">SDGs Terkait (Opsional)</Label>
                  <Input
                    id="sdgs"
                    placeholder="Masukkan angka SDG dipisahkan koma, contoh: 3, 6, 17"
                    onChange={(e) => {
                      const nums = e.target.value.split(',')
                        .map(n => parseInt(n.trim()))
                        .filter(n => !isNaN(n) && n >= 1 && n <= 17);
                      setUploadSdgs(nums);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-6 font-semibold flex items-center gap-2 shadow-md transition-all hover:shadow-elegant"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengekstrak & Mengindeks...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Mulai Ingest & Sinkronisasi AI
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
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
        {libraryItems.length === 0 && (
          <Card className="flex flex-col gap-3 border-dashed p-6">
            <div>
              <h3 className="font-semibold">Library baseline belum dibuat</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Mulai dengan mengelompokkan aset organisasi ke 12 kategori: legal, profil organisasi, proposal lama,
                laporan impact, data program, cerita penerima manfaat, template, dan dokumen partnership.
              </p>
            </div>
            <Button type="button" variant="outline" disabled className="w-fit">
              Upload Asset — gunakan formulir di atas untuk mengunggah dokumen pertama Anda
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