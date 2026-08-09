import { useCallback, useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  generateAutoloadCandidates,
  buildExistingKeys,
  type AutoloadCandidate,
} from '@/lib/budget/activityBudgetAutoload';
import { getProvenanceLabel } from '@/lib/grant-writer/deterministic/budget-provenance';

interface BudgetItem {
  id: string;
  wbs_item_id: string;
  item_name: string;
  category: string;
  cost_category: string;
  volume: number;
  unit: string;
  unit_price_idr: number;
  funding_source: string;
  actual_amount_idr?: number | null;
  sort_order: number;
}

interface Props {
  projectId: string;
  orgId: string;
  activityId: string;
  activityName: string;
  isOwner?: boolean;
  onChanged?: () => void;
}

const DEFAULT_UNITS = ['Paket', 'Orang', 'Bulan', 'Hari', 'Jam', 'Minggu', 'Kegiatan', 'Unit', 'Lembar', 'Liter', 'Kg'];

export default function ActivityBudgetEditor({ projectId, orgId, activityId, activityName, isOwner = false, onChanged }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [autoloadCandidates, setAutoloadCandidates] = useState<AutoloadCandidate[]>([]);
  const [showAutoload, setShowAutoload] = useState(false);
  const [autoloading, setAutoloading] = useState(false);
  const originalAutoloadPrices = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lfa_budget_items')
        .select('id, wbs_item_id, item_name, category, cost_category, volume, unit, unit_price_idr, funding_source, actual_amount_idr, sort_order')
        .eq('lfa_project_id', projectId)
        .eq('wbs_item_id', activityId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setItems((data || []) as BudgetItem[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId, activityId]);

  useEffect(() => { void load(); }, [load]);

  const updateField = async (id: string, field: keyof BudgetItem, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    setSaving(true);
    try {
      const payload: any = { [field]: value };
      await supabase.from('lfa_budget_items').update(payload).eq('id', id);
    } catch {
      // revert on error handled by reload
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    setSaving(true);
    try {
      const seq = items.length;
      const { data, error } = await supabase
        .from('lfa_budget_items')
        .insert({
          lfa_project_id: projectId,
          org_id: orgId,
          wbs_item_id: activityId,
          activity_name: activityName,
          item_name: '',
          category: 'Operasional',
          cost_category: 'Other Direct Costs',
          volume: 1,
          unit: 'Paket',
          unit_price_idr: 0,
          funding_source: 'grant',
          sort_order: seq,
          mode: 'simple',
        })
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [...prev, data as BudgetItem]);
      if (onChanged) onChanged();
    } catch (err: any) {
      toast({ title: 'Gagal menambah item', description: err?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('lfa_budget_items').delete().eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (onChanged) onChanged();
    } catch (err: any) {
      toast({ title: 'Gagal menghapus', description: err?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const itemTotal = (item: BudgetItem) => (Number(item.volume) || 0) * (Number(item.unit_price_idr) || 0);
  const activityTotal = items.reduce((sum, i) => sum + itemTotal(i), 0);

  const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // ── Autoload ──────────────────────────────────────────────────────────

  const handleAutoload = () => {
    setAutoloading(true);
    // Small delay for smooth UX transition
    setTimeout(() => {
      const existingKeys = buildExistingKeys(items);
      const candidates = generateAutoloadCandidates({
        activityName,
        existingItemKeys: existingKeys,
      });
      const prices = new Map<string, number>();
      for (const c of candidates) {
        if (c.suggestedUnitPrice != null) {
          prices.set(c.stableId, c.suggestedUnitPrice);
        }
      }
      originalAutoloadPrices.current = prices;
      setAutoloadCandidates(candidates);
      setShowAutoload(true);
      setAutoloading(false);

      if (candidates.length === 0 && activityName.trim()) {
        toast({
          title: 'Tidak ada kandidat',
          description: `Tidak ditemukan kebutuhan biaya yang cocok untuk "${activityName}". Tambahkan secara manual.`,
        });
      }
    }, 150);
  };

  const toggleCandidate = (stableId: string) => {
    setAutoloadCandidates((prev) =>
      prev.map((c) => (c.stableId === stableId ? { ...c, selected: !c.selected } : c)),
    );
  };

  const handleCandidatePriceEdit = (stableId: string, newPrice: number | null) => {
    setAutoloadCandidates((prev) => {
      const originalPrice = originalAutoloadPrices.current.get(stableId);
      return prev.map((c) => {
        if (c.stableId !== stableId) return c;
        const changed = originalPrice != null && newPrice !== originalPrice;
        const reverted = originalPrice != null && newPrice === originalPrice;
        return {
          ...c,
          suggestedUnitPrice: newPrice,
          provenanceState: changed ? 'USER_PROVIDED' : reverted ? 'ESTIMATE_UNVERIFIED' : c.provenanceState,
        };
      });
    });
  };

  const addSelectedCandidates = async () => {
    const selected = autoloadCandidates.filter((c) => c.selected);
    if (selected.length === 0) {
      toast({ title: 'Pilih minimal satu item', variant: 'destructive' });
      return;
    }

    setSaving(true);
    let seq = items.length + autoloadCandidates.length;
    try {
      for (const candidate of selected) {
        const { error } = await supabase
          .from('lfa_budget_items')
          .insert({
            lfa_project_id: projectId,
            org_id: orgId,
            wbs_item_id: activityId,
            activity_name: activityName,
            item_name: candidate.itemName,
            category: candidate.category === 'Sub-Professional' || candidate.category === 'Supporting-Staff'
              ? 'Honorarium' : candidate.category,
            cost_category: candidate.referenceFamily === 'inkindo'
              ? 'Personnel' : 'Other Direct Costs',
            volume: candidate.suggestedQuantity,
            unit: candidate.unit,
            unit_price_idr: candidate.suggestedUnitPrice ?? 0,
            funding_source: 'grant',
            sort_order: seq,
            mode: 'simple',
          });
        if (error) throw error;
        seq++;
      }

      setShowAutoload(false);
      setAutoloadCandidates([]);
      const count = selected.length;
      toast({
        title: `${count} item anggaran ditambahkan`,
        description: `Item dari Activity "${activityName}" telah ditambahkan. Semua harga bersifat estimasi dan perlu ditinjau.`,
      });
      void load();
      if (onChanged) onChanged();
    } catch (err: any) {
      toast({ title: 'Gagal menambahkan item', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const cancelAutoload = () => {
    setShowAutoload(false);
    setAutoloadCandidates([]);
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Budget Activity: {activityName}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{items.length} item</span>
          <span className="font-bold">{formatIDR(activityTotal)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Autoload Review Panel ─────────────────────────────────── */}
          {showAutoload && autoloadCandidates.length > 0 && (
            <div className="border-b bg-amber-50/30 dark:bg-amber-950/10 px-4 py-3">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 mb-2 leading-relaxed">
                Kandidat dibuat otomatis dari Activity menggunakan pencocokan deterministic. Nilai referensi bersifat <strong>estimasi, belum terverifikasi</strong> dan harus ditinjau sebelum digunakan.
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {autoloadCandidates.map((c) => (
                  <div
                    key={c.stableId}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-[10px] border cursor-pointer transition-colors ${
                      c.selected
                        ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/20'
                        : 'border-transparent bg-white/60 dark:bg-slate-900/40 hover:border-slate-200'
                    }`}
                    onClick={() => toggleCandidate(c.stableId)}
                  >
                    <Checkbox
                      checked={c.selected}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.itemName}</div>
                      <div className="text-[9px] text-muted-foreground flex items-center gap-1 flex-wrap">
                        <span>{c.category}</span>
                        <span>·</span>
                        <span>Qty: {c.suggestedQuantity}</span>
                        <span>·</span>
                        <span>{c.unit}</span>
                        {c.suggestedUnitPrice != null && (
                          <>
                            <span>·</span>
                            <span>Rp</span>
                            <input
                              type="number"
                              min={0}
                              value={c.suggestedUnitPrice}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCandidatePriceEdit(c.stableId, e.target.value === '' ? null : Number(e.target.value))}
                              className="w-24 h-5 text-[9px] border rounded px-1 bg-white/80 text-right"
                            />
                          </>
                        )}
                        <span>·</span>
                        <span className={
                          c.provenanceState === 'USER_PROVIDED'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }>
                          {c.provenanceState === 'USER_PROVIDED'
                            ? 'Dimasukkan pengguna'
                            : getProvenanceLabel(c.provenanceState)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] uppercase bg-slate-100 dark:bg-slate-800 px-1 rounded shrink-0">
                      {c.referenceFamily === 'sbm' ? 'Referensi sementara SBM' : c.referenceFamily === 'inkindo' ? 'Referensi sementara INKINDO' : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={addSelectedCandidates}
                  disabled={saving || !autoloadCandidates.some((c) => c.selected)}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Tambahkan item terpilih
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={cancelAutoload}
                  disabled={saving}
                >
                  <X className="mr-1 h-3 w-3" />
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* ── Existing Items ───────────────────────────────────────── */}
          <div className="divide-y">
            {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-2 text-xs">
              <div className="flex-1 min-w-0">
                <Input
                  value={item.item_name}
                  placeholder="Nama item anggaran"
                  onChange={(e) => updateField(item.id, 'item_name', e.target.value)}
                  disabled={!isOwner}
                  className="h-7 text-xs bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  min={0}
                  value={item.volume}
                  onChange={(e) => updateField(item.id, 'volume', Number(e.target.value) || 0)}
                  disabled={!isOwner}
                  className="w-14 h-7 text-xs text-center"
                  title="Volume"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateField(item.id, 'unit', e.target.value)}
                  disabled={!isOwner}
                  className="text-[10px] h-7 border rounded bg-transparent px-1"
                >
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  value={item.unit_price_idr}
                  onChange={(e) => updateField(item.id, 'unit_price_idr', Number(e.target.value) || 0)}
                  disabled={!isOwner}
                  className="w-24 h-7 text-xs text-right"
                  title="Harga Satuan (IDR)"
                />
                <span className="w-20 text-right font-mono text-[10px] font-semibold">
                  {formatIDR(itemTotal(item))}
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
              Belum ada item anggaran untuk Activity ini.
            </div>
          )}
        </div>
        </>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1">
          {isOwner && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={addItem} disabled={saving}>
              <Plus className="mr-1 h-3 w-3" />
              Tambah Item
            </Button>
          )}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-amber-600 hover:text-amber-700"
              onClick={handleAutoload}
              disabled={saving || autoloading}
            >
              {autoloading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Muat dari Activity
            </Button>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Total: <span className="font-bold text-foreground">{formatIDR(activityTotal)}</span>
        </div>
      </div>
    </div>
  );
}
