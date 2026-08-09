import { test } from '@playwright/test';

const PM = 'e3dbd557-caaa-4b9d-8755-c2c465377440';

test('Date-driven scheduling', async ({ page }) => {
  test.setTimeout(180000);
  const base = process.env.E2E_BASE_URL!;
  const email = process.env.E2E_USER_EMAIL!;
  const pass = process.env.E2E_USER_PASSWORD!;
  const log = (m: string) => console.log(m);

  await page.goto(`${base}/login`);
  await page.waitForTimeout(2000);
  const pw = page.locator('button:has-text("Password")').first();
  if (await pw.isVisible({ timeout: 3000 }).catch(() => false)) { await pw.click(); await page.waitForTimeout(500); }
  await page.locator('#p-email').fill(email);
  await page.locator('#p-password').fill(pass);
  await page.locator('button[type="submit"]:has-text("Masuk")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  await page.goto(`${base}/dashboard/project-management/${PM}/wbs`);
  await page.waitForTimeout(15000);

  const html = await page.locator('body').innerHTML();
  const body = (await page.locator('body').textContent()) || '';

  log('=== SCHEDULE FIELDS ===');
  log('Number inputs (editable duration): ' + (html.match(/type="number"/g) || []).length);
  log('Date inputs: ' + (html.match(/type="date"/g) || []).length);

  // Check: no editable number input for duration (was removed)
  const numInputs = page.locator('input[type="number"]');
  log('DOM number inputs: ' + (await numInputs.count()));

  // Set dates and verify auto-calc
  const dates = page.locator('input[type="date"]');
  const dc = await dates.count();
  if (dc >= 2) {
    // Set start and end 14 days apart
    await dates.nth(0).fill('2026-08-01');
    await dates.nth(1).fill('2026-08-15');
    await page.waitForTimeout(3000);

    const body2 = (await page.locator('body').textContent()) || '';
    // Should show "2 Minggu" (14 days / 7 = 2 weeks)
    log('Has "2 Minggu": ' + body2.includes('2 Minggu'));
    log('Has "14": ' + body2.includes('14'));

    // Re-check date values persisted
    const v1 = await dates.nth(0).inputValue();
    const v2 = await dates.nth(1).inputValue();
    log('Start: ' + v1 + ' End: ' + v2);
  }

  // Verify textarea width is good (no regression)
  const ta = page.locator('textarea').first();
  const box = await ta.boundingBox();
  log('Textarea width: ' + box?.width?.toFixed(0));
});
