import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { signupHref } from '@/lib/demo-mode';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* background flourish */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-subtle" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="container py-20 md:py-32 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-6 inline-flex items-center gap-1.5 border-accent/40 bg-accent-soft px-3 py-1 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Sedang dibangun · Bergabung dengan early access
          </Badge>

          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            AI untuk pembangun{' '}
            <span className="bg-gradient-hero bg-clip-text text-transparent">dampak Indonesia</span>
          </h1>

          <p className="mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Dari proposal hibah hingga kampanye fundraising — Impactory bantu yayasan, UMKM sosial, dan
            changemaker bekerja 10x lebih cepat dengan AI yang paham konteks Indonesia.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-hero text-white shadow-elegant hover:opacity-95">
              <Link to={signupHref()}>
                Mulai gratis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#waitlist">Gabung waitlist</a>
            </Button>
          </div>

          <div className="mx-auto mt-10 inline-flex max-w-2xl items-center gap-3 rounded-full border border-border/70 bg-background/70 px-4 py-2.5 text-xs text-muted-foreground backdrop-blur md:text-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-balance">
              Dibangun oleh digital marketer dengan{' '}
              <span className="font-semibold text-foreground">&gt;Rp&nbsp;20&nbsp;miliar</span> pengalaman ad spend di NGO &amp; brand Indonesia.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}