import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WbsItem, LfaEntry, LfaProject } from './types';
import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, Milestone, Calendar, User, AlignLeft, Flag, Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WBSBuilderProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
  onWbsSaved?: () => void;
}

export default function WBSBuilder({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya',
  onWbsSaved
}: WBSBuilderProps) {
  const { toast } = useToast();
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');
  const [budgetTotals, setBudgetTotals] = useState<Record<string, number>>({});


  // AI Suggestion Dialog States
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<WbsItem | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<{ suggested_weeks: number; reasoning: string } | null>(null);

  // Gantt Chart Drag-and-Drop States
  const [activeDrag, setActiveDrag] = useState<{
    itemId: string;
    type: 'move' | 'resize';
    startX: number;
    startStartMonth: number;
    startDurationWeeks: number;
  } | null>(null);

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const colWidth = 80; // Column width of 1 month in pixels
  const weekWidth = colWidth / 4; // 1 week is 20px

  // CPM / Critical Path Calculation
  const getCpmStatus = () => {
    const activities = wbsItems.filter((i) => i.level === 2);
    const es: Record<string, number> = {};
    const ef: Record<string, number> = {};

    // Initialize early start/finish in weeks
    activities.forEach((act) => {
      const startWeek = (act.start_month - 1) * 4;
      es[act.id] = startWeek;
      ef[act.id] = startWeek + act.duration_weeks;
    });

    // Forward pass relaxation
    for (let k = 0; k < activities.length; k++) {
      let changed = false;
      activities.forEach((act) => {
        const deps = act.dependencies || [];
        let maxDepFinish = (act.start_month - 1) * 4;
        deps.forEach((depId) => {
          if (ef[depId] !== undefined && ef[depId] > maxDepFinish) {
            maxDepFinish = ef[depId];
          }
        });
        if (es[act.id] < maxDepFinish) {
          es[act.id] = maxDepFinish;
          ef[act.id] = maxDepFinish + act.duration_weeks;
          changed = true;
        }
      });
      if (!changed) break;
    }

    // Backward pass
    const lf: Record<string, number> = {};
    const ls: Record<string, number> = {};
    const maxFinish = Math.max(...Object.values(ef), 0);
    activities.forEach((act) => {
      lf[act.id] = maxFinish;
      ls[act.id] = maxFinish - act.duration_weeks;
    });

    for (let k = 0; k < activities.length; k++) {
      let changed = false;
      activities.forEach((act) => {
        const dependents = activities.filter((dep) => dep.dependencies?.includes(act.id));
        let minDepStart = maxFinish;
        dependents.forEach((dep) => {
          if (ls[dep.id] !== undefined && ls[dep.id] < minDepStart) {
            minDepStart = ls[dep.id];
          }
        });
        if (lf[act.id] > minDepStart) {
          lf[act.id] = minDepStart;
          ls[act.id] = minDepStart - act.duration_weeks;
          changed = true;
        }
      });
      if (!changed) break;
    }

    const criticalPathIds = new Set<string>();
    activities.forEach((act) => {
      const slack = ls[act.id] - es[act.id];
      const hasChain = (act.dependencies && act.dependencies.length > 0) ||
                        activities.some((dep) => dep.dependencies?.includes(act.id));
      if (slack <= 0 && hasChain) {
        criticalPathIds.add(act.id);
      }
    });

    return { es, ef, criticalPathIds };
  };

  const { es, ef, criticalPathIds } = getCpmStatus();

  const formatBudgetBadge = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
    }
    if (amount >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toFixed(1).replace('.0', '')} jt`;
    }
    if (amount >= 1_000) {
      return `Rp ${(amount / 1_000).toFixed(1).replace('.0', '')} rb`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const loadBudgetTotals = async () => {
    try {
      const { data, error } = await supabase
        .from('lfa_budget_items')
        .select('wbs_item_id, volume, unit_price_idr')
        .eq('lfa_project_id', projectId);
      
      if (!error && data) {
        const totals: Record<string, number> = {};
        data.forEach((item) => {
          if (item.wbs_item_id) {
            const vol = Number(item.volume) || 1;
            const price = Number(item.unit_price_idr) || 0;
            totals[item.wbs_item_id] = (totals[item.wbs_item_id] || 0) + (vol * price);
          }
        });
        setBudgetTotals(totals);
      }
    } catch (err) {
      console.error('Failed to load budget totals:', err);
    }
  };

  // Load WBS Items
  const loadWbsItems = async () => {
    setLoading(true);
    try {
      void loadBudgetTotals();

      const { data, error } = await supabase
        .from('lfa_wbs_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Trigger Auto-import from LFA
        await performAutoImport();
      } else {
        setWbsItems(data as WbsItem[]);
        // Sync global mode from first item if exists
        if (data[0]?.mode) {
          setGlobalMode(data[0].mode as 'simple' | 'professional');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Gagal memuat WBS',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Perform Auto-Import
  const performAutoImport = async () => {
    try {
      // 1. Fetch LFA Entries
      const { data: entries, error: eErr } = await supabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence', { ascending: true });

      if (eErr) throw eErr;

      const outputs = (entries || []).filter((e) => e.level === 'output');
      const activities = (entries || []).filter((e) => e.level === 'activity');

      if (outputs.length === 0) {
        setWbsItems([]);
        return;
      }

      const newWbsItems: WbsItem[] = [];
      let globalSortOrder = 0;

      for (const out of outputs) {
        const level1Id = crypto.randomUUID();
        const level1Item: WbsItem = {
          id: level1Id,
          lfa_project_id: projectId,
          org_id: orgId,
          level: 1,
          parent_id: null,
          name: out.description || 'Output Hasil Tanpa Judul',
          start_month: 1,
          duration_weeks: 4,
          sort_order: globalSortOrder++,
          mode: 'simple',
          dependencies: []
        };
        newWbsItems.push(level1Item);

        // Map child activities
        const childActs = activities.filter((act) => act.parent_id === out.id);
        for (const act of childActs) {
          const level2Id = crypto.randomUUID();
          
          // Calculate duration in weeks from timeline
          let durationW = 4;
          if (act.timeline_start && act.timeline_end) {
            durationW = Math.max(4, (act.timeline_end - act.timeline_start + 1) * 4);
          }

          const level2Item: WbsItem = {
            id: level2Id,
            lfa_project_id: projectId,
            org_id: orgId,
            level: 2,
            parent_id: level1Id,
            name: act.description || 'Aktivitas Tanpa Judul',
            start_month: act.timeline_start || 1,
            duration_weeks: durationW,
            pic: act.responsible_party || '',
            sort_order: globalSortOrder++,
            mode: 'simple',
            dependencies: [],
            indicator: act.indicator || ''
          };
          newWbsItems.push(level2Item);
        }
      }

      // Write to Supabase in bulk
      if (newWbsItems.length > 0) {
        const { error: insErr } = await supabase
          .from('lfa_wbs_items')
          .insert(newWbsItems);

        if (insErr) throw insErr;

        setWbsItems(newWbsItems);
        toast({
          title: 'Auto-Import Berhasil ✨',
          description: 'WBS diisi otomatis dari LFA kamu. Lengkapi detail aktivitas.',
        });
        if (onWbsSaved) onWbsSaved();
      }
    } catch (err: any) {
      console.error('Auto import failed:', err);
      toast({
        title: 'Auto-import Gagal',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (projectId && orgId) {
      void loadWbsItems();
    }
  }, [projectId, orgId]);

  // Sync mode changes to DB
  useEffect(() => {
    if (wbsItems.length === 0) return;
    const firstMode = wbsItems[0]?.mode;
    if (firstMode !== globalMode) {
      const updated = wbsItems.map((item) => ({ ...item, mode: globalMode }));
      setWbsItems(updated);
      
      // Update DB
      void (async () => {
        setSaving(true);
        try {
          for (const item of updated) {
            await supabase
              .from('lfa_wbs_items')
              .update({ mode: globalMode })
              .eq('id', item.id);
          }
          setLastSaved(new Date());
        } catch (err) {
          console.error('Failed to sync global mode to DB:', err);
        } finally {
          setSaving(false);
        }
      })();
    }
  }, [globalMode]);

  // Local state update helper
  const updateItemLocally = (updated: WbsItem) => {
    setWbsItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  // Trigger Autosave with Debounce
  const triggerAutosave = (item: WbsItem) => {
    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id]);
    }

    setSaving(true);
    debounceTimers.current[item.id] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('lfa_wbs_items')
          .update({
            name: item.name,
            start_month: item.start_month,
            duration_weeks: item.duration_weeks,
            pic: item.pic,
            method: item.method,
            indicator: item.indicator,
            notes: item.notes,
            dependencies: item.dependencies || [],
            sort_order: item.sort_order,
            mode: item.mode
          })
          .eq('id', item.id);

        if (error) throw error;
        setLastSaved(new Date());
        if (onWbsSaved) onWbsSaved();
      } catch (err) {
        console.error('Failed to autosave WBS item:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  // Add Level 3 (Sub-aktivitas)
  const handleAddSubActivity = async (parentActivityId: string) => {
    setSaving(true);
    try {
      const newId = crypto.randomUUID();
      const parentItem = wbsItems.find((i) => i.id === parentActivityId);
      if (!parentItem) return;

      // Find children to determine sort_order
      const children = wbsItems.filter((i) => i.parent_id === parentActivityId);
      const parentIdx = wbsItems.findIndex((i) => i.id === parentActivityId);

      const newItem: WbsItem = {
        id: newId,
        lfa_project_id: projectId,
        org_id: orgId,
        level: 3,
        parent_id: parentActivityId,
        name: '',
        start_month: parentItem.start_month,
        duration_weeks: 2, // default 2 weeks
        sort_order: parentItem.sort_order + children.length + 1,
        mode: globalMode,
        dependencies: []
      };

      // Insert locally
      const updatedList = [...wbsItems];
      updatedList.splice(parentIdx + children.length + 1, 0, newItem);
      // Re-index sort order
      const reindexed = updatedList.map((item, idx) => ({ ...item, sort_order: idx }));

      const { error } = await supabase
        .from('lfa_wbs_items')
        .insert({
          id: newItem.id,
          lfa_project_id: newItem.lfa_project_id,
          org_id: newItem.org_id,
          level: newItem.level,
          parent_id: newItem.parent_id,
          name: newItem.name,
          start_month: newItem.start_month,
          duration_weeks: newItem.duration_weeks,
          sort_order: newItem.sort_order,
          mode: newItem.mode
        });

      if (error) throw error;

      setWbsItems(reindexed);
      setLastSaved(new Date());
      if (onWbsSaved) onWbsSaved();
    } catch (err: any) {
      toast({
        title: 'Gagal menambah sub-aktivitas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Add Level 4 (Task)
  const handleAddTask = async (parentSubId: string) => {
    setSaving(true);
    try {
      const newId = crypto.randomUUID();
      const parentItem = wbsItems.find((i) => i.id === parentSubId);
      if (!parentItem) return;

      const children = wbsItems.filter((i) => i.parent_id === parentSubId);
      const parentIdx = wbsItems.findIndex((i) => i.id === parentSubId);

      const newItem: WbsItem = {
        id: newId,
        lfa_project_id: projectId,
        org_id: orgId,
        level: 4,
        parent_id: parentSubId,
        name: '',
        start_month: parentItem.start_month,
        duration_weeks: 1,
        sort_order: parentItem.sort_order + children.length + 1,
        mode: globalMode,
        dependencies: []
      };

      const updatedList = [...wbsItems];
      updatedList.splice(parentIdx + children.length + 1, 0, newItem);
      const reindexed = updatedList.map((item, idx) => ({ ...item, sort_order: idx }));

      const { error } = await supabase
        .from('lfa_wbs_items')
        .insert({
          id: newItem.id,
          lfa_project_id: newItem.lfa_project_id,
          org_id: newItem.org_id,
          level: newItem.level,
          parent_id: newItem.parent_id,
          name: newItem.name,
          start_month: newItem.start_month,
          duration_weeks: newItem.duration_weeks,
          sort_order: newItem.sort_order,
          mode: newItem.mode
        });

      if (error) throw error;

      setWbsItems(reindexed);
      setLastSaved(new Date());
      if (onWbsSaved) onWbsSaved();
    } catch (err: any) {
      toast({
        title: 'Gagal menambah task',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini beserta turunannya?')) return;
    setSaving(true);
    try {
      // Supabase cascade will delete children in lfa_wbs_items because of self REFERENCES cascade
      const { error } = await supabase
        .from('lfa_wbs_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Filter locally
      const filterOutRecursive = (id: string, list: WbsItem[]): string[] => {
        const ids = [id];
        const children = list.filter((item) => item.parent_id === id);
        children.forEach((c) => {
          ids.push(...filterOutRecursive(c.id, list));
        });
        return ids;
      };

      const deletedIds = filterOutRecursive(itemId, wbsItems);
      const remaining = wbsItems.filter((item) => !deletedIds.includes(item.id));
      const reindexed = remaining.map((item, idx) => ({ ...item, sort_order: idx }));

      setWbsItems(reindexed);
      setLastSaved(new Date());
      if (onWbsSaved) onWbsSaved();
      toast({
        title: 'Item berhasil dihapus',
        description: 'WBS tree diperbarui.',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal menghapus item',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // AI Duration Suggest trigger
  const handleRequestAiSuggest = async (item: WbsItem) => {
    setSelectedActivity(item);
    setAiSuggestOpen(true);
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const { data, error } = await supabase.functions.invoke('wbs-ai-suggest', {
        body: {
          activity_name: item.name,
          sector: sector,
          total_duration_months: programDurationMonths,
        },
      });

      if (error) throw error;
      setAiRecommendation(data as { suggested_weeks: number; reasoning: string });
    } catch (err: any) {
      toast({
        title: 'Saran AI Gagal',
        description: err.message || 'Gagal menghubungi asisten AI.',
        variant: 'destructive',
      });
      setAiSuggestOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiSuggest = () => {
    if (!selectedActivity || !aiRecommendation) return;
    const updated = {
      ...selectedActivity,
      duration_weeks: aiRecommendation.suggested_weeks,
    };
    updateItemLocally(updated);
    triggerAutosave(updated);
    setAiSuggestOpen(false);
    toast({
      title: 'Saran AI Diterima ✨',
      description: `Durasi aktivitas diubah menjadi ${aiRecommendation.suggested_weeks} minggu.`,
    });
  };

  // Drag Event Register
  const handleDragStart = (e: React.MouseEvent, item: WbsItem, type: 'move' | 'resize') => {
    e.preventDefault();
    setActiveDrag({
      itemId: item.id,
      type,
      startX: e.clientX,
      startStartMonth: item.start_month,
      startDurationWeeks: item.duration_weeks,
    });
  };

  useEffect(() => {
    if (!activeDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - activeDrag.startX;
      const item = wbsItems.find((i) => i.id === activeDrag.itemId);
      if (!item) return;

      if (activeDrag.type === 'move') {
        const deltaMonths = Math.round(deltaX / colWidth);
        const newStartMonth = Math.max(1, Math.min(programDurationMonths, activeDrag.startStartMonth + deltaMonths));
        if (newStartMonth !== item.start_month) {
          updateItemLocally({ ...item, start_month: newStartMonth });
        }
      } else if (activeDrag.type === 'resize') {
        const deltaWeeks = Math.round(deltaX / weekWidth);
        const newDurationWeeks = Math.max(1, activeDrag.startDurationWeeks + deltaWeeks);
        if (newDurationWeeks !== item.duration_weeks) {
          updateItemLocally({ ...item, duration_weeks: newDurationWeeks });
        }
      }
    };

    const handleMouseUp = () => {
      const item = wbsItems.find((i) => i.id === activeDrag.itemId);
      if (item) {
        triggerAutosave(item);
      }
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, wbsItems]);

  // Export PDF (Direct Printable High-Fidelity window)
  const handleExportPrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const simpleCpm = getCpmStatus();

    // Render tree nodes to clean table HTML
    const renderTableRowsHtml = () => {
      return wbsItems.map((item) => {
        let indentClass = '';
        let badgeColor = '';
        let levelLabel = '';

        if (item.level === 1) {
          indentClass = 'font-bold bg-slate-100 text-slate-900 border-t-2 border-slate-300';
          badgeColor = 'bg-slate-800 text-white';
          levelLabel = 'H';
        } else if (item.level === 2) {
          indentClass = 'pl-6 font-semibold bg-slate-50/50';
          badgeColor = 'bg-emerald-500 text-white';
          levelLabel = 'K';
        } else if (item.level === 3) {
          indentClass = 'pl-12 text-slate-700 italic';
          badgeColor = 'bg-indigo-500 text-white';
          levelLabel = 'Sub';
        } else if (item.level === 4) {
          indentClass = 'pl-20 text-slate-500 text-xs';
          badgeColor = 'bg-slate-400 text-white';
          levelLabel = 'Task';
        }

        const methodBadge = item.method && globalMode === 'professional' ? `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-normal ml-2 text-[10px]">${item.method}</span>` : '';
        const picVal = item.pic || '-';
        const notesVal = item.notes || '-';
        const indicatorVal = item.indicator || '-';

        let extraCols = '';
        if (globalMode === 'professional') {
          extraCols = `
            <td class="p-2 border border-slate-300 text-[11px]">${methodBadge ? item.method : '-'}</td>
            <td class="p-2 border border-slate-300 text-[11px]">${indicatorVal}</td>
            <td class="p-2 border border-slate-300 text-[11px]">${notesVal}</td>
          `;
        }

        return `
          <tr class="${indentClass}">
            <td class="p-2 border border-slate-300 text-xs flex items-center gap-1.5 min-w-0">
              <span class="px-1 py-0.5 rounded text-[9px] font-bold ${badgeColor}">${levelLabel}</span>
              <span class="truncate max-w-sm md:max-w-md">${item.name}</span>
            </td>
            <td class="p-2 border border-slate-300 text-center text-xs">${item.start_month ? 'Bulan ' + item.start_month : '-'}</td>
            <td class="p-2 border border-slate-300 text-center text-xs">${item.duration_weeks ? item.duration_weeks + ' minggu' : '-'}</td>
            <td class="p-2 border border-slate-300 text-xs">${picVal}</td>
            ${extraCols}
          </tr>
        `;
      }).join('');
    };

    // Render Gantt bars HTML
    const renderGanttRowsHtml = () => {
      return wbsItems.map((item) => {
        if (item.level !== 2 && (item.level !== 3 || !item.indicator || globalMode === 'simple')) {
          // Empty track
          return `
            <div class="h-8 border-b border-slate-100 flex items-center relative"></div>
          `;
        }

        const columnsHtml = Array.from({ length: programDurationMonths }).map(() => `
          <div class="w-20 shrink-0 border-r border-slate-100 h-full"></div>
        `).join('');

        let barHtml = '';
        if (item.level === 2) {
          const isCritical = simpleCpm.criticalPathIds.has(item.id) && globalMode === 'professional';
          const leftOffset = (item.start_month - 1) * colWidth;
          const widthVal = (item.duration_weeks / 4) * colWidth;
          const barColor = isCritical ? 'bg-red-500 border-red-600' : 'bg-emerald-600 border-emerald-700';

          barHtml = `
            <div class="absolute top-1.5 h-5 rounded shadow-sm border text-[10px] text-white flex items-center justify-center px-1 font-semibold ${barColor}" 
                 style="left: ${leftOffset}px; width: ${widthVal}px;">
              ${item.duration_weeks} Mgg
            </div>
          `;
        } else if (item.level === 3 && item.indicator && globalMode === 'professional') {
          // Milestone ◆
          const leftOffset = (item.start_month - 1) * colWidth + ((item.duration_weeks || 1) / 4) * colWidth - 8;
          barHtml = `
            <div class="absolute top-2 w-4 h-4 bg-indigo-600 rotate-45 flex items-center justify-center shadow-md cursor-pointer group" 
                 style="left: ${leftOffset}px;" title="${item.name}">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          `;
        }

        return `
          <div class="h-8 border-b border-slate-100 flex items-center relative">
            ${columnsHtml}
            ${barHtml}
          </div>
        `;
      }).join('');
    };

    const headerMonthsHtml = Array.from({ length: programDurationMonths }).map((_, idx) => `
      <div class="w-20 shrink-0 text-center text-[10px] font-bold uppercase py-1.5 border-r border-slate-200 bg-slate-100 text-slate-700">
        Bulan ${idx + 1}
      </div>
    `).join('');

    const proHeaders = globalMode === 'professional' ? `
      <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-left">Metode</th>
      <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-left">Tolok Ukur Keberhasilan</th>
      <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-left">Catatan/Asumsi</th>
    ` : '';

    const criticalPathExpanation = globalMode === 'professional' && simpleCpm.criticalPathIds.size > 0 ? `
      <div class="mb-6 p-3 bg-red-50 rounded border border-red-200 text-xs text-red-800">
        <h3 class="font-bold mb-1">⚠️ Critical Path Highlighted</h3>
        <p>Aktivitas yang berwarna merah adalah bagian dari jalur kritis (critical path) berantai. Penundaan pada aktivitas ini akan langsung berdampak pada kemunduran total durasi penyelesaian program.</p>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>WBS Report — Impactory.id</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { margin: 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
              .page-break { page-break-before: always; }
            }
            .shrink-0 { flex-shrink: 0; }
          </style>
        </head>
        <body class="bg-white text-slate-800 p-6">
          <div class="flex justify-between items-center border-b-2 border-slate-300 pb-4 mb-6">
            <div>
              <h1 class="text-xl font-bold uppercase text-slate-950">Work Breakdown Structure (WBS)</h1>
              <p class="text-xs text-slate-600 mt-1">Sektor: ${sector} | Total Durasi: ${programDurationMonths} Bulan</p>
            </div>
            <div class="text-right">
              <span class="text-sm font-bold text-emerald-600">Impactory.id</span>
              <p class="text-[10px] text-slate-500 mt-1">Tanggal Cetak: ${formattedDate}</p>
            </div>
          </div>

          <div class="mb-4">
            <h2 class="text-sm font-bold uppercase text-slate-800">Detail Modul: ${globalMode === 'professional' ? 'NGO Profesional' : 'Sederhana Grassroot'}</h2>
          </div>

          ${criticalPathExpanation}

          <!-- TABEL WBS -->
          <div class="mb-8">
            <table class="w-full border-collapse border border-slate-300">
              <thead>
                <tr>
                  <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-left">Nama Output / Aktivitas / Sub-aktivitas</th>
                  <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-center w-24">Bulan Mulai</th>
                  <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-center w-24">Durasi</th>
                  <th class="p-2 border border-slate-300 bg-slate-900 text-white text-xs text-left w-36">PIC</th>
                  ${proHeaders}
                </tr>
              </thead>
              <tbody>
                ${renderTableRowsHtml()}
              </tbody>
            </table>
          </div>

          <!-- GANTT CHART VISUAL -->
          <div class="page-break pt-6">
            <h2 class="text-sm font-bold uppercase text-slate-800 mb-4">Gantt Chart Visualisasi</h2>
            <div class="border border-slate-300 rounded overflow-x-auto bg-slate-50/20 max-w-full">
              <div class="flex flex-col min-w-max">
                <!-- Header bulan -->
                <div class="flex h-8 border-b border-slate-300 items-center">
                  ${headerMonthsHtml}
                </div>
                <!-- Rows -->
                <div class="flex flex-col">
                  ${renderGanttRowsHtml()}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-12 text-center text-xs text-slate-400 border-t pt-4">
            Dibuat secara profesional menggunakan <span class="font-semibold text-slate-600">Impactory.id</span>
          </div>

          <div class="no-print fixed bottom-6 right-6">
            <button onclick="window.print()" class="px-4 py-2 bg-emerald-600 text-white rounded font-bold shadow hover:bg-emerald-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Dokumen / Simpan PDF
            </button>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat lembar WBS Builder...
      </div>
    );
  }

  // Get color themed classes per output level 1 parent
  const getLevel1Theme = (index: number) => {
    const themes = [
      { border: 'border-l-emerald-500', bg: 'bg-emerald-50/30', bar: 'bg-emerald-600 dark:bg-emerald-500', tag: 'bg-emerald-600 text-white' },
      { border: 'border-l-blue-500', bg: 'bg-blue-50/30', bar: 'bg-blue-600 dark:bg-blue-500', tag: 'bg-blue-600 text-white' },
      { border: 'border-l-purple-500', bg: 'bg-purple-50/30', bar: 'bg-purple-600 dark:bg-purple-500', tag: 'bg-purple-600 text-white' },
      { border: 'border-l-amber-500', bg: 'bg-amber-50/30', bar: 'bg-amber-600 dark:bg-amber-500', tag: 'bg-amber-600 text-white' },
      { border: 'border-l-rose-500', bg: 'bg-rose-50/30', bar: 'bg-rose-600 dark:bg-rose-500', tag: 'bg-rose-600 text-white' }
    ];
    return themes[index % themes.length];
  };

  // Find index of parent Level 1 Outputs
  const getOutputIndex = (level1Id: string) => {
    const level1s = wbsItems.filter((i) => i.level === 1);
    return level1s.findIndex((i) => i.id === level1Id);
  };

  return (
    <div data-testid="wbs-builder-root" className="space-y-6">
      {/* MODULE WORKSPACE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">Work Breakdown Structure Builder</h4>
            <Badge variant="outline" className="text-[10px] font-medium py-0">Hybrid module</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Detail aktivitas, timeline visual, estimasi AI dan cascading modul Budget.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sederhana vs Profesional Toggle Slider */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border">
            <button
              onClick={() => setGlobalMode('simple')}
              className={`px-3 py-1 text-[11px] font-semibold flex items-center gap-1 transition-all ${
                globalMode === 'simple'
                  ? 'bg-white dark:bg-slate-950 text-emerald-600 shadow-sm rounded-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 Sederhana
            </button>
            <button
              onClick={() => setGlobalMode('professional')}
              className={`px-3 py-1 text-[11px] font-semibold flex items-center gap-1 transition-all ${
                globalMode === 'professional'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-sm rounded-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🏢 Profesional
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportPrintPDF} className="text-xs font-semibold">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
          </Button>

          {saving && (
            <div className="flex items-center text-xs text-muted-foreground gap-1 ml-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Autosaving...
            </div>
          )}
        </div>
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        
        {/* LEFT COLUMN (60%): Interactive Tree Sheet */}
        <div className="lg:col-span-3 border-r divide-y overflow-x-auto min-w-0 max-h-[600px] overflow-y-auto">
          {/* Row Headers */}
          <div className="flex bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500 py-3 px-4 min-w-[500px]">
            <div className="flex-1">Deskripsi WBS Tree</div>
            <div className="w-16 text-center">Bulan</div>
            <div className="w-16 text-center">Mgg/Hari</div>
            <div className="w-24 text-left">PIC</div>
            {globalMode === 'professional' && <div className="w-24 text-left">Metode</div>}
            <div className="w-8"></div>
          </div>

          {/* Tree Rows */}
          {wbsItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Belum ada data WBS. Selesaikan LFA Matrix untuk memulai.
            </div>
          ) : (
            wbsItems.map((item) => {
              const level1Idx = item.level === 1 ? getOutputIndex(item.id) : (item.parent_id ? getOutputIndex(item.parent_id) : 0);
              const parentOutput = item.level === 1 ? item : wbsItems.find((p) => p.id === item.parent_id);
              const level1OutputIdx = parentOutput ? getOutputIndex(parentOutput.id) : level1Idx;
              const theme = getLevel1Theme(level1OutputIdx);

              let indentStyle = '';
              const rowHeightClass = item.level === 2 && globalMode === 'professional' ? 'h-[50px] py-1' : 'h-[38px] py-1.5';
              let rowStyle = `px-4 flex items-center min-w-[500px] gap-2 transition-all ${rowHeightClass} `;


              if (item.level === 1) {
                indentStyle = `border-l-4 ${theme.border} bg-slate-50/50 dark:bg-slate-800/10 font-semibold`;
              } else if (item.level === 2) {
                indentStyle = 'pl-8 bg-white dark:bg-slate-900';
              } else if (item.level === 3) {
                indentStyle = 'pl-14 bg-slate-50/20 dark:bg-slate-900/10 text-slate-700 dark:text-slate-300';
              } else if (item.level === 4) {
                indentStyle = 'pl-20 bg-slate-50/40 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-xs';
              }

              // Filter out level 4 if simple mode
              if (item.level === 4 && globalMode === 'simple') return null;

              return (
                <div key={item.id} className={`${rowStyle} ${indentStyle}`}>
                  {/* Row Body Left Side */}
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    {/* Row level tag */}
                    {item.level === 1 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-white shrink-0">H</span>}
                    {item.level === 2 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white shrink-0">K</span>}
                    {item.level === 3 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500 text-white shrink-0">Sub</span>}
                    {item.level === 4 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-400 text-white shrink-0">Task</span>}

                    {/* Inline edit input */}
                    {item.level === 1 ? (
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate py-1" title={item.name}>
                        {item.name}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={item.name}
                        data-testid="wbs-activity-name-input"
                        placeholder={
                          item.level === 2 ? 'Ketik nama aktivitas...' :
                          item.level === 3 ? 'Ketik sub-aktivitas...' : 'Ketik detail task...'
                        }
                        onChange={(e) => {
                          const updated = { ...item, name: e.target.value };
                          updateItemLocally(updated);
                          triggerAutosave(updated);
                        }}
                        className="text-xs w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-primary focus:outline-none py-0.5 font-medium truncate"
                      />
                    )}
                  </div>

                  {/* Monthly starting column */}
                  <div className="w-16 text-center">
                    {item.level === 2 ? (
                      <input
                        type="number"
                        min={1}
                        max={programDurationMonths}
                        value={item.start_month}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(programDurationMonths, parseInt(e.target.value) || 1));
                          const updated = { ...item, start_month: val };
                          updateItemLocally(updated);
                          triggerAutosave(updated);
                        }}
                        className="w-10 text-center text-xs border rounded p-0.5 h-6 bg-transparent dark:border-slate-800"
                        title="Bulan mulai"
                      />
                    ) : item.level === 3 && globalMode === 'professional' ? (
                      // start_month input for level 3 pic duration
                      <span className="text-[10px] text-muted-foreground">-</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Weeks / Days duration columns */}
                  <div className="w-16 text-center flex items-center justify-center gap-0.5">
                    {item.level === 2 ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={item.duration_weeks}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 4);
                            const updated = { ...item, duration_weeks: val };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="w-10 text-center text-xs border rounded p-0.5 h-6 bg-transparent dark:border-slate-800"
                        />
                        <button
                          onClick={() => void handleRequestAiSuggest(item)}
                          className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 p-0.5 rounded transition-all shrink-0"
                          title="✨ Tanya Saran AI untuk Estimasi Durasi"
                        >
                          <Sparkles className="h-3 w-3" />
                        </button>
                      </div>
                    ) : item.level === 3 && globalMode === 'professional' ? (
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min={1}
                          value={item.duration_weeks} // level 3 duration in days
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const updated = { ...item, duration_weeks: val };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="w-8 text-center text-[10px] border rounded p-0.5 h-6 bg-transparent dark:border-slate-800"
                        />
                        <span className="text-[9px] text-muted-foreground">Hari</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* PIC column */}
                  <div className="w-24">
                    {item.level === 1 ? (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    ) : (
                      <input
                        type="text"
                        value={item.pic || ''}
                        data-testid="wbs-pic-input"
                        placeholder={item.level === 2 && globalMode === 'professional' ? 'Nama + Jabatan + Org' : 'PIC'}
                        onChange={(e) => {
                          const updated = { ...item, pic: e.target.value };
                          updateItemLocally(updated);
                          triggerAutosave(updated);
                        }}
                        className="text-[10px] w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:outline-none py-0.5 font-normal truncate"
                      />
                    )}
                  </div>

                  {/* Method dropdown for professional mode (Level 2 only) */}
                  {globalMode === 'professional' && (
                    <div className="w-24">
                      {item.level === 2 ? (
                        <select
                          value={item.method || ''}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            const updated = { ...item, method: val ? val : null };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="text-[10px] w-full border bg-transparent rounded px-1 h-6 focus:outline-none dark:border-slate-800"
                        >
                          <option value="">-- Metode --</option>
                          <option value="Workshop">Workshop</option>
                          <option value="FGD">FGD</option>
                          <option value="Survey">Survey</option>
                          <option value="Pelatihan">Pelatihan</option>
                          <option value="Pendampingan">Pendampingan</option>
                          <option value="Rapat">Rapat</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Right Side */}
                  <div className="w-8 flex items-center justify-end gap-1 shrink-0">
                    {item.level === 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        onClick={() => void handleAddSubActivity(item.id)}
                        title="Tambah Aktivitas"
                        disabled={true} // Read-only from LFA Matrix!
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.level === 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="wbs-add-item-button"
                        className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        onClick={() => void handleAddSubActivity(item.id)}
                        title="Tambah Sub-aktivitas"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.level === 3 && globalMode === 'professional' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        onClick={() => void handleAddTask(item.id)}
                        title="Tambah Task Detail"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.level !== 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => void handleDeleteItem(item.id)}
                        title="Hapus"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN (40%): Draggable CSS Grid Gantt Chart */}
        <div className="lg:col-span-2 overflow-x-auto select-none bg-slate-50/10 dark:bg-slate-900/10 max-h-[600px] overflow-y-auto">
          <div className="flex flex-col min-w-max">
            {/* Header timeline */}
            <div className="flex bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-b">
              {Array.from({ length: programDurationMonths }).map((_, idx) => (
                <div key={idx} className="w-20 shrink-0 text-center py-3 border-r dark:border-slate-800">
                  Bln {idx + 1}
                </div>
              ))}
            </div>

            {/* Vertical grid line blocks and timeline bar rendering */}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {wbsItems.length === 0 ? (
                <div className="h-40 bg-slate-50/50"></div>
              ) : (
                wbsItems.map((item) => {
                  const level1Idx = item.level === 1 ? getOutputIndex(item.id) : (item.parent_id ? getOutputIndex(item.parent_id) : 0);
                  const parentOutput = item.level === 1 ? item : wbsItems.find((p) => p.id === item.parent_id);
                  const level1OutputIdx = parentOutput ? getOutputIndex(parentOutput.id) : level1Idx;
                  const theme = getLevel1Theme(level1OutputIdx);

                  // Filter out level 4 if simple mode
                  if (item.level === 4 && globalMode === 'simple') return null;

                  return (
                    <div key={item.id} className={`${item.level === 2 && globalMode === 'professional' ? 'h-[50px]' : 'h-[38px]'} flex items-center relative group`}>
                      {/* Vertical Background lines */}
                      {Array.from({ length: programDurationMonths }).map((_, idx) => (
                        <div key={idx} className="w-20 shrink-0 border-r dark:border-slate-800 h-full"></div>
                      ))}

                      {/* Render Interactive Bar (Level 2 Activity only) */}
                      {item.level === 2 && (
                        (() => {
                          const leftOffset = (item.start_month - 1) * colWidth;
                          const widthVal = (item.duration_weeks / 4) * colWidth;
                          const isCritical = criticalPathIds.has(item.id) && globalMode === 'professional';
                          const isDragging = activeDrag?.itemId === item.id;
                          const hasBudget = budgetTotals[item.id] !== undefined && budgetTotals[item.id] > 0;
                          const budgetValue = budgetTotals[item.id] || 0;

                          return (
                            <>
                              <div
                                style={{ left: `${leftOffset}px`, width: `${widthVal}px` }}
                                className={`absolute ${globalMode === 'professional' ? 'top-1' : 'top-1.5'} h-[24px] rounded-md border flex items-center justify-between px-2 cursor-move select-none shadow-sm transition-shadow group-hover:shadow-md ${
                                  isDragging ? 'opacity-80 ring-2 ring-primary' : ''
                                } ${
                                  isCritical
                                    ? 'bg-red-500 border-red-600 text-white'
                                    : `${theme.bar} text-white border-black/10`
                                }`}
                                onMouseDown={(e) => handleDragStart(e, item, 'move')}
                              >
                                {/* Left side info */}
                                <span className="text-[9px] font-bold select-none truncate pr-1">
                                  {item.duration_weeks} Mgg
                                </span>

                                {/* Right Resize Handle */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation(); // Prevent move trigger
                                    handleDragStart(e, item, 'resize');
                                  }}
                                  className="w-2 h-full cursor-ew-resize hover:bg-white/20 active:bg-white/30 rounded-r-md flex items-center justify-center shrink-0"
                                  title="Drag untuk menyesuaikan durasi"
                                >
                                  <span className="w-0.5 h-3 bg-white/40 block rounded"></span>
                                </div>
                              </div>

                              {/* Budget badge only in professional mode */}
                              {globalMode === 'professional' && (
                                <div
                                  style={{ left: `${leftOffset}px` }}
                                  className={`absolute top-[28px] text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm shrink-0 truncate max-w-[120px] ${
                                    hasBudget 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200' 
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200'
                                  }`}
                                >
                                  {hasBudget ? formatBudgetBadge(budgetValue) : 'Belum ada anggaran'}
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}

                      {/* Render Diamond Milestones in Professional Mode (Level 3 deliverables) */}
                      {item.level === 3 && item.indicator && globalMode === 'professional' && (
                        (() => {
                          // Place milestone diamond at completion week
                          const parentWeeks = item.duration_weeks || 1;
                          const leftOffset = (item.start_month - 1) * colWidth + (parentWeeks / 4) * colWidth - 8;

                          return (
                            <div
                              style={{ left: `${leftOffset}px` }}
                              className="absolute top-2 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rotate-45 flex items-center justify-center shadow-md cursor-pointer group-hover:scale-110 transition-transform"
                              title={`Deliverable: ${item.name}`}
                            >
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER SYSTEM OVERLAYS: SVG DEPENDENCY ARROWS (Professional Mode only) */}
      {globalMode === 'professional' && wbsItems.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-lg flex items-center gap-2">
          <Network className="h-4 w-4 text-indigo-500 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">🏢 Fitur Tambahan Profesional Aktif:</span>
            <span>Untuk membuat ketergantungan (dependencies) antar aktivitas, atur dan sambungkan aktivitas yang saling terikat. Sistem akan menghitung jalur kritis (critical path) dan menandainya dengan warna merah jika mendeteksi risiko penundaan berantai.</span>
          </div>
        </div>
      )}

      {/* AI ESTIMATE SUGGESTION DIALOG */}
      <Dialog open={aiSuggestOpen} onOpenChange={setAiSuggestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm uppercase font-bold text-amber-600">
              <Sparkles className="h-4 w-4 text-amber-500" /> Saran Estimasi Durasi AI
            </DialogTitle>
            <DialogDescription className="text-xs">
              Menganalisis kompleksitas kegiatan berdasarkan data sektor dan standar NGO.
            </DialogDescription>
          </DialogHeader>

          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Menghubungi Azure AI Advisor...</span>
            </div>
          ) : aiRecommendation ? (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg space-y-2">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">🔬 Hasil Rekomendasi AI</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Rekomendasi Durasi: <span className="text-amber-600">{aiRecommendation.suggested_weeks} minggu</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {aiRecommendation.reasoning}
                </p>
              </div>

              <div className="text-xs text-muted-foreground p-2 border border-dashed rounded bg-slate-50/20 flex gap-2">
                <span className="text-amber-500 shrink-0">⚠️</span>
                <span>Klik "Terapkan" untuk langsung mengupdate durasi aktivitas ini menjadi {aiRecommendation.suggested_weeks} minggu.</span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiSuggestOpen(false)} className="text-xs">
              Abaikan
            </Button>
            {aiRecommendation && (
              <Button size="sm" onClick={handleAcceptAiSuggest} className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
                Terapkan Rekomendasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
