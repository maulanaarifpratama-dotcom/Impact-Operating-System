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

        // Reading across tenants is allowed for a platform admin; writing is
        // not — gw_projects_member_insert carries no admin clause. Pick a real
        // organization this user does not belong to and try to plant a project
        // in it. Using a genuine id matters: a made-up UUID would be rejected
        // by the foreign key before RLS ever got a say.
        const allOrgs = await call('organizations?select=id');
        const foreignRealOrg = (Array.isArray(allOrgs.body) ? (allOrgs.body as { id: string }[]) : [])
          .map((o) => o.id)
          .find((id) => !ownOrgIds.includes(id));

        const foreignProjectInsert = foreignRealOrg
          ? await call('gw_projects', {
              method: 'POST',
              body: JSON.stringify({
                organization_id: foreignRealOrg,
                created_by: uid,
                title: 'E2E tenant isolation probe — must never persist',
              }),
            })
          : null;

        // The integration probes below write for real. That was harmless while
        // RLS refused them; now that this account is a platform admin they
        // succeed, and the PATCH was overwriting the live OneDrive drive_id —
        // the field that decides where evidence uploads land. Remember the
        // original so it can be put back, whatever the probe returns.
        const beforeOnedrive = await call('system_integrations?provider=eq.onedrive&select=id,drive_id');
        const onedriveRows = Array.isArray(beforeOnedrive.body)
          ? (beforeOnedrive.body as { id: string; drive_id: string | null }[])
          : [];

        const isAdmin = await call(`admin_users?select=user_id&user_id=eq.${uid}`);
        const integrationInsert = await call('system_integrations', {
          method: 'POST',
          body: JSON.stringify({ provider: 'e2e-probe', status: 'inactive' }),
        });
        const integrationPatch = await call('system_integrations?provider=eq.onedrive', {
          method: 'PATCH',
          body: JSON.stringify({ drive_id: 'e2e-should-never-apply' }),
          headers: { Prefer: 'return=representation' },
        });
        const integrationRows = await call('system_integrations?select=provider,drive_id');

        // Put the real integration back, then drop the probe rows so they stop
        // piling up in a live table.
        for (const row of onedriveRows) {
          await call(`system_integrations?id=eq.${row.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ drive_id: row.drive_id }),
          });
        }
        await call('system_integrations?provider=eq.e2e-probe', { method: 'DELETE' });

        const afterOnedrive = await call('system_integrations?provider=eq.onedrive&select=drive_id');

        return {
          uid,
          ownOrgIds,
          projectOrgIds,
          foreignRealOrg,
          foreignProjectInsert,
          isAdmin,
          integrationInsert,
          integrationPatch,
          integrationRows,
          onedriveBefore: onedriveRows.map((r) => r.drive_id),
          onedriveAfter: afterOnedrive.body,
          // Was world-readable until invitations_read_by_token was dropped.
          invitations: await call('organization_invitations?select=id,email,organization_id,token'),
          // Self-insert into an arbitrary org: the takeover step.
          selfInsertForeign: await call('organization_members', {
            method: 'POST',
            body: JSON.stringify({ organization_id: foreignOrg, user_id: uid, role: 'owner' }),
          }),
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
    console.log(`[RLS] onedrive drive_id before=${JSON.stringify(result.onedriveBefore)} after=${JSON.stringify(result.onedriveAfter)}`);

    // Whatever the probe did, the live integration must look exactly as it did
    // before the test touched it.
    expect(
      result.onedriveAfter,
      'the probe changed the live OneDrive integration and did not put it back',
    ).toEqual(result.onedriveBefore.map((drive_id) => ({ drive_id })));

    if (result.onedriveBefore.includes('e2e-should-never-apply')) {
      console.warn(
        '[RLS] WARNING: the live OneDrive drive_id still holds the probe value. An earlier run ' +
          'overwrote it while this account had admin rights and nothing restored it. Reconnect ' +
          'OneDrive in Settings to get the real drive id back.',
      );
    }
    console.log(`[RLS] foreign beneficiaries -> ${JSON.stringify(result.foreignBeneficiaries.body)}`);

    // The read policies on gw_projects and organizations both say
    // "is_org_member(...) OR is_admin(auth.uid())". Once info@bisabaik.or.id
    // was made a platform super admin — deliberately, so the pilot foundation
    // can support its own tenants — this account sees every organization by
    // design, and the cross-tenant read assertions below stop meaning anything
    // for it.
    //
    // Skipping them silently would leave a test that reports green while
    // checking nothing, so this states plainly what is no longer covered. To
    // restore the coverage, point E2E_USER_EMAIL at an account that is not in
    // admin_users.
    const isPlatformAdmin = Array.isArray(result.isAdmin.body) && result.isAdmin.body.length > 0;

    // Writing into a stranger's organization must fail for everyone, admin or
    // not. This ran green for months only because the fixture happened to pick
    // the user's own organization out of an unordered list; the check is now
    // explicit.
    if (result.foreignRealOrg) {
      console.log(
        `[RLS] insert into foreign org ${result.foreignRealOrg} -> ${result.foreignProjectInsert?.status}`,
      );
      expect(
        result.foreignProjectInsert?.status,
        `gw_projects accepted a row for org ${result.foreignRealOrg}, which the user is not a member of`,
      ).toBeGreaterThanOrEqual(400);
    }

    if (isPlatformAdmin) {
      console.log(
        '[RLS] NOTE: this account is a platform admin, so the read policies admit it to every ' +
          'organization on purpose. Cross-tenant READ isolation is NOT verified by this run. ' +
          'The write and privilege-escalation checks below still apply.',
      );
    } else {
      // Projects only ever come from organizations the user belongs to.
      for (const orgId of result.projectOrgIds) {
        expect(
          result.ownOrgIds,
          `gw_projects leaked a row from org ${orgId}, which the user is not a member of`,
        ).toContain(orgId);
      }
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
