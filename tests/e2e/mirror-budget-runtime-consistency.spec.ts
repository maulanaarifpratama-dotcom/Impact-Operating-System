import { test, expect, type Locator, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fillLfaMatrixIfLocked, LFA_EDITOR_ROOT } from './helpers/lfaProject';

dotenv.config({ path: path.resolve('.env') });
dotenv.config({ path: path.resolve('.env.local'), override: true });
dotenv.config({ path: path.resolve('.env.e2e'), override: true });

type StateName = 'STATE_A' | 'STATE_B' | 'STATE_C' | 'STATE_D';

type MirrorMetrics = {
  targetBudget: number | null;
  detailedBudget: number | null;
  coveragePct: number | null;
  gapAbs: number | null;
  statusLabel: string;
  stateBadge?: string | null;
  actionStates: {
    hasGenerateDraft: boolean;
    hasTambahManual: boolean;
    hasContinueAction: boolean;
  };
};

type ValidationRow = {
  state: StateName;
  wbs: MirrorMetrics;
  budget: MirrorMetrics;
  parity: {
    targetBudget: boolean;
    detailedBudget: boolean;
    coveragePct: boolean;
    gapAbs: boolean;
  };
  divergences: string[];
  screenshots: {
    wbs: string;
    budget: string;
  };
};

function getUserClient(accessToken: string): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY or access token for validation.');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function parseCompactIdr(raw: string): number | null {
  const text = (raw || '').trim();
  if (!text || /Belum tersedia|Belum dibuat|Belum diketahui/i.test(text)) return null;

  const normalized = text.replace(/\s+/g, ' ').trim();
  const m = normalized.match(/Rp\s*([0-9.,]+)\s*([A-Za-z]+)?/i);
  if (!m) return null;

  const numRaw = m[1].replace(/\./g, '').replace(',', '.');
  const base = Number(numRaw);
  if (!Number.isFinite(base)) return null;

  const suffix = (m[2] || '').toLowerCase();
  if (suffix === 'm') return Math.round(base * 1_000_000_000);
  if (suffix === 'jt') return Math.round(base * 1_000_000);
  if (suffix === 'rb') return Math.round(base * 1_000);
  return Math.round(base);
}

function parseCoverage(raw: string): number | null {
  const text = (raw || '').trim();
  if (!text) return null;
  const m = text.match(/([0-9.,]+)%/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

async function metricFromLabel(container: Locator, label: string): Promise<string> {
  const value = await container.evaluate((el, targetLabel) => {
    const spans = Array.from(el.querySelectorAll('span'));
    const labelSpan = spans.find((s) => (s.textContent || '').trim() === targetLabel);
    if (!labelSpan) return '';
    let next = labelSpan.nextElementSibling as HTMLElement | null;
    while (next) {
      const t = (next.textContent || '').trim();
      if (t.length > 0) return t;
      next = next.nextElementSibling as HTMLElement | null;
    }
    return '';
  }, label);
  return value;
}

async function captureWbsMetrics(page: Page): Promise<MirrorMetrics> {
  const summary = page.locator('div').filter({ hasText: 'Target Budget' }).filter({ hasText: 'Detailed Budget' }).filter({ hasText: 'Coverage' }).filter({ hasText: 'Gap' }).first();
  await expect(summary).toBeVisible({ timeout: 15000 });

  const targetRaw = await metricFromLabel(summary, 'Target Budget');
  const detailedRaw = await metricFromLabel(summary, 'Detailed Budget');
  const coverageRaw = await metricFromLabel(summary, 'Coverage');
  const gapRaw = await metricFromLabel(summary, 'Gap');

  const statusLabel = ((await summary.locator('span,div,p').filter({ hasText: /anggaran|target/i }).last().textContent()) || '').trim();

  return {
    targetBudget: parseCompactIdr(targetRaw),
    detailedBudget: parseCompactIdr(detailedRaw),
    coveragePct: parseCoverage(coverageRaw),
    gapAbs: parseCompactIdr(gapRaw),
    statusLabel,
    actionStates: {
      hasGenerateDraft: false,
      hasTambahManual: false,
      hasContinueAction: false,
    },
  };
}

async function captureBudgetMetrics(page: Page): Promise<MirrorMetrics> {
  const card = page.locator('h3:has-text("Mirror Budget Model")').first().locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first();
  await expect(card).toBeVisible({ timeout: 15000 });

  const targetRaw = await metricFromLabel(card, 'Target Budget');
  const detailedRaw = await metricFromLabel(card, 'Detailed Budget');
  const coverageRaw = await metricFromLabel(card, 'Coverage');
  const gapRaw = await metricFromLabel(card, 'Gap (Belum dialokasikan)');

  const statusLabel = ((await card.locator('p').first().textContent()) || '').trim();

  const stateBadge = (await card.locator('[data-testid="mirror-state-badge"]').first().textContent().catch(() => null))?.trim() ?? null;

  const hasGenerateDraft = await card.getByRole('button', { name: /Generate Draft Budget/i }).isVisible().catch(() => false);
  const hasTambahManual = await card.getByRole('button', { name: /Tambah Manual/i }).isVisible().catch(() => false);
  const hasContinueAction = await card.getByRole('button', { name: /Lanjutkan Penyusunan Anggaran/i }).isVisible().catch(() => false);

  return {
    targetBudget: parseCompactIdr(targetRaw),
    detailedBudget: parseCompactIdr(detailedRaw),
    coveragePct: parseCoverage(coverageRaw),
    gapAbs: parseCompactIdr(gapRaw),
    statusLabel,
    stateBadge,
    actionStates: {
      hasGenerateDraft,
      hasTambahManual,
      hasContinueAction,
    },
  };
}

function approxEq(a: number | null, b: number | null, tol = 0.05): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tol;
}

async function openWbs(page: Page) {
  await page.locator('[data-testid="lfa-tab-wbs"], button:has-text("WBS Builder"), button:has-text("WBS")').first().click();
  const wbsRoot = page.locator('[data-testid="wbs-builder-root"]').first();
  const targetLabel = page.getByText('Target Budget', { exact: true }).first();
  const rootVisible = await wbsRoot.isVisible().catch(() => false);
  if (!rootVisible) {
    await expect(targetLabel).toBeVisible({ timeout: 15000 });
  }
}

async function openBudget(page: Page) {
  await page.locator('[data-testid="lfa-tab-budget"], button:has-text("Budget")').first().click();
  await expect(page.locator('h3:has-text("Mirror Budget Model")').first()).toBeVisible({ timeout: 15000 });
}

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const authKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!authKey) return '';
    const raw = localStorage.getItem(authKey);
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || '';
    } catch {
      return '';
    }
  });
  if (!token) throw new Error('Cannot read Supabase access token from browser localStorage.');
  return token;
}

