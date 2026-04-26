import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Free',
    price: 'Rp 0',
    period: 'selamanya',
    description: 'Untuk mencoba dan eksplorasi.',
    features: [
      '3 proposal Grant Writer per bulan',
      'Akses dasar Impactory Library',
      '1 anggota organisasi',
      'Email support',
    ],
    cta: 'Mulai gratis',
    href: '/dashboard/grant-writer',
  },
  {
    name: 'Starter',
    price: 'Rp 149.000',
    period: 'per bulan',
    description: 'Untuk yayasan kecil & UMKM aktif.',
    features: [
      'Unlimited Grant Writer',
      'Full Impactory Library',
      'Hingga 5 anggota',
      'Priority support',
      'Export PDF & DOCX',
    ],
    cta: 'Pilih Starter',
    href: '/dashboard/grant-writer',
    highlight: true,
  },
  {
    name: 'Premium',
    price: 'Rp 449.000',
    period: 'per bulan',
    description: 'Untuk organisasi yang serius.',
    features: [
      'Semua fitur Starter',
      'Akses Grantfinder',
      'Akses Impactory Ads',
      'Hingga 20 anggota',
      'Konsultasi onboarding 1:1',
      'API access',
    ],
    cta: 'Pilih Premium',
    href: '/dashboard/grant-writer',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-secondary/40 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Harga yang masuk akal</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Dirancang untuk yayasan dan UMKM Indonesia — bukan startup Silicon Valley.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3 md:items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'relative flex flex-col p-7 shadow-card transition-all',
                plan.highlight
                  ? 'border-accent bg-card shadow-elegant md:-translate-y-2'
                  : 'border-border/70',
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                  Paling populer
                </Badge>
              )}
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mt-5">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="ml-2 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  'mt-7 w-full',
                  plan.highlight
                    ? 'bg-gradient-hero text-white hover:opacity-95'
                    : 'bg-foreground text-background hover:bg-foreground/90',
                )}
              >
                <Link to={plan.href}>{plan.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}