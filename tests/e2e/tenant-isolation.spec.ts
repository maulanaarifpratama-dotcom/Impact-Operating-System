import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// The app's own Supabase credentials, not the E2E ones. The anon key is public
// by design — it ships in every browser bundle — which is precisely why row
// level security, not secrecy, has to be what protects tenant data.
dotenv.config({ path: path.resolve('.env') });

/**
 * Does a signed-in user's authority actually stop at their own organization?
 *
 * These assertions are written against the REST API with a real user token
 * rather than through the UI, because the UI is not the boundary — anyone can
 * open devtools and call the same endpoints. What holds the line is RLS.
 *
 * Each case corresponds to a hole closed on 2026-07-26; together they are the
 * regression test for that work. Before those fixes, an authenticated user
 * could read every pending invitation in the system, take an organization_id
 * from one, insert themselves into that organization, and from then on every
 * is_org_member() policy in the database answered true for them.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

/** An organization id that certainly is not ours. */
const FOREIGN_ORG = '00000000-0000-4000-8000-0000000000ff';

test.describe('Tenant isolation (RLS authority)', () => {
  test.beforeAll(() => {
    const missing = ['E2E_BASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD']
      .filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing env: ${missing.join(', ')}. Configure .env.e2e.`);
    }
    if (!SUPABASE_URL || !ANON_KEY) {
      throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.');
    }
  });

  test('a signed-in user cannot reach data outside their organization', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL!;

    // --- sign in through the real login form -------------------------------
    await page.goto(`${baseUrl}/login`);
    await page.locator('button:has-text("Password")').first().click();
    await page.locator('#p-email').fill(process.env.E2E_USER_EMAIL!);
    await page.locator('#p-password').fill(process.env.E2E_USER_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });
    console.log('[RLS] Signed in.');

    // --- talk to the API the way a curious user would ----------------------
    const result = await page.evaluate(
      async ({ url, anon, foreignOrg }) => {
        const key = Object.keys(localStorage).find((k) => k.includes('auth-token'));
        if (!key) throw new Error('No Supabase session in localStorage');
        const token = JSON.parse(localStorage.getItem(key)!).access_token as string;
        const uid = JSON.parse(atob(token.split('.')[1])).sub as string;

        const call = async (path: string, init: RequestInit = {}) => {
          const res = await fetch(`${url}/rest/v1/${path}`, {
            ...init,
            headers: {
              apikey: anon,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              ...(init.headers ?? {}),
            },
          });
          let body: unknown = null;
          try {
            body = await res.json();
          } catch {
            /* empty body is fine for writes */
          }
          return { status: res.status, body };
        };

        const myOrgs = await call('organization_members?select=organization_id');
        const ownOrgIds = Array.isArray(myOrgs.body)
          ? (myOrgs.body as { organization_id: string }[]).map((r) => r.organization_id)
          : [];

        // Every project row RLS is willing to hand over.
        const projects = await call('gw_projects?select=id,organization_id');
        const projectOrgIds = Array.isArray(projects.body)
          ? [...new Set((projects.body as { organization_id: string }[]).map((r) => r.organization_id))]
          : [];

        return {
          uid,
          ownOrgIds,
          projectOrgIds,
          // Was world-readable until invitations_read_by_token was dropped.
          invitations: await call('organization_invitations?select=id,email,organization_id,token'),
          // Self-insert into an arbitrary org: the takeover step.
          selfInsertForeign: await call('organization_members', {
            method: 'POST',
            body: JSON.stringify({ organization_id: foreignOrg, user_id: uid, role: 'owner' }),
          }),
          // Was ALL USING(true) WITH CHECK(true); drive_id decides where NGO
          // evidence uploads land.
          //
          // A bare PATCH is not conclusive: PostgREST answers 204 both when RLS
          // filtered every row away and when the filter simply matched nothing.
          // An INSERT has no such ambiguity — it is refused outright — so that
          // is the probe, with the PATCH kept as a second signal asking for the
          // affected rows back.
          isAdmin: await call(`admin_users?select=user_id&user_id=eq.${uid}`),
          integrationInsert: await call('system_integrations', {
            method: 'POST',
            body: JSON.stringify({ provider: 'e2e-probe', status: 'inactive' }),
          }),
          integrationPatch: await call('system_integrations?provider=eq.onedrive', {
            method: 'PATCH',
            body: JSON.stringify({ drive_id: 'e2e-should-never-apply' }),
            headers: { Prefer: 'return=representation' },
          }),
          integrationRows: await call('system_integrations?select=provider,drive_id'),
          // Reachable only through the org check, never by naming an org.
          foreignBeneficiaries: await call(`beneficiaries?select=id&org_id=eq.${foreignOrg}`),
        };
      },
      { url: SUPABASE_URL, anon: ANON_KEY, foreignOrg: FOREIGN_ORG },
    );

    console.log(`[RLS] user=${result.uid} orgs=${JSON.stringify(result.ownOrgIds)}`);
    console.log(`[RLS] project org ids visible: ${JSON.stringify(result.projectOrgIds)}`);
    console.log(`[RLS] invitations -> ${result.invitations.status} ${JSON.stringify(result.invitations.body).slice(0, 120)}`);
    console.log(`[RLS] self-insert foreign org -> ${result.selfInsertForeign.status}`);
    console.log(`[RLS] is admin -> ${JSON.stringify(result.isAdmin.body)}`);
    console.log(`[RLS] system_integrations INSERT -> ${result.integrationInsert.status} ${JSON.stringify(result.integrationInsert.body)}`);
    console.log(`[RLS] system_integrations PATCH -> ${result.integrationPatch.status} rows=${JSON.stringify(result.integrationPatch.body)}`);
    console.log(`[RLS] system_integrations visible rows -> ${JSON.stringify(result.integrationRows.body)}`);
    console.log(`[RLS] foreign beneficiaries -> ${JSON.stringify(result.foreignBeneficiaries.body)}`);

    // Projects only ever come from organizations the user belongs to.
    for (const orgId of result.projectOrgIds) {
      expect(
        result.ownOrgIds,
        `gw_projects leaked a row from org ${orgId}, which the user is not a member of`,
      ).toContain(orgId);
    }

    // Invitations must not be enumerable. Rows are acceptable only for the
    // user's own organizations — never for anyone else's.
    const invitationRows = Array.isArray(result.invitations.body)
      ? (result.invitations.body as { organization_id: string }[])
      : [];
    for (const row of invitationRows) {
      expect(
        result.ownOrgIds,
        'organization_invitations exposed an invite belonging to another organization',
      ).toContain(row.organization_id);
    }

    // Joining an organization you were never invited to must be refused.
    expect(
      result.selfInsertForeign.status,
      'a user was able to insert themselves into an arbitrary organization',
    ).toBeGreaterThanOrEqual(400);

    // Changing where evidence uploads land is an admin action. Skip the check
    // if this account genuinely is an admin — then a successful write is
    // correct behaviour, not a hole.
    const userIsAdmin = Array.isArray(result.isAdmin.body) && result.isAdmin.body.length > 0;
    if (userIsAdmin) {
      console.log('[RLS] account is an admin; skipping the non-admin write assertions.');
    } else {
      expect(
        result.integrationInsert.status,
        'a non-admin inserted a row into system_integrations',
      ).toBeGreaterThanOrEqual(400);

      expect(
        Array.isArray(result.integrationPatch.body) ? result.integrationPatch.body : [],
        'a non-admin updated system_integrations — drive_id decides where NGO evidence is uploaded',
      ).toHaveLength(0);
    }

    // Naming someone else's org must not reveal their beneficiaries.
    expect(
      Array.isArray(result.foreignBeneficiaries.body) ? result.foreignBeneficiaries.body : [],
      'beneficiaries returned rows for an organization the user does not belong to',
    ).toHaveLength(0);
  });
});
