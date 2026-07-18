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
    const { data, error } = await supabase.functions.invoke('grantfinder-search', {
      body: {
        query: input.query,
        filters: input.filters ?? {},
        match_count: input.matchCount ?? 10,
      },
    });

    if (error) {
      let errorMessage = error.message;
      if (error.context instanceof Response) {
        try {
          const cloned = error.context.clone();
          const errBody = await cloned.json();
          if (errBody?.error) errorMessage = errBody.error;
        } catch (_e) {
          // ignore
        }
      }
      return { used: false, results: [], summary: '', error: errorMessage };
    }
    
    if (data?.error) {
       return { used: false, results: [], summary: '', error: data.error };
    }

    return {
      used: true,
      results: data?.results ?? [],
      summary: data?.summary ?? '',
    };
  } catch (e) {
    return { used: false, results: [], summary: '', error: (e as Error).message };
  }
}
