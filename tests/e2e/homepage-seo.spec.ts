import { test, expect } from '@playwright/test';

test.describe('Homepage Refresh & Bilingual SEO Tests', () => {
  
  test('should load Indonesian homepage by default', async ({ page }) => {
    // Navigate to root path
    await page.goto('/');

    // 1. Verify default html lang is 'id'
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('id');

    // 2. Verify exactly one H1 exists on the page
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text).toContain('Rancang Program');

    // 3. Verify page title and meta description for Indonesian
    await expect(page).toHaveTitle('Impactory.id — Platform AI untuk NGO, MEAL, SROI, dan Laporan Dampak');
    
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toContain('Impactory.id membantu NGO merancang program');
    expect(metaDescription).toContain('menghitung SROI');

    // 4. Verify presence of critical Indonesian landing content and keywords
    const content = await page.textContent('body');
    expect(content).toContain('Platform AI');
    expect(content).toContain('SROI Calculator');
    expect(content).toContain('MEAL Tracker');
    expect(content).toContain('LFA Builder');
    expect(content).toContain('laporan dampak');
    expect(content).toContain('manajemen bukti program');
  });

  test('should load English homepage when lang=en query parameter is provided', async ({ page }) => {
    // Navigate with query parameter
    await page.goto('/?lang=en');

    // 1. Verify html lang is dynamically updated to 'en'
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('en');

    // 2. Verify page title and meta description are updated to English
    await expect(page).toHaveTitle('Impactory.id — AI Platform for NGOs, MEAL, SROI, and Impact Reporting');
    
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toContain('Impactory.id helps NGOs design programs');
    expect(metaDescription).toContain('calculate SROI');

    // 3. Verify exactly one H1 exists and is in English
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text).toContain('Design Programs');

    // 4. Verify presence of critical English landing content
    const content = await page.textContent('body');
    expect(content).toContain('AI-powered platform');
    expect(content).toContain('Calculate SROI');
    expect(content).toContain('LFA Builder');
    expect(content).toContain('MEAL Tracker');
    expect(content).toContain('OneDrive Evidence Sync');
  });

  test('should persist language selection in localStorage and URL on toggle', async ({ page }) => {
    await page.goto('/');

    // Ensure default is ID
    await expect(page).toHaveTitle(/Platform AI/);

    // Toggle to EN (via Navbar desktop or mobile button depending on viewport)
    // Find the EN button containing text 'EN' inside the desktop navbar header
    const enButton = page.locator('header button:has-text("EN")').first();
    await enButton.click();

    // Verify page state becomes English
    await expect(page).toHaveTitle(/AI Platform/);
    await expect(page).toHaveURL(/\/\?lang=en/);

    // Verify localStorage item was set
    const savedLang = await page.evaluate(() => localStorage.getItem('impactory-lang'));
    expect(savedLang).toBe('en');

    // Toggle back to ID
    const idButton = page.locator('header button:has-text("ID")').first();
    await idButton.click();

    // Verify page state becomes Indonesian
    await expect(page).toHaveTitle(/Platform AI/);
    await expect(page).not.toHaveURL(/\/\?lang=en/);

    const reSavedLang = await page.evaluate(() => localStorage.getItem('impactory-lang'));
    expect(reSavedLang).toBe('id');
  });

});
