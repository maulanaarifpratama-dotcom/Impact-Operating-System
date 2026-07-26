// supabase/functions/_shared/rateLimit.ts
// Per-user spend guard for the Azure Foundry-backed endpoints.
//
// Authentication is the primary control — every AI function requires a real user
// JWT. This is the second layer: it bounds how much a single *authenticated*
// account can spend. Counters live in Postgres (see the ai_rate_limits migration)
// because edge functions run across many isolates that share no memory.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export class RateLimitError extends Error {
  status = 429;
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface RateLimitOptions {
  /** Logical bucket — use the edge function name. */
  bucket: string;
  /** Maximum requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Budget for a routine per-field AI suggestion: 60 calls/hour/user. */
export const SUGGEST_LIMIT = { limit: 60, windowSeconds: 3600 };

/** Budget for a long, expensive generation (full LFA/proposal): 15 calls/hour/user. */
export const GENERATE_LIMIT = { limit: 15, windowSeconds: 3600 };

/**
 * Record one request against the caller's budget and throw RateLimitError when
 * it is exhausted.
 *
 * Fails **open** when the counter itself is unavailable: a broken rate-limit
 * table must not take the product down. Authentication still gates every call,
 * so the blast radius of a failure here is limited to over-spend, not exposure.
 */
export async function enforceRateLimit(
  admin: SupabaseClient,
  userId: string,
  opts: RateLimitOptions,
): Promise<void> {
  const { data, error } = await admin.rpc('consume_ai_rate_limit', {
    _user_id: userId,
    _bucket: opts.bucket,
    _limit: opts.limit,
    _window_seconds: opts.windowSeconds,
  });

  if (error) {
    console.error(`[rateLimit] counter unavailable for ${opts.bucket}:`, error.message);
    return;
  }

  const result = data as
    | { allowed: boolean; retry_after_seconds: number }
    | null;

  if (result && result.allowed === false) {
    const retryAfter = result.retry_after_seconds ?? opts.windowSeconds;
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    throw new RateLimitError(
      `Batas penggunaan AI tercapai. Coba lagi dalam ${minutes} menit.`,
      retryAfter,
    );
  }
}
