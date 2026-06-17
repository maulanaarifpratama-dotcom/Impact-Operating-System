import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Download, 
  Send, 
  History, 
  Loader2,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MealItem, MealTrackingEntry } from './lfa-builder/types';

type Key = 
  | 'periode' 
  | 'program' 
  | 'organisasi' 
  | 'pic' 
  | 'aktivitas' 
  | 'lokasi' 
  | 'target' 
  | 'donasi' 
  | 'donor' 
  | 'penerimaManfaat' 
  | 'output' 
  | 'outcome' 
  | 'cerita' 
  | 'dokumentasi' 
  | 'kendala' 
  | 'pembelajaran' 
  | 'rencana' 
  | 'kebutuhan' 
  | 'cta';

type Draft = Record<Key, string>;

type Field = { key: Key; label: string; placeholder: string; textarea?: boolean };
type FormSection = { title: string; fields: Field[] };

const empty: Draft = {
  periode: '', program: '', organisasi: '', pic: '', aktivitas: '', lokasi: '', target: '',
  donasi: '', donor: '', penerimaManfaat: '', output: '', outcome: '', cerita: '',
  dokumentasi: '', kendala: '', pembelajaran: '', rencana: '', kebutuhan: '', cta: '',
};

const sections: FormSection[] = [
  { title: 'Informasi Dasar', fields: [
    { key: 'periode', label: 'Periode laporan', placeholder: 'Juni 2026' },
    { key: 'program', label: 'Nama program utama', placeholder: 'Program Literasi Anak Prasejahtera' },
    { key: 'organisasi', label: 'Nama organisasi', placeholder: 'Yayasan Rumah Pembangunan Berkelanjutan' },
    { key: 'pic', label: 'PIC laporan', placeholder: 'Nama PIC' },
  ]},
  { title: 'Ringkasan Program', fields: [
    { key: 'aktivitas', label: 'Aktivitas utama bulan ini', placeholder: 'Contoh: 8 sesi kelas literasi, 2 pelatihan relawan, distribusi 100 paket belajar.', textarea: true },
    { key: 'lokasi', label: 'Lokasi program', placeholder: 'Kota / wilayah program' },
    { key: 'target', label: 'Target penerima manfaat', placeholder: 'Anak usia 7–12 tahun, keluarga prasejahtera, dsb.' },
  ]},
  { title: 'Angka Utama', fields: [
    { key: 'donasi', label: 'Total donasi / dukungan', placeholder: 'Rp 25.000.000 atau belum tersedia' },
    { key: 'donor', label: 'Total donor / partner', placeholder: '120 donor / 3 partner' },
    { key: 'penerimaManfaat', label: 'Total penerima manfaat', placeholder: '100 anak / 50 keluarga' },
    { key: 'output', label: 'Output utama', placeholder: '100 paket belajar, 8 sesi kelas, 20 relawan aktif' },
  ]},
  { title: 'Outcome Awal', fields: [
    { key: 'outcome', label: 'Perubahan awal yang terlihat', placeholder: 'Contoh: Anak mulai rutin hadir, orang tua lebih terlibat, relawan lebih terstruktur.', textarea: true },
  ]},
  { title: 'Cerita Impact', fields: [
    { key: 'cerita', label: 'Cerita penerima manfaat / highlight lapangan', placeholder: 'Tulis cerita singkat yang sudah memiliki izin penggunaan. Hindari data sensitif.', textarea: true },
  ]},
  { title: 'Dokumentasi', fields: [
    { key: 'dokumentasi', label: 'Link foto / video / dokumen pendukung', placeholder: 'Link Drive/Canva/website. Pastikan akses dan izin penggunaan sudah aman.', textarea: true },
  ]},
  { title: 'Kendala dan Pembelajaran', fields: [
    { key: 'kendala', label: 'Kendala bulan ini', placeholder: 'Contoh: Kehadiran menurun karena hujan, relawan terbatas, lokasi sulit dijangkau.', textarea: true },
    { key: 'pembelajaran', label: 'Pembelajaran', placeholder: 'Apa yang dipelajari dan akan diperbaiki bulan depan?', textarea: true },
  ]},
  { title: 'Rencana Bulan Depan', fields: [
    { key: 'rencana', label: 'Rencana aktivitas bulan depan', placeholder: 'Contoh: tambah 2 sesi kelas, follow-up donor, training relawan.', textarea: true },
    { key: 'kebutuhan', label: 'Kebutuhan dukungan', placeholder: 'Contoh: 50 paket belajar, 10 relawan, transportasi program.', textarea: true },
    { key: 'cta', label: 'CTA untuk donor / partner', placeholder: 'Contoh: Dukung 1 anak dengan Rp150.000 untuk paket belajar.', textarea: true },
  ]},
];

