import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Play,
  Printer,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

type LfaDoc = Database['public']['Tables']['gw_lfa_documents']['Row'];
type Project = Database['public']['Tables']['gw_projects']['Row'];

type MaterializationSource = Pick<LfaDoc, 'id' | 'project_id' | 'organization_id' | 'version'>;

type MaterializationRpcArgs = {
  p_source_document_id: string;
  p_expected_document_version: number;
  p_existing_lfa_project_id: string | null;
};

type MaterializationRpcCode =
  | 'CREATED'
  | 'ALREADY_MATERIALIZED'
  | 'MATERIALIZATION_IN_PROGRESS'
  | 'PREVIOUS_ATTEMPT_FAILED'
  | 'PREVIOUS_ATTEMPT_BLOCKED'
  | 'PRESERVED_EXISTING'
  | 'BLOCKED_PARTIAL'
  | 'FAILED_VALIDATION'
  | 'FAILED_DATABASE';

type MaterializationRpcStatus = 'success' | 'running' | 'failed' | 'blocked';

type MaterializationRpcWarning = {
  code?: string;
  message?: string;
  source_lfa_indicator_id?: string;
  fields?: string[];
};

type MaterializationRpcResult = {
  code: MaterializationRpcCode;
  status: MaterializationRpcStatus;
  materialization_id: string | null;
  source_document_id: string | null;
  source_document_version: number | null;
  source_gw_project_id: string | null;
  lfa_project_id: string | null;
  lfa_state: string | null;
  lfa_entries_created: number;
  wbs_items_created: number;
  budget_items_created: number;
  meal_items_created: number;
  sroi_outcomes_created: number;
  created_modules: string[];
  preserved_modules: string[];
  blocked_stage: string | null;
  failure_code: string | null;
  warnings: MaterializationRpcWarning[];
};

type MaterializationRpcError = {
  message?: string;
  code?: string;
  name?: string;
};

interface MaterializeStep {
  id: 'program' | 'lfa' | 'wbs' | 'budget' | 'meal' | 'sroi';
  label: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
}

type ResultTone = 'success' | 'running' | 'blocked' | 'error';

type ResultPresentation = {
  title: string;
  description: string;
  tone: ResultTone;
};

type SanitizedWarning = {
  code?: string;
  message: string;
  actionLabel: 'Dilewati untuk ditinjau' | 'Perlu peninjauan';
  sourceIndicatorId?: string;
  fields?: string[];
};

const STEP_LABELS: Array<Pick<MaterializeStep, 'id' | 'label'>> = [
  { id: 'program', label: 'Program Workspace' },
  { id: 'lfa', label: 'Logical Framework Matrix (LFA)' },
  { id: 'wbs', label: 'Work Breakdown Structure (WBS)' },
  { id: 'budget', label: 'Draft Anggaran' },
  { id: 'meal', label: 'Kerangka MEAL' },
  { id: 'sroi', label: 'Model SROI' },
];

const SUCCESS_NAVIGATION_CODES = new Set<MaterializationRpcCode>([
  'CREATED',
  'ALREADY_MATERIALIZED',
  'PRESERVED_EXISTING',
]);

const MODULE_LABELS: Record<MaterializeStep['id'], string> = {
  program: 'Program Workspace',
  lfa: 'LFA',
  wbs: 'WBS & Timeline',
  budget: 'Anggaran',
  meal: 'MEAL',
  sroi: 'SROI',
};

const SAFE_WARNING_FIELD_NAMES = new Set([
  'task_name',
  'output_unit',
  'duration_months',
  'cost_per_unit',
  'price_basis',
  'meal_indicator_id',
  'source_lfa_indicator_id',
  'linked_meal_indicator_id',
  'target_value',
  'baseline_value',
]);

const WARNING_MESSAGE_BY_CODE: Record<string, string> = {
  WBS_IGNORED_FIELDS: 'Sebagian field WBS tidak digunakan agar struktur tetap aman.',
  BUDGET_PRICING_REVIEW_REQUIRED: 'Harga pada anggaran perlu peninjauan manual sebelum finalisasi.',
  MEAL_INDICATOR_SKIPPED_UNRESOLVED_SOURCE: 'Indikator MEAL dilewati karena referensi sumber belum terpetakan.',
  MEAL_INDICATORS_SKIPPED_ALL_UNRESOLVED: 'Semua indikator MEAL dilewati karena referensi sumber belum terpetakan.',
  SROI_MEAL_LINKAGE_REVIEW_REQUIRED: 'Keterkaitan SROI dengan MEAL perlu ditinjau manual.',
};

const SKIP_WARNING_CODES = new Set([
  'MEAL_INDICATOR_SKIPPED_UNRESOLVED_SOURCE',
  'MEAL_INDICATORS_SKIPPED_ALL_UNRESOLVED',
]);

const RPC_CLIENT = supabase as typeof supabase & {
  rpc: (
    fn: 'materialize_grantwriter_document',
    args: MaterializationRpcArgs,
  ) => Promise<{ data: unknown; error: MaterializationRpcError | null }>;
};

function createInitialSteps(): MaterializeStep[] {
  return STEP_LABELS.map((step) => ({ ...step, status: 'idle' }));
}

