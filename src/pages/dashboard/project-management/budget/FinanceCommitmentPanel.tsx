import { useState, useCallback, useEffect } from 'react';
import { Plus, Edit3, Check, X, Loader2, AlertTriangle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  listProjectCommitments, createCommitmentDraft, updateCommitmentDraft,
  submitCommitment, approveCommitment, rejectCommitment, cancelCommitment,
  buildCommitmentPatch, validateCommitmentAmount, mapFinanceCommitmentError,
  getCommitmentAvailableActions,
  COMMITMENT_STATUS_LABELS, COMMITMENT_ACTION_LABELS,
  type CommitmentRow, type CommitmentAction, type CreateCommitmentInput,
} from '@/lib/project-management/financeCommitments';
import {
  listProjectExpenditures, createExpenditureDraft, updateExpenditureDraft,
  submitExpenditure, postExpenditure, rejectExpenditure, reverseExpenditure,
  buildExpenditurePatch, validateExpenditureAmount, mapFinanceExpenditureError,
  getExpenditureAvailableActions, calculateRemainingReversible,
  getEligibleCommitmentsForBudgetItem,
  EXPENDITURE_STATUS_LABELS, EXPENDITURE_ACTION_LABELS,
  type ExpenditureRow, type ExpenditureAction, type CreateExpenditureInput,
} from '@/lib/project-management/financeExpenditures';
import {
  fetchProjectFunding, createFundingSourceDraft, updateFundingSourceDraft,
  submitFundingSource, approveFundingSource, rejectFundingSource, cancelFundingSource,
  createFundingInstallmentDraft, updateFundingInstallmentDraft,
  scheduleFundingInstallment, cancelFundingInstallment,
  createFundingReceiptDraft, updateFundingReceiptDraft,
  submitFundingReceipt, postFundingReceipt, rejectFundingReceipt, reverseFundingReceipt,
  buildPatch, getSourceAvailableActions, getInstallmentAvailableActions, getReceiptAvailableActions,
  computeInstallmentDerivedState, INSTALLMENT_DERIVED_LABELS,
  calculateReceiptAlreadyReversed, calculateReceiptRemainingReversible,
  validateFundingAmount, mapFundingError,
  SOURCE_PATCH_ALLOWED, INSTALLMENT_PATCH_ALLOWED, RECEIPT_PATCH_ALLOWED,
  FUNDING_TYPE_LABELS, FUNDING_STATUS_LABELS, INSTALLMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS, FUNDING_ACTION_LABELS,
  type FundingSourceRow, type FundingInstallmentRow, type FundingReceiptRow,
  type FundingAction, type CreateSourceInput, type CreateInstallmentInput, type CreateReceiptInput,
} from '@/lib/project-management/projectFunding';
import type { Database } from '@/integrations/supabase/database.generated';
import type { SupabaseClient } from '@supabase/supabase-js';

type RpcClient = SupabaseClient<Database, 'public'>;

interface BudgetItemInfo { id: string; name: string; planned: number; wbsItemId?: string | null; }

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  supabase: RpcClient; projectId: string;
  budgetItem: BudgetItemInfo | null; isOwner: boolean;
  hasLegacyActual: boolean; onMutated: () => void;
  commitments: CommitmentRow[]; setCommitments: (c: CommitmentRow[]) => void;
  mode?: 'project' | 'item';
  netActual?: number | null;
  plannedBudget?: number | null;
  budgetAvailable?: number | null;
}

