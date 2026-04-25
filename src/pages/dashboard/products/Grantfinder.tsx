import { ProductComingSoon } from '@/components/products/ProductComingSoon';
import { PRODUCTS } from '@/lib/brand';
import { Globe2, Target, BellRing, ListChecks } from 'lucide-react';

const product = PRODUCTS.find((p) => p.key === 'grantfinder')!;

export default function Grantfinder() {
  return (
    <ProductComingSoon
      product={product}
      features={[
        {
          icon: Globe2,
          title: 'Database hibah lokal & internasional',
          description: 'Ribuan peluang dari donor publik, yayasan, dan lembaga multilateral — diperbarui mingguan.',
        },
        {
          icon: Target,
          title: 'Rekomendasi cocok',
          description: 'Sistem mencocokkan peluang berdasarkan profil organisasi, sektor, dan kapasitas Anda.',
        },
        {
          icon: BellRing,
          title: 'Alert deadline',
          description: 'Notifikasi otomatis untuk peluang baru dan deadline yang mendekat.',
        },
        {
          icon: ListChecks,
          title: 'Tracker aplikasi',
          description: 'Catat status setiap aplikasi: draft, submitted, shortlisted, awarded.',
        },
      ]}
      roadmap={[
        { quarter: 'Q3 2026', title: 'Pengumpulan data donor & kategorisasi', status: 'building' },
        { quarter: 'Q4 2026', title: 'Engine matching v1', status: 'planned' },
        { quarter: 'Q4 2026', title: 'Public launch', status: 'planned' },
      ]}
    />
  );
}