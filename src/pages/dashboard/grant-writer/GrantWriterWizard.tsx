import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { generateLfaMatrix, renderProposalMarkdown } from '@/lib/grant-writer/generator';

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

  const currentStep = project?.current_step ?? 1;
  const stepMeta = useMemo(
    () => WIZARD_STEPS.find((s) => s.index === currentStep) ?? WIZARD_STEPS[0],
    [currentStep],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat wizard…
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
      const matrix = generateLfaMatrix(data);
      const markdown = renderProposalMarkdown(data, matrix);

      // Get next version number
      const { data: existing } = await supabase
        .from('gw_lfa_documents')
        .select('version')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.version ?? 0) + 1;

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
      if (docErr) throw docErr;

      await supabase
        .from('gw_projects')
        .update({ status: 'completed' })
        .eq('id', projectId);

      toast({
        title: 'Proposal berhasil dibuat',
        description: `Versi ${nextVersion} tersimpan. Membuka pratinjau…`,
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/dashboard/grant-writer">
              <ArrowLeft className="mr-1 h-4 w-4" /> Semua proyek
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            Langkah {currentStep} dari {WIZARD_STEPS.length} · {stepMeta.label}
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
              Buat Proposal
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
  );
}