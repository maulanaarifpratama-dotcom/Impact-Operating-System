import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Loader2, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Play, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';
import { INKINDO_PROVINCE_MULTIPLIERS, INKINDO_DIRECT_COST_MULTIPLIERS } from '@/data/inkindo2026';

type LfaDoc = Database['public']['Tables']['gw_lfa_documents']['Row'];
type Project = Database['public']['Tables']['gw_projects']['Row'];

type MaterializationSource = Pick<LfaDoc, 'id' | 'project_id' | 'organization_id' | 'version' | 'matrix'>;

function resolveMaterializationSource(
  doc: LfaDoc | null,
  expectedProjectId: string,
  expectedOrganizationId: string
): MaterializationSource {
  if (!doc) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak tersedia untuk materialisasi.');
  }

  if (typeof doc.id !== 'string' || doc.id.trim() === '') {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak memiliki ID yang valid.');
  }

  if (doc.project_id !== expectedProjectId) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak cocok dengan proyek Grant Writer ini.');
  }

  if (doc.organization_id !== expectedOrganizationId) {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak cocok dengan organisasi proyek ini.');
  }

  if (!doc.matrix || typeof doc.matrix !== 'object') {
    throw new Error('Dokumen proposal yang sedang dipratinjau tidak memiliki matrix yang dapat dimaterialisasi.');
  }

  return doc;
}

/** Minimal Markdown → HTML for the donor-ready preview. */
function renderMarkdown(md: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const flushTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/&lt;br\/&gt;/g, '<br/>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#\s+/.test(line)) { flushList(); flushTable(); out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`); continue; }
    if (/^##\s+/.test(line)) { flushList(); flushTable(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^###\s+/.test(line)) { flushList(); flushTable(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^---\s*$/.test(line)) { flushList(); flushTable(); out.push('<hr/>'); continue; }
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSep) continue;
      if (!inTable) {
        flushList();
        out.push('<table class="w-full border-collapse text-sm"><thead><tr>');
        cells.forEach((c) => out.push(`<th class="border px-2 py-1 text-left bg-muted">${inline(c)}</th>`));
        out.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        out.push('<tr>');
        cells.forEach((c) => out.push(`<td class="border px-2 py-1 align-top">${inline(c)}</td>`));
        out.push('</tr>');
      }
      continue;
    }
    flushTable();
    if (/^- /.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1">'); inList = true; }
      out.push(`<li>${inline(line.replace(/^- /, ''))}</li>`);
      continue;
    }
    flushList();
    if (line.trim() === '') { out.push(''); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  flushTable();
  return out.join('\n');
}

