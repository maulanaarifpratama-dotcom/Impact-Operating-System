import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

// Local Postgres connection URL provided by `supabase start`
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';


/**
 * These exercise real Postgres behaviour — RLS, triggers, separation of duties —
 * against the database `supabase start` provides on :54322. Without a local
 * Supabase running there is nothing to test against, and every case reports as
 * a failure that says nothing about the product. Probe once and skip the suite
 * instead, so a missing local stack is visibly "skipped" rather than "broken".
 */
const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[wbs postgres tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('WBS-P1A-3A Real Postgres DB Validation (Claims, Evidence & Separation of Duties)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: POSTGRES_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  // organizations.created_by (R1) did not exist when these fixtures were
  // first written and now requires a real auth.users row. claimed_by/
  // reviewed_by/uploaded_by below carry no foreign key to auth.users (see
  // 20260724180000_wbs_completion_claims_evidence.sql), so only the org
  // creator needs one.
  const WBS_TEST_CREATOR = '77777777-7777-7777-7777-777777777777';

  async function ensureAuthUser(client: pg.PoolClient, userId: string) {
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `${userId}@wbs-claims-test.local`],
    );
  }

  test('1. Schema Verification: Confirm tables, constraints, and indexes exist', async () => {
    const claimsCols = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'wbs_completion_claims'
    `);
    const claimColNames = claimsCols.rows.map(r => r.column_name);

    expect(claimColNames).toContain('id');
    expect(claimColNames).toContain('org_id');
    expect(claimColNames).toContain('lfa_project_id');
    expect(claimColNames).toContain('wbs_item_id');
    expect(claimColNames).toContain('claimed_by');
    expect(claimColNames).toContain('claimed_progress');
    expect(claimColNames).toContain('status');
    expect(claimColNames).toContain('reviewed_by');
    expect(claimColNames).toContain('reviewed_at');

    const evidenceCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'wbs_completion_evidence'
    `);
    const evidenceColNames = evidenceCols.rows.map(r => r.column_name);

    expect(evidenceColNames).toContain('id');
    expect(evidenceColNames).toContain('claim_id');
    expect(evidenceColNames).toContain('evidence_type');
    expect(evidenceColNames).toContain('storage_reference');
    expect(evidenceColNames).toContain('uploaded_by');
  });

  test('2. Claim Creation & Audit: Submitting user ID is set correctly', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create test org, project, and WBS item
      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org P1A-3A', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;

      const projRes = await client.query(`
        INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Project P1A-3A') RETURNING id
      `, [orgId]);
      const projId = projRes.rows[0].id;

      const wbsRes = await client.query(`
        INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'Task 1', 3) RETURNING id
      `, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const userA = '11111111-1111-1111-1111-111111111111';

      // Set auth.uid() context to User A
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      await client.query(`SET LOCAL request.jwt.claim.role = 'authenticated'`);

      const claimRes = await client.query(`
        INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
        VALUES ($1, $2, $3, $4, 'Task completed with evidence', 100)
        RETURNING id, claimed_by, status, submitted_at
      `, [orgId, projId, wbsId, userA]);

      expect(claimRes.rows[0].claimed_by).toBe(userA);
      expect(claimRes.rows[0].status).toBe('submitted');
      expect(claimRes.rows[0].submitted_at).not.toBeNull();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('3. Separation of Duties Enforcement: Submitter CANNOT verify their own claim', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org SOD', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;
      const projRes = await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Proj') RETURNING id`, [orgId]);
      const projId = projRes.rows[0].id;
      const wbsRes = await client.query(`INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'Task SOD', 3) RETURNING id`, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const userA = '11111111-1111-1111-1111-111111111111';

      // User A submits claim
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      await client.query(`SET LOCAL request.jwt.claim.role = 'authenticated'`);

      const claimRes = await client.query(`
        INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
        VALUES ($1, $2, $3, $4, 'My own claim', 100)
        RETURNING id
      `, [orgId, projId, wbsId, userA]);
      const claimId = claimRes.rows[0].id;

      // User A attempts to verify their OWN claim
      let errorThrown = false;
      try {
        await client.query(`
          UPDATE public.wbs_completion_claims 
          SET status = 'verified', review_note = 'Self approval attempt'
          WHERE id = $1
        `, [claimId]);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toContain('Separation of Duties violation');
      }

      expect(errorThrown).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('4. Authorized Verifier Review: Different user CAN verify and reviewed_by is server-set', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org Verifier', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;
      const projRes = await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Proj') RETURNING id`, [orgId]);
      const projId = projRes.rows[0].id;
      const wbsRes = await client.query(`INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'Task Verifier', 3) RETURNING id`, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222'; // Different user (verifier)

      // User A submits
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      await client.query(`SET LOCAL request.jwt.claim.role = 'authenticated'`);

      const claimRes = await client.query(`
        INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
        VALUES ($1, $2, $3, $4, 'Claim for verifier', 100)
        RETURNING id
      `, [orgId, projId, wbsId, userA]);
      const claimId = claimRes.rows[0].id;

      // User B verifies
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userB}'`);
      await client.query(`SET LOCAL request.jwt.claim.role = 'authenticated'`);

      const reviewRes = await client.query(`
        UPDATE public.wbs_completion_claims 
        SET status = 'verified', review_note = 'Evidence verified and approved'
        WHERE id = $1
        RETURNING status, reviewed_by, reviewed_at, review_note
      `, [claimId]);

      expect(reviewRes.rows[0].status).toBe('verified');
      expect(reviewRes.rows[0].reviewed_by).toBe(userB);
      expect(reviewRes.rows[0].reviewed_at).not.toBeNull();
      expect(reviewRes.rows[0].review_note).toBe('Evidence verified and approved');

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('5. Lifecycle & Evidence Persistence: Revision lifecycle preserves evidence rows', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org Lifecycle', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;
      const projRes = await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Proj') RETURNING id`, [orgId]);
      const projId = projRes.rows[0].id;
      const wbsRes = await client.query(`INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'Task Lifecycle', 3) RETURNING id`, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';

      // User A submits claim
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      const claimRes = await client.query(`
        INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
        VALUES ($1, $2, $3, $4, 'Initial claim', 100) RETURNING id
      `, [orgId, projId, wbsId, userA]);
      const claimId = claimRes.rows[0].id;

      // User A attaches Evidence 1
      await client.query(`
        INSERT INTO public.wbs_completion_evidence (org_id, claim_id, evidence_type, storage_reference, title, uploaded_by)
        VALUES ($1, $2, 'file', 's3://bucket/photo1.jpg', 'Foto Kegiatan 1', $3)
      `, [orgId, claimId, userA]);

      // User B reviews: needs_revision
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userB}'`);
      await client.query(`
        UPDATE public.wbs_completion_claims SET status = 'needs_revision', review_note = 'Tolong lengkapi presensi' WHERE id = $1
      `, [claimId]);

      // User A attaches Evidence 2 and resubmits
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      await client.query(`
        INSERT INTO public.wbs_completion_evidence (org_id, claim_id, evidence_type, storage_reference, title, uploaded_by)
        VALUES ($1, $2, 'file', 's3://bucket/presensi.pdf', 'Daftar Hadir', $3)
      `, [orgId, claimId, userA]);

      await client.query(`
        UPDATE public.wbs_completion_claims SET status = 'submitted', claim_note = 'Sudah dilengkapi presensi' WHERE id = $1
      `, [claimId]);

      // User B verifies
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userB}'`);
      const finalRes = await client.query(`
        UPDATE public.wbs_completion_claims SET status = 'verified', review_note = 'Lengkap dan disetujui' WHERE id = $1 RETURNING status
      `, [claimId]);

      expect(finalRes.rows[0].status).toBe('verified');

      // Verify ALL evidence rows remain intact (no loss of evidence history)
      const evRes = await client.query(`SELECT COUNT(*) FROM public.wbs_completion_evidence WHERE claim_id = $1`, [claimId]);
      expect(parseInt(evRes.rows[0].count)).toBe(2);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('6. Independence Verification: lfa_entries and lfa_wbs_items triggers are NOT mutated', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org Independence', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;
      const projRes = await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Proj') RETURNING id`, [orgId]);
      const projId = projRes.rows[0].id;
      const wbsRes = await client.query(`INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level, status) VALUES ($1, $2, 'Task Independence', 3, 'in_progress') RETURNING id, status, completed_at`, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';

      // Create & verify claim
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userA}'`);
      const claimRes = await client.query(`
        INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
        VALUES ($1, $2, $3, $4, 'Claim without mutating WBS directly', 100) RETURNING id
      `, [orgId, projId, wbsId, userA]);

      await client.query(`SET LOCAL request.jwt.claim.sub = '${userB}'`);
      await client.query(`UPDATE public.wbs_completion_claims SET status = 'verified' WHERE id = $1`, [claimRes.rows[0].id]);

      // Verify WBS item status and completed_at were NOT altered by claim verification
      const checkWbs = await client.query(`SELECT status, completed_at FROM public.lfa_wbs_items WHERE id = $1`, [wbsId]);
      expect(checkWbs.rows[0].status).toBe('in_progress');
      expect(checkWbs.rows[0].completed_at).toBeNull();

      // Verify lfa_entries table remains untouched
      const checkLfa = await client.query(`SELECT COUNT(*) FROM public.lfa_entries WHERE project_id = $1`, [projId]);
      expect(parseInt(checkLfa.rows[0].count)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  test('7. SECURITY FIX: Fail closed on unauthenticated session (auth.uid() is NULL)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await ensureAuthUser(client, WBS_TEST_CREATOR);
      const orgRes = await client.query(
        `INSERT INTO public.organizations (name, created_by) VALUES ('Test Org Security', $1) RETURNING id`,
        [WBS_TEST_CREATOR],
      );
      const orgId = orgRes.rows[0].id;
      const projRes = await client.query(`INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, 'Proj Security') RETURNING id`, [orgId]);
      const projId = projRes.rows[0].id;
      const wbsRes = await client.query(`INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'Task Security', 3) RETURNING id`, [orgId, projId]);
      const wbsId = wbsRes.rows[0].id;

      const spoofedUser = '99999999-9999-9999-9999-999999999999';

      // Ensure auth.uid() is NULL
      await client.query(`RESET request.jwt.claim.sub`);
      await client.query(`RESET request.jwt.claim.role`);

      // A. Unauthenticated Insert on Claims MUST be rejected
      await client.query('SAVEPOINT sp1');
      let claimErrorThrown = false;
      try {
        await client.query(`
          INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id, claimed_by, claim_note, claimed_progress)
          VALUES ($1, $2, $3, $4, 'Spoofed unauthenticated claim', 100)
        `, [orgId, projId, wbsId, spoofedUser]);
      } catch (err: any) {
        claimErrorThrown = true;
        expect(err.message).toContain('requires an authenticated user context');
        await client.query('ROLLBACK TO SAVEPOINT sp1');
      }
      expect(claimErrorThrown).toBe(true);

      // B. Unauthenticated Insert on Evidence MUST be rejected
      await client.query('SAVEPOINT sp2');
      let evidenceErrorThrown = false;
      try {
        await client.query(`
          INSERT INTO public.wbs_completion_evidence (org_id, claim_id, evidence_type, storage_reference, title, uploaded_by)
          VALUES ($1, '00000000-0000-0000-0000-000000000000', 'file', 's3://bucket/test.pdf', 'Spoofed Evidence', $2)
        `, [orgId, spoofedUser]);
      } catch (err: any) {
        evidenceErrorThrown = true;
        expect(err.message).toContain('requires an authenticated user context');
        await client.query('ROLLBACK TO SAVEPOINT sp2');
      }
      expect(evidenceErrorThrown).toBe(true);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
