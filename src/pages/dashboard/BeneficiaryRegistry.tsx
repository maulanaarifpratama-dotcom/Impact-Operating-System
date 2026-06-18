import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Download,
  FileText,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Sliders,
  Sparkles,
} from 'lucide-react';

export default function BeneficiaryRegistry() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'simple' | 'professional'>('simple');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<any | null>(null);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'other' | ''>('');
  const [age, setAge] = useState<number | ''>('');
  const [village, setVillage] = useState('');
  const [city, setCity] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'alumni' | 'inactive'>('active');

  // Professional Additional Fields
  const [nik, setNik] = useState('');
  const [vulnerableCategories, setVulnerableCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [contact, setContact] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [pdpConsent, setPdpConsent] = useState(false);
  const [notes, setNotes] = useState('');

  // Local fallback state in case Supabase table is not yet created
  const [localBeneficiaries, setLocalBeneficiaries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('impactory_local_beneficiaries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage when localBeneficiaries changes
  useEffect(() => {
    localStorage.setItem('impactory_local_beneficiaries', JSON.stringify(localBeneficiaries));
  }, [localBeneficiaries]);

  // 1. Fetch organization ID
  const { data: orgId, isLoading: isOrgIdLoading } = useQuery({
    queryKey: ['user_organization_id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await ensureDefaultOrg(user.id, profile?.full_name);
    },
    enabled: !!user?.id,
  });

  // 2. Fetch Organization Details
  const { data: organization } = useQuery({
    queryKey: ['organization_details_beneficiary', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // 3. Fetch LFA Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['lfa_projects_beneficiary', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('org_id', orgId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // 4. Fetch Beneficiaries
  const {
    data: beneficiaries = [],
    isLoading: isBeneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useQuery({
    queryKey: ['beneficiaries_list', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });
        
        if (error) {
          if (
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table') ||
            error.code?.includes('42P01') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205'
          ) {
            console.warn('Using localStorage fallback for beneficiaries list:', error);
            const saved = localStorage.getItem('impactory_local_beneficiaries');
            return saved ? JSON.parse(saved) : [];
          }
          throw error;
        }
        return data || [];
      } catch (err) {
        console.warn('Beneficiaries query failed, falling back to localStorage:', err);
        const saved = localStorage.getItem('impactory_local_beneficiaries');
        return saved ? JSON.parse(saved) : [];
      }
    },
    enabled: !!orgId,
  });

  // Reset form helper
  const resetForm = () => {
    setFullName('');
    setGender('');
    setAge('');
    setVillage('');
    setCity('');
    setProjectId('');
    setStatus('active');
    setNik('');
    setVulnerableCategories([]);
    setStartDate('');
    setContact('');
    setPhotoUrl('');
    setPdpConsent(false);
    setNotes('');
    setEditingBeneficiary(null);
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    resetForm();
    // Default the form project selection to selected filter project if not 'all'
    if (selectedProjectId !== 'all') {
      setProjectId(selectedProjectId);
    }
    setEditingBeneficiary(null);
    setIsFormOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (b: any) => {
    setEditingBeneficiary(b);
    setFullName(b.full_name || '');
    setGender(b.gender || '');
    setAge(b.age || '');
    setVillage(b.village || '');
    setCity(b.city || '');
    setProjectId(b.lfa_project_id || '');
    setStatus(b.status || 'active');
    setNik(b.nik || '');
    setVulnerableCategories(b.vulnerable_categories || []);
    setStartDate(b.start_date || '');
    setContact(b.contact || '');
    setPhotoUrl(b.photo_url || '');
    setPdpConsent(b.pdp_consent || false);
    setNotes(b.notes || '');
    setIsFormOpen(true);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Nama Lengkap wajib diisi!');
      return;
    }
    if (mode === 'professional' && !pdpConsent) {
      toast.error('Consent PDP wajib disetujui dalam Mode Profesional!');
      return;
    }

    const payload = {
      org_id: orgId,
      lfa_project_id: projectId || null,
      full_name: fullName.trim(),
      gender: gender || null,
      age: age !== '' ? Number(age) : null,
      village: village.trim() || null,
      city: city.trim() || null,
      status,
      nik: mode === 'professional' ? (nik.trim() || null) : null,
      vulnerable_categories: mode === 'professional' ? vulnerableCategories : [],
      start_date: mode === 'professional' ? (startDate || null) : null,
      contact: mode === 'professional' ? (contact.trim() || null) : null,
      photo_url: mode === 'professional' ? (photoUrl.trim() || null) : null,
      pdp_consent: mode === 'professional' ? pdpConsent : false,
      notes: notes.trim() || null,
      mode: mode,
    };

    try {
      if (editingBeneficiary) {
        const { error } = await supabase
          .from('beneficiaries')
          .update(payload)
          .eq('id', editingBeneficiary.id);
        
        if (error) {
          if (
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table') ||
            error.code?.includes('42P01') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205'
          ) {
            const updated = localBeneficiaries.map((b) =>
              b.id === editingBeneficiary.id
                ? { ...b, ...payload, updated_at: new Date().toISOString() }
                : b
            );
            setLocalBeneficiaries(updated);
            toast.success('Pembaruan disimpan secara lokal (Tabel DB belum dibuat).');
            setIsFormOpen(false);
            refetchBeneficiaries();
            resetForm();
            return;
          }
          throw error;
        }
        toast.success('Data penerima manfaat berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('beneficiaries').insert(payload);
        if (error) {
          if (
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table') ||
            error.code?.includes('42P01') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205'
          ) {
            const newB = {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
              ...payload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setLocalBeneficiaries([newB, ...localBeneficiaries]);
            toast.success('Data disimpan secara lokal (Tabel DB belum dibuat).');
            setIsFormOpen(false);
            refetchBeneficiaries();
            resetForm();
            return;
          }
          throw error;
        }
        toast.success('Penerima manfaat baru berhasil ditambahkan!');
      }
      setIsFormOpen(false);
      refetchBeneficiaries();
      resetForm();
    } catch (err: any) {
      console.error('Error saving beneficiary:', err);
      toast.error('Gagal menyimpan data: ' + err.message);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data penerima manfaat ini?')) return;
    try {
      const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
      if (error) {
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('Could not find the table') ||
          error.code?.includes('42P01') ||
          error.code === 'PGRST116' ||
          error.code === 'PGRST205'
        ) {
          const updated = localBeneficiaries.filter((b) => b.id !== id);
          setLocalBeneficiaries(updated);
          toast.success('Data dihapus secara lokal (Tabel DB belum dibuat).');
          refetchBeneficiaries();
          return;
        }
        throw error;
      }
      toast.success('Penerima manfaat berhasil dihapus!');
      refetchBeneficiaries();
    } catch (err: any) {
      console.error('Error deleting beneficiary:', err);
      toast.error('Gagal menghapus data: ' + err.message);
    }
  };

  // Filter Beneficiaries by search query and project ID
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesSearch = b.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = selectedProjectId === 'all' ? true : b.lfa_project_id === selectedProjectId;
      return matchesSearch && matchesProject;
    });
  }, [beneficiaries, searchQuery, selectedProjectId]);

  // Calculations for Summary Cards
  const stats = useMemo(() => {
    const total = filteredBeneficiaries.length;
    const activeCount = filteredBeneficiaries.filter((b) => b.status === 'active').length;
    const maleCount = filteredBeneficiaries.filter((b) => b.gender === 'M').length;
    const femaleCount = filteredBeneficiaries.filter((b) => b.gender === 'F').length;

    // Professional Mode additional stats
    const vulnerableCount = filteredBeneficiaries.filter(
      (b) => b.vulnerable_categories && b.vulnerable_categories.length > 0
    ).length;
    const pdpConsentCount = filteredBeneficiaries.filter((b) => b.pdp_consent === true).length;

    return {
      total,
      activeCount,
      maleCount,
      femaleCount,
      vulnerableCount,
      pdpConsentCount,
    };
  }, [filteredBeneficiaries]);

  // Project beneficiary counts helper
  const projectStats = useMemo(() => {
    const map: Record<string, number> = {};
    beneficiaries.forEach((b) => {
      if (b.lfa_project_id) {
        map[b.lfa_project_id] = (map[b.lfa_project_id] || 0) + 1;
      }
    });
    return map;
  }, [beneficiaries]);

  // Toggle vulnerable category checkbox
  const handleVulnerableToggle = (category: string) => {
    setVulnerableCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const isProf = mode === 'professional';
    const headers = isProf
      ? [
          'Nama Lengkap',
          'Jenis Kelamin',
          'Usia',
          'Desa/Lokasi',
          'Kota/Kabupaten',
          'Program',
          'Status',
          'NIK',
          'Kelompok Rentan',
          'Tanggal Mulai',
          'Kontak',
          'Consent PDP',
          'Catatan',
        ]
      : ['Nama Lengkap', 'Jenis Kelamin', 'Usia', 'Desa/Lokasi', 'Kota/Kabupaten', 'Program', 'Status'];

    const rows = filteredBeneficiaries.map((b) => {
      const projName = projects.find((p) => p.id === b.lfa_project_id)?.name || 'Semua Program';
      const genderLabel = b.gender === 'M' ? 'L' : b.gender === 'F' ? 'P' : 'Lainnya';
      const statusLabel =
        b.status === 'active' ? 'Aktif' : b.status === 'alumni' ? 'Alumni' : 'Tidak Aktif';

      if (isProf) {
        return [
          b.full_name,
          genderLabel,
          b.age || '',
          b.village || '',
          b.city || '',
          projName,
          statusLabel,
          b.nik || '',
          (b.vulnerable_categories || []).join('; '),
          b.start_date || '',
          b.contact || '',
          b.pdp_consent ? 'Setuju' : 'Tidak',
          b.notes || '',
        ];
      } else {
        return [b.full_name, genderLabel, b.age || '', b.village || '', b.city || '', projName, statusLabel];
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const sanitizedProgramName =
      selectedProjectId === 'all'
        ? 'semua-program'
        : (projects.find((p) => p.id === selectedProjectId)?.name || 'program')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
    const today = new Date().toISOString().split('T')[0];

    link.setAttribute('href', url);
    link.setAttribute('download', `beneficiary-${sanitizedProgramName}-${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ekspor CSV berhasil diunduh!');
  };

  // Mask NIK helper
  const maskNik = (nikStr?: string | null) => {
    if (!nikStr) return '-';
    if (nikStr.length <= 4) return '****';
    return nikStr.slice(0, 4) + '**********' + nikStr.slice(-2);
  };

  const selectedProgramName = useMemo(() => {
    if (selectedProjectId === 'all') return 'Semua Program';
    return projects.find((p) => p.id === selectedProjectId)?.name || 'Program Pilihan';
  }, [selectedProjectId, projects]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      dateStyle: 'long',
    });
  }, []);

  if (isOrgIdLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f6e56]" />
          <p className="text-xs text-muted-foreground font-medium">Memuat Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen space-y-6 pb-12 print-bg-white print-m-0">
      {/* Dynamic Style Injection for PDF Printing Page Size & Mode Orientation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-shadow-none { box-shadow: none !important; }
            .print-border-none { border: none !important; }
            @page {
              size: ${mode === 'professional' ? 'landscape' : 'portrait'};
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white !important;
              color: black !important;
            }
          }
        `,
        }}
      />

      {/* PRINT-ONLY HEADER FOR PDF REPORT */}
      <div className="hidden print-only text-left border-b pb-6 mb-6 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
              LAPORAN REGISTRI PENERIMA MANFAAT
            </h1>
            <p className="text-sm font-semibold text-accent mt-1">
              ORGANISASI: {organization?.name || 'Impactory Partner NGO'}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Dokumen Resmi Digital</p>
            <p className="mt-1">Tanggal Ekspor: {todayStr}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
          <div>
            <span className="text-muted-foreground font-medium">Lingkup Program:</span>
            <p className="font-bold text-foreground text-sm mt-0.5">{selectedProgramName}</p>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Klasifikasi Modul:</span>
            <p className="font-bold text-foreground text-sm mt-0.5">
              G.R.O.W.T.H Layer W (Work Evidence & Proof)
            </p>
          </div>
        </div>
      </div>

      {/* 1. HEADER SECTION (no-print compatible) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Beneficiary Registry
            </h1>
            <Badge
              variant="outline"
              className="bg-accent-soft/20 text-accent font-bold border-accent/30 text-xs px-2.5 py-0.5"
            >
              Layer W (Evidence)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Database penerima manfaat program organisasi Anda. Kelola bukti dampak secara berjenjang
            untuk laporan audit & kredibilitas donor.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-muted p-1 rounded-lg self-start md:self-auto border shadow-sm">
          <button
            onClick={() => setMode('simple')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5',
              mode === 'simple'
                ? 'bg-background text-foreground shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🌱 Sederhana
          </button>
          <button
            onClick={() => setMode('professional')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5',
              mode === 'professional'
                ? 'bg-background text-foreground shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🏢 Profesional
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (Both for Print and App view) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 print-shadow-none">
        <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Penerima Manfaat
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 italic">
              {selectedProjectId === 'all' ? 'Seluruh Program' : 'Program Terpilih'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Status Aktif
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600">{stats.activeCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 italic">
              Penerima Manfaat Aktif
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Laki-laki (L)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-sky-600">{stats.maleCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 italic">Laki-laki terdaftar</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Perempuan (P)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-600">{stats.femaleCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 italic">Perempuan terdaftar</p>
          </CardContent>
        </Card>

        {/* Professional Mode Extra Cards */}
        {mode === 'professional' && (
          <>
            <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left col-span-2 md:col-span-2 bg-gradient-to-br from-[#0f6e56]/5 to-background">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-[#0f6e56] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Kelompok Rentan
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-[#0f6e56]">{stats.vulnerableCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                  Butuh perhatian khusus & prioritas intervensi
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/80 hover:border-accent/30 transition-all text-left col-span-2 md:col-span-2 bg-gradient-to-br from-amber-500/5 to-background">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Dengan Consent PDP
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-amber-700">{stats.pdpConsentCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                  Izin publikasi data sesuai UU PDP terverifikasi
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 3. ACTION & FILTER BAR (no-print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-muted/30 p-4 rounded-xl border no-print">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama penerima..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Program Select Filter */}
          <div className="w-full md:w-64">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Semua Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Program ({beneficiaries.length})</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({projectStats[p.id] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Button
            onClick={handleOpenAdd}
            className="bg-[#0f6e56] hover:bg-[#0f6e56]/90 text-white font-semibold text-xs h-9"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Penerima Manfaat
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="text-xs h-9 border-border/80 hover:bg-muted"
            title="Ekspor ke CSV"
          >
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="text-xs h-9 border-border/80 hover:bg-muted"
            title="Cetak Laporan PDF"
          >
            <FileText className="mr-1.5 h-4 w-4" /> PDF / Cetak
          </Button>
        </div>
      </div>

      {/* 4. BENEFICIARY TABLE CARD */}
      <Card className="shadow-sm border-border/80 print-shadow-none print-border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold text-xs text-foreground py-3">
                    Nama Lengkap
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground text-center py-3">
                    L/P
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground text-center py-3">
                    Usia
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground py-3">
                    Lokasi (Desa/Kota)
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground py-3">Program</TableHead>
                  <TableHead className="font-bold text-xs text-foreground text-center py-3">
                    Status
                  </TableHead>

                  {/* Professional Extra Columns */}
                  {mode === 'professional' && (
                    <>
                      <TableHead className="font-bold text-xs text-foreground py-3">
                        Kelompok Rentan
                      </TableHead>
                      <TableHead className="font-bold text-xs text-foreground py-3">
                        NIK (Disensor)
                      </TableHead>
                      <TableHead className="font-bold text-xs text-foreground py-3">
                        Mulai Manfaat
                      </TableHead>
                      <TableHead className="font-bold text-xs text-foreground py-3">
                        Kontak
                      </TableHead>
                      <TableHead className="font-bold text-xs text-foreground text-center py-3">
                        PDP Consent
                      </TableHead>
                      <TableHead className="font-bold text-xs text-foreground py-3">
                        Catatan
                      </TableHead>
                    </>
                  )}

                  <TableHead className="font-bold text-xs text-foreground text-center py-3 no-print">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeneficiaries.length > 0 ? (
                  filteredBeneficiaries.map((b) => {
                    const matchedProj = projects.find((p) => p.id === b.lfa_project_id);

                    return (
                      <TableRow key={b.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="font-semibold text-xs text-foreground py-3">
                          {b.full_name}
                        </TableCell>
                        <TableCell className="text-center text-xs py-3">
                          {b.gender === 'M' ? (
                            <Badge
                              variant="outline"
                              className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold"
                            >
                              L
                            </Badge>
                          ) : b.gender === 'F' ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold"
                            >
                              P
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] font-bold"
                            >
                              Lainnya
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs py-3 font-semibold text-muted-foreground">
                          {b.age ? `${b.age} thn` : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-3 text-muted-foreground">
                          {b.village || b.city ? (
                            <span>
                              {b.village || '-'}
                              {b.city ? `, ${b.city}` : ''}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3 font-medium text-foreground max-w-[200px] truncate">
                          {matchedProj?.name || 'Umum / Semua Program'}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {b.status === 'active' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                              Aktif
                            </Badge>
                          ) : b.status === 'alumni' ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                              Alumni
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                              Tidak Aktif
                            </Badge>
                          )}
                        </TableCell>

                        {/* Professional Columns Body */}
                        {mode === 'professional' && (
                          <>
                            <TableCell className="text-xs py-3">
                              {b.vulnerable_categories && b.vulnerable_categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {b.vulnerable_categories.map((c: string) => (
                                    <Badge
                                      key={c}
                                      variant="secondary"
                                      className="text-[9px] bg-[#0f6e56]/10 text-[#0f6e56] border-none font-bold"
                                    >
                                      {c}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                              {maskNik(b.nik)}
                            </TableCell>
                            <TableCell className="text-xs py-3 text-muted-foreground font-semibold">
                              {b.start_date
                                ? new Date(b.start_date).toLocaleDateString('id-ID', {
                                    dateStyle: 'medium',
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-xs py-3 text-muted-foreground font-semibold">
                              {b.contact || '-'}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {b.pdp_consent ? (
                                <span
                                  className="inline-flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                  title="UU PDP Consent Terverifikasi"
                                >
                                  ✅ Setuju
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                                  title="Belum Melakukan Consent PDP"
                                >
                                  ❌ Belum
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-3 text-muted-foreground max-w-[150px] truncate">
                              {b.notes || '-'}
                            </TableCell>
                          </>
                        )}

                        <TableCell className="text-center py-3 no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => handleOpenEdit(b)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(b.id)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={mode === 'professional' ? 13 : 7}
                      className="text-center py-10 text-muted-foreground text-xs"
                    >
                      {isBeneficiariesLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#0f6e56]" />
                          <span>Menarik Data Penerima Manfaat...</span>
                        </div>
                      ) : (
                        'Belum ada data penerima manfaat terdaftar untuk program / kata kunci pencarian ini.'
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PRINT-ONLY SIGNATURE FOOTER FOR PDF */}
      <div className="hidden print-only mt-12 border-t pt-8 space-y-6 text-left">
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="font-bold text-foreground">Dibuat & Disahkan Oleh:</p>
            <div className="mt-16 border-b border-dashed border-gray-400 w-48"></div>
            <p className="mt-1 font-semibold text-muted-foreground">Staf Lapangan / PIC Laporan</p>
          </div>
          <div>
            <p className="font-bold text-foreground">Disetujui Oleh:</p>
            <div className="mt-16 border-b border-dashed border-gray-400 w-48"></div>
            <p className="mt-1 font-semibold text-muted-foreground">Direktur Program / Reviewer</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center italic mt-12 pt-6 border-t">
          Dokumen ini diproduksi dan disebarluaskan dengan aman melalui platform kemitraan dampak{' '}
          <strong>Impactory.id</strong>. Seluruh data dilindungi hak cipta & UU PDP.
        </p>
      </div>

      {/* 5. ADD / EDIT DIALOG FORM */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] p-6 text-left">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {editingBeneficiary ? 'Edit Penerima Manfaat' : 'Tambah Penerima Manfaat Baru'}
              <Badge variant="secondary" className="bg-[#0f6e56]/10 text-[#0f6e56] text-[10px] font-bold">
                {mode === 'professional' ? 'Mode Profesional' : 'Mode Sederhana'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isi data detail penerima manfaat di bawah ini. Mode saat ini:{' '}
              <strong>{mode === 'professional' ? 'Profesional' : 'Sederhana'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Simple Fields Section */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs font-bold text-foreground">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Masukkan nama lengkap..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gender" className="text-xs font-bold text-foreground">
                  Jenis Kelamin
                </Label>
                <Select value={gender} onValueChange={(val: any) => setGender(val)}>
                  <SelectTrigger id="gender" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Laki-laki (L)</SelectItem>
                    <SelectItem value="F">Perempuan (P)</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="age" className="text-xs font-bold text-foreground">
                  Usia (Tahun)
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Contoh: 12"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-bold text-foreground">
                  Status Penerima
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="status" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="village" className="text-xs font-bold text-foreground">
                  Kelurahan / Desa / Kecamatan
                </Label>
                <Input
                  id="village"
                  placeholder="Contoh: Desa Karangsari"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs font-bold text-foreground">
                  Kota / Kabupaten
                </Label>
                <Input
                  id="city"
                  placeholder="Contoh: Kebumen"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="programId" className="text-xs font-bold text-foreground">
                  Program Terafiliasi (LFA Project)
                </Label>
                <Select value={projectId || "none"} onValueChange={(val) => setProjectId(val === "none" ? "" : val)}>
                  <SelectTrigger id="programId" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Umum (Tidak Terafiliasi Khusus)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Professional Mode Extra Form Fields */}
            {mode === 'professional' && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-bold text-[#0f6e56] flex items-center gap-1.5 uppercase tracking-wider text-xs">
                  <ShieldCheck className="h-4 w-4" /> Data Pelengkap & Legalitas Audit
                </h3>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="nik" className="text-xs font-bold text-foreground">
                      NIK Penerima Manfaat (Disimpan Aman)
                    </Label>
                    <Input
                      id="nik"
                      placeholder="Masukkan 16 digit NIK..."
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      className="h-9 text-xs"
                      maxLength={16}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="contact" className="text-xs font-bold text-foreground">
                      Nomor Kontak / Telepon
                    </Label>
                    <Input
                      id="contact"
                      placeholder="Contoh: 081234567890"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="startDate" className="text-xs font-bold text-foreground">
                      Tanggal Mulai Menerima Manfaat
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="photoUrl" className="text-xs font-bold text-foreground">
                      Tautan Foto Profil / Dokumentasi
                    </Label>
                    <Input
                      id="photoUrl"
                      placeholder="https://gdrive.com/photo.jpg"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Multiple select check buttons for Vulnerable groups */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Kategori Kelompok Rentan (Bisa Pilih Lebih Dari Satu)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-muted/45 rounded-lg border">
                    {[
                      'Anak',
                      'Lansia',
                      'Disabilitas',
                      'Perempuan KRT',
                      'Masyarakat Adat',
                      'Lainnya',
                    ].map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={vulnerableCategories.includes(cat)}
                          onChange={() => handleVulnerableToggle(cat)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0f6e56] focus:ring-[#0f6e56]"
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 bg-amber-500/5 p-4 rounded-lg border border-amber-500/20">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdpConsent}
                      onChange={(e) => setPdpConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      required
                    />
                    <div className="text-xs">
                      <p className="font-bold text-amber-900">
                        Consent PDP (Persetujuan Perlindungan Data Pribadi){' '}
                        <span className="text-rose-500">*</span>
                      </p>
                      <p className="text-[10px] text-amber-800 leading-relaxed mt-0.5">
                        Saya mengonfirmasi bahwa penerima manfaat ini (atau wali sahnya) telah
                        memberikan persetujuan tertulis yang membolehkan organisasi kami menyimpan
                        dan memanfaatkan informasi sensasional ini sesuai regulasi perlindungan data
                        pribadi (UU PDP).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-bold text-foreground">
                Catatan Lapangan & Rekomendasi
              </Label>
              <Textarea
                id="notes"
                placeholder="Tuliskan catatan tambahan mengenai perkembangan penerima manfaat ini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button type="submit" className="bg-[#0f6e56] hover:bg-[#0f6e56]/90 text-white font-semibold text-xs h-9">
                {editingBeneficiary ? 'Simpan Perubahan' : 'Tambah Penerima'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
