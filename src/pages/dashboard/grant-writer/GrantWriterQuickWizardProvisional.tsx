import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Loader2,
  Save,
  Sparkles,
  AlertTriangle,
  Info,
  Undo2,
  HelpCircle,
  HelpCircle as QuestionIcon,
  CheckCircle2,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Lock,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import {
  ProvisionalDomainResponse,
  ApprovedPage2Snapshot,
  ResolutionHistoryEntry,
  MappingRecommendation,
  SDGRecommendation,
  ActorRoleRecommendation,
  MissingInformationItem,
  AmbiguityItem
} from '@/lib/grant-writer/provisionalAdapter';
import { createPage2Payload } from '@/lib/grant-writer/deterministic';
import { assembleCanonicalProposalV2 } from '@/lib/grant-writer/deterministic/assemble-canonical-proposal-v2';
import type { Page1Input, CanonicalProposalPayloadV2 } from '@/lib/grant-writer/deterministic/types';
import { mapCanonicalProposalToRawEntries } from '@/lib/lfa/readAdapter';

export interface CanonicalFacts {
  proposedTitle: string;
  beneficiaryDescription: string;
  geography: string;
  primaryTargetActor?: string;
  primaryLocation?: string;
}

/**
 * Clean location string by stripping leading "di " or "Di " prefixes
 */
export function cleanLocationString(location?: string): string {
  if (!location) return '';
  let loc = location.trim();
  loc = loc.replace(/^di\s+/i, '').trim();
  return loc;
}

/**
 * Extract primary target actor by removing location occurrences from beneficiary description
 */
export function extractPrimaryTargetActor(beneficiaryDescription?: string, geography?: string): string {
  if (!beneficiaryDescription) return '';
  let actor = beneficiaryDescription.trim();
  const cleanLoc = cleanLocationString(geography);

  if (cleanLoc && cleanLoc.length > 1) {
    const escLoc = cleanLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    actor = actor.replace(new RegExp(`\\bdi\\s+${escLoc}\\b`, 'gi'), '');
    actor = actor.replace(new RegExp(`\\b${escLoc}\\b`, 'gi'), '');
    actor = actor.replace(/\s+/g, ' ').trim();
  }

  return actor || beneficiaryDescription.trim();
}

/**
 * Prevent duplicate location phrases in any text string.
 * Ensures "Janda di Cirebon di Cirebon", "Cirebon di Cirebon", "di Cirebon di Cirebon" do not occur.
 */
