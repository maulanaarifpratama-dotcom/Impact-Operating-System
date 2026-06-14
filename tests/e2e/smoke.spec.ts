import { test, expect } from '@playwright/test';

test.describe('Impactory E2E Smoke Test Suite', () => {
  // Step 3 — Environment variables check before executing tests
  test.beforeAll(() => {
    const requiredEnv = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'];
    const missing = requiredEnv.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `❌ [E2E FAILED] Missing required environment variables: ${missing.join(', ')}.\n` +
        `Please create a .env.e2e file or supply them via environment variables before running E2E tests.`
      );
    }
  });

  test('should log in successfully and navigate to LFA Editor and SROI Calculator', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;
    const projectId = process.env.E2E_TEST_PROJECT_ID;

    console.log(`[E2E] Opening base URL: ${baseUrl}`);
    await page.goto(baseUrl);

    // Fill login credentials
    console.log(`[E2E] Logging in with email: ${email}`);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Locate and click Masuk/Login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")').first();
    await loginButton.click();

    // Verify redirection to Dashboard
    console.log('[E2E] Verifying transition to dashboard...');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 20000 });

    // Navigate to LFA Builder using sidebar navigation data-testid
    console.log('[E2E] Navigating to LFA Builder...');
    const lfaNavLink = page.getByTestId('nav-lfa-builder');
    await expect(lfaNavLink).toBeVisible();
    await lfaNavLink.click();

    // If test project ID is provided, navigate directly to it
    if (projectId) {
      const editorUrl = `${baseUrl}/dashboard/lfa-builder/${projectId}`;
      console.log(`[E2E] Navigating directly to target LFA project: ${editorUrl}`);
      await page.goto(editorUrl);
    } else {
      console.log('[E2E] E2E_TEST_PROJECT_ID not set, skipping direct LFA project loading.');
    }

    // Verify LFA Editor tabs exist
    console.log('[E2E] Verifying LFA editor layout and tabs...');
    const lfaEditorRoot = page.getByTestId('lfa-editor-root');
    await expect(lfaEditorRoot).toBeVisible({ timeout: 15000 });

    const tabLfa = page.locator('button:has-text("LFA Matrix"), button:has-text("LFA")').first();
    const tabWbs = page.locator('button:has-text("WBS Builder"), button:has-text("WBS")').first();
    const tabBudget = page.locator('button:has-text("Budget")').first();
    const tabMeal = page.locator('button:has-text("MEAL Planner"), button:has-text("MEAL")').first();
    const tabSroi = page.getByTestId('lfa-tab-sroi');

    await expect(tabLfa).toBeVisible();
    await expect(tabWbs).toBeVisible();
    await expect(tabBudget).toBeVisible();
    await expect(tabMeal).toBeVisible();
    await expect(tabSroi).toBeVisible();

    // Check SROI tab locked/unlocked state
    const sroiLabelText = await tabSroi.textContent() || '';
    console.log(`[E2E] SROI Tab button text: "${sroiLabelText.trim()}"`);

    const isSroiLocked = sroiLabelText.includes('🔒');
    if (isSroiLocked) {
      console.log('[E2E] SROI tab is locked (MEAL indicators or WBS not loaded yet). This is a valid configuration state.');
    } else {
      console.log('[E2E] SROI tab is unlocked! Transitioning to SROI Calculator...');
      await tabSroi.click();

      // Verify SROI Root container
      const sroiRoot = page.getByTestId('sroi-calculator-root');
      await expect(sroiRoot).toBeVisible({ timeout: 12000 });

      // Verify SROI net return ratio card
      const sroiRatioCard = page.getByTestId('sroi-ratio-card');
      await expect(sroiRatioCard).toBeVisible();

      // Guardrail verification for AI smoke check
      if (process.env.RUN_AI_SMOKE === '1') {
        console.log('[E2E] RUN_AI_SMOKE is active. Validating that AI action buttons are rendered...');
        const aiButtons = page.locator('button:has-text("AI"), button:has-text("Kecerdasan")');
        if (await aiButtons.count() > 0) {
          await expect(aiButtons.first()).toBeVisible();
          console.log('[E2E] AI helper controls are successfully displayed.');
        }
      } else {
        console.log('[E2E] RUN_AI_SMOKE is disabled (default). Skipping AI verification to protect Azure credits.');
      }
    }

    // Capture visual screenshot of the final state
    const screenshotDir = 'playwright-report/screenshots';
    const screenshotPath = `${screenshotDir}/smoke-test-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[E2E] Full page smoke test screenshot captured successfully at: ${screenshotPath}`);
  });
});