export default function FinanceLifecyclePanel({
  open, onOpenChange, supabase, projectId, budgetItem, isOwner, hasLegacyActual,
  onMutated, commitments, setCommitments, mode = 'item', netActual, plannedBudget, budgetAvailable,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [tab, setTab] = useState(mode === 'project' ? 'funding' : 'commitments');

  // Funding state (project-level only)
  const [sources, setSources] = useState<FundingSourceRow[]>([]);
  const [installments, setInstallments] = useState<FundingInstallmentRow[]>([]);
  const [receipts, setReceipts] = useState<FundingReceiptRow[]>([]);
  const [fundingAgg, setFundingAgg] = useState<Record<string, number>>({});
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingActioning, setFundingActioning] = useState<string | null>(null);
  // Source form
  const [showSrcCreate, setShowSrcCreate] = useState(false);
  const [srcCreate, setSrcCreate] = useState<CreateSourceInput>({ lfa_project_id: '', source_name: '', agreement_amount_idr: 0 });
  const [srcEditingId, setSrcEditingId] = useState<string | null>(null);
  const [srcEdit, setSrcEdit] = useState<Partial<FundingSourceRow>>({});
  // Installment form
  const [showInstCreate, setShowInstCreate] = useState(false);
  const [instCreate, setInstCreate] = useState<CreateInstallmentInput & { sourceId?: string }>({ funding_source_id: '', installment_number: 1, scheduled_amount_idr: 0, due_date: '' });
  const [instEditingId, setInstEditingId] = useState<string | null>(null);
  const [instEdit, setInstEdit] = useState<Partial<FundingInstallmentRow>>({});
  // Receipt form
  const [showRecCreate, setShowRecCreate] = useState(false);
  const [recCreate, setRecCreate] = useState<CreateReceiptInput & { installment_id?: string | null }>({ funding_source_id: '', amount_idr: 0, receipt_date: new Date().toISOString().slice(0, 10), installment_id: null });
  const [recEditingId, setRecEditingId] = useState<string | null>(null);
  const [recEdit, setRecEdit] = useState<Partial<FundingReceiptRow>>({});
  // Reversal
  const [recReversalTarget, setRecReversalTarget] = useState<FundingReceiptRow | null>(null);
  const [recReversalAmount, setRecReversalAmount] = useState<number>(0);
  const [recReversalDesc, setRecReversalDesc] = useState('');
  // Shared confirmation
  const [fundConfirm, setFundConfirm] = useState<{ target: any; action: string; type: string } | null>(null);
  const [fundDecisionNote, setFundDecisionNote] = useState('');

  const [expenditures, setExpenditures] = useState<ExpenditureRow[]>([]);
  const [showExpCreate, setShowExpCreate] = useState(false);
  const [expCreateForm, setExpCreateForm] = useState<CreateExpenditureInput & { commitment_id?: string | null }>({ lfa_project_id: '', budget_item_id: '', amount_idr: 0, commitment_id: null });
  const [expEditingId, setExpEditingId] = useState<string | null>(null);
  const [expEditForm, setExpEditForm] = useState<Partial<ExpenditureRow>>({});
  const [reversalTarget, setReversalTarget] = useState<ExpenditureRow | null>(null);
  const [reversalAmount, setReversalAmount] = useState<number>(0);
  const [reversalDesc, setReversalDesc] = useState('');

  // Commitment forms
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCommitmentInput>({ lfa_project_id: '', budget_item_id: '', amount_idr: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CommitmentRow>>({});

  // Confirmation
  const [confirmAction, setConfirmAction] = useState<{ target: CommitmentRow | ExpenditureRow; action: CommitmentAction | ExpenditureAction; type: 'commitment' | 'expenditure' } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return; setLoading(true);
    try {
      const [rows, expRows] = await Promise.all([listProjectCommitments(supabase, projectId), listProjectExpenditures(supabase, projectId)]);
      setCommitments(rows); setExpenditures(expRows);
    } catch {} finally { setLoading(false); }
  }, [supabase, projectId]);

  useEffect(() => { if (open) { void load(); setShowCreate(false); setShowExpCreate(false); setEditingId(null); setExpEditingId(null); setShowSrcCreate(false); setShowInstCreate(false); setShowRecCreate(false); } }, [open, load]);

  // Reset tab when mode changes to avoid invalid tab state
  useEffect(() => { setTab(mode === 'project' ? 'funding' : 'commitments'); }, [mode]);

  // Load funding data for project mode
  useEffect(() => {
    if (!open || mode !== 'project' || !projectId) return;
    setFundingLoading(true);
    (async () => {
      try {
        const data = await fetchProjectFunding(supabase, projectId);
        setSources(data.sources); setInstallments(data.installments); setReceipts(data.receipts);
        const { data: agg } = await supabase.rpc('compute_project_funding_aggregates', { _lfa_project_id: projectId });
        if (agg) setFundingAgg(agg as unknown as Record<string, number>);
      } catch {} finally { setFundingLoading(false); }
    })();
  }, [open, mode, projectId, supabase]);

  const filterByItem = (row: { budget_item_id: string }) => budgetItem && row.budget_item_id === budgetItem.id;
  const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const errToast = (err: unknown) => toast({ title: String((err as any)?.message ?? err), variant: 'destructive' });

  // ── Commitment Handlers ───────────────────────────────────────────────

  const handleCreate = async () => {
    if (!budgetItem) return; const e = validateCommitmentAmount(createForm.amount_idr); if (e) { toast({ title: e, variant: 'destructive' }); return; }
    setActioning('create');
    try { await createCommitmentDraft(supabase, { lfa_project_id: projectId, budget_item_id: budgetItem.id, amount_idr: createForm.amount_idr, description: createForm.description, counterparty_name: createForm.counterparty_name, reference_number: createForm.reference_number, expected_realization_date: createForm.expected_realization_date, evidence_url: createForm.evidence_url }); toast({ title: 'Komitmen draft dibuat' }); setShowCreate(false); setCreateForm({ lfa_project_id: '', budget_item_id: '', amount_idr: 0 }); void load(); onMutated(); } catch (e: any) { toast({ title: mapFinanceCommitmentError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  const handleUpdate = async () => {
    if (!editingId) return; const o = commitments.find(c => c.id === editingId); if (!o) return; const p = buildCommitmentPatch(o, editForm); if (!p) { setEditingId(null); return; }
    if (p.amount_idr !== undefined) { const e = validateCommitmentAmount(p.amount_idr); if (e) { toast({ title: e, variant: 'destructive' }); return; } }
    setActioning(editingId);
    try { await updateCommitmentDraft(supabase, editingId, p); toast({ title: 'Komitmen diperbarui' }); setEditingId(null); void load(); onMutated(); } catch (e: any) { toast({ title: mapFinanceCommitmentError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  // ── Expenditure Handlers ──────────────────────────────────────────────

  const eligibleCommitments = budgetItem ? getEligibleCommitmentsForBudgetItem(commitments as any[], budgetItem.id) : [];

  const handleExpCreate = async () => {
    if (!budgetItem) return; const e = validateExpenditureAmount(expCreateForm.amount_idr); if (e) { toast({ title: e, variant: 'destructive' }); return; }
    setActioning('expCreate');
    try { await createExpenditureDraft(supabase, { lfa_project_id: projectId, budget_item_id: budgetItem.id, amount_idr: expCreateForm.amount_idr, commitment_id: expCreateForm.commitment_id ?? null, description: expCreateForm.description, transaction_date: expCreateForm.transaction_date, reference_number: expCreateForm.reference_number, evidence_url: expCreateForm.evidence_url }); toast({ title: 'Realisasi draft dibuat' }); setShowExpCreate(false); setExpCreateForm({ lfa_project_id: '', budget_item_id: '', amount_idr: 0, commitment_id: null }); void load(); onMutated(); } catch (e: any) { toast({ title: mapFinanceExpenditureError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  const handleExpUpdate = async () => {
    if (!expEditingId) return; const o = expenditures.find(x => x.id === expEditingId); if (!o) return; const p = buildExpenditurePatch(o, expEditForm); if (!p) { setExpEditingId(null); return; }
    if (p.amount_idr !== undefined) { const e = validateExpenditureAmount(p.amount_idr); if (e) { toast({ title: e, variant: 'destructive' }); return; } }
    setActioning(expEditingId);
    try { await updateExpenditureDraft(supabase, expEditingId, p); toast({ title: 'Realisasi diperbarui' }); setExpEditingId(null); void load(); onMutated(); } catch (e: any) { toast({ title: mapFinanceExpenditureError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  const handleReversal = async () => {
    if (!reversalTarget) return; const e = validateExpenditureAmount(reversalAmount); if (e) { toast({ title: e, variant: 'destructive' }); return; }
    const remaining = calculateRemainingReversible(expenditures, reversalTarget);
    if (reversalAmount > remaining) { toast({ title: `Nilai pembalikan maksimal Rp ${remaining.toLocaleString('id-ID')}`, variant: 'destructive' }); return; }
    setActioning(reversalTarget.id);
    try { await reverseExpenditure(supabase, reversalTarget.id, reversalAmount, reversalDesc || undefined); toast({ title: 'Pembalikan berhasil dibuat' }); setReversalTarget(null); setReversalAmount(0); setReversalDesc(''); void load(); onMutated(); } catch (e: any) { toast({ title: mapFinanceExpenditureError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  // ── Shared Lifecycle ──────────────────────────────────────────────────

  const triggerAction = (target: CommitmentRow | ExpenditureRow, action: CommitmentAction | ExpenditureAction, type: 'commitment' | 'expenditure') => {
    setDecisionNote(''); setConfirmAction({ target, action, type });
  };

  const executeAction = async () => {
    if (!confirmAction) return; const { target, action, type } = confirmAction; setActioning(target.id);
    try {
      if (type === 'commitment') {
        const c = target as CommitmentRow;
        if (action === 'submit') await submitCommitment(supabase, c.id);
        else if (action === 'approve') await approveCommitment(supabase, c.id, decisionNote || undefined);
        else if (action === 'reject') { if (!decisionNote.trim()) { toast({ title: 'Alasan penolakan wajib diisi.', variant: 'destructive' }); setActioning(null); return; } await rejectCommitment(supabase, c.id, decisionNote); }
        else if (action === 'cancel') { if (!decisionNote.trim()) { toast({ title: 'Alasan pembatalan wajib diisi.', variant: 'destructive' }); setActioning(null); return; } await cancelCommitment(supabase, c.id, decisionNote); }
      } else {
        const x = target as ExpenditureRow;
        if (action === 'submit') await submitExpenditure(supabase, x.id);
        else if (action === 'post') await postExpenditure(supabase, x.id, decisionNote || undefined);
        else if (action === 'reject') { if (!decisionNote.trim()) { toast({ title: 'Alasan penolakan wajib diisi.', variant: 'destructive' }); setActioning(null); return; } await rejectExpenditure(supabase, x.id, decisionNote); }
      }
      toast({ title: `${type === 'commitment' ? 'Komitmen' : 'Realisasi'} berhasil ${(COMMITMENT_ACTION_LABELS as any)[action] || (EXPENDITURE_ACTION_LABELS as any)[action] || action}` });
      setConfirmAction(null); setDecisionNote(''); void load(); onMutated();
    } catch (e: any) { toast({ title: type === 'commitment' ? mapFinanceCommitmentError(e) : mapFinanceExpenditureError(e), variant: 'destructive' }); } finally { setActioning(null); }
  };

  const filteredC = commitments.filter(filterByItem);
  const filteredE = expenditures.filter(filterByItem);
  const isReversal = (x: ExpenditureRow) => x.reversal_of_id != null;

  const statusBadge = (s: string) => {
    const b = 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded';
    if (s === 'draft') return `${b} bg-slate-100 text-slate-600`;
    if (s === 'submitted') return `${b} bg-blue-100 text-blue-700`;
    if (s === 'approved' || s === 'posted') return `${b} bg-emerald-100 text-emerald-700`;
    if (s === 'rejected') return `${b} bg-red-100 text-red-700`;
    if (s === 'cancelled') return `${b} bg-slate-200 text-slate-500`;
    return b;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{mode === 'project' ? 'Keuangan Project' : 'Keuangan Item Anggaran'}</SheetTitle>
            <SheetDescription className="text-xs">
              {mode === 'project'
                ? 'Kelola sumber pendanaan, jadwal termin, dan penerimaan dana project.'
                : budgetItem ? <span>Budget: <strong>{budgetItem.name}</strong> · Plafon: {budgetItem.planned > 0 ? formatIDR(budgetItem.planned) : '—'}</span> : 'Pilih item anggaran untuk melihat detail.'}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="mt-3">
            <TabsList className="w-full">
              {mode === 'project' && <TabsTrigger value="funding" className="flex-1 text-xs">Pendanaan</TabsTrigger>}
              {mode === 'project' && <TabsTrigger value="installments" className="flex-1 text-xs">Termin</TabsTrigger>}
              {mode === 'project' && <TabsTrigger value="receipts" className="flex-1 text-xs">Penerimaan</TabsTrigger>}
              {mode !== 'project' && <TabsTrigger value="commitments" className="flex-1 text-xs">Komitmen</TabsTrigger>}
              {mode !== 'project' && <TabsTrigger value="expenditures" className="flex-1 text-xs">Realisasi</TabsTrigger>}
            </TabsList>

            {/* ── KOMITMEN TAB ──────────────────────────────────────── */}
            {mode !== 'project' && (
              <TabsContent value="commitments" className="mt-3 space-y-3">
              {isOwner && hasLegacyActual && filteredC.length === 0 && (
                <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>Item ini memiliki realisasi lama tanpa riwayat transaksi. Komitmen baru tidak menjumlahkan nilai lama secara otomatis.</span>
                </div>
              )}
              {isOwner && !showCreate && <Button size="sm" className="h-8 text-xs w-full" onClick={() => { setShowCreate(true); setCreateForm({ lfa_project_id: projectId, budget_item_id: budgetItem?.id ?? '', amount_idr: 0 }); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Komitmen</Button>}
              {!isOwner && <p className="text-[10px] text-muted-foreground italic text-center py-2">Hanya pemilik organisasi yang dapat mengelola komitmen.</p>}

              {showCreate && (
                <div className="rounded border p-3 space-y-2">
                  <div className="text-xs font-semibold">Komitmen Baru</div>
                  <div><Label className="text-[10px]">Nilai Komitmen (IDR) *</Label><Input type="number" min={0} value={createForm.amount_idr || ''} onChange={e => setCreateForm(p => ({ ...p, amount_idr: e.target.value === '' ? 0 : Number(e.target.value) }))} className="h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Deskripsi</Label><Input value={createForm.description ?? ''} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs" /></div>
                  <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Pihak / Vendor</Label><Input value={createForm.counterparty_name ?? ''} onChange={e => setCreateForm(p => ({ ...p, counterparty_name: e.target.value }))} className="h-8 text-xs" /></div><div><Label className="text-[10px]">Nomor Referensi</Label><Input value={createForm.reference_number ?? ''} onChange={e => setCreateForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-xs" /></div></div>
                  <div><Label className="text-[10px]">Perkiraan Tanggal Realisasi</Label><Input type="date" value={createForm.expected_realization_date ?? ''} onChange={e => setCreateForm(p => ({ ...p, expected_realization_date: e.target.value }))} className="h-8 text-xs" /></div>
                  <div className="flex gap-2 pt-1"><Button size="sm" className="h-7 text-[10px]" onClick={handleCreate} disabled={actioning === 'create'}>{actioning === 'create' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Simpan</Button><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowCreate(false)}><X className="mr-1 h-3 w-3" />Batal</Button></div>
                </div>
              )}

              {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {!loading && filteredC.length === 0 && !showCreate && <div className="text-center py-8 text-xs text-muted-foreground italic">Belum ada komitmen untuk item anggaran ini.</div>}

              {!loading && filteredC.map(c => (
                <div key={c.id} className="rounded border">
                  {editingId === c.id ? (
                    <div className="p-3 space-y-2"><div className="text-xs font-semibold">Edit Komitmen</div>
                      <div><Label className="text-[10px]">Nilai Komitmen</Label><Input type="number" min={0} value={editForm.amount_idr ?? c.amount_idr} onChange={e => setEditForm(p => ({ ...p, amount_idr: e.target.value === '' ? undefined : Number(e.target.value) }))} className="h-8 text-xs" /></div>
                      <div><Label className="text-[10px]">Deskripsi</Label><Input value={editForm.description ?? c.description ?? ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs" /></div>
                      <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Pihak / Vendor</Label><Input value={editForm.counterparty_name ?? c.counterparty_name ?? ''} onChange={e => setEditForm(p => ({ ...p, counterparty_name: e.target.value }))} className="h-8 text-xs" /></div><div><Label className="text-[10px]">Nomor Referensi</Label><Input value={editForm.reference_number ?? c.reference_number ?? ''} onChange={e => setEditForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-xs" /></div></div>
                      <div><Label className="text-[10px]">Perkiraan Tanggal Realisasi</Label><Input type="date" value={editForm.expected_realization_date ?? (c.expected_realization_date ?? '')} onChange={e => setEditForm(p => ({ ...p, expected_realization_date: e.target.value || null }))} className="h-8 text-xs" /></div>
                      <div className="flex gap-2 pt-1"><Button size="sm" className="h-7 text-[10px]" onClick={handleUpdate} disabled={actioning === c.id}>{actioning === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Simpan</Button><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setEditingId(null)}><X className="mr-1 h-3 w-3" />Batal</Button></div>
                    </div>
                  ) : (
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-bold">{formatIDR(c.amount_idr)}</span><span className={statusBadge(c.workflow_status)}>{COMMITMENT_STATUS_LABELS[c.workflow_status] || c.workflow_status}</span></div>{c.description && <div className="text-[10px] text-muted-foreground mt-1">{c.description}</div>}<div className="text-[9px] text-muted-foreground mt-1 flex gap-3 flex-wrap">{c.counterparty_name && <span>{c.counterparty_name}</span>}{c.reference_number && <span>#{c.reference_number}</span>}{c.expected_realization_date && <span>Tgl target: {fmtDate(c.expected_realization_date)}</span>}</div></div>{isOwner && <div className="flex items-center gap-1 shrink-0">{getCommitmentAvailableActions(c.workflow_status).map(a => <Button key={a} variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" disabled={actioning === c.id} onClick={() => a === 'edit' ? (setEditingId(c.id), setEditForm({ ...c })) : triggerAction(c, a, 'commitment')}>{actioning === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}{COMMITMENT_ACTION_LABELS[a]}</Button>)}</div>}</div>{c.decision_note && <div className="mt-1.5 text-[9px] text-slate-500 border-t pt-1.5">Catatan: {c.decision_note}</div>}<div className="text-[8px] text-muted-foreground mt-1.5">Dibuat {fmtDate(c.created_at)}{c.submitted_at && ` · Diajukan ${fmtDate(c.submitted_at)}`}{c.approved_at && ` · Disetujui ${fmtDate(c.approved_at)}`}</div></div>
                  )}
                </div>
              ))}
            </TabsContent>
              )}

            {/* ── REALISASI TAB ────────────────────────────────────── */}
            {mode !== 'project' && (
            <TabsContent value="expenditures" className="mt-3 space-y-3">
              {isOwner && !showExpCreate && !reversalTarget && (
                <Button size="sm" className="h-8 text-xs w-full" onClick={() => { setShowExpCreate(true); setExpCreateForm({ lfa_project_id: projectId, budget_item_id: budgetItem?.id ?? '', amount_idr: 0, commitment_id: null }); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Realisasi</Button>
              )}
              {!isOwner && <p className="text-[10px] text-muted-foreground italic text-center py-2">Hanya pemilik organisasi yang dapat mengelola realisasi keuangan.</p>}

              {showExpCreate && (
                <div className="rounded border p-3 space-y-2">
                  <div className="text-xs font-semibold">Realisasi Baru</div>
                  <div><Label className="text-[10px]">Nilai Realisasi (IDR) *</Label><Input type="number" min={0} value={expCreateForm.amount_idr || ''} onChange={e => setExpCreateForm(p => ({ ...p, amount_idr: e.target.value === '' ? 0 : Number(e.target.value) }))} className="h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Komitmen Terkait</Label><Select value={expCreateForm.commitment_id ?? 'none'} onValueChange={v => setExpCreateForm(p => ({ ...p, commitment_id: v === 'none' ? null : v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tanpa komitmen" /></SelectTrigger><SelectContent>{eligibleCommitments.map(c => <SelectItem key={c.id} value={c.id}>{c.id.slice(0, 8)} — Rp {c.amount_idr.toLocaleString('id-ID')}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-[10px]">Deskripsi</Label><Input value={expCreateForm.description ?? ''} onChange={e => setExpCreateForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs" /></div>
                  <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Tanggal Transaksi</Label><Input type="date" value={expCreateForm.transaction_date ?? ''} onChange={e => setExpCreateForm(p => ({ ...p, transaction_date: e.target.value }))} className="h-8 text-xs" /></div><div><Label className="text-[10px]">Nomor Referensi</Label><Input value={expCreateForm.reference_number ?? ''} onChange={e => setExpCreateForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-xs" /></div></div>
                  <div className="flex gap-2 pt-1"><Button size="sm" className="h-7 text-[10px]" onClick={handleExpCreate} disabled={actioning === 'expCreate'}>{actioning === 'expCreate' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Simpan</Button><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowExpCreate(false)}><X className="mr-1 h-3 w-3" />Batal</Button></div>
                </div>
              )}

              {reversalTarget && (
                <div className="rounded border border-amber-300 p-3 space-y-2 bg-amber-50/30">
                  <div className="text-xs font-semibold flex items-center gap-1"><Undo2 className="h-3 w-3" />Pembalikan</div>
                  <div className="text-[10px] text-muted-foreground">Transaksi: {formatIDR(reversalTarget.amount_idr)} · Sisa: {formatIDR(calculateRemainingReversible(expenditures, reversalTarget))}</div>
                  <div><Label className="text-[10px]">Nilai Pembalikan *</Label><Input type="number" min={0} value={reversalAmount || ''} onChange={e => setReversalAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Deskripsi</Label><Input value={reversalDesc} onChange={e => setReversalDesc(e.target.value)} className="h-8 text-xs" /></div>
                  <div className="flex gap-2 pt-1"><Button size="sm" className="h-7 text-[10px]" onClick={handleReversal} disabled={actioning === reversalTarget.id}>{actioning === reversalTarget.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Undo2 className="mr-1 h-3 w-3" />}Simpan Pembalikan</Button><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setReversalTarget(null); setReversalAmount(0); setReversalDesc(''); }}><X className="mr-1 h-3 w-3" />Batal</Button></div>
                </div>
              )}

              {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {!loading && filteredE.length === 0 && !showExpCreate && !reversalTarget && <div className="text-center py-8 text-xs text-muted-foreground italic">Belum ada realisasi untuk item anggaran ini.</div>}

              {!loading && filteredE.map(x => {
                const rev = isReversal(x);
                const remaining = calculateRemainingReversible(expenditures, x);
                return (
                  <div key={x.id} className={`rounded border ${rev ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200' : ''}`}>
                    {expEditingId === x.id ? (
                      <div className="p-3 space-y-2"><div className="text-xs font-semibold">Edit Realisasi</div>
                        <div><Label className="text-[10px]">Nilai Realisasi</Label><Input type="number" min={0} value={expEditForm.amount_idr ?? x.amount_idr} onChange={e => setExpEditForm(p => ({ ...p, amount_idr: e.target.value === '' ? undefined : Number(e.target.value) }))} className="h-8 text-xs" /></div>
                        <div><Label className="text-[10px]">Deskripsi</Label><Input value={expEditForm.description ?? x.description ?? ''} onChange={e => setExpEditForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs" /></div>
                        <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Tanggal Transaksi</Label><Input type="date" value={expEditForm.transaction_date ?? (x.transaction_date ?? '')} onChange={e => setExpEditForm(p => ({ ...p, transaction_date: e.target.value || null }))} className="h-8 text-xs" /></div><div><Label className="text-[10px]">Nomor Referensi</Label><Input value={expEditForm.reference_number ?? x.reference_number ?? ''} onChange={e => setExpEditForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-xs" /></div></div>
                        <div className="flex gap-2 pt-1"><Button size="sm" className="h-7 text-[10px]" onClick={handleExpUpdate} disabled={actioning === x.id}>{actioning === x.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Simpan</Button><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setExpEditingId(null)}><X className="mr-1 h-3 w-3" />Batal</Button></div>
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold ${rev ? 'text-red-600 line-through' : ''}`}>{rev ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold mr-1">Pembalikan</span> : null}{formatIDR(x.amount_idr)}</span><span className={statusBadge(x.workflow_status)}>{EXPENDITURE_STATUS_LABELS[x.workflow_status] || x.workflow_status}</span></div>{x.description && <div className="text-[10px] text-muted-foreground mt-1">{x.description}</div>}<div className="text-[9px] text-muted-foreground mt-1 flex gap-3 flex-wrap">{x.reference_number && <span>#{x.reference_number}</span>}{x.transaction_date && <span>{fmtDate(x.transaction_date)}</span>}{x.commitment_id && <span className="text-blue-600">Komitmen: {x.commitment_id.slice(0, 8)}</span>}</div></div>{isOwner && !rev && <div className="flex items-center gap-1 shrink-0">{getExpenditureAvailableActions(x.workflow_status, rev).map(a => <Button key={a} variant="ghost" size="sm" className={`h-6 text-[10px] px-1.5 ${a === 'reverse' ? 'text-amber-600' : ''}`} disabled={actioning === x.id} onClick={() => a === 'edit' ? (setExpEditingId(x.id), setExpEditForm({ ...x })) : a === 'reverse' ? (setReversalTarget(x), setReversalAmount(0), setReversalDesc('')) : triggerAction(x, a, 'expenditure')}>{actioning === x.id ? <Loader2 className="h-3 w-3 animate-spin" /> : a === 'reverse' ? <><Undo2 className="h-3 w-3 mr-1" />{EXPENDITURE_ACTION_LABELS[a]}</> : EXPENDITURE_ACTION_LABELS[a]}</Button>)}</div>}</div>{x.decision_note && <div className="mt-1.5 text-[9px] text-slate-500 border-t pt-1.5">Catatan: {x.decision_note}</div>}<div className="text-[8px] text-muted-foreground mt-1.5">Dibuat {fmtDate(x.created_at)}{x.posted_at && ` · Dibukukan ${fmtDate(x.posted_at)}`}{x.reversal_of_id && <span className="text-amber-600"> · Membalikkan {x.reversal_of_id.slice(0, 8)}</span>}</div>{rev && <div className="text-[9px] text-muted-foreground mt-0.5 italic">Mengurangi net realisasi</div>}</div>
                    )}
                  </div>
                );
              })}
            </TabsContent>
              )}

            {/* ── PENDANAAN TAB ─────────────────────────────────────── */}
            {mode === 'project' && (
              <TabsContent value="funding" className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-900 rounded p-3">
                  <div><span className="text-muted-foreground">Total Pendanaan</span><div className="font-bold">{formatIDR(fundingAgg.total_funding_agreement ?? 0)}</div></div>
                  <div><span className="text-muted-foreground">Kas Diterima</span><div className="font-bold">{formatIDR(fundingAgg.net_received_cash ?? 0)}</div></div>
                  <div><span className="text-muted-foreground">Belum Dialokasikan</span><div className="font-bold">{formatIDR(fundingAgg.unallocated_received ?? 0)}</div></div>
                  <div><span className="text-muted-foreground">Piutang Termin</span><div className="font-bold">{formatIDR(fundingAgg.total_outstanding_receivable ?? 0)}</div></div>
                </div>
                {fundingLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
                {!fundingLoading && isOwner && !showSrcCreate && (
                  <Button size="sm" className="h-8 text-xs w-full" onClick={() => { setShowSrcCreate(true); setSrcCreate({ lfa_project_id: projectId, source_name: '', agreement_amount_idr: 0 }); }}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Pendanaan</Button>)}
                {!isOwner && <p className="text-[10px] text-muted-foreground italic text-center py-2">Hanya pemilik organisasi yang dapat mengelola pendanaan project.</p>}
                {!fundingLoading && sources.map(src => (
                  <div key={src.id} className="rounded border p-3">
                    <div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-bold">{formatIDR(src.agreement_amount_idr)}</span><span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{FUNDING_STATUS_LABELS[src.workflow_status] || src.workflow_status}</span></div><div className="text-xs font-medium mt-1">{src.source_name}</div><div className="text-[9px] text-muted-foreground">{FUNDING_TYPE_LABELS[src.funding_type] || src.funding_type}{src.agreement_number ? ` · ${src.agreement_number}` : ''}</div></div>{isOwner && <div className="flex gap-1 shrink-0">{getSourceAvailableActions(src.workflow_status).map(a => <Button key={a} variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" disabled={!!fundingActioning} onClick={() => { setFundDecisionNote(''); setFundConfirm({ target: src, action: a, type: 'source' }); }}>{FUNDING_ACTION_LABELS[a] || a}</Button>)}</div>}</div>
                  </div>
                ))}
              </TabsContent>
            )}

            {/* ── TERMIN TAB ─────────────────────────────────────────── */}
            {mode === 'project' && (
              <TabsContent value="installments" className="mt-3 space-y-3">
                {!fundingLoading && installments.map(inst => {
                  const derived = computeInstallmentDerivedState(inst, receipts);
                  const srcName = sources.find(s => s.id === inst.funding_source_id)?.source_name || inst.funding_source_id.slice(0, 8);
                  return <div key={inst.id} className="rounded border p-3">
                    <div><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-bold">{formatIDR(inst.scheduled_amount_idr)}</span><span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{INSTALLMENT_STATUS_LABELS[inst.workflow_status] || inst.workflow_status}</span><span className="text-[9px] text-amber-600">{INSTALLMENT_DERIVED_LABELS[derived] || derived}</span></div><div className="text-xs font-medium">{inst.installment_name || `Termin #${inst.installment_number}`}</div><div className="text-[9px] text-muted-foreground">{srcName} · Jatuh tempo: {fmtDate(inst.due_date)}</div></div>
                  </div>;
                })}
              </TabsContent>
            )}

            {/* ── PENERIMAAN TAB ─────────────────────────────────────── */}
            {mode === 'project' && (
              <TabsContent value="receipts" className="mt-3 space-y-3">
                {!fundingLoading && receipts.map(rec => {
                  const isRev = rec.reversal_of_id != null;
                  const srcName = sources.find(s => s.id === rec.funding_source_id)?.source_name || rec.funding_source_id.slice(0, 8);
                  return <div key={rec.id} className={`rounded border p-3 ${isRev ? 'bg-red-50/20 border-red-200' : ''}`}>
                    <div><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold ${isRev ? 'text-red-600' : ''}`}>{isRev && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold mr-1">Pembalikan</span>}{formatIDR(rec.amount_idr)}</span><span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{RECEIPT_STATUS_LABELS[rec.workflow_status] || rec.workflow_status}</span></div><div className="text-[9px] text-muted-foreground mt-1">{srcName} · {fmtDate(rec.receipt_date)}{rec.installment_id ? ` · Termin ${rec.installment_id.slice(0, 8)}` : ' · Tanpa Termin'}</div>{isRev && <div className="text-[9px] text-muted-foreground mt-0.5 italic">Mengurangi penerimaan</div>}</div>
                  </div>;
                })}
              </TabsContent>
            )}

          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => { if (!actioning) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? `${(COMMITMENT_ACTION_LABELS as any)[confirmAction.action] || (EXPENDITURE_ACTION_LABELS as any)[confirmAction.action] || confirmAction.action} ${confirmAction.type === 'commitment' ? 'Komitmen' : 'Realisasi'}` : ''}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmAction?.action === 'submit' && 'Ajukan untuk diproses? Setelah diajukan, data draft tidak dapat diedit.'}
              {confirmAction?.action === 'approve' && 'Setujui komitmen ini? Nilai yang disetujui akan masuk perhitungan komitmen outstanding.'}
              {confirmAction?.action === 'reject' && confirmAction?.type === 'commitment' && 'Tolak komitmen ini?'}
              {confirmAction?.action === 'reject' && confirmAction?.type === 'expenditure' && 'Tolak realisasi ini?'}
              {confirmAction?.action === 'cancel' && 'Batalkan komitmen ini? Komitmen dengan realisasi dibukukan dapat ditolak sistem.'}
              {confirmAction?.action === 'post' && 'Bukukan realisasi ini? Transaksi yang dibukukan tidak dapat diedit. Koreksi melalui pembalikan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(confirmAction?.action === 'reject' || confirmAction?.action === 'cancel') && (
            <div className="space-y-1"><Label className="text-xs">Alasan (wajib)</Label><Textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Tulis alasan..." className="text-xs h-16" /></div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actioning}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={!!actioning} className={confirmAction?.action === 'reject' || confirmAction?.action === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}>{actioning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}{confirmAction ? (COMMITMENT_ACTION_LABELS as any)[confirmAction.action] || (EXPENDITURE_ACTION_LABELS as any)[confirmAction.action] || '' : ''}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
