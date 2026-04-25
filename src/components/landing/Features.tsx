import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PRODUCTS } from '@/lib/brand';
import { cn } from '@/lib/utils';

const stageStyles: Record<string, string> = {
  building: 'bg-accent text-accent-foreground',
  next: 'bg-primary/10 text-primary border border-primary/20',
  planned: 'bg-muted text-muted-foreground',
  future: 'bg-muted text-muted-foreground',
};

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Empat produk, satu misi</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Dibangun bertahap. Mulai dari Grant Writer, lalu berkembang menjadi ekosistem lengkap.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p.key}
              to={p.href}
              className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label={`Buka halaman ${p.name}`}
            >
              <Card className="relative h-full overflow-hidden border-border/70 p-7 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-elegant">
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-elegant">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <Badge className={cn('font-medium', stageStyles[p.releaseStage])}>{p.releaseLabel}</Badge>
                </div>
                <h3 className="mt-5 flex items-center gap-1.5 text-xl font-semibold tracking-tight">
                  {p.name}
                  <ArrowUpRight className="h-4 w-4 -translate-y-0.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-1 group-hover:text-accent" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.longDescription}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}