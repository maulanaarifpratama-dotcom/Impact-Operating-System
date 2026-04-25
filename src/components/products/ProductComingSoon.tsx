import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Loader2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ProductMeta } from '@/lib/brand';

interface FeaturePreview {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface RoadmapItem {
  quarter: string;
  title: string;
  status: 'done' | 'building' | 'planned';
}

interface ProductComingSoonProps {
  product: ProductMeta;
  features: FeaturePreview[];
  roadmap: RoadmapItem[];
  heroEyebrow?: string;
}

const statusStyles: Record<RoadmapItem['status'], string> = {
  done: 'bg-accent/15 text-accent border-accent/30',
  building: 'bg-primary/10 text-primary border-primary/20',
  planned: 'bg-muted text-muted-foreground border-border',
};

const statusLabel: Record<RoadmapItem['status'], string> = {
  done: 'Selesai',
  building: 'Sedang dibangun',
  planned: 'Direncanakan',
};

export function ProductComingSoon({
  product,
  features,
  roadmap,
  heroEyebrow,
}: ProductComingSoonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const ProductIcon = product.icon;

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('waitlist').insert({
        email,
        interest: product.key,
        source: 'dashboard_product_page',
      });
      if (error && !error.message.toLowerCase().includes('duplicate')) {
        throw error;
      }
      setDone(true);
      toast({
        title: 'Tercatat!',
        description: `Kami akan mengabari Anda saat ${product.name} siap.`,
      });
    } catch (err: any) {
      toast({
        title: 'Gagal menyimpan',
        description: err.message ?? 'Coba lagi sebentar.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Kembali ke dashboard
          </Link>
        </Button>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-8 shadow-card md:p-10">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-20 md:w-20">
            <ProductIcon className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="space-y-3">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
              <Sparkles className="mr-1 h-3 w-3" />
              {heroEyebrow ?? `Rilis ${product.releaseLabel}`}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
            <p className="text-base text-muted-foreground md:text-lg">{product.longDescription}</p>
          </div>
        </div>
      </Card>

      {/* Notify form */}
      <Card className="p-6 shadow-card md:p-7">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Dapat notifikasi saat siap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kami akan kirim email begitu {product.name} dibuka untuk early access.
            </p>
            {done ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/50 px-4 py-3 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>
                  Email Anda tercatat. Pantau inbox di sekitar <strong>{product.releaseLabel}</strong>.
                </span>
              </div>
            ) : (
              <form onSubmit={handleNotify} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  required
                  placeholder="email@organisasi.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sm:flex-1"
                  disabled={submitting}
                />
                <Button type="submit" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Beritahu saya
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </Card>

      {/* Features preview */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Apa yang akan Anda dapatkan</h2>
            <p className="text-sm text-muted-foreground">Fitur inti yang sedang kami siapkan.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Roadmap</h2>
        <p className="text-sm text-muted-foreground">Tahapan menuju peluncuran.</p>
        <Card className="mt-4 divide-y divide-border p-0 shadow-card">
          {roadmap.map((item) => (
            <div key={item.quarter + item.title} className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <span className="inline-flex min-w-[68px] justify-center rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {item.quarter}
                </span>
                <span className="font-medium">{item.title}</span>
              </div>
              <Badge variant="outline" className={statusStyles[item.status]}>
                {statusLabel[item.status]}
              </Badge>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}