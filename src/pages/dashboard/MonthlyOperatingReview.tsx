import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { 
  CalendarRange, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Clock, 
  User, 
  Save, 
  Edit, 
  Sparkles,
  Loader2,
  Calendar,
  FileText,
  Activity,
  Percent,
  CheckCircle,
  TrendingDown
} from 'lucide-react';

interface PlanPriority {
  priority: string;
  owner: string;
  deadline: string;
}

interface DecisionItem {
  decision: string;
  owner: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'done';
}

interface AdaptiveActionItem {
  action: string;
  owner: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'done';
}

interface AdaptiveNoteItem {
  indicator_id: string;
  indicator_text: string;
  target_value: number;
  target_unit: string;
  actual_value: number;
  achievement_rate: number;
  root_cause_category: string;
  root_cause_detail: string;
  adaptation_decision: string;
  action_items: AdaptiveActionItem[];
}

interface MorSession {
  id: string;
  organization_id: string;
  session_date: string;
  facilitator_id: string | null;
  recap_notes: string;
  performance_notes: string;
  people_notes: string;
  risk_notes: string;
  plan_priorities: PlanPriority[];
  decisions: DecisionItem[];
  next_mor_date: string | null;
  created_at: string;
  adaptive_notes?: AdaptiveNoteItem[];
  learning_what_worked?: string;
  learning_what_didnt?: string;
  learning_recommendations?: string;
}

