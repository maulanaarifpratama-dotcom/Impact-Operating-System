/**
 * Domain types for the Grant Writer wizard.
 * Aligned with UN/OECD-DAC Logical Framework Approach (LFA) terminology.
 *
 * Hierarchy (intervention logic):
 *   Goal (Impact)
 *     └── Outcomes (Purpose)
 *           └── Outputs
 *                 └── Activities
 *
 * Each level has:
 *   - Indicators (OVI: Objectively Verifiable Indicators)
 *   - Means of Verification (MoV)
 *   - Assumptions
 */

import type { GwDonorStandard } from '@/integrations/supabase/database.types';

export type WizardStepId =
  | 'context'
  | 'stakeholders'
  | 'problem_tree'
  | 'objectives'
  | 'lfa_matrix'
  | 'indicators'
  | 'risks';

export interface WizardStepMeta {
  id: WizardStepId;
  index: number; // 1-based for UI
  label: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  {
    id: 'context',
    index: 1,
    label: 'Konteks Proyek',
    description: 'Latar belakang, sektor, geografi, dan donor target.',
  },
  {
    id: 'stakeholders',
    index: 2,
    label: 'Pemangku Kepentingan',
    description: 'Peta penerima manfaat, mitra, dan aktor kunci.',
  },
  {
    id: 'problem_tree',
    index: 3,
    label: 'Pohon Masalah',
    description: 'Masalah inti, akar penyebab, dan dampaknya.',
  },
  {
    id: 'objectives',
    index: 4,
    label: 'Tujuan & Sasaran',
    description: 'Goal (impact), outcomes, dan outputs SMART.',
  },
  {
    id: 'lfa_matrix',
    index: 5,
    label: 'Aktivitas & Sumber Daya',
    description: 'Aktivitas per output, timeline, dan sumber daya.',
  },
  {
    id: 'indicators',
    index: 6,
    label: 'Indikator & MoV',
    description: 'OVI dan Means of Verification per level.',
  },
  {
    id: 'risks',
    index: 7,
    label: 'Risiko & Asumsi',
    description: 'Asumsi kunci dan mitigasi risiko.',
  },
];

// ---------- Wizard data shape ----------

export interface ContextData {
  problemStatement: string;
  background: string;
  targetDonor: string;
  donorStandard: GwDonorStandard;
  proposedTitle: string;
  sector: string;
  geography: string;
  durationMonths: number;
  budgetIdr: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  type: 'beneficiary' | 'partner' | 'government' | 'donor' | 'community' | 'other';
  role: string;
  influence: 'low' | 'medium' | 'high';
  interest: 'low' | 'medium' | 'high';
}

export interface ProblemNode {
  id: string;
  text: string;
  type: 'core' | 'cause' | 'effect';
  parentId?: string | null;
}

export interface ObjectiveItem {
  id: string;
  text: string;
}

export interface ObjectivesData {
  goal: string; // overall impact statement
  outcomes: ObjectiveItem[]; // 1-3 outcomes (purpose)
  outputs: ObjectiveItem[]; // 3-8 outputs (deliverables)
}

export interface ActivityItem {
  id: string;
  outputId: string;
  text: string;
  durationWeeks?: number;
  resources?: string;
  responsible?: string;
}

export interface IndicatorItem {
  id: string;
  level: 'goal' | 'outcome' | 'output';
  refId?: string; // outcome/output id (null for goal)
  indicator: string; // OVI
  baseline: string;
  target: string;
  meansOfVerification: string;
}

