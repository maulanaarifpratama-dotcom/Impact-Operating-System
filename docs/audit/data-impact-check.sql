-- SQL Operation Query: Identify Legacy Production Workspaces Affected by Missing/Incorrect WBS Level 2 sourceActivityId References
-- Path: docs/audit/data-impact-check.sql
--
-- This query scans 'public.gw_lfa_documents' (which contains generated program frameworks and skeletons) 
-- to identify legacy documents where Level 2 tasks do not have direct 'sourceActivityId' mappings,
-- but can be resolved via their parent Level 1 tasks. This scale analysis helps DevOps and Product teams 
-- identify workspaces that are vulnerable to materialization errors under the old unpatched logic.

WITH wbs_tasks AS (
  SELECT 
    doc.id AS document_id,
    doc.project_id AS project_id,
    doc.organization_id AS org_id,
    doc.version AS document_version,
    (doc.matrix->'program_skeleton'->'meta'->>'projectTitle') AS project_title,
    task.value->>'id' AS task_id,
    (task.value->>'level')::integer AS task_level,
    task.value->>'parentId' AS parent_id,
    nullif(trim(task.value->>'sourceActivityId'), '') AS source_activity_id,
    task.value AS raw_task_json,
    doc.matrix->'program_skeleton'->'wbs'->'tasks' AS all_tasks_json
  FROM public.gw_lfa_documents doc,
  LATERAL jsonb_array_elements(doc.matrix->'program_skeleton'->'wbs'->'tasks') AS task
  WHERE doc.matrix->'program_skeleton'->'wbs'->'tasks' IS NOT NULL
),
affected_child_tasks AS (
  SELECT 
    child.document_id,
    child.project_id,
    child.org_id,
    child.document_version,
    child.project_title,
    child.task_id AS child_task_id,
    child.raw_task_json->>'name' AS child_task_name,
    child.parent_id,
    parent.value->>'id' AS resolved_parent_task_id,
    parent.value->>'name' AS parent_task_name,
    nullif(trim(parent.value->>'sourceActivityId'), '') AS resolved_source_activity_id
  FROM wbs_tasks child
  JOIN LATERAL jsonb_array_elements(child.all_tasks_json) AS parent ON parent.value->>'id' = child.parent_id
  WHERE child.task_level = 2
    AND child.source_activity_id IS NULL
    AND parent.value->>'id' = child.parent_id
    AND nullif(trim(parent.value->>'sourceActivityId'), '') IS NOT NULL
)
SELECT 
  document_id,
  project_id,
  org_id,
  document_version,
  project_title,
  count(child_task_id) AS affected_level2_tasks_count,
  jsonb_agg(
    jsonb_build_object(
      'child_task_id', child_task_id,
      'child_task_name', child_task_name,
      'parent_id', parent_id,
      'parent_task_name', parent_task_name,
      'resolved_source_activity_id', resolved_source_activity_id
    )
  ) AS affected_tasks_details
FROM affected_child_tasks
GROUP BY document_id, project_id, org_id, document_version, project_title
ORDER BY affected_level2_tasks_count DESC, project_title ASC;