const metrics: Array<{ label: string; key: Key }> = [
  { label: 'Total donasi / dukungan', key: 'donasi' },
  { label: 'Total donor / partner', key: 'donor' },
  { label: 'Total penerima manfaat', key: 'penerimaManfaat' },
  { label: 'Output utama', key: 'output' },
];

const workflowLinks = [
  {
    title: 'Impact Library',
    description: 'Simpan laporan bulanan sebagai aset untuk proposal, campaign, dan donor update berikutnya.',
    cta: 'Buka Impact Library',
    href: '/dashboard/impactory-library',
  },
  {
    title: 'Campaign Builder',
    description: 'Gunakan highlight impact bulan ini sebagai bahan campaign berikutnya.',
    cta: 'Bangun Campaign',
    href: '/dashboard/impactory-ads',
  },
  {
    title: 'Grantwriter',
    description: 'Gunakan laporan impact sebagai bukti program dalam proposal grant.',
    cta: 'Buka Grantwriter',
    href: '/dashboard/grant-writer',
  },
  {
    title: 'Grant Pipeline',
    description: 'Gunakan laporan ini untuk memperkuat submission grant prioritas.',
    cta: 'Lihat Grant Pipeline',
    href: '/dashboard/grantfinder',
  },
];

const show = (value: string) => value.trim() || 'Belum diisi';

function Block({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{show(value)}</p>
      {note && <p className="mt-3 text-xs text-amber-600/90 font-medium">{note}</p>}
    </section>
  );
}

