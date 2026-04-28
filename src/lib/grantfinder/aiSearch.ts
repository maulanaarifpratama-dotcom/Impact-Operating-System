// src/lib/grantfinder/aiSearch.ts
// Client helper for the grantfinder-search edge function.
//
// Usage:
//   const { results, summary, used } = await aiGrantSearch({ query, filters });
//
// If the edge function is not deployed or Foundry secrets are missing, this returns
// { used: false } and the UI should fall back to local MOCK_GRANTS keyword filter.

import { supabase } from '@/integrations/supabase/client';

export interface AIGrantSearchInput {
  query: string;
  filters?: {
    sector?: string[];
    country?: string[];
    min_amount_usd?: number;
    max_amount_usd?: number;
  };
  matchCount?: number;
}

export interface AIGrantSearchResult {
  used: boolean;
  results: any[];
  summary: string;
  error?: string;
}

export async function aiGrantSearch(input: AIGrantSearchInput): Promise<AIGrantSearchResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { used: false, results: [], summary: '' };

    const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (!SUPABASE_URL) return { used: false, results: [], summary: '' };

    const url = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/grantfinder-search';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        query: input.query,
        filters: input.filters ?? {},
        match_count: input.matchCount ?? 10,
      }),
    });
    if (!resp.ok) {
      return { used: false, results: [], summary: '', error: 'http ' + resp.status };
    }
    const json = await resp.json();
    return {
      used: true,
      results: json.results ?? [],
      summary: json.summary ?? '',
    };
  } catch (e) {
    return { used: false, results: [], summary: '', error: (e as Error).message };
  }
}
