import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Helper to load env vars
const getEnvVars = () => {
  let supabaseUrl = process.env.VITE_SUPABASE_URL;
  let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    try {
      const envContent = fs.readFileSync('c:/Users/maula/.gemini/antigravity/scratch/impactory/.env', 'utf8');
      const getEnvVar = (name: string) => {
        const match = envContent.match(new RegExp(`${name}=(.*)`));
        return match ? match[1].trim() : null;
      };
      supabaseUrl = supabaseUrl || getEnvVar('VITE_SUPABASE_URL') || undefined;
      supabaseKey = supabaseKey || getEnvVar('VITE_SUPABASE_ANON_KEY') || undefined;
    } catch (e) {
      console.warn('Could not read .env file', e);
    }
  }

  return {
    supabaseUrl: supabaseUrl || 'https://uncsvkvkaijzydndyutp.supabase.co',
    supabaseKey: supabaseKey || ''
  };
};

test.describe('Real Azure OpenAI P0-B Generation & Downstream Materialization', () => {
  
  test('should run real Azure OpenAI generation for P0-B and verify output', async ({ page }) => {
    // Increase test timeout to 10 minutes for real Azure OpenAI call
    test.setTimeout(600000);

    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
    const email = process.env.E2E_USER_EMAIL || 'test@example.com';
    const password = process.env.E2E_USER_PASSWORD || '';
    const projectTitle = 'E2E P0-B Real Azure Canonical LFA 2026-07-22';

    // Resolve Supabase configs
    const { supabaseUrl, supabaseKey } = getEnvVars();

    // Log console and browser errors
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    // supabase-js surfaces a bare FunctionsHttpError with no body, which is
    // useless when the generation fails. Capture the real response instead.
    page.on('response', async (res) => {
      if (!res.url().includes('grant-writer-generate')) return;
      console.log(`[EDGE] grant-writer-generate -> HTTP ${res.status()}`);
      if (res.status() >= 400) {
        console.log(`[EDGE] body: ${(await res.text().catch(() => '<unreadable>')).slice(0, 600)}`);
      }
    });

    // 1. Clean up any existing project with this name first to ensure clean execution
    console.log(`[E2E-REAL-AZURE] Pre-run cleanup of project: "${projectTitle}"`);
    
    // Log in via UI
    console.log(`[E2E-REAL-AZURE] Navigating to: ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);

    const passwordTab = page.locator('button:has-text("Password")').first();
    await expect(passwordTab).toBeVisible({ timeout: 15000 });
    await passwordTab.click();

    await page.locator('#p-email').fill(email);
    await page.locator('#p-password').fill(password);

    const loginSubmitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();
    await loginSubmitBtn.click();

    await page.waitForURL(/(dashboard|onboarding)/, { timeout: 30000 });
    console.log(`[E2E-REAL-AZURE] Login successful. URL: ${page.url()}`);

    // Cleanup old projects via evaluated code in the browser context (using user's active session)
    await page.evaluate(async ({ anonKey, supabaseUrl, title }) => {
      let token = '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          token = authData.access_token;
          break;
        }
      }
      if (!token) return;

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const findRes = await fetch(`${supabaseUrl}/rest/v1/gw_projects?title=eq.${encodeURIComponent(title)}&select=id`, { headers });
      const oldProjs = await findRes.json();
      if (Array.isArray(oldProjs)) {
        for (const op of oldProjs) {
          console.log('Cleaning up old document/project with ID:', op.id);
          await fetch(`${supabaseUrl}/rest/v1/gw_lfa_documents?project_id=eq.${op.id}`, { method: 'DELETE', headers });
          await fetch(`${supabaseUrl}/rest/v1/gw_projects?id=eq.${op.id}`, { method: 'DELETE', headers });
        }
      }
    }, { anonKey: supabaseKey, supabaseUrl, title: projectTitle });

    await page.goto(`${baseUrl}/dashboard/grant-writer`);
    await page.waitForURL(/.*grant-writer$/, { timeout: 20000 });

    // "Program Baru" creates the project and opens the Blueprint Studio in one
    // step. It used to raise a title dialog first; that was removed
    // deliberately (see GW-UX-02B in GrantWriterIndex.test.tsx), and this test
    // was still waiting for the dialog's #project-title. The title is set in
    // Step 2 below instead.
    const mulaiQuickBtn = page.locator('button:has-text("Program Baru")').first();
    await expect(mulaiQuickBtn).toBeVisible({ timeout: 20000 });
    await mulaiQuickBtn.click();

    // Wait for redirection to Quick Wizard
    await page.waitForURL(/.*grant-writer\/quick\/.*/, { timeout: 30000 });
    const quickUrl = page.url();
    const realProjId = quickUrl.split('/quick/')[1];
    console.log(`[E2E-REAL-AZURE] Project created! ID: ${realProjId}`);

    // ---------------------------------------------------------------------
    // Program Blueprint Studio (the "provisional" wizard).
    //
    // This test used to drive the four-step Legacy wizard — #org-name,
    // #prog-title, #wizard-lanjut-btn and a "Buat Proposal (AI)" button. That
    // wizard is no longer what the route renders: GrantWriterQuickWizard now
    // returns GrantWriterQuickWizardProvisional, whose fields and flow are
    // entirely different, so every locator below the login step was pointing at
    // markup that had not existed for some time.
    //
    // The shape now is: fill the programme facts, submit for a deterministic
    // blueprint built from the ontology layer, approve it, and only then does
    // materialisation call Azure with that ontology context attached.
    // ---------------------------------------------------------------------

    console.log('[E2E-REAL-AZURE] Page 1 — programme facts...');
    await page.locator('#program-title').fill(projectTitle);
    await page.locator('#program-story').fill(
      'Petani kopi muda di Kabupaten Garut kesulitan bersaing karena rantai pasok ' +
      'konvensional yang panjang memotong margin mereka. Program ini melakukan sensus ' +
      'koordinat GPS lahan, membangun dashboard koperasi digital, dan melatih petani ' +
      'berjualan langsung lewat marketplace, sehingga pendapatan mereka naik minimal ' +
      '30% dalam 24 bulan.',
    );
    await page.locator('#program-geography').fill('Kabupaten Garut, Jawa Barat');
    await page.locator('#beneficiary-count').fill('300');
    await page.locator('#beneficiary-description').fill(
      '300 petani kopi muda berusia 15-24 tahun, memprioritaskan perempuan pemroses pasca panen.',
    );
    await page.locator('#program-duration').fill('24');
    await page.locator('#budget-idr').fill('2500000000');

    // Submit is gated on the story and the beneficiary description.
    const reviewBtn = page.locator('button:has-text("Tinjau Program Blueprint")').first();
    await expect(reviewBtn).toBeEnabled({ timeout: 10000 });
    await reviewBtn.click();
    console.log('[E2E-REAL-AZURE] Submitted — waiting for the deterministic blueprint...');

    // --- Page 2: review the blueprint the ontology layer produced ----------
    await expect(page.locator('[data-testid="blueprint-status-card"]')).toBeVisible({ timeout: 120000 });
    await expect(page.locator('[data-testid="canonical-fact-banner"]')).toBeVisible({ timeout: 30000 });
    console.log('[E2E-REAL-AZURE] Blueprint rendered. Canonical facts:');
    for (const id of ['fact-program', 'fact-lokasi', 'fact-sasaran']) {
      const fact = page.locator(`[data-testid="${id}"]`).first();
      if (await fact.isVisible().catch(() => false)) {
        console.log(`  ${id}: ${(await fact.innerText()).replace(/\s+/g, ' ').trim()}`);
      }
    }

    // Nothing should be blocking approval.
    await expect(page.locator('[data-testid="empty-payload-approval-blocker"]')).toHaveCount(0);

    const approveBtn = page.locator('[data-testid="approve-blueprint-btn"]').first();
    await expect(approveBtn).toBeVisible({ timeout: 30000 });
    await approveBtn.click();
    console.log('[E2E-REAL-AZURE] Blueprint approved — Azure generation starts now.');

    // --- Materialisation: the real Azure call, with ontology context -------
    await expect(page.locator('[data-testid="materialization-screen"]')).toBeVisible({ timeout: 60000 });
    console.log('[E2E-REAL-AZURE] Materialisation running. Waiting for Azure Foundry...');

    // It either navigates on its own or parks on a confirmation card; accept both.
    const transitionBtn = page.locator('[data-testid="continue-to-lfa-btn"]').first();
    await Promise.race([
      page.waitForURL(/\/dashboard\/lfa-builder\/[a-f0-9-]+/, { timeout: 500000 }),
      transitionBtn.waitFor({ state: 'visible', timeout: 500000 }),
    ]);
    if (await transitionBtn.isVisible().catch(() => false)) {
      console.log('[E2E-REAL-AZURE] Transition card shown — continuing to the LFA matrix.');
      await transitionBtn.click();
    }
    await page.waitForURL(/\/dashboard\/lfa-builder\/[a-f0-9-]+/, { timeout: 60000 });

    const generatedProjId = page.url().match(/lfa-builder\/([a-f0-9-]+)/)?.[1] ?? '';
    expect(generatedProjId, 'no project id in the LFA builder URL').not.toBe('');
    console.log(`[E2E-REAL-AZURE] Materialised project: ${generatedProjId}`);
    console.log(`[E2E-REAL-AZURE] Successfully generated Project ID: ${generatedProjId}`);

    // Read the document ID from the database using page context
    const generatedDocId = await page.evaluate(async ({ projectId, anonKey, supabaseUrl }) => {
      let token = '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          token = authData.access_token;
          break;
        }
      }
      if (!token) return 'error-no-token';

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${supabaseUrl}/rest/v1/gw_lfa_documents?project_id=eq.${projectId}&is_current=eq.true&select=id,matrix`, { headers });
      const data = await res.json();
      return {
        id: data[0]?.id,
        skeleton: data[0]?.matrix?.program_skeleton
      };
    }, { projectId: generatedProjId, anonKey: supabaseKey, supabaseUrl });

    console.log(`[E2E-REAL-AZURE] Saved Document ID: ${generatedDocId.id}`);
    console.log(`[E2E-REAL-AZURE] Saved Skeleton JSON:`, JSON.stringify(generatedDocId.skeleton, null, 2));

    // Verify skeleton contents
    const skeleton = generatedDocId.skeleton;
    expect(skeleton).toBeDefined();
    expect(skeleton.schemaVersion).toBe('2.0');
    expect(skeleton.lfa).toBeDefined();
    expect(skeleton.lfa.outputs).toBeDefined();
    expect(skeleton.lfa.outputs.length).toBeGreaterThan(0);

    // Verify every single output has nested activities
    for (const output of skeleton.lfa.outputs) {
      console.log(`[E2E-REAL-AZURE-VALIDATION] Checking Output: "${output.statement}"`);
      expect(output.activities).toBeDefined();
      expect(output.activities.length).toBeGreaterThan(0);
      for (const act of output.activities) {
        const actTitle = act.title || act.statement;
        console.log(`  - Nested Activity: "${actTitle}" (${act.id})`);
        expect(actTitle).toBeDefined();
        expect(actTitle.trim().length).toBeGreaterThan(0);
      }
    }

    // Verify WBS links point to Output IDs
    expect(skeleton.wbs).toBeDefined();
    expect(skeleton.wbs.tasks).toBeDefined();
    for (const task of skeleton.wbs.tasks) {
      if (task.level === 1) {
        console.log(`[E2E-REAL-AZURE-VALIDATION] WBS Task Level 1: "${task.title}" -> sourceActivityId: "${task.sourceActivityId}"`);
        const outputIds = skeleton.lfa.outputs.map((o: any) => o.id);
        expect(outputIds).toContain(task.sourceActivityId);
      }
    }

    // Capture visual screenshot as official proof
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report');
    }
    await page.screenshot({ path: 'playwright-report/sprint5-real-azure-p0b-generate-success.png', fullPage: true });
    console.log('[E2E-REAL-AZURE] Generation screenshot captured.');

    // Click "Materialisasikan Sekarang"
    const materializeBtn = page.locator('button:has-text("Materialisasikan Sekarang")').first();
    await expect(materializeBtn).toBeVisible();
    await materializeBtn.click();
    console.log('[E2E-REAL-AZURE] Clicked Materialisasikan Sekarang! Waiting for direct redirection to LFA Builder...');

    // Wait for the direct redirection to LFA Builder workspace
    await page.waitForURL(/.*lfa-builder.*/, { timeout: 60000 });
    console.log('[E2E-REAL-AZURE] Successfully navigated directly to LFA Builder. URL:', page.url());

    await page.waitForTimeout(5000);
    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('petani');
    console.log('[E2E-REAL-AZURE] Verified LFA Builder renders live content successfully.');

    await page.screenshot({ path: 'playwright-report/sprint5-real-azure-p0b-materialize-success.png', fullPage: true });
    console.log('[E2E-REAL-AZURE] All E2E checks passed perfectly!');
  });
});
