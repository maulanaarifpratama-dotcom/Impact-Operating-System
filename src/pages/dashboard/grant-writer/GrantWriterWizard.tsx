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
import { WIZARD_STEPS } from '@/lib/grant-writer/types';
// NOTE: rule-based generator is kept as a local fallback when the
// 'grant-writer-generate' edge function is unavailable (e.g. local dev
// without Foundry secrets). In production this fallback is rarely hit.
import { generateLfaMatrix, renderProposalMarkdown } from '@/lib/grant-writer/generator';
import { GrantWriterChat } from '@/components/grant-writer/chat/GrantWriterChat';

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
  const currentStep = project?.current_step ?? 1;
  const stepMeta = useMemo(
    () => WIZARD_STEPS.find((s) => s.index === currentStep) ?? WIZARD_STEPS[0],
    [currentStep],
  );

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
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memuat wizard…
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
  const goNext = () =>
    currentStep < WIZARD_STEPS.length && setStep(currentStep + 1);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      await saveNow();

      // 1. Try the Foundry-powered edge function first.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'grant-writer-generate',
        { body: { projectId } },
      );

      if (!fnError && fnData?.document) {
        toast({
          title: 'Proposal berhasil dibuat dengan AI',
          description: `Versi ${fnData.version} tersimpan. Membuka pratinjau…`,
        });
        navigate(`/dashboard/grant-writer/${projectId}/proposal`);
        return;
      }

      // Edge function failed, notify user
      let errorMessage = fnError?.message || 'Gagal menghubungi Edge Function.';
      if (fnError && 'context' in fnError && fnError.context instanceof Response) {
        try {
          const cloned = fnError.context.clone();
          const errBody = await cloned.json();
          if (errBody?.error) errorMessage = errBody.error;
        } catch (e) {
          // keep original message if parsing fails
        }
      }

      console.error(
        '[grant-writer] Foundry edge function failed, using local fallback.',
        fnError,
        errorMessage
      );
      toast({
        title: 'Koneksi ke Azure Foundry Gagal',
        description: errorMessage,
        variant: 'destructive',
      });

      // 2. Fallback: local rule-based generator. Used when the edge function
      //    is not deployed yet, or when Foundry secrets are missing in dev.
      const matrix = generateLfaMatrix(data);
      const markdown = `> **CATATAN FALLBACK LOKAL**: Koneksi ke Azure Foundry gagal. Dokumen ini dihasilkan menggunakan templat lokal statis (mock). Untuk hasil AI, pastikan Edge Function \`grant-writer-generate\` aktif.\n\n` + renderProposalMarkdown(data, matrix);

      const { data: existing } = await supabase
        .from('gw_lfa_documents')
        .select('version')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.version ?? 0) + 1;

      // Unset existing current documents first to avoid unique constraint idx_gw_lfa_current
      const { error: unsetErr } = await supabase
        .from('gw_lfa_documents')
        .update({ is_current: false })
        .eq('project_id', projectId)
        .eq('is_current', true);
        
      if (unsetErr) {
        console.error('[grant-writer] Failed to unset previous current document:', unsetErr);
        throw new Error(`Gagal memperbarui status dokumen lama: ${unsetErr.message}`);
      }

      const { error: docErr } = await supabase.from('gw_lfa_documents').insert({
        project_id: projectId,
        organization_id: project.organization_id,
        generated_by: project.created_by,
        version: nextVersion,
        matrix: matrix as never,
        proposal_markdown: markdown,
        donor_standard: matrix.meta.donorStandard,
        is_current: true,
      });

      if (docErr) {
        if (docErr.message?.includes('duplicate key value') || docErr.code === '23505') {
          throw new Error(`Konflik duplikasi dokumen aktif: ${docErr.message}`);
        }
        throw new Error(`Gagal menyimpan proposal fallback: ${docErr.message}`);
      }

      await supabase
        .from('gw_projects')
        .update({ status: 'completed' })
        .eq('id', projectId);

      toast({
        title: 'Proposal berhasil dibuat (mode fallback)',
        description: `Versi ${nextVersion} tersimpan. Aktifkan Foundry untuk hasil AI.`,
      });
      navigate(`/dashboard/grant-writer/${projectId}/proposal`);
    } catch (err: any) {
      toast({
        title: 'Gagal membuat proposal',
        description: err.message,
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
              Langkah {currentStep} dari {WIZARD_STEPS.length} ·{' '}
              {stepMeta.label}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…
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
