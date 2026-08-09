import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BudgetItem, WbsItem, LfaProject } from './types';
import { computeEvmVarianceFlag } from './evmVariance';
import { SBM_2026, SBM_FLAT_ITEMS, SbmItem } from '@/data/sbm2026';
import { INKINDO_ROLES, calculateInkindoRate, calculateInkindoProfessionalRate, INKINDO_PROVINCE_MULTIPLIERS, INKINDO_DIRECT_COST_MULTIPLIERS } from '@/data/inkindo2026';
import { getProvenanceLabel } from '@/lib/grant-writer/deterministic/budget-provenance';

interface AutocompleteItem {
  name: string;
  category: string;
  price: number;
  unit: string;
  source: 'SBM' | 'INKINDO';
}

import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, AlertCircle, DollarSign, Wallet, Percent, TrendingUp, HelpCircle, Calendar, Link as LinkIcon, FileText
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { appStylesheetTags, finalizePrintWindow } from '@/lib/print/printWindow';
import { numericOrNull } from '@/lib/utils';
import { persistTargetBudgetForLfaProject, resolveTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';
import { evaluateMirrorBudgetModel } from '@/lib/budget/mirrorBudgetModel';

interface BudgetCalculatorProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
  onBudgetChanged?: () => void;
  productMode?: 'programme_design' | 'project_management';
}

