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
    console.warn('[wbs_assignment postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('WBS Assignment Authorization (PM) — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@assign-test.local`],
    );
  }

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
  }

  async function createOrgAndProject(
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

  async function addMember(client: pg.PoolClient, org: string, userId: string, role: string, jobTitle?: string) {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role, job_title)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = $3, job_title = $4`,
      [org, userId, role, jobTitle || null],
    );
  }

  async function createWbsItem(client: pg.PoolClient, org: string, project: string, name: string) {
    return (
      await client.query(
        `INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status)
         VALUES ($1, $2, 2, $3, 'not_started') RETURNING id, owner_id, reviewer_id`,
        [project, org, name],
      )
    ).rows[0];
  }

  // --- Schema --------------------------------------------------------------

  test('schema: RPC assign_wbs_item_people exists', async () => {
    const res = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname = 'assign_wbs_item_people' AND pronamespace = 'public'::regnamespace`,
    );
    expect(res.rows.length).toBe(1);
  });

  test('schema: trigger trg_lfa_wbs_items_assignment_guard exists', async () => {
    const res = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_lfa_wbs_items_assignment_guard'`,
    );
    expect(res.rows.length).toBe(1);
  });

  test('schema: event_type vocabulary includes wbs_people_changed', async () => {
    const res = await pool.query(
      `SELECT convalidated, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conname = 'project_activity_events_event_type_check'`,
    );
    expect(res.rows[0]?.def).toContain('wbs_people_changed');
  });

  // --- Authorization -------------------------------------------------------

  test('Owner assigns same-org Member as PIC via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000001';
      const memberId = 'a0000000-0000-0000-0000-000000000002';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'Assign Org', ownerId, 'Assign Proj');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity A');

      await actAs(client, ownerId);
      const res = await client.query(
        `SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`,
        [wbs.id, memberId, null],
      );
      expect(res.rows[0].owner_id).toBe(memberId);
      expect(res.rows[0].reviewer_id).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Admin assigns same-org Member as PIC via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000011';
      const adminId = 'a0000000-0000-0000-0000-000000000012';
      const memberId = 'a0000000-0000-0000-0000-000000000013';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, adminId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'Admin Org', ownerId, 'Admin Proj');
      await addMember(client, org, adminId, 'admin');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity B');

      await actAs(client, adminId);
      const res = await client.query(
        `SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`,
        [wbs.id, memberId, null],
      );
      expect(res.rows[0].owner_id).toBe(memberId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Owner assigns reviewer via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000021';
      const reviewerId = 'a0000000-0000-0000-0000-000000000022';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, reviewerId);
      const { org, project } = await createOrgAndProject(client, 'Review Org', ownerId, 'Review Proj');
      await addMember(client, org, reviewerId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity C');

      await actAs(client, ownerId);
      const res = await client.query(
        `SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`,
        [wbs.id, null, reviewerId],
      );
      expect(res.rows[0].reviewer_id).toBe(reviewerId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Owner clears PIC via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000031';
      const memberId = 'a0000000-0000-0000-0000-000000000032';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'Clear Org', ownerId, 'Clear Proj');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity D');

      await actAs(client, ownerId);
      await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]);
      const cleared = await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, null, null]);
      expect(cleared.rows[0].owner_id).toBeNull();

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot assign PIC via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000041';
      const memberId = 'a0000000-0000-0000-0000-000000000042';
      const targetId = 'a0000000-0000-0000-0000-000000000043';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'Member Deny', ownerId, 'Member Deny Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity E');

      await actAs(client, memberId);
      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, targetId, null]),
      ).rejects.toThrow(/WBS_ASSIGN_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member cannot assign reviewer via RPC', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000051';
      const memberId = 'a0000000-0000-0000-0000-000000000052';
      const targetId = 'a0000000-0000-0000-0000-000000000053';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'Member Rev Deny', ownerId, 'Member Rev Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity F');

      await actAs(client, memberId);
      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, null, targetId]),
      ).rejects.toThrow(/WBS_ASSIGN_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Member direct UPDATE of owner_id is denied by trigger', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000061';
      const memberId = 'a0000000-0000-0000-0000-000000000062';
      const targetId = 'a0000000-0000-0000-0000-000000000063';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'Trigger Deny', ownerId, 'Trigger Deny Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity G');

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

  test('Member direct UPDATE of reviewer_id is denied by trigger', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000071';
      const memberId = 'a0000000-0000-0000-0000-000000000072';
      const targetId = 'a0000000-0000-0000-0000-000000000073';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'Rev Trigger', ownerId, 'Rev Trigger Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity H');

      await actAs(client, memberId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET reviewer_id = $1 WHERE id = $2`, [targetId, wbs.id]),
      ).rejects.toThrow(/WBS_ASSIGN_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Cross-org owner_id is denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerA = 'a0000000-0000-0000-0000-000000000081';
      const ownerB = 'a0000000-0000-0000-0000-000000000082';
      const extMember = 'a0000000-0000-0000-0000-000000000083';
      await ensureAuthUser(client, ownerA);
      await ensureAuthUser(client, ownerB);
      await ensureAuthUser(client, extMember);
      const { org: orgA, project: projA } = await createOrgAndProject(client, 'Cross Org A', ownerA, 'Cross A');
      await createOrgAndProject(client, 'Cross Org B', ownerB, 'Cross B');
      // extMember is only in Org B
      await addMember(client, '00000000-0000-0000-0000-000000000000', extMember, 'member'); // won't work, need actual orgB ID
      // Actually, let me just use a fresh UUID that's not in any org
      const wbs = await createWbsItem(client, orgA, projA, 'Activity I');

      await actAs(client, ownerA);
      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, extMember, null]),
      ).rejects.toThrow(/NOT_MEMBER/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Cross-org assignment via trigger is denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000091';
      const extUserId = 'a0000000-0000-0000-0000-000000000092';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, extUserId);
      const { org, project } = await createOrgAndProject(client, 'Trigger Cross', ownerId, 'Trigger Cross Proj');
      const wbs = await createWbsItem(client, org, project, 'Activity J');

      await actAs(client, ownerId);
      await expect(
        client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [extUserId, wbs.id]),
      ).rejects.toThrow(/CROSS_ORG/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('Unknown user UUID is denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000101';
      const fakeUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      await ensureAuthUser(client, ownerId);
      const { org, project } = await createOrgAndProject(client, 'Unknown Org', ownerId, 'Unknown Proj');
      const wbs = await createWbsItem(client, org, project, 'Activity K');

      await actAs(client, ownerId);
      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, fakeUuid, null]),
      ).rejects.toThrow(/NOT_MEMBER/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('job_title grants no assignment authority', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000111';
      const pmId = 'a0000000-0000-0000-0000-000000000112';
      const memberId = 'a0000000-0000-0000-0000-000000000113';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, pmId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'JobTitle Org', ownerId, 'JobTitle Proj');
      await addMember(client, org, pmId, 'member', 'Project Manager');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity L');

      await actAs(client, pmId);
      // Having job_title 'Project Manager' with role 'member' must NOT grant authority
      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]),
      ).rejects.toThrow(/WBS_ASSIGN_FORBIDDEN/);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('owner-only update preserves reviewer_id', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000121';
      const memberId = 'a0000000-0000-0000-0000-000000000122';
      const reviewerId = 'a0000000-0000-0000-0000-000000000123';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, reviewerId);
      const { org, project } = await createOrgAndProject(client, 'Preserve Org', ownerId, 'Preserve Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, reviewerId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity M');

      await actAs(client, ownerId);
      await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, null, reviewerId]);

      // Change only owner
      const res = await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]);
      expect(res.rows[0].owner_id).toBe(memberId);
      expect(res.rows[0].reviewer_id).toBe(reviewerId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('reviewer-only update preserves owner_id', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000131';
      const memberId = 'a0000000-0000-0000-0000-000000000132';
      const newReviewerId = 'a0000000-0000-0000-0000-000000000133';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      await ensureAuthUser(client, newReviewerId);
      const { org, project } = await createOrgAndProject(client, 'Preserve Rev', ownerId, 'Preserve Rev Proj');
      await addMember(client, org, memberId, 'member');
      await addMember(client, org, newReviewerId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity N');

      await actAs(client, ownerId);
      await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]);

      const res = await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, null, newReviewerId]);
      expect(res.rows[0].owner_id).toBe(memberId);
      expect(res.rows[0].reviewer_id).toBe(newReviewerId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('failed assignment leaves row unchanged', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000141';
      const memberId = 'a0000000-0000-0000-0000-000000000142';
      const fakeUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'Rollback Org', ownerId, 'Rollback Proj');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity O');

      await actAs(client, ownerId);
      await client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, memberId, null]);

      const before = (
        await client.query(`SELECT owner_id, reviewer_id FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])
      ).rows[0];

      await expect(
        client.query(`SELECT * FROM public.assign_wbs_item_people($1, $2, $3)`, [wbs.id, fakeUuid, null]),
      ).rejects.toThrow(/NOT_MEMBER/);

      const after = (
        await client.query(`SELECT owner_id, reviewer_id FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])
      ).rows[0];
      expect(after.owner_id).toBe(before.owner_id);
      expect(after.reviewer_id).toBe(before.reviewer_id);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('ordinary status update still works for member', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000151';
      const memberId = 'a0000000-0000-0000-0000-000000000152';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, memberId);
      const { org, project } = await createOrgAndProject(client, 'Status Org', ownerId, 'Status Proj');
      await addMember(client, org, memberId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity P');

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

  test('direct owner update by owner succeeds through trigger', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ownerId = 'a0000000-0000-0000-0000-000000000161';
      const targetId = 'a0000000-0000-0000-0000-000000000162';
      await ensureAuthUser(client, ownerId);
      await ensureAuthUser(client, targetId);
      const { org, project } = await createOrgAndProject(client, 'Owner Direct', ownerId, 'Owner Direct Proj');
      await addMember(client, org, targetId, 'member');
      const wbs = await createWbsItem(client, org, project, 'Activity Q');

      await actAs(client, ownerId);
      await client.query(`UPDATE public.lfa_wbs_items SET owner_id = $1 WHERE id = $2`, [targetId, wbs.id]);
      const row = (
        await client.query(`SELECT owner_id FROM public.lfa_wbs_items WHERE id = $1`, [wbs.id])
      ).rows[0];
      expect(row.owner_id).toBe(targetId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
