import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { setActiveProjectId } from '@/lib/workspace/activeProject';
import {
  ArrowLeft,
  Loader2,
  Check,
  Save,
  Download,
  Send,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Layers,
  Ruler,
  FolderSync,
  HelpCircle,
  Lock,
  ArrowRight,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LfaProject, LfaEntry } from './types';
import WBSBuilder from './WBSBuilder';
import BudgetCalculator from './BudgetCalculator';
import MEALPlanner from './MEALPlanner';
import SROICalculator from './SROICalculator';
import { buildEditorCanonicalLfaView } from '@/lib/lfa/editorCanonicalBridge';


/**
 * Turn a failed Goal/Purpose bootstrap insert into something the user can act on.
 *
 * These rows used to fall back to a fabricated entry with a hardcoded id
 * ('mock-goal-1', 'mock-purpose-1'). The editor then rendered as if all was
 * well, but the id is not a UUID, so every autosave afterwards died with
 * 22P02 and nothing typed into the logframe was ever stored. Silent data loss
 * is worse than a visible failure — especially mid-demo.
 *
 * The common cause is a project_id with no matching lfa_projects row (a deleted
 * or stale link), which surfaces as an FK violation; that case gets a message
 * saying what to do rather than the raw constraint name.
 */
function lfaBootstrapError(level: 'Goal' | 'Purpose', message: string): Error {
  if (message.includes('lfa_entries_project_id_fkey')) {
    return new Error(
      'Program LFA ini tidak ditemukan — kemungkinan sudah dihapus. ' +
        'Buka ulang dari daftar LFA Builder.',
    );
  }
  return new Error(`Gagal menyiapkan baris ${level}: ${message}`);
}

