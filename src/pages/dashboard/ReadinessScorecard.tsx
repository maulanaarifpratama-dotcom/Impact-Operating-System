import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
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
      'Draft proposal tidak selalu mulai dari nol',
      'Ada proses review sebelum submit',
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

  const orgId = membership?.organization_id;
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

  if (isMembershipLoading || isScoresLoading) {
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
                  <Badge variant="outline" className="w-fit">
                    {categoryScore?.score ?? 0} / {categoryScore?.max ?? category.items.length * 5}
                  </Badge>
                </div>

                <div className="mt-5 space-y-4">
                  {category.items.map((item, index) => {
                    const id = itemId(category.code, index);
                    const value = scores[id] ?? 0;

                    return (
                      <div key={id} className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium">{item}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{value} = {SCORE_LABELS[value]}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5" aria-label={`Skor untuk ${item}`}>
                            {[0, 1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setScore(id, score)}
                                className={cn(
                                  'h-8 w-8 rounded-md border text-xs font-medium transition-colors',
                                  value === score
                                    ? 'border-accent bg-accent text-accent-foreground'
                                    : 'bg-background text-muted-foreground hover:border-accent/60 hover:text-foreground',
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
          <Card className="p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Result</p>
            <h2 className="mt-2 text-2xl font-semibold">Skor Anda: {result.total} / 140</h2>
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <p className="font-semibold">{result.level.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{result.level.description}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={handleReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset skor
            </Button>
          </Card>

          <Card className="p-5 shadow-card">
            <h2 className="font-semibold">Top 3 Next Actions</h2>
            <div className="mt-4 space-y-3">
              {result.nextActions.map((action) => (
                <div key={action} className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {action}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 shadow-card">
            <h2 className="font-semibold">Langkah berikutnya</h2>
            <div className="mt-4 space-y-2">
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/dashboard">
                  Kembali ke Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/dashboard/grantfinder">
                  Lanjut ke Grant Pipeline
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/dashboard/impactory-library">
                  Rapikan Impact Library
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>

          <p className="text-xs leading-5 text-muted-foreground">
            Scorecard ini adalah baseline internal. Gunakan untuk menentukan prioritas, bukan untuk menghakimi organisasi.
          </p>
        </aside>
      </div>
    </div>
  );
}
