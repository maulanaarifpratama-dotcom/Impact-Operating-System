import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const R2_MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20260726023000_bootstrap_system_integrations.sql');

/**
 * R2 system integrations recovery: one bootstrap migration that lets a fresh
 * replay reach 20260726030000_restrict_system_integrations.sql, which
 * references public.system_integrations but never creates it, enables RLS on
 * it, or grants base table privileges on it.
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
    console.warn('[R2 system integrations tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('R2 System Integrations Recovery — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@r2-test.local`],
    );
  }

  const NON_ADMIN = 'b1111111-1111-1111-1111-111111111111';
  const SYNTHETIC_ADMIN = 'b2222222-2222-2222-2222-222222222222';

  // ---------------------------------------------------------------------
  // Shape
  // ---------------------------------------------------------------------
  describe('Shape', () => {
    test('table exists with exactly the eight canonical columns', async () => {
      const res = await pool.query(
        `SELECT column_name, udt_name, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'system_integrations'
         ORDER BY column_name`,
      );
      const byName = new Map(res.rows.map((r) => [r.column_name, r]));

      expect([...byName.keys()].sort()).toEqual(
        ['account_email', 'created_at', 'drive_id', 'id', 'metadata', 'provider', 'status', 'updated_at'].sort(),
      );

      expect(byName.get('id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'NO' });
      expect(byName.get('metadata')).toMatchObject({ udt_name: 'jsonb' });
      expect(byName.get('created_at')).toMatchObject({ udt_name: 'timestamptz' });
      expect(byName.get('updated_at')).toMatchObject({ udt_name: 'timestamptz' });
      expect(byName.get('provider')).toMatchObject({ udt_name: 'text' });
      expect(byName.get('status')).toMatchObject({ udt_name: 'text' });
      expect(byName.get('account_email')).toMatchObject({ udt_name: 'text' });
      expect(byName.get('drive_id')).toMatchObject({ udt_name: 'text' });
    });

    test('id is the sole primary key', async () => {
      const res = await pool.query(
        `SELECT conkey, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.system_integrations'::regclass AND attname = 'id') AS id_attnum
         FROM pg_constraint
         WHERE conrelid = 'public.system_integrations'::regclass AND contype = 'p'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].conkey).toEqual([res.rows[0].id_attnum]);
    });

    test('canonical defaults are in place', async () => {
      const res = await pool.query(
        `SELECT column_name, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'system_integrations'
           AND column_name IN ('id', 'metadata', 'created_at', 'updated_at')`,
      );
      const byName = new Map(res.rows.map((r) => [r.column_name, r.column_default as string]));

      expect(byName.get('id')).toContain('gen_random_uuid()');
      expect(byName.get('metadata')).toContain("'{}'::jsonb");
      expect(byName.get('created_at')).toContain('now()');
      expect(byName.get('updated_at')).toContain('now()');
    });

    test('has no organization_id column (platform-wide, not tenant-scoped)', async () => {
      const res = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'system_integrations' AND column_name = 'organization_id'`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('has no index beyond the primary key', async () => {
      const res = await pool.query(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'system_integrations'`,
      );
      expect(res.rows.map((r) => r.indexname)).toEqual(['system_integrations_pkey']);
    });

    test('has no trigger', async () => {
      const res = await pool.query(
        `SELECT count(*)::int AS n FROM pg_trigger
         WHERE tgrelid = 'public.system_integrations'::regclass AND NOT tgisinternal`,
      );
      expect(res.rows[0].n).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // RLS
  // ---------------------------------------------------------------------
  describe('RLS', () => {
    test('RLS is enabled', async () => {
      const res = await pool.query(
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.system_integrations'::regclass`,
      );
      expect(res.rows[0].relrowsecurity).toBe(true);
    });

    test('exactly the two historical policies exist, and neither is a permissive anon policy', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, roles, qual, with_check
         FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'system_integrations'
         ORDER BY policyname`,
      );

      expect(res.rows.map((r) => r.policyname)).toEqual(['system_integrations_admin_write', 'system_integrations_read']);

      for (const row of res.rows) {
        // node-postgres returns pg_policies.roles (type name[]) as the raw
        // Postgres array-literal text, e.g. "{authenticated}", not a JS array.
        expect(row.roles).toBe('{authenticated}');
      }

      const readPolicy = res.rows.find((r) => r.policyname === 'system_integrations_read');
      expect(readPolicy.cmd).toBe('SELECT');
      expect(readPolicy.qual).toBe('true');

      const writePolicy = res.rows.find((r) => r.policyname === 'system_integrations_admin_write');
      expect(writePolicy.cmd).toBe('ALL');
      expect(writePolicy.qual).toContain('is_admin');
      expect(writePolicy.with_check).toContain('is_admin');
    });
  });

  // ---------------------------------------------------------------------
  // Privileges
  // ---------------------------------------------------------------------
  describe('Privileges', () => {
    test('anon has no table privilege', async () => {
      const res = await pool.query(
        `SELECT
           has_table_privilege('anon', 'public.system_integrations', 'SELECT') AS sel,
           has_table_privilege('anon', 'public.system_integrations', 'INSERT') AS ins,
           has_table_privilege('anon', 'public.system_integrations', 'UPDATE') AS upd,
           has_table_privilege('anon', 'public.system_integrations', 'DELETE') AS del`,
      );
      expect(res.rows[0]).toEqual({ sel: false, ins: false, upd: false, del: false });
    });

    test('authenticated has full table-level privilege (RLS is still the real gate)', async () => {
      const res = await pool.query(
        `SELECT
           has_table_privilege('authenticated', 'public.system_integrations', 'SELECT') AS sel,
           has_table_privilege('authenticated', 'public.system_integrations', 'INSERT') AS ins,
           has_table_privilege('authenticated', 'public.system_integrations', 'UPDATE') AS upd,
           has_table_privilege('authenticated', 'public.system_integrations', 'DELETE') AS del`,
      );
      expect(res.rows[0]).toEqual({ sel: true, ins: true, upd: true, del: true });
    });

    test('service_role can select (maintenance access)', async () => {
      const res = await pool.query(
        `SELECT has_table_privilege('service_role', 'public.system_integrations', 'SELECT') AS sel`,
      );
      expect(res.rows[0].sel).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Authenticated non-admin / Global admin
  // ---------------------------------------------------------------------
  describe('Authenticated non-admin and global admin', () => {
    async function seedSyntheticIntegrationRow(client: pg.PoolClient) {
      const res = await client.query(
        `INSERT INTO public.system_integrations (provider, status, metadata)
         VALUES ('r2-test-provider', 'inactive', $1::jsonb)
         RETURNING id`,
        [JSON.stringify({ tenant: 'r2-test.invalid' })],
      );
      return res.rows[0].id as string;
    }

    test('non-admin can SELECT the synthetic registry row', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const rowId = await seedSyntheticIntegrationRow(client);
        await ensureAuthUser(client, NON_ADMIN);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${NON_ADMIN}'`);

        const res = await client.query(`SELECT id FROM public.system_integrations WHERE id = $1`, [rowId]);
        expect(res.rows).toHaveLength(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('non-admin cannot INSERT, UPDATE, or DELETE', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const rowId = await seedSyntheticIntegrationRow(client);
        await ensureAuthUser(client, NON_ADMIN);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${NON_ADMIN}'`);

        await client.query('SAVEPOINT sp_denied_insert');
        await expect(
          client.query(`INSERT INTO public.system_integrations (provider) VALUES ('r2-test-non-admin-insert')`),
        ).rejects.toThrow(/row-level security/i);
        await client.query('ROLLBACK TO SAVEPOINT sp_denied_insert');

        const updateRes = await client.query(
          `UPDATE public.system_integrations SET status = 'active' WHERE id = $1`,
          [rowId],
        );
        expect(updateRes.rowCount).toBe(0);

        const deleteRes = await client.query(`DELETE FROM public.system_integrations WHERE id = $1`, [rowId]);
        expect(deleteRes.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('global admin can SELECT, INSERT, UPDATE, and DELETE', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await ensureAuthUser(client, SYNTHETIC_ADMIN);
        await client.query(`INSERT INTO public.admin_users (user_id) VALUES ($1)`, [SYNTHETIC_ADMIN]);
        const rowId = await seedSyntheticIntegrationRow(client);

        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${SYNTHETIC_ADMIN}'`);

        const selectRes = await client.query(`SELECT id FROM public.system_integrations WHERE id = $1`, [rowId]);
        expect(selectRes.rows).toHaveLength(1);

        const insertRes = await client.query(
          `INSERT INTO public.system_integrations (provider, metadata) VALUES ('r2-test-admin-insert', $1::jsonb) RETURNING id`,
          [JSON.stringify({ tenant: 'r2-test.invalid' })],
        );
        expect(insertRes.rows).toHaveLength(1);

        const updateRes = await client.query(
          `UPDATE public.system_integrations SET status = 'active' WHERE id = $1 RETURNING status`,
          [rowId],
        );
        expect(updateRes.rows[0].status).toBe('active');

        const deleteRes = await client.query(`DELETE FROM public.system_integrations WHERE id = $1`, [rowId]);
        expect(deleteRes.rowCount).toBe(1);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Metadata boundary
  // ---------------------------------------------------------------------
  describe('Metadata boundary', () => {
    test('synthetic safe metadata round-trips with no secret-shaped keys', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(
          `INSERT INTO public.system_integrations (provider, metadata)
           VALUES ('r2-test-metadata-boundary', $1::jsonb)
           RETURNING metadata`,
          [JSON.stringify({ tenant: 'r2-test.invalid' })],
        );

        const metadata = res.rows[0].metadata;
        expect(metadata).toEqual({ tenant: 'r2-test.invalid' });

        const suspiciousKeys = ['token', 'access_token', 'refresh_token', 'client_secret', 'api_key', 'apiKey', 'password', 'secret'];
        for (const key of suspiciousKeys) {
          expect(Object.keys(metadata)).not.toContain(key);
        }
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Partial-schema guard
  // ---------------------------------------------------------------------
  describe('Partial-schema guard', () => {
    test('an incompatible tenancy model (organization_id present) aborts the R2 migration', async () => {
      const sql = fs.readFileSync(R2_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Simulate the one incompatible state this migration must refuse to
        // reconcile silently. Rolled back at the end of this test, so the
        // real table is never actually left with this column.
        await client.query(`ALTER TABLE public.system_integrations ADD COLUMN organization_id UUID`);

        await expect(client.query(sql)).rejects.toThrow(/SYSTEM_INTEGRATIONS_TENANCY_INCOMPATIBLE/);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------
  describe('Idempotency', () => {
    test('re-applying the R2 migration against the already-canonical table is a no-op', async () => {
      const sql = fs.readFileSync(R2_MIGRATION_FILE, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await expect(client.query(sql)).resolves.toBeDefined();

        const policies = await client.query(
          `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_integrations'`,
        );
        // Still exactly the two historical policies -- the R2 migration
        // creates none, so re-applying it cannot have duplicated anything.
        expect(policies.rows.map((r) => r.policyname).sort()).toEqual([
          'system_integrations_admin_write',
          'system_integrations_read',
        ]);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });
});
