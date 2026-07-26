import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Impactory E2E Smoke Test Suite', () => {
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

  test('should execute stable login or signup, navigate to LFA Builder, handle project, and verify SROI tab', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;
    const allowSignup = process.env.E2E_ALLOW_SIGNUP === '1';

    // Set up console and error listeners
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    let hasReceived429 = false;
    page.on('response', response => {
      if (response.status() === 429) {
        hasReceived429 = true;
      }
    });

    let signupSucceeded = false;

    if (allowSignup) {
      console.log(`[E2E] Option E2E_ALLOW_SIGNUP is active. Opening signup page: ${baseUrl}/signup`);
      await page.goto(`${baseUrl}/signup`);

      // Fill signup credentials
      console.log(`[E2E] Trying signup with email: ${email}`);
      await expect(page.locator('#s-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#s-name').fill('E2E Test User');
      await page.locator('#s-email').fill(email);
      await page.locator('#s-password').fill(password);

      // Select role
      await page.locator('#s-role').click();
      await page.locator('[role="option"]:has-text("Yayasan"), [role="option"]:has-text("Foundation"), [role="option"]').first().click();

      // Click submit button
      const signupSubmitBtn = page.locator('button[type="submit"]:has-text("Daftar gratis")').first();
      await signupSubmitBtn.click();

      console.log('[E2E] Waiting 10 seconds for signup response or redirect...');
      await page.waitForTimeout(10000);

      const urlAfterSignup = page.url();
      const bodyText = await page.innerText('body');

      // Check for HTTP 429 / Rate Limit
      if (hasReceived429 || bodyText.includes('Too many requests') || bodyText.includes('banyak permintaan') || urlAfterSignup.includes('429')) {
        throw new Error('Signup rate-limited. Need existing verified test account.');
      }

      // Check for email verification
      const emailVerificationFound = bodyText.includes('Cek email') || 
                                     bodyText.includes('konfirmasi') || 
                                     bodyText.includes('verifikasi') || 
                                     bodyText.includes('verification') ||
                                     bodyText.includes('confirm');
      
      if (emailVerificationFound && !urlAfterSignup.includes('dashboard') && !urlAfterSignup.includes('onboarding')) {
        throw new Error('Email verification required. Need a real inbox or verified test account.');
      }

      if (urlAfterSignup.includes('dashboard') || urlAfterSignup.includes('onboarding')) {
        signupSucceeded = true;
        console.log('[E2E] Signup completed successfully and auto-logged in!');
      } else {
        console.log('[E2E] Signup did not log in automatically. Proceeding to direct login fallback...');
      }
    }

    if (!signupSucceeded) {
      console.log(`[E2E] Executing direct Login flow. Opening login page: ${baseUrl}/login`);
      await page.goto(`${baseUrl}/login`);

      // Click on Password tab if present
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
      await page.waitForURL(/(dashboard|onboarding)/, { timeout: 25000 });
      console.log('[E2E] Logged in successfully!');
    }

    // Handle onboarding if redirected there
    const isOnboarding = page.url().includes('/onboarding');
    if (isOnboarding) {
      console.log('[E2E] Onboarding page detected. Filling out organization details...');
      await expect(page.locator('#o-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#o-name').fill('E2E Test Org');
      
      // Select main sector: Pendidikan
      await page.locator('#o-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan")').first().click();

      // Select size: 1-5
      await page.locator('#o-size').click();
      await page.locator('[role="option"]:has-text("1-5")').first().click();

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
    await expect(lfaNavLink).toBeVisible({ timeout: 15000 });
    await lfaNavLink.click();

    // Look for existing Literasi Keuangan Perempuan Pesisir Demak card
    const targetProjectName = 'Literasi Keuangan Perempuan Pesisir Demak';
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
      await expect(page.locator('#prog-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#prog-name').fill(targetProjectName);
      
      // Select sector 'Pendidikan'
      await page.locator('#prog-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan")').first().click();

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
      console.log('[E2E] SROI tab is locked (WBS items or MEAL indicators are missing). This is expected.');
    } else {
      console.log('[E2E] SROI tab is unlocked! Transitioning to SROI Calculator...');
      await tabSroi.click();

      // Verify SROI Root container and ratio card are rendered
      const sroiRoot = page.getByTestId('sroi-calculator-root');
      await expect(sroiRoot).toBeVisible({ timeout: 12000 });

      const sroiRatioCard = page.getByTestId('sroi-ratio-card');
      await expect(sroiRatioCard).toBeVisible();
    }

    // Capture visual screenshot of final state in playwright-report folder (git-ignored)
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report');
    }
    await page.screenshot({ path: 'playwright-report/smoke-test-final.png', fullPage: true });
    console.log('[E2E] Visual screenshot captured successfully at: playwright-report/smoke-test-final.png');
  });
});