function decodeJwtSub(accessToken: string): string {
  const payload = accessToken.split('.')[1] || '';
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const json = Buffer.from(padded, 'base64').toString('utf-8');
  const parsed = JSON.parse(json);
  return String(parsed?.sub || '');
}

async function findLinkedGrantProject(page: Page, db: SupabaseClient, baseUrl: string): Promise<string | null> {
  const { data: candidates, error } = await db
    .from('lfa_projects')
    .select('id, linked_grant_id')
    .not('linked_grant_id', 'is', null)
    .limit(20);

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  for (const c of candidates as any[]) {
    const pid = c.id as string;
    await page.goto(`${baseUrl}/dashboard/lfa-builder/${pid}`);
    const visible = await page.locator(LFA_EDITOR_ROOT).first().isVisible().catch(() => false);
    if (visible) return pid;
  }

  return null;
}

async function setupProjectBudgetContext(db: SupabaseClient, projectId: string) {
  const { data: proj, error } = await db
    .from('lfa_projects')
    .select('id, org_id, linked_grant_id')
    .eq('id', projectId)
    .single();

  if (error || !proj) throw new Error(`Cannot load lfa_projects(${projectId}): ${error?.message || 'not found'}`);

  const { data: wbsRows, error: wbsErr } = await db
    .from('lfa_wbs_items')
    .select('id, name, level')
    .eq('lfa_project_id', projectId)
    .eq('level', 2)
    .order('sort_order', { ascending: true });

  if (wbsErr) throw new Error(`Cannot load level-2 WBS rows: ${wbsErr.message}`);

  let level2Rows = wbsRows || [];
  if (level2Rows.length === 0) {
    const level1Id = randomUUID();
    const level2IdA = randomUUID();
    const level2IdB = randomUUID();

    const seedRows = [
      {
        id: level1Id,
        lfa_project_id: projectId,
        org_id: (proj as any).org_id as string,
        level: 1,
        parent_id: null,
        name: 'E2E Runtime Output',
        start_month: 1,
        duration_weeks: 8,
        sort_order: 1,
        mode: 'simple',
        dependencies: [],
      },
      {
        id: level2IdA,
        lfa_project_id: projectId,
        org_id: (proj as any).org_id as string,
        level: 2,
        parent_id: level1Id,
        name: 'E2E Runtime Activity A',
        start_month: 1,
        duration_weeks: 4,
        sort_order: 2,
        mode: 'simple',
        dependencies: [],
      },
      {
        id: level2IdB,
        lfa_project_id: projectId,
        org_id: (proj as any).org_id as string,
        level: 2,
        parent_id: level1Id,
        name: 'E2E Runtime Activity B',
        start_month: 2,
        duration_weeks: 4,
        sort_order: 3,
        mode: 'simple',
        dependencies: [],
      },
    ];

    const { error: seedErr } = await db.from('lfa_wbs_items').insert(seedRows as any);
    if (seedErr) throw new Error(`Cannot seed WBS rows for runtime validation: ${seedErr.message}`);

    const { data: refetched, error: refetchErr } = await db
      .from('lfa_wbs_items')
      .select('id, name, level')
      .eq('lfa_project_id', projectId)
      .eq('level', 2)
      .order('sort_order', { ascending: true });

    if (refetchErr) throw new Error(`Cannot refetch seeded level-2 WBS rows: ${refetchErr.message}`);
    level2Rows = refetched || [];
  }

  if (level2Rows.length === 0) throw new Error('Project has no level-2 WBS rows; cannot build budget state matrix.');

  return {
    orgId: (proj as any).org_id as string,
    linkedGrantId: (proj as any).linked_grant_id as string | null,
    wbsRows: level2Rows.map((r: any) => ({ id: r.id as string, name: (r.name as string) || 'Aktivitas' })),
  };
}

