// src/pages/dashboard/lfa-builder/SROICalculator.tsx
// High-fidelity SROI Calculator with dual Simple Wizard & Professional Spreadsheet mode.
// Tailored for Indonesian NGOs and donor-ready reporting.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LfaSroiConfig, LfaSroiOutcome, MealItem } from './types';
import { SROI_PROXIES_INDONESIA, SROI_SECTORS, SroiProxyItem } from '@/data/sroi-proxies-indonesia';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, Percent, TrendingUp, HelpCircle, ArrowRight, Settings, Info,
  BarChart2, RefreshCw, Layers, FileText, Leaf
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { getProjectCarbonSummary } from '@/lib/carbon/aggregation';


interface SROICalculatorProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
}

export default function SROICalculator({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya'
}: SROICalculatorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<LfaSroiConfig | null>(null);
  const [outcomes, setOutcomes] = useState<LfaSroiOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Local states for virtual registry-linked outcome
  const [registryProxyValueIdr, setRegistryProxyValueIdr] = useState(0);
  const [registryDurationYears, setRegistryDurationYears] = useState(1);
  const [registryAttributionPct, setRegistryAttributionPct] = useState(100);
  const [registryDeadweightPct, setRegistryDeadweightPct] = useState(0);
  const [registryDisplacementPct, setRegistryDisplacementPct] = useState(0);
  const [registryDropoffPctPerYear, setRegistryDropoffPctPerYear] = useState(0);

  const registryRef = useRef({
    proxy_value_idr: 0,
    duration_years: 1,
    attribution_pct: 100,
    deadweight_pct: 0,
    displacement_pct: 0,
    dropoff_pct_per_year: 0
  });

  // Sync state changes to ref
  useEffect(() => {
    registryRef.current = {
      proxy_value_idr: registryProxyValueIdr,
      duration_years: registryDurationYears,
      attribution_pct: registryAttributionPct,
      deadweight_pct: registryDeadweightPct,
      displacement_pct: registryDisplacementPct,
      dropoff_pct_per_year: registryDropoffPctPerYear
    };
  }, [registryProxyValueIdr, registryDurationYears, registryAttributionPct, registryDeadweightPct, registryDisplacementPct, registryDropoffPctPerYear]);

  // Fetch verified beneficiaries count from Beneficiary Registry
  const { data: registryCount = 0 } = useQuery({
    queryKey: ['registry-beneficiary-count', projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('beneficiaries')
        .select('*', { count: 'exact', head: true })
        .eq('lfa_project_id', projectId);

      if (error) {
        console.warn('Registry fetch failed', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Fetch carbon tracking summary for current project
  const { data: carbonSummary } = useQuery({
    queryKey: ['project-carbon', projectId],
    queryFn: async () => {
      if (!projectId || !orgId) return null;
      return getProjectCarbonSummary(projectId, orgId);
    },
    enabled: !!projectId && !!orgId,
    staleTime: 60000
  });

  // Simple Mode Wizard Steps: 1, 2, 3, 4
  const [wizardStep, setStep] = useState<number>(1);
  const [activeOutcomeId, setActiveOutcomeId] = useState<string | null>(null);

  // AI loading indicators
  const [aiProxyLoading, setAiProxyLoading] = useState<string | null>(null);
  const [aiNarrativeLoading, setAiNarrativeLoading] = useState(false);
  const [aiSensitivityLoading, setAiSensitivityLoading] = useState(false);

  // Reference references list
  const [selectedSector, setSelectedSector] = useState<string>('Pendidikan');

  const outcomesRef = useRef<LfaSroiOutcome[]>([]);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    outcomesRef.current = outcomes;
  }, [outcomes]);

  // Load configuration and SROI outcomes
  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch config
      const { data: configData, error: configErr } = await supabase
        .from('lfa_sroi_config')
        .select('*')
        .eq('lfa_project_id', projectId)
        .maybeSingle();

      if (configErr) throw configErr;

      // 2. Fetch outcomes
      const { data: outcomesData, error: outcomesErr } = await supabase
        .from('lfa_sroi_outcomes')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (outcomesErr) throw outcomesErr;

      if (configData) {
        setConfig(configData as LfaSroiConfig);
        setOutcomes((outcomesData || []) as LfaSroiOutcome[]);
      } else {
        // First-time load: trigger auto-import
        await triggerAutoImport();
      }
    } catch (err: any) {
      console.error('Error loading SROI data:', err);
      setError(err as Error);
      toast({
        title: 'Gagal memuat SROI',
        description: err.message || 'Terjadi kesalahan saat memuat data SROI.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, orgId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Auto-Import & Re-Sync Logic
  // ---------------------------------------------------------------------------
  const triggerAutoImport = async (isManualSync = false) => {
    if (!orgId) return;
    if (isManualSync) setSyncing(true);
    try {
      // A. Import total investment from lfa_budget_items
      const { data: budgetItems, error: bgtErr } = await supabase
        .from('lfa_budget_items')
        .select('volume, unit_price_idr')
        .eq('lfa_project_id', projectId);

      if (bgtErr) throw bgtErr;

      let totalBudgetCost = 0;
      if (budgetItems) {
        totalBudgetCost = (budgetItems ?? []).reduce((sum, item) => sum + ((item?.volume ?? 0) * (item?.unit_price_idr ?? 0)), 0);
      }

      // Calculate timeline duration in years
      const computedYears = Math.max(1, Math.ceil((programDurationMonths ?? 12) / 12));

      // Fetch existing config or create new
      let currentConfig: LfaSroiConfig;
      const { data: configCheck } = await supabase
        .from('lfa_sroi_config')
        .select('*')
        .eq('lfa_project_id', projectId)
        .maybeSingle();

      if (configCheck) {
        currentConfig = configCheck as LfaSroiConfig;
        // Update investment on re-sync if changed
        if (isManualSync && totalBudgetCost > 0) {
          const { data: updatedConfig } = await supabase
            .from('lfa_sroi_config')
            .update({ total_investment_idr: totalBudgetCost })
            .eq('id', currentConfig.id)
            .select()
            .single();
          if (updatedConfig) currentConfig = updatedConfig as LfaSroiConfig;
        }
      } else {
        // Create new SROI configuration
        const { data: projectCheck } = await supabase
          .from('lfa_projects')
          .select('beneficiary_count')
          .eq('id', projectId)
          .maybeSingle();

        const { data: newConfig, error: insertConfigErr } = await supabase
          .from('lfa_sroi_config')
          .insert({
            lfa_project_id: projectId,
            org_id: orgId,
            total_investment_idr: totalBudgetCost,
            analysis_period_years: computedYears,
            discount_rate: 0.035,
            beneficiary_count: projectCheck?.beneficiary_count ?? null,
            mode: 'simple',
            sroi_ratio: 0,
            total_gross_value_idr: 0,
            total_present_value_idr: 0
          })
          .select()
          .single();

        if (insertConfigErr) throw insertConfigErr;
        currentConfig = newConfig as LfaSroiConfig;
      }

      // B. Import outcomes from MEAL items
      const { data: mealItems, error: mealErr } = await supabase
        .from('lfa_meal_items')
        .select('*')
        .eq('lfa_project_id', projectId);

      if (mealErr) throw mealErr;

      const importedOutcomes: LfaSroiOutcome[] = [];

      if (mealItems && mealItems.length > 0) {
        // Query current outcome items to prevent duplicates
        const { data: existingOutcomes } = await supabase
          .from('lfa_sroi_outcomes')
          .select('meal_item_id')
          .eq('lfa_project_id', projectId);

        const existingMealIds = new Set((existingOutcomes ?? []).map(o => o?.meal_item_id).filter(Boolean));

        let orderIdx = existingOutcomes?.length ?? 0;

        for (const item of (mealItems ?? []) as MealItem[]) {
          if (item?.id && existingMealIds.has(item.id)) continue;

          // Standard default estimates
          const defProxy = (SROI_PROXIES_INDONESIA ?? []).find(p => p?.category?.toLowerCase() === sector?.toLowerCase()) || 
                           SROI_PROXIES_INDONESIA?.[0];

          const { data: inserted, error: insErr } = await supabase
            .from('lfa_sroi_outcomes')
            .insert({
              lfa_project_id: projectId,
              org_id: orgId,
              meal_item_id: item?.id,
              outcome_name: item?.indicator_text ?? '',
              quantity: item?.target_value ?? 1,
              unit: item?.target_unit ?? 'orang',
              proxy_value_idr: 0, // Let user choose from reference or enter manually
              duration_years: computedYears,
              attribution_pct: 80,
              deadweight_pct: 20,
              displacement_pct: 0,
              dropoff_pct_per_year: 0,
              gross_value_idr: 0,
              present_value_idr: 0,
              mode: currentConfig?.mode ?? 'simple',
              sort_order: orderIdx++
            })
            .select()
            .single();

          if (!insErr && inserted) {
            importedOutcomes.push(inserted as LfaSroiOutcome);
          }
        }
      }

      // Refresh states
      const { data: allOutcomes } = await supabase
        .from('lfa_sroi_outcomes')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });

      setConfig(currentConfig);
      setOutcomes((allOutcomes || []) as LfaSroiOutcome[]);

      // Recalculate everything deterministically and update config
      if (allOutcomes && allOutcomes.length > 0) {
        recalculateAndSave(currentConfig, (allOutcomes || []) as LfaSroiOutcome[]);
      }

      toast({
        title: isManualSync ? 'Sinkronisasi Selesai 🔄' : 'Data Berhasil Diimpor 📋',
        description: 'Data diimpor dari LFA, MEAL, dan Budget kamu. Lengkapi nilai proxy dan adjustment.',
      });

    } catch (err: any) {
      console.error('Error in SROI auto-import:', err);
      toast({
        title: 'Auto-import Gagal',
        description: err.message || 'Gagal menyinkronkan data LFA/MEAL.',
        variant: 'destructive',
      });
    } finally {
      if (isManualSync) setSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SROI Calculations (Strict Deterministic)
  // ---------------------------------------------------------------------------
  const calculateOutcomeValues = (outcome: LfaSroiOutcome, discountRate: number) => {
    const gross = (outcome?.quantity ?? 0) * (outcome?.proxy_value_idr ?? 0);
    
    const net = gross 
      * ((outcome?.attribution_pct ?? 0) / 100) 
      * (1 - (outcome?.deadweight_pct ?? 0) / 100) 
      * (1 - (outcome?.displacement_pct ?? 0) / 100);

    let presentValueTotal = 0;
    const durationYears = outcome?.duration_years ?? 1;
    for (let year = 1; year <= durationYears; year++) {
      const yearVal = net * Math.pow(1 - (outcome?.dropoff_pct_per_year ?? 0) / 100, year - 1);
      const presentValYear = yearVal / Math.pow(1 + (discountRate ?? 0.035), year);
      presentValueTotal += presentValYear;
    }

    return {
      gross_value: gross,
      present_value: presentValueTotal
    };
  };

  const recalculateAndSave = async (curConfig: LfaSroiConfig, curOutcomes: LfaSroiOutcome[]) => {
    if (!orgId) return;
    setSaving(true);
    try {
      let totalGross = 0;
      let totalPresentValue = 0;

      const updatedOutcomes = (curOutcomes ?? []).map(out => {
        const { gross_value, present_value } = calculateOutcomeValues(out, curConfig?.discount_rate ?? 0.035);
        totalGross += gross_value;
        totalPresentValue += present_value;

        return {
          ...out,
          gross_value_idr: gross_value,
          present_value_idr: present_value
        };
      });

      // Inject the virtual registry outcome calculation to the SROI totals if registryCount > 0
      if (registryCount > 0) {
        const registryRow: LfaSroiOutcome = {
          id: 'registry-linked',
          lfa_project_id: projectId,
          org_id: orgId,
          meal_item_id: null,
          outcome_name: 'Penerima Manfaat (Terverifikasi)',
          outcome: 'Penerima Manfaat (Terverifikasi)',
          quantity: registryCount,
          unit: 'orang',
          proxy_value_idr: registryRef.current.proxy_value_idr,
          proxy_value: registryRef.current.proxy_value_idr,
          duration_years: registryRef.current.duration_years,
          duration: registryRef.current.duration_years,
          attribution_pct: registryRef.current.attribution_pct,
          attribution: registryRef.current.attribution_pct === 100 ? 1 : registryRef.current.attribution_pct / 100,
          deadweight_pct: registryRef.current.deadweight_pct,
          displacement_pct: registryRef.current.displacement_pct,
          dropoff_pct_per_year: registryRef.current.dropoff_pct_per_year,
          dropoff: registryRef.current.dropoff_pct_per_year,
          gross_value_idr: 0,
          present_value_idr: 0,
          mode: curConfig?.mode ?? 'simple',
          sort_order: curOutcomes.length,
          is_registry_linked: true
        };

        const { gross_value, present_value } = calculateOutcomeValues(registryRow, curConfig?.discount_rate ?? 0.035);
        totalGross += gross_value;
        totalPresentValue += present_value;
      }

      // Avoid divide-by-zero
      const totalInvestment = curConfig?.total_investment_idr ?? 0;
      const sroiRatio = totalInvestment > 0 
        ? parseFloat((totalPresentValue / totalInvestment).toFixed(2))
        : 0;

      // Update outcomes locally
      setOutcomes(updatedOutcomes);

      // Save outcomes in database in parallel background
      for (const item of updatedOutcomes) {
        if (item?.id) {
          await supabase
            .from('lfa_sroi_outcomes')
            .update({
              gross_value_idr: item.gross_value_idr,
              present_value_idr: item.present_value_idr
            })
            .eq('id', item.id);
        }
      }

      // Update config locally & remotely
      const updatedConfig = {
        ...curConfig,
        sroi_ratio: sroiRatio,
        total_gross_value_idr: totalGross,
        total_present_value_idr: totalPresentValue
      } as LfaSroiConfig;
      setConfig(updatedConfig);

      if (curConfig?.id) {
        await supabase
          .from('lfa_sroi_config')
          .update({
            sroi_ratio: sroiRatio,
            total_gross_value_idr: totalGross,
            total_present_value_idr: totalPresentValue
          })
          .eq('id', curConfig.id);
      }

      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Recalculation save failed:', err);
      toast({
        title: 'Gagal Menyimpan Rekalkulasi SROI',
        description: err?.message || 'Silakan coba lagi.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Debounced Saves for Inputs & Sliders (1.5 seconds)
  // ---------------------------------------------------------------------------
  const debounceSaveConfig = (newConfig: LfaSroiConfig) => {
    if (!orgId) return;
    if (!newConfig?.id) return;
    const key = `config-${newConfig.id}`;
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    setConfig(newConfig);

    debounceTimers.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('lfa_sroi_config')
          .update({
            total_investment_idr: newConfig?.total_investment_idr ?? 0,
            discount_rate: newConfig?.discount_rate ?? 0.035,
            analysis_period_years: newConfig?.analysis_period_years ?? 1,
            beneficiary_count: newConfig?.beneficiary_count ?? null,
            mode: newConfig?.mode ?? 'simple',
            ai_narrative: newConfig?.ai_narrative ?? null,
            sensitivity_result: newConfig?.sensitivity_result ?? null
          })
          .eq('id', newConfig.id);

        if (error) throw error;
        setLastSaved(new Date());

        // Recalculate in case investment or rate changed
        recalculateAndSave(newConfig, outcomesRef.current);
      } catch (err) {
        console.error('Debounced save config failed:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  const debounceSaveOutcome = (newOutcome: LfaSroiOutcome) => {
    if (!orgId) return;
    if (!newOutcome?.id) return;
    const key = `outcome-${newOutcome.id}`;
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    if (newOutcome.id === 'registry-linked') {
      // Instant local state update for responsive feel
      setRegistryProxyValueIdr(newOutcome.proxy_value_idr);
      setRegistryDurationYears(newOutcome.duration_years);
      setRegistryAttributionPct(newOutcome.attribution_pct);
      setRegistryDeadweightPct(newOutcome.deadweight_pct || 0);
      setRegistryDisplacementPct(newOutcome.displacement_pct || 0);
      setRegistryDropoffPctPerYear(newOutcome.dropoff_pct_per_year || 0);

      registryRef.current = {
        proxy_value_idr: newOutcome.proxy_value_idr,
        duration_years: newOutcome.duration_years,
        attribution_pct: newOutcome.attribution_pct,
        deadweight_pct: newOutcome.deadweight_pct || 0,
        displacement_pct: newOutcome.displacement_pct || 0,
        dropoff_pct_per_year: newOutcome.dropoff_pct_per_year || 0
      };

      debounceTimers.current[key] = setTimeout(async () => {
        setSaving(true);
        try {
          setLastSaved(new Date());
          if (config) {
            recalculateAndSave(config, outcomesRef.current);
          }
        } catch (err) {
          console.error('Debounced save virtual registry outcome failed:', err);
        } finally {
          setSaving(false);
        }
      }, 1500);

      return;
    }

    // Update locally instantly for responsive feel
    const updated = (outcomes ?? []).map(o => o?.id === newOutcome?.id ? newOutcome : o);
    setOutcomes(updated);

    debounceTimers.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        const discountRate = config?.discount_rate ?? 0.035;
        const { gross_value, present_value } = calculateOutcomeValues(newOutcome, discountRate);

        const { error } = await supabase
          .from('lfa_sroi_outcomes')
          .update({
            outcome_name: newOutcome?.outcome_name ?? '',
            quantity: newOutcome?.quantity ?? 0,
            unit: newOutcome?.unit ?? '',
            proxy_value_idr: newOutcome?.proxy_value_idr ?? 0,
            proxy_source: newOutcome?.proxy_source ?? null,
            proxy_citation: newOutcome?.proxy_citation ?? null,
            proxy_category: newOutcome?.proxy_category ?? null,
            duration_years: newOutcome?.duration_years ?? 1,
            attribution_pct: newOutcome?.attribution_pct ?? 80,
            deadweight_pct: newOutcome?.deadweight_pct ?? 20,
            displacement_pct: newOutcome?.displacement_pct ?? 0,
            dropoff_pct_per_year: newOutcome?.dropoff_pct_per_year ?? 0,
            gross_value_idr: gross_value,
            present_value_idr: present_value,
            mode: newOutcome?.mode ?? 'simple'
          })
          .eq('id', newOutcome.id);

        if (error) throw error;
        setLastSaved(new Date());

        // Perform global recalculation
        if (config) {
          recalculateAndSave(config, updated);
        }
      } catch (err) {
        console.error('Debounced save outcome failed:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleModeToggle = (mode: 'simple' | 'professional') => {
    if (!orgId) return;
    if (!config) return;
    const updatedConfig = { ...config, mode };
    debounceSaveConfig(updatedConfig);

    // Also update outcomes mode for consistency
    const updatedOutcomes = (outcomes ?? []).map(o => ({ ...o, mode }));
    setOutcomes(updatedOutcomes);

    // Bulk save in DB
    supabase
      .from('lfa_sroi_outcomes')
      .update({ mode })
      .eq('lfa_project_id', projectId)
      .then(({ error }) => {
        if (error) console.error('Bulk outcome mode update error:', error);
      });
  };

  const handleApplyProxyReference = (outcomeId: string, proxy: SroiProxyItem) => {
    if (outcomeId === 'registry-linked') {
      const updated: LfaSroiOutcome = {
        id: 'registry-linked',
        lfa_project_id: projectId,
        org_id: orgId,
        meal_item_id: null,
        outcome_name: 'Penerima Manfaat (Terverifikasi)',
        outcome: 'Penerima Manfaat (Terverifikasi)',
        quantity: registryCount,
        unit: 'orang',
        proxy_value_idr: proxy?.value_idr ?? 0,
        proxy_value: proxy?.value_idr ?? 0,
        proxy_source: proxy?.source ?? 'Beneficiary Registry',
        proxy_citation: proxy?.citation ?? '',
        proxy_category: proxy?.category ?? 'Penerima Manfaat',
        duration_years: registryRef.current.duration_years,
        duration: registryRef.current.duration_years,
        attribution_pct: registryRef.current.attribution_pct,
        attribution: registryRef.current.attribution_pct === 100 ? 1 : registryRef.current.attribution_pct / 100,
        deadweight_pct: registryRef.current.deadweight_pct,
        displacement_pct: registryRef.current.displacement_pct,
        dropoff_pct_per_year: registryRef.current.dropoff_pct_per_year,
        dropoff: registryRef.current.dropoff_pct_per_year,
        is_registry_linked: true,
        sort_order: outcomes.length
      };

      debounceSaveOutcome(updated);
      toast({
        title: 'Proxy Diaplikasikan',
        description: `Proxy "${proxy?.name ?? ''}" berhasil diterapkan.`
      });
      return;
    }

    const target = (outcomes ?? []).find(o => o?.id === outcomeId);
    if (!target) return;

    const updated = {
      ...target,
      proxy_value_idr: proxy?.value_idr ?? 0,
      proxy_source: proxy?.source ?? null,
      proxy_citation: proxy?.citation ?? null,
      proxy_category: proxy?.category ?? null
    };

    debounceSaveOutcome(updated);
    toast({
      title: 'Proxy Diaplikasikan',
      description: `Proxy "${proxy?.name ?? ''}" berhasil diterapkan.`
    });
  };

  const handleDeleteOutcome = async (id: string) => {
    if (!orgId) return;
    if (!confirm('Hapus analisa outcome SROI ini?')) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_sroi_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = (outcomes ?? []).filter(o => o?.id !== id);
      setOutcomes(updated);
      recalculateAndSave(config!, updated);

      toast({
        title: 'Outcome Dihapus',
        description: 'Analis outcome berhasil dihapus dari database.'
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menghapus',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddManualOutcome = async () => {
    if (!orgId) return;
    if (!config) return;
    setSaving(true);
    try {
      const newOrder = outcomes?.length ?? 0;
      const { data, error } = await supabase
        .from('lfa_sroi_outcomes')
        .insert({
          lfa_project_id: projectId,
          org_id: orgId,
          outcome_name: 'Outcome Baru Manual',
          quantity: 1,
          unit: 'orang',
          proxy_value_idr: 0,
          duration_years: config?.analysis_period_years ?? 1,
          attribution_pct: 80,
          deadweight_pct: 20,
          displacement_pct: 0,
          dropoff_pct_per_year: 0,
          mode: config?.mode ?? 'simple',
          sort_order: newOrder
        })
        .select()
        .single();

      if (error) throw error;

      const updated = [...(outcomes ?? []), data as LfaSroiOutcome];
      setOutcomes(updated);
      recalculateAndSave(config, updated);

      toast({
        title: 'Outcome Ditambahkan',
        description: 'Lengkapi nama dan nilai proxy outcome baru kamu.'
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menambah',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AI Operations Integration (Isolated Edge Function)
  // ---------------------------------------------------------------------------
  const handleAiProxySuggest = async (outcome: LfaSroiOutcome) => {
    if (!orgId) return;
    if (!outcome?.id) return;
    setAiProxyLoading(outcome.id);
    try {
      const { data, error } = await supabase.functions.invoke('sroi-ai-suggest', {
         body: {
           operation: 'proxy_suggest',
           payload: {
             outcome_name: outcome?.outcome_name ?? '',
             sector: sector,
             location: 'Indonesia',
             beneficiary_type: outcome?.unit ?? 'orang'
           }
         }
      });

      if (error) throw error;

      if (data?.recommendedProxyValueIdr) {
        const updated = {
          ...outcome,
          proxy_value_idr: data.recommendedProxyValueIdr,
          proxy_source: data?.proxySource || 'Rekomendasi AI SROI',
          proxy_citation: `${data?.proxyCitation || ''} (${data?.reasoning || ''})`,
          proxy_category: sector
        };
        debounceSaveOutcome(updated);
        toast({
          title: 'Saran AI Berhasil ✨',
          description: `Proxy disarankan: Rp ${data.recommendedProxyValueIdr.toLocaleString('id-ID')}`
        });
      }
    } catch (err: any) {
      console.error('AI Proxy suggestion failed:', err);
      toast({
        title: 'Saran AI Terkendala',
        description: 'Gagal mendapatkan rekomendasi AI. Menggunakan input manual.',
        variant: 'destructive'
      });
    } finally {
      setAiProxyLoading(null);
    }
  };

  const handleAiNarrativeGenerate = async () => {
    if (!orgId) return;
    if (!config || combinedOutcomes.length === 0) return;
    setAiNarrativeLoading(true);
    try {
      const sortedOutcomes = [...(combinedOutcomes ?? [])].sort((a, b) => (b?.present_value_idr ?? 0) - (a?.present_value_idr ?? 0));
      const topOutcomes = (sortedOutcomes ?? []).slice(0, 3).map(o => ({
        name: o?.outcome_name ?? '',
        value_idr: o?.present_value_idr ?? 0,
        pct: parseFloat(((o?.present_value_idr ?? 0) / (config?.total_present_value_idr ?? 1) * 100).toFixed(1)) || 0
      }));

      const { data, error } = await supabase.functions.invoke('sroi-ai-suggest', {
        body: {
          operation: 'narrative_generate',
          payload: {
            program_context: `Sektor: ${sector}, Beneficiary: ${config?.beneficiary_count || 'Masyarakat umum'}`,
            sroi_ratio: config?.sroi_ratio ?? 0,
            total_investment: config?.total_investment_idr ?? 0,
            total_present_value: config?.total_present_value_idr ?? 0,
            top_outcomes: topOutcomes,
            assumptions: `Tingkat diskonto sosial: ${(config?.discount_rate ?? 0.035) * 100}%, Periode analisis: ${config?.analysis_period_years ?? 1} tahun.`
          }
        }
      });

      if (error) throw error;

      if (data?.narrative) {
        const updatedConfig = {
          ...config,
          ai_narrative: data.narrative
        } as LfaSroiConfig;
        setConfig(updatedConfig);
        await supabase
          .from('lfa_sroi_config')
          .update({ ai_narrative: data.narrative })
          .eq('id', config.id);

        toast({
          title: 'Narasi AI Draf Berhasil ✨',
          description: 'Narasi laporan SROI berhasil dibuat.'
        });
      }
    } catch (err: any) {
      console.error('AI Narrative failed:', err);
      toast({
        title: 'Gagal Membuat Narasi',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive'
      });
    } finally {
      setAiNarrativeLoading(false);
    }
  };

  const handleAiSensitivityGenerate = async () => {
    if (!orgId) return;
    if (!config || combinedOutcomes.length === 0) return;
    setAiSensitivityLoading(true);
    try {
      const currentDataSummary = (combinedOutcomes ?? []).map(o => ({
        name: o?.outcome_name ?? '',
        gross: o?.gross_value_idr ?? 0,
        pv: o?.present_value_idr ?? 0
      }));

      const { data, error } = await supabase.functions.invoke('sroi-ai-suggest', {
        body: {
          operation: 'sensitivity_analysis',
          payload: {
            current_sroi_data: currentDataSummary,
            ratio: config?.sroi_ratio ?? 0,
            assumptions: `Discount rate: ${(config?.discount_rate ?? 0.035) * 100}%, Investment: Rp ${config?.total_investment_idr ?? 0}`
          }
        }
      });

      if (error) throw error;

      if (data) {
        const updatedConfig = {
          ...config,
          sensitivity_result: data
        } as LfaSroiConfig;
        setConfig(updatedConfig);
        await supabase
          .from('lfa_sroi_config')
          .update({ sensitivity_result: data })
          .eq('id', config.id);

        toast({
          title: 'Analisa Sensitivitas Berhasil ✨',
          description: 'Skenario model SROI dihitung.'
        });
      }
    } catch (err: any) {
      console.error('AI Sensitivity failed:', err);
      toast({
        title: 'Gagal Menganalisis',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive'
      });
    } finally {
      setAiSensitivityLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Vector PDF Export
  // ---------------------------------------------------------------------------
  const handleExportPDF = () => {
    if (!config) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isSimple = config.mode === 'simple';
    const ratioColor = config.sroi_ratio < 1 ? '#EF4444' : config.sroi_ratio <= 2 ? 'brand-amber' : config.sroi_ratio <= 4 ? '#10B981' : '#3B82F6';

    const topOutcomesMarkup = [...(combinedOutcomes ?? [])]
      .sort((a, b) => (b?.present_value_idr ?? 0) - (a?.present_value_idr ?? 0))
      .slice(0, 3)
      .map(o => `
        <div style="border-bottom: 1px solid #E2E8F0; padding: 10px 0;">
          <div style="display:flex; justify-content:space-between; font-weight: 600;">
            <span>${o?.outcome_name ?? ''}</span>
            <span>Rp ${(o?.present_value_idr ?? 0).toLocaleString('id-ID')}</span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Adjustment: Kontribusi ${o?.attribution_pct ?? 0}%, Deadweight ${o?.deadweight_pct ?? 0}%</p>
        </div>
      `).join('');

    const allOutcomesTableRows = (combinedOutcomes ?? []).map((o, idx) => `
      <tr>
        <td style="border: 1px solid #CBD5E1; padding: 8px;">${idx + 1}</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; font-weight:600;">${o?.outcome_name ?? ''}</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:right;">${o?.quantity ?? 0} ${o?.unit || ''}</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:right;">Rp ${(o?.proxy_value_idr ?? 0).toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:right;">Rp ${(o?.gross_value_idr ?? 0).toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:center;">${o?.attribution_pct ?? 0}%</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:center;">${o?.deadweight_pct ?? 0}%</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:center;">${o?.displacement_pct ?? 0}%</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:center;">${o?.dropoff_pct_per_year ?? 0}%</td>
        <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:right; font-weight:700;">Rp ${(o?.present_value_idr ?? 0).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    const sensitivityMarkup = config?.sensitivity_result ? `
      <div style="margin-top: 30px;">
        <h3>Analisis Sensitivitas Proyeksi SROI</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
          <thead>
            <tr style="background: #F1F5F9;">
              <th style="border: 1px solid #CBD5E1; padding: 8px; text-align:left;">Skenario</th>
              <th style="border: 1px solid #CBD5E1; padding: 8px; text-align:left;">Perubahan Asumsi</th>
              <th style="border: 1px solid #CBD5E1; padding: 8px; text-align:center;">SROI Ratio</th>
              <th style="border: 1px solid #CBD5E1; padding: 8px; text-align:left;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${(config?.sensitivity_result?.scenarios ?? []).map((s: any) => `
              <tr>
                <td style="border: 1px solid #CBD5E1; padding: 8px; font-weight:bold;">${s?.name ?? ''}</td>
                <td style="border: 1px solid #CBD5E1; padding: 8px;">${s?.assumptionChange ?? ''}</td>
                <td style="border: 1px solid #CBD5E1; padding: 8px; text-align:center; font-weight:bold; color: #1E293B;">${s?.sroiRatio ?? ''}</td>
                <td style="border: 1px solid #CBD5E1; padding: 8px;">${s?.notes ?? ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 10px; font-size: 11px; font-style:italic; color: #64748B;">*Analisa sensitivitas dihitung deterministik berdasarkan variasi input baseline.</p>
      </div>
    ` : '';

    const content = `
      <html>
        <head>
          <title>Laporan Analisis SROI — Impactory.id</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1E293B;
              line-height: 1.5;
              margin: 0;
              padding: 40px;
            }
            .header {
              border-bottom: 2px solid #1E293B;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #0F172A;
            }
            .badge {
              background: #F1F5F9;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 600;
              color: #475569;
            }
            .ratio-box {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 24px;
              text-align: center;
              margin-bottom: 30px;
            }
            .ratio-val {
              font-size: 48px;
              font-weight: 800;
              color: ${ratioColor};
              margin: 0;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #E2E8F0;
              border-radius: 6px;
              padding: 16px;
              background: #FFF;
            }
            .card-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
              margin: 0 0 8px 0;
            }
            .card-val {
              font-size: 18px;
              font-weight: 700;
              margin: 0;
            }
            .disclaimer {
              background: #FFFBEB;
              border-left: 4px solid brand-amber;
              padding: 15px;
              font-size: 11px;
              color: #78350F;
              border-radius: 4px;
              margin-top: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background: #0F172A;
              color: #FFF;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              border: 1px solid #0F172A;
            }
            @media print {
              body { padding: 0; }
              @page { size: ${isSimple ? 'portrait' : 'landscape'}; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Impactory<span style="color:#2563EB;">.id</span></div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color:#64748B;">Platform Dampak Sosial Terintegrasi Pertama di Indonesia</p>
            </div>
            <div style="text-align:right;">
              <span class="badge">SROI REPORT — ${isSimple ? 'Sederhana' : 'Profesional'}</span>
              <p style="margin: 4px 0 0 0; font-size: 11px; color:#64748B;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          <h2>Laporan Analisis Social Return on Investment (SROI)</h2>
          <p style="font-size:13px; color:#475569; margin-top:-10px;">Analisa evaluasi dampak terintegrasi dari LFA Matrix, MEAL Planner, dan Rencana Anggaran Biaya.</p>

          <div class="ratio-box">
            <span style="font-size: 14px; font-weight:600; text-transform:uppercase; color:#64748B;">Rasio Return Sosial (SROI)</span>
            <div class="ratio-val">Rp ${config.sroi_ratio} per Rp1</div>
            <p style="margin: 10px 0 0 0; font-weight: 600; font-size:14px; max-width: 600px; margin-left:auto; margin-right:auto;">
              "Setiap Rp1 yang diinvestasikan dalam program ini menghasilkan Rp ${config.sroi_ratio} nilai sosial bagi masyarakat."
            </p>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Total Investasi Finansial</div>
              <div class="card-val">Rp ${config.total_investment_idr.toLocaleString('id-ID')}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Nilai Sosial Terdiskonto (Present Value)</div>
              <div class="card-val">Rp ${config.total_present_value_idr.toLocaleString('id-ID')}</div>
            </div>
          </div>

          ${isSimple ? `
            <div>
              <h3>Tiga Outcome Teratas Berdasarkan Kontribusi Sosial</h3>
              ${topOutcomesMarkup}
            </div>
          ` : `
            <div>
              <h3>Matriks Analisis Dampak & Proxy Sosial</h3>
              <table style="font-size: 11px;">
                <thead>
                  <tr>
                    <th style="padding: 10px; text-align:left;">No</th>
                    <th style="padding: 10px; text-align:left;">Outcome Name</th>
                    <th style="padding: 10px; text-align:right;">Volume</th>
                    <th style="padding: 10px; text-align:right;">Proxy IDR</th>
                    <th style="padding: 10px; text-align:right;">Gross Value</th>
                    <th style="padding: 10px; text-align:center;">Attribution</th>
                    <th style="padding: 10px; text-align:center;">Deadweight</th>
                    <th style="padding: 10px; text-align:center;">Displacement</th>
                    <th style="padding: 10px; text-align:center;">Drop-off</th>
                    <th style="padding: 10px; text-align:right;">Present Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${allOutcomesTableRows}
                </tbody>
              </table>
            </div>
            ${sensitivityMarkup}
          `}

          ${config.ai_narrative ? `
            <div style="margin-top: 30px;">
              <h3>Narasi Evaluasi & Justifikasi Dampak</h3>
              <p style="font-size: 12px; line-height: 1.6; text-align:justify; color: #334155; white-space: pre-line;">
                ${config.ai_narrative}
              </p>
            </div>
          ` : ''}

          <div class="disclaimer">
            <strong>Disclaimer Laporan Analisis SROI:</strong><br/>
            Laporan ini adalah draft analisis SROI berbasis input pengguna dan proxy estimasi. Validasi metodologi dan data sumber sebelum digunakan untuk pelaporan resmi. Proxy values ini merupakan estimasi awal berdasarkan referensi publik, studi dampak, dan konteks lokal. Sesuaikan dengan data organisasi kamu dan validasi kembali sebelum digunakan untuk laporan donor. Benchmark sektor bersifat ilustratif sampai tersedia cukup data pembanding terverifikasi.
          </div>

          <div style="margin-top: 50px; text-align:center; font-size:10px; color:#94A3B8; border-top: 1px solid #E2E8F0; padding-top:20px;">
            Diproduksi secara otomatis oleh modul SROI terintegrasi Impactory.id. &copy; 2026 Impactory.id. All rights reserved.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // ---------------------------------------------------------------------------
  // Calculations and formatting helpers
  // ---------------------------------------------------------------------------
  const getSpeedometerDetails = (ratio: number) => {
    let color = '#EF4444'; // Red
    let label = 'Sosial Kurang Maksimal';
    let minMax = 'Rasio < 1.0 (Defisit Investasi Sosial)';
    let needleDeg = -90; // Start angle for 0

    if (ratio < 1) {
      color = '#EF4444';
      label = 'Dampak Belum Optimal';
      minMax = 'Rasio < 1';
      // Map ratio 0-1 to deg -90 to -45
      needleDeg = -90 + (ratio * 45);
    } else if (ratio >= 1 && ratio <= 2) {
      color = 'brand-amber'; // Yellow
      label = 'Dampak Sehat';
      minMax = 'Rasio 1.0 - 2.0';
      // Map ratio 1-2 to deg -45 to 0
      needleDeg = -45 + ((ratio - 1) * 45);
    } else if (ratio > 2 && ratio <= 4) {
      color = '#10B981'; // Green
      label = 'Dampak Tinggi';
      minMax = 'Rasio 2.0 - 4.0';
      // Map ratio 2-4 to deg 0 to 45
      needleDeg = 0 + ((ratio - 2)/2 * 45);
    } else {
      color = '#3B82F6'; // Blue
      label = 'Dampak Luar Biasa';
      minMax = 'Rasio > 4.0';
      // Map ratio 4-10 to deg 45 to 90
      needleDeg = 45 + (Math.min(6, ratio - 4)/6 * 45);
    }

    return { color, label, minMax, needleDeg };
  };

  // Construct the virtual registry row and combined outcomes list
  const registryRow: LfaSroiOutcome = {
    id: 'registry-linked',
    lfa_project_id: projectId,
    org_id: orgId,
    meal_item_id: null,
    outcome_name: 'Penerima Manfaat (Terverifikasi)',
    outcome: 'Penerima Manfaat (Terverifikasi)',
    quantity: registryCount,
    unit: 'orang',
    proxy_value_idr: registryProxyValueIdr,
    proxy_value: registryProxyValueIdr,
    proxy_source: 'Beneficiary Registry',
    proxy_citation: '',
    proxy_category: 'Penerima Manfaat',
    duration_years: registryDurationYears,
    duration: registryDurationYears,
    attribution_pct: registryAttributionPct,
    attribution: registryAttributionPct === 100 ? 1 : registryAttributionPct / 100,
    deadweight_pct: registryDeadweightPct,
    displacement_pct: registryDisplacementPct,
    dropoff_pct_per_year: registryDropoffPctPerYear,
    dropoff: registryDropoffPctPerYear,
    gross_value_idr: 0,
    present_value_idr: 0,
    mode: config?.mode ?? 'simple',
    sort_order: outcomes.length,
    is_registry_linked: true
  };

  if (registryCount > 0) {
    const { gross_value, present_value } = calculateOutcomeValues(registryRow, config?.discount_rate ?? 0.035);
    registryRow.gross_value_idr = gross_value;
    registryRow.present_value_idr = present_value;
  }

  const combinedOutcomes = [
    ...outcomes,
    ...(registryCount > 0 ? [registryRow] : [])
  ];

  const getSroiOutcomeChartData = () => {
    return (combinedOutcomes ?? [])
      .map(o => ({
        name: o?.outcome_name ? (o.outcome_name.length > 25 ? `${o.outcome_name.substring(0, 25)}...` : o.outcome_name) : '',
        value: o?.present_value_idr ?? 0,
      }))
      .filter(d => d.value > 0);
  };

  const CHART_COLORS = ['#3B82F6', '#10B981', 'brand-amber', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

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

  if (!config) return null;

  const speedometer = getSpeedometerDetails(config.sroi_ratio);

  return (
    <div data-testid="sroi-calculator-root" className="space-y-6">
      {/* SROI HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-elegant">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg text-lg">📊</span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Social Return on Investment (SROI)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Analisa valuasi dampak terintegrasi dari LFA Matrix, MEAL Planner, dan Rencana Anggaran Biaya.</p>
            </div>
          </div>
        </div>

        {/* Toggle Mode and Re-sync button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {saving ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Menyimpan draf...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <Check className="h-3.5 w-3.5" /> Tersimpan {lastSaved.toLocaleTimeString('id-ID')}
            </span>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void triggerAutoImport(true)}
            disabled={syncing}
            className="text-xs flex items-center gap-1.5"
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sinkronisasi Ulang
          </Button>

          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border flex">
            <button
              onClick={() => handleModeToggle('simple')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                config.mode === 'simple' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 Sederhana
            </button>
            <button
              onClick={() => handleModeToggle('professional')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                config.mode === 'professional' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🏢 Profesional
            </button>
          </div>

          <Button size="sm" variant="outline" className="text-xs" onClick={handleExportPDF}>
            <Download className="h-3.5 w-3.5 mr-1" /> Cetak Laporan
          </Button>
        </div>
      </div>

      {/* WARNING IF TOTAL INVESTMENT IS ZERO */}
      {config.total_investment_idr === 0 && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs leading-5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">⚠️ Total Investasi Kosong (Rp 0)</strong>
            Nilai investasi total belum terisi atau terimpor dari Rencana Anggaran Biaya. Mohon lengkapi data investasi program di Langkah 1 (Simple Mode) atau Matriks Ringkasan (Pro Mode) agar rasio SROI dapat dihitung dengan benar.
          </div>
        </div>
      )}

      {/* SROI EXCEL DISCLAIMER */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border rounded-lg text-[11px] leading-5 text-muted-foreground">
        <strong>⚠️ PEMBERITAHUAN METODOLOGI:</strong> Proxy values ini merupakan estimasi awal berdasarkan referensi publik, studi dampak, dan konteks lokal. Sesuaikan dengan data organisasi kamu dan validasi kembali sebelum digunakan untuk laporan donor.
      </div>

      {/* SIMPLE MODE VIEW */}
      {config.mode === 'simple' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Horizontal step selector & step forms (Col span 7) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border shadow-elegant">
              {/* Step indicator bar */}
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b p-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <button onClick={() => setStep(1)} className={`px-2.5 py-1 rounded ${wizardStep === 1 ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-100'}`}>1. Input</button>
                  <ArrowRight className="h-3 w-3" />
                  <button onClick={() => setStep(2)} className={`px-2.5 py-1 rounded ${wizardStep === 2 ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-100'}`}>2. Outcomes</button>
                  <ArrowRight className="h-3 w-3" />
                  <button onClick={() => setStep(3)} className={`px-2.5 py-1 rounded ${wizardStep === 3 ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-100'}`}>3. Ajustmen</button>
                  <ArrowRight className="h-3 w-3" />
                  <button onClick={() => setStep(4)} className={`px-2.5 py-1 rounded ${wizardStep === 4 ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-100'}`}>4. Ringkasan</button>
                </div>
                <Badge variant="outline" className="text-[10px]">Wizard Sederhana</Badge>
              </CardHeader>

              <CardContent className="p-5 text-xs space-y-5">
                {/* STEP 1: Basic project assumptions */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Langkah 1: Masukkan Total Investasi & Durasi</h4>
                      <p className="text-muted-foreground text-[11px]">Auto-filled dari tab Budget dan WBS kamu. Kamu bisa menyesuaikan nilainya secara manual.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Total Investasi Keuangan (IDR)</Label>
                        <Input
                          type="number"
                          value={config.total_investment_idr || ''}
                          onChange={(e) => debounceSaveConfig({ ...config, total_investment_idr: parseFloat(e.target.value) || 0 })}
                          placeholder="Masukkan nilai investasi e.g. 50000000"
                        />
                        <span className="text-[10px] text-muted-foreground block">
                          Rp {(config.total_investment_idr || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Durasi Evaluasi Dampak (Tahun)</Label>
                        <Input
                          type="number"
                          value={config.analysis_period_years || ''}
                          onChange={(e) => debounceSaveConfig({ ...config, analysis_period_years: parseInt(e.target.value, 10) || 1 })}
                          placeholder="Masukkan jumlah tahun"
                        />
                        <span className="text-[10px] text-muted-foreground block">Tahun berjalan untuk valuasi kelayakan jangka panjang.</span>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Jumlah Penerima Manfaat Langsung</Label>
                        <Input
                          type="number"
                          value={config.beneficiary_count || ''}
                          onChange={(e) => debounceSaveConfig({ ...config, beneficiary_count: parseInt(e.target.value, 10) || null })}
                          placeholder="Misalnya: 150 (Balita, Pemuda, Petani, dll)"
                        />
                        <span className="text-[10px] text-muted-foreground block">Berapa banyak orang yang mendapatkan dampak positif langsung dari outcomes program.</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button size="sm" onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-500">
                        Lanjut ke Outcomes <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Seeded Outcomes from MEAL Planner with Proxy reference Library */}
                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Langkah 2: Tentukan Nilai Proxy per Outcome</h4>
                      <p className="text-muted-foreground text-[11px]">Tautkan indikator MEAL kamu ke referensi nilai keuangan (proxy) di Indonesia.</p>
                    </div>

                    {combinedOutcomes.length === 0 ? (
                      <div className="text-center p-8 border rounded-lg bg-slate-50/50 text-muted-foreground text-xs space-y-3">
                        <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto" />
                        <p>Belum ada outcome terdaftar. Silakan sinkronisasikan ulang dengan tombol di kanan atas.</p>
                        <Button size="sm" onClick={() => handleAddManualOutcome()}>Tambah Outcome Manual</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {combinedOutcomes.map((out, idx) => (
                          <div key={out.id} className="p-4 border rounded-lg bg-slate-50/20 dark:bg-slate-900/5 space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">{idx + 1}</span>
                              {!out.is_registry_linked ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteOutcome(out.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Sistem</Badge>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                Pernyataan Outcome / Indikator
                                {out.is_registry_linked && (
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px] py-0 px-1.5">🔗 Registry</Badge>
                                )}
                              </Label>
                              <Input
                                value={out.outcome_name}
                                onChange={(e) => debounceSaveOutcome({ ...out, outcome_name: e.target.value })}
                                placeholder="Indikator outcome dari MEAL Planner..."
                                disabled={out.is_registry_linked}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="font-semibold text-slate-600">Volume (Jumlah)</Label>
                                {out.is_registry_linked ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            value={out.quantity || ''}
                                            disabled
                                            className="bg-slate-100 dark:bg-slate-900 cursor-not-allowed text-xs"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Jumlah otomatis dari Beneficiary Registry</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <Input
                                    type="number"
                                    value={out.quantity || ''}
                                    onChange={(e) => debounceSaveOutcome({ ...out, quantity: parseFloat(e.target.value) || 0 })}
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="font-semibold text-slate-600">Satuan (Unit)</Label>
                                <Input
                                  value={out.unit || ''}
                                  onChange={(e) => debounceSaveOutcome({ ...out, unit: e.target.value })}
                                  placeholder="e.g. orang, KK, kasus"
                                  disabled={out.is_registry_linked}
                                />
                              </div>
                            </div>

                            <div className="border p-3 rounded-lg bg-white dark:bg-slate-950 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-bold text-blue-600 text-[10px] uppercase tracking-wider">Pilih Nilai Valuasi (Proxy)</span>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleAiProxySuggest(out)}
                                  disabled={aiProxyLoading === out.id}
                                  className="h-7 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-slate-900 dark:text-amber-300 dark:border-amber-900"
                                >
                                  {aiProxyLoading === out.id ? <Loader2 className="h-3 w-3 animate-spin text-amber-500 mr-1" /> : <Sparkles className="h-3 w-3 text-amber-500 mr-1" />}
                                  ✨ Bantu saya pilih proxy
                                </Button>
                              </div>

                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-semibold">Sektor Library</Label>
                                    <Select
                                      value={out.proxy_category || selectedSector}
                                      onValueChange={(val) => {
                                        setSelectedSector(val);
                                        const defaultOfSector = SROI_PROXIES_INDONESIA.find(p => p.category === val);
                                        if (defaultOfSector) {
                                          debounceSaveOutcome({
                                            ...out,
                                            proxy_category: val,
                                            proxy_value_idr: defaultOfSector.value_idr,
                                            proxy_source: defaultOfSector.source,
                                            proxy_citation: defaultOfSector.citation
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Pilih sektor" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SROI_SECTORS.map(sec => (
                                          <SelectItem key={sec} value={sec} className="text-xs">{sec}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-semibold">Gunakan Nilai Proxy Referensi</Label>
                                    <Select
                                      onValueChange={(pId) => {
                                        const refItem = SROI_PROXIES_INDONESIA.find(p => p.id === pId);
                                        if (refItem) handleApplyProxyReference(out.id, refItem);
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Referensi standar lokal..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SROI_PROXIES_INDONESIA.filter(p => p.category === (out.proxy_category || selectedSector)).map(p => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} (Rp {p.value_idr.toLocaleString('id-ID')})</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-semibold">Atau Masukkan Nilai Manual (Rupiah)</Label>
                                  <Input
                                    type="number"
                                    value={out.proxy_value_idr || ''}
                                    onChange={(e) => debounceSaveOutcome({ ...out, proxy_value_idr: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-xs"
                                    placeholder="Masukkan nilai rupiah per unit..."
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                    <span>Nilai total outcome kotor (Gross Value):</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Rp {(out.quantity * out.proxy_value_idr).toLocaleString('id-ID')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-between items-center pt-3 border-t">
                          <Button variant="outline" size="sm" onClick={() => setStep(1)}>Kembali</Button>
                          <Button size="sm" onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-500">
                            Lanjut ke Adjustmen <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Simplistic Attribution Sliders */}
                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Langkah 3: Atur Kontribusi & Faktor Eksternal</h4>
                      <p className="text-muted-foreground text-[11px]">Agar dampak tidak overclaim, sesuaikan persen kontribusi nyata program Anda.</p>
                    </div>

                    <div className="space-y-5">
                      {combinedOutcomes.map((out, idx) => (
                        <div key={out.id} className="p-4 border rounded-lg bg-slate-50/20 dark:bg-slate-900/5 space-y-4">
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                              Outcome #{idx + 1}:
                              {out.is_registry_linked && (
                                <Badge className="ml-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px] py-0 px-1.5">🔗 Registry</Badge>
                              )}
                            </span>
                            <p className="font-semibold text-xs leading-relaxed text-slate-900 dark:text-slate-100">{out.outcome_name}</p>
                          </div>

                          {/* Attribution Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <Label className="font-semibold text-slate-700">Persen Kontribusi Organisasi (Attribution)</Label>
                              <span className="font-bold text-blue-600">{out.attribution_pct}%</span>
                            </div>
                            <Slider
                              value={[out.attribution_pct]}
                              max={100}
                              step={5}
                              onValueChange={(val) => debounceSaveOutcome({ ...out, attribution_pct: val[0] })}
                            />
                            <p className="text-[10px] text-muted-foreground">Persentase seberapa besar dampak ini didorong langsung oleh intervensi program Anda (vs NGO/pihak luar lain).</p>
                          </div>

                          {/* Deadweight Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <Label className="font-semibold text-slate-700">Faktor Terjadi Sendiri (Deadweight)</Label>
                              <span className="font-bold text-amber-600">{out.deadweight_pct}%</span>
                            </div>
                            <Slider
                              value={[out.deadweight_pct]}
                              max={100}
                              step={5}
                              onValueChange={(val) => debounceSaveOutcome({ ...out, deadweight_pct: val[0] })}
                            />
                            <p className="text-[10px] text-muted-foreground">Persentase seberapa besar perubahan ini kemungkinan besar akan tetap terjadi meskipun program Anda tidak berjalan.</p>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setStep(2)}>Kembali</Button>
                        <Button size="sm" onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-500">
                          Selesai & Lihat Hasil <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Beautiful illustrative dashboard results and sector-benchmarks */}
                {wizardStep === 4 && (
                  <div className="space-y-5 text-center">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Langkah 4: Hasil SROI Program Anda</h4>
                      <p className="text-muted-foreground text-[11px]">Ringkasan kontribusi nilai sosial program dan interpretasi kelayakan.</p>
                    </div>

                    <div className="p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/10 space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Rasio Return Investasi Sosial</span>
                        <div className="text-4xl font-extrabold text-blue-600">
                          Rp {config.sroi_ratio.toFixed(2)} per Rp1
                        </div>
                        <span className="text-xs text-muted-foreground block">Yang diinvestasikan secara finansial.</span>
                      </div>

                      <div className="max-w-md mx-auto p-3 bg-white dark:bg-slate-950 rounded-lg border text-[11px] leading-5 text-slate-700 dark:text-slate-300">
                        "Setiap Rp1 yang diinvestasikan dalam program ini menghasilkan Rp {config.sroi_ratio.toFixed(2)} nilai sosial bagi masyarakat."
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <Button variant="outline" size="sm" onClick={() => setStep(3)}>Kembali</Button>
                      <Button size="sm" variant="default" onClick={() => handleModeToggle('professional')}>
                        Buka Matriks Detail <TrendingUp className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel: CSS Speedometer & general widgets (Col span 5) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 px-4 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Speedometer Kelayakan Dampak</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                {/* SVG Semi-Circle Speedometer */}
                <div className="relative w-48 h-28 mx-auto overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 50">
                    {/* Background sectors */}
                    {/* Red segment: 0 - 25% (angle -90 to -45) */}
                    <path d="M 10 50 A 40 40 0 0 1 21.7 21.7 L 50 50 Z" fill="#EF4444" opacity="0.8"/>
                    {/* Yellow segment: 25% - 50% (angle -45 to 0) */}
                    <path d="M 21.7 21.7 A 40 40 0 0 1 50 10 L 50 50 Z" fill="brand-amber" opacity="0.8"/>
                    {/* Green segment: 50% - 75% (angle 0 to 45) */}
                    <path d="M 50 10 A 40 40 0 0 1 78.3 21.7 L 50 50 Z" fill="#10B981" opacity="0.8"/>
                    {/* Blue segment: 75% - 100% (angle 45 to 90) */}
                    <path d="M 78.3 21.7 A 40 40 0 0 1 90 50 L 50 50 Z" fill="#3B82F6" opacity="0.8"/>

                    {/* Inner cutout for donut style */}
                    <circle cx="50" cy="50" r="28" fill="white" className="dark:fill-slate-950"/>

                    {/* Needle pivot */}
                    <circle cx="50" cy="50" r="4" fill="#1E293B"/>

                    {/* Needle line */}
                    <g transform={`rotate(${speedometer.needleDeg}, 50, 50)`}>
                      <line x1="50" y1="50" x2="15" y2="50" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </svg>

                  {/* Absolute ratio value badge */}
                  <div className="absolute bottom-1 left-0 right-0 font-extrabold text-lg text-slate-800 dark:text-slate-200">
                    Rasio: {config.sroi_ratio.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-1">
                  <Badge style={{ backgroundColor: speedometer.color, color: '#FFF' }}>
                    {speedometer.label}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {speedometer.minMax}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] leading-relaxed text-muted-foreground text-left border">
                  <strong>ℹ️ BENCHMARK INTEGRITAS:</strong> Benchmark sektor bersifat ilustratif sampai tersedia cukup data pembanding terverifikasi. Sesuaikan baseline ini dengan justifikasi tertulis.
                </div>
              </CardContent>
            </Card>

            {/* QUICK STATS CARDS */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="border p-3 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Investasi Keuangan</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Rp {config.total_investment_idr.toLocaleString('id-ID')}</span>
              </Card>

              <Card className="border p-3 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Nilai Sosial (PV)</span>
                <span className="text-sm font-extrabold text-emerald-600 block">Rp {config.total_present_value_idr.toLocaleString('id-ID')}</span>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL MODE VIEW */}
      {config.mode === 'professional' && (
        <div className="space-y-6">
          {/* METHODOLOGY NOTICE & DISCOUNT RATE CONFIG */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex flex-row items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Asumsi Suku Bunga Diskonto & Analisis Sensitivitas</CardTitle>
                <CardDescription className="text-[9px] mt-0.5">Atur parameter diskonto NPV sosial program Anda secara eksplisit.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Tingkat Diskonto Sosial (Social Discount Rate)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.005"
                      value={config.discount_rate || 0.035}
                      onChange={(e) => debounceSaveConfig({ ...config, discount_rate: parseFloat(e.target.value) || 0.035 })}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs font-bold text-slate-600 shrink-0">{(config.discount_rate * 100).toFixed(1)}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Default: 3.5% (Rekomendasi global valuasi NPV dampak sosial).</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Investasi Finansial Tambahan (IDR)</Label>
                  <Input
                    type="number"
                    value={config.total_investment_idr || ''}
                    onChange={(e) => debounceSaveConfig({ ...config, total_investment_idr: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground block">Biaya implementasi riil program.</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Jumlah Penerima Manfaat</Label>
                  <Input
                    type="number"
                    value={config.beneficiary_count || ''}
                    onChange={(e) => debounceSaveConfig({ ...config, beneficiary_count: parseInt(e.target.value, 10) || null })}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground block">Penerima manfaat langsung.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SPREADSHEET MATRIX TABLE */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 px-4 border-b flex flex-row justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Matriks Detil SROI & Ajustmen (Spreadsheet)</CardTitle>
              </div>
              <Button size="xs" onClick={handleAddManualOutcome} className="text-[10px] h-7 bg-blue-600 hover:bg-blue-500">
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Outcome Manual
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b text-[10px] text-muted-foreground">
                    <th className="p-2 text-left border-r w-8 font-semibold uppercase">No</th>
                    <th className="p-2 text-left border-r min-w-[200px] font-semibold uppercase">Outcome / Indikator (MEAL)</th>
                    <th className="p-2 text-right border-r w-20 font-semibold uppercase">Volume</th>
                    <th className="p-2 text-left border-r w-24 font-semibold uppercase">Satuan</th>
                    <th className="p-2 text-right border-r w-32 font-semibold uppercase">Proxy Value (IDR)</th>
                    <th className="p-2 text-center border-r w-20 font-semibold uppercase">PIC / Durasi (Thn)</th>
                    <th className="p-2 text-center border-r w-20 font-semibold uppercase">Kontribusi (Att) %</th>
                    <th className="p-2 text-center border-r w-20 font-semibold uppercase">Terjadi Sendiri (Dw) %</th>
                    <th className="p-2 text-center border-r w-20 font-semibold uppercase">Displacement %</th>
                    <th className="p-2 text-center border-r w-20 font-semibold uppercase">Dropoff /Thn %</th>
                    <th className="p-2 text-right border-r w-36 font-semibold uppercase">Present Value IDR (NPV)</th>
                    <th className="p-2 text-center w-12 font-semibold uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedOutcomes.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-muted-foreground">
                        Belum ada outcome terdaftar. Klik "Sinkronisasi Ulang" di kanan atas.
                      </td>
                    </tr>
                  ) : (
                    combinedOutcomes.map((out, idx) => (
                      <tr key={out.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-900/5">
                        <td className="p-2 text-center border-r bg-slate-50/50 dark:bg-slate-900/10 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-1.5 border-r">
                          <div className="flex items-center gap-1">
                            <Input
                              value={out.outcome_name}
                              onChange={(e) => debounceSaveOutcome({ ...out, outcome_name: e.target.value })}
                              className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1"
                              disabled={out.is_registry_linked}
                            />
                            {out.is_registry_linked && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border-0 text-[9px] py-0 px-1 shrink-0">🔗 Registry</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 border-r">
                          {out.is_registry_linked ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={out.quantity || ''}
                                      disabled
                                      className="h-8 border-0 bg-slate-100 dark:bg-slate-900 cursor-not-allowed text-right text-xs"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Jumlah otomatis dari Beneficiary Registry</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Input
                              type="number"
                              value={out.quantity || ''}
                              onChange={(e) => debounceSaveOutcome({ ...out, quantity: parseFloat(e.target.value) || 0 })}
                              className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-right text-xs"
                            />
                          )}
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            value={out.unit || ''}
                            onChange={(e) => debounceSaveOutcome({ ...out, unit: e.target.value })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-xs"
                            placeholder="e.g. KK, orang"
                            disabled={out.is_registry_linked}
                          />
                        </td>
                        <td className="p-1.5 border-r space-y-1">
                          <Input
                            type="number"
                            value={out.proxy_value_idr || ''}
                            onChange={(e) => debounceSaveOutcome({ ...out, proxy_value_idr: parseFloat(e.target.value) || 0 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-right font-bold text-xs"
                          />
                          <div className="flex gap-1 justify-end px-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleAiProxySuggest(out)}
                              disabled={aiProxyLoading === out.id}
                              className="h-5 text-[8px] text-amber-600 hover:text-amber-500 font-bold flex items-center p-0.5"
                            >
                              {aiProxyLoading === out.id ? 'Loading...' : '✨ AI Suggest'}
                            </Button>
                          </div>
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            type="number"
                            value={out.duration_years || ''}
                            onChange={(e) => debounceSaveOutcome({ ...out, duration_years: parseInt(e.target.value, 10) || 1 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-center text-xs"
                          />
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            type="number"
                            value={out.attribution_pct}
                            onChange={(e) => debounceSaveOutcome({ ...out, attribution_pct: parseFloat(e.target.value) || 0 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-center text-xs text-blue-600 font-bold"
                          />
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            type="number"
                            value={out.deadweight_pct}
                            onChange={(e) => debounceSaveOutcome({ ...out, deadweight_pct: parseFloat(e.target.value) || 0 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-center text-xs text-amber-600 font-bold"
                          />
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            type="number"
                            value={out.displacement_pct}
                            onChange={(e) => debounceSaveOutcome({ ...out, displacement_pct: parseFloat(e.target.value) || 0 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-center text-xs"
                          />
                        </td>
                        <td className="p-1.5 border-r">
                          <Input
                            type="number"
                            value={out.dropoff_pct_per_year}
                            onChange={(e) => debounceSaveOutcome({ ...out, dropoff_pct_per_year: parseFloat(e.target.value) || 0 })}
                            className="h-8 border-0 bg-transparent hover:bg-slate-100 focus:bg-white text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-right border-r bg-slate-50/20 dark:bg-slate-900/5 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                          Rp {(out.present_value_idr || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center">
                          {!out.is_registry_linked ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteOutcome(out.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Sistem</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* PROFESSIONAL RINGKASAN SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border p-4 shadow-elegant space-y-1 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Investasi Finansial</span>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Rp {config.total_investment_idr.toLocaleString('id-ID')}</div>
              <span className="text-[10px] text-muted-foreground block">Costing / Anggaran Biaya Terhubung.</span>
            </Card>

            <Card className="border p-4 shadow-elegant space-y-1 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Gross Social Value</span>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Rp {config.total_gross_value_idr.toLocaleString('id-ID')}</div>
              <span className="text-[10px] text-muted-foreground block">Nilai dampak kotor sebelum adjustmen.</span>
            </Card>

            <Card className="border p-4 shadow-elegant space-y-1 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Net Present Value (NPV)</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-500">Rp {config.total_present_value_idr.toLocaleString('id-ID')}</div>
              <span className="text-[10px] text-muted-foreground block">Net Social Value setelah terdiskonto.</span>
            </Card>

            <Card data-testid="sroi-ratio-card" className="border p-4 shadow-elegant space-y-1 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rasio Return Sosial (SROI)</span>
              <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">Rp {config.sroi_ratio.toFixed(2)} per Rp1</div>
              <span className="text-[10px] text-muted-foreground block">SROI Ratio = NPV / Investasi.</span>
            </Card>
          </div>

          {/* TWO COLUMN GRID: CHART AND AI ANALYTICS GENERATION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Recharts outcome contribution share pie chart */}
            <Card className="border shadow-elegant overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Breakdown Kontribusi Outcome Sosial</CardTitle>
                <CardDescription className="text-[9px] mt-0.5">Proporsi pembentukan present value per outcome indikator.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex items-center justify-center">
                {combinedOutcomes.length === 0 || combinedOutcomes.every(o => o.present_value_idr === 0) ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-xs italic">
                    Belum ada data visualisasi (Proxy Rp 0 atau no data).
                  </div>
                ) : (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSroiOutcomeChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {getSroiOutcomeChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          iconSize={8}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '10px' }}
                        />
                        <RechartsTooltip
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                          contentStyle={{ fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: AI Narrative and Sensitivity reports */}
            <Card className="border shadow-elegant overflow-hidden flex flex-col">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI-Generated Narrative Draft
                  </CardTitle>
                  <CardDescription className="text-[9px] mt-0.5">Draf narasi laporan dampak donor-ready Bahasa Indonesia.</CardDescription>
                </div>
                <Button
                  size="xs"
                  onClick={handleAiNarrativeGenerate}
                  disabled={aiNarrativeLoading || outcomes.length === 0}
                  className="h-7 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-slate-900 dark:text-amber-300 dark:border-amber-900"
                >
                  {aiNarrativeLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1 text-amber-500" />}
                  Generate Narasi AI
                </Button>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 flex-1 overflow-y-auto max-h-56">
                {config.ai_narrative ? (
                  <div className="space-y-2">
                    <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                      {config.ai_narrative}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-center">
                    Klik tombol di kanan atas untuk menyusun draft narasi komprehensif menggunakan model standar.
                  </div>
                )}
                <span className="text-[10px] text-amber-600 block bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                  ⚠️ Laporan ini adalah draft analisis SROI berbasis input pengguna dan proxy estimasi. Validasi metodologi dan data sumber sebelum digunakan untuk pelaporan resmi.
                </span>
              </CardContent>
            </Card>
          </div>

          {/* SENSITIVITY ANALYSIS BOX */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex flex-row justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider">Hasil Analisis Sensitivitas Model Dampak</CardTitle>
                  <CardDescription className="text-[9px] mt-0.5">Analisis resiliensi model SROI terhadap fluktuasi target dan partisipasi eksternal.</CardDescription>
                </div>
              </div>
              <Button
                size="xs"
                onClick={handleAiSensitivityGenerate}
                disabled={aiSensitivityLoading || outcomes.length === 0}
                className="h-7 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-900"
              >
                {aiSensitivityLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Mulai Analisis Sensitivitas
              </Button>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              {config.sensitivity_result ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {config.sensitivity_result.scenarios?.map((sc: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg bg-slate-50/30 dark:bg-slate-900/5 space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{sc.name}</span>
                        <div className="flex justify-between items-center border-b pb-1 text-[11px]">
                          <span className="text-muted-foreground">Fluktuasi:</span>
                          <span className="font-semibold">{sc.assumptionChange}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span>Estimasi Rasio SROI:</span>
                          <span className="text-blue-600 text-sm">Rp {sc.sroiRatio}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground pt-1">{sc.notes}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <strong>Ringkasan Analisis AI:</strong> {config.sensitivity_result.summary}
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground italic">
                  Belum ada laporan sensitivitas. Klik "Mulai Analisis Sensitivitas" untuk menghitung skenario Pesimis, Moderat, dan Optimis.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🌱 Environmental Return on Investment (E-ROI) Section */}
      <Card className="border shadow-elegant overflow-hidden mt-6">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-4 px-5 border-b flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                Dampak Lingkungan & E-ROI Proyek
              </CardTitle>
              <CardDescription className="text-xs">
                Integrasi analisis jejak karbon dan kontribusi hijau dengan investasi program.
              </CardDescription>
            </div>
          </div>
          {carbonSummary && carbonSummary.activitiesWithCarbon > 0 && (
            <Badge
              className={`${
                carbonSummary.netImpact === 'reduction'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : carbonSummary.netImpact === 'emission'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
              } text-[10px] font-bold uppercase tracking-wider`}
              variant="outline"
            >
              {carbonSummary.netImpact === 'reduction'
                ? 'Net Reduction 🌱'
                : carbonSummary.netImpact === 'emission'
                ? 'Net Emission ⚠️'
                : 'Net Neutral ⚖️'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-5">
          {carbonSummary && carbonSummary.activitiesWithCarbon > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Carbon Impact */}
                <div className="p-4 border rounded-lg bg-slate-50/30 dark:bg-slate-900/5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Netto Dampak Karbon</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black ${
                      carbonSummary.totalCarbonKg < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {carbonSummary.totalCarbonKg < 0 ? '-' : ''}
                      {Math.abs(carbonSummary.totalCarbonKg).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">kg CO₂</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic text-center">
                    *Estimasi berbasis durasi program sebagai proxy jumlah aktivitas (sementara)
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {carbonSummary.netImpact === 'reduction'
                      ? 'Proyek ini secara netto menyerap emisi karbon dari udara.'
                      : carbonSummary.netImpact === 'emission'
                      ? 'Proyek ini melepaskan emisi karbon bersih ke atmosfer.'
                      : 'Proyek ini memiliki dampak emisi karbon netral.'}
                  </p>
                </div>

                {/* Reduction & Emission Breakdown */}
                <div className="p-4 border rounded-lg bg-slate-50/30 dark:bg-slate-900/5 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rincian Perubahan</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded p-2 text-center">
                      <span className="text-[8px] font-extrabold text-emerald-600 block uppercase">Pereduksian</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {carbonSummary.reductionKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg
                      </span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded p-2 text-center">
                      <span className="text-[8px] font-extrabold text-amber-600 block uppercase">Pelepasan</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {carbonSummary.emissionKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tree / Household Equivalent */}
                <div className="p-4 border rounded-lg bg-slate-50/30 dark:bg-slate-900/5 flex items-center gap-3">
                  <div className="text-3xl">🌳</div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Setara Penyerapan</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      {carbonSummary.equivalentTrees.toLocaleString('id-ID', { maximumFractionDigits: 1 })} pohon / tahun
                    </span>
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Setara jumlah pohon dewasa yang menyerap karbon per tahun.
                    </p>
                  </div>
                </div>
              </div>

              {/* DUAL IMPACT SECTION (Professional Mode Only) */}
              {config.mode === 'professional' && (() => {
                const safeRatio = typeof config?.sroi_ratio === 'number' ? config.sroi_ratio : 0;
                return (
                  <div className="mt-6 border-t pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Dual Impact Analytics (SROI & E-ROI)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Social Impact Return */}
                      <div className="p-4 border border-blue-100 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10 rounded-lg flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                          <Percent className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block uppercase">Social Return Ratio (SROI)</span>
                          <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                            Rp {safeRatio.toFixed(2)} per Rp1
                          </span>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Rasio pengembalian sosial ter-asemen yang mencerminkan present value dari outcome sosial dibandingkan total investasi program.
                          </p>
                        </div>
                      </div>

                      {/* Environmental Carbon Impact */}
                      <div className={`p-4 border ${
                        carbonSummary.totalCarbonKg < 0
                          ? 'border-emerald-100 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'border-amber-100 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10'
                      } rounded-lg flex items-start gap-3`}>
                        <div className={`p-2 rounded-lg ${
                          carbonSummary.totalCarbonKg < 0
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Leaf className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className={`text-[10px] font-extrabold ${
                            carbonSummary.totalCarbonKg < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          } block uppercase`}>
                            Environmental Impact Value (E-ROI)
                          </span>
                          <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                            {carbonSummary.totalCarbonKg < 0 ? '-' : ''}
                            {Math.abs(carbonSummary.totalCarbonKg).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg CO₂
                          </span>
                          <p className="text-[9px] text-slate-400 italic">
                            *proxy durasi
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {carbonSummary.netImpact === 'reduction'
                              ? 'Organisasi Anda menciptakan dampak ekologis bersih sebesar penyisihan karbon di atas secara paralel dengan pengembalian sosial.'
                              : carbonSummary.netImpact === 'emission'
                              ? 'Paralel dengan penciptaan nilai sosial, perhatikan pelepasan emisi karbon neto yang perlu dikompensasi di masa mendatang.'
                              : 'Program ini mencapai keseimbangan emisi karbon bersih paralel dengan penciptaan nilai sosial.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-lg border border-dashed">
              <Leaf className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Analisis Dampak Lingkungan (E-ROI) Belum Aktif
              </p>
              <p className="text-[10px] text-muted-foreground max-w-sm mt-1 px-4 leading-normal">
                Belum ada aktivitas program yang dihubungkan dengan pelacak emisi karbon atau status pelacakan tidak aktif.
                Aktifkan opsi "Aktifkan Analisis Karbon" di tab **WBS Builder** dan pilih faktor emisi untuk memulai visualisasi di sini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
