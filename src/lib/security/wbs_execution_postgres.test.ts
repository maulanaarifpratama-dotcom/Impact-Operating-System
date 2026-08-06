import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[wbs_execution postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('WBS Execution Authorization (PM) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@exec-test.local`],
    );
  }

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
  }

  async function createOrgAndProject(client: pg.PoolClient, orgName: string, ownerId: string, projectName: string, mode = 'project_management') {
    const org = (
      await client.query(`INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`, [orgName, ownerId])
    ).rows[0].id;
    await client.query(`INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [org, ownerId]);
    await client.query(`UPDATE public.subscriptions SET plan = 'starter', status = 'active' WHERE organization_id = $1`, [org]);
    const project = (
      await client.query(`INSERT INTO public.lfa_projects (org_id, name, project_mode) VALUES ($1, $2, $3) RETURNING id`, [org, projectName, mode])
    ).rows[0].id;
    return { org, project };
  }

  async function addMember(client: pg.PoolClient, org: string, userId: string, role: string, jobTitle?: string) {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role, job_title) VALUES ($1, $2, $3, $4) ON CONFLICT (organization_id, user_id) DO UPDATE SET role = $3, job_title = $4`,
      [org, userId, role, jobTitle || null],
    );
  }

  async function createWbsItem(client: pg.PoolClient, org: string, project: string, name: string, level = 2) {
    return (
      await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status) VALUES ($1, $2, $3, $4, 'not_started') RETURNING id, owner_id`,
        [project, org, level, name],
      )
    ).rows[0];
  }

  // --- Schema --------------------------------------------------------------

  test('schema: RPC update_assigned_wbs_execution_status exists', async () => {
    const res = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname = 'update_assigned_wbs_execution_status' AND pronamespace = 'public'::regnamespace`,
    );
    expect(res.rows.length).toBe(1);
  });

  test('schema: trigger trg_lfa_wbs_items_execution_guard exists', async () => {
    const res = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_lfa_wbs_items_execution_guard'`,
    );
    expect(res.rows.length).toBe(1);
  });

  test('schema: trigger trg_lfa_wbs_items_delete_guard exists', async () => {
    const res = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_lfa_wbs_items_delete_guard'`,
    );
    expect(res.rows.length).toBe(1);
  });

  // --- Ownership Execution -------------------------------------------------

  test('Owner changes PM item status', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000001';
      await ensureAuthUser(client, ownerId);
      const { org, project } = await createOrgAndProject(client, 'ExecOwner', ownerId, 'ExecP');
      const wbs = await createWbsItem(client, org, project, 'Item A');

      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET status = 'in_progress' WHERE id = $1`, [wbs.id]);
      const row = (await client.query(`SELECT status FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(row.status).toBe('in_progress');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Assigned Member changes own item status via direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000011';
      const memberId = 'c0000000-0000-0000-0000-000000000012';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'OwnExec', ownerId, 'OwnExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item B');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      await client.query(`UPDATE public.lfa_wbs_items SET status = 'in_progress' WHERE id = $1`, [wbs.id]);
      const row = (await client.query(`SELECT status FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(row.status).toBe('in_progress');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot change other-owner status via direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000021';
      const memberA = 'c0000000-0000-0000-0000-000000000022';
      const memberB = 'c0000000-0000-0000-0000-000000000023';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberA);
      await ensureAuthUser(client, memberB);
      const { org, project } = await createOrgAndProject(client, 'OtherExec', ownerId, 'OtherExecP');
      await addMember(client, org, memberA, 'member');
      await addMember(client, org, memberB, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item C');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberA, wbs.id]);

      await actAs(client, memberB);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET status = 'in_progress' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_NOT_OWNER/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot change unassigned-item status', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000031';
      const memberId = 'c0000000-0000-0000-0000-000000000032';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'UnassExec', ownerId, 'UnassExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item D');

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET status = 'in_progress' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_UNASSIGNED/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot change title via direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000041';
      const memberId = 'c0000000-0000-0000-0000-000000000042';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'TitleExec', ownerId, 'TitleExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item E');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET name = 'Hacked' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot change schedule via direct UPDATE', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000051';
      const memberId = 'c0000000-0000-0000-0000-000000000052';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'SchedExec', ownerId, 'SchedExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item F');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET start_month = 3 WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('progress_percent may be updated (completion trigger handles validation)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000061';
      const memberId = 'c0000000-0000-0000-0000-000000000062';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'ProgExec', ownerId, 'ProgExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item G');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      await client.query(`UPDATE public.lfa_wbs_items SET progress_percent = 50 WHERE id = $1`, [wbs.id]);
      const row = (await client.query(`SELECT progress_percent FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(row.progress_percent).toBe(50);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot change Stage link', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000071';
      const memberId = 'c0000000-0000-0000-0000-000000000072';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'StageExec', ownerId, 'StageExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item H');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET stage_id = '00000000-0000-0000-0000-000000000000' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot delete WBS item', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000081';
      const memberId = 'c0000000-0000-0000-0000-000000000082';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'DelExec', ownerId, 'DelExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item I');

      await actAs(client, memberId);
      await expect(
        client.query(`DELETE FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_DELETE_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('job_title Project Manager grants no execution authority', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000091';
      const pmId = 'c0000000-0000-0000-0000-000000000092';
      const memberId = 'c0000000-0000-0000-0000-000000000093';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, pmId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'JTExec', ownerId, 'JTExecP');
      await addMember(client, org, pmId, 'member', 'Project Manager');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item J');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, pmId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET status = 'completed' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_NOT_OWNER/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Failed mutation leaves row unchanged', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000101';
      const memberId = 'c0000000-0000-0000-0000-000000000102';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'FailExec', ownerId, 'FailExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item K');

      const before = (await client.query(`SELECT status FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];

      await actAs(client, memberId);
      await client.query('SAVEPOINT fail');
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET status = 'completed' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT fail');

      const after = (await client.query(`SELECT status FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(after.status).toBe(before.status);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: assigned Member changes own status via canonical path', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000111';
      const memberId = 'c0000000-0000-0000-0000-000000000112';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'RpcExec', ownerId, 'RpcExecP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item L');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberId, wbs.id]);

      await actAs(client, memberId);
      const res = await client.query(`SELECT * FROM public.update_assigned_wbs_execution_status($1, $2, $3)`, [wbs.id, 'in_progress', null]);
      expect(res.rows[0].status).toBe('in_progress');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: Member cannot change unassigned item via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000121';
      const memberId = 'c0000000-0000-0000-0000-000000000122';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'RpcUnass', ownerId, 'RpcUnassP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item M');

      await actAs(client, memberId);
      await expect(
        client.query(`SELECT * FROM public.update_assigned_wbs_execution_status($1, $2, $3)`, [wbs.id, 'completed', null]),
      ).rejects.toThrow(/UNASSIGNED/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('RPC: Member cannot change other-owner item via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000131';
      const memberA = 'c0000000-0000-0000-0000-000000000132';
      const memberB = 'c0000000-0000-0000-0000-000000000133';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberA);
      await ensureAuthUser(client, memberB);
      const { org, project } = await createOrgAndProject(client, 'RpcOther', ownerId, 'RpcOtherP');
      await addMember(client, org, memberA, 'member');
      await addMember(client, org, memberB, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item N');
      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [memberA, wbs.id]);

      await actAs(client, memberB);
      await expect(
        client.query(`SELECT * FROM public.update_assigned_wbs_execution_status($1, $2, $3)`, [wbs.id, 'completed', null]),
      ).rejects.toThrow(/NOT_OWNER/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // --- Programme Design Regression ------------------------------------------

  test('Programme Design title autosave still works', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000141';
      await ensureAuthUser(client, ownerId);
      const { org, project } = await createOrgAndProject(client, 'PDTitle', ownerId, 'PDTitleP', 'programme_design');

      await actAs(client, ownerId);
      const wbs = (await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status) VALUES ($1, $2, 2, $3, 'not_started') RETURNING id`,
        [project, org, 'Original Title'],
      )).rows[0];
      await client.query(`UPDATE public.lfa_wbs_items SET name = 'Updated Title' WHERE id = $1`, [wbs.id]);
      const row = (await client.query(`SELECT name FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(row.name).toBe('Updated Title');

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Programme Design schedule update still works', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000151';
      await ensureAuthUser(client, ownerId);
      const { org, project } = await createOrgAndProject(client, 'PDSched', ownerId, 'PDSchedP', 'programme_design');
      const wbs = (await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, start_month, duration_weeks, status) VALUES ($1, $2, 2, $3, 1, 4, 'not_started') RETURNING id`,
        [project, org, 'Schedule Test'],
      )).rows[0];

      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET start_month = 3, duration_weeks = 8 WHERE id = $1`, [wbs.id]);
      const row = (await client.query(`SELECT start_month, duration_weeks FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(row.start_month).toBe(3);
      expect(row.duration_weeks).toBe(8);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Programme Design hierarchy write still works', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000161';
      await ensureAuthUser(client, ownerId);
      const { org, project } = await createOrgAndProject(client, 'PDHier', ownerId, 'PDHierP', 'programme_design');
      const parent = (await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status) VALUES ($1, $2, 1, $3, 'not_started') RETURNING id`,
        [project, org, 'Parent'],
      )).rows[0];

      await actAs(client, ownerId);
      await client.query(`INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, parent_id, name, status) VALUES ($1, $2, 2, $3, 'Child', 'not_started')`, [project, org, parent.id]);
      const children = (await client.query(`SELECT id FROM public.lfa_wbs_items WHERE parent_id = $1`, [parent.id])).rows;
      expect(children.length).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // --- Existing Security Regression -----------------------------------------

  test('Existing assignment guard trigger still blocks Member owner_id write', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'c0000000-0000-0000-0000-000000000171';
      const memberId = 'c0000000-0000-0000-0000-000000000172';
      const targetId = 'c0000000-0000-0000-0000-000000000173';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'RegAssign', ownerId, 'RegAssignP');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item R');

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [targetId, wbs.id]),
      ).rejects.toThrow(/WBS_ASSIGN_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // --- Legacy admin role denial (owner-only canonical) --------------------

  test('Legacy admin cannot edit all PM WBS fields', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'd0000000-0000-0000-0000-000000000021';
      const adminId = 'd0000000-0000-0000-0000-000000000022';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, adminId);
      const { org, project } = await createOrgAndProject(client, 'AdmExec', ownerId, 'AdmExecP');
      await addMember(client, org, adminId, 'admin');
      const wbs = await createWbsItem(client, org, project, 'Item AC');

      await actAs(client, adminId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET name = 'Hacked' WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_EXEC_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Legacy admin cannot delete PM WBS item', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'd0000000-0000-0000-0000-000000000031';
      const adminId = 'd0000000-0000-0000-0000-000000000032';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, adminId);
      const { org, project } = await createOrgAndProject(client, 'AdmDel', ownerId, 'AdmDelP');
      await addMember(client, org, adminId, 'admin');
      const wbs = await createWbsItem(client, org, project, 'Item AD');

      await actAs(client, adminId);
      await expect(
        client.query(`DELETE FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id]),
      ).rejects.toThrow(/WBS_DELETE_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Owner retains full assignment and execution authority', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'd0000000-0000-0000-0000-000000000041';
      const memberId = 'd0000000-0000-0000-0000-000000000042';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'OwnFull', ownerId, 'OwnFullP');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Item AE');

      // Owner assigns PIC
      await actAs(client, ownerId);
      await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]);
      const assigned = (await client.query(`SELECT owner_id FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows[0];
      expect(assigned.owner_id).toBe(memberId);

      // Owner changes title
      await client.query(`UPDATE public.lfa_wbs_items SET name = 'Updated' WHERE id = $1`, [wbs.id]);

      // Owner changes status
      await client.query(`UPDATE public.lfa_wbs_items SET status = 'completed' WHERE id = $1`, [wbs.id]);

      // Owner deletes
      await client.query(`DELETE FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id]);
      const after = (await client.query(`SELECT id FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])).rows;
      expect(after.length).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
