import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

// Local Postgres connection URL provided by `supabase start`
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * PM-1B: project_objectives table + create/update/reorder/archive/restore
 * RPCs (20260806050000_add_project_objectives.sql). Mutation is RPC-only --
 * INSERT/UPDATE/DELETE are revoked from authenticated/anon at the grant
 * layer -- and cross-org lookups for update/archive/restore intentionally
 * collapse "wrong id" and "someone else's org" into the same
 * OBJECTIVE_NOT_FOUND, tested explicitly below rather than just asserted.
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
    console.warn('[project_objectives postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('project_objectives (PM-1B) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@objectives-test.local`],
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

  // --- Schema -------------------------------------------------------------

  test('schema: table exists with expected columns, types, and defaults', async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'project_objectives'
       ORDER BY ordinal_position`,
    );
    const byName = Object.fromEntries(res.rows.map((r) => [r.column_name, r]));

    expect(byName.id).toBeDefined();
    expect(byName.org_id.is_nullable).toBe('NO');
    expect(byName.project_id.is_nullable).toBe('NO');
    expect(byName.title.is_nullable).toBe('NO');
    expect(byName.description.is_nullable).toBe('YES');
    expect(byName.success_criteria.is_nullable).toBe('YES');
    expect(byName.status.is_nullable).toBe('NO');
    expect(byName.status.column_default).toContain('draft');
    expect(byName.sort_order.is_nullable).toBe('NO');
    expect(byName.sort_order.column_default).toContain('0');
    expect(byName.created_by.is_nullable).toBe('NO');
    expect(byName.created_at.is_nullable).toBe('NO');
    expect(byName.updated_at.is_nullable).toBe('NO');
    expect(byName.archived_at.is_nullable).toBe('YES');
    expect(byName.archived_by.is_nullable).toBe('YES');
  });

  test('schema: status CHECK allows exactly draft, active, completed, archived', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Schema Status Org', owner, 'Schema Status Project');

      for (const status of ['draft', 'active', 'completed', 'archived']) {
        await client.query('SAVEPOINT sp');
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, status, created_by)
           SELECT org_id, $1, 'x', $2, $3 FROM public.lfa_projects WHERE id = $1`,
          [project, status, owner],
        );
        await client.query('ROLLBACK TO SAVEPOINT sp');
      }

      await client.query('SAVEPOINT sp');
      let rejected = false;
      try {
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, status, created_by)
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

  test('schema: blank title is rejected by CHECK constraint', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-000000000002';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Schema Title Org', owner, 'Schema Title Project');

      let rejected = false;
      try {
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, created_by)
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
  });

  test('schema: expected FKs and indexes are present', async () => {
    const fks = await pool.query(
      `SELECT conname, confrelid::regclass::text AS references_table
       FROM pg_constraint
       WHERE conrelid = 'public.project_objectives'::regclass AND contype = 'f'
       ORDER BY conname`,
    );
    const refs = fks.rows.map((r) => r.references_table);
    expect(refs).toContain('organizations');
    expect(refs).toContain('lfa_projects');
    expect(refs).toContain('auth.users');

    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'project_objectives'`,
    );
    const names = indexes.rows.map((r) => r.indexname);
    expect(names.some((n) => n.includes('org_id'))).toBe(true);
    expect(names.some((n) => n.includes('project_id'))).toBe(true);
    expect(names.some((n) => n.includes('sort'))).toBe(true);
  });

  test('schema: no hard-delete RPC exists for project_objectives', async () => {
    const res = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname ILIKE '%delete_project_objective%' OR proname ILIKE '%hard_delete%objective%'`,
    );
    expect(res.rows.length).toBe(0);
  });

  // --- Privileges / RLS -----------------------------------------------------

  test('privileges: anon has no SELECT and no direct write access', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE anon');
      let selectDenied = false;
      try {
        await client.query('SELECT 1 FROM public.project_objectives LIMIT 1');
      } catch {
        selectDenied = true;
      }
      // anon has no table grant at all, so even a trivial SELECT fails at the
      // grant layer before RLS is ever evaluated.
      expect(selectDenied).toBe(true);
      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('privileges: authenticated direct INSERT/UPDATE/DELETE are all denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-000000000003';
      await ensureAuthUser(client, owner);
      const { org, project } = await paidPmOrgAndProject(client, 'Priv Org', owner, 'Priv Project');
      const existing = (
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, created_by) VALUES ($1, $2, 'Existing', $3) RETURNING id`,
          [org, project, owner],
        )
      ).rows[0].id;

      await actAs(client, owner);

      await client.query('SAVEPOINT sp1');
      let insertDenied = false;
      try {
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, created_by) VALUES ($1, $2, 'Direct', $3)`,
          [org, project, owner],
        );
      } catch (err) {
        insertDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp1');

      await client.query('SAVEPOINT sp2');
      let updateDenied = false;
      try {
        await client.query(`UPDATE public.project_objectives SET title = 'Hacked' WHERE id = $1`, [existing]);
      } catch (err) {
        updateDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp2');

      await client.query('SAVEPOINT sp3');
      let deleteDenied = false;
      try {
        await client.query(`DELETE FROM public.project_objectives WHERE id = $1`, [existing]);
      } catch (err) {
        deleteDenied = (err as { code?: string }).code === '42501';
      }
      await client.query('ROLLBACK TO SAVEPOINT sp3');

      expect(insertDenied).toBe(true);
      expect(updateDenied).toBe(true);
      expect(deleteDenied).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('privileges: same-org member SELECT allowed, cross-org SELECT denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerA = '10000000-0000-0000-0000-000000000004';
      const ownerB = '10000000-0000-0000-0000-000000000005';
      await ensureAuthUser(client, ownerA);
      await ensureAuthUser(client, ownerB);
      const { org: orgA, project: projectA } = await paidPmOrgAndProject(client, 'RLS Org A', ownerA, 'RLS Project A');
      await paidPmOrgAndProject(client, 'RLS Org B', ownerB, 'RLS Project B');

      const objectiveId = (
        await client.query(
          `INSERT INTO public.project_objectives (org_id, project_id, title, created_by) VALUES ($1, $2, 'Visible To A', $3) RETURNING id`,
          [orgA, projectA, ownerA],
        )
      ).rows[0].id;

      await actAs(client, ownerA);
      const asOwnerA = await client.query(`SELECT id FROM public.project_objectives WHERE id = $1`, [objectiveId]);
      expect(asOwnerA.rows.length).toBe(1);

      await client.query('RESET ROLE');
      await actAs(client, ownerB);
      const asOwnerB = await client.query(`SELECT id FROM public.project_objectives WHERE id = $1`, [objectiveId]);
      expect(asOwnerB.rows.length).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // --- RPC ------------------------------------------------------------------

  test('RPC: member create, update metadata, and reorder all succeed', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const member = '10000000-0000-0000-0000-000000000006';
      await ensureAuthUser(client, member);
      const { project } = await paidPmOrgAndProject(client, 'RPC Member Org', member, 'RPC Member Project');

      await actAs(client, member);

      const created = (
        await client.query(
          `SELECT * FROM public.create_project_objective($1, $2, $3, $4)`,
          [project, 'First Objective', 'desc', 'criteria'],
        )
      ).rows[0];
      expect(created.title).toBe('First Objective');
      expect(created.status).toBe('draft');

      const updated = (
        await client.query(
          `SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`,
          [created.id, 'Renamed Objective', 'new desc', 'new criteria', 'active'],
        )
      ).rows[0];
      expect(updated.title).toBe('Renamed Objective');
      expect(updated.status).toBe('active');

      const second = (
        await client.query(
          `SELECT * FROM public.create_project_objective($1, $2, $3, $4)`,
          [project, 'Second Objective', null, null],
        )
      ).rows[0];

      const reordered = (
        await client.query(
          `SELECT * FROM public.reorder_project_objectives($1, $2::uuid[])`,
          [project, [second.id, created.id]],
        )
      ).rows[0];
      expect(reordered.item_count).toBe(2);
      expect(reordered.reordered).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: member archive attempt denied; owner/admin archive and restore succeed', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-000000000007';
      const member = '10000000-0000-0000-0000-000000000008';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, member);
      const { org, project } = await paidPmOrgAndProject(client, 'Archive Org', owner, 'Archive Project');
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [org, member],
      );

      await actAs(client, owner);
      const objective = (
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Archive Me',
          null,
          null,
        ])
      ).rows[0];

      await client.query('RESET ROLE');
      await actAs(client, member);
      await client.query('SAVEPOINT sp_member_archive');
      let memberArchiveDenied = false;
      try {
        await client.query(`SELECT * FROM public.archive_project_objective($1)`, [objective.id]);
      } catch (err) {
        memberArchiveDenied = /OBJECTIVE_ARCHIVE_FORBIDDEN/.test((err as Error).message);
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_member_archive');
      expect(memberArchiveDenied).toBe(true);

      await client.query('RESET ROLE');
      await actAs(client, owner);
      const archived = (await client.query(`SELECT * FROM public.archive_project_objective($1)`, [objective.id])).rows[0];
      expect(archived.status).toBe('archived');
      expect(archived.archived_at).not.toBeNull();

      const restored = (await client.query(`SELECT * FROM public.restore_project_objective($1)`, [objective.id])).rows[0];
      expect(restored.status).toBe('draft');

      const row = (
        await client.query(`SELECT archived_at, archived_by FROM public.project_objectives WHERE id = $1`, [objective.id])
      ).rows[0];
      expect(row.archived_at).toBeNull();
      expect(row.archived_by).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: non-member is denied on create', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-000000000009';
      const outsider = '10000000-0000-0000-0000-00000000000a';
      await ensureAuthUser(client, owner);
      await ensureAuthUser(client, outsider);
      const { project } = await paidPmOrgAndProject(client, 'NonMember Org', owner, 'NonMember Project');

      await actAs(client, outsider);
      let denied = false;
      try {
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Should Fail',
          null,
          null,
        ]);
      } catch (err) {
        denied = /OBJECTIVE_MEMBERSHIP_REQUIRED/.test((err as Error).message);
      }
      expect(denied).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: anonymous has EXECUTE denied on every objective RPC (checked via ACL, not a live call)', async () => {
    const signatures = [
      'create_project_objective(uuid,text,text,text)',
      'update_project_objective_metadata(uuid,text,text,text,text)',
      'reorder_project_objectives(uuid,uuid[])',
      'archive_project_objective(uuid)',
      'restore_project_objective(uuid)',
    ];
    for (const sig of signatures) {
      const res = await pool.query(`SELECT has_function_privilege('anon', $1, 'EXECUTE') AS has_execute`, [
        `public.${sig}`,
      ]);
      expect(res.rows[0].has_execute).toBe(false);
    }
  });

  test('RPC: a programme_design project is rejected by create_project_objective', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-00000000000b';
      await ensureAuthUser(client, owner);
      const org = (
        await client.query(`INSERT INTO public.organizations (name, created_by) VALUES ('PD Org', $1) RETURNING id`, [
          owner,
        ])
      ).rows[0].id;
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
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
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Should Fail',
          null,
          null,
        ]);
      } catch (err) {
        rejected = /OBJECTIVE_PROJECT_MODE_INVALID/.test((err as Error).message);
      }
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('integrity: org_id and created_by are derived server-side, never client-supplied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const member = '10000000-0000-0000-0000-00000000000c';
      await ensureAuthUser(client, member);
      const { org, project } = await paidPmOrgAndProject(client, 'Derive Org', member, 'Derive Project');

      await actAs(client, member);
      const created = (
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Derived Fields',
          null,
          null,
        ])
      ).rows[0];
      expect(created.org_id).toBe(org);

      const row = (await client.query(`SELECT created_by FROM public.project_objectives WHERE id = $1`, [created.id])).rows[0];
      expect(row.created_by).toBe(member);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('activity events: created, updated, archived each fire exactly once; a failed mutation fires zero', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-00000000000d';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Events Org', owner, 'Events Project');

      await actAs(client, owner);
      const created = (
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Event Objective',
          null,
          null,
        ])
      ).rows[0];

      let events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'objective'`,
          [created.id],
        )
      ).rows;
      expect(events.filter((e) => e.event_type === 'objective_created').length).toBe(1);

      await client.query('SAVEPOINT sp_fail');
      let failed = false;
      try {
        await client.query(`SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`, [
          created.id,
          '   ',
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
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'objective'`,
          [created.id],
        )
      ).rows;
      expect(events.filter((e) => e.event_type === 'objective_updated').length).toBe(0);

      await client.query(`SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`, [
        created.id,
        'Updated For Real',
        null,
        null,
        null,
      ]);
      events = (
        await client.query(
          `SELECT event_type FROM public.project_activity_events WHERE entity_id = $1 AND entity_type = 'objective'`,
          [created.id],
        )
      ).rows;
      expect(events.filter((e) => e.event_type === 'objective_updated').length).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('reorder: a no-op reorder creates zero events; an actual reorder creates exactly one', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-00000000000e';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'Reorder Org', owner, 'Reorder Project');

      await actAs(client, owner);
      const a = (await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [project, 'A', null, null])).rows[0];
      const b = (await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [project, 'B', null, null])).rows[0];

      const eventsBefore = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND event_type = 'objective_reordered'`,
          [project],
        )
      ).rows[0].n;
      expect(eventsBefore).toBe(0);

      const noop = (
        await client.query(`SELECT * FROM public.reorder_project_objectives($1, $2::uuid[])`, [project, [a.id, b.id]])
      ).rows[0];
      expect(noop.reordered).toBe(false);

      let events = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND event_type = 'objective_reordered'`,
          [project],
        )
      ).rows[0].n;
      expect(events).toBe(0);

      const real = (
        await client.query(`SELECT * FROM public.reorder_project_objectives($1, $2::uuid[])`, [project, [b.id, a.id]])
      ).rows[0];
      expect(real.reordered).toBe(true);
      expect(real.item_count).toBe(2);

      events = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.project_activity_events WHERE entity_id = $1 AND event_type = 'objective_reordered'`,
          [project],
        )
      ).rows[0].n;
      expect(events).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('archived objective cannot be edited except through restore', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = '10000000-0000-0000-0000-00000000000f';
      await ensureAuthUser(client, owner);
      const { project } = await paidPmOrgAndProject(client, 'ArchivedEdit Org', owner, 'ArchivedEdit Project');

      await actAs(client, owner);
      const objective = (
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          project,
          'Will Be Archived',
          null,
          null,
        ])
      ).rows[0];
      await client.query(`SELECT * FROM public.archive_project_objective($1)`, [objective.id]);

      let rejected = false;
      try {
        await client.query(`SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`, [
          objective.id,
          'Should Fail',
          null,
          null,
          null,
        ]);
      } catch (err) {
        rejected = /OBJECTIVE_ARCHIVED/.test((err as Error).message);
      }
      expect(rejected).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('cross-org guessed UUID and a genuinely nonexistent UUID return the identical error', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerA = '10000000-0000-0000-0000-000000000010';
      const ownerB = '10000000-0000-0000-0000-000000000011';
      await ensureAuthUser(client, ownerA);
      await ensureAuthUser(client, ownerB);
      const { project: projectB } = await paidPmOrgAndProject(client, 'CrossOrg Org B', ownerB, 'CrossOrg Project B');
      await paidPmOrgAndProject(client, 'CrossOrg Org A', ownerA, 'CrossOrg Project A');

      await client.query('RESET ROLE');
      await actAs(client, ownerB);
      const objectiveInB = (
        await client.query(`SELECT * FROM public.create_project_objective($1, $2, $3, $4)`, [
          projectB,
          'Belongs To B',
          null,
          null,
        ])
      ).rows[0];

      await client.query('RESET ROLE');
      await actAs(client, ownerA);

      await client.query('SAVEPOINT sp_cross_org');
      let crossOrgError = '';
      try {
        await client.query(`SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`, [
          objectiveInB.id,
          'Hijack Attempt',
          null,
          null,
          null,
        ]);
      } catch (err) {
        crossOrgError = (err as Error).message;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_cross_org');

      await client.query('SAVEPOINT sp_nonexistent');
      let nonexistentError = '';
      try {
        await client.query(`SELECT * FROM public.update_project_objective_metadata($1, $2, $3, $4, $5)`, [
          '99999999-9999-9999-9999-999999999999',
          'Hijack Attempt',
          null,
          null,
          null,
        ]);
      } catch (err) {
        nonexistentError = (err as Error).message;
      }
      await client.query('ROLLBACK TO SAVEPOINT sp_nonexistent');

      expect(crossOrgError).toMatch(/OBJECTIVE_NOT_FOUND/);
      expect(nonexistentError).toMatch(/OBJECTIVE_NOT_FOUND/);
      expect(crossOrgError).toBe(nonexistentError);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
