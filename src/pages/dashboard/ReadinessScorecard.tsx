import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  H: 'Mulai monthly impact report dan review bulanan agar sistem tidak berhenti.',
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
  'T-1': 'Memberikan petunjuk jalan yang jelas bagi publik untuk berdonasi atau berpartisipasi.',
  'T-2': 'Aset berharga untuk memelihara hubungan jangka panjang dengan pendukung NGO Anda.',
  'T-3': 'Mengubah donor satu kali menjadi pendukung setia dengan apresiasi yang tulus.',
  'T-4': 'Meningkatkan daya tarik dan engagement kampanye di berbagai kanal digital.',
  'H-0': 'Dasar dari kredibilitas laporan dampak berbasis data numerik yang akurat.',
  'H-1': 'Menjaga komunikasi rutin dan bukti akuntabilitas reguler kepada para stakeholder.',
  'H-2': 'Memudahkan pemantauan kesehatan program dan keuangan secara real-time.',
  'H-3': 'Mengevaluasi tantangan dan pencapaian operasional bulanan secara konsisten.',
};

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

function itemId(category: GrowthCode, index: number) {
  return `${category}-${index}`;
}

export default function ReadinessScorecard() {
  const { user } = useAuth();

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

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as { organization_id: string })?.organization_id;
  }, [membership]);

  const [scores, setScores] = useState<Record<string, number>>({});

  // Load persistent scores from Supabase
  const { data: dbScores, isLoading: isScoresLoading, refetch: refetchScores } = useQuery({
    queryKey: ['readiness_scores', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) {
        console.error('[ReadinessScorecard] error fetching scores:', error);
        throw error;
      }
      return data;
    },
    enabled: !!orgId,
  });

  // Synchronize database scores into local state
  useEffect(() => {
    if (dbScores?.details) {
      setScores(dbScores.details as Record<string, number>);
    } else {
      setScores({});
    }
  }, [dbScores]);

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

    // 1. Calculate the updated local scores state
    const updatedScores = { ...scores, [id]: value };
    setScores(updatedScores); // Optimistic UI update

    // 2. Calculate category sums for the db columns
    const catScores: Record<string, number> = {};
    CATEGORIES.forEach((category) => {
      catScores[category.code] = category.items.reduce((sum, _, index) => {
        const key = itemId(category.code, index);
        return sum + (updatedScores[key] ?? 0);
      }, 0);
    });

    try {
      // 3. Upsert to Supabase
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

      if (error) {
        console.error('[ReadinessScorecard] error saving scores:', error);
        toast.error('Gagal menyimpan skor ke server');
      } else {
        void refetchScores();
      }
    } catch (e) {
      console.error('[ReadinessScorecard] exception saving scores:', e);
    }
  };

  const handleReset = async () => {
    if (!orgId) return;
    setScores({}); // Optimistic UI reset
    try {
      const { error } = await supabase
        .from('readiness_scores')
        .delete()
        .eq('organization_id', orgId);
      if (error) {
        console.error('[ReadinessScorecard] error deleting scores:', error);
        toast.error('Gagal menghapus skor di server');
      } else {
        void refetchScores();
        toast.success('Baseline berhasil di-reset');
      }
    } catch (e) {
      console.error('[ReadinessScorecard] exception resetting scores:', e);
    }
  };

  if (isMembershipLoading || (!!orgId && isScoresLoading)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat profil organisasi…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Sticky Progress Header */}
      <div className="sticky top-[56px] z-40 -mx-4 md:-mx-8 border-b bg-background/95 p-3.5 backdrop-blur shadow-sm overflow-x-auto">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kategori:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {result.categoryScores.map((cat) => {
                const isComplete = cat.score === cat.max;
                const isStarted = cat.score > 0;
                return (
                  <span
                    key={cat.code}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all shadow-sm",
                      isComplete
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : isStarted
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}
                  >
                    {cat.code}: {cat.score}/{cat.max}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Evaluasi:</span>
            <span className="text-sm font-extrabold text-accent">{result.total}/140</span>
            <span className="text-[11px] font-bold text-muted-foreground bg-muted border px-2 py-0.5 rounded-full">
              {result.level.title}
            </span>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <Badge className="border-white/30 bg-white/15 text-white hover:bg-white/15">G.R.O.W.T.H. Baseline</Badge>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Readiness Scorecard</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
          Ukur kesiapan NGO Anda membangun sistem growth dan impact berbasis G.R.O.W.T.H.
        </p>
      </section>

      <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card">
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
                                    ? 'bg-emerald-500 text-white rounded-md shadow-sm font-extrabold'
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

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* Narrative Summary Card replacing Live Result */}
          <Card className="p-5 shadow-card border-[#155F66]/30 bg-gradient-to-b from-[#0F3D4F]/5 to-transparent relative overflow-hidden">
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
    </div>
  );
}
