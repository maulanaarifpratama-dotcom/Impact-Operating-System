import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import {
  WbsItem, WbsStatus, LfaEntry, LfaProject,
  WbsCompletionClaim, WbsCompletionEvidence, WbsCompletionClaimStatus, WbsEvidenceType,
  WbsFinancialStatus, WbsBlockerCategory
} from './types';
import { CARBON_FACTORS_INDONESIA } from '@/data/carbon-factors-indonesia';
import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, Milestone, Calendar, User, AlignLeft, Flag, Network, Wallet, ExternalLink,
  ClipboardCheck, FileText, CheckCircle2, XCircle, AlertCircle, Link2, ShieldAlert, FileUp, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { computeEvmVarianceFlag } from './evmVariance';
import { appStylesheetTags, finalizePrintWindow } from '@/lib/print/printWindow';
import type { Database } from '@/integrations/supabase/database.generated';

type WbsClaimInsert = Database['public']['Tables']['wbs_completion_claims']['Insert'];

// Helper: Check if an item is a leaf item (has no children in the WBS tree)
const isLeafItem = (item: WbsItem, allItems: WbsItem[]): boolean => {
  if (item.level === 3 || item.level === 4) {
    const children = allItems.filter((i) => i.parent_id === item.id);
    return children.length === 0;
  }
  if (item.level === 2) {
    const children = allItems.filter((i) => i.parent_id === item.id);
    return children.length === 0;
  }
  return false; // Level 1 is always a parent
};

// Helper: Compute parent progress roll-up (average of non-cancelled leaf descendants)
const computeParentProgress = (parentId: string, allItems: WbsItem[]) => {
  const getLeafDescendants = (id: string): WbsItem[] => {
    const children = allItems.filter((i) => i.parent_id === id);
    if (children.length === 0) {
      const current = allItems.find((i) => i.id === id);
      return current ? [current] : [];
    }
    return children.flatMap((child) => getLeafDescendants(child.id));
  };

  const leaves = getLeafDescendants(parentId);
  const activeLeaves = leaves.filter((leaf) => leaf.status !== 'cancelled');

  if (activeLeaves.length === 0) {
    return { percent: 0, totalCount: leaves.length, activeCount: 0 };
  }

  const sum = activeLeaves.reduce((acc, leaf) => {
    if (leaf.status === 'completed') return acc + 100;
    return acc + (leaf.progress_percent ?? 0);
  }, 0);

  const percent = Math.round(sum / activeLeaves.length);
  return { percent, totalCount: leaves.length, activeCount: activeLeaves.length };
};

// Helper: CSS classes for status badges and selects
const getStatusStyleClass = (status?: WbsStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400';
    case 'blocked':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400';
    case 'in_review':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400';
    case 'cancelled':
      return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400';
    case 'ready':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-400';
    case 'draft':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    case 'not_started':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300';
  }
};

const getStatusLabel = (status?: WbsStatus) => {
  switch (status) {
    case 'not_started': return 'Belum Mulai';
    case 'in_progress': return 'Sedang Berjalan';
    case 'blocked': return 'Terhambat';
    case 'in_review': return 'Dalam Peninjauan';
    case 'completed': return 'Selesai';
    case 'cancelled': return 'Dibatalkan';
    case 'ready': return 'Siap';
    case 'draft': return 'Draft';
    default: return 'Belum Mulai';
  }
};

export interface RawBudgetItem {
  id: string;
  wbs_item_id: string | null;
  volume: number | null;
  unit_price_idr: number | null;
  actual_amount_idr: number | null;
}

export interface WbsBudgetRollup {
  plannedTotal: number;
  realizedTotal: number | null;
  hasRealization: boolean;
  itemCount: number;
  burnPercent: number | null;
  remainingBudget: number | null;
}

// Auto-resizing textarea for multi-line WBS Tree activity descriptions
const AutoResizingTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  testId,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
  disabled?: boolean;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      data-testid={testId}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      className={`resize-none overflow-hidden bg-transparent py-0.5 text-xs font-medium focus:outline-none border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-primary w-full whitespace-normal break-words ${className}`}
    />
  );
};

interface WBSBuilderProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
  onWbsSaved?: () => void;
  onNavigateToBudget?: (wbsItemId?: string) => void;
}

