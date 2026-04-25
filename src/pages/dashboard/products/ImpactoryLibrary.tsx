import { ProductComingSoon } from '@/components/products/ProductComingSoon';
import { PRODUCTS } from '@/lib/brand';
import { Database, FileSpreadsheet, BookMarked, Filter } from 'lucide-react';

const product = PRODUCTS.find((p) => p.key === 'impactory_library')!;

export default function ImpactoryLibrary() {
  return (
    <ProductComingSoon
      product={product}
      features={[
        {
          icon: Database,
          title: 'Data SDGs Indonesia terkurasi',
          description: 'Statistik per provinsi, sektor, dan tema yang siap dikutip di proposal Anda.',
        },
        {
          icon: BookMarked,
          title: 'Riset & studi kasus',
          description: 'Ringkasan riset dampak yang relevan untuk konteks lokal — disajikan ringkas.',
        },
        {
          icon: FileSpreadsheet,
          title: 'Template laporan donor',
          description: 'Format laporan progress, narrative, dan financial yang terbukti diterima funder.',
        },
        {
          icon: Filter,
          title: 'Filter cerdas',
          description: 'Cari berdasarkan tema, geografi, tahap organisasi, atau format dokumen.',
        },
      ]}
      roadmap={[
        { quarter: 'Q2 2026', title: 'Kurasi awal 500+ dataset & template', status: 'building' },
        { quarter: 'Q3 2026', title: 'Beta tertutup untuk early users', status: 'planned' },
        { quarter: 'Q3 2026', title: 'Public launch', status: 'planned' },
      ]}
    />
  );
}