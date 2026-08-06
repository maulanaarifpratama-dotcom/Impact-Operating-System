import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[deliverables postgres tests] no local Postgres on :54322 - run supabase start to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('Deliverable Register D1 RLS and DML guardrails', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('enables RLS on both deliverable tables', async () => {
    const rls = await pool.query(`
      select relname, relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and relname in ('programme_deliverables', 'programme_deliverable_events')
      order by relname
    `);

    expect(rls.rows).toEqual([
      { relname: 'programme_deliverable_events', relrowsecurity: true },
      { relname: 'programme_deliverables', relrowsecurity: true },
    ]);
  });

  it('defines select policy only for both tables', async () => {
    const policies = await pool.query(`
      select tablename, cmd, count(*)::int as count
      from pg_policies
      where schemaname = 'public'
        and tablename in ('programme_deliverables', 'programme_deliverable_events')
      group by tablename, cmd
      order by tablename, cmd
    `);

    expect(policies.rows).toEqual([
      { tablename: 'programme_deliverable_events', cmd: 'SELECT', count: 1 },
      { tablename: 'programme_deliverables', cmd: 'SELECT', count: 1 },
    ]);
  });

  it('defines no insert/update/delete policies on both tables', async () => {
    const writePolicies = await pool.query(`
      select tablename, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in ('programme_deliverables', 'programme_deliverable_events')
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
    `);

    expect(writePolicies.rows.length).toBe(0);
  });

  it('revokes direct insert/update/delete privileges from authenticated role', async () => {
    const directWrite = await pool.query(`
      select
        has_table_privilege('authenticated', 'public.programme_deliverables', 'INSERT') as ins,
        has_table_privilege('authenticated', 'public.programme_deliverables', 'UPDATE') as upd,
        has_table_privilege('authenticated', 'public.programme_deliverables', 'DELETE') as del
    `);

    expect(directWrite.rows[0]).toEqual({ ins: false, upd: false, del: false });
  });

  it('grants execute on lifecycle RPCs to authenticated role', async () => {
    const grants = await pool.query(`
      select
        has_function_privilege('authenticated', 'public.create_programme_deliverable(uuid,uuid,text,text,text,uuid,text,uuid,date,boolean,date,uuid)', 'EXECUTE') as create_ok,
        has_function_privilege('authenticated', 'public.update_programme_deliverable_metadata(uuid,uuid,boolean,text,text,text,boolean,uuid,boolean,text,boolean,uuid,boolean,date,boolean,date,boolean,uuid,boolean)', 'EXECUTE') as update_ok,
        has_function_privilege('authenticated', 'public.transition_programme_deliverable(uuid,text,text,timestamp with time zone)', 'EXECUTE') as transition_ok,
        has_function_privilege('authenticated', 'public.archive_programme_deliverable(uuid,text)', 'EXECUTE') as archive_ok
    `);

    expect(grants.rows[0]).toEqual({
      create_ok: true,
      update_ok: true,
      transition_ok: true,
      archive_ok: true,
    });
  });

  // --- Behavioral RLS enforcement, executed as `authenticated` -------------
  //
  // The checks above prove policies and grants exist. `postgres` is the
  // table owner and bypasses RLS entirely, so none of them prove the SELECT
  // policy actually filters rows, or that a direct write is actually
  // rejected rather than merely lacking a matching policy on paper. These
  // cases switch to the real `authenticated` role (same auth emulation the
  // WBS postgres tests use) to prove enforcement, not just shape.

  const MEMBER_A = '11111111-1111-1111-1111-111111111111';
  const MEMBER_B_OTHER_ORG = '55555555-5555-5555-5555-555555555555';

  // programme_deliverables.created_by and programme_deliverable_events.actor_id
  // carry real FOREIGN KEY constraints to auth.users(id) — unlike
  // organization_members.user_id, which has none. Both synthetic actors must
  // exist as real auth.users rows before either insert below will succeed.
  async function ensureAuthUser(client: pg.PoolClient, userId: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `${userId}@d1-test.local`],
    );
  }

  async function seedTwoOrgsOneDeliverable(client: pg.PoolClient) {
    await ensureAuthUser(client, MEMBER_A);
    await ensureAuthUser(client, MEMBER_B_OTHER_ORG);

    const orgARes = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ('RLS Org A', $1) RETURNING id`,
      [MEMBER_A],
    );
    const orgAId = orgARes.rows[0].id;
    const orgBRes = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ('RLS Org B', $1) RETURNING id`,
      [MEMBER_B_OTHER_ORG],
    );
    const orgBId = orgBRes.rows[0].id;

    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
      [orgAId, MEMBER_A],
    );
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
      [orgBId, MEMBER_B_OTHER_ORG],
    );

    const projRes = await client.query(
      `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'RLS Project') RETURNING id`,
      [orgAId],
    );
    const projectId = projRes.rows[0].id;

    const delivRes = await client.query(
      `INSERT INTO public.programme_deliverables (org_id, lfa_project_id, title, target_date, created_by)
       VALUES ($1, $2, 'RLS Probe Deliverable', '2026-12-01', $3) RETURNING id`,
      [orgAId, projectId, MEMBER_A],
    );
    const deliverableId = delivRes.rows[0].id;

    await client.query(
      `INSERT INTO public.programme_deliverable_events (org_id, lfa_project_id, deliverable_id, event_type, to_status, actor_id)
       VALUES ($1, $2, $3, 'CREATED', 'DRAFT', $4)`,
      [orgAId, projectId, deliverableId, MEMBER_A],
    );

    return { orgAId, orgBId, deliverableId };
  }

  it('a member of the deliverable\'s own org can SELECT it under RLS', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { deliverableId } = await seedTwoOrgsOneDeliverable(client);

      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER_A}'`);

      const res = await client.query(`SELECT id FROM public.programme_deliverables WHERE id = $1`, [deliverableId]);
      expect(res.rows).toHaveLength(1);

      const evRes = await client.query(
        `SELECT id FROM public.programme_deliverable_events WHERE deliverable_id = $1`,
        [deliverableId],
      );
      expect(evRes.rows).toHaveLength(1);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('a member of a DIFFERENT org cannot see the deliverable or its events under RLS (cross-tenant)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { deliverableId } = await seedTwoOrgsOneDeliverable(client);

      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER_B_OTHER_ORG}'`);

      const res = await client.query(`SELECT id FROM public.programme_deliverables WHERE id = $1`, [deliverableId]);
      expect(res.rows).toHaveLength(0);

      const evRes = await client.query(
        `SELECT id FROM public.programme_deliverable_events WHERE deliverable_id = $1`,
        [deliverableId],
      );
      expect(evRes.rows).toHaveLength(0);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('a direct INSERT into programme_deliverables as authenticated is actually rejected, not silently accepted', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { orgAId } = await seedTwoOrgsOneDeliverable(client);
      const projRes = await client.query(
        `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Direct Insert Attempt Project') RETURNING id`,
        [orgAId],
      );

      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER_A}'`);

      await expect(
        client.query(
          `INSERT INTO public.programme_deliverables (org_id, lfa_project_id, title, target_date, created_by)
           VALUES ($1, $2, 'Should never persist', '2026-12-01', $3)`,
          [orgAId, projRes.rows[0].id, MEMBER_A],
        ),
      ).rejects.toThrow(/permission denied/i);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('a direct UPDATE on programme_deliverables as authenticated is actually rejected', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { deliverableId } = await seedTwoOrgsOneDeliverable(client);

      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER_A}'`);

      await expect(
        client.query(`UPDATE public.programme_deliverables SET title = 'Hijacked' WHERE id = $1`, [deliverableId]),
      ).rejects.toThrow(/permission denied/i);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('a direct INSERT into programme_deliverable_events as authenticated is actually rejected', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { orgAId, deliverableId } = await seedTwoOrgsOneDeliverable(client);
      const projRes = await client.query(`SELECT lfa_project_id FROM public.programme_deliverables WHERE id = $1`, [
        deliverableId,
      ]);

      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER_A}'`);

      await expect(
        client.query(
          `INSERT INTO public.programme_deliverable_events (org_id, lfa_project_id, deliverable_id, event_type, to_status, actor_id)
           VALUES ($1, $2, $3, 'CREATED', 'DRAFT', $4)`,
          [orgAId, projRes.rows[0].lfa_project_id, deliverableId, MEMBER_A],
        ),
      ).rejects.toThrow(/permission denied/i);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
