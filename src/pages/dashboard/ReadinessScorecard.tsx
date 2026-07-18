import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  Sparkles, 
  Download, 
  Info, 
  Target, 
  ClipboardList, 
  HelpCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type GrowthCode = 'G' | 'R' | 'O' | 'W' | 'T' | 'H';

interface ScoreCategory {
  code: GrowthCode;
  title: string;
  description: string;
  items: string[];
}

const SCORE_LABELS = ['Belum ada', 'Sangat awal', 'Mulai ada', 'Cukup berjalan', 'Baik', 'Siap scale'];

const CATEGORIES: ScoreCategory[] = [
  {
    code: 'G',
    title: 'G — Grant Readiness',
    description: 'Fondasi legal, profil, website, email, dan PIC digital.',
    items: [
      'Dokumen legal utama tersedia dan mudah ditemukan',
      'Profil organisasi 1 halaman tersedia',
      'Website aktif dan menjelaskan program utama',
      'Email organisasi/PIC aktif',
      'PIC digital/fundraising sudah ditentukan',
    ],
  },
  {
    code: 'R',
    title: 'R — Resource Access',
    description: 'Akses ke platform nonprofit dan owner per platform.',
    items: [
      'TechSoup / akses software nonprofit sudah dipetakan',
      'Goodstack / verifikasi organisasi sudah dipetakan',
      'Canva for Nonprofits sudah aktif atau dalam proses',
      'Google for Nonprofits / Google Ads Grant sudah aktif atau dalam proses',
      'Microsoft for Nonprofits / Azure credit sudah aktif atau dalam proses',
    ],
  },
  {
    code: 'O',
    title: 'O — Operating Library',
    description: 'Dokumen dan aset organisasi menjadi library yang bisa dipakai ulang.',
    items: [
      'Folder kerja organisasi memiliki struktur yang jelas',
      'Proposal lama tersimpan rapi',
      'Laporan impact/program tersimpan rapi',
      'Template campaign/proposal tersedia',
      'Cerita penerima manfaat/dokumentasi terarsip dengan aman',
    ],
  },
  {
    code: 'W',
    title: 'W — Workflow Engine',
    description: 'Peluang grant dan proposal dikelola sebagai pipeline.',
    items: [
      'Daftar peluang grant aktif tersedia',
      'Setiap grant memiliki source URL/deadline/eligibility',
      'Prioritas grant ditentukan berdasarkan fit',
      'Draft proposal tidak selalu mulai dari nol dan memiliki proses review sebelum submit',
    ],
  },
  {
    code: 'T',
    title: 'T — Traction Engine',
    description: 'Campaign, donor, dan follow-up mulai terukur.',
    items: [
      'Campaign utama memiliki brief',
      'Landing page/CTA campaign tersedia',
      'Donor/contact list tersimpan terstruktur',
      'Follow-up donor dilakukan setelah campaign',
      'Materi visual campaign tersedia',
    ],
  },
  {
    code: 'H',
    title: 'H — Harvest & Review',
    description: 'Impact, laporan, dan review bulanan menjadi operating rhythm.',
    items: [
      'Data output program dicatat',
      'Monthly impact report pernah dibuat',
      'Dashboard sederhana tersedia',
      'Review bulanan dilakukan',
    ],
  },
];

const ACTIONS: Record<GrowthCode, string> = {
  G: 'Rapikan dokumen legal, profil organisasi, website/email, dan PIC digital.',
  R: 'Petakan akses TechSoup, Goodstack, Canva, Google, Microsoft, dan tetapkan owner.',
  O: 'Bangun Impact Library agar proposal, laporan, template, dan cerita impact bisa dipakai ulang.',
  W: 'Bangun Grant Pipeline dengan source URL, deadline, eligibility, confidence, dan next action.',
  T: 'Buat campaign brief, CTA, donor list, dan follow-up sederhana.',
  H: 'Mulai monthly impact report and review bulanan agar sistem tidak berhenti.',
};

