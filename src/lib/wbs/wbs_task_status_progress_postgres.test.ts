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

describe.skipIf(!canReachPostgres)('WBS-P1A-1A Real Postgres DB Validation', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: POSTGRES_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('1. Database Schema Inspection: Verify status and progress columns exist with correct defaults & constraints', async () => {
    const columnsRes = await pool.query(`
      SELECT column_name, column_default, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lfa_wbs_items'
      AND column_name IN ('status', 'progress_percent', 'blocked_reason', 'completed_at', 'completed_by')
    `);

    const colMap = new Map(columnsRes.rows.map(r => [r.column_name, r]));

    expect(colMap.has('status')).toBe(true);
    expect(colMap.get('status').column_default).toContain('not_started');

    expect(colMap.has('progress_percent')).toBe(true);
    expect(colMap.get('progress_percent').column_default).toContain('0');

    expect(colMap.has('blocked_reason')).toBe(true);
    expect(colMap.has('completed_at')).toBe(true);
    expect(colMap.has('completed_by')).toBe(true);

    // Verify status CHECK constraint
    const checkRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.lfa_wbs_items'::regclass AND conname = 'lfa_wbs_items_status_check'
    `);

    expect(checkRes.rows.length).toBe(1);
    expect(checkRes.rows[0].def).toContain('draft');
    expect(checkRes.rows[0].def).toContain('not_started');
    expect(checkRes.rows[0].def).toContain('ready');
    expect(checkRes.rows[0].def).toContain('in_progress');
    expect(checkRes.rows[0].def).toContain('blocked');
    expect(checkRes.rows[0].def).toContain('in_review');
    expect(checkRes.rows[0].def).toContain('completed');
  });

  test('2. Real INSERT test: Insert row into lfa_wbs_items without status/progress and verify defaults', async () => {
    const orgRes = await pool.query(`INSERT INTO public.organizations (name) VALUES ('Test Org') RETURNING id`);
    const orgId = orgRes.rows[0].id;

    const projRes = await pool.query(`
      INSERT INTO public.lfa_projects (name, org_id)
      VALUES ('Test Project', $1)
      RETURNING id
    `, [orgId]);
    const projectId = projRes.rows[0].id;

    const insertRes = await pool.query(`
      INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, start_month, duration_weeks)
      VALUES ($1, $2, 1, 'Local Postgres Test Item', 1, 4)
      RETURNING id, status, progress_percent, blocked_reason, completed_at, completed_by
    `, [projectId, orgId]);

    const item = insertRes.rows[0];
    expect(item.status).toBe('not_started');
    expect(Number(item.progress_percent)).toBe(0);
    expect(item.blocked_reason).toBeNull();
    expect(item.completed_at).toBeNull();
    expect(item.completed_by).toBeNull();

    // Clean up
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [orgId]);
  });

  test('3. Real UPDATE & Trigger test: Update status to completed and verify completion attribution trigger', async () => {
    const orgRes = await pool.query(`INSERT INTO public.organizations (name) VALUES ('Test Org 2') RETURNING id`);
    const orgId = orgRes.rows[0].id;

    const projRes = await pool.query(`
      INSERT INTO public.lfa_projects (name, org_id)
      VALUES ('Test Trigger Project', $1)
      RETURNING id
    `, [orgId]);
    const projectId = projRes.rows[0].id;

    const insertRes = await pool.query(`
      INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, start_month, duration_weeks)
      VALUES ($1, $2, 1, 'Trigger Test Item', 1, 2)
      RETURNING id
    `, [projectId, orgId]);
    const itemId = insertRes.rows[0].id;

    // Update to completed
    const updateRes = await pool.query(`
      UPDATE public.lfa_wbs_items
      SET status = 'completed', progress_percent = 100
      WHERE id = $1
      RETURNING status, progress_percent, completed_at
    `, [itemId]);

    expect(updateRes.rows[0].status).toBe('completed');
    expect(Number(updateRes.rows[0].progress_percent)).toBe(100);
    expect(updateRes.rows[0].completed_at).not.toBeNull();

    // Update back to in_progress
    const revertRes = await pool.query(`
      UPDATE public.lfa_wbs_items
      SET status = 'in_progress', progress_percent = 50
      WHERE id = $1
      RETURNING status, progress_percent, completed_at
    `, [itemId]);

    expect(revertRes.rows[0].status).toBe('in_progress');
    expect(revertRes.rows[0].completed_at).not.toBeNull(); // Preserved as historical fact per Rule 4

    // Clean up
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [orgId]);
  });

  test('4. CHECK constraint validation: Attempt invalid status and verify Postgres rejects it', async () => {
    const orgRes = await pool.query(`INSERT INTO public.organizations (name) VALUES ('Test Org 3') RETURNING id`);
    const orgId = orgRes.rows[0].id;

    const projRes = await pool.query(`
      INSERT INTO public.lfa_projects (name, org_id)
      VALUES ('Test Constraint Project', $1)
      RETURNING id
    `, [orgId]);
    const projectId = projRes.rows[0].id;

    let errorThrown = false;
    try {
      await pool.query(`
        INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status)
        VALUES ($1, $2, 1, 'Invalid Status Item', 'invalid_status_value')
      `, [projectId, orgId]);
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toContain('lfa_wbs_items_status_check');
    }

    expect(errorThrown).toBe(true);

    // Clean up
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [orgId]);
  });

  test('5. No-LFA-Mutation validation: Confirm lfa_entries remains completely unchanged during WBS status/progress edits', async () => {
    const orgRes = await pool.query(`INSERT INTO public.organizations (name) VALUES ('Test Org LFA') RETURNING id`);
    const orgId = orgRes.rows[0].id;

    const projRes = await pool.query(`
      INSERT INTO public.lfa_projects (name, org_id)
      VALUES ('Test LFA Project', $1)
      RETURNING id
    `, [orgId]);
    const projectId = projRes.rows[0].id;

    // Create an entry in lfa_entries
    const lfaInsertRes = await pool.query(`
      INSERT INTO public.lfa_entries (project_id, org_id, level, description)
      VALUES ($1, $2, 'activity', 'Original LFA Activity Title')
      RETURNING id, updated_at, description
    `, [projectId, orgId]);
    const lfaEntryId = lfaInsertRes.rows[0].id;

    // Snapshot LFA entries state BEFORE WBS operations
    const snapshotBefore = await pool.query(`SELECT * FROM public.lfa_entries WHERE project_id = $1 ORDER BY id`, [projectId]);

    // Insert and update WBS item
    const wbsInsertRes = await pool.query(`
      INSERT INTO public.lfa_wbs_items (lfa_project_id, org_id, level, name, status, progress_percent)
      VALUES ($1, $2, 1, 'WBS Execution Task', 'in_progress', 25)
      RETURNING id
    `, [projectId, orgId]);
    const wbsItemId = wbsInsertRes.rows[0].id;

    await pool.query(`
      UPDATE public.lfa_wbs_items
      SET status = 'completed', progress_percent = 100, blocked_reason = 'Resolved'
      WHERE id = $1
    `, [wbsItemId]);

    // Snapshot LFA entries state AFTER WBS operations
    const snapshotAfter = await pool.query(`SELECT * FROM public.lfa_entries WHERE project_id = $1 ORDER BY id`, [projectId]);

    // Verify LFA entries are identical
    expect(snapshotBefore.rows).toEqual(snapshotAfter.rows);

    // Clean up
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [orgId]);
  });
});