async function ensureLinkedGrantFixture(
  db: SupabaseClient,
  projectId: string,
  orgId: string,
  userId: string,
): Promise<string> {
  const { data: proj } = await db
    .from('lfa_projects')
    .select('name, linked_grant_id')
    .eq('id', projectId)
    .maybeSingle();

  const linked = (proj as any)?.linked_grant_id as string | null | undefined;
  if (linked) return linked;

  const gwId = randomUUID();
  const wizardData = { lfa_project_id: projectId, budgetIdr: 120000000, _mode: 'quick' };
  const { error: insErr } = await db
    .from('gw_projects')
    .insert({
      id: gwId,
      organization_id: orgId,
      created_by: userId,
      title: (proj as any)?.name || 'Runtime Parity Fixture',
      summary: 'Runtime parity fixture project',
      status: 'draft',
      donor_standard: 'un_oecd_dac',
      budget_idr: 120000000,
      wizard_data: wizardData,
    } as any);

  if (insErr) throw new Error(`Failed to create linked gw project fixture: ${insErr.message}`);

  const { error: updErr } = await db
    .from('lfa_projects')
    .update({ linked_grant_id: gwId } as any)
    .eq('id', projectId);

  if (updErr) throw new Error(`Failed to link lfa project to gw fixture: ${updErr.message}`);

  return gwId;
}

async function setGwTargetBudget(
  db: SupabaseClient,
  linkedGrantId: string,
  amountIdr: number,
) {
  const { data: gw } = await db
    .from('gw_projects')
    .select('wizard_data')
    .eq('id', linkedGrantId)
    .maybeSingle();

  const wizardData = { ...(((gw as any)?.wizard_data || {}) as Record<string, unknown>), budgetIdr: amountIdr };

  const { error } = await db
    .from('gw_projects')
    .update({
      budget_idr: amountIdr,
      wizard_data: wizardData,
    })
    .eq('id', linkedGrantId);

  if (error) throw new Error(`Failed setting gw target budget: ${error.message}`);
}

async function clearBudgetRows(admin: SupabaseClient, projectId: string) {
  const { error } = await admin.from('lfa_budget_items').delete().eq('lfa_project_id', projectId);
  if (error) throw new Error(`Failed deleting budget rows: ${error.message}`);
}

async function insertBudgetRows(
  admin: SupabaseClient,
  projectId: string,
  orgId: string,
  rows: Array<{ wbsId: string; activityName: string; itemName: string; volume: number; unitPrice: number; sortOrder: number }>,
) {
  const payload = rows.map((r) => ({
    lfa_project_id: projectId,
    org_id: orgId,
    wbs_item_id: r.wbsId,
    activity_name: r.activityName,
    item_name: r.itemName,
    category: 'Operasional',
    cost_category: 'Direct Operational Costs',
    volume: r.volume,
    unit: 'Paket',
    unit_price_idr: r.unitPrice,
    funding_source: 'grant',
    justification: 'runtime-consistency-validation',
    needs_donor_approval: false,
    sort_order: r.sortOrder,
    mode: 'simple',
  }));

  const { error } = await admin.from('lfa_budget_items').insert(payload);
  if (error) throw new Error(`Failed inserting budget rows: ${error.message}`);
}