const HELPER_TEXTS: Record<string, string> = {
  'G-0': 'Donor internasional hampir selalu meminta dokumen AD/ART, SK Kemenkumham, dan Akta di tahap awal.',
  'G-1': 'Mempermudah perkenalan cepat dengan mitra strategis atau lembaga donor potensial.',
  'G-2': 'Membangun kepercayaan publik dan transparansi akuntabilitas publik secara digital.',
  'G-3': 'Menghindari email pribadi masuk spam dan terlihat kredibel menggunakan domain resmi.',
  'G-4': 'Sistem membutuhkan penanggung jawab khusus untuk mengeksekusi peluang harian.',
  'R-0': 'Buka akses ke donasi software bernilai ratusan juta dari provider besar secara gratis.',
  'R-1': 'Gerbang utama untuk diverifikasi oleh platform filantropi korporat global.',
  'R-2': 'Akses Canva Pro gratis untuk mempermudah tim membuat materi publikasi yang premium.',
  'R-3': 'Buka kuota iklan penelusuran Google Ads gratis senilai USD 10.000 setiap bulan.',
  'R-4': 'Akses sistem cloud gratis untuk database dan infrastruktur server operasional NGO.',
  'O-0': 'Menghilangkan kebingungan tim mencari file penting dan mempercepat on-boarding.',
  'O-1': 'Menjadi referensi berharga agar tidak perlu menulis proposal baru dari nol.',
  'O-2': 'Bukti rekam jejak nyata yang sering diminta oleh auditor dan prospective donors.',
  'O-3': 'Standardisasi penulisan untuk menjaga kualitas narasi publikasi NGO Anda.',
  'O-4': 'Bahan bakar utama untuk menyusun narasi "storytelling" yang menyentuh hati donor.',
  'W-0': 'Memetakan semua peluang pendanaan potensial sebelum melewati batas deadline.',
  'W-1': 'Data yang lengkap menyaring kelayakan dan meminimalkan kesalahan administratif.',
  'W-2': 'Fokus pada peluang dengan peluang menang tertinggi agar energi tim efisien.',
  'W-3': 'Menghindari kesalahan faktual dengan mewajibkan review manusia sebelum final submit.',
  'T-0': 'Menyelaraskan pesan, target audiens, dan tujuan kampanye untuk semua anggota tim.',
  'T-1': 'Memberikan petunjuk jalan yang jelas bagi publik untuk berdonasi atau berparticipasi.',
  'T-2': 'Aset berharga untuk memelihara hubungan jangka panjang dengan pendukung NGO Anda.',
  'T-3': 'Mengubah donor satu kali menjadi pendukung setia dengan apresiasi yang tulus.',
  'T-4': 'Meningkatkan daya tarik dan engagement kampanye di berbagai kanal digital.',
  'H-0': 'Dasar dari kredibilitas laporan dampak berbasis data numerik yang akurat.',
  'H-1': 'Menjaga komunikasi rutin dan bukti akuntabilitas reguler kepada para stakeholder.',
  'H-2': 'Memudahkan pemantauan kesehatan program dan keuangan secara real-time.',
  'H-3': 'Mengevaluasi tantangan dan pencapaian operasional bulanan secara konsisten.',
};

const LIKERT_QUESTIONS = [
  {
    id: 1,
    criteria: 'Relevansi (Relevance)',
    question: 'Sejauh mana program didesain berdasarkan analisis kebutuhan nyata di lapangan dan selaras dengan mandat serta misi organisasi?',
    tooltip: 'Seberapa selaras program dengan kebutuhan riil penerima manfaat dan prioritas donor?',
  },
  {
    id: 2,
    criteria: 'Efektivitas (Effectiveness)',
    question: 'Sejauh mana program memiliki target indikator kinerja (MEAL) yang didefinisikan dengan jelas, lengkap dengan pelacakan data real-time?',
    tooltip: 'Apakah pencapaian luaran (outputs) dan hasil (outcomes) dipantau secara konsisten?',
  },
  {
    id: 3,
    criteria: 'Efisiensi (Efficiency)',
    question: 'Sejauh mana alokasi dana, waktu kerja, dan sumber daya kapasitas tim dikelola dengan optimal, akuntabel, dan transparan?',
    tooltip: 'Apakah pemanfaatan anggaran dilakukan secara hemat energi dengan akuntabilitas perbandingan rencana vs realisasi?',
  },
  {
    id: 4,
    criteria: 'Dampak (Impact)',
    question: 'Sejauh mana intervensi program didesain secara strategis untuk menghasilkan kontribusi perubahan sosial/sistemik jangka panjang?',
    tooltip: 'Apakah program memiliki Teori Perubahan (Theory of Change) yang terpetakan jelas menuju dampak jangka panjang?',
  },
  {
    id: 5,
    criteria: 'Keberlanjutan (Sustainability)',
    question: 'Sejauh mana program memiliki strategi exit-strategy, kemitraan lokal yang kuat, atau model transisi agar manfaat tetap berjalan mandiri?',
    tooltip: 'Apakah penerima manfaat atau lembaga lokal memiliki kepemilikan untuk melanjutkan manfaat setelah bantuan luar dihentikan?',
  },
];