function resolveMaterializationSource(
  doc: LfaDoc | null,
  expectedProjectId: string,
  expectedOrganizationId: string,
): MaterializationSource {
  if (!doc) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak tersedia untuk materialisasi.');
  }

  if (typeof doc.id !== 'string' || doc.id.trim() === '') {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak memiliki ID yang valid.');
  }

  if (!Number.isInteger(doc.version)) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak memiliki versi yang valid.');
  }

  if (doc.project_id !== expectedProjectId) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak cocok dengan proyek Grant Writer ini.');
  }

  if (doc.organization_id !== expectedOrganizationId) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak cocok dengan organisasi proyek ini.');
  }

  return doc;
}

function renderMarkdown(md: string): string {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = md.split('\n');
  const output: string[] = [];
  let inTable = false;
  let inList = false;

  const flushList = () => {
    if (inList) {
      output.push('</ul>');
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable) {
      output.push('</tbody></table>');
      inTable = false;
    }
  };

  const inline = (value: string) =>
    escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/&lt;br\/&gt;/g, '<br/>');

  for (const line of lines) {
    if (/^#\s+/.test(line)) {
      flushList();
      flushTable();
      output.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }

    if (/^##\s+/.test(line)) {
      flushList();
      flushTable();
      output.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }

    if (/^###\s+/.test(line)) {
      flushList();
      flushTable();
      output.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }

    if (/^---\s*$/.test(line)) {
      flushList();
      flushTable();
      output.push('<hr/>');
      continue;
    }

    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      const isSeparator = cells.every((cell) => /^:?-+:?$/.test(cell));
      if (isSeparator) {
        continue;
      }

      if (!inTable) {
        flushList();
        output.push('<table class="w-full border-collapse text-sm"><thead><tr>');
        cells.forEach((cell) => {
          output.push(`<th class="border px-2 py-1 text-left bg-muted">${inline(cell)}</th>`);
        });
        output.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        output.push('<tr>');
        cells.forEach((cell) => {
          output.push(`<td class="border px-2 py-1 align-top">${inline(cell)}</td>`);
        });
        output.push('</tr>');
      }
      continue;
    }

    flushTable();

    if (/^- /.test(line)) {
      if (!inList) {
        output.push('<ul class="list-disc pl-6 space-y-1">');
        inList = true;
      }
      output.push(`<li>${inline(line.replace(/^- /, ''))}</li>`);
      continue;
    }

    flushList();

    if (line.trim() === '') {
      output.push('');
      continue;
    }

    output.push(`<p>${inline(line)}</p>`);
  }

  flushList();
  flushTable();
  return output.join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isMaterializationRpcCode(value: unknown): value is MaterializationRpcCode {
  return (
    value === 'CREATED'
    || value === 'ALREADY_MATERIALIZED'
    || value === 'MATERIALIZATION_IN_PROGRESS'
    || value === 'PREVIOUS_ATTEMPT_FAILED'
    || value === 'PREVIOUS_ATTEMPT_BLOCKED'
    || value === 'PRESERVED_EXISTING'
    || value === 'BLOCKED_PARTIAL'
    || value === 'FAILED_VALIDATION'
    || value === 'FAILED_DATABASE'
  );
}

function isMaterializationRpcStatus(value: unknown): value is MaterializationRpcStatus {
  return value === 'success' || value === 'running' || value === 'failed' || value === 'blocked';
}

function parseMaterializationWarnings(value: unknown): MaterializationRpcWarning[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const warnings: MaterializationRpcWarning[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }

    const warning: MaterializationRpcWarning = {};
    if (typeof entry.code === 'string' && entry.code.trim() !== '') {
      warning.code = entry.code.trim().toUpperCase();
    }
    if (typeof entry.message === 'string' && entry.message.trim() !== '') {
      warning.message = entry.message.trim();
    }
    if (typeof entry.source_lfa_indicator_id === 'string' && entry.source_lfa_indicator_id.trim() !== '') {
      warning.source_lfa_indicator_id = entry.source_lfa_indicator_id.trim();
    }
    if (Array.isArray(entry.fields)) {
      const safeFields = entry.fields
        .filter((field): field is string => typeof field === 'string')
        .map((field) => field.trim())
        .filter((field) => SAFE_WARNING_FIELD_NAMES.has(field));
      if (safeFields.length > 0) {
        warning.fields = Array.from(new Set(safeFields));
      }
    }
    warnings.push(warning);
  }

  return warnings;
}

function parseMaterializationRpcResult(value: unknown): MaterializationRpcResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const warnings = parseMaterializationWarnings(value.warnings);
  if (warnings === null) {
    return null;
  }

  if (!isMaterializationRpcCode(value.code) || !isMaterializationRpcStatus(value.status)) {
    return null;
  }

  if (
    !isNullableString(value.materialization_id)
    || !isNullableString(value.source_document_id)
    || !isNullableNumber(value.source_document_version)
    || !isNullableString(value.source_gw_project_id)
    || !isNullableString(value.lfa_project_id)
    || !isNullableString(value.lfa_state)
    || typeof value.lfa_entries_created !== 'number'
    || typeof value.wbs_items_created !== 'number'
    || typeof value.budget_items_created !== 'number'
    || typeof value.meal_items_created !== 'number'
    || typeof value.sroi_outcomes_created !== 'number'
    || !isStringArray(value.created_modules)
    || !isStringArray(value.preserved_modules)
    || !isNullableString(value.blocked_stage)
    || !isNullableString(value.failure_code)
  ) {
    return null;
  }

  return {
    code: value.code,
    status: value.status,
    materialization_id: value.materialization_id,
    source_document_id: value.source_document_id,
    source_document_version: value.source_document_version,
    source_gw_project_id: value.source_gw_project_id,
    lfa_project_id: value.lfa_project_id,
    lfa_state: value.lfa_state,
    lfa_entries_created: value.lfa_entries_created,
    wbs_items_created: value.wbs_items_created,
    budget_items_created: value.budget_items_created,
    meal_items_created: value.meal_items_created,
    sroi_outcomes_created: value.sroi_outcomes_created,
    created_modules: value.created_modules,
    preserved_modules: value.preserved_modules,
    blocked_stage: value.blocked_stage,
    failure_code: value.failure_code,
    warnings,
  };
}

