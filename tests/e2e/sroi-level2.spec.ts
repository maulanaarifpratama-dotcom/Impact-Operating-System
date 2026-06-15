import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Impactory E2E Level 2 SROI Smoke Test Suite', () => {
  test.beforeAll(() => {
    const requiredEnv = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'];
    const missing = requiredEnv.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `❌ [E2E FAILED] Missing required environment variables: ${missing.join(', ')}.\n` +
        `Please make sure .env.e2e is configured.`
      );
    }
  });

  test('should execute Level 2 SROI unlock and validation flow', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;
    const projectId = '240c87a4-9b25-417e-96cc-4b00e7592d19';

    // Set up console and error listeners
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    console.log(`[E2E] Opening login page: ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);

    // Click on Password tab if present
    const passwordTab = page.locator('button:has-text("Password")').first();
    await expect(passwordTab).toBeVisible({ timeout: 15000 });
    await passwordTab.click();

    // Fill credentials
    await page.locator('#p-email').fill(email);
    await page.locator('#p-password').fill(password);

    // Submit
    const loginSubmitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();
    await loginSubmitBtn.click();

    // Wait for redirect
    await page.waitForURL(/(dashboard|onboarding)/, { timeout: 30000 });
    console.log('[E2E] Logged in successfully!');

    // Handle onboarding if redirected there
    const isOnboarding = page.url().includes('/onboarding');
    if (isOnboarding) {
      console.log('[E2E] Onboarding page detected. Filling details...');
      await expect(page.locator('#o-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#o-name').fill('E2E Test Org');
      await page.locator('#o-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan")').first().click();
      await page.locator('#o-size').click();
      await page.locator('[role="option"]:has-text("1-5")').first().click();

      const onboardingSubmitBtn = page.locator('button[type="submit"]:has-text("Mulai Gunakan Impactory")').first();
      await onboardingSubmitBtn.click();
      await page.waitForURL(/.*dashboard.*/, { timeout: 25000 });
      console.log('[E2E] Onboarding completed!');
    }

    // Direct navigation to the target E2E project
    const targetUrl = `${baseUrl}/dashboard/lfa-builder/${projectId}`;
    console.log(`[E2E] Navigating directly to project URL: ${targetUrl}`);
    await page.goto(targetUrl);

    // Verify LFA Editor is loaded
    console.log('[E2E] Verifying LFA Editor load...');
    const lfaEditorRoot = page.locator('[data-testid="lfa-editor-root"], button:has-text("LFA Matrix"), button:has-text("LFA")').first();
    await expect(lfaEditorRoot).toBeVisible({ timeout: 25000 });

    // Identify robust tab locators
    const tabWbs = page.locator('[data-testid="lfa-tab-wbs"], button:has-text("WBS Builder"), button:has-text("WBS")').first();
    const tabMeal = page.locator('[data-testid="lfa-tab-meal"], button:has-text("MEAL Planner"), button:has-text("MEAL")').first();
    const tabSroi = page.locator('[data-testid="lfa-tab-sroi"], button:has-text("SROI")').first();

    await expect(tabWbs).toBeVisible({ timeout: 10000 });
    await expect(tabMeal).toBeVisible({ timeout: 10000 });
    await expect(tabSroi).toBeVisible({ timeout: 10000 });

    // Check if WBS Tab is locked
    const wbsText = await tabWbs.textContent() || '';
    console.log(`[E2E] WBS Tab button text: "${wbsText.trim()}"`);
    const isWbsLocked = wbsText.includes('🔒');

    let wbsFoundOrCreated = 'found';
    let mealFoundOrCreated = 'found';

    if (isWbsLocked) {
      console.log('[E2E] WBS Builder is locked. Filling LFA Matrix (Dampak, Tujuan, Hasil, Kegiatan) to 100% completion...');

      // 1. Fill Goal Description
      console.log('[E2E] Filling Goal Description...');
      const goalTextarea = page.locator('textarea[placeholder*="pernyataan dampak"], textarea[placeholder*="Dampak"]').first();
      await expect(goalTextarea).toBeVisible({ timeout: 10000 });
      await goalTextarea.fill('E2E Goal: Mengurangi tingkat putus sekolah anak-anak di daerah marginal.');
      await goalTextarea.blur();

      // 2. Fill Purpose Description
      console.log('[E2E] Filling Purpose Description...');
      const purposeTextarea = page.locator('textarea[placeholder*="pernyataan tujuan"], textarea[placeholder*="Tujuan"]').first();
      await expect(purposeTextarea).toBeVisible({ timeout: 10000 });
      await purposeTextarea.fill('E2E Purpose: Meningkatkan partisipasi belajar dan motivasi anak sekolah.');
      await purposeTextarea.blur();

      // 3. Ensure Output exists and Fill its description
      console.log('[E2E] Checking Output...');
      const outputTextarea = page.locator('textarea[placeholder*="output terukur"], textarea[placeholder*="Output"]').first();
      const hasOutput = await outputTextarea.isVisible();
      if (!hasOutput) {
        console.log('[E2E] No Outputs found, creating one...');
        const addOutputBtn = page.locator('button:has-text("Tambah Hasil"), button:has-text("Buat Hasil")').first();
        await addOutputBtn.click();
        await expect(outputTextarea).toBeVisible({ timeout: 10000 });
      }
      await outputTextarea.fill('E2E Output: Modul bimbingan belajar alternatif untuk anak-anak.');
      await outputTextarea.blur();

      // Ensure Output Indicator is set so MEAL auto-imports it correctly
      console.log('[E2E] Filling Output Indicator...');
      const outputIndicatorInput = page.locator('input[placeholder*="Terlatihnya 100 kader"], input[placeholder*="Indikator"]').first();
      await expect(outputIndicatorInput).toBeVisible({ timeout: 10000 });
      await outputIndicatorInput.fill('1 bimbingan belajar aktif dengan 20 peserta.');
      await outputIndicatorInput.blur();

      // 4. Ensure Activity exists and Fill its description
      console.log('[E2E] Checking Activity...');
      const activityInput = page.locator('input[placeholder*="Tuliskan aksi kegiatan"]').first();
      const hasActivity = await activityInput.isVisible();
      if (!hasActivity) {
        console.log('[E2E] No Activities found, creating one...');
        const addActivityBtn = page.locator('button:has-text("Tambah Kegiatan")').first();
        await addActivityBtn.click();
        await expect(activityInput).toBeVisible({ timeout: 10000 });
      }
      await activityInput.fill('E2E Activity: Menyusun modul bimbingan belajar mingguan.');
      await activityInput.blur();

      // Wait for debounce autosave
      console.log('[E2E] Waiting 5 seconds for LFA matrix database autosave to fully commit...');
      await page.waitForTimeout(5000);

      // Reload page to ensure the freshly populated data is loaded and tab-locking states are recalculated
      console.log('[E2E] Reloading page to update tab states...');
      await page.reload();
      await expect(lfaEditorRoot).toBeVisible({ timeout: 25000 });
    }

    // Verify WBS Tab is now unlocked
    const tabWbsAfter = page.locator('[data-testid="lfa-tab-wbs"], button:has-text("WBS Builder"), button:has-text("WBS")').first();
    const wbsTextAfter = await tabWbsAfter.textContent() || '';
    console.log(`[E2E] WBS Tab button text after fill: "${wbsTextAfter.trim()}"`);
    expect(wbsTextAfter).not.toContain('🔒');

    // Open WBS tab to trigger auto-import
    console.log('[E2E] Opening WBS Builder tab to trigger LFA-to-WBS auto-import...');
    await tabWbsAfter.click();
    const wbsRoot = page.locator('[data-testid="wbs-builder-root"], input[placeholder*="aktivitas"], button[title*="Sub-aktivitas"]').first();
    await expect(wbsRoot).toBeVisible({ timeout: 15000 });

    console.log('[E2E] WBS opened. Waiting 4 seconds for WBS auto-import database commit...');
    await page.waitForTimeout(4000);
    wbsFoundOrCreated = 'created';

    // Open MEAL tab to trigger auto-import
    console.log('[E2E] Opening MEAL Planner tab to trigger LFA-to-MEAL auto-import...');
    await tabMeal.click();
    const mealRoot = page.locator('[data-testid="meal-planner-root"], textarea[placeholder*="indikator"], button:has-text("Tambah Indikator")').first();
    await expect(mealRoot).toBeVisible({ timeout: 15000 });

    console.log('[E2E] MEAL opened. Waiting 4 seconds for MEAL auto-import database commit...');
    await page.waitForTimeout(4000);
    mealFoundOrCreated = 'created';

    // Reload page to ensure everything synchronizes perfectly and SROI locks are recalculated
    console.log('[E2E] Reloading page to finalize tab states and SROI unlock...');
    await page.reload();
    await expect(lfaEditorRoot).toBeVisible({ timeout: 25000 });

    // Verify SROI Tab is unlocked
    const tabSroiAfter = page.locator('[data-testid="lfa-tab-sroi"], button:has-text("SROI")').first();
    await expect(tabSroiAfter).toHaveText(/SROI Calculator/, { timeout: 15000 });
    await expect(tabSroiAfter).not.toContainText('🔒', { timeout: 15000 });

    // Open SROI tab
    console.log('[E2E] Opening SROI tab...');
    await tabSroiAfter.click();

    // Verify SROI Elements Rendered
    const sroiRoot = page.locator('[data-testid="sroi-calculator-root"], div:has-text("Rasio Return Sosial")').first();
    await expect(sroiRoot).toBeVisible({ timeout: 15000 });

    const sroiRatioCard = page.locator('[data-testid="sroi-ratio-card"], div:has-text("Rasio Return Sosial (SROI)")').first();
    const hasRatioCard = await sroiRatioCard.isVisible();
    if (hasRatioCard) {
      console.log('[E2E] SROI Ratio card is successfully visible!');
      const ratioText = await sroiRatioCard.innerText();
      console.log(`[E2E] Ratio Card Content:\n${ratioText}`);
    } else {
      console.log('[E2E] SROI Ratio card is not visible, verifying standard root renders...');
    }

    // Verify NO NaN/Infinity is displayed
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('Infinity');
    console.log('[E2E] Verified: No NaN or Infinity visible on page.');

    // Capture screenshot artifact (in git-ignored playwright-report)
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report');
    }
    const screenshotPath = 'playwright-report/smoke-test-sroi-success.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[E2E] Visual screenshot captured successfully at: ${screenshotPath}`);

    // Report additional outputs
    console.log(`RESULT_WBS:${wbsFoundOrCreated}`);
    console.log(`RESULT_MEAL:${mealFoundOrCreated}`);
    console.log(`RESULT_SROI_UNLOCKED:unlocked_by_test`);
    console.log('RESULT_STATUS:PASS');
  });
});
