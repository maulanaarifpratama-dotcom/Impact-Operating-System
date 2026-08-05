import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');

/**
 * R1 organization authorization recovery: four bootstrap/reconciliation
 * migrations (Migration A-D) that let a fresh migration replay reach
 * 20260726030000_restrict_system_integrations.sql instead of hard-stopping
 * earlier on missing org_role/created_by/admin_users/is_admin objects.
 *
 * Without a local Supabase running there is nothing to test against; probe
 * once and skip the suite instead of reporting every case as broken.
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[R1 authorization bootstrap tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('R1 Organization Authorization Recovery — Real Postgres DB Validation', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function ensureAuthUser(client: pg.PoolClient, userId: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `${userId}@r1-test.local`],
    );
  }

  async function createOrg(client: pg.PoolClient, name: string, createdBy: string) {
    const res = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, createdBy],
    );
    return res.rows[0].id as string;
  }

  async function addMember(client: pg.PoolClient, orgId: string, userId: string, role: 'owner' | 'admin' | 'member') {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)`,
      [orgId, userId, role],
    );
  }

  const OWNER = 'a1111111-1111-1111-1111-111111111111';
  const ADMIN = 'a2222222-2222-2222-2222-222222222222';
  const MEMBER = 'a3333333-3333-3333-3333-333333333333';
  const OTHER_ORG_MEMBER = 'a4444444-4444-4444-4444-444444444444';
  const FORGER = 'a5555555-5555-5555-5555-555555555555';
  const VICTIM = 'a6666666-6666-6666-6666-666666666666';
  const SYNTHETIC_ADMIN = 'a7777777-7777-7777-7777-777777777777';
  const NON_ADMIN = 'a8888888-8888-8888-8888-888888888888';
  const CREATOR = 'a9999999-9999-9999-9999-999999999999';

  // ---------------------------------------------------------------------
  // Migration A: org_role and membership bootstrap
  // ---------------------------------------------------------------------
  describe('Migration A — org_role and membership bootstrap', () => {
    test('1. role guard rejects invalid value', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, MEMBER);
        const orgId = await createOrg(client, 'R1 Org Role Guard', MEMBER);

        await expect(
          client.query(
            `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'superadmin')`,
            [orgId, MEMBER],
          ),
        ).rejects.toThrow(/invalid input value for enum org_role/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('2. role TEXT converts to org_role', async () => {
      const res = await pool.query(
        `SELECT udt_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'role'`,
      );
      expect(res.rows[0].udt_name).toBe('org_role');
    });

    test('3. canonical org_role skips conversion (idempotent re-apply of Migration A)', async () => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, '20260724190000_bootstrap_org_role_membership.sql'), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // organization_members.role is already public.org_role at this point
        // in every environment this suite runs against. Re-applying the
        // migration must recognize that (the "already converted" branch)
        // and no-op rather than error trying to re-run ALTER COLUMN TYPE
        // against a column that is no longer TEXT. This equally proves the
        // FK-exists and UNIQUE-exists guards no-op on a second application.
        await expect(client.query(sql)).resolves.toBeDefined();
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('4. user FK exists and uses CASCADE', async () => {
      const shape = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.organization_members'::regclass
           AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organization_members'::regclass AND attname = 'user_id')]`,
      );
      expect(shape.rows[0]).toEqual({ target: 'auth.users', delete_action: 'c' });

      // Behavioral proof: deleting the auth.users row actually cascades.
      // The org's creator (organizations.created_by, ON DELETE RESTRICT per
      // Migration B) must be a different user than the membership row being
      // deleted, or the RESTRICT on created_by would fire first and mask
      // whether the CASCADE on user_id works at all.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orgCreator = 'a1090909-0909-0909-0909-090909090909';
        const cascadeUser = 'a1010101-0101-0101-0101-010101010101';
        await ensureAuthUser(client, orgCreator);
        await ensureAuthUser(client, cascadeUser);
        const orgId = await createOrg(client, 'R1 Cascade Org', orgCreator);
        await addMember(client, orgId, cascadeUser, 'member');

        await client.query('DELETE FROM auth.users WHERE id = $1', [cascadeUser]);

        const remaining = await client.query(
          `SELECT 1 FROM public.organization_members WHERE organization_id = $1 AND user_id = $2`,
          [orgId, cascadeUser],
        );
        expect(remaining.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('5. unique organization/user pair exists', async () => {
      const constraint = await pool.query(
        `SELECT conname FROM pg_constraint
         WHERE conrelid = 'public.organization_members'::regclass AND contype = 'u'`,
      );
      expect(constraint.rows.length).toBeGreaterThan(0);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, MEMBER);
        const orgId = await createOrg(client, 'R1 Duplicate Pair Org', MEMBER);
        await addMember(client, orgId, MEMBER, 'member');

        await expect(addMember(client, orgId, MEMBER, 'admin')).rejects.toThrow(/duplicate key value violates unique constraint/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Migration B: organizations.created_by bootstrap
  // ---------------------------------------------------------------------
  describe('Migration B — organizations.created_by bootstrap', () => {
    test('6. created_by canonical shape', async () => {
      const shape = await pool.query(
        `SELECT udt_name, is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_by'`,
      );
      expect(shape.rows[0]).toEqual({ udt_name: 'uuid', is_nullable: 'NO' });

      const fk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.organizations'::regclass
           AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organizations'::regclass AND attname = 'created_by')]`,
      );
      expect(fk.rows[0]).toEqual({ target: 'auth.users', delete_action: 'r' });
    });

    test('7. created_by incompatible state aborts (CREATED_BY_BACKFILL_BLOCKED)', async () => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, '20260726010000_bootstrap_organizations_created_by.sql'), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Simulate the one unproven state Migration B refuses to backfill:
        // an existing row with no creator to attribute. This loosening and
        // the row it lets in are rolled back at the end of this test, so the
        // real table shape is never actually left nullable.
        await client.query('ALTER TABLE public.organizations ALTER COLUMN created_by DROP NOT NULL');
        await client.query(`INSERT INTO public.organizations (name, created_by) VALUES ('Unattributed Org', NULL)`);

        await expect(client.query(sql)).rejects.toThrow(/CREATED_BY_BACKFILL_BLOCKED/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Migration C: admin_users and is_admin bootstrap
  // ---------------------------------------------------------------------
  describe('Migration C — admin_users and is_admin bootstrap', () => {
    test('8. is_admin false for non-admin', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, NON_ADMIN);
        const res = await client.query(`SELECT public.is_admin($1) AS is_admin`, [NON_ADMIN]);
        expect(res.rows[0].is_admin).toBe(false);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('9. is_admin true for synthetic admin', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, SYNTHETIC_ADMIN);
        await client.query(`INSERT INTO public.admin_users (user_id) VALUES ($1)`, [SYNTHETIC_ADMIN]);

        const res = await client.query(`SELECT public.is_admin($1) AS is_admin`, [SYNTHETIC_ADMIN]);
        expect(res.rows[0].is_admin).toBe(true);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('10. anon cannot execute is_admin', async () => {
      // Catalog-level ACL check only. An actual `SET LOCAL ROLE anon` call
      // against a REVOKE-d SECURITY DEFINER function reproducibly crashed
      // this local disposable Postgres container (SIGSEGV on the backend
      // process executing this exact statement, confirmed via container
      // logs) -- a local-environment/extension quirk, not a defect in
      // Migration C's REVOKE/GRANT statements. has_function_privilege is a
      // real, non-bypassable read of the same pg_proc ACL the executor
      // consults before running the function body, so it proves the same
      // boundary without triggering the crash.
      const acl = await pool.query(`SELECT has_function_privilege('anon', 'public.is_admin(uuid)', 'EXECUTE') AS can_execute`);
      expect(acl.rows[0].can_execute).toBe(false);
    });

    test('11. authenticated can execute is_admin', async () => {
      const acl = await pool.query(`SELECT has_function_privilege('authenticated', 'public.is_admin(uuid)', 'EXECUTE') AS can_execute`);
      expect(acl.rows[0].can_execute).toBe(true);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, NON_ADMIN);
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${NON_ADMIN}'`);
        const res = await client.query(`SELECT public.is_admin($1) AS is_admin`, [NON_ADMIN]);
        expect(res.rows[0].is_admin).toBe(false);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Migration D: organizations and organization_members reconciliation
  // — onboarding runtime
  // ---------------------------------------------------------------------
  describe('Migration D — onboarding runtime', () => {
    test('12. forged organization creator rejected', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, FORGER);
        await ensureAuthUser(client, VICTIM);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${FORGER}'`);

        await expect(
          client.query(`INSERT INTO public.organizations (name, created_by) VALUES ('Forged Org', $1)`, [VICTIM]),
        ).rejects.toThrow(/row-level security/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('13. valid creator organization insert succeeds', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, CREATOR);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${CREATOR}'`);

        const res = await client.query(
          `INSERT INTO public.organizations (name, created_by) VALUES ('Valid Onboarding Org', $1) RETURNING id`,
          [CREATOR],
        );
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('14. creator reads org before membership', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, CREATOR);
        const orgId = await createOrg(client, 'Pre-Membership Read Org', CREATOR);
        // Deliberately no organization_members row yet.

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${CREATOR}'`);

        const res = await client.query(`SELECT id FROM public.organizations WHERE id = $1`, [orgId]);
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('15. first owner membership succeeds', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, CREATOR);
        const orgId = await createOrg(client, 'First Owner Org', CREATOR);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${CREATOR}'`);

        const res = await client.query(
          `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner') RETURNING id`,
          [orgId, CREATOR],
        );
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Migration D — RLS runtime
  // ---------------------------------------------------------------------
  describe('Migration D — RLS runtime', () => {
    async function seedTwoOrgs(client: pg.PoolClient) {
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, ADMIN);
      await ensureAuthUser(client, MEMBER);
      await ensureAuthUser(client, OTHER_ORG_MEMBER);

      const orgAId = await createOrg(client, 'RLS Org A', OWNER);
      const orgBId = await createOrg(client, 'RLS Org B', OTHER_ORG_MEMBER);

      await addMember(client, orgAId, OWNER, 'owner');
      await addMember(client, orgAId, ADMIN, 'admin');
      await addMember(client, orgAId, MEMBER, 'member');
      await addMember(client, orgBId, OTHER_ORG_MEMBER, 'owner');

      return { orgAId, orgBId };
    }

    test('16. cross-tenant org read denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgBId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(`SELECT id FROM public.organizations WHERE id = $1`, [orgBId]);
        expect(res.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('17. member reads own org', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(`SELECT id FROM public.organizations WHERE id = $1`, [orgAId]);
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('18. owner/admin update allowed', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${ADMIN}'`);

        const res = await client.query(`UPDATE public.organizations SET name = 'Renamed by Admin' WHERE id = $1`, [orgAId]);
        expect(res.rowCount).toBe(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('19. ordinary member update denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(`UPDATE public.organizations SET name = 'Renamed by Member' WHERE id = $1`, [orgAId]);
        expect(res.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('20. owner delete allowed', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

        const res = await client.query(`DELETE FROM public.organizations WHERE id = $1`, [orgAId]);
        expect(res.rowCount).toBe(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('21. admin delete denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${ADMIN}'`);

        const res = await client.query(`DELETE FROM public.organizations WHERE id = $1`, [orgAId]);
        expect(res.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('22. owner/admin member management allowed', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);
        const newHire = 'a1212121-2121-2121-2121-212121212121';
        await ensureAuthUser(client, newHire);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

        const res = await client.query(
          `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member') RETURNING id`,
          [orgAId, newHire],
        );
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('23. ordinary member management denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgAId } = await seedTwoOrgs(client);
        const thirdParty = 'a1313131-3131-3131-3131-313131313131';
        await ensureAuthUser(client, thirdParty);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        await expect(
          client.query(
            `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
            [orgAId, thirdParty],
          ),
        ).rejects.toThrow(/row-level security/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('24. permissive USING(true) policies are absent from organizations and organization_members', async () => {
      const res = await pool.query(
        `SELECT tablename, policyname FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN ('organizations', 'organization_members')
           AND (qual = 'true' OR with_check = 'true')`,
      );
      expect(res.rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // Migration D — is_org_member ordering at the R1 boundary
  //
  // 20260726022000_reconcile_organization_authorization.sql's own
  // orgs_members_read policy calls public.is_org_member() by name. Before
  // this migration was corrected, the safe scoped definition of that
  // function did not land until 20260805000000_backport_safe_is_org_member.sql
  // -- which never runs before Migration D, and which the confirmed R1
  // replay boundary never even reaches (replay stops at
  // 20260726030000_restrict_system_integrations.sql on a missing table).
  // That meant orgs_members_read, at the R1 boundary, could still be backed
  // by the historical unconditional `SELECT true;` stub from
  // 20260600000000_organizations.sql -- an unconditional cross-tenant read.
  //
  // This suite must be run against a database that has Migration D applied
  // but has NOT applied 20260805000000, so a false pass here can only come
  // from Migration D's own installed definition -- never from the later
  // backport re-supplying the same body. In this validation pass, that was
  // a disposable local database with 20260726030000_restrict_system_integrations.sql,
  // 20260727020000_plan_entitlements.sql, 20260801000003_add_meal_v2_architecture.sql
  // (all three already known-broken/deferred, unrelated to R1) AND
  // 20260805000000_backport_safe_is_org_member.sql itself temporarily held
  // outside supabase/migrations for the session, then restored byte-identical
  // afterward. Running this suite against a database that already applied
  // 20260805000000 would not be wrong going forward, but would not prove
  // anything about Migration D's own fix specifically.
  describe('Migration D — is_org_member ordering (R1 boundary, pre-20260805000000)', () => {
    test('is_org_member body is a real membership-exists check, not the historical stub', async () => {
      const res = await pool.query(
        `SELECT prosrc FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
      );
      const body: string = res.rows[0].prosrc;
      expect(body).toMatch(/organization_members/i);
      expect(body).toMatch(/exists/i);
      expect(body.trim().replace(/\s+/g, ' ').toLowerCase()).not.toBe('select true;');
    });

    test('search_path is pinned to public, pg_temp', async () => {
      const res = await pool.query(
        `SELECT proconfig FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
      );
      const config: string[] | null = res.rows[0].proconfig;
      expect(config).not.toBeNull();
      expect(config).toContain('search_path=public, pg_temp');
    });

    test('is SECURITY DEFINER', async () => {
      const res = await pool.query(
        `SELECT prosecdef FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
      );
      expect(res.rows[0].prosecdef).toBe(true);
    });

    test('anon cannot execute is_org_member', async () => {
      const res = await pool.query(
        `SELECT has_function_privilege('anon', 'public.is_org_member(uuid,uuid)', 'EXECUTE') AS can_execute`,
      );
      expect(res.rows[0].can_execute).toBe(false);
    });

    test('authenticated can execute is_org_member', async () => {
      const res = await pool.query(
        `SELECT has_function_privilege('authenticated', 'public.is_org_member(uuid,uuid)', 'EXECUTE') AS can_execute`,
      );
      expect(res.rows[0].can_execute).toBe(true);
    });

    test('Org A member returns true for Org A, false for Org B', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creatorA = 'a1414141-4141-4141-4141-414141414141';
        const creatorB = 'a1515151-5151-5151-5151-515151515151';
        await ensureAuthUser(client, creatorA);
        await ensureAuthUser(client, creatorB);
        const orgAId = await createOrg(client, 'Ordering Org A', creatorA);
        const orgBId = await createOrg(client, 'Ordering Org B', creatorB);
        await addMember(client, orgAId, creatorA, 'owner');

        const inOwnOrg = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgAId, creatorA]);
        expect(inOwnOrg.rows[0].is_member).toBe(true);

        const inForeignOrg = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgBId, creatorA]);
        expect(inForeignOrg.rows[0].is_member).toBe(false);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('orgs_members_read does not expose Org B to an Org A member', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creatorA = 'a1616161-6161-6161-6161-616161616161';
        const creatorB = 'a1717171-7171-7171-7171-717171717171';
        await ensureAuthUser(client, creatorA);
        await ensureAuthUser(client, creatorB);
        const orgAId = await createOrg(client, 'Ordering RLS Org A', creatorA);
        const orgBId = await createOrg(client, 'Ordering RLS Org B', creatorB);
        await addMember(client, orgAId, creatorA, 'owner');

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${creatorA}'`);

        const res = await client.query(`SELECT id FROM public.organizations WHERE id = $1`, [orgBId]);
        expect(res.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });
});
