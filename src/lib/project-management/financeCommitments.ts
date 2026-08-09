/**
 * Project Management Finance — Commitment Application Service.
 *
 * Typed wrappers around the Production SECURITY DEFINER RPCs for the
 * normalized commitment lifecycle. All mutations go through RPC — never
 * direct table INSERT/UPDATE/DELETE. The client never sends org_id or
 * actor metadata; those are derived server-side from auth.uid() and the
 * parent budget item.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/database.generated';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Generated Row Type ──────────────────────────────────────────────────────

export type CommitmentRow = Database['public']['Tables']['project_budget_commitments']['Row'];

// ── User-Editable Form Types ────────────────────────────────────────────────

export type CommitmentAction = 'edit' | 'submit' | 'approve' | 'reject' | 'cancel';

export interface CreateCommitmentInput {
  lfa_project_id: string;
  budget_item_id: string;
  amount_idr: number;
  description?: string;
  counterparty_name?: string;
  reference_number?: string;
  expected_realization_date?: string;
  evidence_url?: string;
}

export interface UpdateCommitmentPatch {
  amount_idr?: number;
  description?: string | null;
  counterparty_name?: string | null;
  reference_number?: string | null;
  expected_realization_date?: string | null;
  evidence_url?: string | null;
}

// ── Query ───────────────────────────────────────────────────────────────────

export async function listProjectCommitments(
  supabase: Rpc,
  lfa_project_id: string,
): Promise<CommitmentRow[]> {
  const { data, error } = await supabase
    .from('project_budget_commitments')
    .select(COMMITMENT_FIELDS)
    .eq('lfa_project_id', lfa_project_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CommitmentRow[];
}

const COMMITMENT_FIELDS = 'id,lfa_project_id,budget_item_id,amount_idr,workflow_status,description,counterparty_name,reference_number,expected_realization_date,evidence_url,submitted_at,approved_at,cancelled_at,rejected_at,decision_note,created_at,updated_at';

// ── Mutations ───────────────────────────────────────────────────────────────

export async function createCommitmentDraft(
  supabase: Rpc,
  input: CreateCommitmentInput,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('create_commitment_draft', {
    p_lfa_project_id: input.lfa_project_id,
    p_budget_item_id: input.budget_item_id,
    p_amount_idr: input.amount_idr,
    p_description: input.description ?? null,
    p_counterparty_name: input.counterparty_name ?? null,
    p_reference_number: input.reference_number ?? null,
    p_expected_realization_date: input.expected_realization_date ?? null,
    p_evidence_url: input.evidence_url ?? null,
  });

  if (error) throw error;
  return data as unknown as CommitmentRow;
}

export async function updateCommitmentDraft(
  supabase: Rpc,
  commitmentId: string,
  patch: UpdateCommitmentPatch,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('update_commitment_draft', {
    p_commitment_id: commitmentId,
    p_patch: patch as Json,
  });

  if (error) throw error;
  return data as unknown as CommitmentRow;
}

export async function submitCommitment(
  supabase: Rpc,
  commitmentId: string,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('submit_commitment', {
    p_commitment_id: commitmentId,
  });
  if (error) throw error;
  return data as unknown as CommitmentRow;
}

export async function approveCommitment(
  supabase: Rpc,
  commitmentId: string,
  decisionNote?: string,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('approve_commitment', {
    p_commitment_id: commitmentId,
    p_decision_note: decisionNote ?? null,
  });
  if (error) throw error;
  return data as unknown as CommitmentRow;
}

export async function rejectCommitment(
  supabase: Rpc,
  commitmentId: string,
  decisionNote: string,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('reject_commitment', {
    p_commitment_id: commitmentId,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return data as unknown as CommitmentRow;
}

export async function cancelCommitment(
  supabase: Rpc,
  commitmentId: string,
  decisionNote: string,
): Promise<CommitmentRow> {
  const { data, error } = await supabase.rpc('cancel_commitment', {
    p_commitment_id: commitmentId,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return data as unknown as CommitmentRow;
}

// ── Lifecycle Actions ───────────────────────────────────────────────────────

export function getCommitmentAvailableActions(status: string): CommitmentAction[] {
  switch (status) {
    case 'draft':
      return ['edit', 'submit'];
    case 'submitted':
      return ['approve', 'reject'];
    case 'approved':
      return ['cancel'];
    default:
      return [];
  }
}

// ── Patch Builder ───────────────────────────────────────────────────────────

const ALLOWED_PATCH_FIELDS: readonly (keyof UpdateCommitmentPatch)[] = [
  'amount_idr',
  'description',
  'counterparty_name',
  'reference_number',
  'expected_realization_date',
  'evidence_url',
];

export function buildCommitmentPatch(
  original: Partial<CommitmentRow>,
  edited: Partial<CommitmentRow>,
): UpdateCommitmentPatch | null {
  const patch: Record<string, unknown> = {};

  for (const field of ALLOWED_PATCH_FIELDS) {
    const orig = (original as Record<string, unknown>)[field];
    const edit = (edited as Record<string, unknown>)[field];

    if (edit === undefined) continue;

    const origNormalized = orig ?? null;
    const editNormalized = edit === '' ? null : edit;

    if (editNormalized !== origNormalized) {
      patch[field] = editNormalized;
    }
  }

  return Object.keys(patch).length > 0 ? (patch as UpdateCommitmentPatch) : null;
}

// ── Validation ──────────────────────────────────────────────────────────────

export function validateCommitmentAmount(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return 'Nilai komitmen wajib diisi.';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 'Nilai komitmen harus berupa angka.';
  }
  if (n <= 0) {
    return 'Nilai komitmen harus lebih besar dari nol.';
  }
  return null;
}

// ── Error Mapping ───────────────────────────────────────────────────────────

type ErrorMapperEntry = { prefix: string; message: string };

const ERROR_MAP: ErrorMapperEntry[] = [
  { prefix: 'AUTHENTICATION_REQUIRED', message: 'Sesi Anda tidak valid. Silakan masuk kembali.' },
  { prefix: 'FINANCE_OWNER_REQUIRED', message: 'Hanya pemilik organisasi yang dapat mengelola komitmen keuangan.' },
  { prefix: 'COMMITMENT_NOT_FOUND', message: 'Komitmen tidak ditemukan.' },
  { prefix: 'COMMITMENT_NOT_DRAFT', message: 'Hanya komitmen berstatus Draf yang dapat diubah atau diajukan.' },
  { prefix: 'COMMITMENT_NOT_SUBMITTED', message: 'Hanya komitmen yang telah diajukan yang dapat disetujui atau ditolak.' },
  { prefix: 'COMMITMENT_NOT_APPROVED', message: 'Komitmen belum disetujui.' },
  { prefix: 'COMMITMENT_CANNOT_CANCEL', message: 'Komitmen pada status ini tidak dapat dibatalkan.' },
  { prefix: 'INVALID_AMOUNT', message: 'Nilai komitmen harus lebih besar dari nol.' },
  { prefix: 'INVALID_PATCH', message: 'Perubahan data komitmen tidak valid.' },
  { prefix: 'PATCH_FIELD_NOT_ALLOWED', message: 'Terdapat field yang tidak boleh diubah.' },
];

export function mapFinanceCommitmentError(err: unknown): string {
  const message: string =
    (err as { message?: string })?.message ??
    (err as { error?: { message?: string } })?.error?.message ??
    String(err ?? '');

  for (const entry of ERROR_MAP) {
    if (message.includes(entry.prefix)) return entry.message;
  }

  return 'Tindakan tidak dapat diselesaikan. Muat ulang data dan coba kembali.';
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const COMMITMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draf',
  submitted: 'Diajukan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export const COMMITMENT_ACTION_LABELS: Record<CommitmentAction, string> = {
  edit: 'Edit',
  submit: 'Ajukan',
  approve: 'Setujui',
  reject: 'Tolak',
  cancel: 'Batalkan',
};
