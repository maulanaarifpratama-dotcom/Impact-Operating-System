import fs from 'fs';
import path from 'path';

const srcPath = 'c:/Users/maula/.gemini/antigravity/scratch/impactory/supabase/migrations/20260728190000_fix_wbs_materialization_when_lfa_exists.sql';
const destPath = 'c:/Users/maula/.gemini/antigravity/scratch/impactory/supabase/migrations/20260728200000_map_generated_budget_unit_price.sql';

let sql = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Declare v_unit_price_idr
sql = sql.replace(
  '  v_quantity numeric;\n',
  '  v_quantity numeric;\n  v_unit_price_idr numeric;\n'
);

// 2. Replace hardcoded 0 in budget loop
const oldLoop = `        v_activity_name := coalesce(v_task_to_wbs_name ->> v_budget_task_id, v_item_name);

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
          0,`;

const newLoop = `        v_activity_name := coalesce(v_task_to_wbs_name ->> v_budget_task_id, v_item_name);

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
          v_unit_price_idr,`;

if (!sql.includes(oldLoop)) {
  console.error('OLD LOOP NOT FOUND IN SOURCE SQL!');
  process.exit(1);
}

sql = sql.replace(oldLoop, newLoop);

fs.writeFileSync(destPath, sql, 'utf8');
console.log('Migration 20260728200000_map_generated_budget_unit_price.sql created successfully!');