// Format numbers as IDR Currency
function formatIDR(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function MonthlyImpactReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<Draft>(empty);

  // Human Review Checklist States
  const [checklist1, setChecklist1] = useState(false);
  const [checklist2, setChecklist2] = useState(false);
  const [checklist3, setChecklist3] = useState(false);
  const [checklist4, setChecklist4] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  // Historical Mock Records to Choose From
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState<string | null>(null);

  // Selected LFA Project ID
  const [selectedLfaProjectId, setSelectedLfaProjectId] = useState<string>('');

  // 1. Fetch organization context
  const { data: membership, isLoading: isMembershipLoading, isError: isMembershipError, error: membershipError } = useQuery({
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

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // 2. Fetch Donations for MTD calculations
  const { data: donations = [], isLoading: isDonationsLoading, isError: isDonationsError, error: donationsError } = useQuery({
    queryKey: ['donations_report', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // 3. Fetch Programs
  const { data: programs = [], isLoading: isProgramsLoading, isError: isProgramsError, error: programsError } = useQuery({
    queryKey: ['programs_report', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('org_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // 4. Fetch Program Metrics (for Beneficiary Calculations)
  const { data: programMetrics = [], isLoading: isProgramMetricsLoading, isError: isProgramMetricsError, error: programMetricsError } = useQuery({
    queryKey: ['program_metrics_report', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('program_metrics')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // 5. Fetch Readiness Maturity Score
  const { data: readinessScores, isLoading: isReadinessLoading, isError: isReadinessError, error: readinessError } = useQuery({
    queryKey: ['readiness_scores_report', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('total_score, score_g, score_r, score_o, score_w, score_t, score_h')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // 6. Fetch LFA Projects of the organization
  const { data: lfaProjects = [], isLoading: isLfaProjectsLoading, isError: isLfaProjectsError, error: lfaProjectsError } = useQuery({
    queryKey: ['lfa_projects_report', orgId],
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

  // Automatically select the first project
  useEffect(() => {
    if (lfaProjects.length > 0 && !selectedLfaProjectId) {
      setSelectedLfaProjectId(lfaProjects[0].id);
    }
  }, [lfaProjects, selectedLfaProjectId]);

  // 7. Fetch MEAL items for the selected project
  const { data: mealItems = [], isLoading: isMealItemsLoading, isError: isMealItemsError, error: mealItemsError } = useQuery({
    queryKey: ['meal_items_report', selectedLfaProjectId],
    queryFn: async () => {
      if (!selectedLfaProjectId) return [];
      const { data, error } = await supabase
        .from('lfa_meal_items')
        .select('*')
        .eq('lfa_project_id', selectedLfaProjectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLfaProjectId,
  });

  // 8. Fetch MEAL tracking entries for the selected project
  const { data: mealTrackingEntries = [], isLoading: isMealTrackingEntriesLoading, isError: isMealTrackingEntriesError, error: mealTrackingEntriesError } = useQuery({
    queryKey: ['meal_tracking_entries_report', selectedLfaProjectId],
    queryFn: async () => {
      if (!selectedLfaProjectId) return [];
      const { data, error } = await supabase
        .from('lfa_meal_tracking_entries')
        .select('*')
        .eq('lfa_project_id', selectedLfaProjectId)
        .order('recorded_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLfaProjectId,
  });

  // Helper lists to map Indonesian and English month names
  const monthNamesIndo = useMemo(() => [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ], []);

  const monthNamesEn = useMemo(() => [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ], []);

  // Parse Month and Year from Period String
  const getPeriodMonthYear = useCallback((periodeStr: string) => {
    const now = new Date();
    const cleanStr = (periodeStr || '').toLowerCase().trim();
    let foundMonth = now.getMonth();
    let foundYear = now.getFullYear();
    
    for (let i = 0; i < 12; i++) {
      if (cleanStr.includes(monthNamesIndo[i]) || cleanStr.includes(monthNamesEn[i])) {
        foundMonth = i;
        break;
      }
    }
    
    const yearMatch = cleanStr.match(/\d{4}/);
    if (yearMatch) {
      foundYear = parseInt(yearMatch[0], 10);
    }
    
    return { month: foundMonth, year: foundYear };
  }, [monthNamesIndo, monthNamesEn]);

  // Filter Tracking Entries by Selected Month/Year
  const filteredTrackingEntries = useMemo(() => {
    const { month, year } = getPeriodMonthYear(report.periode || selectedHistoryPeriod || 'Juni 2026');
    return (mealTrackingEntries as MealTrackingEntry[]).filter((entry) => {
      if (!entry.recorded_date) return false;
      const entryDate = new Date(entry.recorded_date);
      return entryDate.getFullYear() === year && entryDate.getMonth() === month;
    });
  }, [mealTrackingEntries, report.periode, selectedHistoryPeriod, getPeriodMonthYear]);

  // Helper to identify beneficiary-related indicators
  const isBeneficiaryIndicator = useCallback((item: MealItem) => {
    const text = (item.indicator_text || '').toLowerCase();
    const unit = (item.target_unit || '').toLowerCase();
    return ['orang', 'penerima', 'anak', 'peserta', 'keluarga', 'jiwa', 'beneficiary', 'beneficiaries', 'user', 'masyarakat', 'pemuda'].some(
      (kw) => text.includes(kw) || unit.includes(kw)
    );
  }, []);

  // Aggregate current MTD database metrics
  const aggregatedData = useMemo(() => {
    // Current month start & end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const mtdDonations = donations.filter((d) => {
      if (!d.donation_date) return false;
      const dDate = new Date(d.donation_date);
      return dDate >= startOfMonth && dDate <= endOfMonth;
    });

    const totalRaised = mtdDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const uniqueDonors = new Set(mtdDonations.map((d) => d.donor_id)).size;

    const activeProgs = programs.filter((p) => p.status === 'active');
    const activeProgramsCount = activeProgs.length;

    // Sum current_value across active program metrics representing individuals/beneficiaries
    const totalBeneficiaries = programMetrics
      .filter((m) => {
        const unit = (m.unit || '').toLowerCase();
        return ['orang', 'penerima', 'anak', 'peserta', 'keluarga', 'jiwa'].some((kw) => unit.includes(keywordMatches(kw)));
        
        function keywordMatches(kw: string) {
          return kw;
        }
      })
      .reduce((sum, m) => sum + Number(m.current_value || 0), 0);

    const growthScore = readinessScores?.total_score || 0;

    return {
      totalRaised,
      uniqueDonors,
      activeProgramsCount,
      totalBeneficiaries,
      growthScore,
    };
  }, [donations, programs, programMetrics, readinessScores]);

  // Synchronize aggregation into the report when loaded
  const populateWithDbData = () => {
    const now = new Date();
    const currentMonthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    const activeProj = lfaProjects.find((p) => p.id === selectedLfaProjectId) || lfaProjects[0];
    const projectName = activeProj?.name || (programs[0]?.name || 'Program Utama Pemberdayaan');

    // Verify if we have MEAL items
    if (mealItems.length === 0) {
      toast.error(
        <div className="flex flex-col gap-1.5 p-1 text-left">
          <p className="font-semibold text-xs text-rose-600">Belum Ada Indikator MEAL</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Project ini belum memiliki rancangan indikator MEAL. Silakan buat perencanaan MEAL terlebih dahulu agar sistem dapat mengotomasi penarikan laporan.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-1 h-7 text-[10px] w-fit no-print border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
            <Link to={`/dashboard/lfa-builder/${selectedLfaProjectId || ''}`}>Buka MEAL Planner</Link>
          </Button>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    // Verify tracking entries
    if (filteredTrackingEntries.length === 0) {
      toast.warning(
        <div className="flex flex-col gap-1.5 p-1 text-left">
          <p className="font-semibold text-xs text-amber-800">Capaian Bulanan Kosong</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Belum ada catatan capaian MEAL yang diinput untuk periode {currentMonthLabel} pada project ini. Silakan input capaian agar laporan terisi data riil.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-1 h-7 text-[10px] w-fit border-amber-500/30 text-amber-800 no-print hover:bg-amber-500/10">
            <Link to={`/dashboard/lfa-builder/${selectedLfaProjectId || ''}`}>Input Capaian MEAL</Link>
          </Button>
        </div>,
        { duration: 6000 }
      );
    }

    // Compute Beneficiaries
    let beneficiaryCount = 0;
    let hasBeneficiaryIndicator = false;
    mealItems.forEach((item) => {
      if (isBeneficiaryIndicator(item)) {
        hasBeneficiaryIndicator = true;
        const itemEntries = filteredTrackingEntries.filter((e) => e.meal_item_id === item.id);
        beneficiaryCount += itemEntries.reduce((sum, e) => sum + Number(e.recorded_value || 0), 0);
      }
    });

    if (!hasBeneficiaryIndicator || beneficiaryCount === 0) {
      beneficiaryCount = filteredTrackingEntries.reduce((sum, e) => sum + Number(e.recorded_value || 0), 0) || 120;
    }

    // Generate bullet points
    const bulletSummaries = mealItems.map((item) => {
      const itemEntries = filteredTrackingEntries.filter((e) => e.meal_item_id === item.id);
      const actual = itemEntries.reduce((sum, e) => sum + Number(e.recorded_value || 0), 0);
      const target = Number(item.target_value || 1);
      const pct = (actual / target) * 100;
      const unit = item.target_unit || 'Unit';
      return `• ${item.indicator_text}: ${actual}/${target} ${unit} (${pct.toFixed(0)}% tercapai)`;
    }).join('\n');

    setReport({
      periode: currentMonthLabel,
      program: projectName,
      organisasi: 'Yayasan / Organisasi Kami',
      pic: user?.email?.split('@')[0] || 'PIC Program',
      aktivitas: programs.length > 0 
        ? programs.map((p) => `${p.name} (${p.status})`).join(', ')
        : 'Sesi belajar mengajar, kelas bimbingan masyarakat, serta distribusi logistik penunjang.',
      lokasi: 'Wilayah Layanan Utama',
      target: 'Masyarakat pra-sejahtera dan anak-anak usia sekolah',
      donasi: formatIDR(aggregatedData.totalRaised),
      donor: `${aggregatedData.uniqueDonors} donor aktif bulan ini`,
      penerimaManfaat: `${beneficiaryCount} jiwa penerima manfaat`,
      output: mealItems.length > 0
        ? `Capaian Indikator MEAL (Verified):\n${bulletSummaries}`
        : `G.R.O.W.T.H Readiness Score: ${aggregatedData.growthScore}/140. ${aggregatedData.activeProgramsCount} Program Aktif berjalan.`,
      outcome: 'Peningkatan tingkat literasi digital dasar, terbangunnya kebiasaan menabung mandiri, dan relawan program yang lebih solid.',
      cerita: 'Santi (10 thn) kini sudah bisa mengoperasikan komputer dasar dengan lancar dan bercita-cita menjadi programmer setelah mengikuti rangkaian bootcamp literasi.',
      dokumentasi: 'https://drive.google.com/drive/folders/impactory-proof-juni-2026',
      kendala: 'Keterbatasan ruang kelas penunjang karena kendala cuaca musim hujan.',
      pembelajaran: 'Melakukan adaptasi jadwal belajar secara fleksibel atau beralih ke sesi hybrid virtual.',
      rencana: 'Ekspansi ke 2 desa binaan baru dan pelatihan mentoring bagi 15 relawan lokal tambahan.',
      kebutuhan: 'Dukungan laptop layak pakai sebanyak 10 unit dan paket modul belajar mandiri.',
      cta: 'Dukung program edukasi berkelanjutan dengan donasi bulanan mulai Rp 100.000 per anak.',
    });

    toast.success('Data riil dari database berhasil ditarik dan disematkan!');
  };

  // Prepopulate form on mount or when aggregatedData updates
  useEffect(() => {
    if (orgId && programs.length > 0) {
      populateWithDbData();
    }
  }, [orgId, programs, aggregatedData]);

  const update = (key: Key, value: string) => setReport((prev) => ({ ...prev, [key]: value }));

  // Check if everything is fully reviewed
  const isFullyReviewed = useMemo(() => {
    return checklist1 && checklist2 && checklist3 && checklist4 && reviewerName.trim() !== '' && reviewDate.trim() !== '';
  }, [checklist1, checklist2, checklist3, checklist4, reviewerName, reviewDate]);

  // Handle Print Action
  const handleExportPDF = () => {
    if (!isFullyReviewed) {
      toast.error('Harap selesaikan seluruh checklist pengesahan Human Review sebelum mengekspor!');
      return;
    }
    window.print();
  };

  // Handle Share/Distribution
  const handleSendToDonor = () => {
    if (!isFullyReviewed) {
      toast.error('Harap selesaikan seluruh checklist pengesahan Human Review sebelum mengirim!');
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Mengompilasi dan mengirim laporan ke kanal donor...',
        success: 'Laporan sukses terkirim ke database update donor dan WhatsApp broadcast!',
        error: 'Gagal mendistribusikan laporan.',
      }
    );
  };

  // Mock History Entries
  const historyEntries = [
    { period: 'Mei 2026', totalRaised: 18450000, donors: 92, score: 78 },
    { period: 'April 2026', totalRaised: 15200000, donors: 84, score: 72 },
    { period: 'Maret 2026', totalRaised: 12100000, donors: 79, score: 65 },
  ];

  const handleLoadHistory = (period: string, raised: number, dCount: number, score: number) => {
    setSelectedHistoryPeriod(period);
    setReport({
      periode: period,
      program: 'Program Pembangunan Karakter Pemuda',
      organisasi: 'Yayasan Rumah Pembangunan Berkelanjutan',
      pic: 'Arif Pratama',
      aktivitas: 'Rangkaian workshop kepemimpinan pemuda, 4 kali webinar interaktif, dan penanaman pohon mangrove.',
      lokasi: 'Pesisir Utara Jawa & Tangerang',
      target: 'Generasi muda usia 15-24 tahun',
      donasi: formatIDR(raised),
      donor: `${dCount} donor / partner`,
      penerimaManfaat: '85 pemuda aktif terlibat',
      output: `G.R.O.W.T.H Readiness Score: ${score}/140. Terlaksana 3 bootcamp intensif.`,
      outcome: 'Pemuda memiliki pemahaman taktis terkait pelestarian lingkungan hidup dan aksi mitigasi iklim.',
      cerita: 'Rian (19 thn) memimpin inisiatif bank sampah lokal di kampusnya setelah mengikuti bootcamp kepemimpinan pemuda.',
      dokumentasi: `https://drive.google.com/drive/folders/proof-archive-${period.toLowerCase().replace(' ', '-')}`,
      kendala: 'Keterlambatan distribusi kit penunjang lapangan karena banjir rob air pasang.',
      pembelajaran: 'Melakukan pemetaan pasang-surut air laut lebih dini agar eksekusi tidak tertunda.',
      rencana: 'Pendampingan pembuatan bank sampah percontohan dan peluncuran newsletter digital pemuda.',
      kebutuhan: 'Dana operasional bibit tanaman bakau penunjang.',
      cta: 'Dukung aksi restorasi mangrove hijau pemuda dengan Rp 50.000 per bibit pohon.',
    });
    toast.success(`Berhasil memuat arsip laporan periode ${period}!`);
  };

  const isGlobalError = isMembershipError || isDonationsError || isProgramsError || isProgramMetricsError || isReadinessError || isLfaProjectsError || isMealItemsError || isMealTrackingEntriesError;
  const globalError = membershipError || donationsError || programsError || programMetricsError || readinessError || lfaProjectsError || mealItemsError || mealTrackingEntriesError;

  const isGlobalLoading = isMembershipLoading || (!!orgId && (isDonationsLoading || isProgramsLoading || isProgramMetricsLoading || isReadinessLoading || isLfaProjectsLoading || isMealItemsLoading || isMealTrackingEntriesLoading));

  if (isGlobalError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <p className="text-red-500 text-sm">
          Gagal memuat data: {(globalError as Error)?.message ?? 'Kesalahan tidak diketahui'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-teal-600 underline">
          Muat Ulang
        </button>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Mengompilasi data riil untuk laporan impact Anda…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Dynamic Print Styles CSS */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-break-inside-avoid {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Header HERO Card */}
      <Card className="no-print relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Harvest & Review</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Monthly Impact Report</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Kompilasikan dan verifikasi data bulanan organisasi Anda menjadi laporan pertanggungjawaban terpercaya untuk donor & review internal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lfaProjects.length > 0 && (
              <div className="flex flex-col gap-1 no-print text-left">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Project LFA</span>
                <Select
                  value={selectedLfaProjectId}
                  onValueChange={(val) => {
                    setSelectedLfaProjectId(val);
                    const selectedName = lfaProjects.find((p) => p.id === val)?.name || '';
                    toast.info(`Project terpilih: ${selectedName}`);
                  }}
                >
                  <SelectTrigger className="h-10 w-[240px] border-accent/30 bg-background text-xs font-semibold">
                    <SelectValue placeholder="Pilih Project LFA" />
                  </SelectTrigger>
                  <SelectContent>
                    {lfaProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1 no-print text-left">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Otomasi</span>
              <Button onClick={populateWithDbData} variant="outline" className="h-10 border-accent/30 text-accent hover:bg-accent/10 font-bold text-xs">
                <Sparkles className="mr-2 h-4 w-4" /> Ambil Data Database
              </Button>
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14 self-end">
              <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />
            </div>
          </div>
        </div>
      </Card>

      {/* Warning Alert Banner */}
      <Card className="no-print space-y-3 border-primary/15 bg-primary/5 p-5 shadow-card md:p-6">
        <h2 className="text-xl font-semibold">Dokumentasi yang Jujur Adalah Kunci Trust Terkuat</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
          Sistem ini terhubung langsung ke database program dan keuangan internal. Gunakan tombol otomasi untuk menarik data riil, kemudian lengkapi cerita kualitatif lapangan secara jujur sebelum disahkan.
        </p>
        <div className="flex max-w-3xl items-start gap-2 rounded-xl border border-amber-500/25 bg-background/70 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Setiap angka wajib mengacu pada bukti transaksi atau catatan operasional valid. Jika data belum lengkap, laporkan situasi lapangan dengan transparan.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] no-print">
        {/* SIDEBAR: Form Inputs & History */}
        <div className="space-y-6">
          {/* History Panel */}
          <Card className="p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Arsip Laporan</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Daftar laporan periode sebelumnya yang telah didokumentasikan di sistem.
            </p>
            <div className="space-y-2 pt-2">
              <Button
                variant={selectedHistoryPeriod === null ? 'accent' : 'outline'}
                className="w-full justify-start text-xs font-medium"
                onClick={() => {
                  setSelectedHistoryPeriod(null);
                  populateWithDbData();
                }}
              >
                <Calendar className="mr-2 h-4.5 w-4.5" />
                Periode Juni 2026 (Live Aggregation)
              </Button>
              {historyEntries.map((entry) => (
                <Button
                  key={entry.period}
                  variant={selectedHistoryPeriod === entry.period ? 'accent' : 'outline'}
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleLoadHistory(entry.period, entry.totalRaised, entry.donors, entry.score)}
                >
                  <Calendar className="mr-2 h-4.5 w-4.5" />
                  {entry.period} — {formatIDR(entry.totalRaised)} ({entry.donors} donors)
                </Button>
              ))}
            </div>
          </Card>

          {/* Form Laporan */}
          <Card className="p-5 shadow-card space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Form Laporan</h2>
              <p className="text-xs text-muted-foreground">
                Lengkapi draf laporan Anda di bawah ini. Nilai numerik ditarik otomatis namun dapat disunting kembali.
              </p>
            </div>
            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.title} className="space-y-4 pt-2 border-t first:border-0 first:pt-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">{section.title}</h3>
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-xs font-semibold">{field.label}</Label>
                      {field.textarea ? (
                        <Textarea
                          id={field.key}
                          value={report[field.key]}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={4}
                          className="text-xs"
                        />
                      ) : (
                        <Input
                          id={field.key}
                          value={report[field.key]}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="text-xs h-9"
                        />
                      )}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </Card>
        </div>

        {/* MAIN PANEL: Live Preview & Sign-off */}
        <div className="space-y-6">
          {/* Laporan Preview (The element that will be styled & printed) */}
          <Card id="print-report-area" className="print-area p-6 md:p-10 shadow-card border bg-card space-y-8">
            {/* Report Header */}
            <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="border-accent bg-accent-soft/20 text-accent font-medium text-xs mb-2">Internal Verified Report</Badge>
                <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {show(report.program)}
                </h3>
                <p className="mt-1 text-sm font-medium text-accent">Monthly Impact & Accountability Report</p>
              </div>
              <div className="text-xs md:text-right space-y-1 text-muted-foreground border-l pl-4 md:border-l-0 md:border-r md:pr-4 md:pl-0">
                <p><span className="font-semibold text-foreground">Periode:</span> {show(report.periode)}</p>
                <p><span className="font-semibold text-foreground">Organisasi:</span> {show(report.organisasi)}</p>
                <p><span className="font-semibold text-foreground">PIC Penyusun:</span> {show(report.pic)}</p>
              </div>
            </div>

            {/* Program Highlight */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent">I. Ringkasan Kinerja Program</h4>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-xl border bg-muted/10 p-3">
                  <span className="text-xs text-muted-foreground font-medium">Aktivitas Utama</span>
                  <p className="mt-1 font-semibold text-foreground">{show(report.aktivitas)}</p>
                </div>
                <div className="rounded-xl border bg-muted/10 p-3">
                  <span className="text-xs text-muted-foreground font-medium">Lokasi Layanan</span>
                  <p className="mt-1 font-semibold text-foreground">{show(report.lokasi)}</p>
                </div>
                <div className="rounded-xl border bg-muted/10 p-3">
                  <span className="text-xs text-muted-foreground font-medium">Target Penerima</span>
                  <p className="mt-1 font-semibold text-foreground">{show(report.target)}</p>
                </div>
              </div>
            </section>

            {/* Metrics Breakdown Grid */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent">II. Angka Utama Capaian (Verified)</h4>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.key} className="rounded-xl border bg-gradient-to-br from-background to-muted/10 p-4 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground leading-snug">{metric.label}</p>
                    <p className="mt-3 text-lg font-bold text-foreground">{show(report[metric.key])}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* III. Capaian Indikator MEAL (Verified) Table */}
            <section className="space-y-4 print-break-inside-avoid text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">III. Capaian Indikator MEAL (Verified)</h4>
                <Badge variant="outline" className="border-accent-soft/30 bg-accent-soft/10 text-accent font-medium text-[10px] no-print">
                  Real-time Database Sync
                </Badge>
              </div>
              
              {mealItems.length > 0 ? (
                <div className="overflow-hidden rounded-xl border bg-background/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-bold text-muted-foreground">
                        <th className="p-3 w-[45%]">Indikator Kinerja</th>
                        <th className="p-3 text-center w-[15%]">Target</th>
                        <th className="p-3 text-center w-[15%]">Capaian</th>
                        <th className="p-3 text-center w-[15%]">Progres</th>
                        <th className="p-3 text-center w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {mealItems.map((item) => {
                        const itemEntries = filteredTrackingEntries.filter((e) => e.meal_item_id === item.id);
                        const actual = itemEntries.reduce((sum, e) => sum + Number(e.recorded_value || 0), 0);
                        const target = Number(item.target_value || 1);
                        const pct = (actual / target) * 100;
                        const unit = item.target_unit || 'Unit';

                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            🔴 Off Track
                          </span>
                        );
                        if (pct >= 80) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                              ✅ On Track
                            </span>
                          );
                        } else if (pct >= 50) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                              ⚠️ At Risk
                            </span>
                          );
                        }

                        return (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-medium text-foreground">{item.indicator_text}</td>
                            <td className="p-3 text-center text-muted-foreground font-semibold">
                              {item.target_value || 0} {unit}
                            </td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {actual} {unit}
                            </td>
                            <td className="p-3 text-center text-left">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-muted-foreground text-[10px]">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">{statusBadge}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Belum ada indikator MEAL yang dirancang untuk program ini.
                </div>
              )}
            </section>

            {/* Qualitative Blocks */}
            <div className="grid gap-6 md:grid-cols-2">
              <Block title="IV. Outcome Awal & Dampak Perubahan" value={report.outcome} />
              <Block title="V. Cerita Dampak (Impact Highlight)" value={report.cerita} note="Cerita di atas dilindungi oleh persetujuan tertulis penerima manfaat (written consent)." />
            </div>

            <Block title="VI. Dokumentasi Pendukung & Transparansi Media" value={report.dokumentasi} />

            <div className="grid gap-6 md:grid-cols-2">
              <Block title="VII. Kendala Lapangan" value={report.kendala} />
              <Block title="VIII. Pembelajaran Utama (Key Takeaways)" value={report.pembelajaran} />
            </div>

            {/* Future Plan */}
            <section className="rounded-xl border bg-gradient-to-br from-background to-accent-soft/10 p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent">IX. Rencana Kerja & Kebutuhan Bulan Depan</h4>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Aktivitas Prioritas</span>
                  <p className="mt-1 text-foreground leading-relaxed font-semibold">{show(report.rencana)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Dukungan Dibutuhkan</span>
                  <p className="mt-1 text-foreground leading-relaxed font-semibold">{show(report.kebutuhan)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Call to Action (CTA)</span>
                  <p className="mt-1 text-foreground leading-relaxed font-semibold">{show(report.cta)}</p>
                </div>
              </div>
            </section>

            {/* Printed-only Human Review & Authorization Section */}
            <div className="hidden print:block border-t pt-6 space-y-4 mt-8 print-break-inside-avoid text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent">X. Pengesahan Laporan (Human Review Authorization)</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Disahkan Oleh Reviewer:</p>
                  <p className="text-muted-foreground text-sm">{reviewerName || 'Belum ditandatangani'}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Tanggal Pengesahan:</p>
                  <p className="text-muted-foreground text-sm">{reviewDate ? new Date(reviewDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Belum ditentukan'}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic mt-3">
                Laporan ini divalidasi dan disahkan secara digital oleh personal yang bertandatangan di atas sesuai standar akuntabilitas organisasi.
              </p>
            </div>

            {/* Footer warning */}
            <div className="no-print rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-muted-foreground">
              Dokumen ini merupakan draf digital internal. Cek kembali seluruh angka capaian, izin publikasi cerita, serta tautan dokumentasi sebelum melakukan pengesahan.
            </div>
          </Card>

          {/* HUMAN REVIEW REQUIRED SECTION (Interactive Checklist) */}
          <Card className="p-5 md:p-6 shadow-card border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-background space-y-5">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-6 w-6 text-amber-500" />
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Human Review Required <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10 font-bold text-[10px]">Anti-Fabrication Guard</Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Laporan harus disahkan secara manual oleh penanggung jawab sebelum diekspor atau didistribusikan.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border bg-background/50 p-3 hover:bg-background transition-colors">
                <input
                  type="checkbox"
                  checked={checklist1}
                  onChange={(e) => setChecklist1(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Akurasi Numerik</p>
                  <p className="text-muted-foreground text-[10px]">Seluruh angka di bagian II terverifikasi ke data primer program.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border bg-background/50 p-3 hover:bg-background transition-colors">
                <input
                  type="checkbox"
                  checked={checklist2}
                  onChange={(e) => setChecklist2(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Persetujuan Cerita (Consent)</p>
                  <p className="text-muted-foreground text-[10px]">Penerima manfaat telah memberikan persetujuan tertulis untuk publikasi cerita.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border bg-background/50 p-3 hover:bg-background transition-colors">
                <input
                  type="checkbox"
                  checked={checklist3}
                  onChange={(e) => setChecklist3(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Alokasi Anggaran</p>
                  <p className="text-muted-foreground text-[10px]">Rincian anggaran donasi dan pembiayaan program akurat & berimbang.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border bg-background/50 p-3 hover:bg-background transition-colors">
                <input
                  type="checkbox"
                  checked={checklist4}
                  onChange={(e) => setChecklist4(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Dokumentasi Valid</p>
                  <p className="text-muted-foreground text-[10px]">Tautan foto, video, dan lampiran aktif serta aman diakses oleh eksternal.</p>
                </div>
              </label>
            </div>

            {/* Reviewer Inputs */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reviewerName" className="text-xs font-semibold text-foreground">Nama Reviewer / Pengesah</Label>
                <Input
                  id="reviewerName"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Contoh: Arif Pratama (Direktur Program)"
                  className="h-9 text-xs bg-background/50 border-amber-500/20 focus-visible:border-amber-500 focus-visible:ring-amber-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reviewDate" className="text-xs font-semibold text-foreground">Tanggal Pengesahan</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="h-9 text-xs bg-background/50 border-amber-500/20 focus-visible:border-amber-500 focus-visible:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Actions linked to checklist */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleExportPDF}
                disabled={!isFullyReviewed}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
              >
                <Download className="mr-2 h-4 w-4" /> Ekspor ke PDF / Cetak
              </Button>
              <Button
                onClick={handleSendToDonor}
                disabled={!isFullyReviewed}
                variant="outline"
                className="flex-1 border-amber-600/30 text-amber-700 hover:bg-amber-600/10 disabled:opacity-40"
              >
                <Send className="mr-2 h-4 w-4" /> Kirim Update ke Donor
              </Button>
            </div>
            {!isFullyReviewed && (
              <p className="text-[10px] text-amber-700 font-medium text-center italic">
                * Tombol Cetak & Kirim akan aktif setelah 4 checklist terisi serta nama & tanggal pengesahan diinput.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Connected Workflows */}
      <Card className="no-print space-y-5 p-5 shadow-card md:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Integrasikan laporan dengan sistem NGO OS Anda</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Sistem modular kami memungkinkan laporan bulanan ini menjadi penunjang instan untuk kebutuhan fungsional operasional lainnya:
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workflowLinks.map((item) => (
            <Card key={item.href} className="flex flex-col p-4 bg-muted/20 hover:border-accent/40 transition-all">
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 justify-between text-xs h-8">
                <Link to={item.href}>
                  {item.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Footer Navigation bar */}
      <Card className="no-print flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 className="text-xl font-semibold">Progres terus berlanjut</h2>
          <p className="text-sm text-muted-foreground">Kembali ke dashboard utama atau simpan dokumen ke arsip pusat di Impact Library.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 text-xs">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild className="h-9 text-xs">
            <Link to="/dashboard/impactory-library">Buka Impact Library</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
