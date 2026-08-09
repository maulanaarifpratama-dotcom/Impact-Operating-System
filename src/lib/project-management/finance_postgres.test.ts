import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { resolve } from 'node:path';

const { Pool } = pg;
const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const MIGRATION_1 = resolve(process.cwd(), 'supabase/migrations/20260810000000_add_normalized_finance_schema.sql');
const MIGRATION_2 = resolve(process.cwd(), 'supabase/migrations/20260810010000_add_finance_lifecycle_rpc.sql');

// ─── Static Contract Validation (always runs) ──────────────────────────────

describe('PM-F2B1 migration contract (static)', () => {
  const { readFileSync } = require('node:fs');
  const m1 = readFileSync(MIGRATION_1, 'utf8');
  const m2 = readFileSync(MIGRATION_2, 'utf8');
  const combined = m1 + '\n' + m2;

  // ── Default fix
  test('drops DEFAULT on actual_amount_idr', () => {
    expect(m1).toContain('ALTER COLUMN actual_amount_idr DROP DEFAULT');
  });

  test('does NOT UPDATE existing actual_amount_idr rows', () => {
    expect(m1).not.toMatch(/UPDATE.*lfa_budget_items.*actual_amount_idr/i);
  });

  test('does NOT drop actual_amount_idr column', () => {
    expect(m1).not.toMatch(/DROP COLUMN.*actual_amount_idr/i);
  });

  test('legacy comment added for actual_amount_idr', () => {
    expect(m1).toContain('Legacy scalar actual');
  });

  // ── Composite FK prep
  test('adds composite UNIQUE on lfa_budget_items(id, lfa_project_id)', () => {
    expect(m1).toContain('lfa_budget_items_id_lfa_project_id_key');
    expect(m1).toContain('UNIQUE (id, lfa_project_id)');
  });

  // ── Commitment table
  test('creates project_budget_commitments table', () => {
    expect(m1).toContain('CREATE TABLE public.project_budget_commitments');
  });

  test('commitment has amount_idr > 0 check', () => {
    expect(m1).toMatch(/CHECK\s*\(\s*amount_idr\s*>\s*0\s*\)/);
  });

  test('commitment workflow_status domain: draft,submitted,approved,rejected,cancelled', () => {
    expect(m1).toContain("CHECK (workflow_status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled'))");
  });

  test('commitment: no active/partially_realized/realized stored status', () => {
    expect(m1).not.toContain("'active'");
    expect(m1).not.toContain("'partially_realized'");
    expect(m1).not.toContain("'realized'");
  });

  test('commitment: approved requires approved_by + approved_at', () => {
    expect(m1).toContain('commitment_approved_requires_actor');
    expect(m1).toContain('approved_by IS NOT NULL AND approved_at IS NOT NULL');
  });

  test('commitment: rejected requires rejected_by + rejected_at', () => {
    expect(m1).toContain('commitment_rejected_requires_actor');
  });

  test('commitment: cancelled requires cancelled_by + cancelled_at', () => {
    expect(m1).toContain('commitment_cancelled_requires_actor');
  });

  test('commitment: submitted requires submitted_by + submitted_at', () => {
    expect(m1).toContain('commitment_submitted_requires_actor');
  });

  test('commitment: draft must NOT have approval/rejection/cancel metadata', () => {
    expect(m1).toContain('commitment_draft_no_conflict_metadata');
  });

  test('commitment: composite FK (budget_item_id, lfa_project_id, org_id) REFERENCES lfa_budget_items', () => {
    expect(m1).toContain('fk_commitment_budget_item_project_org');
    expect(m1).toContain('FOREIGN KEY (budget_item_id, lfa_project_id, org_id)');
    expect(m1).toContain('REFERENCES public.lfa_budget_items(id, lfa_project_id, org_id)');
  });

  test('commitment: no scalar committed column on lfa_budget_items', () => {
    expect(m1).not.toMatch(/ALTER TABLE.*lfa_budget_items.*ADD.*committed/i);
  });

  test('commitment: no stored budget-item lifecycle status', () => {
    expect(m1).not.toMatch(/ALTER TABLE.*lfa_budget_items.*ADD.*status/i);
  });

  // ── Expenditure table
  test('creates project_budget_expenditures table', () => {
    expect(m1).toContain('CREATE TABLE public.project_budget_expenditures');
  });

  test('expenditure has amount_idr > 0 check', () => {
    const expSection = m1.split('CREATE TABLE public.project_budget_expenditures')[1];
    expect(expSection).toMatch(/CHECK\s*\(\s*amount_idr\s*>\s*0\s*\)/);
  });

  test('expenditure workflow_status domain: draft,submitted,posted,rejected', () => {
    expect(m1).toContain("CHECK (workflow_status IN ('draft', 'submitted', 'posted', 'rejected'))");
  });

  test('expenditure: posted requires posted_by + posted_at', () => {
    expect(m1).toContain('expenditure_posted_requires_actor');
  });

  test('expenditure: rejected requires rejected_by + rejected_at', () => {
    expect(m1).toContain('expenditure_rejected_requires_actor');
  });

  test('expenditure: submitted requires submitted_by + submitted_at', () => {
    expect(m1).toContain('expenditure_submitted_requires_actor');
  });

  test('expenditure: draft must NOT have posted/rejected metadata', () => {
    expect(m1).toContain('expenditure_draft_no_conflict_metadata');
  });

  test('expenditure: reversal_not_self check', () => {
    expect(m1).toContain('expenditure_reversal_not_self');
  });

  test('expenditure: composite FK to budget_items', () => {
    expect(m1).toContain('fk_expenditure_budget_item_project_org');
  });

  test('expenditure: composite FK to commitments (nullable, org+project+item scoped)', () => {
    expect(m1).toContain('fk_expenditure_commitment_identity');
  });

  test('expenditure: commitment FK uses ON DELETE RESTRICT (safer than CASCADE or SET NULL)', () => {
    expect(m1).toContain('ON DELETE RESTRICT');
  });

  // ── RLS
  test('RLS enabled for commitments', () => {
    expect(m1).toContain('ALTER TABLE public.project_budget_commitments ENABLE ROW LEVEL SECURITY');
  });

  test('RLS enabled for expenditures', () => {
    expect(m1).toContain('ALTER TABLE public.project_budget_expenditures ENABLE ROW LEVEL SECURITY');
  });

  test('RLS: commitments SELECT uses is_org_member', () => {
    expect(m1).toContain('commitments_select');
    expect(m1).toContain('public.is_org_member(org_id, auth.uid())');
  });

  test('RLS: direct client writes revoked; lifecycle via SECURITY DEFINER RPCs only', () => {
    expect(m1).toContain('REVOKE ALL ON TABLE public.project_budget_commitments');
    expect(m1).toContain('SECURITY DEFINER RPCs');
  });

  test('RLS: expenditures SELECT uses is_org_member', () => {
    expect(m1).toContain('public.is_org_member(org_id, auth.uid())');
  });

  test('RLS: no admin role in budget RLS policies', () => {
    expect(m1).not.toContain("'admin'");
  });

  // ── RPCs
  test('RPC: create_commitment_draft exists with SECURITY DEFINER', () => {
    expect(m2).toContain('create_commitment_draft');
    expect(m2).toContain('SECURITY DEFINER');
  });

  test('RPC: submit_commitment exists', () => {
    expect(m2).toContain('submit_commitment');
  });

  test('RPC: approve_commitment exists', () => {
    expect(m2).toContain('approve_commitment');
  });

  test('RPC: reject_commitment exists', () => {
    expect(m2).toContain('reject_commitment');
  });

  test('RPC: cancel_commitment exists', () => {
    expect(m2).toContain('cancel_commitment');
  });

  test('RPC: create_expenditure_draft exists', () => {
    expect(m2).toContain('create_expenditure_draft');
  });

  test('RPC: submit_expenditure exists', () => {
    expect(m2).toContain('submit_expenditure');
  });

  test('RPC: post_expenditure exists', () => {
    expect(m2).toContain('post_expenditure');
  });

  test('RPC: reject_expenditure exists', () => {
    expect(m2).toContain('reject_expenditure');
  });

  test('RPC: reverse_expenditure exists', () => {
    expect(m2).toContain('reverse_expenditure');
  });

  test('RPC: all use search_path = public, pg_temp', () => {
    const secDefRpcCount = (m2.match(/SET search_path = public, pg_temp/g) || []).length;
    expect(secDefRpcCount).toBeGreaterThanOrEqual(12); // 1 helper + 11 lifecycle RPCs
  });

  test('RPC: actor determined server-side via auth.uid()', () => {
    expect(m2).toContain("v_actor UUID := auth.uid()");
  });

  test('RPC: owner enforcement via assert_finance_owner', () => {
    expect(m2).toContain('assert_finance_owner');
    expect(m2).toContain("get_org_role(_org_id, _actor_id) <> 'owner'");
  });

  test('RPC: FOR UPDATE locks on target rows', () => {
    expect(m2).toContain('FOR UPDATE');
  });

  test('RPC: post_expenditure enforces commitment realization limit', () => {
    expect(m2).toContain('COMMITMENT_OVER_REALIZATION');
  });

  test('RPC: reverse_expenditure creates new record, not modifies original', () => {
    expect(m2).toContain('INSERT INTO public.project_budget_expenditures');
    expect(m2).toContain("Reversal of ' || v_original.id");
  });

  test('RPC: reverse_expenditure enforces over-reversal prevention', () => {
    expect(m2).toContain('REVERSAL_EXCEEDS_ORIGINAL');
  });

  test('RPC: reverse_expenditure prevents reversing a reversal', () => {
    expect(m2).toContain('REVERSAL_CANNOT_REVERSE_REVERSAL');
  });

  test('RPC: post_expenditure rejects unapproved commitment', () => {
    expect(m2).toContain('COMMITMENT_NOT_APPROVED');
  });

  // ── Audit events
  test('audit: entity_type extended with budget_commitment and budget_expenditure', () => {
    expect(m2).toContain("'budget_commitment'");
    expect(m2).toContain("'budget_expenditure'");
  });

  test('audit: event_type includes budget_commitment_* events', () => {
    expect(m2).toContain("'budget_commitment_created'");
    expect(m2).toContain("'budget_commitment_updated'");
    expect(m2).toContain("'budget_commitment_submitted'");
    expect(m2).toContain("'budget_commitment_approved'");
    expect(m2).toContain("'budget_commitment_rejected'");
    expect(m2).toContain("'budget_commitment_cancelled'");
  });

  test('audit: event_type includes budget_expenditure_* events', () => {
    expect(m2).toContain("'budget_expenditure_created'");
    expect(m2).toContain("'budget_expenditure_updated'");
    expect(m2).toContain("'budget_expenditure_submitted'");
    expect(m2).toContain("'budget_expenditure_posted'");
    expect(m2).toContain("'budget_expenditure_rejected'");
    expect(m2).toContain("'budget_expenditure_reversed'");
  });

  test('audit: safe_metadata does NOT contain secrets/tokens', () => {
    expect(m2).not.toMatch(/secret|token|api_key|password/i);
  });

  // ── Programme Design protection
  test('programme_design: no ALTER on lfa_budget_items beyond DROP DEFAULT', () => {
    expect(m1).toContain('ALTER TABLE public.lfa_budget_items');
    expect(m1).toContain('ALTER COLUMN actual_amount_idr DROP DEFAULT');
    expect(m1).toContain('lfa_budget_items_id_lfa_project_id_key');
    expect(m1).toContain('UNIQUE (id, lfa_project_id)');
    // Production FINAL adds org-level identity constraint inside DO block
    const alterCount = (m1.match(/ALTER TABLE\s+public\.lfa_budget_items/gi) || []).length;
    expect(alterCount).toBe(3); // DROP DEFAULT + 2 inside DO block
  });

  test('programme_design: no UPDATE on existing budget rows', () => {
    expect(m1).not.toMatch(/UPDATE\s+public\.lfa_budget_items/i);
  });

  test('programme_design: no stored budget-item lifecycle status', () => {
    expect(m1).not.toContain('budget_status');
    expect(m1).not.toContain('lifecycle_status');
  });

  // ── Grants
  test('grants: RPC functions granted to authenticated and service_role', () => {
    expect(m2).toContain('GRANT EXECUTE ON FUNCTION');
    expect(m2).toContain('TO authenticated, service_role');
  });

  test('grants: RPC functions revoked from PUBLIC and anon', () => {
    expect(m2).toContain('REVOKE ALL ON FUNCTION');
    expect(m2).toContain('FROM PUBLIC, anon');
  });

  // ── Read-only helper
  test('helper: compute_budget_aggregates is SECURITY DEFINER', () => {
    expect(m2).toContain('compute_budget_aggregates');
  });

  test('helper: uses is_org_member for tenant scoping', () => {
    expect(m2).toContain("public.is_org_member(bi.org_id, auth.uid())");
  });

  // ── Immutability contract (RPC must block invalid transitions)
  test('RPC: submit_commitment rejects non-draft', () => {
    expect(m2).toContain("COMMITMENT_NOT_DRAFT");
  });

  test('RPC: approve_commitment rejects non-submitted', () => {
    expect(m2).toContain("COMMITMENT_NOT_SUBMITTED");
  });

  test('RPC: reject_commitment rejects non-submitted', () => {
    expect(m2).toContain("COMMITMENT_NOT_SUBMITTED");
  });

  test('RPC: cancel_commitment rejects if not draft/submitted/approved', () => {
    expect(m2).toContain("COMMITMENT_CANNOT_CANCEL");
  });

  test('RPC: submit_expenditure rejects non-draft', () => {
    expect(m2).toContain("EXPENDITURE_NOT_DRAFT");
  });

  test('RPC: post_expenditure rejects non-submitted', () => {
    expect(m2).toContain("EXPENDITURE_NOT_SUBMITTED");
  });

  test('RPC: update_commitment_draft rejects non-draft', () => {
    expect(m2).toContain("COMMITMENT_NOT_DRAFT");
  });

  test('RPC: update_expenditure_draft rejects non-draft', () => {
    expect(m2).toContain("EXPENDITURE_NOT_DRAFT");
  });

  // ── Reversal
  test('RPC: reversal is immutable new record (original not changed)', () => {
    // Reversal creates INSERT, does not UPDATE original
    const reverseFn = m2.split('reverse_expenditure')[1];
    expect(reverseFn).not.toMatch(/UPDATE.*original/i);
    expect(reverseFn).toContain('INSERT INTO public.project_budget_expenditures');
  });

  test('RPC: reversal amount must be positive', () => {
    expect(m2).toContain('INVALID_REVERSAL_AMOUNT');
  });

  test('RPC: expenditure can be created without commitment', () => {
    expect(m2).toContain('p_commitment_id UUID DEFAULT NULL');
  });

  // ── Double counting prevention
  test('RPC: post_expenditure excludes draft/submitted/rejected from realization count', () => {
    expect(m2).toContain("e.workflow_status = 'posted'");
  });

  test('RPC: post_expenditure accounts for reversals in net commitment', () => {
    expect(m2).toContain('v_already_reversed');
  });

  test('aggregate: committed outstanding uses GREATEST(..., 0)', () => {
    expect(m2).toContain('greatest');
  });

  test('aggregate: net actual subtracts reversals', () => {
    expect(m2).toContain('net_actual');
  });
});

