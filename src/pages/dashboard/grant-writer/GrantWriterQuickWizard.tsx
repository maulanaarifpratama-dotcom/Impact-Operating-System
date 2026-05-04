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
  Zap,
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

export default function GrantWriterQuickWizard() {
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
  const [chatOpen, setChatOpen] = useState(false);

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
    try {
      await saveNow();

      // Call the Foundry-powered edge function. This is the ONLY path that
      // may persist a proposal to gw_lfa_documents. If it fails, surface a
      // destructive error to the user. Local fallback markdown is NEVER
      // saved to the database.
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

      console.error(
        '[grant-writer-quick] Foundry edge function failed.',
        fnError,
        errorMessage,
      );

      // Surface the failure clearly. Do NOT persist any local/mock
      // markdown to gw_lfa_documents. Do NOT navigate to the proposal
      // preview, because there is no successful proposal.
      toast({
        title: 'Gagal membuat proposal',
        description: `Koneksi ke Azure Foundry gagal: ${errorMessage}. Silakan coba lagi atau hubungi admin.`,
        variant: 'destructive',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal membuat proposal',
        description: err?.message ?? 'Terjadi kesalahan tak terduga.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
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
                  currentStepId={'context'}
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

      <aside className="hidden lg:block lg:w-[380px] xl:w-[420px] shrink-0">
        <div className="sticky top-6 h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
          <GrantWriterChat
            projectId={project.id}
            organizationId={project.organization_id}
            wizardData={data as never}
            currentStepId={'context'}
          />
        </div>
      </aside>
    </div>
  );
}
