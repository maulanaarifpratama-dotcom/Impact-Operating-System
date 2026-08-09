/**
 * Project Management Finance — Funding, Installment & Receipt Application Service.
 *
 * Typed wrappers around Production SECURITY DEFINER RPCs. All mutations
 * go through RPC — never direct INSERT/UPDATE/DELETE.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/database.generated';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Row Types ───────────────────────────────────────────────────────────────

export type FundingSourceRow = Database['public']['Tables']['project_funding_sources']['Row'];
export type FundingInstallmentRow = Database['public']['Tables']['project_funding_installments']['Row'];
export type FundingReceiptRow = Database['public']['Tables']['project_funding_receipts']['Row'];

// ── Form Types ──────────────────────────────────────────────────────────────

export type FundingAction = 'edit' | 'submit' | 'approve' | 'reject' | 'cancel';
export type InstallmentAction = 'edit' | 'schedule' | 'cancel';
export type ReceiptAction = 'edit' | 'submit' | 'post' | 'reject' | 'reverse';

export interface CreateSourceInput {
  lfa_project_id: string; source_name: string; funding_type?: string;
  agreement_amount_idr: number; currency?: string; agreement_number?: string;
  start_date?: string; end_date?: string; description?: string; evidence_url?: string;
}

export interface CreateInstallmentInput {
  funding_source_id: string; installment_number: number; installment_name?: string;
  scheduled_amount_idr: number; due_date: string; description?: string; evidence_url?: string;
}

export interface CreateReceiptInput {
  funding_source_id: string; installment_id?: string | null; amount_idr: number;
  currency?: string; receipt_date: string; reference_number?: string;
  bank_account_label?: string; description?: string; evidence_url?: string;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function fetchProjectFunding(supabase: Rpc, projectId: string) {
  const [srcs, insts, recs] = await Promise.all([
    supabase.from('project_funding_sources').select(SRC_FIELDS).eq('lfa_project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('project_funding_installments').select(INST_FIELDS).eq('lfa_project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('project_funding_receipts').select(REC_FIELDS).eq('lfa_project_id', projectId).order('created_at', { ascending: false }),
  ]);
  return {
    sources: (srcs.data ?? []) as unknown as FundingSourceRow[],
    installments: (insts.data ?? []) as unknown as FundingInstallmentRow[],
    receipts: (recs.data ?? []) as unknown as FundingReceiptRow[],
  };
}

const SRC_FIELDS = 'id,lfa_project_id,source_name,funding_type,agreement_amount_idr,currency,agreement_number,start_date,end_date,description,evidence_url,workflow_status,submitted_at,approved_at,rejected_at,cancelled_at,decision_note,created_at,updated_at';
const INST_FIELDS = 'id,lfa_project_id,funding_source_id,installment_number,installment_name,scheduled_amount_idr,due_date,description,evidence_url,workflow_status,submitted_at,cancelled_at,decision_note,created_at,updated_at';
const REC_FIELDS = 'id,lfa_project_id,funding_source_id,installment_id,amount_idr,currency,receipt_date,reference_number,bank_account_label,description,evidence_url,workflow_status,reversal_of_id,submitted_at,posted_at,rejected_at,decision_note,created_at,updated_at';

// ── Source RPCs ─────────────────────────────────────────────────────────────

export async function createFundingSourceDraft(s: Rpc, input: CreateSourceInput) {
  const { data, error } = await s.rpc('create_funding_source_draft', {
    p_lfa_project_id: input.lfa_project_id, p_source_name: input.source_name,
    p_funding_type: input.funding_type ?? 'grant', p_agreement_amount_idr: input.agreement_amount_idr,
    p_currency: input.currency ?? 'IDR', p_agreement_number: input.agreement_number ?? null,
    p_start_date: input.start_date ?? null, p_end_date: input.end_date ?? null,
    p_description: input.description ?? null, p_evidence_url: input.evidence_url ?? null,
  });
  if (error) throw error;
  return data as unknown as FundingSourceRow;
}

export async function updateFundingSourceDraft(s: Rpc, id: string, patch: Record<string, unknown>) {
  const { data, error } = await s.rpc('update_funding_source_draft', { p_funding_source_id: id, p_patch: patch as Json });
  if (error) throw error;
  return data as unknown as FundingSourceRow;
}

export async function submitFundingSource(s: Rpc, id: string) { const { data, error } = await s.rpc('submit_funding_source', { p_funding_source_id: id }); if (error) throw error; return data as unknown as FundingSourceRow; }
export async function approveFundingSource(s: Rpc, id: string, note?: string) { const { data, error } = await s.rpc('approve_funding_source', { p_funding_source_id: id, p_decision_note: note ?? null }); if (error) throw error; return data as unknown as FundingSourceRow; }
export async function rejectFundingSource(s: Rpc, id: string, note: string) { const { data, error } = await s.rpc('reject_funding_source', { p_funding_source_id: id, p_decision_note: note }); if (error) throw error; return data as unknown as FundingSourceRow; }
export async function cancelFundingSource(s: Rpc, id: string, note: string) { const { data, error } = await s.rpc('cancel_funding_source', { p_funding_source_id: id, p_decision_note: note }); if (error) throw error; return data as unknown as FundingSourceRow; }

// ── Installment RPCs ───────────────────────────────────────────────────────

export async function createFundingInstallmentDraft(s: Rpc, input: CreateInstallmentInput) {
  const { data, error } = await s.rpc('create_funding_installment_draft', {
    p_funding_source_id: input.funding_source_id, p_installment_number: input.installment_number,
    p_installment_name: input.installment_name ?? null, p_scheduled_amount_idr: input.scheduled_amount_idr,
    p_due_date: input.due_date, p_description: input.description ?? null, p_evidence_url: input.evidence_url ?? null,
  });
  if (error) throw error;
  return data as unknown as FundingInstallmentRow;
}

export async function updateFundingInstallmentDraft(s: Rpc, id: string, patch: Record<string, unknown>) {
  const { data, error } = await s.rpc('update_funding_installment_draft', { p_installment_id: id, p_patch: patch as Json });
  if (error) throw error;
  return data as unknown as FundingInstallmentRow;
}

export async function scheduleFundingInstallment(s: Rpc, id: string) { const { data, error } = await s.rpc('schedule_funding_installment', { p_installment_id: id }); if (error) throw error; return data as unknown as FundingInstallmentRow; }
export async function cancelFundingInstallment(s: Rpc, id: string, note: string) { const { data, error } = await s.rpc('cancel_funding_installment', { p_installment_id: id, p_decision_note: note }); if (error) throw error; return data as unknown as FundingInstallmentRow; }

// ── Receipt RPCs ───────────────────────────────────────────────────────────

export async function createFundingReceiptDraft(s: Rpc, input: CreateReceiptInput) {
  const { data, error } = await s.rpc('create_funding_receipt_draft', {
    p_funding_source_id: input.funding_source_id, p_installment_id: input.installment_id ?? null,
    p_amount_idr: input.amount_idr, p_currency: input.currency ?? 'IDR',
    p_receipt_date: input.receipt_date, p_reference_number: input.reference_number ?? null,
    p_bank_account_label: input.bank_account_label ?? null, p_description: input.description ?? null,
    p_evidence_url: input.evidence_url ?? null,
  });
  if (error) throw error;
  return data as unknown as FundingReceiptRow;
}

export async function updateFundingReceiptDraft(s: Rpc, id: string, patch: Record<string, unknown>) {
  const { data, error } = await s.rpc('update_funding_receipt_draft', { p_receipt_id: id, p_patch: patch as Json });
  if (error) throw error;
  return data as unknown as FundingReceiptRow;
}

export async function submitFundingReceipt(s: Rpc, id: string) { const { data, error } = await s.rpc('submit_funding_receipt', { p_receipt_id: id }); if (error) throw error; return data as unknown as FundingReceiptRow; }
export async function postFundingReceipt(s: Rpc, id: string, note?: string) { const { data, error } = await s.rpc('post_funding_receipt', { p_receipt_id: id, p_decision_note: note ?? null }); if (error) throw error; return data as unknown as FundingReceiptRow; }
export async function rejectFundingReceipt(s: Rpc, id: string, note: string) { const { data, error } = await s.rpc('reject_funding_receipt', { p_receipt_id: id, p_decision_note: note }); if (error) throw error; return data as unknown as FundingReceiptRow; }
export async function reverseFundingReceipt(s: Rpc, origId: string, amount: number, desc?: string, ev?: string) {
  const { data, error } = await s.rpc('reverse_funding_receipt', { p_original_receipt_id: origId, p_reversal_amount_idr: amount, p_description: desc ?? null, p_evidence_url: ev ?? null });
  if (error) throw error;
  return data as unknown as FundingReceiptRow;
}

// ── Action Matrix ───────────────────────────────────────────────────────────

export function getSourceAvailableActions(status: string): FundingAction[] {
  switch (status) { case 'draft': return ['edit', 'submit']; case 'submitted': return ['approve', 'reject']; case 'approved': return ['cancel']; default: return []; }
}

export function getInstallmentAvailableActions(status: string): InstallmentAction[] {
  switch (status) { case 'draft': return ['edit', 'schedule']; case 'scheduled': return ['cancel']; default: return []; }
}

export function getReceiptAvailableActions(status: string, isReversal: boolean): ReceiptAction[] {
  if (isReversal) return [];
  switch (status) { case 'draft': return ['edit', 'submit']; case 'submitted': return ['post', 'reject']; case 'posted': return ['reverse']; default: return []; }
}

// ── Derived Installment State ───────────────────────────────────────────────

export function computeInstallmentDerivedState(
  inst: FundingInstallmentRow,
  receipts: FundingReceiptRow[],
  now: Date = new Date(),
): string {
  if (inst.workflow_status === 'cancelled') return 'cancelled';
  const net = receipts
    .filter(r => r.installment_id === inst.id && r.workflow_status === 'posted')
    .reduce((sum, r) => sum + (r.reversal_of_id ? -r.amount_idr : r.amount_idr), 0);
  if (net >= inst.scheduled_amount_idr) return net > inst.scheduled_amount_idr ? 'over_received' : 'fully_received';
  const due = new Date(inst.due_date);
  if (due < now) return net > 0 ? 'overdue' : 'awaiting_receipt';
  if (net > 0) return 'partially_received';
  return 'upcoming';
}

export const INSTALLMENT_DERIVED_LABELS: Record<string, string> = {
  cancelled: 'Dibatalkan', fully_received: 'Diterima Penuh', partially_received: 'Diterima Sebagian',
  over_received: 'Diterima Berlebih', overdue: 'Terlambat', awaiting_receipt: 'Menunggu Penerimaan', upcoming: 'Akan Datang',
};

// ── Receipt Calculations ────────────────────────────────────────────────────

export function calculateReceiptAlreadyReversed(receipts: FundingReceiptRow[], originalId: string): number {
  return receipts.filter(r => r.reversal_of_id === originalId && r.workflow_status === 'posted').reduce((s, r) => s + r.amount_idr, 0);
}

export function calculateReceiptRemainingReversible(receipts: FundingReceiptRow[], original: FundingReceiptRow): number {
  if (original.workflow_status !== 'posted' || original.reversal_of_id != null) return 0;
  return Math.max(original.amount_idr - calculateReceiptAlreadyReversed(receipts, original.id), 0);
}

// ── Patch Builders ──────────────────────────────────────────────────────────

export function buildPatch<T extends Record<string, unknown>>(original: T, edited: Partial<T>, allowed: readonly string[]): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  for (const f of allowed) {
    const o = original[f]; const e = edited[f]; if (e === undefined) continue;
    const oN = o ?? null; const eN = e === '' ? null : e;
    if (eN !== oN) patch[f] = eN;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export const SOURCE_PATCH_ALLOWED = ['source_name','funding_type','agreement_amount_idr','currency','agreement_number','start_date','end_date','description','evidence_url'];
export const INSTALLMENT_PATCH_ALLOWED = ['installment_number','installment_name','scheduled_amount_idr','due_date','description','evidence_url'];
export const RECEIPT_PATCH_ALLOWED = ['installment_id','amount_idr','currency','receipt_date','reference_number','bank_account_label','description','evidence_url'];

// ── Validation ──────────────────────────────────────────────────────────────

export function validateFundingAmount(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return 'Nilai wajib diisi.';
  const n = Number(value); if (!Number.isFinite(n)) return 'Nilai harus berupa angka.'; if (n <= 0) return 'Nilai harus lebih besar dari nol.';
  return null;
}

// ── Error Mapping ───────────────────────────────────────────────────────────

const FUNDING_ERRORS: Array<{ p: string; m: string }> = [
  { p: 'AUTHENTICATION_REQUIRED', m: 'Sesi Anda tidak valid. Silakan masuk kembali.' },
  { p: 'FINANCE_OWNER_REQUIRED', m: 'Hanya pemilik organisasi yang dapat mengelola pendanaan project.' },
  { p: 'PROJECT_NOT_FOUND', m: 'Project tidak ditemukan atau tidak dapat diakses.' },
  { p: 'FUNDING_SOURCE_NOT_FOUND', m: 'Sumber pendanaan tidak ditemukan.' },
  { p: 'FUNDING_SOURCE_NOT_DRAFT', m: 'Hanya sumber pendanaan berstatus Draf yang dapat diubah atau diajukan.' },
  { p: 'FUNDING_SOURCE_NOT_SUBMITTED', m: 'Hanya sumber pendanaan yang telah diajukan yang dapat disetujui atau ditolak.' },
  { p: 'FUNDING_SOURCE_NOT_APPROVED', m: 'Sumber pendanaan belum disetujui.' },
  { p: 'FUNDING_SOURCE_CANNOT_CANCEL', m: 'Sumber pendanaan pada status ini tidak dapat dibatalkan.' },
  { p: 'FUNDING_SOURCE_HAS_POSTED_RECEIPT', m: 'Sumber pendanaan tidak dapat dibatalkan karena sudah memiliki penerimaan yang dibukukan.' },
  { p: 'FUNDING_SOURCE_HAS_ACTIVE_INSTALLMENTS', m: 'Sumber pendanaan tidak dapat dibatalkan karena masih memiliki termin aktif.' },
  { p: 'INSTALLMENT_NOT_FOUND', m: 'Termin tidak ditemukan.' },
  { p: 'INSTALLMENT_NOT_DRAFT', m: 'Hanya termin berstatus Draf yang dapat diubah atau dijadwalkan.' },
  { p: 'INSTALLMENT_NOT_SCHEDULED', m: 'Termin belum dijadwalkan.' },
  { p: 'INSTALLMENT_HAS_POSTED_RECEIPT', m: 'Termin tidak dapat dibatalkan karena sudah memiliki penerimaan.' },
  { p: 'INSTALLMENT_NOT_BELONG_TO_SOURCE', m: 'Termin tidak berasal dari sumber pendanaan yang dipilih.' },
  { p: 'RECEIPT_NOT_FOUND', m: 'Penerimaan dana tidak ditemukan.' },
  { p: 'RECEIPT_NOT_DRAFT', m: 'Hanya penerimaan berstatus Draf yang dapat diubah atau diajukan.' },
  { p: 'RECEIPT_NOT_SUBMITTED', m: 'Hanya penerimaan yang telah diajukan yang dapat dibukukan atau ditolak.' },
  { p: 'RECEIPT_NOT_POSTED', m: 'Hanya penerimaan yang telah dibukukan yang dapat dibalik.' },
  { p: 'REVERSAL_CANNOT_REVERSE_REVERSAL', m: 'Record pembalikan tidak dapat dibalik kembali.' },
  { p: 'REVERSAL_EXCEEDS_ORIGINAL', m: 'Nilai pembalikan melebihi sisa penerimaan asli.' },
  { p: 'INVALID_AMOUNT', m: 'Nilai harus lebih besar dari nol.' },
  { p: 'INVALID_REVERSAL_AMOUNT', m: 'Nilai pembalikan harus lebih besar dari nol.' },
  { p: 'INVALID_PATCH', m: 'Perubahan data tidak valid.' },
  { p: 'PATCH_FIELD_NOT_ALLOWED', m: 'Terdapat field yang tidak boleh diubah.' },
];

export function mapFundingError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err ?? '');
  for (const e of FUNDING_ERRORS) { if (msg.includes(e.p)) return e.m; }
  return 'Tindakan tidak dapat diselesaikan. Muat ulang data dan coba kembali.';
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const FUNDING_TYPE_LABELS: Record<string, string> = { grant:'Grant', donation:'Donasi', government:'Pemerintah', corporate:'Perusahaan', internal:'Internal', loan:'Pinjaman', other:'Lainnya' };
export const FUNDING_STATUS_LABELS: Record<string, string> = { draft:'Draf', submitted:'Diajukan', approved:'Disetujui', rejected:'Ditolak', cancelled:'Dibatalkan' };
export const INSTALLMENT_STATUS_LABELS: Record<string, string> = { draft:'Draf', scheduled:'Dijadwalkan', cancelled:'Dibatalkan' };
export const RECEIPT_STATUS_LABELS: Record<string, string> = { draft:'Draf', submitted:'Diajukan', posted:'Dibukukan', rejected:'Ditolak' };
export const FUNDING_ACTION_LABELS: Record<string, string> = { edit:'Edit', submit:'Ajukan', approve:'Setujui', reject:'Tolak', cancel:'Batalkan', schedule:'Jadwalkan', post:'Bukukan', reverse:'Balikkan' };