export function preventDuplicateLocation(text: string, location?: string): string {
  if (!text) return '';
  let result = text;

  const cleanLoc = cleanLocationString(location);

  if (cleanLoc && cleanLoc.length > 1) {
    const escLoc = cleanLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b(${escLoc})\\s+di\\s+${escLoc}\\b`, 'gi'), '$1');
    result = result.replace(new RegExp(`\\bdi\\s+${escLoc}\\s+di\\s+${escLoc}\\b`, 'gi'), `di ${cleanLoc}`);
    result = result.replace(new RegExp(`\\bdi\\s+di\\s+${escLoc}\\b`, 'gi'), `di ${cleanLoc}`);
    result = result.replace(new RegExp(`\\b(${escLoc})\\s+${escLoc}\\b`, 'gi'), '$1');
  }

  result = result.replace(/\b(di\s+[A-Za-z0-9-]+)\s+di\s+([A-Za-z0-9-]+)\b/gi, (match, p1, p2) => {
    if (p1.toLowerCase().endsWith(p2.toLowerCase())) {
      return p1;
    }
    return match;
  });

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Combine beneficiary description and location cleanly without duplicate location rendering
 */
export function formatBeneficiaryWithLocation(beneficiary?: string, location?: string): string {
  const cleanLoc = cleanLocationString(location);
  const rawBen = beneficiary ? beneficiary.trim() : 'penerima manfaat';

  if (!cleanLoc || cleanLoc.toLowerCase() === 'indonesia' || cleanLoc === 'Lokasi Belum Ditentukan' || cleanLoc === 'unknown') {
    return rawBen;
  }

  if (rawBen.toLowerCase().includes(cleanLoc.toLowerCase())) {
    return rawBen;
  }

  return `${rawBen} di ${cleanLoc}`;
}

/**
 * Suggest a professional program title from program story and target beneficiary
 */
export function suggestTitleFromStory(story: string, beneficiary?: string, location?: string): string {
  const cleanLoc = cleanLocationString(location);
  const locStr = cleanLoc && cleanLoc !== 'Lokasi Belum Ditentukan' && cleanLoc.toLowerCase() !== 'indonesia' ? ` di ${cleanLoc}` : '';
  
  if (beneficiary && beneficiary.trim().length > 3) {
    const benStr = beneficiary.trim();
    return `Pemberdayaan ${benStr}${locStr}`;
  }

  const s = (story || '').trim();
  if (s.length > 5) {
    const firstSentence = s.split(/[.\n]/)[0].trim();
    if (firstSentence.length >= 6 && firstSentence.length <= 60) {
      return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    }
  }

  return 'Program Pemberdayaan Masyarakat';
}

export function detectEntityDrift(
  facts: CanonicalFacts,
  reviewTexts: string[]
): { hasDrift: boolean; message?: string } {
  const combinedText = reviewTexts.join(' ').toLowerCase();
  const missingElements: string[] = [];

  if (facts.primaryTargetActor && facts.primaryTargetActor.length > 2) {
    const actor = facts.primaryTargetActor.toLowerCase();
    if (!combinedText.includes(actor)) {
      missingElements.push(`Sasaran Utama ("${facts.primaryTargetActor}")`);
    }
  }

  if (facts.primaryLocation && facts.primaryLocation.length > 2 && facts.primaryLocation !== 'Belum diketahui') {
    const loc = facts.primaryLocation.toLowerCase();
    if (!combinedText.includes(loc)) {
      missingElements.push(`Lokasi ("${facts.primaryLocation}")`);
    }
  }

  if (missingElements.length > 0) {
    return {
      hasDrift: true,
      message: `Elemen fakta Page 1 ${missingElements.join(' dan ')} belum terwakili secara eksplisit dalam konten review Page 2. (Peringatan drift entitas — tidak memblokir persetujuan).`,
    };
  }

  return { hasDrift: false };
}

/**
 * Convert technical missing info IDs and questions into friendly human-readable labels (UX-HARDENING-2 Task 3)
 */
export function getHumanReadableMissingInfoLabel(id: string, question: string): string {
  const lowerQ = (question || '').toLowerCase();
  const lowerId = (id || '').toLowerCase();

  if (lowerId.includes('001') || lowerId.includes('beneficiary') || lowerQ.includes('penerima') || lowerQ.includes('sasaran') || lowerQ.includes('jumlah')) {
    return 'Sasaran Program & Penerima Manfaat';
  }
  if (lowerId.includes('sb') || lowerQ.includes('intervensi') || lowerQ.includes('prioritas') || lowerQ.includes('scope')) {
    return 'Prioritas Intervensi Program Belum Ditentukan';
  }
  if (lowerId.includes('002') || lowerId.includes('location') || lowerQ.includes('lokasi') || lowerQ.includes('wilayah')) {
    return 'Lokasi Pelaksanaan Program';
  }
  if (lowerId.includes('003') || lowerId.includes('duration') || lowerQ.includes('durasi') || lowerQ.includes('bulan')) {
    return 'Durasi Pelaksanaan Program';
  }
  if (lowerId.includes('004') || lowerId.includes('budget') || lowerQ.includes('anggaran') || lowerQ.includes('biaya')) {
    return 'Perkiraan Anggaran Program';
  }
  if (lowerId.includes('006') || lowerId.includes('actor') || lowerQ.includes('aktor')) {
    return 'Peran Aktor Utama & Mitra';
  }
  if (lowerId.includes('007') || lowerId.includes('story') || lowerQ.includes('masalah') || lowerQ.includes('cerita')) {
    return 'Cerita & Masalah Utama Program';
  }
  if (lowerId.includes('010') || lowerId.includes('donor') || lowerQ.includes('donor') || lowerQ.includes('pendana')) {
    return 'Target Donor & Mitra Pendana';
  }

  if (question && question.trim().length > 0) {
    const cleanQuestion = question.length > 70 ? question.substring(0, 70) + '...' : question;
    return `Rincian Informasi: ${cleanQuestion}`;
  }

  return `Klarifikasi Detail Program`;
}

/**
 * Convert technical role keys to clean Indonesian role labels (GW-UX-03 Task 5)
 */
export function getHumanReadableRoleLabel(role: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('beneficiary') || r.includes('target') || r.includes('penerima')) return 'Target Utama';
  if (r.includes('donor') || r.includes('partner') || r.includes('pendana') || r.includes('mitra')) return 'Mitra Potensial';
  if (r.includes('agency') || r.includes('actor') || r.includes('implement') || r.includes('pelaksana')) return 'Pelaksana Program';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Convert technical warning codes to plain human-readable program insights (GW-UX-03 Task 2)
 */
export function getHumanReadableWarningTitle(code: string, message: string): { title: string; subtitle: string } {
  const c = (code || '').toUpperCase();
  if (c.includes('IMPACT') || c.includes('007') || message.toLowerCase().includes('dampak')) {
    return {
      title: 'Perubahan jangka panjang program masih belum cukup jelas',
      subtitle: 'Jelaskan dampak sosial, ekonomi, atau lingkungan yang ingin dicapai setelah kegiatan selesai.'
    };
  }
  if (c.includes('LOCATION') || message.toLowerCase().includes('lokasi')) {
    return {
      title: 'Lokasi pelaksanaan program memerlukan penajaman',
      subtitle: 'Tentukan wilayah atau lokasi spesifik agar rancangan intervensi lebih akurat.'
    };
  }
  if (c.includes('BENEFICIARY') || message.toLowerCase().includes('penerima') || message.toLowerCase().includes('sasaran')) {
    return {
      title: 'Profil dan jumlah penerima manfaat perlu diperjelas',
      subtitle: 'Sebutkan perkiraan jumlah target penerima manfaat atau kriteria kelompok sasaran.'
    };
  }
  return {
    title: 'Catatan Penyempurnaan Program',
    subtitle: message
  };
}


function buildLiveDomainResponse(
  input: Page1Input,
  canonical: CanonicalProposalPayloadV2
): ProvisionalDomainResponse {
  const detPayload = createPage2Payload(input, {
    engineVersion: 'det-engine-v2.0',
    mode: 'production',
  });

  const rawLoc = input.location || input.geography || 'lokasi program';
  const cleanLoc = cleanLocationString(rawLoc) || 'lokasi program';
  const benWithLoc = formatBeneficiaryWithLocation(input.beneficiaryDescription, cleanLoc);
  const primaryActor = extractPrimaryTargetActor(input.beneficiaryDescription, cleanLoc) || 'Penerima Manfaat Utama';

  const sectors: MappingRecommendation[] = detPayload.sectors.map(s => ({
    id: s.id,
    label: s.label || s.id,
    level: s.level,
    confidence: s.confidenceBand || 'high',
    confidenceScore: s.confidenceScore || 0.85,
    explanation: preventDuplicateLocation(s.explanation || `Rekomendasi sektor berdasarkan analisis input program "${input.programTitle}".`, cleanLoc),
    evidence: s.evidenceSpans?.[0] ? {
      sourceField: s.evidenceSpans[0].sourceField,
      text: s.evidenceSpans[0].matchedText,
      startOffset: s.evidenceSpans[0].startOffset,
      endOffset: s.evidenceSpans[0].endOffset,
    } : {
      sourceField: 'programTitle',
      text: input.programTitle || input.beneficiaryDescription,
    }
  }));

  const interventions: MappingRecommendation[] = detPayload.interventions.map(i => ({
    id: i.id,
    label: i.label || i.id,
    level: i.level,
    confidence: i.confidenceBand || 'high',
    confidenceScore: i.confidenceScore || 0.8,
    explanation: preventDuplicateLocation(i.explanation || `Arketipe intervensi sesuai fokus "${input.programTitle}".`, cleanLoc)
  }));

  const sdgNameMap: Record<number, string> = {
    1: 'Tanpa Kemiskinan',
    2: 'Tanpa Kelaparan',
    3: 'Kehidupan Sehat & Sejahtera',
    4: 'Pendidikan Berkualitas',
    5: 'Kesetaraan Gender',
    6: 'Air Bersih & Sanitasi Layak',
    7: 'Energi Bersih & Terjangkau',
    8: 'Pekerjaan Layak & Pertumbuhan Ekonomi',
    9: 'Industri, Inovasi & Infrastruktur',
    10: 'Berkurangnya Kesenjangan',
    11: 'Kota & Pemukiman Berkelanjutan',
    12: 'Konsumsi & Produksi Bertanggung Jawab',
    13: 'Penanganan Perubahan Iklim',
    14: 'Ekosistem Lautan',
    15: 'Ekosistem Daratan',
    16: 'Perdamaian, Keadilan & Kelembagaan Tangguh',
    17: 'Kemitraan untuk Mencapai Tujuan',
  };

  const sdgs: SDGRecommendation[] = detPayload.sdgs.map(s => {
    const num = Number(s.id.replace('SDG_', ''));
    return {
      num,
      label: sdgNameMap[num] || `SDG ${num}`,
      level: s.level,
      confidence: s.confidenceBand || 'medium',
      confidenceScore: s.confidenceScore || 0.75,
      explanation: preventDuplicateLocation(s.explanation || `Penyelarasan SDG ${num} untuk target program di ${cleanLoc}.`, cleanLoc)
    };
  });

  const actorRoles: ActorRoleRecommendation[] = [
    {
      id: 'ACT-BENEFICIARY-01',
      actorName: primaryActor,
      role: 'target_beneficiary',
      level: 'primary',
      confidence: 'high',
      confidenceScore: 0.9,
      explanation: preventDuplicateLocation(`Masyarakat sasaran utama program di ${cleanLoc}.`, cleanLoc)
    },
    {
      id: 'ACT-IMPLEMENTER-01',
      actorName: `Fasilitator & Pendamping (${cleanLoc})`,
      role: 'implementing_partner',
      level: 'secondary',
      confidence: 'medium',
      confidenceScore: 0.8,
      explanation: 'Pihak pengelola dan pendamping aktivitas harian program.'
    }
  ];

  const beneficiaryStr = input.beneficiaryDescription ? input.beneficiaryDescription.trim() : 'penerima manfaat';
  const countStr = input.beneficiaryCount ? `${input.beneficiaryCount} ` : '';

  const outcomeText = canonical.outcomes.map(o => o.outcome_name).join('; ');
  const outputText = canonical.outcomes.flatMap(o => o.outputs).map(op => op.output_name).join('; ');

  const blueprintItems = [
    {
      id: 'SLOT-PROBLEM-01',
      section: 'Problem Summary' as const,
      text: preventDuplicateLocation(
        input.programStory
          ? input.programStory
          : `Terdapat tantangan dan kebutuhan pemberdayaan terfokus bagi ${benWithLoc}.`,
        cleanLoc
      ),
      status: 'from_source' as const,
      explanation: 'Disusun langsung dari informasi yang dimasukkan pengusul.'
    },
    {
      id: 'SLOT-IMPACT-01',
      section: 'Impact Direction' as const,
      text: preventDuplicateLocation(
        canonical.outcomes[0]?.description
          || `Meningkatkan kesejahteraan, kemandirian, dan kapasitas ${benWithLoc} secara berkelanjutan.`,
        cleanLoc
      ),
      status: 'inferred' as const,
      explanation: 'Arah dampak jangka panjang yang diproyeksikan sistem.'
    },
    {
      id: 'SLOT-OUTCOME-01',
      section: 'Expected Changes' as const,
      text: preventDuplicateLocation(
        outcomeText
          || `Terwujudnya peningkatan kemampuan dan hasil nyata bagi ${countStr}${benWithLoc}.`,
        cleanLoc
      ),
      status: 'inferred' as const,
      explanation: 'Hasil perubahan (outcome) utama dari intervensi program.'
    },
    {
      id: 'SLOT-OUTPUT-01',
      section: 'Direct Results' as const,
      text: preventDuplicateLocation(
        outputText
          || `Terlaksananya rangkaian pelatihan, pendampingan, dan penyediaan sarana pendukung bagi ${beneficiaryStr}.`,
        cleanLoc
      ),
      status: 'inferred' as const,
      explanation: 'Capaian langsung (output) yang dihasilkan kegiatan.'
    },
    {
      id: 'SLOT-PARTNER-01',
      section: 'Suggested Partners' as const,
      text: preventDuplicateLocation(
        input.donorOrCallOptional
          ? `Mitra Pendana: ${input.donorOrCallOptional}; Dinas Terkait & Komunitas Lokal di ${cleanLoc}`
          : `Dinas Terkait, Komunitas Lokal, dan Fasilitator Pendamping di ${cleanLoc}`,
        cleanLoc
      ),
      status: 'inferred' as const,
      explanation: 'Usulan kemitraan strategis untuk kelancaran program.'
    },
    {
      id: 'SLOT-CROSS-01',
      section: 'Cross-Cutting Relevance' as const,
      text: preventDuplicateLocation(
        `Pengarusutamaan kesetaraan gender, inklusi sosial, dan keberlanjutan pemanfaatan fasilitas di ${cleanLoc}.`,
        cleanLoc
      ),
      status: 'inferred' as const,
      explanation: 'Prinsip lintas sektor yang relevan dengan usulan.'
    }
  ];

  const missingInformation: MissingInformationItem[] = detPayload.missingInformation?.map(m => ({
    id: m.id,
    question: m.question,
    priority: m.priority,
    resolutionState: m.state === 'unresolved' ? 'unresolved' : 'resolved_accepted',
    blocking: m.blocking,
    requiredForApproval: m.requiredForApproval,
  })) || [];

  const ambiguities: AmbiguityItem[] = detPayload.ambiguities?.map(a => ({
    id: a.id,
    field: a.field,
    description: `Klasifikasi bidang ${a.field} terdeteksi memiliki beberapa kandidat potensial.`,
    candidates: a.candidates,
    requiredForApproval: a.requiredForApproval
  })) || [];

  const warnings = detPayload.warnings?.map(w => ({
    id: w.id,
    code: w.code,
    severity: w.severity as 'blocking' | 'important' | 'info',
    message: w.message
  })) || [];

  return {
    contractVersion: '1.2',
    contractStatus: 'provisional_against_v1_2',
    engineVersion: 'det-engine-v2.0',
    registryVersions: { sector: '1.0', actor: '1.0' },
    createdAt: new Date().toISOString(),
    sectors,
    interventions,
    sdgs,
    actorRoles,
    ambiguities,
    missingInformation,
    warnings,
    blueprint: {
      items: blueprintItems
    }
  };
}

// Visual colors for SDGs as per standards
const SDG_COLORS: Record<number, string> = {
  1: '#E5243B',
  2: '#DDA63A',
  3: '#4C9F38',
  4: '#C5192D',
  5: '#FF3A21',
  6: '#26BDE2',
  7: '#FCC30B',
  8: '#A21942',
  9: '#FD6925',
  10: '#DD1367',
  11: '#FD9D24',
  12: '#BF8B2E',
  13: '#3F7E44',
  14: '#0A97D9',
  15: '#56C02B',
  16: '#00689D',
  17: '#19486A',
};

interface SavedWizardData {
  proposedTitle?: string;
  geography?: string;
  geographyUnknown?: boolean;
  durationMonths?: number | 'unknown' | 'unentered';
  durationUnknown?: boolean;
  beneficiaryDescription?: string;
  beneficiaryCount?: number | 'unknown' | 'unentered';
  beneficiaryCountUnknown?: boolean;
  budgetIdr?: number | 'unknown' | 'unentered';
  budgetIdrUnknown?: boolean;
  targetDonor?: string;
  donorStandard?: string;
  programStory?: string;
  
  currentFlowPage?: 'page1' | 'processing' | 'page2' | 'approved';
  selectedFixtureId?: string;
  domainResponse?: ProvisionalDomainResponse;
  acceptedSectors?: string[];
  acceptedInterventions?: string[];
  acceptedSdgs?: number[];
  acceptedActorRoles?: string[];
  blueprintEdits?: Record<string, string>;
  ambiguityResolutions?: Record<string, string>;
  missingInfoResolutions?: Record<string, { answer?: string, state: string }>;
  approvedSnapshot?: ApprovedPage2Snapshot;
}

export default function GrantWriterQuickWizardProvisional() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isDev = import.meta.env.DEV;

  // Local UI State
  const [currentFlowPage, setCurrentFlowPage] = useState<'page1' | 'processing' | 'page2' | 'approved'>('page1');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('live-engine');
  const [isSaving, setIsSaving] = useState(false);
  const [approvedSnapshot, setApprovedSnapshot] = useState<ApprovedPage2Snapshot | null>(null);
  const [canonicalPayload, setCanonicalPayload] = useState<CanonicalProposalPayloadV2 | null>(null);
  const [canonicalMetrics, setCanonicalMetrics] = useState<{
    outcomeCount: number;
    outputCount: number;
    activityCount: number;
    indicatorCount: number;
    costDriverCount: number;
    bqs27k: number;
  } | null>(null);
  
  // Page 1 Inputs
  const [proposedTitle, setProposedTitle] = useState('');
  const [geography, setGeography] = useState('');
  const [geographyUnknown, setGeographyUnknown] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [durationUnknown, setDurationUnknown] = useState(false);
  const [beneficiaryDescription, setBeneficiaryDescription] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState<number | ''>('');
  const [beneficiaryCountUnknown, setBeneficiaryCountUnknown] = useState(false);
  const [budgetIdr, setBudgetIdr] = useState<number | ''>('');
  const [budgetIdrUnknown, setBudgetIdrUnknown] = useState(false);
  const [targetDonor, setTargetDonor] = useState('');
  const [donorStandard, setDonorStandard] = useState('un_oecd_dac');
  const [programStory, setProgramStory] = useState('');

  // Processing Animation State
  const [processingStep, setProcessingStep] = useState(0);

  // Page 2 State (Working variables)
  const [domainResponse, setDomainResponse] = useState<ProvisionalDomainResponse | null>(null);
  
  // User review decisions stored separately (Manual overrides and edits)
  const [acceptedSectors, setAcceptedSectors] = useState<string[]>([]);
  const [acceptedInterventions, setAcceptedInterventions] = useState<string[]>([]);
  const [acceptedSdgs, setAcceptedSdgs] = useState<number[]>([]);
  const [acceptedActorRoles, setAcceptedActorRoles] = useState<string[]>([]);
  
  const [blueprintEdits, setBlueprintEdits] = useState<Record<string, string>>({}); // itemId -> editedText
  const [ambiguityResolutions, setAmbiguityResolutions] = useState<Record<string, string>>({}); // ambiguityId -> resolvedValue
  const [missingInfoResolutions, setMissingInfoResolutions] = useState<Record<string, { answer?: string, state: string }>>({}); // infoId -> state

  // Disclosure states
  const [whyRecommendedOpen, setWhyRecommendedOpen] = useState<Record<string, boolean>>({});
  const [showRejectedSdgs, setShowRejectedSdgs] = useState(false);

  // Check if inputs have been modified since review started (review is stale)
  const [reviewIsStale, setReviewIsStale] = useState(false);

  // Canonical facts computed from Page 1 fields (UX-FACT-01)
  const canonicalFacts = useMemo<CanonicalFacts>(() => {
    const title = proposedTitle.trim();
    const rawBeneficiary = beneficiaryDescription.trim();
    const rawGeography = geographyUnknown ? '' : geography.trim();
    const cleanLoc = cleanLocationString(rawGeography);
    const primaryActor = extractPrimaryTargetActor(rawBeneficiary, cleanLoc);

    return {
      proposedTitle: title,
      beneficiaryDescription: rawBeneficiary,
      geography: rawGeography,
      primaryTargetActor: primaryActor,
      primaryLocation: cleanLoc || '—',
    };
  }, [proposedTitle, beneficiaryDescription, geography, geographyUnknown]);

  // RC-9B.5: Empty Canonical Payload Readiness Check (Task 1 & Task 4)
  const { totalOutcomes, totalOutputs, totalActivities, hasCanonicalStructure } = useMemo(() => {
    // 1. If canonicalPayload is present (from assembler execution)
    if (canonicalPayload) {
      const outcomes = canonicalPayload.outcomes || [];
      const outputs = outcomes.flatMap(o => o.outputs || []);
      const activities = outputs.flatMap(op => op.activities || []);
      const hasStructure = outcomes.length > 0 || outputs.length > 0 || activities.length > 0;
      return {
        totalOutcomes: outcomes.length,
        totalOutputs: outputs.length,
        totalActivities: activities.length,
        hasCanonicalStructure: hasStructure
      };
    }

    // 2. If rawCanonicalPayload in domainResponse has outcomes array
    const rawOutcomes = domainResponse?.rawCanonicalPayload?.outcomes;
    if (Array.isArray(rawOutcomes)) {
      const outputs = rawOutcomes.flatMap((o: any) => o.outputs || []);
      const activities = outputs.flatMap((op: any) => op.activities || []);
      const hasStructure = rawOutcomes.length > 0 || outputs.length > 0 || activities.length > 0;
      return {
        totalOutcomes: rawOutcomes.length,
        totalOutputs: outputs.length,
        totalActivities: activities.length,
        hasCanonicalStructure: hasStructure
      };
    }

    // 3. If canonicalMetrics exists
    if (canonicalMetrics) {
      const hasStructure = canonicalMetrics.outcomeCount > 0 || canonicalMetrics.outputCount > 0 || canonicalMetrics.activityCount > 0;
      return {
        totalOutcomes: canonicalMetrics.outcomeCount,
        totalOutputs: canonicalMetrics.outputCount,
        totalActivities: canonicalMetrics.activityCount,
        hasCanonicalStructure: hasStructure
      };
    }

    // 4. Fallback for legacy test fixtures where canonicalPayload is not attached
    return {
      totalOutcomes: 0,
      totalOutputs: 0,
      totalActivities: 0,
      hasCanonicalStructure: true
    };
  }, [canonicalPayload, domainResponse, canonicalMetrics]);

  const reviewContentTexts = useMemo(() => {
    if (!domainResponse) return [];
    const texts: string[] = [];

    domainResponse.blueprint.items.forEach(item => {
      const txt = blueprintEdits[item.id] !== undefined ? blueprintEdits[item.id] : item.text;
      texts.push(txt);
    });

    domainResponse.actorRoles.forEach(actor => {
      texts.push(actor.actorName);
      texts.push(actor.explanation);
    });

    domainResponse.sectors.forEach(sec => {
      texts.push(sec.label);
      texts.push(sec.explanation);
    });

    domainResponse.interventions.forEach(act => {
      texts.push(act.label);
      texts.push(act.explanation);
    });

    domainResponse.sdgs.forEach(sdg => {
      texts.push(sdg.label);
      texts.push(sdg.explanation);
    });

    if (canonicalPayload) {
      canonicalPayload.outcomes.forEach(oc => {
        texts.push(oc.outcome_name);
        texts.push(oc.description);
        oc.outputs.forEach(op => {
          texts.push(op.output_name);
          texts.push(op.description);
          op.activities.forEach(act => {
            texts.push(act.activity_name);
            texts.push(act.description);
          });
        });
      });
    }

    return texts;
  }, [domainResponse, blueprintEdits, canonicalPayload]);

  const driftWarning = useMemo(() => {
    if (!domainResponse || currentFlowPage !== 'page2') return null;
    return detectEntityDrift(canonicalFacts, reviewContentTexts);
  }, [domainResponse, currentFlowPage, canonicalFacts, reviewContentTexts]);

  // UX-HARDENING-2 State & Navigation Helpers
  const [showAllSectors, setShowAllSectors] = useState(false);

  const navigateToField = (targetKey: string) => {
    const page1Map: Record<string, string> = {
      location: 'program-geography',
      geography: 'program-geography',
      'MISS-002': 'program-geography',
      beneficiary: 'beneficiary-description',
      'MISS-001': 'beneficiary-description',
      'MISS-006': 'beneficiary-description',
      duration: 'program-duration',
      'MISS-003': 'program-duration',
      budget: 'budget-idr',
      'MISS-004': 'budget-idr',
      donor: 'target-donor',
      'MISS-010': 'target-donor',
      story: 'program-story',
      'MISS-007': 'program-story',
      title: 'program-title',
      'proposed-title': 'program-title',
    };

    const targetElementId = page1Map[targetKey];

    if (targetElementId) {
      if (currentFlowPage !== 'page1') {
        setCurrentFlowPage('page1');
      }
      setTimeout(() => {
        const el = document.getElementById(targetElementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 120);
    } else {
      const page2Map: Record<string, string> = {
        sector: 'section-sectors',
        ambiguity: 'section-ambiguities',
        actor_roles: 'section-actor-roles',
        missing_info: 'section-missing-info',
        blueprint: 'section-blueprint',
      };
      const sectionId = page2Map[targetKey] || (targetKey.startsWith('MISS-') ? 'section-missing-info' : 'section-ambiguities');
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Timer Ref to prevent memory leaks on unmount
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ref for Program Story textarea autofocus
  const programStoryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentFlowPage === 'page1') {
      const timer = setTimeout(() => {
        if (programStoryRef.current) {
          programStoryRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentFlowPage]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, []);

  // Fetch Project context for database reference if needed (non-blocking)
  const { data: dbProject } = useQuery({
    queryKey: ['gw-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Query organization details directly
  const { data: dbOrganization } = useQuery({
    queryKey: ['gw-organization', dbProject?.organization_id],
    queryFn: async () => {
      if (!dbProject?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', dbProject.organization_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dbProject?.organization_id,
  });

  // Determine active organization details
  const orgName = dbOrganization?.name || "Profil organisasi belum tersedia";
  const orgType = dbOrganization?.description ? "Terdaftar" : "—";
  const isOrgComplete = !!(dbOrganization && dbOrganization.description && dbOrganization.website);

  // Load project defaults or restored wizard data
  useEffect(() => {
    if (dbProject) {
      const wd = (dbProject.wizard_data ?? {}) as SavedWizardData;
      
      if (Object.keys(wd).length > 0) {
        if (wd.proposedTitle !== undefined) setProposedTitle(wd.proposedTitle || '');
        if (wd.geography !== undefined) setGeography(wd.geography || '');
        if (wd.geographyUnknown !== undefined) setGeographyUnknown(!!wd.geographyUnknown);
        if (wd.durationMonths !== undefined) {
          setDurationMonths(wd.durationMonths === 'unknown' || wd.durationMonths === 'unentered' ? '' : wd.durationMonths);
        }
        if (wd.durationUnknown !== undefined) setDurationUnknown(!!wd.durationUnknown);
        if (wd.beneficiaryDescription !== undefined) setBeneficiaryDescription(wd.beneficiaryDescription || '');
        if (wd.beneficiaryCount !== undefined) {
          setBeneficiaryCount(wd.beneficiaryCount === 'unknown' || wd.beneficiaryCount === 'unentered' ? '' : wd.beneficiaryCount);
        }
        if (wd.beneficiaryCountUnknown !== undefined) setBeneficiaryCountUnknown(!!wd.beneficiaryCountUnknown);
        if (wd.budgetIdr !== undefined) {
          setBudgetIdr(wd.budgetIdr === 'unknown' || wd.budgetIdr === 'unentered' ? '' : wd.budgetIdr);
        }
        if (wd.budgetIdrUnknown !== undefined) setBudgetIdrUnknown(!!wd.budgetIdrUnknown);
        if (wd.targetDonor !== undefined) setTargetDonor(wd.targetDonor || '');
        if (wd.donorStandard !== undefined) setDonorStandard(wd.donorStandard || 'un_oecd_dac');
        if (wd.programStory !== undefined) setProgramStory(wd.programStory || '');
        
        if (wd.currentFlowPage !== undefined) setCurrentFlowPage(wd.currentFlowPage);
        if (wd.selectedFixtureId !== undefined) setSelectedFixtureId(wd.selectedFixtureId);
        if (wd.canonicalPayload !== undefined) setCanonicalPayload(wd.canonicalPayload);
        if (wd.domainResponse !== undefined) setDomainResponse(wd.domainResponse);
        if (wd.acceptedSectors !== undefined) setAcceptedSectors(wd.acceptedSectors || []);
        if (wd.acceptedInterventions !== undefined) setAcceptedInterventions(wd.acceptedInterventions || []);
        if (wd.acceptedSdgs !== undefined) setAcceptedSdgs(wd.acceptedSdgs || []);
        if (wd.acceptedActorRoles !== undefined) setAcceptedActorRoles(wd.acceptedActorRoles || []);
        if (wd.blueprintEdits !== undefined) setBlueprintEdits(wd.blueprintEdits || {});
        if (wd.ambiguityResolutions !== undefined) setAmbiguityResolutions(wd.ambiguityResolutions || {});
        if (wd.missingInfoResolutions !== undefined) setMissingInfoResolutions(wd.missingInfoResolutions || {});
        if (wd.approvedSnapshot !== undefined) setApprovedSnapshot(wd.approvedSnapshot);
      } else {
        setProposedTitle(dbProject.title || '');
        setGeography(dbProject.geography || '');
        if (dbProject.duration_months) {
          setDurationMonths(dbProject.duration_months);
        } else if (dbProject.duration_months === null) {
          setDurationUnknown(true);
        }
        if (dbProject.budget_idr) {
          setBudgetIdr(dbProject.budget_idr);
        } else if (dbProject.budget_idr === null) {
          setBudgetIdrUnknown(true);
        }
        setTargetDonor(dbProject.target_donor || '');
        setDonorStandard(dbProject.donor_standard || 'un_oecd_dac');
      }
    }
  }, [dbProject]);

  // Genuine Supabase Draft Persistence implementation
  const saveDraft = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const existingWd = (dbProject?.wizard_data ?? {}) as Record<string, unknown>;
      const wizardData: SavedWizardData = {
        ...existingWd,
        proposedTitle,
        geography,
        geographyUnknown,
        durationMonths: durationUnknown ? 'unknown' : (durationMonths === '' ? 'unentered' : Number(durationMonths)),
        durationUnknown,
        beneficiaryDescription,
        beneficiaryCount: beneficiaryCountUnknown ? 'unknown' : (beneficiaryCount === '' ? 'unentered' : Number(beneficiaryCount)),
        beneficiaryCountUnknown,
        budgetIdr: budgetIdrUnknown ? 'unknown' : (budgetIdr === '' ? 'unentered' : Number(budgetIdr)),
        budgetIdrUnknown,
        targetDonor,
        donorStandard,
        programStory,
        
        currentFlowPage,
        selectedFixtureId,
        canonicalPayload: canonicalPayload || undefined,
        domainResponse: domainResponse || undefined,
        acceptedSectors,
        acceptedInterventions,
        acceptedSdgs,
        acceptedActorRoles,
        blueprintEdits,
        ambiguityResolutions,
        missingInfoResolutions,
        approvedSnapshot: approvedSnapshot || undefined
      };

      const { error } = await supabase
        .from('gw_projects')
        .update({ wizard_data: wizardData })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Draft Disimpan',
        description: 'Semua kemajuan formulir dan hasil peninjauan Anda berhasil disimpan secara aman ke database.',
      });
    } catch (err: unknown) {
      console.error('Error saving draft:', err);
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal saat menyimpan draft.';
      toast({
        title: 'Gagal Menyimpan Draft',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };



  // Handle Form Submission Page 1 -> Processing State
  const handleTinjauBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-fill temporary title if blank
    let finalTitle = proposedTitle.trim();
    if (!finalTitle) {
      finalTitle = 'Program Baru';
      setProposedTitle(finalTitle);
    }

    if (!beneficiaryDescription.trim()) {
      toast({
        title: 'Deskripsi Penerima Manfaat Wajib Diisi',
        description: 'Silakan jelaskan siapa penerima manfaat program Anda.',
        variant: 'destructive'
      });
      return;
    }
    if (!programStory.trim()) {
      toast({
        title: 'Cerita Program Wajib Diisi',
        description: 'Program story membantu sistem memahami detail intervensi Anda.',
        variant: 'destructive'
      });
      return;
    }

    // Go to Processing state
    setCurrentFlowPage('processing');
    setProcessingStep(0);

    // Cancel any existing running timer
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }

    // Simulate progressive loading of deterministic context engine
    processingTimerRef.current = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= 4) {
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
            processingTimerRef.current = null;
          }
          // Build Page1Input for 27.5k Brain single-pass execution
          const numericDuration = durationUnknown ? undefined : (durationMonths === '' ? undefined : Number(durationMonths));
          const numericBeneficiaries = beneficiaryCountUnknown ? undefined : (beneficiaryCount === '' ? undefined : Number(beneficiaryCount));
          const numericBudget = budgetIdrUnknown ? undefined : (budgetIdr === '' ? undefined : Number(budgetIdr));

          const page1Input: Page1Input = {
            id: projectId || `PROJ-${Date.now()}`,
            organization_id: dbProject?.organization_id || 'ORG-27K-001',
            programTitle: proposedTitle.trim(),
            program_title: proposedTitle.trim(),
            location: geographyUnknown ? 'Lokasi Belum Ditentukan' : (geography.trim() || 'Indonesia'),
            durationMonths: numericDuration,
            durationValue: numericDuration,
            duration_value: numericDuration,
            durationUnit: 'bulan',
            beneficiaryDescription: beneficiaryDescription.trim(),
            beneficiary_description: beneficiaryDescription.trim(),
            beneficiaryCount: numericBeneficiaries,
            beneficiaryValue: numericBeneficiaries,
            beneficiary_count: numericBeneficiaries,
            beneficiaryUnit: 'orang',
            fundingAmount: numericBudget,
            funding_amount: numericBudget,
            budgetIdr: numericBudget,
            currency: 'IDR',
            donor_or_call_optional: targetDonor.trim() || null,
            donorOrCallOptional: targetDonor.trim() || null,
            programStory: programStory.trim(),
            program_story: programStory.trim(),
          };

          // Execute 27.5k Brain Assembler V2
          const assemblerResult = assembleCanonicalProposalV2(page1Input);
          setCanonicalPayload(assemblerResult.proposal);
          setCanonicalMetrics(assemblerResult.metrics);

          // Build live domain response from input & canonical assembler result
          const liveDomainResponse = buildLiveDomainResponse(page1Input, assemblerResult.proposal);
          setDomainResponse(liveDomainResponse);
          
          // Pre-populate recommendations choices
          setAcceptedSectors(liveDomainResponse.sectors.filter(s => s.level === 'primary' || s.level === 'secondary').map(s => s.id));
          setAcceptedInterventions(liveDomainResponse.interventions.filter(i => i.level === 'primary' || i.level === 'secondary').map(i => i.id));
          setAcceptedSdgs(liveDomainResponse.sdgs.filter(s => s.level === 'primary' || s.level === 'secondary').map(s => s.num));
          setAcceptedActorRoles(liveDomainResponse.actorRoles.filter(a => a.level === 'primary' || a.level === 'secondary').map(a => a.id));
          
          // Clear previous edits
          setBlueprintEdits({});
          setAmbiguityResolutions({});
          setMissingInfoResolutions({});
          setReviewIsStale(false);
          
          // Go to Page 2
          setCurrentFlowPage('page2');
          return 4;
        }
        return prev + 1;
      });
    }, 450);
  };

  const processingMessages = [
    'Membaca informasi program...',
    'Mengidentifikasi konteks program...',
    'Menyusun rekomendasi sektor dan intervensi...',
    'Memeriksa keterkaitan SDG/TPB...',
    'Menyiapkan Program Blueprint...'
  ];

  // Helper toggle disclosure
  const toggleWhyRecommended = (id: string) => {
    setWhyRecommendedOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Check if there are any active blocking warnings/unresolved blocking info items (UX-HARDENING-2 Task 3)
  interface ActiveBlockerItem {
    id: string;
    label: string;
    targetKey: string;
  }

  const activeBlockers = useMemo<ActiveBlockerItem[]>(() => {
    if (!domainResponse) return [];
    const blockers: ActiveBlockerItem[] = [];

    // 1. Missing information that is blocking and unresolved
    domainResponse.missingInformation.forEach(info => {
      if (info.blocking || info.requiredForApproval) {
        const resolution = missingInfoResolutions[info.id];
        if (!resolution || resolution.state === 'unresolved') {
          blockers.push({
            id: info.id,
            label: getHumanReadableMissingInfoLabel(info.id, info.question),
            targetKey: info.id,
          });
        }
      }
    });

    // 2. Unresolved Ambiguities (only if requiredForApproval is true)
    domainResponse.ambiguities.forEach(amb => {
      if (amb.requiredForApproval) {
        const resolution = ambiguityResolutions[amb.id];
        if (!resolution) {
          blockers.push({
            id: amb.id,
            label: `⚠ Ambiguitas Sektor Terdeteksi: Pilihlah salah satu opsi untuk "${amb.field}"`,
            targetKey: 'ambiguity',
          });
        }
      }
    });

    return blockers;
  }, [domainResponse, missingInfoResolutions, ambiguityResolutions]);

  // Handle Approved Page 2 Snapshot
  const handleApproveBlueprint = async () => {
    if (!hasCanonicalStructure) {
      toast({
        title: 'Penyetujuan Diblokir',
        description: 'Blueprint tidak dapat disetujui karena belum menghasilkan struktur logframe.',
        variant: 'destructive'
      });
      return;
    }

    if (activeBlockers.length > 0) {
      toast({
        title: 'Penyetujuan Diblokir',
        description: 'Selesaikan semua kriteria kritis sebelum menyetujui blueprint.',
        variant: 'destructive'
      });
      return;
    }

    const numericDuration = durationUnknown ? 'unknown' : (durationMonths === '' ? 'unentered' : Number(durationMonths));
    const numericBeneficiaries = beneficiaryCountUnknown ? 'unknown' : (beneficiaryCount === '' ? 'unentered' : Number(beneficiaryCount));
    const numericBudget = budgetIdrUnknown ? 'unknown' : (budgetIdr === '' ? 'unentered' : Number(budgetIdr));

    const derivedGeoLevel = undefined;
    const derivedGeoStatus = undefined;

    const durationValue = typeof numericDuration === 'number' ? numericDuration : undefined;
    const durationUnit = 'months';

    const beneficiaryCountValue = typeof numericBeneficiaries === 'number' ? numericBeneficiaries : undefined;
    const beneficiaryUnit = 'individuals';

    const fundingAmount = typeof numericBudget === 'number' ? numericBudget : undefined;
    const currency = 'IDR';

    // Compile comprehensive resolution history
    const resolutionHistory: ResolutionHistoryEntry[] = [];

    // Track sector overrides
    domainResponse?.sectors.forEach(s => {
      const originallyAccepted = s.level !== 'rejected';
      const actuallyAccepted = acceptedSectors.includes(s.id);
      if (originallyAccepted !== actuallyAccepted) {
        resolutionHistory.push({
          itemId: s.id,
          field: 'level',
          action: 'override',
          oldValue: s.level,
          newValue: actuallyAccepted ? 'optional' : 'rejected',
          timestamp: new Date().toISOString()
        });
      } else {
        resolutionHistory.push({
          itemId: s.id,
          field: 'level',
          action: 'accept',
          oldValue: s.level,
          newValue: s.level,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track intervention overrides
    domainResponse?.interventions.forEach(i => {
      const originallyAccepted = i.level !== 'rejected';
      const actuallyAccepted = acceptedInterventions.includes(i.id);
      if (originallyAccepted !== actuallyAccepted) {
        resolutionHistory.push({
          itemId: i.id,
          field: 'level',
          action: 'override',
          oldValue: i.level,
          newValue: actuallyAccepted ? 'optional' : 'rejected',
          timestamp: new Date().toISOString()
        });
      } else {
        resolutionHistory.push({
          itemId: i.id,
          field: 'level',
          action: 'accept',
          oldValue: i.level,
          newValue: i.level,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track SDG overrides
    domainResponse?.sdgs.forEach(s => {
      const originallyAccepted = s.level !== 'rejected';
      const actuallyAccepted = acceptedSdgs.includes(s.num);
      if (originallyAccepted !== actuallyAccepted) {
        resolutionHistory.push({
          itemId: `SDG-${s.num}`,
          field: 'level',
          action: 'override',
          oldValue: s.level,
          newValue: actuallyAccepted ? 'optional' : 'rejected',
          timestamp: new Date().toISOString()
        });
      } else {
        resolutionHistory.push({
          itemId: `SDG-${s.num}`,
          field: 'level',
          action: 'accept',
          oldValue: s.level,
          newValue: s.level,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track actor role overrides
    domainResponse?.actorRoles.forEach(a => {
      const originallyAccepted = a.level !== 'rejected';
      const actuallyAccepted = acceptedActorRoles.includes(a.id);
      if (originallyAccepted !== actuallyAccepted) {
        resolutionHistory.push({
          itemId: a.id,
          field: 'level',
          action: 'override',
          oldValue: a.role,
          newValue: actuallyAccepted ? 'optional' : 'rejected',
          timestamp: new Date().toISOString()
        });
      } else {
        resolutionHistory.push({
          itemId: a.id,
          field: 'level',
          action: 'accept',
          oldValue: a.role,
          newValue: a.role,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track ambiguity resolutions
    Object.entries(ambiguityResolutions).forEach(([id, val]) => {
      resolutionHistory.push({
        itemId: id,
        field: 'resolvedValue',
        action: 'resolve',
        newValue: val,
        timestamp: new Date().toISOString()
      });
    });

    // Track missing info resolutions
    Object.entries(missingInfoResolutions).forEach(([id, res]) => {
      resolutionHistory.push({
        itemId: id,
        field: 'resolvedValue',
        action: 'resolve',
        newValue: res.answer,
        timestamp: new Date().toISOString()
      });
    });

    // Compose Approved Page 2 Snapshot
    const snapshot: ApprovedPage2Snapshot = {
      programFacts: {
        proposedTitle,
        geography: geographyUnknown ? 'unknown' : geography,
        geographyLevel: derivedGeoLevel,
        geographyStatus: derivedGeoStatus,
        durationMonths: numericDuration,
        durationValue,
        durationUnit,
        beneficiaryDescription,
        beneficiaryCount: numericBeneficiaries,
        beneficiaryCountValue,
        beneficiaryUnit,
        budgetIdr: numericBudget,
        fundingAmount,
        currency,
        supportingDocumentRefs: [],
        programStory
      },
      organization: orgName ? {
        orgId: dbProject?.organization_id || undefined,
        orgName,
        orgType,
        snapshotVersion: undefined,
        sdgFocus: []
      } : undefined,
      originalRecommendations: {
        sectors: domainResponse?.sectors || [],
        interventions: domainResponse?.interventions || [],
        sdgs: domainResponse?.sdgs || [],
        actorRoles: domainResponse?.actorRoles || []
      },
      acceptedSectors,
      rejectedSectors: domainResponse?.sectors.map(s => s.id).filter(id => !acceptedSectors.includes(id)) || [],
      acceptedInterventions,
      rejectedInterventions: domainResponse?.interventions.map(i => i.id).filter(id => !acceptedInterventions.includes(id)) || [],
      acceptedSdgs,
      rejectedSdgs: domainResponse?.sdgs.map(s => s.num).filter(num => !acceptedSdgs.includes(num)) || [],
      acceptedActorRoles,
      rejectedActorRoles: domainResponse?.actorRoles.map(a => a.id).filter(id => !acceptedActorRoles.includes(id)) || [],
      
      blueprint: {
        items: domainResponse?.blueprint.items.map(item => ({
          ...item,
          text: blueprintEdits[item.id] || item.text,
          status: blueprintEdits[item.id] ? 'modified' : 'confirmed'
        })) || []
      },
      ambiguities: domainResponse?.ambiguities.map(amb => ({
        ...amb,
        resolvedValue: ambiguityResolutions[amb.id]
      })) || [],
      missingInformation: domainResponse?.missingInformation.map(info => ({
        ...info,
        resolvedValue: missingInfoResolutions[info.id]?.answer,
        resolutionState: (missingInfoResolutions[info.id]?.state || 'unresolved') as 'unresolved' | 'answered_with_evidence' | 'answered_with_assertion'
      })) || [],
      warnings: domainResponse?.warnings || [],
      
      contractVersion: domainResponse?.contractVersion || '1.2',
      engineVersion: domainResponse?.engineVersion || 'det-engine-v1.0',
      registryVersions: domainResponse?.registryVersions || {},
      approvalTimestamp: new Date().toISOString(),

      // Preserve full Page 2 context
      outcomeFamilies: domainResponse?.outcomeFamilies || undefined,
      outputFamilies: domainResponse?.outputFamilies || undefined,
      crossCuttingRelevance: domainResponse?.crossCuttingRelevance || undefined,
      explanationTemplateMetadata: domainResponse?.explanationTemplateMetadata || undefined,
      resolutionHistory: resolutionHistory.length > 0 ? resolutionHistory : undefined,
      provenance: domainResponse?.provenance || undefined,
      passthrough: domainResponse?.passthrough || undefined,
      rawCanonicalPayload: domainResponse?.rawCanonicalPayload || undefined,
      adapterValidationIssues: domainResponse?.adapterValidationIssues || undefined
    };

    setApprovedSnapshot(snapshot);

    // 27.5k Brain Cutover: Persist Canonical LFA & Navigate directly to LFABuilder
    if (canonicalPayload) {
      setIsSaving(true);
      try {
        const targetProjectId = projectId || canonicalPayload.project_id;
        const rawEntries = mapCanonicalProposalToRawEntries(canonicalPayload);

        // 1. Upsert LFA Project
        await supabase
          .from('lfa_projects')
          .upsert({
            id: targetProjectId,
            org_id: canonicalPayload.organization_id || 'ORG-27K-001',
            name: canonicalPayload.metadata.title,
            location: canonicalPayload.metadata.geography,
            duration_months: canonicalPayload.metadata.duration_months,
            beneficiary_count: canonicalPayload.metadata.beneficiary_count,
            beneficiary_description: proposedTitle,
            status: 'ACTIVE',
            linked_grant_id: projectId || null,
            updated_at: new Date().toISOString()
          });

        // 2. Clean old entries and insert canonical entries
        await supabase.from('lfa_entries').delete().eq('project_id', targetProjectId);

        const formattedEntries = rawEntries.map(entry => ({
          id: entry.id,
          project_id: targetProjectId,
          org_id: canonicalPayload.organization_id || 'ORG-27K-001',
          level: entry.level,
          sequence: entry.sequence,
          parent_id: entry.parent_id,
          description: entry.description,
          indicator: entry.indicator,
          means_of_verification: entry.means_of_verification,
          assumption: entry.assumption,
          responsible_party: entry.responsible_party
        }));

        await supabase
          .from('lfa_entries')
          .insert(formattedEntries);

        toast({
          title: '✅ Blueprint Program Disetujui',
          description: 'Membuka LFA Matrix...',
        });

        // Navigate directly to LFABuilderEditor with targetProjectId
        navigate(`/dashboard/lfa-builder/${targetProjectId}?from=quick_proposal`, { state: { fromQuickProposal: true } });
        return;
      } catch (err) {
        console.error('Approve blueprint materialization error:', err);
        const targetProjectId = canonicalPayload.project_id;
        navigate(`/dashboard/lfa-builder/${targetProjectId}?from=quick_proposal`, { state: { fromQuickProposal: true } });
        return;
      } finally {
        setIsSaving(false);
      }
    }
    
    // Fallback view for legacy snapshots
    setCurrentFlowPage('approved');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header and Progress Indicator */}
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Program Blueprint Studio</h1>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold">Tahap 1: Konsep Program</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Isi cerita program dan detail utama. AI akan membantu menyusun draf kerangka kerja secara otomatis.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className={currentFlowPage === 'page1' ? 'text-primary border-b-2 border-primary pb-1' : ''}>1. Masukan Program</span>
          <span>&rarr;</span>
          <span className={currentFlowPage === 'page2' ? 'text-primary border-b-2 border-primary pb-1' : ''}>2. Review Blueprint</span>
          <span>&rarr;</span>
          <span className={currentFlowPage === 'approved' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-1' : ''}>3. Persetujuan</span>
        </div>
      </div>

      {/* PAGE 1: INFORMASI INTI PROGRAM */}
      {currentFlowPage === 'page1' && (
        <form onSubmit={handleTinjauBlueprint} className="space-y-6">
          {/* Active Organization Context */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Profil Organisasi Pengusul</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">{orgName}</span>
                <Badge variant="outline">{orgType}</Badge>
              </div>
              {!isOrgComplete && (
                <Alert className="border-amber-200 bg-amber-50/40 p-2.5 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <AlertDescription className="text-xs">
                    Profil organisasi belum lengkap. Informasi dasar organisasi akan disesuaikan otomatis oleh sistem.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Program Information Inputs */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Detail Rencana Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Judul Program (Optional, Non-blocking) */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="program-title" className="font-bold text-slate-900 text-sm">Judul Program (Opsional)</Label>
                  <span className="text-[11px] text-slate-500 font-normal">Dapat Anda isi nanti atau gunakan usulan AI</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="program-title"
                    placeholder="cth. Pemberdayaan Digital Janda Cirebon (Bisa dikosongkan dulu)"
                    value={proposedTitle}
                    onChange={(e) => {
                      setProposedTitle(e.target.value);
                      setReviewIsStale(true);
                    }}
                    className="bg-white flex-1"
                  />
                  {(programStory.trim().length > 5 || beneficiaryDescription.trim().length > 3) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const suggested = suggestTitleFromStory(programStory, beneficiaryDescription, geography);
                        setProposedTitle(suggested);
                        setReviewIsStale(true);
                        toast({
                          title: '✨ Usulan Judul Diterapkan',
                          description: `Judul diatur ke: "${suggested}"`,
                        });
                      }}
                      className="shrink-0 gap-1.5 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Usulkan Judul
                    </Button>
                  )}
                </div>
              </div>

              {/* SECTION A: CERITA PROGRAM (STORY-FIRST & AUTOFOCUSED) */}
              <div className="rounded-lg border-2 border-indigo-100 bg-indigo-50/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="program-story" className="font-bold text-indigo-950 text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Cerita Program (Program Story) *
                  </Label>
                  <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700 text-[10px]">Paling Utama</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jelaskan masalah utama, siapa yang terdampak, dan intervensi yang ingin dilakukan. AI akan mengekstrak kerangka program secara otomatis dari cerita ini.
                </p>
                <Textarea
                  id="program-story"
                  ref={programStoryRef}
                  autoFocus
                  rows={7}
                  placeholder="Jelaskan secara bebas namun jelas:
1. Masalah utama apa yang ingin diselesaikan?
2. Siapa kelompok masyarakat yang paling terdampak?
3. Siapa saja pihak atau aktor yang perlu dilibatkan?
4. Perubahan nyata apa yang diharapkan terjadi?
5. Kegiatan atau bentuk intervensi utama apa yang akan dijalankan?"
                  value={programStory}
                  onChange={(e) => {
                    setProgramStory(e.target.value);
                    setReviewIsStale(true);
                  }}
                  required
                  className="mt-1 bg-white font-sans text-xs leading-relaxed border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* SECTION B: PENERIMA MANFAAT */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Section B: Penerima Manfaat</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="beneficiary-description" className="font-semibold text-xs">Kelompok Sasaran Penerima Manfaat *</Label>
                    <Input
                      id="beneficiary-description"
                      placeholder="cth. Petani sawah tadah hujan skala kecil"
                      value={beneficiaryDescription}
                      onChange={(e) => {
                        setBeneficiaryDescription(e.target.value);
                        setReviewIsStale(true);
                      }}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="beneficiary-count" className="font-semibold text-xs">Target Jumlah Penerima (Orang)</Label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={beneficiaryCountUnknown}
                          onChange={(e) => {
                            setBeneficiaryCountUnknown(e.target.checked);
                            if (e.target.checked) setBeneficiaryCount('');
                            setReviewIsStale(true);
                          }}
                          className="rounded border-slate-300"
                        />
                        Belum diketahui
                      </label>
                    </div>
                    <Input
                      id="beneficiary-count"
                      type="number"
                      min="1"
                      placeholder="cth. 50"
                      value={beneficiaryCount}
                      onChange={(e) => {
                        setBeneficiaryCount(e.target.value === '' ? '' : Number(e.target.value));
                        setReviewIsStale(true);
                      }}
                      disabled={beneficiaryCountUnknown}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: LOKASI DAN SKALA */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Section C: Lokasi & Skala Program</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="program-geography" className="font-semibold text-xs">Lokasi Program</Label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={geographyUnknown}
                          onChange={(e) => {
                            setGeographyUnknown(e.target.checked);
                            if (e.target.checked) setGeography('');
                            setReviewIsStale(true);
                          }}
                          className="rounded border-slate-300"
                        />
                        Belum diketahui
                      </label>
                    </div>
                    <Input
                      id="program-geography"
                      placeholder="cth. Kabupaten Sleman, DIY"
                      value={geography}
                      onChange={(e) => {
                        setGeography(e.target.value);
                        setReviewIsStale(true);
                      }}
                      disabled={geographyUnknown}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="program-duration" className="font-semibold text-xs">Durasi Program (Bulan)</Label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={durationUnknown}
                          onChange={(e) => {
                            setDurationUnknown(e.target.checked);
                            if (e.target.checked) setDurationMonths('');
                            setReviewIsStale(true);
                          }}
                          className="rounded border-slate-300"
                        />
                        Belum diketahui
                      </label>
                    </div>
                    <Input
                      id="program-duration"
                      type="number"
                      min="1"
                      placeholder="cth. 12"
                      value={durationMonths}
                      onChange={(e) => {
                        setDurationMonths(e.target.value === '' ? '' : Number(e.target.value));
                        setReviewIsStale(true);
                      }}
                      disabled={durationUnknown}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="budget-idr" className="font-semibold text-xs">Perkiraan Anggaran Program (IDR)</Label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={budgetIdrUnknown}
                          onChange={(e) => {
                            setBudgetIdrUnknown(e.target.checked);
                            if (e.target.checked) setBudgetIdr('');
                            setReviewIsStale(true);
                          }}
                          className="rounded border-slate-300"
                        />
                        Belum diketahui
                      </label>
                    </div>
                    <Input
                      id="budget-idr"
                      type="number"
                      min="1"
                      placeholder="cth. 150000000"
                      value={budgetIdr}
                      onChange={(e) => {
                        setBudgetIdr(e.target.value === '' ? '' : Number(e.target.value));
                        setReviewIsStale(true);
                      }}
                      disabled={budgetIdrUnknown}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: PENGATURAN TINGKAT LANJUT (COLLAPSED ACCORDION) */}
              <details className="group rounded-lg border border-slate-200 bg-slate-50/40 transition-all">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-xs text-slate-700 select-none hover:text-slate-900">
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-slate-500" />
                    Section D: Pengaturan Tingkat Lanjut (Opsional)
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 group-open:hidden">+ Buka Pengaturan Donor & Standar Kebijakan</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden group-open:inline">– Tutup</span>
                </summary>
                <div className="border-t border-slate-200 p-4 space-y-4 bg-white rounded-b-lg">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="target-donor" className="font-semibold text-xs">Target Institusi Donor / Filantropi</Label>
                      <Input
                        id="target-donor"
                        placeholder="cth. Ford Foundation, DFAT, USAID"
                        value={targetDonor}
                        onChange={(e) => {
                          setTargetDonor(e.target.value);
                          setReviewIsStale(true);
                        }}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="donor-standard" className="font-semibold text-xs">Standar Pelaporan Kebijakan</Label>
                      <select
                        id="donor-standard"
                        value={donorStandard}
                        onChange={(e) => {
                          setDonorStandard(e.target.value);
                          setReviewIsStale(true);
                        }}
                        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="un_oecd_dac">OECD-DAC Standard (Sektor & Kelompok Sasaran PBB)</option>
                        <option value="eu_dev_standard">EU International Partnership Reporting Standard</option>
                        <option value="national_bappenas">Standar Pemetaan RAD SDG Bappenas RI</option>
                      </select>
                    </div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Action CTA Page 1 */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || !projectId}
              onClick={saveDraft}
              className="font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9"
            >
              {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Simpan Draft
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" asChild className="text-xs h-9 font-semibold">
                <Link to="/dashboard/grant-writer">Batal & Kembali</Link>
              </Button>
              <Button 
                type="submit" 
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9"
                disabled={!proposedTitle.trim() || !beneficiaryDescription.trim() || !programStory.trim()}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Tinjau Program Blueprint
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* INTERACTIVE PROCESSING STATE */}
      {currentFlowPage === 'processing' && (
        <Card className="mx-auto max-w-xl border-slate-200 py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-800 animate-ping opacity-75"></div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Konteks Deterministik sedang Ditinjau</h3>
              <p className="text-sm text-slate-500">Sistem memetakan input program Anda terhadap Registry Ontologi v1.2</p>
            </div>

            {/* Sequence Status Messages */}
            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4 space-y-3.5 border border-slate-200">
              {processingMessages.map((msg, idx) => {
                const isCompleted = idx < processingStep;
                const isActive = idx === processingStep;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <span className={isCompleted ? 'text-slate-400 line-through' : isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                      {msg}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAGE 2: REVIEW BOARD AND DETERMINISTIC RECOMMENDATIONS */}
      {currentFlowPage === 'page2' && domainResponse && (
        <div className="space-y-6">
          {/* 1. RINGKASAN PROGRAM */}

          {/* Fact Summary Banner (Canonical Fact Lock - UX-FACT-01) */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-slate-50 p-4 shadow-sm" data-testid="canonical-fact-banner">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Ringkasan Fakta Utama Program</h2>
                    <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 text-[10px]">Fakta Terkunci</Badge>
                  </div>
                  <p className="text-xs text-slate-500">Fakta mendasar program dari masukan Anda untuk memastikan konsistensi rancangan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs md:w-2/3">
                <div className="rounded-md border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lokasi</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" data-testid="fact-lokasi">{canonicalFacts.primaryLocation || '—'}</span>
                </div>
                <div className="rounded-md border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sasaran Utama</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" data-testid="fact-sasaran">{canonicalFacts.primaryTargetActor || '—'}</span>
                </div>
                <div className="rounded-md border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Program</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" data-testid="fact-program">{canonicalFacts.proposedTitle || '—'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Review Status Card (RC-9B.5 Task 4) */}
          <Card className={`p-4 border shadow-2xs ${hasCanonicalStructure ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/70'}`} data-testid="review-status-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold shrink-0 ${hasCanonicalStructure ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                  {hasCanonicalStructure ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-extrabold ${hasCanonicalStructure ? 'text-emerald-900' : 'text-amber-900'}`}>
                      {hasCanonicalStructure ? '✅ Struktur Logframe Siap' : '⚠ Struktur Logframe Belum Terbentuk'}
                    </span>
                  </div>
                  <p className={`text-xs ${hasCanonicalStructure ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {hasCanonicalStructure
                      ? 'Hasil analisis sistem berhasil membentuk struktur kerangka kerja logis (LFA).'
                      : 'Sistem membutuhkan rincian intervensi atau tujuan yang lebih spesifik.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <Badge variant="outline" className={`px-2.5 py-1 ${hasCanonicalStructure ? 'border-emerald-300 bg-white text-emerald-800' : 'border-amber-300 bg-white text-amber-800'}`}>
                  Struktur Program (Payload: {totalOutcomes} Outcome, {totalOutputs} Output, {totalActivities} Aktivitas)
                </Badge>
              </div>
            </div>
          </Card>

          {/* PROGRAM DEVELOPMENT PIPELINE (RC-9B.6 Task 1) */}
          <Card className="border-slate-200" data-testid="program-pipeline-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Program Development Pipeline
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50 font-medium">
                  Tahap 1 dari 7
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
                {/* 1. Program Blueprint */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 flex flex-col justify-between" data-testid="pipeline-stage-blueprint">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-emerald-900 truncate">Program Blueprint</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700">Completed</span>
                </div>

                {/* 2. LFA Matrix */}
                <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-2.5 flex flex-col justify-between" data-testid="pipeline-stage-lfa">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-amber-900 truncate">LFA Matrix</span>
                    <span className="text-amber-600 font-bold text-sm leading-none shrink-0">⭕</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800">Not Generated</span>
                </div>

                {/* 3. WBS */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 flex flex-col justify-between opacity-75" data-testid="pipeline-stage-wbs">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">WBS</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400">Requires LFA</span>
                </div>

                {/* 4. Budget */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 flex flex-col justify-between opacity-75" data-testid="pipeline-stage-budget">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">Budget</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400">Requires LFA</span>
                </div>

                {/* 5. MEAL */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 flex flex-col justify-between opacity-75" data-testid="pipeline-stage-meal">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">MEAL</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400">Requires LFA</span>
                </div>

                {/* 6. Evaluation */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 flex flex-col justify-between opacity-75" data-testid="pipeline-stage-evaluation">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">Evaluation</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400">Requires MEAL</span>
                </div>

                {/* 7. SROI */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 flex flex-col justify-between opacity-75" data-testid="pipeline-stage-sroi">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">SROI</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400">Requires Evaluation</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLUEPRINT STATUS CARD (RC-9B.6 Task 2) */}
          <Card className="border-slate-200" data-testid="blueprint-status-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Blueprint Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5" data-testid="status-item-facts">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">Fakta Program Teridentifikasi</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5" data-testid="status-item-beneficiaries">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">Target Penerima Manfaat Siap</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5" data-testid="status-item-direction">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">Arah Intervensi Ditentukan</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 p-2.5" data-testid="status-item-lfa">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-amber-950">LFA Matrix Belum Di-generate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Non-blocking Drift Warning */}
          {driftWarning?.hasDrift && (
            <Alert variant="warning" className="border-amber-300 bg-amber-50/70 text-amber-900 shadow-2xs" data-testid="entity-drift-warning">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <AlertTitle className="font-bold text-amber-900 text-xs">Peringatan Konsistensi Fakta (Non-Blocking)</AlertTitle>
                <AlertDescription className="text-amber-800 mt-0.5 leading-relaxed">
                  {driftWarning.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Stale Warning Header */}
          {reviewIsStale && (
            <Alert variant="warning" className="border-orange-300 bg-orange-50/50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <AlertTitle className="font-bold text-orange-900">Masukan Cerita Diubah</AlertTitle>
                <AlertDescription className="text-xs text-orange-700 leading-relaxed">
                  Anda telah mengubah detail masukan rencana program di Page 1. Blueprint program di bawah ini didasarkan pada draf analisis sebelumnya. Tekan tombol <strong>"Analisis Ulang"</strong> untuk memproses ulang blueprint yang akurat.
                </AlertDescription>
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="xs" onClick={handleTinjauBlueprint} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-7 text-[10px]">
                  Analisis Ulang Sesuai Perubahan &rarr;
                </Button>
              </div>
            </Alert>
          )}

          {/* 2. PROGRAM INSIGHTS (Human-Readable Catatan Rekomendasi) */}
          {domainResponse.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30 p-4 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-950">Catatan & Rekomendasi Penyempurnaan</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {domainResponse.warnings.map(warn => {
                    const insight = getHumanReadableWarningTitle(warn.code, warn.message);
                    return (
                      <div key={warn.id} className="flex gap-3 rounded-lg border border-amber-200/80 bg-white p-3.5 text-xs shadow-2xs">
                        <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block leading-snug">{insight.title}</span>
                          <p className="mt-1 text-slate-600 leading-relaxed">{insight.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* GRID UNTUK SDG, FOKUS PROGRAM, & AKTOR KUNCI */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* LEFT COLUMN: FOKUS PROGRAM & ARKETIPE INTERVENSI */}
            <div className="space-y-6">
              {/* 3. FOKUS PROGRAM (Sector Insight Card) */}
              <Card className="border-slate-200" id="section-sectors">
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>💡</span> Rekomendasi Sektor Program
                    </CardTitle>
                    <p className="text-xs text-slate-500">Sektor intervensi yang paling sesuai berdasarkan analisis kebutuhan</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const topSectors = domainResponse.sectors.slice(0, 3);
                    const remainingSectors = domainResponse.sectors.slice(3);
                    const visibleSectors = showAllSectors ? domainResponse.sectors : topSectors;

                    return (
                      <>
                        {visibleSectors.map(sec => {
                          const isAccepted = acceptedSectors.includes(sec.id);
                          return (
                            <div key={sec.id} className="rounded-lg border p-3.5 space-y-2 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-sm">✅ {sec.label}</span>
                                </div>
                                
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant={isAccepted ? 'default' : 'outline'}
                                    onClick={() => {
                                      if (isAccepted) {
                                        setAcceptedSectors(prev => prev.filter(id => id !== sec.id));
                                      } else {
                                        setAcceptedSectors(prev => [...prev, sec.id]);
                                      }
                                    }}
                                    className="text-xs"
                                  >
                                    {isAccepted ? 'Terpilih' : 'Pilih'}
                                  </Button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">{sec.explanation}</p>
                              
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleWhyRecommended(sec.id)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                  <span>Lihat Bukti Temuan</span>
                                  {whyRecommendedOpen[sec.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                
                                {whyRecommendedOpen[sec.id] && (
                                  <div className="mt-2 rounded bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1 border border-slate-200">
                                    <span className="font-semibold block uppercase text-[9px] text-slate-400">Bukti Kutipan Cerita</span>
                                    <blockquote className="italic border-l-2 pl-2 border-slate-300">"{sec.evidence?.text}"</blockquote>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {remainingSectors.length > 0 && (
                          <div className="pt-2 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAllSectors(prev => !prev)}
                              className="text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 w-full flex items-center justify-center gap-1.5"
                              data-testid="toggle-sectors-btn"
                            >
                              <span>{showAllSectors ? 'Sembunyikan sektor lainnya' : `Lihat ${remainingSectors.length} sektor lainnya`}</span>
                              {showAllSectors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Priority Interventions */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🛠️</span> Arketipe Intervensi Prioritas
                    </CardTitle>
                    <p className="text-xs text-slate-500">Ragam kegiatan teknis yang mendukung tujuan program Anda</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainResponse.interventions.map(act => {
                    const isAccepted = acceptedInterventions.includes(act.id);
                    return (
                      <div key={act.id} className="rounded-lg border p-3.5 space-y-2 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm block">{act.label}</span>
                          
                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                  setAcceptedInterventions(prev => prev.filter(id => id !== act.id));
                              } else {
                                  setAcceptedInterventions(prev => [...prev, act.id]);
                              }
                            }}
                          >
                            {isAccepted ? 'Aktif' : 'Gunakan'}
                          </Button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{act.explanation}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: SDG & AKTOR KUNCI */}
            <div className="space-y-6">
              {/* 4. SDG RELEVAN (SDG Insight Card) */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🎯</span> SDG yang Paling Relevan
                    </CardTitle>
                    <p className="text-xs text-slate-500">Tujuan Pembangunan Berkelanjutan (TPB) yang selaras dengan intervensi program Anda</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Recommended SDGs */}
                  {domainResponse.sdgs.filter(s => s.level !== 'rejected').map(sdg => {
                    const isAccepted = acceptedSdgs.includes(sdg.num);
                    return (
                      <div key={sdg.num} className="rounded-lg border p-3.5 space-y-2 bg-white shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex gap-2.5 items-center">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-xs"
                              style={{ backgroundColor: SDG_COLORS[sdg.num] || '#94A3B8' }}
                            >
                              {sdg.num}
                            </span>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">{sdg.label}</span>
                              <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800 mt-0.5">
                                ✅ Relevan
                              </Badge>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                setAcceptedSdgs(prev => prev.filter(n => n !== sdg.num));
                              } else {
                                setAcceptedSdgs(prev => [...prev, sdg.num]);
                              }
                            }}
                          >
                            {isAccepted ? 'Terpilih' : 'Pilih'}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{sdg.explanation}</p>
                      </div>
                    );
                  })}

                  {/* Rejected SDGs disclosure */}
                  {domainResponse.sdgs.some(s => s.level === 'rejected') && (
                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setShowRejectedSdgs(!showRejectedSdgs)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        <span>Mengapa tujuan lain tidak direkomendasikan?</span>
                        {showRejectedSdgs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {showRejectedSdgs && (
                        <div className="mt-2 space-y-2">
                          {domainResponse.sdgs.filter(s => s.level === 'rejected').map(sdg => (
                            <div key={sdg.num} className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-200">
                              <span className="font-bold block">SDG {sdg.num}: {sdg.label}</span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{sdg.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 5. AKTOR KUNCI PROGRAM */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>👥</span> Aktor Kunci Program
                    </CardTitle>
                    <p className="text-xs text-slate-500">Peta kelompok sasaran dan mitra strategis yang terlibat</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainResponse.actorRoles.map(actor => {
                    const isAccepted = acceptedActorRoles.includes(actor.id);
                    const humanRole = getHumanReadableRoleLabel(actor.role);
                    return (
                      <div key={actor.id} className="rounded-lg border p-3.5 space-y-2 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{actor.actorName}</span>
                            <Badge variant="outline" className="text-[10px] mt-0.5 border-slate-300 text-slate-700 bg-slate-50">
                              {humanRole}
                            </Badge>
                          </div>

                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                setAcceptedActorRoles(prev => prev.filter(id => id !== actor.id));
                              } else {
                                setAcceptedActorRoles(prev => [...prev, actor.id]);
                              }
                            }}
                          >
                            {isAccepted ? 'Konfirmasi' : 'Konfirmasi'}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{actor.explanation}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 6. KLARIFIKASI PROGRAM (Missing Information as Human Questions) */}
          {domainResponse.missingInformation.length > 0 && (
            <Card className="border-indigo-200 bg-indigo-50/20 shadow-xs" id="section-missing-info">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-600" /> Klarifikasi Program
                  </CardTitle>
                  <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px]">
                    {domainResponse.missingInformation.length} Poin Perlu Clarifikasi
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Untuk membantu menyusun Blueprint yang lebih presisi, jawab pertanyaan berikut jika Anda memiliki informasinya:
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {domainResponse.missingInformation.slice(0, 3).map((info, idx) => {
                  const state = missingInfoResolutions[info.id]?.state || 'unresolved';
                  const answer = missingInfoResolutions[info.id]?.answer || '';

                  return (
                    <div key={info.id} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50 font-semibold">
                            Pertanyaan {idx + 1}
                          </Badge>
                          <p className="text-xs font-bold text-slate-800 leading-relaxed mt-1">{info.question}</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            id={`missing-info-resolution-${info.id}`}
                            role="combobox"
                            value={state}
                            onChange={(e) => {
                              const val = e.target.value as 'unresolved' | 'answered' | 'accepted_unknown';
                              setMissingInfoResolutions(prev => ({
                                ...prev,
                                [info.id]: {
                                  ...prev[info.id],
                                  state: val,
                                  answer: val === 'accepted_unknown' ? 'Belum diketahui' : (prev[info.id]?.answer || '')
                                }
                              }));
                            }}
                            className="sr-only"
                          >
                            <option value="unresolved">Belum Dijawab</option>
                            <option value="answered">Dijawab</option>
                            <option value="accepted_unknown">Dilewati</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setMissingInfoResolutions(prev => ({
                                ...prev,
                                [info.id]: {
                                  ...prev[info.id],
                                  state: state === 'answered' ? 'unresolved' : 'answered',
                                }
                              }));
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              state === 'answered'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {state === 'answered' ? '✓ Dijawab' : 'Isi Jawaban'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMissingInfoResolutions(prev => ({
                                ...prev,
                                [info.id]: {
                                  ...prev[info.id],
                                  state: state === 'accepted_unknown' ? 'unresolved' : 'accepted_unknown',
                                  answer: 'Belum diketahui'
                                }
                              }));
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              state === 'accepted_unknown'
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {state === 'accepted_unknown' ? '✓ Dilewati' : 'Lewati'}
                          </button>
                        </div>
                      </div>

                      {state === 'answered' && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <Input
                            placeholder="Tuliskan jawaban klarifikasi Anda di sini..."
                            value={answer}
                            onChange={(e) => setMissingInfoResolutions(prev => ({
                              ...prev,
                              [info.id]: { ...prev[info.id], state: 'answered', answer: e.target.value }
                            }))}
                            className="text-xs bg-slate-50 focus:bg-white"
                          />
                          <p className="text-[10px] text-slate-500">Jawaban ini akan diintegrasikan langsung ke dalam draf usulan.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 7. ADVANCED ANALYSIS & DIAGNOSTIK LOGFRAME (Collapsible Accordion) */}
          {(domainResponse.warnings.length > 0 || domainResponse.ambiguities.length > 0 || canonicalPayload) && (
            <details className="group rounded-xl border border-slate-200 bg-slate-50/60 transition-all shadow-2xs">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-xs text-slate-700 hover:text-slate-900 select-none">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  🔬 Advanced Analysis & Diagnostik Logframe (Opsional)
                </span>
                <span className="text-[10px] text-indigo-600 group-open:rotate-180 transition-transform font-bold">
                  ▼ Lihat Detail
                </span>
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-slate-200/80">
                {/* Technical Warning Codes */}
                {domainResponse.warnings.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Validation Alert Codes</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {domainResponse.warnings.map(warn => (
                        <div key={warn.id} className="rounded border bg-white p-2.5 text-xs">
                          <span className="font-mono font-bold text-slate-500 text-[10px] block">{warn.code} &bull; {warn.severity}</span>
                          <p className="text-slate-700 mt-0.5">{warn.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ambiguity Resolvers Section */}
                {domainResponse.ambiguities.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/10 mt-3" id="section-ambiguities">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold tracking-tight text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" /> Resolusi Ambiguitas Logika
                      </CardTitle>
                      <p className="text-xs text-slate-500">Sistem mendeteksi tumpang tindih logika. Anda dapat menetapkan opsi pilihan secara eksplisit jika diperlukan.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {domainResponse.ambiguities.map(amb => {
                        const resolved = ambiguityResolutions[amb.id];
                        return (
                          <div key={amb.id} className="rounded-lg border bg-white p-4 space-y-3 shadow-2xs">
                            <div>
                              <span className="font-bold text-xs text-slate-800 block">Klasifikasi Bidang: {amb.field.toUpperCase()}</span>
                              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{amb.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {amb.candidates.map(cand => {
                                const active = resolved === cand;
                                return (
                                  <button
                                    key={cand}
                                    type="button"
                                    onClick={() => setAmbiguityResolutions(prev => ({ ...prev, [amb.id]: cand }))}
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold border transition-all ${
                                      active
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                    }`}
                                  >
                                    {cand}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Canonical Proposal V2 Structure */}
                {canonicalPayload && (
                  <Card className="border-indigo-200 bg-slate-900 text-slate-100 shadow-md mt-3">
                    <CardHeader className="border-b border-slate-800 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            Matriks Hierarki Logframe Deterministik
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400 mt-0.5">
                            Kerangka Logika Matriks Deterministik &bull; {canonicalPayload.project_id}
                          </CardDescription>
                        </div>
                        {canonicalMetrics && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500 text-slate-950 font-bold px-2.5 py-0.5 text-[11px]">
                              BQS: {canonicalMetrics.bqs27k}/100
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Metrics Bar */}
                      {canonicalMetrics && (
                        <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
                          <div className="bg-slate-800/80 rounded p-1.5">
                            <span className="block text-[9px] uppercase text-slate-400">Outcomes</span>
                            <span className="text-base font-bold text-indigo-400">{canonicalMetrics.outcomeCount}</span>
                          </div>
                          <div className="bg-slate-800/80 rounded p-1.5">
                            <span className="block text-[9px] uppercase text-slate-400">Outputs</span>
                            <span className="text-base font-bold text-blue-400">{canonicalMetrics.outputCount}</span>
                          </div>
                          <div className="bg-slate-800/80 rounded p-1.5">
                            <span className="block text-[9px] uppercase text-slate-400">Activities</span>
                            <span className="text-base font-bold text-teal-400">{canonicalMetrics.activityCount}</span>
                          </div>
                          <div className="bg-slate-800/80 rounded p-1.5">
                            <span className="block text-[9px] uppercase text-slate-400">Indicators</span>
                            <span className="text-base font-bold text-amber-400">{canonicalMetrics.indicatorCount}</span>
                          </div>
                          <div className="bg-slate-800/80 rounded p-1.5">
                            <span className="block text-[9px] uppercase text-slate-400">Cost Drivers</span>
                            <span className="text-base font-bold text-purple-400">{canonicalMetrics.costDriverCount}</span>
                          </div>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                      {canonicalPayload.outcomes.map((outcome) => (
                        <div key={outcome.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">OUTCOME {outcome.code}</span>
                              <h4 className="text-xs font-bold text-slate-100">{outcome.outcome_name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">{outcome.description}</p>
                            </div>
                          </div>

                          {/* Indicators */}
                          {outcome.indicators.length > 0 && (
                            <div className="text-[11px] bg-slate-900/90 rounded p-2 space-y-0.5">
                              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Outcome Indicators ({outcome.indicators.length})</span>
                              {outcome.indicators.map((ind) => (
                                <div key={ind.id} className="text-slate-300">
                                  &bull; <span className="font-semibold text-slate-200">{ind.indicator_name}</span> &mdash; Target: {ind.target_value} {ind.unit_of_measure} ({ind.data_source})
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Child Outputs */}
                          <div className="pl-2 space-y-2 border-l-2 border-slate-800">
                            {outcome.outputs.map((op) => (
                              <div key={op.id} className="rounded border border-slate-800/80 bg-slate-900/60 p-2.5 space-y-1.5">
                                <div>
                                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider block">OUTPUT {op.code}</span>
                                  <h5 className="text-xs font-bold text-slate-200">{op.output_name}</h5>
                                  <p className="text-[10px] text-slate-400">{op.description}</p>
                                </div>

                                {/* Activities */}
                                <div className="pl-2 space-y-1 border-l border-slate-800">
                                  {op.activities.map((act) => (
                                    <div key={act.id} className="rounded bg-slate-950/90 p-1.5 text-xs space-y-0.5">
                                      <span className="text-[9px] font-mono font-bold text-teal-400 block">ACTIVITY {act.code}</span>
                                      <p className="font-semibold text-slate-200 text-[11px]">{act.activity_name}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </details>
          )}

          {/* Program Blueprint or Empty Structure Warning (RC-9B.5 Task 2) */}
          {!hasCanonicalStructure ? (
            <Card className="border-amber-300 bg-amber-50/80 p-6 space-y-4 shadow-2xs" data-testid="empty-canonical-payload-warning">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0 shadow-2xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-amber-900">
                    ⚠ Blueprint belum memiliki struktur program yang cukup.
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Tambahkan informasi yang lebih spesifik mengenai:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1 font-medium">
                    <li>tujuan perubahan</li>
                    <li>bentuk intervensi</li>
                    <li>kegiatan utama</li>
                  </ul>
                  <div className="pt-3 border-t border-amber-200/80 text-xs space-y-1.5">
                    <p className="font-semibold text-amber-900">Contoh Input yang Lebih Spesifik:</p>
                    <p className="text-rose-700 font-mono text-[11px] font-bold">❌ Janda Cirebon</p>
                    <p className="text-emerald-700 font-medium text-[11px]">✅ Pelatihan digital untuk janda di Cirebon</p>
                    <p className="text-emerald-700 font-medium text-[11px]">✅ Pendampingan usaha mikro bagi janda di Cirebon</p>
                    <p className="text-emerald-700 font-medium text-[11px]">✅ Literasi keuangan keluarga untuk janda di Cirebon</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-md font-bold text-slate-800">Program Blueprint (Fondasi Logframe)</CardTitle>
                <CardDescription className="text-xs">Sari pati draf LFA berdasarkan logika kausalitas program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {domainResponse.blueprint.items.map(item => {
                    const currentText = blueprintEdits[item.id] !== undefined ? blueprintEdits[item.id] : item.text;
                    const isModified = blueprintEdits[item.id] !== undefined && blueprintEdits[item.id] !== item.text;
                    
                    return (
                      <div key={item.id} className="rounded-lg border p-4 space-y-2 bg-white relative">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-600 block">{item.section}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {isModified ? 'Diubah manual' : item.status === 'from_source' ? 'Dari informasi Anda' : item.status === 'inferred' ? 'Perkiraan sistem' : 'Sudah dikonfirmasi'}
                          </span>
                        </div>

                        <textarea
                          rows={3}
                          value={currentText}
                          onChange={(e) => setBlueprintEdits(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed rounded border-slate-200 p-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-300 border focus:border-slate-300 outline-none resize-none"
                        />

                        {/* Potensial partner label as requested */}
                        {item.section === 'Suggested Partners' && (
                          <span className="text-[10px] font-bold text-amber-600 block">Mitra potensial — perlu dikonfirmasi</span>
                        )}

                        {/* Revert option if modified */}
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => {
                              setBlueprintEdits(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                          >
                            <Undo2 className="h-3 w-3" /> Kembalikan ke asal
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Action CTAs Page 2 (Validation, Draft, Approval) */}
          <div className="border-t pt-5 space-y-4">
            {/* Empty Canonical Payload Approval Guard Alert (RC-9B.5 Task 3) */}
            {!hasCanonicalStructure && (
              <Alert variant="destructive" className="border-amber-300 bg-amber-50/90 text-amber-900 shadow-2xs" data-testid="empty-payload-approval-blocker">
                <AlertOctagon className="h-5 w-5 text-amber-600 shrink-0" />
                <AlertTitle className="font-bold text-amber-900 text-xs">Persetujuan Diblokir: Struktur Logframe Belum Terbentuk</AlertTitle>
                <AlertDescription className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                  Blueprint tidak dapat disetujui karena belum menghasilkan struktur logframe. Silakan perbarui input informasi program di Page 1 agar lebih spesifik.
                </AlertDescription>
              </Alert>
            )}

            {/* Blocker alert if exists (UX-HARDENING-2 Task 2 & 3: Human readable blocker labels & click to fix) */}
            {activeBlockers.length > 0 && (
              <Alert variant="destructive" className="border-rose-300 bg-rose-50/50">
                <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
                <AlertTitle className="font-bold text-rose-800">Persetujuan Diblokir ({activeBlockers.length})</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p className="font-medium text-rose-700">Selesaikan isu kritis berikut sebelum melanjutkan penyetujuan blueprint:</p>
                  <ul className="list-disc pl-4 space-y-1 text-rose-600">
                    {activeBlockers.map((blk) => (
                      <li
                        key={blk.id}
                        onClick={() => navigateToField(blk.targetKey)}
                        className="cursor-pointer hover:underline font-medium hover:text-rose-800 transition-colors flex items-center gap-1.5"
                        title="Klik untuk langsung perbaiki di formulir"
                      >
                        <span>{blk.label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToField(blk.targetKey);
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline ml-1"
                        >
                          Perbaiki
                        </button>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setCurrentFlowPage('page1')} className="text-slate-500 hover:bg-slate-100 font-semibold text-xs h-9">
                &larr; Kembali & Edit Informasi Inti
              </Button>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || !projectId}
                  onClick={saveDraft}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9 font-semibold"
                >
                  {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Simpan Draft
                </Button>

                <Button
                  type="button"
                  onClick={handleApproveBlueprint}
                  disabled={activeBlockers.length > 0 || !hasCanonicalStructure}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="approve-blueprint-btn"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Setujui Blueprint dan Lanjut ke Tahap LFA
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSATUAN DAN HANDOFF BOUNDARY (RC-9B.6 Task 4) */}
      {currentFlowPage === 'approved' && approvedSnapshot && (
        <Card className="border-emerald-200 bg-emerald-50/10 py-8 px-6 text-center space-y-6" data-testid="transition-confirmation-card">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-emerald-900" data-testid="transition-title">Blueprint Program Disetujui!</h2>
              <p className="text-sm font-semibold text-emerald-800" data-testid="transition-next-step">
                Langkah berikutnya: Generate dan susun Logical Framework Matrix (LFA).
              </p>
              <p className="text-xs text-emerald-700 font-medium max-w-md mx-auto">
                Blueprint disetujui untuk sesi ini dan siap menjadi dasar formulasi LFA Matrix.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-white p-4 max-w-md text-left text-xs space-y-2 shadow-2xs">
              <span className="font-bold text-emerald-800 uppercase block tracking-wider text-[10px]">Ringkasan Blueprint Program</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span>Nama Program:</span>
                <span className="font-bold text-right text-slate-800 truncate">{proposedTitle || '—'}</span>
                
                <span>Target Utama SDG:</span>
                <span className="font-bold text-right text-slate-800">
                  {approvedSnapshot.acceptedSdgs && approvedSnapshot.acceptedSdgs[0] ? `SDG ${approvedSnapshot.acceptedSdgs[0]}` : '—'}
                </span>

                <span>Sektor Terpilih:</span>
                <span className="font-bold text-right text-slate-800 truncate">
                  {approvedSnapshot.acceptedSectors ? approvedSnapshot.acceptedSectors.length : 0} Sektor
                </span>
                
                <span>Tanggal Disetujui:</span>
                <span className="font-bold text-right text-slate-800 truncate">
                  {new Date(approvedSnapshot.approvalTimestamp).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>

            <Alert className="border-indigo-100 bg-indigo-50/50 p-4 max-w-lg text-left text-xs shadow-2xs">
              <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <AlertTitle className="font-bold text-indigo-950">Tahap Blueprint Selesai</AlertTitle>
                <AlertDescription className="text-indigo-800 leading-relaxed mt-1 font-medium">
                  Informasi dasar program Anda telah tersimpan. Anda siap melanjutkan ke penyusunan Logical Framework Matrix (LFA).
                </AlertDescription>
              </div>
            </Alert>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4"
                onClick={() => {
                  const targetId = projectId || canonicalPayload?.project_id || approvedSnapshot?.metadata.proposedTitle;
                  navigate(`/dashboard/lfa-builder/${targetId}?from=quick_proposal`, { state: { fromQuickProposal: true } });
                }}
                data-testid="continue-to-lfa-btn"
              >
                Lanjut ke Tahap LFA Matrix &rarr;
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentFlowPage('page2')} className="text-slate-600 font-semibold h-9">
                Tinjau Ulang Blueprint
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/grant-writer')} className="text-slate-600 font-semibold h-9">
                Kembali ke Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
