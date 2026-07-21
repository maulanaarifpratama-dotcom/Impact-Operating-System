// supabase/functions/grantfinder-search/index.ts
// Hybrid grant search: takes a free-text query (and optional filters), embeds it via Foundry,
// runs the match_grants() pgvector RPC, then asks the chat model to rank/explain the top hits.
//
// =========================================================================
// TODO (USER): set these secrets in Supabase Dashboard > Edge Functions > Secrets
//   AZURE_FOUNDRY_ENDPOINT
//   AZURE_FOUNDRY_API_KEY
//   AZURE_FOUNDRY_DEPLOYMENT          (chat model)
//   AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT (e.g. text-embedding-3-small, dim=1536)
//   AZURE_FOUNDRY_API_VERSION
// And run: supabase functions deploy grantfinder-search
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryEmbed, foundryChat } from '../_shared/foundry.ts';

interface SearchInput {
  query: string;
  filters?: {
    sector?: string[];
    country?: string[];
    min_amount_usd?: number;
    max_amount_usd?: number;
  };
  match_count?: number;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id, supabase } = await getUserAndOrg(req);
    const body = (await req.json()) as SearchInput;
    const query = (body.query ?? '').trim();
    if (!query) {
      return json({ error: 'query is required' }, 400);
    }

    const matchCount = Math.min(Math.max(body.match_count ?? 10, 1), 25);

    // 1) Embed the query
    let embedding: number[] | null = null;
    try {
      embedding = await foundryEmbed(query);
    } catch (err) {
      console.warn('[grantfinder-search] embed failed, fallback to keyword search:', (err as Error).message);
    }

    // 2) Vector search (or fallback to keyword ILIKE if no embedding)
    const admin = adminClient();
    let candidates: any[] = [];
    if (embedding) {
      const { data, error } = await admin.rpc('match_grants', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: matchCount,
        filter_sector: body.filters?.sector ?? null,
        filter_country: body.filters?.country ?? null,
        filter_min_amount: body.filters?.min_amount_usd ?? null,
        filter_max_amount: body.filters?.max_amount_usd ?? null,
      });
      if (error) console.warn('[grantfinder-search] RPC error:', error.message);
      else candidates = data ?? [];
    }
    if (candidates.length === 0) {
      // keyword fallback
      const { data } = await admin
        .from('grants_catalog')
        .select('*')
        .or('title.ilike.%' + query + '%,description.ilike.%' + query + '%')
        .limit(matchCount);
      candidates = data ?? [];
    }

    // 3) Log the search
    await admin.from('grantfinder_searches').insert({
      organization_id,
      user_id: user.id,
      query,
      filters: body.filters ?? {},
      result_count: candidates.length,
    });

    // 4) Ask chat model to provide a short ranked summary explanation (best-effort)
    let summary = '';
    if (candidates.length > 0) {
      try {
        const ctx = candidates
          .slice(0, 8)
          .map((c: any, i: number) =>
            (i + 1) + '. ' + (c.title ?? 'Untitled') + ' — donor: ' + (c.donor ?? '?') +
            ' — sector: ' + (Array.isArray(c.sector) ? c.sector.join(', ') : (c.sector ?? '?')) +
            ' — amount: ' + (c.amount_usd ?? '?') + ' USD' +
            ' — desc: ' + ((c.description ?? '').slice(0, 240))
          )
          .join('\n');
        const out = await foundryChat([
          {
            role: 'system',
            content:
              'Kamu adalah asisten Grantfinder Impactory. Diberikan daftar hibah kandidat dan kueri user, ' +
              'tulis ringkasan SINGKAT (maks 4 bullet) yang menjelaskan kenapa kandidat-kandidat ini cocok ' +
              'dan apa yang harus diperhatikan user. Bahasa Indonesia profesional.',
          },
          {
            role: 'user',
            content: 'Kueri: ' + query + '\n\nKandidat:\n' + ctx,
          },
        ], { temperature: 0.3, max_tokens: 400 });
        summary = out;
      } catch (err) {
        console.warn('[grantfinder-search] summarize failed:', (err as Error).message);
      }
    }

    try {
      const { error: telemetryError } = await admin.from('ai_generations').insert({
        organization_id,
        user_id: user.id,
        product: 'grantfinder',
        metadata: { result_count: candidates.length, used_embedding: !!embedding },
      });

      if (telemetryError) {
        console.warn('[grantfinder-search] AI usage telemetry insert failed');
      }
    } catch {
      console.warn('[grantfinder-search] AI usage telemetry insert failed');
    }

    return json({ results: candidates, summary, used_embedding: !!embedding });
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
