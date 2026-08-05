import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { Pool } = pg;
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const D1_MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806000000_add_programme_deliverable_register_d1.sql'),
  'utf8'
);

describe('Deliverable Register D1 metadata contract (static assertions)', () => {
  it('uses apply-flag semantics for all nullable metadata fields', () => {
    expect(D1_MIGRATION_SQL).toContain('p_update_wbs_item_id BOOLEAN DEFAULT false');
    expect(D1_MIGRATION_SQL).toContain('p_update_description BOOLEAN DEFAULT false');
    expect(D1_MIGRATION_SQL).toContain('p_update_owner_id BOOLEAN DEFAULT false');
    expect(D1_MIGRATION_SQL).toContain('p_update_external_owner_text BOOLEAN DEFAULT false');
    expect(D1_MIGRATION_SQL).toContain('p_update_reviewer_id BOOLEAN DEFAULT false');
    expect(D1_MIGRATION_SQL).toContain('p_update_forecast_date BOOLEAN DEFAULT false');
  });

  it('implements explicit owner patch resolution and conflict guard', () => {
    expect(D1_MIGRATION_SQL).toContain("RAISE EXCEPTION 'INVALID_OWNER_PATCH'");
    expect(D1_MIGRATION_SQL).toContain('v_next_owner_id := p_owner_id;');
    expect(D1_MIGRATION_SQL).toContain('v_next_external_owner_text := v_external_owner_clean;');
    expect(D1_MIGRATION_SQL).toContain('v_next_owner_id := NULL;');
    expect(D1_MIGRATION_SQL).toContain('v_next_external_owner_text := NULL;');
  });

  it('protects reviewer clearing for review-dependent lifecycle states', () => {
    expect(D1_MIGRATION_SQL).toContain("p_reviewer_id IS NULL");
    expect(D1_MIGRATION_SQL).toContain("IN ('READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUBMITTED', 'ACCEPTED')");
    expect(D1_MIGRATION_SQL).toContain("RAISE EXCEPTION 'REVIEWER_REQUIRED'");
  });

  it('suppresses no-op metadata events', () => {
    expect(D1_MIGRATION_SQL).toContain('IF NOT v_changed THEN');
    expect(D1_MIGRATION_SQL).toContain('RETURN v_current;');
    expect(D1_MIGRATION_SQL).toContain("'METADATA_UPDATED'");
  });

  it('normalizes empty description to null when update flag is true', () => {
    expect(D1_MIGRATION_SQL).toContain("v_next_description := nullif(btrim(coalesce(p_description, '')), '')");
  });
});

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

