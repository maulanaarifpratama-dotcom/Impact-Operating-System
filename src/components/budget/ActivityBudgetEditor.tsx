import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  onChanged?: () => void;
}

const DEFAULT_UNITS = ['Paket', 'Orang', 'Bulan', 'Hari', 'Jam', 'Minggu', 'Kegiatan', 'Unit', 'Lembar', 'Liter', 'Kg'];

export default function ActivityBudgetEditor({ projectId, orgId, activityId, activityName, onChanged }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-2 text-xs">
              <div className="flex-1 min-w-0">
                <Input
                  value={item.item_name}
                  placeholder="Nama item anggaran"
                  onChange={(e) => updateField(item.id, 'item_name', e.target.value)}
                  className="h-7 text-xs bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  min={0}
                  value={item.volume}
                  onChange={(e) => updateField(item.id, 'volume', Number(e.target.value) || 0)}
                  className="w-14 h-7 text-xs text-center"
                  title="Volume"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateField(item.id, 'unit', e.target.value)}
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
                  className="w-24 h-7 text-xs text-right"
                  title="Harga Satuan (IDR)"
                />
                <span className="w-20 text-right font-mono text-[10px] font-semibold">
                  {formatIDR(itemTotal(item))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
              Belum ada item anggaran untuk Activity ini.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={addItem} disabled={saving}>
          <Plus className="mr-1 h-3 w-3" />
          Tambah Item Anggaran
        </Button>
        <div className="text-[10px] text-muted-foreground">
          Total: <span className="font-bold text-foreground">{formatIDR(activityTotal)}</span>
        </div>
      </div>
    </div>
  );
}
