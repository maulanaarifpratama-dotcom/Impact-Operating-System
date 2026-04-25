/**
 * Grantfinder — domain types & constants.
 * MVP: data lives in `mockGrants.ts`. User profile + saved grants in localStorage.
 */

export type GrantSector =
  | 'pendidikan'
  | 'kesehatan'
  | 'lingkungan'
  | 'ekonomi'
  | 'gender'
  | 'pertanian'
  | 'air_sanitasi'
  | 'energi'
  | 'teknologi'
  | 'kebudayaan'
  | 'kemanusiaan'
  | 'tata_kelola';

export const SECTOR_LABEL: Record<GrantSector, string> = {
  pendidikan: 'Pendidikan',
  kesehatan: 'Kesehatan',
  lingkungan: 'Lingkungan & Iklim',
  ekonomi: 'Ekonomi & UMKM',
  gender: 'Gender & Inklusi',
  pertanian: 'Pertanian & Pangan',
  air_sanitasi: 'Air & Sanitasi',
  energi: 'Energi Terbarukan',
  teknologi: 'Teknologi & Inovasi',
  kebudayaan: 'Seni & Budaya',
  kemanusiaan: 'Kemanusiaan',
  tata_kelola: 'Tata Kelola & HAM',
};

export type GrantOrigin = 'lokal' | 'internasional' | 'multilateral' | 'korporat';

export const ORIGIN_LABEL: Record<GrantOrigin, string> = {
  lokal: 'Donor Lokal',
  internasional: 'Donor Internasional',
  multilateral: 'Multilateral',
  korporat: 'CSR Korporat',
};

export type OrgStage = 'inisiatif' | 'rintisan' | 'berkembang' | 'mapan';

export const STAGE_LABEL: Record<OrgStage, string> = {
  inisiatif: 'Inisiatif (<1 tahun)',
  rintisan: 'Rintisan (1-3 tahun)',
  berkembang: 'Berkembang (3-7 tahun)',
  mapan: 'Mapan (>7 tahun)',
};

export interface Grant {
  id: string;
  donor: string;
  title: string;
  origin: GrantOrigin;
  /** SDG numbers 1-17 that the grant prioritizes */
  sdgs: number[];
  sectors: GrantSector[];
  /** Indonesia regions or "nasional" / "asia_tenggara" / "global" */
  geography: string[];
  /** Funding amount range in IDR */
  amountMinIdr: number;
  amountMaxIdr: number;
  /** ISO date YYYY-MM-DD */
  deadline: string;
  /** Eligible org stages */
  eligibleStages: OrgStage[];
  summary: string;
  eligibility: string[];
  requirements: string[];
  applicationUrl: string;
  donorWebsite?: string;
  /** Recurring annually? */
  recurring?: boolean;
}

export type ApplicationStatus =
  | 'interested'
  | 'draft'
  | 'submitted'
  | 'shortlisted'
  | 'awarded'
  | 'rejected';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: 'Tertarik',
  draft: 'Draft',
  submitted: 'Submitted',
  shortlisted: 'Shortlisted',
  awarded: 'Awarded',
  rejected: 'Ditolak',
};

export const STATUS_TONE: Record<ApplicationStatus, string> = {
  interested: 'bg-muted text-muted-foreground border-border',
  draft: 'bg-primary/10 text-primary border-primary/20',
  submitted: 'bg-accent/15 text-accent border-accent/30',
  shortlisted: 'bg-warning/15 text-warning border-warning/30',
  awarded: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

export interface SavedApplication {
  grantId: string;
  status: ApplicationStatus;
  notes?: string;
  savedAt: string;
  updatedAt: string;
}

export interface OrgProfile {
  name: string;
  stage: OrgStage;
  sectors: GrantSector[];
  sdgs: number[];
  /** province slug or "nasional" */
  region: string;
}

export const SDG_LABELS: Record<number, string> = {
  1: 'Tanpa Kemiskinan',
  2: 'Tanpa Kelaparan',
  3: 'Kesehatan & Kesejahteraan',
  4: 'Pendidikan Berkualitas',
  5: 'Kesetaraan Gender',
  6: 'Air Bersih & Sanitasi',
  7: 'Energi Bersih & Terjangkau',
  8: 'Pekerjaan Layak & Pertumbuhan',
  9: 'Industri, Inovasi & Infrastruktur',
  10: 'Berkurangnya Kesenjangan',
  11: 'Kota & Komunitas Berkelanjutan',
  12: 'Konsumsi & Produksi Bertanggung Jawab',
  13: 'Penanganan Iklim',
  14: 'Ekosistem Lautan',
  15: 'Ekosistem Daratan',
  16: 'Perdamaian, Keadilan & Kelembagaan',
  17: 'Kemitraan untuk Tujuan',
};

export const REGIONS: { value: string; label: string }[] = [
  { value: 'nasional', label: 'Nasional / Indonesia' },
  { value: 'sumatera', label: 'Sumatera' },
  { value: 'jawa', label: 'Jawa' },
  { value: 'bali_nt', label: 'Bali & Nusa Tenggara' },
  { value: 'kalimantan', label: 'Kalimantan' },
  { value: 'sulawesi', label: 'Sulawesi' },
  { value: 'maluku_papua', label: 'Maluku & Papua' },
];

export const GEO_LABEL: Record<string, string> = {
  nasional: 'Nasional',
  sumatera: 'Sumatera',
  jawa: 'Jawa',
  bali_nt: 'Bali & Nusa Tenggara',
  kalimantan: 'Kalimantan',
  sulawesi: 'Sulawesi',
  maluku_papua: 'Maluku & Papua',
  asia_tenggara: 'Asia Tenggara',
  global: 'Global',
};

export function formatIdr(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)} jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return `Rp ${value}`;
}

export function formatAmountRange(min: number, max: number): string {
  if (min === max) return formatIdr(min);
  return `${formatIdr(min)} – ${formatIdr(max)}`;
}

/** Days until deadline; negative = passed. */
export function daysUntil(iso: string): number {
  const d = new Date(iso + 'T23:59:59');
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export type DeadlineUrgency = 'expired' | 'urgent' | 'soon' | 'open';

export function deadlineUrgency(iso: string): DeadlineUrgency {
  const d = daysUntil(iso);
  if (d < 0) return 'expired';
  if (d <= 14) return 'urgent';
  if (d <= 45) return 'soon';
  return 'open';
}

export const URGENCY_TONE: Record<DeadlineUrgency, string> = {
  expired: 'bg-muted text-muted-foreground border-border',
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  soon: 'bg-warning/15 text-warning border-warning/30',
  open: 'bg-accent/10 text-accent border-accent/30',
};