export default function MonthlyOperatingReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active Selected Session for editing or reading (null means creating new session)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Form States
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [recapNotes, setRecapNotes] = useState('');
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [peopleNotes, setPeopleNotes] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [nextMorDate, setNextMorDate] = useState('');
  
  // Array lists stored in JSONB columns
  const [priorities, setPriorities] = useState<PlanPriority[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);

  // Adaptive Management & Organization Learning States
  const [adaptiveNotes, setAdaptiveNotes] = useState<AdaptiveNoteItem[]>([]);
  const [learningWhatWorked, setLearningWhatWorked] = useState('');
  const [learningWhatDidnt, setLearningWhatDidnt] = useState('');
  const [learningRecommendations, setLearningRecommendations] = useState('');

  // Global Simple vs Professional Mode Toggle State
  const [globalMode, setGlobalMode] = useState<'simple' | 'professional'>('simple');

  // Selected Project ID for MEAL Indicators Pulling
  const [selectedLfaProjectId, setSelectedLfaProjectId] = useState<string>('');

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>('saved');
  const [isDirty, setIsDirty] = useState(false);

  // Add individual list item states
  const [newPriorityText, setNewPriorityText] = useState('');
  const [newPriorityOwner, setNewPriorityOwner] = useState('');
  const [newPriorityDeadline, setNewPriorityDeadline] = useState('');

  const [newDecisionText, setNewDecisionText] = useState('');
  const [newDecisionOwner, setNewDecisionOwner] = useState('');
  const [newDecisionDeadline, setNewDecisionDeadline] = useState('');
  const [newDecisionStatus, setNewDecisionStatus] = useState<'pending' | 'in_progress' | 'done'>('pending');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Local state for inline adaptive action item forms
  const [newActions, setNewActions] = useState<Record<string, { action: string; owner: string; deadline: string; status: 'pending' | 'in_progress' | 'done' }>>({});

  const getNewActionState = (indicatorId: string) => {
    return newActions[indicatorId] || { action: '', owner: '', deadline: '', status: 'pending' };
  };

  const updateNewActionState = (indicatorId: string, fields: any) => {
    setNewActions((prev) => ({
      ...prev,
      [indicatorId]: {
        ...getNewActionState(indicatorId),
        ...fields,
      },
    }));
  };

  // 1. Fetch organization context
  const { data: membership, isLoading: isMembershipLoading, isError: isMembershipError, error: membershipError } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // Fetch LFA Projects of the organization
  const { data: lfaProjects = [], isLoading: isLfaProjectsLoading, isError: isLfaProjectsError, error: lfaProjectsError } = useQuery({
    queryKey: ['lfa_projects_mor', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('org_id', orgId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Automatically select first project
  useEffect(() => {
    if (lfaProjects.length > 0 && !selectedLfaProjectId) {
      setSelectedLfaProjectId(lfaProjects[0].id);
    }
  }, [lfaProjects, selectedLfaProjectId]);

  // Fetch MEAL items for selected project
  const { data: mealItems = [], isLoading: isMealItemsLoading, isError: isMealItemsError, error: mealItemsError } = useQuery({
    queryKey: ['meal_items_mor', selectedLfaProjectId],
    queryFn: async () => {
      if (!selectedLfaProjectId) return [];
      const { data, error } = await supabase
        .from('lfa_meal_items')
        .select('*')
        .eq('lfa_project_id', selectedLfaProjectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLfaProjectId,
  });

  // Fetch MEAL tracking entries for selected project
  const { data: mealTrackingEntries = [], isLoading: isMealTrackingEntriesLoading, isError: isMealTrackingEntriesError, error: mealTrackingEntriesError } = useQuery({
    queryKey: ['meal_tracking_entries_mor', selectedLfaProjectId],
    queryFn: async () => {
      if (!selectedLfaProjectId) return [];
      const { data, error } = await supabase
        .from('lfa_meal_tracking_entries')
        .select('*')
        .eq('lfa_project_id', selectedLfaProjectId)
        .order('recorded_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLfaProjectId,
  });

  // 2. Fetch MOR Session history
  const { data: sessions = [], isLoading: isSessionsLoading, isError: isSessionsError, error: sessionsError } = useQuery<MorSession[]>({
    queryKey: ['mor_sessions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('mor_sessions')
        .select('*')
        .eq('organization_id', orgId)
        .order('session_date', { ascending: false });
      if (error) throw error;

      // Handle raw JSONB cast safely
      return (data || []).map((row: any) => ({
        ...row,
        plan_priorities: Array.isArray(row.plan_priorities) ? row.plan_priorities : [],
        decisions: Array.isArray(row.decisions) ? row.decisions : [],
        adaptive_notes: Array.isArray(row.adaptive_notes) ? row.adaptive_notes : [],
      }));
    },
    enabled: !!orgId,
  });

  // Load selected session into form
  const activeSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (activeSession) {
      setSessionDate(activeSession.session_date);
      setRecapNotes(activeSession.recap_notes || '');
      setPerformanceNotes(activeSession.performance_notes || '');
      setPeopleNotes(activeSession.people_notes || '');
      setRiskNotes(activeSession.risk_notes || '');
      setNextMorDate(activeSession.next_mor_date || '');
      setPriorities(activeSession.plan_priorities || []);
      setDecisions(activeSession.decisions || []);
      
      // Load new columns:
      setAdaptiveNotes(Array.isArray(activeSession.adaptive_notes) ? activeSession.adaptive_notes : []);
      setLearningWhatWorked(activeSession.learning_what_worked || '');
      setLearningWhatDidnt(activeSession.learning_what_didnt || '');
      setLearningRecommendations(activeSession.learning_recommendations || '');
    } else {
      // Clear to new session form
      setSessionDate(new Date().toISOString().split('T')[0]);
      setRecapNotes('');
      setPerformanceNotes('');
      setPeopleNotes('');
      setRiskNotes('');
      setNextMorDate('');
      setPriorities([]);
      setDecisions([]);
      
      // Clear new columns:
      setAdaptiveNotes([]);
      setLearningWhatWorked('');
      setLearningWhatDidnt('');
      setLearningRecommendations('');
    }
    
    // Loaded cleanly from database, reset dirty states
    setIsDirty(false);
    setSaveStatus('saved');
  }, [activeSession, selectedSessionId]);

  // Priority Add/Remove handlers with dirty state tracking
  const handleAddPriority = () => {
    if (!newPriorityText.trim()) {
      toast.error('Teks prioritas wajib diisi');
      return;
    }
    setPriorities((prev) => [
      ...prev,
      {
        priority: newPriorityText,
        owner: newPriorityOwner || 'Semua Tim',
        deadline: newPriorityDeadline || new Date().toISOString().split('T')[0],
      },
    ]);
    setNewPriorityText('');
    setNewPriorityOwner('');
    setNewPriorityDeadline('');
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleRemovePriority = (index: number) => {
    setPriorities((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  // Decisions Add/Remove handlers with dirty state tracking
  const handleAddDecision = () => {
    if (!newDecisionText.trim()) {
      toast.error('Teks keputusan/tindakan wajib diisi');
      return;
    }
    setDecisions((prev) => [
      ...prev,
      {
        decision: newDecisionText,
        owner: newDecisionOwner || 'Semua Tim',
        deadline: newDecisionDeadline || new Date().toISOString().split('T')[0],
        status: newDecisionStatus,
      },
    ]);
    setNewDecisionText('');
    setNewDecisionOwner('');
    setNewDecisionDeadline('');
    setNewDecisionStatus('pending');
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  // Explicit input change handlers setting dirty/unsaved state
  const handleRecapNotesChange = (val: string) => {
    setRecapNotes(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handlePerformanceNotesChange = (val: string) => {
    setPerformanceNotes(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handlePeopleNotesChange = (val: string) => {
    setPeopleNotes(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleRiskNotesChange = (val: string) => {
    setRiskNotes(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleNextMorDateChange = (val: string) => {
    setNextMorDate(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleSessionDateChange = (val: string) => {
    setSessionDate(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleLearningWhatWorkedChange = (val: string) => {
    setLearningWhatWorked(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleLearningWhatDidntChange = (val: string) => {
    setLearningWhatDidnt(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleLearningRecommendationsChange = (val: string) => {
    setLearningRecommendations(val);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  // Adaptive Notes Helper Utilities
  const getAdaptiveNote = (indicatorId: string, defaultIndicator?: any): AdaptiveNoteItem => {
    const existing = adaptiveNotes.find((n) => n.indicator_id === indicatorId);
    if (existing) return existing;
    return {
      indicator_id: indicatorId,
      indicator_text: defaultIndicator?.indicator_text || '',
      target_value: defaultIndicator?.target_value || 0,
      target_unit: defaultIndicator?.target_unit || '',
      actual_value: defaultIndicator?.actual_value || 0,
      achievement_rate: defaultIndicator?.achievement_rate || 0,
      root_cause_category: '',
      root_cause_detail: '',
      adaptation_decision: '',
      action_items: [],
    };
  };

  const updateAdaptiveNote = (indicatorId: string, fields: Partial<AdaptiveNoteItem>) => {
    setAdaptiveNotes((prev) => {
      const existingIndex = prev.findIndex((n) => n.indicator_id === indicatorId);
      let updatedList = [...prev];
      
      if (existingIndex > -1) {
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...fields };
      } else {
        // Find underperforming indicator details for default fields
        const indicator = underperformingIndicators.find((ind) => ind.id === indicatorId);
        const newItem: AdaptiveNoteItem = {
          indicator_id: indicatorId,
          indicator_text: indicator?.indicator_text || '',
          target_value: indicator?.target_value || 0,
          target_unit: indicator?.target_unit || '',
          actual_value: indicator?.actual_value || 0,
          achievement_rate: indicator?.achievement_rate || 0,
          root_cause_category: '',
          root_cause_detail: '',
          adaptation_decision: '',
          action_items: [],
          ...fields,
        };
        updatedList.push(newItem);
      }
      return updatedList;
    });
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const handleAddAdaptiveAction = (indicatorId: string) => {
    const actState = getNewActionState(indicatorId);
    if (!actState.action.trim()) {
      toast.error('Deskripsi tindakan adaptasi wajib diisi');
      return;
    }
    const note = getAdaptiveNote(indicatorId);
    const updatedActionItems = [
      ...(note.action_items || []),
      {
        action: actState.action,
        owner: actState.owner || 'Semua Tim',
        deadline: actState.deadline || new Date().toISOString().split('T')[0],
        status: actState.status || 'pending',
      }
    ];
    updateAdaptiveNote(indicatorId, { action_items: updatedActionItems });
    // Reset form state for this indicator
    updateNewActionState(indicatorId, { action: '', owner: '', deadline: '', status: 'pending' });
  };

  const handleRemoveAdaptiveAction = (indicatorId: string, actionIndex: number) => {
    const note = getAdaptiveNote(indicatorId);
    const updatedActionItems = (note.action_items || []).filter((_, i) => i !== actionIndex);
    updateAdaptiveNote(indicatorId, { action_items: updatedActionItems });
  };

  // Helper lists/calculation for MEAL Indicators filtering
  const activeMonthYear = useMemo(() => {
    if (!sessionDate) return null;
    const dateObj = new Date(sessionDate);
    return { month: dateObj.getMonth(), year: dateObj.getFullYear() };
  }, [sessionDate]);

  const filteredEntries = useMemo(() => {
    if (!activeMonthYear) return [];
    return mealTrackingEntries.filter((entry: any) => {
      if (!entry.recorded_date) return false;
      const d = new Date(entry.recorded_date);
      return d.getFullYear() === activeMonthYear.year && d.getMonth() === activeMonthYear.month;
    });
  }, [mealTrackingEntries, activeMonthYear]);

  const underperformingIndicators = useMemo(() => {
    if (mealItems.length === 0) return [];
    
    return mealItems.map((item: any) => {
      const itemEntries = filteredEntries.filter((e: any) => e.meal_item_id === item.id);
      const actual = itemEntries.reduce((sum: number, e: any) => sum + Number(e.recorded_value || 0), 0);
      const target = Number(item.target_value || 1);
      const pct = target > 0 ? (actual / target) * 100 : 0;
      
      return {
        id: item.id,
        indicator_text: item.indicator_text,
        target_value: target,
        target_unit: item.target_unit || 'Unit',
        actual_value: actual,
        achievement_rate: pct,
      };
    }).filter((indicator: any) => {
      // Underperforming defined as < 80% achievement rate
      return indicator.achievement_rate < 80;
    });
  }, [mealItems, filteredEntries]);

  // CRUD Mutations
  const saveMutation = useMutation({
    mutationFn: async (options?: { quiet?: boolean }) => {
      if (!orgId || !user?.id) throw new Error('Unauthenticated or Org not resolved');

      const payload = {
        organization_id: orgId,
        session_date: sessionDate,
        facilitator_id: user.id,
        recap_notes: recapNotes,
        performance_notes: performanceNotes,
        people_notes: peopleNotes,
        risk_notes: riskNotes,
        plan_priorities: priorities,
        decisions: decisions,
        next_mor_date: nextMorDate || null,
        // Fitur 4 Columns:
        adaptive_notes: adaptiveNotes,
        learning_what_worked: learningWhatWorked,
        learning_what_didnt: learningWhatDidnt,
        learning_recommendations: learningRecommendations,
      };

      if (selectedSessionId) {
        // UPDATE
        const { data, error } = await supabase
          .from('mor_sessions')
          .update(payload)
          .eq('id', selectedSessionId)
          .select()
          .single();
        if (error) throw error;
        return { data, quiet: options?.quiet };
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('mor_sessions')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return { data, quiet: options?.quiet };
      }
    },
    onSuccess: (result) => {
      if (!result.quiet) {
        toast.success(selectedSessionId ? 'Review Operasional berhasil diperbarui!' : 'Sesi Review Operasional baru sukses disimpan!');
      }
      setIsDirty(false);
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['mor_sessions', orgId] });
      if (!selectedSessionId) {
        setSelectedSessionId(result.data.id);
      }
    },
    onError: (err: any) => {
      console.error('[MOR] save error:', err);
      setSaveStatus('unsaved');
      toast.error(`Gagal menyimpan sesi MOR: ${err.message || 'Error internal server'}`);
    },
  });

  // Debounced Autosave Hook (1500ms debounce)
  useEffect(() => {
    if (!isDirty || !orgId) return;

    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      saveMutation.mutate({ quiet: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    sessionDate,
    recapNotes,
    performanceNotes,
    peopleNotes,
    riskNotes,
    nextMorDate,
    priorities,
    decisions,
    adaptiveNotes,
    learningWhatWorked,
    learningWhatDidnt,
    learningRecommendations,
    isDirty,
    orgId
  ]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mor_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Arsip MOR berhasil dihapus');
      setSelectedSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['mor_sessions', orgId] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus arsip: ${err.message}`);
    },
  });

  const handleResetForm = () => {
    setSelectedSessionId(null);
  };

  const handleApplyAITemplate = () => {
    setRecapNotes('Operasional berjalan dengan optimal secara keseluruhan. Terjadi peningkatan efisiensi logistik penyaluran buku paket program edukasi melalui skema relawan wilayah.');
    setPerformanceNotes('Program belajar utama mencapai 95% kehadiran. Fundraising MTD melampaui baseline target 15% berkat campaign rutin WhatsApp broadcast.');
    setPeopleNotes('PIC digital program membutuhkan peningkatan kompetensi manajemen aset digital. Akan dijadwalkan sesi pelatihan singkat minggu depan.');
    setRiskNotes('Risiko cuaca ekstrem di musim pancaroba dapat mengganggu mobilitas relawan lapangan.');
    setNextMorDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    setPriorities([
      { priority: 'Implementasi materi bimbingan literasi tahap 2', owner: 'Rina (Edukasi)', deadline: '2026-06-30' },
      { priority: 'Pembersihan dan validasi basis data donor pasif', owner: 'Ahmad (CRM)', deadline: '2026-06-25' }
    ]);
    
    setDecisions([
      { decision: 'Pengadaan 5 unit penunjang kelayakan belajar desa binaan', owner: 'Budi (Ops)', deadline: '2026-07-05', status: 'pending' },
      { decision: 'Transisi jadwal belajar ke sesi hybrid saat cuaca hujan deras', owner: 'Rina (Edukasi)', deadline: '2026-06-20', status: 'in_progress' }
    ]);

    setLearningWhatWorked('Pendekatan relawan berbasis komunitas lokal meningkatkan engagement masyarakat.');
    setLearningWhatDidnt('Logistik pengiriman fisik seringkali terhambat oleh kondisi cuaca yang sulit diprediksi.');
    setLearningRecommendations('Investasikan lebih lanjut pada model digital / virtual learning serta penampungan logistik lokal.');

    setIsDirty(true);
    setSaveStatus('unsaved');
    toast.success('Draf review taktis berbasis AI berhasil disematkan!');
  };

  const isGlobalError = isMembershipError || isSessionsError || isLfaProjectsError || isMealItemsError || isMealTrackingEntriesError;
  const globalError = membershipError || sessionsError || lfaProjectsError || mealItemsError || mealTrackingEntriesError;

  const isGlobalLoading = isMembershipLoading || (!!orgId && (isSessionsLoading || isLfaProjectsLoading || isMealItemsLoading || isMealTrackingEntriesLoading));

  if (isGlobalError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <p className="text-red-500 text-sm">
          Gagal memuat data: {(globalError as Error)?.message ?? 'Kesalahan tidak diketahui'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-teal-600 underline">
          Muat Ulang
        </button>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat riwayat review operasional bulanan…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HERO Banner */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Harvest & Review</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Monthly Operating Review (MOR)</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Disiplin manajemen taktis bulanan untuk mengulas kinerja program, alokasi kapasitas tim, mitigasi risiko, serta merumuskan prioritas target kerja dan keputusan strategis.
              </p>
            </div>
          </div>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14">
            <CalendarRange className="h-6 w-6 md:h-7 md:w-7" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* LEFT PANEL: MOR Timeline History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-accent" /> Riwayat Sesi MOR
            </h2>
            <Button size="sm" onClick={handleResetForm} variant="outline" className="h-8 text-xs border-accent/30 text-accent">
              <Plus className="mr-1 h-3.5 w-3.5" /> Sesi Baru
            </Button>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-muted bg-muted/10">
                <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs text-muted-foreground">Belum ada riwayat sesi MOR yang dicatat.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Gunakan panel kanan untuk membuat sesi perdana.</p>
              </Card>
            ) : (
              sessions.map((session) => {
                const isActive = selectedSessionId === session.id;
                const formattedDate = new Date(session.session_date).toLocaleDateString('id-ID', {
                  month: 'long',
                  year: 'numeric',
                  day: 'numeric',
                });
                return (
                  <Card
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-4 cursor-pointer transition-all border shadow-sm hover:border-accent/40 ${
                      isActive ? 'border-accent bg-accent-soft/10 ring-1 ring-accent/30' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">{formattedDate}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {session.recap_notes || 'Tidak ada catatan ringkasan.'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-accent' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-muted/40">
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4.5">
                        {session.plan_priorities?.length || 0} Prioritas
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4.5">
                        {session.decisions?.length || 0} Keputusan
                      </Badge>
                      {session.next_mor_date && (
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4.5 border-amber-500/20 text-amber-600 bg-amber-500/5">
                          Next: {session.next_mor_date}
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SESSIONS FORM */}
        <div className="space-y-6">
          <Card className="p-5 md:p-6 shadow-card border space-y-6 bg-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {selectedSessionId ? `Sesi MOR: ${new Date(sessionDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : 'Catat Sesi Operating Review Baru'}
                  </h2>
                  {/* Subtle Autosave Status Badge */}
                  {saveStatus === 'saving' && (
                    <Badge variant="outline" className="h-5 border-blue-500/25 bg-blue-500/5 text-blue-600 animate-pulse text-[10px] px-1.5 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan draf...
                    </Badge>
                  )}
                  {saveStatus === 'saved' && isDirty && (
                    <Badge variant="outline" className="h-5 border-emerald-500/25 bg-emerald-500/5 text-emerald-600 text-[10px] px-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tersimpan otomatis
                    </Badge>
                  )}
                  {saveStatus === 'saved' && !isDirty && (
                    <Badge variant="outline" className="h-5 border-emerald-500/25 bg-emerald-500/5 text-emerald-600 text-[10px] px-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tersimpan di cloud
                    </Badge>
                  )}
                  {saveStatus === 'unsaved' && (
                    <Badge variant="outline" className="h-5 border-amber-500/25 bg-amber-500/5 text-amber-600 text-[10px] px-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-pulse" /> Belum disimpan
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedSessionId ? 'Tinjau dan perbarui keputusan operasional yang telah direkam.' : 'Mulai pencatatan ritme operasional untuk melacak performa bulanan.'}
                </p>
              </div>
              <div className="flex gap-2">
                {!selectedSessionId && (
                  <Button onClick={handleApplyAITemplate} variant="outline" size="sm" className="h-9 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/5">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Draf AI Taktis
                  </Button>
                )}
                {selectedSessionId && (
                  <Button
                    onClick={() => setDeleteConfirmOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="notes" className="space-y-5">
              <TabsList className="grid grid-cols-4 w-full max-w-xl h-9 text-xs">
                <TabsTrigger value="notes">1. Catatan</TabsTrigger>
                <TabsTrigger value="priorities">2. Prioritas ({priorities.length})</TabsTrigger>
                <TabsTrigger value="decisions">3. Tindakan ({decisions.length})</TabsTrigger>
                <TabsTrigger value="adaptive" className="flex items-center gap-1">
                  4. Adaptif <Badge className={`text-[9px] px-1.5 h-4.5 font-bold ${underperformingIndicators.length > 0 ? 'bg-rose-500 text-rose-foreground' : 'bg-emerald-500 text-emerald-foreground'}`}>{underperformingIndicators.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: CORE NOTES */}
              <TabsContent value="notes" className="space-y-5 focus-visible:outline-none">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sessionDate" className="text-xs font-semibold">Tanggal Pelaksanaan Review</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      value={sessionDate}
                      onChange={(e) => handleSessionDateChange(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nextMorDate" className="text-xs font-semibold">Jadwal Sesi MOR Berikutnya (Opsional)</Label>
                    <Input
                      id="nextMorDate"
                      type="date"
                      value={nextMorDate}
                      onChange={(e) => handleNextMorDateChange(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recapNotes" className="text-xs font-semibold flex items-center gap-1">
                    Ringkasan Eksekutif (Recap Notes) <Badge className="text-[8px] h-3.5">General</Badge>
                  </Label>
                  <Textarea
                    id="recapNotes"
                    value={recapNotes}
                    onChange={(e) => handleRecapNotesChange(e.target.value)}
                    placeholder="Tuliskan intisari progres operasional, highlight utama, dan fokus utama tim di bulan ini..."
                    rows={4}
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="performanceNotes" className="text-xs font-semibold">Ulasan Performa Program (Performance)</Label>
                    <Textarea
                      id="performanceNotes"
                      value={performanceNotes}
                      onChange={(e) => handlePerformanceNotesChange(e.target.value)}
                      placeholder="Bagaimana pencapaian target program? Apakah ada deviasi target?"
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="peopleNotes" className="text-xs font-semibold">Kapasitas & Struktur Tim (People)</Label>
                    <Textarea
                      id="peopleNotes"
                      value={peopleNotes}
                      onChange={(e) => handlePeopleNotesChange(e.target.value)}
                      placeholder="Bagaimana kondisi moral tim? Adakah tantangan koordinasi?"
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskNotes" className="text-xs font-semibold flex items-center gap-1 text-amber-700 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Mitigasi Risiko & Hambatan (Risks)
                  </Label>
                  <Textarea
                    id="riskNotes"
                    value={riskNotes}
                    onChange={(e) => handleRiskNotesChange(e.target.value)}
                    placeholder="Tantangan eksternal (cuaca, legalitas, kepatuhan) atau internal yang berpotensi menghambat workflow..."
                    rows={3}
                    className="text-xs border-amber-500/10 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 bg-amber-500/[0.01]"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: PRIORITIES */}
              <TabsContent value="priorities" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">90-Day Prioritas Taktis Kerja</h3>
                  <p className="text-xs text-muted-foreground">
                    Tentukan sasaran krusial operasional yang wajib dieksekusi 30-90 hari mendatang.
                  </p>
                </div>

                {/* Priorities Table/List */}
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="p-3 font-semibold">Nama Prioritas / Sasaran</th>
                        <th className="p-3 font-semibold w-32">PIC Penanggung</th>
                        <th className="p-3 font-semibold w-28">Deadline</th>
                        <th className="p-3 font-semibold w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground/60 italic">
                            Belum ada prioritas kerja yang ditambahkan. Gunakan form di bawah untuk menginput.
                          </td>
                        </tr>
                      ) : (
                        priorities.map((item, index) => (
                          <tr key={index} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-medium text-foreground">{item.priority}</td>
                            <td className="p-3 text-muted-foreground">{item.owner}</td>
                            <td className="p-3 text-muted-foreground">{item.deadline}</td>
                            <td className="p-3 text-center">
                              <Button
                                onClick={() => handleRemovePriority(index)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Priority Fields Form */}
                <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Tambah Prioritas Baru</p>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_130px_auto] items-end">
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityText" className="text-[10px] font-semibold text-muted-foreground">Sasaran Prioritas</Label>
                      <Input
                        id="newPriorityText"
                        value={newPriorityText}
                        onChange={(e) => setNewPriorityText(e.target.value)}
                        placeholder="Contoh: Perapian database donatur aktif"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityOwner" className="text-[10px] font-semibold text-muted-foreground">Penanggung Jawab</Label>
                      <Input
                        id="newPriorityOwner"
                        value={newPriorityOwner}
                        onChange={(e) => setNewPriorityOwner(e.target.value)}
                        placeholder="Contoh: Ahmad (CRM)"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityDeadline" className="text-[10px] font-semibold text-muted-foreground">Batas Waktu</Label>
                      <Input
                        id="newPriorityDeadline"
                        type="date"
                        value={newPriorityDeadline}
                        onChange={(e) => setNewPriorityDeadline(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <Button onClick={handleAddPriority} type="button" size="sm" className="h-8 bg-accent text-accent-foreground px-3">
                      <Plus className="h-4 w-4" /> Tambah
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: DECISIONS */}
              <TabsContent value="decisions" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Keputusan Sesi & Rencana Tindakan (Action Items)</h3>
                  <p className="text-xs text-muted-foreground">
                    Dokumentasikan seluruh instruksi taktis lapangan, penanggung jawab, serta status implementasinya.
                  </p>
                </div>

                {/* Decisions Table/List */}
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="p-3 font-semibold">Keputusan / Tindakan Nyata</th>
                        <th className="p-3 font-semibold w-28">PIC Penanggung</th>
                        <th className="p-3 font-semibold w-24">Deadline</th>
                        <th className="p-3 font-semibold w-24">Status</th>
                        <th className="p-3 font-semibold w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground/60 italic">
                            Belum ada keputusan taktis yang direkam. Gunakan form di bawah untuk menginput.
                          </td>
                        </tr>
                      ) : (
                        decisions.map((item, index) => (
                          <tr key={index} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-medium text-foreground">{item.decision}</td>
                            <td className="p-3 text-muted-foreground">{item.owner}</td>
                            <td className="p-3 text-muted-foreground">{item.deadline}</td>
                            <td className="p-3">
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] font-bold px-1.5 h-4.5 ${
                                  item.status === 'done' 
                                    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600'
                                    : item.status === 'in_progress'
                                    ? 'border-amber-500/25 bg-amber-500/5 text-amber-600'
                                    : 'border-blue-500/25 bg-blue-500/5 text-blue-600'
                                }`}
                              >
                                {item.status === 'done' ? 'Selesai' : item.status === 'in_progress' ? 'Berjalan' : 'Rencana'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                onClick={() => handleRemoveDecision(index)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Decision Fields Form */}
                <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Tambah Keputusan Baru</p>
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_110px_100px_auto] items-end">
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionText" className="text-[10px] font-semibold text-muted-foreground">Instruksi / Tindakan</Label>
                      <Input
                        id="newDecisionText"
                        value={newDecisionText}
                        onChange={(e) => setNewDecisionText(e.target.value)}
                        placeholder="Contoh: Transisi sistem ke hybrid"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionOwner" className="text-[10px] font-semibold text-muted-foreground">PIC Penanggung</Label>
                      <Input
                        id="newDecisionOwner"
                        value={newDecisionOwner}
                        onChange={(e) => setNewDecisionOwner(e.target.value)}
                        placeholder="Contoh: Budi (Ops)"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionDeadline" className="text-[10px] font-semibold text-muted-foreground">Batas Waktu</Label>
                      <Input
                        id="newDecisionDeadline"
                        type="date"
                        value={newDecisionDeadline}
                        onChange={(e) => setNewDecisionDeadline(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionStatus" className="text-[10px] font-semibold text-muted-foreground">Status Awal</Label>
                      <select
                        id="newDecisionStatus"
                        value={newDecisionStatus}
                        onChange={(e) => setNewDecisionStatus(e.target.value as any)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="pending">Rencana</option>
                        <option value="in_progress">Berjalan</option>
                        <option value="done">Selesai</option>
                      </select>
                    </div>
                    <Button onClick={handleAddDecision} type="button" size="sm" className="h-8 bg-accent text-accent-foreground px-3">
                      <Plus className="h-4 w-4" /> Tambah
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: ADAPTIVE MANAGEMENT */}
              <TabsContent value="adaptive" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Adaptive Management Layer & Mitigasi Cepat</h3>
                  <p className="text-xs text-muted-foreground">
                    Sistem otomatis melacak indikator MEAL yang berjalan di bawah target (&lt; 80% capaian). Lakukan analisis akar masalah dan tentukan keputusan adaptif taktis.
                  </p>
                </div>

                {/* Project Selector & Mode Toggle */}
                <div className="grid gap-4 md:grid-cols-2 bg-muted/10 p-4 rounded-xl border">
                  <div className="space-y-1.5">
                    <Label htmlFor="lfaProjectSelector" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <Activity className="h-3.5 w-3.5 text-accent" /> Pilih Program MEAL untuk Evaluasi
                    </Label>
                    <select
                      id="lfaProjectSelector"
                      value={selectedLfaProjectId}
                      onChange={(e) => setSelectedLfaProjectId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="" disabled>-- Pilih Program --</option>
                      {lfaProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-accent" /> Tingkat Detail Analisis
                    </Label>
                    <div className="flex gap-2 h-9">
                      <Button
                        type="button"
                        variant={globalMode === 'simple' ? 'default' : 'outline'}
                        onClick={() => setGlobalMode('simple')}
                        className={`flex-1 text-xs h-full font-medium ${globalMode === 'simple' ? 'bg-accent text-accent-foreground' : ''}`}
                      >
                        🌱 Grassroot Simple
                      </Button>
                      <Button
                        type="button"
                        variant={globalMode === 'professional' ? 'default' : 'outline'}
                        onClick={() => setGlobalMode('professional')}
                        className={`flex-1 text-xs h-full font-medium ${globalMode === 'professional' ? 'bg-accent text-accent-foreground' : ''}`}
                      >
                        💼 Professional Detail
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Underperforming Indicators */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Indikator Rentan / Di Bawah Target (&lt; 80%) ({underperformingIndicators.length})
                  </p>

                  {underperformingIndicators.length === 0 ? (
                    <Card className="p-8 text-center border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-emerald-800">Semua Indikator Berkinerja Baik!</h4>
                        <p className="text-xs text-emerald-600 max-w-lg mx-auto leading-relaxed">
                          Luar biasa! Pada bulan pelaksanaan review ini (<strong>{new Date(sessionDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>), seluruh indikator MEAL yang tercatat untuk program terpilih memiliki tingkat pencapaian di atas 80%. Tidak ada intervensi mitigasi darurat yang diperlukan.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    underperformingIndicators.map((indicator) => {
                      const note = getAdaptiveNote(indicator.id, indicator);
                      const isCritical = indicator.achievement_rate < 50;
                      const actState = getNewActionState(indicator.id);

                      return (
                        <Card key={indicator.id} className="p-5 border-dashed border-red-200 bg-red-500/[0.01] space-y-4">
                          {/* Indicator Header Info */}
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-3">
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-foreground leading-relaxed">{indicator.indicator_text}</h4>
                              <p className="text-[10px] text-muted-foreground">
                                Realisasi: <strong className="text-foreground">{indicator.actual_value}</strong> dari target <strong className="text-foreground">{indicator.target_value} {indicator.target_unit}</strong>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Achievement rate gauge */}
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-bold text-foreground">{Math.round(indicator.achievement_rate)}% Tercapai</span>
                                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div 
                                    className={`h-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${Math.min(indicator.achievement_rate, 100)}%` }} 
                                  />
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] font-bold px-2 h-5.5 shrink-0 ${
                                  isCritical 
                                    ? 'border-rose-500/20 text-rose-600 bg-rose-500/5' 
                                    : 'border-amber-500/20 text-amber-600 bg-amber-500/5'
                                }`}
                              >
                                {isCritical ? '🔴 Kritis (< 50%)' : '⚠️ Rentan (50-79%)'}
                              </Badge>
                            </div>
                          </div>

                          {/* Professional Mode: Root Cause Section */}
                          {globalMode === 'professional' && (
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-1.5">
                                <Label htmlFor={`rc-cat-${indicator.id}`} className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-red-500" /> Kategori Penyebab Utama
                                </Label>
                                <select
                                  id={`rc-cat-${indicator.id}`}
                                  value={note.root_cause_category}
                                  onChange={(e) => updateAdaptiveNote(indicator.id, { root_cause_category: e.target.value })}
                                  className="h-8.5 w-full rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  <option value="">-- Pilih Kategori --</option>
                                  <option value="External/Weather">Cuaca / Eksternal</option>
                                  <option value="Technical/Operational">Teknis / Operasional</option>
                                  <option value="Team Capacity">Kapasitas Tim</option>
                                  <option value="Partner Coordination">Koordinasi Mitra</option>
                                  <option value="Funding">Pendanaan / Anggaran</option>
                                  <option value="Other">Lainnya</option>
                                </select>
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor={`rc-det-${indicator.id}`} className="text-[11px] font-semibold text-muted-foreground">Detail Analisis Masalah (Akar Penyebab)</Label>
                                <Textarea
                                  id={`rc-det-${indicator.id}`}
                                  value={note.root_cause_detail}
                                  onChange={(e) => updateAdaptiveNote(indicator.id, { root_cause_detail: e.target.value })}
                                  placeholder="Mengapa target indikator ini tidak tercapai bulan ini? Jelaskan kondisi rill lapangan..."
                                  rows={2}
                                  className="text-xs bg-background"
                                />
                              </div>
                            </div>
                          )}

                          {/* Both Modes: Adaptation Decision Input */}
                          <div className="space-y-1.5">
                            <Label htmlFor={`rc-decision-${indicator.id}`} className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-accent" /> Keputusan Adaptasi Lapangan
                            </Label>
                            <Input
                              id={`rc-decision-${indicator.id}`}
                              value={note.adaptation_decision}
                              onChange={(e) => updateAdaptiveNote(indicator.id, { adaptation_decision: e.target.value })}
                              placeholder="Contoh: Mengalihkan sisa penyaluran buku fisik ke model e-book via platform relawan lokal..."
                              className="h-8.5 text-xs bg-background"
                            />
                          </div>

                          {/* Both Modes: Action Items Sub-Manager */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-foreground">Daftar Tindakan Perbaikan Taktis ({note.action_items?.length || 0})</p>
                            </div>

                            {/* Action Items List */}
                            {(!note.action_items || note.action_items.length === 0) ? (
                              <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg text-center">
                                Belum ada tindakan taktis perbaikan yang direkam untuk indikator ini.
                              </p>
                            ) : (
                              <div className="rounded-lg border overflow-hidden bg-background">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-muted/50 border-b">
                                      <th className="p-2 font-semibold">Tindakan Adaptasi</th>
                                      <th className="p-2 font-semibold w-24">PIC</th>
                                      <th className="p-2 font-semibold w-24">Deadline</th>
                                      <th className="p-2 font-semibold w-20">Status</th>
                                      <th className="p-2 text-center w-10">Hapus</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {note.action_items.map((item, actIdx) => (
                                      <tr key={actIdx} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                        <td className="p-2 font-medium text-foreground">{item.action}</td>
                                        <td className="p-2 text-muted-foreground">{item.owner}</td>
                                        <td className="p-2 text-muted-foreground">{item.deadline}</td>
                                        <td className="p-2">
                                          <Badge 
                                            variant="outline" 
                                            className={`text-[8px] font-bold px-1.5 h-4 ${
                                              item.status === 'done' 
                                                ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600'
                                                : item.status === 'in_progress'
                                                ? 'border-amber-500/25 bg-amber-500/5 text-amber-600'
                                                : 'border-blue-500/25 bg-blue-500/5 text-blue-600'
                                            }`}
                                          >
                                            {item.status === 'done' ? 'Selesai' : item.status === 'in_progress' ? 'Berjalan' : 'Rencana'}
                                          </Badge>
                                        </td>
                                        <td className="p-2 text-center">
                                          <Button
                                            onClick={() => handleRemoveAdaptiveAction(indicator.id, actIdx)}
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Add Action Item Mini Form */}
                            <div className="rounded-lg border bg-background p-3 space-y-2">
                              <p className="text-[10px] font-bold text-foreground">Tambah Tindakan Taktis Baru</p>
                              <div className="grid gap-2 grid-cols-2 md:grid-cols-[1fr_120px_100px_90px_auto] items-end">
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                  <Label htmlFor={`act-text-${indicator.id}`} className="text-[9px] font-semibold text-muted-foreground">Tindakan</Label>
                                  <Input
                                    id={`act-text-${indicator.id}`}
                                    value={actState.action}
                                    onChange={(e) => updateNewActionState(indicator.id, { action: e.target.value })}
                                    placeholder="Contoh: Distribusi e-book lewat WA..."
                                    className="h-7 text-[11px] bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`act-pic-${indicator.id}`} className="text-[9px] font-semibold text-muted-foreground">Penanggung</Label>
                                  <Input
                                    id={`act-pic-${indicator.id}`}
                                    value={actState.owner}
                                    onChange={(e) => updateNewActionState(indicator.id, { owner: e.target.value })}
                                    placeholder="Contoh: Rina (CRM)"
                                    className="h-7 text-[11px] bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`act-date-${indicator.id}`} className="text-[9px] font-semibold text-muted-foreground">Batas Waktu</Label>
                                  <Input
                                    id={`act-date-${indicator.id}`}
                                    type="date"
                                    value={actState.deadline}
                                    onChange={(e) => updateNewActionState(indicator.id, { deadline: e.target.value })}
                                    className="h-7 text-[11px] bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`act-status-${indicator.id}`} className="text-[9px] font-semibold text-muted-foreground">Status</Label>
                                  <select
                                    id={`act-status-${indicator.id}`}
                                    value={actState.status}
                                    onChange={(e) => updateNewActionState(indicator.id, { status: e.target.value as any })}
                                    className="h-7 w-full rounded-md border border-input bg-background px-1 text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  >
                                    <option value="pending">Rencana</option>
                                    <option value="in_progress">Berjalan</option>
                                    <option value="done">Selesai</option>
                                  </select>
                                </div>
                                <Button 
                                  onClick={() => handleAddAdaptiveAction(indicator.id)} 
                                  type="button" 
                                  size="sm" 
                                  className="h-7 bg-accent text-accent-foreground px-2 w-full"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Tambah
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Organizational Learning Sub-Section */}
                <div className="border-t pt-6 mt-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Dokumentasi Pembelajaran Sesi (Organizational Learning)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ambil pembelajaran retrospektif dari sesi MOR bulan ini untuk ditransfer ke program berikutnya dan mengasah kapasitas ketangkasan tim.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="learningWhatWorked" className="text-xs font-semibold flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 1. Apa yang Berhasil? (What Worked)
                      </Label>
                      <Textarea
                        id="learningWhatWorked"
                        value={learningWhatWorked}
                        onChange={(e) => handleLearningWhatWorkedChange(e.target.value)}
                        placeholder="Contoh: Pendekatan relawan berbasis komunitas lokal meningkatkan keterlibatan peserta secara signifikan..."
                        rows={3}
                        className="text-xs border-emerald-500/10 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 bg-emerald-500/[0.01]"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="learningWhatDidnt" className="text-xs font-semibold flex items-center gap-1.5 text-rose-700">
                          <TrendingDown className="h-3.5 w-3.5" /> 2. Apa yang Kurang Berhasil? (What Didn&apos;t Work)
                        </Label>
                        <Textarea
                          id="learningWhatDidnt"
                          value={learningWhatDidnt}
                          onChange={(e) => handleLearningWhatDidntChange(e.target.value)}
                          placeholder="Contoh: Logistik pengiriman modul fisik terhambat oleh cuaca ekstrem dan jalur darat yang rusak..."
                          rows={3}
                          className="text-xs border-rose-500/10 focus-visible:border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.01]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="learningRecommendations" className="text-xs font-semibold flex items-center gap-1.5 text-blue-700">
                          <HelpCircle className="h-3.5 w-3.5" /> 3. Rekomendasi Pembelajaran & Tindak Lanjut
                        </Label>
                        <Textarea
                          id="learningRecommendations"
                          value={learningRecommendations}
                          onChange={(e) => handleLearningRecommendationsChange(e.target.value)}
                          placeholder="Contoh: Investasikan porsi anggaran buku fisik ke dalam digital learning, serta tunjuk relawan cadangan..."
                          rows={3}
                          className="text-xs border-blue-500/10 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 bg-blue-500/[0.01]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Submit Action */}
            <div className="border-t pt-4 flex items-center justify-end gap-3">
              {selectedSessionId && (
                <Button onClick={handleResetForm} variant="outline" className="h-10 text-xs">
                  Selesai Review / Buat Baru
                </Button>
              )}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-10 bg-accent text-accent-foreground px-5 font-semibold text-xs"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {selectedSessionId ? 'Simpan Perubahan Review' : 'Simpan Sesi Review Operasional'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Review Operasional?"
        description="Apakah Anda yakin ingin menghapus arsip review operasional ini? Data catatan, prioritas, dan keputusan terkait akan dihapus."
        confirmText="Ya, Hapus Review"
        cancelText="Batal"
        variant="destructive"
        icon="trash"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (selectedSessionId) {
            deleteMutation.mutate(selectedSessionId);
          }
        }}
      />
    </div>
  );
}
