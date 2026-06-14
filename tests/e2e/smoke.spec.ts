import { test, expect } from '@playwright/test';

test.describe('Impactory E2E Smoke Test Suite', () => {
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

  test('should sign up, onboard, navigate to LFA Builder, create project and verify SROI tab', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;

    console.log(`[E2E] Opening base URL signup page: ${baseUrl}/signup`);
    await page.goto(`${baseUrl}/signup`);

    // Fill signup credentials
    console.log(`[E2E] Trying signup with email: ${email}`);
    await expect(page.locator('#s-name')).toBeVisible({ timeout: 15000 });
    await page.locator('#s-name').fill('E2E Test User');
    await page.locator('#s-email').fill(email);
    await page.locator('#s-password').fill(password);

    // Select role
    await page.locator('#s-role').click();
    await page.locator('[role="option"]:has-text("Yayasan"), [role="option"]:has-text("Foundation"), [role="option"]').first().click();

    // Click submit button
    const signupSubmitBtn = page.locator('button[type="submit"]:has-text("Daftar gratis")').first();
    await signupSubmitBtn.click();

    console.log('[E2E] Waiting for signup response or redirect...');
    let signupSucceeded = false;
    let signupBlockedByEmailVerification = false;

    try {
      // Check if redirect to dashboard or onboarding happens
      await page.waitForURL(/(dashboard|onboarding)/, { timeout: 15000 });
      signupSucceeded = true;
    } catch (e) {
      // Check if there is an email confirmation toast or standard feedback toast
      const toastText = page.locator('div:has-text("Cek email"), div:has-text("konfirmasi akun"), div:has-text("email")');
      if (await toastText.count() > 0 && await toastText.first().isVisible()) {
        signupBlockedByEmailVerification = true;
        console.log('[E2E] Signup blocked by email verification.');
      } else {
        console.log('[E2E] Unknown signup state, attempting login fallback anyway.');
      }
    }

    if (signupBlockedByEmailVerification) {
      throw new Error('❌ [E2E BLOCKED] Email verification blocks fake account flow.');
    }

    // Fallback Login if signup did not automatically log us in
    if (!signupSucceeded) {
      console.log('[E2E] Signup did not log in. Trying Login fallback...');
      await page.goto(`${baseUrl}/login`);
      
      // Click on Password tab
      const passwordTab = page.locator('button:has-text("Password")').first();
      await expect(passwordTab).toBeVisible({ timeout: 10000 });
      await passwordTab.click();

      // Fill credentials
      await page.locator('#p-email').fill(email);
      await page.locator('#p-password').fill(password);

      // Submit
      const loginSubmitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();
      await loginSubmitBtn.click();

      // Wait for onboarding or dashboard redirect
      await page.waitForURL(/(dashboard|onboarding)/, { timeout: 20000 });
      console.log('[E2E] Login fallback succeeded!');
    } else {
      console.log('[E2E] Signup/Login phase succeeded!');
    }

    // Handle onboarding if redirected there
    const isOnboarding = page.url().includes('/onboarding');
    if (isOnboarding) {
      console.log('[E2E] Onboarding page detected. Filling out organization details...');
      await expect(page.locator('#o-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#o-name').fill('E2E Test Org');
      
      // Select main sector: Pendidikan
      await page.locator('#o-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan"), span:has-text("Pendidikan")').first().click();

      // Select size: 1-5
      await page.locator('#o-size').click();
      await page.locator('[role="option"]:has-text("1-5"), span:has-text("1-5")').first().click();

      // Click submit
      const onboardingSubmitBtn = page.locator('button[type="submit"]:has-text("Mulai Gunakan Impactory")').first();
      await onboardingSubmitBtn.click();

      // Wait for dashboard navigation
      await page.waitForURL(/.*dashboard.*/, { timeout: 20000 });
      console.log('[E2E] Onboarding completed successfully!');
    }

    // Verify transition to dashboard
    console.log('[E2E] Verifying transition to dashboard...');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 20000 });

    // Navigate to LFA Builder
    console.log('[E2E] Navigating to LFA Builder...');
    const lfaNavLink = page.getByTestId('nav-lfa-builder');
    await expect(lfaNavLink).toBeVisible();
    await lfaNavLink.click();

    // Look for existing E2E Smoke Test Project card
    const targetProjectName = 'E2E Smoke Test Project';
    const projectCard = page.locator('div.cursor-pointer', { has: page.locator(`:text("${targetProjectName}")`) }).first();
    const isProjectFound = await projectCard.isVisible();

    if (isProjectFound) {
      console.log(`[E2E] Found existing project: "${targetProjectName}". Opening it...`);
      await projectCard.click();
    } else {
      console.log(`[E2E] Project "${targetProjectName}" not found. Creating a new one through the UI...`);
      const createBtn = page.locator('button:has-text("Mulai Sekarang"), button:has-text("Mulai dari Nol")').first();
      await createBtn.click();

      // Wait for wizard modal and fill values
      await expect(page.locator('#prog-name')).toBeVisible();
      await page.locator('#prog-name').fill(targetProjectName);
      
      // Select sector 'Pendidikan'
      await page.locator('#prog-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan"), span:has-text("Pendidikan")').first().click();

      // Set locations and beneficiary details
      await page.locator('#prog-loc').fill('Garut, Jawa Barat');
      await page.locator('#prog-bendesc').fill('Automated E2E smoke test project. Safe to edit/delete.');

      // Submit creation
      const submitBtn = page.locator('button:has-text("Buat Program")').first();
      await submitBtn.click();
    }

    // Wait for the workspace editor to load and extract project ID
    console.log('[E2E] Waiting for LFA Editor to load...');
    await page.waitForURL(/\/dashboard\/lfa-builder\/[a-f0-9-]+/, { timeout: 30000 });
    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/dashboard\/lfa-builder\/([a-f0-9-]+)/);
    const projectId = projectIdMatch ? projectIdMatch[1] : 'unknown';
    console.log(`[E2E] Active Project ID: ${projectId}`);

    // Verify LFA Editor tabs exist
    console.log('[E2E] Verifying editor layout and tabs...');
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
    console.log(`[E2E] SROI Tab button label: "${sroiLabelText.trim()}"`);

    const isSroiLocked = sroiLabelText.includes('🔒');
    if (isSroiLocked) {
      console.log('[E2E] SROI tab is locked (WBS items or MEAL indicators are missing). This is an expected state.');
    } else {
      console.log('[E2E] SROI tab is unlocked! Transitioning to SROI Calculator...');
      await tabSroi.click();

      // Verify SROI Root container and ratio card are rendered
      const sroiRoot = page.getByTestId('sroi-calculator-root');
      await expect(sroiRoot).toBeVisible({ timeout: 12000 });

      const sroiRatioCard = page.getByTestId('sroi-ratio-card');
      await expect(sroiRatioCard).toBeVisible();
    }

    // Capture visual screenshot of final state
    const screenshotDir = 'playwright-report/screenshots';
    const screenshotPath = `${screenshotDir}/smoke-test-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[E2E] Visual screenshot captured successfully at: ${screenshotPath}`);
  });
});