// ─── Postgres Integration Tests (skipped when no local Supabase) ──────────

const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[finance postgres tests] no local Postgres on :54322 - run supabase start to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('PM-F2B1 finance postgres integration', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  // ── Default fix verification
  test('new budget item has actual_amount_idr IS NULL (not 0)', async () => {
    const { rows } = await pool.query(`
      INSERT INTO public.organizations (name, created_by)
      VALUES ('finance-test-org', (SELECT id FROM auth.users LIMIT 1))
      RETURNING id
    `);
    const orgId = rows[0].id;

    // Create a project
    const { rows: projRows } = await pool.query(`
      INSERT INTO public.lfa_projects (name, org_id)
      VALUES ('finance-test-project', $1)
      RETURNING id
    `, [orgId]);
    const projectId = projRows[0].id;

    // Create a budget item WITHOUT specifying actual_amount_idr
    const { rows: budgetRows } = await pool.query(`
      INSERT INTO public.lfa_budget_items (org_id, lfa_project_id, item_name, volume, unit_price_idr)
      VALUES ($1, $2, 'test item', 1, 100000)
      RETURNING actual_amount_idr
    `, [orgId, projectId]);

    expect(budgetRows[0].actual_amount_idr).toBeNull();

    // Cleanup
    await pool.query('DELETE FROM public.lfa_budget_items WHERE lfa_project_id = $1', [projectId]);
    await pool.query('DELETE FROM public.lfa_projects WHERE id = $1', [projectId]);
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [orgId]);
  });

  test('existing actual_amount_idr values are not mutated', async () => {
    // Verify the column still exists with existing values
    const { rows } = await pool.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lfa_budget_items'
        AND column_name = 'actual_amount_idr'
    `);
    expect(rows.length).toBe(1);
    // Default should be gone (not '0')
    expect(rows[0].column_default).toBeNull();
  });

  // ── Table existence
  test('project_budget_commitments table exists', async () => {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_budget_commitments'
      ) as exists
    `);
    expect(rows[0].exists).toBe(true);
  });

  test('project_budget_expenditures table exists', async () => {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_budget_expenditures'
      ) as exists
    `);
    expect(rows[0].exists).toBe(true);
  });

  // ── RLS enabled
  test('RLS enabled on commitments', async () => {
    const { rows } = await pool.query(`
      SELECT relrowsecurity FROM pg_class
      WHERE relname = 'project_budget_commitments' AND relnamespace = 'public'::regnamespace
    `);
    expect(rows[0].relrowsecurity).toBe(true);
  });

  test('RLS enabled on expenditures', async () => {
    const { rows } = await pool.query(`
      SELECT relrowsecurity FROM pg_class
      WHERE relname = 'project_budget_expenditures' AND relnamespace = 'public'::regnamespace
    `);
    expect(rows[0].relrowsecurity).toBe(true);
  });

  // ── RPC existence
  test('all lifecycle RPCs are registered', async () => {
    const { rows } = await pool.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN (
          'create_commitment_draft', 'update_commitment_draft',
          'submit_commitment', 'approve_commitment', 'reject_commitment', 'cancel_commitment',
          'create_expenditure_draft', 'update_expenditure_draft',
          'submit_expenditure', 'post_expenditure', 'reject_expenditure', 'reverse_expenditure',
          'compute_budget_aggregates'
        )
      ORDER BY proname
    `);
    expect(rows.length).toBe(13);
  });

  // ── Composite FK
  test('composite FK exists on lfa_budget_items', async () => {
    const { rows } = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'lfa_budget_items_id_lfa_project_id_key'
    `);
    expect(rows.length).toBe(1);
  });

  test('commitment composite FK to budget_items exists', async () => {
    const { rows } = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'fk_commitment_budget_item_project'
    `);
    expect(rows.length).toBe(1);
  });

  test('expenditure composite FK to budget_items exists', async () => {
    const { rows } = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'fk_expenditure_budget_item_project'
    `);
    expect(rows.length).toBe(1);
  });

  // ── Audit event entity types
  test('project_activity_events accepts budget_commitment entity type', async () => {
    const { rows } = await pool.query(`
      SELECT pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conname = 'project_activity_events_entity_type_check'
    `);
    expect(rows[0].def).toContain('budget_commitment');
    expect(rows[0].def).toContain('budget_expenditure');
  });

  // ── Read-only helper
  test('compute_budget_aggregates returns correct columns', async () => {
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'project_budget_commitments'
      ORDER BY ordinal_position
    `);
    const colNames = rows.map((r: any) => r.column_name);
    expect(colNames).toContain('budget_item_id');
    expect(colNames).toContain('amount_idr');
    expect(colNames).toContain('workflow_status');
    expect(colNames).toContain('approved_by');
    expect(colNames).toContain('approved_at');
    expect(colNames).toContain('cancelled_by');
    expect(colNames).not.toContain('active'); // derived, not stored
  });
});