function validateProgramSkeleton(skeleton: any, project: any): string[] {
  const errors: string[] = [];

  if (!skeleton) {
    errors.push("Program skeleton is missing.");
    return errors;
  }

  // 1. Basic Metadata matching
  const projTitle = (project.title || '').trim().toLowerCase();
  const skTitle = (skeleton.meta?.projectTitle || skeleton.meta?.title || '').trim().toLowerCase();
  if (projTitle && skTitle && !projTitle.includes(skTitle) && !skTitle.includes(projTitle)) {
    errors.push(`Project title mismatch: expected "${project.title}" but skeleton has "${skeleton.meta?.projectTitle || skeleton.meta?.title}".`);
  }

  const projGeo = (project.geography || '').trim().toLowerCase();
  let skGeoStr = '';
  if (skeleton.meta?.geography) {
    if (typeof skeleton.meta.geography === 'object') {
      skGeoStr = skeleton.meta.geography.locationName || skeleton.meta.geography.name || '';
    } else {
      skGeoStr = String(skeleton.meta.geography);
    }
  }

  const getSignificantWords = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && w !== 'kabupaten' && w !== 'provinsi' && w !== 'kota' && w !== 'jawa' && w !== 'barat');
  };

  const projWords = getSignificantWords(projGeo);
  const skWords = getSignificantWords(skGeoStr);
  const hasGeoOverlap = projWords.some(pw => skWords.includes(pw));

  if (projGeo && skGeoStr && !hasGeoOverlap) {
    errors.push(`Geography mismatch: expected "${project.geography}" but skeleton has "${skGeoStr}".`);
  }

  const projBudget = Number(project.budget_idr) || 0;
  const skBudget = Number(skeleton.meta?.budgetIdr || skeleton.meta?.budget_idr) || 0;
  if (projBudget && skBudget && Math.abs(projBudget - skBudget) > 100000000) { // permit within a threshold (100 million) to allow loose SBM calculations
    errors.push(`Budget mismatch: expected Rp ${projBudget.toLocaleString('id-ID')} but skeleton has Rp ${skBudget.toLocaleString('id-ID')} for project ID "${project.id || 'unknown'}".`);
  }

  const projDuration = Number(project.duration_months) || 0;
  const skDuration = Number(skeleton.meta?.durationMonths || skeleton.meta?.duration_months) || 0;
  if (projDuration && skDuration && projDuration !== skDuration) {
    errors.push(`Duration mismatch: expected ${projDuration} months but skeleton has ${skDuration} months.`);
  }

  // 2. Relational and ID Integrity
  const lfa = skeleton.lfa || {};
  const outcomes = lfa.outcomes || [];
  const outputs = lfa.outputs || [];
  const purpose = lfa.purpose || outcomes[0];

  const outcomeIds = new Set<string>();
  if (purpose?.id) outcomeIds.add(purpose.id);
  outcomes.forEach((out: any) => {
    if (out.id) {
      outcomeIds.add(out.id);
    } else {
      errors.push(`Outcome statement "${out.statement}" is missing an ID.`);
    }
  });

  const outputIds = new Set<string>();
  outputs.forEach((opt: any) => {
    if (opt.id) {
      outputIds.add(opt.id);
    } else {
      errors.push(`Output statement "${opt.statement}" is missing an ID.`);
    }

    if (opt.outcomeId) {
      if (!outcomeIds.has(opt.outcomeId)) {
        errors.push(`Output "${opt.statement}" references invalid outcomeId: "${opt.outcomeId}".`);
      }
    } else {
      errors.push(`Output "${opt.statement}" is missing outcomeId.`);
    }
  });

  const wbs = skeleton.wbs || {};
  const tasks = wbs.tasks || [];
  const taskIds = new Set<string>();
  tasks.forEach((tsk: any) => {
    if (tsk.id) {
      taskIds.add(tsk.id);
    } else {
      errors.push(`WBS task "${tsk.title}" is missing an ID.`);
    }

    if (tsk.level === 2 && tsk.sourceActivityId) {
      if (!outputIds.has(tsk.sourceActivityId)) {
        errors.push(`WBS task "${tsk.title}" references invalid LFA output ID: "${tsk.sourceActivityId}".`);
      }
    }
  });

  const budgetHints = skeleton.budget_hints?.items || [];
  budgetHints.forEach((hint: any) => {
    if (hint.taskId) {
      if (!taskIds.has(hint.taskId)) {
        errors.push(`Budget hint "${hint.itemName}" references invalid WBS task ID: "${hint.taskId}".`);
      }
    } else {
      errors.push(`Budget hint "${hint.itemName}" is missing taskId.`);
    }
  });

  const lfaIndicatorIds = new Set<string>();
  if (lfa.goal?.indicators) {
    lfa.goal.indicators.forEach((ind: any) => { if (ind?.id) lfaIndicatorIds.add(ind.id); });
  }
  if (purpose?.indicators) {
    purpose.indicators.forEach((ind: any) => { if (ind?.id) lfaIndicatorIds.add(ind.id); });
  }
  outcomes.forEach((out: any) => {
    if (out.indicators) {
      out.indicators.forEach((ind: any) => { if (ind?.id) lfaIndicatorIds.add(ind.id); });
    }
  });
  outputs.forEach((opt: any) => {
    if (opt.indicators) {
      opt.indicators.forEach((ind: any) => { if (ind?.id) lfaIndicatorIds.add(ind.id); });
    }
  });

  const meal = skeleton.meal || {};
  const mealIndicators = meal.indicators || [];
  mealIndicators.forEach((ind: any) => {
    if (ind.sourceLfaIndicatorId) {
      if (!lfaIndicatorIds.has(ind.sourceLfaIndicatorId)) {
        errors.push(`MEAL indicator "${ind.name}" references invalid source LFA indicator ID: "${ind.sourceLfaIndicatorId}".`);
      }
    }
  });

  const sroi = skeleton.sroi || {};
  const sroiModels = sroi.models || [];
  sroiModels.forEach((mod: any) => {
    if (mod.sourceOutcomeId) {
      if (!outcomeIds.has(mod.sourceOutcomeId)) {
        errors.push(`SROI model references invalid source outcome ID: "${mod.sourceOutcomeId}".`);
      }
    } else {
      errors.push(`SROI model is missing sourceOutcomeId.`);
    }

    if (mod.requiresValidation !== true) {
      errors.push(`SROI model must have requiresValidation = true.`);
    }
  });

  const risks = skeleton.risks || [];
  risks.forEach((risk: any) => {
    if (risk.refId) {
      if (risk.level === 'outcome' && !outcomeIds.has(risk.refId)) {
        errors.push(`Risk references invalid outcome refId: "${risk.refId}".`);
      } else if (risk.level === 'output' && !outputIds.has(risk.refId)) {
        errors.push(`Risk references invalid output refId: "${risk.refId}".`);
      }
    }
  });

  return errors;
}

