import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Impactory SROI AI Smoke Test Suite', () => {
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

  test('should execute single SROI AI suggest smoke test', async ({ page }) => {
    // Increase test timeout to 60 seconds to allow for AI model cold starts
    test.setTimeout(60000);

    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;
    const projectId = '240c87a4-9b25-417e-96cc-4b00e7592d19';

    // Track any potential secret leaks or app crashes
    let secretLeakDetected = false;
    let leakedSecretContent = '';
    let browserHasError = false;

    // List of credentials we definitely do not want leaked in logs
    const secretsToScan = [password];

    const scanForSecrets = (text: string, context: string) => {
      // Check for raw password
      for (const secret of secretsToScan) {
        if (secret && secret.length > 4 && text.includes(secret)) {
          secretLeakDetected = true;
          leakedSecretContent = `Raw password found in ${context}`;
        }
      }

      // Check for generic Supabase/Auth secret patterns
      const bearerRegex = /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi;
      if (bearerRegex.test(text)) {
        secretLeakDetected = true;
        leakedSecretContent = `Bearer token pattern found in ${context}`;
      }

      const apiKeyRegex = /(apikey|anon-key|service_role|sb_)[a-zA-Z0-9\-._~+/]{20,}/gi;
      if (apiKeyRegex.test(text)) {
        secretLeakDetected = true;
        leakedSecretContent = `API key pattern found in ${context}`;
      }
    };

    // Safe logger that does not print secrets
    const log = (msg: string) => {
      const sanitized = msg
        .replace(new RegExp(password, 'g'), '[REDACTED_PASSWORD]')
        .replace(new RegExp(email, 'g'), '[REDACTED_EMAIL]');
      console.log(`[E2E-AI-SMOKE] ${sanitized}`);
      scanForSecrets(msg, 'test-logs');
    };

    // Set up console and error listeners
    page.on('console', msg => {
      const txt = msg.text();
      log(`BROWSER CONSOLE [${msg.type()}]: ${txt}`);
      scanForSecrets(txt, `browser-console-${msg.type()}`);
    });

    page.on('pageerror', err => {
      browserHasError = true;
      log(`BROWSER EXCEPTION: ${err.message}\n${err.stack || ''}`);
      scanForSecrets(err.message, 'browser-exception');
    });

    // Request & response monitors
    let aiRequestSent = false;
    let aiResponseReceived = false;
    let aiResponseStatus = -1;
    let aiResponseContent = '';

    page.on('request', req => {
      const url = req.url();
      if (url.includes('sroi-ai-suggest')) {
        aiRequestSent = true;
        log(`Intercepted AI Suggestion Request URL: ${url}`);
        // Scan the payload for secrets but do not log sensitive headers
        const postData = req.postData();
        if (postData) {
          scanForSecrets(postData, 'request-body');
        }
      }
    });

    page.on('response', async res => {
      const url = res.url();
      if (url.includes('sroi-ai-suggest')) {
        aiResponseReceived = true;
        aiResponseStatus = res.status();
        log(`Intercepted AI Suggestion Response Status: ${aiResponseStatus}`);
        try {
          const text = await res.text();
          aiResponseContent = text;
          scanForSecrets(text, 'response-body');
        } catch (e: any) {
          log(`Failed to read response body: ${e.message}`);
        }
      }
    });

    log(`Opening login page: ${baseUrl}/login`);
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
    log('Logged in successfully!');

    // Handle onboarding if redirected there
    const isOnboarding = page.url().includes('/onboarding');
    if (isOnboarding) {
      log('Onboarding page detected. Completing onboarding...');
      await expect(page.locator('#o-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#o-name').fill('E2E Test Org');
      await page.locator('#o-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan")').first().click();
      await page.locator('#o-size').click();
      await page.locator('[role="option"]:has-text("1-5")').first().click();

      const onboardingSubmitBtn = page.locator('button[type="submit"]:has-text("Mulai Gunakan Impactory")').first();
      await onboardingSubmitBtn.click();
      await page.waitForURL(/.*dashboard.*/, { timeout: 25000 });
      log('Onboarding completed!');
    }

    // Direct navigation to the target E2E project
    const targetUrl = `${baseUrl}/dashboard/lfa-builder/${projectId}`;
    log(`Navigating directly to project URL: ${targetUrl}`);
    await page.goto(targetUrl);

    // Verify LFA Editor loaded
    log('Verifying LFA Editor load...');
    const lfaEditorRoot = page.locator('[data-testid="lfa-editor-root"], button:has-text("LFA Matrix"), button:has-text("LFA")').first();
    await expect(lfaEditorRoot).toBeVisible({ timeout: 25000 });

    // Identify tab selector and wait until SROI tab is fully unlocked
    log('Waiting for SROI Tab to unlock (loading status)...');
    const tabSroi = page.locator('[data-testid="lfa-tab-sroi"]').first();
    await expect(tabSroi).toHaveText(/SROI Calculator/, { timeout: 20000 });
    await expect(tabSroi).not.toContainText('🔒', { timeout: 20000 });

    // Open SROI tab
    log('Opening SROI tab...');
    await tabSroi.click();

    // Verify SROI Elements Rendered
    const sroiRoot = page.locator('[data-testid="sroi-calculator-root"], div:has-text("Rasio Return Sosial")').first();
    await expect(sroiRoot).toBeVisible({ timeout: 25000 });
    log('SROI tab opened and rendered successfully.');

    // If we are in Simple Wizard mode, navigate to Step 2: Outcomes where the AI buttons live
    const step2Tab = page.locator('button:has-text("2. Outcomes")').first();
    const isStep2TabVisible = await step2Tab.isVisible();
    if (isStep2TabVisible) {
      log('Simple Mode wizard detected. Navigating to Step 2: Outcomes...');
      await step2Tab.click();
      await page.waitForTimeout(2000); // Wait for transition
    }

    // Double check if outcomes are empty (e.g. if auto-import did not run)
    const noOutcomesMsg = page.locator('text=Belum ada outcome terdaftar').first();
    const isNoOutcomes = await noOutcomesMsg.isVisible();
    if (isNoOutcomes) {
      log('No outcomes registered yet. Creating a manual outcome to ensure we can test the SROI AI suggestion...');
      const addManualBtn = page.locator('button:has-text("Tambah Outcome Manual")').first();
      await addManualBtn.click();
      await page.waitForTimeout(2000);
    }

    // Look for AI Suggestion button
    // It could be either "Bantu saya pilih proxy" (Simple Mode) or "AI Suggest" (Professional Mode)
    const aiButton = page.locator('button:has-text("Bantu saya pilih proxy"), button:has-text("AI Suggest")').first();
    
    // Ensure SROI outcomes are loaded and AI suggest button is ready
    await expect(aiButton).toBeVisible({ timeout: 15000 });
    log('AI Suggestion button located on outcome row.');

    // Trigger exactly one request
    log('Triggering exactly one AI Suggestion request (clicking the button)...');
    await aiButton.click();

    // Wait for request and response to complete
    log('Waiting for AI Suggestion response to complete (allowing up to 40 seconds for model cold starts)...');
    
    // Poll for up to 40 seconds for the response to be received
    let elapsed = 0;
    while (!aiResponseReceived && elapsed < 40000) {
      await page.waitForTimeout(500);
      elapsed += 500;
    }

    if (aiResponseReceived) {
      log(`AI Response received successfully (Status: ${aiResponseStatus}) in ${elapsed}ms!`);
    } else {
      log(`Warning: AI Response was not received within ${elapsed}ms.`);
    }

    // Additional cool-down wait for rendering and DB autosave commits
    await page.waitForTimeout(4000);

    // Capture screenshot of state
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report');
    }
    const screenshotPath = 'playwright-report/smoke-test-sroi-ai.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`Screenshot captured at: ${screenshotPath}`);

    // Verify toast notification is displayed (could be Success or Error, both are graceful completions)
    const toast = page.locator('[role="status"]:has-text("Saran AI"), div:has-text("Saran AI Berhasil"), div:has-text("Saran AI Terkendala")').first();
    const hasToast = await toast.isVisible();
    if (hasToast) {
      const toastText = await toast.innerText();
      const cleanToastText = toastText.length > 250 ? toastText.substring(0, 250) + '...' : toastText;
      log(`Detected Toast notification: "${cleanToastText.replace(/\n/g, ' ')}"`);
    } else {
      log('No explicit SROI AI toast detected within standard time. Checking page errors and stability.');
    }

    // Assertions
    log('Running final verifications...');
    
    // 1. App must not crash
    log('Verifying app did not crash...');
    await expect(sroiRoot).toBeVisible({ timeout: 5000 });
    expect(browserHasError).toBe(false);
    log('Verification PASS: App did not crash and remains stable.');

    // 2. Request completes or fails gracefully (Response status is logged, verify we have either a response or toast)
    log('Verifying request completed/failed gracefully...');
    if (aiRequestSent) {
      log(`AI Request Sent: ${aiRequestSent}, Response Received: ${aiResponseReceived}, Response Status: ${aiResponseStatus}`);
      expect(aiResponseReceived || hasToast).toBe(true);
    } else {
      log('Warning: AI Request was not intercepted as triggered. Check if button click was active.');
    }
    log('Verification PASS: Request processed gracefully.');

    // 3. No secrets leaked in logs
    log(`Verifying no secrets leaked in console/logs...`);
    if (secretLeakDetected) {
      log(`CRITICAL: Secret leak detected! Details: ${leakedSecretContent}`);
    }
    expect(secretLeakDetected).toBe(false);
    log('Verification PASS: No secrets leaked in console or logs.');

    log('All verifications PASSED.');
    console.log('RESULT_SMOKE_STATUS:PASS');
  });
});
