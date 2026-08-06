import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-3: lfa_meal_items.objective_id/stage_id/deliverable_id + the
 * assign_meal_item_context RPC + the BEFORE INSERT OR UPDATE integrity
 * trigger (20260806080000_add_meal_context_and_deliverable_stage.sql).
 * lfa_meal_items keeps its existing broad direct-write exposure this
 * sprint, exactly like lfa_wbs_items in PM-2, so raw direct writes are run
 * as the plain connection role -- see the note in
 * wbs_stage_link_postgres.test.ts for why (lfa_meal_items has never
 * received an explicit GRANT to authenticated in any tracked migration, a
 * pre-existing condition unrelated to and predating PM-3).
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[meal_context postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('lfa_meal_items context (PM-3) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@meal-context-test.local`],
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

  async function createMealItem(client: pg.PoolClient, org: string, project: string, text: string) {
    return (
      await client.query(
        `INSERT INTO public.lfa_meal_items (lfa_project_id, org_id, lfa_level, indicator_text, status, disaggregation)
         VALUES ($1, $2, 'output', $3, 'Belum Mulai', '{}') RETURNING id, objective_id, stage_id, deliverable_id`,
        [project, org, text],
      )
    ).rows[0];
  }

  async function createObjective(client: pg.PoolClient, project: string, title: string) {
    return (await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [project, title, null, null])).rows[0];
  }

  async function createStage(client: pg.PoolClient, project: string, title: string) {
    return (
      await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
        project, title, null, null, null, null,
      ])
    ).rows[0];
  }

  test('schema: context columns, FKs, and indexes exist', async () => {
    const cols = await pool.query(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'lfa_meal_items'
         AND column_name IN ('objective_id', 'stage_id', 'deliverable_id')`,
    );
    expect(cols.rows.length).toBe(3);
    expect(cols.rows.every((r) => r.is_nullable === 'YES')).toBe(true);

    const fks = await pool.query(
      `SELECT confrelid::regclass::text AS ref FROM pg_constraint
       WHERE conrelid = 'public.lfa_meal_items'::regclass AND contype = 'f'`,
    );
    const refs = fks.rows.map((r) => r.ref);
    expect(refs).toContain('project_objectives');
    expect(refs).toContain('project_stages');
    expect(refs).toContain('programme_deliverables');

    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lfa_meal_items'
       AND (indexname LIKE '%objective_id%' OR indexname LIKE '%stage_id%' OR indexname LIKE '%deliverable_id%')`,
    );
    expect(idx.rows.length).toBe(3);
  });

  test('same-project links succeed for all three context fields', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '40000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Meal Link Org', owner, 'Meal Link Project');
      const item = await createMealItem(client, org, project, 'Indicator A');

      await actAs(client, owner);
      const objective = await createObjective(client, project, 'Objective A');
      const stage = await createStage(client, project, 'Stage A');
      const deliverable = (
        await client.query(`SELECT * FROM public.create_programme_deliverable($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
          project, null, 'REPORT', 'Deliverable A', null, null, null, null, '2026-12-31', false, null,
        ])
      ).rows[0];

      const assigned = (
        await client.query(`SELECT * FROM public.assign_meal_item_context($1, $2, $3, $4)`, [
          item.id, objective.id, stage.id, deliverable.id,
        ])
      ).rows[0];

      expect(assigned.objective_id).toBe(objective.id);
      expect(assigned.stage_id).toBe(stage.id);
      expect(assigned.deliverable_id).toBe(deliverable.id);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('trigger: cross-project and cross-org context links are rejected on a raw direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '40000000-0000-0000-0000-000000000002';
      const otherOwner = '40000000-0000-0000-0000-000000000003';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);

      const { org, project: projectA } = await paidPmOrgAndProject(client, 'Meal Cross A', owner, 'Meal Cross Project A');
      const { project: projectA2 } = await paidPmOrgAndProject(client, 'Meal Cross A', owner, 'Meal Cross Project A2');
      const { project: projectB } = await paidPmOrgAndProject(client, 'Meal Cross B', otherOwner, 'Meal Cross Project B');
      const itemInA = await createMealItem(client, org, projectA, 'Indicator In A');

      await actAs(client, owner);
      const objectiveInA2 = await createObjective(client, projectA2, 'Objective In A2');

      await client.query('RESET ROLE');
      await client.query('SAVEPOINT sp_cross_project');
      let crossProjectRejected = false;
      try {
        await client.query(`UPDATE public.lfa_meal_items SET objective_id = $1 WHERE id = $2`, [
          objectiveInA2.id, itemInA.id,
        ]);
      } catch (err) {
        crossProjectRejected = /MEAL_OBJECTIVE_PROJECT_MISMATCH/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_project');
      expect(crossProjectRejected).toBe(true);

      await actAs(client, otherOwner);
      const stageInB = await createStage(client, projectB, 'Stage In B');

      await client.query('RESET ROLE');
      await client.query('SAVEPOINT sp_cross_org');
      let crossOrgRejected = false;
      try {
        await client.query(`UPDATE public.lfa_meal_items SET stage_id = $1 WHERE id = $2`, [stageInB.id, itemInA.id]);
      } catch (err) {
        crossOrgRejected = /MEAL_STAGE_(PROJECT_MISMATCH|ORG_MISMATCH|NOT_FOUND)/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_org');
      expect(crossOrgRejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('trigger: new link to archived parent rejected; existing link survives later archival; unlink succeeds', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '40000000-0000-0000-0000-000000000004';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Meal Archive Org', owner, 'Meal Archive Project');
      const freshItem = await createMealItem(client, org, project, 'Fresh Indicator');
      const linkedItem = await createMealItem(client, org, project, 'Linked Indicator');

      await actAs(client, owner);
      const objective = await createObjective(client, project, 'Will Be Archived');
      await client.query(`SELECT * FROM public.archive_project_objective($1)`, [objective.id]);
      const liveObjective = await createObjective(client, project, 'Still Active');

      await client.query('RESET ROLE');

      await client.query('SAVEPOINT sp_new_link');
      let newLinkRejected = false;
      try {
        await client.query(`UPDATE public.lfa_meal_items SET objective_id = $1 WHERE id = $2`, [
          objective.id, freshItem.id,
        ]);
      } catch (err) {
        newLinkRejected = /MEAL_OBJECTIVE_ARCHIVED/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_new_link');
      expect(newLinkRejected).toBe(true);

      await client.query(`UPDATE public.lfa_meal_items SET objective_id = $1 WHERE id = $2`, [
        liveObjective.id, linkedItem.id,
      ]);
      await client.query(`SELECT * FROM public.archive_project_objective($1)`, [liveObjective.id]);

      // Unrelated metadata update on the still-linked item must still succeed.
      await client.query(`UPDATE public.lfa_meal_items SET indicator_text = 'Linked Indicator (renamed)' WHERE id = $1`, [
        linkedItem.id,
      ]);
      let row = (
        await client.query(`SELECT indicator_text, objective_id FROM public.lfa_meal_items WHERE id = $1`, [linkedItem.id])
      ).rows[0];
      expect(row.indicator_text).toBe('Linked Indicator (renamed)');
      expect(row.objective_id).toBe(liveObjective.id);

      // Unlink succeeds even though the objective is archived.
      await client.query(`UPDATE public.lfa_meal_items SET objective_id = NULL WHERE id = $1`, [linkedItem.id]);
      row = (await client.query(`SELECT objective_id FROM public.lfa_meal_items WHERE id = $1`, [linkedItem.id])).rows[0];
      expect(row.objective_id).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: a failed context assignment creates zero events', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '40000000-0000-0000-0000-000000000005';
      const otherOwner = '40000000-0000-0000-0000-000000000006';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);
      const { org, project } = await paidPmOrgAndProject(client, 'Meal FailEvent Org', owner, 'Meal FailEvent Project');
      const { project: otherProject } = await paidPmOrgAndProject(client, 'Meal FailEvent Org2', otherOwner, 'Meal FailEvent Project2');
      const item = await createMealItem(client, org, project, 'Indicator');

      await actAs(client, otherOwner);
      const otherStage = await createStage(client, otherProject, 'Other Org Stage');

      await client.query('RESET ROLE');
      await actAs(client, owner);
      await client.query('SAVEPOINT sp_fail');
      let failed = false;
      try {
        await client.query(`SELECT * FROM public.assign_meal_item_context($1, $2, $3, $4)`, [
          item.id, null, otherStage.id, null,
        ]);
      } catch {
        failed = true;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_fail');
      expect(failed).toBe(true);

      const events = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'meal_item'`,
          [item.id],
        )
      ).rows[0].n;
      expect(events).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('legacy context = NULL is always valid', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '40000000-0000-0000-0000-000000000007';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Meal Legacy Org', owner, 'Meal Legacy Project');
      const item = await createMealItem(client, org, project, 'Legacy Indicator');
      expect(item.objective_id).toBeNull();
      expect(item.stage_id).toBeNull();
      expect(item.deliverable_id).toBeNull();
      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
