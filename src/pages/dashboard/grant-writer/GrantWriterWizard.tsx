import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Save,
  Sparkles,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WizardStepper } from '@/components/grant-writer/WizardStepper';
import { StepContext } from '@/components/grant-writer/steps/StepContext';
import { StepStakeholders } from '@/components/grant-writer/steps/StepStakeholders';
import { StepProblemTree } from '@/components/grant-writer/steps/StepProblemTree';
import { StepObjectives } from '@/components/grant-writer/steps/StepObjectives';
import { StepActivities } from '@/components/grant-writer/steps/StepActivities';
import { StepIndicators } from '@/components/grant-writer/steps/StepIndicators';
import { StepRisks } from '@/components/grant-writer/steps/StepRisks';
import { useWizardProject } from '@/lib/grant-writer/useWizardProject';
import { WIZARD_STEPS, WizardData, IndicatorItem, AssumptionItem } from '@/lib/grant-writer/types';
import { GrantWriterChat } from '@/components/grant-writer/chat/GrantWriterChat';
import { LfaProject, LfaEntry } from '../lfa-builder/types';

export default function GrantWriterWizard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    project,
    data,
    loading,
    saving,
    lastSavedAt,
    setData,
    setStep,
    saveNow,
  } = useWizardProject(projectId);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lfaProject, setLfaProject] = useState<LfaProject | null>(null);
  const [lfaEntries, setLfaEntries] = useState<LfaEntry[]>([]);

  const lfaProjectId = (project?.wizard_data as Record<string, unknown> | undefined)?.lfa_project_id as string | undefined;

  useEffect(() => {
    if (!lfaProjectId) return;
    let cancelled = false;
    (async () => {
      const { data: pData } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('id', lfaProjectId)
        .maybeSingle();

      if (cancelled) return;
      if (pData) {
        setLfaProject(pData);
        const { data: eData } = await supabase
          .from('lfa_entries')
          .select('*')
          .eq('project_id', lfaProjectId)
          .order('sequence', { ascending: true });

        if (cancelled) return;
        if (eData) {
          setLfaEntries(eData);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lfaProjectId]);

  const injectObjectives = () => {
    if (!lfaProject) return;
    
    const goalEntry = lfaEntries.find(e => e.level === 'goal');
    const outcomeEntries = lfaEntries.filter(e => e.level === 'purpose');
    const outputEntries = lfaEntries.filter(e => e.level === 'output');

    setData((prev: WizardData) => {
      const existingObjectives = prev.objectives ?? {};
      return {
        ...prev,
        objectives: {
          ...existingObjectives,
          goal: goalEntry?.description || existingObjectives.goal || '',
          outcomes: outcomeEntries.map(e => ({
            id: e.id,
            text: e.description || ''
          })),
          outputs: outputEntries.map(e => ({
            id: e.id,
            text: e.description || ''
          }))
        }
      };
    });

    toast({
      title: 'Goal & Sasaran Diimpor',
      description: 'Goal, Outcomes, dan Outputs berhasil diimpor dari LFA.',
    });
  };

  const injectActivities = () => {
    if (!lfaProject) return;

    const activityEntries = lfaEntries.filter(e => e.level === 'activity');

    setData((prev: WizardData) => {
      return {
        ...prev,
        activities: activityEntries.map(e => ({
          id: e.id,
          outputId: e.parent_id || '',
          text: e.description || '',
          durationWeeks: e.timeline_end && e.timeline_start ? Math.max(1, (e.timeline_end - e.timeline_start) * 4) : undefined,
          responsible: e.responsible_party || '',
          resources: ''
        }))
      };
    });

    toast({
      title: 'Aktivitas Diimpor',
      description: 'Daftar aktivitas berhasil diimpor dari LFA berdasarkan output terkait.',
    });
  };

  const injectIndicators = () => {
    if (!lfaProject) return;

    const newIndicators: IndicatorItem[] = [];

    lfaEntries.forEach(e => {
      if (e.indicator || e.means_of_verification) {
        if (e.level === 'goal') {
          newIndicators.push({
            id: Math.random().toString(36).slice(2, 10),
            level: 'goal',
            refId: undefined,
            indicator: e.indicator || '',
            baseline: '',
            target: '',
            meansOfVerification: e.means_of_verification || ''
          });
        } else if (e.level === 'purpose') {
          newIndicators.push({
            id: Math.random().toString(36).slice(2, 10),
            level: 'outcome',
            refId: e.id,
            indicator: e.indicator || '',
            baseline: '',
            target: '',
            meansOfVerification: e.means_of_verification || ''
          });
        } else if (e.level === 'output') {
          newIndicators.push({
            id: Math.random().toString(36).slice(2, 10),
            level: 'output',
            refId: e.id,
            indicator: e.indicator || '',
            baseline: '',
            target: '',
            meansOfVerification: e.means_of_verification || ''
          });
        }
      }
    });

    setData((prev: WizardData) => {
      return {
        ...prev,
        indicators: newIndicators
      };
    });

    toast({
      title: 'Indikator & MoV Diimpor',
      description: `Berhasil mengimpor ${newIndicators.length} indikator dan MoV dari LFA ke dalam kuesioner.`,
    });
  };

  const injectAssumptions = () => {
    if (!lfaProject) return;

    const newAssumptions: AssumptionItem[] = [];

    lfaEntries.forEach(e => {
      if (e.assumption) {
        let mappedLevel: 'goal' | 'outcome' | 'output' | 'activity' = 'output';
        if (e.level === 'goal') mappedLevel = 'goal';
        else if (e.level === 'purpose') mappedLevel = 'outcome';
        else if (e.level === 'output') mappedLevel = 'output';
        else if (e.level === 'activity') mappedLevel = 'activity';

        newAssumptions.push({
          id: Math.random().toString(36).slice(2, 10),
          text: e.assumption || '',
          level: mappedLevel
        });
      }
    });

    setData((prev: WizardData) => {
      return {
        ...prev,
        assumptions: newAssumptions
      };
    });

    toast({
      title: 'Asumsi Diimpor',
      description: `Berhasil mengimpor ${newAssumptions.length} asumsi kunci dari LFA ke dalam kuesioner.`,
    });
  };

  const currentStep = project?.current_step ?? 1;
  const stepMeta = useMemo(
    () => WIZARD_STEPS.find((s) => s.index === currentStep) ?? WIZARD_STEPS[0],
    [currentStep],
  );

  const warnings = useMemo(() => {
    if (!lfaProject) return [];
    const list: string[] = [];

    const lfaGoal = lfaEntries.find(e => e.level === 'goal')?.description || '';
    const lfaOutcomes = lfaEntries.filter(e => e.level === 'purpose');
    const lfaOutputs = lfaEntries.filter(e => e.level === 'output');
    const lfaActivities = lfaEntries.filter(e => e.level === 'activity');
    const lfaIndicatorsCount = lfaEntries.filter(e => e.indicator).length;
    const lfaAssumptionsCount = lfaEntries.filter(e => e.assumption).length;

    const wizGoal = data?.objectives?.goal || '';
    const wizOutcomes = data?.objectives?.outcomes || [];
    const wizOutputs = data?.objectives?.outputs || [];
    const wizActivities = data?.activities || [];
    const wizIndicators = data?.indicators || [];
    const wizAssumptions = data?.assumptions || [];

    if (stepMeta.id === 'objectives') {
      if (!wizGoal && lfaGoal) {
        list.push('Goal (Impact) di kuesioner masih kosong, sedangkan di LFA sudah ada.');
      } else if (wizGoal && lfaGoal && wizGoal.trim() !== lfaGoal.trim()) {
        list.push('Goal (Impact) berbeda antara kuesioner dan LFA Program.');
      }

      if (wizOutcomes.length !== lfaOutcomes.length) {
        list.push(`Jumlah Outcomes (Tujuan) tidak sama (Kuesioner: ${wizOutcomes.length}, LFA: ${lfaOutcomes.length}).`);
      }
      if (wizOutputs.length !== lfaOutputs.length) {
        list.push(`Jumlah Outputs (Hasil) tidak sama (Kuesioner: ${wizOutputs.length}, LFA: ${lfaOutputs.length}).`);
      }
    }

    if (stepMeta.id === 'lfa_matrix') {
      if (wizActivities.length !== lfaActivities.length) {
        list.push(`Jumlah Aktivitas tidak sama (Kuesioner: ${wizActivities.length}, LFA: ${lfaActivities.length}).`);
      }
    }

    if (stepMeta.id === 'indicators') {
      if (wizIndicators.length !== lfaIndicatorsCount) {
        list.push(`Jumlah Indikator (OVI) tidak sama (Kuesioner: ${wizIndicators.length}, LFA: ${lfaIndicatorsCount}).`);
      }
    }

    if (stepMeta.id === 'risks') {
      if (wizAssumptions.length !== lfaAssumptionsCount) {
        list.push(`Jumlah Asumsi Kunci tidak sama (Kuesioner: ${wizAssumptions.length}, LFA: ${lfaAssumptionsCount}).`);
      }
    }

    return list;
  }, [lfaProject, lfaEntries, stepMeta.id, data]);

  // If this project was created in Quick mode, redirect to the quick wizard.
  useEffect(() => {
    if (!project) return;
    const wd = (project.wizard_data ?? {}) as Record<string, unknown>;
    if (wd._mode === 'quick') {
      navigate(`/dashboard/grant-writer/quick/${project.id}`, { replace: true });
    }
  }, [project, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat wizard...
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Proyek tidak ditemukan.</p>
          <Button asChild variant="link">
            <Link to="/dashboard/grant-writer">Kembali ke daftar proyek</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const goPrev = () => currentStep > 1 && setStep(currentStep - 1);
  const goNext = () => currentStep < WIZARD_STEPS.length && setStep(currentStep + 1);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      await saveNow();

      // Call the Foundry-powered edge function. This is the ONLY path that
      // may persist a proposal to gw_lfa_documents. If it fails, surface a
      // destructive error to the user. Local fallback markdown is NEVER
      // saved to the database, because that would persist mock content as
      // if it were a real AI-generated proposal.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'grant-writer-generate',
        { body: { projectId } },
      );

      if (!fnError && !fnData?.error && fnData?.document) {
        toast({
          title: 'Proposal berhasil dibuat dengan AI',
          description: `Versi ${fnData.version} tersimpan. Membuka pratinjau...`,
        });
        navigate(`/dashboard/grant-writer/${projectId}/proposal`);
        return;
      }

      // Edge function failed - extract the most useful error message we can.
      let errorMessage =
        fnError?.message || fnData?.error || 'Gagal menghubungi Edge Function.';
      if (fnError && 'context' in fnError && fnError.context instanceof Response) {
        try {
          const cloned = fnError.context.clone();
          const errBody = await cloned.json();
          if (errBody?.error) errorMessage = errBody.error;
        } catch (e) {
          // keep original message if parsing fails
        }
      }

      console.error('[grant-writer] Foundry edge function failed:', errorMessage);

      // Surface the failure clearly. Do NOT persist any local/mock
      // markdown to gw_lfa_documents. Do NOT navigate to the proposal
      // preview, because there is no successful proposal.
      toast({
        title: 'Gagal membuat proposal',
        description: `Koneksi ke Azure Foundry gagal: ${errorMessage}. Silakan coba lagi atau hubungi admin.`,
        variant: 'destructive',
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal membuat proposal',
        description: error.message ?? 'Terjadi kesalahan tak terduga.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderStep = () => {
    switch (stepMeta.id) {
      case 'context':
        return <StepContext data={data} onChange={setData} />;
      case 'stakeholders':
        return <StepStakeholders data={data} onChange={setData} />;
      case 'problem_tree':
        return <StepProblemTree data={data} onChange={setData} />;
      case 'objectives':
        return <StepObjectives data={data} onChange={setData} />;
      case 'lfa_matrix':
        return <StepActivities data={data} onChange={setData} />;
      case 'indicators':
        return <StepIndicators data={data} onChange={setData} />;
      case 'risks':
        return <StepRisks data={data} onChange={setData} />;
      default:
        return null;
    }
  };

  const isLast = currentStep === WIZARD_STEPS.length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
      {/* Left: wizard column */}
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
              <Link to="/dashboard/grant-writer">
                <ArrowLeft className="mr-1 h-4 w-4" /> Semua proyek
              </Link>
            </Button>
            <h1 className="truncate text-h2">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              Langkah {currentStep} dari {WIZARD_STEPS.length} {' / '}
              {stepMeta.label}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-accent" /> Tersimpan{' '}
                {lastSavedAt.toLocaleTimeString('id-ID')}
              </span>
            ) : (
              <span>Autosave aktif</span>
            )}
            {/* Mobile chat trigger */}
            <Sheet open={chatOpen} onOpenChange={setChatOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Buka asisten AI"
                >
                  <MessageSquare className="mr-1 h-4 w-4" /> AI
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
              >
                <GrantWriterChat
                  projectId={project.id}
                  organizationId={project.organization_id}
                  wizardData={data}
                  currentStepId={stepMeta.id}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <WizardStepper
              currentStep={currentStep}
              maxReached={Math.max(currentStep, project.current_step)}
              onStepClick={(s) => setStep(s)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{stepMeta.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{stepMeta.description}</p>
          </CardHeader>
          {lfaProject && (
            <div className="mx-6 mt-2 mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      LFA Terkait Aktif: <span className="underline">{lfaProject.name}</span>
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
                    Gunakan data dari LFA Matrix untuk menyelaraskan pengisian kuesioner proposal ini.
                  </p>
                </div>
                
                {stepMeta.id === 'objectives' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-amber-100/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                    onClick={injectObjectives}
                  >
                    Import Goal & Sasaran LFA
                  </Button>
                )}
                {stepMeta.id === 'lfa_matrix' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-amber-100/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                    onClick={injectActivities}
                  >
                    Import Kegiatan LFA
                  </Button>
                )}
                {stepMeta.id === 'indicators' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-amber-100/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                    onClick={injectIndicators}
                  >
                    Import Indikator LFA
                  </Button>
                )}
                {stepMeta.id === 'risks' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-amber-100/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                    onClick={injectAssumptions}
                  >
                    Import Asumsi LFA
                  </Button>
                )}
              </div>

              {warnings.length > 0 && (
                <div className="mt-3 border-t border-amber-200/50 pt-2 dark:border-amber-900/20">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    M&E Alignment Warnings ({warnings.length}):
                  </p>
                  <ul className="mt-1.5 list-disc pl-5 space-y-1 text-[11px] text-amber-700 dark:text-amber-300/80">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <CardContent>{renderStep()}</CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={goPrev} disabled={currentStep === 1}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Sebelumnya
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => void saveNow()} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> Simpan
            </Button>
            {isLast ? (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                {generating ? 'Menghubungi Azure Foundry...' : 'Buat Proposal'}
              </Button>
            ) : (
              <Button onClick={goNext}>
                Lanjut <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/dashboard/grant-writer/${project.id}/proposal`}>
                <FileText className="mr-1 h-4 w-4" /> Pratinjau
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Right: persistent chat (desktop only) */}
      <aside className="hidden lg:block lg:w-[380px] xl:w-[420px] shrink-0">
        <div className="sticky top-6 h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
          <GrantWriterChat
            projectId={project.id}
            organizationId={project.organization_id}
            wizardData={data}
            currentStepId={stepMeta.id}
          />
        </div>
      </aside>
    </div>
  );
}
