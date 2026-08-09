import { useState, useCallback, useEffect } from 'react';
import { Plus, Edit3, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useToast } from '@/hooks/use-toast';
import {
  listProjectCommitments,
  createCommitmentDraft,
  updateCommitmentDraft,
  submitCommitment,
  approveCommitment,
  rejectCommitment,
  cancelCommitment,
  buildCommitmentPatch,
  validateCommitmentAmount,
  mapFinanceCommitmentError,
  getCommitmentAvailableActions,
  COMMITMENT_STATUS_LABELS,
  COMMITMENT_ACTION_LABELS,
  type CommitmentRow,
  type CommitmentAction,
  type CreateCommitmentInput,
} from '@/lib/project-management/financeCommitments';
import type { SupabaseClient } from '@supabase/supabase-js';

interface BudgetItemInfo {
  id: string;
  name: string;
  planned: number;
  wbsItemId?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseClient<any, 'public', any>;
  projectId: string;
  budgetItem: BudgetItemInfo | null;
  isOwner: boolean;
  hasLegacyActual: boolean;
  onMutated: () => void;
}

export default function FinanceCommitmentPanel({
  open,
  onOpenChange,
  supabase,
  projectId,
  budgetItem,
  isOwner,
  hasLegacyActual,
  onMutated,
}: Props) {
  const { toast } = useToast();

  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCommitmentInput>({
    lfa_project_id: '',
    budget_item_id: '',
    amount_idr: 0,
  });

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CommitmentRow>>({});

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<{
    commitment: CommitmentRow;
    action: CommitmentAction;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const rows = await listProjectCommitments(supabase, projectId);
      setCommitments(rows);
    } catch {
      // RLS may block — handled silently
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    if (open) {
      void load();
      setShowCreate(false);
      setEditingId(null);
    }
  }, [open, load]);

  // ── Create ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!budgetItem) return;
    const err = validateCommitmentAmount(createForm.amount_idr);
    if (err) { toast({ title: err, variant: 'destructive' }); return; }

    setActioning('create');
    try {
      await createCommitmentDraft(supabase, {
        lfa_project_id: projectId,
        budget_item_id: budgetItem.id,
        amount_idr: createForm.amount_idr,
        description: createForm.description,
        counterparty_name: createForm.counterparty_name,
        reference_number: createForm.reference_number,
        expected_realization_date: createForm.expected_realization_date,
        evidence_url: createForm.evidence_url,
      });
      toast({ title: 'Komitmen draft dibuat' });
      setShowCreate(false);
      setCreateForm({ lfa_project_id: '', budget_item_id: '', amount_idr: 0 });
      void load();
      onMutated();
    } catch (err: any) {
      toast({ title: mapFinanceCommitmentError(err), variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editingId) return;
    const original = commitments.find((c) => c.id === editingId);
    if (!original) return;
    const patch = buildCommitmentPatch(original, editForm);
    if (!patch) { setEditingId(null); return; }

    if (patch.amount_idr !== undefined) {
      const err = validateCommitmentAmount(patch.amount_idr);
      if (err) { toast({ title: err, variant: 'destructive' }); return; }
    }

    setActioning(editingId);
    try {
      await updateCommitmentDraft(supabase, editingId, patch);
      toast({ title: 'Komitmen diperbarui' });
      setEditingId(null);
      void load();
      onMutated();
    } catch (err: any) {
      toast({ title: mapFinanceCommitmentError(err), variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  };

  // ── Lifecycle Actions ─────────────────────────────────────────────────

  const triggerAction = async (commitment: CommitmentRow, action: CommitmentAction) => {
    if (action === 'reject' || action === 'cancel') {
      setDecisionNote('');
      setConfirmAction({ commitment, action });
    } else {
      setConfirmAction({ commitment, action });
    }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    const { commitment, action } = confirmAction;

    setActioning(commitment.id);
    try {
      switch (action) {
        case 'submit':
          await submitCommitment(supabase, commitment.id);
          break;
        case 'approve':
          await approveCommitment(supabase, commitment.id, decisionNote || undefined);
          break;
        case 'reject':
          if (!decisionNote.trim()) {
            toast({ title: 'Alasan penolakan wajib diisi.', variant: 'destructive' });
            setActioning(null);
            return;
          }
          await rejectCommitment(supabase, commitment.id, decisionNote);
          break;
        case 'cancel':
          if (!decisionNote.trim()) {
            toast({ title: 'Alasan pembatalan wajib diisi.', variant: 'destructive' });
            setActioning(null);
            return;
          }
          await cancelCommitment(supabase, commitment.id, decisionNote);
          break;
      }
      toast({ title: `Komitmen ${COMMITMENT_ACTION_LABELS[action].toLowerCase()}` });
      setConfirmAction(null);
      setDecisionNote('');
      void load();
      onMutated();
    } catch (err: any) {
      toast({ title: mapFinanceCommitmentError(err), variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const filterByItem = (row: CommitmentRow) =>
    budgetItem && row.budget_item_id === budgetItem.id;

  const filtered = commitments.filter(filterByItem);
  const actions = (status: string) => getCommitmentAvailableActions(status);

  const statusBadge = (status: string) => {
    const base = 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded';
    switch (status) {
      case 'draft': return `${base} bg-slate-100 text-slate-600`;
      case 'submitted': return `${base} bg-blue-100 text-blue-700`;
      case 'approved': return `${base} bg-emerald-100 text-emerald-700`;
      case 'rejected': return `${base} bg-red-100 text-red-700`;
      case 'cancelled': return `${base} bg-slate-200 text-slate-500`;
      default: return base;
    }
  };

  const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Kelola Keuangan</SheetTitle>
            <SheetDescription className="text-xs">
              {budgetItem ? (
                <span>
                  Budget: <strong>{budgetItem.name}</strong> · Plafon: {budgetItem.planned > 0 ? formatIDR(budgetItem.planned) : '—'}
                </span>
              ) : 'Pilih item anggaran untuk melihat detail.'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Legacy warning */}
            {isOwner && hasLegacyActual && filtered.length === 0 && (
              <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Item ini memiliki realisasi lama tanpa riwayat transaksi. Komitmen baru akan menggunakan ledger Finance dan tidak menjumlahkan nilai lama secara otomatis.
                </span>
              </div>
            )}

            {/* Owner CTA */}
            {isOwner && !showCreate && (
              <Button
                size="sm"
                className="h-8 text-xs w-full"
                onClick={() => {
                  setShowCreate(true);
                  setCreateForm({
                    lfa_project_id: projectId,
                    budget_item_id: budgetItem?.id ?? '',
                    amount_idr: 0,
                  });
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Komitmen
              </Button>
            )}

            {/* Member caption */}
            {!isOwner && (
              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                Hanya pemilik organisasi yang dapat mengelola komitmen.
              </p>
            )}

            {/* Create form */}
            {showCreate && (
              <div className="rounded border p-3 space-y-2 bg-white dark:bg-slate-950">
                <div className="text-xs font-semibold">Komitmen Baru</div>
                <div>
                  <Label className="text-[10px]">Nilai Komitmen (IDR) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={createForm.amount_idr || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, amount_idr: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Deskripsi</Label>
                  <Input
                    value={createForm.description ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Pihak / Vendor</Label>
                    <Input
                      value={createForm.counterparty_name ?? ''}
                      onChange={(e) => setCreateForm((p) => ({ ...p, counterparty_name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Nomor Referensi</Label>
                    <Input
                      value={createForm.reference_number ?? ''}
                      onChange={(e) => setCreateForm((p) => ({ ...p, reference_number: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Perkiraan Tanggal Realisasi</Label>
                  <Input
                    type="date"
                    value={createForm.expected_realization_date ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, expected_realization_date: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-[10px]" onClick={handleCreate} disabled={actioning === 'create'}>
                    {actioning === 'create' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                    Simpan
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowCreate(false)}>
                    <X className="mr-1 h-3 w-3" /> Batal
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && !showCreate && (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                Belum ada komitmen untuk item anggaran ini.
              </div>
            )}

            {/* Commitment list */}
            {!loading && filtered.map((c) => (
              <div key={c.id} className="rounded border bg-white dark:bg-slate-950">
                {editingId === c.id ? (
                  <div className="p-3 space-y-2">
                    <div className="text-xs font-semibold">Edit Komitmen</div>
                    <div>
                      <Label className="text-[10px]">Nilai Komitmen (IDR)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.amount_idr ?? c.amount_idr}
                        onChange={(e) => setEditForm((p) => ({ ...p, amount_idr: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Deskripsi</Label>
                      <Input
                        value={editForm.description ?? c.description ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Pihak / Vendor</Label>
                        <Input
                          value={editForm.counterparty_name ?? c.counterparty_name ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, counterparty_name: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Nomor Referensi</Label>
                        <Input
                          value={editForm.reference_number ?? c.reference_number ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, reference_number: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px]">Perkiraan Tanggal Realisasi</Label>
                      <Input
                        type="date"
                        value={editForm.expected_realization_date ?? c.expected_realization_date ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, expected_realization_date: e.target.value || null }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-[10px]" onClick={handleUpdate} disabled={actioning === c.id}>
                        {actioning === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                        Simpan
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-3 w-3" /> Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold">{formatIDR(c.amount_idr)}</span>
                          <span className={statusBadge(c.workflow_status)}>
                            {COMMITMENT_STATUS_LABELS[c.workflow_status] || c.workflow_status}
                          </span>
                        </div>
                        {c.description && (
                          <div className="text-[10px] text-muted-foreground mt-1">{c.description}</div>
                        )}
                        <div className="text-[9px] text-muted-foreground mt-1 flex gap-3 flex-wrap">
                          {c.counterparty_name && <span>{c.counterparty_name}</span>}
                          {c.reference_number && <span>#{c.reference_number}</span>}
                          {c.expected_realization_date && <span>Tgl target: {fmtDate(c.expected_realization_date)}</span>}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1 shrink-0">
                          {actions(c.workflow_status).map((action) => (
                            <Button
                              key={action}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1.5"
                              disabled={actioning === c.id}
                              onClick={() => {
                                if (action === 'edit') {
                                  setEditingId(c.id);
                                  setEditForm({ ...c });
                                } else {
                                  triggerAction(c, action);
                                }
                              }}
                            >
                              {actioning === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              {COMMITMENT_ACTION_LABELS[action]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    {c.decision_note && (
                      <div className="mt-1.5 text-[9px] text-slate-500 border-t pt-1.5">
                        Catatan: {c.decision_note}
                      </div>
                    )}
                    <div className="text-[8px] text-muted-foreground mt-1.5">
                      Dibuat {fmtDate(c.created_at)}
                      {c.submitted_at && ` · Diajukan ${fmtDate(c.submitted_at)}`}
                      {c.approved_at && ` · Disetujui ${fmtDate(c.approved_at)}`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => { if (!actioning) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction
                ? `${COMMITMENT_ACTION_LABELS[confirmAction.action]} Komitmen`
                : ''}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmAction?.action === 'submit' && 'Ajukan komitmen ini untuk diproses?'}
              {confirmAction?.action === 'approve' && 'Setujui komitmen ini? Nilai komitmen yang telah disetujui akan masuk ke perhitungan komitmen outstanding.'}
              {confirmAction?.action === 'reject' && 'Tolak komitmen ini?'}
              {confirmAction?.action === 'cancel' && 'Batalkan komitmen ini? Komitmen yang sudah memiliki realisasi dibukukan dapat ditolak oleh sistem.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(confirmAction?.action === 'reject' || confirmAction?.action === 'cancel') && (
            <div className="space-y-1">
              <Label className="text-xs">Alasan (wajib)</Label>
              <Textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Tulis alasan..."
                className="text-xs h-16"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actioning}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={!!actioning}
              className={confirmAction?.action === 'reject' || confirmAction?.action === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actioning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {confirmAction ? COMMITMENT_ACTION_LABELS[confirmAction.action] : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
