import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-3: Activity Log read surface. project_activity_events itself was
 * created in PM-1A (20260806020000_add_project_activity_events.sql) and is
 * unchanged this sprint; PM-3 adds the read-only UI on top and several new
 * server-side writers (assign_meal_item_context, the Deliverable RPCs).
 * This file locks down the read contract those writers now feed.
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[project_activity_log postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('project_activity_events read surface (PM-3) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@activity-log-test.local`],
    );
  }

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
  }

  async function paidPmOrgAndProject(client: pg.PoolClient, orgName: string, ownerId: string, projectName: string) {
    const org = (
      await client.query(`INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`, [
        orgName,
        ownerId,
      ])
    ).rows[0].id;
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [org, ownerId],
    );
    await client.query(`UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`, [
      org,
    ]);
    const project = (
      await client.query(
        `INSERT INTO public.lfa_projects (org_id, name, project_mode) VALUES ($1, $2, 'project_management') RETURNING id`,
        [org, projectName],
      )
    ).rows[0].id;
    return { org, project };
  }

  async function insertEvent(client: pg.PoolClient, org: string, project: string, owner: string, eventType: string) {
    return (
      await client.query(
        `INSERT INTO public.project_activity_events (org_id, project_id, actor_id, entity_type, entity_id, event_type)
         VALUES ($1, $2, $3, 'project', $2, $4) RETURNING id, created_at`,
        [org, project, owner, eventType],
      )
    ).rows[0];
  }

  test('same-org member can read; cross-org member cannot', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '60000000-0000-0000-0000-000000000001';
      const outsider = '60000000-0000-0000-0000-000000000002';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, outsider);
      const { org, project } = await paidPmOrgAndProject(client, 'Activity Read Org', owner, 'Activity Read Project');
      await paidPmOrgAndProject(client, 'Activity Outsider Org', outsider, 'Activity Outsider Project');

      await insertEvent(client, org, project, owner, 'project_created');

      await actAs(client, owner);
      const ownVisible = await client.query(
        `SELECT count(*)::int AS n FROM public.project_activity_events WHERE project_id = $1`,
        [project],
      );
      expect(ownVisible.rows[0].n).toBe(1);

      await client.query('RESET ROLE');
      await actAs(client, outsider);
      const outsiderVisible = await client.query(
        `SELECT count(*)::int AS n FROM public.project_activity_events WHERE project_id = $1`,
        [project],
      );
      expect(outsiderVisible.rows[0].n).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('direct INSERT, UPDATE, and DELETE are all denied to authenticated', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '60000000-0000-0000-0000-000000000003';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Activity Write Org', owner, 'Activity Write Project');
      const event = await insertEvent(client, org, project, owner, 'project_created');

      await actAs(client, owner);

      await client.query('SAVEPOINT sp_insert');
      let insertDenied = false;
      try {
        await client.query(
          `INSERT INTO public.project_activity_events (org_id, project_id, actor_id, entity_type, entity_id, event_type)
           VALUES ($1, $2, $3, 'project', $2, 'project_created')`,
          [org, project, owner],
        );
      } catch (err) {
        insertDenied = /permission denied/i.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_insert');
      expect(insertDenied).toBe(true);

      await client.query('SAVEPOINT sp_update');
      let updateDenied = false;
      try {
        await client.query(`UPDATE public.project_activity_events SET event_type = 'objective_created' WHERE id = $1`, [
          event.id,
        ]);
      } catch (err) {
        updateDenied = /permission denied/i.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_update');
      expect(updateDenied).toBe(true);

      await client.query('SAVEPOINT sp_delete');
      let deleteDenied = false;
      try {
        await client.query(`DELETE FROM public.project_activity_events WHERE id = $1`, [event.id]);
      } catch (err) {
        deleteDenied = /permission denied/i.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_delete');
      expect(deleteDenied).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('newest-first query returns events in descending created_at order', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '60000000-0000-0000-0000-000000000004';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Activity Order Org', owner, 'Activity Order Project');

      const first = await insertEvent(client, org, project, owner, 'project_created');
      await client.query(`UPDATE public.project_activity_events SET created_at = created_at - interval '2 minutes' WHERE id = $1`, [
        first.id,
      ]);
      const second = await insertEvent(client, org, project, owner, 'objective_created');
      await client.query(`UPDATE public.project_activity_events SET created_at = created_at - interval '1 minute' WHERE id = $1`, [
        second.id,
      ]);
      const third = await insertEvent(client, org, project, owner, 'stage_created');

      await actAs(client, owner);
      const rows = (
        await client.query(
          `SELECT id FROM public.project_activity_events WHERE project_id = $1 ORDER BY created_at DESC`,
          [project],
        )
      ).rows;

      expect(rows.map((r) => r.id)).toEqual([third.id, second.id, first.id]);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
