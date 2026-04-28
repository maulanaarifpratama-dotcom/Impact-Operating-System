// supabase/functions/grantfinder-index/index.ts
// Re-embed rows in grants_catalog that do not have an embedding yet.
// Intended to run as a manual trigger by an admin (or via a scheduled CRON).
//
// =========================================================================
// TODO (USER):
//   1. Insert rows into public.grants_catalog (title, donor, description, sector, country, amount_usd, etc.)
//      You can seed manually in Supabase SQL Editor, or import a CSV via Supabase dashboard.
//   2. Make sure your user has role = 'admin' in public.profiles (or remove the admin check below).
//   3. Deploy: supabase functions deploy grantfinder-index
//   4. Trigger it: POST <SUPABASE_URL>/functions/v1/grantfinder-index  with Authorization: Bearer <jwt>
//   5. Re-run when you add new grants.
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryEmbed } from '../_shared/foundry.ts';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, supabase } = await getUserAndOrg(req);

    // Require admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Admin role required' }, 403);
    }

    const admin = adminClient();
    const batchSize = 20;
    const { data: rows, error } = await admin
      .from('grants_catalog')
      .select('id, title, donor, description, sector, country')
      .is('embedding', null)
      .limit(batchSize);
    if (error) return json({ error: error.message }, 500);
    if (!rows || rows.length === 0) return json({ updated: 0, message: 'Nothing to index' });

    let updated = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const text = [
        'Title: ' + (row.title ?? ''),
        'Donor: ' + (row.donor ?? ''),
        'Sector: ' + (Array.isArray(row.sector) ? row.sector.join(', ') : (row.sector ?? '')),
        'Country: ' + (Array.isArray(row.country) ? row.country.join(', ') : (row.country ?? '')),
        'Description: ' + (row.description ?? ''),
      ].join('\n');
      try {
        const emb = await foundryEmbed(text);
        const { error: upErr } = await admin
          .from('grants_catalog')
          .update({ embedding: emb, indexed_at: new Date().toISOString() })
          .eq('id', row.id);
        if (upErr) errors.push(row.id + ': ' + upErr.message);
        else updated++;
      } catch (e) {
        errors.push(row.id + ': ' + (e as Error).message);
      }
    }

    return json({ updated, attempted: rows.length, errors });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