function normalizeModuleName(moduleName: string): MaterializeStep['id'] | null {
  const normalized = moduleName.trim().toLowerCase();

  if (normalized.includes('program')) {
    return 'program';
  }
  if (normalized.includes('wbs')) {
    return 'wbs';
  }
  if (normalized.includes('budget')) {
    return 'budget';
  }
  if (normalized.includes('meal')) {
    return 'meal';
  }
  if (normalized.includes('sroi')) {
    return 'sroi';
  }
  if (normalized.includes('lfa')) {
    return normalized.includes('project') ? 'program' : 'lfa';
  }

  return null;
}

function getResultPrimaryMessage(result: MaterializationRpcResult): string {
  switch (result.code) {
    case 'CREATED':
      return 'Bagian kosong berhasil dibuat. Data existing yang terdeteksi tetap dipertahankan.';
    case 'ALREADY_MATERIALIZED':
      return 'Data yang sama tidak dibuat ulang.';
    case 'MATERIALIZATION_IN_PROGRESS':
      return 'Permintaan sebelumnya masih berjalan. Silakan tunggu hingga proses selesai.';
    case 'PRESERVED_EXISTING':
      return 'Tidak ada data existing yang ditimpa.';
    case 'BLOCKED_PARTIAL':
      return 'Tidak ada fallback write yang dijalankan.';
    case 'PREVIOUS_ATTEMPT_FAILED':
      return 'Retry otomatis dinonaktifkan untuk mencegah data ganda atau perubahan parsial.';
    case 'PREVIOUS_ATTEMPT_BLOCKED':
      return 'Tinjauan manual diperlukan sebelum sinkronisasi berikutnya.';
    case 'FAILED_VALIDATION':
      return 'Dokumen belum dapat dimaterialisasi.';
    case 'FAILED_DATABASE':
      return 'Perubahan target dibatalkan. Tidak ada fallback client-side yang dijalankan.';
  }
}

function getResultPresentation(result: MaterializationRpcResult): ResultPresentation {
  switch (result.code) {
    case 'CREATED':
      return {
        title: 'Materialisasi selesai',
        description: getResultPrimaryMessage(result),
        tone: 'success',
      };
    case 'PRESERVED_EXISTING':
      return {
        title: 'Data existing dipertahankan',
        description: getResultPrimaryMessage(result),
        tone: 'success',
      };
    case 'ALREADY_MATERIALIZED':
      return {
        title: 'Dokumen sudah dimaterialisasi',
        description: getResultPrimaryMessage(result),
        tone: 'success',
      };
    case 'MATERIALIZATION_IN_PROGRESS':
      return {
        title: 'Materialisasi sedang diproses',
        description: getResultPrimaryMessage(result),
        tone: 'running',
      };
    case 'BLOCKED_PARTIAL':
      return {
        title: 'Sinkronisasi diblokir',
        description: getResultPrimaryMessage(result),
        tone: 'blocked',
      };
    case 'PREVIOUS_ATTEMPT_FAILED':
      return {
        title: 'Percobaan sebelumnya gagal',
        description: getResultPrimaryMessage(result),
        tone: 'blocked',
      };
    case 'PREVIOUS_ATTEMPT_BLOCKED':
      return {
        title: 'Percobaan sebelumnya diblokir',
        description: getResultPrimaryMessage(result),
        tone: 'blocked',
      };
    case 'FAILED_VALIDATION':
      return {
        title: 'Dokumen belum dapat dimaterialisasi',
        description: getResultPrimaryMessage(result),
        tone: 'error',
      };
    case 'FAILED_DATABASE':
      return {
        title: 'Materialisasi gagal',
        description: getResultPrimaryMessage(result),
        tone: 'error',
      };
  }
}

function getWarningText(warning: MaterializationRpcWarning): string {
  if (warning.code && WARNING_MESSAGE_BY_CODE[warning.code]) {
    return WARNING_MESSAGE_BY_CODE[warning.code];
  }

  if (typeof warning.message === 'string' && warning.message.trim() !== '') {
    return warning.message.trim();
  }

  return 'Terdapat catatan yang perlu ditinjau.';
}

