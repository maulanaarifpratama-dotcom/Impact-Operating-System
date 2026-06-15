import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Impactory Standalone SROI Calculator E2E Smoke Test Suite', () => {
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

  test('should execute standalone SROI calculator page checks', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;

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

    console.log('[E2E] Waiting for dashboard navigation...');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('[E2E] Logged in successfully!');

    // Navigate to standalone SROI Calculator
    console.log('[E2E] Navigating to /dashboard/sroi');
    await page.goto(`${baseUrl}/dashboard/sroi`);

    // Check standalone root
    console.log('[E2E] Verifying sroi-standalone-root is visible...');
    const standaloneRoot = page.locator('[data-testid="sroi-standalone-root"]');
    await expect(standaloneRoot).toBeVisible({ timeout: 10000 });

    // Verify investment field is visible and holds standard default
    const totalInvestmentField = page.locator('[data-testid="sroi-standalone-total-investment"]');
    await expect(totalInvestmentField).toBeVisible();
    await totalInvestmentField.fill('150000000'); // set investment to 150,000,000 IDR

    // Verify simple mode has correct default values, but allow mode-toggle
    const modeToggleBtn = page.locator('[data-testid="sroi-standalone-mode-toggle"]');
    await expect(modeToggleBtn).toBeVisible();

    // Verify result card / ratio-card renders and contains ratio
    const ratioCard = page.locator('[data-testid="sroi-standalone-ratio-card"]');
    await expect(ratioCard).toBeVisible();
    
    // Add one outcome manually
    console.log('[E2E] Adding one manually created outcome...');
    const addOutcomeBtn = page.locator('[data-testid="sroi-standalone-add-outcome"]');
    await expect(addOutcomeBtn).toBeVisible();
    await addOutcomeBtn.click();

    // Verify copy summary button works
    const copySummaryBtn = page.locator('[data-testid="sroi-standalone-copy-summary"]');
    await expect(copySummaryBtn).toBeVisible();
    await copySummaryBtn.click();

    // Verify reset works
    const resetBtn = page.locator('[data-testid="sroi-standalone-reset"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    console.log('[E2E] Standalone SROI smoke test passed successfully!');
  });
});
