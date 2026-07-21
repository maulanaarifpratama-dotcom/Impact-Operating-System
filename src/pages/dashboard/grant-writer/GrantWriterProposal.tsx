import { useEffect, useMemo, useState } from 'react';
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
  [key: string]: unknown;
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
      warning.code = entry.code.trim();
    }
    if (typeof entry.message === 'string' && entry.message.trim() !== '') {
      warning.message = entry.message.trim();
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
      return 'Program berhasil dimaterialisasi secara transaksional.';
    case 'ALREADY_MATERIALIZED':
      return 'Dokumen ini sudah pernah dimaterialisasi. Data yang sama tidak dibuat ulang.';
    case 'MATERIALIZATION_IN_PROGRESS':
      return 'Materialisasi dokumen ini sedang diproses. Tunggu hingga proses sebelumnya selesai.';
    case 'PRESERVED_EXISTING':
      return 'Data program yang sudah ada dipertahankan. Tidak ada data existing yang ditimpa.';
    case 'BLOCKED_PARTIAL':
      return 'Materialisasi dihentikan karena struktur LFA yang sudah ada belum lengkap. Tinjau data existing terlebih dahulu.';
    case 'PREVIOUS_ATTEMPT_FAILED':
      return 'Percobaan materialisasi sebelumnya gagal dan perlu ditinjau sebelum dicoba kembali.';
    case 'PREVIOUS_ATTEMPT_BLOCKED':
      return 'Percobaan materialisasi sebelumnya diblokir dan memerlukan peninjauan manual.';
    case 'FAILED_VALIDATION':
      return 'Dokumen belum memenuhi syarat materialisasi.';
    case 'FAILED_DATABASE':
      return 'Materialisasi gagal. Perubahan target dibatalkan dan tidak ada data parsial yang disimpan.';
  }
}

function sanitizeWarningMessages(warnings: MaterializationRpcWarning[]): string[] {
  return warnings
    .map((warning) => {
      if (typeof warning.message === 'string' && warning.message.trim() !== '') {
        return warning.message.trim();
      }
      if (typeof warning.code === 'string' && warning.code.trim() !== '') {
        return warning.code.trim();
      }
      return null;
    })
    .filter((warning): warning is string => warning !== null)
    .slice(0, 3);
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
  const segments = [getResultPrimaryMessage(result)];
  const countSummary = formatCountSummary(result);
  const warningSummary = formatWarningSummary(result.warnings);

  if (result.code === 'PRESERVED_EXISTING' && result.preserved_modules.length > 0) {
    segments.push(`Modul dipertahankan: ${result.preserved_modules.join(', ')}.`);
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

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);

      const [{ data: projectData }, { data: documentData }] = await Promise.all([
        supabase.from('gw_projects').select('*').eq('id', projectId).maybeSingle(),
        supabase
          .from('gw_lfa_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
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
    if (!project || materializing) {
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

    setMaterializing(true);
    setCompleted(false);
    setMaterializationWarnings([]);
    setSteps(buildPendingSteps());

    try {
      const { data, error } = await RPC_CLIENT.rpc('materialize_grantwriter_document', rpcArgs);

      if (error) {
        throw error;
      }

      const result = parseMaterializationRpcResult(data);
      if (!result) {
        setSteps(buildFailedSteps('Respons materialisasi tidak valid.'));
        toast({
          title: 'Materialisasi Gagal',
          description: 'Respons materialisasi tidak valid. Tidak ada fallback penulisan data yang dijalankan.',
          variant: 'destructive',
        });
        return;
      }

      setMaterializationWarnings(result.warnings);
      setSteps(buildStepsFromResult(result));

      const description = buildToastDescription(result);

      if (SUCCESS_NAVIGATION_CODES.has(result.code)) {
        if (!result.lfa_project_id) {
          setCompleted(false);
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
          title: result.code === 'CREATED' ? 'Materialisasi Berhasil' : 'Materialisasi Selesai',
          description,
        });
        navigate(`/dashboard/lfa-builder/${result.lfa_project_id}?tab=lfa`);
        return;
      }

      setCompleted(false);

      if (result.code === 'MATERIALIZATION_IN_PROGRESS') {
        toast({
          title: 'Materialisasi Sedang Diproses',
          description,
        });
        return;
      }

      toast({
        title: 'Materialisasi Gagal',
        description,
        variant: 'destructive',
      });
    } catch (error: unknown) {
      const description = getTransportErrorDescription(error);
      setSteps(buildFailedSteps(description));
      setCompleted(false);
      toast({
        title: 'Materialisasi Gagal',
        description,
        variant: 'destructive',
      });
    } finally {
      setMaterializing(false);
    }
  };

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
                    onClick={handleMaterialize}
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

              {materializationWarnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  <div className="font-semibold">Peringatan materialisasi</div>
                  <div className="mt-2 space-y-1">
                    {sanitizeWarningMessages(materializationWarnings).map((warning) => (
                      <p key={warning}>{warning}</p>
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