function getLevel(score: number) {
  if (score <= 35) {
    return {
      title: 'Masih manual',
      description: 'Banyak pekerjaan masih bergantung pada orang tertentu dan belum menjadi sistem.',
    };
  }
  if (score <= 70) {
    return {
      title: 'Tools ada, sistem belum',
      description: 'Beberapa akses dan tools sudah ada, tetapi belum terhubung menjadi workflow.',
    };
  }
  if (score <= 105) {
    return {
      title: 'Sistem mulai jalan',
      description: 'Beberapa workflow sudah berulang, tetapi masih perlu dirapikan agar bisa scale.',
    };
  }
  return {
    title: 'Siap scale',
    description: 'Fondasi, workflow, campaign, dan review sudah cukup kuat untuk ditingkatkan.',
  };
}

function getImpactReadinessLevel(score: number) {
  if (score <= 10) {
    return {
      title: 'Activity-Driven (Kematangan Awal)',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      description: 'Sistem berfokus penuh pada penyelesaian aktivitas lapangan harian tanpa pelacakan capaian jangka panjang yang terstruktur.',
    };
  }
  if (score <= 18) {
    return {
      title: 'Output-Driven (Kematangan Menengah)',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      description: 'Sistem mulai berorientasi pada pencapaian luaran/output manfaat langsung. Indikator kuantitatif mulai diukur secara berkala.',
    };
  }
  return {
    title: 'Impact-Driven (Kematangan Tinggi)',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Sistem berorientasi penuh pada pencapaian dampak sistemik jangka panjang berkelanjutan. Teori Perubahan berjalan dalam operating rhythm.',
  };
}

function itemId(category: GrowthCode, index: number) {
  return `${category}-${index}`;
}

