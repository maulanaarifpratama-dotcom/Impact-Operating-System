import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

/**
 * Do the pricing tiers actually hold?
 *
 * The pricing page promises that Grantwriter, LFA Builder, the Impact Library
 * and the Beneficiary Registry belong to the paid tiers. Until the entitlement
 * migration landed, nothing enforced that — every account had every feature,
 * and the page described an offer the database did not apply.
 *
 * This creates a throwaway organisation, which the trigger puts on the free
 * plan, and checks the same insert that succeeds for a paid organisation is
 * refused for it. Both halves matter: a gate that blocks everyone is as broken
 * as one that blocks nobody.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

test.describe('Plan entitlements', () => {
  test.beforeAll(() => {
    const missing = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
    if (!SUPABASE_URL || !ANON_KEY) throw new Error('Missing VITE_SUPABASE_* in .env');
  });

  test('paid modules are refused on the free plan and allowed on a paid one', async ({ page }) => {
    test.setTimeout(180_000);
    const baseUrl = process.env.E2E_BASE_URL!;

    await page.goto(`${baseUrl}/login`);
    await page.locator('button:has-text("Password")').first().click();
    await page.locator('#p-email').fill(process.env.E2E_USER_EMAIL!);
    await page.locator('#p-password').fill(process.env.E2E_USER_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    const result = await page.evaluate(
      async ({ url, anon }) => {
        const k = Object.keys(localStorage).find((x) => x.includes('auth-token'))!;
        const token = JSON.parse(localStorage.getItem(k)!).access_token as string;
        const uid = JSON.parse(atob(token.split('.')[1])).sub as string;
        const h = {
          apikey: anon,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        };
        const call = async (p: string, init: RequestInit = {}) => {
          const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...h, ...(init.headers ?? {}) } });
          let b: unknown = null;
          try { b = await r.json(); } catch { /* empty */ }
          return { status: r.status, body: b };
        };

        // --- a throwaway organisation, which the trigger puts on 'free' ------
        const stamp = String(Date.now());
        const created = await call('organizations', {
          method: 'POST',
          body: JSON.stringify({
            name: `Uji Paket Langganan ${stamp}`,
            slug: `e2e-free-${stamp}`,
            created_by: uid,
          }),
        });
        const freeOrgId = Array.isArray(created.body) ? (created.body as any[])[0]?.id : null;
        if (!freeOrgId) {
          throw new Error(`could not create probe organisation: ${created.status} ${JSON.stringify(created.body)}`);
        }

        await call('organization_members', {
          method: 'POST',
          body: JSON.stringify({ organization_id: freeOrgId, user_id: uid, role: 'owner' }),
        });

        const freeSub = await call(`subscriptions?select=plan,status&organization_id=eq.${freeOrgId}`);

        // --- the paid organisation the account already belongs to ------------
        const mem = await call(`organization_members?select=organization_id&user_id=eq.${uid}`);
        const paidOrgId = (mem.body as any[])
          .map((r) => r.organization_id)
          .find((id) => id !== freeOrgId);

        const tryLfa = (orgId: string, label: string) =>
          call('lfa_projects', {
            method: 'POST',
            body: JSON.stringify({ org_id: orgId, name: `Uji Paket Langganan — ${label} ${stamp}`, sector: 'Pendidikan', status: 'draft' }),
          });

        const onFree = await tryLfa(freeOrgId, 'free');
        const onPaid = paidOrgId ? await tryLfa(paidOrgId, 'paid') : null;

        // --- tidy up ---------------------------------------------------------
        // Order matters. Deleting the membership first strips the owner role the
        // organisation's own delete policy requires, so the organisation then
        // survives as an orphan. Drop the organisation while still a member and
        // let the membership cascade.
        const paidRowId = Array.isArray(onPaid?.body) ? (onPaid!.body as any[])[0]?.id : null;
        if (paidRowId) await call(`lfa_projects?id=eq.${paidRowId}`, { method: 'DELETE' });
        const orgDelete = await call(`organizations?id=eq.${freeOrgId}`, { method: 'DELETE' });
        const leftovers = await call(`organizations?select=id&id=eq.${freeOrgId}`);

        return { freeOrgId, paidOrgId, freeSub, onFree, onPaid, orgDelete, leftovers };
      },
      { url: SUPABASE_URL, anon: ANON_KEY },
    );

    // Sweep any probe organisations an earlier run failed to remove, so debris
    // does not accumulate in the shared project.
    await page.evaluate(
      async ({ url, anon }) => {
        const k = Object.keys(localStorage).find((x) => x.includes('auth-token'))!;
        const token = JSON.parse(localStorage.getItem(k)!).access_token as string;
        const uid = JSON.parse(atob(token.split('.')[1])).sub as string;
        const h = { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const res = await fetch(`${url}/rest/v1/organizations?select=id,name&created_by=eq.${uid}`, { headers: h });
        const stale = ((await res.json()) as any[]).filter((o) => String(o.name).startsWith('Uji Paket Langganan'));
        for (const o of stale) {
          // Re-join so the owner-only delete policy applies, then remove it.
          await fetch(`${url}/rest/v1/organization_members`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({ organization_id: o.id, user_id: uid, role: 'owner' }),
          });
          await fetch(`${url}/rest/v1/organizations?id=eq.${o.id}`, { method: 'DELETE', headers: h });
        }
      },
      { url: SUPABASE_URL, anon: ANON_KEY },
    );

    console.log(`[PLAN] probe org subscription: ${JSON.stringify(result.freeSub.body)}`);
    console.log(`[PLAN] insert on free org -> ${result.onFree.status}`);
    console.log(`[PLAN] insert on paid org -> ${result.onPaid?.status}`);

    // The trigger must have given the new organisation a free plan; without a
    // row at all, the gate would be refusing for the wrong reason.
    expect(
      Array.isArray(result.freeSub.body) ? result.freeSub.body : [],
      'the trigger should have created a subscription row for the new organisation',
    ).toHaveLength(1);
    expect((result.freeSub.body as any[])[0]).toMatchObject({ plan: 'free', status: 'active' });

    expect(
      result.onFree.status,
      'creating an LFA project should be refused on the free plan',
    ).toBeGreaterThanOrEqual(400);

    expect(
      result.onPaid?.status,
      'creating an LFA project must still work on a paid plan',
    ).toBeLessThan(300);

    // The probe organisation must not survive the run. An earlier version of
    // this test deleted the membership first, which stripped the owner role the
    // delete policy needs, and left orphans behind in the shared project.
    expect(
      Array.isArray(result.leftovers.body) ? result.leftovers.body : [],
      'the probe organisation should have been deleted',
    ).toHaveLength(0);
  });
});
