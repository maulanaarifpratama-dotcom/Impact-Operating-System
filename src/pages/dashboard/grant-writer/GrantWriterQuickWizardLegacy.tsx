import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Save,
  Sparkles,
  MessageSquare,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuickStepper } from '@/components/grant-writer/quick/QuickStepper';
import { QuickStepOrganization } from '@/components/grant-writer/quick/QuickStepOrganization';
import { QuickStepProgram } from '@/components/grant-writer/quick/QuickStepProgram';
import { QuickStepBudget } from '@/components/grant-writer/quick/QuickStepBudget';
import { QuickStepGenerate } from '@/components/grant-writer/quick/QuickStepGenerate';
import { useWizardProject } from '@/lib/grant-writer/useWizardProject';
import { QUICK_STEPS } from '@/lib/grant-writer/types';
import type { QuickWizardData } from '@/lib/grant-writer/types';
import { GrantWriterChat } from '@/components/grant-writer/chat/GrantWriterChat';
import type { GwDonorStandard } from '@/integrations/supabase/database.types';
import { LibraryReferencesSidebar } from '@/components/grant-writer/LibraryReferencesSidebar';
import { DocumentChatPanel } from '@/components/shared/DocumentChatPanel';
import { useAuth } from '@/providers/AuthProvider';
import { renderQuickProposalMarkdown } from '@/lib/grant-writer/quickGenerator';
import { toJson } from '@/integrations/supabase/json';


