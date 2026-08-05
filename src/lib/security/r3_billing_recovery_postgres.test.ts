import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const R3_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260727011000_bootstrap_subscriptions.sql');
const GW_PROJECTS_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260727012000_bootstrap_gw_projects_created_by.sql');
const LIBRARY_DOCS_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260727013000_bootstrap_library_documents_uploaded_by.sql');
const GRANTFINDER_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260727014000_bootstrap_grantfinder_searches.sql');
const AUTHZ_RECONCILE_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260727015000_reconcile_billing_gated_table_authorization.sql');

/**
 * R3 billing recovery: one bootstrap migration that lets a fresh replay
 * reach 20260727020000_plan_entitlements.sql, which references
 * public.subscriptions in a trigger function and a backfill INSERT but
 * never creates it. That file itself is left entirely unchanged; every
 * object it owns (has_paid_plan(), create_default_subscription(), its
 * trigger, and eight product-gating policies) is confirmed live in
 * production and untouched here.
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
    console.warn('[R3 billing recovery tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('R3 Billing Recovery — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@r3-test.local`],
    );
  }

  async function createOrg(client: pg.PoolClient, name: string, createdBy: string) {
    const res = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, createdBy],
    );
    return res.rows[0].id as string;
  }

  /**
   * Creates an org and guarantees it has exactly one subscription row,
   * regardless of whether trg_org_default_subscription (owned by
   * 20260727020000_plan_entitlements.sql, not this bootstrap) is present in
   * the environment this suite runs against. Testing this bootstrap's own
   * RLS/trigger/privilege behavior on subscriptions should not depend on a
   * different migration's organizations-insert trigger.
   */
  async function createOrgWithSubscription(client: pg.PoolClient, name: string, createdBy: string) {
    const orgId = await createOrg(client, name, createdBy);
    await client.query(
      `INSERT INTO public.subscriptions (organization_id, plan, status) VALUES ($1, 'free', 'active')
       ON CONFLICT (organization_id) DO NOTHING`,
      [orgId],
    );
    return orgId;
  }

  async function addMember(client: pg.PoolClient, orgId: string, userId: string, role: 'owner' | 'admin' | 'member') {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)`,
      [orgId, userId, role],
    );
  }

  const OWNER = 'c1111111-1111-1111-1111-111111111111';
  const ORG_ADMIN = 'c2222222-2222-2222-2222-222222222222';
  const MEMBER = 'c3333333-3333-3333-3333-333333333333';
  const OTHER_ORG_MEMBER = 'c4444444-4444-4444-4444-444444444444';
  const SYNTHETIC_ADMIN = 'c5555555-5555-5555-5555-555555555555';

  // ---------------------------------------------------------------------
  // Migration ordering
  // ---------------------------------------------------------------------
  test('all five R3 prerequisite migrations and the historical billing migration sort in order', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const before = files.indexOf('20260727010000_restrict_deletes_to_admins.sql');
    const subsBootstrap = files.indexOf('20260727011000_bootstrap_subscriptions.sql');
    const gwBootstrap = files.indexOf('20260727012000_bootstrap_gw_projects_created_by.sql');
    const libBootstrap = files.indexOf('20260727013000_bootstrap_library_documents_uploaded_by.sql');
    const gfBootstrap = files.indexOf('20260727014000_bootstrap_grantfinder_searches.sql');
    const authzReconcile = files.indexOf('20260727015000_reconcile_billing_gated_table_authorization.sql');
    const after = files.indexOf('20260727020000_plan_entitlements.sql');

    for (const idx of [before, subsBootstrap, gwBootstrap, libBootstrap, gfBootstrap, authzReconcile, after]) {
      expect(idx).toBeGreaterThanOrEqual(0);
    }
    expect(before).toBeLessThan(subsBootstrap);
    expect(subsBootstrap).toBeLessThan(gwBootstrap);
    expect(gwBootstrap).toBeLessThan(libBootstrap);
    expect(libBootstrap).toBeLessThan(gfBootstrap);
    expect(gfBootstrap).toBeLessThan(authzReconcile);
    expect(authzReconcile).toBeLessThan(after);
  });

  // ---------------------------------------------------------------------
  // Enums
  // ---------------------------------------------------------------------
  describe('Enums', () => {
    test('plan_tier has exactly the canonical values in order', async () => {
      const res = await pool.query(
        `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'plan_tier' ORDER BY e.enumsortorder`,
      );
      expect(res.rows.map((r) => r.enumlabel)).toEqual(['free', 'starter', 'premium', 'enterprise']);
    });

    test('subscription_status has exactly the canonical values in order', async () => {
      const res = await pool.query(
        `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'subscription_status' ORDER BY e.enumsortorder`,
      );
      expect(res.rows.map((r) => r.enumlabel)).toEqual(['trialing', 'active', 'past_due', 'canceled', 'incomplete']);
    });

    test('an incompatible plan_tier (extra label) aborts re-applying the R3 migration', async () => {
      const sql = fs.readFileSync(R3_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Adding a label is the only way to make an existing enum diverge
        // from a fixed canonical list without needing an unsupported reorder
        // or removal. Rolled back at the end, so the real enum never keeps it.
        await client.query(`ALTER TYPE public.plan_tier ADD VALUE 'r3_test_extra_label'`);

        await expect(client.query(sql)).rejects.toThrow(/PLAN_TIER_ENUM_INCOMPATIBLE/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Subscriptions table shape
  // ---------------------------------------------------------------------
  describe('Table shape', () => {
    test('table exists with exactly the eleven canonical columns', async () => {
      const res = await pool.query(
        `SELECT column_name, udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'subscriptions'
         ORDER BY column_name`,
      );
      const byName = new Map(res.rows.map((r) => [r.column_name, r]));

      expect([...byName.keys()].sort()).toEqual(
        [
          'id', 'organization_id', 'plan', 'status', 'current_period_start', 'current_period_end',
          'cancel_at_period_end', 'provider', 'provider_subscription_id', 'created_at', 'updated_at',
        ].sort(),
      );

      expect(byName.get('id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
      expect(byName.get('organization_id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
      expect(byName.get('plan')).toMatchObject({ udt_name: 'plan_tier', is_nullable: 'NO' });
      expect(byName.get('status')).toMatchObject({ udt_name: 'subscription_status', is_nullable: 'NO' });
      expect(byName.get('current_period_start')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'YES' });
      expect(byName.get('current_period_end')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'YES' });
      expect(byName.get('cancel_at_period_end')).toMatchObject({ udt_name: 'bool', is_nullable: 'NO' });
      expect(byName.get('provider')).toMatchObject({ udt_name: 'text', is_nullable: 'YES' });
      expect(byName.get('provider_subscription_id')).toMatchObject({ udt_name: 'text', is_nullable: 'YES' });
      expect(byName.get('created_at')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'NO' });
      expect(byName.get('updated_at')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'NO' });

      expect(byName.get('id')?.column_default).toContain('gen_random_uuid()');
      expect(byName.get('plan')?.column_default).toContain("'free'");
      expect(byName.get('status')?.column_default).toContain("'active'");
      expect(byName.get('cancel_at_period_end')?.column_default).toContain('false');
      expect(byName.get('created_at')?.column_default).toContain('now()');
      expect(byName.get('updated_at')?.column_default).toContain('now()');
    });

    test('primary key is exactly (id)', async () => {
      const res = await pool.query(
        `SELECT conkey, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'id') AS id_attnum
         FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'p'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].conkey).toEqual([res.rows[0].id_attnum]);
    });

    test('organization_id is UNIQUE with a CASCADE foreign key to organizations(id)', async () => {
      const uniq = await pool.query(
        `SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'u'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'organization_id')]`,
      );
      expect(uniq.rows).toHaveLength(1);

      const fk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'organization_id')]`,
      );
      expect(fk.rows[0]).toEqual({ target: 'organizations', delete_action: 'c' });
    });

    test('has no index beyond the primary key and the organization_id unique constraint', async () => {
      const res = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'subscriptions'`,
      );
      expect(res.rows.map((r) => r.indexname).sort()).toEqual(['subscriptions_organization_id_key', 'subscriptions_pkey']);
    });
  });

  // ---------------------------------------------------------------------
  // Trigger
  // ---------------------------------------------------------------------
  describe('Trigger', () => {
    test('trg_subs_updated_at exists as BEFORE UPDATE calling set_updated_at()', async () => {
      const res = await pool.query(
        `SELECT pg_get_triggerdef(t.oid) AS def
         FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
         WHERE t.tgrelid = 'public.subscriptions'::regclass AND t.tgname = 'trg_subs_updated_at' AND NOT t.tgisinternal`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].def).toContain('BEFORE UPDATE');
      expect(res.rows[0].def).toContain('set_updated_at');
    });

    test('updated_at actually changes on row update', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'c6060606-0606-0606-0606-060606060606';
        await ensureAuthUser(client, creator);
        const orgId = await createOrgWithSubscription(client, 'R3 Trigger Org', creator);

        // now() is frozen for the lifetime of a transaction in Postgres, so
        // comparing a "before" and "after" now()-derived timestamp within the
        // same transaction can never show a difference, no matter how long
        // pg_sleep() waits. Proving the trigger fires instead means showing
        // it overrides a deliberately wrong client-supplied value.
        const after = await client.query(
          `UPDATE public.subscriptions SET status = 'active', updated_at = '2020-01-01T00:00:00Z'
           WHERE organization_id = $1 RETURNING updated_at`,
          [orgId],
        );
        expect(new Date(after.rows[0].updated_at).getFullYear()).not.toBe(2020);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // RLS and privileges
  // ---------------------------------------------------------------------
  describe('RLS and privileges', () => {
    test('RLS is enabled', async () => {
      const res = await pool.query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.subscriptions'::regclass`);
      expect(res.rows[0].relrowsecurity).toBe(true);
    });

    test('exactly two policies exist, and neither is a permissive blanket policy', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, qual, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'subscriptions' ORDER BY policyname`,
      );
      expect(res.rows.map((r) => r.policyname)).toEqual(['subs_admin_write', 'subs_members_read']);

      for (const row of res.rows) {
        expect(row.qual === 'true' || row.with_check === 'true').toBe(false);
      }

      const readPolicy = res.rows.find((r) => r.policyname === 'subs_members_read');
      expect(readPolicy.cmd).toBe('SELECT');
      expect(readPolicy.qual).toContain('is_org_member');
      expect(readPolicy.qual).toContain('is_admin');

      const writePolicy = res.rows.find((r) => r.policyname === 'subs_admin_write');
      expect(writePolicy.cmd).toBe('ALL');
      expect(writePolicy.qual).toContain('is_admin');
      expect(writePolicy.with_check).toContain('is_admin');
    });

    test('anon has no table privilege', async () => {
      const res = await pool.query(
        `SELECT has_table_privilege('anon', 'public.subscriptions', 'SELECT') AS sel,
                has_table_privilege('anon', 'public.subscriptions', 'INSERT') AS ins,
                has_table_privilege('anon', 'public.subscriptions', 'UPDATE') AS upd,
                has_table_privilege('anon', 'public.subscriptions', 'DELETE') AS del`,
      );
      expect(res.rows[0]).toEqual({ sel: false, ins: false, upd: false, del: false });
    });

    test('authenticated has full table-level privilege (RLS is still the real gate)', async () => {
      const res = await pool.query(
        `SELECT has_table_privilege('authenticated', 'public.subscriptions', 'SELECT') AS sel,
                has_table_privilege('authenticated', 'public.subscriptions', 'INSERT') AS ins,
                has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE') AS upd,
                has_table_privilege('authenticated', 'public.subscriptions', 'DELETE') AS del`,
      );
      expect(res.rows[0]).toEqual({ sel: true, ins: true, upd: true, del: true });
    });

    test('service_role has maintenance privilege', async () => {
      const res = await pool.query(
        `SELECT has_table_privilege('service_role', 'public.subscriptions', 'SELECT') AS sel,
                has_table_privilege('service_role', 'public.subscriptions', 'INSERT') AS ins`,
      );
      expect(res.rows[0]).toEqual({ sel: true, ins: true });
    });
  });

  // ---------------------------------------------------------------------
  // Reads / Writes
  // ---------------------------------------------------------------------
  describe('Reads and writes', () => {
    async function seedOrgWithRoles(client: pg.PoolClient) {
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, ORG_ADMIN);
      await ensureAuthUser(client, MEMBER);
      await ensureAuthUser(client, OTHER_ORG_MEMBER);

      const orgId = await createOrgWithSubscription(client, 'R3 RW Org', OWNER);
      const otherOrgId = await createOrgWithSubscription(client, 'R3 RW Other Org', OTHER_ORG_MEMBER);

      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, ORG_ADMIN, 'admin');
      await addMember(client, orgId, MEMBER, 'member');
      await addMember(client, otherOrgId, OTHER_ORG_MEMBER, 'owner');

      return { orgId, otherOrgId };
    }

    test('same-org member reads the subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(`SELECT organization_id FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('cross-org member cannot read the subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OTHER_ORG_MEMBER}'`);

        const res = await client.query(`SELECT organization_id FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(res.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('global admin reads any subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);
        await ensureAuthUser(client, SYNTHETIC_ADMIN);
        await client.query(`INSERT INTO public.admin_users (user_id) VALUES ($1)`, [SYNTHETIC_ADMIN]);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${SYNTHETIC_ADMIN}'`);

        const res = await client.query(`SELECT organization_id FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('ordinary member cannot write the subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(`UPDATE public.subscriptions SET plan = 'premium' WHERE organization_id = $1`, [orgId]);
        expect(res.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('organization owner cannot write the subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

        const res = await client.query(`UPDATE public.subscriptions SET plan = 'premium' WHERE organization_id = $1`, [orgId]);
        expect(res.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('organization admin cannot write the subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedOrgWithRoles(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${ORG_ADMIN}'`);

        const res = await client.query(`UPDATE public.subscriptions SET plan = 'premium' WHERE organization_id = $1`, [orgId]);
        expect(res.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('global admin can insert, update, and delete a subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, SYNTHETIC_ADMIN);
        await client.query(`INSERT INTO public.admin_users (user_id) VALUES ($1)`, [SYNTHETIC_ADMIN]);
        const orgId = await createOrgWithSubscription(client, 'R3 Admin Write Org', SYNTHETIC_ADMIN);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${SYNTHETIC_ADMIN}'`);

        const updateRes = await client.query(
          `UPDATE public.subscriptions SET plan = 'premium' WHERE organization_id = $1 RETURNING plan`,
          [orgId],
        );
        expect(updateRes.rows[0].plan).toBe('premium');

        const deleteRes = await client.query(`DELETE FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(deleteRes.rowCount).toBe(1);

        const insertRes = await client.query(
          `INSERT INTO public.subscriptions (organization_id, plan, status) VALUES ($1, 'starter', 'trialing') RETURNING plan`,
          [orgId],
        );
        expect(insertRes.rows[0].plan).toBe('starter');
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Constraints
  // ---------------------------------------------------------------------
  describe('Constraints', () => {
    test('a duplicate organization subscription is rejected', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'c7070707-0707-0707-0707-070707070707';
        await ensureAuthUser(client, creator);
        const orgId = await createOrgWithSubscription(client, 'R3 Duplicate Org', creator);

        await expect(
          client.query(`INSERT INTO public.subscriptions (organization_id, plan, status) VALUES ($1, 'free', 'active')`, [orgId]),
        ).rejects.toThrow(/duplicate key value violates unique constraint/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('deleting the organization cascades to its subscription', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'c8080808-0808-0808-0808-080808080808';
        await ensureAuthUser(client, creator);
        const orgId = await createOrgWithSubscription(client, 'R3 Cascade Org', creator);

        await client.query(`DELETE FROM public.organizations WHERE id = $1`, [orgId]);

        const remaining = await client.query(`SELECT 1 FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(remaining.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // GW Projects ownership (20260727012000_bootstrap_gw_projects_created_by.sql)
  //
  // gw_projects_member_insert (owned entirely by the historical migration,
  // untouched here) requires auth.uid() = created_by. This bootstrap adds
  // only that one column -- no default, no policy, no trigger -- so the
  // caller must always supply it explicitly, exactly matching production.
  // ---------------------------------------------------------------------
  describe('GW Projects ownership', () => {
    test('created_by exists as UUID NOT NULL with no default, FK to auth.users(id) ON DELETE RESTRICT', async () => {
      const res = await pool.query(
        `SELECT udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'gw_projects' AND column_name = 'created_by'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO', column_default: null });

      const fk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.gw_projects'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.gw_projects'::regclass AND attname = 'created_by')]`,
      );
      expect(fk.rows[0]).toEqual({ target: 'auth.users', delete_action: 'r' });
    });

    describe('Partial-schema guards', () => {
      test('absent + empty table: the canonical addition succeeds (proven by the real replay already having applied it)', async () => {
        // The actual TABLE_ABSENT path is exercised by the real replay this
        // suite runs against (gw_projects starts with no created_by column
        // in every committed migration). The shape test above is that proof;
        // this test documents the case explicitly rather than re-deriving it.
        const res = await pool.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'gw_projects' AND column_name = 'created_by'`,
        );
        expect(res.rows).toHaveLength(1);
      });

      test('absent + nonempty table aborts with GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED', async () => {
        const sql = fs.readFileSync(GW_PROJECTS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Simulate the one unproven state this migration refuses to guess
          // at: an existing row with no creator to attribute. Dropping the
          // column and inserting a row without it is the only way to
          // reconstruct TABLE_ABSENT + nonempty inside a rolled-back
          // transaction without touching real data permanently.
          const creator = 'cc0c0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c';
          await ensureAuthUser(client, creator);
          const orgId = await createOrg(client, 'R3 GW Backfill Org', creator);
          // gw_projects_member_insert's WITH CHECK depends on created_by, so
          // it must be dropped first -- this is a throwaway, rolled-back
          // transaction, never affecting the real policy.
          await client.query(`DROP POLICY IF EXISTS "gw_projects_member_insert" ON public.gw_projects`);
          await client.query(`ALTER TABLE public.gw_projects DROP CONSTRAINT gw_projects_created_by_fkey`);
          await client.query(`ALTER TABLE public.gw_projects DROP COLUMN created_by`);
          await client.query(`INSERT INTO public.gw_projects (organization_id, title) VALUES ($1, 'Orphaned Project')`, [orgId]);

          await expect(client.query(sql)).rejects.toThrow(/GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('present canonical: re-applying the migration is an idempotent no-op', async () => {
        const sql = fs.readFileSync(GW_PROJECTS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await expect(client.query(sql)).resolves.toBeDefined();

          const res = await pool.query(
            `SELECT udt_name, is_nullable FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'gw_projects' AND column_name = 'created_by'`,
          );
          expect(res.rows[0]).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('wrong type aborts with UNEXPECTED_GW_PROJECT_CREATED_BY_TYPE', async () => {
        const sql = fs.readFileSync(GW_PROJECTS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`DROP POLICY IF EXISTS "gw_projects_member_insert" ON public.gw_projects`);
          await client.query(`ALTER TABLE public.gw_projects DROP CONSTRAINT gw_projects_created_by_fkey`);
          await client.query(`ALTER TABLE public.gw_projects ALTER COLUMN created_by TYPE text`);

          await expect(client.query(sql)).rejects.toThrow(/UNEXPECTED_GW_PROJECT_CREATED_BY_TYPE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('nullable with a NULL row aborts with GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED', async () => {
        const sql = fs.readFileSync(GW_PROJECTS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const creator = 'cd0d0d0d-0d0d-0d0d-0d0d-0d0d0d0d0d0d';
          await ensureAuthUser(client, creator);
          const orgId = await createOrg(client, 'R3 GW Nullable Org', creator);
          await client.query(`ALTER TABLE public.gw_projects DROP CONSTRAINT gw_projects_created_by_fkey`);
          await client.query(`ALTER TABLE public.gw_projects ALTER COLUMN created_by DROP NOT NULL`);
          await client.query(`INSERT INTO public.gw_projects (organization_id, title, created_by) VALUES ($1, 'Null Owner Project', NULL)`, [orgId]);

          await expect(client.query(sql)).rejects.toThrow(/GW_PROJECT_CREATED_BY_BACKFILL_BLOCKED/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('wrong FK aborts with UNEXPECTED_GW_PROJECT_CREATED_BY_FK', async () => {
        const sql = fs.readFileSync(GW_PROJECTS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.gw_projects DROP CONSTRAINT gw_projects_created_by_fkey`);
          await client.query(
            `ALTER TABLE public.gw_projects ADD CONSTRAINT gw_projects_created_by_fkey
             FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE`,
          );

          await expect(client.query(sql)).rejects.toThrow(/UNEXPECTED_GW_PROJECT_CREATED_BY_FK/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });

    describe('Functional INSERT ownership', () => {
      async function seedGwOrg(client: pg.PoolClient) {
        await ensureAuthUser(client, OWNER);
        await ensureAuthUser(client, MEMBER);
        await ensureAuthUser(client, OTHER_ORG_MEMBER);

        const orgId = await createOrgWithSubscription(client, 'R3 GW Insert Org', OWNER);
        const otherOrgId = await createOrgWithSubscription(client, 'R3 GW Insert Other Org', OTHER_ORG_MEMBER);

        await addMember(client, orgId, OWNER, 'owner');
        await addMember(client, orgId, MEMBER, 'member');
        await addMember(client, otherOrgId, OTHER_ORG_MEMBER, 'owner');

        return { orgId, otherOrgId };
      }

      test('creator inserting for a member org with a paid plan is allowed', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGwOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          const res = await client.query(
            `INSERT INTO public.gw_projects (organization_id, created_by, title) VALUES ($1, $2, 'Allowed Project') RETURNING id`,
            [orgId, OWNER],
          );
          expect(res.rows).toHaveLength(1);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a forged created_by (not the caller) is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGwOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.gw_projects (organization_id, created_by, title) VALUES ($1, $2, 'Forged Project')`,
              [orgId, MEMBER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a non-member is denied even with a correct created_by', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGwOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OTHER_ORG_MEMBER}'`);

          await expect(
            client.query(
              `INSERT INTO public.gw_projects (organization_id, created_by, title) VALUES ($1, $2, 'Non-Member Project')`,
              [orgId, OTHER_ORG_MEMBER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a free-tier organization is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGwOrg(client);
          // seedGwOrg's subscription defaults to free/active -- left as-is.

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.gw_projects (organization_id, created_by, title) VALUES ($1, $2, 'Free Tier Project')`,
              [orgId, OWNER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a paid, active organization allows the creator to insert', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGwOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'starter', status = 'trialing' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

          const res = await client.query(
            `INSERT INTO public.gw_projects (organization_id, created_by, title) VALUES ($1, $2, 'Trialing Paid Project') RETURNING id`,
            [orgId, MEMBER],
          );
          expect(res.rows).toHaveLength(1);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });
  });

  // ---------------------------------------------------------------------
  // Library Documents ownership (20260727013000_bootstrap_library_documents_uploaded_by.sql)
  //
  // lib_docs_member_insert (owned entirely by the historical migration,
  // untouched here) requires auth.uid() = uploaded_by. This bootstrap adds
  // only that one column -- no default, no policy, no trigger -- so the
  // caller must always supply it explicitly, exactly matching production.
  // ---------------------------------------------------------------------
  describe('Library Documents ownership', () => {
    test('uploaded_by exists as UUID NOT NULL with no default, FK to auth.users(id) ON DELETE RESTRICT', async () => {
      const res = await pool.query(
        `SELECT udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'library_documents' AND column_name = 'uploaded_by'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO', column_default: null });

      const fk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.library_documents'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.library_documents'::regclass AND attname = 'uploaded_by')]`,
      );
      expect(fk.rows[0]).toEqual({ target: 'auth.users', delete_action: 'r' });
    });

    describe('Partial-schema guards', () => {
      test('absent + empty table: the canonical addition succeeds (proven by the real replay already having applied it)', async () => {
        const res = await pool.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'library_documents' AND column_name = 'uploaded_by'`,
        );
        expect(res.rows).toHaveLength(1);
      });

      test('absent + nonempty table aborts with LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED', async () => {
        const sql = fs.readFileSync(LIBRARY_DOCS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const creator = 'ce0e0e0e-0e0e-0e0e-0e0e-0e0e0e0e0e0e';
          await ensureAuthUser(client, creator);
          const orgId = await createOrg(client, 'R3 Library Backfill Org', creator);
          // lib_docs_member_insert's WITH CHECK depends on uploaded_by, so it
          // must be dropped first -- this is a throwaway, rolled-back
          // transaction, never affecting the real policy.
          await client.query(`DROP POLICY IF EXISTS "lib_docs_member_insert" ON public.library_documents`);
          await client.query(`DROP POLICY IF EXISTS "lib_docs_owner_delete" ON public.library_documents`);
          await client.query(`ALTER TABLE public.library_documents DROP CONSTRAINT library_documents_uploaded_by_fkey`);
          await client.query(`ALTER TABLE public.library_documents DROP COLUMN uploaded_by`);
          await client.query(`INSERT INTO public.library_documents (organization_id, title) VALUES ($1, 'Orphaned Document')`, [orgId]);

          await expect(client.query(sql)).rejects.toThrow(/LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('present canonical: re-applying the migration is an idempotent no-op', async () => {
        const sql = fs.readFileSync(LIBRARY_DOCS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await expect(client.query(sql)).resolves.toBeDefined();

          const res = await pool.query(
            `SELECT udt_name, is_nullable FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'library_documents' AND column_name = 'uploaded_by'`,
          );
          expect(res.rows[0]).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('wrong type aborts with UNEXPECTED_LIBRARY_UPLOADED_BY_TYPE', async () => {
        const sql = fs.readFileSync(LIBRARY_DOCS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`DROP POLICY IF EXISTS "lib_docs_member_insert" ON public.library_documents`);
          await client.query(`DROP POLICY IF EXISTS "lib_docs_owner_delete" ON public.library_documents`);
          await client.query(`ALTER TABLE public.library_documents DROP CONSTRAINT library_documents_uploaded_by_fkey`);
          await client.query(`ALTER TABLE public.library_documents ALTER COLUMN uploaded_by TYPE text`);

          await expect(client.query(sql)).rejects.toThrow(/UNEXPECTED_LIBRARY_UPLOADED_BY_TYPE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('nullable with a NULL row aborts with LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED', async () => {
        const sql = fs.readFileSync(LIBRARY_DOCS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const creator = 'cf0f0f0f-0f0f-0f0f-0f0f-0f0f0f0f0f0f';
          await ensureAuthUser(client, creator);
          const orgId = await createOrg(client, 'R3 Library Nullable Org', creator);
          await client.query(`ALTER TABLE public.library_documents DROP CONSTRAINT library_documents_uploaded_by_fkey`);
          await client.query(`ALTER TABLE public.library_documents ALTER COLUMN uploaded_by DROP NOT NULL`);
          await client.query(`INSERT INTO public.library_documents (organization_id, title, uploaded_by) VALUES ($1, 'Null Owner Document', NULL)`, [orgId]);

          await expect(client.query(sql)).rejects.toThrow(/LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('wrong FK aborts with UNEXPECTED_LIBRARY_UPLOADED_BY_FK', async () => {
        const sql = fs.readFileSync(LIBRARY_DOCS_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.library_documents DROP CONSTRAINT library_documents_uploaded_by_fkey`);
          await client.query(
            `ALTER TABLE public.library_documents ADD CONSTRAINT library_documents_uploaded_by_fkey
             FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE`,
          );

          await expect(client.query(sql)).rejects.toThrow(/UNEXPECTED_LIBRARY_UPLOADED_BY_FK/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });

    describe('Functional INSERT ownership', () => {
      async function seedLibOrg(client: pg.PoolClient) {
        await ensureAuthUser(client, OWNER);
        await ensureAuthUser(client, MEMBER);
        await ensureAuthUser(client, OTHER_ORG_MEMBER);

        const orgId = await createOrgWithSubscription(client, 'R3 Library Insert Org', OWNER);
        const otherOrgId = await createOrgWithSubscription(client, 'R3 Library Insert Other Org', OTHER_ORG_MEMBER);

        await addMember(client, orgId, OWNER, 'owner');
        await addMember(client, orgId, MEMBER, 'member');
        await addMember(client, otherOrgId, OTHER_ORG_MEMBER, 'owner');

        return { orgId, otherOrgId };
      }

      test('uploader inserting for a member org with a paid plan is allowed', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedLibOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          const res = await client.query(
            `INSERT INTO public.library_documents (organization_id, uploaded_by, title) VALUES ($1, $2, 'Allowed Document') RETURNING id`,
            [orgId, OWNER],
          );
          expect(res.rows).toHaveLength(1);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a forged uploaded_by (not the caller) is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedLibOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.library_documents (organization_id, uploaded_by, title) VALUES ($1, $2, 'Forged Document')`,
              [orgId, MEMBER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a free-tier organization is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedLibOrg(client);
          // seedLibOrg's subscription defaults to free/active -- left as-is.

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.library_documents (organization_id, uploaded_by, title) VALUES ($1, $2, 'Free Tier Document')`,
              [orgId, OWNER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });
  });

  // ---------------------------------------------------------------------
  // Grantfinder Searches (20260727014000_bootstrap_grantfinder_searches.sql)
  //
  // gf_searches_owner_insert (owned entirely by the historical migration,
  // untouched here) requires auth.uid() = user_id. This bootstrap creates
  // the whole table plus gf_searches_owner_read -- the only SELECT policy
  // this table will ever have from committed migration history.
  // ---------------------------------------------------------------------
  describe('Grantfinder Searches', () => {
    test('exactly the seven canonical columns, with correct types, nullability, and defaults', async () => {
      const res = await pool.query(
        `SELECT column_name, udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'grantfinder_searches'
         ORDER BY column_name`,
      );
      const byName = new Map(res.rows.map((r) => [r.column_name, r]));

      expect([...byName.keys()].sort()).toEqual(
        ['id', 'organization_id', 'user_id', 'query', 'filters', 'result_grant_ids', 'created_at'].sort(),
      );

      expect(byName.get('id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
      expect(byName.get('id')?.column_default).toContain('gen_random_uuid()');
      expect(byName.get('organization_id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO', column_default: null });
      expect(byName.get('user_id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO', column_default: null });
      expect(byName.get('query')).toMatchObject({ udt_name: 'text', is_nullable: 'NO', column_default: null });
      expect(byName.get('filters')).toMatchObject({ udt_name: 'jsonb', is_nullable: 'NO' });
      expect(byName.get('filters')?.column_default).toContain("'{}'");
      expect(byName.get('result_grant_ids')).toMatchObject({ udt_name: '_uuid', is_nullable: 'NO' });
      expect(byName.get('result_grant_ids')?.column_default).toContain("'{}'");
      expect(byName.get('created_at')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'NO' });
      expect(byName.get('created_at')?.column_default).toContain('now()');
    });

    test('primary key is exactly (id)', async () => {
      const res = await pool.query(
        `SELECT conkey, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'id') AS id_attnum
         FROM pg_constraint WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'p'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].conkey).toEqual([res.rows[0].id_attnum]);
    });

    test('organization_id and user_id both carry an ON DELETE CASCADE foreign key', async () => {
      const orgFk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'organization_id')]`,
      );
      expect(orgFk.rows[0]).toEqual({ target: 'organizations', delete_action: 'c' });

      const userFk = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.grantfinder_searches'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.grantfinder_searches'::regclass AND attname = 'user_id')]`,
      );
      expect(userFk.rows[0]).toEqual({ target: 'auth.users', delete_action: 'c' });
    });

    test('has the canonical (organization_id, created_at DESC) index', async () => {
      const res = await pool.query(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'grantfinder_searches' AND indexname = 'idx_gf_searches_org'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].indexdef).toContain('organization_id');
      expect(res.rows[0].indexdef.toLowerCase()).toContain('created_at desc');
    });

    test('RLS is enabled', async () => {
      const res = await pool.query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.grantfinder_searches'::regclass`);
      expect(res.rows[0].relrowsecurity).toBe(true);
    });

    test('gf_searches_owner_read is exact, and no UPDATE or DELETE policy exists', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, roles, qual FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'grantfinder_searches' ORDER BY policyname`,
      );
      const names = res.rows.map((r) => r.policyname);
      expect(names).not.toContain('gf_searches_owner_update');
      expect(names).not.toContain('gf_searches_owner_delete');
      expect(res.rows.some((r) => r.cmd === 'UPDATE')).toBe(false);
      expect(res.rows.some((r) => r.cmd === 'DELETE')).toBe(false);

      const readPolicy = res.rows.find((r) => r.policyname === 'gf_searches_owner_read');
      expect(readPolicy).toBeDefined();
      expect(readPolicy.cmd).toBe('SELECT');
      // node-postgres returns pg_policies.roles (a name[]) as its raw
      // array-literal text form, not a JS array.
      expect(readPolicy.roles).toBe('{authenticated}');
      expect(readPolicy.qual).toContain('is_org_member');
      expect(readPolicy.qual).toContain('is_admin');
    });

    describe('Partial-schema guards', () => {
      test('absent table: the canonical creation succeeds (proven by the real replay already having applied it)', async () => {
        const res = await pool.query(
          `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = 'grantfinder_searches'`,
        );
        expect(res.rows).toHaveLength(1);
      });

      test('wrong id type aborts with GRANTFINDER_SEARCHES_ID_INCOMPATIBLE', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.grantfinder_searches DROP CONSTRAINT grantfinder_searches_pkey`);
          await client.query(`ALTER TABLE public.grantfinder_searches ALTER COLUMN id TYPE text`);

          await expect(client.query(sql)).rejects.toThrow(/GRANTFINDER_SEARCHES_ID_INCOMPATIBLE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('missing organization_id FK aborts with GRANTFINDER_SEARCHES_TENANCY_INCOMPATIBLE', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.grantfinder_searches DROP CONSTRAINT grantfinder_searches_organization_id_fkey`);

          await expect(client.query(sql)).rejects.toThrow(/GRANTFINDER_SEARCHES_TENANCY_INCOMPATIBLE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('missing user_id FK aborts with GRANTFINDER_SEARCHES_OWNER_INCOMPATIBLE', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.grantfinder_searches DROP CONSTRAINT grantfinder_searches_user_id_fkey`);

          await expect(client.query(sql)).rejects.toThrow(/GRANTFINDER_SEARCHES_OWNER_INCOMPATIBLE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('query column absent + nonempty table aborts with GRANTFINDER_SEARCHES_QUERY_BACKFILL_BLOCKED', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const creator = 'cd1d1d1d-1d1d-1d1d-1d1d-1d1d1d1d1d1d';
          await ensureAuthUser(client, creator);
          const orgId = await createOrg(client, 'R3 Grantfinder Backfill Org', creator);
          await client.query(`ALTER TABLE public.grantfinder_searches ALTER COLUMN query DROP NOT NULL`);
          await client.query(
            `INSERT INTO public.grantfinder_searches (organization_id, user_id, query) VALUES ($1, $2, 'orphaned query')`,
            [orgId, creator],
          );
          await client.query(`ALTER TABLE public.grantfinder_searches DROP COLUMN query`);

          await expect(client.query(sql)).rejects.toThrow(/GRANTFINDER_SEARCHES_QUERY_BACKFILL_BLOCKED/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('wrong filters type aborts with GRANTFINDER_SEARCHES_SCHEMA_INCOMPATIBLE', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`ALTER TABLE public.grantfinder_searches ALTER COLUMN filters DROP DEFAULT`);
          await client.query(`ALTER TABLE public.grantfinder_searches ALTER COLUMN filters TYPE text USING filters::text`);

          await expect(client.query(sql)).rejects.toThrow(/GRANTFINDER_SEARCHES_SCHEMA_INCOMPATIBLE/);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('re-applying the migration against the already-canonical table is an idempotent no-op', async () => {
        const sql = fs.readFileSync(GRANTFINDER_MIGRATION_FILE, 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await expect(client.query(sql)).resolves.toBeDefined();

          const cols = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grantfinder_searches'`,
          );
          expect(cols.rows).toHaveLength(7);

          // gf_searches_owner_insert already exists too by this point --
          // owned by the historical migration, which has already run.
          const policies = await client.query(
            `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grantfinder_searches'`,
          );
          expect(policies.rows.map((r) => r.policyname).sort()).toEqual(['gf_searches_owner_insert', 'gf_searches_owner_read']);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });

    describe('Functional INSERT ownership', () => {
      async function seedGfOrg(client: pg.PoolClient) {
        await ensureAuthUser(client, OWNER);
        await ensureAuthUser(client, MEMBER);
        await ensureAuthUser(client, OTHER_ORG_MEMBER);

        const orgId = await createOrgWithSubscription(client, 'R3 Grantfinder Insert Org', OWNER);
        const otherOrgId = await createOrgWithSubscription(client, 'R3 Grantfinder Insert Other Org', OTHER_ORG_MEMBER);

        await addMember(client, orgId, OWNER, 'owner');
        await addMember(client, orgId, MEMBER, 'member');
        await addMember(client, otherOrgId, OTHER_ORG_MEMBER, 'owner');

        return { orgId, otherOrgId };
      }

      test('owner inserting a search for a member org with a paid plan is allowed', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGfOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          const res = await client.query(
            `INSERT INTO public.grantfinder_searches (organization_id, user_id, query) VALUES ($1, $2, 'allowed query') RETURNING id`,
            [orgId, OWNER],
          );
          expect(res.rows).toHaveLength(1);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a forged user_id (not the caller) is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGfOrg(client);
          await client.query(`UPDATE public.subscriptions SET plan = 'premium', status = 'active' WHERE organization_id = $1`, [orgId]);

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.grantfinder_searches (organization_id, user_id, query) VALUES ($1, $2, 'forged query')`,
              [orgId, MEMBER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a free-tier organization is denied', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { orgId } = await seedGfOrg(client);
          // seedGfOrg's subscription defaults to free/active -- left as-is.

          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);

          await expect(
            client.query(
              `INSERT INTO public.grantfinder_searches (organization_id, user_id, query) VALUES ($1, $2, 'free tier query')`,
              [orgId, OWNER],
            ),
          ).rejects.toThrow(/row-level security/i);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });
  });

  // ---------------------------------------------------------------------
  // Authorization Reconciliation (20260727015000_reconcile_billing_gated_table_authorization.sql)
  //
  // gw_projects and library_documents were each created with a permissive
  // "Enable all for <table>" FOR ALL USING (true) policy that no other
  // committed migration ever drops. This migration drops both and supplies
  // their production-confirmed replacement read/update(/delete) policies in
  // the same file, so SELECT/UPDATE access is never denied by the drop
  // alone.
  // ---------------------------------------------------------------------
  describe('Authorization Reconciliation', () => {
    test('neither legacy "Enable all for ..." policy exists on gw_projects or library_documents', async () => {
      const res = await pool.query(
        `SELECT tablename, policyname FROM pg_policies
         WHERE schemaname = 'public' AND tablename IN ('gw_projects', 'library_documents')
           AND policyname ILIKE 'Enable all%'`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('gw_projects has exactly its four canonical policies, read and update exact', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, qual, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'gw_projects' ORDER BY policyname`,
      );
      expect(res.rows.map((r) => r.policyname).sort()).toEqual([
        'gw_projects_member_insert', 'gw_projects_member_read', 'gw_projects_member_update', 'gw_projects_owner_admin_delete',
      ]);

      const readPolicy = res.rows.find((r) => r.policyname === 'gw_projects_member_read');
      expect(readPolicy.cmd).toBe('SELECT');
      expect(readPolicy.qual).toContain('is_org_member');
      expect(readPolicy.qual).toContain('is_admin');

      const updatePolicy = res.rows.find((r) => r.policyname === 'gw_projects_member_update');
      expect(updatePolicy.cmd).toBe('UPDATE');
      expect(updatePolicy.qual).toContain('is_org_member');
      expect(updatePolicy.with_check).toContain('is_org_member');
    });

    test('library_documents has exactly its four canonical policies, read/update/delete exact', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, qual, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'library_documents' ORDER BY policyname`,
      );
      expect(res.rows.map((r) => r.policyname).sort()).toEqual([
        'lib_docs_member_insert', 'lib_docs_member_read', 'lib_docs_member_update', 'lib_docs_owner_delete',
      ]);

      const readPolicy = res.rows.find((r) => r.policyname === 'lib_docs_member_read');
      expect(readPolicy.cmd).toBe('SELECT');
      expect(readPolicy.qual).toContain('is_org_member');
      expect(readPolicy.qual).toContain('is_admin');

      const updatePolicy = res.rows.find((r) => r.policyname === 'lib_docs_member_update');
      expect(updatePolicy.cmd).toBe('UPDATE');
      expect(updatePolicy.qual).toContain('is_org_member');
      expect(updatePolicy.with_check).toContain('is_org_member');

      const deletePolicy = res.rows.find((r) => r.policyname === 'lib_docs_owner_delete');
      expect(deletePolicy.cmd).toBe('DELETE');
      expect(deletePolicy.qual).toContain('get_org_role');
      expect(deletePolicy.qual).toContain('uploaded_by');
    });

    test('grantfinder_searches read policy is untouched by this migration (owned by the table bootstrap)', async () => {
      // gf_searches_owner_insert (owned by the historical migration) also
      // exists by this point -- this test only asserts the reconciliation
      // migration didn't touch or duplicate the read policy.
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grantfinder_searches'`,
      );
      expect(res.rows.map((r) => r.policyname).sort()).toEqual(['gf_searches_owner_insert', 'gf_searches_owner_read']);
    });

    test('anon has no privilege on any of the five gated tables', async () => {
      for (const table of ['gw_projects', 'lfa_projects', 'library_documents', 'grantfinder_searches', 'beneficiaries']) {
        const res = await pool.query(
          `SELECT has_table_privilege('anon', $1, 'SELECT') AS sel, has_table_privilege('anon', $1, 'INSERT') AS ins,
                  has_table_privilege('anon', $1, 'UPDATE') AS upd, has_table_privilege('anon', $1, 'DELETE') AS del`,
          [`public.${table}`],
        );
        expect(res.rows[0]).toEqual({ sel: false, ins: false, upd: false, del: false });
      }
    });

    test('service_role has maintenance privilege on all five gated tables', async () => {
      for (const table of ['gw_projects', 'lfa_projects', 'library_documents', 'grantfinder_searches', 'beneficiaries']) {
        const res = await pool.query(
          `SELECT has_table_privilege('service_role', $1, 'SELECT') AS sel, has_table_privilege('service_role', $1, 'INSERT') AS ins`,
          [`public.${table}`],
        );
        expect(res.rows[0]).toEqual({ sel: true, ins: true });
      }
    });

    test('authenticated has exactly the privilege each table\'s own policies require', async () => {
      const fullCrud = ['gw_projects', 'lfa_projects', 'library_documents', 'beneficiaries'];
      for (const table of fullCrud) {
        const res = await pool.query(
          `SELECT has_table_privilege('authenticated', $1, 'SELECT') AS sel, has_table_privilege('authenticated', $1, 'INSERT') AS ins,
                  has_table_privilege('authenticated', $1, 'UPDATE') AS upd, has_table_privilege('authenticated', $1, 'DELETE') AS del`,
          [`public.${table}`],
        );
        expect(res.rows[0]).toEqual({ sel: true, ins: true, upd: true, del: true });
      }

      const gfRes = await pool.query(
        `SELECT has_table_privilege('authenticated', 'public.grantfinder_searches', 'SELECT') AS sel,
                has_table_privilege('authenticated', 'public.grantfinder_searches', 'INSERT') AS ins,
                has_table_privilege('authenticated', 'public.grantfinder_searches', 'UPDATE') AS upd,
                has_table_privilege('authenticated', 'public.grantfinder_searches', 'DELETE') AS del`,
      );
      expect(gfRes.rows[0]).toEqual({ sel: true, ins: true, upd: false, del: false });
    });

    test('re-applying the reconciliation migration is an idempotent no-op', async () => {
      const sql = fs.readFileSync(AUTHZ_RECONCILE_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await expect(client.query(sql)).resolves.toBeDefined();

        const gwPolicies = await client.query(
          `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_projects'`,
        );
        expect(gwPolicies.rows.map((r) => r.policyname).sort()).toEqual([
          'gw_projects_member_insert', 'gw_projects_member_read', 'gw_projects_member_update', 'gw_projects_owner_admin_delete',
        ]);

        const libPolicies = await client.query(
          `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'library_documents'`,
        );
        expect(libPolicies.rows.map((r) => r.policyname).sort()).toEqual([
          'lib_docs_member_insert', 'lib_docs_member_read', 'lib_docs_member_update', 'lib_docs_owner_delete',
        ]);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Historical migration (20260727020000_plan_entitlements.sql) — its own
  // objects, unchanged, confirmed live on top of this bootstrap.
  // ---------------------------------------------------------------------
  describe('Historical migration objects', () => {
    test('create_default_subscription() and has_paid_plan() both exist', async () => {
      const res = await pool.query(
        `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
         AND proname IN ('create_default_subscription', 'has_paid_plan')`,
      );
      expect(res.rows.map((r) => r.proname).sort()).toEqual(['create_default_subscription', 'has_paid_plan']);
    });

    test('a newly-created organization receives a free/active subscription automatically', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'c9090909-0909-0909-0909-090909090909';
        await ensureAuthUser(client, creator);
        const orgId = await createOrg(client, 'R3 New Org Default', creator);

        const res = await client.query(`SELECT plan, status FROM public.subscriptions WHERE organization_id = $1`, [orgId]);
        expect(res.rows).toEqual([{ plan: 'free', status: 'active' }]);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('no organization exists without a subscription (backfill + trigger invariant)', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'ca0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a';
        await ensureAuthUser(client, creator);
        await createOrg(client, 'R3 Backfill Invariant Org', creator);

        const res = await client.query(
          `SELECT count(*)::int AS n FROM public.organizations o
           WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id)`,
        );
        expect(res.rows[0].n).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    describe('has_paid_plan() plan/status matrix', () => {
      async function checkPlan(client: pg.PoolClient, plan: string, status: string) {
        const creator = `cf${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}-0b0b-0b0b-0b0b-0b0b0b0b0b0b`;
        await ensureAuthUser(client, creator);
        const orgId = await createOrg(client, `R3 Matrix ${plan} ${status}`, creator);
        await client.query(`UPDATE public.subscriptions SET plan = $1, status = $2 WHERE organization_id = $3`, [plan, status, orgId]);
        const res = await client.query(`SELECT public.has_paid_plan($1) AS paid`, [orgId]);
        return res.rows[0].paid as boolean;
      }

      test('free plan (any active-like status) returns false', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          expect(await checkPlan(client, 'free', 'active')).toBe(false);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('starter, premium, and enterprise all return true when active', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          expect(await checkPlan(client, 'starter', 'active')).toBe(true);
          expect(await checkPlan(client, 'premium', 'active')).toBe(true);
          expect(await checkPlan(client, 'enterprise', 'active')).toBe(true);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a paid plan while trialing returns true', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          expect(await checkPlan(client, 'premium', 'trialing')).toBe(true);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });

      test('a paid plan past_due, canceled, or incomplete returns false', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          expect(await checkPlan(client, 'premium', 'past_due')).toBe(false);
          expect(await checkPlan(client, 'premium', 'canceled')).toBe(false);
          expect(await checkPlan(client, 'premium', 'incomplete')).toBe(false);
        } finally {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
      });
    });

    test('gw_projects_member_insert exists and requires creator identity, membership, and a paid plan', async () => {
      const res = await pool.query(
        `SELECT cmd, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'gw_projects' AND policyname = 'gw_projects_member_insert'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].cmd).toBe('INSERT');
      expect(res.rows[0].with_check).toContain('auth.uid() = created_by');
      expect(res.rows[0].with_check).toContain('is_org_member');
      expect(res.rows[0].with_check).toContain('has_paid_plan');
    });

    test('lib_docs_member_insert exists and requires uploader identity, membership, and a paid plan', async () => {
      const res = await pool.query(
        `SELECT cmd, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'library_documents' AND policyname = 'lib_docs_member_insert'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].cmd).toBe('INSERT');
      expect(res.rows[0].with_check).toContain('auth.uid() = uploaded_by');
      expect(res.rows[0].with_check).toContain('is_org_member');
      expect(res.rows[0].with_check).toContain('has_paid_plan');
    });

    test('gf_searches_owner_insert exists and requires user identity, membership, and a paid plan', async () => {
      const res = await pool.query(
        `SELECT cmd, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'grantfinder_searches' AND policyname = 'gf_searches_owner_insert'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].cmd).toBe('INSERT');
      expect(res.rows[0].with_check).toContain('auth.uid() = user_id');
      expect(res.rows[0].with_check).toContain('is_org_member');
      expect(res.rows[0].with_check).toContain('has_paid_plan');
    });

    test('lfa_projects_member_insert exists and requires membership and a paid plan', async () => {
      const res = await pool.query(
        `SELECT cmd, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'lfa_projects' AND policyname = 'lfa_projects_member_insert'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].cmd).toBe('INSERT');
      expect(res.rows[0].with_check).toContain('is_org_member');
      expect(res.rows[0].with_check).toContain('has_paid_plan');
    });

    test('all eight product-gating policies exist, and only INSERT is paid-gated where intended', async () => {
      const res = await pool.query(
        `SELECT tablename, policyname, cmd, coalesce(qual,'') AS qual, coalesce(with_check,'') AS with_check
         FROM pg_policies WHERE schemaname = 'public'
         AND policyname IN (
           'gw_projects_member_insert', 'lfa_projects_member_insert', 'lib_docs_member_insert',
           'gf_searches_owner_insert', 'beneficiaries_select', 'beneficiaries_insert',
           'beneficiaries_update', 'beneficiaries_delete'
         )`,
      );
      expect(res.rows).toHaveLength(8);

      const byName = new Map(res.rows.map((r) => [r.policyname, r]));
      for (const name of ['gw_projects_member_insert', 'lfa_projects_member_insert', 'lib_docs_member_insert', 'gf_searches_owner_insert', 'beneficiaries_insert']) {
        const row = byName.get(name);
        expect(row.cmd).toBe('INSERT');
        expect(row.with_check).toContain('has_paid_plan');
      }
      for (const name of ['beneficiaries_select', 'beneficiaries_update', 'beneficiaries_delete']) {
        const row = byName.get(name);
        expect(row.qual + row.with_check).not.toContain('has_paid_plan');
      }
    });

    test('no table named plan_entitlements exists anywhere', async () => {
      const res = await pool.query(
        `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'plan_entitlements'`,
      );
      expect(res.rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // Cross-table paid-plan functional flows -- lfa_projects and beneficiaries
  // own INSERT policies (lfa_projects_member_insert, beneficiaries_insert)
  // are not created by this bootstrap or by 20260727013000/014000/015000;
  // they already existed (beneficiaries since inception, lfa_projects since
  // 20260727010000) and are only re-affirmed by 20260727020000. Exercised
  // here end-to-end to prove the full R3 prerequisite chain, not just the
  // three new tables it adds.
  // ---------------------------------------------------------------------
  describe('Cross-table paid-plan functional flows', () => {
    async function seedCrossOrg(client: pg.PoolClient) {
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);

      const orgId = await createOrgWithSubscription(client, 'R3 Cross-Table Org', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      return { orgId };
    }

    test('lfa_projects: a paid member insert is allowed', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedCrossOrg(client);
        await client.query(`UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`, [orgId]);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(
          `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Paid LFA Project') RETURNING id`,
          [orgId],
        );
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('lfa_projects: a free-tier member insert is denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedCrossOrg(client);
        // seedCrossOrg's subscription defaults to free/active -- left as-is.

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        await expect(
          client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Free LFA Project')`, [orgId]),
        ).rejects.toThrow(/row-level security/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('beneficiaries: a paid member insert is allowed', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedCrossOrg(client);
        await client.query(`UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`, [orgId]);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(
          `INSERT INTO public.beneficiaries (org_id, full_name) VALUES ($1, 'Paid Beneficiary') RETURNING id`,
          [orgId],
        );
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('beneficiaries: a free-tier member insert is denied', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedCrossOrg(client);
        // seedCrossOrg's subscription defaults to free/active -- left as-is.

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        await expect(
          client.query(`INSERT INTO public.beneficiaries (org_id, full_name) VALUES ($1, 'Free Beneficiary')`, [orgId]),
        ).rejects.toThrow(/row-level security/i);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('beneficiaries: select, update, and delete remain ungated by paid plan for an existing member', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { orgId } = await seedCrossOrg(client);
        // Insert as service-role-equivalent (default pool connection bypasses
        // RLS) so this test isolates select/update/delete from the insert gate.
        const beneficiaryRes = await client.query(
          `INSERT INTO public.beneficiaries (org_id, full_name) VALUES ($1, 'Ungated Beneficiary') RETURNING id`,
          [orgId],
        );
        const beneficiaryId = beneficiaryRes.rows[0].id;
        // Free plan, left as-is from seedCrossOrg.

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const selectRes = await client.query(`SELECT id FROM public.beneficiaries WHERE id = $1`, [beneficiaryId]);
        expect(selectRes.rows).toHaveLength(1);

        const updateRes = await client.query(
          `UPDATE public.beneficiaries SET full_name = 'Updated Beneficiary' WHERE id = $1 RETURNING full_name`,
          [beneficiaryId],
        );
        expect(updateRes.rows[0].full_name).toBe('Updated Beneficiary');

        // Delete is role-gated (owner/admin only), not plan-gated -- switch
        // to the owner to prove the still-free org's delete succeeds.
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OWNER}'`);
        const deleteRes = await client.query(`DELETE FROM public.beneficiaries WHERE id = $1`, [beneficiaryId]);
        expect(deleteRes.rowCount).toBe(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Partial-schema guards
  // ---------------------------------------------------------------------
  describe('Partial-schema guards', () => {
    test('wrong id type aborts with SUBSCRIPTIONS_ID_INCOMPATIBLE', async () => {
      const sql = fs.readFileSync(R3_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_pkey`);
        await client.query(`ALTER TABLE public.subscriptions ALTER COLUMN id TYPE text`);

        await expect(client.query(sql)).rejects.toThrow(/SUBSCRIPTIONS_ID_INCOMPATIBLE/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('missing UNIQUE(organization_id) aborts with SUBSCRIPTIONS_TENANCY_INCOMPATIBLE', async () => {
      const sql = fs.readFileSync(R3_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_organization_id_key`);

        await expect(client.query(sql)).rejects.toThrow(/SUBSCRIPTIONS_TENANCY_INCOMPATIBLE/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('wrong column type (plan as text) aborts with SUBSCRIPTIONS_SCHEMA_INCOMPATIBLE', async () => {
      const sql = fs.readFileSync(R3_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`ALTER TABLE public.subscriptions ALTER COLUMN plan DROP DEFAULT`);
        await client.query(`ALTER TABLE public.subscriptions ALTER COLUMN plan TYPE text USING plan::text`);

        await expect(client.query(sql)).rejects.toThrow(/SUBSCRIPTIONS_SCHEMA_INCOMPATIBLE/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('re-applying the R3 migration against the already-canonical table is a no-op', async () => {
      const sql = fs.readFileSync(R3_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await expect(client.query(sql)).resolves.toBeDefined();

        const policies = await client.query(
          `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions'`,
        );
        expect(policies.rows.map((r) => r.policyname).sort()).toEqual(['subs_admin_write', 'subs_members_read']);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });
});