export default function ReadinessScorecard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const tabFromUrl = searchParams.get('tab');
  const defaultTab = tabFromUrl === 'program' || tabFromUrl === 'impact_readiness' ? 'impact_readiness' : 'baseline';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (tabFromUrl === 'program' || tabFromUrl === 'impact_readiness') {
      setActiveTab('impact_readiness');
    } else {
      setActiveTab('baseline');
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value === 'impact_readiness' ? 'program' : 'baseline' });
  };

  // 1. Organization context
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
    return (membership as { organization_id: string })?.organization_id;
  }, [membership]);

  // Tab 1 (Baseline) States
  const [scores, setScores] = useState<Record<string, number>>({});

  // Load persistent baseline scores
  const { data: dbScores, isLoading: isScoresLoading, isError: isScoresError, error: scoresError, refetch: refetchScores } = useQuery({
    queryKey: ['readiness_scores', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (dbScores?.details) {
      setScores(dbScores.details as Record<string, number>);
    } else {
      setScores({});
    }
  }, [dbScores]);

  // Tab 2 (Impact Readiness Assessment) States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('org_level');

  const activeProjectId = selectedProjectId === 'org_level' ? null : selectedProjectId;

  // Query projects for dropdown
  const { data: projects = [], isLoading: isProjectsLoading, isError: isProjectsError, error: projectsError } = useQuery({
    queryKey: ['lfa_projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('id, name')
        .eq('org_id', orgId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Query existing active assessment
  const { data: assessment, isLoading: isAssessmentLoading, isError: isAssessmentError, error: assessmentError, refetch: refetchAssessment } = useQuery({
    queryKey: ['impact_readiness_assessment', orgId, activeProjectId],
    queryFn: async () => {
      if (!orgId) return null;
      const query = supabase
        .from('impact_readiness_assessments')
        .select('*')
        .eq('org_id', orgId);
      
      if (activeProjectId) {
        query.eq('lfa_project_id', activeProjectId);
      } else {
        query.is('lfa_project_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Likert Scores States
  const [scoreQ1, setScoreQ1] = useState<number | null>(null);
  const [scoreQ2, setScoreQ2] = useState<number | null>(null);
  const [scoreQ3, setScoreQ3] = useState<number | null>(null);
  const [scoreQ4, setScoreQ4] = useState<number | null>(null);
  const [scoreQ5, setScoreQ5] = useState<number | null>(null);

  useEffect(() => {
    if (assessment) {
      setScoreQ1(assessment.score_q1);
      setScoreQ2(assessment.score_q2);
      setScoreQ3(assessment.score_q3);
      setScoreQ4(assessment.score_q4);
      setScoreQ5(assessment.score_q5);
    } else {
      setScoreQ1(null);
      setScoreQ2(null);
      setScoreQ3(null);
      setScoreQ4(null);
      setScoreQ5(null);
    }
  }, [assessment]);

  const totalScoreAssessment = useMemo(() => {
    return (scoreQ1 ?? 0) + (scoreQ2 ?? 0) + (scoreQ3 ?? 0) + (scoreQ4 ?? 0) + (scoreQ5 ?? 0);
  }, [scoreQ1, scoreQ2, scoreQ3, scoreQ4, scoreQ5]);

  const assessmentMaturity = useMemo(() => {
    return getImpactReadinessLevel(totalScoreAssessment);
  }, [totalScoreAssessment]);

  // Tab 1 Calculations
  const result = useMemo(() => {
    const categoryScores = CATEGORIES.map((category, order) => {
      const score = category.items.reduce((sum, _, index) => sum + (scores[itemId(category.code, index)] ?? 0), 0);
      const max = category.items.length * 5;

      return {
        code: category.code,
        order,
        score,
        max,
        ratio: max === 0 ? 0 : score / max,
      };
    });

    const total = categoryScores.reduce((sum, category) => sum + category.score, 0);
    const nextActions = [...categoryScores]
      .sort((a, b) => a.ratio - b.ratio || a.order - b.order)
      .slice(0, 3)
      .map((category) => ACTIONS[category.code]);

    return {
      total,
      level: getLevel(total),
      categoryScores,
      nextActions,
    };
  }, [scores]);

  const narrativeResult = useMemo(() => {
    if (result.total === 0) {
      return "Silakan isi scorecard di bawah ini untuk melihat ulasan evaluasi kesiapan organisasi Anda secara naratif.";
    }

    const sortedCats = [...result.categoryScores].map(cat => {
      const fullCat = CATEGORIES.find(c => c.code === cat.code);
      return {
        ...cat,
        title: fullCat?.title.split(' — ')[1] || cat.code,
      };
    });

    const strongest = [...sortedCats].sort((a, b) => b.ratio - a.ratio || b.order - a.order)[0];
    const weakest = [...sortedCats].sort((a, b) => a.ratio - b.ratio || a.order - b.order)[0];

    let desc = `Organisasi Anda menunjukkan kesiapan tinggi di area ${strongest.title} (${strongest.score}/${strongest.max}). `;
    if (weakest.code !== strongest.code) {
      desc += `Area yang perlu diperkuat: ${weakest.title} (${weakest.score}/${weakest.max}). Lihat rekomendasi untuk panduan taktis memperkuat operating system NGO Anda.`;
    } else {
      desc += `Semua area pertumbuhan NGO Anda saat ini berada pada tingkat kesiapan yang seimbang. Teruskan penguatan fondasi sistem operasional secara menyeluruh!`;
    }
    return desc;
  }, [result]);

  const setScore = async (id: string, value: number) => {
    if (!orgId || !user?.id) return;

    const updatedScores = { ...scores, [id]: value };
    setScores(updatedScores);

    const catScores: Record<string, number> = {};
    CATEGORIES.forEach((category) => {
      catScores[category.code] = category.items.reduce((sum, _, index) => {
        const key = itemId(category.code, index);
        return (sum ?? 0) + (updatedScores[key] ?? 0);
      }, 0);
    });

    try {
      const { error } = await supabase
        .from('readiness_scores')
        .upsert({
          organization_id: orgId,
          scored_by: user.id,
          score_g: catScores['G'] || 0,
          score_r: catScores['R'] || 0,
          score_o: catScores['O'] || 0,
          score_w: catScores['W'] || 0,
          score_t: catScores['T'] || 0,
          score_h: catScores['H'] || 0,
          details: updatedScores,
        }, { onConflict: 'organization_id' });

      if (error) throw error;
      void refetchScores();
      toast.success('Skor berhasil disimpan');
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ReadinessScorecard] Save error:', err);
      toast.error('Gagal menyimpan skor: ' + ((err as Error)?.message ?? 'Silakan coba lagi.'));
    }
  };

  const handleReset = async () => {
    if (!orgId) return;
    setScores({});
    try {
      const { error } = await supabase
        .from('readiness_scores')
        .delete()
        .eq('organization_id', orgId);
      if (error) throw error;
      void refetchScores();
      toast.success('Baseline berhasil di-reset');
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ReadinessScorecard] Reset error:', err);
      toast.error('Gagal me-reset baseline: ' + ((err as Error)?.message ?? 'Silakan coba lagi.'));
    }
  };

  // Mutate Impact Readiness Scores
  const saveAssessmentScore = async (qNum: 1 | 2 | 3 | 4 | 5, value: number) => {
    if (!orgId || !user?.id) {
      toast.error('Gagal menyimpan: Sesi tidak valid.');
      return;
    }

    const currentScores = {
      q1: qNum === 1 ? value : scoreQ1,
      q2: qNum === 2 ? value : scoreQ2,
      q3: qNum === 3 ? value : scoreQ3,
      q4: qNum === 4 ? value : scoreQ4,
      q5: qNum === 5 ? value : scoreQ5,
    };

    if (qNum === 1) setScoreQ1(value);
    if (qNum === 2) setScoreQ2(value);
    if (qNum === 3) setScoreQ3(value);
    if (qNum === 4) setScoreQ4(value);
    if (qNum === 5) setScoreQ5(value);

    const payload = {
      org_id: orgId,
      lfa_project_id: activeProjectId,
      score_q1: currentScores.q1 ?? 3,
      score_q2: currentScores.q2 ?? 3,
      score_q3: currentScores.q3 ?? 3,
      score_q4: currentScores.q4 ?? 3,
      score_q5: currentScores.q5 ?? 3,
    };

    try {
      const { error } = await supabase
        .from('impact_readiness_assessments')
        .upsert(payload, { onConflict: 'org_id,lfa_project_id' });
      if (error) throw error;
      
      toast.success('Kemajuan asesmen kesiapan dampak berhasil disimpan!');
      void refetchAssessment();
      queryClient.invalidateQueries({ queryKey: ['impact_readiness_assessments', orgId] });
    } catch (err: any) {
      console.error('Failed to save assessment score:', err);
      toast.error(`Gagal menyimpan asesmen: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isGlobalError = isMembershipError || isScoresError || isProjectsError || isAssessmentError;
  const globalError = membershipError || scoresError || projectsError || assessmentError;

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

  const isGlobalLoading = isMembershipLoading || (!!orgId && (isScoresLoading || isProjectsLoading || isAssessmentLoading));

  if (isGlobalLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat profil organisasi…</p>
        </div>
      </div>
    );
  }

  const selectedProjectName = selectedProjectId === 'org_level' 
    ? 'Tingkat Organisasi (Sistem Utama)' 
    : projects.find(p => p.id === selectedProjectId)?.name || 'Program';

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="mx-auto max-w-6xl space-y-6">
      {/* Dynamic Print Sheet Styles for Professional Look */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          header, footer, nav, .no-print, [role="tablist"], aside, button {
            display: none !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>

      {/* Sticky Progress Header - HIDE DURING PRINT */}
      <div className="sticky top-[56px] z-40 -mx-4 md:-mx-8 border-b bg-background/95 p-3.5 backdrop-blur shadow-sm overflow-x-auto no-print">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operating Mode:</span>
            <TabsList className="bg-muted p-1 h-9 rounded-lg">
              <button 
                type="button"
                onClick={() => handleTabChange('baseline')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                  activeTab === 'baseline' ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                📋 Baseline Kesiapan
              </button>
              <button 
                type="button"
                onClick={() => handleTabChange('impact_readiness')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                  activeTab === 'impact_readiness' ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                🎯 Kesiapan Dampak Program
              </button>
            </TabsList>
          </div>
          
          {activeTab === 'baseline' ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Evaluasi:</span>
              <span className="text-sm font-extrabold text-accent">{result.total}/140</span>
              <span className="text-[11px] font-bold text-muted-foreground bg-muted border px-2 py-0.5 rounded-full">
                {result.level.title}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Evaluasi Dampak:</span>
              <span className="text-sm font-extrabold text-accent">{totalScoreAssessment}/25</span>
              <span className={cn("text-[11px] font-bold border px-2 py-0.5 rounded-full", assessmentMaturity.bgColor, assessmentMaturity.color)}>
                {totalScoreAssessment === 0 ? 'Belum Diisi' : assessmentMaturity.title.split(' (')[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* HERO Banner */}
      <section className="rounded-2xl border bg-gradient-hero p-6 text-white shadow-elegant md:p-8 relative overflow-hidden print-container">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl no-print" />
        <Badge className="border-white/30 bg-white/15 text-white hover:bg-white/15">G.R.O.W.T.H. Scorecard</Badge>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
          {activeTab === 'baseline' ? 'Readiness Scorecard' : 'Impact Readiness Assessment'}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
          {activeTab === 'baseline' 
            ? 'Ukur kesiapan NGO Anda membangun sistem growth dan impact berbasis G.R.O.W.T.H. System.'
            : 'Audit mendalam tingkat kematangan desain dampak program Anda menggunakan kriteria internasional OECD-DAC.'}
        </p>
      </section>

      {/* CONTENT TABS PANEL */}
      <div className="w-full">
        {/* ==================== TAB 1: BASELINE KESIAPAN ==================== */}
        <TabsContent value="baseline" className="space-y-6 focus:outline-none">
          <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card no-print">
            <p className="text-sm leading-6 text-muted-foreground">
              Scorecard ini bukan untuk membandingkan organisasi Anda dengan NGO lain. Ini baseline untuk melihat posisi hari
              ini dan menentukan prioritas 90 hari ke depan.
            </p>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              {CATEGORIES.map((category) => {
                const categoryScore = result.categoryScores.find((item) => item.code === category.code);

                return (
                  <Card key={category.code} className="p-5 shadow-card">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">{category.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <Badge variant="outline" className="w-fit font-bold border-accent/30 text-accent">
                        {categoryScore?.score ?? 0} / {categoryScore?.max ?? category.items.length * 5}
                      </Badge>
                    </div>

                    <div className="mt-5 space-y-4">
                      {category.items.map((item, index) => {
                        const id = itemId(category.code, index);
                        const value = scores[id] ?? 0;
                        const helper = HELPER_TEXTS[id];

                        return (
                          <div key={id} className="rounded-lg border bg-muted/20 p-4 transition-all duration-300 hover:border-accent/20 hover:bg-muted/30">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-snug">{item}</p>
                                {helper && (
                                  <p className="mt-1 text-xs text-muted-foreground italic leading-relaxed">
                                    {helper}
                                  </p>
                                )}
                                <p className="mt-2 text-xs font-bold text-accent">
                                  Skor saat ini: {value} ({SCORE_LABELS[value]})
                                </p>
                              </div>
                              
                              {/* Segmented Control Touch Target */}
                              <div className="flex w-full md:w-auto items-center overflow-hidden rounded-lg border border-border bg-background p-0.5 shadow-sm" aria-label={`Skor untuk ${item}`}>
                                {[0, 1, 2, 3, 4, 5].map((score) => (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => setScore(id, score)}
                                    className={cn(
                                      'flex-1 md:flex-initial flex items-center justify-center h-10 min-w-[2.75rem] px-2 text-xs font-bold transition-all',
                                      value === score
                                        ? 'bg-[brand-border] text-white rounded-md shadow-sm font-extrabold'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                    aria-pressed={value === score}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start no-print">
              {/* Narrative Summary Card */}
              <Card className="p-5 shadow-card border-[brand-border]/30 bg-gradient-to-b from-[brand-active]/5 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 h-12 w-12 bg-accent-soft text-accent/10 -mr-3 -mt-3 transform rotate-12 pointer-events-none">
                  <Sparkles className="h-12 w-12 animate-pulse" />
                </div>
                
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Analisis Kesiapan</p>
                
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                    Total G.R.O.W.T.H. Score:
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-foreground">{result.total}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/ 140</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/30 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5">Hasil Evaluasi</p>
                  <p className="text-xs font-bold text-foreground mb-1 leading-snug">{result.level.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {narrativeResult}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full h-9 text-xs font-bold border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset skor baseline
                </Button>
              </Card>

              <Card className="p-5 shadow-card">
                <h2 className="font-semibold text-sm">Top 3 Next Actions</h2>
                <div className="mt-4 space-y-3">
                  {result.nextActions.map((action, idx) => (
                    <div key={action} className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 shadow-card">
                <h2 className="font-semibold text-sm">Langkah berikutnya</h2>
                <div className="mt-4 space-y-2">
                  <Button asChild variant="outline" className="w-full h-9 text-xs justify-between border-border hover:bg-muted">
                    <Link to="/dashboard">
                      Kembali ke Dashboard
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-9 text-xs justify-between border-border hover:bg-muted">
                    <Link to="/dashboard/grantfinder">
                      Lanjut ke Grant Pipeline
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-9 text-xs justify-between border-border hover:bg-muted">
                    <Link to="/dashboard/impactory-library">
                      Rapikan Impact Library
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Scorecard ini adalah baseline internal. Gunakan untuk menentukan prioritas, bukan untuk menghakimi organisasi.
              </p>
            </aside>
          </div>
        </TabsContent>

        {/* ==================== TAB 2: IMPACT READINESS ASSESSMENT ==================== */}
        <TabsContent value="impact_readiness" className="space-y-6 focus:outline-none">
          {/* Controls - HIDE DURING PRINT */}
          <Card className="p-5 border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Cakupan Audit Dampak</span>
              <div className="flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-accent shrink-0" />
                <h3 className="text-sm font-bold text-foreground">Pilih Program / Tingkat Organisasi:</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-10 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground shadow-sm focus:border-accent focus:ring-1 focus:ring-accent w-full sm:w-64 focus:outline-none"
              >
                <option value="org_level">🏢 Tingkat Organisasi (Sistem Utama)</option>
                {(projects ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    🎯 Program: {project.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                onClick={handlePrint}
                className="h-10 text-xs font-bold border-accent/20 text-accent bg-accent/5 hover:bg-accent/10 border"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" /> PDF Report
              </Button>
            </div>
          </Card>

          {/* MAIN DUAL COLUMN DESIGN */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] print-container">
            
            {/* LIKERT STATEMENTS COLUMN */}
            <div className="space-y-5">
              <Card className="p-6 shadow-card border-border bg-card print-card">
                <div className="flex items-center gap-2 border-b border-border pb-4 mb-5">
                  <ClipboardList className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-bold text-foreground">OECD-DAC Alignment Self-Audit</h2>
                </div>

                <div className="space-y-6">
                  {LIKERT_QUESTIONS.map((item) => {
                    const value = item.id === 1 ? scoreQ1 
                                : item.id === 2 ? scoreQ2 
                                : item.id === 3 ? scoreQ3 
                                : item.id === 4 ? scoreQ4 
                                : scoreQ5;

                    return (
                      <div 
                        key={item.id} 
                        className="rounded-xl border bg-muted/10 p-5 border-border hover:border-accent/15 hover:bg-muted/20 transition-all duration-300"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <Badge className="bg-accent/10 border-accent/20 text-accent text-[9px] uppercase tracking-wider font-bold">
                                {item.criteria}
                              </Badge>
                              <h3 className="text-sm font-bold text-foreground leading-snug">
                                {item.question}
                              </h3>
                            </div>
                            
                            {/* OECD Criterion Tooltip Icon - HIDE DURING PRINT */}
                            <div className="relative group no-print shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-muted-foreground/60 hover:text-accent cursor-help" />
                              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white rounded-lg text-[11px] leading-relaxed shadow-elegant opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                <span className="font-bold block text-accent mb-1">OECD-DAC Indicator</span>
                                {item.tooltip}
                              </div>
                            </div>
                          </div>

                          {/* Likert 1-5 Selectors */}
                          <div className="pt-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mb-2 px-1">
                              <span>1 - Sangat Lemah</span>
                              <span>3 - Cukup</span>
                              <span>5 - Sangat Kuat</span>
                            </div>

                            {/* Radio selector blocks */}
                            <div className="grid grid-cols-5 gap-2" role="group" aria-label={`Skor untuk ${item.criteria}`}>
                              {[1, 2, 3, 4, 5].map((num) => {
                                const isSelected = value === num;
                                return (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => saveAssessmentScore(item.id as 1|2|3|4|5, num)}
                                    className={cn(
                                      "h-11 rounded-lg border text-xs font-extrabold flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm focus:ring-1 focus:ring-accent",
                                      isSelected
                                        ? "bg-[brand-border] text-white border-[brand-border] ring-1 ring-[brand-border]/30 font-black scale-[1.02]"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                    aria-pressed={isSelected}
                                  >
                                    <span className="text-sm">{num}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* OECDDAC Footnote Attribution */}
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-[11px] leading-relaxed text-muted-foreground space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Info className="h-3.5 w-3.5 text-accent shrink-0" />
                  Atribusi Metodologi & Standardisasi
                </div>
                <p>
                  Asesmen Kesiapan Dampak (Impact Readiness Assessment) ini disusun selaras dengan kriteria evaluasi program internasional yang dikeluarkan oleh <span className="font-semibold text-foreground">OECD Development Assistance Committee (DAC)</span> serta pedoman audit kesiapan dampak filantropi dari <span className="font-semibold text-foreground">INTRAC (International NGO Training and Research Centre)</span>.
                </p>
                <p>
                  Seluruh analisis, progress, dan model perhitungan tingkat kematangan dievaluasi secara otomatis berdasarkan standar tata kelola berbasis data (evidence-based evaluation) untuk meminimalkan bias subjektivitas program.
                </p>
              </div>
            </div>

            {/* DYNAMIC PROGRESS GAUGE COLUMN */}
            <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
              
              {/* GAUGE HEADER CARD */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-4">
                <div className="space-y-1 border-b border-border pb-3">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Audit Scorecard</span>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{selectedProjectName}</h3>
                </div>

                {/* Score display */}
                <div className="text-center py-4 bg-muted/20 border border-border/60 rounded-xl relative overflow-hidden">
                  <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Maturity Score</span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-4xl font-black text-foreground tracking-tight">{totalScoreAssessment}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/ 25</span>
                  </div>
                </div>

                {/* Premium 3-Zone Progress Bar */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Zona Kematangan Desain:</span>
                  <div className="flex h-5 w-full rounded-full overflow-hidden border border-border shadow-sm">
                    <div className="w-[30%] bg-rose-500/90 flex items-center justify-center text-[8px] font-black text-white leading-none uppercase">G.R. (5-10)</div>
                    <div className="w-[40%] bg-amber-500/90 flex items-center justify-center text-[8px] font-black text-white leading-none uppercase">OUT (11-18)</div>
                    <div className="w-[30%] bg-emerald-500/90 flex items-center justify-center text-[8px] font-black text-white leading-none uppercase">IMP (19-25)</div>
                  </div>
                  
                  {/* Score Indicator Needle */}
                  {totalScoreAssessment >= 5 && (
                    <div className="relative w-full h-8 no-print">
                      <div 
                        className="absolute flex flex-col items-center -translate-x-1/2 transition-all duration-500 ease-out"
                        style={{ left: `${Math.max(3, Math.min(97, ((totalScoreAssessment - 5) / 20) * 100))}%` }}
                      >
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[brand-active] dark:border-b-white" />
                        <span className="text-[9px] font-black bg-[brand-active] text-white px-2 py-0.5 rounded mt-1 shadow-sm whitespace-nowrap dark:bg-white dark:text-[brand-active]">
                          Skor: {totalScoreAssessment}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Level Detail Card */}
                {totalScoreAssessment > 0 && (
                  <div className={cn("rounded-xl border p-4 shadow-inner space-y-1.5", assessmentMaturity.bgColor)}>
                    <span className="text-[10px] font-bold uppercase tracking-widest block opacity-75">Tingkat Kematangan</span>
                    <h4 className={cn("text-xs font-black leading-snug", assessmentMaturity.color)}>
                      {assessmentMaturity.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {assessmentMaturity.description}
                    </p>
                  </div>
                )}
              </Card>

              {/* REPORT NARRATIVE CARD */}
              {totalScoreAssessment >= 5 && (
                <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground border-b border-border pb-2.5">
                    <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                    Rangkuman Naratif Audit
                  </div>
                  <div className="text-xs leading-relaxed text-muted-foreground space-y-2.5">
                    <p>
                      Berdasarkan audit evaluasi dampak, <span className="font-semibold text-foreground">{selectedProjectName}</span> tergolong dalam klasifikasi <span className="font-extrabold text-foreground">{assessmentMaturity.title.split(' (')[0]}</span>.
                    </p>
                    {totalScoreAssessment <= 10 ? (
                      <p>
                        Rekomendasi taktis: Fokus memformulasikan model logis program (ToC/LFA) sebelum mengeksekusi aktivitas lapangan berikutnya agar indikator hasil (outputs) dapat diukur secara andal.
                      </p>
                    ) : totalScoreAssessment <= 18 ? (
                      <p>
                        Rekomendasi taktis: Hubungkan data luaran/output digital Anda ke dalam alokasi budgeting dan database MEAL untuk menilai efisiensi konversi biaya terhadap realisasi capaian manfaat.
                      </p>
                    ) : (
                      <p>
                        Rekomendasi taktis: Pertahankan performa operating rhythm dan rancang mekanisme keberlanjutan lokal (exit strategy) agar model perubahan sosial program dapat terus scale secara mandiri.
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </aside>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
