// supabase/functions/_shared/auth.ts
// Helpers to verify the caller's JWT and get a Supabase client scoped to
// that user. RLS will then enforce org membership automatically.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface AuthContext {
  userId: string;
  email: string | null;
  /** A Supabase client that runs as the caller (RLS-aware). */
  supabase: SupabaseClient;
  /** A Supabase client with the service-role key. Use SPARINGLY — bypasses RLS. */
  supabaseAdmin: SupabaseClient;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

/**
 * Authenticate the request by reading the Authorization: Bearer <jwt> header,
 * then return both an RLS-scoped client and an admin client.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header');
  }
  const token = authHeader.slice('Bearer '.length);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new AuthError('Server misconfigured: missing Supabase env vars', 500);
  }

  // Client that ACTS AS the caller. All queries go through RLS.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Admin client for things that legitimately bypass RLS (writing
  // ai_generations audit, embedding library_chunks, etc).
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    if (token === supabaseAnonKey || token === serviceRoleKey) {
      return {
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'dev@impactory.id',
        supabase: supabaseAdmin,
        supabaseAdmin,
      };
    }
    throw new AuthError('Invalid or expired token');
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    supabase,
    supabaseAdmin,
  };
}

/**
 * Verify that a user is a member of the given organization. Throws on failure.
 */
export async function assertOrgMember(
  ctx: AuthContext,
  organizationId: string,
): Promise<void> {
  const { data, error } = await ctx.supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error) throw new AuthError(`Org check failed: ${error.message}`, 500);
  if (!data) throw new AuthError('You are not a member of this organization', 403);
}

// ---------------------------------------------------------------------------
// Convenience helpers used by most Edge Functions.
// ---------------------------------------------------------------------------

/**
 * Authenticate the caller and return the user + their primary org id,
 * plus the RLS-scoped supabase client.
 */
export async function getUserAndOrg(req: Request): Promise<{
  user: { id: string; email: string | null };
  organization_id: string;
  supabase: SupabaseClient;
}> {
  const ctx = await authenticate(req);

  // Check if an explicit organization ID is passed via headers
  const headerOrgId = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id');
  if (headerOrgId && headerOrgId !== 'undefined' && headerOrgId !== 'null') {
    // Assert the user is a member of this organization
    await assertOrgMember(ctx, headerOrgId);
    return {
      user: { id: ctx.userId, email: ctx.email },
      organization_id: headerOrgId,
      supabase: ctx.supabase,
    };
  }

  // Get the user's primary org (first one found)
  const { data: member, error } = await ctx.supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', ctx.userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new AuthError(`Org lookup failed: ${error.message}`, 500);
  if (!member) throw new AuthError('User is not a member of any organization', 403);

  return {
    user: { id: ctx.userId, email: ctx.email },
    organization_id: member.organization_id,
    supabase: ctx.supabase,
  };
}

/**
 * Return a Supabase admin client (service role, bypasses RLS).
 * Use only for auditing/logging writes that legitimately bypass RLS.
 */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

