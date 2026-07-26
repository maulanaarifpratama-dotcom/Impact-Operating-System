import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { NewsletterSection } from '@/components/landing/NewsletterSection';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Check, X, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

/**
 * What each tier includes, as shown to the public.
 *
 * Kept as data rather than inline JSX so the three cards cannot drift apart,
 * and so there is one obvious place to reconcile against when the entitlement
 * checks land — today nothing enforces these lists, and a page that promises a
 * split the database does not apply is worse than no page at all.
 */
const DASAR_FEATURES = [
  'Readiness Scorecard',
  'Resource Access Tracker',
  'Donor CRM',
  'Campaign Builder',
  'Manajemen anggota tim',
];

const DASAR_EXCLUDED = ['Grantwriter AI', 'LFA Builder & WBS', 'MEAL & SROI'];

const BERDAYA_FEATURES = [
  'Semua fitur Dasar',
  'Grant Pipeline & Grantwriter AI',
  'LFA Builder, WBS & Budget SBM 2026',
  'MEAL Planner & Tracker',
  'SROI Calculator & E-ROI Carbon',
  'Impact Library & Beneficiary Registry',
  'Monthly Report & Operating Review',
  'Export PDF seluruh modul',
];

const INSTITUSI_FEATURES = [
  'Semua fitur Berdaya',
  'White label & domain sendiri',
  'Model AI & knowledge base kustom',
  'Server khusus & SSO',
  'Akses API',
  'Struktur multi-entitas',
  'SLA & pendamping khusus',
];