interface MaterializeStep {
  id: 'program' | 'lfa' | 'wbs' | 'budget' | 'meal' | 'sroi';
  label: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export default function GrantWriterProposal() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<LfaDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Materialization States
  const [steps, setSteps] = useState<MaterializeStep[]>([
    { id: 'program', label: 'Program Workspace Creation', status: 'idle' },
    { id: 'lfa', label: 'Logical Framework Matrix (LFA) Seed', status: 'idle' },
    { id: 'wbs', label: 'Work Breakdown Structure (WBS) Seed', status: 'idle' },
    { id: 'budget', label: 'SBM/INKINDO Budget Skeleton Seed', status: 'idle' },
    { id: 'meal', label: 'MEAL Framework Indicators Seed', status: 'idle' },
    { id: 'sroi', label: 'SROI Impact Model Seed', status: 'idle' },
  ]);
  const [materializing, setMaterializing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [targetLfaProjectId, setTargetLfaProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('gw_projects').select('*').eq('id', projectId).maybeSingle(),
        supabase
          .from('gw_lfa_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setProject(p ?? null);
      setDoc(d ?? null);

      // Check if project has already been materialized
      if (p) {
        const { data: existingLfa } = await supabase
          .from('lfa_projects')
          .select('id')
          .eq('linked_grant_id', projectId)
          .maybeSingle();
        if (existingLfa) {
          setTargetLfaProjectId(existingLfa.id);
          setCompleted(true);
          setSteps(prev => prev.map(s => ({ ...s, status: 'success' as const })));
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const html = useMemo(() => (doc ? renderMarkdown(doc.proposal_markdown ?? '') : ''), [doc]);

  const handleDownload = () => {
    if (!doc) return;
    const blob = new Blob([doc.proposal_markdown ?? ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title ?? 'proposal'}-v${doc.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Diunduh', description: 'File Markdown tersimpan.' });
  };

  const handlePrintPdf = () => {
    if (!doc) return;
    const originalTitle = document.title;
    const printTitle = `${project?.title ?? 'proposal'}-v${doc.version}`;
    document.title = printTitle;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const handleMaterialize = async () => {
    if (!project) return;

    let sourceDoc: MaterializationSource;
    try {
      sourceDoc = resolveMaterializationSource(doc, project.id, project.organization_id);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Dokumen proposal yang sedang dipratinjau tidak valid.';
      toast({
        title: 'Materialisasi Gagal',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    setMaterializing(true);
    setCompleted(false);
    
    // Reset steps
    setSteps([
      { id: 'program', label: 'Program Workspace Creation', status: 'idle' },
      { id: 'lfa', label: 'Logical Framework Matrix (LFA) Seed', status: 'idle' },
      { id: 'wbs', label: 'Work Breakdown Structure (WBS) Seed', status: 'idle' },
      { id: 'budget', label: 'SBM/INKINDO Budget Skeleton Seed', status: 'idle' },
      { id: 'meal', label: 'MEAL Framework Indicators Seed', status: 'idle' },
      { id: 'sroi', label: 'SROI Impact Model Seed', status: 'idle' },
    ]);

    let currentLfaProjId = targetLfaProjectId;

    try {
      // 1. CREATE PROGRAM
      setSteps(prev => prev.map(s => s.id === 'program' ? { ...s, status: 'running' } : s));
      await new Promise(r => setTimeout(r, 600));

      const { data: existingProj, error: checkErr } = await supabase
        .from('lfa_projects')
        .select('*')
        .eq('linked_grant_id', project.id)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existingProj) {
        currentLfaProjId = existingProj.id;
        setSteps(prev => prev.map(s => s.id === 'program' ? { ...s, status: 'skipped', message: 'Program sudah terdaftar' } : s));
      } else {
        const { data: newProj, error: insertErr } = await supabase
          .from('lfa_projects')
          .insert({
            org_id: project.organization_id,
            name: project.title,
            location: project.geography || 'DKI Jakarta',
            linked_grant_id: project.id,
            duration_months: project.duration_months || 12
          })
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        currentLfaProjId = newProj.id;

        const updatedWizard = {
          ...(project.wizard_data as any || {}),
          lfa_project_id: newProj.id
        };
        await supabase
          .from('gw_projects')
          .update({ wizard_data: updatedWizard as any, status: 'completed' })
          .eq('id', project.id);

        setSteps(prev => prev.map(s => s.id === 'program' ? { ...s, status: 'success' } : s));
      }
      setTargetLfaProjectId(currentLfaProjId);

      // 2. SEED LFA MATRIX
      setSteps(prev => prev.map(s => s.id === 'lfa' ? { ...s, status: 'running' } : s));
      await new Promise(r => setTimeout(r, 600));

      const { data: existingEntries, error: entriesErr } = await supabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', currentLfaProjId);

      if (entriesErr) throw entriesErr;

      const matrix = sourceDoc.matrix as any;
      const skeleton = matrix?.program_skeleton;



      const outputIdToDbId: Record<string, string> = {};
      const taskIdToWbsId: Record<string, string> = {};

      if (skeleton) {
        // Run rigorous Program Skeleton V2 Validation
        const validationErrors = validateProgramSkeleton(skeleton, project);
        if (validationErrors.length > 0) {
          throw new Error(`SKELETON VALIDATION FAILED:\n- ${validationErrors.join('\n- ')}`);
        }

        // V2 PATHWAY - SKELETON MATERIALIZER
        if (existingEntries && existingEntries.some(e => e.level === 'output' || e.level === 'activity')) {
          setSteps(prev => prev.map(s => s.id === 'lfa' ? { ...s, status: 'skipped', message: 'LFA Matrix sudah terisi' } : s));
          
          // Reconstruct output mapping from existing database rows by matching descriptions
          const existingOutputs = existingEntries.filter(e => e.level === 'output');
          const skeletonOutputs = skeleton.lfa?.outputs || [];
          skeletonOutputs.forEach((skOut: any) => {
            const matched = existingOutputs.find(eo => eo.description === skOut.statement);
            if (matched) outputIdToDbId[skOut.id] = matched.id;
          });
        } else {
          // Seed Goal (V2)
          const goal = skeleton.lfa?.goal;
          const firstGoalInd = goal?.indicators?.[0];
          await supabase.from('lfa_entries').insert({
            project_id: currentLfaProjId,
            org_id: project.organization_id,
            level: 'goal',
            sequence: 1,
            description: goal?.statement || '',
            indicator: firstGoalInd?.statement || firstGoalInd || '',
            means_of_verification: firstGoalInd?.mov || '',
            assumption: goal?.assumptions?.[0] || ''
          });

          // Seed Purpose / Primary Outcome (V2)
          const purpose = skeleton.lfa?.purpose || skeleton.lfa?.outcomes?.[0];
          const firstPurpInd = purpose?.indicators?.[0];
          const { data: purpRow, error: purpErr } = await supabase.from('lfa_entries').insert({
            project_id: currentLfaProjId,
            org_id: project.organization_id,
            level: 'purpose',
            sequence: 1,
            description: purpose?.statement || '',
            indicator: firstPurpInd?.statement || firstPurpInd || '',
            means_of_verification: firstPurpInd?.mov || '',
            assumption: purpose?.assumptions?.[0] || ''
          }).select().single();

          if (purpErr) throw purpErr;

          const outcomeIdToDbId: Record<string, string> = {};
          if (purpose && purpose.id && purpRow) {
            outcomeIdToDbId[purpose.id] = purpRow.id;
          }

          // Seed Additional Outcomes (V2)
          const outcomes = skeleton.lfa?.outcomes || [];
          for (let i = 0; i < outcomes.length; i++) {
            const out = outcomes[i];
            if (out.id === purpose?.id) continue;
            const firstInd = out.indicators?.[0];
            const { data: outRow } = await supabase.from('lfa_entries').insert({
              project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 'purpose',
              sequence: i + 2,
              description: out.statement || '',
              indicator: firstInd?.statement || firstInd || '',
              means_of_verification: firstInd?.mov || '',
              assumption: out.assumptions?.[0] || ''
            }).select().single();

            if (outRow && out.id) {
              outcomeIdToDbId[out.id] = outRow.id;
            }
          }

          // Seed Outputs (V2)
          const outputs = skeleton.lfa?.outputs || [];
          for (let i = 0; i < outputs.length; i++) {
            const out = outputs[i];
            const firstInd = out.indicators?.[0];
            const parentOutcomeDbId = outcomeIdToDbId[out.outcomeId] || purpRow?.id || null;
            const { data: outRow, error: outErr } = await supabase.from('lfa_entries').insert({
              project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 'output',
              sequence: i + 1,
              parent_id: parentOutcomeDbId,
              description: out.statement || '',
              indicator: firstInd?.statement || firstInd || '',
              means_of_verification: firstInd?.mov || '',
              assumption: out.assumptions?.[0] || ''
            }).select().single();

            if (outErr) throw outErr;

            if (outRow && out.id) {
              outputIdToDbId[out.id] = outRow.id;
            }
          }

          // Seed Activities (V2)
          const tasks = skeleton.wbs?.tasks || [];
          let lvl2Tasks = tasks.filter((t: any) => t.level === 2);
          if (lvl2Tasks.length === 0) {
            lvl2Tasks = tasks;
          }
          for (let i = 0; i < lvl2Tasks.length; i++) {
            const task = lvl2Tasks[i];
            const parentOutputDbId = outputIdToDbId[task.sourceActivityId] || null;
            await supabase.from('lfa_entries').insert({
              project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 'activity',
              sequence: i + 1,
              parent_id: parentOutputDbId,
              description: task.title || '',
              indicator: task.deliverable || '',
              means_of_verification: '',
              assumption: '',
              timeline_start: task.startMonth || 1,
              timeline_end: task.endMonth || project.duration_months || 12,
              responsible_party: task.responsibleRole || ''
            });
          }

          setSteps(prev => prev.map(s => s.id === 'lfa' ? { ...s, status: 'success' } : s));
        }

        // 3. SEED WBS ACTIVITIES (V2)
        setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingWbs, error: wbsErr } = await supabase
          .from('lfa_wbs_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (wbsErr) throw wbsErr;

        if (existingWbs && existingWbs.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'skipped', message: 'Struktur WBS sudah terisi' } : s));
        } else {
          const tasks = skeleton.wbs?.tasks || [];
          const newWbsItems: any[] = [];

          // Level 1 Tasks
          const lvl1Tasks = tasks.filter((t: any) => t.level === 1);
          let globalSortOrder = 0;

          for (const task of lvl1Tasks) {
            const dbId = crypto.randomUUID();
            taskIdToWbsId[task.id] = dbId;
            newWbsItems.push({
              id: dbId,
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 1,
              parent_id: null,
              name: task.title || 'Output Utama',
              start_month: task.startMonth || 1,
              duration_weeks: task.durationWeeks || 4,
              pic: task.responsibleRole || '',
              sort_order: globalSortOrder++,
              mode: 'simple',
              dependencies: []
            });
          }

          // Level 2 Tasks
          const lvl2Tasks = tasks.filter((t: any) => t.level === 2);
          for (const task of lvl2Tasks) {
            const dbId = crypto.randomUUID();
            taskIdToWbsId[task.id] = dbId;
            const parentDbId = taskIdToWbsId[task.parentId || ''] || null;

            const dbDeps: string[] = [];
            if (task.dependencies && Array.isArray(task.dependencies)) {
              task.dependencies.forEach((dId: string) => {
                const depWbsId = taskIdToWbsId[dId];
                if (depWbsId) dbDeps.push(depWbsId);
              });
            }

            newWbsItems.push({
              id: dbId,
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 2,
              parent_id: parentDbId,
              name: task.title || 'Aktivitas Detail',
              start_month: task.startMonth || 1,
              duration_weeks: task.durationWeeks || 4,
              pic: task.responsibleRole || '',
              sort_order: globalSortOrder++,
              mode: 'simple',
              dependencies: dbDeps,
              indicator: task.deliverable || ''
            });
          }

          if (newWbsItems.length > 0) {
            const { error: insWbsErr } = await supabase
              .from('lfa_wbs_items')
              .insert(newWbsItems);
            if (insWbsErr) throw insWbsErr;
          }
          setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'success' } : s));
        }

        // 4. SEED BUDGET SKELETON (V2)
        setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingBudget } = await supabase
          .from('lfa_budget_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (existingBudget && existingBudget.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'skipped', message: 'Draf Anggaran sudah terisi' } : s));
        } else {
          const budgetHints = skeleton.budget_hints?.items || [];
          const skeletonItems: any[] = [];
          let sortOrder = 0;

          const province = project.geography || 'DKI Jakarta';
          const personnelMul = INKINDO_PROVINCE_MULTIPLIERS[province] || 1.0;
          const directMul = INKINDO_DIRECT_COST_MULTIPLIERS[province] || 1.0;
          const ngoFactor = 0.7;

          for (const item of budgetHints) {
            const matchedWbsId = taskIdToWbsId[item.taskId] || null;
            let unitPrice = item.unit_price_idr || 500000;
            const isPersonnel = item.category?.toLowerCase() === 'personnel' || item.category?.toLowerCase() === 'consultant';

            if (isPersonnel) {
              unitPrice = Math.round(unitPrice * personnelMul * ngoFactor);
            } else {
              unitPrice = Math.round(unitPrice * directMul);
            }

            const costCategory = isPersonnel ? 'Personnel & Consultants' : 'Direct Operational Costs';

            let simpleCategory = 'Lainnya';
            const catLower = item.category?.toLowerCase();
            if (catLower?.includes('personnel') || catLower?.includes('staff') || catLower?.includes('honor') || catLower?.includes('gaji')) simpleCategory = 'Honorarium';
            else if (catLower?.includes('travel') || catLower?.includes('transport')) simpleCategory = 'Transport';
            else if (catLower?.includes('accom') || catLower?.includes('hotel')) simpleCategory = 'Akomodasi';
            else if (catLower?.includes('consump') || catLower?.includes('makan')) simpleCategory = 'Konsumsi';
            else if (catLower?.includes('equip') || catLower?.includes('alat') || catLower?.includes('asset')) simpleCategory = 'Peralatan';
            else if (catLower?.includes('admin') || catLower?.includes('atk')) simpleCategory = 'ATK';

            skeletonItems.push({
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              wbs_item_id: matchedWbsId,
              activity_name: item.description || 'Pos Anggaran',
              category: simpleCategory,
              cost_category: costCategory,
              item_name: item.itemType || item.description || 'Item Anggaran',
              volume: item.quantity || 1,
              unit: item.unit || 'Orang',
              unit_price_idr: unitPrice,
              funding_source: 'grant',
              justification: item.justification || `Draf saran AI untuk ${item.description}`,
              needs_donor_approval: item.requiresUserConfirmation || false,
              sort_order: sortOrder++,
              mode: 'simple'
            });
          }

          if (skeletonItems.length > 0) {
            const { error: insBudErr } = await supabase
              .from('lfa_budget_items')
              .insert(skeletonItems);
            if (insBudErr) throw insBudErr;
          }
          setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'success' } : s));
        }

        // 5. SEED MEAL FRAMEWORK (V2)
        setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingMeal } = await supabase
          .from('lfa_meal_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (existingMeal && existingMeal.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'skipped', message: 'Kerangka MEAL sudah terisi' } : s));
        } else {
          const indicators = skeleton.meal?.indicators || [];
          const mealInserts: any[] = [];

          for (let i = 0; i < indicators.length; i++) {
            const item = indicators[i];
            let lfaLevel: 'goal' | 'purpose' | 'output' = 'output';
            if (item.sourceLfaIndicatorId?.includes('goal')) lfaLevel = 'goal';
            else if (item.sourceLfaIndicatorId?.includes('purp') || item.sourceLfaIndicatorId?.includes('out_ind')) lfaLevel = 'purpose';

            mealInserts.push({
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              lfa_level: lfaLevel,
              indicator_text: item.name || 'Indikator MEAL',
              baseline: item.baselineValue || null,
              target_value: item.targetValue || null,
              target_unit: item.unit || 'orang',
              collection_method: item.collectionMethod || 'Survei',
              collection_tool: item.dataSource || 'Kuesioner',
              frequency: item.frequency || 'quarterly',
              pic: item.responsibleRole || '',
              status: 'Belum Mulai',
              secondary_source: item.verificationMethod || '',
              data_assumption: item.formula || '',
              monitoring_risk: '',
              mode: 'simple',
              sort_order: i,
              disaggregation: item.disaggregation || []
            });
          }

          if (mealInserts.length > 0) {
            const { error: insMealErr } = await supabase
              .from('lfa_meal_items')
              .insert(mealInserts);
            if (insMealErr) throw insMealErr;
          }
          setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'success' } : s));
        }

        // 6. SEED SROI IMPACT MODELS (V2)
        setSteps(prev => prev.map(s => s.id === 'sroi' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingSroi } = await supabase
          .from('lfa_sroi_outcomes')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (existingSroi && existingSroi.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'sroi' ? { ...s, status: 'skipped', message: 'Draf SROI sudah terisi' } : s));
        } else {
          const sroiModels = skeleton.sroi?.models || [];
          
          const { data: existingConfig } = await supabase
            .from('lfa_sroi_config')
            .select('*')
            .eq('lfa_project_id', currentLfaProjId)
            .maybeSingle();

          if (!existingConfig) {
            await supabase.from('lfa_sroi_config').insert({
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              total_investment_idr: skeleton.meta?.budgetIdr || 1200000000,
              discount_rate: 5,
              analysis_period_years: 5,
              mode: 'simple',
              sroi_ratio: 0,
              total_gross_value_idr: 0,
              total_present_value_idr: 0
            });
          }

          const sroiInserts: any[] = [];
          for (let i = 0; i < sroiModels.length; i++) {
            const item = sroiModels[i];
            sroiInserts.push({
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              outcome_name: item.outcomeStatement || 'Dampak SROI',
              quantity: item.quantityHint || 1,
              unit: 'orang',
              proxy_value_idr: item.suggestedProxyValueIdr || 1000000,
              proxy_source: item.suggestedProxyDescription || 'Estimasi draf AI',
              proxy_citation: item.rationale || '',
              proxy_category: item.financialProxyType || '',
              duration_years: item.durationYears || 1,
              attribution_pct: item.attributionPctDraft || 80,
              deadweight_pct: item.deadweightPctDraft || 20,
              displacement_pct: item.displacementPctDraft || 0,
              dropoff_pct_per_year: item.dropoffPctDraft || 0,
              gross_value_idr: 0,
              present_value_idr: 0,
              mode: 'simple',
              sort_order: i
            });
          }

          if (sroiInserts.length > 0) {
            const { error: insSroiErr } = await supabase
              .from('lfa_sroi_outcomes')
              .insert(sroiInserts);
            if (insSroiErr) throw insSroiErr;
          }
          setSteps(prev => prev.map(s => s.id === 'sroi' ? { ...s, status: 'success' } : s));
        }

      } else {
        // V1 PATHWAY - LEGACY BACKWARD COMPATIBLE FALLBACK
        setSteps(prev => prev.map(s => s.id === 'sroi' ? { ...s, status: 'skipped', message: 'SROI tidak didukung untuk proposal lama' } : s));

        if (existingEntries && existingEntries.some(e => e.level === 'output' || e.level === 'activity')) {
          setSteps(prev => prev.map(s => s.id === 'lfa' ? { ...s, status: 'skipped', message: 'LFA Matrix sudah terisi' } : s));
        } else {
          // Seed Goal
          let goalEntry = existingEntries?.find(e => e.level === 'goal');
          const goalDesc = matrix?.goal?.intervention || project.summary || '';
          const goalInd = matrix?.goal?.indicators?.[0] || '';
          const goalMov = matrix?.goal?.meansOfVerification?.[0] || '';
          const goalAsmp = matrix?.goal?.assumptions?.[0] || '';

          if (goalEntry) {
            if (!goalEntry.description) {
              await supabase.from('lfa_entries').update({
                description: goalDesc,
                indicator: goalInd,
                means_of_verification: goalMov,
                assumption: goalAsmp
              }).eq('id', goalEntry.id);
            }
          } else {
            await supabase.from('lfa_entries').insert({
              project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 'goal',
              sequence: 1,
              description: goalDesc,
              indicator: goalInd,
              means_of_verification: goalMov,
              assumption: goalAsmp
            });
          }

          // Seed Purpose
          let purposeEntry = existingEntries?.find(e => e.level === 'purpose');
          const outcomeDesc = matrix?.outcomes?.[0]?.intervention || '';
          const outcomeInd = matrix?.outcomes?.[0]?.indicators?.[0] || '';
          const outcomeMov = matrix?.outcomes?.[0]?.meansOfVerification?.[0] || '';
          const outcomeAsmp = matrix?.outcomes?.[0]?.assumptions?.[0] || '';

          if (purposeEntry) {
            if (!purposeEntry.description) {
              await supabase.from('lfa_entries').update({
                description: outcomeDesc,
                indicator: outcomeInd,
                means_of_verification: outcomeMov,
                assumption: outcomeAsmp
              }).eq('id', purposeEntry.id);
            }
          } else {
            await supabase.from('lfa_entries').insert({
              project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 'purpose',
              sequence: 1,
              description: outcomeDesc,
              indicator: outcomeInd,
              means_of_verification: outcomeMov,
              assumption: outcomeAsmp
            });
          }

          // Seed Outputs & Activities
          const outputs = matrix?.outputs || [];
          const matrixActivities = matrix?.activities || [];

          for (let i = 0; i < outputs.length; i++) {
            const out = outputs[i];
            const { data: outEntry, error: outErr } = await supabase
              .from('lfa_entries')
              .insert({
                project_id: currentLfaProjId,
                org_id: project.organization_id,
                level: 'output',
                sequence: i + 1,
                description: out.intervention || '',
                indicator: out.indicators?.[0] || '',
                means_of_verification: out.meansOfVerification?.[0] || '',
                assumption: out.assumptions?.[0] || '',
              })
              .select()
              .single();

            if (outErr) throw outErr;

            const actObj = matrixActivities[i];
            if (actObj && actObj.items) {
              for (let k = 0; k < actObj.items.length; k++) {
                const actText = actObj.items[k];
                await supabase
                  .from('lfa_entries')
                  .insert({
                    project_id: currentLfaProjId,
                    org_id: project.organization_id,
                    level: 'activity',
                    sequence: k + 1,
                    parent_id: outEntry.id,
                    description: actText,
                    indicator: '',
                    means_of_verification: '',
                    assumption: '',
                    timeline_start: 1,
                    timeline_end: project.duration_months || 12,
                  });
              }
            }
          }
          setSteps(prev => prev.map(s => s.id === 'lfa' ? { ...s, status: 'success' } : s));
        }

        // 3. SEED WBS ACTIVITIES (V1 Fallback)
        setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingWbs, error: wbsErr } = await supabase
          .from('lfa_wbs_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (wbsErr) throw wbsErr;

        if (existingWbs && existingWbs.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'skipped', message: 'Struktur WBS sudah terisi' } : s));
        } else {
          const { data: lfaEntries } = await supabase
            .from('lfa_entries')
            .select('*')
            .eq('project_id', currentLfaProjId);

          const seededOutputs = (lfaEntries || []).filter(e => e.level === 'output');
          const seededActivities = (lfaEntries || []).filter(e => e.level === 'activity');

          const newWbsItems: any[] = [];
          let globalSortOrder = 0;

          for (const out of seededOutputs) {
            const level1Id = crypto.randomUUID();
            newWbsItems.push({
              id: level1Id,
              lfa_project_id: currentLfaProjId,
              org_id: project.organization_id,
              level: 1,
              parent_id: null,
              name: out.description || 'Output Hasil Tanpa Judul',
              start_month: 1,
              duration_weeks: 4,
              sort_order: globalSortOrder++,
              mode: 'simple',
              dependencies: []
            });

            const childActs = seededActivities.filter(a => a.parent_id === out.id);
            for (const act of childActs) {
              const level2Id = crypto.randomUUID();
              let durationW = 4;
              if (act.timeline_start && act.timeline_end) {
                durationW = Math.max(4, (act.timeline_end - act.timeline_start + 1) * 4);
              }
              newWbsItems.push({
                id: level2Id,
                lfa_project_id: currentLfaProjId,
                org_id: project.organization_id,
                level: 2,
                parent_id: level1Id,
                name: act.description || 'Aktivitas Tanpa Judul',
                start_month: act.timeline_start || 1,
                duration_weeks: durationW,
                pic: act.responsible_party || '',
                sort_order: globalSortOrder++,
                mode: 'simple',
                dependencies: [],
                indicator: act.indicator || ''
              });
            }
          }

          if (newWbsItems.length > 0) {
            const { error } = await supabase
              .from('lfa_wbs_items')
              .insert(newWbsItems);
            if (error) throw error;
          }
          setSteps(prev => prev.map(s => s.id === 'wbs' ? { ...s, status: 'success' } : s));
        }

        // 4. SEED BUDGET SKELETON (V1 Fallback)
        setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingBudget } = await supabase
          .from('lfa_budget_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (existingBudget && existingBudget.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'skipped', message: 'Draf Anggaran sudah terisi' } : s));
        } else {
          const { data: seededActivitiesWbs } = await supabase
            .from('lfa_wbs_items')
            .select('*')
            .eq('lfa_project_id', currentLfaProjId)
            .eq('level', 2);

          const province = project.geography || 'DKI Jakarta';
          const personnelMul = INKINDO_PROVINCE_MULTIPLIERS[province] || 1.0;
          const directMul = INKINDO_DIRECT_COST_MULTIPLIERS[province] || 1.0;
          const ngoFactor = 0.7;

          const skeletonItems: any[] = [];
          let sortOrder = 0;

          const inferMethodFromName = (name: string): 'Workshop' | 'FGD' | 'Survey' | 'Pelatihan' | 'Pendampingan' | 'Rapat' | 'Lainnya' => {
            const lower = name.toLowerCase();
            if (lower.includes('workshop') || lower.includes('lokakarya')) return 'Workshop';
            if (lower.includes('fgd') || lower.includes('focus group') || lower.includes('diskusi terfokus')) return 'FGD';
            if (lower.includes('survey') || lower.includes('survei') || lower.includes('riset') || lower.includes('penelitian') || lower.includes('monitoring') || lower.includes('evaluasi')) return 'Survey';
            if (lower.includes('pelatihan') || lower.includes('training') || lower.includes('kapasitas') || lower.includes('capacity')) return 'Pelatihan';
            if (lower.includes('pendampingan') || lower.includes('mentoring') || lower.includes('coaching')) return 'Pendampingan';
            if (lower.includes('rapat') || lower.includes('meeting') || lower.includes('koordinasi')) return 'Rapat';
            return 'Lainnya';
          };

          if (seededActivitiesWbs && seededActivitiesWbs.length > 0) {
            seededActivitiesWbs.forEach((act: any) => {
              const method = inferMethodFromName(act.name);
              let templates: Array<{ name: string; category: string; unit: string; volume: number; price: number }> = [];

              if (method === 'Pelatihan' || method === 'Pendampingan') {
                templates = [
                  { name: 'Fasilitator', category: 'Honorarium', unit: 'Hari', volume: 2, price: 750000 },
                  { name: 'Makan + 2 Snack', category: 'Konsumsi', unit: 'Orang', volume: 25, price: 117000 },
                  { name: 'Hotel Bintang 3', category: 'Akomodasi', unit: 'Hari', volume: 1, price: 750000 },
                  { name: 'Transport Dalam Kota', category: 'Transport', unit: 'Orang', volume: 25, price: 150000 }
                ];
              } else if (method === 'Survey') {
                templates = [
                  { name: 'Petugas Lapangan', category: 'Honorarium', unit: 'Hari', volume: 5, price: 250000 },
                  { name: 'Transport Dalam Kota', category: 'Transport', unit: 'Orang', volume: 5, price: 150000 },
                  { name: 'Uang Harian Dalam Kota', category: 'Transport', unit: 'Hari', volume: 5, price: 380000 }
                ];
              } else if (method === 'Workshop') {
                templates = [
                  { name: 'Fasilitator', category: 'Honorarium', unit: 'Hari', volume: 1, price: 750000 },
                  { name: 'Modul/Materi Pelatihan', category: 'ATK', unit: 'Paket', volume: 15, price: 50000 },
                  { name: 'Makan + 2 Snack', category: 'Konsumsi', unit: 'Orang', volume: 15, price: 117000 }
                ];
              } else if (method === 'FGD') {
                templates = [
                  { name: 'Fasilitator', category: 'Honorarium', unit: 'Hari', volume: 1, price: 750000 },
                  { name: 'Makan + 2 Snack', category: 'Konsumsi', unit: 'Orang', volume: 10, price: 117000 },
                  { name: 'Transport Dalam Kota', category: 'Transport', unit: 'Orang', volume: 10, price: 150000 }
                ];
              } else {
                templates = [
                  { name: 'Makan Siang', category: 'Konsumsi', unit: 'Orang', volume: 8, price: 60000 },
                  { name: 'Snack', category: 'Konsumsi', unit: 'Orang', volume: 8, price: 30000 }
                ];
              }

              templates.forEach((tpl) => {
                let finalPrice = tpl.price;
                if (tpl.category === 'Honorarium') {
                  finalPrice = Math.round(tpl.price * personnelMul * ngoFactor);
                } else {
                  finalPrice = Math.round(tpl.price * directMul);
                }

                skeletonItems.push({
                  lfa_project_id: currentLfaProjId,
                  org_id: project.organization_id,
                  wbs_item_id: act.id,
                  activity_name: act.name,
                  category: tpl.category,
                  cost_category: tpl.category === 'Honorarium' ? 'Personnel & Consultants' : 'Direct Operational Costs',
                  item_name: tpl.name,
                  volume: tpl.volume,
                  unit: tpl.unit,
                  unit_price_idr: finalPrice,
                  funding_source: 'grant',
                  justification: `[AUTO_GENERATED] Berdasarkan metode ${method} untuk aktivitas: ${act.name}`,
                  needs_donor_approval: false,
                  sort_order: sortOrder++,
                  mode: 'simple'
                });
              });
            });

            if (skeletonItems.length > 0) {
              const { error } = await supabase
                .from('lfa_budget_items')
                .insert(skeletonItems);
              if (error) throw error;
            }
          }
          setSteps(prev => prev.map(s => s.id === 'budget' ? { ...s, status: 'success' } : s));
        }

        // 5. SEED MEAL FRAMEWORK (V1 Fallback)
        setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 600));

        const { data: existingMeal } = await supabase
          .from('lfa_meal_items')
          .select('*')
          .eq('lfa_project_id', currentLfaProjId);

        if (existingMeal && existingMeal.length > 0) {
          setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'skipped', message: 'Kerangka MEAL sudah terisi' } : s));
        } else {
          const { data: seededEntries } = await supabase
            .from('lfa_entries')
            .select('*')
            .eq('project_id', currentLfaProjId);

          if (seededEntries && seededEntries.length > 0) {
            const mealInserts = seededEntries
              .filter(entry => entry.indicator && entry.indicator.trim() !== '')
              .map((entry, index) => {
                let levelMap: 'goal' | 'purpose' | 'output' = 'output';
                if (entry.level === 'goal') levelMap = 'goal';
                if (entry.level === 'purpose') levelMap = 'purpose';

                return {
                  lfa_project_id: currentLfaProjId,
                  org_id: project.organization_id,
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
              const fallbackInserts = seededEntries.map((entry, index) => {
                let levelMap: 'goal' | 'purpose' | 'output' = 'output';
                if (entry.level === 'goal') levelMap = 'goal';
                if (entry.level === 'purpose') levelMap = 'purpose';

                return {
                  lfa_project_id: currentLfaProjId,
                  org_id: project.organization_id,
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

            if (mealInserts.length > 0) {
              const { error } = await supabase
                .from('lfa_meal_items')
                .insert(mealInserts);
              if (error) throw error;
            }
          }
          setSteps(prev => prev.map(s => s.id === 'meal' ? { ...s, status: 'success' } : s));
        }
      }

      setCompleted(true);
      toast({
        title: 'Materialisasi Berhasil! 🚀✨',
        description: 'Seluruh struktur Logical Framework, WBS, Budget, dan MEAL telah berhasil disinkronisasi.',
      });

    } catch (err: any) {
      console.error('Materialization error:', err);
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed', message: err.message } : s));
      toast({
        title: 'Materialisasi Gagal',
        description: err.message || 'Terjadi kesalahan saat memproses data.',
        variant: 'destructive',
      });
    } finally {
      setMaterializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat proposal…
      </div>
    );
  }

  return (
    <div className="space-y-6 print-root">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-root, .print-root * { visibility: visible !important; }
          .print-root .no-print, .print-root .no-print * { visibility: hidden !important; display: none !important; }
          .print-root { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 16mm; }
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to={`/dashboard/grant-writer/${projectId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke wizard
            </Link>
          </Button>
          <h1 className="text-h2">
            {project?.title ?? 'Proposal'}
          </h1>
          {doc && (
            <p className="text-sm text-muted-foreground">
              Versi {doc.version} · Dibuat {new Date(doc.created_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        {doc && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">LFA · UN/OECD-DAC</Badge>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Unduh Markdown
            </Button>
            <Button variant="default" onClick={handlePrintPdf}>
              <Printer className="mr-1 h-4 w-4" /> Unduh PDF
            </Button>
          </div>
        )}
      </div>

      {!doc ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-accent/10 p-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h3 className="text-h4">Belum ada proposal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Selesaikan wizard 7 langkah lalu klik "Buat Proposal" untuk menghasilkan
                dokumen donor-ready.
              </p>
            </div>
            <Button asChild>
              <Link to={`/dashboard/grant-writer/${projectId}`}>
                <Sparkles className="mr-1 h-4 w-4" /> Lanjutkan wizard
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* SPRINT 4: HIGH-FIDELITY MATERIALIZATION CARD PANEL */}
          <Card className="border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 via-purple-50/10 to-transparent dark:from-indigo-950/20 dark:via-purple-950/5 dark:to-transparent backdrop-blur-md shadow-lg no-print overflow-hidden">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                    <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
                      Materialisasikan Program Workspace
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ubah draf proposal hasil AI ini menjadi modul program operasional yang tersinkronisasi. Sistem akan otomatis melakukan seeding ke logframe, jadwal WBS, perhitungan draf RAB berbasis INKINDO 2026, dan indikator MEAL secara asynchronous & idempotent.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {completed && targetLfaProjectId && (
                    <Button variant="outline" className="border-indigo-200 hover:bg-indigo-50/50 dark:border-indigo-800" asChild>
                      <Link to={`/dashboard/lfa-builder/${targetLfaProjectId}?tab=lfa`}>
                        Buka Program Workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button 
                    variant="default" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 dark:shadow-none"
                    disabled={materializing} 
                    onClick={handleMaterialize}
                  >
                    {materializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        <Play className="mr-1.5 h-4 w-4 fill-current" /> {completed ? 'Sinkronisasi Ulang' : 'Materialisasikan Sekarang'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress Steps List */}
              <div className="mt-6 border-t border-indigo-100/50 dark:border-indigo-900/40 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  {steps.map((step, idx) => {
                    const isIdle = step.status === 'idle';
                    const isRunning = step.status === 'running';
                    const isSuccess = step.status === 'success';
                    const isSkipped = step.status === 'skipped';
                    const isFailed = step.status === 'failed';

                    return (
                      <div 
                        key={step.id} 
                        className={`relative rounded-xl p-4 transition-all duration-300 border ${
                          isRunning 
                            ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20 shadow-sm shadow-indigo-100/30 animate-pulse'
                            : isSuccess
                            ? 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-950/30 dark:bg-emerald-950/5'
                            : isSkipped
                            ? 'border-slate-200 bg-slate-50/20 dark:border-slate-800 dark:bg-slate-900/10'
                            : isFailed
                            ? 'border-rose-200 bg-rose-50/10 dark:border-rose-950/30'
                            : 'border-slate-100 bg-transparent dark:border-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isRunning && (
                              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                            )}
                            {isSuccess && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-50" />
                            )}
                            {isSkipped && (
                              <CheckCircle2 className="h-5 w-5 text-indigo-400 fill-indigo-50/50" />
                            )}
                            {isFailed && (
                              <XCircle className="h-5 w-5 text-rose-500 fill-rose-50" />
                            )}
                            {isIdle && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {step.label}
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              {isRunning && 'Mengevaluasi & seeding...'}
                              {isSuccess && 'Berhasil diselesaikan'}
                              {isSkipped && (step.message || 'Ditemukan, dilewati')}
                              {isFailed && (step.message || 'Gagal, klik coba lagi')}
                              {isIdle && 'Menunggu giliran'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-accent/30 bg-accent-soft/40 p-5 shadow-card no-print">
            <h2 className="font-semibold">Draft untuk direview</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Output ini adalah draf kerja. Cek kembali requirement donor, eligibility, angka program, budget, dan
              narasi impact sebelum digunakan.
            </p>
          </Card>

          <Card>
            <CardContent className="py-8">
              <article
                className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h3:text-base prose-table:my-4 prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
