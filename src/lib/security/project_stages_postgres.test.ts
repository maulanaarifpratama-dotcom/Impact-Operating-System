import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-1C: project_stages table + create/update/reorder/archive/restore RPCs
 * (20260806060000_add_project_stages.sql). Mutation is RPC-only. The
 * primary_objective_id link follows the new-or-changed-link pattern:
 * existence/project-match/org-match are checked whenever the link is
 * non-null, but the archived-parent check only fires when the link is being
 * newly set or changed -- an existing link survives if that Objective is
 * archived afterward. Tested explicitly below, not just asserted.
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[project_stages postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('project_stages (PM-1C) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@stages-test.local`],
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

  async function createObjective(client: pg.PoolClient, project: string, title: string) {
    return (
      await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
        project,
        title,
        null,
        null,
      ])
    ).rows[0];
  }

  // --- Schema -------------------------------------------------------------

  test('schema: table exists with expected columns, types, and defaults', async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'project_stages'
       ORDER BY ordinal_position`,
    );
    const byName = Object.fromEntries(res.rows.map((r) => [r.column_name, r]));

    expect(byName.org_id.is_nullable).toBe('NO');
    expect(byName.project_id.is_nullable).toBe('NO');
    expect(byName.primary_objective_id.is_nullable).toBe('YES');
    expect(byName.title.is_nullable).toBe('NO');
    expect(byName.status.is_nullable).toBe('NO');
    expect(byName.status.column_default).toContain('not_started');
    expect(byName.sort_order.is_nullable).toBe('NO');
    expect(byName.planned_start_date.is_nullable).toBe('YES');
    expect(byName.planned_end_date.is_nullable).toBe('YES');
    expect(byName.actual_start_date.is_nullable).toBe('YES');
    expect(byName.actual_end_date.is_nullable).toBe('YES');
    expect(byName.created_by.is_nullable).toBe('NO');
    expect(byName.archived_at.is_nullable).toBe('YES');
    expect(byName.archived_by.is_nullable).toBe('YES');
  });

  test('schema: status CHECK allows exactly not_started, in_progress, completed, archived', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Schema Status Org', owner, 'Schema Status Project');

      for (const status of ['not_started', 'in_progress', 'completed', 'archived']) {
        await client.query('SAVEPOINT sp');
        await client.query(
          `INSERT INTO public.project_stages (org_id, project_id, title, status, created_by)
           SELECT org_id, $1, 'x', $2, $3 FROM public.lfa_projects WHERE id = $1`,
          [project, status, owner],
        );
        await client.query('ROLLBACK TO SAVEPOINT sp');
      }

      await client.query('SAVEPOINT sp');
      let rejected = false;
      try {
        await client.query(
          `INSERT INTO public.project_stages (org_id, project_id, title, status, created_by)
           SELECT org_id, $1, 'x', 'bogus_status', $2 FROM public.lfa_projects WHERE id = $1`,
          [project, owner],
        );
      } catch {
        rejected = true;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp');
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('schema: blank title rejected, expected FKs/indexes present, no hard-delete RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-000000000002';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Schema Title Org', owner, 'Schema Title Project');

      let rejected = false;
      try {
        await client.query(
          `INSERT INTO public.project_stages (org_id, project_id, title, created_by)
           SELECT org_id, $1, '   ', $2 FROM public.lfa_projects WHERE id = $1`,
          [project, owner],
        );
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }

    const fks = await pool.query(
      `SELECT confrelid::regclass::text AS references_table
       FROM pg_constraint
       WHERE conrelid = 'public.project_stages'::regclass AND contype = 'f'`,
    );
    const refs = fks.rows.map((r) => r.references_table);
    expect(refs).toContain('organizations');
    expect(refs).toContain('lfa_projects');
    expect(refs).toContain('project_objectives');
    expect(refs).toContain('auth.users');

    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'project_stages'`,
    );
    const names = indexes.rows.map((r) => r.indexname);
    expect(names.some((n) => n.includes('org_id'))).toBe(true);
    expect(names.some((n) => n.includes('project_id'))).toBe(true);
    expect(names.some((n) => n.includes('sort'))).toBe(true);

    const hardDelete = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname ILIKE '%delete_project_stage%' OR proname ILIKE '%hard_delete%stage%'`,
    );
    expect(hardDelete.rows.length).toBe(0);
  });

  // --- Privileges / RLS -----------------------------------------------------

  test('privileges: anon denied, authenticated direct writes denied, same-org SELECT allowed, cross-org SELECT denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerA = '20000000-0000-0000-0000-000000000003';
      const ownerB = '20000000-0000-0000-0000-000000000004';
      await ensureAuthUser(client, ownerA);
      await ensureAuthUser(client, ownerB);
      const { org: orgA, project: projectA } = await paidPmOrgAndProject(client, 'RLS Org A', ownerA, 'RLS Project A');
      await paidPmOrgAndProject(client, 'RLS Org B', ownerB, 'RLS Project B');

      const stageId = (
        await client.query(
          `INSERT INTO public.project_stages (org_id, project_id, title, created_by) VALUES ($1, $2, 'Visible To A', $3) RETURNING id`,
          [orgA, projectA, ownerA],
        )
      ).rows[0].id;

      await client.query('SET LOCAL ROLE anon');
      await client.query('SAVEPOINT sp_anon');
      let anonDenied = false;
      try {
        await client.query('SELECT 1 FROM public.project_stages LIMIT 1');
      } catch {
        anonDenied = true;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_anon');
      expect(anonDenied).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, ownerA);

      await client.query('SAVEPOINT sp_insert');
      let insertDenied = false;
      try {
        await client.query(
          `INSERT INTO public.project_stages (org_id, project_id, title, created_by) VALUES ($1, $2, 'Direct', $3)`,
          [orgA, projectA, ownerA],
        );
      } catch (err) {
        insertDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_insert');
      expect(insertDenied).toBe(true);

      await client.query('SAVEPOINT sp_update');
      let updateDenied = false;
      try {
        await client.query(`UPDATE public.project_stages SET title = 'Hacked' WHERE id = $1`, [stageId]);
      } catch (err) {
        updateDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_update');
      expect(updateDenied).toBe(true);

      await client.query('SAVEPOINT sp_delete');
      let deleteDenied = false;
      try {
        await client.query(`DELETE FROM public.project_stages WHERE id = $1`, [stageId]);
      } catch (err) {
        deleteDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_delete');
      expect(deleteDenied).toBe(true);

      const asOwnerA = await client.query(`SELECT id FROM public.project_stages WHERE id = $1`, [stageId]);
      expect(asOwnerA.rows.length).toBe(1);

      await client.query('RESET ROLE');
      await actAs(client, ownerB);
      const asOwnerB = await client.query(`SELECT id FROM public.project_stages WHERE id = $1`, [stageId]);
      expect(asOwnerB.rows.length).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // --- RPC ------------------------------------------------------------------

  test('RPC: member create/update/reorder succeed; member archive denied; owner archive+restore succeed', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-000000000005';
      const member = '20000000-0000-0000-0000-000000000006';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, member);
      const { org, project } = await paidPmOrgAndProject(client, 'RPC Org', owner, 'RPC Project');
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [org, member],
      );

      await actAs(client, owner);
      const created = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'First Stage',
          'desc',
          null,
          null,
          null,
        ])
      ).rows[0];
      expect(created.status).toBe('not_started');

      const updated = (
        await client.query(`SELECT * FROM public.update_project_stage_metadata($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
          created.id,
          'Renamed Stage',
          'new desc',
          null,
          'in_progress',
          null,
          null,
          null,
          null,
        ])
      ).rows[0];
      expect(updated.title).toBe('Renamed Stage');
      expect(updated.status).toBe('in_progress');

      const second = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Second Stage',
          null,
          null,
          null,
          null,
        ])
      ).rows[0];

      const reordered = (
        await client.query(`SELECT * FROM public.reorder_project_stages($1, $2::uuid[])`, [
          project,
          [second.id, created.id],
        ])
      ).rows[0];
      expect(reordered.item_count).toBe(2);
      expect(reordered.reordered).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, member);
      await client.query('SAVEPOINT sp_member_archive');
      let memberArchiveDenied = false;
      try {
        await client.query(`SELECT * FROM public.archive_project_stage($1)`, [created.id]);
      } catch (err) {
        memberArchiveDenied = /STAGE_ARCHIVE_FORBIDDEN/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_member_archive');
      expect(memberArchiveDenied).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, owner);
      const archived = (await client.query(`SELECT * FROM public.archive_project_stage($1)`, [created.id])).rows[0];
      expect(archived.status).toBe('archived');

      const restored = (await client.query(`SELECT * FROM public.restore_project_stage($1)`, [created.id])).rows[0];
      expect(restored.status).toBe('not_started');

      const row = (
        await client.query(`SELECT archived_at, archived_by FROM public.project_stages WHERE id = $1`, [created.id])
      ).rows[0];
      expect(row.archived_at).toBeNull();
      expect(row.archived_by).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: a programme_design project is rejected by create_project_stage', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-000000000007';
      await ensureAuthUser(client, owner);
      const org = (
        await client.query(`INSERT INTO public.organizations (name, created_by) VALUES ('PD Org', $1) RETURNING id`, [
          owner,
        ])
      ).rows[0].id;
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [org, owner],
      );
      await client.query(
        `UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`,
        [org],
      );
      const project = (
        await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'PD Project') RETURNING id`, [
          org,
        ])
      ).rows[0].id;

      await actAs(client, owner);
      let rejected = false;
      try {
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Should Fail',
          null,
          null,
          null,
          null,
        ]);
      } catch (err) {
        rejected = /STAGE_PROJECT_MODE_INVALID/.test((err as Error).message);
      }
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('objective link: cross-project and cross-org objective links are rejected', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-000000000008';
      const otherOwner = '20000000-0000-0000-0000-000000000009';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, otherOwner);

      const { project: projectA } = await paidPmOrgAndProject(client, 'Link Org A', owner, 'Link Project A');
      const { project: projectA2 } = await paidPmOrgAndProject(client, 'Link Org A', owner, 'Link Project A2');
      const { project: projectB } = await paidPmOrgAndProject(client, 'Link Org B', otherOwner, 'Link Project B');

      await actAs(client, owner);
      const objectiveInA2 = await createObjective(client, projectA2, 'Objective In A2');

      await client.query('SAVEPOINT sp_cross_project');
      let crossProjectRejected = false;
      try {
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          projectA,
          'Cross Project Stage',
          null,
          objectiveInA2.id,
          null,
          null,
        ]);
      } catch (err) {
        crossProjectRejected = /STAGE_OBJECTIVE_PROJECT_MISMATCH/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_project');
      expect(crossProjectRejected).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, otherOwner);
      const objectiveInB = await createObjective(client, projectB, 'Objective In B');

      await client.query('RESET ROLE');
      await actAs(client, owner);
      await client.query('SAVEPOINT sp_cross_org');
      let crossOrgRejected = false;
      try {
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          projectA,
          'Cross Org Stage',
          null,
          objectiveInB.id,
          null,
          null,
        ]);
      } catch (err) {
        // A cross-org objective is also, by construction, cross-project (a
        // project belongs to exactly one org), so the project-mismatch check
        // fires first -- STAGE_OBJECTIVE_ORG_MISMATCH exists as independent
        // defense-in-depth but is unreachable via this particular scenario.
        crossOrgRejected = /STAGE_OBJECTIVE_(PROJECT_MISMATCH|ORG_MISMATCH|NOT_FOUND)/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_org');
      expect(crossOrgRejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('objective link: new link to an archived objective is rejected, but an existing link survives later archival', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-00000000000a';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Archive Link Org', owner, 'Archive Link Project');

      await actAs(client, owner);
      const objective = await createObjective(client, project, 'Will Be Archived');
      await client.query(`SELECT * FROM public.archive_project_objective($1)`, [objective.id]);

      await client.query('SAVEPOINT sp_archived_link');
      let newLinkRejected = false;
      try {
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'New Stage With Archived Link',
          null,
          objective.id,
          null,
          null,
        ]);
      } catch (err) {
        newLinkRejected = /STAGE_OBJECTIVE_ARCHIVED/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_archived_link');
      expect(newLinkRejected).toBe(true);

      const liveObjective = await createObjective(client, project, 'Still Active');
      const stage = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Stage With Live Link',
          null,
          liveObjective.id,
          null,
          null,
        ])
      ).rows[0];
      expect(stage.primary_objective_id).toBe(liveObjective.id);

      await client.query(`SELECT * FROM public.archive_project_objective($1)`, [liveObjective.id]);

      const survived = (
        await client.query(
          `SELECT * FROM public.update_project_stage_metadata($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [stage.id, 'Stage With Live Link (renamed)', 'still linked', liveObjective.id, null, null, null, null, null],
        )
      ).rows[0];
      expect(survived.primary_objective_id).toBe(liveObjective.id);
      expect(survived.title).toBe('Stage With Live Link (renamed)');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('activity events: exactly one per action, zero on failure, and reorder no-op/actual distinction', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-00000000000b';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Events Org', owner, 'Events Project');

      await actAs(client, owner);
      const created = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Event Stage',
          null,
          null,
          null,
          null,
        ])
      ).rows[0];

      let events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'stage'`,
          [created.id],
        )
      ).rows;
      expect(events.filter((e) => e.event_type === 'stage_created').length).toBe(1);

      await client.query('SAVEPOINT sp_fail');
      let failed = false;
      try {
        await client.query(`SELECT * FROM public.update_project_stage_metadata($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
          created.id,
          '   ',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
      } catch {
        failed = true;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_fail');
      expect(failed).toBe(true);

      events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'stage'`,
          [created.id],
        )
      ).rows;
      expect(events.filter((e) => e.event_type === 'stage_updated').length).toBe(0);

      const second = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Second Event Stage',
          null,
          null,
          null,
          null,
        ])
      ).rows[0];

      const noop = (
        await client.query(`SELECT * FROM public.reorder_project_stages($1, $2::uuid[])`, [
          project,
          [created.id, second.id],
        ])
      ).rows[0];
      expect(noop.reordered).toBe(false);

      let reorderEvents = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND event_type = 'stage_reordered'`,
          [project],
        )
      ).rows[0].n;
      expect(reorderEvents).toBe(0);

      const real = (
        await client.query(`SELECT * FROM public.reorder_project_stages($1, $2::uuid[])`, [
          project,
          [second.id, created.id],
        ])
      ).rows[0];
      expect(real.reordered).toBe(true);

      reorderEvents = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND event_type = 'stage_reordered'`,
          [project],
        )
      ).rows[0].n;
      expect(reorderEvents).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('a status-only update fires stage_status_changed, not stage_updated', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-00000000000c';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'StatusEvent Org', owner, 'StatusEvent Project');

      await actAs(client, owner);
      const created = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Status Only Stage',
          'desc',
          null,
          null,
          null,
        ])
      ).rows[0];

      await client.query(`SELECT * FROM public.update_project_stage_metadata($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
        created.id,
        created.title,
        'desc',
        null,
        'in_progress',
        null,
        null,
        null,
        null,
      ]);

      const events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'stage' ORDER BY created_at`,
          [created.id],
        )
      ).rows;
      expect(events.map((e) => e.event_type)).toEqual(['stage_created', 'stage_status_changed']);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('archived stage cannot be edited except through restore', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '20000000-0000-0000-0000-00000000000d';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'ArchivedEdit Org', owner, 'ArchivedEdit Project');

      await actAs(client, owner);
      const stage = (
        await client.query(`SELECT * FROM public.create_project_stage($1, $2, $3, $4, $5, $6)`, [
          project,
          'Will Be Archived',
          null,
          null,
          null,
          null,
        ])
      ).rows[0];
      await client.query(`SELECT * FROM public.archive_project_stage($1)`, [stage.id]);

      let rejected = false;
      try {
        await client.query(`SELECT * FROM public.update_project_stage_metadata($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
          stage.id,
          'Should Fail',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
      } catch (err) {
        rejected = /STAGE_ARCHIVED/.test((err as Error).message);
      }
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: anonymous has EXECUTE denied on every stage RPC (checked via ACL, not a live call)', async () => {
    const signatures = [
      'create_project_stage(uuid,text,text,uuid,date,date)',
      'update_project_stage_metadata(uuid,text,text,uuid,text,date,date,date,date)',
      'reorder_project_stages(uuid,uuid[])',
      'archive_project_stage(uuid)',
      'restore_project_stage(uuid)',
    ];
    for (const sig of signatures) {
      const res = await pool.query(`SELECT has_function_privilege('anon', $1, 'EXECUTE') AS has_execute`, [
        `public.${sig}`,
      ]);
      expect(res.rows[0].has_execute).toBe(false);
    }
  });
});
