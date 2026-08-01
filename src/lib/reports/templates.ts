// src/lib/reports/templates.ts
import { ReportTemplateType, UnifiedReportPayload } from './types';

export interface TemplateMetadata {
  type: ReportTemplateType;
  title: string;
  code: string;
  description: string;
  target_audience: string;
  sections: string[];
}

export const REPORT_TEMPLATES: Record<ReportTemplateType, TemplateMetadata> = {
  GRI: {
    type: 'GRI',
    title: 'GRI Standards Sustainability Report',
    code: 'GRI-2021-STD',
    description: 'Laporan keberlanjutan standar global sesuai kerangka kerja Global Reporting Initiative (GRI 302, 305, 413).',
    target_audience: 'Donor Internasional, Lembaga Pemeringkat ESG, Korporasi Global',
    sections: ['Organization Profile', 'Environment Disclosures (GRI 302/305)', 'Social Disclosures (GRI 413)', 'Governance & Compliance'],
  },
  SEOJK: {
    type: 'SEOJK',
    title: 'SEOJK No. 16/SEOJK.04/2021 Report',
    code: 'SEOJK-16-2021',
    description: 'Laporan Keberlanjutan resmi sesuai regulasi Otoritas Jasa Keuangan (OJK) bagi BUMN, Emiten, dan LHK.',
    target_audience: 'Otoritas Jasa Keuangan (OJK), Mitra BUMN, Perbankan & Investor Nasional',
    sections: ['Penjelasan Direksi', 'Profil Organisasi', 'Kinerja Keberlanjutan Lingkungan', 'Kinerja Keberlanjutan Sosial & Tata Kelola'],
  },
  SDG: {
    type: 'SDG',
    title: 'UN SDGs Contribution Matrix Report',
    code: 'UN-SDG-MATRIX',
    description: 'Laporan pemetaan korelasi dampak program terhadap 17 Sustainable Development Goals PBB.',
    target_audience: 'Pemerintah, Bappenas, UN Agencies, Publik',
    sections: ['Matriks 17 SDGs', 'Primary Goal Impact', 'Target Indicator Breakdown', 'SROI & EROI Correlation'],
  },
  EXECUTIVE: {
    type: 'EXECUTIVE',
    title: 'Executive Sustainability Brief',
    code: 'EXEC-BRIEF-3P',
    description: 'Ringkasan eksekutif 3 halaman bagi jajaran direksi, pembina, dan donor utama.',
    target_audience: 'Board of Directors, Donor Utama, Pembina Organisasi',
    sections: ['Executive Summary', 'Impact Highlights (E, S, G)', 'Financial & Return Ratio', 'Recommendations'],
  },
};
