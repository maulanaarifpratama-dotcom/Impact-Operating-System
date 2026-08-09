import { supabase } from '@/integrations/supabase/client';
import { fetchProjectBaseline, type BaselineRow } from './baselineRpc';
import {
  computeBudgetSnapshot,
  formatIDR,
  type BudgetItemInput,
} from '@/lib/budget/budgetModel';
import { resolveTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';

interface PdfStage {
  id: string;
  title: string;
  sort_order: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
}

interface PdfActivity {
  id: string;
  name: string;
  status: string;
  progress_percent: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  pic: string | null;
  stage_id: string | null;
}

// Deliverables = outputs derived from Closed (verified) ACR, same canonical
// rule as DeliverablesTab in ProjectMEALPage.tsx — no separate storage, no
// due_date (that concept doesn't apply to an ACR-derived output).
interface PdfDeliverable {
  name: string;
  completionDate: string | null;
}

interface PdfData {
  projectName: string;
  orgName: string;
  generatedDate: string;
  baseline: BaselineRow | null;
  targetBudget: number | null;
  budgetSnapshot: ReturnType<typeof computeBudgetSnapshot> | null;
  stages: PdfStage[];
  activities: PdfActivity[];
  deliverables: PdfDeliverable[];
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Belum Mulai',
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
  blocked: 'Terhambat',
  in_review: 'Dalam Peninjauan',
  ready: 'Siap',
  cancelled: 'Dibatalkan',
  draft: 'Draft',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtProgress(p: number): string {
  return `${p}%`;
}

function renderHtml(data: PdfData): string {
  const { projectName, orgName, generatedDate, baseline, targetBudget, budgetSnapshot, stages, activities, deliverables } = data;

  const activityByStage = new Map<string, PdfActivity[]>();
  for (const s of stages) activityByStage.set(s.id, []);
  for (const a of activities) {
    const sid = a.stage_id || '__other__';
    if (!activityByStage.has(sid)) activityByStage.set(sid, []);
    activityByStage.get(sid)!.push(a);
  }

  const allStageIds = new Set([...activityByStage.keys()].filter((k) => k !== '__other__'));
  const otherActivities = activityByStage.get('__other__') || [];

  const stageRows = stages
    .filter((s) => allStageIds.has(s.id))
    .map((s) => {
      const acts = activityByStage.get(s.id) || [];
      const actRows = acts
        .map(
          (a) => `
          <tr>
            <td style="padding-left:16px">${esc(a.name)}</td>
            <td>${fmtDate(a.planned_start_date)}</td>
            <td>${fmtDate(a.planned_end_date)}</td>
            <td>${STATUS_LABELS[a.status] || a.status}</td>
            <td>${fmtProgress(a.progress_percent)}</td>
            <td>${esc(a.pic || '—')}</td>
          </tr>`,
        )
        .join('');
      return `
        <tr style="background:#f0f9ff;font-weight:bold">
          <td colspan="6">${esc(s.title)}</td>
        </tr>
        ${actRows}`;
    })
    .join('');

  const otherRows = otherActivities
    .map(
      (a) => `
      <tr>
        <td style="padding-left:16px">${esc(a.name)}</td>
        <td>${fmtDate(a.planned_start_date)}</td>
        <td>${fmtDate(a.planned_end_date)}</td>
        <td>${STATUS_LABELS[a.status] || a.status}</td>
        <td>${fmtProgress(a.progress_percent)}</td>
        <td>${esc(a.pic || '—')}</td>
      </tr>`,
    )
    .join('');

  const deliveryRows = deliverables
    .map(
      (d) => `
      <tr>
        <td>${esc(d.name)}</td>
        <td>Selesai</td>
        <td>${fmtDate(d.completionDate)}</td>
      </tr>`,
    )
    .join('');

  const baselineSection = baseline
    ? `<p><strong>Baseline:</strong> v${baseline.version} — dikunci ${fmtDate(baseline.created_at)}</p>`
    : '';

  const budgetSection =
    budgetSnapshot
      ? `
      <h2>3. Ringkasan Anggaran</h2>
      <table>
        <tr><td><strong>Target Budget</strong></td><td>${targetBudget ? formatIDR(targetBudget) : '—'}</td></tr>
        <tr><td><strong>Detailed Budget</strong></td><td>${formatIDR(budgetSnapshot.detailedBudget)}</td></tr>
        <tr><td><strong>Coverage</strong></td><td>${budgetSnapshot.hasTargetBudget ? budgetSnapshot.coveragePercent.toFixed(0) + '%' : '—'}</td></tr>
        <tr><td><strong>Gap</strong></td><td>${budgetSnapshot.hasTargetBudget ? formatIDR(budgetSnapshot.remainingGap ?? 0) : '—'}</td></tr>
        <tr><td><strong>Realisasi</strong></td><td>${formatIDR(budgetSnapshot.actualRealization)}</td></tr>
        <tr><td><strong>Burn Rate / Bulan</strong></td><td>${budgetSnapshot.hasTargetBudget ? formatIDR(budgetSnapshot.plannedBurnRate) : '—'}</td></tr>
      </table>`
      : '';

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PM Report — ${esc(projectName)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; font-size: 10pt; color: #1e293b; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 14pt; margin-bottom: 2px; }
  h2 { font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 9pt; }
  th { background: #f8fafc; font-weight: 600; }
  .meta { color: #64748b; font-size: 9pt; margin-bottom: 16px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${esc(projectName)}</h1>
<div class="meta">
  <p>${esc(orgName)}</p>
  <p>Dibuat: ${generatedDate}</p>
  ${baselineSection}
</div>

<h2>1. Ringkasan Proyek</h2>
<table>
  <tr><td><strong>Proyek</strong></td><td>${esc(projectName)}</td></tr>
  <tr><td><strong>Organisasi</strong></td><td>${esc(orgName)}</td></tr>
  <tr><td><strong>Tanggal Export</strong></td><td>${generatedDate}</td></tr>
  ${baseline ? `<tr><td><strong>Baseline</strong></td><td>v${baseline.version} — ${fmtDate(baseline.created_at)}</td></tr>` : ''}
</table>

<h2>2. Work Plan</h2>
<table>
  <thead><tr><th>Activity</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Progres</th><th>PIC</th></tr></thead>
  <tbody>${stageRows}${otherRows}</tbody>
</table>
${otherActivities.length === 0 && stages.length === 0 ? '<p><em>Belum ada Activity.</em></p>' : ''}

${budgetSection}

${deliverables.length > 0 ? `
<h2>4. Deliverables</h2>
<table>
  <thead><tr><th>Deliverable</th><th>Status</th><th>Tanggal Selesai</th></tr></thead>
  <tbody>${deliveryRows}</tbody>
</table>` : ''}

</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function openPmPdfReport(projectId: string, orgId: string) {
  const [projRes, orgRes, stagesRes, wbsRes, budgetRes, claimsRes, baseline] = await Promise.all([
    supabase.from('lfa_projects').select('name, duration_months').eq('id', projectId).single(),
    supabase.from('organizations').select('name').eq('id', orgId).single(),
    (supabase as any).from('project_stages').select('id, title, sort_order, planned_start_date, planned_end_date').eq('project_id', projectId).is('archived_at', null).order('sort_order'),
    (supabase as any).from('lfa_wbs_items').select('id, name, status, progress_percent, planned_start_date, planned_end_date, pic, parent_id, level').eq('lfa_project_id', projectId).gte('level', 2),
    supabase.from('lfa_budget_items').select('id, volume, unit_price_idr, actual_amount_idr, cost_category').eq('lfa_project_id', projectId),
    // Deliverables = outputs derived from Closed (verified) ACR — same canonical
    // rule as DeliverablesTab, never a separate stored entity.
    supabase.from('wbs_completion_claims').select('id, wbs_item_id, reviewed_at, submitted_at').eq('lfa_project_id', projectId).eq('status', 'verified'),
    fetchProjectBaseline(projectId).catch(() => null),
  ]);

  const projectName = projRes.data?.name || 'Project';
  const orgName = orgRes.data?.name || '';

  const stages: PdfStage[] = (stagesRes.data || []) as PdfStage[];

  const wbsRows = (wbsRes.data || []) as any[];
  const level1Map = new Map<string, string | null>();
  for (const w of wbsRows) {
    if (w.level === 1) level1Map.set(w.id, w.stage_id ?? null);
  }
  const activities: PdfActivity[] = wbsRows
    .filter((w: any) => w.level === 2)
    .map((w: any) => ({
      id: w.id,
      name: w.name || '',
      status: w.status || 'not_started',
      progress_percent: w.progress_percent ?? 0,
      planned_start_date: w.planned_start_date,
      planned_end_date: w.planned_end_date,
      pic: w.pic,
      stage_id: level1Map.get(w.parent_id) ?? null,
    }));

  const budgetItems: BudgetItemInput[] = (budgetRes.data || []).map((b: any) => ({
    id: b.id,
    wbs_item_id: b.wbs_item_id || null,
    volume: b.volume ?? 0,
    unit_price_idr: b.unit_price_idr ?? 0,
    actual_amount_idr: b.actual_amount_idr ?? 0,
    cost_category: b.cost_category || '',
  }));

  const targetBudget = await resolveTargetBudgetForLfaProject(supabase as any, projectId);
  const budgetSnapshot = computeBudgetSnapshot({
    targetBudget,
    budgetItems,
    durationMonths: projRes.data?.duration_months || 12,
  });

  const wbsNameById = new Map(wbsRows.map((w: any) => [w.id, w.name || '']));
  const deliverables: PdfDeliverable[] = ((claimsRes.data || []) as any[]).map((c) => ({
    name: wbsNameById.get(c.wbs_item_id) || 'Activity',
    completionDate: c.reviewed_at || c.submitted_at || null,
  }));

  const data: PdfData = {
    projectName,
    orgName,
    generatedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    baseline,
    targetBudget,
    budgetSnapshot,
    stages,
    activities,
    deliverables,
  };

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(renderHtml(data));
  win.document.close();
  setTimeout(() => win.print(), 500);
}
