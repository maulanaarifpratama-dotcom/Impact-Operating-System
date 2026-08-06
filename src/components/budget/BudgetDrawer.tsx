import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import ActivityBudgetEditor from '@/components/budget/ActivityBudgetEditor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  orgId: string;
  activityId: string;
  activityName: string;
  onChanged?: () => void;
}

interface BudgetItemSummary {
  id: string;
  item_name: string;
  volume: number;
  unit: string;
  unit_price_idr: number;
}

export default function BudgetDrawer({
  open,
  onOpenChange,
  projectId,
  orgId,
  activityId,
  activityName,
  onChanged,
}: Props) {
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lfa_budget_items')
        .select('id, volume, unit_price_idr')
        .eq('lfa_project_id', projectId)
        .eq('wbs_item_id', activityId);
      if (error) return;
      const items = (data || []) as BudgetItemSummary[];
      const total = items.reduce((s, i) => s + (Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0), 0);
      setSummary({ count: items.length, total });
    } catch {
      setSummary(null);
    }
  }, [projectId, activityId]);

  useEffect(() => {
    if (open) void loadSummary();
  }, [open, loadSummary]);

  const handleChanged = useCallback(() => {
    void loadSummary();
    if (onChanged) onChanged();
  }, [loadSummary, onChanged]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2 border-b">
          <SheetTitle className="text-base">Budget Activity</SheetTitle>
          <SheetDescription className="text-xs">
            {activityName}
            {summary && (
              <span className="ml-2 text-muted-foreground">
                &middot; {summary.count} item &middot; Rp {summary.total.toLocaleString('id-ID')}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <ActivityBudgetEditor
            projectId={projectId}
            orgId={orgId}
            activityId={activityId}
            activityName={activityName}
            onChanged={handleChanged}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