describe.skipIf(!canReachPostgres)('Deliverable Register D1 postgres integration', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates table and keeps lfa_entries optional', async () => {
    const rows = await pool.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'programme_deliverables'
      order by ordinal_position
    `);

    const names = rows.rows.map((r) => r.column_name);
    expect(names).toContain('id');
    expect(names).toContain('lfa_project_id');
    expect(names).toContain('wbs_item_id');
    expect(names).toContain('lifecycle_status');
    expect(names).not.toContain('lfa_entry_id');
  });

  it('enforces lifecycle domain and archive triplet constraint at table-level', async () => {
    const lifecycleCheck = await pool.query(`
      select pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'programme_deliverables'
        and c.conname = 'programme_deliverables_lifecycle_status_check'
    `);
    expect(lifecycleCheck.rows.length).toBe(1);
    const lifecycleDef = lifecycleCheck.rows[0].def as string;
    expect(lifecycleDef).toContain('DRAFT');
    expect(lifecycleDef).toContain('PLANNED');
    expect(lifecycleDef).toContain('IN_PROGRESS');
    expect(lifecycleDef).toContain('READY_FOR_REVIEW');
    expect(lifecycleDef).toContain('CHANGES_REQUESTED');
    expect(lifecycleDef).toContain('APPROVED');
    expect(lifecycleDef).toContain('SUBMITTED');
    expect(lifecycleDef).toContain('ACCEPTED');
    expect(lifecycleDef).toContain('CANCELLED');

    const archiveTripletCheck = await pool.query(`
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'programme_deliverables'
        and c.conname = 'programme_deliverables_archive_triplet'
    `);
    expect(archiveTripletCheck.rows.length).toBe(1);
  });

  it('registers required RPCs', async () => {
    const funcs = await pool.query(`
      select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'create_programme_deliverable',
          'update_programme_deliverable_metadata',
          'transition_programme_deliverable',
          'archive_programme_deliverable'
        )
      order by p.proname
    `);

    const names = funcs.rows.map((f) => f.proname);
    expect(names).toEqual([
      'archive_programme_deliverable',
      'create_programme_deliverable',
      'transition_programme_deliverable',
      'update_programme_deliverable_metadata',
    ]);
  });

  it('keeps archive-only model and denies restore RPC in D1', async () => {
    const restoreCandidates = await pool.query(`
      select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('restore_programme_deliverable', 'unarchive_programme_deliverable')
    `);

    expect(restoreCandidates.rows.length).toBe(0);
  });

  it('keeps transition/archive RPCs atomic via single-function update + append-event pattern', async () => {
    const defs = await pool.query(`
      select p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('transition_programme_deliverable', 'archive_programme_deliverable')
      order by p.proname
    `);

    expect(defs.rows.length).toBe(2);
    for (const row of defs.rows) {
      const def = String(row.def);
      expect(def).toContain('FOR UPDATE');
      expect(def).toContain('UPDATE public.programme_deliverables');
      expect(def).toContain('INSERT INTO public.programme_deliverable_events');
    }
  });

  // --- Functional RPC behavior, executed as a real authenticated actor ------
  //
  // The suite above only proves the objects exist with the right shape. These
  // cases actually call the RPCs through a `SET LOCAL ROLE authenticated` +
  // `request.jwt.claim.sub` session — the same auth emulation the existing
  // WBS postgres tests use — so create/update/transition/archive run under
  // the real grant + SECURITY DEFINER + RLS stack, not as the postgres
  // superuser.
  //
  // programme_deliverables.created_by/owner_id/reviewer_id/archived_by and
  // programme_deliverable_events.actor_id all carry real FOREIGN KEY
  // constraints to auth.users(id) — unlike organization_members.user_id,
  // which has none. Every synthetic actor used below must exist as a real
  // auth.users row first, or the very first insert fails with a FK violation.

  const USER_OWNER = '11111111-1111-1111-1111-111111111111';
  const USER_REVIEWER = '22222222-2222-2222-2222-222222222222';
  const USER_OUTSIDER = '33333333-3333-3333-3333-333333333333'; // member of a different org
  const PLAIN_MEMBER = '44444444-4444-4444-4444-444444444444';

  async function actAs(client: pg.PoolClient, userId: string) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
  }

  async function ensureAuthUser(client: pg.PoolClient, userId: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `${userId}@d1-test.local`],
    );
  }

  async function seedOrgProjectAndMembers(client: pg.PoolClient) {
    for (const userId of [USER_OWNER, USER_REVIEWER, USER_OUTSIDER, PLAIN_MEMBER]) {
      await ensureAuthUser(client, userId);
    }

    const orgRes = await client.query(`INSERT INTO public.organizations (name) VALUES ('D1 Functional Org') RETURNING id`);
    const orgId = orgRes.rows[0].id;
    const projRes = await client.query(
      `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'D1 Functional Project') RETURNING id`,
      [orgId],
    );
    const projectId = projRes.rows[0].id;

    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
      [orgId, USER_OWNER],
    );
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [orgId, USER_REVIEWER],
    );

    return { orgId, projectId };
  }

  it('creates a deliverable via RPC as an authenticated org member and records exactly one CREATED event', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { orgId, projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const res = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Baseline Report', null, null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );
      const row = res.rows[0];
      expect(row.org_id).toBe(orgId);
      expect(row.lfa_project_id).toBe(projectId);
      expect(row.lifecycle_status).toBe('DRAFT');
      expect(row.created_by).toBe(USER_OWNER);

      const events = await client.query(
        `select event_type, from_status, to_status from public.programme_deliverable_events where deliverable_id = $1`,
        [row.id],
      );
      expect(events.rows).toEqual([{ event_type: 'CREATED', from_status: null, to_status: 'DRAFT' }]);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('denies create for an org the actor does not belong to (FORBIDDEN)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      // USER_OUTSIDER was never added as a member of this org.
      await actAs(client, USER_OUTSIDER);
      await expect(
        client.query(
          `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Should not exist', null, null, null, null, '2026-12-01', false, null)`,
          [projectId],
        ),
      ).rejects.toThrow(/FORBIDDEN/);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('creates and transitions a deliverable with zero lfa_entries and no WBS link (standalone compatibility)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      const entryCount = await client.query(`select count(*)::int as n from public.lfa_entries where project_id = $1`, [
        projectId,
      ]);
      expect(entryCount.rows[0].n).toBe(0);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'OTHER', 'No WBS, no LFA entries', null, null, null, null, '2026-12-01', true, null)`,
        [projectId],
      );
      expect(created.rows[0].wbs_item_id).toBeNull();

      const transitioned = await client.query(
        `select * from public.transition_programme_deliverable($1, 'PLANNED', null, null)`,
        [created.rows[0].id],
      );
      expect(transitioned.rows[0].lifecycle_status).toBe('PLANNED');

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('metadata KEEP: a no-op update (all apply flags false) returns the current row and inserts no event', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Keep Me', 'orig desc', null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );
      const id = created.rows[0].id;

      const kept = await client.query(
        `select * from public.update_programme_deliverable_metadata(
           $1, null, false, 'REPORT', 'Keep Me', null, false, null, false, null, false, null, false, '2026-12-01', false, null, false
         )`,
        [id],
      );
      expect(kept.rows[0].description).toBe('orig desc');

      const events = await client.query(
        `select count(*)::int as n from public.programme_deliverable_events where deliverable_id = $1 and event_type = 'METADATA_UPDATED'`,
        [id],
      );
      expect(events.rows[0].n).toBe(0);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('metadata SET: setting an internal owner clears any external owner text and records one METADATA_UPDATED event', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Owner Patch', null, null, 'External Person', null, '2026-12-01', false, null)`,
        [projectId],
      );
      const id = created.rows[0].id;
      expect(created.rows[0].external_owner_text).toBe('External Person');

      const updated = await client.query(
        `select * from public.update_programme_deliverable_metadata(
           $1, null, false, 'REPORT', 'Owner Patch', null, false, $2, true, null, true, null, false, '2026-12-01', false, null, false
         )`,
        [id, USER_REVIEWER],
      );
      expect(updated.rows[0].owner_id).toBe(USER_REVIEWER);
      expect(updated.rows[0].external_owner_text).toBeNull();

      const events = await client.query(
        `select count(*)::int as n from public.programme_deliverable_events where deliverable_id = $1 and event_type = 'METADATA_UPDATED'`,
        [id],
      );
      expect(events.rows[0].n).toBe(1);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('metadata CLEAR: clearing the owner (apply flag true, value null) nulls both owner fields', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Clear Owner', null, $2, null, null, '2026-12-01', false, null)`,
        [projectId, USER_OWNER],
      );
      const id = created.rows[0].id;

      const cleared = await client.query(
        `select * from public.update_programme_deliverable_metadata(
           $1, null, false, 'REPORT', 'Clear Owner', null, false, null, true, null, false, null, false, '2026-12-01', false, null, false
         )`,
        [id],
      );
      expect(cleared.rows[0].owner_id).toBeNull();
      expect(cleared.rows[0].external_owner_text).toBeNull();

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('metadata patch rejects setting both internal and external owner in the same call (INVALID_OWNER_PATCH)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Conflict', null, null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );

      await expect(
        client.query(
          `select * from public.update_programme_deliverable_metadata(
             $1, null, false, 'REPORT', 'Conflict', null, false, $2, true, 'Someone Else', true, null, false, '2026-12-01', false, null, false
           )`,
          [created.rows[0].id, USER_REVIEWER],
        ),
      ).rejects.toThrow(/INVALID_OWNER_PATCH/);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('runs the full happy-path lifecycle to ACCEPTED with reviewer approval (owner and reviewer are different people)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Lifecycle', null, $2, null, $3, '2026-12-01', false, null)`,
        [projectId, USER_OWNER, USER_REVIEWER],
      );
      const id = created.rows[0].id;

      await client.query(`select * from public.transition_programme_deliverable($1, 'PLANNED', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'IN_PROGRESS', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'READY_FOR_REVIEW', null, null)`, [
        id,
      ]);

      // Assigned reviewer, distinct from owner, with an owner/admin role: allowed.
      await actAs(client, USER_REVIEWER);
      const approved = await client.query(
        `select * from public.transition_programme_deliverable($1, 'APPROVED', null, null)`,
        [id],
      );
      expect(approved.rows[0].lifecycle_status).toBe('APPROVED');
      expect(approved.rows[0].approved_at).not.toBeNull();

      const submitted = await client.query(
        `select * from public.transition_programme_deliverable($1, 'SUBMITTED', null, null)`,
        [id],
      );
      expect(submitted.rows[0].lifecycle_status).toBe('SUBMITTED');

      const accepted = await client.query(
        `select * from public.transition_programme_deliverable($1, 'ACCEPTED', null, null)`,
        [id],
      );
      expect(accepted.rows[0].lifecycle_status).toBe('ACCEPTED');
      expect(accepted.rows[0].accepted_at).not.toBeNull();

      const events = await client.query(
        `select event_type, to_status from public.programme_deliverable_events where deliverable_id = $1 order by created_at`,
        [id],
      );
      expect(events.rows.map((r) => r.to_status)).toEqual([
        'DRAFT',
        'PLANNED',
        'IN_PROGRESS',
        'READY_FOR_REVIEW',
        'APPROVED',
        'SUBMITTED',
        'ACCEPTED',
      ]);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('denies self-review when the assigned reviewer is also the owner', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      // USER_REVIEWER is seeded as 'admin' — role-eligible to review — and is
      // assigned as BOTH owner and reviewer here on purpose, so the actor
      // legitimately clears the "actor = reviewer_id" and "role in
      // (owner, admin)" gates and reaches the self-review check itself.
      await actAs(client, USER_REVIEWER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Self review trap', null, $2, null, $2, '2026-12-01', false, null)`,
        [projectId, USER_REVIEWER],
      );
      const id = created.rows[0].id;

      await client.query(`select * from public.transition_programme_deliverable($1, 'PLANNED', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'IN_PROGRESS', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'READY_FOR_REVIEW', null, null)`, [
        id,
      ]);

      await client.query('SAVEPOINT sp_self_review');
      await expect(
        client.query(`select * from public.transition_programme_deliverable($1, 'APPROVED', null, null)`, [id]),
      ).rejects.toThrow(/SELF_REVIEW_DENIED/);
      await client.query('ROLLBACK TO SAVEPOINT sp_self_review');

      const row = await client.query(`select lifecycle_status from public.programme_deliverables where id = $1`, [id]);
      expect(row.rows[0].lifecycle_status).toBe('READY_FOR_REVIEW'); // unchanged — the denied attempt left no trace
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('denies an invalid transition and leaves no partial state behind (atomicity)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'No skipping states', null, null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );
      const id = created.rows[0].id;

      // DRAFT -> ACCEPTED is not a legal transition.
      await client.query('SAVEPOINT sp_invalid_transition');
      await expect(
        client.query(`select * from public.transition_programme_deliverable($1, 'ACCEPTED', null, null)`, [id]),
      ).rejects.toThrow(/INVALID_TRANSITION/);
      await client.query('ROLLBACK TO SAVEPOINT sp_invalid_transition');

      const row = await client.query(`select lifecycle_status from public.programme_deliverables where id = $1`, [id]);
      expect(row.rows[0].lifecycle_status).toBe('DRAFT');

      const events = await client.query(
        `select count(*)::int as n from public.programme_deliverable_events where deliverable_id = $1`,
        [id],
      );
      expect(events.rows[0].n).toBe(1); // only the original CREATED event — the failed attempt inserted nothing

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('an unauthorized (non-reviewer) actor cannot approve, and cancel requires owner/admin plus a reason', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { orgId, projectId } = await seedOrgProjectAndMembers(client);
      await client.query(
        `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member')`,
        [orgId, PLAIN_MEMBER],
      );

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Guarded review', null, null, null, $2, '2026-12-01', false, null)`,
        [projectId, USER_REVIEWER],
      );
      const id = created.rows[0].id;
      await client.query(`select * from public.transition_programme_deliverable($1, 'PLANNED', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'IN_PROGRESS', null, null)`, [id]);
      await client.query(`select * from public.transition_programme_deliverable($1, 'READY_FOR_REVIEW', null, null)`, [
        id,
      ]);

      await actAs(client, PLAIN_MEMBER);
      await client.query('SAVEPOINT sp_unauthorized_reviewer');
      await expect(
        client.query(`select * from public.transition_programme_deliverable($1, 'APPROVED', null, null)`, [id]),
      ).rejects.toThrow(/UNAUTHORIZED_REVIEWER/);
      await client.query('ROLLBACK TO SAVEPOINT sp_unauthorized_reviewer');

      await expect(
        client.query(`select * from public.transition_programme_deliverable($1, 'CANCELLED', 'not mine to cancel', null)`, [id]),
      ).rejects.toThrow(/FORBIDDEN/);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('cancel without a reason is rejected; cancel with a reason by owner/admin succeeds', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Cancel me', null, null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );
      const id = created.rows[0].id;

      // USER_OWNER was seeded with role 'member' — cancel requires owner/admin.
      await actAs(client, USER_REVIEWER); // seeded as 'admin'
      await client.query('SAVEPOINT sp_cancel_reason');
      await expect(
        client.query(`select * from public.transition_programme_deliverable($1, 'CANCELLED', null, null)`, [id]),
      ).rejects.toThrow(/EXCEPTION_REASON_REQUIRED/);
      await client.query('ROLLBACK TO SAVEPOINT sp_cancel_reason');

      const cancelled = await client.query(
        `select * from public.transition_programme_deliverable($1, 'CANCELLED', 'Scope dropped', null)`,
        [id],
      );
      expect(cancelled.rows[0].lifecycle_status).toBe('CANCELLED');

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('archive requires owner/admin and a non-blank reason, and denies a second archive', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { projectId } = await seedOrgProjectAndMembers(client);

      await actAs(client, USER_OWNER);
      const created = await client.query(
        `select * from public.create_programme_deliverable($1, null, 'REPORT', 'Archive me', null, null, null, null, '2026-12-01', false, null)`,
        [projectId],
      );
      const id = created.rows[0].id;

      // USER_OWNER is a plain 'member' here — archive is owner/admin only in D1.
      await client.query('SAVEPOINT sp_archive_forbidden');
      await expect(client.query(`select * from public.archive_programme_deliverable($1, 'done')`, [id])).rejects.toThrow(
        /FORBIDDEN/,
      );
      await client.query('ROLLBACK TO SAVEPOINT sp_archive_forbidden');

      await actAs(client, USER_REVIEWER); // seeded as 'admin'
      await client.query('SAVEPOINT sp_archive_blank_reason');
      await expect(client.query(`select * from public.archive_programme_deliverable($1, '')`, [id])).rejects.toThrow(
        /EXCEPTION_REASON_REQUIRED/,
      );
      await client.query('ROLLBACK TO SAVEPOINT sp_archive_blank_reason');

      const archived = await client.query(`select * from public.archive_programme_deliverable($1, 'Superseded')`, [id]);
      expect(archived.rows[0].archived_at).not.toBeNull();
      expect(archived.rows[0].archived_by).toBe(USER_REVIEWER);

      await client.query('SAVEPOINT sp_already_archived');
      await expect(
        client.query(`select * from public.archive_programme_deliverable($1, 'again')`, [id]),
      ).rejects.toThrow(/ALREADY_ARCHIVED/);
      await client.query('ROLLBACK TO SAVEPOINT sp_already_archived');

      const events = await client.query(
        `select count(*)::int as n from public.programme_deliverable_events where deliverable_id = $1 and event_type = 'ARCHIVED'`,
        [id],
      );
      expect(events.rows[0].n).toBe(1);

    } finally {
      // Always rollback, even on an unexpected/unasserted error — otherwise a
      // connection can be returned to the pool mid-aborted-transaction and
      // poison whichever later test happens to reuse it.
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
