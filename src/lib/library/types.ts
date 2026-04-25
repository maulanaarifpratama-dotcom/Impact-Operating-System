/**
 * Impactory Library — domain types.
 * Frontend-only MVP. Reuses sector & SDG vocab from Grantfinder for consistency.
 */
import type { GrantSector } from '@/lib/grantfinder/types';
export { SECTOR_LABEL, SDG_LABELS } from '@/lib/grantfinder/types';

export type LibraryKind = 'data_sdg' | 'riset' | 'template' | 'case_study' | 'panduan';

export const KIND_LABEL: Record<LibraryKind, string> = {
  data_sdg: 'Data SDGs',
  riset: 'Riset & Whitepaper',
  template: 'Template',
  case_study: 'Studi Kasus',
  panduan: 'Panduan',
};

export const KIND_DESC: Record<LibraryKind, string> = {
  data_sdg: 'Statistik & dataset SDGs Indonesia siap dikutip.',
  riset: 'Ringkasan riset dan whitepaper sektor sosial.',
  template: 'Format dokumen siap pakai untuk donor & laporan.',
  case_study: 'Studi kasus organisasi yang berhasil mendapat funding.',
  panduan: 'Panduan praktis langkah-demi-langkah untuk tim program & fundraising.',
};

export type FileFormat = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'pptx' | 'web';

export const FORMAT_LABEL: Record<FileFormat, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  csv: 'CSV',
  pptx: 'PPTX',
  web: 'Halaman Web',
};

export interface LibraryItem {
  id: string;
  kind: LibraryKind;
  title: string;
  source: string;
  /** Year of publication or data period */
  year: number;
  summary: string;
  sectors: GrantSector[];
  sdgs: number[];
  /** Optional region focus; defaults to nasional. */
  region?: string;
  format: FileFormat;
  /** External link (data portal, paper, template doc, story). */
  url: string;
  /** Estimated read/usage time in minutes. */
  readMinutes?: number;
  /** Highlight tag e.g. "Pilihan editor" */
  featured?: boolean;
  /** Free-text tags for additional searchability. */
  tags?: string[];
  /** Mock download/usage count untuk peringkat "Paling Diunduh". */
  downloads?: number;
}

export const KIND_TONE: Record<LibraryKind, string> = {
  data_sdg: 'border-primary/30 bg-primary/10 text-primary',
  riset: 'border-accent/30 bg-accent/10 text-accent',
  template: 'border-warning/30 bg-warning/15 text-warning',
  case_study: 'border-success/30 bg-success/15 text-success',
  panduan: 'border-secondary/40 bg-secondary/20 text-secondary-foreground',
};