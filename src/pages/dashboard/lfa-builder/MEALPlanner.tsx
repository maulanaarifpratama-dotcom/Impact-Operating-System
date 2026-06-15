// src/pages/dashboard/lfa-builder/MEALPlanner.tsx
// High-fidelity MEAL Planner module with Simple and Professional modes.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MealItem, MealLearningQuestion, MealAccountability, LfaProject, LfaEntry } from './types';
import {
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Check, Download,
  AlertTriangle, HelpCircle, CheckCircle2, Award, ClipboardCheck, Info, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MEALPlannerProps {
  projectId: string;
  orgId: string;
  programDurationMonths?: number;
  sector?: string;
}

export default function MEALPlanner({
  projectId,
  orgId,
  programDurationMonths = 12,
  sector = 'Sektor Lainnya'
}: MEALPlannerProps) {
  const { toast } = useToast();
  
  // State
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [learningQuestions, setLearningQuestions] = useState<MealLearningQuestion[]>([]);
  const [accountabilities, setAccountabilities] = useState<MealAccountability[]>([]);
  const [projectData, setProject] = useState<LfaProject | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');
  
  // AI Intelligence dialog states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const [aiSuggestResult, setAiSuggestResult] = useState<{
    collection_method: string;
    collection_tool: string;
    frequency: string;
    reasoning: string;
  } | null>(null);
  const [aiTargetItem, setAiTargetItem] = useState<MealItem | null>(null);

  const [aiCompletenessOpen, setAiCompletenessOpen] = useState(false);
  const [aiCompletenessResult, setAiCompletenessResult] = useState<{
    score: number;
    recommendations: string[];
  } | null>(null);

  // Debouncing refs for autosave
  const mealItemsRef = useRef<MealItem[]>([]);
  const questionsRef = useRef<MealLearningQuestion[]>([]);
  const accountabilitiesRef = useRef<MealAccountability[]>([]);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    mealItemsRef.current = mealItems;
  }, [mealItems]);

  useEffect(() => {
    questionsRef.current = learningQuestions;
  }, [learningQuestions]);

  useEffect(() => {
    accountabilitiesRef.current = accountabilities;
  }, [accountabilities]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Project
      const { data: proj } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (proj) setProject(proj as LfaProject);

      // 2. Fetch MEAL Items
      const { data: items, error: itemsErr } = await supabase
        .from('lfa_meal_items')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });
      if (itemsErr) throw itemsErr;

      // 3. Fetch Learning Questions
      const { data: questions, error: qErr } = await supabase
        .from('lfa_meal_learning_questions')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('sort_order', { ascending: true });
      if (qErr) throw qErr;

      // 4. Fetch Accountability
      const { data: accs, error: accErr } = await supabase
        .from('lfa_meal_accountability')
        .select('*')
        .eq('lfa_project_id', projectId)
        .order('created_at', { ascending: true });
      if (accErr) throw accErr;

      // Check if we need to do first-time auto-import from LFA
      if ((items || []).length === 0) {
        await triggerAutoImport();
      } else {
        setMealItems((items || []).map(item => ({
          ...item,
          disaggregation: item.disaggregation || []
        })) as MealItem[]);
        setLearningQuestions((questions || []) as MealLearningQuestion[]);
        setAccountabilities((accs || []) as MealAccountability[]);
        
        // Sync global mode from first item if exists
        if (items[0]?.mode) {
          setGlobalMode(items[0].mode as 'simple' | 'professional');
        }
      }
    } catch (err: any) {
      console.error('Failed to load MEAL Planner data:', err);
      toast({
        title: 'Gagal memuat MEAL Planner',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Idempotent Auto-Import from LFA Matrix
  const triggerAutoImport = async () => {
    setLoading(true);
    try {
      // Fetch LFA entries (level = goal, purpose, output)
      const { data: lfaEntries, error: lfaErr } = await supabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', projectId)
        .in('level', ['goal', 'purpose', 'output'])
        .order('sequence', { ascending: true });

      if (lfaErr) throw lfaErr;

      if (!lfaEntries || lfaEntries.length === 0) {
        toast({
          title: 'Tidak ada data LFA Matrix',
          description: 'LFA Matrix kamu kosong. Silakan lengkapi LFA Matrix terlebih dahulu.',
          variant: 'destructive',
        });
        setMealItems([]);
        return;
      }

      // Map lfa_entries to lfa_meal_items
      const mealInserts = lfaEntries
        .filter(entry => entry.indicator && entry.indicator.trim() !== '')
        .map((entry, index) => {
          let levelMap: 'goal' | 'purpose' | 'output' = 'output';
          if (entry.level === 'goal') levelMap = 'goal';
          if (entry.level === 'purpose') levelMap = 'purpose';

          return {
            lfa_project_id: projectId,
            org_id: orgId,
            lfa_level: levelMap,
            indicator_text: entry.indicator || '',
            baseline: null,
            target_value: null,
            target_unit: '',
            collection_method: null,
            collection_tool: null,
            frequency: null,
            pic: '',
            status: 'Belum Mulai',
            secondary_source: entry.means_of_verification || null,
            data_assumption: entry.assumption || null,
            monitoring_risk: '',
            mode: 'simple',
            sort_order: index,
            disaggregation: []
          };
        });

      if (mealInserts.length === 0) {
        // Fallback to importing based on descriptions if indicators are completely empty
        const fallbackInserts = lfaEntries.map((entry, index) => {
          let levelMap: 'goal' | 'purpose' | 'output' = 'output';
          if (entry.level === 'goal') levelMap = 'goal';
          if (entry.level === 'purpose') levelMap = 'purpose';

          return {
            lfa_project_id: projectId,
            org_id: orgId,
            lfa_level: levelMap,
            indicator_text: entry.indicator || `Indikator untuk: ${entry.description || entry.level}`,
            baseline: null,
            target_value: null,
            target_unit: '',
            collection_method: null,
            collection_tool: null,
            frequency: null,
            pic: '',
            status: 'Belum Mulai',
            secondary_source: entry.means_of_verification || null,
            data_assumption: entry.assumption || null,
            monitoring_risk: '',
            mode: 'simple',
            sort_order: index,
            disaggregation: []
          };
        });
        
        mealInserts.push(...fallbackInserts);
      }

      const { data: insertedItems, error: insertErr } = await supabase
        .from('lfa_meal_items')
        .insert(mealInserts)
        .select();

      if (insertErr) throw insertErr;

      setMealItems((insertedItems || []).map(item => ({
        ...item,
        disaggregation: item.disaggregation || []
      })) as MealItem[]);

      // Generate seed accountability mechanisms for Professional Mode (idempotent)
      const seedAccountabilities = [
        { lfa_project_id: projectId, org_id: orgId, mechanism: 'Kotak Saran', frequency: 'Mingguan', pic: 'MEAL Officer', escalation_procedure: 'Keluhan dicatat, divalidasi, dan ditangani dalam waktu maks 3 hari kerja.' },
        { lfa_project_id: projectId, org_id: orgId, mechanism: 'Hotline / WA Group', frequency: 'Setiap Hari', pic: 'Fasilitator Lapangan', escalation_procedure: 'Keluhan kritis diteruskan ke Koordinator Program segera.' }
      ];
      const { data: accs } = await supabase.from('lfa_meal_accountability').insert(seedAccountabilities).select();
      if (accs) setAccountabilities(accs as MealAccountability[]);

      toast({
        title: 'Auto-Import LFA Berhasil! 🌾',
        description: 'Indikator diimpor dari LFA kamu. Lengkapi metode pengumpulan dan frekuensi monitoring.',
      });

    } catch (err: any) {
      console.error('Auto-import MEAL items error:', err);
      toast({
        title: 'Gagal mengimpor LFA Matrix',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Safe Autosave Handler
  const queueAutosave = (type: 'items' | 'questions' | 'accs', id: string, saveFn: () => Promise<void>) => {
    setSaving(true);
    const timerKey = `${type}_${id}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    debounceTimers.current[timerKey] = setTimeout(async () => {
      try {
        await saveFn();
        setLastSaved(new Date());
      } catch (err) {
        console.error(`Autosave failed for ${type} row ${id}:`, err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  // Core save functions
  const saveMealItem = async (item: MealItem) => {
    await supabase
      .from('lfa_meal_items')
      .update({
        indicator_text: item.indicator_text,
        target_value: item.target_value,
        target_unit: item.target_unit,
        collection_method: item.collection_method,
        collection_tool: item.collection_tool,
        frequency: item.frequency,
        pic: item.pic,
        status: item.status,
        baseline: item.baseline,
        midline_target: item.midline_target,
        endline_target: item.endline_target,
        secondary_source: item.secondary_source,
        disaggregation: item.disaggregation,
        data_assumption: item.data_assumption,
        monitoring_risk: item.monitoring_risk,
        mode: globalMode
      })
      .eq('id', item.id);
  };

  const saveQuestion = async (q: MealLearningQuestion) => {
    await supabase
      .from('lfa_meal_learning_questions')
      .update({
        question_text: q.question_text,
        answer_method: q.answer_method,
        timeline_month: q.timeline_month,
        pic: q.pic
      })
      .eq('id', q.id);
  };

  const saveAccountability = async (acc: MealAccountability) => {
    await supabase
      .from('lfa_meal_accountability')
      .update({
        mechanism: acc.mechanism,
        frequency: acc.frequency,
        pic: acc.pic,
        escalation_procedure: acc.escalation_procedure
      })
      .eq('id', acc.id);
  };

  // Sync Mode selection
  const handleToggleMode = async (mode: 'simple' | 'professional') => {
    setGlobalMode(mode);
    setSaving(true);
    try {
      // Bulk update mode inside Supabase immediately to preserve state
      if (mealItems.length > 0) {
        const { error } = await supabase
          .from('lfa_meal_items')
          .update({ mode })
          .eq('lfa_project_id', projectId);
        if (error) throw error;
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to sync global mode to database:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add Item manually
  const handleAddMealItem = async (level: 'goal' | 'purpose' | 'output') => {
    setSaving(true);
    try {
      const nextSort = mealItems.length;
      const { data, error } = await supabase
        .from('lfa_meal_items')
        .insert({
          lfa_project_id: projectId,
          org_id: orgId,
          lfa_level: level,
          indicator_text: `Indikator ${level === 'goal' ? 'Dampak' : level === 'purpose' ? 'Tujuan' : 'Hasil'} Baru`,
          status: 'Belum Mulai',
          mode: globalMode,
          sort_order: nextSort,
          disaggregation: []
        })
        .select()
        .single();

      if (error) throw error;
      setMealItems(prev => [...prev, { ...data, disaggregation: [] } as MealItem]);
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menambah baris', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Meal Item
  const handleDeleteMealItem = async (id: string) => {
    if (!confirm('Hapus baris indikator MEAL ini? Tindakan ini tidak dapat dibatalkan.')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('lfa_meal_items').delete().eq('id', id);
      if (error) throw error;
      setMealItems(prev => prev.filter(item => item.id !== id));
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menghapus baris', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Add Learning Question
  const handleAddQuestion = async () => {
    setSaving(true);
    try {
      const nextSort = learningQuestions.length;
      const { data, error } = await supabase
        .from('lfa_meal_learning_questions')
        .insert({
          lfa_project_id: projectId,
          org_id: orgId,
          question_text: 'Tuliskan pertanyaan pembelajaran program baru di sini...',
          timeline_month: 6,
          sort_order: nextSort
        })
        .select()
        .single();

      if (error) throw error;
      setLearningQuestions(prev => [...prev, data as MealLearningQuestion]);
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menambah pertanyaan', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('lfa_meal_learning_questions').delete().eq('id', id);
      if (error) throw error;
      setLearningQuestions(prev => prev.filter(q => q.id !== id));
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menghapus pertanyaan', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Add Accountability Loop
  const handleAddAccountability = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lfa_meal_accountability')
        .insert({
          lfa_project_id: projectId,
          org_id: orgId,
          mechanism: 'Kotak Saran',
          frequency: 'Bulanan',
          pic: 'Tim Lapangan',
          escalation_procedure: 'Ditindaklanjuti segera.'
        })
        .select()
        .single();

      if (error) throw error;
      setAccountabilities(prev => [...prev, data as MealAccountability]);
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menambah mekanisme', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountability = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('lfa_meal_accountability').delete().eq('id', id);
      if (error) throw error;
      setAccountabilities(prev => prev.filter(acc => acc.id !== id));
      setLastSaved(new Date());
    } catch (err: any) {
      toast({ title: 'Gagal menghapus mekanisme', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Helper: Calculate Monitoring Timeline Month Chips from frequency selection
  const getFrequencyMonthChips = (freq: string | null) => {
    if (!freq) return [];
    const duration = programDurationMonths;
    const chips: string[] = [];
    
    if (freq === 'Bulanan') {
      for (let i = 1; i <= duration; i++) chips.push(`B${i}`);
    } else if (freq === 'Triwulan') {
      for (let i = 3; i <= duration; i += 3) chips.push(`B${i}`);
    } else if (freq === 'Semesteran') {
      for (let i = 6; i <= duration; i += 6) chips.push(`B${i}`);
    } else if (freq === 'Tahunan') {
      for (let i = 12; i <= duration; i += 12) chips.push(`B${i}`);
    } else if (freq === 'Awal & Akhir Program') {
      chips.push('Awal', 'Akhir');
    } else if (freq === 'Insidental') {
      chips.push('Ad-hoc');
    }
    
    return chips;
  };

  // AI Actions Trigger
  const handleAiSuggestMethod = async (item: MealItem) => {
    setAiLoading(true);
    setAiTargetItem(item);
    setAiSuggestResult(null);
    setAiSuggestOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('meal-ai-suggest', {
        body: {
          action: 'suggest_indicator_method',
          indicator_text: item.indicator_text,
          lfa_level: item.lfa_level,
          sector: sector
        }
      });
      if (error) throw error;
      setAiSuggestResult(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Asisten AI Gagal',
        description: err.message || 'Gagal memanggil asisten AI. Silakan coba beberapa saat lagi.',
        variant: 'destructive',
      });
      setAiSuggestOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = async () => {
    if (!aiTargetItem || !aiSuggestResult) return;
    
    const updated = mealItems.map(item => {
      if (item.id === aiTargetItem.id) {
        const itemCopy = {
          ...item,
          collection_method: aiSuggestResult.collection_method,
          collection_tool: aiSuggestResult.collection_tool,
          frequency: aiSuggestResult.frequency
        };
        queueAutosave('items', itemCopy.id, () => saveMealItem(itemCopy));
        return itemCopy;
      }
      return item;
    });
    
    setMealItems(updated);
    setAiSuggestOpen(false);
    toast({
      title: 'Saran AI Diterapkan! ✨',
      description: 'Metode, alat, dan frekuensi pengumpulan diperbarui berdasarkan kecerdasan buatan.',
    });
  };

  const handleAiGenerateLearningQuestions = async () => {
    setAiLoading(true);
    try {
      const activeIndicators = mealItems.map(item => item.indicator_text).filter(Boolean);
      const { data, error } = await supabase.functions.invoke('meal-ai-suggest', {
        body: {
          action: 'generate_learning_questions',
          indicators: activeIndicators,
          sector: sector,
          duration_months: programDurationMonths
        }
      });
      if (error) throw error;
      
      const newQuestions = data.questions as Array<{
        question_text: string;
        answer_method: string;
        timeline_month: number;
        pic: string;
      }>;

      // Delete existing learning questions first to prevent piling up
      if (learningQuestions.length > 0) {
        await supabase.from('lfa_meal_learning_questions').delete().eq('lfa_project_id', projectId);
      }

      // Insert new ones bulk
      const inserts = newQuestions.map((q, i) => ({
        lfa_project_id: projectId,
        org_id: orgId,
        question_text: q.question_text,
        answer_method: q.answer_method,
        timeline_month: q.timeline_month,
        pic: q.pic,
        sort_order: i
      }));

      const { data: savedQuestions, error: insertErr } = await supabase
        .from('lfa_meal_learning_questions')
        .insert(inserts)
        .select();

      if (insertErr) throw insertErr;
      setLearningQuestions(savedQuestions as MealLearningQuestion[]);
      setLastSaved(new Date());

      toast({
        title: 'Learning Questions Berhasil Dibuat! 🧠',
        description: `Berhasil merumuskan ${savedQuestions.length} pertanyaan pembelajaran utama program.`,
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Gagal membuat learning questions',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCheckCompleteness = async () => {
    setAiLoading(true);
    setAiCompletenessResult(null);
    setAiCompletenessOpen(true);
    try {
      const payloadItems = mealItems.map(item => ({
        lfa_level: item.lfa_level,
        indicator_text: item.indicator_text,
        collection_method: item.collection_method || '',
        pic: item.pic || ''
      }));

      const { data, error } = await supabase.functions.invoke('meal-ai-suggest', {
        body: {
          action: 'check_meal_completeness',
          meal_items: payloadItems
        }
      });
      if (error) throw error;
      setAiCompletenessResult(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Gagal menjalankan audit kelengkapan',
        description: err.message,
        variant: 'destructive',
      });
      setAiCompletenessOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  // Summary Metrics calculations
  const totalIndicators = mealItems.length;
  const hasMethodCount = mealItems.filter(item => item.collection_method).length;
  const hasPicCount = mealItems.filter(item => item.pic && item.pic.trim() !== '').length;

  // Print Preview layout generator for High-Fidelity Client-side PDF Exporter
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isProf = globalMode === 'professional';
    const orientation = isProf ? 'landscape' : 'portrait';

    const renderTableRows = () => {
      return mealItems.map((item, idx) => {
        const freqChips = getFrequencyMonthChips(item.frequency);
        const levelBadgeColor = 
          item.lfa_level === 'goal' ? 'background-color: #1e293b; color: white;' :
          item.lfa_level === 'purpose' ? 'background-color: #0f766e; color: white;' :
          'background-color: #ea580c; color: white;';
        const levelLabel = 
          item.lfa_level === 'goal' ? 'Goal (Dampak)' :
          item.lfa_level === 'purpose' ? 'Outcome (Tujuan)' :
          'Output (Hasil)';

        if (!isProf) {
          return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
              <td style="padding: 10px 8px; font-weight: bold; width: 15%;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; uppercase; ${levelBadgeColor}">${levelLabel}</span></td>
              <td style="padding: 10px 8px; width: 25%;">${item.indicator_text || '-'}</td>
              <td style="padding: 10px 8px; width: 15%; font-weight: 500;">${item.target_value ? `${item.target_value} ${item.target_unit || ''}` : '-'}</td>
              <td style="padding: 10px 8px; width: 15%;">${item.collection_method || '-'}</td>
              <td style="padding: 10px 8px; width: 15%;">${item.frequency || '-'} <br/><span style="font-size: 9px; color: #64748b;">${freqChips.join(', ')}</span></td>
              <td style="padding: 10px 8px; width: 15%;">${item.pic || '-'}</td>
            </tr>
          `;
        } else {
          return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
              <td style="padding: 8px 6px; font-weight: bold;"><span style="padding: 2px 5px; border-radius: 3px; font-size: 8px; uppercase; ${levelBadgeColor}">${levelLabel}</span></td>
              <td style="padding: 8px 6px; max-width: 150px; word-break: break-word;">${item.indicator_text || '-'}</td>
              <td style="padding: 8px 6px;"><b>B:</b> ${item.baseline ?? '-'}<br/><b>M:</b> ${item.midline_target ?? '-'}<br/><b>E:</b> ${item.endline_target ?? '-'}</td>
              <td style="padding: 8px 6px; max-width: 100px; word-break: break-word;"><b>Metode:</b> ${item.collection_method || '-'}<br/><b>Alat:</b> ${item.collection_tool || '-'}</td>
              <td style="padding: 8px 6px;">${item.frequency || '-'}<br/><span style="font-size: 8px; color: #64748b; font-weight: 500;">(${freqChips.join(', ')})</span></td>
              <td style="padding: 8px 6px;">${item.pic || '-'}</td>
              <td style="padding: 8px 6px; max-width: 100px; word-break: break-word;">${(item.disaggregation || []).join(', ') || '-'}</td>
              <td style="padding: 8px 6px; font-size: 9px; max-width: 120px; word-break: break-word;"><b>Asumsi:</b> ${item.data_assumption || '-'}<br/><b>Risiko:</b> ${item.monitoring_risk || '-'}</td>
            </tr>
          `;
        }
      }).join('');
    };

    const renderLearningQuestionsRows = () => {
      if (learningQuestions.length === 0) return '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">Belum ada pertanyaan pembelajaran.</td></tr>';
      return learningQuestions.map(q => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px; width: 40%; font-weight: 500;">${q.question_text}</td>
          <td style="padding: 8px; width: 25%;">${q.answer_method || '-'}</td>
          <td style="padding: 8px; width: 15%; text-align: center;">Bulan ${q.timeline_month}</td>
          <td style="padding: 8px; width: 20%;">${q.pic || '-'}</td>
        </tr>
      `).join('');
    };

    const renderAccountabilityRows = () => {
      if (accountabilities.length === 0) return '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">Belum ada mekanisme akuntabilitas.</td></tr>';
      return accountabilities.map(acc => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px; width: 25%; font-weight: bold;">${acc.mechanism}</td>
          <td style="padding: 8px; width: 15%;">${acc.frequency || '-'}</td>
          <td style="padding: 8px; width: 20%;">${acc.pic || '-'}</td>
          <td style="padding: 8px; width: 40%; font-size: 10px;">${acc.escalation_procedure || '-'}</td>
        </tr>
      `).join('');
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>MEAL Plan — ${projectData?.name || 'Impactory.id'}</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: 1.5cm;
            }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header {
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .subtitle {
              font-size: 12px;
              color: #475569;
              margin-top: 4px;
              margin-bottom: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              font-size: 10px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 10px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
            .meta-item b {
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              text-align: left;
              padding: 8px;
              border-bottom: 2px solid #cbd5e1;
            }
            .section-title {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              color: #0f766e;
              margin-bottom: 10px;
              margin-top: 25px;
              border-left: 4px solid #0f766e;
              padding-left: 8px;
            }
            .summary-card {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              color: #166534;
              padding: 8px 12px;
              border-radius: 4px;
              margin-top: -15px;
              margin-bottom: 25px;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              margin-top: 30px;
              position: fixed;
              bottom: 0;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">MEAL Plan (Rencana M&E)</h1>
            <p class="subtitle">${projectData?.name || 'Program tanpa nama'}</p>
          </div>

          <div class="meta-grid">
            <div class="meta-item"><b>Sektor:</b> ${projectData?.sector || 'Sektor Lainnya'}</div>
            <div class="meta-item"><b>Durasi:</b> ${projectData?.duration_months || 12} bulan</div>
            <div class="meta-item"><b>Lokasi:</b> ${projectData?.location || 'Indonesia'}</div>
            <div class="meta-item"><b>Tanggal Cetak:</b> ${new Date().toLocaleDateString('id-ID')}</div>
          </div>

          <div class="section-title">MEAL Indicator Matrix (${isProf ? 'Mode Profesional' : 'Mode Sederhana'})</div>
          <table>
            <thead>
              <tr>
                ${!isProf ? `
                  <th style="width: 15%;">Tingkatan LFA</th>
                  <th style="width: 25%;">Indikator Keberhasilan</th>
                  <th style="width: 15%;">Target Kuantitatif</th>
                  <th style="width: 15%;">Metode Pengumpulan</th>
                  <th style="width: 15%;">Frekuensi</th>
                  <th style="width: 15%;">PIC</th>
                ` : `
                  <th style="width: 10%;">Level LFA</th>
                  <th style="width: 20%;">Indikator Keberhasilan</th>
                  <th style="width: 12%;">Baseline & Target</th>
                  <th style="width: 15%;">Metode & Alat</th>
                  <th style="width: 10%;">Frekuensi</th>
                  <th style="width: 10%;">PIC</th>
                  <th style="width: 11%;">Disagregasi</th>
                  <th style="width: 12%;">Asumsi & Risiko</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${renderTableRows()}
            </tbody>
          </table>

          ${!isProf ? `
            <div class="summary-card">
              <span>Total Indikator: ${totalIndicators}</span>
              <span>Cakupan Metode Pengumpulan Data: ${hasMethodCount}/${totalIndicators}</span>
              <span>Penanggung Jawab Ditentukan: ${hasPicCount}/${totalIndicators}</span>
            </div>
          ` : ''}

          ${isProf ? `
            <div style="page-break-before: always;"></div>
            <div class="section-title">Learning Questions (Pertanyaan Pembelajaran Program)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%;">Pertanyaan Pembelajaran Utama</th>
                  <th style="width: 25%;">Metode Pendekatan untuk Menjawab</th>
                  <th style="width: 15%; text-align: center;">Timeline Pengumpulan</th>
                  <th style="width: 20%;">Penanggung Jawab (PIC)</th>
                </tr>
              </thead>
              <tbody>
                ${renderLearningQuestionsRows()}
              </tbody>
            </table>

            <div class="section-title">Mekanisme Akuntabilitas & Penanganan Keluhan (Feedback Loops)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25%;">Mekanisme / Saluran Feedback</th>
                  <th style="width: 15%;">Frekuensi Review</th>
                  <th style="width: 20%;">PIC Penyelesaian</th>
                  <th style="width: 40%;">Prosedur Eskalasi Keluhan Kritis / Serius</th>
                </tr>
              </thead>
              <tbody>
                ${renderAccountabilityRows()}
              </tbody>
            </table>
          ` : ''}

          <div class="footer">
            Dibuat secara sistematis menggunakan Modul MEAL Builder Impactory.id — Rencana Berstandar Internasional (OECD-DAC/USAID)
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground bg-white rounded-xl border border-slate-100 shadow-sm">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-teal-600" /> Memproses integrasi & memuat data MEAL Planner...
      </div>
    );
  }

  return (
    <div data-testid="meal-planner-root" className="space-y-6">
      {/* MEAL HEADER BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-xl border border-slate-800 shadow-xl text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-lg border border-teal-500/30">🌱</span>
              <h2 className="text-xl font-bold tracking-tight">MEAL Planner & Framework</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Membangun strategi Monitoring, Evaluasi, Akuntabilitas, dan Pembelajaran (MEAL) yang kokoh. 
              Cocok untuk pengajuan proposal donor internasional (USAID/OECD-DAC) maupun implementasi taktis akar rumput.
            </p>
          </div>

          {/* Symmetrical Progressive Toggle */}
          <div className="flex items-center self-start md:self-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 shadow-inner">
            <button
              onClick={() => handleToggleMode('simple')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                globalMode === 'simple'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌱 Sederhana
            </button>
            <button
              onClick={() => handleToggleMode('professional')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                globalMode === 'professional'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏢 Profesional
            </button>
          </div>
        </div>

        {/* Action triggers and status banner */}
        <div className="mt-5 pt-4 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            {saving ? (
              <span className="flex items-center gap-1.5 bg-slate-800/60 py-1 px-2.5 rounded-full border border-slate-700/30 text-teal-400 font-medium">
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan otomatis...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1.5 bg-emerald-950/40 text-emerald-400 py-1 px-2.5 rounded-full border border-emerald-500/20 font-medium">
                <Check className="h-3.5 w-3.5" /> Tersimpan {lastSaved.toLocaleTimeString('id-ID')}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Autosave 1.5 detik aktif</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAiCheckCompleteness}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-8.5 rounded-lg"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-300" /> Cek Kelengkapan MEAL
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="bg-teal-500 hover:bg-teal-400 text-slate-900 border-0 text-xs font-bold h-8.5 rounded-lg"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export MEAL Plan
            </Button>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-elegant">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                <th className="p-3.5 py-4 w-32 shrink-0">Tingkat LFA</th>
                <th className="p-3.5 py-4 min-w-[220px]">Indikator Keberhasilan</th>
                {globalMode === 'professional' && <th className="p-3.5 py-4 w-36 shrink-0">Baseline</th>}
                <th className="p-3.5 py-4 w-44 shrink-0">Target Kuantitatif</th>
                <th className="p-3.5 py-4 min-w-[180px]">Metode & Alat Pengumpulan</th>
                <th className="p-3.5 py-4 w-48 shrink-0">Frekuensi & Timeline</th>
                <th className="p-3.5 py-4 w-36 shrink-0">PIC</th>
                <th className="p-3.5 py-4 w-32 shrink-0">Status</th>
                {globalMode === 'professional' && <th className="p-3.5 py-4 w-40 shrink-0">Disagregasi</th>}
                {globalMode === 'professional' && <th className="p-3.5 py-4 min-w-[160px]">Asumsi & Risiko</th>}
                <th className="p-3.5 py-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {mealItems.map((item, index) => {
                const chips = getFrequencyMonthChips(item.frequency);
                const levelBadgeClass =
                  item.lfa_level === 'goal'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200'
                    : item.lfa_level === 'purpose'
                    ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/30'
                    : 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/20';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 group transition-all align-top">
                    {/* Level */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`py-0.5 px-2 text-[10px] font-bold tracking-wide uppercase shadow-sm ${levelBadgeClass}`}>
                          {item.lfa_level === 'goal' ? 'Dampak' : item.lfa_level === 'purpose' ? 'Tujuan' : 'Hasil'}
                        </Badge>
                      </div>
                    </td>

                    {/* Indicator description */}
                    <td className="p-3.5">
                      <Textarea
                        value={item.indicator_text}
                        data-testid="meal-indicator-name-input"
                        onChange={(e) => {
                          const val = e.target.value;
                          setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, indicator_text: val } : m));
                          const target = { ...item, indicator_text: val };
                          queueAutosave('items', item.id, () => saveMealItem(target));
                        }}
                        placeholder="Tuliskan indikator keberhasilan program..."
                        rows={2}
                        className="text-xs w-full min-h-[50px] resize-none py-1 bg-transparent border-slate-200 hover:border-slate-300 focus:bg-white dark:focus:bg-slate-950 focus:border-teal-500 rounded"
                      />
                    </td>

                    {/* Baseline (Professional Only) */}
                    {globalMode === 'professional' && (
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <Label className="text-[9px] text-slate-400 uppercase tracking-wider block">Nilai Baseline</Label>
                          <Input
                            type="number"
                            value={item.baseline ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, baseline: val } : m));
                              const target = { ...item, baseline: val };
                              queueAutosave('items', item.id, () => saveMealItem(target));
                            }}
                            placeholder="0"
                            className="text-xs h-7.5"
                          />
                        </div>
                      </td>
                    )}

                    {/* Target */}
                    <td className="p-3.5">
                      <div className="space-y-2">
                        {globalMode === 'simple' ? (
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.target_value ?? ''}
                              data-testid="meal-target-input"
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, target_value: val } : m));
                                const target = { ...item, target_value: val };
                                queueAutosave('items', item.id, () => saveMealItem(target));
                              }}
                              placeholder="Target"
                              className="text-xs h-7.5 w-16 px-1"
                            />
                            <Input
                              value={item.target_unit ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, target_unit: val } : m));
                                const target = { ...item, target_unit: val };
                                queueAutosave('items', item.id, () => saveMealItem(target));
                              }}
                              placeholder="Satuan (mis. %)"
                              className="text-xs h-7.5 flex-1 px-1.5"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-[10px]">
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <Label className="text-[9px] text-slate-400 uppercase block">Midline</Label>
                                <Input
                                  type="number"
                                  value={item.midline_target ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, midline_target: val } : m));
                                    const target = { ...item, midline_target: val };
                                    queueAutosave('items', item.id, () => saveMealItem(target));
                                  }}
                                  placeholder="0"
                                  className="text-[10px] h-6 px-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] text-slate-400 uppercase block">Endline</Label>
                                <Input
                                  type="number"
                                  value={item.endline_target ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, endline_target: val } : m));
                                    const target = { ...item, endline_target: val };
                                    queueAutosave('items', item.id, () => saveMealItem(target));
                                  }}
                                  placeholder="0"
                                  className="text-[10px] h-6 px-1"
                                />
                              </div>
                            </div>
                            <Input
                              value={item.target_unit ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, target_unit: val } : m));
                                const target = { ...item, target_unit: val };
                                queueAutosave('items', item.id, () => saveMealItem(target));
                              }}
                              placeholder="Satuan (mis. orang)"
                              className="text-[10px] h-6.5"
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Method & Tool */}
                    <td className="p-3.5">
                      <div className="space-y-2">
                        <div className="flex gap-1 items-center">
                          <Select
                            value={item.collection_method || ''}
                            onValueChange={(val) => {
                              setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, collection_method: val } : m));
                              const target = { ...item, collection_method: val };
                              queueAutosave('items', item.id, () => saveMealItem(target));
                            }}
                          >
                            <SelectTrigger className="text-xs h-7.5 font-medium border-slate-200">
                              <SelectValue placeholder="Pilih Metode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Survey">Survey</SelectItem>
                              <SelectItem value="Wawancara">Wawancara</SelectItem>
                              <SelectItem value="FGD">FGD</SelectItem>
                              <SelectItem value="Observasi Lapangan">Observasi Lapangan</SelectItem>
                              <SelectItem value="Studi Dokumen">Studi Dokumen</SelectItem>
                              <SelectItem value="Data Sekunder">Data Sekunder</SelectItem>
                              <SelectItem value="Lainnya">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleAiSuggestMethod(item)}
                                  size="icon"
                                  variant="ghost"
                                  className="h-7.5 w-7.5 rounded bg-slate-50 dark:bg-slate-900 text-teal-600 hover:text-teal-700 hover:bg-slate-100"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>✨ Saran Metode AI</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {globalMode === 'professional' && (
                          <Select
                            value={item.collection_tool || ''}
                            onValueChange={(val) => {
                              setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, collection_tool: val } : m));
                              const target = { ...item, collection_tool: val };
                              queueAutosave('items', item.id, () => saveMealItem(target));
                            }}
                          >
                            <SelectTrigger className="text-[10px] h-7 font-medium border-slate-200">
                              <SelectValue placeholder="Pilih Alat Pengumpul" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kuesioner Terstruktur">Kuesioner Terstruktur</SelectItem>
                              <SelectItem value="Panduan Wawancara">Panduan Wawancara</SelectItem>
                              <SelectItem value="Panduan FGD">Panduan FGD</SelectItem>
                              <SelectItem value="Lembar Observasi">Lembar Observasi</SelectItem>
                              <SelectItem value="Form Monitoring Bulanan">Form Monitoring Bulanan</SelectItem>
                              <SelectItem value="Data Administratif">Data Administratif</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>

                    {/* Frequency & Timeline Chips */}
                    <td className="p-3.5">
                      <div className="space-y-1.5">
                        <Select
                          value={item.frequency || ''}
                          onValueChange={(val) => {
                            setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, frequency: val } : m));
                            const target = { ...item, frequency: val };
                            queueAutosave('items', item.id, () => saveMealItem(target));
                          }}
                        >
                          <SelectTrigger className="text-xs h-7.5 font-medium border-slate-200">
                            <SelectValue placeholder="Pilih Frekuensi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bulanan">Bulanan</SelectItem>
                            <SelectItem value="Triwulan">Triwulan</SelectItem>
                            <SelectItem value="Semesteran">Semesteran</SelectItem>
                            <SelectItem value="Tahunan">Tahunan</SelectItem>
                            <SelectItem value="Awal & Akhir Program">Awal & Akhir Program</SelectItem>
                            <SelectItem value="Insidental">Insidental</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Computed timeline month chips */}
                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[170px] bg-slate-50/50 p-1 rounded border border-slate-100">
                            {chips.slice(0, 8).map((chip, idx) => (
                              <Badge key={idx} variant="secondary" className="px-1 text-[8px] font-semibold tracking-wider text-slate-500 scale-95 uppercase">
                                {chip}
                              </Badge>
                            ))}
                            {chips.length > 8 && (
                              <span className="text-[8px] text-slate-400 font-semibold px-0.5">+{chips.length - 8}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PIC */}
                    <td className="p-3.5">
                      <Input
                        value={item.pic || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, pic: val } : m));
                          const target = { ...item, pic: val };
                          queueAutosave('items', item.id, () => saveMealItem(target));
                        }}
                        placeholder="Mis. MEAL Officer"
                        className="text-xs h-7.5"
                      />
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <Select
                        value={item.status || 'Belum Mulai'}
                        onValueChange={(val: 'Belum Mulai' | 'Sedang Berjalan' | 'Selesai') => {
                          setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, status: val } : m));
                          const target = { ...item, status: val };
                          queueAutosave('items', item.id, () => saveMealItem(target));
                        }}
                      >
                        <SelectTrigger className="text-xs h-7.5 font-medium border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Belum Mulai">Belum Mulai</SelectItem>
                          <SelectItem value="Sedang Berjalan">Sedang Berjalan</SelectItem>
                          <SelectItem value="Selesai">Selesai</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Disaggregation (Professional Only) */}
                    {globalMode === 'professional' && (
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[150px] p-1 border rounded bg-slate-50 border-slate-200 min-h-[30px]">
                          {['Jenis Kelamin', 'Usia', 'Wilayah', 'Kelompok Rentan'].map((dis) => {
                            const isSelected = (item.disaggregation || []).includes(dis);
                            return (
                              <button
                                key={dis}
                                onClick={() => {
                                  let currentArr = [...(item.disaggregation || [])];
                                  if (currentArr.includes(dis)) {
                                    currentArr = currentArr.filter(d => d !== dis);
                                  } else {
                                    currentArr.push(dis);
                                  }
                                  setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, disaggregation: currentArr } : m));
                                  const target = { ...item, disaggregation: currentArr };
                                  queueAutosave('items', item.id, () => saveMealItem(target));
                                }}
                                className={`px-1 rounded-sm text-[8px] font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-teal-500 text-white border-teal-600'
                                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                                }`}
                              >
                                {dis === 'Kelompok Rentan' ? 'Rentang' : dis.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}

                    {/* Assumptions & Risk (Professional Only) */}
                    {globalMode === 'professional' && (
                      <td className="p-3.5">
                        <div className="space-y-1.5">
                          <Input
                            value={item.data_assumption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, data_assumption: val } : m));
                              const target = { ...item, data_assumption: val };
                              queueAutosave('items', item.id, () => saveMealItem(target));
                            }}
                            placeholder="Asumsi (mis. cuaca cerah)"
                            className="text-[10px] h-6 px-1.5"
                          />
                          <Input
                            value={item.monitoring_risk || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMealItems(prev => prev.map(m => m.id === item.id ? { ...m, monitoring_risk: val } : m));
                              const target = { ...item, monitoring_risk: val };
                              queueAutosave('items', item.id, () => saveMealItem(target));
                            }}
                            placeholder="Risiko (mis. akses ditutup)"
                            className="text-[10px] h-6 px-1.5"
                          />
                        </div>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <Button
                        onClick={() => void handleDeleteMealItem(item.id)}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-300 hover:text-red-500 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Matrix Addition triggers */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <Button
            onClick={() => handleAddMealItem('output')}
            variant="outline"
            size="sm"
            data-testid="meal-add-indicator-button"
            className="text-xs h-8 border-slate-200"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Tambah Indikator Hasil (Output)
          </Button>
          <Button
            onClick={() => handleAddMealItem('purpose')}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-200"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Tambah Indikator Tujuan
          </Button>
        </div>
      </div>

      {/* SUMMARY DASHBOARD FOR SIMPLE MODE */}
      {globalMode === 'simple' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Indikator MEAL</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{totalIndicators} Indikator</p>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sudah Ber-metode</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {hasMethodCount} / {totalIndicators} ({totalIndicators > 0 ? Math.round((hasMethodCount / totalIndicators) * 100) : 0}%)
              </p>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sudah Memiliki PIC</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {hasPicCount} / {totalIndicators} ({totalIndicators > 0 ? Math.round((hasPicCount / totalIndicators) * 100) : 0}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL ONLY SECTIONS */}
      {globalMode === 'professional' && (
        <div className="space-y-6">
          {/* LEARNING QUESTIONS SECTION */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-elegant space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧠</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Pertanyaan Pembelajaran (Learning Questions)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  Merumuskan pertanyaan riset strategis yang akan dievaluasi di tengah dan di akhir program demi perbaikan berkelanjutan.
                </p>
              </div>

              <Button
                onClick={handleAiGenerateLearningQuestions}
                disabled={aiLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-xs h-8.5 rounded-lg shadow-sm"
              >
                {aiLoading ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-300" />
                )}
                Generate Learning Questions
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="pb-3 w-1/2">Pertanyaan Pembelajaran Utama</th>
                    <th className="pb-3 w-1/4">Metode untuk Menjawab</th>
                    <th className="pb-3 w-28 text-center">Bulan ke-</th>
                    <th className="pb-3 w-40">PIC</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {learningQuestions.map((q) => (
                    <tr key={q.id} className="align-top group">
                      <td className="py-3 pr-4">
                        <Textarea
                          value={q.question_text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLearningQuestions(prev => prev.map(item => item.id === q.id ? { ...item, question_text: val } : item));
                            const target = { ...q, question_text: val };
                            queueAutosave('questions', q.id, () => saveQuestion(target));
                          }}
                          rows={2}
                          placeholder="Pertanyaan riset program..."
                          className="text-xs bg-transparent border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-500 resize-none py-1.5"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          value={q.answer_method || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLearningQuestions(prev => prev.map(item => item.id === q.id ? { ...item, answer_method: val } : item));
                            const target = { ...q, answer_method: val };
                            queueAutosave('questions', q.id, () => saveQuestion(target));
                          }}
                          placeholder="FGD / Evaluasi Eksternal"
                          className="text-xs h-7.5"
                        />
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Input
                          type="number"
                          value={q.timeline_month}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setLearningQuestions(prev => prev.map(item => item.id === q.id ? { ...item, timeline_month: val } : item));
                            const target = { ...q, timeline_month: val };
                            queueAutosave('questions', q.id, () => saveQuestion(target));
                          }}
                          placeholder="6"
                          className="text-xs h-7.5 text-center w-16 mx-auto"
                        />
                      </td>
                      <td className="py-3">
                        <Input
                          value={q.pic || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLearningQuestions(prev => prev.map(item => item.id === q.id ? { ...item, pic: val } : item));
                            const target = { ...q, pic: val };
                            queueAutosave('questions', q.id, () => saveQuestion(target));
                          }}
                          placeholder="MEAL Manager"
                          className="text-xs h-7.5"
                        />
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          onClick={() => void handleDeleteQuestion(q.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-red-500 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleAddQuestion}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-slate-200"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Tambah Pertanyaan Pembelajaran
            </Button>
          </div>

          {/* ACCOUNTABILITY LOOP SECTION */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-elegant space-y-4">
            <div className="flex flex-col gap-1 border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Akuntabilitas & Penanganan Masukan (Feedback Loop)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Menyusun saluran pengaduan bagi penerima manfaat untuk menjaga transparansi, rasa aman, dan akuntabilitas organisasi.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="pb-3 w-1/4">Saluran Feedback (Mekanisme)</th>
                    <th className="pb-3 w-40">Frekuensi Review</th>
                    <th className="pb-3 w-44">PIC Penanganan</th>
                    <th className="pb-3 w-1/2">Prosedur Eskalasi Masukan Serius</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {accountabilities.map((acc) => (
                    <tr key={acc.id} className="align-top group">
                      <td className="py-3 pr-4">
                        <Select
                          value={acc.mechanism}
                          onValueChange={(val) => {
                            setAccountabilities(prev => prev.map(item => item.id === acc.id ? { ...item, mechanism: val } : item));
                            const target = { ...acc, mechanism: val };
                            queueAutosave('accs', acc.id, () => saveAccountability(target));
                          }}
                        >
                          <SelectTrigger className="text-xs h-7.5 font-medium border-slate-200 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Kotak Saran">Kotak Saran</SelectItem>
                            <SelectItem value="Hotline">Hotline</SelectItem>
                            <SelectItem value="Pertemuan Komunitas">Pertemuan Komunitas</SelectItem>
                            <SelectItem value="Survey Kepuasan">Survey Kepuasan</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          value={acc.frequency || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAccountabilities(prev => prev.map(item => item.id === acc.id ? { ...item, frequency: val } : item));
                            const target = { ...acc, frequency: val };
                            queueAutosave('accs', acc.id, () => saveAccountability(target));
                          }}
                          placeholder="E.g. Mingguan"
                          className="text-xs h-7.5"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          value={acc.pic || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAccountabilities(prev => prev.map(item => item.id === acc.id ? { ...item, pic: val } : item));
                            const target = { ...acc, pic: val };
                            queueAutosave('accs', acc.id, () => saveAccountability(target));
                          }}
                          placeholder="PIC Keluhan"
                          className="text-xs h-7.5"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Textarea
                          value={acc.escalation_procedure || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAccountabilities(prev => prev.map(item => item.id === acc.id ? { ...item, escalation_procedure: val } : item));
                            const target = { ...acc, escalation_procedure: val };
                            queueAutosave('accs', acc.id, () => saveAccountability(target));
                          }}
                          rows={1}
                          placeholder="SOP penanganan aduan sensitif..."
                          className="text-xs bg-transparent border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-500 resize-none py-1.5"
                        />
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          onClick={() => void handleDeleteAccountability(acc.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-red-500 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleAddAccountability}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-slate-200"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Tambah Saluran Akuntabilitas
            </Button>
          </div>
        </div>
      )}

      {/* AI SUGGESTION DETAIL DIALOG */}
      <Dialog open={aiSuggestOpen} onOpenChange={setAiSuggestOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-600">
              <Sparkles className="h-4 w-4" /> Saran M&E Metode AI
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Analisis cerdas berdasarkan level LFA, sektor, dan tipe indikator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {aiLoading ? (
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                <span>Menghitung rekomendasi metode terbaik...</span>
              </div>
            ) : aiSuggestResult ? (
              <div className="space-y-3.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2 border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Metode Pengumpulan</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{aiSuggestResult.collection_method}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Alat Pengumpul</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{aiSuggestResult.collection_tool}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Frekuensi Monitoring</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{aiSuggestResult.frequency}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 rounded-lg border border-emerald-100 dark:border-emerald-900/30 leading-relaxed text-[11px] space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-emerald-700">Analisis Pertimbangan:</span>
                  <p className="italic">"{aiSuggestResult.reasoning}"</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 italic py-6">Rekomendasi gagal dimuat.</div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAiSuggestOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              onClick={applyAiSuggestion}
              disabled={aiLoading || !aiSuggestResult}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
            >
              Terapkan Rekomendasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI COMPLETENESS CHECK DIALOG */}
      <Dialog open={aiCompletenessOpen} onOpenChange={setAiCompletenessOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-600">
              <ClipboardCheck className="h-4.5 w-4.5" /> Laporan Kelengkapan & Kualitas MEAL
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Review kecerdasan buatan terhadap struktur Rencana M&E Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {aiLoading ? (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                <span>Menganalisis kelogisan, kelengkapan, dan target MEAL...</span>
              </div>
            ) : aiCompletenessResult ? (
              <div className="space-y-4">
                {/* Score section */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full border-4 border-teal-500/20 shrink-0 bg-white dark:bg-slate-950 shadow-sm">
                    <span className="text-lg font-extrabold text-teal-600">{aiCompletenessResult.score}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Completeness Rating</span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-xs">
                      {aiCompletenessResult.score >= 90 ? 'Sangat Lengkap & Siap Audit' : aiCompletenessResult.score >= 70 ? 'Cukup Lengkap' : 'Butuh Perbaikan Penting'}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      Nilai dihitung berdasarkan ketersediaan indikator, metode pengumpulan, penanggung jawab, dan instrumen.
                    </p>
                  </div>
                </div>

                {/* Recommendations list */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide text-[10px]">Rekomendasi Perbaikan:</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {aiCompletenessResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2.5 bg-amber-50/40 text-amber-900 dark:bg-amber-950/10 dark:text-amber-300 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20 leading-relaxed">
                        <span className="shrink-0 mt-0.5">💡</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                    {aiCompletenessResult.recommendations.length === 0 && (
                      <p className="italic text-emerald-600 text-center py-4">Luar biasa! Rencana MEAL Anda sudah lengkap dan sempurna.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 italic py-6">Gagal memuat hasil audit.</div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setAiCompletenessOpen(false)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
