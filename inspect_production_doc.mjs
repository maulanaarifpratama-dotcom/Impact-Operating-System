import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
dotenv.config({ path: './.env.local', override: true });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function main() {
  const email = process.env.E2E_USER_EMAIL || 'info@bisabaik.or.id';
  const password = process.env.E2E_USER_PASSWORD || 'metaproject123';

  console.log(`Signing in as ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authErr) {
    console.error('Auth Error:', authErr);
    return;
  }
  console.log('Auth Successful! User ID:', authData.user.id);

  // Fetch target document 2c511c7b-564a-4a20-b5d3-cb44ddb42b1b and top 5 recent documents
  const { data: targetDocs, error: targetErr } = await supabase
    .from('gw_lfa_documents')
    .select('*')
    .eq('id', '2c511c7b-564a-4a20-b5d3-cb44ddb42b1b');

  const { data: recentDocs, error: recentErr } = await supabase
    .from('gw_lfa_documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const allDocs = [...(targetDocs || []), ...(recentDocs || [])];
  const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.id, d])).values());

  console.log(`Found ${uniqueDocs.length} real production documents to inspect.`);

  for (const doc of uniqueDocs) {
    console.log(`\n==================================================`);
    console.log(`DOCUMENT ID: ${doc.id}`);
    console.log(`Project ID: ${doc.project_id}, Version: ${doc.version}`);
    
    // Parse doc contents
    const payload = doc.matrix || doc.proposal_payload || doc.content || doc.lfa_matrix || doc;
    let parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;

    console.log('Top-level keys in parsed doc:', Object.keys(parsed || {}));

    // Find all keys anywhere in the object that contain "cost", "price", "budget", or "idr"
    function searchCostKeys(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => searchCostKeys(item, `${path}[${idx}]`));
        return;
      }
      for (const [key, val] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (/cost|price|budget|idr|amount|rate|fee/i.test(key) && val !== null && val !== undefined) {
          console.log(`FOUND KEY [${currentPath}]:`, typeof val === 'object' ? JSON.stringify(val).slice(0, 200) : val);
        }
        if (typeof val === 'object' && val !== null) {
          searchCostKeys(val, currentPath);
        }
      }
    }

    console.log('\nInspecting doc.activities:');
    if (parsed.activities) {
      console.log('Activities count:', parsed.activities.length);
      if (parsed.activities.length > 0) {
        console.log('Sample activity keys:', Object.keys(parsed.activities[0]));
        console.log('Sample activity item:', JSON.stringify(parsed.activities[0], null, 2));
      }
    }

    console.log('\nInspecting doc.outcomes:');
    if (parsed.outcomes) {
      console.log('Outcomes count:', parsed.outcomes.length);
      if (parsed.outcomes.length > 0) {
        console.log('Sample outcome item:', JSON.stringify(parsed.outcomes[0], null, 2));
      }
    }
  }
}

main().catch(console.error);