export default function LFABuilderEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState<LfaProject | null>(null);
  const [goal, setGoal] = useState<LfaEntry | null>(null);
  const [purpose, setPurpose] = useState<LfaEntry | null>(null);
  const [outputs, setOutputs] = useState<LfaEntry[]>([]);
  const [activities, setActivities] = useState<LfaEntry[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'lfa' | 'wbs' | 'budget' | 'meal' | 'sroi'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'wbs' || tabParam === 'budget' || tabParam === 'meal' || tabParam === 'sroi') {
      return tabParam;
    }
    return 'lfa';
  });
  const [activeSection, setActiveSection] = useState<'goal' | 'purpose' | 'outputs' | 'activities'>('goal');
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [collapsedOutputs, setExpandedOutputs] = useState<Record<string, boolean>>({});

  // Export PDF and Grantwriter States
  const [pdfLoading, setPdfLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [linkedProposal, setLinkedProposal] = useState<{ id: string; title: string } | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [showAiSuggestion, setShowAiSuggestion] = useState<Record<string, boolean>>({});

  const [wbsExists, setWbsExists] = useState(false);
  const [mealExists, setMealExists] = useState(false);

  // Proposal Generation State
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [generatedGwProjectId, setGeneratedGwProjectId] = useState<string | null>(null);

  const handleGenerateFullProposal = async () => {
    if (!project) return;
    setGeneratingProposal(true);
    toast({
      title: 'Memproses Proposal Lengkap',
      description: 'Sedang mengembangkan matriks LFA menjadi proposal naratif 5-7 bab (diperkirakan 30-60 detik)...',
    });

    try {
      const targetGwProjectId = project.linked_grant_id || project.id;
      const { data, error } = await supabase.functions.invoke('grant-writer-proposal', {
        body: { projectId: targetGwProjectId }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Gagal membuat proposal');
      }

      setProposalReady(true);
      setCurrentDocId(data.document_id);
      if (data.project_id) {
        setGeneratedGwProjectId(data.project_id);
      }
      toast({
        title: 'Proposal Lengkap Selesai!',
        description: `Proposal ${data.word_count || ''} kata (${data.section_count || 7} bab) berhasil dibuat!`,
      });
    } catch (err: any) {
      console.error('Proposal generation failed:', err);
      toast({
        title: 'Gagal membuat proposal',
        description: err.message || 'Terjadi kesalahan saat memproses proposal',
        variant: 'destructive',
      });
    } finally {
      setGeneratingProposal(false);
    }
  };

  const checkWbsExistence = useCallback(async () => {
    if (!projectId) return;
    try {
      const { count, error } = await supabase
        .from('lfa_wbs_items')
        .select('*', { count: 'exact', head: true })
        .eq('lfa_project_id', projectId);
      if (!error) {
        setWbsExists((count ?? 0) > 0);
      }
    } catch (err) {
      console.error('Error checking WBS existence:', err);
    }
  }, [projectId]);

  const checkMealExistence = useCallback(async () => {
    if (!projectId) return;
    try {
      const { count, error } = await supabase
        .from('lfa_meal_items')
        .select('*', { count: 'exact', head: true })
        .eq('lfa_project_id', projectId);
      if (!error) {
        setMealExists((count ?? 0) > 0);
      }
    } catch (err) {
      console.error('Error checking MEAL existence:', err);
    }
  }, [projectId]);

  const loadProjectAndEntries = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await ensureDefaultOrg(user!.id, profile?.full_name);

      // 1. Fetch LFA project row
      let { data: pData, error: pErr } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (!pData) {
        pData = {
          id: projectId || '38d79a1a-7064-4718-b857-194f8a587daf',
          name: 'Program Pemberdayaan Ekonomi & Lingkungan Desa',
          org_id: orgId,
          linked_grant_id: '750bbb67-a9a6-435e-821d-7de86b3136e8',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any;
      }
      setProject(pData as LfaProject);

      // Check linked proposal if exists
      if (pData.linked_grant_id) {
        const { data: propData } = await supabase
          .from('gw_projects')
          .select('id, title')
          .eq('id', pData.linked_grant_id)
          .maybeSingle();
        if (propData) {
          setLinkedProposal({ id: propData.id, title: propData.title });
        }
      } else {
        // Look for any proposal that has wizard_data with this lfa_project_id
        const { data: linkedP } = await supabase
          .from('gw_projects')
          .select('id, title')
          .eq('organization_id', orgId)
          .limit(1); // placeholder check or query to match
        // We'll wire up robust check in proposal later
      }

      // 2. Fetch LFA entries
      const { data: entries, error: eErr } = await supabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence', { ascending: true });

      if (eErr) {
        console.warn('[LFABuilderEditor] DB select entries error, will fallback to cache if available:', eErr.message);
      }

      let entriesList = (entries || []) as LfaEntry[];

      if (entriesList.length === 0 || entriesList.every(e => !e.description || e.description.trim() === '')) {
        try {
          const cached = localStorage.getItem(`lfa_entries_${projectId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(e => e.description && e.description.trim() !== '')) {
              console.log(`[LFABuilderEditor] Loaded ${parsed.length} non-empty entries from localStorage for project ${projectId}`);
              entriesList = parsed as LfaEntry[];
            }
          }
        } catch (cacheErr) {
          console.warn('[LFABuilderEditor] Error reading localStorage cache:', cacheErr);
        }
      }
      
      // Determine if Goal and Purpose exist. If not, pre-insert them immediately!
      let goalEntry = entriesList.find((e) => e.level === 'goal') || null;
      let purposeEntry = entriesList.find((e) => e.level === 'purpose') || null;

      if (!goalEntry) {
        const { data: g, error: gErr } = await supabase
          .from('lfa_entries')
          .insert({
            project_id: projectId,
            org_id: orgId,
            level: 'goal',
            sequence: 1,
            description: '',
            indicator: '',
            means_of_verification: '',
            assumption: '',
          })
          .select()
          .single();
        if (gErr) {
          throw lfaBootstrapError('Goal', gErr.message);
        }
        goalEntry = g as LfaEntry;
      }

      if (!purposeEntry) {
        const { data: prp, error: prpErr } = await supabase
          .from('lfa_entries')
          .insert({
            project_id: projectId,
            org_id: orgId,
            level: 'purpose',
            sequence: 1,
            description: '',
            indicator: '',
            means_of_verification: '',
            assumption: '',
          })
          .select()
          .single();
        if (prpErr) {
          throw lfaBootstrapError('Purpose', prpErr.message);
        }
        purposeEntry = prp as LfaEntry;
      }

      setGoal(goalEntry);
      setPurpose(purposeEntry);
      setOutputs(entriesList.filter((e) => e.level === 'output'));
      setActivities(entriesList.filter((e) => e.level === 'activity'));
      void checkWbsExistence();
      void checkMealExistence();
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Gagal memuat logframe',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, projectId, navigate, toast, checkWbsExistence, checkMealExistence]);

  useEffect(() => {
    if (user && projectId) {
      setActiveProjectId(projectId);
      void loadProjectAndEntries();
    }
  }, [user, projectId, loadProjectAndEntries]);

  // Generic Save for individual entries
  const saveEntry = async (entry: LfaEntry) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_entries')
        .update({
          description: entry.description,
          indicator: entry.indicator,
          means_of_verification: entry.means_of_verification,
          assumption: entry.assumption,
          responsible_party: entry.responsible_party,
          timeline_start: entry.timeline_start,
          timeline_end: entry.timeline_end,
          sequence: entry.sequence,
        })
        .eq('id', entry.id);

      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProjectName = async (newName: string) => {
    if (!project || !newName.trim()) return;
    setProject((prev) => prev ? { ...prev, name: newName } : null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_projects')
        .update({ name: newName.trim() })
        .eq('id', project.id);
      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Project rename failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add Output
  const handleAddOutput = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const seq = outputs.length + 1;
      const { data, error } = await supabase
        .from('lfa_entries')
        .insert({
          project_id: project.id,
          org_id: project.org_id,
          level: 'output',
          sequence: seq,
          description: '',
          indicator: '',
          means_of_verification: '',
          assumption: '',
        })
        .select()
        .single();

      if (error) throw error;

      setOutputs((prev) => [...prev, data as LfaEntry]);
      setLastSaved(new Date());
      setActiveSection('outputs');
      toast({
        title: 'Hasil (Output) ditambahkan',
        description: `Hasil baru H${seq} ditambahkan di bagian bawah matrix.`,
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menambah output',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Entry
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<{ id: string; level: 'output' | 'activity' } | null>(null);

  const requestDeleteEntry = (id: string, level: 'output' | 'activity') => {
    setDeleteEntryTarget({ id, level });
  };

  const executeDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    const { id, level } = deleteEntryTarget;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lfa_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (level === 'output') {
        const remainingOutputs = outputs.filter((o) => o.id !== id);
        setOutputs(remainingOutputs);
        setActivities((prev) => prev.filter((a) => a.parent_id !== id));
      } else {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }

      setLastSaved(new Date());
      toast({
        title: 'Komponen Dihapus',
        description: `${level === 'output' ? 'Hasil' : 'Kegiatan'} telah dihapus.`,
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menghapus',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setDeleteEntryTarget(null);
    }
  };

  // Add Activity
  const handleAddActivity = async (outputId: string) => {
    if (!project) return;
    if (!outputId || !outputs.some((o) => o.id === outputId)) {
      toast({
        title: 'Gagal menambah kegiatan',
        description: 'Output induk tidak valid atau tidak ditemukan.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const outputActivities = activities.filter((a) => a.parent_id === outputId);
      const seq = outputActivities.length + 1;
      
      const { data, error } = await supabase
        .from('lfa_entries')
        .insert({
          project_id: project.id,
          org_id: project.org_id,
          level: 'activity',
          sequence: seq,
          parent_id: outputId,
          description: '',
          indicator: '',
          means_of_verification: '',
          assumption: '',
          responsible_party: '',
          timeline_start: 1,
          timeline_end: project.duration_months || 12,
        })
        .select()
        .single();

      if (error) throw error;

      setActivities((prev) => [...prev, data as LfaEntry]);
      setExpandedActivities((prev) => ({ ...prev, [data.id]: true }));
      setLastSaved(new Date());
      setActiveSection('activities');
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menambah kegiatan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reorder Outputs
  const handleMoveOutput = async (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= outputs.length) return;

    const list = [...outputs];
    const temp = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = temp;

    // Recalculate sequences
    const updated = list.map((item, idx) => ({
      ...item,
      sequence: idx + 1,
    }));

    setOutputs(updated);
    setSaving(true);

    try {
      // Bulk update sequential sequence
      for (const item of updated) {
        await supabase
          .from('lfa_entries')
          .update({ sequence: item.sequence })
          .eq('id', item.id);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('Reorder outputs failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Reorder Activities inside Output
  const handleMoveActivity = async (outputId: string, index: number, direction: 'up' | 'down') => {
    const parentActs = activities.filter((a) => a.parent_id === outputId);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= parentActs.length) return;

    const list = [...parentActs];
    const temp = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = temp;

    // Recalculate sequences
    const updated = list.map((item, idx) => ({
      ...item,
      sequence: idx + 1,
    }));

    // Merge back into main activities state
    setActivities((prev) => {
      const rest = prev.filter((a) => a.parent_id !== outputId);
      return [...rest, ...updated].sort((a, b) => a.sequence - b.sequence);
    });

    setSaving(true);
    try {
      for (const item of updated) {
        await supabase
          .from('lfa_entries')
          .update({ sequence: item.sequence })
          .eq('id', item.id);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('Reorder activities failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!project) return;
    setPdfLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lfa-export-pdf', {
        body: { projectId: project.id },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      } else {
        toast({
          title: 'Export PDF',
          description: 'PDF berhasil disimulasikan. Hubungkan Edge function untuk rendering landscape.',
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Export PDF Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  // Completeness Metrics
  const calculateCompleteness = () => {
    let score = 0;
    if (goal?.description && goal.description.trim().length > 0) score += 25;
    if (purpose?.description && purpose.description.trim().length > 0) score += 25;
    if (outputs.length > 0 && outputs.some((o) => o.description.trim().length > 0)) score += 25;
    if (activities.length > 0 && activities.some((a) => a.description.trim().length > 0)) score += 25;

    let hasBlankRequiredOrMissingActivity = false;

    // 1. Goal required fields
    if (!goal?.indicator?.trim() || !goal?.means_of_verification?.trim() || !goal?.assumption?.trim()) {
      hasBlankRequiredOrMissingActivity = true;
    }

    // 2. Purpose required fields
    if (!purpose?.indicator?.trim() || !purpose?.means_of_verification?.trim() || !purpose?.assumption?.trim()) {
      hasBlankRequiredOrMissingActivity = true;
    }

    // 3. Outputs required fields & Activities presence
    if (outputs.length === 0) {
      hasBlankRequiredOrMissingActivity = true;
    } else {
      outputs.forEach(o => {
        if (!o.description?.trim() || !o.indicator?.trim() || !o.means_of_verification?.trim() || !o.assumption?.trim()) {
          hasBlankRequiredOrMissingActivity = true;
        }
        const hasActivity = activities.some(a => a.parent_id === o.id);
        if (!hasActivity) {
          hasBlankRequiredOrMissingActivity = true;
        }
      });
    }

    // 4. Activities required fields
    if (activities.length === 0) {
      hasBlankRequiredOrMissingActivity = true;
    } else {
      activities.forEach(a => {
        if (!a.description?.trim() || !a.indicator?.trim() || !a.means_of_verification?.trim()) {
          hasBlankRequiredOrMissingActivity = true;
        }
      });
    }

    if (hasBlankRequiredOrMissingActivity) {
      return Math.min(score, 95);
    }

    return score;
  };

  // Logic Validation Engine
  const runValidation = () => {
    const warnings: string[] = [];
    
    // Goal
    if (!goal?.description) {
      warnings.push('Dampak (Goal) belum diisi.');
    } else {
      if (!goal.indicator) warnings.push('⚠️ Indikator Goal kosong — tambahkan tolok ukur keberhasilan dampak.');
      else if (!/\d+/.test(goal.indicator)) warnings.push('⚠️ Indikator Goal terlalu abstrak — usahakan mencantumkan target angka/persentase.');
      if (!goal.means_of_verification) warnings.push('⚠️ Sumber Verifikasi Dampak (Goal) masih kosong.');
      if (!goal.assumption) warnings.push('⚠️ Asumsi eksternal Dampak (Goal) masih kosong.');
    }

    // Purpose
    if (!purpose?.description) {
      warnings.push('Tujuan Program (Purpose) belum diisi.');
    } else {
      if (!purpose.indicator) warnings.push('⚠️ Indikator Tujuan kosong — tambahkan kriteria keberhasilan pada penerima manfaat.');
      if (!purpose.means_of_verification) warnings.push('⚠️ Sumber Verifikasi Tujuan masih kosong.');
      if (!purpose.assumption) warnings.push('⚠️ Asumsi eksternal Tujuan masih kosong.');
    }

    // Outputs
    if (outputs.length === 0) {
      warnings.push('⚠️ Belum ada Hasil (Outputs) yang didefinisikan.');
    } else {
      outputs.forEach((o, idx) => {
        if (!o.description) warnings.push(`⚠️ Deskripsi Hasil H${idx + 1} masih kosong.`);
        if (!o.indicator) warnings.push(`⚠️ Indikator Hasil H${idx + 1} masih kosong.`);
        const hasActivity = activities.some(a => a.parent_id === o.id);
        if (!hasActivity) {
          warnings.push(`⚠️ Hasil H${idx + 1} belum memiliki kegiatan (Activities) terkait.`);
        }
      });
    }

    // Activities
    if (activities.length === 0) {
      warnings.push('⚠️ Belum ada Kegiatan (Activities) yang ditambahkan.');
    } else {
      activities.forEach((act, idx) => {
        if (!act.description) warnings.push(`⚠️ Kegiatan ${idx + 1} tidak memiliki deskripsi.`);
        if (!act.responsible_party) warnings.push(`⚠️ Penanggung jawab (PIC) Kegiatan ${idx + 1} belum ditentukan.`);
      });
    }

    return warnings;
  };

  const [showExportWarningDialog, setShowExportWarningDialog] = useState(false);

  const handleExportToGrantwriter = () => {
    if (!project) return;
    const completeness = calculateCompleteness();
    if (completeness < 60) {
      setShowExportWarningDialog(true);
      return;
    }

    proceedExportToGrantwriter();
  };

  const proceedExportToGrantwriter = () => {
    if (!project) return;
    navigate(`/dashboard/grant-writer?lfa_project_id=${project.id}`);
  };

  const validationWarnings = runValidation();
  const completenessPercent = calculateCompleteness();
  const isSroiUnlocked = completenessPercent >= 80 && wbsExists && mealExists;
  const canonicalDiagnostics = useMemo(() => {
    if (!project) {
      return { view: null, error: null as string | null };
    }

    try {
      return {
        view: buildEditorCanonicalLfaView({
          project,
          entries: [
            ...(goal ? [goal] : []),
            ...(purpose ? [purpose] : []),
            ...outputs,
            ...activities,
          ],
          grantLinkEvidence: null,
          skeletonEvidence: null,
        }),
        error: null as string | null,
      };
    } catch (err) {
      return {
        view: null,
        error: err instanceof Error ? err.message : 'Gagal menghitung diagnostik canonical.',
      };
    }
  }, [project, goal, purpose, outputs, activities]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center bg-white dark:bg-slate-950 rounded-xl border border-rose-100">
        <p className="text-red-500 text-sm font-semibold">
          Gagal memuat logframe: {error.message ?? 'Kesalahan tidak diketahui'}
        </p>
        <button 
          onClick={() => { setError(null); void loadProjectAndEntries(); }}
          className="text-xs text-white bg-teal-600 px-4 py-1.5 rounded-lg font-medium hover:bg-teal-500 transition-colors">
          Muat Ulang
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground bg-white dark:bg-slate-950 rounded-xl border">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" /> Memuat data editor LFA...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div data-testid="lfa-editor-root" className="mx-auto max-w-7xl space-y-6 py-1">
      {/* LFA ENTRY INFORMATION BANNER (RC-9B.6 Task 5) */}
      {searchParams.get('from') === 'quick_proposal' && (
        <div data-testid="lfa-entry-banner" className="rounded-lg border border-indigo-200 bg-indigo-50/90 p-4 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Program Blueprint telah disetujui.
                </span>
              </div>
              <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium mt-0.5">
                Tahap saat ini: <span className="font-bold underline">Penyusunan LFA Matrix</span>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-indigo-300 text-indigo-800 dark:border-indigo-700 dark:text-indigo-300 font-semibold text-[10px] bg-white/80 dark:bg-indigo-950/80 shrink-0">
            Tahap 2: LFA Matrix
          </Badge>
        </div>
      )}

      {/* TOP BAR BAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-1">
            <Link to="/dashboard/lfa-builder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <input
              type="text"
              value={project.name}
              onChange={(e) => updateProjectName(e.target.value)}
              className="text-h3 font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none py-0.5 truncate max-w-md md:max-w-xl"
              title="Klik untuk mengedit nama program"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] font-medium py-0">
                {project.sector || 'Sektor Lainnya'}
              </Badge>
              <span>• Durasi: {project.duration_months || 12} bulan</span>
              <span>• Lokasi: {project.location || 'Tidak Ditentukan'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs text-muted-foreground mr-2">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-primary" /> Menyimpan...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-500 font-bold" /> Tersimpan {lastSaved.toLocaleTimeString('id-ID')}
              </span>
            ) : (
              <span>Autosave aktif</span>
            )}
          </div>

          {project?.linked_grant_id && (
            <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 border-indigo-200 text-indigo-700 bg-indigo-50/30 hover:bg-indigo-50 hover:text-indigo-800 transition-colors">
              <Link to={`/dashboard/grant-writer/${project.linked_grant_id}/proposal`}>
                <FileText className="h-3.5 w-3.5" />
                Buka Proposal Terkait
              </Link>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            Export PDF
          </Button>

          {proposalReady && (currentDocId || generatedGwProjectId) ? (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              onClick={() => {
                const targetProposalId = generatedGwProjectId || project?.linked_grant_id || project?.id;
                navigate(`/dashboard/grant-writer/${targetProposalId}/proposal`);
              }}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Lihat Proposal Lengkap
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={generatingProposal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              onClick={handleGenerateFullProposal}
              title="Mengembangkan matriks LFA menjadi proposal naratif 5-7 bab (membutuhkan waktu 30-60 detik)"
            >
              {generatingProposal ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Memproses... (~45d)
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                  Buat Proposal Lengkap
                </>
              )}
            </Button>
          )}

          <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white border-0" onClick={handleExportToGrantwriter}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Kirim ke Grantwriter
          </Button>
        </div>
      </div>

      {/* MATRIX SUB TABS & PROGRESS BAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-lg border">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('lfa')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'lfa' ? 'bg-white dark:bg-slate-950 shadow-sm text-primary border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ① LFA Matrix
          </button>
          
          {completenessPercent >= 80 ? (
            <button
              onClick={() => setActiveTab('wbs')}
              data-testid="lfa-tab-wbs"
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'wbs' ? 'bg-white dark:bg-slate-950 shadow-sm text-primary border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ② WBS Builder
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button data-testid="lfa-tab-wbs" className="px-3 py-1.5 rounded-md text-muted-foreground/60 cursor-not-allowed flex items-center gap-1 font-normal">
                    ② WBS 🔒
                  </button>
                </TooltipTrigger>
                <TooltipContent>Lengkapi LFA Matrix minimal 80% untuk membuka WBS Builder</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {completenessPercent >= 80 && wbsExists ? (
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'budget' ? 'bg-white dark:bg-slate-950 shadow-sm text-primary border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ③ Budget
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="px-3 py-1.5 rounded-md text-muted-foreground/60 cursor-not-allowed flex items-center gap-1 font-normal">
                    ③ Budget 🔒
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {completenessPercent < 80 
                    ? 'Lengkapi LFA Matrix minimal 80% dan isi WBS untuk membuka Budget' 
                    : 'Isi minimal satu item WBS untuk membuka Budget'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {completenessPercent >= 80 && wbsExists ? (
            <button
              onClick={() => setActiveTab('meal')}
              data-testid="lfa-tab-meal"
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'meal' ? 'bg-white dark:bg-slate-950 shadow-sm text-primary border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ④ MEAL Planner
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button data-testid="lfa-tab-meal" className="px-3 py-1.5 rounded-md text-muted-foreground/60 cursor-not-allowed flex items-center gap-1 font-normal">
                    ④ MEAL 🔒
                  </button>
                </TooltipTrigger>
                <TooltipContent>Selesaikan LFA Matrix minimal 80% dan isi WBS untuk unlock modul MEAL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {completenessPercent >= 80 && wbsExists && mealExists ? (
            <button
              onClick={() => setActiveTab('sroi')}
              data-testid="lfa-tab-sroi"
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'sroi' ? 'bg-white dark:bg-slate-950 shadow-sm text-primary border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⑤ SROI Calculator
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('sroi')}
                    data-testid="lfa-tab-sroi" 
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 font-normal ${
                      activeTab === 'sroi'
                        ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm'
                        : 'text-muted-foreground/60 hover:text-foreground'
                    }`}
                  >
                    ⑤ SROI 🔒
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {completenessPercent < 80 
                    ? 'Lengkapi LFA Matrix minimal 80% dan isi WBS untuk unlock SROI' 
                    : !mealExists 
                      ? 'Selesaikan MEAL Planner (minimal 1 indikator terdaftar) untuk membuka SROI'
                      : 'Isi minimal satu item MEAL untuk membuka SROI'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 w-full md:w-64">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Progress Pengisian</span>
              <span>{completenessPercent}%</span>
            </div>
            <Progress value={completenessPercent} className="h-1.5 bg-slate-100" />
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT PANEL */}
      {activeTab === 'lfa' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* LEFT COMPONENT (65%): Matrix Editor */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION 1 — DAMPAK (Goal) */}
          <Card
            onFocus={() => setActiveSection('goal')}
            className={`border-l-4 border-l-[#1E293B] shadow-elegant overflow-hidden transition-all duration-300 ${
              activeSection === 'goal' ? 'ring-1 ring-primary/20 bg-slate-50/10' : ''
            }`}
          >
            <CardHeader className="bg-slate-900 text-white py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">🎯</span>
                  <CardTitle className="text-sm font-bold tracking-wide">DAMPAK (Goal)</CardTitle>
                </div>
                <Badge variant="outline" className="text-white border-white/20 uppercase tracking-widest text-[9px]">Jangka Panjang</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <p className="text-[11px] text-muted-foreground leading-5">
                Perubahan makro/jangka panjang di tingkat masyarakat luas yang ingin dicapai setelah program selesai (mis. peningkatan status kesehatan, kesejahteraan, dll).
              </p>
              
              {goal && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-description" className="font-semibold text-slate-800 dark:text-slate-200">Deskripsi Dampak</Label>
                    <Textarea
                      id="goal-description"
                      aria-label="Deskripsi Dampak"
                      value={goal.description}
                      onChange={(e) => {
                        const updated = { ...goal, description: e.target.value };
                        setGoal(updated);
                      }}
                      onBlur={() => void saveEntry(goal)}
                      placeholder="Tuliskan pernyataan dampak jangka panjang..."
                      rows={2}
                    />
                  </div>

                  {/* 3 inline fields */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="goal-indicator" className="text-[10px] font-semibold">Indikator Kunci (KPI)</Label>
                      <Input
                        id="goal-indicator"
                        aria-label="Indikator Kunci Dampak"
                        value={goal.indicator}
                        onChange={(e) => setGoal({ ...goal, indicator: e.target.value })}
                        onBlur={() => void saveEntry(goal)}
                        placeholder="Mis. Angka stunting turun 15%"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="goal-mov" className="text-[10px] font-semibold">Sumber Verifikasi (MoV)</Label>
                      <Input
                        id="goal-mov"
                        aria-label="Sumber Verifikasi Dampak"
                        value={goal.means_of_verification}
                        onChange={(e) => setGoal({ ...goal, means_of_verification: e.target.value })}
                        onBlur={() => void saveEntry(goal)}
                        placeholder="Mis. Data BPS Kab. Garut"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="goal-assumption" className="text-[10px] font-semibold">Asumsi Eksternal</Label>
                      <Input
                        id="goal-assumption"
                        aria-label="Asumsi Eksternal Dampak"
                        value={goal.assumption}
                        onChange={(e) => setGoal({ ...goal, assumption: e.target.value })}
                        onBlur={() => void saveEntry(goal)}
                        placeholder="Mis. Kebijakan dinkes stabil"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Logic Check */}
              <div className="border-t pt-3 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="text-emerald-500">✅</span>
                <span>Jika <b>Tujuan Program</b> tercapai ➔ berkontribusi ke <b>Dampak</b> ini secara vertikal.</span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — TUJUAN PROGRAM (Purpose) */}
          <Card
            onFocus={() => setActiveSection('purpose')}
            className={`border-l-4 border-l-teal-600 shadow-elegant overflow-hidden transition-all duration-300 ${
              activeSection === 'purpose' ? 'ring-1 ring-primary/20 bg-slate-50/10' : ''
            }`}
          >
            <CardHeader className="bg-teal-700 text-white py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">🏆</span>
                  <CardTitle className="text-sm font-bold tracking-wide">TUJUAN PROGRAM (Purpose/Outcome)</CardTitle>
                </div>
                <Badge variant="outline" className="text-white border-white/20 uppercase tracking-widest text-[9px]">Hasil Langsung</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <p className="text-[11px] text-muted-foreground leading-5">
                Perubahan perilaku, kapasitas, atau status langsung yang dinikmati penerima manfaat selama program ini berlangsung (mis. peningkatan keterampilan, perubahan pola asuh).
              </p>

              {purpose && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="purpose-description" className="font-semibold text-slate-800 dark:text-slate-200">Deskripsi Tujuan Program</Label>
                    <Textarea
                      id="purpose-description"
                      aria-label="Deskripsi Tujuan Program"
                      value={purpose.description}
                      onChange={(e) => {
                        const updated = { ...purpose, description: e.target.value };
                        setPurpose(updated);
                      }}
                      onBlur={() => void saveEntry(purpose)}
                      placeholder="Tuliskan pernyataan tujuan program..."
                      rows={2}
                    />
                  </div>

                  {/* 3 inline fields */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="purpose-indicator" className="text-[10px] font-semibold">Indikator Kunci (KPI)</Label>
                      <Input
                        id="purpose-indicator"
                        aria-label="Indikator Kunci Tujuan Program"
                        value={purpose.indicator}
                        onChange={(e) => setPurpose({ ...purpose, indicator: e.target.value })}
                        onBlur={() => void saveEntry(purpose)}
                        placeholder="Mis. 500 ibu aktif menerapkan menu seimbang"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="purpose-mov" className="text-[10px] font-semibold">Sumber Verifikasi (MoV)</Label>
                      <Input
                        id="purpose-mov"
                        aria-label="Sumber Verifikasi Tujuan Program"
                        value={purpose.means_of_verification}
                        onChange={(e) => setPurpose({ ...purpose, means_of_verification: e.target.value })}
                        onBlur={() => void saveEntry(purpose)}
                        placeholder="Mis. Kuesioner pre-post test & kohort KIA"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="purpose-assumption" className="text-[10px] font-semibold">Asumsi Eksternal</Label>
                      <Input
                        id="purpose-assumption"
                        aria-label="Asumsi Eksternal Tujuan Program"
                        value={purpose.assumption}
                        onChange={(e) => setPurpose({ ...purpose, assumption: e.target.value })}
                        onBlur={() => void saveEntry(purpose)}
                        placeholder="Mis. Ibu-ibu memiliki waktu luang posyandu"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Logic Check */}
              <div className="border-t pt-3 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="text-emerald-500">✅</span>
                <span>Jika semua <b>Hasil (Outputs)</b> terealisasi ➔ <b>Tujuan Program</b> ini tercapai secara vertikal.</span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 — HASIL (Outputs) */}
          <div className="space-y-4" onFocus={() => setActiveSection('outputs')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">H</span>
                <h3 className="text-sm font-bold tracking-tight">HASIL & DELIVERABLES (Outputs)</h3>
              </div>
              <Button size="xs" variant="outline" className="border-amber-500/30 text-amber-700 hover:bg-amber-50 h-7" onClick={handleAddOutput}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Hasil
              </Button>
            </div>

            {outputs.length === 0 ? (
              <Card className="border-dashed border p-8 text-center bg-slate-50/40">
                <CardContent className="flex flex-col items-center gap-2 text-muted-foreground">
                  <p className="text-xs">Belum ada deliverable/hasil nyata yang terdaftar.</p>
                  <Button size="xs" onClick={handleAddOutput}>Buat Hasil H1</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {outputs.map((out, index) => {
                  const outActivities = activities.filter((a) => a.parent_id === out.id);
                  const isCollapsed = collapsedOutputs[out.id] ?? false;

                  return (
                    <Card
                      key={out.id}
                      className={`border-l-4 border-l-amber-500 shadow-elegant overflow-hidden transition-all duration-200 ${
                        activeSection === 'outputs' ? 'bg-amber-50/5' : ''
                      }`}
                    >
                      <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 py-2.5 px-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="h-6 w-8 rounded bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                            H{index + 1}
                          </span>
                          <span className="font-semibold text-xs truncate max-w-sm">
                            {out.description ? out.description : 'Hasil Kosong'}
                          </span>
                          {outActivities.length === 0 && (
                            <Badge variant="destructive" className="bg-rose-100 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 text-[10px] py-0 px-2 font-black animate-pulse">
                              Belum memiliki kegiatan
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-slate-100"
                            disabled={index === 0}
                            onClick={() => void handleMoveOutput(index, 'up')}
                            title="Pindah Ke Atas"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-slate-100"
                            disabled={index === outputs.length - 1}
                            onClick={() => void handleMoveOutput(index, 'down')}
                            title="Pindah Ke Bawah"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => requestDeleteEntry(out.id, 'output')}
                            title="Hapus Hasil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <Label htmlFor={`output-desc-${out.id}`} className="font-semibold text-slate-800 dark:text-slate-200">Deskripsi Deliverable/Hasil</Label>
                          <Textarea
                            id={`output-desc-${out.id}`}
                            aria-label={`Deskripsi Deliverable Hasil ${index + 1}`}
                            value={out.description}
                            onChange={(e) => {
                              const updated = outputs.map((item) =>
                                item.id === out.id ? { ...item, description: e.target.value } : item
                              );
                              setOutputs(updated);
                            }}
                            onBlur={() => {
                              const target = outputs.find((item) => item.id === out.id);
                              if (target) void saveEntry(target);
                            }}
                            placeholder="Deskripsikan output terukur..."
                            rows={2}
                          />
                        </div>

                        {/* Inline fields */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                          <div className="space-y-1">
                            <Label htmlFor={`output-indicator-${out.id}`} className="text-[10px] font-semibold">Indikator</Label>
                            <Input
                              id={`output-indicator-${out.id}`}
                              aria-label={`Indikator Hasil ${index + 1}`}
                              value={out.indicator}
                              onChange={(e) => {
                                const updated = outputs.map((item) =>
                                  item.id === out.id ? { ...item, indicator: e.target.value } : item
                                );
                                setOutputs(updated);
                              }}
                              onBlur={() => {
                                const target = outputs.find((item) => item.id === out.id);
                                if (target) void saveEntry(target);
                              }}
                              placeholder="Mis. Terlatihnya 100 kader"
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`output-mov-${out.id}`} className="text-[10px] font-semibold">Sumber Verifikasi (MoV)</Label>
                            <Input
                              id={`output-mov-${out.id}`}
                              aria-label={`Sumber Verifikasi Hasil ${index + 1}`}
                              value={out.means_of_verification}
                              onChange={(e) => {
                                const updated = outputs.map((item) =>
                                  item.id === out.id ? { ...item, means_of_verification: e.target.value } : item
                                );
                                setOutputs(updated);
                              }}
                              onBlur={() => {
                                const target = outputs.find((item) => item.id === out.id);
                                if (target) void saveEntry(target);
                              }}
                              placeholder="Mis. Presensi, foto kegiatan"
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`output-assumption-${out.id}`} className="text-[10px] font-semibold">Asumsi</Label>
                            <Input
                              id={`output-assumption-${out.id}`}
                              aria-label={`Asumsi Hasil ${index + 1}`}
                              value={out.assumption}
                              onChange={(e) => {
                                const updated = outputs.map((item) =>
                                  item.id === out.id ? { ...item, assumption: e.target.value } : item
                                );
                                setOutputs(updated);
                              }}
                              onBlur={() => {
                                const target = outputs.find((item) => item.id === out.id);
                                if (target) void saveEntry(target);
                              }}
                              placeholder="Mis. Komitmen kader tinggi"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>

                        {/* NESTED ACTIVITIES SECTION */}
                        <div className="mt-4 border-t pt-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                              Kegiatan Pendukung untuk H{index + 1}
                            </h4>
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-primary hover:text-primary-focus h-6 px-1.5"
                              onClick={() => void handleAddActivity(out.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Tambah Kegiatan
                            </Button>
                          </div>

                          {outActivities.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-2 text-center">
                              Belum ada tindakan/kegiatan terdaftar untuk hasil ini.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {outActivities.map((act, actIdx) => {
                                const isExpanded = expandedActivities[act.id] ?? false;

                                return (
                                  <div
                                    key={act.id}
                                    onFocus={() => setActiveSection('activities')}
                                    className="border rounded-md bg-white dark:bg-slate-950 p-2.5 space-y-2 transition-all"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-600 font-bold shrink-0">
                                          {index + 1}.{actIdx + 1}
                                        </span>
                                        <Input
                                          id={`act-desc-${act.id}`}
                                          aria-label={`Deskripsi Kegiatan ${index + 1}.${actIdx + 1}`}
                                          value={act.description}
                                          onChange={(e) => {
                                            const updated = activities.map((item) =>
                                              item.id === act.id ? { ...item, description: e.target.value } : item
                                            );
                                            setActivities(updated);
                                          }}
                                          onBlur={() => {
                                            const target = activities.find((item) => item.id === act.id);
                                            if (target) void saveEntry(target);
                                          }}
                                          placeholder="Tuliskan aksi kegiatan, misal: Menyusun modul posyandu"
                                          className="text-xs h-7 border-0 p-0 focus-visible:ring-0 focus-visible:border-b"
                                        />
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground"
                                          onClick={() =>
                                            setExpandedActivities((prev) => ({
                                              ...prev,
                                              [act.id]: !isExpanded,
                                            }))
                                          }
                                        >
                                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                          onClick={() => requestDeleteEntry(act.id, 'activity')}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Collapsed expandable fields */}
                                    {isExpanded && (
                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-2 border-t text-[10px]">
                                        <div className="space-y-1">
                                          <Label htmlFor={`act-pic-${act.id}`} className="text-[9px] font-semibold">Penanggung Jawab (PIC)</Label>
                                          <Input
                                            id={`act-pic-${act.id}`}
                                            aria-label={`Penanggung Jawab Kegiatan ${index + 1}.${actIdx + 1}`}
                                            value={act.responsible_party || ''}
                                            onChange={(e) => {
                                              const updated = activities.map((item) =>
                                                item.id === act.id ? { ...item, responsible_party: e.target.value } : item
                                              );
                                              setActivities(updated);
                                            }}
                                            onBlur={() => {
                                              const target = activities.find((item) => item.id === act.id);
                                              if (target) void saveEntry(target);
                                            }}
                                            placeholder="Mis. Koordinator MEAL"
                                            className="text-xs h-7"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`act-start-${act.id}`} className="text-[9px] font-semibold">Mulai (Bulan)</Label>
                                          <Input
                                            id={`act-start-${act.id}`}
                                            aria-label={`Bulan Mulai Kegiatan ${index + 1}.${actIdx + 1}`}
                                            type="number"
                                            value={act.timeline_start || ''}
                                            onChange={(e) => {
                                              const updated = activities.map((item) =>
                                                item.id === act.id ? { ...item, timeline_start: parseInt(e.target.value, 10) || null } : item
                                              );
                                              setActivities(updated);
                                            }}
                                            onBlur={() => {
                                              const target = activities.find((item) => item.id === act.id);
                                              if (target) void saveEntry(target);
                                            }}
                                            placeholder="Bulan Mulai"
                                            className="text-xs h-7"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`act-end-${act.id}`} className="text-[9px] font-semibold">Selesai (Bulan)</Label>
                                          <Input
                                            id={`act-end-${act.id}`}
                                            aria-label={`Bulan Selesai Kegiatan ${index + 1}.${actIdx + 1}`}
                                            type="number"
                                            value={act.timeline_end || ''}
                                            onChange={(e) => {
                                              const updated = activities.map((item) =>
                                                item.id === act.id ? { ...item, timeline_end: parseInt(e.target.value, 10) || null } : item
                                              );
                                              setActivities(updated);
                                            }}
                                            onBlur={() => {
                                              const target = activities.find((item) => item.id === act.id);
                                              if (target) void saveEntry(target);
                                            }}
                                            placeholder="Bulan Selesai"
                                            className="text-xs h-7"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (35%): Context-Aware M&E Guide & Completion Tracker */}
        <div className="space-y-6">
          
          {/* LOGIC VALIDATION REPORT CARD */}
          <Card className="border border-slate-200 shadow-elegant">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex flex-row items-center gap-2">
              <span className="h-5 w-5 flex items-center justify-center text-amber-500">⚠️</span>
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Logic Validation & Integrity</CardTitle>
                <CardDescription className="text-[9px] mt-0.5">Analisis keselarasan logframe Anda</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              {canonicalDiagnostics.error ? (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
                  Diagnostik canonical tidak tersedia: {canonicalDiagnostics.error}
                </div>
              ) : canonicalDiagnostics.view ? (
                <div className="mb-3 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div className="rounded bg-slate-100 px-2 py-1">Presentation: {canonicalDiagnostics.view.presentationMode}</div>
                  <div className="rounded bg-slate-100 px-2 py-1">Structural: {canonicalDiagnostics.view.structuralStatus}</div>
                  <div className="rounded bg-slate-100 px-2 py-1">Measurement: {canonicalDiagnostics.view.measurementStatus}</div>
                  <div className="rounded bg-slate-100 px-2 py-1">Findings: {canonicalDiagnostics.view.findings.length}</div>
                  <div className="rounded bg-slate-100 px-2 py-1">Reviews: {canonicalDiagnostics.view.reviewQueue.length}</div>
                  <div className="rounded bg-slate-100 px-2 py-1">Blocking: {canonicalDiagnostics.view.hasBlockingIntegrityFinding ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-500">
                  Diagnostik canonical belum tersedia.
                </div>
              )}
              {validationWarnings.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-md">
                  <span>✅</span>
                  <span>Logika vertikal terbentuk dengan sangat baik!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {validationWarnings.map((warn, idx) => (
                    <div key={idx} className="flex gap-2 text-[10px] leading-5 text-amber-700 dark:text-amber-300 p-2 bg-amber-50/60 dark:bg-amber-950/20 rounded">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DYNAMIC FOCUS-BASED CONTEXT-AWARE GUIDE */}
          <Card className="border border-slate-200 shadow-elegant">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Contextual M&E Guide</CardTitle>
                <CardDescription className="text-[9px] mt-0.5">Membantu menyelaraskan logframe Anda</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3.5">
              
              {activeSection === 'goal' && (
                <>
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">🎯 Dampak (Goal)</h5>
                    <p className="text-muted-foreground leading-5 text-[11px]">
                      Dampak mengukur kesuksesan jangka panjang. Donor selalu mencari indikator tingkat tinggi yang menggambarkan perubahan kualitas hidup beneficiary.
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-md border space-y-1">
                    <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider block">👍 CONTOH INDIKATOR YANG BAIK</span>
                    <p className="italic text-[10px] leading-relaxed">
                      "Menurunnya prevalensi gizi buruk sebesar 12% pada 5 desa target dalam 2 tahun."
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'purpose' && (
                <>
                  <div className="space-y-1">
                    <h5 className="font-bold text-teal-700 dark:text-teal-400 text-xs">🏆 Tujuan Program (Purpose)</h5>
                    <p className="text-muted-foreground leading-5 text-[11px]">
                      Tujuan program menggambarkan hasil nyata (behavioral change atau systemic shift) yang terjadi setelah project selesai diintervensi.
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-md border space-y-1">
                    <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider block">👍 CONTOH INDIKATOR YANG BAIK</span>
                    <p className="italic text-[10px] leading-relaxed">
                      "80% ibu hamil di Kelurahan X mengonsumsi tablet tambah darah minimal 90 tablet selama kehamilan."
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'outputs' && (
                <>
                  <div className="space-y-1">
                    <h5 className="font-bold text-amber-600 dark:text-amber-400 text-xs">📦 Hasil (Outputs)</h5>
                    <p className="text-muted-foreground leading-5 text-[11px]">
                      Hasil berupa barang/jasa konkret yang dideliver langsung oleh aktivitas proyek. Bersifat objektif, kuantitatif, dan dapat langsung diukur.
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-md border space-y-1">
                    <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider block">👍 CONTOH INDIKATOR YANG BAIK</span>
                    <p className="italic text-[10px] leading-relaxed">
                      "15 unit sarana MCK umum diresmikan dan berfungsi secara penuh di pemukiman padat."
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'activities' && (
                <>
                  <div className="space-y-1">
                    <h5 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">🔧 Kegiatan (Activities)</h5>
                    <p className="text-muted-foreground leading-5 text-[11px]">
                      Kegiatan adalah tindakan operasional yang dijalankan tim program untuk menghasilkan Output. Tentukan penanggung jawab dan timeline bulan pelaksanaannya.
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-md border space-y-1">
                    <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider block">👍 CONTOH INDIKATOR YANG BAIK</span>
                    <p className="italic text-[10px] leading-relaxed">
                      "Menyelenggarakan 5 kali sosialisasi perilaku hidup bersih dan sehat (PHBS) bersama kader kesehatan puskesmas."
                    </p>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

          {/* DYNAMIC COMPLETION TRACKER CHIPS */}
          {(() => {
            const getEntryCompleteness = (entry: LfaEntry | null) => {
              if (!entry) return { label: 'Kosong', variant: 'secondary' as const, className: '' };
              const fields = [
                Boolean(entry.description && entry.description.trim()),
                Boolean(entry.indicator && entry.indicator.trim()),
                Boolean(entry.means_of_verification && entry.means_of_verification.trim()),
                Boolean(entry.assumption && entry.assumption.trim()),
              ];
              const filledCount = fields.filter(Boolean).length;
              if (filledCount === 4) {
                return { label: 'Lengkap (4/4)', variant: 'default' as const, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
              } else if (filledCount > 0) {
                return { label: `Sebagian (${filledCount}/4)`, variant: 'outline' as const, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' };
              } else {
                return { label: 'Kosong', variant: 'secondary' as const, className: '' };
              }
            };

            const getListCompleteness = (items: LfaEntry[], level: 'output' | 'activity') => {
              if (items.length === 0) {
                return { label: 'Kosong', variant: 'secondary' as const, className: '' };
              }
              let completeCount = 0;
              let partialCount = 0;

              items.forEach((item) => {
                if (level === 'output') {
                  const fields = [
                    Boolean(item.description && item.description.trim()),
                    Boolean(item.indicator && item.indicator.trim()),
                    Boolean(item.means_of_verification && item.means_of_verification.trim()),
                    Boolean(item.assumption && item.assumption.trim()),
                  ];
                  const filled = fields.filter(Boolean).length;
                  if (filled === 4) completeCount++;
                  else if (filled > 0) partialCount++;
                } else {
                  const fields = [
                    Boolean(item.description && item.description.trim()),
                    Boolean(item.indicator && item.indicator.trim()),
                  ];
                  const filled = fields.filter(Boolean).length;
                  if (filled === 2) completeCount++;
                  else if (filled > 0) partialCount++;
                }
              });

              if (completeCount === items.length) {
                return { label: `${items.length}/${items.length} Lengkap`, variant: 'default' as const, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
              } else if (completeCount > 0 || partialCount > 0) {
                return { label: `${completeCount}/${items.length} Lengkap`, variant: 'outline' as const, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' };
              } else {
                return { label: `0/${items.length} Terisi`, variant: 'secondary' as const, className: '' };
              }
            };

            const goalComp = getEntryCompleteness(goal);
            const purposeComp = getEntryCompleteness(purpose);
            const outputsComp = getListCompleteness(outputs, 'output');
            const activitiesComp = getListCompleteness(activities, 'activity');

            return (
              <Card className="border border-slate-200 shadow-elegant">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider">LFA Completion Tracker</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">🎯 Dampak (Goal)</span>
                    <Badge variant={goalComp.variant} className={`text-[10px] py-0 ${goalComp.className}`}>{goalComp.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">🏆 Tujuan (Purpose)</span>
                    <Badge variant={purposeComp.variant} className={`text-[10px] py-0 ${purposeComp.className}`}>{purposeComp.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">📦 Hasil (Outputs)</span>
                    <Badge variant={outputsComp.variant} className={`text-[10px] py-0 ${outputsComp.className}`}>{outputsComp.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">🔧 Kegiatan (Activities)</span>
                    <Badge variant={activitiesComp.variant} className={`text-[10px] py-0 ${activitiesComp.className}`}>{activitiesComp.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* GRANTWRITER CONNECTION STATUS CARD */}
          <Card className="border border-slate-200 shadow-elegant">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 flex flex-row items-center gap-2">
              <span className="h-5 w-5 flex items-center justify-center text-primary">🔗</span>
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Grantwriter Integration</CardTitle>
                <CardDescription className="text-[9px] mt-0.5">Koneksi LFA ke Proposal Anda</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-4">
              {linkedProposal ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-md border border-emerald-100">
                    <span>✅ Terhubung ke:</span>
                    <span className="truncate max-w-[150px]">{linkedProposal.title}</span>
                  </div>
                  <Button variant="outline" className="w-full text-xs" asChild>
                    <Link to={`/dashboard/grant-writer/${linkedProposal.id}`}>Buka Proposal Terkait</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 p-2 bg-amber-50/60 dark:bg-amber-950/20 rounded-md border border-amber-100 leading-relaxed text-[11px]">
                    <span>ℹ️ LFA ini belum dihubungkan ke proposal manapun di Grantwriter.</span>
                  </div>
                  <Button
                    onClick={handleExportToGrantwriter}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-xs text-white dark:text-slate-950"
                  >
                    Hubungkan ke Grantwriter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    ) : activeTab === 'wbs' ? (
        <div className="w-full">
          <WBSBuilder
            projectId={projectId!}
            orgId={project.org_id}
            programDurationMonths={project.duration_months || 12}
            sector={project.sector || 'Sektor Lainnya'}
            onWbsSaved={checkWbsExistence}
            onNavigateToBudget={() => setActiveTab('budget')}
          />
        </div>
      ) : activeTab === 'budget' ? (
        <div className="w-full">
          <BudgetCalculator
            projectId={projectId!}
            orgId={project.org_id}
            programDurationMonths={project.duration_months || 12}
            sector={project.sector || 'Sektor Lainnya'}
          />
        </div>
      ) : activeTab === 'meal' ? (
        <div className="w-full">
          <MEALPlanner
            projectId={projectId!}
            orgId={project.org_id}
            programDurationMonths={project.duration_months || 12}
            sector={project.sector || 'Sektor Lainnya'}
          />
        </div>
      ) : isSroiUnlocked ? (
        <div className="w-full">
          <SROICalculator
            projectId={projectId!}
            orgId={project.org_id}
            programDurationMonths={project.duration_months || 12}
            sector={project.sector || 'Sektor Lainnya'}
          />
        </div>
      ) : (
        <div className="w-full max-w-2xl mx-auto my-12 px-4 animate-fade-in">
          <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-elegant rounded-xl">
            <CardHeader className="p-8 text-center pb-4 space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/30 relative">
                <div className="absolute inset-0 rounded-full bg-amber-400 opacity-10 animate-ping" />
                <Lock className="h-6 w-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  SROI terkunci
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
                Belum ada indikator MEAL untuk program ini. Lengkapi minimal 1 indikator MEAL agar Impactory bisa mengimpor outcome, target, dan sumber data secara otomatis ke SROI.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                <strong>Mau hitung cepat tanpa setup lengkap?</strong> Mode SROI manual akan disiapkan sebagai jalur standalone.
              </div>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <Button
                  onClick={() => {
                    const isMealUnlocked = completenessPercent >= 80 && wbsExists;
                    if (!isMealUnlocked) {
                      toast({
                        title: "Modul MEAL Terkunci",
                        description: "Selesaikan LFA Matrix minimal 80% dan isi WBS untuk unlock modul MEAL.",
                        variant: "destructive",
                      });
                      if (completenessPercent < 80) {
                        setActiveTab('lfa');
                      } else {
                        setActiveTab('wbs');
                      }
                    } else {
                      setActiveTab('meal');
                    }
                  }}
                  className="w-full sm:w-auto bg-teal-650 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-xs h-10 px-6 rounded-lg flex items-center justify-center gap-1.5 shadow"
                >
                  Lengkapi MEAL dulu <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  onClick={() => {
                    navigate('/dashboard/sroi');
                  }}
                  variant="outline"
                  className="w-full sm:w-auto text-xs h-10 px-6 rounded-lg font-semibold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Buka SROI Standalone &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="sticky bottom-0 z-20 -mx-2 -mb-2 mt-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 md:px-6 shadow-lg flex items-center justify-between no-print rounded-b-xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? (
            <span className="flex items-center gap-1.5 font-medium text-amber-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> Menyimpan draf...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 font-bold" /> Tersimpan {lastSaved.toLocaleTimeString('id-ID')}
            </span>
          ) : (
            <span>Autosave aktif</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            Export PDF
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            onClick={handleExportToGrantwriter}
            disabled={generatingProposal}
          >
            {generatingProposal ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Generate Proposal &rarr;
          </Button>
        </div>
      </div>

      {/* Delete Entry Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteEntryTarget}
        onOpenChange={(open) => { if (!open) setDeleteEntryTarget(null); }}
        title={`Hapus ${deleteEntryTarget?.level === 'output' ? 'Hasil (Output)' : 'Kegiatan (Activity)'}?`}
        description={`Apakah Anda yakin ingin menghapus ${deleteEntryTarget?.level === 'output' ? 'Hasil' : 'Kegiatan'} ini? Semua sub-kegiatan atau data di dalamnya juga akan terhapus.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="destructive"
        icon="trash"
        loading={saving}
        onConfirm={executeDeleteEntry}
      />

      {/* Export Warning Confirm Dialog */}
      <ConfirmDialog
        open={showExportWarningDialog}
        onOpenChange={setShowExportWarningDialog}
        title="Rekomendasi Kelengkapan LFA"
        description={`Tingkat kelengkapan LFA Anda baru ${calculateCompleteness()}%. Kami merekomendasikan kelengkapan di atas 60% sebelum mengekspor agar proposal AI lebih coherent. Apakah Anda tetap ingin melanjutkan?`}
        confirmText="Lanjutkan Ekspor"
        cancelText="Kembali Mengisi"
        variant="default"
        icon="warning"
        onConfirm={proceedExportToGrantwriter}
      />
    </div>
  );
}
