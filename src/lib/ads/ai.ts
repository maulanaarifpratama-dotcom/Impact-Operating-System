// src/lib/ads/ai.ts
// Client helper for the ads-generate edge function.

import { supabase } from '@/integrations/supabase/client';

export interface AdsBrief {
  brief_id?: string;
  audience: string;
  goal: string;
  platform: string;
  tone?: string;
  brand_voice?: string;
  key_points?: string[];
  variant_count?: number;
}

export interface AdVariant {
  headline: string;
  body: string;
  cta: string;
  hashtags: string[];
  platform: string;
  why_it_works?: string;
}

export interface AdsResult {
  used: boolean;
  brief_id?: string;
  variants: AdVariant[];
  fallback?: boolean;
  error?: string;
}

export async function generateAds(brief: AdsBrief): Promise<AdsResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  if (!token || !SUPABASE_URL) {
    return { used: false, variants: [], error: 'not authenticated' };
  }
  const url = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/ads-generate';
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(brief),
    });
    if (!resp.ok) return { used: false, variants: [], error: 'http ' + resp.status };
    const json = await resp.json();
    return {
      used: true,
      brief_id: json.brief_id,
      variants: (json.variants as AdVariant[]) ?? [],
      fallback: !!json.fallback,
    };
  } catch (e) {
    return { used: false, variants: [], error: (e as Error).message };
  }
}
