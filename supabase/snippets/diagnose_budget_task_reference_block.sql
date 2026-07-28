-- supabase/snippets/diagnose_budget_task_reference_block.sql
-- READ-ONLY. Run in the Supabase SQL editor (service role, so RLS does not hide
-- rows) to find why materialize_grantwriter_document refuses with
-- INVALID_BUDGET_TASK_REFERENCE at blocked_stage 'budget_state_check'.
--
-- Why this snippet exists rather than a migration: the RPC's own pre-flight check
-- counts EXISTING lfa_budget_items whose wbs_item_id points at no lfa_wbs_items
-- row. Queried as an ordinary authenticated user, project
-- 08fc1b53-9bf9-4de2-921f-597ce44d8263 shows 0 budget items, 0 WBS items and 0
-- dangling references — so the count cannot fire, unless RLS is hiding rows from
-- that user. Confirm which before changing the RPC. The July 2026 audit records
-- what happens when a migration is written against assumed state instead of read
-- state, and this is the same trap.

\set project_id '08fc1b53-9bf9-4de2-921f-597ce44d8263'

-- 1. The exact predicate the RPC evaluates. If this is 0, the block is NOT
--    stale budget rows and v_lfa_project_id is resolving to something else.
SELECT
  count(*) AS invalid_count_seen_by_rpc
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi
  ON wi.id = bi.wbs_item_id
 AND wi.lfa_project_id = bi.lfa_project_id
WHERE bi.lfa_project_id = :'project_id'
  AND bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL;

-- 2. Row counts the client could not see. Compare against what an ordinary user
--    reports for the same project (0 / 0 / 0 / 0 at the time of writing).
SELECT
  (SELECT count(*) FROM public.lfa_entries      WHERE project_id     = :'project_id') AS entries,
  (SELECT count(*) FROM public.lfa_wbs_items    WHERE lfa_project_id = :'project_id') AS wbs_items,
  (SELECT count(*) FROM public.lfa_budget_items WHERE lfa_project_id = :'project_id') AS budget_items,
  (SELECT count(*) FROM public.lfa_meal_items   WHERE lfa_project_id = :'project_id') AS meal_items;

-- 3. The offending rows themselves, if any. wbs_item_id here points nowhere.
SELECT bi.id, bi.wbs_item_id, bi.category, bi.description, bi.created_at
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi ON wi.id = bi.wbs_item_id
WHERE bi.lfa_project_id = :'project_id'
  AND bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL
ORDER BY bi.created_at
LIMIT 50;

-- 4. Ledger history. The client sees an empty lfa_materializations for this
--    project even though the RPC returned a materialization_id, which is
--    consistent with the transaction rolling the ledger row back — confirm.
SELECT id, status, failure_stage, failure_code, created_at, completed_at
FROM public.lfa_materializations
WHERE lfa_project_id = :'project_id'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Whether any project is in this state, not just this one. A non-empty result
--    means the block is a recurring data condition and the RPC should heal it
--    rather than dead-end the author, since a project in this state can never
--    materialise again.
SELECT bi.lfa_project_id, count(*) AS dangling_budget_refs
FROM public.lfa_budget_items bi
LEFT JOIN public.lfa_wbs_items wi
  ON wi.id = bi.wbs_item_id
 AND wi.lfa_project_id = bi.lfa_project_id
WHERE bi.wbs_item_id IS NOT NULL
  AND wi.id IS NULL
GROUP BY bi.lfa_project_id
ORDER BY dangling_budget_refs DESC;
