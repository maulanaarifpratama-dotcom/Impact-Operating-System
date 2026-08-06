import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-3: programme_deliverables.stage_id + the Stage validation/mismatch
 * logic added to create_programme_deliverable and
 * update_programme_deliverable_metadata
 * (20260806080000_add_meal_context_and_deliverable_stage.sql). The
 * existing D1 lifecycle regressions (d1_postgres.test.ts,
 * d1_rls_postgres.test.ts) cover transition_programme_deliverable and
 * archive_programme_deliverable unchanged behavior; this file covers only
 * the new Stage-link surface.
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[deliverable_stage postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('programme_deliverables.stage_id (PM-3) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@deliverable-stage-test.local`],
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

  async function createStage(client: pg.PoolClient, project: string, title: string) {
    return (
      await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
        project, title, null, null, null, null,
      ])
    ).rows[0];
  }

  async function createDeliverable(
    client: pg.PoolClient,
    project: string,
    title: string,
    wbsItemId: string | null,
    stageId: string | null,
  ) {
    return (
      await client.query(`SELECT * FROM public.create_programme_deliverable($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [
        project, wbsItemId, 'REPORT', title, null, null, null, null, '2026-12-31', false, null, stageId,
      ])
    ).rows[0];
  }

  async function createWbsItem(client: pg.PoolClient, org: string, project: string, name: string, stageId: string | null) {
    return (
      await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, name, level, status, stage_id)
         VALUES ($1, $2, $3, 1, 'not_started', $4) RETURNING id, stage_id`,
        [project, org, name, stageId],
      )
    ).rows[0];
  }

  async function createProjectInOrg(client: pg.PoolClient, org: string, name: string) {
    return (
      await client.query(
        `INSERT INTO public.lfa_projects (org_id, name, project_mode) VALUES ($1, $2, 'project_management') RETURNING id`,
        [org, name],
      )
    ).rows[0].id;
  }

  // deliverable_type/title/target_date/target_date_is_estimated are written
  // unconditionally by update_programme_deliverable_metadata (no update-flag
  // gates them, matching the pre-PM-3 calling convention) -- every call must
  // re-supply the row's current values for those four columns or they get
  // clobbered (title/deliverable_type/target_date are NOT NULL). This helper
  // does that and only varies the Stage-link arguments under test.
  async function updateDeliverableStage(
    client: pg.PoolClient,
    current: { id: string; title: string; deliverable_type: string; target_date: string; target_date_is_estimated: boolean },
    stageId: string | null,
  ) {
    return (
      await client.query(
        `SELECT * FROM public.update_programme_deliverable_metadata($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          current.id, null, false,
          current.deliverable_type, current.title, null, false,
          null, false, null, false, null, false,
          current.target_date, current.target_date_is_estimated, null, false,
          stageId, true,
        ],
      )
    ).rows[0];
  }

  test('schema: stage_id column, FK, and index exist on programme_deliverables', async () => {
    const col = await pool.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'programme_deliverables' AND column_name = 'stage_id'`,
    );
    expect(col.rows.length).toBe(1);
    expect(col.rows[0].is_nullable).toBe('YES');

    const fk = await pool.query(
      `SELECT confrelid::regclass::text AS ref FROM pg_constraint
       WHERE conrelid = 'public.programme_deliverables'::regclass AND contype = 'f'
         AND conname LIKE '%stage_id%'`,
    );
    expect(fk.rows[0]?.ref).toBe('project_stages');

    const idx = await pool.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'programme_deliverables'
       AND indexname LIKE '%stage_id%'`,
    );
    expect(idx.rows.length).toBe(1);
  });

  test('create_programme_deliverable: same-project Stage assignment succeeds and emits exactly one event', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Deliv Stage Org', owner, 'Deliv Stage Project');

      await actAs(client, owner);
      const stage = await createStage(client, project, 'Stage 1');
      const deliverable = await createDeliverable(client, project, 'Deliverable With Stage', null, stage.id);
      expect(deliverable.stage_id).toBe(stage.id);

      const events = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'deliverable'`,
          [deliverable.id],
        )
      ).rows[0].n;
      expect(events).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('create_programme_deliverable: cross-project and cross-org Stage rejected', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000002';
      const otherOwner = '50000000-0000-0000-0000-000000000003';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);

      const { org: orgA, project: projectA } = await paidPmOrgAndProject(client, 'Deliv Cross A', owner, 'Deliv Cross Project A');
      const projectA2 = await createProjectInOrg(client, orgA, 'Deliv Cross Project A2');
      const { project: projectB } = await paidPmOrgAndProject(client, 'Deliv Cross B', otherOwner, 'Deliv Cross Project B');

      await actAs(client, owner);
      const stageInA2 = await createStage(client, projectA2, 'Stage In A2');
      await client.query('SAVEPOINT sp_cross_project');
      let crossProjectRejected = false;
      try {
        await createDeliverable(client, projectA, 'Cross Project Deliverable', null, stageInA2.id);
      } catch (err) {
        crossProjectRejected = /DELIVERABLE_STAGE_PROJECT_MISMATCH/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_project');
      expect(crossProjectRejected).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, otherOwner);
      const stageInB = await createStage(client, projectB, 'Stage In B');

      await client.query('RESET ROLE');
      await actAs(client, owner);
      await client.query('SAVEPOINT sp_cross_org');
      let crossOrgRejected = false;
      try {
        await createDeliverable(client, projectA, 'Cross Org Deliverable', null, stageInB.id);
      } catch (err) {
        crossOrgRejected = /DELIVERABLE_STAGE_(ORG_MISMATCH|PROJECT_MISMATCH|NOT_FOUND)/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_org');
      expect(crossOrgRejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('create_programme_deliverable: archived Stage rejected on new link', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000004';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Deliv Archived Org', owner, 'Deliv Archived Project');

      await actAs(client, owner);
      const stage = await createStage(client, project, 'Will Be Archived');
      await client.query(`SELECT * FROM public.archive_project_stage($1)`, [stage.id]);

      await client.query('SAVEPOINT sp_archived');
      let rejected = false;
      try {
        await createDeliverable(client, project, 'Archived Stage Deliverable', null, stage.id);
      } catch (err) {
        rejected = /DELIVERABLE_STAGE_ARCHIVED/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_archived');
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('update_programme_deliverable_metadata: existing Stage link survives later Stage archival', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000005';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Deliv Survives Org', owner, 'Deliv Survives Project');

      await actAs(client, owner);
      const stage = await createStage(client, project, 'Linked Then Archived');
      const deliverable = await createDeliverable(client, project, 'Linked Deliverable', null, stage.id);
      await client.query(`SELECT * FROM public.archive_project_stage($1)`, [stage.id]);

      // Re-sending the SAME Stage link (unchanged) must still succeed even
      // though the Stage is now archived -- only a NEW or CHANGED link is
      // rejected against an archived parent.
      const updated = await updateDeliverableStage(client, deliverable, stage.id);
      expect(updated.title).toBe('Linked Deliverable');
      expect(updated.stage_id).toBe(stage.id);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('update_programme_deliverable_metadata: Stage/WBS mismatch rejected; inherited WBS Stage allowed when unset', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000006';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Deliv Mismatch Org', owner, 'Deliv Mismatch Project');

      await actAs(client, owner);
      const stageX = await createStage(client, project, 'Stage X');
      const stageY = await createStage(client, project, 'Stage Y');

      await client.query('RESET ROLE');
      const wbsInX = await createWbsItem(client, org, project, 'WBS In Stage X', stageX.id);
      await actAs(client, owner);

      // Creating with only wbs_item_id (Stage inherited, not explicitly forced) succeeds.
      const inherited = await createDeliverable(client, project, 'Inherits WBS Stage', wbsInX.id, null);
      expect(inherited.stage_id).toBeNull();
      expect(inherited.wbs_item_id).toBe(wbsInX.id);

      // Explicitly setting a conflicting Stage on that same WBS-linked deliverable is rejected.
      await client.query('SAVEPOINT sp_mismatch');
      let mismatchRejected = false;
      try {
        await updateDeliverableStage(client, inherited, stageY.id);
      } catch (err) {
        mismatchRejected = /DELIVERABLE_STAGE_WBS_MISMATCH/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_mismatch');
      expect(mismatchRejected).toBe(true);

      // Setting the matching Stage explicitly succeeds and emits exactly one stage-assigned event.
      await updateDeliverableStage(client, inherited, stageX.id);
      const events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'deliverable'
           AND event_type LIKE 'deliverable_stage_%'`,
          [inherited.id],
        )
      ).rows;
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('deliverable_stage_assigned');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('update_programme_deliverable_metadata: unassigning a Stage emits deliverable_stage_unassigned exactly once', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '50000000-0000-0000-0000-000000000007';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Deliv Unassign Org', owner, 'Deliv Unassign Project');

      await actAs(client, owner);
      const stage = await createStage(client, project, 'Stage To Unassign');
      const deliverable = await createDeliverable(client, project, 'Deliverable To Unassign', null, stage.id);

      const updated = await updateDeliverableStage(client, deliverable, null);
      expect(updated.stage_id).toBeNull();

      const events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'deliverable'
           AND event_type LIKE 'deliverable_stage_%'`,
          [deliverable.id],
        )
      ).rows;
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('deliverable_stage_unassigned');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('base-table write privileges on programme_deliverables are not loosened', async () => {
    const priv = await pool.query(
      `SELECT has_table_privilege('authenticated', 'public.programme_deliverables', 'INSERT') AS can_insert,
              has_table_privilege('authenticated', 'public.programme_deliverables', 'UPDATE') AS can_update`,
    );
    expect(priv.rows[0].can_insert).toBe(false);
    expect(priv.rows[0].can_update).toBe(false);
  });
});
