import { ProductComingSoon } from '@/components/products/ProductComingSoon';
import { PRODUCTS } from '@/lib/brand';
import { PenLine, Wand2, BarChart3, Share2 } from 'lucide-react';

const product = PRODUCTS.find((p) => p.key === 'impactory_ads')!;

export default function ImpactoryAds() {
  return (
    <ProductComingSoon
      product={product}
      features={[
        {
          icon: PenLine,
          title: 'Generator copy iklan',
          description: 'Hasilkan headline, body, dan CTA untuk Meta, Google, dan TikTok dalam hitungan detik.',
        },
        {
          icon: Wand2,
          title: 'Tone yang tepat untuk sektor sosial',
          description: 'Dilatih khusus untuk kampanye fundraising, advokasi, dan UMKM sosial Indonesia.',
        },
        {
          icon: BarChart3,
          title: 'A/B variant otomatis',
          description: 'Buat 5–10 variasi sekali klik untuk diuji performanya di platform iklan.',
        },
        {
          icon: Share2,
          title: 'Ekspor multi-format',
          description: 'Unduh ke CSV atau langsung copy ke ad manager favorit Anda.',
        },
      ]}
      roadmap={[
        { quarter: '2026', title: 'Riset pasar & validasi use case', status: 'building' },
        { quarter: 'Q1 2027', title: 'Beta tertutup', status: 'planned' },
        { quarter: '2027', title: 'Public launch', status: 'planned' },
      ]}
    />
  );
}