export default function BudgetCalculator({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya',
  onBudgetChanged,
  productMode = 'programme_design'
}: BudgetCalculatorProps) {
  const { toast } = useToast();
  const [wbsActivities, setWbsActivities] = useState<WbsItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');
  const [activeTab, setActiveTab] = useState<'rencana' | 'realisasi'>('rencana');
  const [projectData, setProject] = useState<LfaProject | null>(null);
  const [proposalBudget, setProposalBudget] = useState<number | null>(null);
  const [targetBudgetDialogOpen, setTargetBudgetDialogOpen] = useState(false);
  const [targetBudgetInput, setTargetBudgetInput] = useState('');
  const [savingTargetBudget, setSavingTargetBudget] = useState(false);

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<number>(16000);
  const [isRateFallback, setIsRateFallback] = useState(true);
  const [rateUpdateTime, setRateUpdateTime] = useState<string>('');

  // Deterministic SBM/INKINDO reference states
  const [sbmCheckOpen, setSbmCheckOpen] = useState(false);
  const [sbmLoading, setSbmLoading] = useState(false);
  const [sbmTargetItem, setSbmTargetItem] = useState<BudgetItem | null>(null);
  const [sbmSuggestion, setSbmSuggestion] = useState<{ reference_price: number; explanation: string } | null>(null);

  // NGO Mode active multiplier state (default is true - NGO receives 70% rate discount under Lampiran II.2)
  const [isNgoMode, setIsNgoMode] = useState<boolean>(true);

  // Autocomplete state
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<AutocompleteItem[]>([]);

  // Budget Helper UI & Consultant Calculator states
  const [isHelperOpen, setIsHelperOpen] = useState<boolean>(false);
  const [calcInputType, setCalcInputType] = useState<'personnel' | 'consultant'>('personnel');
  const [calcEducation, setCalcEducation] = useState<'S1' | 'S2' | 'S3'>('S1');
  const [calcExperience, setCalcExperience] = useState<number>(1);
  const [calcSkk, setCalcSkk] = useState<boolean>(true);
  const [calcProvince, setCalcProvince] = useState<string>('DKI Jakarta');
  const [calcUnit, setCalcUnit] = useState<'Month' | 'Week' | 'Day' | 'Hour'>('Month');
  const [calcActivityId, setCalcActivityId] = useState<string>('');
  const [selectedScaleProvince, setSelectedScaleProvince] = useState<string>('DKI Jakarta');
  const [scaleLoading, setScaleLoading] = useState<boolean>(false);

  useEffect(() => {
    if (projectData?.location) {
      setCalcProvince(projectData.location);
      setSelectedScaleProvince(projectData.location);
    }
  }, [projectData]);

  useEffect(() => {
    if (wbsActivities.length > 0 && !calcActivityId) {
      setCalcActivityId(wbsActivities[0].id);
    }
  }, [wbsActivities, calcActivityId]);

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
      // Call api.frankfurter.dev directly. The old api.frankfurter.app host
      // 301s here, and a CSP connect-src that lists only the .app origin blocks
      // the redirect — which silently dropped every budget to the Rp 16.000
      // fallback while the real rate was ~Rp 17.900, a 12% understatement on
      // USD-denominated donor budgets.
      const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=IDR');
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
       if (proj) {
        setProject(proj as LfaProject);
        setProposalBudget(await resolveTargetBudgetForLfaProject(supabase as any, projectId));
       }  

      // 2. Fetch Level 2 WBS Activities (Fallback to Level 1 if none exist)
      let { data: wbs, error: wbsErr } = await supabase
        .from('lfa_wbs_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .eq('level', 2)
        .order('sort_order', { ascending: true });

      if (wbsErr) throw wbsErr;

      if (!wbs || wbs.length === 0) {
        const { data: lvl1, error: lvl1Err } = await supabase
          .from('lfa_wbs_items')
          .select('*')
          .eq('lfa_project_id', projectId)
          .eq('level', 1)
          .order('sort_order', { ascending: true });
        if (lvl1Err) throw lvl1Err;
        wbs = lvl1;
      }

      const activities = (wbs || []) as WbsItem[];
      setWbsActivities(activities);

      // 3. Fetch Budget Items
      const { data: bgt, error: bgtErr } = await supabase
        .from('lfa_budget_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (bgtErr) throw bgtErr;
      let items = (bgt || []) as BudgetItem[];

      // Read-only loading: do not auto-generate or auto-insert rows on tab open.
      // Hidden writes here cause cross-tab parity drift (WBS vs Budget).

      setBudgetItems(items);

      // Sync global mode from first item if exists
      if (items[0]?.mode) {
        setGlobalMode(items[0].mode);
      } else if (activities[0]?.mode) {
        setGlobalMode(activities[0].mode as 'simple' | 'professional');
      }

    } catch (err: any) {
      console.error('Failed to load budget calculator data:', err);
      setError(err);
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

  const handleGenerateDraftBudget = async () => {
    if (wbsActivities.length === 0) {
      toast({
        title: 'Belum ada aktivitas WBS',
        description: 'Lengkapi aktivitas WBS terlebih dahulu agar draf anggaran dapat dibuat.',
        variant: 'destructive'
      });
      return;
    }

    if (budgetItems.length === 0) {
      await loadData();
      toast({
        title: 'Generate Draft Budget diproses',
        description: 'Sistem mencoba menyusun draf anggaran awal dari aktivitas dan proposal budget.'
      });
      return;
    }

    setIsHelperOpen(true);
    toast({
      title: 'Lanjutkan penyusunan draf',
      description: 'Struktur item sudah ada. Lengkapi harga unit dengan Budget Helper atau edit manual.'
    });
  };

  const handleAddManualQuick = async () => {
    const firstActivity = wbsActivities[0];
    if (!firstActivity) {
      toast({
        title: 'Tidak ada aktivitas',
        description: 'Tambahkan aktivitas di WBS terlebih dahulu.',
        variant: 'destructive'
      });
      return;
    }

    await handleAddItem(firstActivity.id, firstActivity.name || 'Aktivitas WBS');
  };

  const openTargetBudgetDialog = () => {
    setTargetBudgetInput(proposalBudget ? String(Math.round(proposalBudget)) : '');
    setTargetBudgetDialogOpen(true);
  };

  const handleSaveTargetBudget = async () => {
    const normalized = Number(String(targetBudgetInput).replace(/[^0-9]/g, ''));
    if (!Number.isFinite(normalized) || normalized <= 0) {
      toast({
        title: 'Target budget tidak valid',
        description: 'Isi nominal lebih besar dari 0.',
        variant: 'destructive',
      });
      return;
    }

    setSavingTargetBudget(true);
    try {
      const saved = await persistTargetBudgetForLfaProject(supabase as any, projectId, normalized);
      setProposalBudget(saved);
      setTargetBudgetDialogOpen(false);
      toast({
        title: 'Target budget tersimpan',
        description: `Target budget program diperbarui ke Rp ${saved.toLocaleString('id-ID')}.`,
      });
      await loadData();
      if (onBudgetChanged) onBudgetChanged();
    } catch (err: any) {
      console.error('[BudgetCalculator] Failed to persist target budget:', err);
      toast({
        title: 'Gagal menyimpan target budget',
        description: err?.message || 'Terjadi kesalahan saat menyimpan target budget.',
        variant: 'destructive',
      });
    } finally {
      setSavingTargetBudget(false);
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

        // Smart unit-based rate conversions according to LKPP No 12/2021
        if (field === 'unit' && item.category === 'Honorarium') {
          const inkindoRole = INKINDO_ROLES.find(r => r.role === item.item_name);
          if (inkindoRole) {
            const newUnit = value as string;
            let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
            if (newUnit === 'Bulan') targetUnit = 'Month';
            else if (newUnit === 'Hari') targetUnit = 'Day';
            else if (newUnit === 'Orang') targetUnit = 'Month'; // Default Orang unit to Month rate
            
            const convertedRate = calculateInkindoRate(
              inkindoRole.role,
              projectData?.location || 'DKI Jakarta',
              targetUnit,
              isNgoMode
            );
            
            updated.unit_price_idr = convertedRate;
            
            toast({
              title: 'Konversi Tarif LKPP ⚖️',
              description: `Tarif untuk "${inkindoRole.role}" otomatis dikonversi ke satuan "${newUnit}" (Rp ${convertedRate.toLocaleString('id-ID')}) berdasarkan pedoman LKPP No. 12/2021.`,
            });
          }
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

        const actualVal = numericOrNull(itemToSave.actual_amount_idr);
        
        // Compute unit converted rate again if unit was modified before sending to DB
        let finalUnitPrice = Number(itemToSave.unit_price_idr) || 0;
        if (field === 'unit' && itemToSave.category === 'Honorarium') {
          const inkindoRole = INKINDO_ROLES.find(r => r.role === itemToSave.item_name);
          if (inkindoRole) {
            const newUnit = itemToSave.unit;
            let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
            if (newUnit === 'Bulan') targetUnit = 'Month';
            else if (newUnit === 'Hari') targetUnit = 'Day';
            else if (newUnit === 'Orang') targetUnit = 'Month';
            
            finalUnitPrice = calculateInkindoRate(
              inkindoRole.role,
              projectData?.location || 'DKI Jakarta',
              targetUnit,
              isNgoMode
            );
          }
        }

        const { error } = await supabase
          .from('lfa_budget_items')
          .update({
            item_name: itemToSave.item_name,
            category: itemToSave.category,
            cost_category: itemToSave.cost_category,
            volume: Number(itemToSave.volume) || 0,
            unit: itemToSave.unit,
            unit_price_idr: finalUnitPrice,
            funding_source: itemToSave.funding_source,
            justification: itemToSave.justification,
            needs_donor_approval: itemToSave.needs_donor_approval,
            mode: globalMode,
            actual_amount_idr: actualVal === null || isNaN(actualVal) ? null : actualVal,
            realisasi_date: itemToSave.realisasi_date || null,
            realisasi_notes: itemToSave.realisasi_notes || null,
            realisasi_evidence_url: itemToSave.realisasi_evidence_url || null
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

  // Handle NGO Mode state changes to recalculate and propagate all INKINDO roles
  const handleNgoModeToggle = async (active: boolean) => {
    setIsNgoMode(active);
    
    const updatedItems = budgetItems.map(item => {
      const inkindoRole = INKINDO_ROLES.find(r => r.role === item.item_name);
      if (inkindoRole && item.category === 'Honorarium') {
        let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
        if (item.unit === 'Bulan') targetUnit = 'Month';
        else if (item.unit === 'Hari') targetUnit = 'Day';
        
        const newRate = calculateInkindoRate(
          inkindoRole.role,
          projectData?.location || 'DKI Jakarta',
          targetUnit,
          active
        );

        // Async non-blocking Supabase save for each row
        void supabase
          .from('lfa_budget_items')
          .update({ unit_price_idr: newRate })
          .eq('id', item.id);

        return { ...item, unit_price_idr: newRate };
      }
      return item;
    });

    setBudgetItems(updatedItems);
    toast({
      title: active ? 'Skenario Efisiensi Internal Aktif' : 'Skenario Efisiensi Internal Nonaktif',
      description: active 
        ? 'Tarif personil disesuaikan dengan multiplier skenario internal (70% dari referensi INKINDO).'
        : 'Tarif personil menggunakan referensi INKINDO penuh (100%).',
    });
    if (onBudgetChanged) onBudgetChanged();
  };

  const handleAddProfessionalToBudget = async () => {
    if (!calcActivityId) {
      toast({
        title: "Gagal menambahkan",
        description: "Silakan pilih aktivitas WBS terlebih dahulu.",
        variant: "destructive"
      });
      return;
    }

    const selectedAct = wbsActivities.find(a => a.id === calcActivityId);
    if (!selectedAct) return;

    setSaving(true);
    try {
      const calculatedPrice = calculateInkindoProfessionalRate(
        calcEducation,
        calcExperience,
        calcSkk,
        calcProvince,
        calcUnit,
        isNgoMode
      );

      const IndonesianUnit = calcUnit === 'Month' ? 'Bulan' : calcUnit === 'Week' ? 'Minggu' : calcUnit === 'Day' ? 'Hari' : 'Jam';
      const certLabel = calcSkk ? 'With SKK' : 'Without SKK';
      const titlePrefix = calcInputType === 'personnel' ? 'Tenaga Ahli' : 'Konsultan';
      const itemName = `${titlePrefix} ${calcEducation} - Exp ${calcExperience} Thn (${certLabel})`;

      // Find max sort order to put it at the end
      const nextSortOrder = budgetItems.length > 0 
        ? Math.max(...budgetItems.map(i => i.sort_order)) + 1 
        : 1;

      const newItem = {
        lfa_project_id: projectId,
        org_id: orgId,
        wbs_item_id: calcActivityId,
        activity_name: selectedAct.name,
        category: 'Honorarium',
        cost_category: 'Personnel & Consultants',
        item_name: itemName,
        volume: 1,
        unit: IndonesianUnit,
        unit_price_idr: calculatedPrice,
        funding_source: 'grant' as const,
        needs_donor_approval: false,
        sort_order: nextSortOrder,
        mode: globalMode
      };

      const { error } = await supabase
        .from('lfa_budget_items')
        .insert([newItem]);

      if (error) throw error;

      toast({
        title: `${titlePrefix} Ditambahkan! 🎉`,
        description: `"${itemName}" berhasil dimasukkan ke dalam "${selectedAct.name}" dengan tarif Rp ${calculatedPrice.toLocaleString('id-ID')}/${IndonesianUnit}.`
      });

      await loadData();
    } catch (err: any) {
      console.error("Failed to add professional item to budget:", err);
      toast({
        title: "Gagal menambahkan item",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScaleBudgetByProvince = async (targetProvince: string) => {
    if (!targetProvince) return;
    setScaleLoading(true);
    try {
      const currentProvince = projectData?.location || 'DKI Jakarta';
      
      const oldPersonnelMul = INKINDO_PROVINCE_MULTIPLIERS[currentProvince] || 1.0;
      const newPersonnelMul = INKINDO_PROVINCE_MULTIPLIERS[targetProvince] || 1.0;
      
      const oldDirectMul = INKINDO_DIRECT_COST_MULTIPLIERS[currentProvince] || 1.0;
      const newDirectMul = INKINDO_DIRECT_COST_MULTIPLIERS[targetProvince] || 1.0;

      const personnelScaleFactor = newPersonnelMul / oldPersonnelMul;
      const directCostScaleFactor = newDirectMul / oldDirectMul;

      const updatedItems = await Promise.all(budgetItems.map(async (item) => {
        let updatedPrice = item.unit_price_idr;

        const inkindoRole = INKINDO_ROLES.find(r => r.role === item.item_name);
        const isPersonnel = item.category === 'Honorarium' || item.cost_category === 'Personnel & Consultants';

        if (isPersonnel) {
          if (inkindoRole) {
            let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
            if (item.unit === 'Bulan') targetUnit = 'Month';
            else if (item.unit === 'Hari') targetUnit = 'Day';
            
            updatedPrice = calculateInkindoRate(
              inkindoRole.role,
              targetProvince,
              targetUnit,
              isNgoMode
            );
          } else {
            const match = item.item_name.match(/(Tenaga Ahli|Konsultan)\s+(S1|S2|S3)\s+-\s+Exp\s+(\d+)\s+Thn\s+\((With SKK|Without SKK)\)/i);
            if (match) {
              const edu = match[2] as 'S1' | 'S2' | 'S3';
              const exp = parseInt(match[3], 10);
              const hasSkk = match[4].toLowerCase() === 'with skk';
              let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
              if (item.unit === 'Bulan') targetUnit = 'Month';
              else if (item.unit === 'Hari') targetUnit = 'Day';
              else if (item.unit === 'Jam') targetUnit = 'Hour';
              else if (item.unit === 'Minggu') targetUnit = 'Week';

              updatedPrice = calculateInkindoProfessionalRate(
                edu,
                exp,
                hasSkk,
                targetProvince,
                targetUnit,
                isNgoMode
              );
            } else {
              updatedPrice = Math.round(item.unit_price_idr * personnelScaleFactor);
            }
          }
        } else {
          const sbmRef = findSbmReference(item.item_name, item.category || 'Lainnya');
          if (sbmRef) {
            updatedPrice = Math.round(sbmRef.price * newDirectMul);
          } else {
            updatedPrice = Math.round(item.unit_price_idr * directCostScaleFactor);
          }
        }

        const { error } = await supabase
          .from('lfa_budget_items')
          .update({ unit_price_idr: updatedPrice })
          .eq('id', item.id);

        if (error) throw error;

        return { ...item, unit_price_idr: updatedPrice };
      }));

      const { error: projErr } = await supabase
        .from('lfa_projects')
        .update({ location: targetProvince })
        .eq('id', projectId);

      if (projErr) throw projErr;

      setBudgetItems(updatedItems);
      setProject(prev => prev ? { ...prev, location: targetProvince } : null);

      toast({
        title: "Lokasi & Multiplier Provinsi Diperbarui! 🗺️",
        description: `Seluruh item anggaran berhasil dikoversikan ke Provinsi ${targetProvince}. Multiplier Personil (${newPersonnelMul.toFixed(3)}) & Non-Personil (${newDirectMul.toFixed(3)}) otomatis diterapkan.`
      });

      if (onBudgetChanged) onBudgetChanged();
    } catch (err: any) {
      console.error("Failed to apply province multipliers:", err);
      toast({
        title: "Gagal menerapkan multiplier",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setScaleLoading(false);
    }
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

  // Deterministic SBM / INKINDO standard reference suggestion fetcher
  const handleCheckSbmReference = (item: BudgetItem) => {
    setSbmTargetItem(item);
    setSbmSuggestion(null);
    setSbmCheckOpen(true);
    setSbmLoading(true);

    // Run high-speed client-side lookup with micro-delay for smooth layout transition
    setTimeout(() => {
      if (item.category === 'Honorarium') {
        const inkindoRole = INKINDO_ROLES.find(r => r.role.toLowerCase() === item.item_name.toLowerCase()) ||
                            INKINDO_ROLES.find(r => r.role.toLowerCase().includes(item.item_name.toLowerCase())) ||
                            INKINDO_ROLES.find(r => item.item_name.toLowerCase().includes(r.role.toLowerCase()));
        
        if (inkindoRole) {
          let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
          if (item.unit === 'Bulan') targetUnit = 'Month';
          else if (item.unit === 'Hari') targetUnit = 'Day';
          
          const maxAllowedRate = calculateInkindoRate(
            inkindoRole.role,
            projectData?.location || 'DKI Jakarta',
            targetUnit,
            isNgoMode
          );

          setSbmSuggestion({
            reference_price: maxAllowedRate,
            explanation: `Berdasarkan database INKINDO 2026 untuk Provinsi ${projectData?.location || 'DKI Jakarta'} (${isNgoMode ? 'NGO Mode Aktif 70% Koefisien' : 'Komersial 100%'}), batas atas remunerasi harian/bulanan untuk peran "${inkindoRole.role}" adalah Rp ${maxAllowedRate.toLocaleString('id-ID')}/${item.unit || 'Bulan'}.`
          });
        } else {
          setSbmSuggestion({
            reference_price: 1500000,
            explanation: `Tidak ditemukan jabatan spesifik di INKINDO 2026. Disarankan menggunakan batas aman asisten penunjang lokal: Rp 1.500.000/bulan.`
          });
        }
      } else {
        const ref = findSbmReference(item.item_name, item.category || 'Lainnya');
        if (ref) {
          setSbmSuggestion({
            reference_price: ref.price,
            explanation: `Berdasarkan database SBM 2026 PMK 32/2025, standar harga masukan regional untuk item "${ref.name}" adalah Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}.`
          });
        } else {
          setSbmSuggestion({
            reference_price: 150000,
            explanation: `Item "${item.item_name}" tidak ditemukan di database SBM 2026. Merekomendasikan standar harian umum: Rp 150.000.`
          });
        }
      }
      setSbmLoading(false);
    }, 120);
  };

  // Apply SBM Suggestion
  const handleApplySbmSuggestion = () => {
    if (!sbmTargetItem || !sbmSuggestion) return;
    handleFieldChange(sbmTargetItem.id, 'unit_price_idr', sbmSuggestion.reference_price);
    setSbmCheckOpen(false);
    toast({
      title: 'Cek Referensi SBM/INKINDO',
      description: `Harga satuan item "${sbmTargetItem.item_name}" diperbarui ke Rp ${sbmSuggestion.reference_price.toLocaleString('id-ID')}.`,
    });
  };

  // Autocomplete Handlers (SBM + INKINDO)
  const handleItemNameTyping = (itemId: string, text: string, category: string) => {
    handleFieldChange(itemId, 'item_name', text);
    if (!text.trim()) {
      setActiveSuggestionId(null);
      return;
    }

    const textLower = text.toLowerCase();

    // 1. Map SBM matches
    const sbmMatches: AutocompleteItem[] = SBM_FLAT_ITEMS.filter(item =>
      item.name.toLowerCase().includes(textLower)
    ).map(item => ({
      name: item.name,
      category: item.category,
      price: item.price,
      unit: item.unit,
      source: 'SBM'
    }));

    // 2. Map INKINDO matches
    const inkindoMatches: AutocompleteItem[] = INKINDO_ROLES.filter(role =>
      role.role.toLowerCase().includes(textLower)
    ).map(role => {
      const calculatedPrice = calculateInkindoRate(
        role.role,
        projectData?.location || 'DKI Jakarta',
        'Month',
        isNgoMode
      );
      return {
        name: role.role,
        category: 'Honorarium',
        price: calculatedPrice,
        unit: 'Bulan',
        source: 'INKINDO'
      };
    });

    const matches = [...sbmMatches, ...inkindoMatches].slice(0, 6);

    if (matches.length > 0) {
      setActiveSuggestionId(itemId);
      setFilteredSuggestions(matches);
    } else {
      setActiveSuggestionId(null);
    }
  };

  const selectSuggestion = (itemId: string, sbm: AutocompleteItem) => {
    const costCategory = sbm.category === 'Honorarium' ? 'Personnel & Consultants' :
                         sbm.category === 'Transport' ? 'Travel & Transportation' : 'Equipment & Supplies';

    setBudgetItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          item_name: sbm.name,
          category: sbm.category,
          unit: sbm.unit,
          unit_price_idr: sbm.price,
          cost_category: costCategory
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
            cost_category: costCategory,
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
  const durationMonths = projectData?.duration_months || programDurationMonths || 12;
  const totalIDR = budgetItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  const totalUSD = totalIDR / (exchangeRate || 16000);

  // Mirror Budget Model (UX layer): Target Budget + Detailed Budget + Coverage + Gap
  const detailedBudgetIDR = totalIDR;
  const hasBudgetRows = budgetItems.length > 0;
  const allRowsUnpriced = hasBudgetRows && budgetItems.every((i) => Number(i.unit_price_idr || 0) === 0);
  const partiallyPriced = hasBudgetRows
    && budgetItems.some((i) => Number(i.unit_price_idr || 0) > 0)
    && budgetItems.some((i) => Number(i.unit_price_idr || 0) === 0);
  const fullyPriced = hasBudgetRows && budgetItems.every((i) => Number(i.unit_price_idr || 0) > 0);

  const mirror = evaluateMirrorBudgetModel({
    targetBudget: proposalBudget,
    detailedBudget: detailedBudgetIDR,
    budgetRowCount: budgetItems.length,
  });
  const hasTargetBudget = mirror.hasTargetBudget;
  const coveragePct = mirror.coveragePct;
  const gapBudgetIDR = mirror.gapBudget;
  const mirrorBudgetState = mirror.state;
  const mirrorBudgetStatus = mirror.statusLabel;
  const showDraftActions = mirror.showDraftActions;
  const showContinueAction = mirror.showContinueAction;

  // Realization Metrics
  const totalRealisasiIDR = budgetItems.reduce((acc, i) => acc + (Number(i.actual_amount_idr) || 0), 0);
  const totalRealisasiUSD = totalRealisasiIDR / (exchangeRate || 16000);
  const remainingBudgetIDR = totalIDR - totalRealisasiIDR;
  const remainingBudgetUSD = totalUSD - totalRealisasiUSD;
  const realizationPercentage = totalIDR > 0 ? (totalRealisasiIDR / totalIDR) * 100 : 0;
  const actualBurnRateIDR = totalRealisasiIDR / durationMonths;
  const actualBurnRateUSD = totalRealisasiUSD / durationMonths;

  // Over budget check: if total spent > planned * 1.1
  const isOverBudgetKritis = totalRealisasiIDR > totalIDR * 1.1;

  // Item level over budget check
  const overBudgetItemsCount = budgetItems.filter(item => {
    const planned = (Number(item.volume) || 0) * (Number(item.unit_price_idr) || 0);
    const actual = Number(item.actual_amount_idr) || 0;
    return actual > planned;
  }).length;

  // Program Duration

  // Monthly burn rate
  const burnRateIDR = totalIDR / durationMonths;
  const burnRateUSD = totalUSD / durationMonths;

  // Overhead details (Personnel + Indirect costs)
  const overheadItems = budgetItems.filter(i => i.cost_category === 'Indirect Costs/Overhead');
  const totalOverheadIDR = overheadItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
  const overheadPercentage = totalIDR > 0 ? (totalOverheadIDR / totalIDR) * 100 : 0;

  // SBM & INKINDO Compliance Scanner
  const sbmWarnings: string[] = [];
  budgetItems.forEach(item => {
    if (item.item_name && item.unit_price_idr > 0) {
      const actName = item.activity_name || 'Aktivitas';
      
      if (item.category === 'Honorarium') {
        const inkindoRole = INKINDO_ROLES.find(r => r.role === item.item_name);
        if (inkindoRole) {
          let targetUnit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
          if (item.unit === 'Bulan') targetUnit = 'Month';
          else if (item.unit === 'Hari') targetUnit = 'Day';
          
          const maxAllowedRate = calculateInkindoRate(
            inkindoRole.role,
            projectData?.location || 'DKI Jakarta',
            targetUnit,
            isNgoMode
          );

          if (item.unit_price_idr > maxAllowedRate) {
            sbmWarnings.push(`⚖️ "${item.item_name}" di [${actName}] melebihi standar INKINDO 2026 (${projectData?.location || 'DKI Jakarta'}, ${isNgoMode ? 'NGO 70%' : 'Komersial 100%'}). Anggaran: Rp ${item.unit_price_idr.toLocaleString('id-ID')}, Maksimal: Rp ${maxAllowedRate.toLocaleString('id-ID')}/${item.unit}.`);
          }
        }
      } else {
        const ref = findSbmReference(item.item_name, item.category || 'Lainnya');
        if (ref) {
          if (item.unit_price_idr > ref.price * 2) {
            sbmWarnings.push(`⚠️ "${item.item_name}" di [${actName}] melebihi 2x standar SBM 2026 (Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}). SBM menyarankan Rp ${ref.price.toLocaleString('id-ID')}.`);
          } else if (item.unit_price_idr > ref.price) {
            sbmWarnings.push(`ℹ️ "${item.item_name}" di [${actName}] melebihi standar SBM 2026 (Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}). SBM menyarankan Rp ${ref.price.toLocaleString('id-ID')}.`);
          }
        }
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
          ${appStylesheetTags()}
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

          <!-- Pagu Proposal vs Itemized RAB Banner -->
          ${proposalBudget !== null ? `
            <div style="background-color: ${totalIDR > proposalBudget ? '#fef2f2' : totalIDR < proposalBudget ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${totalIDR > proposalBudget ? '#fecaca' : totalIDR < proposalBudget ? '#fef3c7' : '#bbf7d0'}; padding: 15px; border-radius: 8px; margin-bottom: 24px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Pagu Proposal vs Itemized RAB</span>
              <div style="display: flex; gap: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">
                <div>
                  <span style="font-size: 10px; font-weight: normal; color: #64748b; display: block;">Pagu Proposal:</span>
                  <span style="color: #334155; font-family: monospace;">Rp ${proposalBudget.toLocaleString('id-ID')}</span>
                </div>
                <div style="width: 1px; background-color: #cbd5e1;"></div>
                <div>
                  <span style="font-size: 10px; font-weight: normal; color: #64748b; display: block;">Itemized RAB:</span>
                  <span style="color: ${totalIDR > proposalBudget ? '#dc2626' : '#334155'}; font-family: monospace;">Rp ${totalIDR.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <p style="font-size: 11px; font-weight: bold; margin: 4px 0 0 0; color: ${totalIDR > proposalBudget ? '#dc2626' : totalIDR < proposalBudget ? '#b45309' : '#15803d'};">
                ${totalIDR === proposalBudget ? 'RAB cocok dengan pagu proposal.' : ''}
                ${totalIDR < proposalBudget ? `Sisa anggaran yang belum teralokasi: Rp ${(proposalBudget - totalIDR).toLocaleString('id-ID')}` : ''}
                ${totalIDR > proposalBudget ? `⚠️ PERINGATAN: Total RAB melebihi pagu proposal sebesar Rp ${(totalIDR - proposalBudget).toLocaleString('id-ID')}!` : ''}
              </p>
            </div>
          ` : ''}

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
            <button data-print-trigger class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded shadow-lg text-xs tracking-wider uppercase">Cetak Rencana Anggaran</button>
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
          ${appStylesheetTags()}
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

            <!-- Pagu Proposal vs Itemized RAB Banner -->
            ${proposalBudget !== null ? `
              <div style="background-color: ${totalIDR > proposalBudget ? '#fef2f2' : totalIDR < proposalBudget ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${totalIDR > proposalBudget ? '#fecaca' : totalIDR < proposalBudget ? '#fef3c7' : '#bbf7d0'}; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Pagu Proposal vs Itemized RAB</span>
                <div style="display: flex; gap: 15px; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
                  <div>
                    <span style="font-size: 9px; font-weight: normal; color: #64748b; display: block;">Pagu Proposal:</span>
                    <span style="color: #334155; font-family: monospace;">Rp ${proposalBudget.toLocaleString('id-ID')}</span>
                  </div>
                  <div style="width: 1px; background-color: #cbd5e1;"></div>
                  <div>
                    <span style="font-size: 9px; font-weight: normal; color: #64748b; display: block;">Itemized RAB:</span>
                    <span style="color: ${totalIDR > proposalBudget ? '#dc2626' : '#334155'}; font-family: monospace;">Rp ${totalIDR.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <p style="font-size: 10px; font-weight: bold; margin: 4px 0 0 0; color: ${totalIDR > proposalBudget ? '#dc2626' : totalIDR < proposalBudget ? '#b45309' : '#15803d'};">
                  ${totalIDR === proposalBudget ? 'RAB cocok dengan pagu proposal.' : ''}
                  ${totalIDR < proposalBudget ? `Sisa anggaran yang belum teralokasi: Rp ${(proposalBudget - totalIDR).toLocaleString('id-ID')}` : ''}
                  ${totalIDR > proposalBudget ? `⚠️ PERINGATAN: Total RAB melebihi pagu proposal sebesar Rp ${(totalIDR - proposalBudget).toLocaleString('id-ID')}!` : ''}
                </p>
              </div>
            ` : ''}

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
            <button data-print-trigger class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded shadow-lg text-xs tracking-wider uppercase">Cetak Dokumen Anggaran Lengkap</button>
          </div>

          <div class="mt-16 text-center text-[9px] text-slate-400 border-t pt-4">
            Generated Automatically by <strong>Impactory.id</strong> • Logical Framework Alignment System
          </div>
        </body>
        </html>
      `;
    }

    printWindow.document.write(printHtml);
    finalizePrintWindow(printWindow);
  };

  const handleExportRealisasi = () => {
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

    const printHtml = `
      <html>
      <head>
        <title>Laporan Realisasi Anggaran & Varian - ${projectData?.name || 'Program'}</title>
        ${appStylesheetTags()}
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
      <body class="bg-white p-6 text-[10px] leading-normal text-slate-800">
        <div class="flex justify-between items-start border-b-2 border-slate-950 pb-4 mb-6">
          <div>
            <span class="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shadow-sm tracking-wider">Laporan Keuangan MVP</span>
            <h1 class="text-xl font-black mt-2 text-slate-900 uppercase tracking-tight">Realisasi & Variasi Anggaran (RAB vs Realisasi)</h1>
            <p class="text-[10px] text-slate-500 mt-1">Program: ${projectData?.name || 'Program LFA'} • Sektor: ${projectData?.sector || 'Sektor Lainnya'} • Durasi: ${durationMonths} Bulan</p>
          </div>
          <div class="text-right">
            <span class="text-lg font-black text-slate-900 tracking-wider">Impactory.id</span>
            <p class="text-[9px] text-slate-400 uppercase tracking-widest">Financial Realization Summary</p>
            <p class="text-[9px] text-slate-500 mt-1">Tanggal Cetak: ${today}</p>
          </div>
        </div>

        <!-- Grand Summary Cards -->
        <div class="grid grid-cols-4 gap-4 p-4 border rounded-xl bg-slate-50 mb-6 text-slate-950">
          <div>
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Rencana Anggaran</span>
            <span class="text-base font-extrabold">Rp ${totalIDR.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Realisasi Pengeluaran</span>
            <span class="text-base font-extrabold text-emerald-600">Rp ${totalRealisasiIDR.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Anggaran (Varian)</span>
            <span class="text-base font-extrabold ${remainingBudgetIDR < 0 ? 'text-rose-600' : 'text-slate-900'}">
              Rp ${remainingBudgetIDR.toLocaleString('id-ID')}
            </span>
          </div>
          <div>
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Persentase Penyerapan</span>
            <span class="text-base font-extrabold text-indigo-600">${realizationPercentage.toFixed(1)}%</span>
          </div>
        </div>

        ${isOverBudgetKritis ? `
          <div class="p-2 border border-rose-300 bg-rose-50 text-rose-800 text-[10px] rounded-lg mb-6 font-semibold">
            ⚠️ PERINGATAN CRITICAL: Total realisasi pengeluaran saat ini telah melebihi 10% dari total anggaran yang direncanakan! Segera koordinasikan dengan donor atau manajer keuangan program.
          </div>
        ` : ''}

        <!-- Cost Groups per Activity -->
        ${wbsActivities.map((act, actIdx) => {
          const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
          const actTotalPlanned = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
          const actTotalActual = actItems.reduce((acc, i) => acc + (Number(i.actual_amount_idr) || 0), 0);
          const actVariance = actTotalPlanned - actTotalActual;

          return `
            <div class="mb-6 avoid-break">
              <div class="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-200 mb-2 font-bold text-slate-800">
                <span>Aktivitas ${actIdx + 1}: ${act.name}</span>
                <span class="text-[9px] text-slate-500">
                  Rencana: Rp ${actTotalPlanned.toLocaleString('id-ID')} | Realisasi: Rp ${actTotalActual.toLocaleString('id-ID')} | Selisih: <span class="${actVariance < 0 ? 'text-rose-600' : 'text-emerald-600'}">Rp ${actVariance.toLocaleString('id-ID')}</span>
                </span>
              </div>

              ${actItems.length === 0 ? `
                <p class="text-slate-400 italic text-[9px] p-2 bg-slate-50 rounded border border-dashed border-slate-200">Belum ada item anggaran.</p>
              ` : `
                <table class="w-full text-[9px] mb-2">
                  <thead>
                    <tr class="border-b border-slate-300 text-slate-500 font-bold">
                      <th class="text-left pb-1 w-1/4">Nama Item Biaya</th>
                      <th class="text-center pb-1 w-[8%]">Vol (Rencana)</th>
                      <th class="text-right pb-1 w-[12%]">RAB Satuan (IDR)</th>
                      <th class="text-right pb-1 w-[12%]">RAB Total (IDR)</th>
                      <th class="text-right pb-1 w-[12%]">Realisasi (IDR)</th>
                      <th class="text-right pb-1 w-[12%]">Selisih/Varian</th>
                      <th class="text-center pb-1 w-[10%]">Tanggal</th>
                      <th class="text-left pb-1 w-1/6">Catatan & Bukti</th>
                      <th class="text-center pb-1 w-[8%]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${actItems.map(item => {
                      const plannedTotal = item.volume * item.unit_price_idr;
                      const actualTotal = Number(item.actual_amount_idr) || 0;
                      const variance = plannedTotal - actualTotal;

                      let statusBadge = 'Belum Realisasi';
                      let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      if (item.actual_amount_idr !== null && item.actual_amount_idr !== undefined) {
                        if (actualTotal > plannedTotal) {
                          statusBadge = 'Over budget';
                          badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                        } else if (variance <= plannedTotal * 0.05) {
                          statusBadge = 'Sesuai';
                          badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        } else {
                          statusBadge = 'Efisien';
                          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                        }
                      }

                      return `
                        <tr class="border-b border-slate-100 py-1">
                          <td class="py-1.5 font-medium">${item.item_name}</td>
                          <td class="py-1.5 text-center">${item.volume} ${item.unit || 'Orang'}</td>
                          <td class="py-1.5 text-right">Rp ${item.unit_price_idr.toLocaleString('id-ID')}</td>
                          <td class="py-1.5 text-right font-semibold">Rp ${plannedTotal.toLocaleString('id-ID')}</td>
                          <td class="py-1.5 text-right font-semibold text-emerald-600">Rp ${item.actual_amount_idr !== null ? actualTotal.toLocaleString('id-ID') : '-'}</td>
                          <td class="py-1.5 text-right font-bold ${variance < 0 ? 'text-rose-600' : 'text-slate-800'}">
                            Rp ${variance.toLocaleString('id-ID')}
                          </td>
                          <td class="py-1.5 text-center text-slate-500">${item.realisasi_date ? new Date(item.realisasi_date).toLocaleDateString('id-ID') : '-'}</td>
                          <td class="py-1.5 text-slate-500 max-w-[150px] truncate" title="${item.realisasi_notes || ''}">
                            ${item.realisasi_notes || ''}
                            ${item.realisasi_evidence_url ? `<br/><a href="${item.realisasi_evidence_url}" class="text-indigo-600 font-semibold" target="_blank">🔗 Bukti Transaksi</a>` : ''}
                          </td>
                          <td class="py-1.5 text-center">
                            <span class="px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${badgeColor}">${statusBadge}</span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>
          `;
        }).join('')}

        <!-- Compliance & Audit Signatures -->
        <div class="mt-12 border-t border-slate-300 pt-6 grid grid-cols-2 gap-8 avoid-break">
          <div>
            <span class="font-bold text-[10px] uppercase text-slate-950 mb-1 tracking-wider">Kepatuhan Realisasi Keuangan</span>
            <p class="text-[9px] text-slate-400 leading-relaxed">Seluruh realisasi pengeluaran di atas dicatat dengan benar beserta lampiran bukti fisik/digital yang valid untuk kepentingan pelaporan kepatuhan dan audit donor.</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <div class="border-b border-slate-400 h-12 w-32 mx-auto mb-1"></div>
              <p class="font-bold text-slate-800">___________________</p>
              <p class="text-[8px] text-slate-500 uppercase mt-0.5">Finance Manager / PIC Keuangan</p>
            </div>
            <div class="text-center">
              <div class="border-b border-slate-400 h-12 w-32 mx-auto mb-1"></div>
              <p class="font-bold text-slate-800">___________________</p>
              <p class="text-[8px] text-slate-500 uppercase mt-0.5">Program Director / Pimpinan</p>
            </div>
          </div>
        </div>

        <div class="no-print mt-12 text-center">
          <button data-print-trigger class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded shadow-lg text-xs tracking-wider uppercase">Cetak Laporan Realisasi</button>
        </div>

        <div class="mt-16 text-center text-[9px] text-slate-400 border-t pt-2">
          Dibuat secara otomatis dengan <strong>Impactory.id</strong> • Program LFA & Dynamic Realization Calculator
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    finalizePrintWindow(printWindow);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center bg-white dark:bg-slate-950 rounded-xl border border-rose-100 dark:border-rose-950">
        <p className="text-red-500 text-sm font-semibold">
          Gagal memuat anggaran: {error.message ?? 'Kesalahan tidak diketahui'}
        </p>
        <button 
          onClick={() => { setError(null); void loadData(); }}
          className="text-xs text-white bg-teal-600 px-4 py-1.5 rounded-lg font-medium hover:bg-teal-500 transition-colors">
          Muat Ulang
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground bg-white dark:bg-slate-950 rounded-xl border">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Memuat lembar anggaran program...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="rencana" className="w-full space-y-6" onValueChange={(v) => setActiveTab(v as 'rencana' | 'realisasi')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white/50 dark:bg-slate-950/20 backdrop-blur-md p-3 rounded-xl border shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Kalkulator & Realisasi Anggaran</h2>
            <p className="text-[11px] text-muted-foreground">Kelola rencana alokasi biaya program dan catat realisasi pengeluaran dalam satu dasbor.</p>
        </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg shadow-sm">
              <input
                type="checkbox"
                id="ngo-mode"
                checked={isNgoMode}
                onChange={(e) => handleNgoModeToggle(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="ngo-mode" className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 select-none cursor-pointer tracking-wider flex items-center gap-1.5">
                Skenario Efisiensi Internal (70%)
              </label>
            </div>

            <TabsList className="grid grid-cols-2 w-[280px]">
              <TabsTrigger value="rencana" className="text-xs font-bold flex items-center gap-1.5 py-2">
                <FileText className="h-3.5 w-3.5" /> Rencana Anggaran
              </TabsTrigger>
              <TabsTrigger value="realisasi" className="text-xs font-bold flex items-center gap-1.5 py-2">
                <DollarSign className="h-3.5 w-3.5 animate-pulse text-emerald-500" /> Realisasi Anggaran
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Mirror Budget Model — Programme Design only. PM has its own canonical summary in ProjectBudgetPage. */}
        {productMode !== 'project_management' && (
        <div className={`p-5 rounded-xl border mb-5 transition-all duration-300 ${
          !hasTargetBudget
            ? 'bg-slate-50/60 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800'
            : detailedBudgetIDR > (proposalBudget as number)
              ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/50'
              : detailedBudgetIDR === 0
                ? 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/40'
                : 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/40'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mirror Budget Model</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openTargetBudgetDialog}
                  className="h-6 px-2 text-[10px] font-bold"
                >
                  {hasTargetBudget ? 'Edit Program Budget' : 'Set Budget'}
                </Button>
                {mirrorBudgetState === 'STATE_A' && (
                  <Badge data-testid="mirror-state-badge" variant="outline" className="text-[10px] font-bold text-slate-700 bg-slate-50 dark:bg-slate-900/50 border-slate-300">STATE A</Badge>
                )}
                {mirrorBudgetState === 'STATE_B' && (
                  <Badge data-testid="mirror-state-badge" variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">STATE B</Badge>
                )}
                {mirrorBudgetState === 'STATE_C' && (
                  <Badge data-testid="mirror-state-badge" variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300">STATE C</Badge>
                )}
                {mirrorBudgetState === 'STATE_D' && (
                  <Badge data-testid="mirror-state-badge" variant="secondary" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300">STATE D</Badge>
                )}
                {allRowsUnpriced && (
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">UNPRICED</Badge>
                )}
                {partiallyPriced && (
                  <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300">PARTIAL</Badge>
                )}
                {fullyPriced && (
                  <Badge variant="secondary" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300">FULLY_PRICED</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block font-normal">Target Budget</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">
                    {hasTargetBudget ? `Rp ${(proposalBudget as number).toLocaleString('id-ID')}` : 'Belum tersedia'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-normal">Detailed Budget</span>
                  <span className={`font-mono font-semibold ${hasTargetBudget && detailedBudgetIDR > (proposalBudget as number) ? 'text-rose-600 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                    {hasBudgetRows ? `Rp ${detailedBudgetIDR.toLocaleString('id-ID')}` : 'Belum dibuat'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-normal">Coverage</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">
                    {hasTargetBudget
                      ? `${coveragePct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                      : '0,00%'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-normal">Gap (Belum dialokasikan)</span>
                  <span className={`font-mono font-semibold ${(gapBudgetIDR ?? 0) < 0 ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}>
                    {gapBudgetIDR === null ? 'Belum diketahui' : `Rp ${Math.abs(gapBudgetIDR).toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold mt-1 text-slate-600 dark:text-slate-300">
                {mirrorBudgetStatus}
              </p>

              {(showDraftActions || showContinueAction) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {showDraftActions && (
                    <>
                      <Button size="sm" onClick={() => { void handleGenerateDraftBudget(); }} className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white">
                        ⚡ Generate Draft Budget
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { void handleAddManualQuick(); }} className="text-xs font-bold">
                        Tambah Manual
                      </Button>
                    </>
                  )}
                  {showContinueAction && (
                    <Button size="sm" variant="outline" onClick={() => setIsHelperOpen(true)} className="text-xs font-bold border-blue-300 text-blue-700 hover:bg-blue-50">
                      Lanjutkan Penyusunan Anggaran
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="w-full lg:w-56 space-y-1">
              <span className="text-[10px] text-muted-foreground block">Coverage terhadap Target Budget</span>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    !hasTargetBudget ? 'bg-slate-400' : coveragePct > 100 ? 'bg-rose-500 animate-pulse' : coveragePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-muted-foreground block text-right font-mono font-bold">
                {hasTargetBudget
                  ? coveragePct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0,00'}%
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Dynamic Metric Cards at top (depending on active tab) */}
        {activeTab === 'rencana' ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
            {/* Realisasi Card 1: Planned Budget */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rencana RAB (Planned)</span>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  Rp {totalIDR.toLocaleString('id-ID')}
                </p>
                {globalMode === 'professional' && (
                  <p className="text-[10px] font-semibold text-slate-400">
                    ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>
            </div>

            {/* Realisasi Card 2: Actual Spent */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-emerald-100 dark:border-emerald-950/40 shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-all duration-300">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Realisasi (Actual)</span>
              <div className="space-y-1">
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  Rp {totalRealisasiIDR.toLocaleString('id-ID')}
                </p>
                {globalMode === 'professional' && (
                  <p className="text-[11px] font-bold text-indigo-600">
                    ${totalRealisasiUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>
            </div>

            {/* Realisasi Card 3: Remaining Budget */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Anggaran (Variance)</span>
              <div className="space-y-1">
                <p className={`text-base font-black ${remainingBudgetIDR < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                  Rp {remainingBudgetIDR.toLocaleString('id-ID')}
                </p>
                {globalMode === 'professional' && (
                  <p className="text-[11px] font-bold text-indigo-600">
                    ${remainingBudgetUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>
            </div>

            {/* Realisasi Card 4: Spend Rate */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm space-y-2 relative overflow-hidden group hover:shadow transition-all duration-300">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                <Percent className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tingkat Penyerapan</span>
              <div className="space-y-1">
                <p className="text-sm font-black text-indigo-600">
                  {realizationPercentage.toFixed(1)}% Terpakai
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, realizationPercentage)}%` }}
                    className="h-full rounded-full transition-all duration-500 bg-indigo-600"
                  ></div>
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">Serapan Rata-rata: Rp {actualBurnRateIDR.toLocaleString('id-ID')}/bulan</span>
              </div>
            </div>
          </div>
        )}

        {/* Alerts / Warnings */}
        {activeTab === 'rencana' && (sbmWarnings.length > 0 || emptyActivityWarnings.length > 0 || overheadPercentage > 20) && (
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

        {activeTab === 'realisasi' && isOverBudgetKritis && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800 dark:text-rose-400 uppercase tracking-wide">
              <AlertTriangle className="h-4 w-4 text-rose-500 animate-bounce" /> Peringatan Kritis: Over Budget (&gt;10%)
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-6 leading-relaxed">
              Total realisasi pengeluaran program saat ini (<strong>Rp {totalRealisasiIDR.toLocaleString('id-ID')}</strong>) telah melebihi batas toleransi 10% dari total anggaran yang direncanakan (<strong>Rp {totalIDR.toLocaleString('id-ID')}</strong>). Rasio penyerapan saat ini berada di angka <strong className="text-rose-600 dark:text-rose-400">{realizationPercentage.toFixed(1)}%</strong>.
            </p>
          </div>
        )}

        {activeTab === 'realisasi' && overBudgetItemsCount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-400 animate-fade-in">
            <span>⚠️</span>
            <span>Terdapat <strong>{overBudgetItemsCount} item pengeluaran</strong> yang melebihi alokasi rencana anggaran mula-mula. Gunakan panel adaptif MOR jika diperlukan penyesuaian strategi.</span>
          </div>
        )}

        {/* Tab 1 Content: Plans Editor */}
        <TabsContent value="rencana" className="space-y-6 mt-0">
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
                    <Check className="h-3.5 w-3.5" /> Tersimpan ke Supabase
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

          <div className="space-y-6">
            {/* ASISTEN ANGGARAN DETERMINISTIK INKINDO */}
            <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/20 to-sky-50/10 dark:from-slate-950/40 dark:to-slate-950/20 overflow-hidden shadow-sm hover:shadow transition-all duration-300">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-between text-white select-none">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-white/90" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-wider block">Asisten Anggaran INKINDO & Multiplier Provinsi</span>
                    <span className="text-[10px] text-indigo-100 block font-medium">Bantu rincikan anggaran remunerasi tenaga ahli secara instan & deterministik.</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsHelperOpen(!isHelperOpen)}
                  className="text-white hover:bg-white/10 p-1.5 h-auto text-xs font-bold gap-1 flex"
                >
                  {isHelperOpen ? "Sembunyikan" : "Tampilkan Asisten"}
                  {isHelperOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {isHelperOpen && (
                <div className="p-4 space-y-6 border-t animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Side: Professional/Consultant Calculator */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Kalkulator Remunerasi Tenaga Ahli (Perlem LKPP 12/2021)</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left inputs */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Tipe Remunerasi</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={calcInputType === 'personnel' ? 'default' : 'outline'}
                                onClick={() => { setCalcInputType('personnel'); setCalcSkk(true); }}
                                className="text-xs font-bold py-1 px-3"
                              >
                                Tenaga Ahli Profesional
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={calcInputType === 'consultant' ? 'default' : 'outline'}
                                onClick={() => { setCalcInputType('consultant'); setCalcSkk(false); }}
                                className="text-xs font-bold py-1 px-3"
                              >
                                Konsultan Individu
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase">Jenjang Pendidikan</Label>
                              <Select value={calcEducation} onValueChange={(val: any) => setCalcEducation(val)}>
                                <SelectTrigger className="text-xs h-9 font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="S1" className="text-xs font-semibold">S1 (Sarjana)</SelectItem>
                                  <SelectItem value="S2" className="text-xs font-semibold">S2 (Magister)</SelectItem>
                                  <SelectItem value="S3" className="text-xs font-semibold">S3 (Doktor)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase">Sertifikat Kerja (SKK)</Label>
                              <Select value={calcSkk ? "skk" : "no_skk"} onValueChange={(val) => setCalcSkk(val === "skk")}>
                                <SelectTrigger className="text-xs h-9 font-semibold" disabled={calcInputType === 'consultant'}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skk" className="text-xs font-semibold">Dengan SKK</SelectItem>
                                  <SelectItem value="no_skk" className="text-xs font-semibold">Tanpa SKK</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase">Pengalaman Kerja</Label>
                              <span className="text-xs font-extrabold text-indigo-600">{calcExperience} Tahun</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="25"
                              value={calcExperience}
                              onChange={(e) => setCalcExperience(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                              <span>1 Tahun</span>
                              <span>25 Tahun</span>
                            </div>
                          </div>
                        </div>

                        {/* Right inputs */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Aktivitas WBS (Tujuan Penempatan)</Label>
                            <Select value={calcActivityId} onValueChange={(val) => setCalcActivityId(val)}>
                              <SelectTrigger className="text-xs h-9 font-semibold">
                                <SelectValue placeholder="Pilih kegiatan WBS..." />
                              </SelectTrigger>
                              <SelectContent>
                                {wbsActivities.map((act) => (
                                  <SelectItem key={act.id} value={act.id} className="text-xs font-semibold">
                                    {act.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase">Provinsi Penugasan</Label>
                              <Select value={calcProvince} onValueChange={(val) => setCalcProvince(val)}>
                                <SelectTrigger className="text-xs h-9 font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                  {Object.keys(INKINDO_PROVINCE_MULTIPLIERS).map((prov) => (
                                    <SelectItem key={prov} value={prov} className="text-xs font-semibold">
                                      {prov}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase">Satuan Waktu (Unit)</Label>
                              <Select value={calcUnit} onValueChange={(val: any) => setCalcUnit(val)}>
                                <SelectTrigger className="text-xs h-9 font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Month" className="text-xs font-semibold">Bulan (SBOB)</SelectItem>
                                  <SelectItem value="Week" className="text-xs font-semibold">Minggu (SBOM)</SelectItem>
                                  <SelectItem value="Day" className="text-xs font-semibold">Hari (SBOH)</SelectItem>
                                  <SelectItem value="Hour" className="text-xs font-semibold">Jam (SBOJ)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              type="button"
                              onClick={handleAddProfessionalToBudget}
                              disabled={saving || wbsActivities.length === 0}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold text-xs h-9 shadow flex items-center justify-center gap-1.5"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Masukkan Tenaga Ahli ke RAB
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Live Rates & Province Multiplier Engine */}
                    <div className="lg:col-span-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-6">
                      {/* Part A: Calculated Results Box */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Live Calculated Rates (Compliant)</span>
                        
                        <div className="space-y-2">
                          <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400">Tarif Terpilih:</span>
                            <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                              Rp {calculateInkindoProfessionalRate(calcEducation, calcExperience, calcSkk, calcProvince, calcUnit, isNgoMode).toLocaleString('id-ID')}
                              <span className="text-[10px] font-bold text-slate-400 ml-1">/{calcUnit === 'Month' ? 'Bulan' : calcUnit === 'Week' ? 'Minggu' : calcUnit === 'Day' ? 'Hari' : 'Jam'}</span>
                            </span>
                          </div>

                          {/* Breakdown block */}
                          <div className="p-2.5 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-lg border border-indigo-50/40 dark:border-indigo-950/30 text-[10px] text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                              <span>Index Provinsi ({calcProvince}):</span>
                              <span className="font-extrabold text-slate-600 dark:text-slate-300">{(INKINDO_PROVINCE_MULTIPLIERS[calcProvince] || 1.0).toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>NGO Multiplier:</span>
                              <span className="font-extrabold text-slate-600 dark:text-slate-300">{isNgoMode ? "70% (Aktif)" : "100% (Komersial)"}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t">
                              <span>Est. Bulanan (SBOB):</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">Rp {calculateInkindoProfessionalRate(calcEducation, calcExperience, calcSkk, calcProvince, 'Month', isNgoMode).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Est. Harian (SBOH):</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">Rp {calculateInkindoProfessionalRate(calcEducation, calcExperience, calcSkk, calcProvince, 'Day', isNgoMode).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Part B: Province Multiplier Scaling Box */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          <AlertTriangle className="h-3.5 w-3.5" /> Province Multiplier Scaling Engine
                        </div>
                        
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-slate-500 uppercase">Target Lokasi Baru</Label>
                            <Select value={selectedScaleProvince} onValueChange={(val) => setSelectedScaleProvince(val)}>
                              <SelectTrigger className="text-[11px] h-8 font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                                {Object.keys(INKINDO_PROVINCE_MULTIPLIERS).map((prov) => (
                                  <SelectItem key={prov} value={prov} className="text-xs font-semibold">
                                    {prov}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleScaleBudgetByProvince(selectedScaleProvince)}
                            disabled={scaleLoading || budgetItems.length === 0}
                            className="w-full text-[10px] font-black tracking-wide h-8 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-950 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-400"
                          >
                            {scaleLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <TrendingUp className="h-3.5 w-3.5 mr-1" />
                            )}
                            Skalakan Tarif ke Provinsi Baru
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {wbsActivities.map((act, actIdx) => {
              const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
              const actTotal = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
              const actRealized = actItems.reduce((acc, i) => acc + (Number(i.actual_amount_idr) || 0), 0);
              const physicalPercent = act.status === 'completed' ? 100 : (act.progress_percent ?? 0);

              const varianceFlag = computeEvmVarianceFlag(
                physicalPercent,
                actTotal,
                actRealized,
                actItems.length
              );

              return (
                <Card key={act.id} className="border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Activity Header Banner */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 rounded text-[10px] font-bold flex items-center justify-center text-indigo-700">
                        {actIdx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{act.name}</span>

                          {/* EVM Variance Badge */}
                          {varianceFlag && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`py-0.5 px-2 text-[9.5px] font-bold tracking-tight shrink-0 flex items-center gap-1 cursor-help ${
                                      varianceFlag.type === 'high_physical'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                        : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    }`}
                                    data-testid={`budget-variance-flag-${varianceFlag.type}`}
                                  >
                                    <AlertTriangle className={`w-3 h-3 shrink-0 ${varianceFlag.type === 'high_physical' ? 'text-amber-600' : 'text-rose-600'}`} />
                                    <span>{varianceFlag.badgeLabel}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs space-y-1 p-2">
                                  <p className="font-bold">{varianceFlag.message}</p>
                                  <p className="text-[10px] opacity-80 font-mono">
                                    Progres Fisik WBS: {varianceFlag.physicalPercent}% | Realisasi Anggaran: {varianceFlag.financialPercent}%
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                          Timeline: {formatTimeline(act.start_month, act.duration_weeks)} | Progres WBS: {physicalPercent}%
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
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-xs">
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
                              const isUnfilled = (item.item_name === 'Rincian anggaran belum diisi' || !item.item_name?.trim()) || (Number(item.volume) === 0 && Number(item.unit_price_idr) === 0);

                              return (
                                <tr key={item.id} className={isUnfilled ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors" : "hover:bg-slate-50/30 dark:hover:bg-slate-900/10"}>
                                  {/* 1. Item Name Input with smart autocomplete */}
                                  <td className="p-3 relative align-middle">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <Input
                                          id={`budget-item-name-${item.id}`}
                                          aria-label={`Nama item anggaran ${item.item_name || 'baru'}`}
                                          value={item.item_name}
                                          onChange={(e) => handleItemNameTyping(item.id, e.target.value, item.category || 'Lainnya')}
                                          placeholder="Mis. Narasumber, Sewa LCD..."
                                          className={`text-xs h-8 bg-transparent flex-1 ${isUnfilled ? 'border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200' : ''}`}
                                        />
                                        {isUnfilled ? (
                                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.5 h-5 whitespace-nowrap shrink-0 flex items-center gap-1">
                                            <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> Perlu diisi
                                          </Badge>
                                        ) : item.justification?.includes('AUTO_GENERATED') ? (
                                          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 text-[8px] font-bold px-1.5 py-0 h-5 whitespace-nowrap">
                                            Auto-Draft
                                          </Badge>
                                        ) : null}
                                      </div>

                                      {/* Custom Autocomplete Suggestions Popover */}
                                      {isSuggested && filteredSuggestions.length > 0 && (
                                        <div className="absolute z-10 left-3 top-11 w-72 bg-white dark:bg-slate-900 border rounded-lg shadow-xl divide-y text-[11px] overflow-hidden">
                                          <div className="bg-slate-50 dark:bg-slate-950 p-1.5 font-bold text-[9px] text-slate-400 uppercase tracking-widest">
                                            Referensi Anggaran (estimasi, belum terverifikasi)
                                          </div>
                                          {filteredSuggestions.map((sbm, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => selectSuggestion(item.id, sbm)}
                                              className="w-full text-left p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 flex flex-col gap-0.5"
                                            >
                                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-1">
                                                <span className="truncate">{sbm.name}</span>
                                                <span className="px-1 rounded text-[7px] font-black uppercase flex-shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/40">
                                                  referensi
                                                </span>
                                              </span>
                                              <span className="text-[10px] text-slate-400">
                                                Rp {sbm.price.toLocaleString('id-ID')}/{sbm.unit} • {sbm.category}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {globalMode === 'professional' && (
                                        <Textarea
                                          id={`budget-justification-${item.id}`}
                                          aria-label={`Justifikasi anggaran untuk ${item.item_name || 'item'}`}
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
                                      <SelectTrigger aria-label={`Kategori biaya untuk ${item.item_name || 'item'}`} className="h-8 text-xs bg-transparent">
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
                                        <SelectTrigger aria-label={`Kategori struktur biaya untuk ${item.item_name || 'item'}`} className="h-8 text-[10px] bg-transparent font-medium text-slate-600 dark:text-slate-300">
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
                                      id={`budget-volume-${item.id}`}
                                      aria-label={`Volume unit untuk ${item.item_name || 'item'}`}
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
                                      <SelectTrigger aria-label={`Satuan unit untuk ${item.item_name || 'item'}`} className="h-8 text-xs bg-transparent">
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
                                        id={`budget-price-${item.id}`}
                                        aria-label={`Harga satuan IDR untuk ${item.item_name || 'item'}`}
                                        type="number"
                                        value={item.unit_price_idr}
                                        onChange={(e) => handleFieldChange(item.id, 'unit_price_idr', Number(e.target.value))}
                                        className="text-xs h-8 bg-transparent pr-12 font-semibold"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleCheckSbmReference(item)}
                                        title="Cek Referensi SBM TA 2026"
                                        className="absolute right-1.5 h-6 w-8 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border border-blue-200/50 flex items-center justify-center text-[10px]"
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
                                          <SelectTrigger aria-label={`Sumber dana untuk ${item.item_name || 'item'}`} className="h-8 text-[10px] bg-transparent">
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

          {/* Bottom Breakdown details (Professional Only) */}
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
        </TabsContent>

        {/* Tab 2 Content: Realization Tracker */}
        <TabsContent value="realisasi" className="space-y-6 mt-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-xs py-1.5 px-3 uppercase tracking-wider font-bold">
                Mode Tampilan: {globalMode === 'simple' ? '🌱 Sederhana' : '🏢 Profesional'}
              </Badge>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {saving ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" /> Menyimpan...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="h-3.5 w-3.5" /> Tersimpan ke Supabase
                  </span>
                ) : (
                  <span>Autosave aktif</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleExportRealisasi}
                className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-md"
              >
                <Download className="h-3.5 w-3.5" /> Cetak Laporan Realisasi
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {wbsActivities.map((act, actIdx) => {
              const actItems = budgetItems.filter(i => i.wbs_item_id === act.id);
              const actTotalPlanned = actItems.reduce((acc, i) => acc + ((Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0)), 0);
              const actTotalActual = actItems.reduce((acc, i) => acc + (Number(i.actual_amount_idr) || 0), 0);
              const actVariance = actTotalPlanned - actTotalActual;

              return (
                <Card key={`real_${act.id}`} className="border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
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

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold">
                      <div className="text-left sm:text-right space-y-0.5">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">Rencana RAB</span>
                        <span className="text-slate-500">
                          Rp {actTotalPlanned.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-left sm:text-right space-y-0.5 border-l pl-4">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">Realisasi Aktual</span>
                        <span className="text-emerald-600 font-extrabold">
                          Rp {actTotalActual.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-left sm:text-right space-y-0.5 border-l pl-4">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">Selisih (Variance)</span>
                        <span className={`font-extrabold ${actVariance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          Rp {actVariance.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    {actItems.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground italic text-xs border-dashed border-2 m-4 rounded-lg bg-slate-50/20">
                        Belum ada rincian item anggaran rencana untuk aktivitas ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-xs">
                              <th className="text-left p-3 w-1/4">Nama Item Biaya (Rencana)</th>
                              <th className="text-right p-3 w-[12%]">RAB Satuan</th>
                              <th className="text-right p-3 w-[12%]">RAB Total (Planned)</th>
                              <th className="text-right p-3 w-[150px]">Realisasi Pengeluaran (Actual IDR)</th>
                              <th className="text-center p-3 w-[130px]">Tanggal Belanja</th>
                              {globalMode === 'professional' && (
                                <th className="text-left p-3 w-1/4">Catatan & Link Bukti (URL)</th>
                              )}
                              <th className="text-right p-3 w-[12%]">Varian (Variance)</th>
                              <th className="text-center p-3 w-[100px]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {actItems.map(item => {
                              const plannedTotal = (Number(item.volume) || 0) * (Number(item.unit_price_idr) || 0);
                              const actualTotal = Number(item.actual_amount_idr) || 0;
                              const variance = plannedTotal - actualTotal;

                              let statusBadge = 'Belum Realisasi';
                              let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
                              if (item.actual_amount_idr !== null && item.actual_amount_idr !== undefined && String(item.actual_amount_idr) !== '') {
                                if (actualTotal > plannedTotal) {
                                  statusBadge = 'Over budget';
                                  badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 font-bold';
                                } else if (variance <= plannedTotal * 0.05) {
                                  statusBadge = 'Sesuai';
                                  badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 font-bold';
                                } else {
                                  statusBadge = 'Efisien';
                                  badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 font-bold';
                                }
                              }

                              return (
                                <tr key={`real_row_${item.id}`} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                                  {/* 1. Item Name - Read-only */}
                                  <td className="p-3 align-middle font-medium text-slate-700 dark:text-slate-300">
                                    <div className="space-y-0.5">
                                      <span>{item.item_name}</span>
                                      <span className="text-[10px] text-slate-400 block font-semibold">
                                        Vol Rencana: {item.volume} {item.unit || 'Orang'} • {item.category || 'Lainnya'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* 2. Planned Unit Price - Read-only */}
                                  <td className="p-3 text-right text-slate-500 align-middle">
                                    Rp {item.unit_price_idr.toLocaleString('id-ID')}
                                  </td>

                                  {/* 3. Planned Total - Read-only */}
                                  <td className="p-3 text-right font-semibold text-slate-600 dark:text-slate-400 align-middle">
                                    Rp {plannedTotal.toLocaleString('id-ID')}
                                  </td>

                                  {/* 4. Actual Amount Input */}
                                  <td className="p-3 align-middle">
                                    <div className="relative flex items-center">
                                      <span className="absolute left-2.5 text-slate-400 text-[10px] font-bold">Rp</span>
                                      <Input
                                        type="number"
                                        value={item.actual_amount_idr === null || item.actual_amount_idr === undefined ? '' : item.actual_amount_idr}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? null : Number(e.target.value);
                                          handleFieldChange(item.id, 'actual_amount_idr', val);
                                        }}
                                        placeholder="0"
                                        className="text-xs h-8 pl-8 font-extrabold bg-transparent text-emerald-600 border-slate-200 dark:border-slate-800"
                                      />
                                    </div>
                                  </td>

                                  {/* 5. Realization Date Input */}
                                  <td className="p-3 align-middle">
                                    <Input
                                      type="date"
                                      value={item.realisasi_date || ''}
                                      onChange={(e) => handleFieldChange(item.id, 'realisasi_date', e.target.value || null)}
                                      className="text-xs h-8 bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                    />
                                  </td>

                                  {/* 6. Notes & Evidence Link (Professional Mode only) */}
                                  {globalMode === 'professional' && (
                                    <td className="p-3 align-middle">
                                      <div className="space-y-1.5">
                                        <Textarea
                                          value={item.realisasi_notes || ''}
                                          onChange={(e) => handleFieldChange(item.id, 'realisasi_notes', e.target.value || null)}
                                          placeholder="Catatan belanja / nomor kuitansi..."
                                          rows={1}
                                          className="text-[10px] p-1.5 min-h-[30px] resize-y bg-transparent"
                                        />
                                        <div className="relative flex items-center">
                                          <LinkIcon className="absolute left-2 h-3 w-3 text-slate-400" />
                                          <Input
                                            value={item.realisasi_evidence_url || ''}
                                            onChange={(e) => handleFieldChange(item.id, 'realisasi_evidence_url', e.target.value || null)}
                                            placeholder="https://link-bukti-kuitansi.com"
                                            className="text-[10px] h-6 pl-7 bg-transparent text-indigo-500 font-semibold border-slate-200 dark:border-slate-800"
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  )}

                                  {/* 7. Variance calculated */}
                                  <td className={`p-3 text-right font-extrabold align-middle ${variance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                    Rp {variance.toLocaleString('id-ID')}
                                  </td>

                                  {/* 8. Status Badge */}
                                  <td className="p-3 text-center align-middle">
                                    <Badge variant="outline" className={`text-[10px] py-1 px-2 border ${badgeColor}`}>
                                      {statusBadge}
                                    </Badge>
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
        </TabsContent>
      </Tabs>

      {/* 6. SBM AI DIALOG */}
      <Dialog open={sbmCheckOpen} onOpenChange={setSbmCheckOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-bold uppercase text-amber-600">
              <Sparkles className="h-4 w-4 text-amber-500" /> Referensi SBM 2026 PMK 32/2025
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mengevaluasi harga item biaya menggunakan database asisten AI standar masukan Indonesia.
            </DialogDescription>
          </DialogHeader>

          {sbmLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Membandingkan anggaran dengan SBM PMK 32/2025...</span>
            </div>
          ) : sbmSuggestion ? (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block">🔬 Hasil Analisis Kepatuhan SBM</span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Rekomendasi Unit Price: <span className="text-amber-600">Rp {sbmSuggestion.reference_price.toLocaleString('id-ID')}</span>
                </p>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {sbmSuggestion.explanation}
                </p>
              </div>

              {sbmTargetItem && sbmTargetItem.unit_price_idr > sbmSuggestion.reference_price * 2 && (
                <div className="p-2 border border-rose-200/50 bg-rose-50/30 text-[10px] rounded text-rose-600 leading-relaxed flex gap-2 font-medium">
                  <span>⚠️</span>
                  <span><strong>Peringatan Kelebihan:</strong> Anggaran Anda melebihi 2x standar resmi PMK. Pastikan memiliki lembar justifikasi yang kuat untuk keperluan audit donor.</span>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSbmCheckOpen(false)} className="text-xs">
              Abaikan
            </Button>
            {sbmSuggestion && (
              <Button size="sm" onClick={handleApplySbmSuggestion} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">
                Terapkan Standar SBM
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={targetBudgetDialogOpen} onOpenChange={setTargetBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hasTargetBudget ? 'Edit Program Budget' : 'Set Target Budget'}</DialogTitle>
            <DialogDescription>
              Target budget ini menjadi acuan yang sama untuk WBS dan Budget Tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="budget-tab-target-budget-input">Target Budget (IDR)</Label>
            <Input
              id="budget-tab-target-budget-input"
              inputMode="numeric"
              placeholder="contoh: 500000000"
              value={targetBudgetInput}
              onChange={(e) => setTargetBudgetInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetBudgetDialogOpen(false)} disabled={savingTargetBudget}>
              Batal
            </Button>
            <Button onClick={() => { void handleSaveTargetBudget(); }} disabled={savingTargetBudget}>
              {savingTargetBudget ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
