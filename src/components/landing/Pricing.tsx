import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, Minus, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { signupHrefForRole, type DemoRole } from '@/lib/demo-mode';

type Billing = 'monthly' | 'yearly';

type Plan = {
  name: string;
  // Numeric prices keep formatting + yearly math in one place.
  // Yearly = 10× monthly (hemat 2 bulan ≈ 17%).
  price: { monthly: number; yearly: number };
  description: string;
  features: string[];
  cta: string;
  role: DemoRole;
  variant: 'default' | 'highlight' | 'premium';
};

const plans: Plan[] = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Untuk mencoba dan eksplorasi.',
    features: [
      '3 proposal Grant Writer per bulan',
      'Akses dasar Impactory Library',
      '1 anggota organisasi',
      'Email support',
    ],
    cta: 'Mulai gratis',
    role: 'changemaker',
    variant: 'default',
  },
  {
    name: 'Starter',
    price: { monthly: 149_000, yearly: 1_490_000 },
    description: 'Untuk yayasan kecil & UMKM aktif.',
    features: [
      'Unlimited Grant Writer',
      'Full Impactory Library',
      'Hingga 5 anggota',
      'Priority support',
      'Export PDF & DOCX',
    ],
    cta: 'Pilih Starter',
    role: 'umkm_owner',
    variant: 'highlight',
  },
  {
    name: 'Premium',
    price: { monthly: 449_000, yearly: 4_490_000 },
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
    role: 'foundation_lead',
    variant: 'premium',
  },
];

// Comparison matrix — single source of truth for the accordion table.
// Values: true = included (✓), false = not included (—), string = limit/qty.
type Cell = boolean | string;
const comparison: { group: string; rows: { label: string; values: [Cell, Cell, Cell] }[] }[] = [
  {
    group: 'Grant Writer',
    rows: [
      { label: 'Proposal hibah per bulan', values: ['3', 'Unlimited', 'Unlimited'] },
      { label: 'Export PDF & DOCX', values: [false, true, true] },
    ],
  },
  {
    group: 'Library & Funding',
    rows: [
      { label: 'Impactory Library', values: ['Dasar', 'Full', 'Full'] },
      { label: 'Akses Grantfinder', values: [false, false, true] },
      { label: 'Akses Impactory Ads', values: [false, false, true] },
    ],
  },
  {
    group: 'Tim & Support',
    rows: [
      { label: 'Anggota organisasi', values: ['1', '5', '20'] },
      { label: 'Support', values: ['Email', 'Priority', 'Priority + onboarding 1:1'] },
      { label: 'API access', values: [false, false, true] },
    ],
  },
];

function formatIDR(value: number): string {
  if (value === 0) return 'Rp 0';
  return 'Rp ' + value.toLocaleString('id-ID');
}

function CellRender({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (value === false) {
    return <Minus className="inline h-4 w-4 text-muted-foreground/60" aria-label="Tidak termasuk" />;
  }
  return <span className="text-foreground/85">{value}</span>;
}

export function Pricing() {
  const [billing, setBilling] = useState<Billing>('monthly');

  return (
    <section id="pricing" className="bg-secondary/40 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2">Harga yang masuk akal</h2>
          <p className="mt-4 text-subheading">
            Dirancang untuk yayasan dan UMKM Indonesia — bukan startup Silicon Valley.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Periode tagihan"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background p-1 shadow-card"
          >
            {(['monthly', 'yearly'] as const).map((option) => {
              const active = billing === option;
              const label = option === 'monthly' ? 'Bulanan' : 'Tahunan';
              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBilling(option)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-body-sm font-medium transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                  {option === 'yearly' && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                        active
                          ? 'bg-background/15 text-background'
                          : 'bg-accent-soft text-accent',
                      )}
                    >
                      Hemat 17%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-3 md:items-stretch">
          {plans.map((plan) => {
            const amount = plan.price[billing];
            const periodLabel =
              amount === 0 ? 'selamanya' : billing === 'monthly' ? 'per bulan' : 'per tahun';

            // Wrapper handles the gradient border for Starter; inner Card stays neutral.
            const isHighlight = plan.variant === 'highlight';
            const isPremium = plan.variant === 'premium';

            const card = (
              <Card
                className={cn(
                  'relative flex h-full flex-col p-7 transition-all',
                  isHighlight && 'border-transparent bg-card shadow-elegant md:-translate-y-2',
                  isPremium &&
                    'border-primary/40 bg-card shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)]',
                  plan.variant === 'default' && 'border-border/70 shadow-card',
                )}
              >
                {isHighlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 bg-gradient-hero px-3 py-1 text-white shadow-elegant">
                    <Sparkles className="h-3.5 w-3.5" />
                    Paling populer
                  </Badge>
                )}
                {isPremium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-overline text-primary-foreground shadow-card">
                    Untuk organisasi serius
                  </span>
                )}
                <div>
                  <h3 className="text-h4">{plan.name}</h3>
                  <p className="mt-1 text-body-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mt-5 min-h-[3.5rem]">
                  {/* key={billing} re-mounts the price node on toggle → fade-in animation */}
                  <span
                    key={`${plan.name}-${billing}`}
                    className="inline-block animate-fade-in text-h1"
                  >
                    {formatIDR(amount)}
                  </span>
                  <span className="ml-2 text-body-sm text-muted-foreground">{periodLabel}</span>
                  {billing === 'yearly' && amount > 0 && (
                    <p className="mt-1 text-caption text-accent">
                      Hemat {formatIDR(plan.price.monthly * 2)} per tahun
                    </p>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-body-sm">
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
                    isHighlight && 'bg-gradient-hero text-white hover:opacity-95',
                    isPremium && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    plan.variant === 'default' &&
                      'bg-foreground text-background hover:bg-foreground/90',
                  )}
                >
                  <Link to={signupHrefForRole(plan.role)}>{plan.cta}</Link>
                </Button>
              </Card>
            );

            if (isHighlight) {
              return (
                <div
                  key={plan.name}
                  className="relative rounded-[calc(var(--radius)+2px)] bg-gradient-hero p-[1.5px] shadow-elegant md:-mt-2"
                >
                  {card}
                </div>
              );
            }
            return <div key={plan.name}>{card}</div>;
          })}
        </div>

        {/* Feature comparison (collapsible) */}
        <div className="mx-auto mt-10 max-w-5xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="compare" className="border-border/70">
              <AccordionTrigger className="text-body font-medium">
                Bandingkan semua fitur
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%] min-w-[220px]">Fitur</TableHead>
                        <TableHead className="text-center">Free</TableHead>
                        <TableHead className="text-center">Starter</TableHead>
                        <TableHead className="text-center">Premium</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.flatMap((section) => [
                        <TableRow
                          key={`group-${section.group}`}
                          className="bg-muted/40 hover:bg-muted/40"
                        >
                          <TableCell
                            colSpan={4}
                            className="text-overline text-muted-foreground"
                          >
                            {section.group}
                          </TableCell>
                        </TableRow>,
                        ...section.rows.map((row) => (
                          <TableRow key={`row-${section.group}-${row.label}`}>
                            <TableCell className="text-body-sm text-foreground/90">
                              {row.label}
                            </TableCell>
                            {row.values.map((v, i) => (
                              <TableCell key={i} className="text-center text-body-sm">
                                <CellRender value={v} />
                              </TableCell>
                            ))}
                          </TableRow>
                        )),
                      ])}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Trust element */}
        <div className="mt-6 flex items-center justify-center gap-2 text-caption text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span>Tanpa kontrak · Batalkan kapan saja · Refund 7 hari pertama</span>
        </div>
      </div>
    </section>
  );
}