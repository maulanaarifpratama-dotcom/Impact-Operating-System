import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BudgetItem, WbsItem, LfaProject } from './types';
import { SBM_2026, SBM_FLAT_ITEMS, SbmItem } from '@/data/sbm2026';
import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, DollarSign, Wallet, Percent, TrendingUp, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BudgetCalculatorProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
  onBudgetChanged?: () => void;
}

export default function BudgetCalculator({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya',
  onBudgetChanged
}: BudgetCalculatorProps) {
  const { toast } = useToast();
  const [wbsActivities, setWbsActivities] = useState<WbsItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');
  const [projectData, setProject] = useState<LfaProject | null>(null);

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<number>(16000);
  const [isRateFallback, setIsRateFallback] = useState(true);
  const [rateUpdateTime, setRateUpdateTime] = useState<string>('');

  // AI Suggestion states
  const [aiCheckOpen, setAiCheckOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTargetItem, setAiTargetItem] = useState<BudgetItem | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ reference_price: number; explanation: string } | null>(null);

  // Autocomplete state
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SbmItem[]>([]);

  const budgetItemsRef = useRef<BudgetItem[]>([]);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    budgetItemsRef.current = budgetItems;
  }, [budgetItems]);

  // Load Exchange Rate from Frankfurter API with 1-hour cache
  const loadExchangeRate = async () => {
    const cacheKey = 'impactory_usd_idr_rate';
    const cacheTimeKey = 'impactory_usd_idr_time';
    const cachedRate = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    const now = Date.now();
    if (cachedRate && cachedTime && now - Number(cachedTime) < 3600000) {
      setExchangeRate(Number(cachedRate));
      setIsRateFallback(false);
      setRateUpdateTime(new Date(Number(cachedTime)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      return;
    }

    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
      const data = await res.json();
      const rate = data?.rates?.IDR || 16000;
      localStorage.setItem(cacheKey, String(rate));
      localStorage.setItem(cacheTimeKey, String(now));
      setExchangeRate(rate);
      setIsRateFallback(false);
      setRateUpdateTime(new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Error fetching exchange rate from Frankfurter, using fallback:', err);
      setExchangeRate(16000);
      setIsRateFallback(true);
      setRateUpdateTime('Estimasi');
    }
  };

  // Load WBS activities and Budget items
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Project Details to get actual duration
      const { data: proj } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (proj) setProject(proj as LfaProject);

      // 2. Fetch Level 2 WBS Activities
      const { data: wbs, error: wbsErr } = await supabase
        .from('lfa_wbs_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .eq('level', 2)
        .order('sort_order', { ascending: true });

      if (wbsErr) throw wbsErr;
      const activities = (wbs || []) as WbsItem[];
      setWbsActivities(activities);

      // 3. Fetch Budget Items
      const { data: bgt, error: bgtErr } = await supabase
        .from('lfa_budget_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (bgtErr) throw bgtErr;
      const items = (bgt || []) as BudgetItem[];
      setBudgetItems(items);

      // Trigger first-time toast if there are activities but no budget items yet
      if (items.length === 0 && activities.length > 0) {
        toast({
          title: 'Aktivitas Diimpor dari WBS 📋',
          description: 'Aktivitas diimpor dari WBS kamu. Tambahkan item biaya per aktivitas.',
        });
      }

      // Sync global mode from first item if exists
      if (items[0]?.mode) {
        setGlobalMode(items[0].mode);
      } else if (activities[0]?.mode) {
        setGlobalMode(activities[0].mode as 'simple' | 'professional');
      }

    } catch (err: any) {
      console.error('Failed to load budget calculator data:', err);
      toast({
        title: 'Gagal memuat anggaran',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void loadData();
    void loadExchangeRate();
  }, [loadData]);

  // Autosave mode toggle
  const handleModeToggle = async (mode: 'simple' | 'professional') => {
    setGlobalMode(mode);
    setSaving(true);
    try {
      // Update all local budget items' modes
      setBudgetItems(prev => prev.map(item => ({ ...item, mode })));

      // Save to Supabase in bulk
      if (budgetItems.length > 0) {
        const { error } = await supabase
          .from('lfa_budget_items')
          .update({ mode })
          .eq('lfa_project_id', projectId);
        if (error) throw error;
      }
      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Failed to save budget mode toggle:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add a budget item
  const handleAddItem = async (activityId: string, activityName: string) => {
    setSaving(true);
    try {
      const groupItems = budgetItems.filter(i => i.wbs_item_id === activityId);
      const seq = groupItems.length;

      // Smart defaults based on most common standard item
      const newItem: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'> = {
        lfa_project_id: projectId,
        org_id: orgId,
        wbs_item_id: activityId,
        activity_name: activityName,
        item_name: '',
        category: 'Honorarium',
        cost_category: 'Personnel & Consultants',
        volume: 1,
        unit: 'Orang',
        unit_price_idr: 0,
        funding_source: 'grant',
        justification: '',
        needs_donor_approval: false,
        sort_order: seq,
        mode: globalMode
      };

      const { data, error } = await supabase
        .from('lfa_budget_items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      setBudgetItems(prev => [...prev, data as BudgetItem]);
      setLastSaved(new Date());
      if (onBudgetChanged) onBudgetChanged();
    } catch (err: any) {
      console.error('Failed to add budget item:', err);
      toast({
        title: 'Gagal menambah item',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete a budget item
  const handleDeleteItem = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setBudgetItems(prev => prev.filter(i => i.id !== itemId));
      setLastSaved(new Date());
      if (onBudgetChanged) onBudgetChanged();
    } catch (err: any) {
      console.error('Failed to delete budget item:', err);
      toast({
        title: 'Gagal menghapus item',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Input Edits with Autosave Debounce
  const handleFieldChange = (itemId: string, field: keyof BudgetItem, value: any) => {
    // 1. Update local state
    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };

        // Smart sync category -> cost_category for seamless hybrid toggle
        if (field === 'category') {
          const cat = value as string;
          if (cat === 'Honorarium') updated.cost_category = 'Personnel & Consultants';
          else if (cat === 'Transport' || cat === 'Akomodasi') updated.cost_category = 'Travel & Transportation';
          else if (cat === 'ATK' || cat === 'Cetak') updated.cost_category = 'Equipment & Supplies';
          else if (cat === 'Konsumsi') updated.cost_category = 'Training & Workshops';
          else if (cat === 'Komunikasi') updated.cost_category = 'Communication & Visibility';
          else if (cat === 'Sewa' || cat === 'Jasa') updated.cost_category = 'Other Direct Costs';
          else updated.cost_category = 'Other Direct Costs';
        }
        return updated;
      }
      return item;
    }));

    // 2. Clear previous timer and schedule new one
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
    }
    setSaving(true);

    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        const itemToSave = budgetItemsRef.current.find(i => i.id === itemId);
        if (!itemToSave) return;

        const { error } = await supabase
          .from('lfa_budget_items')
          .update({
            item_name: itemToSave.item_name,
            category: itemToSave.category,
            cost_category: itemToSave.cost_category,
            volume: Number(itemToSave.volume) || 0,
            unit: itemToSave.unit,
            unit_price_idr: Number(itemToSave.unit_price_idr) || 0,
            funding_source: itemToSave.funding_source,
            justification: itemToSave.justification,
            needs_donor_approval: itemToSave.needs_donor_approval,
            mode: globalMode
          })
          .eq('id', itemId);

        if (error) throw error;
        setLastSaved(new Date());
        if (onBudgetChanged) onBudgetChanged();
      } catch (err) {
        console.error('Autosave budget item failed:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  // SBM Client-Side Lookups
  const findSbmReference = (itemName: string, category: string) => {
    const search = itemName.toLowerCase().trim();
    if (!search) return null;

    // Search exact or contains in flat items
    return SBM_FLAT_ITEMS.find(item => {
      const isCorrectCategory = item.category.toLowerCase() === category.toLowerCase();
      const containsName = item.name.toLowerCase().includes(search) || search.includes(item.name.toLowerCase());
      return isCorrectCategory && containsName;
    }) || SBM_FLAT_ITEMS.find(item => item.name.toLowerCase().includes(search) || search.includes(item.name.toLowerCase()));
  };

  // AI-Powered SBM suggestion fetcher
  const handleCheckSbmWithAI = async (item: BudgetItem) => {
    setAiTargetItem(item);
    setAiSuggestion(null);
    setAiCheckOpen(true);
    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('budget-sbm-suggest', {
        body: { item_name: item.item_name, category: item.category },
      });

      if (error) throw error;
      setAiSuggestion(data as { reference_price: number; explanation: string });
    } catch (err: any) {
      console.error('Error fetching AI SBM check:', err);
      // Fallback to client-side database
      const ref = findSbmReference(item.item_name, item.category || 'Lainnya');
      if (ref) {
        setAiSuggestion({
          reference_price: ref.price,
          explanation: `Berdasarkan database lokal SBM 2026, item yang mirip adalah "${ref.name}": Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}.`
        });
      } else {
        toast({
          title: 'AI Suggester Gagal',
          description: 'Tidak dapat menghubungi asisten SBM. Periksa koneksi internet.',
          variant: 'destructive',
        });
        setAiCheckOpen(false);
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Apply SBM Suggestion
  const handleApplySbmSuggestion = () => {
    if (!aiTargetItem || !aiSuggestion) return;
    handleFieldChange(aiTargetItem.id, 'unit_price_idr', aiSuggestion.reference_price);
    setAiCheckOpen(false);
    toast({
      title: 'SBM Diaplikasikan ✨',
      description: `Harga satuan item "${aiTargetItem.item_name}" diperbarui ke Rp ${aiSuggestion.reference_price.toLocaleString('id-ID')}.`,
    });
  };

  // Autocomplete Handlers
  const handleItemNameTyping = (itemId: string, text: string, category: string) => {
    handleFieldChange(itemId, 'item_name', text);
    if (!text.trim()) {
      setActiveSuggestionId(null);
      return;
    }

    // Filter SBM Flat Items
    const matches = SBM_FLAT_ITEMS.filter(item =>
      item.name.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 4);

    if (matches.length > 0) {
      setActiveSuggestionId(itemId);
      setFilteredSuggestions(matches);
    } else {
      setActiveSuggestionId(null);
    }
  };

  const selectSuggestion = (itemId: string, sbm: SbmItem) => {
    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          item_name: sbm.name,
          category: sbm.category,
          unit: sbm.unit,
          unit_price_idr: sbm.price,
          cost_category: sbm.category === 'Honorarium' ? 'Personnel & Consultants' :
                        sbm.category === 'Transport' ? 'Travel & Transportation' : 'Equipment & Supplies'
        };
      }
      return item;
    }));

    setActiveSuggestionId(null);

    // Save directly
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('lfa_budget_items')
          .update({
            item_name: sbm.name,
            category: sbm.category,
            unit: sbm.unit,
            unit_price_idr: sbm.price,
            mode: globalMode
          })
          .eq('id', itemId);
        if (error) throw error;
        setLastSaved(new Date());
        if (onBudgetChanged) onBudgetChanged();
      } catch (err) {
        console.error('Failed to save item suggestion:', err);
      }
    }, 100);
  };

  // Calculations & Metrics
  const totalIDR = budgetItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  const totalUSD = totalIDR / (exchangeRate || 16000);

  // Program Duration
  const durationMonths = projectData?.duration_months || programDurationMonths || 12;

  // Monthly burn rate
  const burnRateIDR = totalIDR / durationMonths;
  const burnRateUSD = totalUSD / durationMonths;

  // Overhead details (Personnel + Indirect costs)
  const overheadItems = budgetItems.filter(i => i.cost_category === 'Indirect Costs/Overhead');
  const totalOverheadIDR = overheadItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  const overheadPercentage = totalIDR > 0 ? (totalOverheadIDR / totalIDR) * 100 : 0;

  // SBM Warnings Scanner
  const sbmWarnings: string[] = [];
  budgetItems.forEach(item => {
    if (item.item_name && item.unit_price_idr > 0) {
      const ref = findSbmReference(item.item_name, item.category || 'Lainnya');
      if (ref && item.unit_price_idr > ref.price * 2) {
        const actName = item.activity_name || 'Aktivitas';
        sbmWarnings.push(`⚠️ "${item.item_name}" di [${actName}] melebihi 2x standar SBM 2026 (Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}). SBM menyarankan Rp ${ref.price.toLocaleString('id-ID')}.`);
      }
    }
  });

  // Empty activity warnings
  const emptyActivityWarnings: string[] = [];
  wbsActivities.forEach(act => {
    const items = budgetItems.filter(i => i.wbs_item_id === act.id);
    if (items.length === 0) {
      emptyActivityWarnings.push(`⚠️ Aktivitas "${act.name}" belum memiliki rincian anggaran.`);
    }
  });

  // Category totals for Professional Summary
  const categoriesList = [
    'Personnel & Consultants', 'Travel & Transportation', 'Equipment & Supplies',
    'Training & Workshops', 'Communication & Visibility', 'Indirect Costs/Overhead', 'Other Direct Costs'
  ];
  const categoryTotals: Record<string, number> = {};
  categoriesList.forEach(cat => {
    categoryTotals[cat] = budgetItems
      .filter(i => i.cost_category === cat)
      .reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  });

  // Funding source totals
  const fundingSourcesList = ['grant', 'self', 'partner', 'inkind'];
  const fundingSourceLabels: Record<string, string> = {
    grant: 'Dana Hibah',
    self: 'Dana Mandiri',
    partner: 'Dana Mitra',
    inkind: 'In-Kind'
  };
  const fundingSourceTotals: Record<string, number> = {};
  fundingSourcesList.forEach(src => {
    fundingSourceTotals[src] = budgetItems
      .filter(i => i.funding_source === src)
      .reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  });

  // Timeline translation helper
  const formatTimeline = (startMonth: number, durationWeeks: number) => {
    const endMonth = startMonth + Math.ceil(durationWeeks / 4) - 1;
    if (startMonth === endMonth) {
      return `Bulan ${startMonth} (${durationWeeks} minggu)`;
    }
    return `Bulan ${startMonth} - Bulan ${endMonth} (${durationWeeks} minggu)`;
  };

  // Vectorized High-Fidelity PDF Export Generator
  const handleExportRAB = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Export Gagal',
        description: 'Bloker pop-up menghalangi ekspor PDF. Izinkan pop-up untuk situs ini.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let printHtml = '';

    if (globalMode === 'simple') {
      // SIMPLE PORTRAIT LAYOUT
      printHtml = `
        <html>
        <head>
          <title>Rencana Anggaran Biaya (RAB) - ${projectData?.name || 'Program'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            @media print {
              .no-print { display: none; }
              body { background-color: white; color: black; }
              @page { size: portrait; margin: 20mm; }
            }
          </style>
        </head>
        <body class="bg-white p-6 md:p-12 text-slate-800 text-xs leading-normal">
          <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">Rencana Anggaran Biaya (RAB)</h1>
              <p class="text-sm font-semibold text-emerald-600 mt-1">${projectData?.name || 'Program LFA'}</p>
              <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500">
                <span><strong>Sektor:</strong> ${projectData?.sector || 'Sektor Lainnya'}</span>
                <span><strong>Lokasi:</strong> ${projectData?.location || 'Tidak Ditentukan'}</span>
                <span><strong>Durasi:</strong> ${durationMonths} Bulan</span>
                <span><strong>Tanggal Cetak:</strong> ${today}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-lg font-bold text-slate-900 tracking-wider">Impactory.id</span>
              <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1">LFA Budget Calculator</p>
            </div>
          </div>

          <!-- Cost Groups per WBS Activity -->
          ${wbsActivities.map((act, actIdx) => {
            const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
            const actTotal = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);

            return `
              <div class="mb-8 avoid-break">
                <div class="flex justify-between items-center bg-slate-100 p-2.5 rounded border border-slate-200 mb-3">
                  <div>
                    <span class="text-xs font-bold text-slate-800">Aktivitas ${actIdx + 1}: ${act.name}</span>
                    <span class="text-[10px] bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full ml-2">
                      ${formatTimeline(act.start_month, act.duration_weeks)}
                    </span>
                  </div>
                  <span class="text-xs font-extrabold text-slate-900">Total: Rp ${actTotal.toLocaleString('id-ID')}</span>
                </div>

                ${actItems.length === 0 ? `
                  <p class="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded border border-dashed border-slate-200">Belum ada item biaya anggaran.</p>
                ` : `
                  <table class="w-full text-[11px] mb-4">
                    <thead>
                      <tr class="border-b border-slate-300 text-slate-500 font-bold">
                        <th class="text-left pb-2 w-1/2">Nama Item Biaya</th>
                        <th class="text-left pb-2 w-1/6">Kategori</th>
                        <th class="text-center pb-2 w-1/12">Volume</th>
                        <th class="text-center pb-2 w-1/12">Satuan</th>
                        <th class="text-right pb-2 w-1/6">Harga Satuan (IDR)</th>
                        <th class="text-right pb-2 w-1/6">Total (IDR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${actItems.map(item => `
                        <tr class="border-b border-slate-100 py-2">
                          <td class="py-2 font-medium">${item.item_name || 'Item Tanpa Nama'}</td>
                          <td class="py-2 text-slate-500">${item.category || 'Lainnya'}</td>
                          <td class="py-2 text-center">${item.volume}</td>
                          <td class="py-2 text-center text-slate-500">${item.unit || 'Orang'}</td>
                          <td class="py-2 text-right">Rp ${Number(item.unit_price_idr).toLocaleString('id-ID')}</td>
                          <td class="py-2 text-right font-semibold">Rp ${(item.volume * item.unit_price_idr).toLocaleString('id-ID')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `}
              </div>
            `;
          }).join('')}

          <!-- GRAND SUMMARY -->
          <div class="mt-12 p-5 bg-slate-900 text-white rounded-lg grid grid-cols-3 gap-6 items-center">
            <div>
              <span class="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Total Anggaran Program</span>
              <span class="text-xl font-extrabold mt-1 block">Rp ${totalIDR.toLocaleString('id-ID')}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Laju Serapan Bulanan (Burn Rate)</span>
              <span class="text-sm font-bold mt-1 block">Rp ${burnRateIDR.toLocaleString('id-ID')}/bulan</span>
            </div>
            <div class="text-right border-l border-white/10 pl-6">
              <span class="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Periode Pelaksanaan</span>
              <span class="text-xs font-semibold mt-1 block">${durationMonths} Bulan (Berdasarkan WBS)</span>
            </div>
          </div>

          <div class="no-print mt-10 text-center">
            <button onclick="window.print()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded shadow-lg text-xs tracking-wider uppercase">Cetak Rencana Anggaran</button>
          </div>

          <div class="mt-16 text-center text-[10px] text-slate-400 border-t pt-4">
            Dibuat dengan <strong>Impactory.id</strong> • Program LFA & Dynamic Budget Calculator
          </div>
        </body>
        </html>
      `;
    } else {
      // PROFESSIONAL LANDSCAPE LAYOUT (UN / USAID STANDARDS)
      const formattedRate = exchangeRate.toLocaleString('id-ID');

      printHtml = `
        <html>
        <head>
          <title>Proposal Budget Matrix & Timeline (RAB) - ${projectData?.name || 'Program'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            .page-break { page-break-after: always; }
            .avoid-break { page-break-inside: avoid; }
            @media print {
              .no-print { display: none; }
              body { background-color: white; color: black; }
              @page { size: landscape; margin: 15mm; }
            }
          </style>
        </head>
        <body class="bg-white p-6 text-[11px] leading-normal text-slate-800">
          
          <!-- PAGE 1: WORK TIMELINE (GANTT CHART) -->
          <div class="page-break">
            <div class="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
              <div>
                <span class="text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded shadow-sm tracking-wider">Annex A: Project Timeline</span>
                <h1 class="text-xl font-black mt-2 text-slate-900 uppercase tracking-tight">${projectData?.name || 'Program'}</h1>
                <p class="text-[10px] text-slate-500 mt-1">Sektor: ${projectData?.sector || 'NGO Sector'} • Lokasi: ${projectData?.location || 'Indonesia'} • Kurs: 1 USD = Rp ${formattedRate}</p>
              </div>
              <div class="text-right">
                <span class="text-lg font-black text-slate-900 tracking-wider">Impactory.id</span>
                <p class="text-[9px] text-slate-400 uppercase tracking-widest">Donor Compliance Tool</p>
              </div>
            </div>

            <!-- CSS Grid Gantt Chart -->
            <div class="mb-6 border rounded-lg p-4 bg-slate-50/50">
              <h3 class="font-bold text-xs text-slate-800 mb-4 uppercase tracking-wider">Aktivitas & Schedule Pelaksanaan</h3>
              <div class="overflow-x-auto">
                <div class="min-w-[800px]">
                  <!-- X-Axis Months Headers -->
                  <div class="grid grid-cols-[250px_repeat(${durationMonths},_1fr)] gap-1 text-[10px] font-bold text-slate-500 border-b pb-2 mb-2 text-center">
                    <div class="text-left pl-2">Nama Aktivitas / Kegiatan</div>
                    ${Array.from({ length: durationMonths }).map((_, i) => `<div>Bulan ${i + 1}</div>`).join('')}
                  </div>

                  <!-- Timeline Rows -->
                  ${wbsActivities.map((act, idx) => {
                    const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
                    const actTotal = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
                    const actTotalUSD = actTotal / exchangeRate;

                    // Compute grid column alignments
                    const startCol = act.start_month;
                    const spanCols = Math.max(1, Math.ceil(act.duration_weeks / 4));

                    return `
                      <div class="grid grid-cols-[250px_repeat(${durationMonths},_1fr)] gap-1 py-2 border-b border-slate-100 items-center">
                        <div class="font-semibold text-slate-800 truncate pr-4 text-left">
                          A. ${idx + 1}: ${act.name}
                        </div>
                        <div class="col-span-${durationMonths} relative h-10 bg-slate-100/30 rounded flex items-center">
                          <!-- Timeline Progress Bar -->
                          <div 
                            style="grid-column-start: ${startCol}; grid-column-end: span ${spanCols};"
                            class="absolute h-6 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded flex items-center justify-between px-3 text-[10px] font-bold text-white shadow"
                          >
                            <span>${act.duration_weeks} Minggu</span>
                            <span class="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">
                              ${actTotal > 0 ? `Rp ${(actTotal/1_000_000).toFixed(1)} jt` : 'Belum Ada Anggaran'}
                            </span>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <div class="mt-12 text-slate-400 italic text-[10px] flex justify-between items-center bg-slate-50 p-3 rounded border border-dashed">
              <span>* Timeline di atas disinkronisasikan langsung dari modul Work Breakdown Structure (WBS) Impactory.id.</span>
              <span>Dokumen 1 dari 2</span>
            </div>
          </div>

          <!-- PAGE 2: COMPREHENSIVE BUDGET DETAILED BY COST CATEGORY -->
          <div class="page-break">
            <div class="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
              <div>
                <span class="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shadow-sm tracking-wider">Annex B: Budget Line-Item Detail</span>
                <h1 class="text-xl font-black mt-2 text-slate-900 uppercase tracking-tight">Rencana Anggaran Biaya Lengkap (RAB)</h1>
                <p class="text-[10px] text-slate-500 mt-1">Organisasi: Mitra Impactory.id • Kurs: 1 USD = Rp ${formattedRate} (Frankfurter Live)</p>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">UN / USAID Proposal Format</span>
                <span class="text-xs font-bold text-emerald-600">Grand Total: Rp ${totalIDR.toLocaleString('id-ID')} ($${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
            </div>

            <!-- Grouped by Cost Category -->
            ${categoriesList.map(cat => {
              const catItems = budgetItems.filter(i => i.cost_category === cat);
              const catTotal = catItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
              const catTotalUSD = catTotal / exchangeRate;

              if (catItems.length === 0) return '';

              return `
                <div class="mb-6 avoid-break">
                  <div class="flex justify-between items-center bg-indigo-50/50 p-2 border-l-4 border-indigo-600 border rounded-r mb-2">
                    <span class="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">${cat}</span>
                    <span class="font-extrabold text-indigo-950">Rp ${catTotal.toLocaleString('id-ID')} ($${catTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <table class="w-full text-[10px] mb-3">
                    <thead>
                      <tr class="border-b text-slate-400 font-semibold">
                        <th class="text-left pb-1 w-1/4">Deskripsi Item Biaya</th>
                        <th class="text-left pb-1 w-1/6">Aktivitas Terkait</th>
                        <th class="text-left pb-1 w-1/4">Justifikasi Biaya</th>
                        <th class="text-center pb-1 w-1/12">Vol</th>
                        <th class="text-center pb-1 w-1/12">Unit</th>
                        <th class="text-right pb-1 w-1/12">Harga Satuan IDR</th>
                        <th class="text-right pb-1 w-1/12">Total IDR</th>
                        <th class="text-right pb-1 w-1/12">Total USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${catItems.map(item => {
                        const total = item.volume * item.unit_price_idr;
                        const totalUSD = total / exchangeRate;
                        return `
                          <tr class="border-b border-slate-100 py-1.5">
                            <td class="py-1.5 font-semibold text-slate-800">${item.item_name} ${item.needs_donor_approval ? '<span class="text-rose-500 font-black text-[8px] uppercase px-1 bg-rose-50 border border-rose-100 rounded ml-1">Donor Approval Req.</span>' : ''}</td>
                            <td class="py-1.5 text-slate-500 truncate max-w-[120px]">${item.activity_name || 'Umum'}</td>
                            <td class="py-1.5 text-slate-500 italic max-w-[180px] truncate" title="${item.justification || ''}">${item.justification || 'Tidak ada justifikasi.'}</td>
                            <td class="py-1.5 text-center font-medium">${item.volume}</td>
                            <td class="py-1.5 text-center text-slate-500">${item.unit || 'Orang'}</td>
                            <td class="py-1.5 text-right">Rp ${item.unit_price_idr.toLocaleString('id-ID')}</td>
                            <td class="py-1.5 text-right font-bold text-slate-900">Rp ${total.toLocaleString('id-ID')}</td>
                            <td class="py-1.5 text-right font-bold text-indigo-600">$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>

          <!-- PAGE 3: SUMMARY TABLES & COMPLIANCE SIGNATURES -->
          <div class="avoid-break mt-10">
            <div class="border-t border-slate-300 pt-6 grid grid-cols-2 gap-8">
              
              <!-- Left side: Category & Funding Summaries -->
              <div class="space-y-6">
                <div>
                  <h3 class="font-bold text-xs uppercase text-slate-900 mb-3 tracking-wider">A. Summary per Funding Source</h3>
                  <table class="w-full border rounded text-[10px]">
                    <thead>
                      <tr class="bg-slate-50 border-b">
                        <th class="text-left p-2">Sumber Pendanaan</th>
                        <th class="text-right p-2">Total (IDR)</th>
                        <th class="text-right p-2">Total (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fundingSourcesList.map(src => {
                        const amt = fundingSourceTotals[src] || 0;
                        const amtUSD = amt / exchangeRate;
                        return `
                          <tr class="border-b last:border-0">
                            <td class="p-2 font-medium">${fundingSourceLabels[src]}</td>
                            <td class="p-2 text-right">Rp ${amt.toLocaleString('id-ID')}</td>
                            <td class="p-2 text-right text-indigo-600 font-semibold">$${amtUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>

                <div class="p-4 bg-slate-50 rounded border text-[10px] space-y-1.5">
                  <span class="font-bold text-slate-700 block text-xs uppercase tracking-wide">B. Compliance Analytics Metrics</span>
                  <div class="flex justify-between">
                    <span>Laju Serapan Bulanan (IDR Burn Rate):</span>
                    <strong class="text-slate-900">Rp ${burnRateIDR.toLocaleString('id-ID')}/bulan</strong>
                  </div>
                  <div class="flex justify-between">
                    <span>Laju Serapan Bulanan (USD Burn Rate):</span>
                    <strong class="text-indigo-600">$${burnRateUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bulan</strong>
                  </div>
                  <div class="flex justify-between border-t pt-1.5 mt-1.5">
                    <span>Persentase Biaya Overhead (Overhead Ratio):</span>
                    <strong class="${overheadPercentage > 20 ? 'text-rose-500' : 'text-emerald-600'}">
                      ${overheadPercentage.toFixed(1)}% ${overheadPercentage > 20 ? '(⚠️ Melebihi standar donor 20%)' : '(✅ Sesuai standar donor)'}
                    </strong>
                  </div>
                </div>
              </div>

              <!-- Right side: Compliance Signatures -->
              <div class="flex flex-col justify-between">
                <div>
                  <h3 class="font-bold text-xs uppercase text-slate-900 mb-2 tracking-wider">C. Compliance & Approvals</h3>
                  <p class="text-[10px] text-slate-400 leading-relaxed mb-6">Dengan menandatangani dokumen rencana anggaran biaya di bawah ini, penanggung jawab menyepakati detail alokasi dana dan kepatuhan standar PMK 32/2025.</p>
                </div>

                <div class="grid grid-cols-2 gap-6 pt-10">
                  <div class="text-center">
                    <div class="border-b border-slate-400 h-16 w-36 mx-auto mb-2"></div>
                    <p class="font-bold text-slate-800">________________________</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-1">Direktur Program / Keuangan</p>
                  </div>
                  <div class="text-center">
                    <div class="border-b border-slate-400 h-16 w-36 mx-auto mb-2"></div>
                    <p class="font-bold text-slate-800">________________________</p>
                    <p class="text-[10px] text-slate-500 uppercase mt-1">Perwakilan Organisasi / CSO</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="no-print mt-12 text-center">
            <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded shadow-lg text-xs tracking-wider uppercase">Cetak Dokumen Anggaran Lengkap</button>
          </div>

          <div class="mt-16 text-center text-[9px] text-slate-400 border-t pt-4">
            Generated Automatically by <strong>Impactory.id</strong> • Logical Framework Alignment System
          </div>
        </body>
        </html>
      `;
    }

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Memuat lembar anggaran program...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. WARNINGS & ALERTS BANNER BAR */}
      {(sbmWarnings.length > 0 || emptyActivityWarnings.length > 0 || overheadPercentage > 20) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wide">
            <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" /> Peringatan Kepatuhan Anggaran (Compliance Warnings)
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 pl-6 leading-relaxed">
            {overheadPercentage > 20 && (
              <p>⚠️ <strong>Rasio Overhead Tinggi ({overheadPercentage.toFixed(1)}%):</strong> Biaya overhead melebihi batas 20%. Beberapa donor internasional (seperti PBB/USAID) membatasi alokasi overhead administrasi maksimal 15-20%.</p>
            )}
            {sbmWarnings.slice(0, 3).map((warn, i) => (
              <p key={i}>{warn}</p>
            ))}
            {sbmWarnings.length > 3 && (
              <p className="font-semibold text-amber-700 dark:text-amber-500">... dan {sbmWarnings.length - 3} item biaya lainnya melebihi standar SBM 2026.</p>
            )}
            {emptyActivityWarnings.map((warn, i) => (
              <p key={i}>{warn}</p>
            ))}
          </div>
        </div>
      )}

      {/* 2. HEADER TAB CONTROLS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        {/* Toggle Slider */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border shadow-inner">
            <button
              onClick={() => handleModeToggle('simple')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all ${
                globalMode === 'simple'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 shadow-md border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 Sederhana
            </button>
            <button
              onClick={() => handleModeToggle('professional')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all ${
                globalMode === 'professional'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md border-0'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🏢 Profesional
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-primary" /> Menyimpan...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="h-3.5 w-3.5" /> Tersimpan
              </span>
            ) : (
              <span>Autosave aktif</span>
            )}
          </div>
        </div>

        {/* Currency Rate Indicator & Export */}
        <div className="flex flex-wrap items-center gap-3">
          {globalMode === 'professional' && (
            <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1 py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-950">
              <DollarSign className="h-3 w-3 text-indigo-500" />
              <span>Kurs: 1 USD = Rp {exchangeRate.toLocaleString('id-ID')}</span>
              <span className="text-slate-400 font-normal">({rateUpdateTime})</span>
            </Badge>
          )}

          <Button
            size="sm"
            onClick={handleExportRAB}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold flex items-center gap-1.5 text-xs shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export RAB
          </Button>
        </div>
      </div>

      {/* 3. BUDGET SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Grand Total */}
        <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
          <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-all duration-300">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Anggaran Program</span>
          <div className="space-y-1">
            <p className="text-xl font-black text-slate-900 dark:text-white">
              Rp {totalIDR.toLocaleString('id-ID')}
            </p>
            {globalMode === 'professional' && (
              <p className="text-xs font-bold text-indigo-600">
                ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Burn Rate */}
        <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
          <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-all duration-300">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Laju Serapan Bulanan (Burn Rate)</span>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              Rp {burnRateIDR.toLocaleString('id-ID')}/bulan
            </p>
            {globalMode === 'professional' && (
              <p className="text-[11px] font-bold text-indigo-600">
                ${burnRateUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/bulan
              </p>
            )}
            <span className="text-[9px] text-slate-400 block mt-1">Berdasarkan total {durationMonths} bulan pelaksanaan</span>
          </div>
        </div>

        {/* Card 3: Overhead Gauge */}
        <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
          <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-all duration-300">
            <Percent className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rasio Administrasi / Overhead</span>
          <div className="space-y-1">
            <p className={`text-sm font-black ${overheadPercentage > 20 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {overheadPercentage.toFixed(1)}% Overhead
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, overheadPercentage)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${overheadPercentage > 20 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              ></div>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Biaya Overhead: Rp {totalOverheadIDR.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* 4. COST SECTION BY ACTIVITY (THE DUAL-EXPERIENCE CORE ENGINE) */}
      <div className="space-y-6">
        {wbsActivities.map((act, actIdx) => {
          const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
          const actTotal = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);

          return (
            <Card key={act.id} className="border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
              {/* Activity Header Banner */}
              <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 rounded text-[10px] font-bold flex items-center justify-center text-indigo-700">
                    {actIdx + 1}
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{act.name}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      Timeline: {formatTimeline(act.start_month, act.duration_weeks)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest">Alokasi Anggaran</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Rp {actTotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <Button
                    size="xs"
                    onClick={() => handleAddItem(act.id, act.name)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 py-1 px-3 text-[10px] tracking-wide"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Tambah Item
                  </Button>
                </div>
              </div>

              {/* Table of Budget Items inside this activity */}
              <CardContent className="p-0">
                {actItems.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic text-xs border-dashed border-2 m-4 rounded-lg bg-slate-50/20">
                    Belum ada item biaya alokasi. Klik "+ Tambah Item" untuk mulai merinci anggaran kegiatan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-slate-400 font-bold bg-slate-50/30 dark:bg-slate-950/20">
                          <th className="text-left p-3 w-1/4">Nama Item Biaya</th>
                          <th className="text-left p-3 w-1/6">Kategori</th>
                          {globalMode === 'professional' && (
                            <th className="text-left p-3 w-1/6">Cost Category (Donor)</th>
                          )}
                          <th className="text-center p-3 w-[80px]">Volume</th>
                          <th className="text-center p-3 w-[100px]">Satuan</th>
                          <th className="text-right p-3 w-[150px]">Harga Satuan (IDR)</th>
                          {globalMode === 'professional' && (
                            <th className="text-left p-3 w-[120px]">Sumber Dana</th>
                          )}
                          <th className="text-right p-3 w-[120px]">Total (IDR)</th>
                          <th className="text-center p-3 w-[60px]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {actItems.map(item => {
                          const itemTotal = (Number(item.volume) || 0) * (Number(item.unit_price_idr) || 0);
                          const isSuggested = activeSuggestionId === item.id;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                              {/* 1. Item Name Input with smart autocomplete */}
                              <td className="p-3 relative align-middle">
                                <div className="space-y-1">
                                  <Input
                                    value={item.item_name}
                                    onChange={(e) => handleItemNameTyping(item.id, e.target.value, item.category || 'Lainnya')}
                                    placeholder="Mis. Narasumber, Sewa LCD..."
                                    className="text-xs h-8 bg-transparent"
                                  />

                                  {/* Custom Autocomplete Suggestions Popover */}
                                  {isSuggested && filteredSuggestions.length > 0 && (
                                    <div className="absolute z-10 left-3 top-11 w-64 bg-white dark:bg-slate-900 border rounded-lg shadow-xl divide-y text-[11px] overflow-hidden">
                                      <div className="bg-slate-50 dark:bg-slate-950 p-1.5 font-bold text-[9px] text-slate-400 uppercase tracking-widest">
                                        Rekomendasi SBM 2026
                                      </div>
                                      {filteredSuggestions.map((sbm, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => selectSuggestion(item.id, sbm)}
                                          className="w-full text-left p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 flex flex-col gap-0.5"
                                        >
                                          <span className="font-bold text-slate-800 dark:text-slate-200">{sbm.name}</span>
                                          <span className="text-[10px] text-slate-400">
                                            Rp {sbm.price.toLocaleString('id-ID')}/{sbm.unit} • {sbm.category}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {globalMode === 'professional' && (
                                    <Textarea
                                      value={item.justification || ''}
                                      onChange={(e) => handleFieldChange(item.id, 'justification', e.target.value)}
                                      placeholder="Tambahkan narasi justifikasi urgensi anggaran ini..."
                                      rows={1}
                                      className="text-[10px] p-1.5 min-h-[32px] resize-y"
                                    />
                                  )}
                                </div>
                              </td>

                              {/* 2. Category Simple Dropdown */}
                              <td className="p-3 align-middle">
                                <Select
                                  value={item.category || 'Lainnya'}
                                  onValueChange={(val) => handleFieldChange(item.id, 'category', val)}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-transparent">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    <SelectItem value="Honorarium">Honorarium</SelectItem>
                                    <SelectItem value="Transport">Transport</SelectItem>
                                    <SelectItem value="Akomodasi">Akomodasi</SelectItem>
                                    <SelectItem value="Konsumsi">Konsumsi</SelectItem>
                                    <SelectItem value="ATK">ATK</SelectItem>
                                    <SelectItem value="Cetak">Cetak</SelectItem>
                                    <SelectItem value="Komunikasi">Komunikasi</SelectItem>
                                    <SelectItem value="Sewa">Sewa</SelectItem>
                                    <SelectItem value="Jasa">Jasa</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              {/* 3. Cost Category Professional Dropdown */}
                              {globalMode === 'professional' && (
                                <td className="p-3 align-middle">
                                  <Select
                                    value={item.cost_category || 'Other Direct Costs'}
                                    onValueChange={(val) => handleFieldChange(item.id, 'cost_category', val)}
                                  >
                                    <SelectTrigger className="h-8 text-[10px] bg-transparent font-medium text-slate-600 dark:text-slate-300">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="text-xs">
                                      {categoriesList.map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-[10px]">{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              )}

                              {/* 4. Volume Input */}
                              <td className="p-3 align-middle">
                                <Input
                                  type="number"
                                  value={item.volume}
                                  onChange={(e) => handleFieldChange(item.id, 'volume', Number(e.target.value))}
                                  min={1}
                                  className="text-xs h-8 text-center bg-transparent"
                                />
                              </td>

                              {/* 5. Unit Dropdown */}
                              <td className="p-3 align-middle">
                                <Select
                                  value={item.unit || 'Orang'}
                                  onValueChange={(val) => handleFieldChange(item.id, 'unit', val)}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-transparent">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    <SelectItem value="Orang">Orang</SelectItem>
                                    <SelectItem value="Hari">Hari</SelectItem>
                                    <SelectItem value="Paket">Paket</SelectItem>
                                    <SelectItem value="Unit">Unit</SelectItem>
                                    <SelectItem value="Bulan">Bulan</SelectItem>
                                    <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                                    <SelectItem value="Lembar">Lembar</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              {/* 6. Unit Price IDR with PMK-32 Checker button */}
                              <td className="p-3 align-middle">
                                <div className="flex items-center gap-1.5 relative">
                                  <Input
                                    type="number"
                                    value={item.unit_price_idr}
                                    onChange={(e) => handleFieldChange(item.id, 'unit_price_idr', Number(e.target.value))}
                                    className="text-xs h-8 bg-transparent pr-12 font-semibold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCheckSbmWithAI(item)}
                                    title="SBM PMK-32 AI Assistant"
                                    className="absolute right-1.5 h-6 w-8 rounded bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-200/50 flex items-center justify-center text-[10px]"
                                  >
                                    ✨
                                  </button>
                                </div>
                              </td>

                              {/* 7. Funding Source (Professional Only) */}
                              {globalMode === 'professional' && (
                                <td className="p-3 align-middle">
                                  <div className="space-y-2">
                                    <Select
                                      value={item.funding_source || 'grant'}
                                      onValueChange={(val) => handleFieldChange(item.id, 'funding_source', val)}
                                    >
                                      <SelectTrigger className="h-8 text-[10px] bg-transparent">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="text-xs">
                                        <SelectItem value="grant">Dana Hibah</SelectItem>
                                        <SelectItem value="self">Dana Mandiri</SelectItem>
                                        <SelectItem value="partner">Dana Mitra</SelectItem>
                                        <SelectItem value="inkind">In-Kind</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    <div className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        id={`donor_app_${item.id}`}
                                        checked={item.needs_donor_approval}
                                        onChange={(e) => handleFieldChange(item.id, 'needs_donor_approval', e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <label htmlFor={`donor_app_${item.id}`} className="text-[9px] text-slate-400 font-semibold cursor-pointer">
                                        Persetujuan Donor
                                      </label>
                                    </div>
                                  </div>
                                </td>
                              )}

                              {/* 8. Total automatically calculated */}
                              <td className="p-3 text-right font-extrabold text-slate-900 dark:text-white align-middle">
                                Rp {itemTotal.toLocaleString('id-ID')}
                              </td>

                              {/* 9. Delete item action */}
                              <td className="p-3 text-center align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 5. CATEGORY & FUNDING SOURCE BREAKDOWN TABLE ON BOTTOM (Professional Mode only) */}
      {globalMode === 'professional' && budgetItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Cost Category breakdown */}
          <Card className="border shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b font-bold text-xs uppercase text-slate-800 tracking-wider">
              Anggaran per Kategori Biaya (Cost Category)
            </div>
            <CardContent className="p-3 space-y-2">
              {categoriesList.map(cat => {
                const total = categoryTotals[cat] || 0;
                const ratio = totalIDR > 0 ? (total / totalIDR) * 100 : 0;
                return (
                  <div key={cat} className="flex justify-between items-center text-xs border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-slate-600 dark:text-slate-400">{cat}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">Rp {total.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-indigo-500 block">({ratio.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Funding source breakdown */}
          <Card className="border shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b font-bold text-xs uppercase text-slate-800 tracking-wider">
              Anggaran per Sumber Pendanaan (Funding Source)
            </div>
            <CardContent className="p-3 space-y-2">
              {fundingSourcesList.map(src => {
                const total = fundingSourceTotals[src] || 0;
                const ratio = totalIDR > 0 ? (total / totalIDR) * 100 : 0;
                return (
                  <div key={src} className="flex justify-between items-center text-xs border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-slate-600 dark:text-slate-400">{fundingSourceLabels[src]}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">Rp {total.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-indigo-500 block">({ratio.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. SBM AI DIALOG */}
      <Dialog open={aiCheckOpen} onOpenChange={setAiCheckOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-bold uppercase text-amber-600">
              <Sparkles className="h-4 w-4 text-amber-500" /> Referensi SBM 2026 PMK 32/2025
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mengevaluasi harga item biaya menggunakan database asisten AI standar masukan Indonesia.
            </DialogDescription>
          </DialogHeader>

          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Membandingkan anggaran dengan SBM PMK 32/2025...</span>
            </div>
          ) : aiSuggestion ? (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block">🔬 Hasil Analisis Kepatuhan SBM</span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Rekomendasi Unit Price: <span className="text-amber-600">Rp {aiSuggestion.reference_price.toLocaleString('id-ID')}</span>
                </p>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {aiSuggestion.explanation}
                </p>
              </div>

              {aiTargetItem && aiTargetItem.unit_price_idr > aiSuggestion.reference_price * 2 && (
                <div className="p-2 border border-rose-200/50 bg-rose-50/30 text-[10px] rounded text-rose-600 leading-relaxed flex gap-2 font-medium">
                  <span>⚠️</span>
                  <span><strong>Peringatan Kelebihan:</strong> Anggaran Anda melebihi 2x standar resmi PMK. Pastikan memiliki lembar justifikasi yang kuat untuk keperluan audit donor.</span>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiCheckOpen(false)} className="text-xs">
              Abaikan
            </Button>
            {aiSuggestion && (
              <Button size="sm" onClick={handleApplySbmSuggestion} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">
                Terapkan Standar SBM
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