async function applyState(
  db: SupabaseClient,
  state: StateName,
  projectId: string,
  orgId: string,
  wbsRows: Array<{ id: string; name: string }>,
  targetBudgetIdr?: number | null,
): Promise<number> {
  await clearBudgetRows(db, projectId);

  if (state === 'STATE_A') {
    return 0;
  }

  if (state === 'STATE_B') {
    await insertBudgetRows(db, projectId, orgId, [
      { wbsId: wbsRows[0].id, activityName: wbsRows[0].name, itemName: 'State B - Unpriced 1', volume: 10, unitPrice: 0, sortOrder: 0 },
      { wbsId: wbsRows[Math.min(1, wbsRows.length - 1)].id, activityName: wbsRows[Math.min(1, wbsRows.length - 1)].name, itemName: 'State B - Unpriced 2', volume: 2, unitPrice: 0, sortOrder: 1 },
    ]);
    return 0;
  }

  if (state === 'STATE_C') {
    const target = targetBudgetIdr && targetBudgetIdr > 0 ? targetBudgetIdr : 120_000_000;
    const totalC = Math.max(1_000_000, Math.round(target * 0.35));
    const firstPrice = Math.round(totalC * 0.6);
    const secondPrice = totalC - firstPrice;
    await insertBudgetRows(db, projectId, orgId, [
      { wbsId: wbsRows[0].id, activityName: wbsRows[0].name, itemName: 'State C - Priced', volume: 1, unitPrice: firstPrice, sortOrder: 0 },
      { wbsId: wbsRows[Math.min(1, wbsRows.length - 1)].id, activityName: wbsRows[Math.min(1, wbsRows.length - 1)].name, itemName: 'State C - Unpriced', volume: 8, unitPrice: 0, sortOrder: 1 },
      { wbsId: wbsRows[Math.min(2, wbsRows.length - 1)].id, activityName: wbsRows[Math.min(2, wbsRows.length - 1)].name, itemName: 'State C - Priced 2', volume: 1, unitPrice: secondPrice, sortOrder: 2 },
    ]);
    return totalC;
  }

  const target = targetBudgetIdr && targetBudgetIdr > 0 ? targetBudgetIdr : 120_000_000;
  const totalD = Math.max(10_000_000, Math.round(target * 1.1));
  const halfD = Math.round(totalD / 2);
  await insertBudgetRows(db, projectId, orgId, [
    { wbsId: wbsRows[0].id, activityName: wbsRows[0].name, itemName: 'State D - Priced 1', volume: 1, unitPrice: halfD, sortOrder: 0 },
    { wbsId: wbsRows[Math.min(1, wbsRows.length - 1)].id, activityName: wbsRows[Math.min(1, wbsRows.length - 1)].name, itemName: 'State D - Priced 2', volume: 1, unitPrice: totalD - halfD, sortOrder: 1 },
  ]);
  return totalD;
}

function expectedBudgetUiForState(state: StateName) {
  return {
    stateBadge: state.replace('_', ' '),
    actions:
      state === 'STATE_A' || state === 'STATE_B'
        ? { draft: true, manual: true, cont: false }
        : state === 'STATE_C'
          ? { draft: false, manual: false, cont: true }
          : { draft: false, manual: false, cont: false },
  };
}