export default function GrantWriterQuickWizardLegacy() {
  const { user } = useAuth();
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
  } = useWizardProject<QuickWizardData>(projectId);
  const [generating, setGenerating] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [proposalExists, setProposalExists] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('gw_lfa_documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProposalExists(true);
      });
  }, [projectId]);

  const lfaProjectId = (project?.wizard_data as Record<string, unknown> | undefined)?.lfa_project_id as string | undefined;

  // Fetch verified beneficiaries count from Beneficiary Registry
  const { data: beneficiaryCount = 0 } = useQuery({
    queryKey: ['grant-beneficiary-count', lfaProjectId || projectId],
    queryFn: async () => {
      const targetId = lfaProjectId || projectId;
      if (!targetId) return 0;
      const { count, error } = await supabase
        .from('beneficiaries')
        .select('*', { count: 'exact', head: true })
        .eq('lfa_project_id', targetId);

      if (error) {
        console.warn('Beneficiary fetch error', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!(lfaProjectId || projectId),
  });

  const currentStep = project?.current_step ?? 1;
  const stepMeta = useMemo(
    () => QUICK_STEPS.find((s) => s.index === currentStep) ?? QUICK_STEPS[0],
    [currentStep],
  );

  // If project is in LFA mode, redirect to the full wizard.
  useEffect(() => {
    if (!project) return;
    const wd = (project.wizard_data ?? {}) as Record<string, unknown>;
    if (wd._mode && wd._mode !== 'quick') {
      navigate(`/dashboard/grant-writer/${project.id}`, { replace: true });
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
  const goNext = () => currentStep < QUICK_STEPS.length && setStep(currentStep + 1);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setAiFailed(false);
    try {
      // Sync the nested wizard data to the gw_projects columns
      const syncPayload = {
        title: data.program?.programTitle || project?.title || 'Program Baru',
        sector: data.program?.sector || project?.sector,
        geography: data.budget?.geography || project?.geography,
        duration_months: data.budget?.durationMonths || project?.duration_months,
        budget_idr: data.budget?.budgetIdr || project?.budget_idr,
        target_donor: data.program?.targetDonor || project?.target_donor,
        donor_standard: (data.program?.donorStandard || project?.donor_standard || 'un_oecd_dac') as GwDonorStandard,
      };

      await supabase
        .from('gw_projects')
        .update(syncPayload)
        .eq('id', projectId);

      await saveNow();

      // Call the Foundry-powered edge function. This is the ONLY path that
      // may persist a proposal to gw_lfa_documents. If it fails, surface a
      // destructive error to the user.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'grant-writer-generate',
        {
          body: {
            projectId,
            lfa_project_id: lfaProjectId || projectId,
            org_id: project?.organization_id,
            beneficiaryCount
          }
        },
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
        } catch {
          // keep original message if parsing fails
        }
      }

      console.error('[grant-writer-quick] Foundry edge function failed:', errorMessage);
      setAiFailed(true);

      // Surface the failure clearly. Do NOT persist any local/mock
      // markdown to gw_lfa_documents. Do NOT navigate to the proposal
      // preview, because there is no successful proposal.
      toast({
        title: 'Gagal membuat proposal dengan AI',
        description: `Koneksi ke Azure Foundry gagal: ${errorMessage}. Anda tetap bisa menggunakan Kompilasi Manual tanpa AI.`,
        variant: 'destructive',
      });
    } catch (err) {
      const error = err as Error;
      setAiFailed(true);
      toast({
        title: 'Gagal membuat proposal dengan AI',
        description: (error?.message ?? 'Terjadi kesalahan tak terduga.') + '. Anda tetap bisa menggunakan Kompilasi Manual tanpa AI.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCompileManually = async () => {
    if (!projectId || !user || !project) return;
    setCompiling(true);
    try {
      // Sync the nested wizard data to the gw_projects columns
      const syncPayload = {
        title: data.program?.programTitle || project?.title || 'Program Baru',
        sector: data.program?.sector || project?.sector,
        geography: data.budget?.geography || project?.geography,
        duration_months: data.budget?.durationMonths || project?.duration_months,
        budget_idr: data.budget?.budgetIdr || project?.budget_idr,
        target_donor: data.program?.targetDonor || project?.target_donor,
        donor_standard: (data.program?.donorStandard || project?.donor_standard || 'un_oecd_dac') as GwDonorStandard,
      };

      await supabase
        .from('gw_projects')
        .update(syncPayload)
        .eq('id', projectId);

      await saveNow();

      // 1. Render Markdown locally
      const markdown = renderQuickProposalMarkdown(data);

      // 2. Update existing documents for this project to is_current = false
      await supabase
        .from('gw_lfa_documents')
        .update({ is_current: false })
        .eq('project_id', projectId);

      // 3. Fetch current max version
      const { data: existingDocs } = await supabase
        .from('gw_lfa_documents')
        .select('version')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingDocs && existingDocs.length > 0 ? existingDocs[0].version + 1 : 1;

      // 4. Insert new document
      const { error: insertError } = await supabase
        .from('gw_lfa_documents')
        .insert({
          project_id: projectId,
          organization_id: project.organization_id,
          generated_by: user.id,
          version: nextVersion,
          matrix: toJson({ mode: 'quick' }),
          proposal_markdown: markdown,
          model: 'manual_fallback_quick',
          donor_standard: 'un_oecd_dac',
          is_current: true,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Proposal Berhasil Dikompilasi',
        description: `Proposal versi ${nextVersion} berhasil dikompilasi secara manual (instan & gratis).`,
      });

      navigate(`/dashboard/grant-writer/${projectId}/proposal`);
    } catch (err) {
      const error = err as Error;
      console.error('[grant-writer-quick] Local compilation failed:', error);
      toast({
        title: 'Gagal mengompilasi proposal',
        description: error.message || 'Terjadi kesalahan saat kompilasi manual.',
        variant: 'destructive',
      });
    } finally {
      setCompiling(false);
    }
  };

  const renderStep = () => {
    switch (stepMeta.id) {
      case 'organization':
        return <QuickStepOrganization data={data} onChange={setData} />;
      case 'program':
        return <QuickStepProgram data={data} onChange={setData} />;
      case 'budget':
        return <QuickStepBudget data={data} onChange={setData} />;
      case 'generate':
        return <QuickStepGenerate data={data} />;
      default:
        return null;
    }
  };

  const isLast = currentStep === QUICK_STEPS.length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
              <Link to="/dashboard/grant-writer">
                <ArrowLeft className="mr-1 h-4 w-4" /> Semua proyek
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-h2">
                {project.title}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" /> Quick
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Langkah {currentStep} dari {QUICK_STEPS.length} {' / '} {stepMeta.label}
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
                  wizardData={data as never}
                  currentStepId={stepMeta.id}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <QuickStepper
              currentStep={currentStep}
              maxReached={Math.max(currentStep, project.current_step)}
              onStepClick={(s) => setStep(s)}
            />
          </CardContent>
        </Card>

        <div className="lg:hidden">
          <LibraryReferencesSidebar projectId={project.id} currentStepId={stepMeta.id} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{stepMeta.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{stepMeta.description}</p>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {aiFailed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>AI sedang tidak tersedia. Anda tetap bisa menggunakan Kompilasi Manual tanpa AI secara gratis & instan.</span>
            </div>
            <Button
              size="xs"
              className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
              onClick={handleCompileManually}
              disabled={compiling || generating}
            >
              {compiling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
              Kompilasi Manual Sekarang
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={goPrev} disabled={currentStep === 1 || compiling || generating}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Sebelumnya
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => void saveNow()} disabled={saving || compiling || generating}>
              <Save className="mr-1 h-4 w-4" /> Simpan
            </Button>
            {isLast ? (
              <div className="flex flex-col items-stretch sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCompileManually}
                    disabled={compiling || generating}
                    className="border-slate-300 hover:bg-slate-100 h-9"
                  >
                    {compiling ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Kompilasi Manual (Tanpa AI)
                  </Button>

                  <Button
                    variant={proposalExists ? 'outline' : 'default'}
                    onClick={handleGenerate}
                    disabled={generating || compiling}
                    className="h-9"
                  >
                    {generating ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {generating ? 'Menghubungi Azure Foundry...' : 'Buat Proposal (AI)'}
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground text-center sm:text-right w-full block">
                  Tidak memakai AI. Aman digunakan saat layanan AI tidak tersedia.
                </span>
              </div>
            ) : (
              <Button id="wizard-lanjut-btn" onClick={goNext} disabled={compiling || generating}>
                Lanjut <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" asChild disabled={compiling || generating}>
              <Link to={`/dashboard/grant-writer/${project.id}/proposal`}>
                <FileText className="mr-1 h-4 w-4" /> Pratinjau
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Right: persistent sidebar & chat (desktop only) */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-4 lg:w-[380px] xl:w-[420px] shrink-0 sticky top-6 h-[calc(100vh-7rem)]">
        <LibraryReferencesSidebar
          projectId={project.id}
          currentStepId={stepMeta.id}
        />
        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
          <GrantWriterChat
            projectId={project.id}
            organizationId={project.organization_id}
            wizardData={data as never}
            currentStepId={stepMeta.id}
          />
        </div>
      </aside>
      <DocumentChatPanel
        orgId={project.organization_id}
        sourceModule="grant_writer"
        sourceRecordId={project.id}
      />
    </div>
  );
}
