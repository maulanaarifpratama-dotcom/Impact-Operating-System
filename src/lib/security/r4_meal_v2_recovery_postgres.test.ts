import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.resolve(REPO_ROOT, 'supabase/migrations');
const MEAL_V2_FILE = 'supabase/migrations/20260801000003_add_meal_v2_architecture.sql';
const MEAL_V2_ORIGINAL_COMMIT = 'b3bfd3a';

/**
 * R4 MEAL V2 recovery: 20260801000003_add_meal_v2_architecture.sql targeted
 * a table named public.meal_tracking_entries, which has never existed --
 * the canonical table, confirmed live in production (R4 Final Gate,
 * 2026-08-05) and used by every application call site, is
 * public.lfa_meal_tracking_entries. This is a controlled historical
 * correction, not an additive bootstrap: a wrong ALTER TABLE target is a
 * hard SQL error that aborts the whole migration run, so no later file
 * could ever have repaired it. The fix is limited to renaming the wrong
 * table target in three SQL locations and two prose comments -- no column,
 * type, default, FK, or index name changes. The original, uncorrected file
 * remains permanently retrievable from git history at commit b3bfd3a.
 */
describe('R4 historical migration source correction', () => {
  test('the migration file still exists at its original path and filename', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, MEAL_V2_FILE))).toBe(true);
  });

  test('migration ordering is unchanged: sorts after 20260801000002 and before 20260801000004', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const before = files.indexOf('20260801000002_add_wbs_v2_financial_bottleneck.sql');
    const target = files.indexOf('20260801000003_add_meal_v2_architecture.sql');
    const after = files.indexOf('20260801000004_add_sroi_v2_audit_rationale.sql');

    expect(before).toBeGreaterThanOrEqual(0);
    expect(target).toBeGreaterThanOrEqual(0);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThan(target);
    expect(target).toBeLessThan(after);
  });

  test('no occurrence of the wrong table target remains', () => {
    const sql = fs.readFileSync(path.join(REPO_ROOT, MEAL_V2_FILE), 'utf8');
    expect(sql).not.toMatch(/(?<!lfa_)meal_tracking_entries\(/);
    expect(sql).not.toMatch(/ALTER TABLE public\.meal_tracking_entries/);
    expect(sql).not.toMatch(/ON public\.meal_tracking_entries/);
  });

  test('the corrected table target appears exactly where expected', () => {
    const sql = fs.readFileSync(path.join(REPO_ROOT, MEAL_V2_FILE), 'utf8');
    expect(sql).toContain('ALTER TABLE public.lfa_meal_tracking_entries');
    expect(sql).toContain('ON public.lfa_meal_tracking_entries(wbs_evidence_id)');
    expect(sql).toContain('ON public.lfa_meal_tracking_entries(verification_state)');
    // Index names are intentionally left in their original shortened form --
    // matching the naming convention already used by the table's own
    // original creator migration (idx_meal_tracking_entries_item/_project).
    expect(sql).toContain('idx_meal_tracking_entries_wbs_evidence_id');
    expect(sql).toContain('idx_meal_tracking_entries_verification_state');
  });

  test('the original, uncorrected file remains retrievable from git history', () => {
    const original = execFileSync('git', ['show', `${MEAL_V2_ORIGINAL_COMMIT}:${MEAL_V2_FILE}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(original).toContain('ALTER TABLE public.meal_tracking_entries');
    expect(original).toContain('ON public.meal_tracking_entries(wbs_evidence_id)');
  });

  test('the correction is limited to the authorized table-name/comment scope', () => {
    const original = execFileSync('git', ['show', `${MEAL_V2_ORIGINAL_COMMIT}:${MEAL_V2_FILE}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const corrected = fs.readFileSync(path.join(REPO_ROOT, MEAL_V2_FILE), 'utf8');

    // `git show` always returns the raw LF blob, but a working-tree file
    // checked out on a repo with core.autocrlf=true may be CRLF -- normalize
    // both sides before comparing so this test is platform-independent of
    // how the file was checked out, not just how it was edited.
    const normalize = (s: string) => s.replace(/\r\n?/g, '\n');
    const originalLines = normalize(original).split('\n');
    const correctedLines = normalize(corrected).split('\n');
    expect(correctedLines).toHaveLength(originalLines.length);

    const changedLines: number[] = [];
    for (let i = 0; i < originalLines.length; i++) {
      if (originalLines[i] !== correctedLines[i]) changedLines.push(i);
    }
    // Exactly 2 comment lines + 1 ALTER TABLE line + 2 index-target lines.
    expect(changedLines).toHaveLength(5);

    for (const i of changedLines) {
      // Every changed line differs only by the table-name substitution --
      // stripping every "lfa_" occurrence from the corrected line must
      // reproduce the original line exactly.
      expect(correctedLines[i].replace(/lfa_meal_tracking_entries/g, 'meal_tracking_entries')).toBe(originalLines[i]);
    }
  });
});

const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[R4 MEAL V2 recovery tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('R4 MEAL V2 Recovery — Real Postgres DB Validation', () => {
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
      [userId, `${userId}@r4-test.local`],
    );
  }

  async function createOrg(client: pg.PoolClient, name: string, createdBy: string) {
    const res = await client.query(
      `INSERT INTO public.organizations (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, createdBy],
    );
    return res.rows[0].id as string;
  }

  async function addMember(client: pg.PoolClient, orgId: string, userId: string, role: 'owner' | 'admin' | 'member') {
    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)`,
      [orgId, userId, role],
    );
  }

  async function createLfaProject(client: pg.PoolClient, orgId: string, name: string) {
    const res = await client.query(
      `INSERT INTO public.lfa_projects (org_id, name) VALUES ($1, $2) RETURNING id`,
      [orgId, name],
    );
    return res.rows[0].id as string;
  }

  async function createMealItem(client: pg.PoolClient, orgId: string, lfaProjectId: string) {
    const res = await client.query(
      `INSERT INTO public.lfa_meal_items (org_id, lfa_project_id, lfa_level, indicator_text)
       VALUES ($1, $2, 'output', 'R4 Test Indicator') RETURNING id`,
      [orgId, lfaProjectId],
    );
    return res.rows[0].id as string;
  }

  async function createTrackingEntry(client: pg.PoolClient, orgId: string, lfaProjectId: string, mealItemId: string) {
    const res = await client.query(
      `INSERT INTO public.lfa_meal_tracking_entries (org_id, lfa_project_id, meal_item_id, recorded_value)
       VALUES ($1, $2, $3, 10) RETURNING id`,
      [orgId, lfaProjectId, mealItemId],
    );
    return res.rows[0].id as string;
  }

  /**
   * wbs_completion_claims' own audit trigger fails closed on a null
   * auth.uid(), so this fixture needs a JWT claim set even though it runs
   * on the plain pool connection -- matching the pattern already used in
   * src/lib/wbs/wbs_completion_claims_postgres.test.ts.
   */
  async function seedWbsEvidence(client: pg.PoolClient, orgId: string, lfaProjectId: string, actorId: string) {
    const wbsRes = await client.query(
      `INSERT INTO public.lfa_wbs_items (org_id, lfa_project_id, name, level) VALUES ($1, $2, 'R4 Evidence Task', 1) RETURNING id`,
      [orgId, lfaProjectId],
    );
    const wbsId = wbsRes.rows[0].id;

    await client.query(`SET LOCAL request.jwt.claim.sub = '${actorId}'`);
    const claimRes = await client.query(
      `INSERT INTO public.wbs_completion_claims (org_id, lfa_project_id, wbs_item_id) VALUES ($1, $2, $3) RETURNING id`,
      [orgId, lfaProjectId, wbsId],
    );
    const claimId = claimRes.rows[0].id;

    const evRes = await client.query(
      `INSERT INTO public.wbs_completion_evidence (org_id, claim_id, uploaded_by) VALUES ($1, $2, $3) RETURNING id`,
      [orgId, claimId, actorId],
    );
    return evRes.rows[0].id as string;
  }

  const OWNER = 'd1111111-1111-1111-1111-111111111111';
  const MEMBER = 'd2222222-2222-2222-2222-222222222222';
  const OTHER_ORG_MEMBER = 'd3333333-3333-3333-3333-333333333333';

  // ---------------------------------------------------------------------
  // Canonical table identity
  // ---------------------------------------------------------------------
  describe('Canonical table identity', () => {
    test('lfa_meal_tracking_entries exists', async () => {
      const res = await pool.query(
        `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'lfa_meal_tracking_entries' AND c.relkind = 'r'`,
      );
      expect(res.rows).toHaveLength(1);
    });

    test('meal_tracking_entries does not exist', async () => {
      const res = await pool.query(
        `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'meal_tracking_entries'`,
      );
      expect(res.rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // Evidence Bridge columns
  // ---------------------------------------------------------------------
  describe('Evidence Bridge columns', () => {
    test('all five columns exist with the canonical shape', async () => {
      const res = await pool.query(
        `SELECT column_name, udt_name, character_maximum_length, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'lfa_meal_tracking_entries'
           AND column_name IN ('wbs_evidence_id', 'verification_state', 'verified_by', 'verified_at', 'verification_notes')`,
      );
      const byName = new Map(res.rows.map((r) => [r.column_name, r]));
      expect(byName.size).toBe(5);

      expect(byName.get('wbs_evidence_id')).toMatchObject({ udt_name: 'uuid', is_nullable: 'YES', column_default: null });
      expect(byName.get('verification_state')).toMatchObject({ udt_name: 'varchar', character_maximum_length: 50, is_nullable: 'YES' });
      expect(byName.get('verification_state')?.column_default).toContain("'draft'");
      expect(byName.get('verified_by')).toMatchObject({ udt_name: 'uuid', is_nullable: 'YES', column_default: null });
      expect(byName.get('verified_at')).toMatchObject({ udt_name: 'timestamptz', is_nullable: 'YES', column_default: null });
      expect(byName.get('verification_notes')).toMatchObject({ udt_name: 'text', is_nullable: 'YES', column_default: null });
    });
  });

  // ---------------------------------------------------------------------
  // Foreign keys
  // ---------------------------------------------------------------------
  describe('Foreign keys', () => {
    test('wbs_evidence_id references wbs_completion_evidence(id) ON DELETE SET NULL', async () => {
      const res = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.lfa_meal_tracking_entries'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lfa_meal_tracking_entries'::regclass AND attname = 'wbs_evidence_id')]`,
      );
      expect(res.rows[0]).toEqual({ target: 'wbs_completion_evidence', delete_action: 'n' });
    });

    test('verified_by references auth.users(id) ON DELETE SET NULL', async () => {
      const res = await pool.query(
        `SELECT confrelid::regclass::text AS target, confdeltype AS delete_action
         FROM pg_constraint
         WHERE conrelid = 'public.lfa_meal_tracking_entries'::regclass AND contype = 'f'
           AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lfa_meal_tracking_entries'::regclass AND attname = 'verified_by')]`,
      );
      expect(res.rows[0]).toEqual({ target: 'auth.users', delete_action: 'n' });
    });

    test('deleting the referenced WBS evidence sets wbs_evidence_id to NULL', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'd4040404-0404-0404-0404-040404040404';
        await ensureAuthUser(client, creator);
        const orgId = await createOrg(client, 'R4 Evidence Delete Org', creator);
        const projId = await createLfaProject(client, orgId, 'R4 Project');
        const mealItemId = await createMealItem(client, orgId, projId);
        const entryId = await createTrackingEntry(client, orgId, projId, mealItemId);
        const evidenceId = await seedWbsEvidence(client, orgId, projId, creator);

        await client.query(`UPDATE public.lfa_meal_tracking_entries SET wbs_evidence_id = $1 WHERE id = $2`, [evidenceId, entryId]);
        await client.query(`DELETE FROM public.wbs_completion_evidence WHERE id = $1`, [evidenceId]);

        const res = await client.query(`SELECT wbs_evidence_id FROM public.lfa_meal_tracking_entries WHERE id = $1`, [entryId]);
        expect(res.rows[0].wbs_evidence_id).toBeNull();
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('deleting the referenced auth user sets verified_by to NULL', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const creator = 'd5050505-0505-0505-0505-050505050505';
        const verifier = 'd6060606-0606-0606-0606-060606060606';
        await ensureAuthUser(client, creator);
        await ensureAuthUser(client, verifier);
        const orgId = await createOrg(client, 'R4 Verifier Delete Org', creator);
        const projId = await createLfaProject(client, orgId, 'R4 Project');
        const mealItemId = await createMealItem(client, orgId, projId);
        const entryId = await createTrackingEntry(client, orgId, projId, mealItemId);

        await client.query(`UPDATE public.lfa_meal_tracking_entries SET verified_by = $1 WHERE id = $2`, [verifier, entryId]);
        await client.query(`DELETE FROM auth.users WHERE id = $1`, [verifier]);

        const res = await client.query(`SELECT verified_by FROM public.lfa_meal_tracking_entries WHERE id = $1`, [entryId]);
        expect(res.rows[0].verified_by).toBeNull();
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Indexes
  // ---------------------------------------------------------------------
  describe('Indexes', () => {
    test('idx_meal_tracking_entries_wbs_evidence_id exists on the canonical table', async () => {
      const res = await pool.query(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lfa_meal_tracking_entries' AND indexname = 'idx_meal_tracking_entries_wbs_evidence_id'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].indexdef).toContain('lfa_meal_tracking_entries');
      expect(res.rows[0].indexdef).toContain('wbs_evidence_id');
      expect(res.rows[0].indexdef.toLowerCase()).toContain('btree');
      expect(res.rows[0].indexdef.toLowerCase()).not.toContain('unique');
    });

    test('idx_meal_tracking_entries_verification_state exists on the canonical table', async () => {
      const res = await pool.query(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lfa_meal_tracking_entries' AND indexname = 'idx_meal_tracking_entries_verification_state'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].indexdef).toContain('lfa_meal_tracking_entries');
      expect(res.rows[0].indexdef).toContain('verification_state');
      expect(res.rows[0].indexdef.toLowerCase()).toContain('btree');
      expect(res.rows[0].indexdef.toLowerCase()).not.toContain('unique');
    });
  });

  // ---------------------------------------------------------------------
  // RLS
  // ---------------------------------------------------------------------
  describe('RLS', () => {
    test('RLS is enabled and not forced', async () => {
      const res = await pool.query(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'public.lfa_meal_tracking_entries'::regclass`,
      );
      expect(res.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: false });
    });

    test('exactly the canonical org_isolation policy exists, membership-scoped, no USING(true) or WITH CHECK(true)', async () => {
      const res = await pool.query(
        `SELECT policyname, cmd, qual, with_check FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'lfa_meal_tracking_entries'`,
      );
      expect(res.rows).toHaveLength(1);
      const policy = res.rows[0];
      expect(policy.policyname).toBe('org_isolation_lfa_meal_tracking_entries');
      expect(policy.cmd).toBe('ALL');
      expect(policy.qual).toContain('is_org_member');
      expect(policy.with_check).toContain('is_org_member');
      expect(policy.qual).not.toBe('true');
      expect(policy.with_check).not.toBe('true');
    });
  });

  // ---------------------------------------------------------------------
  // Tenant behavior
  // ---------------------------------------------------------------------
  describe('Tenant behavior', () => {
    async function seedTenantOrgs(client: pg.PoolClient) {
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      await ensureAuthUser(client, OTHER_ORG_MEMBER);

      const orgId = await createOrg(client, 'R4 Tenant Org', OWNER);
      const otherOrgId = await createOrg(client, 'R4 Tenant Other Org', OTHER_ORG_MEMBER);

      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');
      await addMember(client, otherOrgId, OTHER_ORG_MEMBER, 'owner');

      const projId = await createLfaProject(client, orgId, 'R4 Tenant Project');
      const mealItemId = await createMealItem(client, orgId, projId);
      const entryId = await createTrackingEntry(client, orgId, projId, mealItemId);

      return { orgId, otherOrgId, projId, mealItemId, entryId };
    }

    test('a same-org member can read and update a tracking entry', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { entryId } = await seedTenantOrgs(client);

        // This table has never had an explicit privilege grant in any
        // tracked migration -- Production relies on Supabase's own ambient
        // schema-level default grant, which a disposable local replay never
        // receives. Granting it here, inside a rolled-back transaction,
        // reproduces Production's real privilege posture without touching
        // the actual database -- out of scope for R4's own migration file.
        await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lfa_meal_tracking_entries TO authenticated');
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const selectRes = await client.query(`SELECT id FROM public.lfa_meal_tracking_entries WHERE id = $1`, [entryId]);
        expect(selectRes.rows).toHaveLength(1);

        const updateRes = await client.query(
          `UPDATE public.lfa_meal_tracking_entries SET recorded_value = 42 WHERE id = $1 RETURNING recorded_value`,
          [entryId],
        );
        expect(Number(updateRes.rows[0].recorded_value)).toBe(42);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('a cross-org member cannot read or write another org\'s tracking entry', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { entryId } = await seedTenantOrgs(client);

        await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lfa_meal_tracking_entries TO authenticated');
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${OTHER_ORG_MEMBER}'`);

        const selectRes = await client.query(`SELECT id FROM public.lfa_meal_tracking_entries WHERE id = $1`, [entryId]);
        expect(selectRes.rows).toHaveLength(0);

        const updateRes = await client.query(
          `UPDATE public.lfa_meal_tracking_entries SET recorded_value = 99 WHERE id = $1`,
          [entryId],
        );
        expect(updateRes.rowCount).toBe(0);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('anonymous access is blocked: anon cannot execute the policy\'s membership check', async () => {
      // A live SET LOCAL ROLE anon query against a policy that calls a
      // function anon lacks EXECUTE on is a known crash risk for the local
      // disposable Postgres image (established earlier in this
      // engagement) -- a catalog-only check proves the same conclusion
      // (anon is blocked) without the live role-switch.
      const res = await pool.query(
        `SELECT has_function_privilege('anon', 'public.is_org_member(uuid,uuid)', 'EXECUTE') AS can_execute`,
      );
      expect(res.rows[0].can_execute).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // Security-debt canaries (documentation only, not approval assertions).
  // These prove CURRENT behavior. Do not make them pass by tightening
  // policy here -- that is explicitly out of scope for R4.
  // ---------------------------------------------------------------------
  describe('Unresolved security-debt canaries (documentation only, not approval)', () => {
    async function seedCanaryOrg(client: pg.PoolClient) {
      await ensureAuthUser(client, OWNER);
      await ensureAuthUser(client, MEMBER);
      const orgId = await createOrg(client, 'R4 Canary Org', OWNER);
      await addMember(client, orgId, OWNER, 'owner');
      await addMember(client, orgId, MEMBER, 'member');
      const projId = await createLfaProject(client, orgId, 'R4 Canary Project');
      const mealItemId = await createMealItem(client, orgId, projId);
      const entryId = await createTrackingEntry(client, orgId, projId, mealItemId);
      return { orgId, entryId };
    }

    test('documents unresolved verification-state write gap: an ordinary member can set verification_state to verified', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { entryId } = await seedCanaryOrg(client);

        await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lfa_meal_tracking_entries TO authenticated');
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(
          `UPDATE public.lfa_meal_tracking_entries SET verification_state = 'verified' WHERE id = $1 RETURNING verification_state`,
          [entryId],
        );
        // This SUCCEEDING is the documented gap, not a safe outcome -- no
        // role or self-attestation check restricts this transition today.
        expect(res.rows[0].verification_state).toBe('verified');
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });

    test('documents unresolved verified_by impersonation gap: an ordinary member can set verified_by to another synthetic user', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { entryId } = await seedCanaryOrg(client);
        const impersonated = 'd7070707-0707-0707-0707-070707070707';
        await ensureAuthUser(client, impersonated);

        await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lfa_meal_tracking_entries TO authenticated');
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${MEMBER}'`);

        const res = await client.query(
          `UPDATE public.lfa_meal_tracking_entries SET verified_by = $1 WHERE id = $2 RETURNING verified_by`,
          [impersonated, entryId],
        );
        // This SUCCEEDING is the documented gap: MEMBER (the actor) is not
        // required to equal verified_by, and no role gate applies.
        expect(res.rows[0].verified_by).toBe(impersonated);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------
  describe('Idempotency', () => {
    test('re-applying the corrected migration SQL is a clean no-op', async () => {
      const sql = fs.readFileSync(path.join(REPO_ROOT, MEAL_V2_FILE), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await expect(client.query(sql)).resolves.toBeDefined();

        const cols = await client.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'lfa_meal_tracking_entries'
             AND column_name IN ('wbs_evidence_id', 'verification_state', 'verified_by', 'verified_at', 'verification_notes')`,
        );
        expect(cols.rows).toHaveLength(5);

        const idx = await client.query(
          `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lfa_meal_tracking_entries'
             AND indexname IN ('idx_meal_tracking_entries_wbs_evidence_id', 'idx_meal_tracking_entries_verification_state')`,
        );
        expect(idx.rows).toHaveLength(2);
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
      }
    });
  });

  // ---------------------------------------------------------------------
  // Replay boundary
  // ---------------------------------------------------------------------
  describe('Replay boundary', () => {
    test('no table named meal_tracking_entries exists anywhere after replay', async () => {
      const res = await pool.query(
        `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'meal_tracking_entries'`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('lfa_meal_items also carries its MEAL V2 columns from the same migration', async () => {
      const res = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'lfa_meal_items'
           AND column_name IN ('indicator_type', 'aggregation_method', 'unit_type', 'verification_state', 'assigned_user')`,
      );
      expect(res.rows).toHaveLength(5);
    });
  });
});
