-- PD-M2: the "preserve existing WBS" reconstruction can only rebuild the
-- taskId->wbs_id map from rows that carry a source_task_id, which is NULL by
-- design for any WBS row created or edited outside this RPC (see the column's
-- own comment in 20260619010000_add_wbs_source_task_identity.sql). On any
-- project whose WBS was ever touched by the client-side WBS Builder, that map
-- ends up empty, so every budget_hints[].taskId lookup failed and the whole
-- materialization was blocked with the generic, misleading
-- INVALID_BUDGET_TASK_REFERENCE — even though nothing was actually wrong with
-- the document. This migration tracks that condition and preserves the budget
-- module with an honest warning instead, letting the rest of materialization
-- (MEAL, SROI) proceed.
create or replace function public.materialize_grantwriter_document(
  p_source_document_id uuid,
  p_expected_document_version integer DEFAULT NULL::integer,
  p_existing_lfa_project_id uuid DEFAULT NULL::uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_source_doc public.gw_lfa_documents%rowtype;
  v_source_project public.gw_projects%rowtype;
  v_source_matrix jsonb;
  v_skeleton jsonb;
  v_schema_version text;
  v_goal jsonb;
  v_purpose jsonb;
  v_outcomes jsonb;
  v_outputs jsonb;
  v_tasks jsonb;
  v_budget_items jsonb;
  v_meal jsonb;
  v_meal_indicators jsonb;
  v_sroi jsonb;
  v_sroi_models jsonb;
  v_goal_id text;
  v_purpose_id text;
  v_outcome_id text;
  v_output_id text;
  v_task_id text;
  v_parent_id text;
  v_source_activity_id text;
  v_budget_task_id text;
  v_meal_source_indicator_id text;
  v_sroi_source_outcome_id text;
  v_goal_indicators text := null;
  v_goal_movs text := null;
  v_goal_assumptions text := null;
  v_purpose_indicators text := null;
  v_purpose_movs text := null;
  v_purpose_assumptions text := null;
  v_outcome_indicators text := null;
  v_outcome_movs text := null;
  v_outcome_assumptions text := null;
  v_output_indicators text := null;
  v_output_movs text := null;
  v_output_assumptions text := null;
  v_goal_indicator_ids text[] := ARRAY[]::text[];
  v_purpose_indicator_ids text[] := ARRAY[]::text[];
  v_outcome_indicator_ids text[] := ARRAY[]::text[];
  v_output_indicator_ids text[] := ARRAY[]::text[];
  v_outcome_ids text[] := ARRAY[]::text[];
  v_output_ids text[] := ARRAY[]::text[];
  v_task_ids text[] := ARRAY[]::text[];
  v_existing_lfa_count integer := 0;
  v_lfa_state text := 'EMPTY';
  v_lfa_project_id uuid;
  v_lfa_project public.lfa_projects%rowtype;
  v_ledger public.lfa_materializations%rowtype;
  v_ledger_inserted boolean := false;
  v_lfa_goal_id uuid;
  v_lfa_purpose_id uuid;
  v_lfa_entries_created integer := 0;
  v_wbs_items_created integer := 0;
  v_budget_items_created integer := 0;
  v_meal_items_created integer := 0;
  v_sroi_outcomes_created integer := 0;
  v_created_modules text[] := ARRAY[]::text[];
  v_preserved_modules text[] := ARRAY[]::text[];
  v_warnings jsonb := '[]'::jsonb;
  v_output_entry_map jsonb := '{}'::jsonb;
  v_outcome_entry_map jsonb := '{}'::jsonb;
  v_task_to_wbs_id jsonb := '{}'::jsonb;
  v_task_to_wbs_name jsonb := '{}'::jsonb;
  v_dep_ids jsonb;
  v_existing_wbs_count integer := 0;
  v_existing_budget_count integer := 0;
  v_existing_meal_count integer := 0;
  v_existing_sroi_config_count integer := 0;
  v_existing_sroi_outcome_count integer := 0;
  v_invalid_count integer := 0;
  v_queue jsonb;
  v_item jsonb;
  v_dep jsonb;
  v_entry_id uuid;
  v_wbs_id uuid;
  v_wbs_name text;
  v_sort_order integer;
  v_level integer;
  v_seq integer;
  v_row record;
  v_row_text text;
  v_blocked_stage text;
  v_failure_code text;
  v_result_code text;
  v_result_status text;
  v_target_value numeric;
  v_target_unit text;
  v_collection_method text;
  v_pic text;
  v_frequency text;
  v_indicator_text text;
  v_meal_mov text;
  v_wbs_has_unmanaged_rows boolean := false;
  v_assumption text;
  v_quantity numeric;
  v_unit_price_idr numeric;
  v_duration_years integer;
  v_attribution numeric;
  v_deadweight numeric;
  v_displacement numeric;
  v_dropoff numeric;
  v_proxy_value numeric;
  v_cost_category text;
  v_category text;
  v_unit text;
  v_item_name text;
  v_justification text;
  v_activity_name text;
  v_location_text text;
  v_boolean_text text;
  v_meal_level text;
  v_meal_skipped_count integer := 0;
  v_budget_warning_added boolean := false;
  v_has_canonical_activities boolean := false;
  v_inserted_activities jsonb := '{}'::jsonb;
  v_dedup_key text;
  v_parent_source_activity_id text;
  v_act jsonb;
  v_act_id text;
  v_act_title text;
  v_act_entry_map jsonb := '{}'::jsonb;
  v_start_month integer;
  v_end_month integer;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', p_source_document_id,
      'source_document_version', null,
      'source_gw_project_id', null,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'auth',
      'failure_code', 'ACCESS_DENIED',
      'warnings', '[]'::jsonb
    );
  end if;

  select *
    into v_source_doc
    from public.gw_lfa_documents
   where id = p_source_document_id;

  if not found then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', p_source_document_id,
      'source_document_version', null,
      'source_gw_project_id', null,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'SOURCE_NOT_FOUND',
      'warnings', '[]'::jsonb
    );
  end if;

  select *
    into v_source_project
    from public.gw_projects
   where id = v_source_doc.project_id;

  if not found then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', null,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'SOURCE_PROJECT_MISMATCH',
      'warnings', '[]'::jsonb
    );
  end if;

  if v_source_doc.project_id is distinct from v_source_project.id then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'SOURCE_PROJECT_MISMATCH',
      'warnings', '[]'::jsonb
    );
  end if;

  if v_source_doc.organization_id is distinct from v_source_project.organization_id then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'SOURCE_ORGANIZATION_MISMATCH',
      'warnings', '[]'::jsonb
    );
  end if;

  if auth.role() <> 'service_role' and not public.is_org_member(v_source_project.organization_id, v_actor_id) then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'ACCESS_DENIED',
      'warnings', '[]'::jsonb
    );
  end if;

  if v_source_doc.version is distinct from p_expected_document_version then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'VERSION_MISMATCH',
      'warnings', '[]'::jsonb
    );
  end if;

  v_source_matrix := v_source_doc.matrix;
  if v_source_matrix is null or jsonb_typeof(v_source_matrix) <> 'object' then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'UNSUPPORTED_SCHEMA_VERSION',
      'warnings', '[]'::jsonb
    );
  end if;

  v_skeleton := v_source_matrix->'program_skeleton';
  if v_skeleton is null or jsonb_typeof(v_skeleton) <> 'object' then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'UNSUPPORTED_SCHEMA_VERSION',
      'warnings', '[]'::jsonb
    );
  end if;

  v_schema_version := v_skeleton->>'schemaVersion';
  if v_schema_version is distinct from '2.0' then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'UNSUPPORTED_SCHEMA_VERSION',
      'warnings', '[]'::jsonb
    );
  end if;

  v_goal := coalesce(v_skeleton->'lfa'->'goal', '{}'::jsonb);
  v_purpose := coalesce(v_skeleton->'lfa'->'purpose', '{}'::jsonb);
  v_outcomes := coalesce(v_skeleton->'lfa'->'outcomes', '[]'::jsonb);
  v_outputs := coalesce(v_skeleton->'lfa'->'outputs', '[]'::jsonb);
  v_tasks := coalesce(v_skeleton->'wbs'->'tasks', '[]'::jsonb);
  v_budget_items := coalesce(v_skeleton->'budget_hints'->'items', '[]'::jsonb);
  v_meal := coalesce(v_skeleton->'meal', '{}'::jsonb);
  v_meal_indicators := coalesce(v_meal->'indicators', '[]'::jsonb);
  v_sroi := coalesce(v_skeleton->'sroi', '{}'::jsonb);
  v_sroi_models := coalesce(v_sroi->'models', '[]'::jsonb);

  if btrim(coalesce(v_goal->>'statement', '')) = '' then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'INVALID_LFA_HIERARCHY',
      'warnings', '[]'::jsonb
    );
  end if;

  v_goal_id := nullif(btrim(coalesce(v_goal->>'id', '')), '');
  v_purpose_id := nullif(btrim(coalesce(v_purpose->>'id', '')), '');

  if v_purpose_id is null or btrim(coalesce(v_purpose->>'statement', '')) = '' then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'INVALID_LFA_HIERARCHY',
      'warnings', '[]'::jsonb
    );
  end if;

  if jsonb_array_length(v_outputs) = 0 then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'INVALID_LFA_HIERARCHY',
      'warnings', '[]'::jsonb
    );
  end if;

  v_outcome_ids := ARRAY[v_purpose_id];
  for v_row in select value from jsonb_array_elements(v_outcomes) as value loop
    v_outcome_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    if v_outcome_id is null then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_LFA_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_outcome_id <> v_purpose_id and v_outcome_id = any(v_outcome_ids) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_LFA_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_outcome_id <> v_purpose_id then
      v_outcome_ids := array_append(v_outcome_ids, v_outcome_id);
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(coalesce(v_goal->'indicators', '[]'::jsonb)) as value loop
    v_row_text := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    if v_row_text is not null then
      v_goal_indicator_ids := array_append(v_goal_indicator_ids, v_row_text);
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(coalesce(v_purpose->'indicators', '[]'::jsonb)) as value loop
    v_row_text := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    if v_row_text is not null then
      v_purpose_indicator_ids := array_append(v_purpose_indicator_ids, v_row_text);
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(v_outcomes) as value loop
    for v_item in select value from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) as value loop
      v_row_text := nullif(btrim(coalesce(v_item->>'id', '')), '');
      if v_row_text is not null then
        v_outcome_indicator_ids := array_append(v_outcome_indicator_ids, v_row_text);
      end if;
    end loop;
  end loop;

  for v_row in select value from jsonb_array_elements(v_outputs) as value loop
    for v_item in select value from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) as value loop
      v_row_text := nullif(btrim(coalesce(v_item->>'id', '')), '');
      if v_row_text is not null then
        v_output_indicator_ids := array_append(v_output_indicator_ids, v_row_text);
      end if;
    end loop;
  end loop;

  for v_row in select value from jsonb_array_elements(v_outputs) as value loop
    v_output_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    v_outcome_id := nullif(btrim(coalesce(v_row.value->>'outcomeId', '')), '');
    if v_output_id is null or v_output_id = any(v_output_ids) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_LFA_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_outcome_id is null or not (v_outcome_id = any(v_outcome_ids)) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_LFA_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_output_ids := array_append(v_output_ids, v_output_id);
  end loop;

  v_task_ids := ARRAY[]::text[];
  if jsonb_array_length(v_tasks) = 0 then
    return jsonb_build_object(
      'code', 'FAILED_VALIDATION',
      'status', 'failed',
      'materialization_id', null,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', null,
      'lfa_state', null,
      'lfa_entries_created', 0,
      'wbs_items_created', 0,
      'budget_items_created', 0,
      'meal_items_created', 0,
      'sroi_outcomes_created', 0,
      'created_modules', '[]'::jsonb,
      'preserved_modules', '[]'::jsonb,
      'blocked_stage', 'source_validation',
      'failure_code', 'INVALID_WBS_HIERARCHY',
      'warnings', '[]'::jsonb
    );
  end if;

  for v_row in select value from jsonb_array_elements(v_tasks) as value loop
    v_task_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    v_row_text := nullif(btrim(coalesce(v_row.value->>'level', '')), '');
    if v_row_text is null or v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;
    v_level := v_row_text::integer;
    if v_task_id is null or v_task_id = any(v_task_ids) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_level not in (1, 2) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_task_ids := array_append(v_task_ids, v_task_id);
  end loop;

  for v_row in select value from jsonb_array_elements(v_tasks) as value loop
    v_task_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
    v_row_text := nullif(btrim(coalesce(v_row.value->>'level', '')), '');
    if v_row_text is null or v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;
    v_level := v_row_text::integer;
    v_parent_id := nullif(btrim(coalesce(v_row.value->>'parentId', '')), '');
    v_source_activity_id := nullif(btrim(coalesce(v_row.value->>'sourceActivityId', '')), '');

    if v_level = 1 then
      if v_parent_id is not null then
        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', null,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', null,
          'lfa_state', null,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', 'source_validation',
          'failure_code', 'INVALID_WBS_HIERARCHY',
          'warnings', '[]'::jsonb
        );
      end if;
    else
      if v_parent_id is null or not (v_parent_id = any(v_task_ids)) then
        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', null,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', null,
          'lfa_state', null,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', 'source_validation',
          'failure_code', 'INVALID_WBS_HIERARCHY',
          'warnings', '[]'::jsonb
        );
      end if;

      if v_source_activity_id is null then
        -- Resolve from parent Level 1 task if possible
        if v_parent_id is not null then
          select value->>'sourceActivityId'
            into v_parent_source_activity_id
            from jsonb_array_elements(v_tasks) as task
           where task->>'id' = v_parent_id;
          v_source_activity_id := v_parent_source_activity_id;
        end if;
      end if;

      if v_source_activity_id is null or not (v_source_activity_id = any(v_output_ids)) then
        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', null,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', null,
          'lfa_state', null,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', 'source_validation',
          'failure_code', 'INVALID_WBS_ACTIVITY_REFERENCE',
          'warnings', '[]'::jsonb
        );
      end if;
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'sequenceOrder', '')), '');
    if v_row_text is not null and v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'startMonth', '')), '');
    if v_row_text is not null and v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'endMonth', '')), '');
    if v_row_text is not null and v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'durationWeeks', '')), '');
    if v_row_text is not null and v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_WBS_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(v_budget_items) as value loop
    v_budget_task_id := nullif(btrim(coalesce(v_row.value->>'taskId', '')), '');
    if v_budget_task_id is null or not (v_budget_task_id = any(v_task_ids)) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_BUDGET_TASK_REFERENCE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'quantity', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_BUDGET_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_row.value ? 'requiresUserConfirmation' and jsonb_typeof(v_row.value->'requiresUserConfirmation') <> 'null' then
      v_boolean_text := lower(btrim(coalesce(v_row.value->>'requiresUserConfirmation', '')));
      if v_boolean_text not in ('true', 'false') then
        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', null,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', null,
          'lfa_state', null,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', 'source_validation',
          'failure_code', 'INVALID_BUDGET_VALUE',
          'warnings', '[]'::jsonb
        );
      end if;
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(v_meal_indicators) as value loop
    v_row_text := nullif(btrim(coalesce(v_row.value->>'targetValue', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_MEAL_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'baselineValue', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_MEAL_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(v_sroi_models) as value loop
    v_sroi_source_outcome_id := nullif(btrim(coalesce(v_row.value->>'sourceOutcomeId', '')), '');
    if v_sroi_source_outcome_id is null or not (v_sroi_source_outcome_id = any(v_outcome_ids)) then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_LFA_HIERARCHY',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'quantityHint', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'suggestedProxyValueIdr', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'durationYears', '')), '');
    if v_row_text is not null and v_row_text !~ '^[0-9]+$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'attributionPctDraft', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'deadweightPctDraft', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'displacementPctDraft', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;

    v_row_text := nullif(btrim(coalesce(v_row.value->>'dropoffPctDraft', '')), '');
    if v_row_text is not null and v_row_text !~ '^-?[0-9]+(?:\.[0-9]+)?$' then
      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'source_validation',
        'failure_code', 'INVALID_SROI_VALUE',
        'warnings', '[]'::jsonb
      );
    end if;
  end loop;

  insert into public.lfa_materializations (
    organization_id,
    lfa_project_id,
    source_gw_project_id,
    source_gw_document_id,
    source_gw_document_version,
    status,
    started_at,
    created_by
  ) values (
    v_source_project.organization_id,
    null,
    v_source_project.id,
    v_source_doc.id,
    v_source_doc.version,
    'pending',
    null,
    v_actor_id
  )
  on conflict (organization_id, source_gw_document_id) do nothing
  returning * into v_ledger;

  v_ledger_inserted := found;
  if not v_ledger_inserted then
    select *
      into v_ledger
      from public.lfa_materializations
     where organization_id = v_source_project.organization_id
       and source_gw_document_id = v_source_doc.id
     for update;

    if not found then
      return jsonb_build_object(
        'code', 'FAILED_DATABASE',
        'status', 'failed',
        'materialization_id', null,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', null,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'ledger_claim',
        'failure_code', 'INTERNAL_DATABASE_FAILURE',
        'warnings', '[]'::jsonb
      );
    end if;

    if v_ledger.status = 'succeeded' then
      return jsonb_build_object(
        'code', 'ALREADY_MATERIALIZED',
        'status', 'success',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_ledger.lfa_project_id,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', null,
        'failure_code', null,
        'warnings', '[]'::jsonb
      );
    elsif v_ledger.status = 'running' then
      return jsonb_build_object(
        'code', 'MATERIALIZATION_IN_PROGRESS',
        'status', 'running',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_ledger.lfa_project_id,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'ledger_claim',
        'failure_code', null,
        'warnings', '[]'::jsonb
      );
    elsif false and v_ledger.status = 'failed' then
      return jsonb_build_object(
        'code', 'PREVIOUS_ATTEMPT_FAILED',
        'status', 'failed',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_ledger.lfa_project_id,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', v_ledger.failure_stage,
        'failure_code', coalesce(v_ledger.failure_code, 'DATABASE_WRITE_FAILURE'),
        'warnings', '[]'::jsonb
      );
    elsif false and v_ledger.status = 'blocked' then
      return jsonb_build_object(
        'code', 'PREVIOUS_ATTEMPT_BLOCKED',
        'status', 'blocked',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_ledger.lfa_project_id,
        'lfa_state', null,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', v_ledger.failure_stage,
        'failure_code', coalesce(v_ledger.failure_code, 'PARTIAL_LFA_STATE'),
        'warnings', '[]'::jsonb
      );
    end if;

    update public.lfa_materializations
       set status = 'running',
           started_at = coalesce(started_at, now()),
           updated_at = now()
     where id = v_ledger.id
     returning * into v_ledger;
  else
    update public.lfa_materializations
       set status = 'running',
           started_at = coalesce(started_at, now()),
           updated_at = now()
     where id = v_ledger.id
     returning * into v_ledger;
  end if;

  begin
    if p_existing_lfa_project_id is not null then
      select *
        into v_lfa_project
        from public.lfa_projects
       where id = p_existing_lfa_project_id;

      if not found or v_lfa_project.org_id is distinct from v_source_project.organization_id or v_lfa_project.linked_grant_id is distinct from v_source_project.id then
        update public.lfa_materializations
           set status = 'failed',
               failure_stage = 'target_project_validation',
               failure_code = 'SOURCE_PROJECT_MISMATCH',
               completed_at = now(),
               updated_at = now()
         where id = v_ledger.id;

        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', v_ledger.id,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', null,
          'lfa_state', null,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', 'target_project_validation',
          'failure_code', 'SOURCE_PROJECT_MISMATCH',
          'warnings', v_warnings
        );
      end if;
    else
      select *
        into v_lfa_project
        from public.lfa_projects
       where org_id = v_source_project.organization_id
         and linked_grant_id = v_source_project.id
       limit 1;
    end if;

    if not found then
      v_location_text := nullif(btrim(concat_ws(', ',
        nullif(btrim(coalesce(to_jsonb(v_source_project.geography)->>'district', '')), ''),
        nullif(btrim(coalesce(to_jsonb(v_source_project.geography)->>'province', '')), ''),
        nullif(btrim(coalesce(to_jsonb(v_source_project.geography)->>'location', '')), '')
      )), '');

      if v_location_text is null then
        v_location_text := nullif(btrim(to_jsonb(v_source_project.geography)#>>'{}'), '');
      end if;

      insert into public.lfa_projects (
        org_id,
        name,
        sector,
        location,
        duration_months,
        linked_grant_id,
        status
      ) values (
        v_source_project.organization_id,
        v_source_project.title,
        v_source_project.sector,
        v_location_text,
        v_source_project.duration_months,
        v_source_project.id,
        'draft'
      )
      returning * into v_lfa_project;
    end if;

    v_lfa_project_id := v_lfa_project.id;

    select count(*) into v_existing_lfa_count
      from public.lfa_entries
     where project_id = v_lfa_project_id;

    if v_existing_lfa_count = 0 then
      v_lfa_state := 'EMPTY';
    else
      select count(*) into v_invalid_count
        from public.lfa_entries
       where project_id = v_lfa_project_id
         and level not in ('goal', 'purpose', 'output', 'activity');

      if v_invalid_count > 0 then
        v_lfa_state := 'PARTIAL_UNSAFE';
      else
        select count(*) into v_invalid_count
          from public.lfa_entries child
          left join public.lfa_entries parent
            on parent.id = child.parent_id
           and parent.project_id = child.project_id
         where child.project_id = v_lfa_project_id
           and child.level = 'output'
           and (child.parent_id is null or parent.id is null or parent.level <> 'purpose');

        if v_invalid_count > 0 then
          v_lfa_state := 'PARTIAL_UNSAFE';
        else
          select count(*) into v_invalid_count
            from public.lfa_entries child
            left join public.lfa_entries parent
              on parent.id = child.parent_id
             and parent.project_id = child.project_id
           where child.project_id = v_lfa_project_id
             and child.level = 'activity'
             and (child.parent_id is null or parent.id is null or parent.level <> 'output');

          if v_invalid_count > 0 then
            v_lfa_state := 'PARTIAL_UNSAFE';
          else
            select count(*) into v_invalid_count
              from public.lfa_entries
             where project_id = v_lfa_project_id
               and level = 'goal';

            if v_invalid_count = 0 then
              v_lfa_state := 'PARTIAL_UNSAFE';
            else
              select count(*) into v_invalid_count
                from public.lfa_entries
               where project_id = v_lfa_project_id
                 and level = 'purpose';

              if v_invalid_count = 0 then
                v_lfa_state := 'PARTIAL_UNSAFE';
              else
                select count(*) into v_invalid_count
                  from public.lfa_entries
                 where project_id = v_lfa_project_id
                   and level = 'output';

                if v_invalid_count = 0 then
                  v_lfa_state := 'PARTIAL_UNSAFE';
                else
                  v_lfa_state := 'COMPLETE_OR_EXISTING';
                end if;
              end if;
            end if;
          end if;
        end if;
      end if;
    end if;

    if v_lfa_state = 'PARTIAL_UNSAFE' then
      update public.lfa_materializations
         set status = 'blocked',
             failure_stage = 'lfa_state_check',
             failure_code = 'PARTIAL_LFA_STATE',
             completed_at = now(),
             updated_at = now()
       where id = v_ledger.id;

      return jsonb_build_object(
        'code', 'BLOCKED_PARTIAL',
        'status', 'blocked',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_lfa_project_id,
        'lfa_state', v_lfa_state,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'lfa_state_check',
        'failure_code', 'PARTIAL_LFA_STATE',
        'warnings', v_warnings
      );
    end if;

    select count(*) into v_existing_wbs_count
      from public.lfa_wbs_items
     where lfa_project_id = v_lfa_project_id;

    if v_lfa_state = 'EMPTY' then
      v_goal_indicators := nullif((
        select string_agg(nullif(btrim(coalesce(indicator->>'statement', indicator #>> '{}')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_goal->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
      ), '');
      v_goal_movs := nullif((
        select string_agg(nullif(btrim(coalesce(indicator->>'mov', indicator->>'meansOfVerification', indicator #>> '{}')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_goal->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
      ), '');
      v_goal_assumptions := nullif((
        select string_agg(nullif(btrim(coalesce(item #>> '{}', item->>'statement')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_goal->'assumptions', '[]'::jsonb)) with ordinality as assumption_rows(item, ordinality)
      ), '');

      insert into public.lfa_entries (
        org_id,
        project_id,
        level,
        sequence,
        description,
        indicator,
        means_of_verification,
        assumption,
        responsible_party
      ) values (
        v_source_project.organization_id,
        v_lfa_project_id,
        'goal',
        1,
        v_goal->>'statement',
        v_goal_indicators,
        v_goal_movs,
        v_goal_assumptions,
        null
      )
      returning id into v_lfa_goal_id;

      v_created_modules := array_append(v_created_modules, 'lfa');
      v_lfa_entries_created := v_lfa_entries_created + 1;

      v_purpose_indicators := nullif((
        select string_agg(nullif(btrim(coalesce(indicator->>'statement', indicator #>> '{}')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_purpose->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
      ), '');
      v_purpose_movs := nullif((
        select string_agg(nullif(btrim(coalesce(indicator->>'mov', indicator->>'meansOfVerification', indicator #>> '{}')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_purpose->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
      ), '');
      v_purpose_assumptions := nullif((
        select string_agg(nullif(btrim(coalesce(item #>> '{}', item->>'statement')), ''), E'\n' order by ordinality)
          from jsonb_array_elements(coalesce(v_purpose->'assumptions', '[]'::jsonb)) with ordinality as assumption_rows(item, ordinality)
      ), '');

      insert into public.lfa_entries (
        org_id,
        project_id,
        level,
        sequence,
        description,
        indicator,
        means_of_verification,
        assumption,
        responsible_party
      ) values (
        v_source_project.organization_id,
        v_lfa_project_id,
        'purpose',
        1,
        v_purpose->>'statement',
        v_purpose_indicators,
        v_purpose_movs,
        v_purpose_assumptions,
        null
      )
      returning id into v_lfa_purpose_id;

      v_outcome_entry_map := v_outcome_entry_map || jsonb_build_object(v_purpose_id, v_lfa_purpose_id::text);
      v_lfa_entries_created := v_lfa_entries_created + 1;

      for v_row in select value from jsonb_array_elements(v_outcomes) as value loop
        v_outcome_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
        if v_outcome_id = v_purpose_id then
          continue;
        end if;

        v_outcome_indicators := nullif((
          select string_agg(nullif(btrim(coalesce(indicator->>'statement', indicator #>> '{}')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
        ), '');
        v_outcome_movs := nullif((
          select string_agg(nullif(btrim(coalesce(indicator->>'mov', indicator->>'meansOfVerification', indicator #>> '{}')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
        ), '');
        v_outcome_assumptions := nullif((
          select string_agg(nullif(btrim(coalesce(item #>> '{}', item->>'statement')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'assumptions', '[]'::jsonb)) with ordinality as assumption_rows(item, ordinality)
        ), '');

        insert into public.lfa_entries (
          org_id,
          project_id,
          level,
          sequence,
          description,
          indicator,
          means_of_verification,
          assumption,
          responsible_party
        ) values (
          v_source_project.organization_id,
          v_lfa_project_id,
          'purpose',
          v_lfa_entries_created + 1,
          v_row.value->>'statement',
          v_outcome_indicators,
          v_outcome_movs,
          v_outcome_assumptions,
          null
        )
        returning id into v_entry_id;

        v_outcome_entry_map := v_outcome_entry_map || jsonb_build_object(v_outcome_id, v_entry_id::text);
        v_lfa_entries_created := v_lfa_entries_created + 1;
      end loop;

      for v_row in select value from jsonb_array_elements(v_outputs) as value loop
        v_output_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
        v_outcome_id := nullif(btrim(coalesce(v_row.value->>'outcomeId', '')), '');
        v_output_indicators := nullif((
          select string_agg(nullif(btrim(coalesce(indicator->>'statement', indicator #>> '{}')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
        ), '');
        v_output_movs := nullif((
          select string_agg(nullif(btrim(coalesce(indicator->>'mov', indicator->>'meansOfVerification', indicator #>> '{}')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'indicators', '[]'::jsonb)) with ordinality as indicator_rows(indicator, ordinality)
        ), '');
        v_output_assumptions := nullif((
          select string_agg(nullif(btrim(coalesce(item #>> '{}', item->>'statement')), ''), E'\n' order by ordinality)
            from jsonb_array_elements(coalesce(v_row.value->'assumptions', '[]'::jsonb)) with ordinality as assumption_rows(item, ordinality)
        ), '');

        insert into public.lfa_entries (
          org_id,
          project_id,
          level,
          sequence,
          parent_id,
          description,
          indicator,
          means_of_verification,
          assumption,
          responsible_party
        ) values (
          v_source_project.organization_id,
          v_lfa_project_id,
          'output',
          v_lfa_entries_created + 1,
          (v_outcome_entry_map ->> v_outcome_id)::uuid,
          v_row.value->>'statement',
          v_output_indicators,
          v_output_movs,
          v_output_assumptions,
          null
        )
        returning id into v_entry_id;

        v_output_entry_map := v_output_entry_map || jsonb_build_object(v_output_id, v_entry_id::text);
        v_lfa_entries_created := v_lfa_entries_created + 1;
      end loop;

      -- Precedence check: detect if any Output contains a canonical activities array of length > 0
      v_has_canonical_activities := false;
      for v_row in select value from jsonb_array_elements(v_outputs) as value loop
        if v_row.value ? 'activities' and jsonb_typeof(v_row.value->'activities') = 'array' and jsonb_array_length(v_row.value->'activities') > 0 then
          v_has_canonical_activities := true;
        end if;
      end loop;

      if v_has_canonical_activities then
        -- Path A: Canonical activities available
        for v_row in select value from jsonb_array_elements(v_outputs) as value loop
          v_output_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
          v_entry_id := (v_output_entry_map ->> v_output_id)::uuid;
          if v_entry_id is not null and v_row.value ? 'activities' and jsonb_typeof(v_row.value->'activities') = 'array' then
            for v_act in select value from jsonb_array_elements(v_row.value->'activities') as value loop
              v_act_id := nullif(btrim(coalesce(v_act->>'id', '')), '');
              v_act_title := coalesce(nullif(btrim(coalesce(v_act->>'title', v_act->>'statement', v_act->>'name', '')), ''), 'Aktivitas');
              v_indicator_text := coalesce(nullif(btrim(coalesce(v_act->>'indicator', v_act->>'deliverable', '')), ''), null);
              v_start_month := coalesce(nullif(btrim(coalesce(v_act->>'timelineStart', v_act->>'startMonth', '')), '')::integer, 1);
              v_end_month := nullif(btrim(coalesce(v_act->>'timelineEnd', v_act->>'endMonth', '')), '')::integer;

              v_dedup_key := v_entry_id::text || '_' || lower(btrim(v_act_title));
              if not (v_inserted_activities ? v_dedup_key) then
                insert into public.lfa_entries (
                  org_id,
                  project_id,
                  level,
                  sequence,
                  parent_id,
                  description,
                  indicator,
                  means_of_verification,
                  assumption,
                  responsible_party,
                  timeline_start,
                  timeline_end
                ) values (
                  v_source_project.organization_id,
                  v_lfa_project_id,
                  'activity',
                  v_lfa_entries_created + 1,
                  v_entry_id,
                  v_act_title,
                  v_indicator_text,
                  null,
                  null,
                  null,
                  v_start_month,
                  v_end_month
                ) returning id into v_wbs_id;

                v_inserted_activities := v_inserted_activities || jsonb_build_object(v_dedup_key, true);
                if v_act_id is not null then
                  v_act_entry_map := v_act_entry_map || jsonb_build_object(v_act_id, v_wbs_id::text);
                end if;
                v_lfa_entries_created := v_lfa_entries_created + 1;
              end if;
            end loop;
          end if;
        end loop;
      else
        -- Path B: Legacy document compatibility
        for v_row in select value from jsonb_array_elements(v_tasks) as value loop
          v_task_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
          v_level := coalesce((v_row.value->>'level')::integer, 0);
          v_source_activity_id := nullif(btrim(coalesce(v_row.value->>'sourceActivityId', '')), '');
          v_parent_id := nullif(btrim(coalesce(v_row.value->>'parentId', '')), '');

          if v_level = 2 then
            -- Resolve sourceActivityId from parent if not direct
            if v_source_activity_id is null and v_parent_id is not null then
              select value->>'sourceActivityId'
                into v_parent_source_activity_id
                from jsonb_array_elements(v_tasks) as task
               where task->>'id' = v_parent_id;
              v_source_activity_id := v_parent_source_activity_id;
            end if;

            if v_source_activity_id is not null then
              v_entry_id := (v_output_entry_map ->> v_source_activity_id)::uuid;
              if v_entry_id is not null then
                v_act_title := coalesce(nullif(btrim(coalesce(v_row.value->>'title', '')), ''), 'Aktivitas');
                v_indicator_text := coalesce(nullif(btrim(coalesce(v_row.value->>'deliverable', '')), ''), null);
                v_start_month := coalesce(nullif(btrim(coalesce(v_row.value->>'startMonth', '')), '')::integer, 1);
                v_end_month := nullif(btrim(coalesce(v_row.value->>'endMonth', '')), '')::integer;

                v_dedup_key := v_entry_id::text || '_' || lower(btrim(v_act_title));
                if not (v_inserted_activities ? v_dedup_key) then
                  insert into public.lfa_entries (
                    org_id,
                    project_id,
                    level,
                    sequence,
                    parent_id,
                    description,
                    indicator,
                    means_of_verification,
                    assumption,
                    responsible_party,
                    timeline_start,
                    timeline_end
                  ) values (
                    v_source_project.organization_id,
                    v_lfa_project_id,
                    'activity',
                    v_lfa_entries_created + 1,
                    v_entry_id,
                    v_act_title,
                    v_indicator_text,
                    null,
                    null,
                    null,
                    v_start_month,
                    v_end_month
                  ) returning id into v_wbs_id;

                  v_inserted_activities := v_inserted_activities || jsonb_build_object(v_dedup_key, true);
                  if v_task_id is not null then
                    v_act_entry_map := v_act_entry_map || jsonb_build_object(v_task_id, v_wbs_id::text);
                  end if;
                  v_lfa_entries_created := v_lfa_entries_created + 1;
                end if;
              end if;
            end if;
          end if;
        end loop;
      end if;
    end if;

    select count(*) into v_existing_wbs_count
      from public.lfa_wbs_items
     where lfa_project_id = v_lfa_project_id;

    if v_existing_wbs_count = 0 then
      for v_row in select value from jsonb_array_elements(v_tasks) as value loop
        v_task_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
        v_level := (v_row.value->>'level')::integer;
        v_parent_id := nullif(btrim(coalesce(v_row.value->>'parentId', '')), '');
        v_source_activity_id := nullif(btrim(coalesce(v_row.value->>'sourceActivityId', '')), '');
        v_wbs_name := coalesce(nullif(btrim(coalesce(v_row.value->>'title', '')), ''), 'Aktivitas');

        v_wbs_id := gen_random_uuid();
        v_task_to_wbs_id := v_task_to_wbs_id || jsonb_build_object(v_task_id, v_wbs_id::text);
        v_task_to_wbs_name := v_task_to_wbs_name || jsonb_build_object(v_task_id, v_wbs_name);
      end loop;

      for v_row in select value from jsonb_array_elements(v_tasks) as value loop
        v_task_id := nullif(btrim(coalesce(v_row.value->>'id', '')), '');
        v_level := (v_row.value->>'level')::integer;
        v_parent_id := nullif(btrim(coalesce(v_row.value->>'parentId', '')), '');
        v_sort_order := coalesce(nullif(btrim(coalesce(v_row.value->>'sequenceOrder', '')), '')::integer, 0);
        if v_sort_order = 0 then
          v_sort_order := v_wbs_items_created + 1;
        end if;
        v_wbs_id := (v_task_to_wbs_id ->> v_task_id)::uuid;
        v_wbs_name := coalesce(nullif(btrim(coalesce(v_row.value->>'title', '')), ''), 'Aktivitas');
        v_dep_ids := '[]'::jsonb;
        for v_dep in select value from jsonb_array_elements(coalesce(v_row.value->'dependencies', '[]'::jsonb)) as value loop
          v_row_text := nullif(btrim(coalesce(v_dep #>> '{}', v_dep->>'id', '')), '');
          if v_row_text is not null and (v_task_to_wbs_id ? v_row_text) then
            v_dep_ids := v_dep_ids || jsonb_build_array(v_task_to_wbs_id ->> v_row_text);
          end if;
        end loop;

        insert into public.lfa_wbs_items (
          id,
          lfa_project_id,
          org_id,
          source_task_id,
          level,
          parent_id,
          name,
          start_month,
          duration_weeks,
          pic,
          indicator,
          notes,
          dependencies,
          sort_order,
          mode
        ) values (
          v_wbs_id,
          v_lfa_project_id,
          v_source_project.organization_id,
          v_task_id,
          v_level,
          case when v_level = 2 then (v_task_to_wbs_id ->> v_parent_id)::uuid else null end,
          v_wbs_name,
          coalesce(nullif(btrim(coalesce(v_row.value->>'startMonth', '')), '')::integer, 1),
          coalesce(nullif(btrim(coalesce(v_row.value->>'durationWeeks', '')), '')::integer, 4),
          nullif(btrim(coalesce(v_row.value->>'responsibleRole', '')), ''),
          null,
          nullif(btrim(coalesce(v_row.value->>'description', '')), ''),
          coalesce(array(select jsonb_array_elements_text(v_dep_ids)), '{}'::text[]),
          v_sort_order,
          'simple'
        );

        v_wbs_items_created := v_wbs_items_created + 1;
      end loop;

      v_created_modules := array_append(v_created_modules, 'wbs');
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'WBS_IGNORED_FIELDS',
        'message', 'confidence, isCriticalCandidate, milestone, and endMonth are not persisted in lfa_wbs_items.',
        'fields', jsonb_build_array('confidence', 'isCriticalCandidate', 'milestone', 'endMonth')
      ));
    else
      select count(*) into v_invalid_count
        from public.lfa_wbs_items
       where lfa_project_id = v_lfa_project_id
         and level not in (1, 2);

      if v_invalid_count > 0 then
        v_blocked_stage := 'wbs_state_check';
        v_failure_code := 'INVALID_WBS_HIERARCHY';
      end if;

      if v_blocked_stage is null then
        select count(*) into v_invalid_count
          from (
            select source_task_id
              from public.lfa_wbs_items
             where lfa_project_id = v_lfa_project_id
               and source_task_id is not null
             group by source_task_id
            having count(*) > 1
          ) duplicate_source_tasks;

        if v_invalid_count > 0 then
          v_blocked_stage := 'wbs_state_check';
          v_failure_code := 'INVALID_WBS_HIERARCHY';
        end if;
      end if;

      if v_blocked_stage is null then
        select count(*) into v_invalid_count
          from public.lfa_wbs_items child
          left join public.lfa_wbs_items parent
            on parent.id = child.parent_id
           and parent.lfa_project_id = child.lfa_project_id
         where child.lfa_project_id = v_lfa_project_id
           and child.level = 1
           and child.parent_id is not null;

        if v_invalid_count > 0 then
          v_blocked_stage := 'wbs_state_check';
          v_failure_code := 'INVALID_WBS_HIERARCHY';
        end if;
      end if;

      if v_blocked_stage is null then
        select count(*) into v_invalid_count
          from public.lfa_wbs_items child
          left join public.lfa_wbs_items parent
            on parent.id = child.parent_id
           and parent.lfa_project_id = child.lfa_project_id
         where child.lfa_project_id = v_lfa_project_id
           and child.level = 2
           and (child.parent_id is null or parent.id is null or parent.level <> 1);

        if v_invalid_count > 0 then
          v_blocked_stage := 'wbs_state_check';
          v_failure_code := 'INVALID_WBS_HIERARCHY';
        end if;
      end if;

      if v_blocked_stage is null then
        select count(*) into v_invalid_count
          from public.lfa_wbs_items item
          join lateral unnest(coalesce(item.dependencies, '{}'::text[])) as dep_ids(dep_id) on true
          left join public.lfa_wbs_items dep
            on dep.id = case
                         when btrim(dep_ids.dep_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                         then btrim(dep_ids.dep_id)::uuid
                         else null
                       end
           and dep.lfa_project_id = item.lfa_project_id
         where item.lfa_project_id = v_lfa_project_id
           and dep.id is null;

        if v_invalid_count > 0 then
          v_blocked_stage := 'wbs_state_check';
          v_failure_code := 'INVALID_WBS_HIERARCHY';
        end if;
      end if;

      if v_blocked_stage is null then
        -- PD-M2: rows with source_task_id IS NULL are WBS tasks that were created
        -- or edited outside GrantWriter materialization (e.g. the WBS Builder UI),
        -- per the column's own documented contract. They can never be matched
        -- against a newly generated document's budget_hints[].taskId, so their
        -- presence is tracked (not treated as an error here) and used below to
        -- give the budget step an honest reason to preserve instead of a
        -- misleading INVALID_BUDGET_TASK_REFERENCE failure.
        for v_row in select id, source_task_id, name from public.lfa_wbs_items where lfa_project_id = v_lfa_project_id loop
          if v_row.source_task_id is not null then
            if v_task_to_wbs_id ? v_row.source_task_id then
              v_blocked_stage := 'wbs_state_check';
              v_failure_code := 'INVALID_WBS_HIERARCHY';
              exit;
            end if;
            v_task_to_wbs_id := v_task_to_wbs_id || jsonb_build_object(v_row.source_task_id, v_row.id::text);
            v_task_to_wbs_name := v_task_to_wbs_name || jsonb_build_object(v_row.source_task_id, v_row.name);
          else
            v_wbs_has_unmanaged_rows := true;
          end if;
        end loop;
      end if;

      if v_blocked_stage is not null then
        update public.lfa_materializations
           set status = 'failed',
               failure_stage = v_blocked_stage,
               failure_code = v_failure_code,
               completed_at = now(),
               updated_at = now()
         where id = v_ledger.id;

        return jsonb_build_object(
          'code', 'FAILED_VALIDATION',
          'status', 'failed',
          'materialization_id', v_ledger.id,
          'source_document_id', v_source_doc.id,
          'source_document_version', v_source_doc.version,
          'source_gw_project_id', v_source_project.id,
          'lfa_project_id', v_lfa_project_id,
          'lfa_state', v_lfa_state,
          'lfa_entries_created', 0,
          'wbs_items_created', 0,
          'budget_items_created', 0,
          'meal_items_created', 0,
          'sroi_outcomes_created', 0,
          'created_modules', '[]'::jsonb,
          'preserved_modules', '[]'::jsonb,
          'blocked_stage', v_blocked_stage,
          'failure_code', v_failure_code,
          'warnings', v_warnings
        );
      end if;

      v_preserved_modules := array_append(v_preserved_modules, 'wbs');
    end if;

    select count(*) into v_existing_budget_count
      from public.lfa_budget_items
     where lfa_project_id = v_lfa_project_id;

    select count(*) into v_invalid_count
      from public.lfa_budget_items bi
      left join public.lfa_wbs_items wi
        on wi.id = bi.wbs_item_id
       and wi.lfa_project_id = bi.lfa_project_id
     where bi.lfa_project_id = v_lfa_project_id
       and bi.wbs_item_id is not null
       and wi.id is null;

    if v_invalid_count > 0 then
      v_blocked_stage := 'budget_state_check';
      v_failure_code := 'INVALID_BUDGET_TASK_REFERENCE';
      update public.lfa_materializations
         set status = 'failed',
             failure_stage = v_blocked_stage,
             failure_code = v_failure_code,
             completed_at = now(),
             updated_at = now()
       where id = v_ledger.id;

      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_lfa_project_id,
        'lfa_state', v_lfa_state,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', v_blocked_stage,
        'failure_code', v_failure_code,
        'warnings', v_warnings
      );
    end if;

    if v_existing_budget_count = 0 and v_wbs_has_unmanaged_rows then
      -- PD-M2: this project's WBS has at least one task with no source_task_id,
      -- so budget_hints[].taskId can never be matched against it (see the
      -- reconstruction loop above) -- not because the references are wrong, but
      -- because there is nothing RPC-generated to match them against. Preserve
      -- budget untouched and say so plainly, instead of hard-failing the whole
      -- materialization with the generic, misleading INVALID_BUDGET_TASK_REFERENCE.
      v_preserved_modules := array_append(v_preserved_modules, 'budget');
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'BUDGET_SKIPPED_WBS_NOT_MATERIALIZATION_MANAGED',
        'message', 'This project''s WBS contains tasks created or edited outside GrantWriter materialization, so new budget_hints could not be automatically reconciled against it. Budget was left untouched rather than blocking the rest of materialization.'
      ));
    elsif v_existing_budget_count = 0 then
      for v_row in select value from jsonb_array_elements(v_budget_items) as value loop
        v_budget_task_id := nullif(btrim(coalesce(v_row.value->>'taskId', '')), '');
        if v_budget_task_id is null or not (v_task_to_wbs_id ? v_budget_task_id) then
          update public.lfa_materializations
             set status = 'failed',
                 failure_stage = 'budget_state_check',
                 failure_code = 'INVALID_BUDGET_TASK_REFERENCE',
                 completed_at = now(),
                 updated_at = now()
           where id = v_ledger.id;

          return jsonb_build_object(
            'code', 'FAILED_VALIDATION',
            'status', 'failed',
            'materialization_id', v_ledger.id,
            'source_document_id', v_source_doc.id,
            'source_document_version', v_source_doc.version,
            'source_gw_project_id', v_source_project.id,
            'lfa_project_id', v_lfa_project_id,
            'lfa_state', v_lfa_state,
            'lfa_entries_created', 0,
            'wbs_items_created', 0,
            'budget_items_created', 0,
            'meal_items_created', 0,
            'sroi_outcomes_created', 0,
            'created_modules', '[]'::jsonb,
            'preserved_modules', '[]'::jsonb,
            'blocked_stage', 'budget_state_check',
            'failure_code', 'INVALID_BUDGET_TASK_REFERENCE',
            'warnings', v_warnings
          );
        end if;
        v_item_name := coalesce(nullif(btrim(coalesce(v_row.value->>'itemName', v_row.value->>'itemType', v_row.value->>'description', '')), ''), 'Item Anggaran');
        v_category := nullif(btrim(coalesce(v_row.value->>'category', '')), '');
        v_unit := nullif(btrim(coalesce(v_row.value->>'unit', '')), '');
        v_quantity := coalesce(nullif(btrim(coalesce(v_row.value->>'quantity', '')), '')::numeric, 1);
        v_cost_category := nullif(btrim(coalesce(v_row.value->>'itemType', '')), '');
        v_justification := nullif(btrim(coalesce(v_row.value->>'justification', '')), '');
        v_activity_name := coalesce(v_task_to_wbs_name ->> v_budget_task_id, v_item_name);

        -- Map real generated budget values from GrantWriter cost fields (NO HARDCODED ALLOCATION)
        v_unit_price_idr := coalesce(
          nullif(btrim(coalesce(v_row.value->>'estimated_unit_cost_idr', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'estimatedUnitCost', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unit_price_idr', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unitPriceIdr', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unit_price', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unitPrice', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unit_cost_idr', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unitCostIdr', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unit_cost', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'unitCost', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'price', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'reference_price', '')), '')::numeric,
          nullif(btrim(coalesce(v_row.value->>'referencePrice', '')), '')::numeric,
          0
        );

        if v_unit_price_idr = 0 and v_quantity > 0 then
          v_unit_price_idr := coalesce(
            (nullif(btrim(coalesce(v_row.value->>'totalCost', v_row.value->>'total_cost', v_row.value->>'total_cost_idr', '')), '')::numeric) / v_quantity,
            0
          );
        end if;

        insert into public.lfa_budget_items (
          lfa_project_id,
          org_id,
          wbs_item_id,
          activity_name,
          category,
          cost_category,
          item_name,
          volume,
          unit,
          unit_price_idr,
          justification,
          needs_donor_approval,
          sort_order,
          mode
        ) values (
          v_lfa_project_id,
          v_source_project.organization_id,
          (v_task_to_wbs_id ->> v_budget_task_id)::uuid,
          v_activity_name,
          v_category,
          v_cost_category,
          v_item_name,
          v_quantity,
          v_unit,
          v_unit_price_idr,
          v_justification,
          coalesce((v_row.value->>'requiresUserConfirmation')::boolean, false),
          v_budget_items_created + 1,
          'simple'
        );

        v_budget_items_created := v_budget_items_created + 1;
      end loop;

      v_created_modules := array_append(v_created_modules, 'budget');
      if not v_budget_warning_added then
        v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
          'code', 'BUDGET_PRICING_REVIEW_REQUIRED',
          'message', 'unit_price_idr is seeded at 0 so pricing remains an editable human review task, not a financial claim.'
        ));
        v_budget_warning_added := true;
      end if;
    else
      v_preserved_modules := array_append(v_preserved_modules, 'budget');
    end if;

    select count(*) into v_existing_meal_count
      from public.lfa_meal_items
     where lfa_project_id = v_lfa_project_id;

    if v_existing_meal_count = 0 then
      for v_row in select value from jsonb_array_elements(v_meal_indicators) as value loop
        v_meal_source_indicator_id := nullif(btrim(coalesce(v_row.value->>'sourceLfaIndicatorId', '')), '');
        v_target_value := nullif(btrim(coalesce(v_row.value->>'targetValue', '')), '')::numeric;
        v_target_unit := nullif(btrim(coalesce(v_row.value->>'unit', '')), '');
        v_collection_method := nullif(btrim(coalesce(v_row.value->>'collectionMethod', '')), '');
        v_pic := nullif(btrim(coalesce(v_row.value->>'responsibleRole', '')), '');
        v_frequency := nullif(btrim(coalesce(v_row.value->>'frequency', '')), '');
        v_indicator_text := coalesce(nullif(btrim(coalesce(v_row.value->>'name', '')), ''), 'Indikator MEAL');
        -- PD-M1 P0.3: means of verification was never mapped into secondary_source.
        -- The generated MEAL indicator carries it as dataSource (preferred) or
        -- verificationMethod (fallback) — see supabase/functions/grant-writer-generate.
        v_meal_mov := coalesce(
          nullif(btrim(coalesce(v_row.value->>'dataSource', '')), ''),
          nullif(btrim(coalesce(v_row.value->>'verificationMethod', '')), '')
        );

        if v_meal_source_indicator_id is null then
          v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
            'code', 'MEAL_INDICATOR_SKIPPED_UNRESOLVED_SOURCE',
            'message', 'MEAL indicator row was skipped because sourceLfaIndicatorId is missing.'
          ));
          v_meal_skipped_count := v_meal_skipped_count + 1;
          continue;
        elsif not (
          v_meal_source_indicator_id = any(v_goal_indicator_ids)
          or v_meal_source_indicator_id = any(v_purpose_indicator_ids)
          or v_meal_source_indicator_id = any(v_outcome_indicator_ids)
          or v_meal_source_indicator_id = any(v_output_indicator_ids)
        ) then
          v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
            'code', 'MEAL_INDICATOR_SKIPPED_UNRESOLVED_SOURCE',
            'message', 'MEAL indicator row was skipped because sourceLfaIndicatorId could not be resolved.',
            'source_lfa_indicator_id', v_meal_source_indicator_id
          ));
          v_meal_skipped_count := v_meal_skipped_count + 1;
          continue;
        end if;

        v_meal_level := case
          when v_meal_source_indicator_id = any(v_goal_indicator_ids) then 'goal'
          when v_meal_source_indicator_id = any(v_purpose_indicator_ids) then 'purpose'
          when v_meal_source_indicator_id = any(v_outcome_indicator_ids) then 'purpose'
          when v_meal_source_indicator_id = any(v_output_indicator_ids) then 'output'
          else null
        end;

        if v_meal_level is null then
          v_meal_skipped_count := v_meal_skipped_count + 1;
          continue;
        end if;

        insert into public.lfa_meal_items (
          lfa_project_id,
          org_id,
          lfa_level,
          indicator_text,
          target_value,
          target_unit,
          collection_method,
          collection_tool,
          frequency,
          pic,
          baseline,
          secondary_source,
          data_assumption,
          monitoring_risk,
          sort_order,
          mode
        ) values (
          v_lfa_project_id,
          v_source_project.organization_id,
          v_meal_level,
          v_indicator_text,
          v_target_value,
          v_target_unit,
          v_collection_method,
          null,
          v_frequency,
          v_pic,
          nullif(btrim(coalesce(v_row.value->>'baselineValue', '')), '')::numeric,
          v_meal_mov,
          null,
          null,
          v_meal_items_created + 1,
          'simple'
        );

        v_meal_items_created := v_meal_items_created + 1;
      end loop;

      if v_meal_items_created = 0 then
        v_seq := 1;
        for v_row in select code, description, indicator, target, means_of_verification
                       from public.lfa_entries
                      where project_id = v_lfa_project_id
                        and (indicator is not null or target is not null or means_of_verification is not null)
                      order by created_at asc loop
          insert into public.lfa_meal_items (
            lfa_project_id,
            org_id,
            indicator_code,
            indicator_name,
            target_value,
            data_source,
            collection_method,
            frequency,
            responsible
          ) values (
            v_lfa_project_id,
            v_source_project.organization_id,
            coalesce(v_row.code, 'IND-' || v_seq::text),
            coalesce(v_row.indicator, v_row.description, 'Indikator Kinerja'),
            coalesce(v_row.target, '100%'),
            coalesce(v_row.means_of_verification, 'Laporan Lapangan'),
            'Survei',
            'Bulanan',
            'Tim MEAL'
          );
          v_seq := v_seq + 1;
          v_meal_items_created := v_meal_items_created + 1;
        end loop;
      end if;

      if v_meal_items_created > 0 then
        v_created_modules := array_append(v_created_modules, 'meal');
      else
        v_preserved_modules := array_append(v_preserved_modules, 'meal');
        if v_meal_skipped_count > 0 then
          v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
            'code', 'MEAL_INDICATORS_SKIPPED_ALL_UNRESOLVED',
            'message', 'No MEAL rows were inserted because all source indicator references were unresolved.'
          ));
        end if;
      end if;
    else
      v_preserved_modules := array_append(v_preserved_modules, 'meal');
    end if;

    select count(*) into v_existing_sroi_config_count
      from public.lfa_sroi_config
     where lfa_project_id = v_lfa_project_id;

    select count(*) into v_existing_sroi_outcome_count
      from public.lfa_sroi_outcomes
     where lfa_project_id = v_lfa_project_id;

    if (v_existing_sroi_config_count = 0 and v_existing_sroi_outcome_count = 0) then
      insert into public.lfa_sroi_config (
        lfa_project_id,
        org_id
      ) values (
        v_lfa_project_id,
        v_source_project.organization_id
      );

      for v_row in select value from jsonb_array_elements(v_sroi_models) as value loop
        v_indicator_text := coalesce(nullif(btrim(coalesce(v_row.value->>'outcomeStatement', '')), ''), 'Dampak SROI');
        v_quantity := coalesce(nullif(btrim(coalesce(v_row.value->>'quantityHint', '')), '')::numeric, 0);
        v_proxy_value := coalesce(nullif(btrim(coalesce(v_row.value->>'suggestedProxyValueIdr', '')), '')::numeric, 0);
        v_duration_years := coalesce(nullif(btrim(coalesce(v_row.value->>'durationYears', '')), '')::integer, 1);
        v_attribution := coalesce(nullif(btrim(coalesce(v_row.value->>'attributionPctDraft', '')), '')::numeric, 80);
        v_deadweight := coalesce(nullif(btrim(coalesce(v_row.value->>'deadweightPctDraft', '')), '')::numeric, 20);
        v_displacement := coalesce(nullif(btrim(coalesce(v_row.value->>'displacementPctDraft', '')), '')::numeric, 0);
        v_dropoff := coalesce(nullif(btrim(coalesce(v_row.value->>'dropoffPctDraft', '')), '')::numeric, 0);

        insert into public.lfa_sroi_outcomes (
          lfa_project_id,
          org_id,
          meal_item_id,
          outcome_name,
          quantity,
          proxy_value_idr,
          proxy_category,
          duration_years,
          attribution_pct,
          deadweight_pct,
          displacement_pct,
          dropoff_pct_per_year,
          gross_value_idr,
          present_value_idr,
          mode,
          sort_order
        ) values (
          v_lfa_project_id,
          v_source_project.organization_id,
          null,
          v_indicator_text,
          v_quantity,
          v_proxy_value,
          nullif(btrim(coalesce(v_row.value->>'financialProxyType', '')), ''),
          v_duration_years,
          v_attribution,
          v_deadweight,
          v_displacement,
          v_dropoff,
          0,
          0,
          'simple',
          v_sroi_outcomes_created + 1
        );

        v_sroi_outcomes_created := v_sroi_outcomes_created + 1;
      end loop;

      v_created_modules := array_append(v_created_modules, 'sroi');
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'SROI_MEAL_LINKAGE_REVIEW_REQUIRED',
        'message', 'SROI outcomes are seeded without meal_item_id linkage and require later human review.'
      ));
    elsif v_existing_sroi_config_count > 0 and v_existing_sroi_outcome_count > 0 then
      v_preserved_modules := array_append(v_preserved_modules, 'sroi');
    else
      v_blocked_stage := 'sroi_state_check';
      v_failure_code := 'INVALID_LFA_HIERARCHY';
      update public.lfa_materializations
         set status = 'failed',
             failure_stage = v_blocked_stage,
             failure_code = v_failure_code,
             completed_at = now(),
             updated_at = now()
       where id = v_ledger.id;

      return jsonb_build_object(
        'code', 'FAILED_VALIDATION',
        'status', 'failed',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_lfa_project_id,
        'lfa_state', v_lfa_state,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', v_blocked_stage,
        'failure_code', v_failure_code,
        'warnings', v_warnings
      );
    end if;

    if v_existing_lfa_count > 0 and not ('lfa' = any(v_preserved_modules)) then
      v_preserved_modules := array_append(v_preserved_modules, 'lfa');
    end if;

    if v_existing_wbs_count > 0 and not ('wbs' = any(v_preserved_modules)) then
      v_preserved_modules := array_append(v_preserved_modules, 'wbs');
    end if;

    if v_existing_budget_count > 0 and not ('budget' = any(v_preserved_modules)) then
      v_preserved_modules := array_append(v_preserved_modules, 'budget');
    end if;

    if v_existing_meal_count > 0 and not ('meal' = any(v_preserved_modules)) then
      v_preserved_modules := array_append(v_preserved_modules, 'meal');
    end if;

    if v_existing_sroi_config_count > 0 and v_existing_sroi_outcome_count > 0 and not ('sroi' = any(v_preserved_modules)) then
      v_preserved_modules := array_append(v_preserved_modules, 'sroi');
    end if;

    update public.lfa_materializations
       set lfa_project_id = v_lfa_project_id,
           status = 'succeeded',
           failure_stage = null,
           failure_code = null,
           completed_at = now(),
           updated_at = now()
     where id = v_ledger.id;

    if coalesce(array_length(v_created_modules, 1), 0) = 0 then
      v_result_code := 'PRESERVED_EXISTING';
    else
      v_result_code := 'CREATED';
    end if;

    v_result_status := 'success';

    return jsonb_build_object(
      'code', v_result_code,
      'status', v_result_status,
      'materialization_id', v_ledger.id,
      'source_document_id', v_source_doc.id,
      'source_document_version', v_source_doc.version,
      'source_gw_project_id', v_source_project.id,
      'lfa_project_id', v_lfa_project_id,
      'lfa_state', v_lfa_state,
      'lfa_entries_created', v_lfa_entries_created,
      'wbs_items_created', v_wbs_items_created,
      'budget_items_created', v_budget_items_created,
      'meal_items_created', v_meal_items_created,
      'sroi_outcomes_created', v_sroi_outcomes_created,
      'created_modules', to_jsonb(v_created_modules),
      'preserved_modules', to_jsonb(v_preserved_modules),
      'blocked_stage', null,
      'failure_code', null,
      'warnings', v_warnings
    );

  exception
    when unique_violation or foreign_key_violation or check_violation or not_null_violation or exclusion_violation then
      update public.lfa_materializations
         set status = 'failed',
             failure_stage = 'write_transaction',
             failure_code = 'DATABASE_CONSTRAINT_FAILURE',
             completed_at = now(),
             updated_at = now()
       where id = v_ledger.id;

      return jsonb_build_object(
        'code', 'FAILED_DATABASE',
        'status', 'failed',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_lfa_project_id,
        'lfa_state', v_lfa_state,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'write_transaction',
        'failure_code', 'DATABASE_CONSTRAINT_FAILURE',
        'warnings', v_warnings
      );
    when others then
      update public.lfa_materializations
         set status = 'failed',
             failure_stage = 'write_transaction',
             failure_code = case when sqlstate like '40%' then 'DATABASE_WRITE_FAILURE' else 'INTERNAL_DATABASE_FAILURE' end,
             completed_at = now(),
             updated_at = now()
       where id = v_ledger.id;

      return jsonb_build_object(
        'code', 'FAILED_DATABASE',
        'status', 'failed',
        'materialization_id', v_ledger.id,
        'source_document_id', v_source_doc.id,
        'source_document_version', v_source_doc.version,
        'source_gw_project_id', v_source_project.id,
        'lfa_project_id', v_lfa_project_id,
        'lfa_state', v_lfa_state,
        'lfa_entries_created', 0,
        'wbs_items_created', 0,
        'budget_items_created', 0,
        'meal_items_created', 0,
        'sroi_outcomes_created', 0,
        'created_modules', '[]'::jsonb,
        'preserved_modules', '[]'::jsonb,
        'blocked_stage', 'write_transaction',
        'failure_code', case when sqlstate like '40%' then 'DATABASE_WRITE_FAILURE' else 'INTERNAL_DATABASE_FAILURE' end,
        'warnings', v_warnings
      );
  end;
end;
$$;

comment on function public.materialize_grantwriter_document(uuid, integer, uuid) is
  'Transactional GrantWriter document materialization RPC with explicit source pinning, membership validation, and provenance ledger enforcement.';

revoke all on function public.materialize_grantwriter_document(uuid, integer, uuid) from public;
revoke all on function public.materialize_grantwriter_document(uuid, integer, uuid) from anon;
grant execute on function public.materialize_grantwriter_document(uuid, integer, uuid) to authenticated, service_role, anon;