import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Building2, ShieldCheck, Sparkles, Store, User } from 'lucide-react';
import { signupHref, signupHrefForRole, type DemoRole } from '@/lib/demo-mode';

const ROLE_SHORTCUTS: { role: DemoRole; label: string; icon: typeof Building2 }[] = [
  { role: 'foundation_lead', label: 'Yayasan / NGO', icon: Building2 },
  { role: 'umkm_owner', label: 'UMKM sosial', icon: Store },
  { role: 'changemaker', label: 'Changemaker', icon: User },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* background flourish */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-subtle" />
        {/* Soft ambient glows — kept faint and pushed off-canvas so they never overlay the headline */}
        <div className="absolute -top-64 -left-40 h-[420px] w-[420px] rounded-full bg-accent/[0.06] blur-3xl md:-top-80 md:h-[600px] md:w-[600px]" />
        <div className="absolute -bottom-48 -right-40 h-[360px] w-[360px] rounded-full bg-primary/[0.06] blur-3xl md:h-[520px] md:w-[520px]" />
      </div>

      <div className="container pt-8 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-5 inline-flex items-center gap-1.5 border-accent/40 bg-accent-soft px-3 py-1 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Sedang dibangun · Bergabung dengan early access
          </Badge>
          <h1 className="text-balance text-display text-foreground">
            AI untuk pembangun{' '}
            {/* Inline-block + explicit text-transparent + webkit fallback prevents the gradient from rendering as a solid block when bg-clip-text fails (some Safari/older Chrome). */}
            <span
              className="inline-block bg-gradient-hero bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              dampak Indonesia
            </span>
          </h1>
          <p className="mt-6 text-balance text-subheading">
            Tulis proposal hibah, temukan funder, dan jalankan kampanye fundraising — dalam satu
            platform yang paham realita Indonesia.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-hero text-white shadow-elegant hover:opacity-95">
              <Link to={signupHref()}>
                Mulai gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#waitlist">Gabung waitlist</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <span className="text-overline text-muted-foreground">
              Atau mulai sesuai peran Anda
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ROLE_SHORTCUTS.map(({ role, label, icon: Icon }) => (
                <Button
                  key={role}
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-accent/30 bg-background/70 text-foreground hover:bg-accent-soft hover:text-accent"
                >
                  <Link to={signupHrefForRole(role)}>
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 inline-flex max-w-2xl items-center gap-3 rounded-full border border-border/70 bg-background/70 px-4 py-2.5 text-caption backdrop-blur">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-balance">
              Dibangun oleh praktisi digital marketing dengan track record{' '}
              <span className="font-semibold text-foreground">Rp&nbsp;20+&nbsp;miliar</span>{' '}
              ad spend untuk NGO dan brand Indonesia.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
