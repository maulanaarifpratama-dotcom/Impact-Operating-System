/**
 * The app's stable Supabase type surface. Import from here, never from
 * ./database.generated.
 *
 * database.generated.ts is overwritten wholesale by the
 * generate-supabase-types workflow. Keeping the aliases below in this file
 * means regenerating cannot delete them out from under their call sites —
 * which it would, since `supabase gen types` emits enums under
 * Database['public']['Enums'] and knows nothing about these names.
 *
 * The unions are written out rather than derived from the generated Enums
 * because not all of them exist as Postgres enums; several are TEXT columns
 * with CHECK constraints, which the generator emits as plain `string`.
 */

export type { Database, Json } from './database.generated';

export type PrimaryRole = 'foundation_lead' | 'umkm_owner' | 'changemaker' | 'consultant' | 'other';
export type OrgRole = 'owner' | 'admin' | 'member';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
export type PlanTier = 'free' | 'starter' | 'premium' | 'enterprise';
export type ProductKey = 'grant_writer' | 'impactory_library' | 'grantfinder' | 'impactory_ads';
export type GwProjectStatus = 'draft' | 'generating' | 'completed' | 'archived';
export type GwDonorStandard = 'un_oecd_dac' | 'world_bank' | 'usaid' | 'eu' | 'generic';
