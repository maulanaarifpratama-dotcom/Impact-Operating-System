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

  await supabase.auth.signInWithPassword({ email, password });

  const { data: matList } = await supabase
    .from('lfa_materializations')
    .select('id, lfa_project_id, budget_items_created, created_at, status')
    .order('created_at', { ascending: false });

  console.log('All Materializations in DB:', matList);
}

main().catch(console.error);