test.describe('Mirror Budget Model Runtime Consistency', () => {
  test.beforeAll(() => {
    const missing = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'].filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`Missing E2E variables in .env.e2e: ${missing.join(', ')}`);
    }
  });

  test('WBS and Budget tab should show identical mirror metrics for states A-D', async ({ page }) => {
    test.setTimeout(300_000);

    const outDir = path.resolve('reports', 'mirror-budget-runtime');
    fs.mkdirSync(outDir, { recursive: true });

    const baseUrl = process.env.E2E_BASE_URL!;
    await page.goto(`${baseUrl}/login`);
    await page.locator('button:has-text("Password")').first().click();
    await page.locator('#p-email').fill(process.env.E2E_USER_EMAIL!);
    await page.locator('#p-password').fill(process.env.E2E_USER_PASSWORD!);
    await page.locator('button[type="submit"]:has-text("Masuk")').first().click();
    await page.waitForURL('**/dashboard**', { timeout: 30000 });

    const accessToken = await getAccessToken(page);
    const db = getUserClient(accessToken);

    const fixtureProjectId = process.env.E2E_TEST_PROJECT_ID;
    let projectId = fixtureProjectId || '';
    if (!projectId) {
      const discovered = await findLinkedGrantProject(page, db, baseUrl);
      if (discovered) {
        projectId = discovered;
      } else {
        const { data: anyLfa } = await db
          .from('lfa_projects')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (!anyLfa?.id) throw new Error('No LFA project found for runtime parity validation.');
        projectId = anyLfa.id;
      }
    }
    await page.goto(`${baseUrl}/dashboard/lfa-builder/${projectId}`);
    await expect(page.locator(LFA_EDITOR_ROOT).first()).toBeVisible({ timeout: 25000 });
    await fillLfaMatrixIfLocked(page);

    const ctx = await setupProjectBudgetContext(db, projectId);
    const userId = decodeJwtSub(accessToken);
    const linkedGrantId = ctx.linkedGrantId || await ensureLinkedGrantFixture(db, projectId, ctx.orgId, userId);

    const enforcedTargetBudget = 120_000_000;
    await setGwTargetBudget(db, linkedGrantId, enforcedTargetBudget);

    const states: StateName[] = ['STATE_A', 'STATE_B', 'STATE_C', 'STATE_D'];
    const rows: ValidationRow[] = [];

    let baselineTargetBudget: number | null = enforcedTargetBudget;

    for (const state of states) {
      await applyState(db, state, projectId, ctx.orgId, ctx.wbsRows, baselineTargetBudget);

      await page.reload();
      await expect(page.locator(LFA_EDITOR_ROOT).first()).toBeVisible({ timeout: 25000 });

      await openWbs(page);
      await page.waitForTimeout(1800);
      const wbsShot = path.join(outDir, `${state.toLowerCase()}-wbs.png`);
      await page.screenshot({ path: wbsShot, fullPage: true });
      const wbs = await captureWbsMetrics(page);

      await openBudget(page);
      await page.waitForTimeout(1800);
      const budgetShot = path.join(outDir, `${state.toLowerCase()}-budget.png`);
      await page.screenshot({ path: budgetShot, fullPage: true });
      const budget = await captureBudgetMetrics(page);

      if (state === 'STATE_A') {
        baselineTargetBudget = budget.targetBudget;
      }

      const parity = {
        targetBudget: approxEq(wbs.targetBudget, budget.targetBudget, 5_000),
        detailedBudget: approxEq(wbs.detailedBudget, budget.detailedBudget, 5_000),
        coveragePct: approxEq(wbs.coveragePct, budget.coveragePct, 0.11),
        gapAbs: approxEq(wbs.gapAbs, budget.gapAbs, 5_000),
      };

      const divergences: string[] = [];
      if (!parity.targetBudget) divergences.push('Target Budget mismatch between WBS and Budget tab');
      if (!parity.detailedBudget) divergences.push('Detailed Budget mismatch between WBS and Budget tab');
      if (!parity.coveragePct) divergences.push('Coverage mismatch between WBS and Budget tab');
      if (!parity.gapAbs) divergences.push('Gap mismatch between WBS and Budget tab');

      const expected = expectedBudgetUiForState(state);
      const expectedBadge = expected.stateBadge;
      if ((budget.stateBadge || '').toUpperCase() !== expectedBadge.toUpperCase()) {
        divergences.push(`Budget state badge mismatch: expected ${expectedBadge}, got ${budget.stateBadge || 'none'}`);
      }
      if (budget.actionStates.hasGenerateDraft !== expected.actions.draft) {
        divergences.push(`Generate Draft action mismatch for ${state}`);
      }
      if (budget.actionStates.hasTambahManual !== expected.actions.manual) {
        divergences.push(`Tambah Manual action mismatch for ${state}`);
      }
      if (budget.actionStates.hasContinueAction !== expected.actions.cont) {
        divergences.push(`Continue action mismatch for ${state}`);
      }

      if (state === 'STATE_A' && (budget.targetBudget === null || budget.targetBudget <= 0)) {
        divergences.push('Target Budget is unavailable on baseline project; cannot validate A-D semantics reliably');
      }

      rows.push({
        state,
        wbs,
        budget,
        parity,
        divergences,
        screenshots: { wbs: wbsShot, budget: budgetShot },
      });
    }

    const reportPath = path.join(outDir, 'validation-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      projectId,
      generatedAt: new Date().toISOString(),
      rows,
    }, null, 2));

    const allDivergences = rows.flatMap((r) => r.divergences.map((d) => `${r.state}: ${d}`));
    if (allDivergences.length > 0) {
      console.error('Mirror budget runtime divergences found:\n' + allDivergences.join('\n'));
    }

    expect(allDivergences, 'Runtime consistency divergences found').toEqual([]);
  });
});