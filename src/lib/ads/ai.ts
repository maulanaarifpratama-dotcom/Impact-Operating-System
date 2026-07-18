// src/lib/ads/ai.ts
// Client helper for the ads-generate edge function.
import { supabase } from '@/integrations/supabase/client';

export interface AdsBrief {
  brief_id?: string;
  campaign?: string;
  product_or_cause: string;
  audience: string;
  goal: string;
  platform: string;
  tone?: string;
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
  try {
    const { data, error } = await supabase.functions.invoke('ads-generate', {
      body: brief,
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
      return { used: false, variants: [], error: errorMessage };
    }
    if (data?.error) {
      return { used: false, variants: [], error: data.error };
    }
    return {
      used: true,
      brief_id: data?.brief_id,
      variants: (data?.variants as AdVariant[]) ?? [],
      fallback: !!data?.fallback,
    };
  } catch (e) {
    return { used: false, variants: [], error: (e as Error).message };
  }
}
