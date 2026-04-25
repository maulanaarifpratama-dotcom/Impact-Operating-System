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
            <Card
              key={p.key}
              className="group relative overflow-hidden border-border/70 p-7 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-elegant">
                  <p.icon className="h-6 w-6" />
                </div>
                <Badge className={cn('font-medium', stageStyles[p.releaseStage])}>{p.releaseLabel}</Badge>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.longDescription}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}