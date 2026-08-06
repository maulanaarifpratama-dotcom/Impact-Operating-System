import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-2: lfa_wbs_items.stage_id + assign_wbs_item_to_stage RPC + the
 * BEFORE INSERT OR UPDATE integrity trigger (20260806070000_add_wbs_stage_link.sql).
 * lfa_wbs_items keeps its existing broad direct-write exposure this sprint,
 * so the trigger -- not the RPC -- is the actual enforcement boundary; every
 * test that matters is run against a raw direct UPDATE, not just the RPC, to
 * prove that.
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[wbs_stage_link postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('lfa_wbs_items.stage_id (PM-2) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@wbs-stage-test.local`],
    );
  }

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
  }

  async function paidPmOrgAndProject(
    client: pg.PoolClient,
    orgName: string,
    ownerId: string,
    projectName: string,
  ) {
    const org = (
      await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
        [orgName, ownerId],
      )
    ).rows[0].id;
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [org, ownerId],
    );
    await client.query(
      `UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`,
      [org],
    );
    const project = (
      await client.query(
        `INSERT INTO public.lfa_projects (org_id, name, project_mode) VALUES ($1, $2, 'project_management') RETURNING id`,
        [org, projectName],
      )
    ).rows[0].id;
    return { org, project };
  }

  async function createWbsItem(client: pg.PoolClient, org: string, project: string, name: string) {
    return (
      await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name) VALUES ($1, $2, 1, $3) RETURNING id, stage_id`,
        [project, org, name],
      )
    ).rows[0];
  }

  async function createStage(client: pg.PoolClient, project: string, title: string) {
    return (
      await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
        project,
        title,
        null,
        null,
        null,
        null,
      ])
    ).rows[0];
  }

  // --- Schema -------------------------------------------------------------

  test('schema: stage_id column, FK, and index exist', async () => {
    const col = await pool.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'lfa_wbs_items' AND column_name = 'stage_id'`,
    );
    expect(col.rows[0]?.is_nullable).toBe('YES');

    const fk = await pool.query(
      `SELECT confrelid::regclass::text AS ref FROM pg_constraint
       WHERE conrelid = 'public.lfa_wbs_items'::regclass AND contype = 'f' AND confrelid = 'public.project_stages'::regclass`,
    );
    expect(fk.rows.length).toBe(1);

    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lfa_wbs_items' AND indexname LIKE '%stage_id%'`,
    );
    expect(idx.rows.length).toBeGreaterThan(0);
  });

  // --- RPC / direct-write assign, move, unassign ---------------------------

  test('RPC: same-project assignment, move to a different Stage, and unassign all succeed exactly once each', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '30000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Assign Org', owner, 'Assign Project');
      const wbsItem = await createWbsItem(client, org, project, 'Root Item');
      expect(wbsItem.stage_id).toBeNull();

      await actAs(client, owner);
      const stageA = await createStage(client, project, 'Stage A');
      const stageB = await createStage(client, project, 'Stage B');

      const assigned = (
        await client.query(`SELECT * FROM public.assign_wbs_item_to_stage($1, $2)`, [wbsItem.id, stageA.id])
      ).rows[0];
      expect(assigned.stage_id).toBe(stageA.id);

      const moved = (
        await client.query(`SELECT * FROM public.assign_wbs_item_to_stage($1, $2)`, [wbsItem.id, stageB.id])
      ).rows[0];
      expect(moved.stage_id).toBe(stageB.id);

      const unassigned = (
        await client.query(`SELECT * FROM public.assign_wbs_item_to_stage($1, $2)`, [wbsItem.id, null])
      ).rows[0];
      expect(unassigned.stage_id).toBeNull();

      const events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'wbs_item' ORDER BY created_at`,
          [wbsItem.id],
        )
      ).rows;
      expect(events.map((e) => e.event_type)).toEqual(['wbs_stage_assigned', 'wbs_stage_assigned', 'wbs_stage_unassigned']);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('trigger: cross-project and cross-org stage assignment are rejected on a raw direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '30000000-0000-0000-0000-000000000002';
      const otherOwner = '30000000-0000-0000-0000-000000000003';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);

      const { org, project: projectA } = await paidPmOrgAndProject(client, 'Cross Org A', owner, 'Cross Project A');
      const { project: projectA2 } = await paidPmOrgAndProject(client, 'Cross Org A', owner, 'Cross Project A2');
      const { project: projectB } = await paidPmOrgAndProject(client, 'Cross Org B', otherOwner, 'Cross Project B');
      const wbsInA = await createWbsItem(client, org, projectA, 'WBS In A');

      await actAs(client, owner);
      const stageInA2 = await createStage(client, projectA2, 'Stage In A2');

      // The trigger is the enforcement boundary regardless of caller
      // privilege -- lfa_wbs_items keeps its existing broad direct-write
      // exposure this sprint, unchanged, so this proves the trigger fires
      // for a raw write, not just through the RPC. Run as the plain
      // connection role: lfa_wbs_items has never had an explicit GRANT to
      // `authenticated` in any tracked migration (a pre-existing gap,
      // already flagged elsewhere in this project's history, unrelated to
      // and not fixed by PM-2), so a fresh local replay's ambient default
      // denies authenticated INSERT/UPDATE here outright -- testing the
      // trigger via the role that can always write is both the available
      // path and, if anything, the stronger proof.
      await client.query('RESET ROLE');
      await client.query('SAVEPOINT sp_cross_project');
      let crossProjectRejected = false;
      try {
        await client.query(`UPDATE public.lfa_wbs_items SET stage_id = $1 WHERE id = $2`, [stageInA2.id, wbsInA.id]);
      } catch (err) {
        crossProjectRejected = /WBS_STAGE_PROJECT_MISMATCH/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_project');
      expect(crossProjectRejected).toBe(true);

      await actAs(client, otherOwner);
      const stageInB = await createStage(client, projectB, 'Stage In B');

      await client.query('RESET ROLE');
      await client.query('SAVEPOINT sp_cross_org');
      let crossOrgRejected = false;
      try {
        await client.query(`UPDATE public.lfa_wbs_items SET stage_id = $1 WHERE id = $2`, [stageInB.id, wbsInA.id]);
      } catch (err) {
        crossOrgRejected = /WBS_STAGE_(PROJECT_MISMATCH|ORG_MISMATCH|NOT_FOUND)/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_org');
      expect(crossOrgRejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('trigger: a new link to an archived Stage is rejected, but an existing link survives later Stage archival', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '30000000-0000-0000-0000-000000000004';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Archive Link Org', owner, 'Archive Link Project');
      const freshItem = await createWbsItem(client, org, project, 'Fresh Item');
      const linkedItem = await createWbsItem(client, org, project, 'Linked Item');

      await actAs(client, owner);
      const stage = await createStage(client, project, 'Will Be Archived');
      await client.query(`SELECT * FROM public.archive_project_stage($1)`, [stage.id]);
      const liveStage = await createStage(client, project, 'Still Active');

      // Raw direct writes, run as the plain connection role -- see the note
      // in the previous test on why (lfa_wbs_items' unresolved ambient grant
      // for `authenticated`, unrelated to and predating PM-2).
      await client.query('RESET ROLE');

      await client.query('SAVEPOINT sp_new_link');
      let newLinkRejected = false;
      try {
        await client.query(`UPDATE public.lfa_wbs_items SET stage_id = $1 WHERE id = $2`, [stage.id, freshItem.id]);
      } catch (err) {
        newLinkRejected = /WBS_STAGE_ARCHIVED/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_new_link');
      expect(newLinkRejected).toBe(true);

      await client.query(`UPDATE public.lfa_wbs_items SET stage_id = $1 WHERE id = $2`, [liveStage.id, linkedItem.id]);

      await client.query(`SELECT * FROM public.archive_project_stage($1)`, [liveStage.id]);

      // Unrelated metadata update on the still-linked item must still succeed.
      await client.query(`UPDATE public.lfa_wbs_items SET name = 'Linked Item (renamed)' WHERE id = $1`, [
        linkedItem.id,
      ]);
      const row = (
        await client.query(`SELECT name, stage_id FROM public.lfa_wbs_items WHERE id = $1`, [linkedItem.id])
      ).rows[0];
      expect(row.name).toBe('Linked Item (renamed)');
      expect(row.stage_id).toBe(liveStage.id);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('legacy stage_id = NULL is always valid, and unassigning to NULL is always allowed', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '30000000-0000-0000-0000-000000000005';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Legacy Org', owner, 'Legacy Project');
      const legacyItem = await createWbsItem(client, org, project, 'Legacy Item');
      expect(legacyItem.stage_id).toBeNull();

      await actAs(client, owner);
      const stage = await createStage(client, project, 'A Stage');

      await client.query('RESET ROLE');
      await client.query(`UPDATE public.lfa_wbs_items SET stage_id = $1 WHERE id = $2`, [stage.id, legacyItem.id]);
      await client.query(`UPDATE public.lfa_wbs_items SET stage_id = NULL WHERE id = $1`, [legacyItem.id]);

      const row = (await client.query(`SELECT stage_id FROM public.lfa_wbs_items WHERE id = $1`, [legacyItem.id])).rows[0];
      expect(row.stage_id).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: a failed assignment creates zero events', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '30000000-0000-0000-0000-000000000006';
      const otherOwner = '30000000-0000-0000-0000-000000000007';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);
      const { org, project } = await paidPmOrgAndProject(client, 'FailEvent Org', owner, 'FailEvent Project');
      const { project: otherProject } = await paidPmOrgAndProject(client, 'FailEvent Org2', otherOwner, 'FailEvent Project2');
      const wbsItem = await createWbsItem(client, org, project, 'Item');

      await actAs(client, otherOwner);
      const otherStage = await createStage(client, otherProject, 'Other Org Stage');

      await client.query('RESET ROLE');
      await actAs(client, owner);
      await client.query('SAVEPOINT sp_fail');
      let failed = false;
      try {
        await client.query(`SELECT * FROM public.assign_wbs_item_to_stage($1, $2)`, [wbsItem.id, otherStage.id]);
      } catch {
        failed = true;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_fail');
      expect(failed).toBe(true);

      const events = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'wbs_item'`,
          [wbsItem.id],
        )
      ).rows[0].n;
      expect(events).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
