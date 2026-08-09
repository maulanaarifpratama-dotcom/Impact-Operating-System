/**
 * Project Management Finance — Expenditure & Reversal Application Service.
 *
 * Typed wrappers around Production SECURITY DEFINER RPCs. All mutations
 * go through RPC — never direct INSERT/UPDATE/DELETE.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/database.generated';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Generated Row Type ──────────────────────────────────────────────────────

export type ExpenditureRow = Database['public']['Tables']['project_budget_expenditures']['Row'];

// ── Form Types ──────────────────────────────────────────────────────────────

export type ExpenditureAction = 'edit' | 'submit' | 'post' | 'reject' | 'reverse';

export interface CreateExpenditureInput {
  lfa_project_id: string;
  budget_item_id: string;
  amount_idr: number;
  commitment_id?: string | null;
  description?: string;
  transaction_date?: string;
  reference_number?: string;
  evidence_url?: string;
}

export interface UpdateExpenditurePatch {
  amount_idr?: number;
  commitment_id?: string | null;
  description?: string | null;
  transaction_date?: string | null;
  reference_number?: string | null;
  evidence_url?: string | null;
}

// ── Query ───────────────────────────────────────────────────────────────────

export async function listProjectExpenditures(
  supabase: Rpc,
  lfa_project_id: string,
): Promise<ExpenditureRow[]> {
  const { data, error } = await supabase
    .from('project_budget_expenditures')
    .select(EXP_FIELDS)
    .eq('lfa_project_id', lfa_project_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ExpenditureRow[];
}

const EXP_FIELDS = 'id,lfa_project_id,budget_item_id,commitment_id,amount_idr,workflow_status,description,transaction_date,reference_number,evidence_url,reversal_of_id,submitted_at,posted_at,rejected_at,decision_note,created_at,updated_at';

// ── Mutations ───────────────────────────────────────────────────────────────

export async function createExpenditureDraft(
  supabase: Rpc,
  input: CreateExpenditureInput,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('create_expenditure_draft', {
    p_lfa_project_id: input.lfa_project_id,
    p_budget_item_id: input.budget_item_id,
    p_amount_idr: input.amount_idr,
    p_commitment_id: input.commitment_id ?? null,
    p_description: input.description ?? null,
    p_transaction_date: input.transaction_date ?? null,
    p_reference_number: input.reference_number ?? null,
    p_evidence_url: input.evidence_url ?? null,
  });

  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

export async function updateExpenditureDraft(
  supabase: Rpc,
  expenditureId: string,
  patch: UpdateExpenditurePatch,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('update_expenditure_draft', {
    p_expenditure_id: expenditureId,
    p_patch: patch as Json,
  });

  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

export async function submitExpenditure(
  supabase: Rpc,
  expenditureId: string,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('submit_expenditure', {
    p_expenditure_id: expenditureId,
  });
  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

export async function postExpenditure(
  supabase: Rpc,
  expenditureId: string,
  decisionNote?: string,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('post_expenditure', {
    p_expenditure_id: expenditureId,
    p_decision_note: decisionNote ?? null,
  });
  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

export async function rejectExpenditure(
  supabase: Rpc,
  expenditureId: string,
  decisionNote: string,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('reject_expenditure', {
    p_expenditure_id: expenditureId,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

export async function reverseExpenditure(
  supabase: Rpc,
  originalId: string,
  reversalAmount: number,
  description?: string,
  evidenceUrl?: string,
): Promise<ExpenditureRow> {
  const { data, error } = await supabase.rpc('reverse_expenditure', {
    p_original_expenditure_id: originalId,
    p_reversal_amount_idr: reversalAmount,
    p_description: description ?? null,
    p_evidence_url: evidenceUrl ?? null,
  });
  if (error) throw error;
  return data as unknown as ExpenditureRow;
}

// ── Lifecycle Actions ───────────────────────────────────────────────────────

export function getExpenditureAvailableActions(
  status: string,
  isReversal: boolean,
): ExpenditureAction[] {
  if (isReversal) return [];
  switch (status) {
    case 'draft': return ['edit', 'submit'];
    case 'submitted': return ['post', 'reject'];
    case 'posted': return ['reverse'];
    default: return [];
  }
}

// ── Reversal Calculation ────────────────────────────────────────────────────

export function calculateAlreadyReversed(
  expenditures: ExpenditureRow[],
  originalId: string,
): number {
  return expenditures
    .filter((e) => e.reversal_of_id === originalId && e.workflow_status === 'posted')
    .reduce((sum, e) => sum + e.amount_idr, 0);
}

export function calculateRemainingReversible(
  expenditures: ExpenditureRow[],
  original: ExpenditureRow,
): number {
  if (original.workflow_status !== 'posted' || original.reversal_of_id != null) return 0;
  const reversed = calculateAlreadyReversed(expenditures, original.id);
  return Math.max(original.amount_idr - reversed, 0);
}

// ── Eligible Commitments ────────────────────────────────────────────────────

export function getEligibleCommitmentsForBudgetItem(
  commitments: Array<{
    id: string;
    budget_item_id: string;
    workflow_status: string;
    amount_idr: number;
  }>,
  budgetItemId: string,
) {
  return commitments.filter(
    (c) => c.budget_item_id === budgetItemId && c.workflow_status === 'approved',
  );
}

// ── Patch Builder ───────────────────────────────────────────────────────────

const ALLOWED_EXP_PATCH_FIELDS: readonly (keyof UpdateExpenditurePatch)[] = [
  'amount_idr', 'commitment_id', 'description', 'transaction_date', 'reference_number', 'evidence_url',
];

export function buildExpenditurePatch(
  original: Partial<ExpenditureRow>,
  edited: Partial<ExpenditureRow>,
): UpdateExpenditurePatch | null {
  const patch: Record<string, unknown> = {};

  for (const field of ALLOWED_EXP_PATCH_FIELDS) {
    const orig = (original as Record<string, unknown>)[field];
    const edit = (edited as Record<string, unknown>)[field];
    if (edit === undefined) continue;
    const origN = orig ?? null;
    const editN = edit === '' ? null : edit;
    if (editN !== origN) patch[field] = editN;
  }

  return Object.keys(patch).length > 0 ? (patch as UpdateExpenditurePatch) : null;
}

// ── Validation ──────────────────────────────────────────────────────────────

export function validateExpenditureAmount(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return 'Nilai realisasi wajib diisi.';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Nilai realisasi harus berupa angka.';
  if (n <= 0) return 'Nilai realisasi harus lebih besar dari nol.';
  return null;
}

// ── Error Mapping ───────────────────────────────────────────────────────────

const EXP_ERROR_MAP: Array<{ prefix: string; message: string }> = [
  { prefix: 'AUTHENTICATION_REQUIRED', message: 'Sesi Anda tidak valid. Silakan masuk kembali.' },
  { prefix: 'FINANCE_OWNER_REQUIRED', message: 'Hanya pemilik organisasi yang dapat mengelola realisasi keuangan.' },
  { prefix: 'EXPENDITURE_NOT_FOUND', message: 'Transaksi realisasi tidak ditemukan.' },
  { prefix: 'EXPENDITURE_NOT_DRAFT', message: 'Hanya realisasi berstatus Draf yang dapat diubah atau diajukan.' },
  { prefix: 'EXPENDITURE_NOT_SUBMITTED', message: 'Hanya realisasi yang telah diajukan yang dapat dibukukan atau ditolak.' },
  { prefix: 'EXPENDITURE_NOT_POSTED', message: 'Hanya transaksi yang telah dibukukan yang dapat dibalik.' },
  { prefix: 'EXPENDITURE_COMMITMENT_NOT_APPROVED', message: 'Komitmen yang dipilih belum disetujui.' },
  { prefix: 'COMMITMENT_NOT_FOUND', message: 'Komitmen tidak ditemukan.' },
  { prefix: 'COMMITMENT_NOT_APPROVED', message: 'Komitmen yang dipilih belum disetujui.' },
  { prefix: 'COMMITMENT_OVER_REALIZATION', message: 'Nilai realisasi melebihi sisa nilai komitmen.' },
  { prefix: 'REVERSAL_CANNOT_REVERSE_REVERSAL', message: 'Record pembalikan tidak dapat dibalik kembali.' },
  { prefix: 'REVERSAL_EXCEEDS_ORIGINAL', message: 'Nilai pembalikan melebihi sisa nilai transaksi asli.' },
  { prefix: 'INVALID_AMOUNT', message: 'Nilai realisasi harus lebih besar dari nol.' },
  { prefix: 'INVALID_REVERSAL_AMOUNT', message: 'Nilai pembalikan harus lebih besar dari nol.' },
  { prefix: 'INVALID_PATCH', message: 'Perubahan data realisasi tidak valid.' },
  { prefix: 'PATCH_FIELD_NOT_ALLOWED', message: 'Terdapat field yang tidak boleh diubah.' },
];

export function mapFinanceExpenditureError(err: unknown): string {
  const message = (err as { message?: string })?.message ?? String(err ?? '');
  for (const e of EXP_ERROR_MAP) { if (message.includes(e.prefix)) return e.message; }
  return 'Tindakan tidak dapat diselesaikan. Muat ulang data dan coba kembali.';
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const EXPENDITURE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draf', submitted: 'Diajukan', posted: 'Dibukukan', rejected: 'Ditolak',
};

export const EXPENDITURE_ACTION_LABELS: Record<ExpenditureAction, string> = {
  edit: 'Edit', submit: 'Ajukan', post: 'Bukukan', reject: 'Tolak', reverse: 'Balikkan',
};
