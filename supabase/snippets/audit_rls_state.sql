-- supabase/snippets/audit_rls_state.sql
-- READ-ONLY. Run this in the Supabase SQL editor against the target database
-- BEFORE applying 20260726010000_harden_org_rls.sql.
--
-- The repo cannot tell you what RLS is actually live: the file that creates the
-- organization tables (20260600000000_organizations.sql) is gitignored as a local
-- bootstrap, so production policies were established out-of-band. These three
-- queries show the real state.

-- 1. Every policy in public, unconditional ones first.
--    Anything flagged UNCONDITIONAL grants access to every row of that table.
SELECT
  c.relname                                              AS table_name,
  c.relrowsecurity                                       AS rls_enabled,
  pol.polname                                            AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END                                                    AS command,
  pg_get_expr(pol.polqual, pol.polrelid)                 AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid)            AS with_check_expr,
  CASE
    WHEN pg_get_expr(pol.polqual, pol.polrelid) = 'true'
      OR pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'
    THEN 'UNCONDITIONAL'
    ELSE 'scoped'
  END                                                    AS verdict
FROM pg_policy pol
JOIN pg_class     c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY verdict DESC, c.relname, pol.polname;

-- 2. Tables where RLS is OFF, or ON but with no policies at all.
--    RLS off  = wide open to any authenticated client.
--    RLS on, zero policies = closed to everyone except the service role.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COUNT(pol.polname) AS policy_count,
  CASE
    WHEN NOT c.relrowsecurity THEN 'RLS DISABLED - open to all clients'
    WHEN COUNT(pol.polname) = 0 THEN 'RLS on, no policies - service role only'
    ELSE 'ok'
  END AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
HAVING NOT c.relrowsecurity OR COUNT(pol.polname) = 0
ORDER BY c.relrowsecurity, c.relname;

-- 3. The membership helper the policies depend on. If the body is
--    "SELECT true" it is a stub and every policy calling it is a no-op.
SELECT
  p.proname                        AS function_name,
  p.prosecdef                      AS is_security_definer,
  pg_get_functiondef(p.oid)        AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_org_member', 'get_org_role', 'is_org_creator', 'shares_org_with');
