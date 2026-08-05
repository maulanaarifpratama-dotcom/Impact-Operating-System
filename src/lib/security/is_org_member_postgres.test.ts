import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

// Local Postgres connection URL provided by `supabase start`
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * public.is_org_member(uuid, uuid) shipped in 20260600000000_organizations.sql
 * as an unconditional `SELECT true;` and was never redefined by any later
 * committed migration, even though production already runs a safe, scoped
 * membership check. 20260805000000_backport_safe_is_org_member.sql backports
 * that safe definition into migration history so a database rebuilt from
 * scratch never lands on the unconditional-true stub.
 *
 * These tests exist to make a regression back to the unconditional stub
 * loud and immediate: dozens of RLS policies across the schema call this
 * function by name, and "always true" fails silently — every row is simply
 * visible to everyone, with no error anywhere.
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
    console.warn('[is_org_member postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('is_org_member() Source-of-Truth Backport — Real Postgres DB Validation', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  /**
   * R1 (20260724190000_bootstrap_org_role_membership.sql,
   * 20260726010000_bootstrap_organizations_created_by.sql) added a real
   * foreign key from organization_members.user_id to auth.users(id), and made
   * organizations.created_by NOT NULL with its own foreign key to
   * auth.users(id). Every synthetic user id used below must exist as a real
   * auth.users row first, and every organization insert must supply a
   * creator, or these fixtures violate constraints that did not exist when
   * this suite was first written.
   */
  async function ensureAuthUser(client: pg.PoolClient, userId: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `${userId}@is-org-member-test.local`],
    );
  }

  async function createOrg(client: pg.PoolClient, name: string, createdBy: string) {
    const res = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, createdBy],
    );
    return res.rows[0].id;
  }

  test('1. Existing member returns true for own organization', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      await ensureAuthUser(client, userA);
      const orgId = await createOrg(client, 'Backport Test Org A', userA);

      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgId, userA],
      );

      const res = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgId, userA]);
      expect(res.rows[0].is_member).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('2. Real member of a DIFFERENT organization returns false (cross-organization)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      await ensureAuthUser(client, userA);
      const orgAId = await createOrg(client, 'Backport Test Org A', userA);
      const orgBId = await createOrg(client, 'Backport Test Org B', userA);

      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgAId, userA],
      );

      // userA is a real member of orgA, but never joined orgB.
      const res = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgBId, userA]);
      expect(res.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('3. Unknown user (no membership row anywhere) returns false', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      await ensureAuthUser(client, userA);
      const orgId = await createOrg(client, 'Backport Test Org A', userA);
      const unknownUser = '99999999-9999-9999-9999-999999999999';

      const res = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgId, unknownUser]);
      expect(res.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('4. Unknown organization (no such org_id) returns false', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      const unknownOrg = '88888888-8888-8888-8888-888888888888';

      const res = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [unknownOrg, userA]);
      expect(res.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('5. Null organization id returns false', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      const res = await client.query(`SELECT public.is_org_member(NULL, $1) AS is_member`, [userA]);
      expect(res.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('6. Null user id returns false', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userA = '11111111-1111-1111-1111-111111111111';
      await ensureAuthUser(client, userA);
      const orgId = await createOrg(client, 'Backport Test Org A', userA);

      const res = await client.query(`SELECT public.is_org_member($1, NULL) AS is_member`, [orgId]);
      expect(res.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('7. Function does not return true unconditionally (regression guard for the historical SELECT true stub)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Two organizations that genuinely exist, one real member each, no
      // overlap. If the function ever regresses to `SELECT true;`, every one
      // of these four cross combinations would incorrectly report true.
      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';
      await ensureAuthUser(client, userA);
      await ensureAuthUser(client, userB);
      const orgAId = await createOrg(client, 'Backport Test Org A', userA);
      const orgBId = await createOrg(client, 'Backport Test Org B', userB);

      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgAId, userA],
      );
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgBId, userB],
      );

      const matrix = await client.query(
        `SELECT
           public.is_org_member($1, $3) AS a_user_a,
           public.is_org_member($1, $4) AS a_user_b,
           public.is_org_member($2, $3) AS b_user_a,
           public.is_org_member($2, $4) AS b_user_b`,
        [orgAId, orgBId, userA, userB],
      );

      expect(matrix.rows[0].a_user_a).toBe(true);
      expect(matrix.rows[0].b_user_b).toBe(true);
      expect(matrix.rows[0].a_user_b).toBe(false);
      expect(matrix.rows[0].b_user_a).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('8. Function remains SECURITY DEFINER', async () => {
    const res = await pool.query(
      `SELECT prosecdef FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
    );
    expect(res.rows[0].prosecdef).toBe(true);
  });

  test('9. Function search_path is pinned to public, pg_temp', async () => {
    const res = await pool.query(
      `SELECT proconfig FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
    );
    const config: string[] | null = res.rows[0].proconfig;
    expect(config).not.toBeNull();
    expect(config).toContain('search_path=public, pg_temp');
  });

  test('10. Function remains STABLE', async () => {
    const res = await pool.query(
      `SELECT provolatile FROM pg_proc WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
    );
    // 's' = STABLE, 'i' = IMMUTABLE, 'v' = VOLATILE
    expect(res.rows[0].provolatile).toBe('s');
  });

  test('11. Function signature remains is_org_member(uuid, uuid) -> boolean', async () => {
    const res = await pool.query(
      `SELECT pg_get_function_identity_arguments(oid) AS args, prorettype::regtype::text AS return_type
       FROM pg_proc
       WHERE proname = 'is_org_member' AND pronamespace = 'public'::regnamespace`,
    );
    expect(res.rows).toHaveLength(1); // exactly one overload — signature was never widened
    expect(res.rows[0].args).toBe('_org_id uuid, _user_id uuid');
    expect(res.rows[0].return_type).toBe('boolean');
  });

  test('12. A representative production policy (lfa_projects) still calls is_org_member() and its scoping still holds', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // The policy text itself must still reference this exact function —
      // proves this backport did not touch the policy.
      const policyRes = await client.query(
        `SELECT qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lfa_projects' AND policyname = 'lfa_projects_member_select'`,
      );
      expect(policyRes.rows).toHaveLength(1);
      expect(policyRes.rows[0].qual).toContain('is_org_member(org_id, auth.uid())');

      // And the function must actually scope real lfa_projects rows the way
      // that policy relies on: member of the row's org sees it, a member of
      // a different org does not.
      const userA = '11111111-1111-1111-1111-111111111111';
      await ensureAuthUser(client, userA);
      const orgAId = await createOrg(client, 'Backport Test Org A', userA);
      const orgBId = await createOrg(client, 'Backport Test Org B', userA);

      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgAId, userA],
      );
      const projRes = await client.query(
        `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Backport Test Project') RETURNING org_id`,
        [orgAId],
      );

      const ownProject = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [
        projRes.rows[0].org_id,
        userA,
      ]);
      expect(ownProject.rows[0].is_member).toBe(true);

      const foreignProject = await client.query(`SELECT public.is_org_member($1, $2) AS is_member`, [orgBId, userA]);
      expect(foreignProject.rows[0].is_member).toBe(false);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
