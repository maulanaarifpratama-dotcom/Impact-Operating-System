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

    const baseUrl = 'http://localhost:8080';
    const email = 'info@bisabaik.or.id';
    const password = 'metaproject123';
    const projectTitle = 'E2E P0-B Real Azure Canonical LFA 2026-07-22';

    // Resolve Supabase configs
    const { supabaseUrl, supabaseKey } = getEnvVars();

    // Log console and browser errors
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

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

    // Click "Mulai mode Quick" to open Create Project dialog
    const mulaiQuickBtn = page.locator('button:has-text("Mulai mode Quick")').first();
    await expect(mulaiQuickBtn).toBeVisible({ timeout: 20000 });
    await mulaiQuickBtn.click();

    // Check project title input in Dialog
    const titleInput = page.locator('#project-title').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(projectTitle);

    // Click "Buat proyek"
    const submitCreateBtn = page.locator('button:has-text("Buat proyek")').first();
    await submitCreateBtn.click();

    // Wait for redirection to Quick Wizard
    await page.waitForURL(/.*grant-writer\/quick\/.*/, { timeout: 30000 });
    const quickUrl = page.url();
    const realProjId = quickUrl.split('/quick/')[1];
    console.log(`[E2E-REAL-AZURE] Project created! ID: ${realProjId}`);

    // Helper to transition steps
    const clickLanjutToStep = async (targetSelector: string, stepName: string) => {
      console.log(`[E2E-REAL-AZURE] Transitioning to ${stepName} by clicking Lanjut...`);
      const btn = page.locator('#wizard-lanjut-btn').first();
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.locator(targetSelector).waitFor({ state: 'visible', timeout: 10000 });
    };

    // --- STEP 1: Info Organisasi ---
    console.log('[E2E-REAL-AZURE] Filling Step 1: Info Organisasi...');
    await page.locator('#org-name').fill('Yayasan Rumah Pembangunan Berkelanjutan');
    await page.locator('button:has-text("Pilih jenis")').first().click();
    await page.locator('[role="option"]:has-text("Yayasan")').first().click();
    await page.locator('#org-year').fill('2015');
    await page.locator('button:has-text("SDG 8")').first().click();

    await clickLanjutToStep('#prog-title', 'Step 2: Deskripsi Program');

    // --- STEP 2: Deskripsi Program ---
    console.log('[E2E-REAL-AZURE] Filling Step 2: Deskripsi Program...');
    const titleVal = await page.locator('#prog-title').inputValue();
    if (!titleVal) {
      await page.locator('#prog-title').fill(projectTitle);
    }
    await page.locator('button:has-text("Pilih sektor")').first().click();
    await page.locator('[role="option"]:has-text("Pemberdayaan Ekonomi")').first().click();
    await page.locator('#prog-donor').fill('International Coffee Fund');
    await page.locator('button:has-text("Pilih standar donor")').first().click();
    await page.locator('[role="option"]:has-text("UN / OECD-DAC")').first().click();
    await page.locator('#prog-partners').fill('Koperasi Kopi Garut Sejahtera, Dinas Koperasi UMKM Garut, dan local digital e-commerce enablers.');
    await page.locator('#prog-bg').fill('Petani kopi muda di Garut menghadapi hambatan besar dalam memasarkan produk mereka secara langsung ke konsumen dan eksportir. Rantai distribusi konvensional yang terlalu panjang merugikan profitabilitas mereka secara masif.');
    await page.locator('#prog-problem').fill('Petani kopi muda di Garut kesulitan bersaing karena pemasaran konvensional dan rantai pasok panjang yang memotong laba mereka.');
    await page.locator('#prog-sol').fill('Sensus koordinat GPS lahan petani, pembuatan dashboard web koperasi, dan pelatihan toko online/marketplace.');
    await page.locator('#prog-out').fill('Meningkatnya pendapatan petani kopi muda minimal 30% dalam waktu 24 bulan melalui digitalisasi koperasi dan toko online.');

    await clickLanjutToStep('#ben-count', 'Step 3: Target & Anggaran');

    // --- STEP 3: Target & Anggaran ---
    console.log('[E2E-REAL-AZURE] Filling Step 3: Target & Anggaran...');
    await page.locator('#ben-count').fill('300');
    await page.locator('#geo').fill('Kabupaten Garut');
    await page.locator('#ben-desc').fill('300 petani kopi muda');
    await page.locator('#dur').fill('24');
    await page.locator('#budget').fill('2500000000');
    await page.locator('#break').fill('- Sensus & Pemetaan: 30%\n- Pelatihan & Koperasi: 50%\n- Admin & MEAL: 20%');

    await clickLanjutToStep('text=Semua bagian sudah lengkap.', 'Step 4: Generate Proposal');

    // --- STEP 4: Generate Proposal ---
    console.log('[E2E-REAL-AZURE] Verifying Step 4: Summary & Generate...');
    const generateAiBtn = page.locator('button:has-text("Buat Proposal (AI)")').first();
    await expect(generateAiBtn).toBeVisible();
    
    // Trigger real Azure execution!
    await generateAiBtn.click();
    console.log('[E2E-REAL-AZURE] CLICKED GENERATE! Waiting for remote Azure OpenAI Foundry to complete and local validateProgramSkeleton to execute...');

    // Wait for the redirection to `/dashboard/grant-writer/[projectId]/proposal`
    await page.waitForURL(/.*\/proposal$/, { timeout: 500000 });
    const proposalUrl = page.url();
    console.log(`[E2E-REAL-AZURE] Success! Redirection completed. URL: ${proposalUrl}`);

    // Retrieve and log Project ID and Document ID
    const generatedProjId = proposalUrl.split('/grant-writer/')[1].split('/proposal')[0];
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
    console.log('[E2E-REAL-AZURE] Clicked Materialisasikan Sekarang!');

    // Wait for the redirection button to workspace
    const openWorkspaceBtn = page.locator('a:has-text("Buka Program Workspace")').first();
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 60000 });
    console.log('[E2E-REAL-AZURE] Materialization success!');

    await openWorkspaceBtn.click();
    await page.waitForURL(/.*lfa-builder.*/, { timeout: 20000 });
    console.log('[E2E-REAL-AZURE] Successfully navigated to LFA Builder.');

    await page.waitForTimeout(5000);
    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('petani');
    console.log('[E2E-REAL-AZURE] Verified LFA Builder renders live content successfully.');

    await page.screenshot({ path: 'playwright-report/sprint5-real-azure-p0b-materialize-success.png', fullPage: true });
    console.log('[E2E-REAL-AZURE] All E2E checks passed perfectly!');
  });
});
