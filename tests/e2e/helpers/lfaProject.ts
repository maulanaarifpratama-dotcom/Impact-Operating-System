import { expect, type Page } from '@playwright/test';

/**
 * Open a named LFA project, creating it through the UI if it is not there yet,
 * and return its id.
 *
 * Tests used to navigate straight at a hardcoded project UUID. That row no
 * longer exists, so every one of them died waiting for an editor that was never
 * going to render — and the real failure was invisible, because the editor used
 * to paper over the missing project by fabricating rows rather than reporting
 * it. Finding or creating the project makes each test own its fixture and
 * survive a wiped database.
 *
 * Mirrors what smoke.spec.ts already does; call it after login.
 */
export async function openOrCreateLfaProject(
  page: Page,
  baseUrl: string,
  projectName: string,
  opts: { sector?: string; location?: string; beneficiary?: string } = {},
): Promise<string> {
  const {
    sector = 'Pendidikan',
    location = 'Garut, Jawa Barat',
    beneficiary = `Automated E2E fixture for "${projectName}". Safe to edit or delete.`,
  } = opts;

  await page.goto(`${baseUrl}/dashboard/lfa-builder`);

  const card = page
    .locator('div.cursor-pointer', { has: page.locator(`:text("${projectName}")`) })
    .first();

  if (await card.isVisible().catch(() => false)) {
    console.log(`[E2E] Reusing project "${projectName}".`);
    await card.click();
  } else {
    console.log(`[E2E] Project "${projectName}" not found — creating it.`);
    await page
      .locator('button:has-text("Mulai Sekarang"), button:has-text("Mulai dari Nol")')
      .first()
      .click();

    await expect(page.locator('#prog-name')).toBeVisible({ timeout: 10000 });
    await page.locator('#prog-name').fill(projectName);
    await page.locator('#prog-sector').click();
    await page.locator(`[role="option"]:has-text("${sector}")`).first().click();
    await page.locator('#prog-loc').fill(location);
    await page.locator('#prog-bendesc').fill(beneficiary);
    await page.locator('button:has-text("Buat Program")').first().click();
  }

  await page.waitForURL(/\/dashboard\/lfa-builder\/[a-f0-9-]+/, { timeout: 30000 });
  const projectId = page.url().match(/\/dashboard\/lfa-builder\/([a-f0-9-]+)/)?.[1] ?? '';
  expect(projectId, 'could not read a project id out of the editor URL').not.toBe('');
  console.log(`[E2E] Active project: ${projectId}`);
  return projectId;
}

export const LFA_EDITOR_ROOT =
  '[data-testid="lfa-editor-root"], button:has-text("LFA Matrix"), button:has-text("LFA")';

/**
 * Fill the logframe far enough that the WBS tab stops being locked, then reload
 * so the tab states recompute. No-op when it is already unlocked.
 *
 * A freshly created project has an empty matrix, so every downstream tab —
 * WBS, MEAL, SROI — stays locked. Tests that want to reach those tabs have to
 * walk the chain first; this is that walk, kept in one place so the tests can
 * spend their lines on assertions instead.
 */
export async function fillLfaMatrixIfLocked(page: Page): Promise<boolean> {
  const tabWbs = page
    .locator('[data-testid="lfa-tab-wbs"], button:has-text("WBS Builder"), button:has-text("WBS")')
    .first();
  await expect(tabWbs).toBeVisible({ timeout: 10000 });

  if (!((await tabWbs.textContent()) ?? '').includes('🔒')) {
    console.log('[E2E] WBS already unlocked; matrix left as it is.');
    return false;
  }

  console.log('[E2E] WBS locked — filling Goal, Purpose, Output and Activity.');

  const goal = page
    .locator('textarea[placeholder*="pernyataan dampak"], textarea[placeholder*="Dampak"]')
    .first();
  await expect(goal).toBeVisible({ timeout: 10000 });
  await goal.fill('E2E Goal: Mengurangi tingkat putus sekolah anak-anak di daerah marginal.');
  await goal.blur();

  const purpose = page
    .locator('textarea[placeholder*="pernyataan tujuan"], textarea[placeholder*="Tujuan"]')
    .first();
  await expect(purpose).toBeVisible({ timeout: 10000 });
  await purpose.fill('E2E Purpose: Meningkatkan partisipasi belajar dan motivasi anak sekolah.');
  await purpose.blur();

  const output = page
    .locator('textarea[placeholder*="output terukur"], textarea[placeholder*="Output"]')
    .first();
  if (!(await output.isVisible().catch(() => false))) {
    await page.locator('button:has-text("Tambah Hasil"), button:has-text("Buat Hasil")').first().click();
    await expect(output).toBeVisible({ timeout: 10000 });
  }
  await output.fill('E2E Output: Modul bimbingan belajar alternatif untuk anak-anak.');
  await output.blur();

  // MEAL auto-import keys off the output indicator, so it has to be set.
  const indicator = page
    .locator('input[placeholder*="Terlatihnya 100 kader"], input[placeholder*="Indikator"]')
    .first();
  await expect(indicator).toBeVisible({ timeout: 10000 });
  await indicator.fill('1 bimbingan belajar aktif dengan 20 peserta.');
  await indicator.blur();

  const activity = page.locator('input[placeholder*="Tuliskan aksi kegiatan"]').first();
  if (!(await activity.isVisible().catch(() => false))) {
    await page.locator('button:has-text("Tambah Kegiatan")').first().click();
    await expect(activity).toBeVisible({ timeout: 10000 });
  }
  await activity.fill('E2E Activity: Menyusun modul bimbingan belajar mingguan.');
  await activity.blur();

  // Saves are debounced; the reload afterwards is what recomputes the locks.
  console.log('[E2E] Waiting for the debounced autosave to commit...');
  await page.waitForTimeout(5000);
  await page.reload();
  await expect(page.locator(LFA_EDITOR_ROOT).first()).toBeVisible({ timeout: 25000 });
  return true;
}
