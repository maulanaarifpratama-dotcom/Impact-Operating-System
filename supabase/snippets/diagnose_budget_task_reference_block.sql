-- supabase/snippets/diagnose_budget_task_reference_block.sql
-- READ-ONLY. Run in the Supabase SQL editor (service role, so RLS does not hide
-- rows) to find why materialize_grantwriter_document refuses with
-- INVALID_BUDGET_TASK_REFERENCE at blocked_stage 'budget_state_check'.
--
-- Plain SQL only: the editor runs statements over a normal connection, so psql
-- meta-commands such as \set are a syntax error there. The project id is written
-- out in each query instead — change it in all five if you need another project.
--
-- Why a snippet rather than a migration: the RPC's pre-flight check counts
-- EXISTING lfa_budget_items whose wbs_item_id points at no lfa_wbs_items row.
-- Queried as an ordinary authenticated user, project
-- 08fc1b53-9bf9-4de2-921f-597ce44d8263 shows 0 budget items, 0 WBS items and 0
-- dangling references — so the count cannot fire, unless RLS is hiding rows from
-- that user. Confirm which before changing the RPC. The July 2026 audit records
-- what happens when a migration is written against assumed state instead of read
-- state, and this is the same trap.

-- 1. The exact predicate the RPC evaluates. If this is 0, the block is NOT stale
--    budget rows and v_lfa_project_id is resolving to something else.
SELECT count(*) AS invalid_count_seen_by_rpc
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi
  ON wi.id = bi.wbs_item_id
 AND wi.lfa_project_id = bi.lfa_project_id
WHERE bi.lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263'
  AND bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL;

-- 2. Row counts the client could not see. An ordinary user reports 0/0/0/0 for
--    this project; anything higher here means RLS was hiding rows.
SELECT
  (SELECT count(*) FROM public.lfa_entries      WHERE project_id     = '08fc1b53-9bf9-4de2-921f-597ce44d8263') AS entries,
  (SELECT count(*) FROM public.lfa_wbs_items    WHERE lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263') AS wbs_items,
  (SELECT count(*) FROM public.lfa_budget_items WHERE lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263') AS budget_items,
  (SELECT count(*) FROM public.lfa_meal_items   WHERE lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263') AS meal_items;

-- 3. The offending rows themselves, if any. wbs_item_id here points nowhere.
SELECT bi.id, bi.wbs_item_id, bi.category, bi.item_name, bi.activity_name, bi.created_at
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi ON wi.id = bi.wbs_item_id
WHERE bi.lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263'
  AND bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL
ORDER BY bi.created_at
LIMIT 50;

-- 4. Ledger history. The client sees an empty lfa_materializations for this
--    project even though the RPC returned a materialization_id, which is
--    consistent with the transaction rolling the ledger row back — confirm.
SELECT id, status, failure_stage, failure_code, created_at, completed_at
FROM public.lfa_materializations
WHERE lfa_project_id = '08fc1b53-9bf9-4de2-921f-597ce44d8263'
ORDER BY created_at DESC
LIMIT 10;

-- 4b. THE DECIDING QUERY. Is the deployed function the one in this repo?
--
--     Reasoning that led here: only one place in the repo's migration sets
--     blocked_stage 'budget_state_check' with INVALID_BUDGET_TASK_REFERENCE, and
--     it is guarded by a count over EXISTING lfa_budget_items for
--     v_lfa_project_id. Service role confirms that project has 0 budget items,
--     and the failure response reports that same variable as the project id — so
--     with the source as written in this repo the count is 0 and the branch
--     cannot be reached. It was reached. The most likely explanation is that the
--     live function differs from the file, which is exactly the trap the July
--     2026 audit documents for anything whose definition lives outside the repo.
--
--     Repo migration 20260721123000 has: body length 97683, four occurrences of
--     INVALID_BUDGET_TASK_REFERENCE, three of budget_state_check. If the numbers
--     below differ, the deployed function is a different version and the fix is a
--     redeploy, not a code change.
SELECT
  length(p.prosrc)                                                            AS live_body_length,
  (SELECT count(*) FROM regexp_matches(p.prosrc, 'INVALID_BUDGET_TASK_REFERENCE', 'g')) AS invalid_budget_occurrences,
  (SELECT count(*) FROM regexp_matches(p.prosrc, 'budget_state_check', 'g'))   AS budget_state_check_occurrences
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'materialize_grantwriter_document';

-- 4c. If 4b shows a mismatch, this prints the live budget check so it can be read
--     directly instead of inferred.
SELECT substring(
         p.prosrc
         FROM greatest(position('budget_state_check' IN p.prosrc) - 1000, 1)
         FOR 1400
       ) AS live_budget_check_region
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'materialize_grantwriter_document';

-- 5. Whether any project is in this state, not just this one. This is the query
--    that decides the shape of the fix: a non-empty result means the block is a
--    recurring data condition and the RPC should clear a dangling reference and
--    carry on rather than dead-end the author, because a project in this state
--    can never materialise again.
SELECT bi.lfa_project_id, count(*) AS dangling_budget_refs
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi
  ON wi.id = bi.wbs_item_id
 AND wi.lfa_project_id = bi.lfa_project_id
WHERE bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL
GROUP BY bi.lfa_project_id
ORDER BY dangling_budget_refs DESC;
