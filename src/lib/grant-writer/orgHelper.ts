import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the user's "default" organization id.
 * If no org exists, creates a personal org + membership in one transaction-like sequence.
 */
export async function ensureDefaultOrg(userId: string, fullName?: string | null): Promise<string> {
  // 1. Look for existing membership.
  const { data: existing, error: existErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existing?.organization_id) return existing.organization_id;

  // 2. Create org.
  const baseName = (fullName?.trim() || 'Workspace') + ' Workspace';
  const slug = `ws-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: baseName, slug, created_by: userId })
    .select('id')
    .single();
  if (orgErr) throw orgErr;

  // 3. Self-membership as owner.
  const { error: memErr } = await supabase
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: userId, role: 'owner' });
  if (memErr) throw memErr;

  return org.id;
}