export interface RiskItem {
  id: string;
  description: string;
  level: 'goal' | 'outcome' | 'output' | 'activity';
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface AssumptionItem {
  id: string;
  text: string;
  level: 'goal' | 'outcome' | 'output' | 'activity';
}

export interface WizardData {
  context?: Partial<ContextData>;
  stakeholders?: Stakeholder[];
  problemTree?: ProblemNode[];
  objectives?: Partial<ObjectivesData>;
  activities?: ActivityItem[];
  indicators?: IndicatorItem[];
  risks?: RiskItem[];
  assumptions?: AssumptionItem[];
}

// ---------- LFA matrix output ----------

export interface LfaCell {
  intervention: string; // narrative summary
  indicators: string[];
  meansOfVerification: string[];
  assumptions: string[];
}

export interface LfaMatrix {
  goal: LfaCell;
  outcomes: LfaCell[];
  outputs: LfaCell[];
  activities: {
    outputRef: string;
    items: string[];
    inputs: string[];
  }[];
  preconditions: string[];
  meta: {
    title: string;
    donorStandard: GwDonorStandard;
    targetDonor: string;
    sector: string;
    geography: string;
    durationMonths: number;
    budgetIdr: number;
    generatedAt: string;
  };
}

export const DONOR_STANDARDS: { value: GwDonorStandard; label: string; description: string }[] = [
  { value: 'un_oecd_dac', label: 'UN / OECD-DAC', description: 'Standar internasional logframe (default).' },
  { value: 'world_bank', label: 'World Bank', description: 'Results Framework + indicators handbook.' },
  { value: 'usaid', label: 'USAID', description: 'PMP / Results Framework.' },
  { value: 'eu', label: 'EU / EuropeAid', description: 'PCM logframe matrix.' },
  { value: 'generic', label: 'Generic / Lokal', description: 'Format generik untuk donor lokal.' },
];

export const SECTORS = [
  'Pendidikan',
  'Kesehatan',
  'Pemberdayaan Ekonomi',
  'Lingkungan & Iklim',
  'Air & Sanitasi',
  'Gender & Inklusi',
  'Tata Kelola',
  'Kemanusiaan',
  'Pangan & Pertanian',
  'Lainnya',
];

// ============================================================
// Quick mode (4 langkah sederhana)
// ============================================================

export type QuickStepId =
  | 'organization'
  | 'program'
  | 'budget'
  | 'generate';

export interface QuickStepMeta {
  id: QuickStepId;
  index: number;
  label: string;
  description: string;
}

export const QUICK_STEPS: QuickStepMeta[] = [
  {
    id: 'organization',
    index: 1,
    label: 'Info Organisasi',
    description: 'Nama, jenis, dan profil singkat organisasi pengusul.',
  },
  {
    id: 'program',
    index: 2,
    label: 'Deskripsi Program',
    description: 'Judul, latar belakang, masalah, dan solusi yang ditawarkan.',
  },
  {
    id: 'budget',
    index: 3,
    label: 'Target & Anggaran',
    description: 'Penerima manfaat, durasi, lokasi, dan estimasi anggaran.',
  },
  {
    id: 'generate',
    index: 4,
    label: 'Generate Proposal',
    description: 'Tinjau ringkasan dan generate proposal donor-ready.',
  },
];

export type QuickOrgType = 'yayasan' | 'lsm' | 'umkm_sosial';

export interface QuickOrganizationData {
  orgName: string;
  orgType: QuickOrgType;
  sdgFocus: number[]; // SDG numbers 1-17
  yearFounded?: number;
}

export interface QuickProgramData {
  programTitle: string;
  sector: string;
  targetDonor: string;
  background: string;
  problemStatement: string;
  proposedSolution: string;
  expectedOutcomes: string;
}

export interface QuickBudgetData {
  beneficiaryCount: number;
  beneficiaryDescription: string;
  geography: string;
  durationMonths: number;
  budgetIdr: number;
  budgetBreakdown: string; // free text bullets
}

export interface QuickWizardData {
  organization?: Partial<QuickOrganizationData>;
  program?: Partial<QuickProgramData>;
  budget?: Partial<QuickBudgetData>;
}

export const ORG_TYPES: { value: QuickOrgType; label: string }[] = [
  { value: 'yayasan', label: 'Yayasan' },
  { value: 'lsm', label: 'LSM' },
  { value: 'umkm_sosial', label: 'UMKM Sosial' },
];

export const SDG_GOALS: { num: number; title: string; color: string }[] = [
  { num: 1, title: 'Tanpa Kemiskinan', color: '#E5243B' },
  { num: 2, title: 'Tanpa Kelaparan', color: '#DDA63A' },
  { num: 3, title: 'Kehidupan Sehat & Sejahtera', color: '#4C9F38' },
  { num: 4, title: 'Pendidikan Berkualitas', color: '#C5192D' },
  { num: 5, title: 'Kesetaraan Gender', color: '#FF3A21' },
  { num: 6, title: 'Air Bersih & Sanitasi Layak', color: '#26BDE2' },
  { num: 7, title: 'Energi Bersih & Terjangkau', color: '#FCC30B' },
  { num: 8, title: 'Pekerjaan Layak & Pertumbuhan Ekonomi', color: '#A21942' },
  { num: 9, title: 'Industri, Inovasi & Infrastruktur', color: '#FD6925' },
  { num: 10, title: 'Berkurangnya Kesenjangan', color: '#DD1367' },
  { num: 11, title: 'Kota & Komunitas Berkelanjutan', color: '#FD9D24' },
  { num: 12, title: 'Konsumsi & Produksi Bertanggung Jawab', color: '#BF8B2E' },
  { num: 13, title: 'Penanganan Perubahan Iklim', color: '#3F7E44' },
  { num: 14, title: 'Ekosistem Lautan', color: '#0A97D9' },
  { num: 15, title: 'Ekosistem Daratan', color: '#56C02B' },
  { num: 16, title: 'Perdamaian, Keadilan & Kelembagaan Tangguh', color: '#00689D' },
  { num: 17, title: 'Kemitraan untuk Mencapai Tujuan', color: '#19486A' },
];