export default function PricingPage() {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '6281234567890';
  
  const berdayaMessage = encodeURIComponent(
    "Halo, saya ingin berlangganan Impactory Berdaya (Rp 499.000/bulan)",
  );
  const institusiMessage = encodeURIComponent(
    "Halo, saya ingin berdiskusi tentang Impactory Institusi untuk organisasi kami",
  );

  const berdayaWaUrl = `https://wa.me/${whatsappNumber}?text=${berdayaMessage}`;
  const institusiWaUrl = `https://wa.me/${whatsappNumber}?text=${institusiMessage}`;

  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Impactory.id NGO Growth OS',
    'operatingSystem': 'Web',
    'applicationCategory': 'BusinessApplication',
    'description': 'Platform AI terintegrasi untuk NGO, MEAL, SROI, GrantWriter, dan Manajemen Program Impact di Indonesia.',
    // Only the two concrete prices are declared. Institusi is quoted per
    // organisation, and inventing a figure here would put a number in Google's
    // results that nobody at Impactory ever agreed to.
    'offers': [
      {
        '@type': 'Offer',
        'name': 'Dasar',
        'price': '0',
        'priceCurrency': 'IDR',
        'description': 'Readiness Scorecard, Resource Access, Donor CRM, dan Campaign Builder. Gratis selamanya.',
        'availability': 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        'name': 'Berdaya',
        'price': '499000',
        'priceCurrency': 'IDR',
        'description': 'Seluruh modul G.R.O.W.T.H. termasuk Grantwriter AI, LFA Builder, MEAL, SROI, dan E-ROI Carbon.',
        'availability': 'https://schema.org/InStock',
        'priceSpecification': {
          '@type': 'UnitPriceSpecification',
          'price': '499000',
          'priceCurrency': 'IDR',
          'referenceQuantity': {
            '@type': 'QuantitativeValue',
            'value': '1',
            'unitCode': 'MON'
          }
        }
      }
    ]
  };

  const pricingFaqs = [
    {
      q: "Apakah harga bisa berubah?",
      a: "Khusus untuk organisasi yang tergabung dalam program Founding Member (20 pendaftar pertama), harga berlangganan Anda dikunci selamanya selama masa keanggotaan aktif Anda tetap berjalan."
    },
    {
      q: "Bagaimana cara pembayaran?",
      a: "Pembayaran dilakukan secara instan dan aman menggunakan Transfer Bank Mandiri atau scan QRIS yang valid. Tim kami akan memverifikasi bukti transaksi via saluran WhatsApp resmi kami."
    },
    {
      q: "Apakah ada kontrak?",
      a: "Tidak ada kontrak mengikat. Anda membayar secara bulanan atau tahunan, dan Anda bebas melakukan pembatalan berlangganan kapan saja tanpa dikenai biaya tambahan apa pun."
    },
    {
      q: "Berapa batas user?",
      a: "Tidak ada batas jumlah user pada paket Berdaya maupun Institusi. Anda bebas mendaftarkan seluruh staf, relawan, dan mitra program tanpa biaya tambahan per kursi."
    },
    {
      q: "Apakah tersedia invoice resmi?",
      a: "Ya. Untuk paket Berdaya dan Institusi kami menerbitkan kuitansi, faktur, serta invoice resmi bertandatangan basah sesuai kebutuhan administrasi dan pelaporan keuangan organisasi Anda."
    }
  ];

  return (
    <div className="landing-page-wrap min-h-screen bg-brand-surface text-white selection:bg-teal-500 selection:text-white flex flex-col">
      <SEO
        title="Harga & Paket Berlangganan NGO Growth OS"
        description="Pilihan paket investasi transparan Impactory.id untuk NGO, NPO, dan Social Enterprise. Akses penuh fitur AI GrantWriter, LFA Builder, SROI Calculator, dan Donor CRM."
        canonicalUrl="/pricing"
        ogType="product"
        jsonLd={pricingJsonLd}
      />
      <Navbar />

      {/* Pricing Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24 text-center border-b border-white/5">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container max-w-4xl mx-auto px-4 relative z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
            Investasi Dampak Organisasi
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-100">
            Pilihan Plan Sederhana & Transparan
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dapatkan akses penuh ke sistem standardisasi data program terkuat di Indonesia untuk merancang proposal, melacak data penerima manfaat, dan melaporkan dampak nyata.
          </p>

          {/* Founding Member Banner */}
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-left mt-8 shadow-lg backdrop-blur-md">
            <ShieldCheck className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-300">Harga founding member — berlaku untuk 20 organisasi pertama.</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Harga dikunci selamanya selama keanggotaan berlangganan Anda tetap berjalan aktif tanpa terputus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 sm:py-24 border-b border-white/5 relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            
            {/* Tier 1 — Dasar */}
            <Card className="premium-glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dasar</span>
                  <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg">
                    Gratis selamanya
                  </Badge>
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline">
                    <span className="text-3xl sm:text-4xl font-black text-slate-100">Rp 0</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    Untuk organisasi yang baru membangun sistem
                  </p>
                </div>
                <hr className="border-white/5 my-6" />
                <ul className="space-y-3.5 text-xs">
                  {DASAR_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                  {DASAR_EXCLUDED.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-slate-400 line-through">
                      <X className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full border-white/10 text-white bg-transparent hover:bg-white/5 rounded-xl py-6 mt-8 font-bold text-xs">
                <Link to="/signup">Mulai gratis</Link>
              </Button>
            </Card>

            {/* Tier 2 — Berdaya (FEATURED) */}
            <div className="relative group flex flex-col h-full">
              <div className="absolute -inset-1 bg-gradient-to-b from-teal-500 to-brand-accent rounded-3xl blur opacity-30 group-hover:opacity-40 transition-opacity" />
              <Card className="premium-glass-card relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full scale-100 md:scale-105 border-2 border-teal-500/50">
                <div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Berdaya</span>
                    <Badge className="bg-gradient-to-r from-teal-500 to-brand-accent text-white px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border-none">
                      Paling populer
                    </Badge>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-baseline">
                      <span className="text-3xl sm:text-4xl font-black text-slate-100">Rp 499.000</span>
                      <span className="text-xs text-slate-400 ml-1.5 font-medium">/ bulan</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-semibold">
                      per organisasi &middot; user tanpa batas
                    </p>
                  </div>
                  <hr className="border-white/5 my-6" />
                  <ul className="space-y-3.5 text-xs">
                    {BERDAYA_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="w-full bg-gradient-to-r from-teal-500 to-brand-accent hover:from-teal-600 hover:to-teal-700 text-white font-bold rounded-xl py-6 mt-8 text-xs shadow-lg shadow-teal-500/20">
                  <a href={berdayaWaUrl} target="_blank" rel="noreferrer noopener">Mulai berdaya</a>
                </Button>
              </Card>
            </div>

            {/* Tier 3 — Institusi */}
            <Card className="premium-glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Institusi</span>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg">
                    Kustom
                  </Badge>
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline">
                    <span className="text-2xl sm:text-3xl font-black text-slate-100">Hubungi kami</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    Untuk yayasan besar, CSR, dan lembaga multi-program
                  </p>
                </div>
                <hr className="border-white/5 my-6" />
                <ul className="space-y-3.5 text-xs">
                  {INSTITUSI_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl py-6 mt-8 text-xs">
                <a href={institusiWaUrl} target="_blank" rel="noreferrer noopener">Diskusikan kebutuhan</a>
              </Button>
            </Card>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-16 sm:py-24 bg-brand-surface-deep relative">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Pusat Informasi</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight mt-3">
              FAQ Seputar Pembayaran
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {pricingFaqs.map((f, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`} 
                className="border-white/5 bg-brand-surface-mid/20 rounded-2xl px-6 py-2 shadow-lg"
              >
                <AccordionTrigger className="hover:no-underline font-bold text-sm text-slate-200 py-4">
                  <span className="flex items-center gap-2.5 text-left">
                    <HelpCircle className="h-4 w-4 text-teal-400 shrink-0" />
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-400 leading-relaxed pb-5 pl-6">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <NewsletterSection />
      <Footer />
    </div>
  );
}
