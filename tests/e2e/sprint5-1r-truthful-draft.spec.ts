import { test, expect } from '@playwright/test';

test.describe('Impactory Sprint 5.1R — Truthful Draft & Flow Preservation E2E Tests', () => {
  const projectId = 'd392baac-7845-40d4-bb47-16d2d8d4bbb8';
  const lfaProjectId = '05a1d79a-4165-40e3-b4fc-61d5de704461';

  test.beforeAll(() => {
    const requiredEnv = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'];
    const missing = requiredEnv.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`❌ Missing E2E variables: ${missing.join(', ')}`);
    }
  });

  test('should verify proposal routing, MEAL completeness, Budget, and SROI semantics', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;

    // Set up console and error listeners
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

    // 1. Log in
    console.log(`[E2E] Logging in at: ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);

    const passwordTab = page.locator('button:has-text("Password")').first();
    await expect(passwordTab).toBeVisible({ timeout: 15000 });
    await passwordTab.click();

    await page.locator('#p-email').fill(email);
    await page.locator('#p-password').fill(password);
    await page.locator('button[type="submit"]:has-text("Masuk")').first().click();

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('[E2E] Login successful!');

    // 2. Proposal Routing Redirection Test
    console.log(`[E2E] Navigating to direct grant route for active proposal: /dashboard/grant-writer/${projectId}`);
    await page.goto(`${baseUrl}/dashboard/grant-writer/${projectId}`);

    // Expect automatic redirect to proposal view page
    console.log('[E2E] Expecting redirect to proposal view page...');
    await page.waitForURL(`**/dashboard/grant-writer/${projectId}/proposal`, { timeout: 15000 });
    expect(page.url()).toContain(`/dashboard/grant-writer/${projectId}/proposal`);
    console.log('[E2E] Proposal redirect successful!');

    // 3. Navigate to LFA Builder for MEAL, Budget, and SROI Verification
    console.log(`[E2E] Navigating to LFA Builder: /dashboard/lfa-builder/${lfaProjectId}`);
    await page.goto(`${baseUrl}/dashboard/lfa-builder/${lfaProjectId}`);

    // --- MEAL TAB VERIFICATION ---
    console.log('[E2E] Opening MEAL Planner Tab...');
    await page.click('button:has-text("④ MEAL Planner")');
    
    // Check that we render elements and have some state
    const mealTable = page.locator('table').first();
    await expect(mealTable).toBeVisible({ timeout: 10000 });
    console.log('[E2E] MEAL Planner metrics and table verified.');

    // --- BUDGET TAB VERIFICATION ---
    console.log('[E2E] Opening Budget Tab...');
    await page.click('button:has-text("③ Budget")');

    // Verify unallocated amount, percentages and states
    const budgetBanner = page.locator('text=Pagu Proposal vs Itemized RAB').first();
    await expect(budgetBanner).toBeVisible({ timeout: 10000 });
    
    const unallocatedText = page.locator('text=Belum Dialokasikan').first();
    await expect(unallocatedText).toBeVisible();

    const percentageText = page.locator('text=0,64%').first();
    await expect(percentageText).toBeVisible();

    const partialStateText = page.locator('text=RAB masih berupa draf sebagian').first();
    await expect(partialStateText).toBeVisible();
    console.log('[E2E] Budget reconciliation banner verified successfully!');

    // --- SROI TAB VERIFICATION ---
    console.log('[E2E] Opening SROI Calculator Tab...');
    await page.click('button:has-text("⑤ SROI Calculator")');

    // Verify general SROI header metadata (visible in both modes)
    const planningBadge = page.locator('text=SROI PLANNING / DRAFT CANDIDATES').first();
    await expect(planningBadge).toBeVisible({ timeout: 10000 });

    const planningWarning = page.locator('text=SROI PLANNING & DRAFT CANDIDATES MODE ACTIVE').first();
    await expect(planningWarning).toBeVisible();

    // Verify Professional Mode elements (active by default for this project)
    console.log('[E2E] Verifying SROI Professional Mode default layout and cards...');
    const envelopeLabel = page.locator('text=Proposal Funding Envelope (Pagu Proposal)').first();
    await expect(envelopeLabel).toBeVisible();

    const rabContextAmount = page.locator('text=RAB terinci saat ini:').first();
    await expect(rabContextAmount).toBeVisible();

    const rabContextPercent = page.locator('text=Kelengkapan rincian RAB:').first();
    await expect(rabContextPercent).toBeVisible();

    // Toggle SROI view to Simple Mode
    console.log('[E2E] Switching SROI to Simple Wizard Mode...');
    await page.click('button:has-text("Simple Wizard")');

    // Verify Simple Mode elements (such as speedometer)
    const draftSroiState = page.locator('text=Rancangan SROI — perlu validasi').first();
    await expect(draftSroiState).toBeVisible();
    console.log('[E2E] SROI Simple Mode elements verified!');

    // Toggle SROI view back to Professional Mode to restore initial view state
    console.log('[E2E] Switching SROI back to Professional Mode...');
    await page.click('button:has-text("🏢 Profesional")');

    console.log('[E2E] SROI planning mode and source semantics verified successfully in both modes!');
  });
});
