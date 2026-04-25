import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/AuthProvider';
import { PRODUCTS } from '@/lib/brand';
import { Sparkles, Hammer, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const stageBadgeClass: Record<string, string> = {
  building: 'border-accent/40 bg-accent/15 text-accent',
  next: 'border-primary/30 bg-primary/10 text-primary',
  planned: 'border-border bg-muted text-muted-foreground',
  future: 'border-border bg-muted text-muted-foreground',
};

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const name = profile?.full_name || user?.email?.split('@')[0] || 'pembangun dampak';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Selamat datang, {name} 👋
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Foundation Impactory siap. Grant Writer akan dibangun di Chunk 2.
        </p>
      </div>

      <Card className="border-accent/30 bg-accent-soft/50 p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Foundation siap.</h2>
            <p className="mt-1 text-sm text-foreground/80">
              Database (profiles, organizations, subscriptions, audit log, dll) sudah ter-setup. Auth + RLS aktif.
              Chunk berikutnya akan menambahkan wizard <strong>Grant Writer</strong>, halaman Settings, dan Admin area.
            </p>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">Roadmap produk</h2>
        <p className="text-sm text-muted-foreground">Empat produk yang akan dirilis bertahap.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p.key}
              to={p.href}
              className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label={`Buka ${p.name}`}
            >
              <Card className="h-full p-5 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-elegant">
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-white">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={cn('font-medium', stageBadgeClass[p.releaseStage])}>
                    {p.releaseStage === 'building' && <Sparkles className="mr-1 h-3 w-3" />}
                    {p.releaseLabel}
                  </Badge>
                </div>
                <h3 className="mt-4 flex items-center gap-1.5 font-semibold">
                  {p.name}
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.shortDescription}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card className="flex items-center gap-3 border-dashed p-5 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        <span>Tip: bookmark <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/dashboard</code> untuk akses cepat.</span>
      </Card>
    </div>
  );
}