export default function WBSBuilder({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya',
  onWbsSaved,
  onNavigateToBudget
}: WBSBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');
  const [budgetTotals, setBudgetTotals] = useState<Record<string, number>>({});
  const [rawBudgetItems, setRawBudgetItems] = useState<RawBudgetItem[]>([]);
  const [carbonMode, setCarbonMode] = useState(false);

  // Dynamic Row Heights tracking for auto-height text wrapping alignment
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useLayoutEffect(() => {
    const newHeights: Record<string, number> = {};
    let changed = false;
    Object.entries(leftRowRefs.current).forEach(([id, el]) => {
      if (el) {
        const h = el.offsetHeight;
        if (h && rowHeights[id] !== h) {
          newHeights[id] = h;
          changed = true;
        }
      }
    });
    if (changed) {
      setRowHeights((prev) => ({ ...prev, ...newHeights }));
    }
  });

  // Completion Claims & Evidence State (WBS-P1A-3B)
  const [claims, setClaims] = useState<WbsCompletionClaim[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, WbsCompletionEvidence[]>>({});
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Claim Submission & Revision Dialog States
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [activeTrackingItem, setActiveTrackingItem] = useState<WbsItem | null>(null);
  const [existingClaim, setExistingClaim] = useState<WbsCompletionClaim | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [claimedProgress, setClaimedProgress] = useState<number>(100);
  const [newEvidences, setNewEvidences] = useState<Array<{
    evidence_type: WbsEvidenceType;
    title: string;
    description: string;
    storage_reference: string;
    selectedFile?: File | null;
  }>>([]);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Verifier Review Queue States
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'submitted' | 'verified' | 'needs_revision' | 'rejected' | 'all'>('submitted');
  const [reviewingClaimId, setReviewingClaimId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Organization Members State for Owner & Reviewer Assignment (Sprint 2)
  const [orgMembers, setOrgMembers] = useState<Array<{ user_id: string; full_name: string; email: string }>>([]);

  const loadOrgMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data: members, error: memErr } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId);

      if (memErr) throw memErr;
      if (!members || members.length === 0) return;

      const userIds = members.map((m) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return;

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (!profErr && profiles) {
        setOrgMembers(
          profiles.map((p) => ({
            user_id: p.id,
            full_name: p.full_name || p.email || 'Anggota Tim',
            email: p.email || '',
          }))
        );
      }
    } catch (err) {
      console.warn('[WBSBuilder] Error loading org members for ownership:', err);
    }
  }, [orgId]);


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
    const activities = (wbsItems ?? []).filter((i) => i.level === 2);
    const es: Record<string, number> = {};
    const ef: Record<string, number> = {};

    // Initialize early start/finish in weeks
    activities.forEach((act) => {
      if (act) {
        const startWeek = ((act.start_month ?? 1) - 1) * 4;
        es[act.id] = startWeek;
        ef[act.id] = startWeek + (act.duration_weeks ?? 0);
      }
    });

    // Forward pass relaxation
    for (let k = 0; k < activities.length; k++) {
      let changed = false;
      activities.forEach((act) => {
        if (act) {
          const deps = act.dependencies || [];
          let maxDepFinish = ((act.start_month ?? 1) - 1) * 4;
          deps.forEach((depId) => {
            if (ef[depId] !== undefined && ef[depId] > maxDepFinish) {
              maxDepFinish = ef[depId];
            }
          });
          if (es[act.id] < maxDepFinish) {
            es[act.id] = maxDepFinish;
            ef[act.id] = maxDepFinish + (act.duration_weeks ?? 0);
            changed = true;
          }
        }
      });
      if (!changed) break;
    }

    // Backward pass
    const lf: Record<string, number> = {};
    const ls: Record<string, number> = {};
    const maxFinish = Math.max(...Object.values(ef), 0);
    activities.forEach((act) => {
      if (act) {
        lf[act.id] = maxFinish;
        ls[act.id] = maxFinish - (act.duration_weeks ?? 0);
      }
    });

    for (let k = 0; k < activities.length; k++) {
      let changed = false;
      activities.forEach((act) => {
        if (act) {
          const dependents = activities.filter((dep) => dep && dep.dependencies?.includes(act.id));
          let minDepStart = maxFinish;
          dependents.forEach((dep) => {
            if (dep && ls[dep.id] !== undefined && ls[dep.id] < minDepStart) {
              minDepStart = ls[dep.id];
            }
          });
          if (lf[act.id] > minDepStart) {
            lf[act.id] = minDepStart;
            ls[act.id] = minDepStart - (act.duration_weeks ?? 0);
            changed = true;
          }
        }
      });
      if (!changed) break;
    }

    const criticalPathIds = new Set<string>();
    activities.forEach((act) => {
      if (act) {
        const slack = ls[act.id] - es[act.id];
        const hasChain = (act.dependencies && act.dependencies.length > 0) ||
                          activities.some((dep) => dep && dep.dependencies?.includes(act.id));
        if (slack <= 0 && hasChain) {
          criticalPathIds.add(act.id);
        }
      }
    });

    return { es, ef, criticalPathIds };
  };

  const { es, ef, criticalPathIds } = useMemo(() => getCpmStatus(), [wbsItems]);

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
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('lfa_budget_items')
        .select('id, wbs_item_id, volume, unit_price_idr, actual_amount_idr')
        .eq('lfa_project_id', projectId);
      
      if (!error && data) {
        setRawBudgetItems(data as RawBudgetItem[]);
        
        const totals: Record<string, number> = {};
        data.forEach((item) => {
          if (item && item.wbs_item_id) {
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

  // Helper: Get all descendant WBS item IDs (including the item itself)
  const getSubtreeWbsIds = (itemId: string): string[] => {
    const ids: string[] = [itemId];
    const findChildren = (parentId: string) => {
      const children = wbsItems.filter((i) => i.parent_id === parentId);
      for (const child of children) {
        ids.push(child.id);
        findChildren(child.id);
      }
    };
    findChildren(itemId);
    return ids;
  };

  // Helper: Compute budget roll-up summary for a set of WBS item IDs
  const computeBudgetRollup = (wbsIds: string[]): WbsBudgetRollup => {
    const linkedItems = rawBudgetItems.filter((b) => b.wbs_item_id && wbsIds.includes(b.wbs_item_id));

    if (linkedItems.length === 0) {
      return {
        plannedTotal: 0,
        realizedTotal: null,
        hasRealization: false,
        itemCount: 0,
        burnPercent: null,
        remainingBudget: null,
      };
    }

    let plannedTotal = 0;
    let realizedTotal = 0;
    let hasRealization = false;

    linkedItems.forEach((b) => {
      const vol = Number(b.volume) || 1;
      const price = Number(b.unit_price_idr) || 0;
      plannedTotal += vol * price;

      if (b.actual_amount_idr !== null && b.actual_amount_idr !== undefined && (b.actual_amount_idr as any) !== '') {
        hasRealization = true;
        realizedTotal += Number(b.actual_amount_idr) || 0;
      }
    });

    const finalRealized = hasRealization ? realizedTotal : null;
    const remaining = hasRealization ? plannedTotal - realizedTotal : null;
    const burn = hasRealization && plannedTotal > 0 ? Math.round((realizedTotal / plannedTotal) * 100) : null;

    return {
      plannedTotal,
      realizedTotal: finalRealized,
      hasRealization,
      itemCount: linkedItems.length,
      burnPercent: burn,
      remainingBudget: remaining,
    };
  };

  // Program Total Roll-up (All budget items linked to any WBS item in the project)
  const programBudgetRollup = useMemo(() => {
    const allWbsIds = wbsItems.map((i) => i.id);
    return computeBudgetRollup(allWbsIds);
  }, [wbsItems, rawBudgetItems]);

  // Load Claims and Evidence (WBS-P1A-3B)
  const loadClaimsAndEvidence = async () => {
    if (!orgId || !projectId) return;
    setLoadingClaims(true);
    try {
      const { data: claimsData, error: claimErr } = await supabase
        .from('wbs_completion_claims')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('created_at', { ascending: false });

      if (claimErr) throw claimErr;

      if (claimsData) {
        setClaims(claimsData as WbsCompletionClaim[]);

        const claimIds = claimsData.map((c) => c.id);
        if (claimIds.length > 0) {
          const { data: evidenceData, error: evErr } = await supabase
            .from('wbs_completion_evidence')
            .select('*')
            .in('claim_id', claimIds)
            .order('uploaded_at', { ascending: true });

          if (!evErr && evidenceData) {
            const map: Record<string, WbsCompletionEvidence[]> = {};
            (evidenceData as WbsCompletionEvidence[]).forEach((ev) => {
              if (!map[ev.claim_id]) map[ev.claim_id] = [];
              map[ev.claim_id].push(ev);
            });
            setEvidenceMap(map);
          }
        } else {
          setEvidenceMap({});
        }
      }
    } catch (err: any) {
      console.error('[Impactory] Failed to load completion claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  const getActiveClaim = (wbsItemId: string): WbsCompletionClaim | undefined => {
    return claims.find((c) => c.wbs_item_id === wbsItemId && c.status !== 'cancelled');
  };

  const getEvidenceForClaim = (claimId?: string): WbsCompletionEvidence[] => {
    if (!claimId) return [];
    return evidenceMap[claimId] || [];
  };

  const getClaimBadgeStyle = (status: WbsCompletionClaimStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'submitted':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
      case 'cancelled':
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getClaimLabel = (status: WbsCompletionClaimStatus) => {
    switch (status) {
      case 'verified': return 'Terverifikasi';
      case 'submitted': return 'Menunggu Verifikasi';
      case 'needs_revision': return 'Perlu Perbaikan';
      case 'rejected': return 'Ditolak';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Dibatalkan';
      default: return 'Belum Ada Klaim';
    }
  };

  // Load WBS Items
  const loadWbsItems = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      void loadBudgetTotals();
      void loadClaimsAndEvidence();
      void loadOrgMembers();

      const { data, error: wbsError } = await supabase
        .from('lfa_wbs_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (wbsError) throw wbsError;

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
      console.error('[Impactory] Error loading WBS items:', err);
      setError(err instanceof Error ? err : new Error(err?.message || 'Gagal memuat WBS'));
      toast({
        title: 'Gagal memuat WBS',
        description: err?.message || 'Gagal memuat WBS',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Perform Auto-Import
  const performAutoImport = async () => {
    if (!orgId) return;
    try {
      // 1. Fetch LFA Entries
      const { data: entries, error: eErr } = await supabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence', { ascending: true });

      if (eErr) throw eErr;

      const outputs = (entries || []).filter((e) => e && e.level === 'output');
      const activities = (entries || []).filter((e) => e && e.level === 'activity');

      if (outputs.length === 0) {
        setWbsItems([]);
        return;
      }

      const newWbsItems: WbsItem[] = [];
      let globalSortOrder = 0;

      for (const out of outputs) {
        if (out) {
          const level1Id = crypto.randomUUID();
          const level1Item: WbsItem = {
            id: level1Id,
            lfa_project_id: projectId,
            lfa_entry_id: out.id || null,
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
          const childActs = activities.filter((act) => act && act.parent_id === out.id);
          for (const act of childActs) {
            if (act) {
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
        }
      }

      // Write to Supabase in bulk
      if (newWbsItems.length > 0) {
        const { error: insErr } = await supabase
          .from('lfa_wbs_items')
          .insert(newWbsItems);

        if (insErr) throw insErr;

        /**
         * Auto-populate ONE default empty budget row for each Level 2 WBS
         * activity — but only when the project has no budget at all yet.
         *
         * The generate pipeline now writes real budget lines from the model's
         * budget_hints, rescaled to the author's total, and those rows carry a
         * NULL wbs_item_id because WBS does not exist when they are written. The
         * per-item NOT EXISTS check below is keyed on wbs_item_id, so it does not
         * see them and would stack a "Rincian anggaran belum diisi" placeholder on
         * top of every real line the moment this page was opened. Checking the
         * project as a whole is what actually prevents that.
         */
        const { count: existingBudgetCount } = await supabase
          .from('lfa_budget_items')
          .select('id', { count: 'exact', head: true })
          .eq('lfa_project_id', projectId);

        const level2Items = existingBudgetCount && existingBudgetCount > 0
          ? []
          : newWbsItems.filter((i) => i.level === 2);

        if (existingBudgetCount && existingBudgetCount > 0) {
          console.log(`[Impactory] Skipping placeholder budget rows; ${existingBudgetCount} budget lines already exist.`);
        }

        if (level2Items.length > 0) {
          const defaultBudgetItems = level2Items.map((act) => ({
            lfa_project_id: projectId,
            org_id: orgId,
            wbs_item_id: act.id,
            activity_name: act.name || 'Aktivitas WBS',
            item_name: 'Rincian anggaran belum diisi',
            category: 'Operasional',
            cost_category: 'Direct Operational Costs',
            volume: 0,
            unit: 'Paket',
            unit_price_idr: 0,
            funding_source: 'grant',
            justification: 'Belum diisi',
            needs_donor_approval: false,
            sort_order: 0,
            mode: 'simple'
          }));

          const { error: bgtErr } = await supabase
            .from('lfa_budget_items')
            .insert(defaultBudgetItems);

          if (bgtErr) {
            console.warn('[Impactory] Auto-populate default budget items failed:', bgtErr);
          }
        }

        setWbsItems(newWbsItems);
        toast({
          title: 'Auto-Import Berhasil ✨',
          description: 'WBS & kerangka anggaran diisi otomatis. Lengkapi detail rincian.',
        });
        if (onWbsSaved) onWbsSaved();
      }
    } catch (err: any) {
      console.error('[Impactory] Auto import failed:', err);
      toast({
        title: 'Auto-import Gagal',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (projectId && orgId) {
      void loadWbsItems();
    }
  }, [projectId, orgId]);

  // Claim Submission & Revision Handlers (WBS-P1A-3B)
  const handleOpenClaimDialog = (item: WbsItem, existing?: WbsCompletionClaim) => {
    setActiveTrackingItem(item);
    setExistingClaim(existing || null);
    setClaimNote(existing?.claim_note || '');
    setClaimedProgress(existing?.claimed_progress ?? item.progress_percent ?? (item.status === 'completed' ? 100 : 0));
    setNewEvidences([]);
    setClaimDialogOpen(true);
  };

  const handleAddEvidenceField = () => {
    setNewEvidences((prev) => [
      ...prev,
      { evidence_type: 'link', title: '', description: '', storage_reference: '' }
    ]);
  };

  const handleRemoveEvidenceField = (index: number) => {
    setNewEvidences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitClaim = async () => {
    if (!activeTrackingItem || !orgId || !projectId) return;

    setSubmittingClaim(true);
    try {
      let claimId = existingClaim?.id;

      if (existingClaim && existingClaim.status === 'needs_revision') {
        // Resubmit claim needing revision
        const { error: updateErr } = await supabase
          .from('wbs_completion_claims')
          .update({
            claim_note: claimNote,
            claimed_progress: claimedProgress,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            review_note: null,
          })
          .eq('id', existingClaim.id);

        if (updateErr) throw updateErr;
      } else {
        /**
         * Create fresh claim.
         *
         * claimed_by is deliberately absent: handle_wbs_completion_claim_audit
         * forces it to auth.uid() on insert and raises when there is no
         * authenticated context, so the server owns who claimed what and a
         * client cannot file a claim under another person's name. The generated
         * row type cannot express "a trigger fills this", which is why the cast
         * below stands in place of a value.
         */
        const claimRow: Omit<WbsClaimInsert, 'claimed_by'> = {
          org_id: orgId,
          lfa_project_id: projectId,
          wbs_item_id: activeTrackingItem.id,
          claim_note: claimNote,
          claimed_progress: claimedProgress,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        };
        const { data: newClaim, error: insertErr } = await supabase
          .from('wbs_completion_claims')
          .insert(claimRow as WbsClaimInsert)
          .select()
          .single();

        if (insertErr) throw insertErr;
        claimId = newClaim.id;
      }

      // Insert attached evidence items
      const validEvidences = newEvidences.filter(
        (e) => e.selectedFile || e.storage_reference.trim().length > 0 || e.title.trim().length > 0
      );
      if (validEvidences.length > 0 && claimId) {
        // Upload any selected files to OneDrive via Graph API
        const evidenceRows = [];
        for (const e of validEvidences) {
          let finalType: WbsEvidenceType = e.evidence_type;
          let finalRef = e.storage_reference.trim();

          if (e.selectedFile) {
            const documentId = crypto.randomUUID();
            const formData = new FormData();
            formData.append('file', e.selectedFile);
            formData.append('organizationId', orgId);
            formData.append('documentId', documentId);
            formData.append('fileName', e.selectedFile.name);
            formData.append('folderType', 'wbs_evidence');

            const { data: uploadResult, error: funcErr } = await supabase.functions.invoke('onedrive-upload', {
              body: formData,
            });

            if (funcErr || !uploadResult) {
              throw new Error(`Upload file "${e.selectedFile.name}" ke OneDrive gagal: ${funcErr?.message || 'Gagal memanggil fungsi edge'}`);
            }

            finalType = 'onedrive';
            finalRef = uploadResult.webUrl || `${uploadResult.driveId}:${uploadResult.storageItemId}`;
          }

          if (finalRef.length > 0 || e.title.trim().length > 0) {
            evidenceRows.push({
              org_id: orgId,
              claim_id: claimId!,
              evidence_type: finalType,
              title: e.title || (e.selectedFile ? e.selectedFile.name : 'Bukti Penyelesaian'),
              description: e.description || null,
              storage_reference: finalRef,
            });
          }
        }

        if (evidenceRows.length > 0) {
          // Note: Client does NOT send uploaded_by; database trigger handle_wbs_completion_evidence_audit enforces auth.uid() server-side
          const { error: evInsErr } = await supabase
            .from('wbs_completion_evidence')
            .insert(evidenceRows);

          if (evInsErr) throw evInsErr;
        }
      }

      toast({
        title: 'Klaim Penyelesaian Berhasil Diajukan ✨',
        description: 'Klaim Anda telah dikirim ke antrean verifikasi MEAL/Manajemen.',
      });

      setClaimDialogOpen(false);
      await loadClaimsAndEvidence();
    } catch (err: any) {
      console.error('[Impactory] Failed to submit completion claim:', err);
      toast({
        title: 'Gagal Mengajukan Klaim',
        description: err?.message || 'Terjadi kesalahan pada server.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleReviewClaim = async (
    claim: WbsCompletionClaim,
    actionStatus: 'verified' | 'rejected' | 'needs_revision'
  ) => {
    if (!reviewNote && (actionStatus === 'rejected' || actionStatus === 'needs_revision')) {
      toast({
        title: 'Catatan Diperlukan',
        description: 'Harap berikan catatan/alasan untuk penolakan atau permintaan perbaikan.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      // Note: Client does NOT send reviewed_by or reviewed_at — database trigger handle_wbs_completion_claim_audit
      // automatically enforces auth.uid(), NOW(), and Separation of Duties!
      const { error: updateErr } = await supabase
        .from('wbs_completion_claims')
        .update({
          status: actionStatus,
          review_note: reviewNote || null,
        })
        .eq('id', claim.id);

      if (updateErr) throw updateErr;

      toast({
        title: actionStatus === 'verified'
          ? 'Klaim Terverifikasi ✨'
          : actionStatus === 'needs_revision'
          ? 'Permintaan Perbaikan Terkirim'
          : 'Klaim Ditolak',
        description: 'Status verifikasi klaim telah diperbarui.',
      });

      setReviewingClaimId(null);
      setReviewNote('');
      await loadClaimsAndEvidence();
    } catch (err: any) {
      console.error('[Impactory] Failed to review completion claim:', err);
      toast({
        title: 'Gagal Memproses Verifikasi',
        description: err?.message || 'Separation of Duties violation atau kesalahan server.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Sync mode changes to DB
  useEffect(() => {
    if (!wbsItems || wbsItems.length === 0) return;
    const firstMode = wbsItems[0]?.mode;
    if (firstMode !== globalMode) {
      const updated = wbsItems.map((item) => ({ ...item, mode: globalMode }));
      setWbsItems(updated);
      
      // Update DB
      void (async () => {
        if (!orgId) return;
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
          console.error('[Impactory] Failed to sync global mode to DB:', err);
        } finally {
          setSaving(false);
        }
      })();
    }
  }, [globalMode]);

  // Local state update helper
  const updateItemLocally = (updated: WbsItem) => {
    setWbsItems((prev) => (prev ?? []).map((item) => (item.id === updated.id ? updated : item)));
  };

  // Trigger Autosave with Debounce
  const triggerAutosave = (item: WbsItem) => {
    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id]);
    }

    // Validation warning if status is blocked but reason is empty
    if (item.status === 'blocked' && (!item.blocked_reason || item.blocked_reason.trim() === '')) {
      toast({
        title: 'Penjelasan Terhambat Diperlukan',
        description: 'Mohon isi penjelasan kenapa tugas terhambat.',
        variant: 'destructive',
      });
    }

    setSaving(true);
    debounceTimers.current[item.id] = setTimeout(async () => {
      if (!orgId) return;
      try {
        const payload: any = {
          name: item.name,
          start_month: item.start_month,
          duration_weeks: item.duration_weeks,
          pic: item.pic,
          method: item.method,
          indicator: item.indicator,
          notes: item.notes,
          dependencies: item.dependencies || [],
          sort_order: item.sort_order,
          mode: item.mode,
          carbon_enabled: item.carbon_enabled,
          carbon_factor: item.carbon_factor,
          carbon_unit: item.carbon_unit,
          carbon_source: item.carbon_source,
          carbon_description: item.carbon_description,
          carbon_quantity: item.carbon_quantity,
          carbon_scope: item.carbon_scope,
          status: item.status || 'not_started',
          progress_percent: item.status === 'completed' ? 100 : (item.progress_percent ?? 0),
          blocked_reason: item.status === 'blocked' ? item.blocked_reason : null,
        };

        // NOTE: completed_at and completed_by are omitted intentionally.
        // They are automatically assigned on the server by the database completion-attribution trigger.

        const { error } = await supabase
          .from('lfa_wbs_items')
          .update(payload)
          .eq('id', item.id);

        if (error) throw error;
        setLastSaved(new Date());
        if (onWbsSaved) onWbsSaved();
      } catch (err) {
        console.error('[Impactory] Failed to autosave WBS item:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  // Add Level 3 (Sub-aktivitas)
  const handleAddSubActivity = async (parentActivityId: string) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const newId = crypto.randomUUID();
      const parentItem = (wbsItems ?? []).find((i) => i.id === parentActivityId);
      if (!parentItem) return;

      // Find children to determine sort_order
      const children = (wbsItems ?? []).filter((i) => i.parent_id === parentActivityId);
      const parentIdx = (wbsItems ?? []).findIndex((i) => i.id === parentActivityId);

      const targetLevel = (parentItem.level || 1) + 1;

      const newItem: WbsItem = {
        id: newId,
        lfa_project_id: projectId,
        org_id: orgId,
        level: targetLevel as 1 | 2 | 3 | 4,
        parent_id: parentActivityId,
        name: '',
        start_month: parentItem.start_month,
        duration_weeks: 2, // default 2 weeks
        sort_order: parentItem.sort_order + children.length + 1,
        mode: globalMode,
        status: 'not_started',
        progress_percent: 0,
        dependencies: []
      };

      // Insert locally
      const updatedList = [...(wbsItems ?? [])];
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
          mode: newItem.mode,
          status: 'not_started',
          progress_percent: 0
        });

      if (error) throw error;

      if (newItem.level === 2) {
        await supabase
          .from('lfa_budget_items')
          .insert({
            lfa_project_id: newItem.lfa_project_id,
            org_id: newItem.org_id,
            wbs_item_id: newItem.id,
            activity_name: newItem.name || 'Aktivitas Baru',
            item_name: 'Rincian anggaran belum diisi',
            category: 'Operasional',
            cost_category: 'Direct Operational Costs',
            volume: 0,
            unit: 'Paket',
            unit_price_idr: 0,
            funding_source: 'grant',
            justification: 'Belum diisi',
            needs_donor_approval: false,
            sort_order: 0,
            mode: newItem.mode || 'simple'
          });
      }

      setWbsItems(reindexed);
      setLastSaved(new Date());
      if (onWbsSaved) onWbsSaved();
      toast({ title: 'Tersimpan' });
    } catch (err: any) {
      console.error('[Impactory] Error adding sub-activity:', err);
      toast({
        title: 'Gagal menyimpan',
        description: err?.message ?? 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Add Level 4 (Task)
  const handleAddTask = async (parentSubId: string) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const newId = crypto.randomUUID();
      const parentItem = (wbsItems ?? []).find((i) => i.id === parentSubId);
      if (!parentItem) return;

      const children = (wbsItems ?? []).filter((i) => i.parent_id === parentSubId);
      const parentIdx = (wbsItems ?? []).findIndex((i) => i.id === parentSubId);

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
        status: 'not_started',
        progress_percent: 0,
        dependencies: []
      };

      const updatedList = [...(wbsItems ?? [])];
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
          mode: newItem.mode,
          status: 'not_started',
          progress_percent: 0
        });

      if (error) throw error;

      setWbsItems(reindexed);
      setLastSaved(new Date());
      if (onWbsSaved) onWbsSaved();
      toast({ title: 'Tersimpan' });
    } catch (err: any) {
      console.error('[Impactory] Error adding task:', err);
      toast({
        title: 'Gagal menyimpan',
        description: err?.message ?? 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const [deleteWbsItemId, setDeleteWbsItemId] = useState<string | null>(null);

  const executeDeleteWbsItem = async () => {
    if (!orgId || !deleteWbsItemId) return;
    const itemId = deleteWbsItemId;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_wbs_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const filterOutRecursive = (id: string, list: WbsItem[]): string[] => {
        const ids = [id];
        const children = (list ?? []).filter((item) => item.parent_id === id);
        children.forEach((c) => {
          ids.push(...filterOutRecursive(c.id, list));
        });
        return ids;
      };

      const idsToRemove = new Set(filterOutRecursive(itemId, wbsItems ?? []));
      setWbsItems((prev) => (prev ?? []).filter((item) => !idsToRemove.has(item.id)));
      setLastSaved(new Date());

      toast({
        title: 'Item Dihapus',
        description: 'Item WBS dan seluruh turunannya berhasil dihapus.',
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal Menghapus Item',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setDeleteWbsItemId(null);
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
          ${appStylesheetTags()}
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
            <button data-print-trigger class="px-4 py-2 bg-emerald-600 text-white rounded font-bold shadow hover:bg-emerald-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Dokumen / Simpan PDF
            </button>
          </div>
        </body>
      </html>
    `);

    finalizePrintWindow(printWindow);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <p className="text-red-500 text-sm">
          Gagal memuat data.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-teal-600 underline">
          Muat Ulang
        </button>
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

          {/* Carbon Analysis Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 px-3 rounded-lg border">
            <input
              type="checkbox"
              id="carbonModeToggle"
              checked={carbonMode}
              onChange={(e) => setCarbonMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="carbonModeToggle" className="text-[11px] font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300 flex items-center gap-1">
              🌱 Aktifkan Analisis Lingkungan (Opsional)
            </label>
          </div>

          {/* Verifier Review Queue Button (WBS-P1A-3B) */}
          {(() => {
            const pendingCount = claims.filter((c) => c.status === 'submitted').length;
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewQueueOpen(true)}
                className="text-xs font-semibold relative bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                data-testid="wbs-review-queue-btn"
              >
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Antrean Verifikasi</span>
                {pendingCount > 0 && (
                  <Badge
                    className="ml-1.5 bg-amber-600 text-white text-[9px] h-4 px-1.5 py-0 rounded-full font-bold"
                    data-testid="wbs-pending-claims-badge"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            );
          })()}

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

      {/* PROGRAM-LEVEL BUDGET ROLL-UP SUMMARY */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 px-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Total Anggaran Program:</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
              {formatBudgetBadge(programBudgetRollup.plannedTotal)}
            </span>
          </div>
          
          <span className="text-slate-300 dark:text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Realisasi:</span>
            {programBudgetRollup.hasRealization ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {formatBudgetBadge(programBudgetRollup.realizedTotal || 0)}
                {programBudgetRollup.burnPercent !== null && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                    Burn {programBudgetRollup.burnPercent}%
                  </Badge>
                )}
              </span>
            ) : (
              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border">
                Belum ada data realisasi
              </Badge>
            )}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <span className="text-slate-500 text-[11px]">
            {programBudgetRollup.itemCount} item anggaran
          </span>
        </div>

        {onNavigateToBudget && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToBudget()}
            className="h-7 text-[11px] gap-1.5 text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-100/50"
          >
            <ExternalLink className="h-3 w-3" />
            Lihat Rincian Anggaran
          </Button>
        )}
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        
        {/* LEFT COLUMN (60%): Interactive Tree Sheet */}
        <div className="lg:col-span-3 border-r divide-y overflow-x-auto min-w-0 max-h-[600px] overflow-y-auto">
          {/* Row Headers */}
          <div className="flex bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500 py-3 px-4 min-w-[980px] gap-2">
            <div className="flex-1 min-w-[280px]">Deskripsi WBS Tree</div>
            <div className="w-16 text-center shrink-0">Progres</div>
            <div className="w-24 text-center shrink-0">Status</div>
            <div className="w-14 text-center shrink-0">Bulan</div>
            <div className="w-14 text-center shrink-0">Mgg/Hari</div>
            <div className="w-20 text-left shrink-0">PIC</div>
            <div className="w-24 text-left shrink-0">Owner</div>
            <div className="w-24 text-left shrink-0">Reviewer</div>
            {globalMode === 'professional' && <div className="w-20 text-left shrink-0">Metode</div>}
            <div className="w-8 shrink-0"></div>
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

              const isLeaf = isLeafItem(item, wbsItems);
              const computed = (!isLeaf || item.level === 1) ? computeParentProgress(item.id, wbsItems) : null;

              let indentStyle = '';
              const rowHeightClass = 'min-h-[42px] py-2';
              let rowStyle = `px-4 flex items-center min-w-[850px] gap-2 transition-all ${rowHeightClass} `;

              if (item.level === 1) {
                indentStyle = `border-l-4 ${theme.border} bg-slate-100/70 dark:bg-slate-800/30 font-bold border-t border-b border-slate-200/50 dark:border-slate-800/50`;
              } else if (item.level === 2) {
                indentStyle = 'pl-8 bg-white dark:bg-slate-900 font-medium';
              } else if (item.level === 3) {
                indentStyle = 'pl-14 bg-slate-50/40 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300';
              } else if (item.level === 4) {
                indentStyle = 'pl-20 bg-slate-50/60 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 text-xs';
              }

              // Filter out level 4 if simple mode
              if (item.level === 4 && globalMode === 'simple') return null;

              return (
                <Fragment key={item.id}>
                  <div
                    ref={(el) => (leftRowRefs.current[item.id] = el)}
                    className={`${rowStyle} ${indentStyle}`}
                  >
                    {/* Row Body Left Side */}
                    <div className="flex-1 flex items-start gap-1.5 min-w-[280px]">
                      {/* Row level tag */}
                      {item.level === 1 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-900 text-white shrink-0 mt-0.5">H</span>}
                      {item.level === 2 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white shrink-0 mt-0.5">K</span>}
                      {item.level === 3 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500 text-white shrink-0 mt-0.5">Sub</span>}
                      {item.level === 4 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-400 text-white shrink-0 mt-0.5">Task</span>}

                      {/* Inline edit input / Title text */}
                      {item.level === 1 ? (
                        <span
                          className={`text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-normal break-words flex-1 min-w-0 leading-snug py-0.5 ${
                            item.status === 'cancelled' ? 'line-through opacity-60' : ''
                          }`}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      ) : (
                        <AutoResizingTextarea
                          value={item.name}
                          testId="wbs-activity-name-input"
                          placeholder={
                            item.level === 2 ? 'Ketik nama aktivitas...' :
                            item.level === 3 ? 'Ketik sub-aktivitas...' : 'Ketik detail task...'
                          }
                          onChange={(val) => {
                            const updated = { ...item, name: val };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className={`text-xs flex-1 min-w-0 font-medium leading-snug ${
                            item.status === 'cancelled' ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        />
                      )}

                      {/* On-Demand Detail Popover Button */}
                      {(() => {
                        const activityWbsIds = getSubtreeWbsIds(item.id);
                        const rollup = computeBudgetRollup(activityWbsIds);
                        const hasBudget = rollup.plannedTotal > 0 || rollup.itemCount > 0;
                        const activeClaim = isLeaf ? getActiveClaim(item.id) : null;
                        const evidences = activeClaim ? getEvidenceForClaim(activeClaim.id) : [];
                        const evCount = evidences.length;

                        const physicalPercent = !isLeaf || item.level === 1
                          ? (computed?.percent ?? 0)
                          : (item.status === 'completed' ? 100 : (item.progress_percent ?? 0));

                        const varianceFlag = computeEvmVarianceFlag(
                          physicalPercent,
                          rollup.plannedTotal,
                          rollup.realizedTotal || 0,
                          rollup.itemCount
                        );

                        let triggerBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                        if (activeClaim) {
                          if (activeClaim.status === 'verified') triggerBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
                          else if (activeClaim.status === 'submitted') triggerBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300';
                          else if (activeClaim.status === 'rejected') triggerBadgeClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300';
                        } else if (hasBudget) {
                          triggerBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
                        }

                        return (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* EVM Variance Badge on Row */}
                            {varianceFlag && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={`py-0.5 px-1.5 text-[8.5px] font-bold tracking-tight shrink-0 flex items-center gap-1 cursor-help ${
                                        varianceFlag.type === 'high_physical'
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                          : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                      }`}
                                      data-testid={`wbs-variance-flag-${varianceFlag.type}`}
                                    >
                                      <AlertTriangle className={`w-2.5 h-2.5 shrink-0 ${varianceFlag.type === 'high_physical' ? 'text-amber-600' : 'text-rose-600'}`} />
                                      <span>{varianceFlag.badgeLabel}</span>
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs space-y-1 p-2">
                                    <p className="font-bold">{varianceFlag.message}</p>
                                    <p className="text-[10px] opacity-80 font-mono">
                                      Progres Fisik WBS: {varianceFlag.physicalPercent}% | Realisasi Keuangan: {varianceFlag.financialPercent}%
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-semibold border shrink-0 h-5 transition-colors cursor-pointer ${triggerBadgeClass}`}
                                  title="Klik untuk rincian anggaran & klaim verifikasi"
                                  data-testid="wbs-row-detail-popover-trigger"
                                >
                                  {hasBudget && <Wallet className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                  {isLeaf && <ClipboardCheck className="h-2.5 w-2.5 shrink-0" />}
                                  <span>Rincian</span>
                                  {evCount > 0 && (
                                    <span className="bg-indigo-600 text-white rounded-full text-[7.5px] px-1 font-bold shrink-0">{evCount}</span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3 space-y-3 shadow-lg border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" align="start" side="bottom" sideOffset={4}>
                                <div className="border-b pb-1.5 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                  <span className="truncate pr-2">{item.name || 'Detail Item WBS'}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase text-slate-500 font-semibold shrink-0">
                                    Level {item.level}
                                  </span>
                                </div>

                                {/* EVM Variance Warning Banner inside Popover */}
                                {varianceFlag && (
                                  <div className={`p-2 rounded border text-xs space-y-1 ${
                                    varianceFlag.type === 'high_physical'
                                      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
                                      : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                                  }`}>
                                    <div className="font-bold flex items-center gap-1 text-[10.5px]">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Sinyal Evaluasi EVM</span>
                                    </div>
                                    <p className="text-[10px] leading-snug">{varianceFlag.message}</p>
                                    <div className="text-[9.5px] opacity-90 font-mono pt-0.5">
                                      Progres Fisik: {varianceFlag.physicalPercent}% vs Realisasi Keuangan: {varianceFlag.financialPercent}%
                                    </div>
                                  </div>
                                )}

                                {/* Budget Section */}
                                {(rollup.plannedTotal > 0 || rollup.itemCount > 0 || item.level === 1 || item.level === 2) && (
                                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <Wallet className="h-3 w-3 text-emerald-600" />
                                        Rincian Anggaran
                                      </span>
                                      {onNavigateToBudget && (
                                        <button
                                          onClick={() => onNavigateToBudget(item.id)}
                                          className="text-[9px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                                          title="Lihat Rincian Anggaran di Modul Anggaran"
                                        >
                                          <span>Buka Modul</span>
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                      <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 py-0.5 h-auto">
                                        <span>Planned: {formatBudgetBadge(rollup.plannedTotal)}</span>
                                        <span className="text-[8px] text-emerald-600 font-normal ml-1">({rollup.itemCount} item)</span>
                                      </Badge>

                                      {rollup.hasRealization ? (
                                        <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200 py-0.5 h-auto">
                                          Real: {formatBudgetBadge(rollup.realizedTotal || 0)} {rollup.burnPercent !== null ? `(${rollup.burnPercent}%)` : ''}
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 py-0.5 h-auto">
                                          Belum ada data realisasi
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Verification Claim & Evidence Section for Leaf Items */}
                              {isLeaf && (
                                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <ClipboardCheck className="h-3 w-3 text-amber-600" />
                                    Status Verifikasi & Bukti
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5" data-testid="wbs-claim-badge-group">
                                    {activeClaim ? (
                                      <Badge
                                        variant="outline"
                                        onClick={() => handleOpenClaimDialog(item, activeClaim)}
                                        className={`text-[9px] font-bold cursor-pointer py-0.5 px-2 h-auto flex items-center gap-1 border ${getClaimBadgeStyle(activeClaim.status)}`}
                                        title={`Status Klaim Verifikasi: ${getClaimLabel(activeClaim.status)}. Klik untuk lihat detail.`}
                                        data-testid={`wbs-claim-badge-${activeClaim.status}`}
                                      >
                                        <ClipboardCheck className="h-3 w-3" />
                                        <span>Klaim: {getClaimLabel(activeClaim.status)}</span>
                                      </Badge>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenClaimDialog(item)}
                                        className="text-[9px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded px-2 py-0.5 font-semibold flex items-center gap-1 transition-colors"
                                        title="Ajukan Klaim Selesai & Lampirkan Bukti untuk Item Ini"
                                        data-testid="wbs-open-claim-dialog-btn"
                                      >
                                        <Plus className="h-3 w-3" />
                                        <span>Ajukan Klaim Selesai</span>
                                      </button>
                                    )}

                                    {evCount > 0 && (
                                      <Badge
                                        variant="secondary"
                                        onClick={() => activeClaim && handleOpenClaimDialog(item, activeClaim)}
                                        className="text-[9px] font-semibold py-0.5 px-2 h-auto bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border cursor-pointer hover:bg-slate-200"
                                        title={`${evCount} bukti terlampir`}
                                        data-testid="wbs-evidence-badge"
                                      >
                                        <FileText className="h-3 w-3 mr-1 text-slate-500" />
                                        <span>{evCount} bukti terlampir</span>
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                               {/* Financial Lifecycle Section (Sprint 3) */}
                               {item.level === 2 && (
                                 <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800">
                                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                     <span className="flex items-center gap-1">
                                       <Wallet className="h-3 w-3 text-indigo-600" />
                                       Status Siklus Keuangan WBS
                                     </span>
                                     <Badge variant="outline" className="text-[8.5px] uppercase font-bold py-0 h-4">
                                       {item.financial_status || 'draft'}
                                     </Badge>
                                   </div>
                                   <select
                                     value={item.financial_status || 'draft'}
                                     data-testid="wbs-financial-status-select"
                                     onChange={(e) => {
                                       const val = e.target.value as WbsFinancialStatus;
                                       const updated = { ...item, financial_status: val };
                                       updateItemLocally(updated);
                                       triggerAutosave(updated);
                                     }}
                                     className="text-xs w-full border bg-white dark:bg-slate-900 rounded p-1 focus:outline-none dark:border-slate-800 font-medium"
                                   >
                                     <option value="draft">💰 Draf Anggaran</option>
                                     <option value="committed">📌 Terikat (Committed)</option>
                                     <option value="disbursement_requested">⏳ Minta Cair (Disbursement Requested)</option>
                                     <option value="paid">✅ Cair / Paid</option>
                                     <option value="blocked_by_finance">⛔ Ditahan Keuangan (Blocked by Finance)</option>
                                   </select>
                                 </div>
                               )}

                               {/* Bottleneck Intelligence Section (Sprint 3) */}
                               {item.level === 2 && (
                                 <div className="space-y-1.5 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded border border-rose-200 dark:border-rose-900/40">
                                   <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                     <AlertTriangle className="h-3 w-3 text-rose-600" />
                                     Bottleneck Intelligence (Akar Keterlambatan)
                                   </div>
                                   <div className="space-y-1.5">
                                     <select
                                       value={item.blocker_category || ''}
                                       data-testid="wbs-blocker-category-select"
                                       onChange={(e) => {
                                         const val = (e.target.value || null) as WbsBlockerCategory | null;
                                         const updated = { ...item, blocker_category: val };
                                         updateItemLocally(updated);
                                         triggerAutosave(updated);
                                       }}
                                       className="text-xs w-full border bg-white dark:bg-slate-900 rounded p-1 focus:outline-none dark:border-slate-800 text-rose-800 dark:text-rose-300 font-medium"
                                     >
                                       <option value="">-- Pilih Kategori Hambatan --</option>
                                       <option value="donor_disbursement">🏛️ Pencairan Donor (Donor Disbursement)</option>
                                       <option value="internal_approval">📑 Persetujuan Internal (Internal Approval)</option>
                                       <option value="vendor_delay">🚚 Keterlambatan Vendor (Vendor Delay)</option>
                                       <option value="field_condition">🌧️ Kondisi Lapangan (Field Condition)</option>
                                       <option value="force_majeure">⚠️ Force Majeure</option>
                                     </select>
                                     <textarea
                                       value={item.blocker_notes || ''}
                                       data-testid="wbs-blocker-notes-input"
                                       placeholder="Catatan kendala operasional (penjelasan detail penyebab hambatan)..."
                                       onChange={(e) => {
                                         const updated = { ...item, blocker_notes: e.target.value || null };
                                         updateItemLocally(updated);
                                         triggerAutosave(updated);
                                       }}
                                       className="text-xs w-full h-12 border bg-white dark:bg-slate-900 rounded p-1.5 focus:outline-none dark:border-slate-800"
                                     />
                                   </div>
                                 </div>
                               )}
                             </PopoverContent>
                           </Popover>
                        </div>
                      );
                    })()}
                  </div>

                    {/* Progress Column */}
                    <div className="w-20 text-center flex items-center justify-center">
                      {!isLeaf || item.level === 1 ? (
                        <div className="flex flex-col items-center justify-center gap-0.5" title={`Progres roll-up terhitung dari ${computed?.activeCount ?? 0} task aktif`}>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {computed?.activeCount === 0 ? '0%' : `${computed?.percent}%`}
                          </span>
                          <div className="w-12 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${computed?.percent ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.status === 'completed' ? 100 : (item.progress_percent ?? 0)}
                            disabled={item.status === 'completed'}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              const updated = { ...item, progress_percent: val };
                              updateItemLocally(updated);
                              triggerAutosave(updated);
                            }}
                            className="w-11 text-center text-[10px] border rounded p-0.5 h-6 bg-transparent dark:border-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 font-semibold"
                            title={item.status === 'completed' ? 'Otomatis 100% untuk status Selesai' : 'Ubah persentase progres'}
                          />
                          <span className="text-[9px] text-slate-400 font-medium">%</span>
                        </div>
                      )}
                    </div>

                    {/* Status Column */}
                    <div className="w-28 text-center flex items-center justify-center">
                      {!isLeaf || item.level === 1 ? (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          computed?.activeCount === 0
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : computed?.percent === 100
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : (computed?.percent ?? 0) > 0
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {computed?.activeCount === 0
                            ? 'Belum ada task'
                            : computed?.percent === 100
                            ? 'Selesai'
                            : (computed?.percent ?? 0) > 0
                            ? 'Sedang Berjalan'
                            : 'Belum Mulai'}
                        </span>
                      ) : (
                        <select
                          value={item.status || 'not_started'}
                          onChange={(e) => {
                            const newStatus = e.target.value as WbsStatus;
                            const updated: WbsItem = {
                              ...item,
                              status: newStatus,
                              progress_percent: newStatus === 'completed' ? 100 : (item.progress_percent ?? 0),
                              blocked_reason: newStatus === 'blocked' ? (item.blocked_reason ?? '') : null,
                            };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className={`text-[10px] w-full border rounded px-1 h-6 focus:outline-none font-semibold ${getStatusStyleClass(item.status)}`}
                        >
                          <option value="not_started">Belum Mulai</option>
                          <option value="in_progress">Sedang Berjalan</option>
                          <option value="blocked">Terhambat</option>
                          <option value="in_review">Dalam Peninjauan</option>
                          <option value="completed">Selesai</option>
                          <option value="cancelled">Dibatalkan</option>
                          <option value="ready">Siap</option>
                          <option value="draft">Draft</option>
                        </select>
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

                    {/* Owner column (Sprint 2) */}
                    <div className="w-24">
                      {item.level === 2 ? (
                        <select
                          value={item.owner_id || ''}
                          data-testid="wbs-owner-select"
                          onChange={(e) => {
                            const val = e.target.value || null;
                            const updated = { ...item, owner_id: val };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="text-[10px] w-full border bg-transparent rounded px-1 h-6 focus:outline-none dark:border-slate-800 truncate"
                          title="Pelaksana Utama / Activity Owner"
                        >
                          <option value="">-- Owner --</option>
                          {orgMembers.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Reviewer column (Sprint 2) */}
                    <div className="w-24">
                      {item.level === 2 ? (
                        <select
                          value={item.reviewer_id || ''}
                          data-testid="wbs-reviewer-select"
                          onChange={(e) => {
                            const val = e.target.value || null;
                            const updated = { ...item, reviewer_id: val };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="text-[10px] w-full border bg-transparent rounded px-1 h-6 focus:outline-none dark:border-slate-800 truncate"
                          title="Peninjau / Reviewer (Sign-off)"
                        >
                          <option value="">-- Reviewer --</option>
                          {orgMembers.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
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
                          onClick={() => setDeleteWbsItemId(item.id)}
                          title="Hapus"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Blocked Reason Row for leaf items when status === 'blocked' */}
                  {isLeaf && item.status === 'blocked' && (
                    <div className="pl-14 pr-4 py-1.5 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2 min-w-[850px] text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 shrink-0">Alasan Terhambat:</span>
                      <input
                        type="text"
                        value={item.blocked_reason || ''}
                        placeholder="Ketik penjelasan kenapa tugas terhambat (Wajib diisi)..."
                        onChange={(e) => {
                          const updated = { ...item, blocked_reason: e.target.value };
                          updateItemLocally(updated);
                          triggerAutosave(updated);
                        }}
                        className={`text-xs flex-1 bg-white dark:bg-slate-900 border rounded px-2 py-0.5 focus:outline-none ${
                          !item.blocked_reason || item.blocked_reason.trim() === ''
                            ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                      {(!item.blocked_reason || item.blocked_reason.trim() === '') && (
                        <span className="text-[9px] text-red-600 font-bold shrink-0">⚠️ Wajib Diisi</span>
                      )}
                    </div>
                  )}

                  {/* Level 2 Carbon tracking fields under carbonMode */}
                  {item.level === 2 && carbonMode && (
                    <div className="pl-8 pr-4 py-3 bg-emerald-50/20 dark:bg-emerald-950/5 border-b border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-2 min-w-[500px] w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`carbon-enabled-${item.id}`}
                          checked={item.carbon_enabled || false}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            const updated = {
                              ...item,
                              carbon_enabled: enabled,
                              carbon_factor: enabled ? (item.carbon_factor ?? 0) : null,
                              carbon_unit: enabled ? (item.carbon_unit ?? 'kg_co2_per_unit') : null,
                              carbon_source: enabled ? (item.carbon_source ?? '') : null,
                              carbon_description: enabled ? (item.carbon_description ?? '') : null,
                              carbon_quantity: enabled ? (item.carbon_quantity ?? null) : null,
                              carbon_scope: enabled ? (item.carbon_scope ?? null) : null,
                            };
                            updateItemLocally(updated);
                            triggerAutosave(updated);
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`carbon-enabled-${item.id}`}
                          className="text-xs font-bold text-teal-700 dark:text-teal-400 cursor-pointer select-none flex items-center gap-1.5"
                        >
                          🌱 Aktifkan Carbon Tracking per Aktivitas
                        </label>
                      </div>

                      {item.carbon_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-1.5 p-3 bg-white dark:bg-slate-900 border rounded-lg shadow-inner">
                          {/* Template factor selection dropdown */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Template Faktor Emisi</label>
                            <select
                              value={CARBON_FACTORS_INDONESIA.find(f => f.factor === item.carbon_factor && f.unit === item.carbon_unit)?.id || 'custom'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                  const updated = {
                                    ...item,
                                    carbon_source: 'Custom / Manual Input',
                                  };
                                  updateItemLocally(updated);
                                  triggerAutosave(updated);
                                } else {
                                  const factorObj = CARBON_FACTORS_INDONESIA.find(f => f.id === val);
                                  if (factorObj) {
                                    const updated = {
                                      ...item,
                                      carbon_factor: factorObj.factor,
                                      carbon_unit: factorObj.unit,
                                      carbon_source: factorObj.source,
                                      carbon_description: factorObj.name_id,
                                      carbon_scope: (factorObj as any).default_scope || item.carbon_scope,
                                    };
                                    updateItemLocally(updated);
                                    triggerAutosave(updated);
                                  }
                                }
                              }}
                              className="text-xs border rounded px-2 h-8 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              <option value="custom">Custom / Manual Input</option>
                              {CARBON_FACTORS_INDONESIA.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.factor > 0 ? `+${f.factor}` : f.factor} {f.unit_label})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Value input */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faktor (kg CO₂/unit)</label>
                            <input
                              type="number"
                              step="any"
                              value={item.carbon_factor !== null && item.carbon_factor !== undefined ? item.carbon_factor : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                const updated = {
                                  ...item,
                                  carbon_factor: val,
                                };
                                updateItemLocally(updated);
                                triggerAutosave(updated);
                              }}
                              placeholder="Nilai per unit..."
                              className="text-xs border rounded px-2 h-8 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                            />
                          </div>

                          {/* Quantity input */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                              Jumlah / Kuantitas *
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={item.carbon_quantity !== null && item.carbon_quantity !== undefined ? item.carbon_quantity : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                const updated = {
                                  ...item,
                                  carbon_quantity: val,
                                };
                                updateItemLocally(updated);
                                triggerAutosave(updated);
                              }}
                              placeholder={
                                item.carbon_unit === 'kg_co2_per_km' ? 'Jarak (km)...' :
                                item.carbon_unit === 'kg_co2_per_kwh' ? 'Konsumsi (kWh)...' :
                                item.carbon_unit === 'kg_co2_per_event' ? 'Jumlah event...' :
                                'Jumlah unit/pohon...'
                              }
                              className="text-xs border border-teal-500/50 dark:border-teal-500/40 rounded px-2 h-8 bg-teal-50/30 dark:bg-teal-950/20 text-slate-800 dark:text-slate-200 font-medium"
                            />
                          </div>

                          {/* Unit dropdown */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Satuan Emisi</label>
                            <select
                              value={item.carbon_unit || 'kg_co2_per_unit'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = {
                                  ...item,
                                  carbon_unit: val,
                                };
                                updateItemLocally(updated);
                                triggerAutosave(updated);
                              }}
                              className="text-xs border rounded px-2 h-8 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              <option value="kg_co2_per_unit">kg CO₂ / unit</option>
                              <option value="kg_co2_per_km">kg CO₂ / km</option>
                              <option value="kg_co2_per_kwh">kg CO₂ / kWh</option>
                              <option value="kg_co2_per_event">kg CO₂ / event</option>
                            </select>
                          </div>

                          {/* GHG Scope selector */}
                          <div className="flex flex-col gap-1 md:col-span-4">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              GHG Protocol Scope
                            </label>
                            <select
                              value={item.carbon_scope || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : (e.target.value as 'scope_1' | 'scope_2' | 'scope_3');
                                const updated = {
                                  ...item,
                                  carbon_scope: val,
                                };
                                updateItemLocally(updated);
                                triggerAutosave(updated);
                              }}
                              className="text-xs border rounded px-2 h-8 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                            >
                              <option value="">Belum dikategorikan</option>
                              <option value="scope_1">Scope 1 - Emisi Langsung (Kendaraan Operasional / Genset)</option>
                              <option value="scope_2">Scope 2 - Energi Tidak Langsung (Listrik Gedung / PLN)</option>
                              <option value="scope_3">Scope 3 - Rantai Nilai (Perjalanan Dinas / Event / Penanaman / Supplier)</option>
                            </select>
                          </div>

                          {/* Source and Description Inputs */}
                          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/50 pt-2.5 mt-1">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sumber Data Referensi</label>
                              <input
                                type="text"
                                value={item.carbon_source || ''}
                                onChange={(e) => {
                                  const updated = {
                                    ...item,
                                    carbon_source: e.target.value,
                                  };
                                  updateItemLocally(updated);
                                  triggerAutosave(updated);
                                }}
                                placeholder="Contoh: IPCC, GHG Protocol, PLN Indonesia"
                                className="text-[11px] border rounded px-2 h-7 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keterangan Dampak Lingkungan</label>
                              <input
                                type="text"
                                value={item.carbon_description || ''}
                                onChange={(e) => {
                                  const updated = {
                                    ...item,
                                    carbon_description: e.target.value,
                                  };
                                  updateItemLocally(updated);
                                  triggerAutosave(updated);
                                }}
                                placeholder="Keterangan singkat dampak lingkungan..."
                                className="text-[11px] border rounded px-2 h-7 bg-transparent dark:border-slate-800 text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          </div>

                          {/* Helper Info Footer */}
                          <p className="text-[10px] text-muted-foreground/80 md:col-span-3 flex items-center gap-1.5 mt-1 italic select-none">
                            <span>💡</span>
                            <span>Contoh: Pelatihan offline ≈ 2.0 kg CO₂/event. Gunakan nilai negatif (-) jika aktivitas bersifat mereduksi atau menyerap emisi (misal: penanaman pohon).</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
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
                    <Fragment key={item.id}>
                      <div
                        style={{ height: rowHeights[item.id] ? `${rowHeights[item.id]}px` : undefined }}
                        className="min-h-[42px] flex items-center relative group"
                      >
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
                                  className={`absolute top-1.5 h-[22px] rounded-md border flex items-center justify-between px-2 cursor-move select-none shadow-sm transition-shadow group-hover:shadow-md ${
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
                                className="absolute top-2.5 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rotate-45 flex items-center justify-center shadow-md cursor-pointer group-hover:scale-110 transition-transform"
                                title={`Deliverable: ${item.name}`}
                              >
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {/* Matching Blocked Reason sub-row in Gantt if blocked */}
                      {isLeafItem(item, wbsItems) && item.status === 'blocked' && (
                        <div className="h-[32px] bg-red-50/20 dark:bg-red-950/10 border-b border-red-100/50 dark:border-red-900/20 flex items-center">
                          {Array.from({ length: programDurationMonths }).map((_, idx) => (
                            <div key={idx} className="w-20 shrink-0 border-r dark:border-slate-800/50 h-full"></div>
                          ))}
                        </div>
                      )}

                      {/* Matching Carbon Tracking container in Gantt if carbonMode active */}
                      {item.level === 2 && carbonMode && (
                        <div className={`bg-emerald-50/10 dark:bg-emerald-950/5 border-b border-t border-slate-100 dark:border-slate-800/50 flex items-center ${item.carbon_enabled ? 'min-h-[140px]' : 'h-[36px]'}`}>
                          {Array.from({ length: programDurationMonths }).map((_, idx) => (
                            <div key={idx} className="w-20 shrink-0 border-r dark:border-slate-800/50 h-full"></div>
                          ))}
                        </div>
                      )}
                    </Fragment>
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

      {/* CLAIM SUBMISSION & REVISION DIALOG (WBS-P1A-3B) */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto" data-testid="wbs-claim-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm uppercase font-bold text-amber-700 dark:text-amber-400">
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
              {existingClaim && existingClaim.status === 'needs_revision'
                ? 'Revisi & Ajukan Ulang Klaim Penyelesaian'
                : existingClaim
                ? 'Detail Klaim Penyelesaian & Bukti'
                : 'Ajukan Klaim Penyelesaian & Bukti Execution'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeTrackingItem?.name} ({activeTrackingItem?.level === 2 ? 'Aktivitas' : activeTrackingItem?.level === 3 ? 'Sub-Aktivitas' : 'Task'})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Reviewer Note Warning if Needs Revision or Rejected */}
            {existingClaim?.review_note && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg space-y-1">
                <span className="font-bold text-orange-800 dark:text-orange-300 block">
                  Catatan dari Verifikator MEAL/Manajemen ({getClaimLabel(existingClaim.status)}):
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{existingClaim.review_note}"
                </p>
              </div>
            )}

            {/* Claim Note Input */}
            <div className="space-y-1.5">
              <Label htmlFor="wbs-claim-note" className="text-xs font-bold">Catatan Ringkasan Klaim Execution:</Label>
              <Textarea
                id="wbs-claim-note"
                aria-label="Catatan Ringkasan Klaim Execution"
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Jelaskan secara singkat pencapaian target, lokasi kegiatan, atau catatan penting lapangan..."
                className="text-xs h-20"
                disabled={existingClaim && existingClaim.status !== 'needs_revision' && existingClaim.status !== 'draft'}
                data-testid="wbs-claim-note-input"
              />
            </div>

            {/* Claimed Progress % */}
            <div className="space-y-1.5">
              <Label htmlFor="wbs-claimed-progress" className="text-xs font-bold">Persentase Progres yang Diklaim (%):</Label>
              <Input
                id="wbs-claimed-progress"
                aria-label="Persentase Progres yang Diklaim (%)"
                type="number"
                min={0}
                max={100}
                value={claimedProgress}
                onChange={(e) => setClaimedProgress(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="text-xs h-8 w-32"
                disabled={existingClaim && existingClaim.status !== 'needs_revision' && existingClaim.status !== 'draft'}
                data-testid="wbs-claimed-progress-input"
              />
            </div>

            {/* Existing Attached Evidence List */}
            {existingClaim && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Bukti Terlampir Sebelumnya ({getEvidenceForClaim(existingClaim.id).length}):
                </Label>
                {getEvidenceForClaim(existingClaim.id).length === 0 ? (
                  <p className="text-slate-400 italic">Belum ada bukti yang terlampir pada klaim ini.</p>
                ) : (
                  <div className="space-y-1.5">
                    {getEvidenceForClaim(existingClaim.id).map((ev) => (
                      <div key={ev.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 border rounded flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[8px] uppercase font-bold py-0">{ev.evidence_type}</Badge>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{ev.title}</span>
                          </div>
                          {ev.description && <p className="text-slate-500 mt-0.5">{ev.description}</p>}
                          {ev.storage_reference && (
                            <a
                              href={ev.storage_reference}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-1 mt-1 font-mono text-[10px]"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              {ev.storage_reference}
                            </a>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {new Date(ev.uploaded_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add New Evidence Section (if new or revising) */}
            {(!existingClaim || existingClaim.status === 'needs_revision' || existingClaim.status === 'draft') && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                    <FileUp className="h-3.5 w-3.5 text-emerald-600" />
                    Lampirkan Bukti Baru (MEAL Pattern):
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEvidenceField}
                    className="h-6 text-[10px] gap-1"
                    data-testid="wbs-add-evidence-btn"
                  >
                    <Plus className="h-3 w-3" /> Tambah Bukti
                  </Button>
                </div>

                {newEvidences.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">
                    Klik "Tambah Bukti" untuk melampirkan tautan dokumen, foto/laporan, atau catatan referensi bukti MEAL.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {newEvidences.map((ev, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 border rounded-lg space-y-2 relative group">
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidenceField(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                          title="Hapus item bukti ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px]">Tipe Bukti</Label>
                            <Select
                              value={ev.evidence_type}
                              onValueChange={(val: WbsEvidenceType) => {
                                const updated = [...newEvidences];
                                updated[idx].evidence_type = val;
                                setNewEvidences(updated);
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="link">Tautan URL / Cloud</SelectItem>
                                <SelectItem value="file">Dokumen / File</SelectItem>
                                <SelectItem value="manual_url">Tautan Manual</SelectItem>
                                <SelectItem value="onedrive">OneDrive / Google Drive</SelectItem>
                                <SelectItem value="note">Catatan Penjelasan</SelectItem>
                                <SelectItem value="other">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor={`ev-title-${idx}`} className="text-[10px]">Judul / Nama Bukti</Label>
                            <Input
                              id={`ev-title-${idx}`}
                              aria-label={`Judul Bukti ${idx + 1}`}
                              value={ev.title}
                              onChange={(e) => {
                                const updated = [...newEvidences];
                                updated[idx].title = e.target.value;
                                setNewEvidences(updated);
                              }}
                              placeholder="Misal: Laporan Absensi Kegiatan A.1"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>

                        {ev.evidence_type === 'onedrive' || ev.evidence_type === 'file' ? (
                          <div className="space-y-1">
                            <Label htmlFor={`ev-file-${idx}`} className="text-[10px]">Unggah File ke OneDrive (Graph API)</Label>
                            <Input
                              id={`ev-file-${idx}`}
                              aria-label={`File Bukti ${idx + 1}`}
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                const updated = [...newEvidences];
                                updated[idx].selectedFile = file;
                                if (file && !updated[idx].title) {
                                  updated[idx].title = file.name;
                                }
                                setNewEvidences(updated);
                              }}
                              className="h-8 text-xs cursor-pointer"
                            />
                            {ev.selectedFile && (
                              <p className="text-[10px] text-emerald-600 font-medium">
                                File dipilih: {ev.selectedFile.name} ({(ev.selectedFile.size / 1024).toFixed(1)} KB) — Akan diunggah ke folder OneDrive WBS Evidence saat disimpan.
                              </p>
                            )}
                            <div className="pt-1">
                              <Label htmlFor={`ev-ref-${idx}`} className="text-[10px]">Tautan / Referensi Manual (Opsional jika file diunggah)</Label>
                              <Input
                                id={`ev-ref-${idx}`}
                                aria-label={`Tautan Referensi Bukti ${idx + 1}`}
                                value={ev.storage_reference}
                                onChange={(e) => {
                                  const updated = [...newEvidences];
                                  updated[idx].storage_reference = e.target.value;
                                  setNewEvidences(updated);
                                }}
                                placeholder="https://... atau path referensi"
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor={`ev-ref-${idx}`} className="text-[10px]">Tautan URL / Referensi Dokumen</Label>
                            <Input
                              id={`ev-ref-${idx}`}
                              aria-label={`Tautan Referensi Bukti ${idx + 1}`}
                              value={ev.storage_reference}
                              onChange={(e) => {
                                const updated = [...newEvidences];
                                updated[idx].storage_reference = e.target.value;
                                setNewEvidences(updated);
                              }}
                              placeholder="https://drive.google.com/file/d/... atau path referensi"
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor={`ev-desc-${idx}`} className="text-[10px]">Deskripsi / Catatan Tambahan (Opsional)</Label>
                          <Input
                            id={`ev-desc-${idx}`}
                            aria-label={`Deskripsi Bukti ${idx + 1}`}
                            value={ev.description}
                            onChange={(e) => {
                              const updated = [...newEvidences];
                              updated[idx].description = e.target.value;
                              setNewEvidences(updated);
                            }}
                            placeholder="Catatan tambahan mengenai bukti ini..."
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setClaimDialogOpen(false)} className="text-xs">
              Tutup
            </Button>
            {(!existingClaim || existingClaim.status === 'needs_revision' || existingClaim.status === 'draft') && (
              <Button
                size="sm"
                onClick={handleSubmitClaim}
                disabled={submittingClaim}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold gap-1.5"
                data-testid="wbs-submit-claim-confirm-btn"
              >
                {submittingClaim && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{existingClaim?.status === 'needs_revision' ? 'Kirim Ulang Hasil Revisi' : 'Kirim Klaim Verifikasi'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VERIFIER REVIEW QUEUE DIALOG (WBS-P1A-3B) */}
      <Dialog open={reviewQueueOpen} onOpenChange={setReviewQueueOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="wbs-review-queue-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm uppercase font-bold text-slate-800 dark:text-slate-100">
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
              Antrean Verifikasi Klaim Selesai (MEAL / Manajemen)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar klaim penyelesaian WBS yang diajukan oleh tim untuk diverifikasi independen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b">
              {(['submitted', 'verified', 'needs_revision', 'rejected', 'all'] as const).map((filterKey) => {
                const count = filterKey === 'all'
                  ? claims.length
                  : claims.filter((c) => c.status === filterKey).length;

                return (
                  <Button
                    key={filterKey}
                    variant={reviewFilter === filterKey ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewFilter(filterKey)}
                    className="h-7 text-[11px] gap-1 px-2.5"
                  >
                    <span>
                      {filterKey === 'submitted' ? 'Menunggu Verifikasi' :
                       filterKey === 'verified' ? 'Terverifikasi' :
                       filterKey === 'needs_revision' ? 'Perlu Perbaikan' :
                       filterKey === 'rejected' ? 'Ditolak' : 'Semua'}
                    </span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {/* Claims List */}
            {(() => {
              const filteredClaims = claims.filter((c) =>
                reviewFilter === 'all' ? true : c.status === reviewFilter
              );

              if (filteredClaims.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">
                    Tidak ada klaim dalam kategori ini.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredClaims.map((claim) => {
                    const targetItem = wbsItems.find((i) => i.id === claim.wbs_item_id);
                    const evidences = getEvidenceForClaim(claim.id);
                    const isSelfClaim = user?.id && user.id === claim.claimed_by;

                    return (
                      <div
                        key={claim.id}
                        className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm space-y-3"
                        data-testid={`wbs-review-card-${claim.id}`}
                      >
                        {/* Header Info */}
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                {targetItem?.level === 2 ? 'Aktivitas' : targetItem?.level === 3 ? 'Sub' : 'Task'}
                              </Badge>
                              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                {targetItem?.name || 'WBS Item'}
                              </h5>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Diajukan: {new Date(claim.submitted_at || claim.created_at).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <Badge className={`text-[10px] font-bold py-0.5 px-2 ${getClaimBadgeStyle(claim.status)}`}>
                            {getClaimLabel(claim.status)}
                          </Badge>
                        </div>

                        {/* Claim Content */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Progres Diklaim:</span>
                            <span className="font-bold text-emerald-600 text-sm">{claim.claimed_progress}%</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 block">Catatan Klaim:</span>
                            <p className="text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 text-xs">
                              {claim.claim_note || 'Tanpa catatan tambahan.'}
                            </p>
                          </div>
                        </div>

                        {/* Evidence Section */}
                        <div className="space-y-1.5 pt-2 border-t text-xs">
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Bukti Terlampir ({evidences.length}):
                          </span>
                          {evidences.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">Belum ada bukti terlampir.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {evidences.map((ev) => (
                                <div key={ev.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 border rounded text-[11px]">
                                  <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                    <Badge variant="outline" className="text-[8px] uppercase">{ev.evidence_type}</Badge>
                                    <span className="truncate">{ev.title}</span>
                                  </div>
                                  {ev.storage_reference && (
                                    <a
                                      href={ev.storage_reference.startsWith('http') ? ev.storage_reference : '#'}
                                      target={ev.storage_reference.startsWith('http') ? '_blank' : '_self'}
                                      rel="noreferrer"
                                      className="text-emerald-600 hover:underline flex items-center gap-1 mt-1 font-mono text-[10px] truncate"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                      {ev.evidence_type === 'onedrive' || ev.storage_reference.startsWith('http')
                                        ? '📄 Buka/Pratinjau File OneDrive'
                                        : ev.storage_reference}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Existing Review Note */}
                        {claim.review_note && (
                          <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded text-xs">
                            <span className="font-bold text-orange-800 dark:text-orange-300 block text-[10px]">Catatan Verifikator:</span>
                            <p className="text-slate-700 dark:text-slate-300">{claim.review_note}</p>
                          </div>
                        )}

                        {/* Separation of Duties & Verifier Action Controls */}
                        {isSelfClaim ? (
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Verifikasi Dibatasi (Separation of Duties)</span>
                              <span>
                                Anda adalah pengaju klaim ini. Sesuai aturan Separation of Duties, verifikasi harus dilakukan oleh verifikator / anggota tim lain.
                              </span>
                              {/* NOTE: Real security protection is enforced server-side by trigger handle_wbs_completion_claim_audit in Postgres */}
                            </div>
                          </div>
                        ) : (
                          claim.status === 'submitted' && (
                            <div className="pt-3 border-t space-y-3">
                              <div className="space-y-1">
                                <Label htmlFor={`wbs-review-note-${claim.id}`} className="text-xs font-bold">Catatan Peninjau / Verifikator:</Label>
                                <Textarea
                                  id={`wbs-review-note-${claim.id}`}
                                  aria-label="Catatan Peninjau / Verifikator"
                                  value={reviewingClaimId === claim.id ? reviewNote : ''}
                                  onChange={(e) => {
                                    setReviewingClaimId(claim.id);
                                    setReviewNote(e.target.value);
                                  }}
                                  placeholder="Tuliskan catatan hasil verifikasi (wajib untuk Perlu Perbaikan / Penolakan)..."
                                  className="text-xs h-16"
                                  data-testid={`wbs-review-note-input-${claim.id}`}
                                />
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewClaim(claim, 'needs_revision')}
                                  disabled={submittingReview}
                                  className="text-xs text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-300"
                                  data-testid={`wbs-review-needs-revision-btn-${claim.id}`}
                                >
                                  Perlu Perbaikan
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewClaim(claim, 'rejected')}
                                  disabled={submittingReview}
                                  className="text-xs text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300"
                                  data-testid={`wbs-review-reject-btn-${claim.id}`}
                                >
                                  Tolak Klaim
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewClaim(claim, 'verified')}
                                  disabled={submittingReview}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                  data-testid={`wbs-review-approve-btn-${claim.id}`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Setujui & Verifikasi
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setReviewQueueOpen(false)} className="text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteWbsItemId}
        onOpenChange={(open) => { if (!open) setDeleteWbsItemId(null); }}
        title="Hapus Item WBS?"
        description="Apakah Anda yakin ingin menghapus item WBS ini beserta seluruh turunannya? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Item"
        cancelText="Batal"
        variant="destructive"
        icon="trash"
        loading={saving}
        onConfirm={executeDeleteWbsItem}
      />
    </div>
  );
}
