import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase environment variables:', { url: !!url, serviceKey: !!serviceKey });
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const documentId = '2c511c7b-564a-4a20-b5d3-cb44ddb42b1b';
  const projectId = '08fc1b53-9bf9-4de2-921f-597ce44d8263';

  console.log('--- EXECUTING MATERIALIZATION RPC ---');
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('materialize_grantwriter_document', {
    p_source_document_id: documentId,
    p_expected_document_version: null,
    p_existing_lfa_project_id: projectId
  });

  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
  } else {
    console.log('RPC Response:', JSON.stringify(rpcRes, null, 2));
  }

  console.log('\n--- FETCHING ACTUAL DB COUNTS ---');

  const { count: lfaCount } = await supabase
    .from('lfa_entries')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { count: wbsCount } = await supabase
    .from('lfa_wbs_items')
    .select('*', { count: 'exact', head: true })
    .eq('lfa_project_id', projectId);

  const { count: budgetCount } = await supabase
    .from('lfa_budget_items')
    .select('*', { count: 'exact', head: true })
    .eq('lfa_project_id', projectId);

  const { count: mealCount } = await supabase
    .from('lfa_meal_items')
    .select('*', { count: 'exact', head: true })
    .eq('lfa_project_id', projectId);

  console.log('DB Counts:', {
    lfa_entries_count: lfaCount,
    lfa_wbs_items_count: wbsCount,
    lfa_budget_items_count: budgetCount,
    lfa_meal_items_count: mealCount,
  });
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
