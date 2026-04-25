import { FileText, BookOpen, Search, Megaphone, type LucideIcon } from 'lucide-react';

export const BRAND = {
  name: 'Impactory',
  domain: 'impactory.id',
  tagline: 'AI untuk pembangun dampak Indonesia',
  social: {
    instagram: 'https://instagram.com/impactoryindonesia',
    linkedin: 'https://linkedin.com/company/impactoryindonesia',
    tiktok: 'https://tiktok.com/@impactoryindonesia',
    twitter: 'https://x.com/impactoryid',
  },
  socialHandles: {
    instagram: '@impactoryindonesia',
    linkedin: '@impactoryindonesia',
    tiktok: '@impactoryindonesia',
    twitter: '@impactoryid',
  },
} as const;

export type ProductKey = 'grant_writer' | 'impactory_library' | 'grantfinder' | 'impactory_ads';

export interface ProductMeta {
  key: ProductKey;
  name: string;
  shortDescription: string;
  longDescription: string;
  icon: LucideIcon;
  releaseLabel: string;
  releaseStage: 'building' | 'next' | 'planned' | 'future';
  href: string;
}

export const PRODUCTS: ProductMeta[] = [
  {
    key: 'grant_writer',
    name: 'Grant Writer',
    shortDescription: 'AI proposal hibah berbasis Logical Framework Approach.',
    longDescription:
      'Generate proposal funding lengkap dalam hitungan menit. Dilatih dengan struktur LFA yang dipakai donor internasional.',
    icon: FileText,
    releaseLabel: 'Juni 2026',
    releaseStage: 'building',
    href: '/dashboard/grant-writer',
  },
  {
    key: 'impactory_library',
    name: 'Impactory Library',
    shortDescription: 'Perpustakaan dampak: data, riset, dan template siap pakai.',
    longDescription:
      'Akses kurasi data SDGs Indonesia, riset sektor, dan template laporan yang terbukti diterima funder.',
    icon: BookOpen,
    releaseLabel: 'MVP Aktif',
    releaseStage: 'building',
    href: '/dashboard/impactory-library',
  },
  {
    key: 'grantfinder',
    name: 'Grantfinder',
    shortDescription: 'Mesin pencari hibah & funder yang cocok dengan misi Anda.',
    longDescription:
      'Lacak ribuan peluang hibah dari donor lokal dan internasional. Filter berdasarkan sektor, geografi, dan tahap organisasi.',
    icon: Search,
    releaseLabel: 'MVP Aktif',
    releaseStage: 'building',
    href: '/dashboard/grantfinder',
  },
  {
    key: 'impactory_ads',
    name: 'Impactory Ads',
    shortDescription: 'Generator copy iklan & kampanye fundraising digital.',
    longDescription:
      'Buat ad copy berperforma untuk Meta, Google, dan TikTok — dirancang khusus untuk kampanye sosial dan UMKM.',
    icon: Megaphone,
    releaseLabel: '2027',
    releaseStage: 'future',
    href: '/dashboard/impactory-ads',
  },
];

export const PRIMARY_ROLES: { value: string; label: string }[] = [
  { value: 'foundation_lead', label: 'Pengurus Yayasan / NGO' },
  { value: 'umkm_owner', label: 'Pemilik UMKM Sosial' },
  { value: 'changemaker', label: 'Changemaker / Aktivis' },
  { value: 'consultant', label: 'Konsultan / Fasilitator' },
  { value: 'other', label: 'Lainnya' },
];