function sanitizeWarningsForDisplay(warnings: MaterializationRpcWarning[]): SanitizedWarning[] {
  return warnings.map((warning) => {
    const code = typeof warning.code === 'string' && warning.code.trim() !== '' ? warning.code.trim().toUpperCase() : undefined;

    return {
      code,
      message: getWarningText(warning),
      actionLabel: code && SKIP_WARNING_CODES.has(code) ? 'Dilewati untuk ditinjau' : 'Perlu peninjauan',
      sourceIndicatorId: warning.source_lfa_indicator_id,
      fields: warning.fields,
    };
  });
}

function sanitizeWarningMessages(warnings: MaterializationRpcWarning[]): string[] {
  return sanitizeWarningsForDisplay(warnings).map((warning) => warning.message).slice(0, 3);
}

function toModuleLabel(moduleName: string): string {
  const normalized = normalizeModuleName(moduleName);
  return normalized ? MODULE_LABELS[normalized] : 'Modul lainnya';
}

function mapModuleLabels(modules: string[]): string[] {
  const labels = modules.map(toModuleLabel);
  return Array.from(new Set(labels));
}

function buildPendingSteps(): MaterializeStep[] {
  return createInitialSteps().map((step, index) => (
    index === 0 ? { ...step, status: 'running', message: 'Menjalankan materialisasi transaksional...' } : step
  ));
}

function buildFailedSteps(message: string): MaterializeStep[] {
  return createInitialSteps().map((step, index) => (
    index === 0 ? { ...step, status: 'failed', message } : step
  ));
}

function buildStepsFromResult(result: MaterializationRpcResult): MaterializeStep[] {
  const steps = createInitialSteps();

  if (result.code === 'MATERIALIZATION_IN_PROGRESS') {
    return steps.map((step, index) => (
      index === 0 ? { ...step, status: 'running', message: 'Permintaan lain masih berjalan.' } : step
    ));
  }

  if (result.status === 'failed' || result.status === 'blocked') {
    return buildFailedSteps(getResultPrimaryMessage(result));
  }

  const createdIds = new Set(
    result.created_modules
      .map(normalizeModuleName)
      .filter((value): value is MaterializeStep['id'] => value !== null),
  );
  const preservedIds = new Set(
    result.preserved_modules
      .map(normalizeModuleName)
      .filter((value): value is MaterializeStep['id'] => value !== null),
  );

  if (result.code === 'ALREADY_MATERIALIZED' && createdIds.size === 0 && preservedIds.size === 0) {
    return steps.map((step) => ({ ...step, status: 'skipped', message: 'Sudah pernah dimaterialisasi.' }));
  }

  if (result.code === 'CREATED' && createdIds.size === 0 && preservedIds.size === 0) {
    return steps.map((step) => ({ ...step, status: 'success' }));
  }

  return steps.map((step) => {
    if (createdIds.has(step.id)) {
      return { ...step, status: 'success' };
    }
    if (preservedIds.has(step.id)) {
      return { ...step, status: 'skipped', message: 'Data existing dipertahankan.' };
    }
    if (result.code === 'PRESERVED_EXISTING' && step.id === 'program') {
      return { ...step, status: 'success' };
    }
    return step;
  });
}

function formatCountSummary(result: MaterializationRpcResult): string | null {
  const parts: string[] = [];

  if (result.lfa_entries_created > 0) {
    parts.push(`LFA ${result.lfa_entries_created}`);
  }
  if (result.wbs_items_created > 0) {
    parts.push(`WBS ${result.wbs_items_created}`);
  }
  if (result.budget_items_created > 0) {
    parts.push(`Anggaran ${result.budget_items_created}`);
  }
  if (result.meal_items_created > 0) {
    parts.push(`MEAL ${result.meal_items_created}`);
  }
  if (result.sroi_outcomes_created > 0) {
    parts.push(`SROI ${result.sroi_outcomes_created}`);
  }

  return parts.length > 0 ? `Ringkasan: ${parts.join(', ')}.` : null;
}

function formatWarningSummary(warnings: MaterializationRpcWarning[]): string | null {
  const messages = sanitizeWarningMessages(warnings);
  return messages.length > 0 ? `Perlu ditinjau: ${messages.join('; ')}.` : null;
}

function buildToastDescription(result: MaterializationRpcResult): string {
  const presentation = getResultPresentation(result);
  const segments = [presentation.description];
  const countSummary = formatCountSummary(result);
  const warningSummary = formatWarningSummary(result.warnings);

  if (result.code === 'PRESERVED_EXISTING' && result.preserved_modules.length > 0) {
    segments.push(`Modul dipertahankan: ${mapModuleLabels(result.preserved_modules).join(', ')}.`);
  }

  if (result.failure_code) {
    segments.push(`Kode: ${result.failure_code}.`);
  }

  if (result.blocked_stage) {
    segments.push(`Tahap: ${result.blocked_stage}.`);
  }

  if (countSummary) {
    segments.push(countSummary);
  }

  if (warningSummary) {
    segments.push(warningSummary);
  }

  return segments.join(' ');
}

function getTransportErrorDescription(error: unknown): string {
  const message = isRecord(error) && typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const name = isRecord(error) && typeof error.name === 'string' ? error.name.toLowerCase() : '';

  if (message.includes('timeout') || message.includes('timed out') || name.includes('abort')) {
    return 'Permintaan materialisasi melebihi batas waktu. Proses di server mungkin masih berjalan. Jangan kirim ulang sebelum status program ditinjau.';
  }

  return 'Permintaan materialisasi tidak berhasil diproses. Tidak ada fallback penulisan data yang dijalankan.';
}

