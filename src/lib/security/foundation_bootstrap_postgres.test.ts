import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const { Pool } = pg;

const POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.resolve(REPO_ROOT, 'supabase/migrations');
const FOUNDATION_FILE = 'supabase/migrations/20260600000000_organizations.sql';

/**
 * Foundation source-of-truth recovery: 20260600000000_organizations.sql is
 * the sole historical creator of organizations, organization_members,
 * profiles, mor_sessions, library_documents, gw_projects,
 * gw_lfa_documents, library_chunks, and the original is_org_member(uuid,
 * uuid) signature. Until this recovery, the file was excluded by
 * .gitignore and never committed, so any Git-only checkout (detached
 * worktree, clean clone, CI, disaster recovery) could not replay past
 * 20260614180000_lfa_builder.sql. This suite documents the file's
 * provenance, confirms every downstream reconciliation, and canaries the
 * four tables still carrying their original, unreconciled broad policy --
 * those canaries document a known, pre-existing gap, not an approval of it.
 */
describe('Foundation source-of-truth provenance', () => {
  test('the foundation migration exists in the working tree', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, FOUNDATION_FILE))).toBe(true);
  });

  test('the foundation path is no longer excluded by .gitignore', () => {
    // git check-ignore exits 0 (with output) when a path IS ignored, and
    // non-zero (throwing for execFileSync) when it is not.
    expect(() => {
      execFileSync('git', ['check-ignore', FOUNDATION_FILE], { cwd: REPO_ROOT, stdio: 'pipe' });
    }).toThrow();
  });

  test('the foundation migration sorts before 20260614180000_lfa_builder.sql', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const foundationIdx = files.indexOf('20260600000000_organizations.sql');
    const firstConsumerIdx = files.indexOf('20260614180000_lfa_builder.sql');

    expect(foundationIdx).toBeGreaterThanOrEqual(0);
    expect(firstConsumerIdx).toBeGreaterThanOrEqual(0);
    expect(foundationIdx).toBeLessThan(firstConsumerIdx);
  });
});

const canReachPostgres = await (async () => {
  const probePool = new Pool({ connectionString: POSTGRES_URL, connectionTimeoutMillis: 2000 });
  try {
    await probePool.query('select 1');
    return true;
  } catch {
    console.warn('[Foundation bootstrap tests] no local Postgres on :54322 — run `supabase start` to include these.');
    return false;
  } finally {
    await probePool.end().catch(() => {});
  }
})();

describe.skipIf(!canReachPostgres)('Foundation Bootstrap — Real Postgres DB Validation', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: POSTGRES_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function tableExists(schema: string, table: string) {
    const res = await pool.query(
      `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r'`,
      [schema, table],
    );
    return res.rows.length === 1;
  }

  // -------------------------------------------------------------------
  // Foundation objects exist -- the original contract downstream history
  // depends on, not the mature Production-only shape those tables later
  // grow into.
  // -------------------------------------------------------------------
  describe('Foundation objects exist', () => {
    test.each([
      'organizations',
      'organization_members',
      'profiles',
      'mor_sessions',
      'library_documents',
      'gw_projects',
      'gw_lfa_documents',
      'library_chunks',
    ])('public.%s exists', async (table) => {
      expect(await tableExists('public', table)).toBe(true);
    });

    test('is_org_member(uuid, uuid) exists', async () => {
      // pg_get_function_identity_arguments includes parameter names for a
      // function declared with named parameters -- match on argument types
      // via pg_get_function_arguments's udt list instead of the exact string.
      const res = await pool.query(
        `SELECT pg_get_function_identity_arguments(p.oid) AS idargs
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'is_org_member'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].idargs.match(/uuid/gi)).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------
  // Reconciliation chain final state -- proves the foundation file's
  // historical stub/broad-policy state was superseded by committed R1/R3
  // migrations, not merely that the foundation file itself looks a
  // certain way.
  // -------------------------------------------------------------------
  describe('Reconciliation chain final state', () => {
    test('is_org_member is the scoped membership EXISTS implementation, not the historical SELECT true stub', async () => {
      const res = await pool.query(
        `SELECT pg_get_functiondef(p.oid) AS def
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'is_org_member'`,
      );
      expect(res.rows).toHaveLength(1);
      const def = res.rows[0].def as string;
      expect(def).toContain('EXISTS');
      expect(def).toContain('organization_members');
      // The historical body was exactly "SELECT true;" with nothing else
      // referencing a table -- the scoped body must not collapse to that.
      expect(def.replace(/\s+/g, ' ')).not.toMatch(/AS \$\$?\s*SELECT true;?\s*\$\$?;?$/i);
    });

    test('organizations no longer has its original permissive read/write policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations'
           AND policyname IN ('Enable read for authenticated users on organizations', 'Enable write for authenticated users on organizations')`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('organization_members no longer has its original permissive read/write policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members'
           AND policyname IN ('Enable read for authenticated users on organization_members', 'Enable write for authenticated users on organization_members')`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('gw_projects no longer has "Enable all for gw_projects"', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_projects' AND policyname = 'Enable all for gw_projects'`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('library_documents no longer has "Enable all for library_documents"', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'library_documents' AND policyname = 'Enable all for library_documents'`,
      );
      expect(res.rows).toHaveLength(0);
    });

    test('organizations has its canonical replacement policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations'`,
      );
      const names = res.rows.map((r) => r.policyname);
      for (const expected of ['orgs_create', 'orgs_creator_read', 'orgs_members_read', 'orgs_owner_update', 'orgs_owner_delete']) {
        expect(names).toContain(expected);
      }
    });

    test('organization_members has its canonical replacement policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members'`,
      );
      const names = res.rows.map((r) => r.policyname);
      for (const expected of ['members_owner_manage', 'members_read_own_org', 'members_self_insert']) {
        expect(names).toContain(expected);
      }
    });

    test('gw_projects has its canonical replacement read/update policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_projects'`,
      );
      const names = res.rows.map((r) => r.policyname);
      expect(names).toContain('gw_projects_member_read');
      expect(names).toContain('gw_projects_member_update');
    });

    test('library_documents has its canonical replacement read/update/delete policies', async () => {
      const res = await pool.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'library_documents'`,
      );
      const names = res.rows.map((r) => r.policyname);
      expect(names).toContain('lib_docs_member_read');
      expect(names).toContain('lib_docs_member_update');
      expect(names).toContain('lib_docs_owner_delete');
    });
  });

  // -------------------------------------------------------------------
  // Explicit unresolved security-debt canaries. These document a known,
  // pre-existing gap; they are NOT approval assertions, and no future
  // change should make them pass by adding a skip -- only by actually
  // reconciling the named table's policy.
  // -------------------------------------------------------------------
  describe('Unresolved security-debt canaries (documentation only, not approval)', () => {
    test('profiles documents unresolved legacy broad policy', async () => {
      const res = await pool.query(
        `SELECT policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Enable all for profiles'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].qual).toBe('true');
    });

    test('mor_sessions documents unresolved legacy broad policy', async () => {
      const res = await pool.query(
        `SELECT policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mor_sessions' AND policyname = 'Enable all for mor_sessions'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].qual).toBe('true');
    });

    test('gw_lfa_documents documents unresolved legacy broad policy', async () => {
      const res = await pool.query(
        `SELECT policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_lfa_documents' AND policyname = 'Enable all for gw_lfa_documents'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].qual).toBe('true');
    });

    test('library_chunks documents unresolved legacy broad policy', async () => {
      const res = await pool.query(
        `SELECT policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'library_chunks' AND policyname = 'Enable all for library_chunks'`,
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].qual).toBe('true');
    });
  });
});
