import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
dotenv.config({ path: './.env.local', override: true });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: projects, error: projErr } = await supabase
    .from('gw_projects')
    .select('id, title, wizard_data')
    .limit(5);

  console.log('Projects:', projErr || projects?.map(p => ({ id: p.id, title: p.title })));
  
  const { data: docs, error } = await supabase
    .from('gw_lfa_documents')
    .select('*')
    .limit(5);

  console.log('Error:', error);
  console.log(`Fetched ${docs?.length || 0} documents.`);
  for (const doc of docs || []) {
    console.log(`\n=== DOCUMENT ID: ${doc.id} (Project: ${doc.project_id}, Version: ${doc.version}) ===`);
    console.log('Doc Keys:', Object.keys(doc));
    const content = doc.matrix || doc.proposal_payload || doc.content || doc.lfa_matrix || doc;
    let parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Check skeleton / budget_hints
    const skeleton = parsed?.program_skeleton || parsed?.skeleton || parsed;
    const budgetHints = skeleton?.budget_hints?.items || parsed?.budget_hints?.items || [];
    
    console.log(`Budget Hints Items Count: ${budgetHints.length}`);
    if (budgetHints.length > 0) {
      console.log('Sample Budget Hint Item:', JSON.stringify(budgetHints[0], null, 2));
      console.log('All Budget Hint Keys across items:', Array.from(new Set(budgetHints.flatMap(item => Object.keys(item)))));
    }

    // Check outcomes / activities / cost_drivers
    const outcomes = parsed?.outcomes || parsed?.proposal?.outcomes || [];
    let costDrivers = [];
    outcomes.forEach(o => {
      (o.outputs || []).forEach(op => {
        (op.activities || []).forEach(a => {
          if (a.cost_drivers && a.cost_drivers.length > 0) {
            costDrivers.push(...a.cost_drivers);
          }
        });
      });
    });

    console.log(`Canonical Cost Drivers Count: ${costDrivers.length}`);
    if (costDrivers.length > 0) {
      console.log('Sample Cost Driver Item:', JSON.stringify(costDrivers[0], null, 2));
      console.log('All Cost Driver Keys across items:', Array.from(new Set(costDrivers.flatMap(item => Object.keys(item)))));
    }
  }
}

main().catch(console.error);