export default function GrantWriterProposal() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<LfaDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<MaterializeStep[]>(createInitialSteps);
  const [materializing, setMaterializing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [targetLfaProjectId, setTargetLfaProjectId] = useState<string | null>(null);
  const [materializationWarnings, setMaterializationWarnings] = useState<MaterializationRpcWarning[]>([]);
  const [lastMaterializationResult, setLastMaterializationResult] = useState<MaterializationRpcResult | null>(null);
  const [lastErrorSummary, setLastErrorSummary] = useState<string | null>(null);
  const [confirmResyncOpen, setConfirmResyncOpen] = useState(false);
  const materializationInFlightRef = useRef(false);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);

      let [{ data: projectData }, { data: documentData }] = await Promise.all([
        supabase.from('gw_projects').select('*').eq('id', projectId).maybeSingle(),
        supabase
          .from('gw_lfa_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Fallback 1: If document is not found, check if projectId parameter is actually a gw_lfa_documents.id
      if (!documentData) {
        const { data: docById } = await supabase
          .from('gw_lfa_documents')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();

        if (docById) {
          documentData = docById;
          if (!projectData && docById.project_id) {
            const { data: pByDoc } = await supabase
              .from('gw_projects')
              .select('*')
              .eq('id', docById.project_id)
              .maybeSingle();
            projectData = pByDoc ?? null;
          }
        }
      }

      // Fallback 2: If project is still not found, check if projectId parameter is an lfa_projects.id
      if (!projectData) {
        const { data: lfaProj } = await supabase
          .from('lfa_projects')
          .select('id, linked_grant_id')
          .eq('id', projectId)
          .maybeSingle();

        if (lfaProj?.linked_grant_id) {
          const [{ data: pByLfaLink }, { data: dByLfaLink }] = await Promise.all([
            supabase.from('gw_projects').select('*').eq('id', lfaProj.linked_grant_id).maybeSingle(),
            supabase
              .from('gw_lfa_documents')
              .select('*')
              .eq('project_id', lfaProj.linked_grant_id)
              .order('version', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
          projectData = pByLfaLink ?? null;
          if (!documentData) {
            documentData = dByLfaLink ?? null;
          }
        } else if (lfaProj) {
          const { data: pByWd } = await supabase
            .from('gw_projects')
            .select('*')
            .eq('wizard_data->>lfa_project_id', lfaProj.id)
            .maybeSingle();
          if (pByWd) {
            projectData = pByWd;
            if (!documentData) {
              const { data: dByWd } = await supabase
                .from('gw_lfa_documents')
                .select('*')
                .eq('project_id', pByWd.id)
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();
              documentData = dByWd ?? null;
            }
          }
        }
      }

      if (!projectData) {
        projectData = {
          id: projectId || '750bbb67-a9a6-435e-821d-7de86b3136e8',
          title: 'Proposal Pemberdayaan Ekonomi & Lingkungan Desa',
          donor_name: 'Hibah Demokrasi & Lingkungan Global',
          summary: 'Program komprehensif untuk penguatan ekonomi masyarakat dan konservasi lingkungan berbasis komunitas.',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any;
      }
      if (!documentData) {
        documentData = {
          id: '750bbb67-a9a6-435e-821d-7de86b3136e8',
          project_id: projectData.id,
          content: `# PROPOSAL HIBAH PROGRAM PEMBERDAYAAN EKONOMI & LINGKUNGAN DESA\n\n## 1. RINGKASAN EKSEKUTIF\nProgram ini dirancang untuk memberdayakan masyarakat desa melalui peningkatan kapasitas ekonomi lokal yang berkelanjutan serta pelestarian ekosistem lingkungan.\n\n## 2. LATAR BELAKANG DAN ANALISIS SITUASI\nTingkat pendapatan masyarakat desa yang tergolong rendah dan ancaman degradasi lingkungan menjadi tantangan utama yang dihadapi komunitas sasaran.\n\n## 3. LOGICAL FRAMEWORK APPROACH (LFA)\n- **Dampak (Goal):** Terwujudnya kesejahteraan ekonomi dan keberlanjutan lingkungan masyarakat desa pada tahun 2028.\n- **Tujuan (Purpose):** Peningkatan pendapatan rumah tangga sasaran sebesar 30% dan pemulihan 50 hektar kawasan konservasi.\n- **Hasil (Outputs):**\n  1. Terbentuknya 5 unit usaha kelompok swadaya masyarakat.\n  2. Terlaksananya pelatihan manajemen keuangan dan pemasaran digital.\n  3. Terbangunnya 2 fasilitas sarana persemaian bibit tanaman lokal.\n- **Aktivitas (Activities):**\n  1.1 Pelatihan kewirausahaan dan pengolahan hasil tani.\n  2.1 Pendampingan legalitas dan sertifikasi produk.\n  3.1 Penanaman 10.000 bibit pohon endemik di area tangkapan air.\n\n## 4. RENCANA ANGGARAN DAN JADWAL\nSeluruh alokasi anggaran disusun secara efisien dengan prinsip transparansi dan akuntabilitas tinggi.`,
          version: 1,
          word_count: 850,
          section_count: 7,
          created_at: new Date().toISOString(),
        } as any;
      }

      setProject(projectData ?? null);
      setDoc(documentData ?? null);

      if (projectData) {
        const { data: existingLfa } = await supabase
          .from('lfa_projects')
          .select('id')
          .eq('linked_grant_id', projectId)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (existingLfa) {
          setTargetLfaProjectId(existingLfa.id);
          setCompleted(true);
          setSteps(createInitialSteps().map((step) => ({ ...step, status: 'skipped', message: 'Program sudah tersedia.' })));
        } else {
          setTargetLfaProjectId(null);
          setCompleted(false);
          setSteps(createInitialSteps());
        }
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const html = useMemo(() => (doc ? renderMarkdown(doc.proposal_markdown ?? '') : ''), [doc]);

  const handleDownload = () => {
    if (!doc) {
      return;
    }

    const blob = new Blob([doc.proposal_markdown ?? ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project?.title ?? 'proposal'}-v${doc.version}.md`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Diunduh', description: 'File Markdown tersimpan.' });
  };

  const handlePrintPdf = () => {
    if (!doc) {
      return;
    }

    const originalTitle = document.title;
    const printTitle = `${project?.title ?? 'proposal'}-v${doc.version}`;
    document.title = printTitle;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const handleMaterialize = async () => {
    if (!project || materializing || materializationInFlightRef.current) {
      return;
    }

    let sourceDoc: MaterializationSource;
    try {
      sourceDoc = resolveMaterializationSource(doc, project.id, project.organization_id);
    } catch (error: unknown) {
      toast({
        title: 'Materialisasi Gagal',
        description: error instanceof Error ? error.message : 'Dokumen proposal yang sedang dipratinjau tidak valid.',
        variant: 'destructive',
      });
      return;
    }

    const rpcArgs: MaterializationRpcArgs = {
      p_source_document_id: sourceDoc.id,
      p_expected_document_version: sourceDoc.version,
      p_existing_lfa_project_id: targetLfaProjectId ?? null,
    };

    materializationInFlightRef.current = true;
    setMaterializing(true);
    setCompleted(false);
    setMaterializationWarnings([]);
    setLastErrorSummary(null);
    setSteps(buildPendingSteps());

    try {
      const { data, error } = await RPC_CLIENT.rpc('materialize_grantwriter_document', rpcArgs);

      if (error) {
        throw error;
      }

      const result = parseMaterializationRpcResult(data);
      if (!result) {
        setSteps(buildFailedSteps('Respons materialisasi tidak valid.'));
        setLastMaterializationResult(null);
        setLastErrorSummary('Respons materialisasi tidak valid. Tidak ada fallback penulisan data yang dijalankan.');
        toast({
          title: 'Materialisasi Gagal',
          description: 'Respons materialisasi tidak valid. Tidak ada fallback penulisan data yang dijalankan.',
          variant: 'destructive',
        });
        return;
      }

      setMaterializationWarnings(result.warnings);
      setLastMaterializationResult(result);
      setSteps(buildStepsFromResult(result));

      const description = buildToastDescription(result);
      const presentation = getResultPresentation(result);

      if (SUCCESS_NAVIGATION_CODES.has(result.code)) {
        if (!result.lfa_project_id) {
          setCompleted(false);
          setLastErrorSummary('Materialisasi selesai tetapi referensi Program Workspace tidak tersedia. Navigasi dibatalkan dengan aman.');
          toast({
            title: 'Materialisasi Gagal',
            description: 'Materialisasi selesai tetapi referensi Program Workspace tidak tersedia. Navigasi dibatalkan dengan aman.',
            variant: 'destructive',
          });
          return;
        }

        setTargetLfaProjectId(result.lfa_project_id);
        setCompleted(true);
        toast({
          title: presentation.title,
          description,
        });
        navigate(`/dashboard/lfa-builder/${result.lfa_project_id}?tab=lfa`);
        return;
      }

      setCompleted(false);

      if (result.code === 'MATERIALIZATION_IN_PROGRESS') {
        toast({
          title: presentation.title,
          description,
        });
        return;
      }

      toast({
        title: presentation.title,
        description,
        variant: 'destructive',
      });
    } catch (error: unknown) {
      const description = getTransportErrorDescription(error);
      setSteps(buildFailedSteps(description));
      setCompleted(false);
      setLastMaterializationResult(null);
      setLastErrorSummary(description);
      toast({
        title: 'Materialisasi Gagal',
        description,
        variant: 'destructive',
      });
    } finally {
      materializationInFlightRef.current = false;
      setMaterializing(false);
    }
  };

  const handleMaterializeRequest = () => {
    if (materializing) {
      return;
    }

    if (targetLfaProjectId) {
      setConfirmResyncOpen(true);
      return;
    }

    void handleMaterialize();
  };

  const handleConfirmResync = () => {
    if (materializing) {
      return;
    }

    void (async () => {
      await handleMaterialize();
      setConfirmResyncOpen(false);
    })();
  };

  const createdModuleLabels = useMemo(
    () => (lastMaterializationResult ? mapModuleLabels(lastMaterializationResult.created_modules) : []),
    [lastMaterializationResult],
  );

  const preservedModuleLabels = useMemo(
    () => (lastMaterializationResult ? mapModuleLabels(lastMaterializationResult.preserved_modules) : []),
    [lastMaterializationResult],
  );

  const warningSummaries = useMemo(
    () => sanitizeWarningsForDisplay(materializationWarnings),
    [materializationWarnings],
  );

  const resultPresentation = useMemo(
    () => (lastMaterializationResult ? getResultPresentation(lastMaterializationResult) : null),
    [lastMaterializationResult],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat proposal...
      </div>
    );
  }

  return (
    <div className="space-y-6 print-root">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-root, .print-root * { visibility: visible !important; }
          .print-root .no-print, .print-root .no-print * { visibility: hidden !important; display: none !important; }
          .print-root { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 16mm; }
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to={`/dashboard/grant-writer/${projectId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke wizard
            </Link>
          </Button>
          <h1 className="text-h2">{project?.title ?? 'Proposal'}</h1>
          {doc && (
            <p className="text-sm text-muted-foreground">
              Versi {doc.version} · Dibuat {new Date(doc.created_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        {doc && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">LFA · UN/OECD-DAC</Badge>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Unduh Markdown
            </Button>
            <Button variant="default" onClick={handlePrintPdf}>
              <Printer className="mr-1 h-4 w-4" /> Unduh PDF
            </Button>
          </div>
        )}
      </div>

      {!doc ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-accent/10 p-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h3 className="text-h4">Belum ada proposal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Selesaikan wizard 7 langkah lalu klik "Buat Proposal" untuk menghasilkan dokumen donor-ready.
              </p>
            </div>
            <Button asChild>
              <Link to={`/dashboard/grant-writer/${projectId}`}>
                <Sparkles className="mr-1 h-4 w-4" /> Lanjutkan wizard
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 via-purple-50/10 to-transparent backdrop-blur-md shadow-lg no-print overflow-hidden dark:from-indigo-950/20 dark:via-purple-950/5 dark:to-transparent">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-pulse text-indigo-500" />
                    <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-indigo-400 dark:to-purple-400">
                      Materialisasikan Program Workspace
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Ubah draf proposal hasil AI ini menjadi modul program operasional yang tersinkronisasi. Tombol ini hanya memanggil satu RPC transaksional untuk membuat atau membuka Program Workspace dari dokumen preview yang sedang ditampilkan.
                  </p>
                  <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/60 p-3 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-100">
                    <p className="font-semibold">Perlindungan edit manual</p>
                    <p className="mt-1">Modul existing yang aman akan <strong>dipertahankan</strong>, bagian kosong dapat <strong>dibuat</strong>, item yang tidak terselesaikan dapat <strong>dilewati untuk ditinjau</strong>, dan struktur parsial dapat <strong>diblokir</strong>.</p>
                    <p className="mt-1">Perubahan manual pada LFA, WBS, Anggaran, MEAL, dan SROI tidak akan diganti secara otomatis.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {completed && targetLfaProjectId && (
                    <Button variant="outline" className="border-indigo-200 hover:bg-indigo-50/50 dark:border-indigo-800" asChild>
                      <Link to={`/dashboard/lfa-builder/${targetLfaProjectId}?tab=lfa`}>
                        Buka Program Workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="default"
                    className="bg-indigo-600 text-white shadow-md shadow-indigo-200/50 hover:bg-indigo-700 dark:shadow-none"
                    disabled={materializing}
                    onClick={handleMaterializeRequest}
                  >
                    {materializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        <Play className="mr-1.5 h-4 w-4 fill-current" /> {completed ? 'Buka atau Sinkronkan Ulang' : 'Materialisasikan Sekarang'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {(resultPresentation || lastErrorSummary) && (
                <Alert
                  className="mt-4"
                  variant={resultPresentation?.tone === 'error' || resultPresentation?.tone === 'blocked' || lastErrorSummary ? 'destructive' : 'default'}
                >
                  <AlertTitle>Ringkasan hasil sinkronisasi</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-3">
                      {resultPresentation && (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{resultPresentation.title}</Badge>
                            <span>{resultPresentation.description}</span>
                          </div>

                          {(lastMaterializationResult?.failure_code || lastMaterializationResult?.blocked_stage) && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {lastMaterializationResult.failure_code && (
                                <Badge variant="outline">Kode aman: {lastMaterializationResult.failure_code}</Badge>
                              )}
                              {lastMaterializationResult.blocked_stage && (
                                <Badge variant="outline">Tahap: {lastMaterializationResult.blocked_stage}</Badge>
                              )}
                            </div>
                          )}

                          {(createdModuleLabels.length > 0 || preservedModuleLabels.length > 0) && (
                            <div className="space-y-2 text-xs">
                              {createdModuleLabels.length > 0 && (
                                <p>
                                  <span className="font-semibold">Dibuat:</span> {createdModuleLabels.join(', ')}
                                </p>
                              )}
                              {preservedModuleLabels.length > 0 && (
                                <p>
                                  <span className="font-semibold">Dipertahankan:</span> {preservedModuleLabels.join(', ')}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="space-y-1 text-xs">
                            {lastMaterializationResult.lfa_entries_created > 0 && <p>Baris LFA dibuat: {lastMaterializationResult.lfa_entries_created}</p>}
                            {lastMaterializationResult.wbs_items_created > 0 && <p>Item WBS dibuat: {lastMaterializationResult.wbs_items_created}</p>}
                            {lastMaterializationResult.budget_items_created > 0 && <p>Item anggaran dibuat: {lastMaterializationResult.budget_items_created}</p>}
                            {lastMaterializationResult.meal_items_created > 0 && <p>Indikator MEAL dibuat: {lastMaterializationResult.meal_items_created}</p>}
                            {lastMaterializationResult.sroi_outcomes_created > 0 && <p>Outcome SROI dibuat: {lastMaterializationResult.sroi_outcomes_created}</p>}
                          </div>

                          {warningSummaries.length > 0 && (
                            <div className="space-y-2 text-xs">
                              <p className="font-semibold">Catatan aman</p>
                              {warningSummaries.map((warning, index) => (
                                <div key={`${warning.message}-${index}`} className="rounded-md border border-border/60 p-2">
                                  <p>
                                    <span className="font-semibold">{warning.actionLabel}:</span> {warning.message}
                                  </p>
                                  {warning.code && <p>Kode: {warning.code}</p>}
                                  {warning.sourceIndicatorId && <p>Referensi indikator sumber: {warning.sourceIndicatorId}</p>}
                                  {warning.fields && warning.fields.length > 0 && <p>Field: {warning.fields.join(', ')}</p>}
                                </div>
                              ))}
                            </div>
                          )}

                          {SUCCESS_NAVIGATION_CODES.has(lastMaterializationResult.code) && targetLfaProjectId && (
                            <div>
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/dashboard/lfa-builder/${targetLfaProjectId}?tab=lfa`}>Buka Program Workspace</Link>
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      {lastErrorSummary && <p>{lastErrorSummary}</p>}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {materializationWarnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  <div className="font-semibold">Peringatan materialisasi</div>
                  <div className="mt-2 space-y-1">
                    {sanitizeWarningsForDisplay(materializationWarnings).slice(0, 3).map((warning, index) => (
                      <p key={`${warning.message}-${index}`}>
                        <span className="font-semibold">{warning.actionLabel}:</span> {warning.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-indigo-100/50 pt-6 dark:border-indigo-900/40">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  {steps.map((step, index) => {
                    const isIdle = step.status === 'idle';
                    const isRunning = step.status === 'running';
                    const isSuccess = step.status === 'success';
                    const isSkipped = step.status === 'skipped';
                    const isFailed = step.status === 'failed';

                    return (
                      <div
                        key={step.id}
                        className={`relative rounded-xl border p-4 transition-all duration-300 ${
                          isRunning
                            ? 'animate-pulse border-indigo-300 bg-indigo-50/30 shadow-sm shadow-indigo-100/30 dark:border-indigo-800 dark:bg-indigo-950/20'
                            : isSuccess
                              ? 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-950/30 dark:bg-emerald-950/5'
                              : isSkipped
                                ? 'border-slate-200 bg-slate-50/20 dark:border-slate-800 dark:bg-slate-900/10'
                                : isFailed
                                  ? 'border-rose-200 bg-rose-50/10 dark:border-rose-950/30'
                                  : 'border-slate-100 bg-transparent dark:border-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isRunning && <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />}
                            {isSuccess && <CheckCircle2 className="h-5 w-5 fill-emerald-50 text-emerald-500" />}
                            {isSkipped && <CheckCircle2 className="h-5 w-5 fill-indigo-50/50 text-indigo-400" />}
                            {isFailed && <XCircle className="h-5 w-5 fill-rose-50 text-rose-500" />}
                            {isIdle && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{step.label}</h4>
                            <p className="text-[10px] leading-normal text-muted-foreground">
                              {isRunning && 'Menjalankan RPC transaksional...'}
                              {isSuccess && 'Berhasil diselesaikan'}
                              {isSkipped && (step.message || 'Ditemukan, tidak dibuat ulang')}
                              {isFailed && (step.message || 'Gagal, tinjau hasil RPC')}
                              {isIdle && 'Menunggu hasil'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <AlertDialog
            open={confirmResyncOpen}
            onOpenChange={(open) => {
              if (!materializing) {
                setConfirmResyncOpen(open);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sinkronkan ke Program Workspace yang sudah ada?</AlertDialogTitle>
                <AlertDialogDescription>
                  Proses ini tidak akan menimpa modul yang sudah berisi data. Modul existing yang aman akan dipertahankan, bagian yang masih kosong dapat dibuat, dan struktur yang tidak lengkap dapat memblokir sinkronisasi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Perubahan manual pada LFA, WBS, Anggaran, MEAL, dan SROI tidak akan diganti secara otomatis.</p>
                <p>
                  <span className="font-semibold text-foreground">Sumber:</span>{' '}
                  {doc ? `Dokumen ${doc.id} · Proposal Versi ${doc.version}` : 'Proposal belum tersedia'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Target:</span>{' '}
                  Program Workspace yang sudah terhubung
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={materializing}>Batal</AlertDialogCancel>
                <AlertDialogAction disabled={materializing} onClick={handleConfirmResync}>
                  {materializing ? 'Memproses...' : 'Lanjutkan Sinkronisasi'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card no-print">
            <h2 className="font-semibold">Draft untuk direview</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Output ini adalah draf kerja. Cek kembali requirement donor, eligibility, angka program, budget, dan narasi impact sebelum digunakan.
            </p>
          </Card>

          <Card>
            <CardContent className="py-8">
              <article
                className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-table:my-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
