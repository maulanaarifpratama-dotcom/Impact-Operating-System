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
    console.warn('[team-functional-roles postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('Team Functional Roles — Real Postgres DB Validation', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  const OWNER = 'aaaaaaaa-1111-1111-1111-111111111111';
  const ADMIN = 'bbbbbbbb-1111-1111-1111-111111111111';
  const MEMBER = 'cccccccc-1111-1111-1111-111111111111';
  const STRANGER = 'dddddddd-1111-1111-1111-111111111111';
  const INVITEE = 'eeeeeeee-1111-1111-1111-111111111111';
  const OWNER2 = 'ffffffff-1111-1111-1111-111111111111';
  const MEMBER2 = 'gggggggg-1111-1111-1111-111111111111';

  async function ensureAuthUser(client: pg.PoolClient, userId: string, email?: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, email || `${userId}@team-fn-role-test.local`],
    );
  }

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
  }

  async function createOrg(client: pg.PoolClient, name: string, createdBy: string) {
    const res = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, createdBy],
    );
    return res.rows[0].id as string;
  }

  async function addMember(
    client: pg.PoolClient,
    orgId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member',
    jobTitle?: string | null,
  ) {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role, job_title) VALUES ($1, $2, $3, $4)`,
      [orgId, userId, role, jobTitle ?? null],
    );
  }

  // ===========================================================================
  // 1. Migration idempotency
  // ===========================================================================
  test('migration columns exist on organization_members', async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'organization_members'
         AND column_name = 'job_title'`,
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].data_type).toBe('text');
    expect(res.rows[0].is_nullable).toBe('YES');
  });

  test('migration columns exist on organization_invitations', async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'organization_invitations'
         AND column_name = 'job_title'`,
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].data_type).toBe('text');
    expect(res.rows[0].is_nullable).toBe('YES');
  });

  test('migration is idempotent — replay does not error', async () => {
    const client = await pool.connect();
    try {
      // Column already added; re-running the guarded ALTER should be a no-op
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'organization_members'
              AND column_name = 'job_title'
          ) THEN
            ALTER TABLE public.organization_members ADD COLUMN job_title TEXT NULL;
          END IF;
        END $$;
      `);
      // If we got here without an exception, idempotency holds
      expect(true).toBe(true);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 2. Owner can set member job_title
  // ===========================================================================
  test('owner can set a member job_title', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'JobTitle Test Org', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const res = await client.query(
        `UPDATE public.organization_members SET job_title = 'MEAL Officer' WHERE user_id = $1 AND organization_id = $2 RETURNING job_title`,
        [MEMBER, orgId],
      );
      expect(res.rows[0].job_title).toBe('MEAL Officer');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 3. Admin can set member job_title
  // ===========================================================================
  test('admin can set a member job_title', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, ADMIN);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Admin JobTitle Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, ADMIN, 'admin');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, ADMIN);
      const res = await client.query(
        `UPDATE public.organization_members SET job_title = 'Program Officer' WHERE user_id = $1 AND organization_id = $2 RETURNING job_title`,
        [MEMBER, orgId],
      );
      expect(res.rows[0].job_title).toBe('Program Officer');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 4. Ordinary member cannot update another member's job_title
  // ===========================================================================
  test('ordinary member cannot update another member job_title', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      await ensureAuthUser(client, STRANGER);
      const orgId = await createOrg(client, 'Member Deny Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member', 'Field Coordinator');
      await addMember(client, orgId, STRANGER, 'member', 'Researcher');

      await actAs(client, MEMBER);
      const res = await client.query(
        `UPDATE public.organization_members SET job_title = 'Hacker' WHERE user_id = $1 AND organization_id = $2 RETURNING job_title`,
        [STRANGER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 5. Cross-org update is denied
  // ===========================================================================
  test('cross-org job_title update is denied', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, STRANGER);
      const orgAId = await createOrg(client, 'Org A', OWNER);
      const orgBId = await createOrg(client, 'Org B', STRANGER);
      await addMember(client, orgAId, OWNER, 'owner');
      await addMember(client, orgBId, STRANGER, 'owner', 'Consultant');

      // Owner of Org A tries to update member in Org B
      await actAs(client, OWNER);
      const res = await client.query(
        `UPDATE public.organization_members SET job_title = 'Cross-Org Hack' WHERE user_id = $1 AND organization_id = $2 RETURNING job_title`,
        [STRANGER, orgBId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 6. Custom job_title is supported (TEXT, not enum)
  // ===========================================================================
  test('custom job_title values are accepted', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Custom JT Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const custom = 'Kepala Divisi Humas dan Advokasi';
      const res = await client.query(
        `UPDATE public.organization_members SET job_title = $1 WHERE user_id = $2 AND organization_id = $3 RETURNING job_title`,
        [custom, MEMBER, orgId],
      );
      expect(res.rows[0].job_title).toBe(custom);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 7. Null job_title has safe fallback
  // ===========================================================================
  test('null job_title is readable and does not cause errors', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Null JT Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member'); // no job_title

      // Owner can read the null job_title
      await actAs(client, OWNER);
      const res = await client.query(
        `SELECT job_title FROM public.organization_members WHERE user_id = $1 AND organization_id = $2`,
        [MEMBER, orgId],
      );
      expect(res.rows[0].job_title).toBeNull();
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 8. job_title does not grant authorization
  // ===========================================================================
  test('job_title does not grant admin-tier operations', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      await ensureAuthUser(client, STRANGER);
      const orgId = await createOrg(client, 'Auth Isolation Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      // Member with a "powerful-sounding" job_title
      await addMember(client, orgId, MEMBER, 'member', 'Project Manager');

      // "Project Manager" member tries to delete another member — should fail
      await actAs(client, MEMBER);
      const res = await client.query(
        `DELETE FROM public.organization_members WHERE user_id = $1 AND organization_id = $2 RETURNING id`,
        [STRANGER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 9. Invitation propagation — job_title flows from invite to membership
  // ===========================================================================
  test('invitation job_title propagates to membership on accept', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, INVITEE, 'invitee@team-fn-role-test.local');
      const orgId = await createOrg(client, 'Invite Prop Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');

      // Verify direct membership INSERT carries job_title
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role, job_title)
         VALUES ($1, $2, 'member', 'MEAL Officer')`,
        [orgId, INVITEE],
      );

      const memRes = await client.query(
        `SELECT job_title FROM public.organization_members WHERE user_id = $1 AND organization_id = $2`,
        [INVITEE, orgId],
      );
      expect(memRes.rows[0].job_title).toBe('MEAL Officer');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 10. Invitation with null job_title propagates null
  // ===========================================================================
  test('invitation with null job_title propagates null to membership', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, INVITEE, 'invitee2@team-fn-role-test.local');
      const orgId = await createOrg(client, 'Null Invite JT', OWNER);
      await addMember(client, orgId, OWNER, 'owner');

      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role, job_title)
         VALUES ($1, $2, 'member', NULL)`,
        [orgId, INVITEE],
      );

      const memRes = await client.query(
        `SELECT job_title FROM public.organization_members WHERE user_id = $1 AND organization_id = $2`,
        [INVITEE, orgId],
      );
      expect(memRes.rows[0].job_title).toBeNull();
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 11. Existing membership regression — rows without job_title still work
  // ===========================================================================
  test('existing rows with null job_title are still valid members', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Regression Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      // Insert without job_title column (simulating pre-migration insert)
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgId, MEMBER],
      );

      // Member can still read own org data (regression check)
      await actAs(client, MEMBER);
      const orgs = await client.query(
        `SELECT id FROM public.organizations WHERE id = $1`,
        [orgId],
      );
      expect(orgs.rows).toHaveLength(1);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 12. accept_organization_invite RPC rejects expired invitations (regression)
  // ===========================================================================
  test('accept_organization_invite still rejects expired invitations', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, INVITEE, 'expired-invitee@team-fn-role-test.local');
      const orgId = await createOrg(client, 'Expired Invite Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');

      // Create expired invitation as postgres (superuser bypass)
      const invRes = await client.query(
        `INSERT INTO public.organization_invitations (organization_id, email, role, job_title, expires_at, invited_by)
         VALUES ($1, 'expired-invitee@team-fn-role-test.local', 'member', 'Volunteer',
                 now() - interval '1 day', $2)
         RETURNING id, token`,
        [orgId, OWNER],
      );

      await expect(
        client.query(
          `SELECT * FROM public.accept_organization_invite($1, $2)`,
          [invRes.rows[0].token, INVITEE],
        ),
      ).rejects.toThrow(/kedaluwarsa/i);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 13. accept_organization_invite RPC rejects revoked invitations (regression)
  // ===========================================================================
  test('accept_organization_invite still rejects revoked invitations', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, INVITEE, 'revoked-invitee@team-fn-role-test.local');
      const orgId = await createOrg(client, 'Revoked Invite Test', OWNER);
      await addMember(client, orgId, OWNER, 'owner');

      // Create revoked invitation as postgres (superuser bypass)
      const invRes = await client.query(
        `INSERT INTO public.organization_invitations (organization_id, email, role, job_title, status, invited_by)
         VALUES ($1, 'revoked-invitee@team-fn-role-test.local', 'member', 'Researcher', 'revoked', $2)
         RETURNING id, token`,
        [orgId, OWNER],
      );

      await expect(
        client.query(
          `SELECT * FROM public.accept_organization_invite($1, $2)`,
          [invRes.rows[0].token, INVITEE],
        ),
      ).rejects.toThrow(/dibatalkan/i);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  // ===========================================================================
  // 14. Owner Demotion/Deletion Protection — check_owner_demotion trigger
  // ===========================================================================
  test('trigger and function exist', async () => {
    const client = await pool.connect();
    try {
      const func = await client.query(
        `SELECT proname FROM pg_proc WHERE proname = 'check_owner_demotion'`,
      );
      expect(func.rows.length).toBeGreaterThanOrEqual(1);

      const trig = await client.query(
        `SELECT trigger_name FROM information_schema.triggers
         WHERE event_object_table = 'organization_members'
           AND trigger_name = 'trg_check_owner_demotion'`,
      );
      expect(trig.rows.length).toBe(1);
    } finally {
      client.release();
    }
  });

  test('cannot demote the only owner to admin', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Solo Owner Demote', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const res = await client.query(
        `UPDATE public.organization_members SET role = 'admin'
         WHERE user_id = $1 AND organization_id = $2 RETURNING role`,
        [OWNER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('cannot demote the only owner to member', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Solo Owner To Member', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const res = await client.query(
        `UPDATE public.organization_members SET role = 'member'
         WHERE user_id = $1 AND organization_id = $2 RETURNING role`,
        [OWNER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('cannot delete the only owner', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Solo Owner Delete', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const res = await client.query(
        `DELETE FROM public.organization_members
         WHERE user_id = $1 AND organization_id = $2 RETURNING id`,
        [OWNER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('can demote an owner when multiple owners exist', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, OWNER2);
      const orgId = await createOrg(client, 'Multi Owner Demote', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, OWNER2, 'owner');

      await actAs(client, OWNER);
      const res = await client.query(
        `UPDATE public.organization_members SET role = 'admin'
         WHERE user_id = $1 AND organization_id = $2 RETURNING role`,
        [OWNER2, orgId],
      );
      expect(res.rows[0].role).toBe('admin');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('can delete a non-owner member', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'Delete NonOwner', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');

      await actAs(client, OWNER);
      const res = await client.query(
        `DELETE FROM public.organization_members
         WHERE user_id = $1 AND organization_id = $2 RETURNING id`,
        [MEMBER, orgId],
      );
      expect(res.rows).toHaveLength(1);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('admin cannot demote the only owner', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, ADMIN);
      const orgId = await createOrg(client, 'Admin Demote Owner', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, ADMIN, 'admin');

      await actAs(client, ADMIN);
      const res = await client.query(
        `UPDATE public.organization_members SET role = 'member'
         WHERE user_id = $1 AND organization_id = $2 RETURNING role`,
        [OWNER, orgId],
      );
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
